-- ============================================================
-- Módulo: Financeiro — Registrar Entrada (recebimento no caixa aberto)
-- Tabela entradas_caixa: lançamento manual, sem vínculo com agenda ainda.
-- Nunca UPDATE/DELETE (registro financeiro publicado é imutável).
--
-- Projeto Supabase alvo: xftnkusbyqzyvzrovroj (Clínica Patrícia).
-- CONFIRME o project ref antes de rodar (ver 00-BANCO-DE-DADOS-OFICIAL.md).
-- Rodar inteiro de uma vez no SQL Editor (é uma transação só: begin/commit).
-- ============================================================

begin;

-- ============================================================
-- 1) TIPO E TABELA
-- ============================================================

create type public.forma_pagamento_caixa as enum (
  'dinheiro', 'pix', 'cartao_debito', 'cartao_credito',
  'transferencia', 'convenio', 'cortesia'
);

create table public.entradas_caixa (
  id uuid primary key default gen_random_uuid(),
  sessao_caixa_id uuid not null references public.sessoes_caixa(id) on delete restrict,
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  forma_pagamento public.forma_pagamento_caixa not null,
  valor numeric(10,2) not null check (valor > 0),
  descricao text,
  registrado_por uuid references public.usuarios(id) default auth.uid(),
  registrado_em timestamptz not null default now()
);

-- ============================================================
-- 2) RLS
-- (reaproveita eh_proprietaria_ou_recepcao(), já criada na migration
-- de abrir_caixa — comentário lá já previa mais tabelas com essa regra)
-- ============================================================

alter table public.entradas_caixa enable row level security;

-- leitura: mesmo padrão de sessoes_caixa (vinculado + trava por clínica ativa)
create policy entradas_caixa_select on public.entradas_caixa
  for select to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
  );

-- inserção: proprietária/recepção da clínica E a sessão referenciada
-- precisa estar 'aberto' e ser da mesma clínica (trava dupla: rota + RLS)
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
  );

-- SEM policy de UPDATE/DELETE: registro financeiro publicado é imutável
-- (10-PLANO-DIRETOR.md — correção futura será por estorno, não edição).

-- ============================================================
-- 3) GRANTS
-- ============================================================

grant select, insert on public.entradas_caixa to authenticated;

-- ============================================================
-- 4) AUDITORIA (mesmo padrão das demais tabelas)
-- ============================================================

create trigger trg_audit_entradas_caixa
  after insert or update or delete on public.entradas_caixa
  for each row execute function public.fn_auditoria();

commit;
