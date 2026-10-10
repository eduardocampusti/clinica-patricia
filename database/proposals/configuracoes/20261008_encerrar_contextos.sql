-- PROPOSTA NÃO EXECUTADA. Encerramento SOMENTE dos dois IDs da homologação.
-- Antes: bloquear Auth, revogar sessões e desativar vínculos das NOVAS contas C-A/C-B
-- por IDs realmente retornados. Não usar nomes/e-mails como filtro de desativação.
begin;
update public.configuracoes_homologacao_contextos set ativo=false
where (clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701' and slug='homologacao-configuracoes-a')
or (clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702' and slug='homologacao-configuracoes-b');
update public.clinicas set ativo=false,updated_at=now()
where (id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701' and subdomain='homologacao-configuracoes-a')
or (id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702' and subdomain='homologacao-configuracoes-b');
-- Não apagar versões, auditoria, clínica, projeções/ativos usados em histórico.
commit;
select clinica_id,slug,ativo,expira_em from public.configuracoes_homologacao_contextos
where clinica_id in ('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701','7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702');
select public.configuracoes_publicas_consultar('homologacao-configuracoes-a') is null as a_encerrado,
public.configuracoes_publicas_consultar('homologacao-configuracoes-b') is null as b_encerrado;
