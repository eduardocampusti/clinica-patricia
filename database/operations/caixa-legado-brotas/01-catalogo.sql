-- SOMENTE LEITURA. Execução e resultados registrados no relatório, não presumidos pelo cabeçalho.
-- Exceção autorizada em 04/10/2026: SQL Editor oficial na aba autenticada do IAB Codex,
-- exclusivamente para este inventário; project ref xftnkusbyqzyvzrovroj, branch main.
-- Não usar login em outra organização, credenciais extraídas ou projeto diferente.
-- Revisão técnica 04/10/2026: reaproveitar este catálogo e os fingerprints de02.
-- A igualdade datada não autoriza aplicar10 nem encerrar05. Ler08 para os gates A/B.
begin isolation level repeatable read read only;
set local statement_timeout = '60s';
select current_database(),current_user,session_user,current_setting('server_version'),
 current_setting('transaction_read_only') leitura,rolsuper,rolbypassrls
from pg_catalog.pg_roles where rolname=current_user;
-- Role sem leitura integral/BYPASSRLS: resultado vazio não encerra o inventário.
select c.id clinica_id,c.nome,c.subdomain,c.ativo,s.id sessao_id,s.status,s.aberto_em,
  s.aberto_por,(s.valor_abertura*100)::bigint valor_abertura_centavos,s.idempotency_key,
  s.fechado_por,s.fechado_em,s.valor_esperado,s.valor_contado,s.diferenca,
  u.ativo operador_conta_ativa,uc.papel operador_papel_atual,uc.ativo operador_vinculo_atual
from public.clinicas c left join public.sessoes_caixa s on s.clinica_id=c.id
left join public.usuarios u on u.id=s.aberto_por
left join public.usuarios_clinicas uc on uc.usuario_id=s.aberto_por and uc.clinica_id=c.id
where c.subdomain='brotas' order by s.aberto_em,s.id,uc.papel;
-- Papel atual não prova o papel na data de abertura. Não selecionar nomes de pacientes.
select table_name,column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns where table_schema='public' and table_name in
 ('sessoes_caixa','entradas_caixa','recebimentos','recebimentos_pagamentos','movimentos_caixa',
  'estornos','estornos_pagamentos','sangrias_caixa','fechamentos_caixa','revisoes_fechamento_caixa',
  'repasses','repasses_itens','ajustes_repasse','aplicacoes_ajuste_repasse','documentos_fiscais',
  'tentativas_documento_fiscal','auditoria','eventos_auditoria_financeira') order by table_name,ordinal_position;
-- Todas as constraints das tabelas e todas as FKs que as referenciam, inclusive não previstas.
with objs as (select oid from pg_catalog.pg_class where relnamespace='public'::regnamespace and relname in
 ('sessoes_caixa','entradas_caixa','recebimentos','recebimentos_pagamentos','movimentos_caixa',
 'estornos','estornos_pagamentos','sangrias_caixa','fechamentos_caixa','revisoes_fechamento_caixa',
 'repasses','repasses_itens','ajustes_repasse','aplicacoes_ajuste_repasse','documentos_fiscais','tentativas_documento_fiscal'))
select conrelid::regclass tabela,conname,contype,convalidated,pg_catalog.pg_get_constraintdef(oid) definicao
from pg_catalog.pg_constraint where conrelid in(select oid from objs) or confrelid in(select oid from objs)
order by conrelid::regclass::text,conname;
select c.relname,i.indexrelid::regclass indice,i.indisvalid,pg_catalog.pg_get_indexdef(i.indexrelid) definicao
from pg_catalog.pg_index i join pg_catalog.pg_class c on c.oid=i.indrelid
where c.relnamespace='public'::regnamespace and c.relname in ('sessoes_caixa','entradas_caixa','eventos_auditoria_financeira','auditoria') order by c.relname,indice;
select c.relname,t.tgname,t.tgenabled,pg_catalog.pg_get_triggerdef(t.oid) definicao,
  t.tgfoid::regprocedure funcao,pg_catalog.pg_get_functiondef(t.tgfoid) corpo
