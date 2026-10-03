-- Pacientes: foto opcional em Storage privado, isolada por clínica e paciente.
-- A migration não torna o bucket público e não concede acesso a médicos/laboratório.

begin;

create or replace function public.paciente_foto_clinica_requisicao()
returns uuid
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_headers text := nullif(current_setting('request.headers', true), '');
  v_header text;
begin
  if v_headers is not null then
    v_header := nullif(v_headers::jsonb ->> 'x-clinica-id', '');
    if v_header ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      return v_header::uuid;
    end if;
  end if;
  return null;
exception
  when invalid_text_representation then
    return null;
end;
$$;

alter table public.pacientes
  add column if not exists foto_path text;

alter table public.pacientes
  drop constraint if exists pacientes_foto_path_check;
alter table public.pacientes
  add constraint pacientes_foto_path_check check (
    foto_path is null
    or foto_path ~* '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pacientes-fotos',
  'pacientes-fotos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.paciente_foto_objeto_autorizado(p_object_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  v_pastas text[] := storage.foldername(p_object_path);
  v_clinica_id uuid;
  v_paciente_id uuid;
begin
  if auth.uid() is null
     or coalesce(array_length(v_pastas, 1), 0) <> 2
     or v_pastas[1] !~* '^[0-9a-f-]{36}$'
     or v_pastas[2] !~* '^[0-9a-f-]{36}$'
     or storage.filename(p_object_path) !~* '^[0-9a-f-]{36}\.(jpg|png|webp)$' then
    return false;
  end if;

  v_clinica_id := v_pastas[1]::uuid;
  v_paciente_id := v_pastas[2]::uuid;

  return public.paciente_foto_clinica_requisicao() = v_clinica_id
     and public.eh_proprietaria_ou_recepcao(v_clinica_id)
     and exists (
       select 1 from public.clinicas c
       where c.id = v_clinica_id and c.ativo
     )
     and exists (
       select 1 from public.pacientes p
       where p.id = v_paciente_id and p.clinica_id = v_clinica_id
     );
exception
  when invalid_text_representation then
    return false;
end;
$$;

drop policy if exists pacientes_fotos_select on storage.objects;
create policy pacientes_fotos_select
on storage.objects for select to authenticated
using (
  bucket_id = 'pacientes-fotos'
  and public.paciente_foto_objeto_autorizado(name)
);

drop policy if exists pacientes_fotos_insert on storage.objects;
create policy pacientes_fotos_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pacientes-fotos'
  and public.paciente_foto_objeto_autorizado(name)
);

drop policy if exists pacientes_fotos_delete on storage.objects;
create policy pacientes_fotos_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'pacientes-fotos'
  and public.paciente_foto_objeto_autorizado(name)
);

create or replace function public.paciente_definir_foto(
  p_paciente_id uuid,
  p_clinica_id uuid,
  p_object_path text
)
returns text
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  v_path_anterior text;
  v_prefixo text := p_clinica_id::text || '/' || p_paciente_id::text || '/';
begin
  if auth.uid() is null
     or public.paciente_foto_clinica_requisicao() is distinct from p_clinica_id
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not exists (select 1 from public.clinicas c where c.id = p_clinica_id and c.ativo) then
    raise exception 'Sem permissão para alterar a foto nesta clínica.' using errcode = '42501';
  end if;

  if p_object_path not like v_prefixo || '%'
     or not public.paciente_foto_objeto_autorizado(p_object_path)
     or not exists (
       select 1 from storage.objects o
       where o.bucket_id = 'pacientes-fotos' and o.name = p_object_path
     ) then
    raise exception 'Arquivo de foto inválido ou ausente.' using errcode = '22023';
  end if;

  select p.foto_path into v_path_anterior
  from public.pacientes p
  where p.id = p_paciente_id and p.clinica_id = p_clinica_id
  for update;
  if not found then
    raise exception 'Paciente não encontrado nesta clínica.' using errcode = 'P0002';
  end if;

  update public.pacientes
  set foto_path = p_object_path, updated_at = now()
  where id = p_paciente_id and clinica_id = p_clinica_id;

  return v_path_anterior;
end;
$$;

create or replace function public.paciente_obter_foto(
  p_paciente_id uuid,
  p_clinica_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_object_path text;
begin
  if auth.uid() is null
     or public.paciente_foto_clinica_requisicao() is distinct from p_clinica_id
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not exists (select 1 from public.clinicas c where c.id = p_clinica_id and c.ativo) then
    raise exception 'Sem permissão para consultar a foto nesta clínica.' using errcode = '42501';
  end if;

  select p.foto_path into v_object_path
  from public.pacientes p
  where p.id = p_paciente_id and p.clinica_id = p_clinica_id;
  if not found then
    raise exception 'Paciente não encontrado nesta clínica.' using errcode = 'P0002';
  end if;
  return v_object_path;
end;
$$;

create or replace function public.paciente_remover_foto(
  p_paciente_id uuid,
  p_clinica_id uuid
)
returns text
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  v_path_anterior text;
begin
  if auth.uid() is null
     or public.paciente_foto_clinica_requisicao() is distinct from p_clinica_id
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not exists (select 1 from public.clinicas c where c.id = p_clinica_id and c.ativo) then
    raise exception 'Sem permissão para remover a foto nesta clínica.' using errcode = '42501';
  end if;

  select p.foto_path into v_path_anterior
  from public.pacientes p
  where p.id = p_paciente_id and p.clinica_id = p_clinica_id
  for update;
  if not found then
    raise exception 'Paciente não encontrado nesta clínica.' using errcode = 'P0002';
  end if;

  update public.pacientes
  set foto_path = null, updated_at = now()
  where id = p_paciente_id and clinica_id = p_clinica_id;

  return v_path_anterior;
end;
$$;

revoke execute on function public.paciente_foto_objeto_autorizado(text) from public, anon;
grant execute on function public.paciente_foto_objeto_autorizado(text) to authenticated;

revoke execute on function public.paciente_foto_clinica_requisicao() from public, anon;
grant execute on function public.paciente_foto_clinica_requisicao() to authenticated;

revoke execute on function public.paciente_definir_foto(uuid, uuid, text) from public, anon;
revoke execute on function public.paciente_obter_foto(uuid, uuid) from public, anon;
revoke execute on function public.paciente_remover_foto(uuid, uuid) from public, anon;
grant execute on function public.paciente_definir_foto(uuid, uuid, text) to authenticated;
grant execute on function public.paciente_obter_foto(uuid, uuid) to authenticated;
grant execute on function public.paciente_remover_foto(uuid, uuid) to authenticated;

revoke update (foto_path) on table public.pacientes from anon, authenticated;

do $$
begin
  if (select public from storage.buckets where id = 'pacientes-fotos') then
    raise exception 'O bucket de fotos de pacientes não pode ser público.';
  end if;
  if has_function_privilege('anon', 'public.paciente_definir_foto(uuid,uuid,text)', 'execute')
     or has_function_privilege('anon', 'public.paciente_obter_foto(uuid,uuid)', 'execute')
     or has_function_privilege('anon', 'public.paciente_remover_foto(uuid,uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.paciente_definir_foto(uuid,uuid,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.paciente_obter_foto(uuid,uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.paciente_remover_foto(uuid,uuid)', 'execute')
     or has_column_privilege('authenticated', 'public.pacientes', 'foto_path', 'update') then
    raise exception 'Privilégios de foto de pacientes não foram aplicados corretamente.';
  end if;
end;
$$;

commit;
