-- ============================================================================
-- Financeiro — fundação aditiva (NÃO EXECUTADO)
--
-- Este arquivo depende do schema-base real ainda não versionado. O bloco de
-- preflight deve falhar antes de qualquer DDL se produção/local divergirem do
-- que está comprovado pelos SQLs históricos do repositório.
--
-- NÃO contém segredo, senha, service_role nem criação de papel técnico.
-- Ordem: abrir_caixa.sql -> entradas_caixa.sql ->
--        valor_consulta_e_vinculos.sql -> este arquivo.
-- ============================================================================

begin;

do $preflight$
declare
  v_colunas_entrada text[] := array[
    'id', 'sessao_caixa_id', 'clinica_id', 'forma_pagamento', 'valor',
    'paciente_id', 'profissional_id', 'registrado_por', 'registrado_em'
  ];
  v_coluna text;
begin
  if to_regclass('public.clinicas') is null
     or to_regclass('public.usuarios') is null
     or to_regclass('public.usuarios_clinicas') is null
     or to_regclass('public.pacientes') is null
     or to_regclass('public.profissionais') is null
     or to_regclass('public.profissionais_clinicas') is null
     or to_regclass('public.agendamentos') is null
     or to_regclass('public.sessoes_caixa') is null
     or to_regclass('public.entradas_caixa') is null then
    raise exception 'FINANCEIRO_PREFLIGHT: schema-base/tabelas obrigatórias ausentes';
  end if;

  foreach v_coluna in array v_colunas_entrada loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'entradas_caixa'
        and column_name = v_coluna
    ) then
      raise exception 'FINANCEIRO_PREFLIGHT: entradas_caixa.% ausente', v_coluna;
    end if;
  end loop;

  if to_regprocedure('public.clinicas_do_usuario()') is null
     or to_regprocedure('public.clinica_ativa()') is null
     or to_regprocedure('public.eh_proprietaria(uuid)') is null
     or to_regprocedure('public.eh_proprietaria_ou_recepcao(uuid)') is null
     or to_regprocedure('public.fn_auditoria()') is null
     or to_regprocedure('public.fn_bloqueia_mutacao()') is null then
    raise exception 'FINANCEIRO_PREFLIGHT: funções-base obrigatórias ausentes ou com assinatura divergente';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'entradas_caixa'
      and column_name = 'cobranca_id'
  ) then
    raise exception 'FINANCEIRO_PREFLIGHT: migration parece já aplicada parcialmente (entradas_caixa.cobranca_id existe)';
  end if;

  if exists (
    select 1 from public.entradas_caixa e
    join public.sessoes_caixa sc on sc.id = e.sessao_caixa_id
    where e.registrado_por is null and sc.aberto_por is null
  ) then
    raise exception 'FINANCEIRO_PREFLIGHT: entrada legada sem autor confiável para backfill';
  end if;
end
$preflight$;

create type public.status_cobranca_financeira as enum ('pendente', 'paga', 'atrasada', 'cortesia');
create type public.origem_cobranca_financeira as enum ('manual', 'agenda', 'legado');
create type public.status_despesa_financeira as enum ('pendente', 'paga');
create type public.categoria_despesa_financeira as enum (
  'aluguel', 'energia', 'agua', 'internet', 'material_limpeza',
  'material_clinico', 'manutencao', 'honorarios', 'impostos', 'outras'
);
create type public.tipo_movimento_caixa as enum (
  'sangria', 'suprimento', 'despesa_dinheiro', 'repasse_dinheiro',
  'estorno_saida', 'estorno_entrada'
);
create type public.status_repasse_financeiro as enum ('a_pagar', 'pago');
create type public.status_ajuste_financeiro as enum ('pendente', 'aplicado_parcial', 'aplicado');
create type public.origem_estorno_financeiro as enum ('entrada', 'despesa', 'pagamento_repasse');

create table public.cobrancas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  paciente_id uuid not null references public.pacientes(id) on delete restrict,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  agendamento_id uuid references public.agendamentos(id) on delete restrict,
  valor_total numeric(12,2) not null check (valor_total > 0),
  status public.status_cobranca_financeira not null,
  origem public.origem_cobranca_financeira not null default 'manual',
  motivo_cortesia text,
  numero_nota_fiscal text,
  descricao text,
  vencimento_em date,
  criada_por uuid not null references public.usuarios(id) on delete restrict,
  criada_em timestamptz not null default now(),
  paga_em timestamptz,
  constraint cobrancas_cortesia_coerente check (
    (status = 'cortesia' and nullif(btrim(motivo_cortesia), '') is not null and paga_em is null)
    or (status <> 'cortesia' and motivo_cortesia is null)
  ),
  constraint cobrancas_pagamento_coerente check (
    (status = 'paga' and paga_em is not null)
    or (status <> 'paga' and paga_em is null)
  )
);

