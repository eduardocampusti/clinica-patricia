\set ON_ERROR_STOP on
\echo 'EQUIPE: homologacao isolada iniciada'

begin;
select id as especialidade_id from public.especialidades order by nome limit 1 \gset

-- O backup local contém uma proprietária ativa nas duas clínicas e perfis comuns.
set local role authenticated;
select set_config('request.jwt.claim.sub','8792e28b-faf6-41fd-9d89-a84a453f0137',true);

select public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
  jsonb_build_object(
    'nome_completo','Teste Recepção Equipe','cargo','Recepcionista','tipo','administrativo','profissao',null,
    'cpf_modo','remover','cpf',null,'telefone','77999990001','email_contato','recepcao.equipe@example.invalid',
    'conselho_classe',null,'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
    'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58')
  ),'10000000-0000-0000-0000-000000000001') as recepcao_id \gset

select public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
  jsonb_build_object(
    'nome_completo','Teste Apoio Duas Clínicas','cargo','Serviços gerais','tipo','apoio','profissao',null,
    'cpf_modo','remover','cpf',null,'telefone',null,'email_contato',null,
    'conselho_classe',null,'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
    'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58','80543c56-328d-400d-89a0-bd6d9352d9c5')
  ),'10000000-0000-0000-0000-000000000002') as apoio_id \gset

select public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
  jsonb_build_object(
    'nome_completo','Teste Médica Equipe','cargo','Médico(a)','tipo','profissional_saude','profissao','Medicina',
    'cpf_modo','substituir','cpf','52998224725','telefone',null,'email_contato','medica.equipe@example.invalid',
    'conselho_classe','CRM','registro_conselho','HOMOLOG-2026','conselho_uf','BA',
    'especialidade_id',:'especialidade_id',
    'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58','80543c56-328d-400d-89a0-bd6d9352d9c5')
  ),'10000000-0000-0000-0000-000000000003') as medica_id \gset

select set_config('test.apoio_id',:'apoio_id',false);
select set_config('test.apoio_revisao',public.equipe_detalhar(
  :'apoio_id','7c2a450d-7b9a-4701-8d5a-982eda331c58')->>'revisao',false);

-- Retry idempotente: deve devolver o mesmo cadastro, sem duplicar.
select public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
  jsonb_build_object(
    'nome_completo','Teste Recepção Equipe','cargo','Recepcionista','tipo','administrativo','profissao',null,
    'cpf_modo','remover','cpf',null,'telefone','77999990001','email_contato','recepcao.equipe@example.invalid',
    'conselho_classe',null,'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
    'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58')
  ),'10000000-0000-0000-0000-000000000001')=:'recepcao_id'::uuid as retry_mesmo_id;

do $$
declare bloqueou boolean:=false;
begin
  begin
    perform public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
      jsonb_build_object('nome_completo','Payload diferente','cargo','Recepcionista','tipo','administrativo',
        'profissao',null,'cpf_modo','remover','cpf',null,'telefone',null,'email_contato',null,
        'conselho_classe',null,'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
        'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58')),
      '10000000-0000-0000-0000-000000000001');
  exception when invalid_parameter_value then bloqueou:=true; end;
  if not bloqueou then raise exception 'Falha: chave idempotente aceitou payload diferente'; end if;
end $$;

do $$
declare bloqueou boolean:=false;
begin
  begin
    perform public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
      jsonb_build_object('nome_completo','CPF vazio','cargo','Recepcionista','tipo','administrativo',
        'profissao',null,'cpf_modo','substituir','cpf',null,'telefone',null,'email_contato',null,
        'conselho_classe',null,'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
        'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58')),
      '10000000-0000-0000-0000-000000000004');
  exception when invalid_parameter_value then bloqueou:=true; end;
  if not bloqueou then raise exception 'Falha: substituir CPF vazio foi aceito'; end if;
end $$;

-- Edição real: somente contato deve aparecer na auditoria.
select public.equipe_salvar(:'recepcao_id','7c2a450d-7b9a-4701-8d5a-982eda331c58',1,
  jsonb_build_object(
    'nome_completo','Teste Recepção Equipe','cargo','Recepcionista','tipo','administrativo','profissao',null,
    'cpf_modo','preservar','cpf',null,'telefone','77999990002','email_contato','recepcao.equipe@example.invalid',
    'conselho_classe',null,'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
    'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58')
  ),null);

reset role;

do $$
begin
  if not exists(select 1 from public.auditoria a join public.equipe_membros m on m.id::text=a.entidade_id
      where m.nome_completo='Teste Recepção Equipe' and a.acao='UPDATE'
        and a.dados_depois->'campos_alterados'='["contato"]'::jsonb) then
    raise exception 'Falha: auditoria não registrou apenas o grupo alterado';
  end if;
end $$;

-- A rota antiga de Profissionais continua projetando na central de Equipe.
set local role authenticated;
select set_config('request.jwt.claim.sub','8792e28b-faf6-41fd-9d89-a84a453f0137',true);
select public.cadastrar_profissional(
  'Teste Profissional Legado','11144477735','CRM','LEGADO-HOMOLOG',:'especialidade_id',
  '7c2a450d-7b9a-4701-8d5a-982eda331c58',100,20,30
) as legado_prof_id \gset
reset role;
do $$
begin
  if not exists(select 1 from public.equipe_membros m join public.equipe_membros_clinicas ec on ec.membro_id=m.id
    where m.nome_completo='Teste Profissional Legado' and ec.clinica_id='7c2a450d-7b9a-4701-8d5a-982eda331c58') then
    raise exception 'Falha: rota legada não sincronizou a central';
  end if;
end $$;

