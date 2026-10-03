# Relatório final — release Supabase 20260915

## Decisão de prontidão

**GO condicional para implantação controlada no banco remoto auditado.** O
procedimento de banco existente, a instalação nova e o hardening foram
validados em clone PostgreSQL 17/Supabase descartável. Produção não foi
alterada; Financeiro permanece fora do escopo.

A condição obrigatória é repetir o preflight somente leitura imediatamente
antes da janela e cumprir `RUNBOOK_EXISTING_DATABASE.md`, inclusive
backup/PITR, executor autorizado, hashes e janela de manutenção.

## Integridade das migrations canônicas

| Ordem | Arquivo | SHA-256 |
| --- | --- | --- |
| 00 | `supabase/migrations/20260915010000_preflight_executor.sql` | `43892729DBDBE5707B3328573A0F6F780CE271DA7E5BE2157F6177F3335CF2F0` |
| 01 | `supabase/migrations/20260915010001_btree_gist.sql` | `AE2845D0BBD20C10E62381C5D3027009AC9E23CF391E1457F2FE04D9CB3787F4` |
| 02 | `supabase/migrations/20260915010002_baseline_instalacao_nova.sql` | `1AF2AD993B6817D9A4E583FE78F983A91D12B920AD3051FCE2185A68CF7F9B27` |
| 03 | `supabase/migrations/20260915010003_acls_default_privileges.sql` | `2190FCE174EF19FE99C6DA8B511D62590B9AC0513178BA4B7B04DBBA90C8B3CD` |
| 04 | `supabase/migrations/20260915010004_hardening_geral.sql` | `224E4F8D9F4552EDB3B24C365BC7B45820B9E9A642F136E8E903934E6A97FE8A` |
| 05 | `supabase/migrations/20260915010005_prontuario_rpc.sql` | `7D06B55F3056DAADB93C42AA35227DB482EEC09A6B36587781A6AFB1B3E851F1` |

As alterações em 00, 01 e 05 foram motivadas por erro comprovado de
compatibilidade: o remoto tem `btree_gist` em `public`, owner
`supabase_admin`, e o executor `postgres` não pode relocar a extensão. O
fingerprint de domínio exclui apenas os 188 membros catalogados dessa extensão;
isso foi validado no clone antes de prosseguir.

## Evidências preservadas

- Auditoria remota somente leitura: 16 funções de domínio + 188 membros de
  `btree_gist`, fingerprint bruto pré-release
  `19|10|188|204|13|47|19|88|29|3`, histórico da aplicação ausente.
- Simulação de atualização existente: 00 → 01 → bootstrap 10 → 03 → 04 → 05,
  sem executar 02: **PASS**.
- Cenário alternativo com histórico próprio: 00/01 registrados → marcador 20:
  **PASS**.
- Resultado do clone existente: fingerprint de domínio final
  `19|10|188|27|14|47|19|91|34|8`; bruto `19|10|188|215|14|47|19|91|34|8`;
  índice da agenda válido e histórico 00–05 presente.
- Reset de instalação nova: 00 → 05: **PASS**, `btree_gist` em `extensions` e
  fingerprint final `19|10|188|27|14|47|19|91|34|8`.
- Harness: oito RPCs, RLS, owners, grants, acesso direto fechado, isolamento de
  clínicas, I-05/I-06/I-08, S-17, U-07, U-12, R-12 e R-13: **PASS** em ambos
  os ciclos, com fixtures sintéticas e `ROLLBACK`.
- Rollback segue separado, limitado a 05 e nunca automático; não foi executado
  na produção.

O detalhe da compatibilidade está em
`PRODUCTION_COMPATIBILITY_VALIDATION_20260916.md`; a auditoria bruta é
preservada em `REMOTE_READONLY_COMPATIBILITY_20260916.md`.

## Material sensível e escopo

Os artefatos versionáveis foram verificados contra senhas, tokens, URLs
privadas, dados pessoais e segredos. Não há valores de Vault, credenciais,
dados de pacientes, dados de Auth de produção, containers, volumes ou logs no
release. As referências a `cpf_key` e `cpf_pepper` são apenas nomes de segredo;
o harness usa identificadores e conteúdo explicitamente sintéticos e termina em
`ROLLBACK`.

## Git e artefatos definitivos

- Migrations: `supabase/migrations/`.
- Atualização existente e rollback: `database/releases/20260915/update/` e
  `database/releases/20260915/rollback/`.
- Harness: `database/tests/security/`.
- Rascunhos históricos: `audit/migration_drafts/`.
- Clones locais: ignorados pelo Git.
