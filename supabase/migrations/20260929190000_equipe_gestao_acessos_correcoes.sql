begin;

-- Correções aditivas da gestão de acessos. A migration anterior permanece
-- preservada; esta versão endurece o fluxo sem alterar o cadastro de Equipe.
alter table public.equipe_acesso_convites
  add column if not exists expira_em timestamptz,
  add column if not exists envio_reserva_id uuid,
  add column if not exists envio_reservado_em timestamptz;

update public.equipe_acesso_convites
set expira_em=coalesce(expira_em,created_at+interval '7 days')
where expira_em is null;

alter table public.equipe_acesso_convites
  alter column expira_em set default (now()+interval '7 days'),
  alter column expira_em set not null;

-- A mesma conta não pode ser associada a duas pessoas/profissionais por
-- concorrência ou por uma chamada direta autorizada.
create unique index if not exists equipe_membros_usuario_unico
  on public.equipe_membros(usuario_id) where usuario_id is not null;
create unique index if not exists profissionais_usuario_unico
  on public.profissionais(usuario_id) where usuario_id is not null;

create or replace function public.equipe_acesso_escopo_visivel(
  p_usuario_id uuid,p_clinicas jsonb
) returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(x.value order by x.value->>'clinica_id'),'[]'::jsonb)
  from jsonb_array_elements(coalesce(p_clinicas,'[]'::jsonb)) as x(value)
  where exists(
    select 1 from public.usuarios u
    join public.usuarios_clinicas uc on uc.usuario_id=u.id
    join public.clinicas c on c.id=uc.clinica_id and c.ativo
    where u.id=p_usuario_id and u.ativo and uc.ativo
      and uc.papel='proprietaria'::public.papel_usuario
      and uc.clinica_id::text=x->>'clinica_id'
  )
$$;

-- Consulta pura: não confirma titular, não aplica convite e não grava auditoria.
create or replace function public.equipe_acesso_listar(
  p_solicitante_id uuid,p_membro_id uuid,p_clinica_contexto_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_membro public.equipe_membros%rowtype; v_convites jsonb; v_clinicas jsonb;
begin
  if not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_contexto_id) then
    raise exception 'Acesso negado para administrar acessos nesta clínica.' using errcode='42501';
  end if;
  select * into v_membro from public.equipe_membros where id=p_membro_id and ativo for share;
  if not found or not exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=p_membro_id and ec.clinica_id=p_clinica_contexto_id and ec.ativo) then
    raise exception 'Membro não encontrado no contexto informado.' using errcode='P0002';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'nome',c.nome,'usuario_id',uc.usuario_id,'papel',uc.papel,'ativo',coalesce(uc.ativo,false),
    'status',case
      when inv.id is not null and inv.status in ('pendente','enviado','erro') and inv.expira_em>now() then 'convite_pendente'
      when v_membro.usuario_id is null then 'sem_acesso'
      when not exists(select 1 from public.usuarios u where u.id=v_membro.usuario_id and u.ativo) then 'conta_inativa'
      when uc.usuario_id is null then 'sem_acesso'
      when uc.ativo then 'acesso_ativo'
      else 'acesso_suspenso' end
  ) order by c.nome),'[]'::jsonb) into v_clinicas
  from public.equipe_membros_clinicas ec join public.clinicas c on c.id=ec.clinica_id and c.ativo
  left join public.usuarios_clinicas uc on uc.usuario_id=v_membro.usuario_id and uc.clinica_id=c.id
  left join lateral (
    select i.* from public.equipe_acesso_convites i
    where i.membro_id=p_membro_id and i.status in ('pendente','enviado','erro') and i.expira_em>now()
      and exists(select 1 from jsonb_array_elements(i.clinicas_papeis) x where x->>'clinica_id'=c.id::text)
    order by i.created_at desc limit 1
  ) inv on true
  where ec.membro_id=p_membro_id and ec.ativo and public.equipe_acesso_eh_proprietaria(p_solicitante_id,c.id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'modo',i.modo,'status',case when i.expira_em<=now() and i.status in ('pendente','enviado','erro') then 'expirado' else i.status end,
    'auth_user_id',i.auth_user_id,'email',i.email,
    'clinicas_papeis',public.equipe_acesso_escopo_visivel(p_solicitante_id,i.clinicas_papeis),
    'tentativas',i.tentativas,'ultimo_envio_em',i.ultimo_envio_em,'erro_codigo',i.erro_codigo,
    'expira_em',i.expira_em
  ) order by i.created_at desc),'[]'::jsonb) into v_convites
  from public.equipe_acesso_convites i
  where i.membro_id=p_membro_id and i.status not in ('cancelado')
    and jsonb_array_length(public.equipe_acesso_escopo_visivel(p_solicitante_id,i.clinicas_papeis))>0;
  return jsonb_build_object('membro_id',p_membro_id,'usuario_id',v_membro.usuario_id,'clinicas',v_clinicas,'convites',v_convites);
