-- Aplicado manualmente em 08/10/2026 via SQL Editor autorizado do projeto
-- xftnkusbyqzyvzrovroj. Objetos confirmados por catálogo. Não reaplicar no alvo.
-- CLI de migrations não executado; este arquivo conserva o SQL aplicado.
begin;
alter table public.usuarios add column perfil_foto_path text,
  add column perfil_revisao bigint not null default 0;
alter table public.usuarios add constraint usuarios_perfil_revisao_valida
  check (perfil_revisao between 0 and 9007199254740991);
alter table public.usuarios add constraint usuarios_perfil_foto_propria check (
  perfil_foto_path is null or perfil_foto_path ~ (
    '^'||id::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'));

-- Não muda grants existentes, papéis ou vínculos. Os campos novos não aceitam
-- UPDATE direto de clientes; alteração do nome sempre avança a revisão.
create function public.meu_perfil_proteger_colunas() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then
    if (new.perfil_foto_path is not null or new.perfil_revisao<>0)
      and coalesce(auth.role(),'') <> 'service_role' then
      raise exception using errcode='42501',message='Use o serviço de perfil pessoal';
    end if;
    return new;
  end if;
  if (new.perfil_foto_path is distinct from old.perfil_foto_path or new.perfil_revisao is distinct from old.perfil_revisao)
    and coalesce(auth.role(),'') <> 'service_role' then
    raise exception using errcode='42501',message='Use o serviço de perfil pessoal';
  end if;
  if new.nome_completo is distinct from old.nome_completo or new.perfil_foto_path is distinct from old.perfil_foto_path then
    new.perfil_revisao:=old.perfil_revisao+1;
  end if;
  return new;
end $$;
create trigger usuarios_meu_perfil_proteger before insert or update on public.usuarios
for each row execute function public.meu_perfil_proteger_colunas();

create function public.meu_perfil_consultar() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.usuarios;
begin
  if auth.uid() is null or not public.usuario_tem_vinculo_ativo() then
    raise exception using errcode='42501',message='Conta não autorizada';
  end if;
  select * into v from public.usuarios where id=auth.uid() and ativo;
  if not found then raise exception using errcode='42501',message='Conta indisponível'; end if;
  return jsonb_build_object('versao',1,'usuario_id',v.id,'nome',v.nome_completo,
    'foto_caminho',v.perfil_foto_path,'revisao',v.perfil_revisao);
end $$;
revoke all on function public.meu_perfil_consultar() from public,anon;
grant execute on function public.meu_perfil_consultar() to authenticated;

create function public.meu_perfil_salvar_interno(p_ator_id uuid,p_nome text,p_foto_caminho text,p_revisao bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.usuarios; v_nome text:=btrim(regexp_replace(p_nome,'\s+',' ','g'));
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode='42501',message='Serviço obrigatório';
  end if;
  if p_ator_id is null or p_revisao is null or p_revisao<0 or v_nome is null or length(v_nome) not between 1 and 120
    or v_nome ~ '[[:cntrl:]]' then raise exception using errcode='22023',message='Perfil inválido'; end if;
  select * into v from public.usuarios where id=p_ator_id and ativo for update;
  if not found or not exists(select 1 from public.usuarios_clinicas where usuario_id=p_ator_id and ativo) then
    raise exception using errcode='42501',message='Conta não autorizada';
  end if;
  if v.perfil_revisao<>p_revisao then raise exception using errcode='40001',message='Perfil alterado'; end if;
  if p_foto_caminho is not null and (p_foto_caminho !~ ('^'||p_ator_id::text||'/[0-9a-f-]{36}\.jpg$')
    or not exists(select 1 from storage.objects where bucket_id='contas-fotos' and name=p_foto_caminho)) then
    raise exception using errcode='22023',message='Foto inválida';
  end if;
  update public.usuarios set nome_completo=v_nome,perfil_foto_path=p_foto_caminho,
    perfil_revisao=p_revisao+1 where id=p_ator_id returning * into v;
  -- Preflight deve comprovar clinica_id nullable e enum UPDATE. Sem valores pessoais no log.
  insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois)
    values(null,p_ator_id,'UPDATE','usuarios',p_ator_id::text,jsonb_build_object('campos',jsonb_build_array('nome_completo','perfil_foto_path'),'revisao',v.perfil_revisao));
  return jsonb_build_object('versao',1,'usuario_id',v.id,'nome',v.nome_completo,
    'foto_caminho',v.perfil_foto_path,'revisao',v.perfil_revisao);
end $$;
revoke all on function public.meu_perfil_salvar_interno(uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function public.meu_perfil_salvar_interno(uuid,text,text,bigint) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('contas-fotos','contas-fotos',false,5242880,array['image/jpeg']);
create policy contas_fotos_propria_atual on storage.objects for select to authenticated using (
  bucket_id='contas-fotos' and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo and u.perfil_foto_path=name)
  and public.usuario_tem_vinculo_ativo());
-- Nenhuma policy INSERT/UPDATE/DELETE para clientes. Upload somente pelo servidor,
-- após validar/decodificar/reencodar. Nunca getPublicUrl nem signed URL persistida.
commit;
