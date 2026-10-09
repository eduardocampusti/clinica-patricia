-- Revisada em 09/10/2026: entrada GraphQL gerenciada preservada.
-- Transação única: qualquer função não suportada impede instalar/ativar o pacote.
begin;
set local search_path=public,extensions;
-- Escopo congelado do inventário oficial somente leitura de 08/10/2026.
-- Divergência (inclusive Configurações aplicada antes) aborta antes de escrever.
do $$ declare ht text; hf text; begin
 select md5(string_agg(n.nspname||'.'||c.relname,E'\n' order by (n.nspname||'.'||c.relname) collate "C")) into ht from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname='public' or n.nspname='storage' and c.relname in ('objects','buckets')) and c.relkind in ('r','p');
 select md5(string_agg(p.oid::regprocedure::text||':'||md5(pg_get_functiondef(p.oid)),E'\n' order by (p.oid::regprocedure::text||':'||md5(pg_get_functiondef(p.oid))) collate "C")) into hf from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','graphql_public') and p.prokind='f' and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype) and p.proname not like 'acesso_direto_%' and (p.prosecdef or n.nspname='graphql_public') and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE'));
 if ht is distinct from 'dc6f0d326c589446b7e94e0935ab6c77' or hf is distinct from '4f83ca78e5f8499a576c3859d4b11b8a' then raise exception 'Catálogo diverge do pacote revisado (51 tabelas/69 RPCs). Reconciliar inventário antes da aplicação.'; end if;
end $$;

create table acesso_direto.rpc_inventario (
  assinatura text primary key, definicao_anterior text not null, definicao_protegida text not null
);
alter table acesso_direto.rpc_inventario enable row level security;
revoke all on acesso_direto.rpc_inventario from public,anon,authenticated;

-- Configuração anterior recuperável. Não sobrescrever outra verificação existente.
create table acesso_direto.requisicao_configuracao (
  id boolean primary key default true check(id), anterior text,
  nova text not null, graphql_hash text not null
);
alter table acesso_direto.requisicao_configuracao enable row level security;
revoke all on acesso_direto.requisicao_configuracao from public,anon,authenticated;
do $$ declare anterior text; begin
  select substr(v,length('pgrst.db_pre_request=')+1) into anterior
    from pg_roles r cross join lateral unnest(r.rolconfig) v
    where r.rolname='authenticator' and v like 'pgrst.db_pre_request=%';
  if nullif(anterior,'') is not null or exists (
    select 1 from pg_db_role_setting d cross join lateral unnest(d.setconfig) v
    where d.setdatabase<>0 and d.setrole in (0,(select oid from pg_roles where rolname='authenticator'))
      and v like 'pgrst.db_pre_request=%'
  ) then raise exception 'Verificação de requisição anterior exige composição revisada.'; end if;
  insert into acesso_direto.requisicao_configuracao(id,anterior,nova,graphql_hash)
    values(true,anterior,'public.acesso_direto_pre_request',
      md5(pg_get_functiondef('graphql_public.graphql(text,text,jsonb,jsonb)'::regprocedure)));
end $$;

-- PostgREST: REST /rest/v1 e GraphQL /graphql/v1 (RPC graphql_public.graphql).
-- Não cobre Storage/Realtime/Edges: conservar suas políticas/guardas específicas.
-- Só estado/disponibilidade/booleano de sessão são consultáveis por uma sessão
-- pendente; nenhuma dessas funções concede vínculo ou encerra a obrigação.
create function public.acesso_direto_pre_request() returns void
language plpgsql stable security invoker set search_path='' as $$
begin
  if coalesce(ltrim(current_setting('request.path',true),'/'),'') in
    ('rpc/acesso_direto_estado','rpc/acesso_direto_disponivel','rpc/acesso_direto_sessao_permitida') then return; end if;
  perform public.acesso_direto_exigir_sessao();
end $$;
revoke all on function public.acesso_direto_pre_request() from public;
grant execute on function public.acesso_direto_pre_request() to anon,authenticated,service_role;

