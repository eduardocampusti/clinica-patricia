-- ETAPA33 LOCAL. Não aplicada. Requer etapa32 e estruturas vigentes; nenhum seed.
begin;
do $$ begin
 if to_regprocedure('public.equipe_recurso_pode(uuid,uuid,uuid,boolean)') is null
 or to_regprocedure('public.equipe_recebimento_cifrar(jsonb)') is null then raise exception 'Aplicar e verificar dependências32 primeiro';end if;
end $$;
-- Encrypted structured administrative records; an employer is not a clinic.
-- Company records have no member. Personal/professional records are canonical.
create table public.equipe_registros (
 id uuid primary key, membro_id uuid references public.equipe_membros(id) on delete restrict,
 tipo text not null check(tipo in ('pessoal','contrato','formacao','empresa','checklist','ocupacional')),
 unidades uuid[] not null check(cardinality(unidades) between 1 and 2),
 referencia_id uuid references public.equipe_registros(id) on delete restrict,
 dados_encrypted bytea not null, revisao integer not null check(revisao>0),
 atualizado_em timestamptz not null default now(), atualizado_por uuid not null references public.usuarios(id),
 check((tipo='empresa')=(membro_id is null))
);
create unique index equipe_registro_canonico on public.equipe_registros(membro_id,tipo) where tipo in ('pessoal','formacao');
create unique index equipe_registro_por_contrato on public.equipe_registros(membro_id,tipo,referencia_id) where tipo in ('checklist','ocupacional');
create table public.equipe_registro_versoes (
 registro_id uuid not null references public.equipe_registros(id), revisao integer not null,
 unidades uuid[] not null, dados_encrypted bytea not null, instante timestamptz not null default now(), ator_id uuid not null references public.usuarios(id),
 primary key(registro_id,revisao)
);
create table public.equipe_ocupacional_autorizacoes (
 ator_id uuid not null references public.usuarios(id), clinica_id uuid not null references public.clinicas(id),
 finalidade text not null check(length(btrim(finalidade))>0), autorizado_por uuid not null references public.usuarios(id),
 autorizado_em timestamptz not null default now(), ativo boolean not null default true,
 primary key(ator_id,clinica_id)
);
-- No automatic grant, no new role, no client operation to grant this capability.
create table public.equipe_documentos (
 id uuid primary key, membro_id uuid not null references public.equipe_membros(id), contrato_id uuid references public.equipe_registros(id),
 unidades uuid[] not null check(cardinality(unidades) between 1 and 2), categoria text not null,
 caminho text not null unique, mime text not null check(mime in ('application/pdf','image/jpeg')),
 tamanho integer not null check(tamanho between 1 and 10485760), sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 emissao date, validade date, versao integer not null check(versao>0), substitui_id uuid unique references public.equipe_documentos(id),
 arquivado boolean not null default false, armazenamento text not null default 'disponivel' check(armazenamento='disponivel'),
 conferencia text not null default 'aguardando' check(conferencia in ('aguardando','conferido','necessita_correcao')),
 revisao integer not null default 1, enviado_em timestamptz not null default now(), enviado_por uuid not null references public.usuarios(id),
 conferido_em timestamptz, conferido_por uuid references public.usuarios(id), fonte text, ocupacional boolean not null,
 check(validade is null or emissao is null or validade>=emissao)
);
create table public.equipe_documento_tentativas (
 id uuid primary key, membro_id uuid not null references public.equipe_membros(id), clinica_id uuid not null references public.clinicas(id),
 ator_id uuid not null references public.usuarios(id), meta jsonb not null, sha256 text not null, mime text not null, tamanho integer not null,
 caminho text not null unique, criado_em timestamptz not null default now(), estado text not null check(estado in ('reservado','confirmado','expirado')),
 documento_id uuid references public.equipe_documentos(id)
);
create table public.equipe_ficha_eventos (
 id uuid primary key default gen_random_uuid(), membro_id uuid references public.equipe_membros(id), registro_id uuid not null,
 unidades uuid[] not null, tipo text not null, revisao integer not null, instante timestamptz not null default now(),
 ator_id uuid not null references public.usuarios(id), campos text[] not null default '{}', ocupacional boolean not null default false
);
do $$ declare t text;begin
 foreach t in array array['equipe_registros','equipe_registro_versoes','equipe_ocupacional_autorizacoes','equipe_documentos','equipe_documento_tentativas','equipe_ficha_eventos'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
create function public.equipe_ficha_escopo(p_unidades uuid[],p_ator uuid,p_membro uuid default null,p_ocupacional boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select p_ator is not null and cardinality(p_unidades) between 1 and 2
 and exists(select 1 from public.usuarios where id=p_ator and ativo)
 and not exists(select 1 from unnest(p_unidades) c(id) where
  not exists(select 1 from public.clinicas cl join public.usuarios_clinicas uc on uc.clinica_id=cl.id
   where cl.id=c.id and cl.ativo and cl.subdomain in ('brotas','ipupiara') and uc.usuario_id=p_ator and uc.ativo and uc.papel::text='proprietaria')
  or p_membro is not null and not public.equipe_recurso_pode(p_membro,c.id,p_ator,false)
  or p_ocupacional and not exists(select 1 from public.equipe_ocupacional_autorizacoes o where o.ator_id=p_ator and o.clinica_id=c.id and o.ativo));
$$;
create function public.equipe_ficha_evento(p_membro uuid,p_id uuid,p_unidades uuid[],p_tipo text,p_revisao integer,p_ator uuid,p_campos text[],p_ocupacional boolean default false)
returns void language plpgsql security definer set search_path='' as $$ begin
 insert into public.equipe_ficha_eventos(membro_id,registro_id,unidades,tipo,revisao,ator_id,campos,ocupacional)
 values(p_membro,p_id,p_unidades,p_tipo,p_revisao,p_ator,p_campos,p_ocupacional);
 insert into public.auditoria(usuario_id,clinica_id,acao,entidade,entidade_id,dados_depois)
 values(p_ator,p_unidades[1],case when p_tipo in ('documento_lido','versao_consultada') then 'READ_SENSIVEL'::public.acao_auditoria else 'UPDATE'::public.acao_auditoria end,
 'equipe_ficha',p_id::text,jsonb_build_object('evento',p_tipo,'revisao',p_revisao,'campos',p_campos));
end $$;
create function public.equipe_ficha_registro_json(p_r public.equipe_registros)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p_r.id,'membro_id',p_r.membro_id,'tipo',p_r.tipo,'unidades',p_r.unidades,'referencia_id',p_r.referencia_id,
 'revisao',p_r.revisao,'dados',public.equipe_recebimento_decifrar(p_r.dados_encrypted),'atualizado_em',p_r.atualizado_em,'atualizado_por',p_r.atualizado_por);
$$;
create function public.equipe_ficha_interno(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare v_global boolean; begin
 if auth.role() is distinct from 'service_role' or not public.equipe_recurso_pode(p_membro_id,p_clinica_id,p_ator_id,false) then raise exception 'Acesso negado' using errcode='42501';end if;
 v_global:=public.equipe_recurso_pode(p_membro_id,p_clinica_id,p_ator_id,true);
 return jsonb_build_object('membro_id',p_membro_id,'clinica_id',p_clinica_id,'pode_global',v_global,
 'pode_ocupacional',public.equipe_ficha_escopo(array[p_clinica_id],p_ator_id,p_membro_id,true),
 'ocupacional_unidades',coalesce((select jsonb_agg(cl.id) from public.clinicas cl where public.equipe_ficha_escopo(array[cl.id],p_ator_id,p_membro_id,true)),'[]'::jsonb),
 'registros',coalesce((select jsonb_agg(public.equipe_ficha_registro_json(r) order by atualizado_em) from public.equipe_registros r where r.membro_id=p_membro_id
 and p_clinica_id=any(r.unidades) and public.equipe_ficha_escopo(r.unidades,p_ator_id,p_membro_id,r.tipo='ocupacional') and (r.tipo not in ('pessoal','formacao') or v_global)),'[]'::jsonb),
 'empresas',coalesce((select jsonb_agg(public.equipe_ficha_registro_json(r)) from public.equipe_registros r where r.tipo='empresa' and p_clinica_id=any(r.unidades) and public.equipe_ficha_escopo(r.unidades,p_ator_id)),'[]'::jsonb),
 'documentos',coalesce((select jsonb_agg(to_jsonb(d)-'caminho'-'sha256' order by enviado_em desc) from public.equipe_documentos d where d.membro_id=p_membro_id and p_clinica_id=any(d.unidades) and public.equipe_ficha_escopo(d.unidades,p_ator_id,p_membro_id,d.ocupacional)),'[]'::jsonb),
 'historico',coalesce((select jsonb_agg(to_jsonb(e)-'membro_id'-'unidades'-'ocupacional' order by instante desc) from public.equipe_ficha_eventos e where e.membro_id=p_membro_id and p_clinica_id=any(e.unidades) and public.equipe_ficha_escopo(e.unidades,p_ator_id,p_membro_id,e.ocupacional)),'[]'::jsonb),
 'tentativas',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'meta',t.meta,'criado_em',t.criado_em)) from public.equipe_documento_tentativas t
 where t.membro_id=p_membro_id and t.clinica_id=p_clinica_id and t.ator_id=p_ator_id and t.estado='reservado'
 and t.criado_em>clock_timestamp()-interval '15 minutes' and public.equipe_ficha_escopo(array(select jsonb_array_elements_text(t.meta->'unidades')::uuid),p_ator_id,p_membro_id,t.meta->>'categoria' in ('aso','capacitacao'))),'[]'::jsonb));