create unique index cobrancas_agendamento_unica
  on public.cobrancas (agendamento_id)
  where agendamento_id is not null;
create index cobrancas_clinica_status on public.cobrancas (clinica_id, status, criada_em desc);
create index cobrancas_paciente on public.cobrancas (clinica_id, paciente_id, criada_em desc);

alter table public.entradas_caixa
  add column cobranca_id uuid references public.cobrancas(id) on delete restrict;

-- Backfill estrutural determinístico: a cobrança legada recebe o mesmo UUID da
-- entrada. Nenhum valor, paciente ou profissional é recalculado.
insert into public.cobrancas (
  id, clinica_id, paciente_id, profissional_id, valor_total, status, origem,
  motivo_cortesia, descricao, criada_por, criada_em, paga_em
)
select
  ec.id,
  ec.clinica_id,
  ec.paciente_id,
  ec.profissional_id,
  ec.valor,
  case when ec.forma_pagamento::text = 'cortesia'
    then 'cortesia'::public.status_cobranca_financeira
    else 'paga'::public.status_cobranca_financeira end,
  'legado'::public.origem_cobranca_financeira,
  case when ec.forma_pagamento::text = 'cortesia'
    then coalesce(nullif(btrim(ec.descricao), ''), 'Cortesia legada — motivo exige revisão')
    else null end,
  ec.descricao,
  coalesce(ec.registrado_por, ec.aberto_por),
  ec.registrado_em,
  case when ec.forma_pagamento::text = 'cortesia' then null else ec.registrado_em end
from (
  select e.*, sc.aberto_por
  from public.entradas_caixa e
  join public.sessoes_caixa sc on sc.id = e.sessao_caixa_id
) ec;

update public.entradas_caixa set cobranca_id = id where cobranca_id is null;
alter table public.entradas_caixa alter column cobranca_id set not null;
create index entradas_caixa_cobranca on public.entradas_caixa (cobranca_id);

create table public.financeiro_idempotencia (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  operacao text not null,
  chave text not null,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  jti uuid not null,
  resposta jsonb,
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (clinica_id, operacao, chave),
  unique (jti),
  check (length(chave) between 16 and 128),
  check ((resposta is null) = (concluido_em is null))
);

create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  categoria public.categoria_despesa_financeira not null,
  descricao text not null check (nullif(btrim(descricao), '') is not null),
  valor numeric(12,2) not null check (valor > 0),
  status public.status_despesa_financeira not null,
  forma_pagamento public.forma_pagamento_caixa,
  vencimento_em date,
  pago_em timestamptz,
  criada_por uuid not null references public.usuarios(id) on delete restrict,
  criada_em timestamptz not null default now(),
  paga_por uuid references public.usuarios(id) on delete restrict,
  constraint despesas_pagamento_coerente check (
    (status = 'paga' and forma_pagamento is not null and pago_em is not null and paga_por is not null)
    or (status = 'pendente' and forma_pagamento is null and pago_em is null and paga_por is null)
  ),
  constraint despesas_sem_cortesia check (forma_pagamento is null or forma_pagamento::text <> 'cortesia')
);
create index despesas_clinica_status on public.despesas (clinica_id, status, vencimento_em);

create table public.movimentos_caixa (
  id uuid primary key default gen_random_uuid(),
  sessao_caixa_id uuid not null references public.sessoes_caixa(id) on delete restrict,
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  tipo public.tipo_movimento_caixa not null,
  valor numeric(12,2) not null check (valor > 0),
  motivo text not null check (nullif(btrim(motivo), '') is not null),
  despesa_id uuid references public.despesas(id) on delete restrict,
  pagamento_repasse_id uuid,
  estorno_id uuid,
  registrado_por uuid not null references public.usuarios(id) on delete restrict,
  registrado_em timestamptz not null default now(),
  constraint movimentos_origem_coerente check (num_nonnulls(despesa_id, pagamento_repasse_id, estorno_id) <= 1)
);
create index movimentos_caixa_sessao on public.movimentos_caixa (sessao_caixa_id, registrado_em);

create table public.fechamentos_caixa (
  id uuid primary key default gen_random_uuid(),
  sessao_caixa_id uuid not null unique references public.sessoes_caixa(id) on delete restrict,
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  valor_abertura numeric(12,2) not null,
  dinheiro_esperado numeric(12,2) not null,
  dinheiro_contado numeric(12,2) not null check (dinheiro_contado >= 0),
  diferenca numeric(12,2) not null,
  justificativa_diferenca text,
  fechado_por uuid not null references public.usuarios(id) on delete restrict,
  fechado_em timestamptz not null default now(),
  constraint fechamento_justificativa check (
    diferenca = 0 or nullif(btrim(justificativa_diferenca), '') is not null
  )
);

