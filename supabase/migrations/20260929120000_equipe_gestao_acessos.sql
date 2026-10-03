begin;

-- Gestão de acesso da Equipe: o cadastro da pessoa continua separado do
-- login. Convites ficam somente como estado operacional; nenhum segredo Auth
-- é persistido ou devolvido ao cliente.
create table public.equipe_acesso_convites (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.equipe_membros(id) on delete restrict,
  solicitado_por uuid not null references public.usuarios(id) on delete restrict,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  modo text not null check (modo in ('convite','vinculo')),
  clinicas_papeis jsonb not null check (jsonb_typeof(clinicas_papeis) = 'array'),
  chave_idempotencia uuid not null,
  payload_hash text not null,
  auth_user_id uuid,
  status text not null default 'pendente' check (status in ('pendente','enviado','aceito','erro','cancelado')),
  tentativas integer not null default 0 check (tentativas >= 0),
  ultimo_envio_em timestamptz,
  aceito_em timestamptz,
  erro_codigo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (solicitado_por, chave_idempotencia)
);
create index equipe_acesso_convites_membro_idx on public.equipe_acesso_convites(membro_id, created_at desc);
create unique index equipe_acesso_convite_pendente_unico on public.equipe_acesso_convites(membro_id, email)
  where status in ('pendente','enviado');
alter table public.equipe_acesso_convites enable row level security;
revoke all on public.equipe_acesso_convites from public, anon, authenticated;

create or replace function public.equipe_acesso_eh_proprietaria(p_usuario_id uuid, p_clinica_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.usuarios u
    join public.usuarios_clinicas uc on uc.usuario_id=u.id
    where u.id=p_usuario_id and u.ativo and uc.clinica_id=p_clinica_id
      and uc.papel='proprietaria'::public.papel_usuario and uc.ativo
  )
$$;

create or replace function public.equipe_acesso_validar_clinicas(
  p_usuario_id uuid,p_membro_id uuid,p_clinicas jsonb
) returns void language plpgsql security definer set search_path='' as $$
declare v_item jsonb; v_clinica uuid; v_papel text;
begin
  if jsonb_typeof(p_clinicas)<>'array' or jsonb_array_length(p_clinicas)=0 then
    raise exception 'Selecione ao menos uma clínica.' using errcode='22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_clinicas) loop
    if jsonb_typeof(v_item)<>'object' or not (v_item ? 'clinica_id') or not (v_item ? 'papel') then
      raise exception 'O escopo de acesso é inválido.' using errcode='22023';
    end if;
    begin v_clinica:=(v_item->>'clinica_id')::uuid; exception when invalid_text_representation then raise exception 'Clínica inválida.' using errcode='22023'; end;
    v_papel:=v_item->>'papel';
    if v_papel not in ('proprietaria','medico','recepcao') then raise exception 'Papel não permitido nesta etapa.' using errcode='22023'; end if;
    if not public.equipe_acesso_eh_proprietaria(p_usuario_id,v_clinica) then
      raise exception 'Você não administra uma das clínicas selecionadas.' using errcode='42501';
    end if;
    if not exists(select 1 from public.clinicas c where c.id=v_clinica and c.ativo) then
      raise exception 'Clínica inexistente ou inativa.' using errcode='22023';
    end if;
    if not exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=p_membro_id and ec.clinica_id=v_clinica and ec.ativo) then
      raise exception 'O membro não possui vínculo ativo em uma das clínicas selecionadas.' using errcode='22023';
    end if;
  end loop;
  if (select count(distinct (x->>'clinica_id')) from jsonb_array_elements(p_clinicas) x)<>jsonb_array_length(p_clinicas) then
    raise exception 'Não repita clínicas no escopo de acesso.' using errcode='22023';
  end if;
