-- RASCUNHO: preflight sem escrita para instalação nova ou banco existente.
-- O fingerprint é o catálogo público da baseline candidata de 2026-09-14.

do $$
declare
  v_fingerprint text;
  v_superuser boolean;
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'PostgreSQL 17 ou superior é obrigatório; versão atual: %',
      current_setting('server_version');
  end if;

  select rolsuper into v_superuser from pg_roles where rolname = current_user;
  if not exists (select 1 from pg_roles where rolname = 'postgres') then
    raise exception 'A baseline exige o papel postgres.';
  end if;

  if not coalesce(v_superuser, false)
     and not pg_has_role(current_user, 'postgres', 'member') then
    raise exception
      'Executor % precisa ser superusuário ou membro de postgres para criar os objetos e ajustar seus defaults.',
      current_user;
  end if;

  if to_regclass('auth.users') is null
     or to_regclass('vault.decrypted_secrets') is null
     or not exists (select 1 from pg_namespace where nspname = 'extensions') then
    raise exception 'Dependências Supabase ausentes: auth.users, vault.decrypted_secrets e schema extensions são obrigatórios.';
  end if;

  if to_regclass('public.agendamentos') is null then
    raise notice 'Instalação nova detectada. Execute 01 antes de 02; btree_gist e pgcrypto serão validados em 01/02.';
    return;
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

  if v_fingerprint <> '19|10|188|16|13|47|19|88|29|3' then
    raise exception 'Fingerprint incompatível com a baseline: esperado %, encontrado %.',
      '19|10|188|16|13|47|19|88|29|3', v_fingerprint;
  end if;

  raise notice 'Banco existente compatível com a baseline; não execute 02_baseline_instalacao_nova.sql.';
end;
$$;
