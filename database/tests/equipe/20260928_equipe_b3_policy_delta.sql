\set ON_ERROR_STOP on
begin;
create or replace function public.equipe_pode_editar_profissional_global(p_profissional_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
    and exists(select 1 from public.profissionais_clinicas pc where pc.profissional_id=p_profissional_id)
    and not exists(select 1 from public.profissionais_clinicas pc
      where pc.profissional_id=p_profissional_id and not public.eh_proprietaria(pc.clinica_id));
$$;
drop policy if exists profissionais_update on public.profissionais;
create policy profissionais_update on public.profissionais for update to authenticated
using (public.equipe_pode_editar_profissional_global(id))
with check (public.equipe_pode_editar_profissional_global(id));
revoke all on function public.equipe_pode_editar_profissional_global(uuid) from public,anon,authenticated;
grant execute on function public.equipe_pode_editar_profissional_global(uuid) to authenticated;
commit;