end $$;
create function public.equipe_ficha_autorizar_escopo(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_unidades uuid[],p_ocupacional boolean)
returns boolean language plpgsql stable security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' or not p_clinica_id=any(p_unidades) or not public.equipe_ficha_escopo(p_unidades,p_ator_id,p_membro_id,p_ocupacional) then raise exception 'Acesso negado' using errcode='42501';end if;
 return true;
end $$;
create function public.equipe_ficha_salvar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_id uuid,p_tipo text,p_unidades uuid[],p_referencia_id uuid,p_revisao integer,p_dados jsonb)
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
 if p_revisao is null or coalesce(v.revisao,0)<>p_revisao then raise exception 'Conflito' using errcode='40001';end if;
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
exception when unique_violation then raise exception 'Conflito' using errcode='40001';end $$;
create function public.equipe_ficha_versao(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_id uuid,p_revisao integer)
returns jsonb language plpgsql security definer set search_path='' as $$ declare r public.equipe_registros%rowtype;v public.equipe_registro_versoes%rowtype;begin
 select * into r from public.equipe_registros where id=p_id;
 select * into v from public.equipe_registro_versoes where registro_id=p_id and revisao=p_revisao;
 if auth.role() is distinct from 'service_role' or r.membro_id is distinct from p_membro_id or v.registro_id is null
 or not p_clinica_id=any(r.unidades) or not public.equipe_ficha_escopo(r.unidades,p_ator_id,p_membro_id,r.tipo='ocupacional')
 or not public.equipe_ficha_escopo(v.unidades,p_ator_id,p_membro_id,r.tipo='ocupacional') then raise exception 'Acesso negado' using errcode='42501';end if;
 if r.tipo in ('pessoal','formacao') and not public.equipe_recurso_pode(p_membro_id,p_clinica_id,p_ator_id,true) then raise exception 'Acesso negado' using errcode='42501';end if;
 perform public.equipe_ficha_evento(p_membro_id,p_id,v.unidades,'versao_consultada',p_revisao,p_ator_id,'{}',r.tipo='ocupacional');
 return jsonb_build_object('id',p_id,'revisao',p_revisao,'dados',public.equipe_recebimento_decifrar(v.dados_encrypted),'instante',v.instante,'ator_id',v.ator_id);
