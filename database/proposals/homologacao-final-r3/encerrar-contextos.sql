-- R3 autorizada em 09/10/2026: ampliação única, máximo acumulado14 contas/6 contextos.
-- PROPOSTA NÃO EXECUTADA. Encerramento SOMENTE dos dois IDs da homologação.
-- Antes: bloquear Auth, revogar sessões e desativar vínculos das NOVAS contas C-A/C-B
-- por IDs realmente retornados. Não usar nomes/e-mails como filtro de desativação.
begin;
update public.configuracoes_homologacao_contextos set ativo=false
where (clinica_id='cb620078-44a1-48c7-b5f7-3509f3dd0001' and slug='homologacao-configuracoes-r3-a')
or (clinica_id='cb620078-44a1-48c7-b5f7-3509f3dd0002' and slug='homologacao-configuracoes-r3-b');
update public.clinicas set ativo=false,updated_at=now()
where (id='cb620078-44a1-48c7-b5f7-3509f3dd0001' and subdomain='homologacao-configuracoes-r3-a')
or (id='cb620078-44a1-48c7-b5f7-3509f3dd0002' and subdomain='homologacao-configuracoes-r3-b');
-- Não apagar versões, auditoria, clínica, projeções/ativos usados em histórico.
commit;
select clinica_id,slug,ativo,expira_em from public.configuracoes_homologacao_contextos
where clinica_id in ('cb620078-44a1-48c7-b5f7-3509f3dd0001','cb620078-44a1-48c7-b5f7-3509f3dd0002');
select public.configuracoes_publicas_consultar('homologacao-configuracoes-r3-a') is null as a_encerrado,
public.configuracoes_publicas_consultar('homologacao-configuracoes-r3-b') is null as b_encerrado;
