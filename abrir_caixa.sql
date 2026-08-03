-- ============================================================
-- Módulo: Financeiro — Abrir Caixa (primeira funcionalidade real)
-- Tabela sessoes_caixa: só a ABERTURA nesta etapa. Fechamento (com
-- valor_esperado/valor_contado/diferenca preenchidos) é etapa futura, com
-- sua própria migration e regras.
--
-- Projeto Supabase alvo: xftnkusbyqzyvzrovroj (Clínica Patrícia).
-- CONFIRME o project ref antes de rodar (ver 00-BANCO-DE-DADOS-OFICIAL.md).
-- Rodar inteiro de uma vez no SQL Editor (é uma transação só: begin/commit).
-- ============================================================

begin;

-- ============================================================
-- 1) TIPO E TABELA
-- ============================================================

create type public.status_sessao_caixa as enum ('aberto', 'fechado');

create table public.sessoes_caixa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  aberto_por uuid references public.usuarios(id) default auth.uid(),
  valor_abertura numeric(10,2) not null check (valor_abertura >= 0),
  aberto_em timestamptz not null default now(),
  status public.status_sessao_caixa not null default 'aberto',
  fechado_por uuid references public.usuarios(id),
  fechado_em timestamptz,
  valor_esperado numeric(10,2),
  valor_contado numeric(10,2),
  diferenca numeric(10,2)
);

-- No máximo 1 sessão 'aberto' por clínica ao mesmo tempo — garantido no
-- banco (sobrevive a corrida de clique duplo), não só na aplicação.
create unique index sessoes_caixa_aberta_unica
  on public.sessoes_caixa (clinica_id)
  where status = 'aberto';

-- ============================================================
-- 2) FUNÇÃO AUXILIAR DE RLS
-- Nome genérico de propósito: o módulo Financeiro vai ter mais tabelas
-- (despesas, repasses, fechamento) com a mesma regra de escrita.
-- ============================================================

create or replace function public.eh_proprietaria_ou_recepcao(p_clinica_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.usuarios_clinicas
    where usuario_id = auth.uid()
      and clinica_id = p_clinica_id
      and papel in ('proprietaria', 'recepcao')
      and ativo
  );
$$;

-- ============================================================
-- 3) RLS
-- ============================================================

alter table public.sessoes_caixa enable row level security;

-- leitura: qualquer vinculado à clínica (mesmo padrão de pacientes/servicos,
-- incluindo a trava por clínica ativa)
create policy sessoes_caixa_select on public.sessoes_caixa
  for select to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
  );

-- abertura: só proprietária OU recepção
create policy sessoes_caixa_insert on public.sessoes_caixa
  for insert to authenticated
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

-- SEM policy de UPDATE/DELETE nesta etapa: RLS habilitada sem policy de
-- UPDATE bloqueia por padrão. Fechar caixa é feature futura, com sua
-- própria migration e regras de negócio ainda não desenhadas.

-- ============================================================
-- 4) GRANTS
-- ============================================================

grant select, insert on public.sessoes_caixa to authenticated;

-- ============================================================
-- 5) AUDITORIA (mesmo padrão das demais tabelas)
-- ============================================================

create trigger trg_audit_sessoes_caixa
  after insert or update or delete on public.sessoes_caixa
  for each row execute function public.fn_auditoria();

commit;
