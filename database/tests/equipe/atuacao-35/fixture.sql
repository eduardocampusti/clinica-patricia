-- Apenas esquema reduzido fictício em PostgreSQL LOCAL. Nunca executar no Supabase.
do $$ begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.actor',true),'')::uuid $$;
create type public.acao_auditoria as enum ('INSERT','UPDATE','DELETE');
create table usuarios(id uuid primary key,ativo boolean);
create table clinicas(id uuid primary key,ativo boolean,subdomain text);
create table usuarios_clinicas(usuario_id uuid,clinica_id uuid,ativo boolean,papel text);
create table profissionais(id uuid primary key,ativo boolean,duracao_consulta_minutos integer,updated_at timestamptz);
create table equipe_membros(id uuid primary key,profissional_id uuid unique,tipo text,ativo boolean);
create table equipe_membros_clinicas(membro_id uuid,clinica_id uuid,ativo boolean);
create table profissionais_clinicas(profissional_id uuid,clinica_id uuid,ativo boolean,valor_consulta numeric,updated_at timestamptz,primary key(profissional_id,clinica_id));
create table configuracoes_financeiras_clinica(id uuid,clinica_id uuid,percentual_clinica numeric,vigente_desde timestamptz,vigente_ate timestamptz);
create table servicos(id uuid,clinica_id uuid,ativo boolean,nome text,duracao_minutos integer,preco numeric);
create table disponibilidade_padrao(id uuid default gen_random_uuid(),profissional_id uuid,clinica_id uuid,dia_semana smallint,hora_inicio time,hora_fim time,ativo boolean default true,created_by uuid,check(hora_fim>hora_inicio));
create table agenda_excecoes(profissional_id uuid,clinica_id uuid,data date,tipo text,hora_inicio time,hora_fim time);
create table auditoria(clinica_id uuid,usuario_id uuid,acao acao_auditoria,entidade text,entidade_id text,dados_depois jsonb);
create function eh_proprietaria(c uuid) returns boolean language sql stable security definer as $$ select exists(select 1 from public.usuarios_clinicas where usuario_id=auth.uid() and clinica_id=c and ativo and papel='proprietaria') $$;
create function public.equipe_recurso_pode(p_membro uuid,p_clinica uuid,p_ator uuid,p_global boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
  select p_ator is not null
    and exists(select 1 from public.usuarios u where u.id=p_ator and u.ativo)
    and exists(select 1 from public.clinicas c where c.id=p_clinica and c.ativo and c.subdomain in ('brotas','ipupiara'))
    and exists(select 1 from public.usuarios_clinicas uc where uc.usuario_id=p_ator and uc.clinica_id=p_clinica and uc.ativo and uc.papel::text='proprietaria')
    and exists(select 1 from public.equipe_membros m join public.equipe_membros_clinicas ec on ec.membro_id=m.id
      where m.id=p_membro and m.ativo and ec.clinica_id=p_clinica and ec.ativo)
    and (not p_global or not exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=p_membro and ec.ativo
      and not exists(select 1 from public.usuarios_clinicas uc where uc.usuario_id=p_ator and uc.clinica_id=ec.clinica_id and uc.ativo and uc.papel::text='proprietaria')));
$$;
create or replace function public.equipe_pode_editar_profissional_global(p_profissional_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
    and exists(select 1 from public.profissionais_clinicas pc where pc.profissional_id=p_profissional_id)
    and not exists(select 1 from public.profissionais_clinicas pc
      where pc.profissional_id=p_profissional_id and not public.eh_proprietaria(pc.clinica_id));
$$;
