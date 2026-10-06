-- Somente leitura no projeto xftnkusbyqzyvzrovroj, depois de confirmar URL e ambiente.
select n.nspname,p.proname,p.prosecdef,p.proconfig,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_executa,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_executa,
 pg_get_function_identity_arguments(p.oid) as argumentos
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('equipe_atuacao_obter','equipe_atuacao_salvar','equipe_atuacao_horarios_salvar','equipe_recurso_pode','equipe_pode_editar_profissional_global');
select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and ((table_name='profissionais' and column_name in ('id','ativo','duracao_consulta_minutos','updated_at'))
 or (table_name='profissionais_clinicas' and column_name in ('profissional_id','clinica_id','valor_consulta','ativo','updated_at'))
 or table_name in ('configuracoes_financeiras_clinica','disponibilidade_padrao','agenda_excecoes')) order by table_name,ordinal_position;
select tablename,policyname,roles,cmd from pg_policies where schemaname='public' and tablename in ('profissionais','profissionais_clinicas','disponibilidade_padrao','agenda_excecoes','configuracoes_financeiras_clinica');