end $$;

create or replace function public.equipe_acesso_preparar(
  p_solicitante_id uuid,p_membro_id uuid,p_clinica_contexto_id uuid,p_email text,p_modo text,p_clinicas_papeis jsonb,p_chave_idempotencia uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_membro public.equipe_membros%rowtype; v_id uuid; v_hash text; v_exist public.equipe_acesso_convites%rowtype; v_email text;
begin
  select * into v_membro from public.equipe_membros where id=p_membro_id and ativo for update;
  if not found then raise exception 'Membro não encontrado.' using errcode='P0002'; end if;
  if not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_contexto_id) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  if p_modo not in ('convite','vinculo') then raise exception 'Modo de concessão inválido.' using errcode='22023'; end if;
  v_email:=lower(btrim(coalesce(p_email,'')));
  if v_email='' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Informe um e-mail de login válido.' using errcode='22023'; end if;
  if p_chave_idempotencia is null then raise exception 'Identificador da tentativa é obrigatório.' using errcode='22023'; end if;
  if p_modo='convite' and v_membro.usuario_id is not null then raise exception 'Este membro já possui uma conta vinculada; use a concessão por clínica.' using errcode='22023'; end if;
  if p_modo='vinculo' and v_membro.usuario_id is not null then raise exception 'A conta já está vinculada a este membro; use a concessão por clínica.' using errcode='22023'; end if;
  if exists(select 1 from public.equipe_acesso_convites where membro_id=p_membro_id and email<>v_email and status in ('pendente','enviado','erro') and expira_em>now()) then
    raise exception 'Já existe uma solicitação pendente para este membro.' using errcode='22023';
  end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,p_membro_id,p_clinicas_papeis);
  v_hash:=md5(jsonb_build_object('membro',p_membro_id,'email',v_email,'modo',p_modo,'clinicas',p_clinicas_papeis)::text);
  select * into v_exist from public.equipe_acesso_convites where solicitado_por=p_solicitante_id and chave_idempotencia=p_chave_idempotencia for update;
  if found then
    if v_exist.payload_hash<>v_hash then raise exception 'Esta tentativa já foi usada com dados diferentes.' using errcode='22023'; end if;
    return jsonb_build_object('id',v_exist.id,'status',v_exist.status,'email',v_exist.email,'modo',v_exist.modo,'clinicas_papeis',v_exist.clinicas_papeis,'tentativas',v_exist.tentativas,'auth_user_id',v_exist.auth_user_id,'expira_em',v_exist.expira_em);
  end if;
  insert into public.equipe_acesso_convites(membro_id,solicitado_por,email,modo,clinicas_papeis,chave_idempotencia,payload_hash)
  values(p_membro_id,p_solicitante_id,v_email,p_modo,p_clinicas_papeis,p_chave_idempotencia,v_hash) returning id into v_id;
  return jsonb_build_object('id',v_id,'status','pendente','email',v_email,'modo',p_modo,'clinicas_papeis',p_clinicas_papeis,'tentativas',0,'auth_user_id',null,'expira_em',now()+interval '7 days');
exception when unique_violation then
  raise exception 'Já existe um convite pendente para este membro e e-mail.' using errcode='23505';
end $$;

