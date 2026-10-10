-- Conflito de negócio não é falha de serialização transitória.
-- Preserva corpos/permissões das seis funções32/33; só troca SQLSTATE40001 por PT409.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$ begin
if (select md5(prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='equipe_foto_confirmar') is distinct from '618e0401972a8f45a3291b5771d97849' then raise exception 'Fonte aplicada divergente: equipe_foto_confirmar';end if;
if (select md5(prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='equipe_recebimento_salvar') is distinct from '15ce35b2a74eed8fb7ee45275db361c8' then raise exception 'Fonte aplicada divergente: equipe_recebimento_salvar';end if;
if (select md5(prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='equipe_ficha_salvar') is distinct from '976b7a57410c7b902ec0f2e6c07ae7fa' then raise exception 'Fonte aplicada divergente: equipe_ficha_salvar';end if;
if (select md5(prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='equipe_documento_reservar') is distinct from '68f356a3740ffa67a750fbce5c0dd46a' then raise exception 'Fonte aplicada divergente: equipe_documento_reservar';end if;
if (select md5(prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='equipe_documento_confirmar') is distinct from 'c3c7a2f9af528f67cb8029913b44f224' then raise exception 'Fonte aplicada divergente: equipe_documento_confirmar';end if;
if (select md5(prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='equipe_documento_operar') is distinct from '4ca539fb23f18970c3405b5af0215e23' then raise exception 'Fonte aplicada divergente: equipe_documento_operar';end if;
end $$;
create or replace function public.equipe_foto_confirmar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_revisao integer,p_caminho text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_fotos%rowtype;v_anterior text;
begin
  if auth.role() is distinct from 'service_role' or not public.equipe_recurso_pode(p_membro_id,p_clinica_id,p_ator_id,true) then raise exception 'Acesso negado' using errcode='42501';end if;
  perform 1 from public.equipe_membros where id=p_membro_id for update;
  select * into v from public.equipe_fotos where membro_id=p_membro_id;
  if p_revisao is null or coalesce(v.revisao,0)<>p_revisao then raise exception 'Conflito de revisão' using errcode='PT409';end if;
  if p_caminho is not null and (p_caminho !~ ('^'||p_membro_id::text||'/[0-9a-f-]{36}\.jpg$')
    or not exists(select 1 from storage.objects o where o.bucket_id='equipe-fotos' and o.name=p_caminho
      and o.metadata->>'mimetype'='image/jpeg' and (o.metadata->>'size')::bigint between 1 and 5242880
      and o.created_at>clock_timestamp()-interval '15 minutes')) then
    raise exception 'Foto inválida' using errcode='22023';end if;
  v_anterior:=v.caminho;
  insert into public.equipe_fotos(membro_id,caminho,revisao,clinica_contexto_id,updated_by)
    values(p_membro_id,p_caminho,coalesce(v.revisao,0)+1,p_clinica_id,p_ator_id)
    on conflict(membro_id) do update set caminho=excluded.caminho,revisao=excluded.revisao,
      clinica_contexto_id=excluded.clinica_contexto_id,updated_by=excluded.updated_by,updated_at=now();
  return jsonb_build_object('membro_id',p_membro_id,'clinica_id',p_clinica_id,'caminho',p_caminho,'anterior',v_anterior,'revisao',coalesce(v.revisao,0)+1);
end $$;
create or replace function public.equipe_recebimento_salvar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_revisao integer,p_dados jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;v_prof uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Acesso negado' using errcode='42501';end if;
  v:=public.equipe_recebimento_interno(p_membro_id,p_clinica_id,p_ator_id);v_prof:=(v->>'profissional_id')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_prof::text||':'||p_clinica_id::text,0));
  v:=public.equipe_recebimento_interno(p_membro_id,p_clinica_id,p_ator_id);
  if p_revisao is null or (v->>'revisao')::integer<>p_revisao then raise exception 'Conflito de revisão' using errcode='PT409';end if;
  -- Complete format validation is in the only exposed writer (Edge); DB rejects malformed payloads as defense in depth.
  if p_dados is null or jsonb_typeof(p_dados)<>'object' or length(p_dados::text)>12000
    or coalesce(p_dados->>'preferencia','') not in ('pix','transferencia') or jsonb_typeof(p_dados->'favorecido') is distinct from 'object'
    or (p_dados->>'preferencia'='pix' and jsonb_typeof(p_dados->'pix') is distinct from 'object')
    or (p_dados->>'preferencia'='transferencia' and jsonb_typeof(p_dados->'conta') is distinct from 'object') then
    raise exception 'Dados inválidos' using errcode='22023';end if;
  if v->'dados' is distinct from p_dados then
    insert into public.profissionais_recebimento(profissional_id,clinica_id,dados_encrypted,revisao,updated_by)
      values(v_prof,p_clinica_id,public.equipe_recebimento_cifrar(p_dados),p_revisao+1,p_ator_id)
      on conflict(profissional_id,clinica_id) do update set dados_encrypted=excluded.dados_encrypted,
        revisao=excluded.revisao,updated_by=excluded.updated_by,updated_at=now();
  end if;
  v:=public.equipe_recebimento_interno(p_membro_id,p_clinica_id,p_ator_id);
  return jsonb_set(v,'{dados}',public.equipe_recebimento_mascarar(v->'dados'));
end $$;
create or replace function public.equipe_ficha_salvar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_id uuid,p_tipo text,p_unidades uuid[],p_referencia_id uuid,p_revisao integer,p_dados jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_registros%rowtype; v_unidades uuid[]; v_empresa public.equipe_registros%rowtype;v_campos text[];begin
 if auth.role() is distinct from 'service_role' or not public.equipe_recurso_pode(p_membro_id,p_clinica_id,p_ator_id,false)
 or p_tipo not in ('pessoal','contrato','formacao','empresa','checklist','ocupacional') or jsonb_typeof(p_dados)<>'object' or octet_length(p_dados::text)>65536
 then raise exception 'Acesso negado' using errcode='42501';end if;
 perform 1 from public.equipe_membros where id=p_membro_id for update;
 select array_agg(clinica_id order by clinica_id) into v_unidades from public.equipe_membros_clinicas where membro_id=p_membro_id and ativo;
 if p_tipo in ('pessoal','formacao') then p_unidades:=v_unidades;end if;
 if not p_clinica_id=any(p_unidades) or not public.equipe_ficha_escopo(p_unidades,p_ator_id,case when p_tipo='empresa' then null else p_membro_id end,p_tipo='ocupacional')
 or cardinality(p_unidades)<>(select count(distinct x) from unnest(p_unidades) x) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_tipo='formacao' and not exists(select 1 from public.equipe_membros where id=p_membro_id and tipo::text='profissional_saude') then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into v from public.equipe_registros where id=p_id for update;
 if v.id is not null and (v.tipo<>p_tipo or v.membro_id is distinct from case when p_tipo='empresa' then null else p_membro_id end
 or not public.equipe_ficha_escopo(v.unidades,p_ator_id,v.membro_id,v.tipo='ocupacional')) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_revisao is null or coalesce(v.revisao,0)<>p_revisao then raise exception 'Conflito' using errcode='PT409';end if;
 if v.id is not null and (v.unidades<>p_unidades or v.referencia_id is distinct from p_referencia_id) then raise exception 'Escopo é fixo; preserve o contrato original' using errcode='22023';end if;
 if p_tipo='contrato' then
  select * into v_empresa from public.equipe_registros where id=(p_dados->>'empresa_id')::uuid and tipo='empresa';
  if v_empresa.id is null or not p_unidades<@v_empresa.unidades or not public.equipe_ficha_escopo(v_empresa.unidades,p_ator_id) then raise exception 'Empresa não autorizada' using errcode='42501';end if;
  if exists(select 1 from jsonb_array_elements(p_dados->'jornada') j where not (j->>'unidade_id')::uuid=any(p_unidades)) then raise exception 'Jornada fora do contrato' using errcode='22023';end if;
 end if;
 if p_referencia_id is not null and not exists(select 1 from public.equipe_registros r where r.id=p_referencia_id and r.membro_id=p_membro_id and r.tipo='contrato' and p_unidades=r.unidades and public.equipe_ficha_escopo(r.unidades,p_ator_id,p_membro_id)) then raise exception 'Contrato não autorizado' using errcode='42501';end if;
 if p_tipo in ('checklist','ocupacional') and p_referencia_id is null then raise exception 'Selecione contrato' using errcode='22023';end if;
 select array_agg(key) into v_campos from jsonb_object_keys(p_dados) key where v.id is null or public.equipe_recebimento_decifrar(v.dados_encrypted)->key is distinct from p_dados->key;
 insert into public.equipe_registros(id,membro_id,tipo,unidades,referencia_id,dados_encrypted,revisao,atualizado_por)
 values(p_id,case when p_tipo='empresa' then null else p_membro_id end,p_tipo,p_unidades,p_referencia_id,public.equipe_recebimento_cifrar(p_dados),coalesce(v.revisao,0)+1,p_ator_id)
 on conflict(id) do update set dados_encrypted=excluded.dados_encrypted,revisao=excluded.revisao,atualizado_por=excluded.atualizado_por,atualizado_em=now();
 insert into public.equipe_registro_versoes(registro_id,revisao,unidades,dados_encrypted,ator_id)
 select id,revisao,unidades,dados_encrypted,p_ator_id from public.equipe_registros where id=p_id;
 perform public.equipe_ficha_evento(case when p_tipo='empresa' then null else p_membro_id end,p_id,p_unidades,p_tipo||'_salvo',coalesce(v.revisao,0)+1,p_ator_id,coalesce(v_campos,'{}'),p_tipo='ocupacional');
 select * into v from public.equipe_registros where id=p_id;return public.equipe_ficha_registro_json(v);
exception when unique_violation then raise exception 'Conflito' using errcode='PT409';end $$;
create or replace function public.equipe_documento_reservar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_id uuid,p_meta jsonb,p_sha256 text,p_mime text,p_tamanho integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.equipe_documento_tentativas%rowtype;u uuid[];d public.equipe_documentos%rowtype;ocup boolean;begin
 u:=array(select jsonb_array_elements_text(p_meta->'unidades')::uuid);ocup:=p_meta->>'categoria' in ('aso','capacitacao');
 if auth.role() is distinct from 'service_role' or not p_clinica_id=any(u) or not public.equipe_ficha_escopo(u,p_ator_id,p_membro_id,ocup)
 or p_sha256 !~ '^[a-f0-9]{64}$' or p_mime not in ('application/pdf','image/jpeg') or p_tamanho not between 1 and 10485760
 or p_meta->>'categoria' not in ('identificacao','endereco','contrato','aditivo','admissao','formacao','dependentes','termo_interno','equipamentos','aso','capacitacao') then raise exception 'Acesso negado' using errcode='42501';end if;
 perform 1 from public.equipe_membros where id=p_membro_id for update;
 if p_meta->>'contrato_id' is not null and not exists(select 1 from public.equipe_registros r where r.id=(p_meta->>'contrato_id')::uuid and r.tipo='contrato' and r.membro_id=p_membro_id and u<@r.unidades and public.equipe_ficha_escopo(r.unidades,p_ator_id,p_membro_id)) then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into t from public.equipe_documento_tentativas where id=p_id;
 if t.id is not null then
 if t.membro_id<>p_membro_id or t.clinica_id<>p_clinica_id or t.ator_id<>p_ator_id or t.meta<>p_meta or t.sha256<>p_sha256 or t.mime<>p_mime or t.tamanho<>p_tamanho then raise exception 'Tentativa incompatível' using errcode='22023';end if;
 if t.estado='expirado' or t.estado='reservado' and t.criado_em<clock_timestamp()-interval '15 minutes' then raise exception 'Tentativa expirada' using errcode='PT409';end if;
 return to_jsonb(t);
 end if;
 if p_meta->>'substitui_id' is not null then
 select * into d from public.equipe_documentos where id=(p_meta->>'substitui_id')::uuid;
 if d.id is null or d.membro_id<>p_membro_id or d.unidades<>u or d.categoria<>p_meta->>'categoria' or d.contrato_id is distinct from (p_meta->>'contrato_id')::uuid
 or d.arquivado or not public.equipe_ficha_escopo(d.unidades,p_ator_id,p_membro_id,d.ocupacional) then raise exception 'Conflito ou escopo inválido' using errcode='PT409';end if;
 end if;
 insert into public.equipe_documento_tentativas(id,membro_id,clinica_id,ator_id,meta,sha256,mime,tamanho,caminho,estado)
 values(p_id,p_membro_id,p_clinica_id,p_ator_id,p_meta,p_sha256,p_mime,p_tamanho,p_membro_id::text||'/'||p_id::text||case when p_mime='application/pdf' then '.pdf' else '.jpg' end,'reservado') returning * into t;
 return to_jsonb(t);
end $$;
create or replace function public.equipe_documento_confirmar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.equipe_documento_tentativas%rowtype; d public.equipe_documentos%rowtype;old public.equipe_documentos%rowtype;u uuid[];begin
 perform 1 from public.equipe_membros where id=p_membro_id for update;
 select * into t from public.equipe_documento_tentativas where id=p_id for update;u:=array(select jsonb_array_elements_text(t.meta->'unidades')::uuid);
 if auth.role() is distinct from 'service_role' or t.id is null or t.membro_id<>p_membro_id or t.clinica_id<>p_clinica_id or t.ator_id<>p_ator_id
 or not public.equipe_ficha_escopo(u,p_ator_id,p_membro_id,t.meta->>'categoria' in ('aso','capacitacao')) then raise exception 'Acesso negado' using errcode='42501';end if;
 if t.estado='confirmado' then select * into d from public.equipe_documentos where id=t.documento_id;return to_jsonb(d)-'caminho'-'sha256';end if;
 if t.estado<>'reservado' or t.criado_em<clock_timestamp()-interval '15 minutes' then raise exception 'Tentativa expirada' using errcode='PT409';end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='equipe-documentos' and o.name=t.caminho and o.metadata->>'mimetype'=t.mime and (o.metadata->>'size')::integer=t.tamanho) then raise exception 'Arquivo ainda não confirmado' using errcode='22023';end if;
 if t.meta->>'substitui_id' is not null then select * into old from public.equipe_documentos where id=(t.meta->>'substitui_id')::uuid for update;
 if old.id is null or old.arquivado then raise exception 'Conflito' using errcode='PT409';end if;
 update public.equipe_documentos set arquivado=true,revisao=revisao+1 where id=old.id;end if;
 insert into public.equipe_documentos(id,membro_id,contrato_id,unidades,categoria,caminho,mime,tamanho,sha256,emissao,validade,versao,substitui_id,enviado_por,ocupacional)
 values(p_id,p_membro_id,(t.meta->>'contrato_id')::uuid,u,t.meta->>'categoria',t.caminho,t.mime,t.tamanho,t.sha256,nullif(t.meta->>'emissao','')::date,nullif(t.meta->>'validade','')::date,coalesce(old.versao,0)+1,old.id,p_ator_id,t.meta->>'categoria' in ('aso','capacitacao')) returning * into d;
 update public.equipe_documento_tentativas set estado='confirmado',documento_id=d.id where id=p_id;
 perform public.equipe_ficha_evento(p_membro_id,d.id,u,'documento_salvo',1,p_ator_id,array['arquivo','categoria','versao'],d.ocupacional);
 return to_jsonb(d)-'caminho'-'sha256';
end $$;
create or replace function public.equipe_documento_operar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_id uuid,p_acao text,p_revisao integer default null,p_fonte text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare d public.equipe_documentos%rowtype;begin
 select * into d from public.equipe_documentos where id=p_id for update;
 if auth.role() is distinct from 'service_role' or d.id is null or d.membro_id<>p_membro_id or not p_clinica_id=any(d.unidades) or not public.equipe_ficha_escopo(d.unidades,p_ator_id,p_membro_id,d.ocupacional) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_acao='ler' then perform public.equipe_ficha_evento(p_membro_id,d.id,d.unidades,'documento_lido',d.revisao,p_ator_id,'{}',d.ocupacional);return jsonb_build_object('caminho',d.caminho,'mime',d.mime,'tamanho',d.tamanho,'sha256',d.sha256);end if;
 if p_acao not in ('conferido','necessita_correcao','arquivar') or d.arquivado or p_revisao is null or d.revisao<>p_revisao then raise exception 'Conflito' using errcode='PT409';end if;
 if p_acao<>'arquivar' and (nullif(btrim(p_fonte),'') is null or length(p_fonte)>250) then raise exception 'Informe a fonte da conferência' using errcode='22023';end if;
 update public.equipe_documentos set arquivado=(p_acao='arquivar'),conferencia=case when p_acao='arquivar' then conferencia else p_acao end,
 conferido_em=case when p_acao='arquivar' then conferido_em else now() end,conferido_por=case when p_acao='arquivar' then conferido_por else p_ator_id end,
 fonte=case when p_acao='arquivar' then fonte else p_fonte end,revisao=revisao+1 where id=p_id returning * into d;
 perform public.equipe_ficha_evento(p_membro_id,d.id,d.unidades,'documento_'||p_acao,d.revisao,p_ator_id,array['conferencia'],d.ocupacional);return to_jsonb(d)-'caminho'-'sha256';
end $$;
notify pgrst,'reload schema';
commit;
