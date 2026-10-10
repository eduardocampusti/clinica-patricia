-- ==============================================================
-- SCRIPT DE VERIFICAÇÃO DE INTEGRIDADE — Clínica Patrícia
-- ==============================================================
-- Uso: revisar antes de rodar no SQL Editor do Supabase Studio após
-- uma migration ou quando surgir suspeita de "aplicação parcial".
--
-- O script NÃO faz ALTER, INSERT, UPDATE, DELETE nem DROP.
-- É somente leitura.
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

SELECT 'COLUNA' AS tipo, 'auditoria.motivo' AS nome,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='auditoria'
                 AND column_name='motivo') AS existe;

-- Componentes de endereço adicionados por 20260928110000.
SELECT 'COLUNA ENDERECO' AS tipo, esperado.column_name AS nome,
       EXISTS (
         SELECT 1
         FROM information_schema.columns c
         WHERE c.table_schema = 'public'
           AND c.table_name = 'pacientes'
           AND c.column_name = esperado.column_name
       ) AS existe
FROM (VALUES
  ('cep'), ('logradouro'), ('numero'), ('complemento'),
  ('bairro'), ('cidade'), ('uf'), ('endereco_historico')
) AS esperado(column_name)
ORDER BY esperado.column_name;

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
SELECT 'RPC', 'paciente_ler_cpf',
       to_regprocedure('public.paciente_ler_cpf(uuid,uuid)') IS NOT NULL
UNION ALL
SELECT 'RPC', 'paciente_corrigir_cpf',
       to_regprocedure('public.paciente_corrigir_cpf(uuid,uuid,timestamptz,text,text)') IS NOT NULL
UNION ALL
SELECT 'RPC', 'paciente_editar_administrativo',
       EXISTS (SELECT 1 FROM pg_proc p
               JOIN pg_namespace n ON n.oid = p.pronamespace
               WHERE n.nspname='public' AND p.proname='paciente_editar_administrativo')
UNION ALL
SELECT 'RPC', 'paciente_menor_criar_com_responsavel (endereco estruturado)',
       to_regprocedure(
         'public.paciente_menor_criar_com_responsavel(uuid,text,date,text,text,text,text,text,text,text,text,text,text,text,jsonb)'
       ) IS NOT NULL
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

-- Grants das RPCs que leem/corrigem CPF, sem retornar nenhum documento.
SELECT p.proname AS rpc, p.prosecdef AS security_definer,
       has_function_privilege('authenticated', p.oid, 'execute') AS authenticated_permitido,
       has_function_privilege('anon', p.oid, 'execute') AS anon_permitido
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.oid IN (
    to_regprocedure('public.paciente_ler_cpf(uuid,uuid)'),
    to_regprocedure('public.paciente_corrigir_cpf(uuid,uuid,timestamptz,text,text)')
  )
ORDER BY p.proname;

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
