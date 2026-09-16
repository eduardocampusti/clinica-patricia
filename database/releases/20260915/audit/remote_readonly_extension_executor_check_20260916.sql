-- Consulta de catálogo exclusivamente para confirmar a capacidade do executor
-- de relocar btree_gist. Não consulta dados clínicos, Vault ou segredos.
begin transaction read only;

select
  current_user as executor,
  r.rolsuper as executor_is_superuser,
  e.extname,
  owner_role.rolname as extension_owner,
  e.extrelocatable,
  pg_has_role(current_user, e.extowner, 'member') as executor_is_extension_owner_or_member,
  has_database_privilege(current_user, current_database(), 'create') as executor_has_database_create
from pg_extension e
join pg_roles owner_role on owner_role.oid = e.extowner
join pg_roles r on r.rolname = current_user
where e.extname = 'btree_gist';

commit;