create or replace function public.equipe_acesso_convite_detalhar(p_solicitante_id uuid,p_convite_id uuid,p_clinica_contexto_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype; v_escopo jsonb;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id for share;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  if v.solicitado_por<>p_solicitante_id or not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_contexto_id) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  v_escopo:=public.equipe_acesso_escopo_visivel(p_solicitante_id,v.clinicas_papeis);
  return jsonb_build_object('id',v.id,'membro_id',v.membro_id,'email',v.email,'modo',v.modo,
    'status',case when v.expira_em<=now() and v.status in ('pendente','enviado','erro') then 'expirado' else v.status end,
    'auth_user_id',v.auth_user_id,'clinicas_papeis',v_escopo,'tentativas',v.tentativas,'ultimo_envio_em',v.ultimo_envio_em,'erro_codigo',v.erro_codigo,'expira_em',v.expira_em);
end $$;

-- Reserva o intervalo antes do serviço externo. Duas requisições concorrentes
-- não conseguem obter a mesma reserva.
create or replace function public.equipe_acesso_reservar_envio(p_solicitante_id uuid,p_convite_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype; v_reserva uuid;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  if v.expira_em<=now() then update public.equipe_acesso_convites set status='cancelado',erro_codigo='CONVITE_EXPIRADO',updated_at=now() where id=v.id; raise exception 'O convite expirou.' using errcode='P0002'; end if;
  if v.status in ('aceito','cancelado') then raise exception 'Esta solicitação já foi encerrada.' using errcode='22023'; end if;
  if v.envio_reserva_id is not null and v.envio_reservado_em>now()-interval '5 minutes' then raise exception 'Aguarde o envio atual terminar.' using errcode='22023'; end if;
  if v.ultimo_envio_em is not null and v.ultimo_envio_em>now()-interval '60 seconds' then raise exception 'Aguarde um minuto antes de reenviar o convite.' using errcode='22023'; end if;
  v_reserva:=gen_random_uuid();
  update public.equipe_acesso_convites set envio_reserva_id=v_reserva,envio_reservado_em=now(),tentativas=tentativas+1,ultimo_envio_em=now(),updated_at=now() where id=v.id;
  return jsonb_build_object('id',v.id,'reserva_id',v_reserva,'email',v.email,'modo',v.modo,'status',v.status,'auth_user_id',v.auth_user_id,'expira_em',v.expira_em);
end $$;

create or replace function public.equipe_acesso_finalizar_envio(
  p_solicitante_id uuid,p_convite_id uuid,p_reserva_id uuid,p_sucesso boolean,p_erro_codigo text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  if v.status='aceito' then return jsonb_build_object('id',v.id,'status','aceito','tentativas',v.tentativas); end if;
  if v.expira_em<=now() then update public.equipe_acesso_convites set status='cancelado',envio_reserva_id=null,envio_reservado_em=null,erro_codigo='CONVITE_EXPIRADO',updated_at=now() where id=v.id; raise exception 'O convite expirou.' using errcode='P0002'; end if;
  if v.envio_reserva_id is null and v.status in ('enviado','erro') then return jsonb_build_object('id',v.id,'status',v.status,'tentativas',v.tentativas); end if;
  if v.envio_reserva_id is distinct from p_reserva_id then raise exception 'A reserva de envio não corresponde à solicitação.' using errcode='22023'; end if;
  update public.equipe_acesso_convites set status=case when p_sucesso then 'enviado' else 'erro' end,
    envio_reserva_id=null,envio_reservado_em=null,erro_codigo=case when p_sucesso then null else left(coalesce(p_erro_codigo,'envio_falhou'),80) end,updated_at=now()
    where id=v.id;
  return jsonb_build_object('id',v.id,'status',case when p_sucesso then 'enviado' else 'erro' end,'tentativas',v.tentativas);
end $$;

-- Registra a conta Auth criada antes de uma eventual falha da etapa pública.
-- Não cria usuario, vínculo clínico ou auditoria de concessão.
create or replace function public.equipe_acesso_registrar_auth(
  p_solicitante_id uuid,p_convite_id uuid,p_auth_user_id uuid,p_auth_email text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  if v.expira_em<=now() then raise exception 'O convite expirou.' using errcode='P0002'; end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then raise exception 'A conta Auth não corresponde ao e-mail da solicitação.' using errcode='42501'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  if v.auth_user_id is not null and v.auth_user_id<>p_auth_user_id then raise exception 'Esta solicitação já está vinculada a outra conta.' using errcode='42501'; end if;
  if v.status='aceito' then raise exception 'Esta solicitação já foi aceita.' using errcode='22023'; end if;
  update public.equipe_acesso_convites set auth_user_id=p_auth_user_id,updated_at=now() where id=v.id;
  return jsonb_build_object('id',v.id,'auth_user_id',p_auth_user_id,'status',v.status);
end $$;

-- Consulta pontual de Auth por e-mail, sem expor lista global. Só a função
-- de servidor executa; o cliente nunca recebe este resultado diretamente.
create or replace function public.equipe_acesso_localizar_conta(p_email text)
returns jsonb language sql stable security definer set search_path='' as $$
  select case when u.id is null then null::jsonb else jsonb_build_object(
    'id',u.id,'email',lower(u.email),'confirmado',(u.email_confirmed_at is not null)
  ) end
  from auth.users u where lower(u.email)=lower(btrim(p_email)) limit 1
$$;

create or replace function public.equipe_acesso_aplicar(
  p_solicitante_id uuid,p_convite_id uuid,p_auth_user_id uuid,p_auth_email text,p_confirmado boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v public.equipe_acesso_convites%rowtype; m public.equipe_membros%rowtype; u public.usuarios%rowtype;
  p public.profissionais%rowtype; v_item jsonb; v_clinica uuid; v_papel public.papel_usuario; v_uc public.usuarios_clinicas%rowtype; v_proprietarias integer;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  if v.status='aceito' then
    if p_confirmado and v.auth_user_id=p_auth_user_id and lower(btrim(coalesce(p_auth_email,'')))=v.email then return jsonb_build_object('id',v.id,'status','aceito','membro_id',v.membro_id,'usuario_id',p_auth_user_id); end if;
    raise exception 'Esta solicitação já foi aceita.' using errcode='22023';
  end if;
  if v.status='cancelado' or v.expira_em<=now() then
    update public.equipe_acesso_convites set status='cancelado',erro_codigo='CONVITE_EXPIRADO',updated_at=now() where id=v.id;
    raise exception 'O convite expirou ou foi encerrado.' using errcode='P0002';
  end if;
  if v.status not in ('pendente','enviado','erro') then raise exception 'Esta solicitação já foi encerrada.' using errcode='22023'; end if;
  if p_auth_user_id is null or lower(btrim(coalesce(p_auth_email,'')))<>v.email then raise exception 'A confirmação não corresponde ao e-mail da solicitação.' using errcode='42501'; end if;
  select * into m from public.equipe_membros where id=v.membro_id and ativo for update;
  if not found then raise exception 'Membro não encontrado.' using errcode='P0002'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,m.id,v.clinicas_papeis);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('equipe-acesso-usuario:'||p_auth_user_id::text,0));
  if m.usuario_id is not null and m.usuario_id<>p_auth_user_id then raise exception 'Este membro já está vinculado a outra conta.' using errcode='23505'; end if;
  if exists(select 1 from public.equipe_membros other where other.usuario_id=p_auth_user_id and other.id<>m.id) then raise exception 'A conta já está vinculada a outro membro.' using errcode='23505'; end if;
  if m.tipo='profissional_saude'::public.tipo_membro_equipe then
    if m.profissional_id is null then raise exception 'Profissional sem cadastro operacional.' using errcode='22023'; end if;
    select * into p from public.profissionais where id=m.profissional_id for update;
    if not found then raise exception 'Cadastro profissional não encontrado.' using errcode='P0002'; end if;
    if p.usuario_id is not null and p.usuario_id<>p_auth_user_id then raise exception 'O profissional já está vinculado a outra conta.' using errcode='23505'; end if;
    if exists(select 1 from public.profissionais other where other.usuario_id=p_auth_user_id and other.id<>p.id) then raise exception 'A conta já está vinculada a outro profissional.' using errcode='23505'; end if;
  end if;
  -- Trava os vínculos-alvo antes de revalidar a autorização da administradora.
  for v_item in select value from jsonb_array_elements(v.clinicas_papeis) loop
    v_clinica:=(v_item->>'clinica_id')::uuid;
    perform 1 from public.usuarios_clinicas where clinica_id=v_clinica order by usuario_id for update;
    if not public.equipe_acesso_eh_proprietaria(p_solicitante_id,v_clinica) then raise exception 'A autorização da administração expirou.' using errcode='42501'; end if;
  end loop;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,m.id,v.clinicas_papeis);
  if not p_confirmado then
    update public.equipe_acesso_convites set auth_user_id=p_auth_user_id,status='enviado',aceito_em=null,updated_at=now() where id=v.id;
    return jsonb_build_object('id',v.id,'status','enviado','membro_id',m.id,'usuario_id',null);
  end if;
  insert into public.usuarios(id,nome_completo) values(p_auth_user_id,m.nome_completo) on conflict(id) do nothing;
  select * into u from public.usuarios where id=p_auth_user_id for update;
  if not u.ativo then raise exception 'A conta está inativa; não é possível conceder acesso.' using errcode='42501'; end if;
  perform set_config('app.equipe_origem','equipe',true);
  update public.equipe_membros set usuario_id=p_auth_user_id,updated_at=now() where id=m.id;
  if m.profissional_id is not null then update public.profissionais set usuario_id=p_auth_user_id,updated_at=now() where id=m.profissional_id; end if;
  perform set_config('app.equipe_origem','',true);
  for v_item in select value from jsonb_array_elements(v.clinicas_papeis) loop
    v_clinica:=(v_item->>'clinica_id')::uuid; v_papel:=(v_item->>'papel')::public.papel_usuario;
    select * into v_uc from public.usuarios_clinicas where usuario_id=p_auth_user_id and clinica_id=v_clinica for update;
    if found then
      if not v_uc.ativo then raise exception 'Já existe um acesso suspenso nesta clínica; use Reativar acesso.' using errcode='22023'; end if;
      if v_uc.papel is distinct from v_papel then
        if v_uc.papel='proprietaria' and v_papel<>'proprietaria' then
          select count(*) into v_proprietarias from public.usuarios_clinicas uc join public.usuarios ux on ux.id=uc.usuario_id where uc.clinica_id=v_clinica and uc.ativo and ux.ativo and uc.papel='proprietaria';
          if v_proprietarias<=1 then raise exception 'A última administradora ativa não pode perder o papel.' using errcode='42501'; end if;
        end if;
        update public.usuarios_clinicas set papel=v_papel where usuario_id=p_auth_user_id and clinica_id=v_clinica;
        insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(v_clinica,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','alterar_papel','usuario_id',p_auth_user_id,'papel',v_papel,'ativo',true));
      end if;
    else
      insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo) values(p_auth_user_id,v_clinica,v_papel,true);
      insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(v_clinica,p_solicitante_id,'INSERT'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','conceder','usuario_id',p_auth_user_id,'papel',v_papel,'ativo',true));
    end if;
  end loop;
  update public.equipe_acesso_convites set auth_user_id=p_auth_user_id,status='aceito',aceito_em=now(),envio_reserva_id=null,envio_reservado_em=null,updated_at=now() where id=v.id;
  return jsonb_build_object('id',v.id,'status','aceito','membro_id',m.id,'usuario_id',p_auth_user_id);
end $$;

create or replace function public.equipe_acesso_confirmar_titular(
  p_convite_id uuid,p_auth_user_id uuid,p_auth_email text,p_email_confirmado boolean
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  if not p_email_confirmado then raise exception 'Confirme o e-mail da conta antes de aceitar.' using errcode='42501'; end if;
  select * into v from public.equipe_acesso_convites where id=p_convite_id and modo='vinculo' for update;
  if not found then raise exception 'Solicitação de vínculo não encontrada.' using errcode='P0002'; end if;
  if v.status='aceito' and v.auth_user_id=p_auth_user_id and lower(btrim(coalesce(p_auth_email,'')))=v.email then return jsonb_build_object('id',v.id,'status','aceito','membro_id',v.membro_id,'usuario_id',p_auth_user_id); end if;
  if v.status not in ('pendente','enviado','erro') then raise exception 'Esta solicitação já foi encerrada.' using errcode='22023'; end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then raise exception 'O e-mail da sessão não corresponde à solicitação.' using errcode='42501'; end if;
  perform public.equipe_acesso_validar_clinicas(v.solicitado_por,v.membro_id,v.clinicas_papeis);
  return public.equipe_acesso_aplicar(v.solicitado_por,v.id,p_auth_user_id,p_auth_email,true);
end $$;

create or replace function public.equipe_acesso_aceitar(
  p_convite_id uuid,p_auth_user_id uuid,p_auth_email text,p_email_confirmado boolean
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  if not p_email_confirmado then raise exception 'Confirme o e-mail da conta antes de aceitar.' using errcode='42501'; end if;
  select * into v from public.equipe_acesso_convites where id=p_convite_id for update;
  if not found then raise exception 'Solicitação de acesso não encontrada.' using errcode='P0002'; end if;
  if v.status='aceito' and v.auth_user_id=p_auth_user_id and lower(btrim(coalesce(p_auth_email,'')))=v.email then return jsonb_build_object('id',v.id,'status','aceito','membro_id',v.membro_id,'usuario_id',p_auth_user_id); end if;
  if v.status not in ('pendente','enviado','erro') then raise exception 'Esta solicitação já foi encerrada.' using errcode='22023'; end if;
  if v.expira_em<=now() then update public.equipe_acesso_convites set status='cancelado',erro_codigo='CONVITE_EXPIRADO',updated_at=now() where id=v.id; raise exception 'O convite expirou.' using errcode='P0002'; end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then raise exception 'O e-mail da sessão não corresponde à solicitação.' using errcode='42501'; end if;
  if v.modo='vinculo' then perform public.equipe_acesso_validar_clinicas(v.solicitado_por,v.membro_id,v.clinicas_papeis); end if;
  return public.equipe_acesso_aplicar(v.solicitado_por,v.id,p_auth_user_id,p_auth_email,true);
end $$;

create or replace function public.equipe_acesso_alterar(
  p_solicitante_id uuid,p_membro_id uuid,p_clinica_contexto_id uuid,p_clinica_alvo_id uuid,p_acao text,p_papel text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.equipe_membros%rowtype; uc public.usuarios_clinicas%rowtype; u public.usuarios%rowtype; v_novo public.papel_usuario; v_proprietarias integer; v_tem_acesso boolean;
begin
  select * into m from public.equipe_membros where id=p_membro_id and ativo for update;
  if not found or not exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=p_membro_id and ec.clinica_id=p_clinica_alvo_id and ec.ativo) then raise exception 'Membro não encontrado nesta clínica.' using errcode='P0002'; end if;
  if m.usuario_id is null then raise exception 'Este membro ainda não possui conta vinculada.' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('equipe-acesso-usuario:'||m.usuario_id::text,0));
  select * into u from public.usuarios where id=m.usuario_id for update;
  perform 1 from public.usuarios_clinicas where clinica_id=p_clinica_alvo_id order by usuario_id for update;
  if not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_contexto_id) or not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_alvo_id) then raise exception 'Acesso negado para esta clínica.' using errcode='42501'; end if;
  select * into uc from public.usuarios_clinicas where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id for update;
  v_tem_acesso:=found;
  if p_acao in ('papel','conceder') then
    if p_papel not in ('proprietaria','medico','recepcao') then raise exception 'Papel não permitido.' using errcode='22023'; end if;
    v_novo:=p_papel::public.papel_usuario;
  end if;
  if p_acao='conceder' then
    if exists(select 1 from public.equipe_acesso_convites where membro_id=m.id and status in ('pendente','enviado','erro') and expira_em>now()) then raise exception 'O convite ainda aguarda o aceite do titular.' using errcode='22023'; end if;
    if v_tem_acesso then raise exception 'O acesso já existe; use Reativar ou alterar papel.' using errcode='23505'; end if;
    if not u.ativo then raise exception 'A conta global está inativa.' using errcode='42501'; end if;
    insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo) values(m.usuario_id,p_clinica_alvo_id,v_novo,true);
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'INSERT'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','conceder','usuario_id',m.usuario_id,'papel',v_novo,'ativo',true));
  elsif p_acao='reativar' then
    if not v_tem_acesso then raise exception 'Não há acesso suspenso nesta clínica.' using errcode='P0002'; end if;
    if uc.ativo then return jsonb_build_object('status','acesso_ativo','clinica_id',p_clinica_alvo_id); end if;
    if not u.ativo then raise exception 'A conta global está inativa.' using errcode='42501'; end if;
    update public.usuarios_clinicas set ativo=true where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id;
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','reativar','usuario_id',m.usuario_id,'papel',uc.papel,'ativo',true));
  elsif p_acao='suspender' then
    if not v_tem_acesso or not uc.ativo then return jsonb_build_object('status','acesso_suspenso','clinica_id',p_clinica_alvo_id); end if;
    if m.usuario_id=p_solicitante_id then raise exception 'Você não pode suspender o próprio acesso.' using errcode='42501'; end if;
    if uc.papel='proprietaria' then
      select count(*) into v_proprietarias from public.usuarios_clinicas x join public.usuarios ux on ux.id=x.usuario_id where x.clinica_id=p_clinica_alvo_id and x.ativo and ux.ativo and x.papel='proprietaria';
      if v_proprietarias<=1 then raise exception 'A última administradora ativa não pode ser suspensa.' using errcode='42501'; end if;
    end if;
    update public.usuarios_clinicas set ativo=false where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id;
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','suspender','usuario_id',m.usuario_id,'papel',uc.papel,'ativo',false));
  elsif p_acao='papel' then
    if not v_tem_acesso then raise exception 'Não há vínculo de acesso nesta clínica.' using errcode='P0002'; end if;
    if not uc.ativo then raise exception 'O acesso está suspenso; reative-o antes de alterar o papel.' using errcode='22023'; end if;
    if uc.papel is distinct from v_novo and uc.papel='proprietaria' then
      select count(*) into v_proprietarias from public.usuarios_clinicas x join public.usuarios ux on ux.id=x.usuario_id where x.clinica_id=p_clinica_alvo_id and x.ativo and ux.ativo and x.papel='proprietaria';
      if v_proprietarias<=1 then raise exception 'A última administradora ativa não pode perder o papel.' using errcode='42501'; end if;
    end if;
    if uc.papel is distinct from v_novo and m.usuario_id=p_solicitante_id and v_novo<>'proprietaria' then raise exception 'Você não pode remover o próprio papel de administradora.' using errcode='42501'; end if;
    update public.usuarios_clinicas set papel=v_novo where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id;
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','alterar_papel','usuario_id',m.usuario_id,'papel',v_novo,'ativo',true));
  else raise exception 'Operação de acesso inválida.' using errcode='22023';
  end if;
  return jsonb_build_object('status',case when p_acao='suspender' then 'acesso_suspenso' when p_acao='reativar' then 'acesso_ativo' else 'acesso_ativo' end,'clinica_id',p_clinica_alvo_id,'papel',coalesce(v_novo,uc.papel));
