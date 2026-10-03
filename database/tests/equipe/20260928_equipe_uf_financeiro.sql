\set ON_ERROR_STOP on
\echo 'EQUIPE B2 pontual: UF efetivamente persistida, rota legada e campos financeiros'

begin;
select id as especialidade_id from public.especialidades order by nome limit 1 \gset

-- Fixtures inteiramente sintéticas; o rollback ao final remove tudo.
insert into public.profissionais(
  id,nome_completo,conselho_classe,registro_conselho,conselho_uf,
  especialidade_principal_id,created_by
) values
  ('b2200000-0000-0000-0000-000000000001','B2 UF BA','CRM','UF-ALTERACAO','BA',:'especialidade_id','8792e28b-faf6-41fd-9d89-a84a453f0137'),
  ('b2200000-0000-0000-0000-000000000002','B2 UF SP','CRM','UF-ALTERACAO','SP',:'especialidade_id','8792e28b-faf6-41fd-9d89-a84a453f0137');

insert into public.profissionais_clinicas(profissional_id,clinica_id,created_by)
values
  ('b2200000-0000-0000-0000-000000000001','7c2a450d-7b9a-4701-8d5a-982eda331c58','8792e28b-faf6-41fd-9d89-a84a453f0137'),
  ('b2200000-0000-0000-0000-000000000002','7c2a450d-7b9a-4701-8d5a-982eda331c58','8792e28b-faf6-41fd-9d89-a84a453f0137');

do $$
begin
  if (select count(*) from public.equipe_membros where registro_conselho='UF-ALTERACAO') <> 2
     or (select count(*) from public.equipe_membros where registro_conselho='UF-ALTERACAO' and conselho_uf in ('BA','SP')) <> 2 then
    raise exception 'Falha: UFs BA/SP não foram projetadas';
  end if;
end $$;

-- UPDATE sem mencionar conselho_uf preserva a UF que NEW efetivamente carrega.
update public.profissionais
set nome_completo='B2 UF BA — nome preservado'
where id='b2200000-0000-0000-0000-000000000001';
do $$
begin
  if (select conselho_uf from public.profissionais where id='b2200000-0000-0000-0000-000000000001') <> 'BA'
     or (select conselho_uf from public.equipe_membros where profissional_id='b2200000-0000-0000-0000-000000000001') <> 'BA' then
    raise exception 'Falha: edição de nome perdeu UF BA';
  end if;
end $$;

-- UPDATE explícito para NULL deve validar NULL, detectar a outra UF e abortar.
do $$
declare bloqueou boolean:=false;
begin
  begin
    update public.profissionais set conselho_uf=null
    where id='b2200000-0000-0000-0000-000000000001';
  exception when unique_violation then bloqueou:=true;
  end;
  if not bloqueou then raise exception 'Falha: remoção de UF ambígua foi aceita'; end if;
  if (select conselho_uf from public.profissionais where id='b2200000-0000-0000-0000-000000000001') <> 'BA' then
    raise exception 'Falha: rollback não preservou UF BA';
  end if;
end $$;

-- Uma terceira pessoa com a mesma identidade e BA deve ser rejeitada.
do $$
declare bloqueou boolean:=false;
begin
  begin
    insert into public.profissionais(
      id,nome_completo,conselho_classe,registro_conselho,conselho_uf,created_by
    ) values ('b2200000-0000-0000-0000-000000000003','B2 UF duplicada','CRM','UF-ALTERACAO','BA',
      '8792e28b-faf6-41fd-9d89-a84a453f0137');
  exception when unique_violation then bloqueou:=true;
  end;
  if not bloqueou then raise exception 'Falha: duplicata verdadeira foi aceita'; end if;
end $$;

-- A RPC legada não possui parâmetro de UF: a criação permanece compatível e começa sem UF.
set local role authenticated;
select set_config('request.jwt.claim.sub','8792e28b-faf6-41fd-9d89-a84a453f0137',true);
select public.cadastrar_profissional(
  'B2 Profissional Legado',null,'CRM','UF-ROTA-LEGADA',:'especialidade_id',
  '7c2a450d-7b9a-4701-8d5a-982eda331c58',150,25,45
);
reset role;
do $$
begin
  if not exists(select 1 from public.equipe_membros where profissional_id=(select id from public.profissionais where nome_completo='B2 Profissional Legado') and conselho_uf is null)
     or not exists(select 1 from public.equipe_membros_clinicas where membro_id=(select id from public.equipe_membros where profissional_id=(select id from public.profissionais where nome_completo='B2 Profissional Legado'))) then
    raise exception 'Falha: criação/vinculação legada não foi projetada';
  end if;
end $$;

-- Atualização financeira existente continua independente dos gatilhos de identidade.
update public.profissionais
set valor_consulta=200,taxa_repasse_clinica=30,duracao_consulta_minutos=50
where id=(select id from public.profissionais where nome_completo='B2 Profissional Legado');
do $$
begin
  if not exists(select 1 from public.profissionais where id=(select id from public.profissionais where nome_completo='B2 Profissional Legado')
    and valor_consulta=200 and taxa_repasse_clinica=30 and duracao_consulta_minutos=50) then
    raise exception 'Falha: campos financeiros não persistiram após migration';
  end if;
end $$;

rollback;
\echo 'EQUIPE B2 pontual: PASS'
