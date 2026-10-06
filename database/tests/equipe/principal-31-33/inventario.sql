begin read only;
select jsonb_build_object(
 'database',current_database(),
 'migrations',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'tabelas',(select jsonb_agg(jsonb_build_object('nome',c.relname,'rls',c.relrowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (c.relname like 'equipe_%' or c.relname in ('profissionais_recebimento','usuarios','usuarios_clinicas','profissionais','profissionais_clinicas','auditoria'))),
 'colunas',(select jsonb_agg(jsonb_build_object('tabela',table_name,'coluna',column_name,'tipo',data_type,'nullable',is_nullable)) from information_schema.columns where table_schema='public' and (table_name like 'equipe_%' or table_name in ('usuarios','usuarios_clinicas','profissionais','profissionais_clinicas','profissionais_recebimento','auditoria'))),
 'funcoes',(select jsonb_agg(jsonb_build_object('nome',p.proname,'assinatura',p.oid::regprocedure::text,'args',pg_get_function_arguments(p.oid),'acl',p.proacl,'security_definer',p.prosecdef,'hash',md5(pg_get_functiondef(p.oid)))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'equipe_%' or p.proname in ('clinicas_do_usuario','eh_proprietaria','cpf_encrypt','cpf_decrypt','cpf_hash','pacientes_cpf_valido'))),
 'buckets',(select jsonb_agg(jsonb_build_object('id',id,'public',public,'limite',file_size_limit,'mime',allowed_mime_types)) from storage.buckets),
 'politicas',(select jsonb_agg(jsonb_build_object('schema',schemaname,'tabela',tablename,'nome',policyname,'roles',roles,'cmd',cmd,'using',qual,'check',with_check)) from pg_policies where (schemaname='storage' and tablename='objects') or (schemaname='public' and (tablename like 'equipe_%' or tablename='profissionais_recebimento'))),
 'extensoes',(select jsonb_agg(extname) from pg_extension where extname in ('pgcrypto','supabase_vault')),
 'vault_configurado',(select count(*)=1 from vault.secrets where name='cpf_key'),
 'clinicas',(select jsonb_agg(jsonb_build_object('id',id,'slug',subdomain,'ativo',ativo)) from public.clinicas where subdomain in ('brotas','ipupiara'))
) as inventario;
commit;