end $$;

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
      when inv.id is not null and inv.status in ('pendente','enviado') then 'convite_pendente'
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
    where i.membro_id=p_membro_id and i.status in ('pendente','enviado')
      and exists(select 1 from jsonb_array_elements(i.clinicas_papeis) x where x->>'clinica_id'=c.id::text)
    order by i.created_at desc limit 1
  ) inv on true
  where ec.membro_id=p_membro_id and ec.ativo and public.equipe_acesso_eh_proprietaria(p_solicitante_id,c.id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'modo',i.modo,'status',i.status,'auth_user_id',i.auth_user_id,
    'email',i.email,'clinicas_papeis',i.clinicas_papeis,'tentativas',i.tentativas,
    'ultimo_envio_em',i.ultimo_envio_em,'erro_codigo',i.erro_codigo
  ) order by i.created_at desc),'[]'::jsonb) into v_convites
  from public.equipe_acesso_convites i where i.membro_id=p_membro_id and i.status not in ('cancelado');
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
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,p_membro_id,p_clinicas_papeis);
  v_hash:=md5(jsonb_build_object('membro',p_membro_id,'email',v_email,'modo',p_modo,'clinicas',p_clinicas_papeis)::text);
  select * into v_exist from public.equipe_acesso_convites where solicitado_por=p_solicitante_id and chave_idempotencia=p_chave_idempotencia for update;
  if found then
    if v_exist.payload_hash<>v_hash then raise exception 'Esta tentativa já foi usada com dados diferentes.' using errcode='22023'; end if;
    return jsonb_build_object('id',v_exist.id,'status',v_exist.status,'email',v_exist.email,'modo',v_exist.modo,'clinicas_papeis',v_exist.clinicas_papeis,'tentativas',v_exist.tentativas);
  end if;
  insert into public.equipe_acesso_convites(membro_id,solicitado_por,email,modo,clinicas_papeis,chave_idempotencia,payload_hash)
  values(p_membro_id,p_solicitante_id,v_email,p_modo,p_clinicas_papeis,p_chave_idempotencia,v_hash) returning id into v_id;
  return jsonb_build_object('id',v_id,'status','pendente','email',v_email,'modo',p_modo,'clinicas_papeis',p_clinicas_papeis,'tentativas',0);
exception when unique_violation then
  raise exception 'Já existe um convite pendente para este membro e e-mail.' using errcode='23505';
end $$;

create or replace function public.equipe_acesso_convite_detalhar(p_solicitante_id uuid,p_convite_id uuid,p_clinica_contexto_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id for share;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  if v.solicitado_por<>p_solicitante_id then raise exception 'Acesso negado.' using errcode='42501'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  if not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_contexto_id) then raise exception 'Acesso negado.' using errcode='42501'; end if;
  return jsonb_build_object('id',v.id,'membro_id',v.membro_id,'email',v.email,'modo',v.modo,'status',v.status,'auth_user_id',v.auth_user_id,'clinicas_papeis',v.clinicas_papeis,'tentativas',v.tentativas,'ultimo_envio_em',v.ultimo_envio_em);
end $$;

create or replace function public.equipe_acesso_registrar_envio(p_solicitante_id uuid,p_convite_id uuid,p_sucesso boolean,p_erro_codigo text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,v.membro_id,v.clinicas_papeis);
  if p_sucesso and v.ultimo_envio_em is not null and v.ultimo_envio_em > now()-interval '60 seconds' then
    raise exception 'Aguarde um minuto antes de reenviar o convite.' using errcode='22023';
  end if;
  update public.equipe_acesso_convites set status=case when p_sucesso then 'enviado' else 'erro' end,
    tentativas=tentativas+1,ultimo_envio_em=case when p_sucesso then now() else ultimo_envio_em end,
    erro_codigo=case when p_sucesso then null else left(coalesce(p_erro_codigo,'envio_falhou'),80) end,updated_at=now() where id=v.id;
  return jsonb_build_object('id',v.id,'status',case when p_sucesso then 'enviado' else 'erro' end,'tentativas',v.tentativas+1);
end $$;

