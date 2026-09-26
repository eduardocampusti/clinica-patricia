-- RASCUNHO AUTOCONTIDO: fronteira RPC do Prontuário.
-- Fonte preservada: prontuario_hardening.sql
-- SHA-256 da fonte: D3EA6DD41F15A2504EB1607DEEB62A75848466E5519F4F52E8F9307A4DD3BC48
-- Pré-requisito: 03_acls_default_privileges.sql e 04_hardening_geral.sql.

begin;

do $$
declare
  v_fingerprint text;
  v_superuser boolean;
begin
  select rolsuper into v_superuser from pg_roles where rolname = current_user;
  if not coalesce(v_superuser, false)
     and not pg_has_role(current_user, 'postgres', 'member') then
    raise exception 'Executor precisa ser superusuário ou membro de postgres para alterar policies, tabelas e funções da baseline.';
  end if;

  select concat_ws('|',
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
    (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e'),
    (select count(*) from information_schema.columns where table_schema = 'public'),
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
    (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity),
    (select count(*) from pg_constraint con join pg_class c on c.oid = con.conrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    (select count(*) from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and i.indisvalid),
    (select count(*) from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace left join pg_constraint con on con.conindid = i.indexrelid where n.nspname = 'public' and i.indisvalid and con.oid is null)
  ) into v_fingerprint;

  if v_fingerprint <> '19|10|188|17|13|47|19|88|29|3' then
    raise exception 'Fingerprint pré-Prontuário incompatível: esperado %, encontrado %.',
      '19|10|188|17|13|47|19|88|29|3', v_fingerprint;
  end if;

  if to_regclass('auth.users') is null
     or to_regclass('vault.decrypted_secrets') is null
     or to_regprocedure('public.usuario_tem_vinculo_ativo()') is null
     or not exists (select 1 from pg_extension where extname = 'btree_gist')
     or not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    raise exception 'Dependências do Prontuário ou da baseline ausentes.';
  end if;
end;
$$;

-- Início do hardening do Prontuário incorporado sem alterações:
-- ============================================================
-- PRONTUÁRIO — hardening incremental
--
-- IMPORTANTE:
--   - este arquivo NÃO substitui prontuario_fundacao.sql;
--   - não remove tabelas, colunas ou dados;
--   - deve ser aplicado somente após revisão e autorização explícita;
--   - o frontend não usa service_role: todas as chamadas usam authenticated.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Preflight: falhar sem corrigir ou apagar dados existentes.
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from public.atendimentos
    where agendamento_id is not null
    group by agendamento_id
    having count(*) > 1
  ) then
    raise exception 'Hardening abortado: existem atendimentos duplicados para o mesmo agendamento.';
  end if;

  if exists (
    select 1
    from public.atendimentos a
    join public.pacientes p on p.id = a.paciente_id
    where p.clinica_id <> a.clinica_id
  ) then
    raise exception 'Hardening abortado: existe atendimento vinculado a paciente de outra clínica.';
  end if;

  if exists (
    select 1
    from public.atendimentos a
    where not exists (
      select 1
      from public.profissionais_clinicas pc
      where pc.profissional_id = a.profissional_id
        and pc.clinica_id = a.clinica_id
    )
  ) then
    raise exception 'Hardening abortado: existe atendimento sem vínculo profissional/clínica correspondente.';
  end if;

  if exists (
    select 1
    from public.atendimentos a
    join public.agendamentos ag on ag.id = a.agendamento_id
    where a.agendamento_id is not null
      and (
        ag.clinica_id <> a.clinica_id
        or ag.paciente_id <> a.paciente_id
        or ag.profissional_id <> a.profissional_id
      )
  ) then
    raise exception 'Hardening abortado: existe atendimento incompatível com seu agendamento.';
  end if;

  if exists (
    select 1
    from public.atendimentos
    where (status = 'em_andamento' and (finalizado_em is not null or finalizado_por is not null))
       or (status = 'finalizado' and (finalizado_em is null or finalizado_por is null))
  ) then
    raise exception 'Hardening abortado: existem metadados de finalização inconsistentes.';
  end if;

  if exists (
    select 1 from public.atendimentos_adendos where length(btrim(texto)) = 0
  ) then
    raise exception 'Hardening abortado: existem adendos vazios.';
  end if;

  if exists (
    select 1 from public.documentos_clinicos where length(btrim(conteudo)) = 0
  ) then
    raise exception 'Hardening abortado: existem documentos clínicos vazios.';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 2) Integridade estrutural e índices.
