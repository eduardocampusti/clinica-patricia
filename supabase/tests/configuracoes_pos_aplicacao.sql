-- SOMENTE LEITURA. Não executado. Após aplicação autorizada, além de verificar-integridade.sql.
select table_name from information_schema.tables where table_schema='public' and table_name like 'configuracoes_%';
select column_name,data_type from information_schema.columns where table_schema='public' and table_name='configuracoes_escopos' and column_name='rascunho_fonte_revisao';
select column_name,data_type from information_schema.columns where table_schema='public' and table_name='clinicas'
and column_name in ('nome_fantasia','nome_exibicao','razao_social','cep','logradouro','numero','complemento','bairro','uf','telefone','whatsapp','email_institucional','site','empresa_emissora_id');
select p.oid::regprocedure,p.prosecdef,p.proconfig,p.proacl from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'configuracoes_%';
select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename like 'configuracoes_%';
select policyname,roles,cmd,permissive,qual,with_check from pg_policies where schemaname='public' and tablename='clinicas';
select trigger_name,event_manipulation from information_schema.triggers where event_object_table in ('clinicas','configuracoes_ativos','configuracoes_versoes');
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='institucionais';
select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name like 'configuracoes_%' order by table_name,grantee;
-- Esperado: nenhuma autorização global automática.
select count(*) as autorizacoes_globais from public.configuracoes_globais_autorizacoes;
-- Esperado: o bucket institucional continua privado.
select count(*) as buckets_institucionais_publicos from storage.buckets where id='institucionais' and public;
-- Guardas do pacote separado devem cobrir RPCs autenticadas criadas por Configurações.
-- Corpo/ACL/inventário precisam de revisão; existir uma RPC não comprova sua proteção.
select p.oid::regprocedure,p.proacl,pg_get_functiondef(p.oid) from pg_proc p
where p.pronamespace='public'::regnamespace and p.proname in ('configuracoes_timbrado_consultar','configuracoes_ativo_leitura_autorizada');