create or replace function public.equipe_acesso_aplicar(
  p_solicitante_id uuid,p_convite_id uuid,p_auth_user_id uuid,p_auth_email text,p_confirmado boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype; m public.equipe_membros%rowtype; u public.usuarios%rowtype; v_item jsonb; v_clinica uuid; v_papel public.papel_usuario; v_uc public.usuarios_clinicas%rowtype; v_antes jsonb; v_acao public.acao_auditoria;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and solicitado_por=p_solicitante_id for update;
  if not found then raise exception 'Convite não encontrado.' using errcode='P0002'; end if;
  if v.status='aceito' then return jsonb_build_object('id',v.id,'status','aceito','membro_id',v.membro_id); end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then raise exception 'A confirmação não corresponde ao e-mail da solicitação.' using errcode='42501'; end if;
  select * into m from public.equipe_membros where id=v.membro_id and ativo for update;
  if not found then raise exception 'Membro não encontrado.' using errcode='P0002'; end if;
  perform public.equipe_acesso_validar_clinicas(p_solicitante_id,m.id,v.clinicas_papeis);
  if m.usuario_id is not null and m.usuario_id<>p_auth_user_id then raise exception 'Este membro já está vinculado a outra conta.' using errcode='23505'; end if;
  if exists(select 1 from public.equipe_membros other where other.usuario_id=p_auth_user_id and other.id<>m.id) then raise exception 'A conta já está vinculada a outro membro.' using errcode='23505'; end if;
  insert into public.usuarios(id,nome_completo) values(p_auth_user_id,m.nome_completo) on conflict(id) do nothing;
  select * into u from public.usuarios where id=p_auth_user_id for update;
  if not u.ativo then raise exception 'A conta está inativa; não é possível conceder acesso.' using errcode='42501'; end if;
  if m.usuario_id is null then update public.equipe_membros set usuario_id=p_auth_user_id,updated_at=now() where id=m.id; end if;
  -- Convite enviado não concede acesso ainda. A conta/Auth e a associação
  -- com a pessoa podem ser reservadas, mas o vínculo por clínica só nasce
  -- depois do aceite confirmado pelo titular.
  if p_confirmado then
    for v_item in select value from jsonb_array_elements(v.clinicas_papeis) loop
      v_clinica:=(v_item->>'clinica_id')::uuid; v_papel:=(v_item->>'papel')::public.papel_usuario;
      select * into v_uc from public.usuarios_clinicas where usuario_id=p_auth_user_id and clinica_id=v_clinica for update;
      if found then
        if not v_uc.ativo then raise exception 'Já existe um acesso suspenso nesta clínica; use Reativar acesso.' using errcode='22023'; end if;
        if v_uc.papel is distinct from v_papel then
          if v_uc.papel='proprietaria' and v_papel<>'proprietaria' then
            perform 1 from public.usuarios_clinicas where clinica_id=v_clinica and ativo order by usuario_id for update;
            if (select count(*) from public.usuarios_clinicas where clinica_id=v_clinica and ativo and papel='proprietaria')<=1 then raise exception 'A última administradora ativa não pode perder o papel.' using errcode='42501'; end if;
          end if;
          update public.usuarios_clinicas set papel=v_papel where usuario_id=p_auth_user_id and clinica_id=v_clinica;
          insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(v_clinica,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','alterar_papel','usuario_id',p_auth_user_id,'papel',v_papel,'ativo',true));
        end if;
      else
        insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo) values(p_auth_user_id,v_clinica,v_papel,true);
        insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(v_clinica,p_solicitante_id,'INSERT'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','conceder','usuario_id',p_auth_user_id,'papel',v_papel,'ativo',true));
      end if;
    end loop;
  end if;
  update public.equipe_acesso_convites set auth_user_id=p_auth_user_id,status=case when p_confirmado then 'aceito' else 'enviado' end,aceito_em=case when p_confirmado then now() else null end,updated_at=now() where id=v.id;
  return jsonb_build_object('id',v.id,'status',case when p_confirmado then 'aceito' else 'enviado' end,'membro_id',m.id,'usuario_id',p_auth_user_id);
end $$;

create or replace function public.equipe_acesso_confirmar_titular(p_convite_id uuid,p_auth_user_id uuid,p_auth_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id and modo='vinculo' for update;
  if not found then raise exception 'Solicitação de vínculo não encontrada.' using errcode='P0002'; end if;
  if v.auth_user_id is not null and v.auth_user_id<>p_auth_user_id then raise exception 'Esta solicitação foi vinculada a outra conta.' using errcode='42501'; end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then raise exception 'O e-mail da sessão não corresponde à solicitação.' using errcode='42501'; end if;
  if not public.equipe_acesso_eh_proprietaria(v.solicitado_por,(v.clinicas_papeis->0->>'clinica_id')::uuid) then raise exception 'A autorização da administração expirou.' using errcode='42501'; end if;
  return public.equipe_acesso_aplicar(v.solicitado_por,v.id,p_auth_user_id,p_auth_email,true);
end $$;

-- Aceite feito pelo próprio titular depois do redirecionamento do Auth. O
-- UUID do convite não concede acesso sozinho: o e-mail confirmado na sessão
-- precisa corresponder ao e-mail solicitado e a aplicação continua validando
-- todos os vínculos e papéis dentro de uma única transação.
create or replace function public.equipe_acesso_aceitar(
  p_convite_id uuid,p_auth_user_id uuid,p_auth_email text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_acesso_convites%rowtype;
begin
  select * into v from public.equipe_acesso_convites where id=p_convite_id for update;
  if not found then raise exception 'Solicitação de acesso não encontrada.' using errcode='P0002'; end if;
  if v.status not in ('pendente','enviado') then raise exception 'Esta solicitação de acesso já foi encerrada.' using errcode='22023'; end if;
  if lower(btrim(coalesce(p_auth_email,'')))<>v.email then
    raise exception 'O e-mail da sessão não corresponde à solicitação.' using errcode='42501';
  end if;
  if v.modo='vinculo' and not public.equipe_acesso_eh_proprietaria(v.solicitado_por,(v.clinicas_papeis->0->>'clinica_id')::uuid) then
    raise exception 'A autorização da administração expirou.' using errcode='42501';
  end if;
  return public.equipe_acesso_aplicar(v.solicitado_por,v.id,p_auth_user_id,p_auth_email,true);
end $$;

create or replace function public.equipe_acesso_alterar(
  p_solicitante_id uuid,p_membro_id uuid,p_clinica_contexto_id uuid,p_clinica_alvo_id uuid,p_acao text,p_papel text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.equipe_membros%rowtype; uc public.usuarios_clinicas%rowtype; v_novo public.papel_usuario; v_ativos integer; v_proprietarias integer; v_antes jsonb;
begin
  if not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_contexto_id) or not public.equipe_acesso_eh_proprietaria(p_solicitante_id,p_clinica_alvo_id) then raise exception 'Acesso negado para esta clínica.' using errcode='42501'; end if;
  select * into m from public.equipe_membros where id=p_membro_id and ativo for update;
  if not found or not exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=p_membro_id and ec.clinica_id=p_clinica_alvo_id and ec.ativo) then raise exception 'Membro não encontrado nesta clínica.' using errcode='P0002'; end if;
  if m.usuario_id is null then raise exception 'Este membro ainda não possui conta vinculada.' using errcode='22023'; end if;
  if p_acao in ('papel','conceder') then
    if p_papel not in ('proprietaria','medico','recepcao') then raise exception 'Papel não permitido.' using errcode='22023'; end if;
    v_novo:=p_papel::public.papel_usuario;
  end if;
  perform 1 from public.usuarios_clinicas where clinica_id=p_clinica_alvo_id and ativo order by usuario_id for update;
  select * into uc from public.usuarios_clinicas where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id for update;
  if p_acao='conceder' then
    if found then raise exception 'O acesso já existe; use Reativar ou alterar papel.' using errcode='23505'; end if;
    if p_papel is null or p_papel not in ('proprietaria','medico','recepcao') then raise exception 'Informe um papel válido.' using errcode='22023'; end if;
    insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo) values(m.usuario_id,p_clinica_alvo_id,v_novo,true);
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'INSERT'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','conceder','usuario_id',m.usuario_id,'papel',v_novo,'ativo',true));
  elsif p_acao='reativar' then
    if not found then raise exception 'Não há acesso suspenso nesta clínica.' using errcode='P0002'; end if;
    if uc.ativo then return jsonb_build_object('status','acesso_ativo','clinica_id',p_clinica_alvo_id); end if;
    if not exists(select 1 from public.usuarios where id=m.usuario_id and ativo) then raise exception 'A conta global está inativa.' using errcode='42501'; end if;
    update public.usuarios_clinicas set ativo=true where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id;
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','reativar','usuario_id',m.usuario_id,'papel',uc.papel,'ativo',true));
  elsif p_acao='suspender' then
    if not found or not uc.ativo then return jsonb_build_object('status','acesso_suspenso','clinica_id',p_clinica_alvo_id); end if;
    if m.usuario_id=p_solicitante_id then raise exception 'Você não pode suspender o próprio acesso.' using errcode='42501'; end if;
    if uc.papel='proprietaria' then
      select count(*) into v_proprietarias from public.usuarios_clinicas where clinica_id=p_clinica_alvo_id and ativo and papel='proprietaria';
      if v_proprietarias<=1 then raise exception 'A última administradora ativa não pode ser suspensa.' using errcode='42501'; end if;
    end if;
    update public.usuarios_clinicas set ativo=false where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id;
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','suspender','usuario_id',m.usuario_id,'papel',uc.papel,'ativo',false));
  elsif p_acao='papel' then
    if not found then raise exception 'Não há vínculo de acesso nesta clínica.' using errcode='P0002'; end if;
    if not uc.ativo then raise exception 'O acesso está suspenso; reative-o antes de alterar o papel.' using errcode='22023'; end if;
    if uc.papel is distinct from v_novo and uc.papel='proprietaria' then
      select count(*) into v_proprietarias from public.usuarios_clinicas where clinica_id=p_clinica_alvo_id and ativo and papel='proprietaria';
      if v_proprietarias<=1 then raise exception 'A última administradora ativa não pode perder o papel.' using errcode='42501'; end if;
    end if;
    if uc.papel is distinct from v_novo and m.usuario_id=p_solicitante_id and v_novo<>'proprietaria' then raise exception 'Você não pode remover o próprio papel de administradora.' using errcode='42501'; end if;
    update public.usuarios_clinicas set papel=v_novo where usuario_id=m.usuario_id and clinica_id=p_clinica_alvo_id;
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois) values(p_clinica_alvo_id,p_solicitante_id,'UPDATE'::public.acao_auditoria,'equipe_acesso',m.id::text,jsonb_build_object('operacao','alterar_papel','usuario_id',m.usuario_id,'papel',v_novo,'ativo',true));
  else raise exception 'Operação de acesso inválida.' using errcode='22023';
  end if;
  return jsonb_build_object('status',case when p_acao='suspender' then 'acesso_suspenso' when p_acao='reativar' then 'acesso_ativo' else 'acesso_ativo' end,'clinica_id',p_clinica_alvo_id,'papel',coalesce(v_novo,uc.papel));
end $$;

revoke all on function public.equipe_acesso_eh_proprietaria(uuid,uuid),public.equipe_acesso_validar_clinicas(uuid,uuid,jsonb),public.equipe_acesso_listar(uuid,uuid,uuid),public.equipe_acesso_preparar(uuid,uuid,uuid,text,text,jsonb,uuid),public.equipe_acesso_convite_detalhar(uuid,uuid,uuid),public.equipe_acesso_registrar_envio(uuid,uuid,boolean,text),public.equipe_acesso_aplicar(uuid,uuid,uuid,text,boolean),public.equipe_acesso_confirmar_titular(uuid,uuid,text),public.equipe_acesso_aceitar(uuid,uuid,text),public.equipe_acesso_alterar(uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.equipe_acesso_listar(uuid,uuid,uuid),public.equipe_acesso_preparar(uuid,uuid,uuid,text,text,jsonb,uuid),public.equipe_acesso_convite_detalhar(uuid,uuid,uuid),public.equipe_acesso_registrar_envio(uuid,uuid,boolean,text),public.equipe_acesso_aplicar(uuid,uuid,uuid,text,boolean),public.equipe_acesso_confirmar_titular(uuid,uuid,text),public.equipe_acesso_aceitar(uuid,uuid,text),public.equipe_acesso_alterar(uuid,uuid,uuid,uuid,text,text) to service_role;

commit;