-- ------------------------------------------------------------
create unique index atendimentos_agendamento_id_unique
  on public.atendimentos (agendamento_id)
  where agendamento_id is not null;

create index atendimentos_profissional_clinica_created_idx
  on public.atendimentos (profissional_id, clinica_id, created_at desc);

create index atendimentos_adendos_atendimento_created_idx
  on public.atendimentos_adendos (atendimento_id, created_at);

create index documentos_clinicos_atendimento_created_idx
  on public.documentos_clinicos (atendimento_id, created_at desc);

create index auditoria_leitura_atendimento_lido_idx
  on public.auditoria_leitura_clinica (atendimento_id, lido_em desc);

alter table public.atendimentos
  add constraint atendimentos_finalizacao_coerente
  check (
    (status = 'em_andamento' and finalizado_em is null and finalizado_por is null)
    or
    (status = 'finalizado' and finalizado_em is not null and finalizado_por is not null)
  );

alter table public.atendimentos_adendos
  add constraint atendimentos_adendos_texto_nao_vazio
  check (length(btrim(texto)) > 0);

alter table public.documentos_clinicos
  add constraint documentos_clinicos_conteudo_nao_vazio
  check (length(btrim(conteudo)) > 0);

create function public.validar_integridade_atendimento()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'UPDATE' then
    if old.id <> new.id
      or old.clinica_id <> new.clinica_id
      or old.paciente_id <> new.paciente_id
      or old.profissional_id <> new.profissional_id
      or old.created_by is distinct from new.created_by
    then
      raise exception 'Os vínculos estruturais do atendimento são imutáveis.' using errcode = '23514';
    end if;

    -- Preserva o ON DELETE SET NULL já definido para agendamento_id, mas
    -- impede associar ou trocar o agendamento depois da criação.
    if old.agendamento_id is distinct from new.agendamento_id
      and new.agendamento_id is not null
    then
      raise exception 'O agendamento do atendimento não pode ser alterado.' using errcode = '23514';
    end if;
  end if;

  -- As validações relacionais completas são necessárias na criação. Em
  -- UPDATE, os campos acima não podem mudar (exceto SET NULL da FK).
  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.pacientes p
      where p.id = new.paciente_id
        and p.clinica_id = new.clinica_id
    ) then
      raise exception 'Paciente não pertence à clínica do atendimento.' using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.profissionais_clinicas pc
      where pc.profissional_id = new.profissional_id
        and pc.clinica_id = new.clinica_id
        and pc.ativo
    ) then
      raise exception 'Profissional não possui vínculo ativo com a clínica.' using errcode = '23514';
    end if;

    if new.agendamento_id is not null and not exists (
      select 1
      from public.agendamentos ag
      where ag.id = new.agendamento_id
        and ag.clinica_id = new.clinica_id
        and ag.paciente_id = new.paciente_id
        and ag.profissional_id = new.profissional_id
    ) then
      raise exception 'Agendamento incompatível com o atendimento.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validar_integridade_atendimento
  before insert or update on public.atendimentos
  for each row
  execute function public.validar_integridade_atendimento();

revoke all on function public.validar_integridade_atendimento() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3) RPCs seguras. Toda autorização é refeita dentro da função.
-- ------------------------------------------------------------
create function public.listar_atendimentos_prontuario(p_clinica_id uuid)
returns table (
  id uuid,
  paciente_id uuid,
  paciente_nome text,
  agendamento_id uuid,
  status public.status_atendimento,
  created_at timestamptz,
  finalizado_em timestamptz
)
language plpgsql
security definer
stable
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_profissional_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  select p.id
  into strict v_profissional_id
  from public.profissionais p
  join public.profissionais_clinicas pc
    on pc.profissional_id = p.id
   and pc.clinica_id = p_clinica_id
   and pc.ativo
  join public.usuarios_clinicas uc
    on uc.usuario_id = v_usuario_id
   and uc.clinica_id = p_clinica_id
   and uc.papel = 'medico'
   and uc.ativo
  where p.usuario_id = v_usuario_id
    and p.ativo;

  return query
  select
    a.id,
    a.paciente_id,
    pac.nome_completo,
    a.agendamento_id,
    a.status,
    a.created_at,
    a.finalizado_em
  from public.atendimentos a
  join public.pacientes pac on pac.id = a.paciente_id and pac.clinica_id = a.clinica_id
  where a.clinica_id = p_clinica_id
    and a.profissional_id = v_profissional_id
  order by a.created_at desc;
