-- SOMENTE LEITURA. Executar futuramente no alvo xftnkusbyqzyvzrovroj autorizado.
-- Inventário de tabelas, views, RPCs e buckets. Não imprimir usuários/senhas/sessões.
select n.nspname,c.relname,c.relkind,c.relrowsecurity,c.reloptions
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','graphql_public','storage') and c.relkind in ('r','p','v','m','f') order by 1,2;
-- Pode ser NULL quando a configuração está no serviço; confirmar também no painel.
select current_setting('pgrst.db_schemas',true) as schemas_api_configurados;
select p.oid::regprocedure as assinatura,l.lanname,p.prosecdef,p.provolatile,
  p.prosqlbody is not null as corpo_sql_padrao,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as autenticado,
  has_function_privilege('anon',p.oid,'EXECUTE') as anonimo,
  strpos(p.prosrc,'acesso_direto:gate')>0 as guarda_instalada
from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
where n.nspname in ('public','graphql_public') and p.prokind='f' order by 1;
select schemaname,tablename,policyname,permissive,roles from pg_policies where schemaname in ('public','storage') order by 1,2,3;
select id,public from storage.buckets order by id;
-- Prova de objetos após futura aplicação: não usar schema_migrations como prova.
select table_schema,table_name,column_name,data_type from information_schema.columns where table_schema='acesso_direto' order by table_name,ordinal_position;
select routine_name from information_schema.routines where routine_schema='public' and routine_name like 'acesso_direto_%';
select event_object_schema,event_object_table,trigger_name from information_schema.triggers where event_object_schema='acesso_direto';
-- Rodar TAMBÉM supabase/tools/verificar-integridade.sql após aplicação autorizada.
