-- R2 autorizada uma única vez; NÃO EXECUTADA. Condição: sessão legítima do criador comprovada antes de consumir recursos.
-- PROPOSTA NÃO EXECUTADA. Encerramento SOMENTE dos dois IDs da homologação.
-- Antes: bloquear Auth, revogar sessões e desativar vínculos das NOVAS contas C-A/C-B
-- por IDs realmente retornados. Não usar nomes/e-mails como filtro de desativação.
begin;
update public.configuracoes_homologacao_contextos set ativo=false
where (clinica_id='ed60a2c6-59c8-45bc-80b7-e53aa005da01' and slug='homologacao-configuracoes-r2-a')
or (clinica_id='ed60a2c6-59c8-45bc-80b7-e53aa005da02' and slug='homologacao-configuracoes-r2-b');
update public.clinicas set ativo=false,updated_at=now()
where (id='ed60a2c6-59c8-45bc-80b7-e53aa005da01' and subdomain='homologacao-configuracoes-r2-a')
or (id='ed60a2c6-59c8-45bc-80b7-e53aa005da02' and subdomain='homologacao-configuracoes-r2-b');
-- Não apagar versões, auditoria, clínica, projeções/ativos usados em histórico.
commit;
select clinica_id,slug,ativo,expira_em from public.configuracoes_homologacao_contextos
where clinica_id in ('ed60a2c6-59c8-45bc-80b7-e53aa005da01','ed60a2c6-59c8-45bc-80b7-e53aa005da02');
select public.configuracoes_publicas_consultar('homologacao-configuracoes-r2-a') is null as a_encerrado,
public.configuracoes_publicas_consultar('homologacao-configuracoes-r2-b') is null as b_encerrado;