end $$;
create function public.equipe_documento_reservar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_id uuid,p_meta jsonb,p_sha256 text,p_mime text,p_tamanho integer)
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
 if t.estado='expirado' or t.estado='reservado' and t.criado_em<clock_timestamp()-interval '15 minutes' then raise exception 'Tentativa expirada' using errcode='40001';end if;
 return to_jsonb(t);
 end if;
 if p_meta->>'substitui_id' is not null then
 select * into d from public.equipe_documentos where id=(p_meta->>'substitui_id')::uuid;
 if d.id is null or d.membro_id<>p_membro_id or d.unidades<>u or d.categoria<>p_meta->>'categoria' or d.contrato_id is distinct from (p_meta->>'contrato_id')::uuid
 or d.arquivado or not public.equipe_ficha_escopo(d.unidades,p_ator_id,p_membro_id,d.ocupacional) then raise exception 'Conflito ou escopo inválido' using errcode='40001';end if;
 end if;
 insert into public.equipe_documento_tentativas(id,membro_id,clinica_id,ator_id,meta,sha256,mime,tamanho,caminho,estado)
 values(p_id,p_membro_id,p_clinica_id,p_ator_id,p_meta,p_sha256,p_mime,p_tamanho,p_membro_id::text||'/'||p_id::text||case when p_mime='application/pdf' then '.pdf' else '.jpg' end,'reservado') returning * into t;
 return to_jsonb(t);