end $$;

-- As assinaturas antigas não ficam executáveis: o aceite exige o estado
-- confirmado da sessão e o envio exige reserva transacional.
revoke all on function public.equipe_acesso_aceitar(uuid,uuid,text),public.equipe_acesso_confirmar_titular(uuid,uuid,text),public.equipe_acesso_registrar_envio(uuid,uuid,boolean,text) from public,anon,authenticated,service_role;
revoke all on function public.equipe_acesso_escopo_visivel(uuid,jsonb),public.equipe_acesso_reservar_envio(uuid,uuid),public.equipe_acesso_finalizar_envio(uuid,uuid,uuid,boolean,text),public.equipe_acesso_registrar_auth(uuid,uuid,uuid,text),public.equipe_acesso_localizar_conta(text),public.equipe_acesso_aceitar(uuid,uuid,text,boolean),public.equipe_acesso_confirmar_titular(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.equipe_acesso_listar(uuid,uuid,uuid),public.equipe_acesso_preparar(uuid,uuid,uuid,text,text,jsonb,uuid),public.equipe_acesso_convite_detalhar(uuid,uuid,uuid),public.equipe_acesso_escopo_visivel(uuid,jsonb),public.equipe_acesso_reservar_envio(uuid,uuid),public.equipe_acesso_finalizar_envio(uuid,uuid,uuid,boolean,text),public.equipe_acesso_registrar_auth(uuid,uuid,uuid,text),public.equipe_acesso_localizar_conta(text),public.equipe_acesso_aplicar(uuid,uuid,uuid,text,boolean),public.equipe_acesso_aceitar(uuid,uuid,text,boolean),public.equipe_acesso_confirmar_titular(uuid,uuid,text,boolean),public.equipe_acesso_alterar(uuid,uuid,uuid,uuid,text,text) to service_role;

commit;
