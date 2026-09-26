-- ==============================================================
-- SCRIPT DE VERIFICAÇÃO DE INTEGRIDADE — Clínica Patrícia
-- ==============================================================
-- Uso: revisar antes de rodar no SQL Editor do Supabase Studio após
-- uma migration ou quando surgir suspeita de "aplicação parcial".
--
-- O script NÃO faz ALTER, INSERT, UPDATE, DELETE nem DROP.
-- É somente leitura. Não foi executado nesta tarefa.
-- Os resultados abaixo são indícios, não prova completa de integridade.
--
-- Ver: docs/modulos/pacientes/12-DIAGNOSTICO-INTEGRIDADE.md
-- ==============================================================

-- 1. Migrations registradas em setembro/2026
SELECT
  'MIGRATION REGISTRADA' AS tipo,
  version,
  name,
  array_length(statements, 1) AS qtd_statements
FROM supabase_migrations.schema_migrations
WHERE version LIKE '202609%'
ORDER BY version;

-- 2. Tabelas críticas do módulo Pacientes
SELECT 'TABELA' AS tipo, 'pacientes' AS nome,
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='pacientes') AS existe
UNION ALL
SELECT 'TABELA', 'pacientes_responsaveis_legais',
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public'
                 AND table_name='pacientes_responsaveis_legais')
UNION ALL
SELECT 'TABELA', 'auditoria',
       EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='auditoria');

-- 3. RPCs críticas do módulo Pacientes: presença pelo nome, não assinatura
SELECT 'RPC' AS tipo, 'paciente_menor_criar_com_responsavel' AS nome,
       EXISTS (SELECT 1 FROM pg_proc p
               JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname='public'
                 AND p.proname='paciente_menor_criar_com_responsavel') AS existe
UNION ALL
SELECT 'RPC', 'paciente_definir_cpf',
       EXISTS (SELECT 1 FROM pg_proc p
               JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname='public' AND p.proname='paciente_definir_cpf')
UNION ALL
SELECT 'RPC', 'paciente_editar_administrativo',
       EXISTS (SELECT 1 FROM pg_proc p
               JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname='public' AND p.proname='paciente_editar_administrativo')
UNION ALL
SELECT 'RPC', 'paciente_responsavel_legal_resumo',
       EXISTS (SELECT 1 FROM pg_proc p
               JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname='public' AND p.proname='paciente_responsavel_legal_resumo')
UNION ALL
SELECT 'RPC', 'pacientes_responsavel_validar_cpf_gravacao',
       EXISTS (SELECT 1 FROM pg_proc p
               JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname='public'
                 AND p.proname='pacientes_responsavel_validar_cpf_gravacao');

-- 4. Bucket de foto privada
SELECT 'BUCKET' AS tipo, name AS nome, NOT public AS privado
FROM storage.buckets
WHERE name = 'pacientes-fotos';

-- 5. Indícios textuais de referência à tabela de responsáveis legais.
--    pg_proc.prosrc não comprova validade de dependências nem autorizações.
SELECT 'DEPENDENCIA TEXTUAL' AS tipo, p.proname AS rpc,
       CASE
         WHEN p.prosrc LIKE '%pacientes_responsaveis_legais%' THEN 'menciona pacientes_responsaveis_legais'
         WHEN p.prosrc LIKE '%pacientes_responsaveis%' THEN 'ATENCAO: menciona nome sem _legais'
         ELSE 'sem mencao textual'
       END AS diagnostico
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname LIKE 'paciente%' OR p.proname LIKE 'pacientes%');

-- 6. Quantidade de pacientes cadastrados (sanity check)
SELECT 'DADO' AS tipo, 'qtd_pacientes' AS nome, COUNT(*)::text AS valor
FROM public.pacientes;