end $$;
create function public.equipe_documento_confirmar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.equipe_documento_tentativas%rowtype; d public.equipe_documentos%rowtype;old public.equipe_documentos%rowtype;u uuid[];begin
 perform 1 from public.equipe_membros where id=p_membro_id for update;
 select * into t from public.equipe_documento_tentativas where id=p_id for update;u:=array(select jsonb_array_elements_text(t.meta->'unidades')::uuid);
 if auth.role() is distinct from 'service_role' or t.id is null or t.membro_id<>p_membro_id or t.clinica_id<>p_clinica_id or t.ator_id<>p_ator_id
 or not public.equipe_ficha_escopo(u,p_ator_id,p_membro_id,t.meta->>'categoria' in ('aso','capacitacao')) then raise exception 'Acesso negado' using errcode='42501';end if;
 if t.estado='confirmado' then select * into d from public.equipe_documentos where id=t.documento_id;return to_jsonb(d)-'caminho'-'sha256';end if;
 if t.estado<>'reservado' or t.criado_em<clock_timestamp()-interval '15 minutes' then raise exception 'Tentativa expirada' using errcode='40001';end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='equipe-documentos' and o.name=t.caminho and o.metadata->>'mimetype'=t.mime and (o.metadata->>'size')::integer=t.tamanho) then raise exception 'Arquivo ainda não confirmado' using errcode='22023';end if;
 if t.meta->>'substitui_id' is not null then select * into old from public.equipe_documentos where id=(t.meta->>'substitui_id')::uuid for update;
 if old.id is null or old.arquivado then raise exception 'Conflito' using errcode='40001';end if;
 update public.equipe_documentos set arquivado=true,revisao=revisao+1 where id=old.id;end if;
 insert into public.equipe_documentos(id,membro_id,contrato_id,unidades,categoria,caminho,mime,tamanho,sha256,emissao,validade,versao,substitui_id,enviado_por,ocupacional)
 values(p_id,p_membro_id,(t.meta->>'contrato_id')::uuid,u,t.meta->>'categoria',t.caminho,t.mime,t.tamanho,t.sha256,nullif(t.meta->>'emissao','')::date,nullif(t.meta->>'validade','')::date,coalesce(old.versao,0)+1,old.id,p_ator_id,t.meta->>'categoria' in ('aso','capacitacao')) returning * into d;
 update public.equipe_documento_tentativas set estado='confirmado',documento_id=d.id where id=p_id;
 perform public.equipe_ficha_evento(p_membro_id,d.id,u,'documento_salvo',1,p_ator_id,array['arquivo','categoria','versao'],d.ocupacional);
 return to_jsonb(d)-'caminho'-'sha256';
