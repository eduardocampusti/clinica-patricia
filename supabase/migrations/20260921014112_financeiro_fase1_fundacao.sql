-- FASE 1: fundacao aditiva. Criada para revisao; NAO aplicada.
-- Referencias: docs/modulos/financeiro/01 a 07.
-- FKs conferidas contra a baseline versionada e o release 20260915.
-- FASES 2/3: autorizacao, consistencia de clinica/agenda/caixa,
-- soma dos componentes e operacoes transacionais antes de liberar escritas.
-- Nenhuma rotina recalcula snapshots usando configuracoes futuras.
-- Reversao: falha nesta transacao reverte tudo. Depois do commit, somente
-- reversao revisada com inventario/backup; nunca apagar historico automaticamente.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- Copia de transicao apenas para a coluna nova; fonte legada preservada.
alter table public.profissionais_clinicas
  add column valor_consulta numeric(12,2),
  add constraint profissionais_clinicas_valor_consulta_check
    check (valor_consulta >= 0 and valor_consulta < 'NaN'::numeric);

update public.profissionais_clinicas pc
set valor_consulta = p.valor_consulta
from public.profissionais p
where p.id = pc.profissional_id
  and pc.valor_consulta is null
  and p.valor_consulta is not null;

create table public.configuracoes_financeiras_clinica (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  percentual_clinica numeric(5,2) not null
    check (percentual_clinica between 0 and 100),
  vigente_desde timestamptz not null default now(),
  vigente_ate timestamptz,
  -- NULL identifica a carga inicial pela migration, sem inventar um usuario.
  criado_por uuid references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint configuracoes_financeiras_vigencia_check
    check (vigente_ate is null or vigente_ate > vigente_desde),
  constraint configuracoes_financeiras_vigencia_sem_sobreposicao
    exclude using gist (
      clinica_id with =,
      tstzrange(vigente_desde, vigente_ate, '[)') with &&
    )
);

create unique index configuracoes_financeiras_aberta_unica
  on public.configuracoes_financeiras_clinica (clinica_id)
  where vigente_ate is null;
create index configuracoes_financeiras_clinica_vigencia_idx
  on public.configuracoes_financeiras_clinica (clinica_id, vigente_desde desc);
create index configuracoes_financeiras_criado_por_idx
  on public.configuracoes_financeiras_clinica (criado_por);

insert into public.configuracoes_financeiras_clinica
  (clinica_id, percentual_clinica, vigente_desde, criado_por)
select c.id, 20.00, now(), null
from public.clinicas c
where not exists (
  select 1 from public.configuracoes_financeiras_clinica cf
  where cf.clinica_id = c.id
);

create table public.recebimentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  agendamento_id uuid not null references public.agendamentos(id) on delete restrict,
  paciente_id uuid not null references public.pacientes(id) on delete restrict,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  sessao_caixa_id uuid not null references public.sessoes_caixa(id) on delete restrict,
  valor_bruto numeric(12,2) not null
    check (valor_bruto > 0 and valor_bruto < 'NaN'::numeric),
  percentual_clinica numeric(5,2) not null
    check (percentual_clinica between 0 and 100),
  valor_clinica numeric(12,2) not null
    check (valor_clinica >= 0 and valor_clinica < 'NaN'::numeric),
  valor_profissional numeric(12,2) not null
    check (valor_profissional >= 0 and valor_profissional < 'NaN'::numeric),
  status text not null default 'confirmado'
    check (status in ('confirmado', 'parcialmente_estornado', 'estornado')),
  idempotency_key text not null unique
    check (btrim(idempotency_key) <> ''),
  registrado_por uuid not null references public.usuarios(id) on delete restrict,
  registrado_em timestamptz not null default now(),
  constraint recebimentos_snapshot_soma_check
    check (valor_clinica + valor_profissional = valor_bruto),
  constraint recebimentos_profissional_clinica_fk
    foreign key (profissional_id, clinica_id)
    references public.profissionais_clinicas (profissional_id, clinica_id)
    on delete restrict
);

create index recebimentos_clinica_data_idx
  on public.recebimentos (clinica_id, registrado_em desc);
create index recebimentos_clinica_status_data_idx
  on public.recebimentos (clinica_id, status, registrado_em desc);
