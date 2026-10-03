\set ON_ERROR_STOP on

-- Consulta exclusiva de catálogo para banco existente. Não lê relações de
-- negócio, Auth, Vault, segredos ou dados clínicos e não escreve no banco.
begin transaction read only;

select jsonb_build_object(
  'raw_fingerprint', concat_ws('|',
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
  ),
  'domain_fingerprint', concat_ws('|',
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
  ),
  'btree_gist', (
    select jsonb_build_object(
      'schema', n.nspname,
      'owner', r.rolname,
      'version', e.extversion,
      'relocatable', e.extrelocatable,
      'public_function_members', (
        select count(*)
        from pg_depend d
        join pg_proc p on p.oid = d.objid
        join pg_namespace pn on pn.oid = p.pronamespace
        where d.classid = 'pg_proc'::regclass
          and d.refclassid = 'pg_extension'::regclass
          and d.refobjid = e.oid
          and d.deptype = 'e'
          and pn.nspname = 'public'
      )
    )
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    join pg_roles r on r.oid = e.extowner
    where e.extname = 'btree_gist'
  ),
  'app_history', to_regclass('supabase_migrations.schema_migrations') is not null,
  'agenda_index_valid', (
    select i.indisvalid
    from pg_index i
    where i.indexrelid = 'public.agendamentos_sem_sobreposicao'::regclass
  )
) as existing_database_compatibility;

commit;