-- Legado sem UF impede novo cadastro ambíguo com mesmo conselho/registro.
set local role authenticated;
select set_config('request.jwt.claim.sub','8792e28b-faf6-41fd-9d89-a84a453f0137',true);
do $$
declare bloqueou boolean:=false;
begin
  begin
    perform public.equipe_salvar(null,'7c2a450d-7b9a-4701-8d5a-982eda331c58',null,
      jsonb_build_object('nome_completo','Teste Registro Duplicado','cargo','Médico(a)','tipo','profissional_saude',
        'profissao','Medicina','cpf_modo','remover','cpf',null,'telefone',null,'email_contato',null,
        'conselho_classe','crm','registro_conselho',' legado-homolog ','conselho_uf','BA',
        'especialidade_id',null,'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58')),
      '10000000-0000-0000-0000-000000000005');
  exception when unique_violation then bloqueou:=true; end;
  if not bloqueou then raise exception 'Falha: registro ambíguo com UF desconhecida foi aceito'; end if;
end $$;
reset role;

-- Vínculo inativo não pode ser reativado por uma edição comum.
update public.equipe_membros_clinicas set ativo=false
where membro_id=:'apoio_id' and clinica_id='80543c56-328d-400d-89a0-bd6d9352d9c5';
set local role authenticated;
select set_config('request.jwt.claim.sub','8792e28b-faf6-41fd-9d89-a84a453f0137',true);
do $$
declare bloqueou boolean:=false;
begin
  begin
    perform public.equipe_salvar(current_setting('test.apoio_id')::uuid,
      '7c2a450d-7b9a-4701-8d5a-982eda331c58',current_setting('test.apoio_revisao')::integer,
      jsonb_build_object('nome_completo','Teste Apoio Duas Clínicas','cargo','Serviços gerais','tipo','apoio',
        'profissao',null,'cpf_modo','preservar','cpf',null,'telefone','77999990003','email_contato',null,
        'conselho_classe',null,'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
        'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58','80543c56-328d-400d-89a0-bd6d9352d9c5')),null);
  exception when invalid_parameter_value then bloqueou:=true; end;
  if not bloqueou then raise exception 'Falha: vínculo inativo foi reativado'; end if;
end $$;
reset role;
do $$
begin
  if exists(select 1 from public.equipe_membros_clinicas
    where membro_id=current_setting('test.apoio_id')::uuid
      and clinica_id='80543c56-328d-400d-89a0-bd6d9352d9c5' and ativo) then
    raise exception 'Falha: vínculo inativo mudou de estado';
  end if;
end $$;

-- Usuário fictício administra somente Brotas; não pode alterar pessoa compartilhada.
insert into auth.users(id) values('90000000-0000-0000-0000-000000000001') on conflict do nothing;
insert into public.usuarios(id,nome_completo,ativo) values('90000000-0000-0000-0000-000000000001','Teste Proprietária Parcial',true);
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo)
values('90000000-0000-0000-0000-000000000001','7c2a450d-7b9a-4701-8d5a-982eda331c58','proprietaria',true);

set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
do $$
declare bloqueou boolean:=false;
begin
  begin
    perform public.equipe_salvar(
      current_setting('test.apoio_id')::uuid,
      '7c2a450d-7b9a-4701-8d5a-982eda331c58',
      current_setting('test.apoio_revisao')::integer,
      jsonb_build_object('nome_completo','Teste Apoio Alterado','cargo','Serviços gerais','tipo','apoio',
        'profissao',null,'cpf_modo','preservar','cpf',null,'telefone',null,'email_contato',null,
        'conselho_classe',null,'registro_conselho',null,'conselho_uf',null,'especialidade_id',null,
        'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58')),
      null);
  exception when insufficient_privilege then bloqueou:=true; end;
  if not bloqueou then raise exception 'Falha: proprietária parcial alterou cadastro global'; end if;
end $$;

-- Recepção autenticada não pode chamar a listagem administrativa diretamente.
select set_config('request.jwt.claim.sub','4ae3f28e-f197-4281-a5a4-0f4a06d59ef1',true);
do $$
declare bloqueou boolean:=false;
begin
  begin perform public.equipe_listar('7c2a450d-7b9a-4701-8d5a-982eda331c58');
  exception when insufficient_privilege then bloqueou:=true; end;
  if not bloqueou then raise exception 'Falha: recepção acessou listagem administrativa'; end if;
end $$;
reset role;

-- Estado importado preservado e tabelas sem grants diretos para authenticated.
do $$
begin
  if exists(select 1 from public.equipe_membros e join public.profissionais p on p.id=e.profissional_id where e.ativo is distinct from p.ativo) then
    raise exception 'Falha: importação alterou estado global';
  end if;
  if has_table_privilege('authenticated','public.equipe_membros','select')
     or has_table_privilege('authenticated','public.equipe_membros','insert') then
    raise exception 'Falha: authenticated recebeu grant direto';
  end if;
  if has_function_privilege('anon','public.equipe_listar(uuid)','execute') then
    raise exception 'Falha: anon pode executar equipe_listar';
  end if;
  if (select count(*) from public.equipe_membros where nome_completo='Teste Recepção Equipe')<>1 then
    raise exception 'Falha: idempotência criou duplicata';
  end if;
  if exists(select 1 from public.auditoria a join public.equipe_membros m on m.id::text=a.entidade_id
    where m.nome_completo like 'Teste % Equipe' and a.dados_depois::text ~ '52998224725|cpf_encrypted|cpf_hash') then
    raise exception 'Falha: auditoria contém dado sensível';
  end if;
end $$;

commit;
\echo 'EQUIPE: criacoes e negativas passaram; dados ficticios mantidos para teste de reconexao'
