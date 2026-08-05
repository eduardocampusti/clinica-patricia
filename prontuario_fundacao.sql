-- ============================================================
-- PRONTUÁRIO — fundação (schema + RLS + auditoria de leitura)
-- Sessão 04/08/2026. Decisões confirmadas com o Eduardo:
--   1. Assinatura = trava no sistema (imutável ao finalizar), sem
--      certificado ICP-Brasil por enquanto. Evolui depois sem redesenhar.
--   2. Núcleo comum: queixa_principal, anamnese, exame_fisico,
--      hipotese_diagnostica, cid, conduta_evolucao, prescricao — mais
--      dados_adicionais (jsonb) reservado pra extensão por especialidade.
--   3. Auditoria de LEITURA construída já (tabela só — painel de consulta
--      fica pro módulo de Relatórios/LGPD, passo 9).
--   4. Proprietária e recepção NÃO têm acesso clínico automático — só o
--      profissional que atendeu (10-PLANO-DIRETOR.md, princípio 4).
--      Exceção: proprietária pode ver o LOG de auditoria (quem abriu o
--      quê e quando) — é metadado de compliance, não conteúdo clínico.
-- ============================================================

begin;

create type public.status_atendimento as enum ('em_andamento', 'finalizado');

create table public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  paciente_id uuid not null references public.pacientes(id) on delete restrict,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  agendamento_id uuid references public.agendamentos(id) on delete set null,

  queixa_principal text,
  anamnese text,
  exame_fisico text,
  hipotese_diagnostica text,
  cid text,
  conduta_evolucao text,
  prescricao text,
  dados_adicionais jsonb not null default '{}',

  status public.status_atendimento not null default 'em_andamento',
  finalizado_em timestamptz,
  finalizado_por uuid references auth.users(id),

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Imutabilidade real: uma vez finalizado, NENHUM update passa —
-- correção só por adendo (tabela abaixo). Não é "campo trava sozinho",
-- é o banco recusando a operação inteira.
create function public.bloquear_edicao_atendimento_finalizado()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'finalizado' then
    raise exception 'Atendimento finalizado é imutável. Use um adendo para correções.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_bloquear_edicao_atendimento_finalizado
  before update on public.atendimentos
  for each row
  execute function public.bloquear_edicao_atendimento_finalizado();

-- ============================================================
-- Adendos — correção de atendimento finalizado, append-only
-- ============================================================
create table public.atendimentos_adendos (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.atendimentos(id) on delete restrict,
  texto text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.atendimentos_adendos enable row level security;

create policy adendos_select on public.atendimentos_adendos
  for select to authenticated
  using (
    atendimento_id in (
      select id from public.atendimentos
      where profissional_id in (select id from public.profissionais where usuario_id = auth.uid())
    )
  );

create policy adendos_insert on public.atendimentos_adendos
  for insert to authenticated
  with check (
    atendimento_id in (
      select id from public.atendimentos
      where profissional_id in (select id from public.profissionais where usuario_id = auth.uid())
        and status = 'finalizado'
    )
  );
-- sem policy de update/delete: append-only por padrão (default deny)

-- ============================================================
-- Documentos clínicos (receita, atestado etc.) — um atendimento
-- pode gerar vários. Também imutáveis (sem update/delete policy).
-- ============================================================
create type public.tipo_documento_clinico as enum (
  'receita', 'atestado', 'encaminhamento', 'solicitacao_exame'
);

create table public.documentos_clinicos (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.atendimentos(id) on delete restrict,
  tipo public.tipo_documento_clinico not null,
  conteudo text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.documentos_clinicos enable row level security;

create policy documentos_select on public.documentos_clinicos
  for select to authenticated
  using (
    atendimento_id in (
      select id from public.atendimentos
      where profissional_id in (select id from public.profissionais where usuario_id = auth.uid())
    )
  );

create policy documentos_insert on public.documentos_clinicos
  for insert to authenticated
  with check (
    atendimento_id in (
      select id from public.atendimentos
      where profissional_id in (select id from public.profissionais where usuario_id = auth.uid())
    )
  );

-- ============================================================
-- Auditoria de leitura clínica
-- ============================================================
create table public.auditoria_leitura_clinica (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references public.atendimentos(id) on delete cascade,
  usuario_id uuid not null references auth.users(id),
  lido_em timestamptz not null default now()
);

alter table public.auditoria_leitura_clinica enable row level security;

-- proprietária vê o LOG (metadado: quem/quando) mas não o conteúdo —
-- é a exceção documentada acima. Ninguém mais tem select, e ninguém
-- (nem proprietária) tem insert/update/delete direto — só a RPC grava.
create policy auditoria_leitura_select on public.auditoria_leitura_clinica
  for select to authenticated
  using (
    exists (
      select 1 from public.atendimentos a
      where a.id = auditoria_leitura_clinica.atendimento_id
        and public.eh_proprietaria(a.clinica_id)
    )
  );

alter table public.atendimentos enable row level security;

create policy atendimentos_select on public.atendimentos
  for select to authenticated
  using (
    profissional_id in (select id from public.profissionais where usuario_id = auth.uid())
  );

create policy atendimentos_insert on public.atendimentos
  for insert to authenticated
  with check (
    clinica_id in (select public.clinicas_do_usuario())
    and profissional_id in (select id from public.profissionais where usuario_id = auth.uid())
    and exists (
      select 1 from public.pacientes p
      where p.id = atendimentos.paciente_id and p.clinica_id = atendimentos.clinica_id
    )
  );

create policy atendimentos_update on public.atendimentos
  for update to authenticated
  using (
    profissional_id in (select id from public.profissionais where usuario_id = auth.uid())
  );
-- sem policy de delete: atendimento nunca é apagado

-- ============================================================
-- RPCs — todo acesso de LEITURA ao conteúdo clínico completo passa
-- por aqui (audita); toda finalização passa por aqui (atômico,
-- registra quem e quando).
-- ============================================================
create function public.abrir_atendimento(p_atendimento_id uuid)
returns public.atendimentos
language plpgsql
security definer
as $$
declare
  v_registro public.atendimentos;
  v_meu_profissional_id uuid;
begin
  select id into v_meu_profissional_id
  from public.profissionais where usuario_id = auth.uid();

  select * into v_registro
  from public.atendimentos
  where id = p_atendimento_id and profissional_id = v_meu_profissional_id;

  if v_registro.id is null then
    raise exception 'Atendimento não encontrado ou sem permissão';
  end if;

  insert into public.auditoria_leitura_clinica (atendimento_id, usuario_id)
  values (p_atendimento_id, auth.uid());

  return v_registro;
end;
$$;

grant execute on function public.abrir_atendimento(uuid) to authenticated;

create function public.finalizar_atendimento(p_atendimento_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_meu_profissional_id uuid;
begin
  select id into v_meu_profissional_id
  from public.profissionais where usuario_id = auth.uid();

  update public.atendimentos
  set status = 'finalizado', finalizado_em = now(), finalizado_por = auth.uid()
  where id = p_atendimento_id
    and profissional_id = v_meu_profissional_id
    and status = 'em_andamento';

  if not found then
    raise exception 'Atendimento não encontrado, já finalizado, ou sem permissão';
  end if;
end;
$$;

grant execute on function public.finalizar_atendimento(uuid) to authenticated;

commit;
