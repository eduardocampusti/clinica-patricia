-- SOMENTE LEITURA, nenhum dado de pessoa/conta. Alvo xftnkusbyqzyvzrovroj.
begin read only;
select jsonb_build_object(
 'schemas_api',current_setting('pgrst.db_schemas',true),
 'versao',current_setting('server_version'),
 'acesso_direto_presente',to_regnamespace('acesso_direto') is not null,
 'relacoes',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'nome',c.relname,'tipo',c.relkind,'rls',c.relrowsecurity,'opcoes',c.reloptions,'anon_select',has_table_privilege('anon',c.oid,'SELECT'),'auth_select',has_table_privilege('authenticated',c.oid,'SELECT')) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','graphql_public','storage') and c.relkind in ('r','p','v','m','f')),
 'funcoes',(select jsonb_agg(jsonb_build_object('assinatura',p.oid::regprocedure::text,'schema',n.nspname,'nome',p.proname,'linguagem',l.lanname,'definer',p.prosecdef,'volatilidade',p.provolatile,'sql_padrao',p.prosqlbody is not null,'hash_fonte',md5(pg_get_functiondef(p.oid)),'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'autenticado',has_function_privilege('authenticated',p.oid,'EXECUTE'),'marcador_guarda',strpos(p.prosrc,'acesso_direto:gate')>0) order by n.nspname,p.proname,p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname in ('public','graphql_public') and p.prokind='f' and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype)),
 'politicas',(select jsonb_agg(jsonb_build_object('schema',schemaname,'tabela',tablename,'nome',policyname,'tipo',permissive,'papeis',roles) order by schemaname,tablename,policyname) from pg_policies where schemaname in ('public','storage')),
 'buckets',(select jsonb_agg(jsonb_build_object('id',id,'publico',public) order by id) from storage.buckets),
 'colunas_auth',(select jsonb_agg(jsonb_build_object('tabela',table_name,'coluna',column_name,'tipo',data_type) order by table_name,ordinal_position) from information_schema.columns where table_schema='auth' and table_name in ('sessions','users'))
) as inventario;
rollback;
