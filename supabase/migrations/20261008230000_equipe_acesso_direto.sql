-- PROPOSTA LOCAL PARA REVISÃO. NÃO APLICADA. Alvo único xftnkusbyqzyvzrovroj.
-- Habilitação exige também 20261008230100, serviços, hook e homologação futura.
begin;
create schema if not exists acesso_direto;
revoke all on schema acesso_direto from public, anon, authenticated;
grant usage on schema acesso_direto to service_role;
create table acesso_direto.controle (
  id boolean primary key default true check(id),
  habilitado boolean not null default false,
  homologacao_habilitada boolean not null default false,
  protecoes_instaladas boolean not null default false
);
insert into acesso_direto.controle(id) values(true);
-- Permite homologar somente pessoas fictícias previamente autorizadas, sem
-- habilitar o recurso geral. Lista vazia e desligada por padrão.
create table acesso_direto.homologacao (
  membro_id uuid primary key references public.equipe_membros(id),
  ator_id uuid not null references public.usuarios(id),
  email text not null unique check(email ~ '^[a-z0-9._+-]+@acesso-direto\.example\.invalid$')
);
create table acesso_direto.operacoes (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique default gen_random_uuid(), -- reservado ANTES do Auth; sem FK prematura
  membro_id uuid not null unique references public.equipe_membros(id),
  ator_id uuid not null references public.usuarios(id),
  contexto_id uuid not null references public.clinicas(id),
  email text not null unique,
  escopos jsonb not null,
  chave uuid not null,
  payload_hash text not null,
  estado text not null default 'reservada' check(estado in ('reservada','pendente','substituindo','ativa')),
  salt uuid not null default gen_random_uuid(),
  senha_digest text, -- compromisso da senha aleatória de 24 caracteres; nunca senha recuperável
  revisao integer not null default 0,
  reserva_id uuid,
  reserva_ator_id uuid references public.usuarios(id),
  reserva_ate timestamptz,
  senha_auth_antes text, -- fingerprint do hash Auth, só para provar alteração; nunca retornado
  senha_auth_confirmada text, -- hash após login verificado pelo servidor; não retornado
  senha_auth_esperada text, -- fingerprint capturado antes do desafio de login
  verificada_em timestamptz,
  reserva_iniciada_em timestamptz,
  substituicao_chave uuid,
  criada_em timestamptz not null default clock_timestamp(),
  emitida_em timestamptz not null default clock_timestamp(),
  expira_em timestamptz not null default (clock_timestamp()+interval '24 hours'),
  liberado_em timestamptz,
  unique(ator_id,chave)
);
create table acesso_direto.eventos (
  id bigint generated always as identity primary key,
  operacao_id uuid not null references acesso_direto.operacoes(id),
  ator_id uuid not null,
  estado text not null,
  revisao integer not null,
  criado_em timestamptz not null default clock_timestamp()
);
alter table acesso_direto.controle enable row level security;
alter table acesso_direto.homologacao enable row level security;
alter table acesso_direto.operacoes enable row level security;
alter table acesso_direto.eventos enable row level security;
revoke all on all tables in schema acesso_direto from public,anon,authenticated;

create function acesso_direto.auditar() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into acesso_direto.eventos(operacao_id,ator_id,estado,revisao) values(new.id,coalesce(new.reserva_ator_id,new.ator_id),new.estado,new.revisao);
  return new;
end $$;
create trigger acesso_direto_auditar after insert or update on acesso_direto.operacoes for each row execute function acesso_direto.auditar();
create function acesso_direto.evento_imutavel() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Auditoria imutável.' using errcode='42501'; end $$;
create trigger acesso_direto_eventos_imutaveis before update or delete on acesso_direto.eventos for each row execute function acesso_direto.evento_imutavel();
-- Inclusive serviços administrativos antigos: nenhum caminho concede vínculo
-- ativo a uma operação reservada/pendente/substituindo. Contas sem operação seguem.
create function acesso_direto.vinculo_pendente() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.ativo and exists(select 1 from acesso_direto.operacoes where auth_user_id=new.usuario_id and estado<>'ativa') then
    raise exception 'Conclua a ativação verificada antes de conceder acesso.' using errcode='42501';
  end if;
  return new;
