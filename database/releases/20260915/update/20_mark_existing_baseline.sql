\set ON_ERROR_STOP on

-- Uso exclusivo no clone/staging de atualização já comparado com a baseline.
-- Não executa a baseline: registra 02 somente após o fingerprint e o
-- preflight versionado 00 terem sido confirmados no próprio banco.

begin;

do $$
declare
  v_fingerprint text;
begin
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

  if v_fingerprint <> '19|10|188|16|13|47|19|88|29|3' then
    raise exception 'Marcação abortada: fingerprint esperado %, encontrado %.',
      '19|10|188|16|13|47|19|88|29|3', v_fingerprint;
  end if;

  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260915010000' and name = 'preflight_executor'
  ) then
    raise exception 'Marcação abortada: preflight 00 não consta no histórico.';
  end if;

  if exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260915010002'
  ) then
    raise exception 'Marcação abortada: baseline 02 já consta no histórico.';
  end if;

  insert into supabase_migrations.schema_migrations (version, name, statements)
  values (
    '20260915010002',
    'baseline_instalacao_nova',
    array['baseline existente validada por fingerprint; SQL 02 não executado neste clone']::text[]
  );
end;
$$;

commit;