exception
  when no_data_found or too_many_rows then
    raise exception 'Médico sem vínculo clínico único e ativo nesta clínica.' using errcode = '42501';
end;
$$;

create function public.abrir_prontuario(p_atendimento_id uuid)
returns jsonb
language plpgsql
security definer
volatile
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_atendimento public.atendimentos%rowtype;
  v_paciente_nome text;
  v_adendos jsonb;
  v_documentos jsonb;
begin
  if v_usuario_id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  select a.*
  into v_atendimento
  from public.atendimentos a
  join public.profissionais p
    on p.id = a.profissional_id
   and p.usuario_id = v_usuario_id
   and p.ativo
  join public.profissionais_clinicas pc
    on pc.profissional_id = a.profissional_id
   and pc.clinica_id = a.clinica_id
   and pc.ativo
  join public.usuarios_clinicas uc
    on uc.usuario_id = v_usuario_id
   and uc.clinica_id = a.clinica_id
   and uc.papel = 'medico'
   and uc.ativo
  where a.id = p_atendimento_id
  for share of a;

  if v_atendimento.id is null then
    raise exception 'Atendimento não encontrado ou sem permissão.' using errcode = '42501';
  end if;

  select pac.nome_completo
  into v_paciente_nome
  from public.pacientes pac
  where pac.id = v_atendimento.paciente_id
    and pac.clinica_id = v_atendimento.clinica_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', ad.id, 'texto', ad.texto, 'created_at', ad.created_at)
      order by ad.created_at
    ),
    '[]'::jsonb
  )
  into v_adendos
  from public.atendimentos_adendos ad
  where ad.atendimento_id = v_atendimento.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', dc.id,
        'tipo', dc.tipo,
        'conteudo', dc.conteudo,
        'created_at', dc.created_at
      )
      order by dc.created_at desc
    ),
    '[]'::jsonb
  )
  into v_documentos
  from public.documentos_clinicos dc
  where dc.atendimento_id = v_atendimento.id;

  insert into public.auditoria_leitura_clinica (atendimento_id, usuario_id)
  values (v_atendimento.id, v_usuario_id);

  return jsonb_build_object(
    'atendimento', jsonb_build_object(
      'id', v_atendimento.id,
      'paciente_id', v_atendimento.paciente_id,
      'paciente_nome', v_paciente_nome,
      'agendamento_id', v_atendimento.agendamento_id,
      'queixa_principal', v_atendimento.queixa_principal,
      'anamnese', v_atendimento.anamnese,
      'exame_fisico', v_atendimento.exame_fisico,
      'hipotese_diagnostica', v_atendimento.hipotese_diagnostica,
      'cid', v_atendimento.cid,
      'conduta_evolucao', v_atendimento.conduta_evolucao,
      'prescricao', v_atendimento.prescricao,
      'status', v_atendimento.status,
      'finalizado_em', v_atendimento.finalizado_em,
      'created_at', v_atendimento.created_at,
      'updated_at', v_atendimento.updated_at
    ),
    'adendos', v_adendos,
    'documentos', v_documentos
  );
end;
$$;

create function public.iniciar_atendimento_avulso(
  p_clinica_id uuid,
  p_paciente_id uuid
)
returns uuid
language plpgsql
security definer
volatile
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_profissional_id uuid;
  v_atendimento_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  select p.id
  into strict v_profissional_id
  from public.profissionais p
  join public.profissionais_clinicas pc
    on pc.profissional_id = p.id
   and pc.clinica_id = p_clinica_id
   and pc.ativo
  join public.usuarios_clinicas uc
    on uc.usuario_id = v_usuario_id
   and uc.clinica_id = p_clinica_id
   and uc.papel = 'medico'
   and uc.ativo
  where p.usuario_id = v_usuario_id
    and p.ativo;

  if not exists (
    select 1
    from public.pacientes pac
    where pac.id = p_paciente_id
      and pac.clinica_id = p_clinica_id
      and pac.ativo
  ) then
    raise exception 'Paciente ativo não encontrado nesta clínica.' using errcode = '23514';
  end if;

  insert into public.atendimentos (
    clinica_id, paciente_id, profissional_id, created_by
  ) values (
    p_clinica_id, p_paciente_id, v_profissional_id, v_usuario_id
  )
  returning id into v_atendimento_id;

  return v_atendimento_id;
