-- SOMENTE LEITURA. Não indica por si só aplicação/validação no principal.
-- Antes de aplicar a nova migration, confirmar alvo e dependências no catálogo.
select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('agendamentos','agenda_excecoes','disponibilidade_padrao','profissionais_clinicas','recebimentos','atendimentos','auditoria');
select conname,pg_get_constraintdef(oid) from pg_constraint
where conrelid='public.agendamentos'::regclass;
select tgname,pg_get_triggerdef(oid) from pg_trigger
where tgrelid='public.agendamentos'::regclass and not tgisinternal;
select policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in ('agendamentos','recebimentos');
select p.proname,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
and p.proname in ('eh_proprietaria_ou_recepcao','calcular_hora_fim_agendamento','agenda_corrigir_horario','agenda_validar_correcao_horario','agenda_auditar_correcao_horario','agenda_correcao_disponivel');
select has_table_privilege('authenticated','public.agendamentos','SELECT') as pode_ler,
has_column_privilege('authenticated','public.agendamentos','data','UPDATE') as pode_atualizar_data;
select table_name,column_name,data_type,is_nullable from information_schema.columns
where table_schema='public' and table_name in ('agendamentos','auditoria','recebimentos','atendimentos','agenda_excecoes','usuarios_clinicas') order by table_name,ordinal_position;
select p.oid::regprocedure::text as assinatura,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'agenda%correcao%' or
 n.nspname='public' and p.proname='agenda_corrigir_horario';
