\set ON_ERROR_STOP on
begin;
do $$
begin
  if not exists(select 1 from public.equipe_membros m join public.profissionais p on p.id=m.profissional_id
    where m.nome_completo='Teste B3 Rota Legada Final' and p.nome_completo=m.nome_completo
      and m.conselho_uf='BA' and m.telefone='77999993333' and m.revisao>=3) then
    raise exception 'B3 falhou: resultado concorrente não ficou consistente';
  end if;
  if exists(select 1 from public.equipe_idempotencia where chave::text like 'b1000000-%' and membro_id is null) then
    raise exception 'B1 falhou: tentativa inválida persistiu';
  end if;
end $$;
drop trigger equipe_teste_pausa on public.equipe_membros;
drop function public.equipe_teste_pausa_concorrencia();
create temporary table tmp_b_profissionais as
select profissional_id from public.equipe_membros where nome_completo like 'Teste B2%' or nome_completo like 'Teste B3%';
delete from public.profissionais_clinicas where profissional_id in(select profissional_id from tmp_b_profissionais);
delete from public.equipe_membros_clinicas where membro_id in(
  select membro_id from public.equipe_idempotencia where chave::text like 'b1000000-%' or chave::text like 'b2000000-%');
delete from public.equipe_idempotencia where chave::text like 'b1000000-%' or chave::text like 'b2000000-%';
delete from public.equipe_membros where nome_completo='Teste B1 Apoio' or nome_completo like 'Teste B2%' or nome_completo like 'Teste B3%';
delete from public.profissionais where id in(select profissional_id from tmp_b_profissionais);
delete from public.usuarios_clinicas where usuario_id='93000000-0000-0000-0000-000000000001';
delete from public.usuarios where id='93000000-0000-0000-0000-000000000001';
delete from auth.users where id='93000000-0000-0000-0000-000000000001';
commit;
\echo 'EQUIPE B1-B3: concorrencia consistente e fixtures removidas'