exception
  when no_data_found or too_many_rows then
    raise exception 'Médico sem vínculo clínico único e ativo nesta clínica.' using errcode = '42501';
end;
$$;

create function public.iniciar_atendimento_agendado(
  p_clinica_id uuid,
  p_agendamento_id uuid
)
returns uuid
language plpgsql
security definer
volatile
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_profissional_id uuid;
  v_agendamento public.agendamentos%rowtype;
  v_atendimento_id uuid;
  v_data_local date := (pg_catalog.clock_timestamp() at time zone 'America/Bahia')::date;
begin
  if v_usuario_id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  select p.id
  into strict v_profissional_id
  from public.profissionais p
  join public.profissionais_clinicas pc
    on pc.profissional_id = p.id
   and pc.clinica_id = p_clinica_id
   and pc.ativo
  join public.usuarios_clinicas uc
    on uc.usuario_id = v_usuario_id
   and uc.clinica_id = p_clinica_id
   and uc.papel = 'medico'
   and uc.ativo
  where p.usuario_id = v_usuario_id
    and p.ativo;

  select ag.*
  into v_agendamento
  from public.agendamentos ag
  where ag.id = p_agendamento_id
    and ag.clinica_id = p_clinica_id
  for update;

  if v_agendamento.id is null then
    raise exception 'Agendamento não encontrado nesta clínica.' using errcode = '23514';
  end if;

  if v_agendamento.profissional_id <> v_profissional_id then
    raise exception 'Agendamento pertence a outro profissional.' using errcode = '42501';
  end if;

  if v_agendamento.status in ('cancelado', 'concluido') then
    raise exception 'Agendamento cancelado ou concluído não pode iniciar atendimento.' using errcode = '23514';
  end if;

  if v_agendamento.data <> v_data_local then
    raise exception 'O atendimento só pode ser iniciado na data do agendamento.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.pacientes pac
    where pac.id = v_agendamento.paciente_id
      and pac.clinica_id = p_clinica_id
  ) then
    raise exception 'Paciente do agendamento não pertence à clínica.' using errcode = '23514';
  end if;

  select a.id
  into v_atendimento_id
  from public.atendimentos a
  where a.agendamento_id = p_agendamento_id;

  if v_atendimento_id is null then
    insert into public.atendimentos (
      clinica_id, paciente_id, profissional_id, agendamento_id, created_by
    ) values (
      p_clinica_id,
      v_agendamento.paciente_id,
      v_profissional_id,
      p_agendamento_id,
      v_usuario_id
    )
    returning id into v_atendimento_id;
  end if;

  if v_agendamento.status <> 'em_atendimento' then
    update public.agendamentos
    set status = 'em_atendimento'
    where id = p_agendamento_id;
  end if;

  return v_atendimento_id;
exception
  when no_data_found or too_many_rows then
    raise exception 'Médico sem vínculo clínico único e ativo nesta clínica.' using errcode = '42501';
end;
$$;

create function public.salvar_rascunho_atendimento(
  p_atendimento_id uuid,
  p_queixa_principal text,
  p_anamnese text,
  p_exame_fisico text,
  p_hipotese_diagnostica text,
  p_cid text,
  p_conduta_evolucao text,
  p_prescricao text
)
returns timestamptz
language plpgsql
security definer
volatile
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_updated_at timestamptz;
begin
  if v_usuario_id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  update public.atendimentos a
  set
    queixa_principal = p_queixa_principal,
    anamnese = p_anamnese,
    exame_fisico = p_exame_fisico,
    hipotese_diagnostica = p_hipotese_diagnostica,
    cid = p_cid,
    conduta_evolucao = p_conduta_evolucao,
    prescricao = p_prescricao
  where a.id = p_atendimento_id
    and a.status = 'em_andamento'
    and exists (
      select 1
      from public.profissionais p
      join public.profissionais_clinicas pc
        on pc.profissional_id = p.id
       and pc.clinica_id = a.clinica_id
       and pc.ativo
      join public.usuarios_clinicas uc
        on uc.usuario_id = v_usuario_id
       and uc.clinica_id = a.clinica_id
       and uc.papel = 'medico'
       and uc.ativo
      where p.id = a.profissional_id
        and p.usuario_id = v_usuario_id
        and p.ativo
    )
  returning a.updated_at into v_updated_at;

  if v_updated_at is null then
    raise exception 'Atendimento não encontrado, finalizado ou sem permissão.' using errcode = '42501';
  end if;

  return v_updated_at;
