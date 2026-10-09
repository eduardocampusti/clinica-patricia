-- R4 AUTORIZADA pelo usuário em 09/10/2026, máximo16 contas/8 contextos; uso único.
-- Somente executar após decisão explícita sobre máximo16/8.
-- PROPOSTA NÃO EXECUTADA. Encerramento SOMENTE dos dois IDs da homologação.
-- Antes: bloquear Auth, revogar sessões e desativar vínculos das NOVAS contas C-A/C-B
-- por IDs realmente retornados. Não usar nomes/e-mails como filtro de desativação.
begin;
update public.configuracoes_homologacao_contextos set ativo=false
where (clinica_id='ed002c24-5c6c-4e8c-b90c-aa4751280001' and slug='homologacao-configuracoes-r4-a')
or (clinica_id='ed002c24-5c6c-4e8c-b90c-aa4751280002' and slug='homologacao-configuracoes-r4-b');
update public.clinicas set ativo=false,updated_at=now()
where (id='ed002c24-5c6c-4e8c-b90c-aa4751280001' and subdomain='homologacao-configuracoes-r4-a')
or (id='ed002c24-5c6c-4e8c-b90c-aa4751280002' and subdomain='homologacao-configuracoes-r4-b');
-- Não apagar versões, auditoria, clínica, projeções/ativos usados em histórico.
commit;
select clinica_id,slug,ativo,expira_em from public.configuracoes_homologacao_contextos
where clinica_id in ('ed002c24-5c6c-4e8c-b90c-aa4751280001','ed002c24-5c6c-4e8c-b90c-aa4751280002');
select public.configuracoes_publicas_consultar('homologacao-configuracoes-r4-a') is null as a_encerrado,
public.configuracoes_publicas_consultar('homologacao-configuracoes-r4-b') is null as b_encerrado;
