-- Leitura individual de CPF pela proprietária e correção auditada.
-- NÃO aplicar por `migration up` enquanto 20260925130000 estiver pendente.
-- A aplicação seletiva exige conferência do projeto, ensaio com dependências
-- reais e registro coerente no histórico de migrations.
begin;

alter table public.auditoria add column if not exists motivo text;

comment on column public.auditoria.motivo is
  'Motivo declarado pelo operador em operações administrativas sensíveis; '
  'NULL para operações que não exigem motivo.';

create or replace function public.fn_auditoria() returns trigger
  language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_clinica uuid;
  v_motivo text;
begin
  v_clinica := coalesce((to_jsonb(new)->>'clinica_id')::uuid,
                        (to_jsonb(old)->>'clinica_id')::uuid);
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

-- Não recebe ciphertext do cliente e nunca consulta outros pacientes.
-- NULL significa CPF realmente ausente; falta de acesso gera erro, não NULL.
create function public.paciente_ler_cpf(
  p_paciente_id uuid, p_clinica_id uuid
) returns text
  language plpgsql stable security definer
  set search_path = pg_catalog as $$
declare
  v_cpf_encrypted bytea;
  v_cpf_hash text;
  v_cpf text;
begin
  if auth.uid() is null
     or not public.eh_proprietaria(p_clinica_id)
     or not exists (select 1 from public.usuarios u
                    where u.id = auth.uid() and u.ativo)
     or (public.clinica_ativa() is not null
         and public.clinica_ativa() <> p_clinica_id)
     or not exists (select 1 from public.clinicas c
                    where c.id = p_clinica_id and c.ativo) then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  select p.cpf_encrypted, p.cpf_hash into v_cpf_encrypted, v_cpf_hash
  from public.pacientes p
  where p.id = p_paciente_id and p.clinica_id = p_clinica_id;
  if not found then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  if (v_cpf_encrypted is null) <> (v_cpf_hash is null) then
    raise exception 'Não foi possível confirmar o CPF.' using errcode = '22000';
  end if;
  if v_cpf_encrypted is null then return null; end if;
  v_cpf := public.cpf_decrypt(v_cpf_encrypted);
  if not public.pacientes_cpf_valido(v_cpf)
     or public.cpf_hash(v_cpf) is distinct from v_cpf_hash then
    raise exception 'Não foi possível confirmar o CPF.' using errcode = '22000';
  end if;
  return v_cpf;
end $$;

revoke all on function public.paciente_ler_cpf(uuid, uuid) from public, anon;
grant execute on function public.paciente_ler_cpf(uuid, uuid) to authenticated;

-- Mantém a identidade e os vínculos; só substitui ciphertext, hash e revisão.
-- O retorno é apenas a nova revisão para não perder edições cadastrais abertas.
create function public.paciente_corrigir_cpf(
  p_paciente_id uuid, p_clinica_id uuid, p_updated_at timestamptz,
  p_cpf_novo text, p_motivo text
) returns timestamptz
  language plpgsql security definer
  set search_path = pg_catalog as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf_novo, ''), '[^0-9]', '', 'g');
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_hash text;
  v_atual public.pacientes%rowtype;
  v_motivo_anterior text;
  v_revisao timestamptz;
begin
  if auth.uid() is null
     or not public.eh_proprietaria(p_clinica_id)
     or not exists (select 1 from public.usuarios u
                    where u.id = auth.uid() and u.ativo)
     or (public.clinica_ativa() is not null
         and public.clinica_ativa() <> p_clinica_id)
     or not exists (select 1 from public.clinicas c
                    where c.id = p_clinica_id and c.ativo) then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  if char_length(v_motivo) < 10 or char_length(v_motivo) > 500 then
    raise exception 'Motivo obrigatório entre 10 e 500 caracteres.'
      using errcode = '22023';
  end if;
  if v_motivo ~ '[0-9]([[:space:]./-]*[0-9]){10}' then
    raise exception 'Não inclua documentos ou sequências numéricas longas no motivo.'
      using errcode = '22023';
  end if;
  if not public.pacientes_cpf_valido(v_cpf) then
    raise exception 'CPF inválido.' using errcode = '22023';
  end if;

  select p.* into v_atual from public.pacientes p
  where p.id = p_paciente_id and p.clinica_id = p_clinica_id
  for update;
  if not found or not v_atual.ativo then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;
  if v_atual.cpf_hash is null then
    raise exception 'Cadastro ainda sem CPF; use complementação inicial.'
      using errcode = 'P0001';
  end if;
  if p_updated_at is null or v_atual.updated_at is distinct from p_updated_at then
    raise exception 'Cadastro alterado por outra operação.' using errcode = 'PT409';
  end if;

  v_hash := public.cpf_hash(v_cpf);
  if v_hash is not distinct from v_atual.cpf_hash then
    raise exception 'Nenhuma alteração solicitada.' using errcode = '22023';
  end if;
  if exists (select 1 from public.pacientes outro
             where outro.clinica_id = p_clinica_id
               and outro.id <> p_paciente_id and outro.cpf_hash = v_hash) then
    raise exception 'CPF já cadastrado nesta clínica.' using errcode = '23505';
  end if;

  v_motivo_anterior := current_setting('audit.motivo', true);
  perform set_config('audit.motivo', v_motivo, true);
  update public.pacientes
     set cpf_encrypted = public.cpf_encrypt(v_cpf),
         cpf_hash = v_hash,
         updated_at = clock_timestamp()
   where id = p_paciente_id and clinica_id = p_clinica_id
   returning updated_at into v_revisao;
  perform set_config('audit.motivo', coalesce(v_motivo_anterior, ''), true);
  return v_revisao;
exception
  when unique_violation then
    raise exception 'CPF já cadastrado nesta clínica.' using errcode = '23505';
end $$;

revoke all on function public.paciente_corrigir_cpf(
  uuid, uuid, timestamptz, text, text
) from public, anon;
grant execute on function public.paciente_corrigir_cpf(
  uuid, uuid, timestamptz, text, text
) to authenticated;

commit;
