-- SOMENTE LEITURA. Verifica compatibilidade do catálogo sem executar DDL.
begin read only;
with f as (
 select p.*,l.lanname,n.nspname,pg_get_functiondef(p.oid) as anterior
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
 where n.nspname in ('public','graphql_public') and p.prokind='f'
 and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype)
 and p.proname not like 'acesso_direto_%' and (p.prosecdef or n.nspname='graphql_public')
 and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE'))
), corpos as (
 select *,substring(anterior from 'AS (\$[^$]*\$)') as delimitador from f
)
select jsonb_build_object('rpcs',(select jsonb_agg(jsonb_build_object(
 'assinatura',oid::regprocedure::text,'hash_anterior',md5(anterior),'linguagem',lanname,'volatilidade',provolatile,
 'corpo_reconhecido',delimitador is not null and strpos(anterior,delimitador||prosrc||delimitador)>0,
 'compativel',lanname in ('plpgsql','sql') and prosqlbody is null and ltrim(prosrc) not like '#%'
   and not exists(select 1 from pg_depend d join pg_class c on c.oid=d.objid where d.refobjid=corpos.oid and c.relkind in ('i','I'))
 ) order by oid::regprocedure::text) from corpos),
 'authenticator',(select rolconfig from pg_roles where rolname='authenticator'),
 'schemas_config',(select jsonb_agg(jsonb_build_object('database',d.datname,'papel',r.rolname,'config',s.setconfig)) from pg_db_role_setting s left join pg_database d on d.oid=s.setdatabase left join pg_roles r on r.oid=s.setrole where array_to_string(s.setconfig,',') like '%pgrst.db_schemas%')) as revisao;
rollback;
