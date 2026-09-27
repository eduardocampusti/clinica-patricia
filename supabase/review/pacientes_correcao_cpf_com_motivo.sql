-- PROPOSTA PARA REVISÃO. NÃO EXECUTADA. NÃO É MIGRATION.
-- Vive em supabase/review/ até ensaio local + Supabase real com ROLLBACK e
-- autorização explícita. Só então é copiada para supabase/migrations/ com
-- timestamp e registro em supabase_migrations.schema_migrations.
--
-- Dependências: baseline 20260915010002, hardening 20260915010004, RPC de CPF
-- pendente 20260924120000, edição administrativa 20260926100000 e correção de
-- conflito HTTP 20260926101000 já aplicadas.
--
-- Escopo (Iteração A de docs/modulos/pacientes/07-PLANO-IMPLEMENTACAO.md):
--   1. Coluna motivo em public.auditoria (nullable, sem backfill).
--   2. fn_auditoria() reescrita para preencher motivo a partir do GUC
--      audit.motivo, com fallback silencioso.
--   3. RPC paciente_corrigir_cpf() para trocar o CPF já preenchido com motivo.
--   4. RPC paciente_cpf_disponivel() para verificar disponibilidade sem
--      revelar identidade do conflitante.
--
-- Fora do escopo desta proposta:
--   - alterar policies existentes de pacientes, foto ou vínculos;
--   - alterar paciente_editar_administrativo;
--   - alterar paciente_definir_cpf (caminho de complementação de CPF ausente);
--   - instalar a trava 20260925130000 (menor sem responsável).
--
-- Rollback (a preparar como migration compensatória quando houver instalação):
--   drop function if exists public.paciente_corrigir_cpf(uuid,uuid,timestamptz,text,text);
--   drop function if exists public.paciente_cpf_disponivel(uuid,uuid,text);
--   -- restaurar fn_auditoria() para a definição anterior (ver 20260915010002).
--   -- A coluna auditoria.motivo permanece por decisão separada.
--
-- Nota LGPD: nenhuma RPC devolve CPF em texto, ciphertext ou hash. A resposta
-- de conflito nunca revela id ou nome do paciente conflitante. Mensagens do
-- cliente são genéricas.
begin;

-- 1. Coluna motivo em auditoria. Idempotente. Sem NOT NULL nem backfill.
alter table public.auditoria add column if not exists motivo text;

comment on column public.auditoria.motivo is
  'Motivo declarado pelo operador em operações administrativas sensíveis. '
  'Preenchido pelo trigger fn_auditoria a partir de current_setting(audit.motivo, true). '
  'NULL para operações que não exigem motivo (regra prévia).';

-- 2. fn_auditoria reescrita. Definição anterior está em 20260915010002 e serve
-- como referência do rollback. Não altera assinatura, owner ou grants.
create or replace function public.fn_auditoria() returns trigger
    language plpgsql security definer
    set search_path to 'public'
    as $$
declare
  v_clinica uuid;
  v_motivo text;
begin
  v_clinica := coalesce((to_jsonb(new)->>'clinica_id')::uuid,
                        (to_jsonb(old)->>'clinica_id')::uuid);
  -- true = missing_ok: retorna NULL se o GUC nunca foi definido nesta transação.
  -- Normaliza string vazia para NULL: operações que não exigem motivo não
  -- vazam o setting anterior de outra transação (set_config LOCAL já limita
  -- ao statement/transação, mas a normalização é defesa em profundidade).
  v_motivo := nullif(btrim(current_setting('audit.motivo', true)), '');

  insert into public.auditoria(clinica_id, usuario_id, acao, entidade,
                               entidade_id, dados_antes, dados_depois, motivo)
  values (v_clinica, auth.uid(), tg_op::public.acao_auditoria, tg_table_name,
          coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
          v_motivo);
  return coalesce(new, old);
end $$;

-- 3. RPC paciente_cpf_disponivel: verificação prévia sem vazamento.
create or replace function public.paciente_cpf_disponivel(
  p_clinica_id uuid, p_paciente_id uuid, p_cpf text
) returns boolean
  language plpgsql stable security definer
  set search_path = pg_catalog, public as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  v_hash text;
begin
  -- Mesma guarda de autorização das demais RPCs administrativas.
  if auth.uid() is null
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not exists (select 1 from public.usuarios u
                    where u.id = auth.uid() and u.ativo)
     or (public.clinica_ativa() is not null
         and public.clinica_ativa() <> p_clinica_id)
     or not exists (select 1 from public.clinicas c
                    where c.id = p_clinica_id and c.ativo) then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  if not public.pacientes_cpf_valido(v_cpf) then
    -- Formato inválido não é "disponível". Não revela detalhe extra.
    return false;
  end if;

  v_hash := public.cpf_hash(v_cpf);

  -- Não revela id/nome. Retorno é booleano puro.
  return not exists (
    select 1 from public.pacientes outro
    where outro.clinica_id = p_clinica_id
      and outro.cpf_hash = v_hash
      and (p_paciente_id is null or outro.id <> p_paciente_id)
  );
