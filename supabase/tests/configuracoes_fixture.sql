-- SOMENTE banco LOCAL descartável, depois de acesso-direto_fixture.sql.
-- Não representa conta/contexto criado no Supabase. Não executar em produção.
alter table auth.users add created_at timestamptz default now(),add banned_until timestamptz;
alter table public.clinicas add nome text not null default '',add cidade text not null default '',
 add subdomain text unique,add cnpj text,add logo_url text,add cor_primaria text default '#006194',
 add cor_secundaria text default '#006194',add cor_menu text default '#006194',add fonte text,
 add created_at timestamptz default now(),add updated_at timestamptz default now();
create table public.equipe_registros(id uuid primary key,tipo text,unidades uuid[],dados_encrypted bytea);
create table public.auditoria(id bigint generated always as identity,usuario_id uuid,clinica_id uuid,
 acao text,entidade text,entidade_id text,dados_depois jsonb);
alter table public.equipe_registros enable row level security;
alter table public.auditoria enable row level security;
alter table storage.buckets add name text,add public boolean default false,
 add file_size_limit bigint,add allowed_mime_types text[];
alter table storage.objects add bucket_id text,add name text;
create function public.equipe_ficha_escopo(p_unidades uuid[],p_ator uuid default auth.uid(),p_contexto uuid default null,p_estrito boolean default true)
 returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from unnest(p_unidades) id where not public.equipe_acesso_eh_proprietaria(p_ator,id));
$$;
create function public.equipe_recebimento_decifrar(p_dados bytea) returns jsonb
 language sql stable security definer set search_path='' as $$ select '{}'::jsonb $$;
