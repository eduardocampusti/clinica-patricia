-- Somente leitura. Complemento obrigatório do inventário de conteúdo.
-- Nenhum GRANT/ALTER/SET ROLE; não autoriza modificar objetos internos Supabase.
-- Executar apenas xftnkusbyqzyvzrovroj pelo canal oficial legitimamente autenticado.
begin read only;
select current_user as executor,
       p.oid::regprocedure::text as assinatura,
       pg_get_userbyid(n.nspowner) as proprietario_schema,
       pg_get_userbyid(p.proowner) as proprietario_funcao,
       has_schema_privilege(current_user,n.oid,'CREATE') as create_schema,
       pg_has_role(current_user,p.proowner,'USAGE') as herda_proprietario,
       p.prosecdef as security_definer,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','graphql_public')
  and p.prokind='f'
  and p.prorettype not in('trigger'::regtype,'event_trigger'::regtype)
  and p.proname not like 'acesso_direto_%'
  and p.oid<>'graphql_public.graphql(text,text,jsonb,jsonb)'::regprocedure
  and (p.prosecdef or n.nspname='graphql_public')
  and (has_function_privilege('authenticated',p.oid,'EXECUTE')
       or has_function_privilege('anon',p.oid,'EXECUTE'))
  and (not has_schema_privilege(current_user,n.oid,'CREATE')
       or not pg_has_role(current_user,p.proowner,'USAGE'))
order by p.oid::regprocedure::text;
rollback;
