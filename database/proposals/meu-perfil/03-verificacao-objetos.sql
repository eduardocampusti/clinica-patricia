-- SOMENTE LEITURA. Não executado. Executar após aplicar a proposta no alvo
-- xftnkusbyqzyvzrovroj, pelo SQL Editor/canal autorizado. Não simula sessão real.
select column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='public' and table_name='usuarios'
and column_name in ('nome_completo','perfil_foto_path','perfil_revisao');
select conname,pg_get_constraintdef(oid) from pg_constraint
where conrelid='public.usuarios'::regclass and conname like 'usuarios_perfil_%';
select t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) from pg_trigger t
where t.tgrelid='public.usuarios'::regclass and t.tgname='usuarios_meu_perfil_proteger';
select p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,p.proconfig,p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'meu_perfil_%';
select r.rolname,p.proname,has_function_privilege(r.oid,p.oid,'EXECUTE') as pode_executar
from pg_roles r cross join pg_proc p join pg_namespace n on n.oid=p.pronamespace
where r.rolname in ('anon','authenticated','service_role') and n.nspname='public'
and p.proname in ('meu_perfil_consultar','meu_perfil_salvar_interno')
order by p.proname,r.rolname;
-- Esperado: consultar sem anon; interna sem anon/authenticated e com service_role.
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='contas-fotos';
select policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='storage' and tablename='objects';
-- Esperado: bucket privado/JPEG/5242880; SELECT só foto atual própria.
-- Rever TODAS as policies (as permissivas combinam com OR), não apenas a nova.
-- Concluir também supabase/tools/verificar-integridade.sql; registrar resultados.
