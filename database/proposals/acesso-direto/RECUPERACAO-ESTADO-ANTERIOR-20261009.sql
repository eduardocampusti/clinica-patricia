-- Canal administrativo CLI db query --linked --file ou MCP SQL do projeto xftnkusbyqzyvzrovroj.
-- Não depende do PostgREST. Estado anterior observado: parâmetro ausente.
begin;
do $$ begin
 if exists(select 1 from acesso_direto.operacoes o left join public.usuarios u on u.id=o.auth_user_id where coalesce(u.ativo,true) or exists(select 1 from auth.sessions s where s.user_id=o.auth_user_id)) then raise exception 'Não restaurar enquanto contas do fluxo/sessões não forem encerradas'; end if;
 if exists(select 1 from pg_roles r cross join lateral unnest(r.rolconfig) v where r.rolname='authenticator' and v like 'pgrst.db_pre_request=%' and v<>'pgrst.db_pre_request=public.acesso_direto_pre_request') then raise exception 'Configuração posterior: preservar'; end if;
end $$;
alter role authenticator reset pgrst.db_pre_request;
notify pgrst,'reload config';
update acesso_direto.controle set habilitado=false,homologacao_habilitada=false where id;
commit;
