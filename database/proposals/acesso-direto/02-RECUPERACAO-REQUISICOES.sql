-- Recuperação revisável; NÃO executar automaticamente. Projeto exclusivo xftnkusbyqzyvzrovroj.
-- Preferir reparar/reinstalar acesso_direto_pre_request; não remover guardas
-- RLS/RPC/Edges. Restaurar pre-request anterior somente após encerrar/revogar
-- todas as contas do fluxo (inclusive sessões antigas de contas já ativadas).
begin;
do $$ declare c acesso_direto.requisicao_configuracao%rowtype; atual text; begin
  if exists(select 1 from acesso_direto.operacoes o
    left join public.usuarios u on u.id=o.auth_user_id
    where coalesce(u.ativo,true) or exists(select 1 from auth.sessions s where s.user_id=o.auth_user_id))
    then raise exception 'Recuperação recusada: conta do fluxo não encerrada ou sessão ainda presente.'; end if;
  select * into strict c from acesso_direto.requisicao_configuracao where id;
  select substr(v,length('pgrst.db_pre_request=')+1) into atual
    from pg_roles r cross join lateral unnest(r.rolconfig) v
    where r.rolname='authenticator' and v like 'pgrst.db_pre_request=%';
  if atual is distinct from c.nova then raise exception 'Configuração mudou: preservar contribuição posterior.'; end if;
  if c.anterior is null then execute 'alter role authenticator reset pgrst.db_pre_request';
  else execute format('alter role authenticator set pgrst.db_pre_request=%L',c.anterior); end if;
end $$;
notify pgrst,'reload config';
commit;