create table public.fechamentos_caixa_totais (
  fechamento_id uuid not null references public.fechamentos_caixa(id) on delete restrict,
  forma_pagamento public.forma_pagamento_caixa not null,
  valor_esperado numeric(12,2) not null check (valor_esperado >= 0),
  primary key (fechamento_id, forma_pagamento),
  check (forma_pagamento::text <> 'cortesia')
);

create table public.repasses (
  id uuid primary key default gen_random_uuid(),
  fechamento_id uuid not null references public.fechamentos_caixa(id) on delete restrict,
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  total_elegivel numeric(12,2) not null check (total_elegivel >= 0),
  taxa_clinica_percentual numeric(5,2) not null check (taxa_clinica_percentual between 0 and 100),
  taxa_profissional_percentual numeric(5,2) not null check (taxa_profissional_percentual between 0 and 100),
  valor_base_profissional numeric(12,2) not null check (valor_base_profissional >= 0),
  valor_ajustes numeric(12,2) not null default 0,
  valor_a_pagar numeric(12,2) not null check (valor_a_pagar >= 0),
  status public.status_repasse_financeiro not null default 'a_pagar',
  criado_em timestamptz not null default now(),
  unique (fechamento_id, profissional_id)
);
create index repasses_clinica_status on public.repasses (clinica_id, status, criado_em desc);

create table public.repasse_itens (
  id uuid primary key default gen_random_uuid(),
  repasse_id uuid not null references public.repasses(id) on delete restrict,
  entrada_caixa_id uuid not null references public.entradas_caixa(id) on delete restrict,
  valor_entrada numeric(12,2) not null check (valor_entrada > 0),
  taxa_profissional_percentual numeric(5,2) not null check (taxa_profissional_percentual between 0 and 100),
  valor_repasse numeric(12,2) not null check (valor_repasse >= 0),
  unique (entrada_caixa_id)
);

create table public.pagamentos_repasse (
  id uuid primary key default gen_random_uuid(),
  repasse_id uuid not null unique references public.repasses(id) on delete restrict,
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  valor_pago numeric(12,2) not null check (valor_pago >= 0),
  forma_pagamento public.forma_pagamento_caixa not null,
  pago_por uuid not null references public.usuarios(id) on delete restrict,
  pago_em timestamptz not null default now(),
  check (forma_pagamento::text <> 'cortesia')
);

alter table public.movimentos_caixa
  add constraint movimentos_pagamento_repasse_fk
  foreign key (pagamento_repasse_id) references public.pagamentos_repasse(id) on delete restrict;

create table public.estornos_financeiros (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  origem_tipo public.origem_estorno_financeiro not null,
  origem_id uuid not null,
  valor numeric(12,2) not null check (valor > 0),
  motivo text not null check (nullif(btrim(motivo), '') is not null),
  fechamento_origem_id uuid references public.fechamentos_caixa(id) on delete restrict,
  estornado_por uuid not null references public.usuarios(id) on delete restrict,
  estornado_em timestamptz not null default now(),
  unique (origem_tipo, origem_id)
);
create index estornos_clinica_data on public.estornos_financeiros (clinica_id, estornado_em desc);

alter table public.movimentos_caixa
  add constraint movimentos_estorno_fk
  foreign key (estorno_id) references public.estornos_financeiros(id) on delete restrict;

create table public.ajustes_financeiros_profissional (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  estorno_id uuid not null unique references public.estornos_financeiros(id) on delete restrict,
  fechamento_origem_id uuid not null references public.fechamentos_caixa(id) on delete restrict,
  valor numeric(12,2) not null check (valor <> 0),
  status public.status_ajuste_financeiro not null default 'pendente',
  criado_em timestamptz not null default now()
);
create index ajustes_pendentes_profissional
  on public.ajustes_financeiros_profissional (clinica_id, profissional_id, criado_em)
  where status <> 'aplicado';

create table public.ajustes_financeiros_aplicacoes (
  id uuid primary key default gen_random_uuid(),
  ajuste_id uuid not null references public.ajustes_financeiros_profissional(id) on delete restrict,
  repasse_id uuid not null references public.repasses(id) on delete restrict,
  valor_aplicado numeric(12,2) not null check (valor_aplicado <> 0),
  aplicado_em timestamptz not null default now(),
  unique (ajuste_id, repasse_id)
);

alter table public.sessoes_caixa
  add column justificativa_diferenca text,
  add constraint sessoes_caixa_fechamento_coerente check (
    (status = 'aberto' and fechado_por is null and fechado_em is null
      and valor_esperado is null and valor_contado is null and diferenca is null
      and justificativa_diferenca is null)
    or
    (status = 'fechado' and fechado_por is not null and fechado_em is not null
      and valor_esperado is not null and valor_contado is not null and diferenca is not null
      and (diferenca = 0 or nullif(btrim(justificativa_diferenca), '') is not null))
  ) not valid;

