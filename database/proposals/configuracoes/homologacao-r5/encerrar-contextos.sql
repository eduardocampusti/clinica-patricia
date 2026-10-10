-- R5 NÃO AUTORIZADA/NÃO EXECUTADA; máximo proposto18 contas/10 contextos.
-- Somente executar após decisão explícita sobre máximo18/10.
-- PROPOSTA NÃO EXECUTADA. Encerramento SOMENTE dos dois IDs da homologação.
-- Antes: bloquear Auth, revogar sessões e desativar vínculos das NOVAS contas C-A/C-B
-- por IDs realmente retornados. Não usar nomes/e-mails como filtro de desativação.
begin;
update public.configuracoes_homologacao_contextos set ativo=false
where (clinica_id='dcf5302b-1a4e-4eb7-b2cc-a88a77150001' and slug='homologacao-configuracoes-r5-a')
or (clinica_id='dcf5302b-1a4e-4eb7-b2cc-a88a77150002' and slug='homologacao-configuracoes-r5-b');
update public.clinicas set ativo=false,updated_at=now()
where (id='dcf5302b-1a4e-4eb7-b2cc-a88a77150001' and subdomain='homologacao-configuracoes-r5-a')
or (id='dcf5302b-1a4e-4eb7-b2cc-a88a77150002' and subdomain='homologacao-configuracoes-r5-b');
-- Não apagar versões, auditoria, clínica, projeções/ativos usados em histórico.
commit;
select clinica_id,slug,ativo,expira_em from public.configuracoes_homologacao_contextos
where clinica_id in ('dcf5302b-1a4e-4eb7-b2cc-a88a77150001','dcf5302b-1a4e-4eb7-b2cc-a88a77150002');
select public.configuracoes_publicas_consultar('homologacao-configuracoes-r5-a') is null as a_encerrado,
public.configuracoes_publicas_consultar('homologacao-configuracoes-r5-b') is null as b_encerrado;
