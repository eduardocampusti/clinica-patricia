\set ON_ERROR_STOP on
set lock_timeout='12s';
set deadlock_timeout='500ms';
select i.membro_id,m.profissional_id,m.revisao
from public.equipe_idempotencia i join public.equipe_membros m on m.id=i.membro_id
where i.chave='b2000000-0000-0000-0000-000000000001' \gset
select set_config('request.jwt.claim.sub','8792e28b-faf6-41fd-9d89-a84a453f0137',false);
select set_config('test.equipe_concorrencia','on',false);
select set_config('test.equipe_membro',:'membro_id',false);
set role authenticated;
select public.equipe_salvar(:'membro_id','7c2a450d-7b9a-4701-8d5a-982eda331c58',:'revisao',
  jsonb_build_object('nome_completo','Teste B3 Rota Nova','cargo','Médico(a)','tipo','profissional_saude',
    'profissao','Medicina','cpf_modo','preservar','cpf',null,'telefone','77999993333','email_contato',null,
    'conselho_classe','CRM','registro_conselho','B2-2026','conselho_uf','BA','especialidade_id',null,
    'clinicas_ids',jsonb_build_array('7c2a450d-7b9a-4701-8d5a-982eda331c58','80543c56-328d-400d-89a0-bd6d9352d9c5')),null);
reset role;
\echo 'CONEXAO_A_OK'
