\set ON_ERROR_STOP on
\echo 'EQUIPE B1-B3: preparacao e testes dirigidos'
begin;
select id as especialidade_id from public.especialidades order by nome limit 1 \gset

set local role authenticated;
select set_config('request.jwt.claim.sub','8792e28b-faf6-41fd-9d89-a84a453f0137',true);

-- Fixture válida com opcionais nulos: comprova que B1 não tornou CPF obrigatório.
select public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
  jsonb_build_object('nome_completo','Teste B1 Apoio','cargo','Serviços gerais','tipo','apoio','profissao',null,
    'cpf_modo','remover','cpf',null,'telefone',null,'email_contato',null,'conselho_classe',null,
    'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
    'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58')),
  'b1000000-0000-0000-0000-000000000001') as apoio_id \gset
select set_config('test.b1_apoio_id',:'apoio_id',false);

-- B1: nulls JSON e tipos incorretos falham antes da idempotência/gravação.
do $$
declare
  base jsonb:=jsonb_build_object('nome_completo','Teste B1 Inválido','cargo','Serviços gerais','tipo','apoio',
    'profissao',null,'cpf_modo','substituir','cpf','52998224725','telefone',null,'email_contato',null,
    'conselho_classe',null,'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
    'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58'));
  bloqueou boolean;
  caso jsonb;
  chave uuid;
begin
  foreach caso in array array[
    jsonb_set(base,'{cpf_modo}','null'::jsonb),
    jsonb_set(base,'{tipo}','null'::jsonb),
    jsonb_set(base,'{nome_completo}','{}'::jsonb),
    jsonb_set(base,'{cargo}','42'::jsonb),
    jsonb_set(base,'{telefone}','true'::jsonb)
  ] loop
    chave:=gen_random_uuid(); bloqueou:=false;
    begin
      perform public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,caso,chave);
    exception when invalid_parameter_value then bloqueou:=true; end;
    if not bloqueou then raise exception 'B1 falhou: payload inválido foi aceito'; end if;
  end loop;
end $$;

do $$
declare bloqueou boolean:=false;
begin
  begin
    perform public.equipe_salvar(current_setting('test.b1_apoio_id')::uuid,
      '7c2a450d-7b9a-4701-8d5a-982eda331c58',1,
      jsonb_build_object('nome_completo','Teste B1 Apoio','cargo','Serviços gerais','tipo',null,'profissao',null,
        'cpf_modo','preservar','cpf',null,'telefone',null,'email_contato',null,'conselho_classe',null,
        'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
        'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58')),null);
  exception when invalid_parameter_value then bloqueou:=true; end;
  if not bloqueou then raise exception 'B1 falhou: tipo null foi aceito na edição'; end if;
end $$;

-- B2: mesmo conselho/número em UFs conhecidas distintas é permitido.
select public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
  jsonb_build_object('nome_completo','Teste B2 Profissional BA','cargo','Médico(a)','tipo','profissional_saude',
    'profissao','Medicina','cpf_modo','remover','cpf',null,'telefone',null,'email_contato',null,
    'conselho_classe','CRM','registro_conselho','B2-2026','conselho_uf','BA','especialidade_id',:'especialidade_id',
    'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58','80543c56-328d-400d-89a0-bd6d9352d9c5')),
  'b2000000-0000-0000-0000-000000000001') as ba_id \gset
select public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
  jsonb_build_object('nome_completo','Teste B2 Profissional SP','cargo','Médico(a)','tipo','profissional_saude',
    'profissao','Medicina','cpf_modo','remover','cpf',null,'telefone',null,'email_contato',null,
    'conselho_classe','CRM','registro_conselho','B2-2026','conselho_uf','SP','especialidade_id',:'especialidade_id',
    'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58','80543c56-328d-400d-89a0-bd6d9352d9c5')),
  'b2000000-0000-0000-0000-000000000002') as sp_id \gset
reset role;
select profissional_id as ba_prof_id from public.equipe_membros where id=:'ba_id' \gset

-- A rota legada autorizada altera apenas o nome e deve preservar a UF BA.
set local role authenticated;
select set_config('request.jwt.claim.sub','8792e28b-faf6-41fd-9d89-a84a453f0137',true);
update public.profissionais set nome_completo='Teste B2 Nome Legado BA' where id=:'ba_prof_id';
reset role;
do $$
begin
  if not exists(select 1 from public.equipe_membros
    where nome_completo='Teste B2 Nome Legado BA' and conselho_uf='BA') then
    raise exception 'B2 falhou: edição de nome não preservou a UF conhecida';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','8792e28b-faf6-41fd-9d89-a84a453f0137',true);
do $$
declare bloqueou boolean:=false;
begin
  begin
    perform public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
      jsonb_build_object('nome_completo','Teste B2 Duplicata BA','cargo','Médico(a)','tipo','profissional_saude',
        'profissao','Medicina','cpf_modo','remover','cpf',null,'telefone',null,'email_contato',null,
        'conselho_classe','CRM','registro_conselho','B2-2026','conselho_uf','BA','especialidade_id',null,
        'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58')),
      'b2000000-0000-0000-0000-000000000003');
  exception when unique_violation then bloqueou:=true; end;
  if not bloqueou then raise exception 'B2 falhou: duplicata da mesma UF foi aceita'; end if;
end $$;
reset role;

-- B3: uma proprietária fictícia somente de Brotas não pode editar identidade compartilhada.
insert into auth.users(id) values('93000000-0000-0000-0000-000000000001') on conflict do nothing;
insert into public.usuarios(id,nome_completo,ativo)
values('93000000-0000-0000-0000-000000000001','Teste B3 Proprietária Parcial',true);
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo)
values('93000000-0000-0000-0000-000000000001','7c2a450d-7b9a-4701-8d5a-982eda331c58','proprietaria',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-0000-0000-000000000001',true);
with alteradas as (
  update public.profissionais set nome_completo='B3 alteração proibida' where id=:'ba_prof_id' returning id
) select count(*) as alteracoes_parciais from alteradas \gset
reset role;
select set_config('test.b3_alteracoes',:'alteracoes_parciais',false);
select set_config('test.b3_prof_id',:'ba_prof_id',false);
do $$
begin
  if current_setting('test.b3_alteracoes')::integer<>0 then raise exception 'B3 falhou: policy legada aceitou autoridade parcial'; end if;
  if exists(select 1 from public.profissionais where id=current_setting('test.b3_prof_id')::uuid and nome_completo='B3 alteração proibida') then
    raise exception 'B3 falhou: identidade foi alterada';
  end if;
end $$;

-- Barreira de teste: a chamada real da Equipe segura os locks por alguns segundos.
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
create trigger equipe_teste_pausa before update on public.equipe_membros
for each row execute function public.equipe_teste_pausa_concorrencia();

commit;
\echo 'EQUIPE B1-B3: setup concluido; fixtures mantidas para duas conexoes'