end $$;
create function public.equipe_documento_operar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_id uuid,p_acao text,p_revisao integer default null,p_fonte text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare d public.equipe_documentos%rowtype;begin
 select * into d from public.equipe_documentos where id=p_id for update;
 if auth.role() is distinct from 'service_role' or d.id is null or d.membro_id<>p_membro_id or not p_clinica_id=any(d.unidades) or not public.equipe_ficha_escopo(d.unidades,p_ator_id,p_membro_id,d.ocupacional) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_acao='ler' then perform public.equipe_ficha_evento(p_membro_id,d.id,d.unidades,'documento_lido',d.revisao,p_ator_id,'{}',d.ocupacional);return jsonb_build_object('caminho',d.caminho,'mime',d.mime,'tamanho',d.tamanho,'sha256',d.sha256);end if;
 if p_acao not in ('conferido','necessita_correcao','arquivar') or d.arquivado or p_revisao is null or d.revisao<>p_revisao then raise exception 'Conflito' using errcode='40001';end if;
 if p_acao<>'arquivar' and (nullif(btrim(p_fonte),'') is null or length(p_fonte)>250) then raise exception 'Informe a fonte da conferência' using errcode='22023';end if;
 update public.equipe_documentos set arquivado=(p_acao='arquivar'),conferencia=case when p_acao='arquivar' then conferencia else p_acao end,
 conferido_em=case when p_acao='arquivar' then conferido_em else now() end,conferido_por=case when p_acao='arquivar' then conferido_por else p_ator_id end,
 fonte=case when p_acao='arquivar' then fonte else p_fonte end,revisao=revisao+1 where id=p_id returning * into d;
 perform public.equipe_ficha_evento(p_membro_id,d.id,d.unidades,'documento_'||p_acao,d.revisao,p_ator_id,array['conferencia'],d.ocupacional);return to_jsonb(d)-'caminho'-'sha256';
end $$;
create function public.equipe_documento_limpar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid)
returns setof text language plpgsql security definer set search_path='' as $$ declare t public.equipe_documento_tentativas%rowtype;begin
 if auth.role() is distinct from 'service_role' or not public.equipe_recurso_pode(p_membro_id,p_clinica_id,p_ator_id,false) then raise exception 'Acesso negado' using errcode='42501';end if;
 perform 1 from public.equipe_membros where id=p_membro_id for update;
 for t in select * from public.equipe_documento_tentativas where membro_id=p_membro_id and clinica_id=p_clinica_id and ator_id=p_ator_id and estado<>'confirmado'
 and criado_em<clock_timestamp()-interval '30 minutes' order by criado_em limit 30 for update loop
 if not exists(select 1 from public.equipe_documentos d where d.caminho=t.caminho) then update public.equipe_documento_tentativas set estado='expirado' where id=t.id;return next t.caminho;end if;
 end loop;
end $$;
-- Immutable history and metadata-only audit. Service writers use RPCs, not table grants.
create function public.equipe_ficha_imutavel() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Histórico imutável' using errcode='42501';end $$;
create trigger equipe_versoes_imutaveis before update or delete on public.equipe_registro_versoes for each row execute function public.equipe_ficha_imutavel();
create trigger equipe_eventos_imutaveis before update or delete on public.equipe_ficha_eventos for each row execute function public.equipe_ficha_imutavel();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('equipe-documentos','equipe-documentos',false,10485760,array['application/pdf','image/jpeg']);
-- No browser Storage policy: authenticated Edge gates each read and audits it.
do $$ declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
 and (p.proname like 'equipe_ficha_%' or p.proname like 'equipe_documento_%') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end $$;
grant execute on function public.equipe_ficha_interno(uuid,uuid,uuid),public.equipe_ficha_salvar(uuid,uuid,uuid,uuid,text,uuid[],uuid,integer,jsonb),
public.equipe_ficha_autorizar_escopo(uuid,uuid,uuid,uuid[],boolean),
public.equipe_ficha_versao(uuid,uuid,uuid,uuid,integer),public.equipe_documento_reservar(uuid,uuid,uuid,uuid,jsonb,text,text,integer),
public.equipe_documento_confirmar(uuid,uuid,uuid,uuid),public.equipe_documento_operar(uuid,uuid,uuid,uuid,text,integer,text),public.equipe_documento_limpar(uuid,uuid,uuid) to service_role;
commit;
