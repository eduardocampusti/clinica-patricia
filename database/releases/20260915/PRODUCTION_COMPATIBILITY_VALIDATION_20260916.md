# Relatório final — compatibilidade de produção 20260916

## Decisão

**GO condicional para o banco remoto auditado.** A atualização de banco
existente foi simulada integralmente em clone Supabase/PostgreSQL 17 descartável
e o procedimento foi corrigido para não exigir uma alteração de produção que o
executor remoto não pode realizar. Produção não foi alterada nesta validação.

O GO depende de repetir, imediatamente antes da janela, o preflight somente
leitura e de satisfazer todos os itens do runbook, incluindo backup/PITR,
executor autorizado e janela de manutenção.

## Fato remoto que exigiu a correção

A auditoria somente leitura preservada em
`REMOTE_READONLY_COMPATIBILITY_20260916.md` encontrou:

- PostgreSQL 17.6 e dependências Supabase requeridas;
- fingerprint bruto `19|10|188|204|13|47|19|88|29|3`;
- 16 funções de domínio da baseline e 188 funções C, membros de `btree_gist`,
  no schema `public`;
- `btree_gist` 1.7 relocável, mas pertencente a `supabase_admin`;
- executor `postgres` com `CREATE`, sem superusuário e sem membership de
  `supabase_admin`;
- índice `agendamentos_sem_sobreposicao` válido e histórico de migrations da
  aplicação ausente.

Assim, `ALTER EXTENSION ... SET SCHEMA` não é um caminho autorizado. PostgreSQL
exige ownership da extensão para esse comando. A release agora preserva o
`btree_gist` legado em `public`; instalação nova continua instalando-o em
`extensions`.

## Correção validada

- 00, 05 e o harness contam o fingerprint de domínio excluindo **somente**
  funções ligadas por catálogo à extensão `btree_gist`; todas as demais parcelas
  e funções públicas permanecem auditadas.
- 01 aceita `btree_gist` em `public` apenas como legado compatível e emite
  aviso; para instalação nova ela é criada em `extensions`.
- `update/00_verify_existing_compatibility_readonly.sql` registra, sem escrita,
  fingerprints bruto e de domínio, extensão, índice e presença do histórico.
- `update/10_bootstrap_existing_migration_history.sql` cria a estrutura exata
  usada pela CLI (`version text primary key`, `statements text[]`, `name text`)
  somente quando não existe histórico e marca 00–02 sem executar 02.
- `update/20_mark_existing_baseline.sql` foi mantido para bases que já tenham o
  histórico próprio com 00/01 registrados.

## Evidências no clone descartável

| Ciclo | Resultado |
| --- | --- |
| Reprodução do remoto | `19|10|188|204|13|47|19|88|29|3`, `btree_gist/public`, owner `supabase_admin`, 188 membros públicos, índice válido, histórico ausente |
| Bloqueio de relocação sem owner | falha explícita e sem efeitos persistentes para papel de teste sem ownership |
| Caminho existente | 00 → 01 manual → bootstrap 10 → CLI 03 → 04 → 05: **PASS** |
| Marcador com histórico já existente | 00/01 registrados → `update/20_mark_existing_baseline.sql`: **PASS** |
| Resultado existente | fingerprint bruto `19|10|188|215|14|47|19|91|34|8`; domínio `19|10|188|27|14|47|19|91|34|8`; índice válido; histórico 00–05 presente |
| Oito RPCs, RLS, owners e grants | **PASS** no harness com fixtures sintéticas e `ROLLBACK` |
| Controles S-17, U-07, U-12, R-12, R-13, I-05, I-06 e I-08 | **PASS** |
| Regressão de instalação nova | reset local 00 → 05: **PASS**; `btree_gist/extensions`; fingerprint `19|10|188|27|14|47|19|91|34|8`; harness **PASS** |

O clone usado foi ignorado pelo Git e será descartado após o encerramento local.
Não foram usados dados de pacientes, dados de Auth de produção, valores de
Vault ou segredos.

## Procedimento aprovado

Use exclusivamente `RUNBOOK_EXISTING_DATABASE.md`. O único caminho para o alvo
auditado é: preflight somente leitura → 00 → 01 → bootstrap 10 → 03 → 04 → 05
→ validação pós-implantação. A baseline 02 nunca é executada nesse banco.
Rollback continua separado e nunca automático.