end $$;
create trigger acesso_direto_vinculo_pendente before insert or update on public.usuarios_clinicas for each row execute function acesso_direto.vinculo_pendente();

create function public.acesso_direto_disponivel() returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select protecoes_instaladas and (habilitado or (homologacao_habilitada and exists(select 1 from acesso_direto.homologacao))) from acesso_direto.controle where id),false)
$$;
create function acesso_direto.fluxo_permitido(p_ator uuid,p_membro uuid) returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select protecoes_instaladas and (habilitado or (homologacao_habilitada and exists(select 1 from acesso_direto.homologacao h where h.membro_id=p_membro and h.ator_id=p_ator))) from acesso_direto.controle where id),false)
$$;
create function public.acesso_direto_sessao_permitida() returns boolean language plpgsql stable security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype;
begin
  if auth.role()='service_role' then return true; end if;
  if auth.uid() is null then return auth.role() is distinct from 'authenticated'; end if;
  select * into o from acesso_direto.operacoes where auth_user_id=auth.uid();
  if not found then return true; end if; -- contas existentes preservadas
  if o.estado<>'ativa' then return false; end if;
  return exists(select 1 from auth.sessions s where s.id=(auth.jwt()->>'session_id')::uuid and s.user_id=auth.uid() and s.created_at>o.liberado_em);
exception when invalid_text_representation then return false;
end $$;
create function public.acesso_direto_exigir_sessao() returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  if not public.acesso_direto_sessao_permitida() then raise exception 'Ativação ou sessão não autorizada.' using errcode='42501'; end if;
  return true;
end $$;
create function public.acesso_direto_estado() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype; sessao timestamptz;
begin
  if auth.uid() is null then raise exception 'Sessão ausente.' using errcode='42501'; end if;
  select * into o from acesso_direto.operacoes where auth_user_id=auth.uid();
  if not found then return jsonb_build_object('estado','normal'); end if;
  select created_at into sessao from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=auth.uid();
  if o.estado='ativa' then return jsonb_build_object('estado',case when sessao>o.liberado_em then 'normal' else 'sessao_obsoleta' end); end if;
  if o.expira_em<=clock_timestamp() then return jsonb_build_object('estado','expirada'); end if;
  if o.estado<>'pendente' or sessao is null or sessao<o.emitida_em then return jsonb_build_object('estado','sessao_obsoleta'); end if;
  return jsonb_build_object('estado','pendente','expiraEm',o.expira_em);