create index recebimentos_profissional_clinica_data_idx
  on public.recebimentos (profissional_id, clinica_id, registrado_em desc);
create index recebimentos_paciente_data_idx
  on public.recebimentos (paciente_id, registrado_em desc);
create index recebimentos_agendamento_idx
  on public.recebimentos (agendamento_id);
create index recebimentos_sessao_data_idx
  on public.recebimentos (sessao_caixa_id, registrado_em desc);
create index recebimentos_registrado_por_idx
  on public.recebimentos (registrado_por);

-- CHECK independente do enum legado: somente as tres formas aprovadas.
create table public.recebimentos_pagamentos (
  id uuid primary key default gen_random_uuid(),
  recebimento_id uuid not null references public.recebimentos(id) on delete restrict,
  forma_pagamento text not null
    check (forma_pagamento in ('dinheiro', 'pix', 'cartao_credito')),
  valor numeric(12,2) not null
    check (valor > 0 and valor < 'NaN'::numeric),
  created_at timestamptz not null default now()
);

create index recebimentos_pagamentos_recebimento_idx
  on public.recebimentos_pagamentos (recebimento_id);

create table public.movimentos_caixa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  sessao_caixa_id uuid not null references public.sessoes_caixa(id) on delete restrict,
  tipo text not null
    check (tipo in ('recebimento', 'suprimento', 'sangria', 'estorno', 'ajuste')),
  recebimento_id uuid references public.recebimentos(id) on delete restrict,
  valor numeric(12,2) not null
    check (valor > 0 and valor < 'NaN'::numeric),
  motivo text,
  registrado_por uuid not null references public.usuarios(id) on delete restrict,
  registrado_em timestamptz not null default now(),
  constraint movimentos_caixa_recebimento_vinculo_check
    check (
      (tipo in ('recebimento', 'estorno') and recebimento_id is not null)
      or (tipo in ('suprimento', 'sangria') and recebimento_id is null)
      or tipo = 'ajuste'
    ),
  constraint movimentos_caixa_motivo_obrigatorio_check
    check (
      tipo = 'recebimento'
      or (motivo is not null and btrim(motivo) <> '')
    )
);

create index movimentos_caixa_clinica_data_idx
  on public.movimentos_caixa (clinica_id, registrado_em desc);
create index movimentos_caixa_sessao_data_idx
  on public.movimentos_caixa (sessao_caixa_id, registrado_em desc);
create index movimentos_caixa_recebimento_idx
  on public.movimentos_caixa (recebimento_id);
create index movimentos_caixa_registrado_por_idx
  on public.movimentos_caixa (registrado_por);

create table public.eventos_auditoria_financeira (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  papel public.papel_usuario not null,
  acao text not null check (btrim(acao) <> ''),
  entidade text not null check (btrim(entidade) <> ''),
  -- Referencia polimorfica; validacao da entidade cabera a operacao futura.
  entidade_id uuid not null,
  valor numeric(12,2) check (valor < 'NaN'::numeric),
  estado_anterior jsonb,
  estado_novo jsonb,
  dados jsonb not null default '{}'::jsonb,
  motivo text,
  created_at timestamptz not null default now()
);

create index eventos_auditoria_financeira_clinica_data_idx
  on public.eventos_auditoria_financeira (clinica_id, created_at desc);
create index eventos_auditoria_financeira_usuario_data_idx
  on public.eventos_auditoria_financeira (usuario_id, created_at desc);
create index eventos_auditoria_financeira_entidade_idx
  on public.eventos_auditoria_financeira (entidade, entidade_id);

-- Sem policies: acesso dos clientes negado ate a FASE 2.
alter table public.configuracoes_financeiras_clinica enable row level security;
alter table public.recebimentos enable row level security;
alter table public.recebimentos_pagamentos enable row level security;
alter table public.movimentos_caixa enable row level security;
alter table public.eventos_auditoria_financeira enable row level security;

-- Neutraliza grants eventualmente herdados dos default privileges do executor.
-- Nao modifica ACLs de tabelas legadas nem default privileges globais.
revoke all privileges on table
  public.configuracoes_financeiras_clinica,
  public.recebimentos,
  public.recebimentos_pagamentos,
  public.movimentos_caixa,
  public.eventos_auditoria_financeira
from public, anon, authenticated;

commit;