end;
$$;

create function public.finalizar_atendimento_seguro(
  p_atendimento_id uuid,
  p_queixa_principal text,
  p_anamnese text,
  p_exame_fisico text,
  p_hipotese_diagnostica text,
  p_cid text,
  p_conduta_evolucao text,
  p_prescricao text
)
returns timestamptz
language plpgsql
security definer
volatile
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_finalizado_em timestamptz;
begin
  if v_usuario_id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  update public.atendimentos a
  set
    queixa_principal = p_queixa_principal,
    anamnese = p_anamnese,
    exame_fisico = p_exame_fisico,
    hipotese_diagnostica = p_hipotese_diagnostica,
    cid = p_cid,
    conduta_evolucao = p_conduta_evolucao,
    prescricao = p_prescricao,
    status = 'finalizado',
    finalizado_em = pg_catalog.clock_timestamp(),
    finalizado_por = v_usuario_id
  where a.id = p_atendimento_id
    and a.status = 'em_andamento'
    and exists (
      select 1
      from public.profissionais p
      join public.profissionais_clinicas pc
        on pc.profissional_id = p.id
       and pc.clinica_id = a.clinica_id
       and pc.ativo
      join public.usuarios_clinicas uc
        on uc.usuario_id = v_usuario_id
       and uc.clinica_id = a.clinica_id
       and uc.papel = 'medico'
       and uc.ativo
      where p.id = a.profissional_id
        and p.usuario_id = v_usuario_id
        and p.ativo
    )
  returning a.finalizado_em into v_finalizado_em;

  if v_finalizado_em is null then
    raise exception 'Atendimento não encontrado, já finalizado ou sem permissão.' using errcode = '42501';
  end if;

  return v_finalizado_em;
end;
$$;

create function public.adicionar_adendo_prontuario(
  p_atendimento_id uuid,
  p_texto text
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_adendo public.atendimentos_adendos%rowtype;
begin
  if v_usuario_id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_texto, ''))) = 0 then
    raise exception 'O texto do adendo é obrigatório.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.atendimentos a
    join public.profissionais p
      on p.id = a.profissional_id
     and p.usuario_id = v_usuario_id
     and p.ativo
    join public.profissionais_clinicas pc
      on pc.profissional_id = a.profissional_id
     and pc.clinica_id = a.clinica_id
     and pc.ativo
    join public.usuarios_clinicas uc
      on uc.usuario_id = v_usuario_id
     and uc.clinica_id = a.clinica_id
     and uc.papel = 'medico'
     and uc.ativo
    where a.id = p_atendimento_id
      and a.status = 'finalizado'
  ) then
    raise exception 'Atendimento não finalizado ou sem permissão.' using errcode = '42501';
  end if;

  insert into public.atendimentos_adendos (atendimento_id, texto, created_by)
  values (p_atendimento_id, btrim(p_texto), v_usuario_id)
  returning * into v_adendo;

  return jsonb_build_object(
    'id', v_adendo.id,
    'texto', v_adendo.texto,
    'created_at', v_adendo.created_at
  );
end;
$$;

create function public.criar_documento_prontuario(
  p_atendimento_id uuid,
  p_tipo public.tipo_documento_clinico,
  p_conteudo text
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_documento public.documentos_clinicos%rowtype;
begin
  if v_usuario_id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_conteudo, ''))) = 0 then
    raise exception 'O conteúdo do documento é obrigatório.' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.atendimentos a
    join public.profissionais p
      on p.id = a.profissional_id
     and p.usuario_id = v_usuario_id
     and p.ativo
    join public.profissionais_clinicas pc
      on pc.profissional_id = a.profissional_id
     and pc.clinica_id = a.clinica_id
     and pc.ativo
    join public.usuarios_clinicas uc
      on uc.usuario_id = v_usuario_id
     and uc.clinica_id = a.clinica_id
     and uc.papel = 'medico'
     and uc.ativo
    where a.id = p_atendimento_id
  ) then
    raise exception 'Atendimento não encontrado ou sem permissão.' using errcode = '42501';
  end if;

  insert into public.documentos_clinicos (atendimento_id, tipo, conteudo, created_by)
  values (p_atendimento_id, p_tipo, btrim(p_conteudo), v_usuario_id)
  returning * into v_documento;

  return jsonb_build_object(
    'id', v_documento.id,
    'tipo', v_documento.tipo,
    'conteudo', v_documento.conteudo,
    'created_at', v_documento.created_at
  );
