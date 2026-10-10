-- PROPOSTA LOCAL PARA REVISÃO. NÃO APLICADA. Alvo exclusivo xftnkusbyqzyvzrovroj.
-- Sem seeds, contas, grants globais automáticos ou laboratório ativo.
begin;
do $$ begin
 if to_regprocedure('public.equipe_ficha_escopo(uuid[],uuid,uuid,boolean)') is null
 or to_regprocedure('public.equipe_recebimento_decifrar(bytea)') is null then
 raise exception 'Conferir dependências da Equipe e esquema oficial antes de aplicar'; end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='clinicas' and c.relrowsecurity)
 then raise exception 'Conferir RLS da fonte oficial de clínicas antes de aplicar';end if;
end $$;
alter table public.clinicas
 add column nome_fantasia text,
 add column nome_exibicao text,
 add column razao_social text,
 add column cep text,
 add column logradouro text,
 add column numero text,
 add column complemento text,
 add column bairro text,
 add column uf text,
 add column telefone text,
 add column whatsapp text,
 add column email_institucional text,
 add column site text,
 add column empresa_emissora_id uuid references public.equipe_registros(id) on delete restrict;
-- O grant/política legados de clinicas podem permitir UPDATE direto na unidade.
-- Os campos novos só mudam pelo serviço que valida, versiona e audita; campos
-- jurídicos legados exigem propriedade efetiva, preservando SELECT/navigation.
create function public.configuracoes_clinicas_proteger() returns trigger
language plpgsql set search_path='' as $$
declare anterior jsonb:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
 atual jsonb:=to_jsonb(new);campo text;begin
 if auth.role()='authenticated' or current_user='authenticated' then
  foreach campo in array array['nome_fantasia','nome_exibicao','razao_social','cep','logradouro','numero','complemento','bairro','uf','telefone','whatsapp','email_institucional','site','empresa_emissora_id'] loop
   if (tg_op='INSERT' and atual->campo is distinct from 'null'::jsonb)
   or (tg_op='UPDATE' and anterior->campo is distinct from atual->campo)
   then raise exception 'Use o serviço de Configurações para alterar dados institucionais.' using errcode='42501';end if;
  end loop;
  if (tg_op='INSERT' or anterior->'nome' is distinct from atual->'nome' or anterior->'cidade' is distinct from atual->'cidade' or anterior->'cnpj' is distinct from atual->'cnpj')
  and not public.equipe_acesso_eh_proprietaria(auth.uid(),new.id)
  then raise exception 'Dados institucionais exigem autorização da unidade.' using errcode='42501';end if;
 end if;
 return new;