-- RLS RESTRITIVA soma-se às permissões existentes: nunca concede clínica/papel.
do $$ declare t record; begin
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','graphql_public') and c.relkind='f' and (has_table_privilege('authenticated',c.oid,'SELECT') or has_table_privilege('anon',c.oid,'SELECT'))) then
    raise exception 'Tabela externa exposta exige revisão específica antes da ativação.';
  end if;
  for t in select n.nspname,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where (n.nspname='public' or (n.nspname='storage' and c.relname in ('objects','buckets')))
      and c.relkind in ('r','p') loop
    if not t.relrowsecurity then
      raise exception 'Tabela %.% sem RLS exige revisão específica; nenhuma política permissiva será criada.',t.nspname,t.relname;
    end if;
    execute format('create policy acesso_direto_bloqueio on %I.%I as restrictive for all to authenticated using((select public.acesso_direto_sessao_permitida())) with check((select public.acesso_direto_sessao_permitida()))',t.nspname,t.relname);
  end loop;
  for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' loop
    execute format('alter view public.%I set (security_invoker=true)',t.relname);
  end loop;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','graphql_public') and c.relkind='m' and (has_table_privilege('authenticated',c.oid,'SELECT') or has_table_privilege('anon',c.oid,'SELECT'))) then
    raise exception 'View materializada exposta exige revisão específica antes da ativação.';
  end if;
end $$;

-- SECURITY DEFINER pode ignorar RLS: inserir guarda ANTES do corpo, mantendo OID,
-- assinatura, ACL, owner, search_path e regras existentes. Não mover/renomear RPCs.
-- Guardar fonte anterior/protegida no schema privado para revisão/recuperação.
do $$
declare f record; anterior text; protegida text; corpo text; delimitador text; novo text;
begin
  for f in select p.*,l.lanname,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
    where n.nspname in ('public','graphql_public') and p.prokind='f' and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype)
      and p.proname not like 'acesso_direto_%'
      and (p.prosecdef or n.nspname='graphql_public')
      and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE')) loop
    -- Única entrada gerenciada: protegida antes da chamada pelo pre-request,
    -- e suas tabelas/funções próprias continuam sob RLS/guardas abaixo.
    if f.oid='graphql_public.graphql(text,text,jsonb,jsonb)'::regprocedure then
      if f.prosecdef then raise exception 'GraphQL gerenciada deixou de ser invoker; revisar cobertura.'; end if;
      continue;
    end if;
    if f.lanname not in ('plpgsql','sql') or f.prosqlbody is not null or ltrim(f.prosrc) like '#%' then
      raise exception 'RPC não suportada pela proteção automática: %. Revisar manualmente.',f.oid::regprocedure;
    end if;
    if exists(select 1 from pg_depend d join pg_class c on c.oid=d.objid where d.refobjid=f.oid and c.relkind in ('i','I')) then
      raise exception 'RPC em índice exige revisão específica: %',f.oid::regprocedure;
    end if;
    anterior:=pg_get_functiondef(f.oid);
    delimitador:=substring(anterior from 'AS (\$[^$]*\$)');
    if delimitador is null or strpos(anterior,delimitador||f.prosrc||delimitador)=0 then raise exception 'Corpo de RPC não reconhecido: %',f.oid::regprocedure; end if;
    -- rtrim remove só espaços: funções reais terminam também em CR/LF/tab.
    -- Normalizar o fim antes de completar ';', sem criar instrução vazia PL/pgSQL.
    corpo:=regexp_replace(f.prosrc,'[[:space:]]+$','');
    if right(corpo,1)<>';' then corpo:=corpo||';'; end if;
    if f.lanname='plpgsql' then novo:=E'/* acesso_direto:gate */\nBEGIN\nPERFORM public.acesso_direto_exigir_sessao();\n'||corpo||E'\nEND;';
    else novo:=E'/* acesso_direto:gate */\nSELECT public.acesso_direto_exigir_sessao();\n'||corpo; end if;
    -- Conservar STABLE/VOLATILE existentes. A guarda só lê o estado da sessão.
    -- IMMUTABLE é incompatível com esse estado; índices já foram recusados acima.
    protegida:=regexp_replace(left(anterior,strpos(anterior,'AS ')-1),E'\n IMMUTABLE( |\n)',E'\n STABLE\\1','g')||substr(anterior,strpos(anterior,'AS '));
    protegida:=replace(protegida,delimitador||f.prosrc||delimitador,delimitador||novo||delimitador);
    insert into acesso_direto.rpc_inventario values(f.oid::regprocedure::text,anterior,protegida);
    execute protegida;
  end loop;
end $$;
alter role authenticator set pgrst.db_pre_request='public.acesso_direto_pre_request';
notify pgrst,'reload config';
update acesso_direto.controle set protecoes_instaladas=true where id;
-- habilitado continua FALSE. Não habilitar sem serviço/hook/isolamento homologados.
commit;