end $$;

revoke all on function public.paciente_cpf_disponivel(uuid, uuid, text)
  from public, anon;
grant execute on function public.paciente_cpf_disponivel(uuid, uuid, text)
  to authenticated;

-- 4. RPC paciente_corrigir_cpf: correção auditada de CPF já preenchido.
create or replace function public.paciente_corrigir_cpf(
  p_paciente_id uuid, p_clinica_id uuid, p_updated_at timestamptz,
  p_cpf_novo text, p_motivo text
) returns void
  language plpgsql security definer
  set search_path = pg_catalog, public as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf_novo, ''), '[^0-9]', '', 'g');
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_hash text;
  v_atual public.pacientes%rowtype;
begin
  -- Autorização idêntica a paciente_editar_administrativo.
  if auth.uid() is null
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not exists (select 1 from public.usuarios u
                    where u.id = auth.uid() and u.ativo)
     or (public.clinica_ativa() is not null
         and public.clinica_ativa() <> p_clinica_id)
     or not exists (select 1 from public.clinicas c
                    where c.id = p_clinica_id and c.ativo) then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  -- Motivo é obrigatório nesta operação: 10..500 caracteres depois de btrim.
  if char_length(v_motivo) < 10 or char_length(v_motivo) > 500 then
    raise exception 'Motivo obrigatório entre 10 e 500 caracteres.'
      using errcode = '22023';
  end if;

  -- Formato do CPF novo.
  if not public.pacientes_cpf_valido(v_cpf) then
    raise exception 'CPF inválido.' using errcode = '22023';
  end if;

  -- Bloqueia a linha para comparação de revisão e leitura do CPF atual.
  select p.* into v_atual from public.pacientes p
    where p.id = p_paciente_id and p.clinica_id = p_clinica_id
    for update;
  if not found then
    -- Fora da clínica ou inexistente: mesma mensagem para não vazar.
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  -- Só permite correção enquanto o cadastro está ativo.
  if not v_atual.ativo then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  -- Correção pressupõe CPF previamente preenchido. Cadastro sem CPF usa
  -- paciente_definir_cpf (§5.1 do DFM), que não exige motivo.
  if v_atual.cpf_hash is null then
    raise exception 'Cadastro ainda sem CPF; use complementação inicial.'
      using errcode = 'P0001';
  end if;

  -- Conflito otimista antes de qualquer efeito colateral.
  if p_updated_at is null or v_atual.updated_at is distinct from p_updated_at then
    raise exception 'Cadastro alterado por outra operação.' using errcode = 'PT409';
  end if;

  v_hash := public.cpf_hash(v_cpf);

  -- Mesmo CPF: nenhuma alteração solicitada. Não escreve auditoria.
  if v_hash is not distinct from v_atual.cpf_hash then
    raise exception 'Nenhuma alteração solicitada.' using errcode = '22023';
  end if;

  -- Unicidade por clínica, inclusive contra registros inativos. Não revela
  -- id/nome do paciente conflitante. Mensagem genérica reproduz o padrão do
  -- constraint único (clinica_id, cpf_hash).
  if exists (
    select 1 from public.pacientes outro
    where outro.clinica_id = p_clinica_id
      and outro.id <> p_paciente_id
      and outro.cpf_hash = v_hash
  ) then
    raise exception 'CPF já cadastrado nesta clínica.' using errcode = '23505';
  end if;

  -- Motivo escoa via GUC local: só o trigger enxerga; fora desta transação
  -- o GUC não existe mais.
  perform set_config('audit.motivo', v_motivo, true);

  update public.pacientes
     set cpf_encrypted = public.cpf_encrypt(v_cpf),
         cpf_hash = v_hash
   where id = p_paciente_id
     and clinica_id = p_clinica_id;
  if not found then
    raise exception 'Correção não concluída.' using errcode = 'P0002';
  end if;
exception
  when unique_violation then
    -- Corrida com outra transação que preencheu o mesmo hash entre a checagem
    -- e o UPDATE. Mesma mensagem genérica.
    raise exception 'CPF já cadastrado nesta clínica.' using errcode = '23505';
end $$;

revoke all on function public.paciente_corrigir_cpf(
  uuid, uuid, timestamptz, text, text
) from public, anon;
grant execute on function public.paciente_corrigir_cpf(
  uuid, uuid, timestamptz, text, text
) to authenticated;

commit;