exception when invalid_text_representation then return jsonb_build_object('estado','sessao_obsoleta');
end $$;
create function acesso_direto.resposta(o acesso_direto.operacoes) returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',o.id,'auth_user_id',o.auth_user_id,'email',o.email,'salt',o.salt,'estado',o.estado,'reserva_id',o.reserva_id,'expira_em',o.expira_em,'revisao',o.revisao,'senha_digest',o.senha_digest)
$$;
create function acesso_direto.autorizar(p_ator uuid,p_membro uuid,p_contexto uuid,p_escopos jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
  if not acesso_direto.fluxo_permitido(p_ator,p_membro) then raise exception 'SERVICO_INDISPONIVEL'; end if;
  if p_escopos is null or jsonb_typeof(p_escopos) is distinct from 'array' then raise exception 'Escopos inválidos.' using errcode='22023'; end if;
  if jsonb_array_length(p_escopos)=0 or exists(select 1 from jsonb_array_elements(p_escopos) e where jsonb_typeof(e) is distinct from 'object' or e->>'clinica_id' is null or e->>'papel' is null or e->>'papel' not in ('proprietaria','medico','recepcao')) then raise exception 'Escopos inválidos.' using errcode='22023'; end if;
  if not public.equipe_acesso_eh_proprietaria(p_ator,p_contexto) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  if not exists(select 1 from public.equipe_membros m join public.equipe_membros_clinicas mc on mc.membro_id=m.id where m.id=p_membro and m.ativo and mc.clinica_id=p_contexto and mc.ativo) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  perform public.equipe_acesso_validar_clinicas(p_ator,p_membro,p_escopos);
end $$;
create function public.acesso_direto_reservar(p_ator uuid,p_membro uuid,p_contexto uuid,p_email text,p_escopos jsonb,p_chave uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype; e text:=lower(btrim(p_email)); h text;
begin
  perform acesso_direto.autorizar(p_ator,p_membro,p_contexto,p_escopos);
  if p_chave is null or e is null or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Dados inválidos.' using errcode='22023'; end if;
  if not (select habilitado from acesso_direto.controle where id) and not exists(select 1 from acesso_direto.homologacao where membro_id=p_membro and ator_id=p_ator and email=e) then raise exception 'SERVICO_INDISPONIVEL'; end if;
  perform pg_advisory_xact_lock(hashtextextended(e,0));
  h:=md5(jsonb_build_object('membro',p_membro,'contexto',p_contexto,'email',e,'escopos',p_escopos)::text);
  select * into o from acesso_direto.operacoes where ator_id=p_ator and chave=p_chave for update;
  if found then
    if o.payload_hash<>h then raise exception 'CONFLITO'; end if;
    if o.estado in ('pendente','ativa') then o.reserva_id:=null; return acesso_direto.resposta(o); end if;
    if o.estado<>'reservada' or o.reserva_ate>clock_timestamp() then raise exception 'CONFLITO'; end if;
    update acesso_direto.operacoes set reserva_id=gen_random_uuid(),reserva_ate=clock_timestamp()+interval '2 minutes',reserva_ator_id=p_ator,
      emitida_em=clock_timestamp(),expira_em=clock_timestamp()+interval '24 hours' where id=o.id returning * into o;
    return acesso_direto.resposta(o);
  end if;
  if exists(select 1 from public.equipe_membros where id=p_membro and usuario_id is not null)
    or exists(select 1 from public.equipe_acesso_convites where membro_id=p_membro and status in ('pendente','enviado','erro')) then raise exception 'CONFLITO'; end if;
  if exists(select 1 from auth.users where lower(email)=e) then raise exception 'CONTA_EXISTENTE'; end if;
  insert into acesso_direto.operacoes(membro_id,ator_id,contexto_id,email,escopos,chave,payload_hash,reserva_id,reserva_ate)
    values(p_membro,p_ator,p_contexto,e,p_escopos,p_chave,h,gen_random_uuid(),clock_timestamp()+interval '2 minutes') returning * into o;
  return acesso_direto.resposta(o);
exception when unique_violation then raise exception 'CONFLITO';
end $$;
create function public.acesso_direto_confirmar_conta(p_operacao uuid,p_reserva uuid,p_digest text) returns void language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype; escopo jsonb;
begin
  select * into strict o from acesso_direto.operacoes where id=p_operacao for update;
  perform acesso_direto.autorizar(coalesce(o.reserva_ator_id,o.ator_id),o.membro_id,o.contexto_id,o.escopos);
  if o.estado<>'reservada' or o.reserva_id is distinct from p_reserva or o.reserva_ate<=clock_timestamp() then raise exception 'CONFLITO'; end if;
  if not exists(select 1 from auth.users where id=o.auth_user_id and lower(email)=o.email and raw_app_meta_data->>'acesso_direto_operacao'=o.id::text) then raise exception 'CONFLITO'; end if;
  if p_digest<>'' and p_digest !~ '^[a-f0-9]{64}$' then raise exception 'Dados inválidos.' using errcode='22023'; end if;
  perform 1 from public.equipe_membros where id=o.membro_id for update;
  if exists(select 1 from public.equipe_membros where id=o.membro_id and usuario_id is not null and usuario_id<>o.auth_user_id) then raise exception 'CONFLITO'; end if;
  insert into public.usuarios(id,nome_completo,ativo) select o.auth_user_id,nome_completo,true from public.equipe_membros where id=o.membro_id on conflict(id) do nothing;
  update public.equipe_membros set usuario_id=o.auth_user_id where id=o.membro_id;
  for escopo in select value from jsonb_array_elements(o.escopos) loop
    -- Permissões só ficam ativas na conclusão. A reserva já bloqueia a conta.
    insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo) values(o.auth_user_id,(escopo->>'clinica_id')::uuid,(escopo->>'papel')::public.papel_usuario,false);
  end loop;
  update acesso_direto.operacoes set estado='pendente',senha_digest=nullif(p_digest,''),reserva_id=null,reserva_ate=null where id=o.id;
end $$;
create function public.acesso_direto_retomar(p_ator uuid,p_membro uuid,p_contexto uuid,p_operacao uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype;
begin
  select * into strict o from acesso_direto.operacoes where id=p_operacao and membro_id=p_membro for update;
  perform acesso_direto.autorizar(p_ator,p_membro,p_contexto,o.escopos);
  if o.estado in ('pendente','ativa') then o.reserva_id:=null; return acesso_direto.resposta(o); end if;
  if o.estado<>'reservada' or o.reserva_ate>clock_timestamp() then raise exception 'CONFLITO'; end if;
  update acesso_direto.operacoes set reserva_id=gen_random_uuid(),reserva_ate=clock_timestamp()+interval '2 minutes',reserva_ator_id=p_ator,
    emitida_em=clock_timestamp(),expira_em=clock_timestamp()+interval '24 hours' where id=o.id returning * into o;
  return acesso_direto.resposta(o);
end $$;
create function public.acesso_direto_reservar_troca(p_usuario uuid,p_sessao uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype; criada timestamptz; antes text;
begin
  select * into strict o from acesso_direto.operacoes where auth_user_id=p_usuario for update;
  if not acesso_direto.fluxo_permitido(coalesce(o.reserva_ator_id,o.ator_id),o.membro_id) then raise exception 'SERVICO_INDISPONIVEL'; end if;
  if o.expira_em<=clock_timestamp() then raise exception 'CREDENCIAL_EXPIRADA'; end if;
  select created_at into criada from auth.sessions where id=p_sessao and user_id=p_usuario;
  if o.estado<>'pendente' or criada is null or criada<o.emitida_em or o.reserva_ate>clock_timestamp() then raise exception 'CONFLITO'; end if;
  if not exists(select 1 from public.usuarios where id=p_usuario and ativo) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  select md5(encrypted_password) into antes from auth.users where id=p_usuario;
  update acesso_direto.operacoes set reserva_id=gen_random_uuid(),reserva_ate=clock_timestamp()+interval '2 minutes',reserva_iniciada_em=clock_timestamp(),senha_auth_antes=antes,senha_auth_esperada=null,senha_auth_confirmada=null,verificada_em=null where id=o.id returning * into o;
  return acesso_direto.resposta(o);
end $$;
create function public.acesso_direto_preparar_verificacao(p_operacao uuid,p_reserva uuid) returns void language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype; depois text;
begin
  select * into strict o from acesso_direto.operacoes where id=p_operacao for update;
  if o.estado<>'pendente' or o.reserva_id is distinct from p_reserva or o.reserva_ate<=clock_timestamp() or o.expira_em<=clock_timestamp() then raise exception 'CONFLITO'; end if;
  select md5(encrypted_password) into depois from auth.users where id=o.auth_user_id and lower(email)=o.email;
  if depois is null or depois is not distinct from o.senha_auth_antes then raise exception 'CONFLITO'; end if;
  update acesso_direto.operacoes set senha_auth_esperada=depois where id=o.id;
end $$;
create function public.acesso_direto_registrar_verificacao(p_operacao uuid,p_reserva uuid,p_sessao uuid) returns void language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype; depois text;
begin
  select * into strict o from acesso_direto.operacoes where id=p_operacao for update;
  if o.estado<>'pendente' or o.reserva_id is distinct from p_reserva or o.reserva_ate<=clock_timestamp() or o.expira_em<=clock_timestamp() then raise exception 'CONFLITO'; end if;
  if not exists(select 1 from auth.sessions where id=p_sessao and user_id=o.auth_user_id and created_at>=o.reserva_iniciada_em) then raise exception 'CONFLITO'; end if;
  select md5(encrypted_password) into depois from auth.users where id=o.auth_user_id and lower(email)=o.email;
  if depois is null or depois is distinct from o.senha_auth_esperada or depois is not distinct from o.senha_auth_antes then raise exception 'CONFLITO'; end if;
  update acesso_direto.operacoes set senha_auth_confirmada=depois,verificada_em=clock_timestamp() where id=o.id;
end $$;
create function public.acesso_direto_concluir_troca(p_operacao uuid,p_reserva uuid) returns void language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype;
begin
  select * into strict o from acesso_direto.operacoes where id=p_operacao for update;
  perform acesso_direto.autorizar(coalesce(o.reserva_ator_id,o.ator_id),o.membro_id,o.contexto_id,o.escopos);
  if o.estado<>'pendente' or o.reserva_id is distinct from p_reserva or o.reserva_ate<=clock_timestamp() then raise exception 'CONFLITO'; end if;
  if o.expira_em<=clock_timestamp() then raise exception 'CREDENCIAL_EXPIRADA'; end if;
  if o.verificada_em is null or o.senha_auth_confirmada is null or not exists(select 1 from auth.users where id=o.auth_user_id and md5(encrypted_password)=o.senha_auth_confirmada and md5(encrypted_password)<>o.senha_auth_antes and lower(email)=o.email) then raise exception 'CONFLITO'; end if;
  if not exists(select 1 from public.usuarios where id=o.auth_user_id and ativo)
     or not exists(select 1 from public.equipe_membros where id=o.membro_id and usuario_id=o.auth_user_id and ativo) then raise exception 'CONFLITO'; end if;
  if (select count(*) from public.usuarios_clinicas uc where uc.usuario_id=o.auth_user_id and exists(select 1 from jsonb_array_elements(o.escopos) e where (e->>'clinica_id')::uuid=uc.clinica_id and (e->>'papel')::public.papel_usuario=uc.papel))<>jsonb_array_length(o.escopos) then raise exception 'CONFLITO'; end if;
  -- Confirmar no banco o efeito da revogação global. Não confiar apenas em HTTP200.
  if exists(select 1 from auth.sessions where user_id=o.auth_user_id) then raise exception 'CONFLITO'; end if;
  -- Estado e vínculos são confirmados na MESMA transação. Qualquer erro desfaz
  -- ambos; nenhuma outra sessão vê a ativação intermediária.
  update acesso_direto.operacoes set estado='ativa',liberado_em=clock_timestamp(),senha_digest=null,senha_auth_antes=null,senha_auth_esperada=null,senha_auth_confirmada=null,verificada_em=null,reserva_id=null,reserva_ate=null,revisao=revisao+1 where id=o.id;
  update public.usuarios_clinicas uc set ativo=true where uc.usuario_id=o.auth_user_id
    and exists(select 1 from jsonb_array_elements(o.escopos) e where (e->>'clinica_id')::uuid=uc.clinica_id and (e->>'papel')::public.papel_usuario=uc.papel);
end $$;
create function public.acesso_direto_reservar_substituicao(p_ator uuid,p_membro uuid,p_contexto uuid,p_operacao uuid,p_revisao integer,p_chave uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype;
begin
  select * into strict o from acesso_direto.operacoes where id=p_operacao and membro_id=p_membro for update;
  perform acesso_direto.autorizar(p_ator,p_membro,p_contexto,o.escopos);
  if p_chave is null or o.estado in ('reservada','ativa') then raise exception 'CONFLITO'; end if;
  if o.substituicao_chave=p_chave then o.reserva_id:=null; return acesso_direto.resposta(o); end if;
  if o.revisao<>p_revisao or o.reserva_ate>clock_timestamp() then raise exception 'CONFLITO'; end if;
  if not exists(select 1 from public.usuarios where id=o.auth_user_id and ativo) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  update acesso_direto.operacoes set estado='substituindo',salt=gen_random_uuid(),senha_digest=null,senha_auth_antes=(select md5(encrypted_password) from auth.users where id=o.auth_user_id),
    reserva_id=gen_random_uuid(),reserva_ate=clock_timestamp()+interval '2 minutes',substituicao_chave=p_chave,revisao=revisao+1,reserva_ator_id=p_ator,
    emitida_em=clock_timestamp(),expira_em=clock_timestamp()+interval '24 hours' where id=o.id returning * into o;
  return acesso_direto.resposta(o);
end $$;
create function public.acesso_direto_confirmar_substituicao(p_operacao uuid,p_reserva uuid,p_digest text) returns void language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype;
begin
  select * into strict o from acesso_direto.operacoes where id=p_operacao for update;
  perform acesso_direto.autorizar(coalesce(o.reserva_ator_id,o.ator_id),o.membro_id,o.contexto_id,o.escopos);
  if o.estado<>'substituindo' or o.reserva_id is distinct from p_reserva or o.reserva_ate<=clock_timestamp() or p_digest !~ '^[a-f0-9]{64}$' then raise exception 'CONFLITO'; end if;
  if not exists(select 1 from auth.users where id=o.auth_user_id and md5(encrypted_password)<>o.senha_auth_antes) then raise exception 'CONFLITO'; end if;
  update acesso_direto.operacoes set estado='pendente',senha_digest=p_digest,senha_auth_antes=null,reserva_id=null,reserva_ate=null where id=o.id;
end $$;
create function public.acesso_direto_consultar_operacao(p_ator uuid,p_membro uuid,p_contexto uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype;
begin
  if not public.equipe_acesso_eh_proprietaria(p_ator,p_contexto) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  select * into o from acesso_direto.operacoes where membro_id=p_membro;
  if not found then return null; end if;
  perform acesso_direto.autorizar(p_ator,p_membro,p_contexto,o.escopos);
  return jsonb_build_object('id',o.id,'fase',o.estado,'estado',case when o.estado<>'ativa' and o.expira_em<=clock_timestamp() then 'expirada' else o.estado end,'revisao',o.revisao);
end $$;

-- Hook GRATUITO de emissão/renovação de JWT. Configuração futura no painel Auth.
-- Não substitui nem apaga hook existente: compor após inventário conectado.
create function public.acesso_direto_token_hook(event jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare o acesso_direto.operacoes%rowtype; criada timestamptz;
begin
  select * into o from acesso_direto.operacoes where auth_user_id=(event->>'user_id')::uuid;
  if not found then return event; end if;
  if o.estado<>'ativa' and (o.estado<>'pendente' or o.expira_em<=clock_timestamp()) then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Credencial temporária indisponível ou expirada.')); end if;
  select created_at into criada from auth.sessions where id=(event->'claims'->>'session_id')::uuid and user_id=o.auth_user_id;
  -- Durante emissão inicial a linha de sessão pode estar em criação: iat também
  -- é controlado pelo Auth. Na autorização de dados SEMPRE exigir linha real.
  if o.estado='ativa' and criada is not null and criada<=o.liberado_em then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Entre novamente com a senha pessoal.')); end if;
  if o.estado<>'ativa' and criada is not null and criada<o.emitida_em then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Entre novamente com a credencial atual.')); end if;
  return event;
end $$;

-- Funções administrativas nunca podem ser executadas por cliente/anon/PUBLIC.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as assinatura,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'acesso_direto_%' loop
    execute format('revoke all on function %s from public,anon,authenticated',f.assinatura);
    if f.proname='acesso_direto_estado' then execute format('grant execute on function %s to authenticated,service_role',f.assinatura);
    elsif f.proname in ('acesso_direto_exigir_sessao','acesso_direto_sessao_permitida') then execute format('grant execute on function %s to anon,authenticated,service_role',f.assinatura);
    elsif f.proname='acesso_direto_token_hook' then execute format('grant execute on function %s to supabase_auth_admin',f.assinatura);
    else execute format('grant execute on function %s to service_role',f.assinatura); end if;
  end loop;
end $$;
revoke all on all functions in schema acesso_direto from public,anon,authenticated;
grant usage on schema public to supabase_auth_admin;
commit;
