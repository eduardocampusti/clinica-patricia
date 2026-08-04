-- ============================================================
-- Módulo: Financeiro — Fundação do repasse profissional
-- (10-PLANO-DIRETOR.md, seção "Modelo real de repasse", 03/08/2026)
--
-- ESCOPO 1: valor_consulta + taxa_repasse_clinica em profissionais.
-- ESCOPO 2: paciente_id + profissional_id (NOT NULL) em entradas_caixa,
-- com reforço de isolamento por clínica na RLS de INSERT.
--
-- Projeto Supabase alvo: xftnkusbyqzyvzrovroj (Clínica Patrícia).
-- CONFIRME o project ref antes de rodar (ver 00-BANCO-DE-DADOS-OFICIAL.md).
-- Rodar inteiro de uma vez no SQL Editor (é uma transação só: begin/commit).
-- ============================================================

begin;

-- ============================================================
-- 1) ESCOPO 1 — profissionais: valor_consulta + taxa_repasse_clinica
-- ============================================================

alter table public.profissionais
  add column valor_consulta numeric(10,2) check (valor_consulta >= 0),
  add column taxa_repasse_clinica numeric(5,2) not null default 20
    check (taxa_repasse_clinica >= 0 and taxa_repasse_clinica <= 100);

-- RLS de UPDATE já existente (profissionais_update, eh_proprietaria_de_profissional)
-- já cobre a edição dessas colunas — sem policy nova aqui.

-- Atualiza a RPC de cadastro para aceitar os dois campos novos (parâmetros
-- no final, com default, para não quebrar a assinatura existente).
create or replace function public.cadastrar_profissional(
  p_nome_completo text,
  p_cpf text,
  p_conselho_classe text,
  p_registro_conselho text,
  p_especialidade_principal_id uuid,
  p_clinica_id uuid,
  p_valor_consulta numeric default null,
  p_taxa_repasse_clinica numeric default 20
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_profissional_id uuid;
  v_cpf_encrypted bytea;
  v_cpf_hash text;
begin
  if not public.eh_proprietaria(p_clinica_id) then
    raise exception 'Sem permissão para cadastrar profissional nesta clínica';
  end if;

  if p_cpf is not null and length(trim(p_cpf)) > 0 then
    v_cpf_encrypted := public.cpf_encrypt(p_cpf);
    v_cpf_hash := public.cpf_hash(p_cpf);
  end if;

  insert into public.profissionais (
    nome_completo, cpf_encrypted, cpf_hash,
    conselho_classe, registro_conselho, especialidade_principal_id,
    valor_consulta, taxa_repasse_clinica, created_by
  ) values (
    p_nome_completo, v_cpf_encrypted, v_cpf_hash,
    p_conselho_classe, p_registro_conselho, p_especialidade_principal_id,
    p_valor_consulta, p_taxa_repasse_clinica, auth.uid()
  )
  returning id into v_profissional_id;

  insert into public.profissionais_clinicas (profissional_id, clinica_id, created_by)
  values (v_profissional_id, p_clinica_id, auth.uid());

  return v_profissional_id;
end;
$$;

grant execute on function
  public.cadastrar_profissional(text, text, text, text, uuid, uuid, numeric, numeric)
  to authenticated;

-- ============================================================
-- 2) ESCOPO 2 — entradas_caixa: paciente_id + profissional_id
-- ============================================================

-- Remove a entrada de teste já registrada (sem paciente/profissional real
-- para preencher retroativamente) — já era dado de teste pendente de
-- remoção, registrado no TODO.md.
delete from public.entradas_caixa where id = 'bf9ba585-9c57-4851-a9cc-0f2ffd27af7c';

alter table public.entradas_caixa
  add column paciente_id uuid references public.pacientes(id) on delete restrict,
  add column profissional_id uuid references public.profissionais(id) on delete restrict;

alter table public.entradas_caixa
  alter column paciente_id set not null,
  alter column profissional_id set not null;

-- RLS de INSERT: mesma lógica de sempre, reforçando que o paciente e o
-- profissional referenciados pertencem à MESMA clínica do lançamento (não
-- confiar só no que o formulário mandou) — mesmo princípio já aplicado à
-- sessao_caixa_id.
drop policy entradas_caixa_insert on public.entradas_caixa;

create policy entradas_caixa_insert on public.entradas_caixa
  for insert to authenticated
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
    and exists (
      select 1 from public.sessoes_caixa sc
      where sc.id = entradas_caixa.sessao_caixa_id
        and sc.clinica_id = entradas_caixa.clinica_id
        and sc.status = 'aberto'
    )
    and exists (
      select 1 from public.pacientes p
      where p.id = entradas_caixa.paciente_id
        and p.clinica_id = entradas_caixa.clinica_id
    )
    and exists (
      select 1 from public.profissionais_clinicas pc
      where pc.profissional_id = entradas_caixa.profissional_id
        and pc.clinica_id = entradas_caixa.clinica_id
        and pc.ativo
    )
  );

commit;
