-- FASE 7: fundacao e workflow fiscal interno, sem provedor externo.
-- Migration criada para revisao; NAO aplicada.
-- Nao cria endpoint externo, segredo, certificado, webhook ou Edge Function.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- A tabela nasceu na FASE 3 e e adaptada sem recriacao. O DDL ocorre dentro
-- desta transacao, com lock da tabela, para que a constraint antiga nao fique
-- observavel separadamente da nova constraint.
alter table public.documentos_fiscais
  drop constraint if exists documentos_fiscais_status_check;

alter table public.documentos_fiscais
  add column if not exists solicitado_em timestamptz,
  add column if not exists solicitado_por uuid references public.usuarios(id) on delete restrict,
  add column if not exists emitido_em timestamptz,
  add column if not exists cancelamento_solicitado_em timestamptz,
  add column if not exists cancelamento_solicitado_por uuid references public.usuarios(id) on delete restrict,
  add column if not exists cancelado_em timestamptz,
  add column if not exists numero_documento text,
  add column if not exists serie text,
  add column if not exists codigo_verificacao text,
  add column if not exists chave_externa text,
  add column if not exists url_documento text,
  add column if not exists mensagem_erro text,
  add column if not exists motivo_cancelamento text,
  add column if not exists provider text,
  add column if not exists metadata_provider jsonb not null default '{}'::jsonb,
  add column if not exists emissao_idempotency_key text,
  add column if not exists cancelamento_idempotency_key text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.documentos_fiscais
  add constraint documentos_fiscais_status_check check (
    status in (
      'pendente', 'emissao_solicitada', 'emitida', 'erro_emissao',
      'cancelamento_solicitado', 'cancelada', 'erro_cancelamento'
    )
  ),
  add constraint documentos_fiscais_metadata_object_check check (
    jsonb_typeof(metadata_provider) = 'object'
  ),
  add constraint documentos_fiscais_id_clinica_unique unique (id, clinica_id);

create unique index documentos_fiscais_emissao_idempotency_unique
  on public.documentos_fiscais(emissao_idempotency_key)
  where emissao_idempotency_key is not null;

create unique index documentos_fiscais_cancelamento_idempotency_unique
  on public.documentos_fiscais(cancelamento_idempotency_key)
  where cancelamento_idempotency_key is not null;

create index documentos_fiscais_fila_idx
  on public.documentos_fiscais(clinica_id, status, updated_at desc, id);

create index documentos_fiscais_recebimento_idx
  on public.documentos_fiscais(recebimento_id);

revoke all privileges on table public.documentos_fiscais
from public, anon, authenticated;
grant select on table public.documentos_fiscais to authenticated;

create table public.tentativas_documento_fiscal (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  documento_fiscal_id uuid not null,
  tipo text not null check (tipo in ('emissao', 'cancelamento')),
  status text not null default 'solicitada'
    check (status in ('solicitada', 'processando', 'sucesso', 'erro')),
  provider text,
  identificador_externo text,
  numero_documento text,
  serie text,
  codigo_verificacao text,
  chave_externa text,
  url_documento text,
  metadata_provider jsonb not null default '{}'::jsonb,
  mensagem_erro text,
  resposta_resumida jsonb not null default '{}'::jsonb,
  idempotency_key text not null
    check (idempotency_key = btrim(idempotency_key)
      and char_length(idempotency_key) between 1 and 200),
  solicitado_por uuid references public.usuarios(id) on delete restrict,
  iniciado_em timestamptz,
  finalizado_em timestamptz,
  created_at timestamptz not null default now(),
  constraint tentativas_documento_fiscal_documento_clinica_fk
    foreign key (documento_fiscal_id, clinica_id)
    references public.documentos_fiscais(id, clinica_id) on delete restrict,
  constraint tentativas_documento_fiscal_resposta_object_check check (
    jsonb_typeof(resposta_resumida) = 'object'
  ),
  constraint tentativas_documento_fiscal_metadata_object_check check (
    jsonb_typeof(metadata_provider) = 'object'
  ),
  constraint tentativas_documento_fiscal_idempotency_unique
    unique (idempotency_key)
);

