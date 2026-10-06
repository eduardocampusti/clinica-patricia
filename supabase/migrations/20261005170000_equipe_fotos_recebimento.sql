-- ETAPA32: PREPARADA LOCALMENTE, NÃO APLICADA. Nenhuma migração de dados financeiros.
-- Depende da Equipe vigente, Storage, pgcrypto/Vault e auditoria existentes.
begin;
do $$ begin
  if to_regclass('public.equipe_membros') is null or to_regclass('public.equipe_membros_clinicas') is null
    or to_regclass('public.profissionais_clinicas') is null or to_regclass('storage.objects') is null
    or to_regclass('vault.decrypted_secrets') is null or to_regclass('public.auditoria') is null then
    raise exception 'Dependências da etapa de Equipe indisponíveis.';
  end if;
end $$;

create table public.equipe_fotos (
  membro_id uuid primary key references public.equipe_membros(id) on delete restrict,
  caminho text check(caminho is null or caminho ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  revisao integer not null check(revisao>0),
  clinica_contexto_id uuid not null references public.clinicas(id),
  updated_by uuid not null references public.usuarios(id),
  updated_at timestamptz not null default now()
);
create table public.profissionais_recebimento (
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  dados_encrypted bytea not null,
  revisao integer not null check(revisao>0),
  updated_by uuid not null references public.usuarios(id),
  updated_at timestamptz not null default now(),
  primary key(profissional_id,clinica_id)
);
alter table public.equipe_fotos enable row level security;
alter table public.profissionais_recebimento enable row level security;
revoke all on public.equipe_fotos,public.profissionais_recebimento from public,anon,authenticated;

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
create function public.equipe_foto_autorizar(p_membro_id uuid,p_clinica_id uuid,p_escrita boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v public.equipe_fotos%rowtype;
begin
  if not public.equipe_recurso_pode(p_membro_id,p_clinica_id,auth.uid(),p_escrita) then raise exception 'Acesso negado' using errcode='42501';end if;
  select * into v from public.equipe_fotos where membro_id=p_membro_id;
  return jsonb_build_object('membro_id',p_membro_id,'clinica_id',p_clinica_id,'caminho',v.caminho,'revisao',coalesce(v.revisao,0),
    'pode_editar',public.equipe_recurso_pode(p_membro_id,p_clinica_id,auth.uid(),true));
end $$;
create function public.equipe_fotos_listar(p_clinica_id uuid)
returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
    or not public.eh_proprietaria(p_clinica_id) or not exists(select 1 from public.clinicas c where c.id=p_clinica_id and c.ativo and c.subdomain in ('brotas','ipupiara'))
    then raise exception 'Acesso negado' using errcode='42501';end if;
  return query select jsonb_build_object('membro_id',m.id,'clinica_id',p_clinica_id,'caminho',f.caminho,'revisao',coalesce(f.revisao,0),
    'pode_editar',public.equipe_recurso_pode(m.id,p_clinica_id,auth.uid(),true))
    from public.equipe_membros m join public.equipe_membros_clinicas ec on ec.membro_id=m.id
    left join public.equipe_fotos f on f.membro_id=m.id
    where m.ativo and ec.ativo and ec.clinica_id=p_clinica_id;
end $$;
create function public.equipe_foto_objeto_autorizado(p_caminho text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_clinica uuid;v_membro uuid;
begin
  if p_caminho !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' then return false;end if;
  v_clinica:=nullif(current_setting('request.headers',true),'')::jsonb->>'x-clinica-id';
  v_membro:=split_part(p_caminho,'/',1)::uuid;
  return public.equipe_recurso_pode(v_membro,v_clinica,auth.uid(),false)
    and exists(select 1 from public.equipe_fotos f where f.membro_id=v_membro and f.caminho=p_caminho);
exception when invalid_text_representation then return false;
end $$;
create policy equipe_fotos_leitura on public.equipe_fotos for select to authenticated
  using(public.equipe_recurso_pode(membro_id,clinica_contexto_id,auth.uid(),false));
-- SELECT só no objeto confirmado; nenhuma política INSERT/UPDATE/DELETE para o cliente.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('equipe-fotos','equipe-fotos',false,5242880,array['image/jpeg']);
create policy equipe_foto_storage_leitura on storage.objects for select to authenticated
using(bucket_id='equipe-fotos' and public.equipe_foto_objeto_autorizado(name));

create function public.equipe_foto_confirmar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_revisao integer,p_caminho text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.equipe_fotos%rowtype;v_anterior text;
begin
  if auth.role() is distinct from 'service_role' or not public.equipe_recurso_pode(p_membro_id,p_clinica_id,p_ator_id,true) then raise exception 'Acesso negado' using errcode='42501';end if;
  perform 1 from public.equipe_membros where id=p_membro_id for update;
  select * into v from public.equipe_fotos where membro_id=p_membro_id;
  if p_revisao is null or coalesce(v.revisao,0)<>p_revisao then raise exception 'Conflito de revisão' using errcode='40001';end if;
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
-- Fail-safe cleanup: unknown commit outcome never deletes the current confirmed image.
-- Candidates expire before cleanup eligibility. The same member lock serializes
-- cleanup proof with confirmation, so a delayed commit cannot adopt an expired file.
create function public.equipe_foto_temporarias_expiradas(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid)
returns setof text language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' or not public.equipe_recurso_pode(p_membro_id,p_clinica_id,p_ator_id,true) then raise exception 'Acesso negado' using errcode='42501';end if;
  perform 1 from public.equipe_membros where id=p_membro_id for update;
  return query select o.name from storage.objects o where o.bucket_id='equipe-fotos'
    and o.name ~ ('^'||p_membro_id::text||'/[0-9a-f-]{36}\.jpg$')
    and o.created_at<clock_timestamp()-interval '30 minutes'
    and not exists(select 1 from public.equipe_fotos f where f.caminho=o.name)
    order by o.created_at limit 50;
end $$;
create function public.equipe_foto_pode_descartar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_caminho text)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.role()='service_role' and public.equipe_recurso_pode(p_membro_id,p_clinica_id,p_ator_id,true)
    and p_caminho ~ ('^'||p_membro_id::text||'/[0-9a-f-]{36}\.jpg$')
    and not exists(select 1 from public.equipe_fotos where caminho=p_caminho);
$$;

create function public.equipe_recebimento_cifrar(p_dados jsonb)
returns bytea language plpgsql security definer set search_path='' as $$
declare v_chave text;
begin
  select decrypted_secret into v_chave from vault.decrypted_secrets where name='cpf_key';
  if nullif(v_chave,'') is null then raise exception 'Proteção indisponível' using errcode='55000';end if;
  return extensions.pgp_sym_encrypt(p_dados::text,v_chave,'cipher-algo=aes256,compress-algo=1');
end $$;
create function public.equipe_recebimento_decifrar(p_dados bytea)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_chave text;
begin
  if p_dados is null then return null;end if;
  select decrypted_secret into v_chave from vault.decrypted_secrets where name='cpf_key';
  if nullif(v_chave,'') is null then raise exception 'Proteção indisponível' using errcode='55000';end if;
  return extensions.pgp_sym_decrypt(p_dados,v_chave)::jsonb;
end $$;
create function public.equipe_recebimento_mascarar(p_dados jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare v jsonb:=p_dados;k text[];t text;
begin
  if v is null then return null;end if;
  foreach k slice 1 in array array[['pix','chave'],['conta','agencia'],['conta','digitoAgencia'],['conta','numero'],['conta','digitoConta'],['favorecido','documento']] loop
    t:=v#>>k;if nullif(t,'') is not null then v:=jsonb_set(v,k,to_jsonb('••••'||right(t,2)));end if;
  end loop;
  return v;
end $$;
create function public.equipe_recebimento_interno(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_prof uuid;v public.profissionais_recebimento%rowtype;
begin
  if not public.equipe_recurso_pode(p_membro_id,p_clinica_id,p_ator_id,false) then raise exception 'Acesso negado' using errcode='42501';end if;
  select m.profissional_id into v_prof from public.equipe_membros m join public.profissionais p on p.id=m.profissional_id
    join public.profissionais_clinicas pc on pc.profissional_id=p.id and pc.clinica_id=p_clinica_id and pc.ativo
    where m.id=p_membro_id and m.tipo='profissional_saude' and p.ativo;
  if v_prof is null then raise exception 'Acesso negado' using errcode='42501';end if;
  select * into v from public.profissionais_recebimento where profissional_id=v_prof and clinica_id=p_clinica_id;
  return jsonb_build_object('membro_id',p_membro_id,'profissional_id',v_prof,'clinica_id',p_clinica_id,
    'revisao',coalesce(v.revisao,0),'dados',public.equipe_recebimento_decifrar(v.dados_encrypted));
end $$;
create function public.equipe_recebimento_obter(p_membro_id uuid,p_clinica_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v jsonb;
begin
  v:=public.equipe_recebimento_interno(p_membro_id,p_clinica_id,auth.uid());
  return jsonb_set(v,'{dados}',coalesce(public.equipe_recebimento_mascarar(v->'dados'),'null'::jsonb));
end $$;
create policy recebimento_leitura on public.profissionais_recebimento for select to authenticated
using(exists(select 1 from public.equipe_membros m where m.profissional_id=profissionais_recebimento.profissional_id
  and public.equipe_recurso_pode(m.id,clinica_id,auth.uid(),false)));
create function public.equipe_recebimento_salvar(p_membro_id uuid,p_clinica_id uuid,p_ator_id uuid,p_revisao integer,p_dados jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;v_prof uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Acesso negado' using errcode='42501';end if;
  v:=public.equipe_recebimento_interno(p_membro_id,p_clinica_id,p_ator_id);v_prof:=(v->>'profissional_id')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_prof::text||':'||p_clinica_id::text,0));
  v:=public.equipe_recebimento_interno(p_membro_id,p_clinica_id,p_ator_id);
  if p_revisao is null or (v->>'revisao')::integer<>p_revisao then raise exception 'Conflito de revisão' using errcode='40001';end if;
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

create function public.equipe_recurso_auditar()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_clinica uuid;v_id text;v_novo jsonb;v_ant jsonb;v_campos text[]:=array[]::text[];g text;c text;
begin
  if tg_table_name='equipe_fotos' then
    v_clinica:=new.clinica_contexto_id;v_id:=new.membro_id::text;v_campos:=array['foto'];
  else
    v_clinica:=new.clinica_id;v_id:=new.profissional_id::text;
    v_novo:=public.equipe_recebimento_decifrar(new.dados_encrypted);
    if tg_op='UPDATE' then v_ant:=public.equipe_recebimento_decifrar(old.dados_encrypted);end if;
    if v_novo->'preferencia' is distinct from v_ant->'preferencia' then v_campos:=array_append(v_campos,'preferencia');end if;
    foreach g in array array['pix','conta','favorecido'] loop
      if jsonb_typeof(v_novo->g)='object' then
        for c in select jsonb_object_keys(v_novo->g) loop
          if v_novo->g->c is distinct from v_ant->g->c then v_campos:=array_append(v_campos,g||'.'||c);end if;
        end loop;
      elsif v_novo->g is distinct from v_ant->g then v_campos:=array_append(v_campos,g);end if;
    end loop;
  end if;
  insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois)
    values(v_clinica,new.updated_by,tg_op::public.acao_auditoria,tg_table_name,v_id,
      jsonb_build_object('campos_alterados',v_campos,'revisao',new.revisao));
  return new;
end $$;
create trigger equipe_foto_auditoria after insert or update on public.equipe_fotos for each row execute function public.equipe_recurso_auditar();
create trigger equipe_recebimento_auditoria after insert or update on public.profissionais_recebimento for each row execute function public.equipe_recurso_auditar();

revoke all on function public.equipe_recurso_pode(uuid,uuid,uuid,boolean),public.equipe_recebimento_cifrar(jsonb),
  public.equipe_recebimento_decifrar(bytea),public.equipe_recebimento_mascarar(jsonb),public.equipe_recurso_auditar(),
  public.equipe_foto_confirmar(uuid,uuid,uuid,integer,text),public.equipe_foto_pode_descartar(uuid,uuid,uuid,text),
  public.equipe_foto_temporarias_expiradas(uuid,uuid,uuid),
  public.equipe_recebimento_interno(uuid,uuid,uuid),public.equipe_recebimento_salvar(uuid,uuid,uuid,integer,jsonb)
  from public,anon,authenticated;
grant execute on function public.equipe_foto_confirmar(uuid,uuid,uuid,integer,text),public.equipe_foto_pode_descartar(uuid,uuid,uuid,text),
  public.equipe_foto_temporarias_expiradas(uuid,uuid,uuid),
  public.equipe_recebimento_interno(uuid,uuid,uuid),public.equipe_recebimento_salvar(uuid,uuid,uuid,integer,jsonb) to service_role;
revoke all on function public.equipe_fotos_listar(uuid),public.equipe_foto_autorizar(uuid,uuid,boolean),
  public.equipe_foto_objeto_autorizado(text),public.equipe_recebimento_obter(uuid,uuid) from public,anon;
grant execute on function public.equipe_fotos_listar(uuid),public.equipe_foto_autorizar(uuid,uuid,boolean),
  public.equipe_foto_objeto_autorizado(text),public.equipe_recebimento_obter(uuid,uuid) to authenticated;
commit;
