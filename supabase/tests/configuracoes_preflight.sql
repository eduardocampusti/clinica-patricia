-- SOMENTE LEITURA. Revisar no projeto xftnkusbyqzyvzrovroj, sem executar nesta etapa.
-- Antes: confirmar alvo, dependências da Equipe, colunas e ausência de objetos homônimos.
select table_name,column_name,data_type from information_schema.columns where table_schema='public'
and table_name in ('clinicas','equipe_registros','usuarios','usuarios_clinicas','auditoria') order by table_name,ordinal_position;
select p.oid::regprocedure,p.prosecdef,p.proconfig from pg_proc p where p.pronamespace='public'::regnamespace
and p.proname in ('equipe_ficha_escopo','equipe_recebimento_decifrar','eh_proprietaria');
-- A Edge privada passou a exigir a guarda preparada na etapa separada de acesso direto.
-- Ausência não autoriza retirar a guarda ou habilitar qualquer flag.
select to_regprocedure('public.acesso_direto_exigir_sessao()') as guarda_primeiro_acesso;
select table_name from information_schema.tables where table_schema='public' and table_name like 'configuracoes_%';
select p.oid::regprocedure from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'configuracoes_%';
select id,public from storage.buckets where id='institucionais';
select c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='clinicas';
select policyname,roles,cmd,permissive,qual,with_check from pg_policies where schemaname='public' and tablename='clinicas';
select grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='clinicas';
select grantee,column_name,privilege_type from information_schema.column_privileges where table_schema='public' and table_name='clinicas';
select pg_get_functiondef(to_regprocedure('public.clinicas_do_usuario()'));
select id,subdomain,ativo from public.clinicas where subdomain in ('brotas','ipupiara','ibitiara');