create index tentativas_documento_fiscal_documento_idx
  on public.tentativas_documento_fiscal(documento_fiscal_id, tipo, created_at desc);

create index tentativas_documento_fiscal_fila_idx
  on public.tentativas_documento_fiscal(clinica_id, tipo, status, created_at desc);

-- Uma unica tentativa em andamento por documento e tipo. Retries somente
-- podem nascer depois que a tentativa anterior terminou.
create unique index tentativas_documento_fiscal_ativa_unique
  on public.tentativas_documento_fiscal(documento_fiscal_id, tipo)
  where status in ('solicitada', 'processando');

alter table public.tentativas_documento_fiscal enable row level security;

revoke all privileges on table public.tentativas_documento_fiscal
from public, anon, authenticated;
grant select on table public.tentativas_documento_fiscal to authenticated;

create policy tentativas_documento_fiscal_select_clinica
on public.tentativas_documento_fiscal for select to authenticated using (
  private.financeiro_tem_papel_clinica(
    clinica_id,
    array['proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario]
  )
);

-- O documento e as tentativas sao historicos: nenhuma exclusao e permitida.
create trigger documentos_fiscais_bloquear_delete
before delete on public.documentos_fiscais
for each row execute function private.financeiro_bloquear_exclusao_historico();

create trigger tentativas_documento_fiscal_bloquear_delete
before delete on public.tentativas_documento_fiscal
for each row execute function private.financeiro_bloquear_exclusao_historico();

create function private.financeiro_proteger_documento_fiscal()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  if coalesce(current_setting('financeiro.internal_write', true), '') <> '1' then
    raise exception using errcode='42501',
      message='Documento fiscal so pode ser alterado por rotina financeira interna.';
  end if;
  if new.id <> old.id or new.clinica_id <> old.clinica_id
    or new.recebimento_id <> old.recebimento_id
    or new.criado_por <> old.criado_por or new.created_at <> old.created_at then
    raise exception using errcode='42501',
      message='Vinculo historico do documento fiscal nao pode ser alterado.';
  end if;
  if new.status not in ('pendente','emissao_solicitada','emitida','erro_emissao',
      'cancelamento_solicitado','cancelada','erro_cancelamento') then
    raise exception using errcode='22023', message='Estado fiscal invalido.';
  end if;
  if old.status = 'pendente' and new.status not in ('emissao_solicitada') then
    raise exception using errcode='22023', message='Transicao fiscal invalida.';
  elsif old.status = 'emissao_solicitada' and new.status not in ('emitida','erro_emissao') then
    raise exception using errcode='22023', message='Transicao fiscal invalida.';
  elsif old.status = 'erro_emissao' and new.status <> 'emissao_solicitada' then
    raise exception using errcode='22023', message='Transicao fiscal invalida.';
  elsif old.status = 'emitida' and new.status <> 'cancelamento_solicitado' then
    raise exception using errcode='22023', message='Transicao fiscal invalida.';
  elsif old.status = 'cancelamento_solicitado' and new.status not in ('cancelada','erro_cancelamento') then
    raise exception using errcode='22023', message='Transicao fiscal invalida.';
  elsif old.status = 'erro_cancelamento' and new.status <> 'cancelamento_solicitado' then
    raise exception using errcode='22023', message='Transicao fiscal invalida.';
  elsif old.status in ('cancelada') then
    raise exception using errcode='42501', message='Documento fiscal cancelado e imutavel.';
  end if;
  return new;
end;
$$;

create function private.financeiro_validar_contexto_documento_fiscal()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare v_clinica_id uuid;
begin
  select r.clinica_id into v_clinica_id
  from public.recebimentos r where r.id = new.recebimento_id;
  if v_clinica_id is null or v_clinica_id <> new.clinica_id then
    raise exception using errcode='23514',
      message='Documento fiscal nao pertence a clinica do recebimento.';
  end if;
  return new;
end;
$$;

create function private.financeiro_proteger_tentativa_documento_fiscal()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  if coalesce(current_setting('financeiro.internal_write', true), '') <> '1' then
    raise exception using errcode='42501',
      message='Tentativa fiscal so pode ser alterada por rotina interna.';
  end if;
  if new.id <> old.id or new.clinica_id <> old.clinica_id
    or new.documento_fiscal_id <> old.documento_fiscal_id
    or new.tipo <> old.tipo or new.idempotency_key <> old.idempotency_key
    or new.created_at <> old.created_at or new.solicitado_por is distinct from old.solicitado_por then
    raise exception using errcode='42501', message='Historico da tentativa fiscal nao pode ser alterado.';
  end if;
  return new;
end;
$$;

create trigger documentos_fiscais_proteger_update
before update on public.documentos_fiscais
for each row execute function private.financeiro_proteger_documento_fiscal();

create trigger documentos_fiscais_validar_contexto
before insert or update on public.documentos_fiscais
for each row execute function private.financeiro_validar_contexto_documento_fiscal();

create trigger tentativas_documento_fiscal_proteger_update
before update on public.tentativas_documento_fiscal
for each row execute function private.financeiro_proteger_tentativa_documento_fiscal();

revoke all privileges on function private.financeiro_proteger_documento_fiscal(),
  private.financeiro_validar_contexto_documento_fiscal(),
  private.financeiro_proteger_tentativa_documento_fiscal()
from public, anon, authenticated;

create function public.financeiro_solicitar_emissao_fiscal(
  p_documento_fiscal_id uuid, p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_chave text := btrim(coalesce(p_idempotency_key, ''));
  v_doc public.documentos_fiscais%rowtype;
  v_tentativa public.tentativas_documento_fiscal%rowtype;
  v_papel public.papel_usuario;
begin
  if v_usuario_id is null then raise exception using errcode='28000', message='Usuario nao autenticado.'; end if;
  if v_chave = '' or char_length(v_chave) > 200 then raise exception using errcode='22023', message='Chave de idempotencia invalida.'; end if;
  select d.* into v_doc from public.documentos_fiscais d where d.id=p_documento_fiscal_id for update;
  if not found then raise exception using errcode='P0002', message='Documento fiscal inexistente.'; end if;
  if not private.financeiro_tem_papel_clinica(v_doc.clinica_id,
      array['proprietaria'::public.papel_usuario,'recepcao'::public.papel_usuario]) then
    raise exception using errcode='42501', message='Usuario sem autorizacao fiscal na clinica.';
  end if;
  select case when private.financeiro_tem_papel_clinica(v_doc.clinica_id,array['proprietaria'::public.papel_usuario])
    then 'proprietaria'::public.papel_usuario else 'recepcao'::public.papel_usuario end into v_papel;
  select t.* into v_tentativa from public.tentativas_documento_fiscal t
    where t.idempotency_key=v_chave for update;
  if found then
    if v_tentativa.documento_fiscal_id<>v_doc.id or v_tentativa.tipo<>'emissao' then
      raise exception using errcode='23505', message='Chave de idempotencia ja utilizada em outra operacao.';
    end if;
    return jsonb_build_object('documento_fiscal_id',v_doc.id,'tentativa_id',v_tentativa.id,
      'status',v_doc.status,'nova_operacao',false);
  end if;
  if v_doc.status<>'pendente' and v_doc.status<>'erro_emissao' then
    raise exception using errcode='22023', message='Documento fiscal nao esta disponivel para emissao.';
  end if;
  perform pg_catalog.set_config('financeiro.internal_write','1',true);
  update public.documentos_fiscais set status='emissao_solicitada', solicitado_em=now(),
    solicitado_por=v_usuario_id, emissao_idempotency_key=v_chave, mensagem_erro=null, updated_at=now()
    where id=v_doc.id;
  insert into public.tentativas_documento_fiscal(
    clinica_id,documento_fiscal_id,tipo,status,idempotency_key,solicitado_por)
  values(v_doc.clinica_id,v_doc.id,'emissao','solicitada',v_chave,v_usuario_id)
  returning * into v_tentativa;
  insert into public.eventos_auditoria_financeira(
    clinica_id,usuario_id,papel,acao,entidade,entidade_id,estado_anterior,estado_novo,dados,motivo)
  values(v_doc.clinica_id,v_usuario_id,v_papel,'solicitar_emissao_fiscal','documento_fiscal',v_doc.id,
    jsonb_build_object('status',v_doc.status),jsonb_build_object('status','emissao_solicitada'),
    jsonb_build_object('recebimento_id',v_doc.recebimento_id,'tentativa_id',v_tentativa.id),null);
  return jsonb_build_object('documento_fiscal_id',v_doc.id,'tentativa_id',v_tentativa.id,
    'status','emissao_solicitada','nova_operacao',true);
end;
$$;

create function public.financeiro_solicitar_cancelamento_fiscal(
  p_documento_fiscal_id uuid, p_motivo text, p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_motivo text := nullif(btrim(coalesce(p_motivo,'')), '');
  v_chave text := btrim(coalesce(p_idempotency_key, ''));
  v_doc public.documentos_fiscais%rowtype;
  v_tentativa public.tentativas_documento_fiscal%rowtype;
  v_papel public.papel_usuario;
begin
  if v_usuario_id is null then raise exception using errcode='28000', message='Usuario nao autenticado.'; end if;
  if v_motivo is null or char_length(v_motivo)>1000 then raise exception using errcode='22023', message='Motivo de cancelamento obrigatorio.'; end if;
  if v_chave='' or char_length(v_chave)>200 then raise exception using errcode='22023', message='Chave de idempotencia invalida.'; end if;
  select d.* into v_doc from public.documentos_fiscais d where d.id=p_documento_fiscal_id for update;
  if not found then raise exception using errcode='P0002', message='Documento fiscal inexistente.'; end if;
  if not private.financeiro_tem_papel_clinica(v_doc.clinica_id,
      array['proprietaria'::public.papel_usuario,'recepcao'::public.papel_usuario]) then
    raise exception using errcode='42501', message='Usuario sem autorizacao fiscal na clinica.';
  end if;
  select case when private.financeiro_tem_papel_clinica(v_doc.clinica_id,array['proprietaria'::public.papel_usuario])
    then 'proprietaria'::public.papel_usuario else 'recepcao'::public.papel_usuario end into v_papel;
  select t.* into v_tentativa from public.tentativas_documento_fiscal t
    where t.idempotency_key=v_chave for update;
  if found then
    if v_tentativa.documento_fiscal_id<>v_doc.id or v_tentativa.tipo<>'cancelamento' then
      raise exception using errcode='23505', message='Chave de idempotencia ja utilizada em outra operacao.';
    end if;
    return jsonb_build_object('documento_fiscal_id',v_doc.id,'tentativa_id',v_tentativa.id,
      'status',v_doc.status,'nova_operacao',false);
  end if;
  if v_doc.status<>'emitida' and v_doc.status<>'erro_cancelamento' then
    raise exception using errcode='22023', message='Somente documento emitido pode ser cancelado.';
  end if;
  perform pg_catalog.set_config('financeiro.internal_write','1',true);
  update public.documentos_fiscais set status='cancelamento_solicitado',
    cancelamento_solicitado_em=now(), cancelamento_solicitado_por=v_usuario_id,
    cancelamento_idempotency_key=v_chave, motivo_cancelamento=v_motivo,
    mensagem_erro=null, updated_at=now() where id=v_doc.id;
  insert into public.tentativas_documento_fiscal(
    clinica_id,documento_fiscal_id,tipo,status,idempotency_key,solicitado_por)
  values(v_doc.clinica_id,v_doc.id,'cancelamento','solicitada',v_chave,v_usuario_id)
  returning * into v_tentativa;
  insert into public.eventos_auditoria_financeira(
    clinica_id,usuario_id,papel,acao,entidade,entidade_id,estado_anterior,estado_novo,dados,motivo)
  values(v_doc.clinica_id,v_usuario_id,v_papel,'solicitar_cancelamento_fiscal','documento_fiscal',v_doc.id,
    jsonb_build_object('status',v_doc.status),jsonb_build_object('status','cancelamento_solicitado'),
    jsonb_build_object('recebimento_id',v_doc.recebimento_id,'tentativa_id',v_tentativa.id),v_motivo);
  return jsonb_build_object('documento_fiscal_id',v_doc.id,'tentativa_id',v_tentativa.id,
    'status','cancelamento_solicitado','nova_operacao',true);
end;
$$;

revoke all privileges on function public.financeiro_solicitar_emissao_fiscal(uuid,text),
  public.financeiro_solicitar_cancelamento_fiscal(uuid,text,text) from public, anon;
grant execute on function public.financeiro_solicitar_emissao_fiscal(uuid,text),
  public.financeiro_solicitar_cancelamento_fiscal(uuid,text,text) to authenticated;

-- Funcoes privadas de resultado: nenhum papel da API pode chama-las. A
-- tentativa e obrigatoria para impedir callback stale por simples documento.
create function private.financeiro_registrar_resultado_emissao_fiscal(
  p_documento_fiscal_id uuid, p_tentativa_documento_fiscal_id uuid,
  p_sucesso boolean, p_provider text default null,
  p_numero_documento text default null, p_serie text default null,
  p_codigo_verificacao text default null, p_chave_externa text default null,
  p_url_documento text default null, p_identificador_externo text default null,
  p_mensagem_erro text default null, p_metadata_provider jsonb default '{}'::jsonb,
  p_resposta_resumida jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_doc public.documentos_fiscais%rowtype;
  v_tentativa public.tentativas_documento_fiscal%rowtype;
  v_provider text := nullif(btrim(coalesce(p_provider,'')), '');
  v_numero_documento text := nullif(btrim(coalesce(p_numero_documento,'')), '');
  v_serie text := nullif(btrim(coalesce(p_serie,'')), '');
  v_codigo_verificacao text := nullif(btrim(coalesce(p_codigo_verificacao,'')), '');
  v_chave_externa text := nullif(btrim(coalesce(p_chave_externa,'')), '');
  v_url_documento text := nullif(btrim(coalesce(p_url_documento,'')), '');
  v_identificador_externo text := nullif(btrim(coalesce(p_identificador_externo,'')), '');
  v_mensagem text := nullif(btrim(coalesce(p_mensagem_erro,'')), '');
  v_metadata jsonb := coalesce(p_metadata_provider, '{}'::jsonb);
  v_resposta jsonb := coalesce(p_resposta_resumida, '{}'::jsonb);
begin
  if p_sucesso is null then
    raise exception using errcode='22023', message='Resultado fiscal deve informar sucesso ou erro.';
  end if;
  if pg_catalog.jsonb_typeof(v_metadata) <> 'object'
    or pg_catalog.jsonb_typeof(v_resposta) <> 'object' then
    raise exception using errcode='22023', message='Resultado fiscal deve conter JSONs objeto.';
  end if;
  if p_sucesso and v_provider is null then
    raise exception using errcode='22023', message='Provider obrigatorio para emissao concluida.';
  end if;
  select d.* into v_doc from public.documentos_fiscais d where d.id=p_documento_fiscal_id for update;
  if not found then raise exception using errcode='P0002', message='Documento fiscal inexistente.'; end if;
  select t.* into v_tentativa
  from public.tentativas_documento_fiscal t
  where t.id=p_tentativa_documento_fiscal_id
    and t.documento_fiscal_id=v_doc.id
    and t.clinica_id=v_doc.clinica_id
    and t.tipo='emissao'
  for update;
  if not found then
    raise exception using errcode='P0002', message='Tentativa de emissao inexistente.';
  end if;
  if v_tentativa.status in ('sucesso','erro') then
    if (v_tentativa.status='sucesso') is distinct from p_sucesso
      or v_tentativa.provider is distinct from v_provider
      or v_tentativa.identificador_externo is distinct from v_identificador_externo
      or v_tentativa.numero_documento is distinct from v_numero_documento
      or v_tentativa.serie is distinct from v_serie
      or v_tentativa.codigo_verificacao is distinct from v_codigo_verificacao
      or v_tentativa.chave_externa is distinct from v_chave_externa
      or v_tentativa.url_documento is distinct from v_url_documento
      or v_tentativa.metadata_provider is distinct from v_metadata
      or v_tentativa.mensagem_erro is distinct from v_mensagem
      or v_tentativa.resposta_resumida is distinct from v_resposta then
      raise exception using errcode='40001', message='Resultado conflitante ou obsoleto para tentativa fiscal finalizada.';
    end if;
    return jsonb_build_object('documento_fiscal_id',v_doc.id,'tentativa_id',v_tentativa.id,
      'status',v_doc.status,'nova_operacao',false);
  end if;
  if v_tentativa.status not in ('solicitada','processando')
    or v_doc.status<>'emissao_solicitada' then
    raise exception using errcode='40001', message='Resposta de emissao obsoleta ou fora do estado da tentativa ativa.';
  end if;
  perform pg_catalog.set_config('financeiro.internal_write','1',true);
  update public.tentativas_documento_fiscal set status=case when p_sucesso then 'sucesso' else 'erro' end,
    provider=v_provider, identificador_externo=v_identificador_externo,
    numero_documento=v_numero_documento, serie=v_serie,
    codigo_verificacao=v_codigo_verificacao, chave_externa=v_chave_externa,
    url_documento=v_url_documento, metadata_provider=v_metadata,
    mensagem_erro=v_mensagem, resposta_resumida=v_resposta,
    iniciado_em=coalesce(iniciado_em,now()), finalizado_em=now() where id=v_tentativa.id;
  if p_sucesso then
    update public.documentos_fiscais set status='emitida',emitido_em=now(),provider=v_provider,
      numero_documento=v_numero_documento,serie=v_serie,
      codigo_verificacao=v_codigo_verificacao,chave_externa=v_chave_externa,
      url_documento=v_url_documento,metadata_provider=v_metadata,
      mensagem_erro=null,updated_at=now() where id=v_doc.id;
  else
    update public.documentos_fiscais set status='erro_emissao',mensagem_erro=coalesce(v_mensagem,'Falha de emissao fiscal.'),
      metadata_provider=v_metadata,updated_at=now() where id=v_doc.id;
  end if;
  insert into public.eventos_auditoria_financeira(
    clinica_id,usuario_id,papel,acao,entidade,entidade_id,estado_anterior,estado_novo,dados,motivo)
  values(v_doc.clinica_id,v_doc.solicitado_por,'proprietaria',case when p_sucesso then 'emitir_documento_fiscal' else 'erro_emissao_fiscal' end,
    'documento_fiscal',v_doc.id,jsonb_build_object('status',v_doc.status),
    jsonb_build_object('status',case when p_sucesso then 'emitida' else 'erro_emissao' end),
    jsonb_build_object('recebimento_id',v_doc.recebimento_id,'tentativa_id',v_tentativa.id,'provider',v_provider),v_mensagem);
  return jsonb_build_object('documento_fiscal_id',v_doc.id,'tentativa_id',v_tentativa.id,
    'status',case when p_sucesso then 'emitida' else 'erro_emissao' end,'nova_operacao',true);
end;
$$;

create function private.financeiro_registrar_resultado_cancelamento_fiscal(
  p_documento_fiscal_id uuid, p_tentativa_documento_fiscal_id uuid,
  p_sucesso boolean, p_provider text default null,
  p_identificador_externo text default null, p_mensagem_erro text default null,
  p_metadata_provider jsonb default '{}'::jsonb, p_resposta_resumida jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_doc public.documentos_fiscais%rowtype;
  v_tentativa public.tentativas_documento_fiscal%rowtype;
  v_provider text := nullif(btrim(coalesce(p_provider,'')), '');
  v_identificador_externo text := nullif(btrim(coalesce(p_identificador_externo,'')), '');
  v_mensagem text := nullif(btrim(coalesce(p_mensagem_erro,'')), '');
  v_metadata jsonb := coalesce(p_metadata_provider, '{}'::jsonb);
  v_resposta jsonb := coalesce(p_resposta_resumida, '{}'::jsonb);
begin
  if p_sucesso is null then
    raise exception using errcode='22023', message='Resultado fiscal deve informar sucesso ou erro.';
  end if;
  if pg_catalog.jsonb_typeof(v_metadata) <> 'object'
    or pg_catalog.jsonb_typeof(v_resposta) <> 'object' then
    raise exception using errcode='22023', message='Resultado fiscal deve conter JSONs objeto.';
  end if;
  select d.* into v_doc from public.documentos_fiscais d where d.id=p_documento_fiscal_id for update;
  if not found then raise exception using errcode='P0002', message='Documento fiscal inexistente.'; end if;
  select t.* into v_tentativa
  from public.tentativas_documento_fiscal t
  where t.id=p_tentativa_documento_fiscal_id
    and t.documento_fiscal_id=v_doc.id
    and t.clinica_id=v_doc.clinica_id
    and t.tipo='cancelamento'
  for update;
  if not found then
    raise exception using errcode='P0002', message='Tentativa de cancelamento inexistente.'; end if;
  if v_tentativa.status in ('sucesso','erro') then
    if (v_tentativa.status='sucesso') is distinct from p_sucesso
      or v_tentativa.provider is distinct from v_provider
      or v_tentativa.identificador_externo is distinct from v_identificador_externo
      or v_tentativa.metadata_provider is distinct from v_metadata
      or v_tentativa.mensagem_erro is distinct from v_mensagem
      or v_tentativa.resposta_resumida is distinct from v_resposta then
      raise exception using errcode='40001', message='Resultado conflitante ou obsoleto para tentativa fiscal finalizada.';
    end if;
    return jsonb_build_object('documento_fiscal_id',v_doc.id,'tentativa_id',v_tentativa.id,
      'status',v_doc.status,'nova_operacao',false);
  end if;
  if v_tentativa.status not in ('solicitada','processando')
    or v_doc.status<>'cancelamento_solicitado' then
    raise exception using errcode='40001', message='Resposta de cancelamento obsoleta ou fora do estado da tentativa ativa.';
  end if;
  perform pg_catalog.set_config('financeiro.internal_write','1',true);
  update public.tentativas_documento_fiscal set status=case when p_sucesso then 'sucesso' else 'erro' end,
    provider=v_provider,identificador_externo=v_identificador_externo,metadata_provider=v_metadata,
    mensagem_erro=v_mensagem,resposta_resumida=v_resposta,
    iniciado_em=coalesce(iniciado_em,now()),finalizado_em=now()
    where id=v_tentativa.id;
  if p_sucesso then
    update public.documentos_fiscais set status='cancelada',cancelado_em=now(),provider=coalesce(v_provider,provider),
      metadata_provider=v_metadata,mensagem_erro=null,updated_at=now() where id=v_doc.id;
  else
    update public.documentos_fiscais set status='erro_cancelamento',mensagem_erro=coalesce(v_mensagem,'Falha de cancelamento fiscal.'),
      metadata_provider=v_metadata,updated_at=now() where id=v_doc.id;
  end if;
  insert into public.eventos_auditoria_financeira(
    clinica_id,usuario_id,papel,acao,entidade,entidade_id,estado_anterior,estado_novo,dados,motivo)
  values(v_doc.clinica_id,v_doc.cancelamento_solicitado_por,'proprietaria',case when p_sucesso then 'cancelar_documento_fiscal' else 'erro_cancelamento_fiscal' end,
    'documento_fiscal',v_doc.id,jsonb_build_object('status',v_doc.status),
    jsonb_build_object('status',case when p_sucesso then 'cancelada' else 'erro_cancelamento' end),
    jsonb_build_object('recebimento_id',v_doc.recebimento_id,'tentativa_id',v_tentativa.id,'provider',v_provider),v_mensagem);
  return jsonb_build_object('documento_fiscal_id',v_doc.id,'tentativa_id',v_tentativa.id,
    'status',case when p_sucesso then 'cancelada' else 'erro_cancelamento' end,'nova_operacao',true);
end;
$$;

revoke all privileges on function private.financeiro_registrar_resultado_emissao_fiscal(uuid,uuid,boolean,text,text,text,text,text,text,text,text,jsonb,jsonb),
  private.financeiro_registrar_resultado_cancelamento_fiscal(uuid,uuid,boolean,text,text,text,jsonb,jsonb)
from public, anon, authenticated;

commit;
