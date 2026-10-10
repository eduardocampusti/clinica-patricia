-- APENAS laboratório descartável em PostgreSQL local. Auth/Vault simulados.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create schema vault;
create table vault.decrypted_secrets(name text primary key,decrypted_secret text);
create schema extensions;
create extension pgcrypto with schema extensions;
create extension btree_gist with schema extensions;
