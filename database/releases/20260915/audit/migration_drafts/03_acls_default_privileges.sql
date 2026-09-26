-- RASCUNHO: normaliza os DEFAULT ACLs JÁ REGISTRADOS para postgres, dono dos
-- objetos desta cadeia. Não é retroativo para ACLs de objetos existentes.
-- Limitação documentada: o executor local postgres não é membro de
-- supabase_admin; defaults desse papel permanecem sob controle da plataforma
-- e cada objeto que ele criar deve receber GRANT explícito em sua migration.

begin;

do $$
declare v_superuser boolean;
begin
  select rolsuper into v_superuser from pg_roles where rolname = current_user;
  if not coalesce(v_superuser, false)
     and not pg_has_role(current_user, 'postgres', 'member') then
    raise exception 'Executor precisa ser superusuário ou membro de postgres para ajustar seus default privileges.';
  end if;
end;
$$;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on tables to service_role;
alter default privileges for role postgres in schema public grant usage, select on sequences to service_role;

commit;
