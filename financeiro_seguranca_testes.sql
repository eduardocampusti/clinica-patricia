-- ============================================================================
-- Financeiro — testes de segurança LOCAL/STAGING (NÃO EXECUTADO)
--
-- Não contém usuários, dados ou segredos reais. Os testes funcionais de RPC
-- exigem fixture sintética e asserções geradas pelo Fastify de teste. Produção
-- não é um alvo permitido para este arquivo.
-- ============================================================================

begin;

create or replace function pg_temp.assert_true(p_condicao boolean, p_mensagem text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condicao, false) then raise exception 'TESTE_FALHOU: %', p_mensagem; end if;
end $$;

-- 1. Estrutura mínima e RLS.
select pg_temp.assert_true(to_regnamespace('financeiro_privado') is not null, 'schema privado ausente');
select pg_temp.assert_true(to_regclass('public.financeiro_idempotencia') is not null, 'idempotência ausente');
select pg_temp.assert_true(to_regclass('public.estornos_financeiros') is not null, 'estornos ausentes');
select pg_temp.assert_true(to_regclass('public.ajustes_financeiros_profissional') is not null, 'ajustes ausentes');

do $rls$
declare v_tabela text;
begin
  foreach v_tabela in array array['sessoes_caixa','entradas_caixa','cobrancas','financeiro_idempotencia',
    'despesas','movimentos_caixa','fechamentos_caixa','fechamentos_caixa_totais','repasses','repasse_itens',
    'pagamentos_repasse','estornos_financeiros','ajustes_financeiros_profissional','ajustes_financeiros_aplicacoes'] loop
    perform pg_temp.assert_true((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=v_tabela), 'RLS ausente em '||v_tabela);
  end loop;
end $rls$;

-- 2. PostgREST não possui mutação nem execução das RPCs privadas.
select pg_temp.assert_true(not has_table_privilege('authenticated','public.sessoes_caixa','INSERT'), 'authenticated ainda insere sessão');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.entradas_caixa','INSERT'), 'authenticated ainda insere entrada');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.despesas','INSERT'), 'authenticated ainda insere despesa');
select pg_temp.assert_true(not has_schema_privilege('authenticated','financeiro_privado','USAGE'), 'authenticated usa schema privado');
select pg_temp.assert_true(not has_function_privilege('authenticated','financeiro_privado.abrir_caixa(text,text)','EXECUTE'), 'authenticated executa RPC mutável');
select pg_temp.assert_true(not has_function_privilege('anon','financeiro_privado.abrir_caixa(text,text)','EXECUTE'), 'anon executa RPC mutável');

-- 3. Papel técnico tem somente a superfície esperada.
select pg_temp.assert_true(has_schema_privilege('financeiro_api','financeiro_privado','USAGE'), 'financeiro_api sem schema');
select pg_temp.assert_true(has_function_privilege('financeiro_api','financeiro_privado.abrir_caixa(text,text)','EXECUTE'), 'financeiro_api sem RPC');
select pg_temp.assert_true(not has_table_privilege('financeiro_api','public.entradas_caixa','SELECT'), 'financeiro_api lê tabela');
select pg_temp.assert_true(not has_table_privilege('financeiro_api','public.entradas_caixa','INSERT'), 'financeiro_api insere tabela');
select pg_temp.assert_true(not (select rolbypassrls from pg_roles where rolname='financeiro_api'), 'financeiro_api possui BYPASSRLS');
select pg_temp.assert_true(not (select rolcanlogin from pg_roles where rolname='financeiro_executor'), 'executor possui LOGIN');
select pg_temp.assert_true(not has_table_privilege('financeiro_executor','vault.decrypted_secrets','SELECT'), 'executor lê Vault');
select pg_temp.assert_true(has_table_privilege('financeiro_vault_guard','vault.decrypted_secrets','SELECT'), 'guard não lê Vault');

-- 4. SECURITY DEFINER, owner e search_path.
do $funcoes$
declare v_nome text;
begin
  foreach v_nome in array array['abrir_caixa','registrar_cobranca','receber_cobranca','registrar_despesa',
    'pagar_despesa','registrar_sangria','registrar_suprimento','estornar_lancamento','fechar_caixa','pagar_repasse_integral'] loop
    perform pg_temp.assert_true((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='financeiro_privado' and p.proname=v_nome and pg_get_function_identity_arguments(p.oid)='p_assercao_texto text, p_assinatura_hex text'),
      v_nome||' não é SECURITY DEFINER');
    perform pg_temp.assert_true((select r.rolname='financeiro_executor' from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      join pg_roles r on r.oid=p.proowner where n.nspname='financeiro_privado' and p.proname=v_nome
      and pg_get_function_identity_arguments(p.oid)='p_assercao_texto text, p_assinatura_hex text'), v_nome||' owner incorreto');
    perform pg_temp.assert_true((select 'search_path=pg_catalog'=any(coalesce(p.proconfig,array[]::text[])) from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace where n.nspname='financeiro_privado' and p.proname=v_nome
      and pg_get_function_identity_arguments(p.oid)='p_assercao_texto text, p_assinatura_hex text'), v_nome||' search_path inseguro');
  end loop;
end $funcoes$;

-- 5. Constraints críticas.
select pg_temp.assert_true(exists(select 1 from pg_indexes where schemaname='public' and indexname='cobrancas_agendamento_unica'), 'unicidade por agendamento ausente');
select pg_temp.assert_true(exists(select 1 from pg_indexes where schemaname='public' and indexname='sessoes_caixa_aberta_unica'), 'caixa aberto único ausente');
select pg_temp.assert_true(exists(select 1 from pg_constraint where conrelid='public.pagamentos_repasse'::regclass and contype='u'), 'pagamento integral único ausente');

-- 6. Testes funcionais que o runner deve executar depois deste catálogo:
--    a) assinatura inválida/expirada/kid errado -> 42501;
--    b) credencial financeiro_api sem HMAC -> bloqueada;
--    c) recepção: abre, registra entrada/despesa/sangria/suprimento/fecha;
--    d) médico: todas as mutações recusadas;
--    e) estorno e pagamento de repasse: recepção recusada, proprietária aceita;
--    f) mesma Idempotency-Key+hash retorna mesma resposta; hash diferente -> conflito;
--    g) duas aberturas/fechamentos concorrentes: uma única vence;
--    h) cortesia cria cobrança sem entrada e sem repasse;
--    i) fechamento cria snapshot+repasses na mesma transação;
--    j) falha induzida no repasse desfaz o fechamento inteiro;
--    k) estorno pós-fechamento preserva snapshot e cria ajuste futuro;
--    l) pagamento de repasse grava exatamente valor_a_pagar e rejeita repetição;
--    m) Clínica A não referencia nem altera objetos da Clínica B;
--    n) ausência/rotação incorreta do segredo Vault falha fechada e não grava nada.

rollback;
