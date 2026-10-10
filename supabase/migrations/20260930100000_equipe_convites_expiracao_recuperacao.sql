begin;

-- Uma nova ação explícita de preparo encerra solicitações vencidas antes de
-- criar outra. O lock do membro e o lock lógico mantêm a operação serializada;
-- a chave de idempotência continua apontando sempre para a tentativa original.
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
  v_hash:=md5(jsonb_build_object('membro',p_membro_id,'email',v_email,'modo',p_modo,'clinicas',p_clinicas_papeis)::text);

  select * into v_exist from public.equipe_acesso_convites
  where solicitado_por=p_solicitante_id and chave_idempotencia=p_chave_idempotencia for update;
  if found then
    if v_exist.payload_hash<>v_hash then raise exception 'Esta tentativa já foi usada com dados diferentes.' using errcode='22023'; end if;
    perform public.equipe_acesso_validar_clinicas(p_solicitante_id,p_membro_id,p_clinicas_papeis);
    return jsonb_build_object(
      'id',v_exist.id,
      'status',case when v_exist.expira_em<=now() and v_exist.status in ('pendente','enviado','erro') then 'expirado' else v_exist.status end,
      'email',v_exist.email,'modo',v_exist.modo,'clinicas_papeis',v_exist.clinicas_papeis,
      'tentativas',v_exist.tentativas,'auth_user_id',v_exist.auth_user_id,'expira_em',v_exist.expira_em
    );
  end if;

  if v_membro.usuario_id is not null then raise exception 'Este membro já possui uma conta vinculada; use a concessão por clínica.' using errcode='22023'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,p_membro_id,p_clinicas_papeis);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('equipe-convite:'||p_membro_id::text||':'||v_email,0));

  update public.equipe_acesso_convites
  set status='cancelado',envio_reserva_id=null,envio_reservado_em=null,
      erro_codigo='CONVITE_EXPIRADO_SUBSTITUIDO',updated_at=now()
  where membro_id=p_membro_id
    and status in ('pendente','enviado','erro')
    and expira_em<=now();

  if exists(
    select 1 from public.equipe_acesso_convites
    where membro_id=p_membro_id
      and status in ('pendente','enviado','erro')
      and expira_em>now()
  ) then raise exception 'Já existe uma solicitação pendente para este membro.' using errcode='22023'; end if;

  insert into public.equipe_acesso_convites(membro_id,solicitado_por,email,modo,clinicas_papeis,chave_idempotencia,payload_hash)
  values(p_membro_id,p_solicitante_id,v_email,p_modo,p_clinicas_papeis,p_chave_idempotencia,v_hash)
  returning id into v_id;
  return jsonb_build_object('id',v_id,'status','pendente','email',v_email,'modo',p_modo,'clinicas_papeis',p_clinicas_papeis,'tentativas',0,'auth_user_id',null,'expira_em',now()+interval '7 days');
exception when unique_violation then
  raise exception 'Já existe um convite pendente para este membro e e-mail.' using errcode='23505';
end $$;

