\set ON_ERROR_STOP on

-- Uso exclusivo em banco existente já comparado com a baseline.
-- Cria o histórico que a CLI Supabase espera e registra 00, 01 e 02 somente
-- depois da execução manual controlada de 00/01, do fingerprint de domínio e
-- da confirmação de que 02 não foi executada. Não cria objetos da baseline.

begin;

do $$
declare
  v_fingerprint text;
begin
  if exists (
    select 1
    from pg_namespace n
    where n.nspname = 'supabase_migrations'
  ) then
    raise exception 'Bootstrap abortado: schema supabase_migrations já existe; não sobrescreva histórico existente.';
  end if;

  if to_regclass('public.agendamentos') is null then
    raise exception 'Bootstrap abortado: public.agendamentos ausente; este procedimento é exclusivo de banco existente.';
  end if;

  select concat_ws('|',
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
    (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e'),
    (select count(*) from information_schema.columns where table_schema = 'public'),
    (select count(*)
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and not exists (
          select 1
          from pg_depend d
          join pg_extension e on e.oid = d.refobjid
          where d.classid = 'pg_proc'::regclass
            and d.objid = p.oid
            and d.refclassid = 'pg_extension'::regclass
            and d.deptype = 'e'
            and e.extname = 'btree_gist'
        )),
    (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity),
    (select count(*) from pg_constraint con join pg_class c on c.oid = con.conrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    (select count(*) from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and i.indisvalid),
    (select count(*) from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace left join pg_constraint con on con.conindid = i.indexrelid where n.nspname = 'public' and i.indisvalid and con.oid is null)
  ) into v_fingerprint;

  if v_fingerprint <> '19|10|188|16|13|47|19|88|29|3' then
    raise exception 'Bootstrap abortado: fingerprint de domínio esperado %, encontrado %.',
      '19|10|188|16|13|47|19|88|29|3', v_fingerprint;
  end if;

  if not exists (select 1 from pg_extension where extname = 'pgcrypto')
     or not exists (select 1 from pg_extension where extname = 'btree_gist') then
    raise exception 'Bootstrap abortado: pgcrypto e btree_gist precisam estar instaladas após 01.';
  end if;
end;
$$;

create schema supabase_migrations;

create table supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);

insert into supabase_migrations.schema_migrations (version, name, statements)
values
  (
    '20260915010000',
    'preflight_executor',
    array['executada manualmente antes do bootstrap; sem escrita']::text[]
  ),
  (
    '20260915010001',
    'btree_gist',
    array['executada manualmente antes do bootstrap; extensões validadas']::text[]
  ),
  (
    '20260915010002',
    'baseline_instalacao_nova',
    array['baseline existente validada por fingerprint; SQL 02 não executado']::text[]
  );

commit;
