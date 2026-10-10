-- APENAS PostgreSQL LOCAL DESCARTÁVEL. Nunca executar no Supabase.
create role anon;
create role authenticated;
create role service_role;
create role supabase_auth_admin;
create schema auth;
create schema storage;
create schema graphql_public;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
create table auth.users(id uuid primary key,email text,encrypted_password text,raw_app_meta_data jsonb);
create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz);
create type public.papel_usuario as enum('proprietaria','medico','recepcao');
create table public.usuarios(id uuid primary key,nome_completo text,ativo boolean);
create table public.clinicas(id uuid primary key,ativo boolean);
create table public.equipe_membros(id uuid primary key,usuario_id uuid,nome_completo text,ativo boolean);
create table public.equipe_membros_clinicas(membro_id uuid,clinica_id uuid,ativo boolean);
create table public.usuarios_clinicas(usuario_id uuid,clinica_id uuid,papel public.papel_usuario,ativo boolean,primary key(usuario_id,clinica_id));
create table public.equipe_acesso_convites(membro_id uuid,status text);
create table public.dados_teste(id integer primary key);
create table storage.objects(id integer primary key);
create table storage.buckets(id text primary key);
create function public.equipe_acesso_eh_proprietaria(p_ator uuid,p_clinica uuid) returns boolean language sql stable security definer as $$
  select exists(select 1 from public.usuarios u join public.usuarios_clinicas uc on uc.usuario_id=u.id where u.id=p_ator and u.ativo and uc.ativo and uc.clinica_id=p_clinica and uc.papel='proprietaria')
$$;
-- Contrato mínimo sintético dos vínculos: não substitui a homologação do helper real.
create function public.equipe_acesso_validar_clinicas(p_ator uuid,p_membro uuid,p_escopos jsonb) returns void language plpgsql security definer as $$
begin
  if exists(select 1 from jsonb_array_elements(p_escopos) e where not public.equipe_acesso_eh_proprietaria(p_ator,(e->>'clinica_id')::uuid) or not exists(select 1 from public.equipe_membros_clinicas mc join public.clinicas c on c.id=mc.clinica_id where mc.membro_id=p_membro and mc.clinica_id=(e->>'clinica_id')::uuid and mc.ativo and c.ativo)) then raise exception 'Acesso negado.' using errcode='42501'; end if;
end $$;
create function public.rpc_sql_teste() returns integer language sql stable security definer as $$ select 7 $$;
-- Formato observado no catálogo real: ponto e vírgula + quebra de linha final.
-- Deve compilar protegido sem produzir uma instrução vazia depois de END;.
create function public.rpc_plpgsql_teste() returns integer language plpgsql stable security definer as $$
declare x integer:=7;
begin return x; end;
$$;
create function graphql_public.rpc_teste() returns integer language sql as $$ select 7 $$;
-- Entrada gerenciada simulada: deve conservar corpo e não receber wrapper.
create function graphql_public.graphql("operationName" text default null,query text default null,variables jsonb default null,extensions jsonb default null) returns jsonb language sql as $$ select '{"errors":[{"message":"pg_graphql extension is not enabled."}]}'::jsonb $$;
do $$ declare t record; begin
 for t in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage') and c.relkind='r' loop
  execute format('alter table %I.%I enable row level security',t.nspname,t.relname);
  execute format('create policy fixture on %I.%I for all to authenticated using(true) with check(true)',t.nspname,t.relname);
  execute format('grant all on %I.%I to authenticated',t.nspname,t.relname);
 end loop;
end $$;
grant usage on schema public,auth,storage,graphql_public to authenticated,anon,service_role;