-- Expiração detectada durante a reserva não tenta gravar antes de lançar erro,
-- evitando a falsa impressão de que o cancelamento sobreviveu ao rollback.
create or replace function public.equipe_acesso_reservar_envio(p_solicitante_id uuid,p_convite_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype; v_reserva uuid;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  if v.expira_em<=now() then raise exception 'O convite expirou. Prepare uma nova solicitação.' using errcode='P0002'; end if;
  if v.status in ('aceito','cancelado') then raise exception 'Esta solicitação já foi encerrada.' using errcode='22023'; end if;
  if v.envio_reserva_id is not null and v.envio_reservado_em>now()-interval '5 minutes' then raise exception 'Aguarde o envio atual terminar.' using errcode='22023'; end if;
  if v.ultimo_envio_em is not null and v.ultimo_envio_em>now()-interval '60 seconds' then raise exception 'Aguarde um minuto antes de reenviar o convite.' using errcode='22023'; end if;
  v_reserva:=gen_random_uuid();
  update public.equipe_acesso_convites set envio_reserva_id=v_reserva,envio_reservado_em=now(),tentativas=tentativas+1,ultimo_envio_em=now(),updated_at=now() where id=v.id;
  return jsonb_build_object('id',v.id,'reserva_id',v_reserva,'email',v.email,'modo',v.modo,'status',v.status,'auth_user_id',v.auth_user_id,'expira_em',v.expira_em);
end $$;

-- Uma conclusão atrasada nunca reabre estados terminais. Ao observar expiração,
-- finaliza o cancelamento e retorna normalmente para que a alteração seja commitada.
create or replace function public.equipe_acesso_finalizar_envio(
  p_solicitante_id uuid,p_convite_id uuid,p_reserva_id uuid,p_sucesso boolean,p_erro_codigo text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  if v.status='aceito' then return jsonb_build_object('id',v.id,'status','aceito','tentativas',v.tentativas); end if;
  if v.status='cancelado' then return jsonb_build_object('id',v.id,'status','cancelado','tentativas',v.tentativas); end if;
  if v.expira_em<=now() then
    update public.equipe_acesso_convites
    set status='cancelado',envio_reserva_id=null,envio_reservado_em=null,erro_codigo='CONVITE_EXPIRADO',updated_at=now()
    where id=v.id;
    return jsonb_build_object('id',v.id,'status','cancelado','tentativas',v.tentativas);
  end if;
  if v.envio_reserva_id is null and v.status in ('enviado','erro') then return jsonb_build_object('id',v.id,'status',v.status,'tentativas',v.tentativas); end if;
  if v.envio_reserva_id is distinct from p_reserva_id then raise exception 'A reserva de envio não corresponde à solicitação.' using errcode='22023'; end if;
  update public.equipe_acesso_convites set status=case when p_sucesso then 'enviado' else 'erro' end,
    envio_reserva_id=null,envio_reservado_em=null,erro_codigo=case when p_sucesso then null else left(coalesce(p_erro_codigo,'envio_falhou'),80) end,updated_at=now()
    where id=v.id;
  return jsonb_build_object('id',v.id,'status',case when p_sucesso then 'enviado' else 'erro' end,'tentativas',v.tentativas);
end $$;

create or replace function public.equipe_acesso_registrar_auth(
  p_solicitante_id uuid,p_convite_id uuid,p_auth_user_id uuid,p_auth_email text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  if v.expira_em<=now() then raise exception 'O convite expirou.' using errcode='P0002'; end if;
  if v.status in ('aceito','cancelado') then raise exception 'Esta solicitação já foi encerrada.' using errcode='22023'; end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then raise exception 'A conta Auth não corresponde ao e-mail da solicitação.' using errcode='42501'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  if v.auth_user_id is not null and v.auth_user_id<>p_auth_user_id then raise exception 'Esta solicitação já está vinculada a outra conta.' using errcode='42501'; end if;
  update public.equipe_acesso_convites set auth_user_id=p_auth_user_id,updated_at=now() where id=v.id;
  return jsonb_build_object('id',v.id,'auth_user_id',p_auth_user_id,'status',v.status);
end $$;

-- Caminhos de aceite não fazem UPDATE imediatamente antes de RAISE. O
-- encerramento persistente de vencidos ocorre em preparar/finalizar.
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
  if v.status='cancelado' then raise exception 'Esta solicitação já foi encerrada.' using errcode='P0002'; end if;
  if v.expira_em<=now() then raise exception 'O convite expirou.' using errcode='P0002'; end if;
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
  if v.expira_em<=now() then raise exception 'O convite expirou.' using errcode='P0002'; end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then raise exception 'O e-mail da sessão não corresponde à solicitação.' using errcode='42501'; end if;
  if v.modo='vinculo' then perform public.equipe_acesso_validar_clinicas(v.solicitado_por,v.membro_id,v.clinicas_papeis); end if;
  return public.equipe_acesso_aplicar(v.solicitado_por,v.id,p_auth_user_id,p_auth_email,true);
end $$;

revoke all on function public.equipe_acesso_preparar(uuid,uuid,uuid,text,text,jsonb,uuid),public.equipe_acesso_reservar_envio(uuid,uuid),public.equipe_acesso_finalizar_envio(uuid,uuid,uuid,boolean,text),public.equipe_acesso_registrar_auth(uuid,uuid,uuid,text),public.equipe_acesso_aplicar(uuid,uuid,uuid,text,boolean),public.equipe_acesso_aceitar(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.equipe_acesso_preparar(uuid,uuid,uuid,text,text,jsonb,uuid),public.equipe_acesso_reservar_envio(uuid,uuid),public.equipe_acesso_finalizar_envio(uuid,uuid,uuid,boolean,text),public.equipe_acesso_registrar_auth(uuid,uuid,uuid,text),public.equipe_acesso_aplicar(uuid,uuid,uuid,text,boolean),public.equipe_acesso_aceitar(uuid,uuid,text,boolean) to service_role;

commit;
