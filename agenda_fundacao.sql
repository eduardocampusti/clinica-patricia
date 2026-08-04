-- ============================================================
-- AGENDA — fundação (schema + RLS)
-- Sessão 04/08/2026. Decisões confirmadas com o Eduardo:
--   1. Horário semanal fixo por profissional/clínica, com exceções
--      pontuais (folga ou horário especial) por cima.
--   2. Duração da consulta fixa por profissional (não varia por serviço).
--   3. Só proprietária e recepção criam/editam agendamentos. Médico
--      só visualiza a própria agenda (usuario_id -> profissionais).
-- ============================================================

begin;

-- ============================================================
-- ESCOPO 1 — duração da consulta no profissional
-- ============================================================
alter table public.profissionais
  add column duracao_consulta_minutos integer not null default 30
    check (duracao_consulta_minutos > 0);

-- Limpeza pendente desde a sessão do repasse: existiam 2 versões
-- sobrepostas de cadastrar_profissional (6 e 8 parâmetros). Consolidando
-- numa única versão canônica, já com o campo novo.
drop function if exists public.cadastrar_profissional(text, text, text, text, uuid, uuid);
drop function if exists public.cadastrar_profissional(text, text, text, text, uuid, uuid, numeric, numeric);

create function public.cadastrar_profissional(
  p_nome_completo text,
  p_cpf text,
  p_conselho_classe text,
  p_registro_conselho text,
  p_especialidade_principal_id uuid,
  p_clinica_id uuid,
  p_valor_consulta numeric default null,
  p_taxa_repasse_clinica numeric default 20,
  p_duracao_consulta_minutos integer default 30
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
    valor_consulta, taxa_repasse_clinica, duracao_consulta_minutos, created_by
  ) values (
    p_nome_completo, v_cpf_encrypted, v_cpf_hash,
    p_conselho_classe, p_registro_conselho, p_especialidade_principal_id,
    p_valor_consulta, p_taxa_repasse_clinica, p_duracao_consulta_minutos, auth.uid()
  )
  returning id into v_profissional_id;

  insert into public.profissionais_clinicas (profissional_id, clinica_id, created_by)
  values (v_profissional_id, p_clinica_id, auth.uid());

  return v_profissional_id;
end;
$$;

grant execute on function
  public.cadastrar_profissional(text, text, text, text, uuid, uuid, numeric, numeric, integer)
  to authenticated;

-- ============================================================
-- ESCOPO 2 — disponibilidade padrão (horário semanal fixo)
-- ============================================================
create table public.disponibilidade_padrao (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0=domingo
  hora_inicio time not null,
  hora_fim time not null check (hora_fim > hora_inicio),
  ativo boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
  -- Sem exclusion constraint aqui de propósito: é só o template
  -- administrativo, validação de sobreposição fica na tela. A trava
  -- forte de verdade (banco) está em agendamentos, onde importa —
  -- ninguém marca 2 pacientes no mesmo horário sem o banco barrar.
);

alter table public.disponibilidade_padrao enable row level security;

create policy disponibilidade_select on public.disponibilidade_padrao
  for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario()));

create policy disponibilidade_insert on public.disponibilidade_padrao
  for insert to authenticated
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

create policy disponibilidade_update on public.disponibilidade_padrao
  for update to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

create policy disponibilidade_delete on public.disponibilidade_padrao
  for delete to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

-- ============================================================
-- ESCOPO 3 — exceções pontuais (folga / horário especial)
-- ============================================================
create type public.tipo_excecao_agenda as enum ('folga', 'horario_especial');

create table public.agenda_excecoes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  data date not null,
  tipo public.tipo_excecao_agenda not null,
  hora_inicio time,
  hora_fim time,
  motivo text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint excecao_horario_consistente check (
    (tipo = 'folga' and hora_inicio is null and hora_fim is null)
    or (tipo = 'horario_especial' and hora_inicio is not null
        and hora_fim is not null and hora_fim > hora_inicio)
  ),
  unique (profissional_id, clinica_id, data)
);

alter table public.agenda_excecoes enable row level security;

create policy excecoes_select on public.agenda_excecoes
  for select to authenticated
  using (clinica_id in (select public.clinicas_do_usuario()));

create policy excecoes_insert on public.agenda_excecoes
  for insert to authenticated
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

create policy excecoes_update on public.agenda_excecoes
  for update to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

create policy excecoes_delete on public.agenda_excecoes
  for delete to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

-- ============================================================
-- ESCOPO 4 — agendamentos (a trava forte fica aqui)
-- ============================================================
create type public.status_agendamento as enum (
  'agendado', 'confirmado', 'aguardando', 'em_atendimento', 'concluido', 'cancelado'
);

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  paciente_id uuid not null references public.pacientes(id) on delete restrict,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  status public.status_agendamento not null default 'agendado',
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- hora_fim é sempre calculado no servidor a partir da duração cadastrada
-- no profissional — nunca aceito do cliente, pra impedir alguém driblar
-- a trava de sobreposição mandando uma duração menor que a real.
create function public.calcular_hora_fim_agendamento()
returns trigger
language plpgsql
as $$
declare
  v_duracao integer;
begin
  select duracao_consulta_minutos into v_duracao
  from public.profissionais
  where id = new.profissional_id;

  if v_duracao is null then
    raise exception 'Profissional sem duração de consulta cadastrada';
  end if;

  new.hora_fim := new.hora_inicio + (v_duracao || ' minutes')::interval;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_calcular_hora_fim
  before insert or update of hora_inicio, profissional_id on public.agendamentos
  for each row
  execute function public.calcular_hora_fim_agendamento();

-- Impede 2 agendamentos com o MESMO profissional se sobrepondo no
-- MESMO horário — banco barra, não só a tela. Cancelados não contam
-- (reabre o horário).
create extension if not exists btree_gist;

alter table public.agendamentos
  add constraint agendamentos_sem_sobreposicao
  exclude using gist (
    profissional_id with =,
    clinica_id with =,
    tsrange(data + hora_inicio, data + hora_fim) with &&
  ) where (status <> 'cancelado');

alter table public.agendamentos enable row level security;

-- proprietária/recepção veem tudo da clínica; médico só a própria
-- agenda (via profissionais.usuario_id, que já existe no schema)
create policy agendamentos_select on public.agendamentos
  for select to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and (
      public.eh_proprietaria_ou_recepcao(clinica_id)
      or profissional_id in (
        select id from public.profissionais where usuario_id = auth.uid()
      )
    )
  );

-- só proprietária/recepção criam, editam ou removem (decidido com o
-- Eduardo em 04/08/2026) — inclui trava dupla igual à de entradas_caixa:
-- paciente e profissional precisam pertencer à mesma clínica do agendamento
create policy agendamentos_insert on public.agendamentos
  for insert to authenticated
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
    and exists (
      select 1 from public.pacientes p
      where p.id = agendamentos.paciente_id and p.clinica_id = agendamentos.clinica_id
    )
    and exists (
      select 1 from public.profissionais_clinicas pc
      where pc.profissional_id = agendamentos.profissional_id
        and pc.clinica_id = agendamentos.clinica_id
        and pc.ativo
    )
  );

create policy agendamentos_update on public.agendamentos
  for update to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

create policy agendamentos_delete on public.agendamentos
  for delete to authenticated
  using (
    clinica_id in (select public.clinicas_do_usuario())
    and public.eh_proprietaria_ou_recepcao(clinica_id)
  );

commit;