from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid
where c.relnamespace='public'::regnamespace and not t.tgisinternal and c.relname in
 ('sessoes_caixa','entradas_caixa','recebimentos','movimentos_caixa','fechamentos_caixa','revisoes_fechamento_caixa','auditoria','eventos_auditoria_financeira') order by c.relname,t.tgname;
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_catalog.pg_policies
where schemaname='public' and tablename in ('sessoes_caixa','entradas_caixa','auditoria','eventos_auditoria_financeira') order by tablename,policyname;
select table_name,grantee,privilege_type from information_schema.table_privileges
where table_schema='public' and table_name in ('sessoes_caixa','entradas_caixa','auditoria','eventos_auditoria_financeira') order by table_name,grantee,privilege_type;
select enumlabel,enumsortorder from pg_catalog.pg_enum where enumtypid='public.status_sessao_caixa'::regtype order by enumsortorder;
select p.oid::regprocedure assinatura,p.prosecdef,p.proacl,pg_catalog.pg_get_functiondef(p.oid) definicao
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where p.prokind='f' and n.nspname in ('public','private') and
 (p.proname in ('financeiro_abrir_caixa','financeiro_iniciar_fechamento','financeiro_enviar_fechamento','financeiro_revisar_fechamento','financeiro_resumo_caixa','financeiro_calcular_caixa','fechar_caixa')
 or p.proname ~ '(caixa.*(legad|administrativ|transicao)|(legad|administrativ|transicao).*caixa)') order by p.oid::regprocedure::text;
rollback;

-- Complementos de catálogo executados separadamente na mesma interface, somente leitura.
begin isolation level repeatable read read only;
set local statement_timeout='60s';
select c.relname,c.relrowsecurity,c.relforcerowsecurity,
 pg_catalog.has_table_privilege(current_user,c.oid,'SELECT') leitura_integral
from pg_catalog.pg_class c where c.relnamespace='public'::regnamespace
and c.relname in ('sessoes_caixa','entradas_caixa','recebimentos','recebimentos_pagamentos',
 'movimentos_caixa','estornos','estornos_pagamentos','sangrias_caixa','fechamentos_caixa',
 'revisoes_fechamento_caixa','repasses','repasses_itens','ajustes_repasse',
 'aplicacoes_ajuste_repasse','documentos_fiscais','tentativas_documento_fiscal',
 'auditoria','eventos_auditoria_financeira') order by c.relname;
select 'objetos' secao,coalesce(jsonb_agg(to_jsonb(x) order by x.table_name),'[]') dados
from (select table_name,table_type from information_schema.tables
 where table_schema='public' and table_name ~ '(caixa|recebimento|estorno|sangria|suprimento|repasse|fiscal|auditoria)') x
union all select 'rotinas_legado',coalesce(jsonb_agg(to_jsonb(x) order by x.assinatura),'[]')
from (select n.nspname esquema,p.oid::regprocedure::text assinatura,p.prokind
 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private') and
 (p.proname ~ '(caixa.*(legad|administrativ|transicao)|(legad|administrativ|transicao).*caixa)'
 or p.proname='fechar_caixa')) x
union all select 'auditoria_constraints',coalesce(jsonb_agg(to_jsonb(x) order by x.tabela,x.conname),'[]')
from (select conrelid::regclass::text tabela,conname,convalidated,pg_get_constraintdef(oid) definicao
 from pg_catalog.pg_constraint where conrelid in
 ('public.auditoria'::regclass,'public.eventos_auditoria_financeira'::regclass)) x;
select column_name,data_type,is_nullable from information_schema.columns
where table_schema='public' and table_name='auditoria_leitura_clinica' order by ordinal_position;
-- Auditoria clínica referencia atendimento, não sessão financeira. Seus registros não foram lidos.

-- Revisão A/B: usar também o fingerprint integral de02, não apenas este complemento.
begin isolation level repeatable read read only;
select current_user,current_setting('transaction_read_only') somente_leitura,
 current_setting('server_version') versao,rolsuper,rolbypassrls
from pg_catalog.pg_roles where rolname=current_user;
select p.oid::regprocedure assinatura,pg_catalog.pg_get_userbyid(p.proowner) owner,
 p.prosecdef,p.proconfig,p.proacl,pg_catalog.md5(p.prosrc) corpo_md5,
 pg_catalog.pg_get_functiondef(p.oid) definicao
from pg_catalog.pg_proc p where p.oid in
 (to_regprocedure('public.fn_auditoria()'),
  to_regprocedure('private.financeiro_proteger_entrada_legado_administrativo()'));
select t.tgname,t.tgenabled,t.tgfoid::regprocedure funcao,
 pg_catalog.pg_get_triggerdef(t.oid) definicao
from pg_catalog.pg_trigger t where t.tgrelid='public.entradas_caixa'::regclass
and not t.tgisinternal order by t.tgname;
select count(*) transacoes_preparadas from pg_catalog.pg_prepared_xacts
where database=current_database();
select count(*) outras_transacoes_no_instante from pg_catalog.pg_stat_activity
where datname=current_database() and pid<>pg_backend_pid() and xact_start is not null;
rollback;
-- Fotografia datada, não prova de pausa de writers. Não revela query/paciente/segredo.
-- Backup recuperável é evidência separada; catálogo/fingerprint não o substituem.
rollback;
