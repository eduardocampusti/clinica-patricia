\set ON_ERROR_STOP on
create or replace function public.equipe_teste_pausa_concorrencia()
returns trigger language plpgsql set search_path='' as $$
begin
  if current_setting('test.equipe_concorrencia',true)='on'
     and new.id=current_setting('test.equipe_membro',true)::uuid then
    perform pg_catalog.pg_advisory_xact_lock(11032026);
    perform pg_catalog.pg_sleep(5);
  end if;
  return new;
end $$;
