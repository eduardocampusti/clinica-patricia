-- =============================================================================
-- desativar_ibitiara.sql
-- Clínica Patrícia — Projeto xftnkusbyqzyvzrovroj
-- Data: 12/08/2026
-- Objetivo: Desativar o registro "Clínica Ibitiara" e dados relacionados.
--           A unidade de Ibitiara foi reclassificada como laboratório de exames
--           com sistema próprio — NÃO faz parte do multi-tenant deste sistema.
-- =============================================================================
-- INSTRUÇÕES:
-- 1. Abrir o SQL Editor do Supabase (projeto xftnkusbyqzyvzrovroj)
-- 2. Executar o BLOCO 1 primeiro (diagnóstico — só leitura, não altera nada)
-- 3. Conferir os resultados
-- 4. Se tudo estiver correto, executar o BLOCO 2 (desativação)
-- 5. Executar o BLOCO 3 (verificação final)
-- =============================================================================

-- =============================================================================
-- BLOCO 1 — DIAGNÓSTICO (só leitura, execute primeiro)
-- =============================================================================
-- Mostra o que existe no banco relacionado a Ibitiara.
-- NÃO altera nada. Execute e confira os resultados antes do Bloco 2.

-- 1a. Encontrar o registro da Clínica Ibitiara
SELECT id, nome, cidade, subdomain, ativo,
       cor_primaria, cor_secundaria, cor_menu
FROM clinicas
WHERE LOWER(cidade) LIKE '%ibitiara%'
   OR LOWER(nome) LIKE '%ibitiara%'
   OR LOWER(subdomain) LIKE '%ibitiara%';

-- 1b. Vínculos de usuários com a clínica de Ibitiara
SELECT uc.usuario_id, u.nome_completo, uc.papel, uc.ativo,
       c.nome AS clinica
FROM usuarios_clinicas uc
JOIN usuarios u ON u.id = uc.usuario_id
JOIN clinicas c ON c.id = uc.clinica_id
WHERE c.cidade ILIKE '%ibitiara%'
   OR c.nome ILIKE '%ibitiara%';

-- 1c. Verificar se há DADOS REAIS vinculados a Ibitiara
-- (pacientes, agendamentos, entradas de caixa, sessões de caixa)
-- Se houver dados reais, NÃO podemos simplesmente desativar sem tratar.
SELECT 'pacientes' AS tabela, COUNT(*) AS total
FROM pacientes p
JOIN clinicas c ON c.id = p.clinica_id
WHERE c.cidade ILIKE '%ibitiara%'
UNION ALL
SELECT 'sessoes_caixa', COUNT(*)
FROM sessoes_caixa sc
JOIN clinicas c ON c.id = sc.clinica_id
WHERE c.cidade ILIKE '%ibitiara%'
UNION ALL
SELECT 'agendamentos', COUNT(*)
FROM agendamentos a
JOIN clinicas c ON c.id = a.clinica_id
WHERE c.cidade ILIKE '%ibitiara%';

-- 1d. Verificar o usuário de teste de Ibitiara
SELECT u.id, u.nome_completo, u.ativo,
       au.email
FROM usuarios u
JOIN auth.users au ON au.id = u.id
WHERE au.email = 'teste_medico_ibitiara@teste.local';


-- =============================================================================
-- BLOCO 2 — DESATIVAÇÃO (executar SÓ DEPOIS de conferir o Bloco 1)
-- =============================================================================
-- Usa soft delete (ativo = false), nunca DELETE físico.
-- A auditoria vai registrar automaticamente via trigger.

-- 2a. Desativar a Clínica Ibitiara (soft delete)
UPDATE clinicas
SET ativo = false,
    updated_at = now()
WHERE (LOWER(cidade) LIKE '%ibitiara%'
   OR LOWER(nome) LIKE '%ibitiara%'
   OR LOWER(subdomain) LIKE '%ibitiara%')
  AND ativo = true;
-- Esperado: 1 linha afetada

-- 2b. Desativar TODOS os vínculos de usuarios_clinicas com Ibitiara
UPDATE usuarios_clinicas
SET ativo = false
WHERE clinica_id IN (
    SELECT id FROM clinicas
    WHERE LOWER(cidade) LIKE '%ibitiara%'
       OR LOWER(nome) LIKE '%ibitiara%'
       OR LOWER(subdomain) LIKE '%ibitiara%'
)
AND ativo = true;
-- Esperado: 1-2 linhas afetadas (proprietária + teste_medico_ibitiara)

-- 2c. Desativar o usuário de teste de Ibitiara
-- (O usuário teste_medico_ibitiara só existia para testar isolamento.
--  Com Ibitiara fora do sistema, ele não serve mais.)
UPDATE usuarios
SET ativo = false,
    updated_at = now()
WHERE id IN (
    SELECT u.id
    FROM usuarios u
    JOIN auth.users au ON au.id = u.id
    WHERE au.email = 'teste_medico_ibitiara@teste.local'
)
AND ativo = true;
-- Esperado: 1 linha afetada


-- =============================================================================
-- BLOCO 3 — VERIFICAÇÃO FINAL (execute depois do Bloco 2)
-- =============================================================================

-- 3a. Confirmar que Ibitiara está desativada
SELECT id, nome, cidade, ativo FROM clinicas ORDER BY nome;
-- Esperado: Ibitiara com ativo = false; Brotas e Ipupiara com ativo = true

-- 3b. Confirmar vínculos desativados
SELECT uc.usuario_id, u.nome_completo, uc.papel, uc.ativo,
       c.nome AS clinica
FROM usuarios_clinicas uc
JOIN usuarios u ON u.id = uc.usuario_id
JOIN clinicas c ON c.id = uc.clinica_id
WHERE c.cidade ILIKE '%ibitiara%';
-- Esperado: todos com ativo = false

-- 3c. Confirmar que a proprietária ainda vê Brotas e Ipupiara
SELECT uc.clinica_id, c.nome, uc.papel, uc.ativo
FROM usuarios_clinicas uc
JOIN clinicas c ON c.id = uc.clinica_id
JOIN auth.users au ON au.id = uc.usuario_id
WHERE uc.papel = 'proprietaria'
  AND uc.ativo = true
ORDER BY c.nome;
-- Esperado: 2 linhas (Brotas e Ipupiara), ambas ativo = true

-- 3d. Confirmar que NÃO há dados reais órfãos em Ibitiara
-- (Se o Bloco 1 mostrou 0 em todas as tabelas, isso já está OK)

-- =============================================================================
-- PRONTO. Após confirmar o Bloco 3:
-- - O sistema só mostra Brotas e Ipupiara
-- - A proprietária só alterna entre 2 clínicas
-- - Nenhum dado foi perdido (soft delete preserva tudo)
-- - A auditoria registrou as desativações automaticamente
-- =============================================================================
