\set ON_ERROR_STOP on
set lock_timeout='12s';
set deadlock_timeout='500ms';
do $$
begin
  loop
    exit when not pg_catalog.pg_try_advisory_lock(11032026);
    perform pg_catalog.pg_advisory_unlock(11032026);
    perform pg_catalog.pg_sleep(0.05);
  end loop;
end $$;
select m.profissional_id from public.equipe_idempotencia i
join public.equipe_membros m on m.id=i.membro_id
where i.chave='b2000000-0000-0000-0000-000000000001' \gset
select set_config('request.jwt.claim.sub','8792e28b-faf6-41fd-9d89-a84a453f0137',false);
set role authenticated;
update public.profissionais set nome_completo='Teste B3 Rota Legada Final' where id=:'profissional_id';
reset role;
\echo 'CONEXAO_B_OK'