end $$;
create trigger configuracoes_clinicas_proteger before insert or update on public.clinicas
for each row execute function public.configuracoes_clinicas_proteger();
-- Marcas públicas são servidas pela projeção, não pela tabela institucional inteira.
-- RESTRICTIVE não amplia permissões de leitura/escrita ou troca políticas anteriores.
create policy configuracoes_clinicas_anon_privadas on public.clinicas as restrictive for all to anon using(false) with check(false);
create table public.configuracoes_globais_autorizacoes (
 usuario_id uuid primary key references public.usuarios(id), autorizado_por uuid not null references public.usuarios(id),
 autorizado_em timestamptz not null default now(), ativo boolean not null default true
);
create table public.configuracoes_escopos (
 escopo text primary key check(escopo='geral' or escopo ~ '^[a-f0-9-]{36}$'),
 clinica_id uuid unique references public.clinicas(id), revisao integer not null default 0,
 aplicado integer, rascunho jsonb, rascunho_fonte_revisao text, campos_aplicados jsonb not null default '{}', variacoes_aplicadas jsonb not null default '{}',
 check((escopo='geral' and clinica_id is null) or (clinica_id is not null and escopo=clinica_id::text))
);
create table public.configuracoes_versoes (
 escopo text not null references public.configuracoes_escopos(escopo), revisao integer not null,
 acao text not null check(acao in ('rascunho','aplicar','restaurar')), documento jsonb not null, representacao jsonb,
 autor_id uuid not null references public.usuarios(id), instante timestamptz not null default now(), origem_versao integer,
 primary key(escopo,revisao)
);
create table public.configuracoes_ativos (
 caminho text primary key, escopo text not null, mime text not null check(mime in ('image/png','image/jpeg')),
 largura integer not null check(largura between 32 and 4096), altura integer not null check(altura between 32 and 4096),
 tamanho integer not null check(tamanho between 1 and 5242880), sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 autor_id uuid not null references public.usuarios(id), criado_em timestamptz not null default now(),
 check(largura*altura<=8000000),check(caminho like escopo||'/%')
);
create table public.configuracoes_publicas (
 slug text primary key check(slug in ('brotas','ipupiara')), versao integer not null, geral_revisao integer not null,
 marca jsonb not null, aplicado_em timestamptz not null default now()
);
do $$ declare t text;begin
 foreach t in array array['configuracoes_globais_autorizacoes','configuracoes_escopos','configuracoes_versoes','configuracoes_ativos','configuracoes_publicas'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
end $$;
-- Pontos únicos de resolução; a migração separada de homologação pode reconhecer
-- somente seus dois contextos fixos. Sem ela, apenas as duas clínicas oficiais.
create function public.configuracoes_unidade_permitida(p_clinica uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.clinicas where id=p_clinica and ativo and subdomain in ('brotas','ipupiara'));
$$;
create function public.configuracoes_padrao_consultar(p_escopo text) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce((select to_jsonb(g) from public.configuracoes_escopos g where escopo='geral'),'{}'::jsonb);
$$;
create function public.configuracoes_slug_permitido(p_slug text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.clinicas where subdomain=p_slug and ativo and subdomain in ('brotas','ipupiara'));
$$;
create function public.configuracoes_ativo_escopo_permitido(p_ativo_escopo text,p_escopo text) returns boolean
language sql stable security definer set search_path='' as $$
 select p_ativo_escopo=p_escopo or p_ativo_escopo='geral' and (p_escopo='geral' or exists(select 1 from public.clinicas where id::text=p_escopo and ativo and subdomain in ('brotas','ipupiara')));
$$;
create function public.configuracoes_pode(p_escopo text,p_ator uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select p_ator is not null and exists(select 1 from public.usuarios where id=p_ator and ativo)
 and (p_escopo='geral' and exists(select 1 from public.configuracoes_globais_autorizacoes where usuario_id=p_ator and ativo)
 or exists(select 1 from public.clinicas c join public.usuarios_clinicas u on u.clinica_id=c.id
 where c.id::text=p_escopo and public.configuracoes_unidade_permitida(c.id) and u.usuario_id=p_ator and u.ativo and u.papel::text='proprietaria'));
$$;
create function public.configuracoes_instituicao(p_clinica uuid,p_empresa uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.clinicas%rowtype;e jsonb;begin
 select * into strict c from public.clinicas where id=p_clinica and public.configuracoes_unidade_permitida(id);
 if p_empresa is not null then
 select public.equipe_recebimento_decifrar(dados_encrypted) into e from public.equipe_registros where id=p_empresa and tipo='empresa' and p_clinica=any(unidades);
 if e is null then raise exception 'Empresa emissora inválida' using errcode='22023';end if;
 end if;
 return jsonb_build_object('nome',c.nome,'nomeFantasia',coalesce(c.nome_fantasia,''),'nomeExibicao',coalesce(c.nome_exibicao,''),
 'razaoSocial',coalesce(case when p_empresa is null then c.razao_social else e->>'nome' end,''),
 'cnpj',coalesce(case when p_empresa is null then c.cnpj else e->>'cnpj' end,''),
 'cep',coalesce(c.cep,''),'logradouro',coalesce(c.logradouro,''),'numero',coalesce(c.numero,''),'complemento',coalesce(c.complemento,''),
 'bairro',coalesce(c.bairro,''),'cidade',c.cidade,'uf',coalesce(c.uf,''),'telefone',coalesce(c.telefone,''),'whatsapp',coalesce(c.whatsapp,''),
 'email',coalesce(c.email_institucional,''),'site',coalesce(c.site,''),'empresaId',coalesce(p_empresa::text,''));
end $$;
create function public.configuracoes_estado_interno(p_escopo text,p_ator uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.configuracoes_escopos%rowtype;g public.configuracoes_escopos%rowtype;i jsonb;fonte text;begin
 if auth.role() is distinct from 'service_role' or not public.configuracoes_pode(p_escopo,p_ator) then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into c from public.configuracoes_escopos where escopo=p_escopo;
 g:=jsonb_populate_record(null::public.configuracoes_escopos,public.configuracoes_padrao_consultar(p_escopo));
 if p_escopo<>'geral' then
 select public.configuracoes_instituicao(cl.id,cl.empresa_emissora_id) into i from public.clinicas cl where cl.id::text=p_escopo;
 select md5(to_jsonb(cl)::text||coalesce(r.dados_encrypted::text,'')) into fonte from public.clinicas cl left join public.equipe_registros r on r.id=cl.empresa_emissora_id where cl.id::text=p_escopo;
 end if;
 return jsonb_build_object('escopo',p_escopo,'disponivel',true,'podeGeral',public.configuracoes_pode('geral',p_ator),
 'revisao',coalesce(c.revisao,0),'geralRevisao',coalesce(g.revisao,0),'geral',coalesce(g.campos_aplicados,'{}'),'geralVariacoes',coalesce(g.variacoes_aplicadas,'{}'),
 'documento',coalesce(c.rascunho,jsonb_build_object('instituicao',i,'campos',coalesce(c.campos_aplicados,'{}'),'variacoes',coalesce(c.variacoes_aplicadas,'{}'))),
 'fonteRevisao',coalesce(fonte,''),'instituicaoAtual',i,
 'fonteConflitante',p_escopo<>'geral' and c.rascunho is not null and c.rascunho_fonte_revisao is distinct from fonte,
 'empresas',case when p_escopo='geral' then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'nome',public.equipe_recebimento_decifrar(r.dados_encrypted)->>'nome',
 'cnpj',public.equipe_recebimento_decifrar(r.dados_encrypted)->>'cnpj','unidades',cardinality(r.unidades))) from public.equipe_registros r where r.tipo='empresa'
 and p_escopo::uuid=any(r.unidades) and public.equipe_ficha_escopo(r.unidades,p_ator)), '[]') end,
 'historico',coalesce((select jsonb_agg(v.item order by v.rev desc) from (select cv.revisao rev,jsonb_build_object('revisao',cv.revisao,'acao',cv.acao,'documento',cv.documento,'instante',cv.instante,'autor',coalesce(u.nome_completo,'Autor registrado')) item
 from public.configuracoes_versoes cv join public.usuarios u on u.id=cv.autor_id where cv.escopo=p_escopo order by cv.revisao desc limit 50) v),'[]'));