end;
$$;

-- A policy da auditoria precisa consultar o tenant do atendimento sem
-- devolver conteúdo clínico e sem depender de SELECT direto na tabela.
create function public.pode_ler_auditoria_atendimento(p_atendimento_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.atendimentos a
    join public.usuarios_clinicas uc
      on uc.clinica_id = a.clinica_id
     and uc.usuario_id = auth.uid()
     and uc.papel = 'proprietaria'
     and uc.ativo
    where a.id = p_atendimento_id
  );
$$;

-- ------------------------------------------------------------
-- 4) RLS e grants mínimos. As policies antigas são preservadas,
--    porém passam a negar acesso direto; as RPCs fazem a mediação.
-- ------------------------------------------------------------
alter policy atendimentos_select on public.atendimentos using (false);
alter policy atendimentos_insert on public.atendimentos with check (false);
alter policy atendimentos_update on public.atendimentos using (false) with check (false);

alter policy adendos_select on public.atendimentos_adendos using (false);
alter policy adendos_insert on public.atendimentos_adendos with check (false);

alter policy documentos_select on public.documentos_clinicos using (false);
alter policy documentos_insert on public.documentos_clinicos with check (false);

alter policy auditoria_leitura_select on public.auditoria_leitura_clinica
  using (public.pode_ler_auditoria_atendimento(atendimento_id));

revoke all on table public.atendimentos from public, anon, authenticated;
revoke all on table public.atendimentos_adendos from public, anon, authenticated;
revoke all on table public.documentos_clinicos from public, anon, authenticated;
revoke all on table public.auditoria_leitura_clinica from public, anon, authenticated;
grant select on table public.auditoria_leitura_clinica to authenticated;

-- As funções legadas continuam existentes para preservar o histórico e
-- permitir rollback, mas não permanecem acessíveis ao aplicativo.
alter function public.abrir_atendimento(uuid) set search_path = pg_catalog;
alter function public.finalizar_atendimento(uuid) set search_path = pg_catalog;
revoke all on function public.abrir_atendimento(uuid) from public, anon, authenticated;
revoke all on function public.finalizar_atendimento(uuid) from public, anon, authenticated;

revoke all on function public.listar_atendimentos_prontuario(uuid) from public, anon, authenticated;
revoke all on function public.abrir_prontuario(uuid) from public, anon, authenticated;
revoke all on function public.iniciar_atendimento_avulso(uuid, uuid) from public, anon, authenticated;
revoke all on function public.iniciar_atendimento_agendado(uuid, uuid) from public, anon, authenticated;
revoke all on function public.salvar_rascunho_atendimento(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.finalizar_atendimento_seguro(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.adicionar_adendo_prontuario(uuid, text) from public, anon, authenticated;
revoke all on function public.criar_documento_prontuario(uuid, public.tipo_documento_clinico, text) from public, anon, authenticated;
revoke all on function public.pode_ler_auditoria_atendimento(uuid) from public, anon, authenticated;

grant execute on function public.listar_atendimentos_prontuario(uuid) to authenticated;
grant execute on function public.abrir_prontuario(uuid) to authenticated;
grant execute on function public.iniciar_atendimento_avulso(uuid, uuid) to authenticated;
grant execute on function public.iniciar_atendimento_agendado(uuid, uuid) to authenticated;
grant execute on function public.salvar_rascunho_atendimento(uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.finalizar_atendimento_seguro(uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.adicionar_adendo_prontuario(uuid, text) to authenticated;
grant execute on function public.criar_documento_prontuario(uuid, public.tipo_documento_clinico, text) to authenticated;
grant execute on function public.pode_ler_auditoria_atendimento(uuid) to authenticated;

-- Fim do hardening do Prontuário incorporado.

commit;
