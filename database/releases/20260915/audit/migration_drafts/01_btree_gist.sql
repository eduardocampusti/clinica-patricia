-- RASCUNHO: extensões exigidas pela baseline. Executar antes de 02.
-- pgcrypto precisa ficar em extensions porque a baseline usa extensions.hmac e
-- extensions.pgp_sym_encrypt; btree_gist suporta a EXCLUDE GiST da Agenda.

begin;

do $$
begin
  if not has_database_privilege(current_user, current_database(), 'CREATE') then
    raise exception 'Executor % não possui CREATE no banco para instalar extensões.', current_user;
  end if;
  if not exists (select 1 from pg_namespace where nspname = 'extensions') then
    raise exception 'Schema extensions ausente.';
  end if;
end;
$$;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

do $$
begin
  if not exists (
    select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto' and n.nspname = 'extensions'
  ) then
    raise exception 'pgcrypto precisa estar instalado no schema extensions.';
  end if;
  if not exists (
    select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'btree_gist' and n.nspname = 'extensions'
  ) then
    raise exception 'btree_gist precisa estar instalado no schema extensions.';
  end if;
  if to_regprocedure('extensions.hmac(text,text,text)') is null
     or to_regprocedure('extensions.pgp_sym_encrypt(text,text)') is null then
    raise exception 'Funções pgcrypto esperadas não estão disponíveis em extensions.';
  end if;
end;
$$;

commit;