-- Validar somente no ambiente local/staging após diagnosticar eventuais sessões
-- legadas fechadas manualmente: ALTER TABLE ... VALIDATE CONSTRAINT ...;

alter table public.cobrancas enable row level security;
alter table public.financeiro_idempotencia enable row level security;
alter table public.despesas enable row level security;
alter table public.movimentos_caixa enable row level security;
alter table public.fechamentos_caixa enable row level security;
alter table public.fechamentos_caixa_totais enable row level security;
alter table public.repasses enable row level security;
alter table public.repasse_itens enable row level security;
alter table public.pagamentos_repasse enable row level security;
alter table public.estornos_financeiros enable row level security;
alter table public.ajustes_financeiros_profissional enable row level security;
alter table public.ajustes_financeiros_aplicacoes enable row level security;

create policy cobrancas_select_financeiro on public.cobrancas for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario())
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
    and public.eh_proprietaria_ou_recepcao(clinica_id));
create policy despesas_select_financeiro on public.despesas for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario())
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
    and public.eh_proprietaria_ou_recepcao(clinica_id));
create policy movimentos_select_financeiro on public.movimentos_caixa for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id));
create policy fechamentos_select_financeiro on public.fechamentos_caixa for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id));
create policy repasses_select_financeiro on public.repasses for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id));
create policy pagamentos_repasse_select_financeiro on public.pagamentos_repasse for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id));
create policy estornos_select_financeiro on public.estornos_financeiros for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id));
create policy ajustes_select_financeiro on public.ajustes_financeiros_profissional for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id));

create policy fechamentos_totais_select_financeiro on public.fechamentos_caixa_totais for select to authenticated
  using (exists (select 1 from public.fechamentos_caixa f where f.id = fechamento_id
    and f.clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(f.clinica_id)));
create policy repasse_itens_select_financeiro on public.repasse_itens for select to authenticated
  using (exists (select 1 from public.repasses r where r.id = repasse_id
    and r.clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(r.clinica_id)));
create policy ajustes_aplicacoes_select_financeiro on public.ajustes_financeiros_aplicacoes for select to authenticated
  using (exists (select 1 from public.repasses r where r.id = repasse_id
    and r.clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(r.clinica_id)));

grant select on public.cobrancas, public.despesas, public.movimentos_caixa,
  public.fechamentos_caixa, public.fechamentos_caixa_totais, public.repasses,
  public.repasse_itens, public.pagamentos_repasse, public.estornos_financeiros,
  public.ajustes_financeiros_profissional, public.ajustes_financeiros_aplicacoes
  to authenticated;

create trigger trg_audit_cobrancas after insert or update or delete on public.cobrancas
  for each row execute function public.fn_auditoria();
create trigger trg_audit_despesas after insert or update or delete on public.despesas
  for each row execute function public.fn_auditoria();
create trigger trg_audit_movimentos_caixa after insert or update or delete on public.movimentos_caixa
  for each row execute function public.fn_auditoria();
create trigger trg_audit_fechamentos_caixa after insert or update or delete on public.fechamentos_caixa
  for each row execute function public.fn_auditoria();
create trigger trg_audit_repasses after insert or update or delete on public.repasses
  for each row execute function public.fn_auditoria();
create trigger trg_audit_pagamentos_repasse after insert or update or delete on public.pagamentos_repasse
  for each row execute function public.fn_auditoria();
create trigger trg_audit_estornos_financeiros after insert or update or delete on public.estornos_financeiros
  for each row execute function public.fn_auditoria();
create trigger trg_audit_ajustes_financeiros after insert or update or delete on public.ajustes_financeiros_profissional
  for each row execute function public.fn_auditoria();

create trigger trg_bloqueia_fechamentos before update or delete on public.fechamentos_caixa
  for each row execute function public.fn_bloqueia_mutacao();
create trigger trg_bloqueia_fechamentos_totais before update or delete on public.fechamentos_caixa_totais
  for each row execute function public.fn_bloqueia_mutacao();
create trigger trg_bloqueia_repasse_itens before update or delete on public.repasse_itens
  for each row execute function public.fn_bloqueia_mutacao();
create trigger trg_bloqueia_pagamentos_repasse before update or delete on public.pagamentos_repasse
  for each row execute function public.fn_bloqueia_mutacao();
create trigger trg_bloqueia_estornos before update or delete on public.estornos_financeiros
  for each row execute function public.fn_bloqueia_mutacao();
create trigger trg_bloqueia_ajustes_aplicacoes before update or delete on public.ajustes_financeiros_aplicacoes
  for each row execute function public.fn_bloqueia_mutacao();

commit;
