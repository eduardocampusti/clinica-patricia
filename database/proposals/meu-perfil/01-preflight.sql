-- SOMENTE LEITURA. Não executado nesta entrega.
-- Executar apenas após conferir xftnkusbyqzyvzrovroj no canal autorizado.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name in ('usuarios','usuarios_clinicas','auditoria')
order by table_name,ordinal_position;
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where (schemaname='public' and tablename='usuarios')
  or (schemaname='storage' and tablename='objects');
select grantee,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name='usuarios';
select p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname like 'meu_perfil_%' or p.proname='usuario_tem_vinculo_ativo');
select p.proname,pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname like 'meu_perfil_%' or p.proname='usuario_tem_vinculo_ativo');
select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('usuarios','usuarios_clinicas','auditoria');
select t.tgname,t.tgenabled,pg_get_triggerdef(t.oid),pg_get_functiondef(t.tgfoid)
from pg_trigger t where not t.tgisinternal and t.tgrelid='public.usuarios'::regclass;
select e.enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid
join pg_namespace n on n.oid=t.typnamespace
where n.nspname='public' and t.typname=(select udt_name from information_schema.columns
  where table_schema='public' and table_name='auditoria' and column_name='acao');
select conname,pg_get_constraintdef(oid) from pg_constraint
where conrelid='public.usuarios'::regclass;
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets where id='contas-fotos';
-- Parar se houver objetos já existentes, policies permissivas globais de Storage,
-- ausência de auditoria compatível ou divergência das proteções da tabela usuarios.