end $$;
create function public.configuracoes_ativo_registrar(p_escopo text,p_ator uuid,p_caminho text,p_mime text,p_largura integer,p_altura integer,p_tamanho integer,p_sha256 text)
returns boolean language plpgsql security definer set search_path='' as $$ begin
 if auth.role() is distinct from 'service_role' or not public.configuracoes_pode(p_escopo,p_ator) or p_caminho !~ ('^'||p_escopo||'/[a-f0-9-]{36}\.(png|jpg)$') then raise exception 'Acesso negado' using errcode='42501';end if;
 insert into public.configuracoes_ativos values(p_caminho,p_escopo,p_mime,p_largura,p_altura,p_tamanho,p_sha256,p_ator,now());
 insert into public.auditoria(usuario_id,clinica_id,acao,entidade,entidade_id,dados_depois) values(p_ator,case when p_escopo='geral' then null else p_escopo::uuid end,'INSERT','configuracoes_ativo',p_caminho,jsonb_build_object('mime',p_mime,'tamanho',p_tamanho));
 return true;
end $$;
create function public.configuracoes_salvar_interno(p_escopo text,p_ator uuid,p_revisao integer,p_geral_revisao integer,p_fonte_revisao text,p_documento jsonb,p_acao text,p_publicacoes jsonb default '{}',p_origem integer default null,p_revisoes_publicacoes jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.configuracoes_escopos%rowtype;g public.configuracoes_escopos%rowtype;i jsonb;empresa uuid;ativo text;v integer;cl public.clinicas%rowtype;rep jsonb;begin
 if auth.role() is distinct from 'service_role' or not public.configuracoes_pode(p_escopo,p_ator) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_acao not in ('rascunho','aplicar','restaurar') or jsonb_typeof(p_documento) is distinct from 'object' or octet_length(p_documento::text)>32768
 or jsonb_typeof(p_documento->'campos') is distinct from 'object' or jsonb_typeof(p_documento->'variacoes') is distinct from 'object'
 or p_escopo='geral' and p_documento->'instituicao' is distinct from 'null'::jsonb then raise exception 'Configuração inválida' using errcode='22023';end if;
 -- Ordem fixa: geral antes da unidade. Protege aplicação concorrente e herança.
 perform pg_advisory_xact_lock(hashtextextended('configuracoes:geral',0));
 if p_escopo<>'geral' then perform pg_advisory_xact_lock(hashtextextended('configuracoes:'||p_escopo,0));end if;
 if p_escopo='geral' and p_acao='aplicar' then
 for cl in select * from public.clinicas where ativo and subdomain in ('brotas','ipupiara') order by id loop
 perform pg_advisory_xact_lock(hashtextextended('configuracoes:'||cl.id::text,0));
 if coalesce((select revisao from public.configuracoes_escopos where escopo=cl.id::text),0) is distinct from (p_revisoes_publicacoes->>cl.id::text)::integer
 then raise exception 'Uma unidade mudou durante a aplicação geral. Reconsulte.' using errcode='40001';end if;
 end loop;
 end if;
 insert into public.configuracoes_escopos(escopo,clinica_id) values(p_escopo,case when p_escopo='geral' then null else p_escopo::uuid end) on conflict do nothing;
 select * into c from public.configuracoes_escopos where escopo=p_escopo for update;
 g:=jsonb_populate_record(null::public.configuracoes_escopos,public.configuracoes_padrao_consultar(p_escopo));
 if c.revisao<>p_revisao or coalesce(g.revisao,0)<>p_geral_revisao then raise exception 'Outra edição foi registrada. Reconsulte antes de salvar.' using errcode='40001';end if;
 if p_escopo<>'geral' then
 select * into strict cl from public.clinicas where id::text=p_escopo for update;
 if p_fonte_revisao is distinct from (public.configuracoes_estado_interno(p_escopo,p_ator)->>'fonteRevisao') then raise exception 'Os dados oficiais mudaram. Reconsulte.' using errcode='40001';end if;
 i:=p_documento->'instituicao';empresa:=nullif(i->>'empresaId','')::uuid;
 if empresa is not null then
 -- Manter o vínculo oficial não altera a empresa compartilhada. Escolher outro
 -- registro exige autorização do alcance completo desse cadastro.
 perform 1 from public.equipe_registros r where r.id=empresa and r.tipo='empresa' and cl.id=any(r.unidades) and (empresa=cl.empresa_emissora_id or public.equipe_ficha_escopo(r.unidades,p_ator)) for share;
 if not found then raise exception 'Empresa não autorizada' using errcode='42501';end if;
 i:=i||jsonb_build_object('razaoSocial',public.equipe_recebimento_decifrar((select dados_encrypted from public.equipe_registros where id=empresa))->>'nome',
 'cnpj',public.equipe_recebimento_decifrar((select dados_encrypted from public.equipe_registros where id=empresa))->>'cnpj');
 p_documento:=jsonb_set(p_documento,'{instituicao}',i);
 end if;
 -- Revalidar a fonte após obter o lock da empresa. Alterações externas anteriores
 -- ao recarregamento não podem virar autorização para aplicar o rascunho antigo.
 if p_fonte_revisao is distinct from (public.configuracoes_estado_interno(p_escopo,p_ator)->>'fonteRevisao') then raise exception 'Os dados oficiais mudaram. Reconsulte.' using errcode='40001';end if;
 if c.rascunho is not null and c.rascunho_fonte_revisao is distinct from p_fonte_revisao
 and i is distinct from public.configuracoes_instituicao(cl.id,cl.empresa_emissora_id)
 then raise exception 'Atualize os dados oficiais no rascunho antes de continuar.' using errcode='40001';end if;
 end if;
 -- Todo arquivo referenciado deve existir e pertencer ao escopo ou ao padrão geral.
 for ativo in select distinct x.value from jsonb_path_query(p_documento,'$.**.*') q,
 lateral (select q #>> '{}' value) x where x.value ~ '^(geral|[a-f0-9-]{36})/[a-f0-9-]{36}\.(png|jpg)$' loop
 if not exists(select 1 from public.configuracoes_ativos a where a.caminho=ativo and public.configuracoes_ativo_escopo_permitido(a.escopo,p_escopo)) then raise exception 'Ativo institucional não autorizado' using errcode='42501';end if;
 end loop;
 v:=c.revisao+1;
 if p_acao='aplicar' then
 if p_escopo<>'geral' then
 update public.clinicas set nome=i->>'nome',nome_fantasia=nullif(i->>'nomeFantasia',''),nome_exibicao=nullif(i->>'nomeExibicao',''),
 razao_social=case when empresa is null then nullif(i->>'razaoSocial','') else razao_social end,
 cnpj=case when empresa is null then nullif(i->>'cnpj','') else cnpj end,
 cidade=i->>'cidade',cep=nullif(i->>'cep',''),logradouro=nullif(i->>'logradouro',''),numero=nullif(i->>'numero',''),complemento=nullif(i->>'complemento',''),bairro=nullif(i->>'bairro',''),
 uf=nullif(i->>'uf',''),telefone=nullif(i->>'telefone',''),whatsapp=nullif(i->>'whatsapp',''),email_institucional=nullif(i->>'email',''),site=nullif(i->>'site',''),empresa_emissora_id=empresa,updated_at=now()
 where id::text=p_escopo;
 end if;
 update public.configuracoes_escopos set aplicado=v,campos_aplicados=p_documento->'campos',variacoes_aplicadas=p_documento->'variacoes' where escopo=p_escopo;
 -- Projeção pública já filtrada pelo serviço. Nunca rascunhos ou instituição jurídica inteira.
 if jsonb_typeof(p_publicacoes) is distinct from 'object' then raise exception 'Projeção pública inválida' using errcode='22023';end if;
 for ativo,rep in select key,value from jsonb_each(p_publicacoes) loop
 if not public.configuracoes_slug_permitido(ativo) or (p_escopo='geral' and ativo not in ('brotas','ipupiara')) or exists(select 1 from jsonb_object_keys(rep) k where k not in ('logo','imagem','favicon','cor','mensagem','focoX','focoY','desktop','mobile')) then raise exception 'Campo público não permitido' using errcode='22023';end if;
 if p_escopo<>'geral' and ativo<>cl.subdomain then raise exception 'Projeção de outra unidade recusada' using errcode='42501';end if;
 insert into public.configuracoes_publicas(slug,versao,geral_revisao,marca) values(ativo,v,case when p_escopo='geral' then v else coalesce(g.aplicado,0) end,rep)
 on conflict(slug) do update set versao=excluded.versao,geral_revisao=excluded.geral_revisao,marca=excluded.marca,aplicado_em=now();
 end loop;
 end if;
 update public.configuracoes_escopos set revisao=v,rascunho=p_documento,
 rascunho_fonte_revisao=case when p_escopo='geral' then null else (select md5(to_jsonb(cx)::text||coalesce(rx.dados_encrypted::text,''))
 from public.clinicas cx left join public.equipe_registros rx on rx.id=cx.empresa_emissora_id where cx.id::text=p_escopo) end where escopo=p_escopo;
 insert into public.configuracoes_versoes(escopo,revisao,acao,documento,representacao,autor_id,origem_versao)
 values(p_escopo,v,p_acao,p_documento,case when p_acao='aplicar' then jsonb_build_object('instituicao',i,
 'geral',case when p_escopo='geral' then p_documento->'campos' else coalesce(g.campos_aplicados,'{}') end,
 'geralVariacoes',case when p_escopo='geral' then p_documento->'variacoes' else coalesce(g.variacoes_aplicadas,'{}') end,
 'geralAplicado',case when p_escopo='geral' then v else g.aplicado end,
 'campos',p_documento->'campos','variacoes',p_documento->'variacoes') end,p_ator,p_origem);
 insert into public.auditoria(usuario_id,clinica_id,acao,entidade,entidade_id,dados_depois)
 values(p_ator,case when p_escopo='geral' then null else p_escopo::uuid end,'UPDATE','configuracoes',p_escopo,jsonb_build_object('acao',p_acao,'revisao',v,'origem',p_origem));
 return public.configuracoes_estado_interno(p_escopo,p_ator);
end $$;
create function public.configuracoes_publicas_consultar(p_slug text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('marca',p.marca,'versao',p.versao,'aplicadoEm',p.aplicado_em) from public.configuracoes_publicas p
 where p.slug=p_slug and public.configuracoes_slug_permitido(p_slug);
$$;
create function public.configuracoes_publicas_ativo(p_caminho text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('mime',a.mime,'sha256',a.sha256) from public.configuracoes_ativos a where a.caminho=p_caminho
 and exists(select 1 from public.configuracoes_publicas p where public.configuracoes_slug_permitido(p.slug) and (p.marca->>'logo'=p_caminho or p.marca->>'imagem'=p_caminho or p.marca->>'favicon'=p_caminho));
$$;
create function public.configuracoes_emissor(p_instituicao jsonb) returns jsonb
language sql immutable set search_path='' as $$
 -- Empresa canônica existente contém somente nome/CNPJ. Não atribuir endereço da unidade à empresa.
 select case when coalesce(p_instituicao->>'empresaId','')='' then p_instituicao else p_instituicao||
 jsonb_build_object('cep','','logradouro','','numero','','complemento','','bairro','','cidade','','uf','','telefone','','whatsapp','','email','','site','') end;
$$;
-- O contrato de emissão exige identidade e versão aplicadas, com autorização da unidade.
create function public.configuracoes_timbrado_consultar(p_clinica uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$ declare c public.clinicas%rowtype;g public.configuracoes_escopos%rowtype;begin
 if not exists(select 1 from public.usuarios u join public.usuarios_clinicas uc on uc.usuario_id=u.id where u.id=auth.uid() and u.ativo and uc.ativo and uc.clinica_id=p_clinica)
 then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into strict c from public.clinicas where id=p_clinica and public.configuracoes_unidade_permitida(id);
 g:=jsonb_populate_record(null::public.configuracoes_escopos,public.configuracoes_padrao_consultar(p_clinica::text));
 return jsonb_build_object('instituicao',public.configuracoes_emissor(public.configuracoes_instituicao(p_clinica,c.empresa_emissora_id)),
 'versao',coalesce((select aplicado from public.configuracoes_escopos where escopo=p_clinica::text),0),
 'geralVersao',coalesce(g.aplicado,0),
 'fonteRevisao',(select md5(to_jsonb(cx)::text||coalesce(rx.dados_encrypted::text,'')) from public.clinicas cx left join public.equipe_registros rx on rx.id=cx.empresa_emissora_id where cx.id=p_clinica),
 'geral',coalesce(g.campos_aplicados,'{}'),
 'geralVariacoes',coalesce(g.variacoes_aplicadas,'{}'),
 'campos',coalesce((select campos_aplicados from public.configuracoes_escopos where escopo=p_clinica::text),'{}'),
 'variacoes',coalesce((select variacoes_aplicadas from public.configuracoes_escopos where escopo=p_clinica::text),'{}'));
end $$;
-- Imutabilidade das versões e ativos confirmados; nenhuma exclusão de arquivos.
create function public.configuracoes_imutavel() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Registro institucional imutável';end $$;
create trigger configuracoes_versoes_imutavel before update or delete on public.configuracoes_versoes for each row execute function public.configuracoes_imutavel();
create trigger configuracoes_ativos_imutavel before update or delete on public.configuracoes_ativos for each row execute function public.configuracoes_imutavel();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('institucionais','institucionais',false,5242880,array['image/png','image/jpeg']);
-- Sem upload direto, update, delete ou leitura privada anônima.
-- A política não pode ler diretamente a tabela de concessões, que é privada.
create function public.configuracoes_ativo_leitura_autorizada(p_escopo text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo
 and (p_escopo='geral' and exists(select 1 from public.configuracoes_globais_autorizacoes ga where ga.usuario_id=u.id and ga.ativo)
 or exists(select 1 from public.usuarios_clinicas uc join public.clinicas cl on cl.id=uc.clinica_id
 where uc.usuario_id=u.id and uc.ativo and public.configuracoes_unidade_permitida(cl.id) and ((p_escopo='geral' and cl.subdomain in ('brotas','ipupiara')) or uc.clinica_id::text=p_escopo))));
$$;
create policy institucionais_leitura on storage.objects for select to authenticated using(bucket_id='institucionais' and exists(
 select 1 from public.configuracoes_ativos a where a.caminho=name and public.configuracoes_ativo_leitura_autorizada(a.escopo)));
grant select on public.configuracoes_ativos to authenticated;
create policy configuracoes_ativos_leitura on public.configuracoes_ativos for select to authenticated using(
 public.configuracoes_ativo_leitura_autorizada(escopo));
-- Revoke explícito: default privileges existentes não concedem RPC internas ao cliente.
do $$ declare f record;begin for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname like 'configuracoes_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 execute format('grant execute on function %s to service_role',f.sig);
end loop;end $$;
grant execute on function public.configuracoes_timbrado_consultar(uuid) to authenticated;
grant execute on function public.configuracoes_ativo_leitura_autorizada(text) to authenticated;
commit;
