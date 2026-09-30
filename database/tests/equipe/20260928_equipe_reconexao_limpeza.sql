\set ON_ERROR_STOP on
begin;
do $$
begin
  if (select count(*) from public.equipe_idempotencia
      where chave between '10000000-0000-0000-0000-000000000001' and '10000000-0000-0000-0000-000000000003')<>3 then
    raise exception 'Falha: dados não persistiram após nova conexão';
  end if;
  if (select count(*) from public.equipe_membros_clinicas ec join public.equipe_idempotencia i on i.membro_id=ec.membro_id
      where i.chave='10000000-0000-0000-0000-000000000002')<>2
     or exists(select 1 from public.equipe_membros_clinicas ec join public.equipe_idempotencia i on i.membro_id=ec.membro_id
      where i.chave='10000000-0000-0000-0000-000000000002'
        and ec.clinica_id='80543c56-328d-400d-89a0-bd6d9352d9c5' and ec.ativo) then
    raise exception 'Falha: estados dos vínculos não persistiram';
  end if;
end $$;

create temporary table tmp_equipe_profissionais as
  select profissional_id from public.equipe_membros
  where nome_completo in('Teste Médica Equipe','Teste Profissional Legado') and profissional_id is not null;
-- Auditoria é append-only por desenho. Os eventos sintéticos permanecem apenas
-- nesta instância descartável e não contêm CPF, hash ou ciphertext.
delete from public.profissionais_clinicas where profissional_id in(
  select profissional_id from public.equipe_membros where id in(
    select membro_id from public.equipe_idempotencia where chave::text like '10000000-%'));
delete from public.profissionais_clinicas where profissional_id in(select profissional_id from tmp_equipe_profissionais);
delete from public.equipe_membros_clinicas where membro_id in(
  select membro_id from public.equipe_idempotencia where chave::text like '10000000-%');
delete from public.equipe_idempotencia where chave::text like '10000000-%';
delete from public.equipe_membros_clinicas where membro_id in(
  select id from public.equipe_membros where nome_completo='Teste Profissional Legado');
delete from public.equipe_membros where nome_completo in('Teste Recepção Equipe','Teste Apoio Duas Clínicas','Teste Médica Equipe','Teste Profissional Legado');
delete from public.profissionais where id in(select profissional_id from tmp_equipe_profissionais);
delete from public.usuarios_clinicas where usuario_id='90000000-0000-0000-0000-000000000001';
delete from public.usuarios where id='90000000-0000-0000-0000-000000000001';
delete from auth.users where id='90000000-0000-0000-0000-000000000001';
commit;
\echo 'EQUIPE: persistencia apos reconexao passou; dados ficticios removidos'
