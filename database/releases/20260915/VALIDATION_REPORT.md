# Relatório final — release local de hardening Supabase 20260915

## Decisão de prontidão

**PRONTO PARA HANDOFF DE IMPLANTAÇÃO CONTROLADA.** Este é um release local
validado; não houve conexão, consulta ou alteração em Supabase remoto ou em
produção nesta preparação. Financeiro não faz parte deste release.

## Escopo imutável

- Seis migrations canônicas em `supabase/migrations/`, nas versões
  `20260915010000` a `20260915010005`.
- Baseline exclusivamente para instalação nova; um banco existente nunca executa
  `20260915010002_baseline_instalacao_nova.sql`.
- Hardening de ACL/RLS/CPF e fronteira de oito RPCs de Prontuário.
- Rollback operacional separado, limitado à migration 05 e nunca automático.

## Estado Git inicial preservado

- Branch: `codex/checkpoint-local-2026-08-14`
- HEAD inicial: `ffcceae2e4857dee7b827d2400f362f2091730c2`
- Modificações preexistentes e fora deste release: `09-DIARIO-DE-SESSOES.md`,
  `src/pages/Login.tsx` e `supabase/config.toml`.
- Itens não rastreados preexistentes e não relacionados (documentação, mockups,
  ativo de login e SQL de Ibitiara) foram preservados fora do commit. Os insumos
  deste release foram organizados abaixo; os dois clones locais descartáveis de
  validação permanecem locais e são ignorados pelo Git.

## Integridade das migrations canônicas

| Ordem | Arquivo | SHA-256 |
| --- | --- | --- |
| 00 | `supabase/migrations/20260915010000_preflight_executor.sql` | `B3278E33C9DABFC05E1DB4AAA75DCFFD2F6C038708F6560059E05A7FC9C10D44` |
| 01 | `supabase/migrations/20260915010001_btree_gist.sql` | `42F4C418D0F43E2B0B44B5B37E90DA8F64C08C5273CB9997A5565CECC2F6D45C` |
| 02 | `supabase/migrations/20260915010002_baseline_instalacao_nova.sql` | `1AF2AD993B6817D9A4E583FE78F983A91D12B920AD3051FCE2185A68CF7F9B27` |
| 03 | `supabase/migrations/20260915010003_acls_default_privileges.sql` | `2190FCE174EF19FE99C6DA8B511D62590B9AC0513178BA4B7B04DBBA90C8B3CD` |
| 04 | `supabase/migrations/20260915010004_hardening_geral.sql` | `224E4F8D9F4552EDB3B24C365BC7B45820B9E9A642F136E8E903934E6A97FE8A` |
| 05 | `supabase/migrations/20260915010005_prontuario_rpc.sql` | `08FB16E6D846B2A1175FD3FC31117FC0AC51E66AF4E3AA94D62C9BADD650D967` |

As seis cópias arquivadas em `audit/migration_drafts/` são byte a byte iguais
às migrations canônicas. As cópias empregadas nos clones local de instalação
nova e de atualização também coincidiram. O hash inicial histórico de 04
(`5E81…`) antecede a correção validada que removeu a execução de `cpf_decrypt`
por `anon`; o hash final aprovado é o registrado nesta tabela (`224E…`).

Fontes preservadas e conferidas:

- baseline candidata: `supabase/baseline/candidate_public_20260914.sql` —
  `99942BD9A94F0DBE51C6EAE395776B05C4998827E26860361AEB0338AC134261`;
- hardening-fonte já versionado: `prontuario_hardening.sql` —
  `D3EA6DD41F15A2504EB1607DEEB62A75848466E5519F4F52E8F9307A4DD3BC48`;
- rollback separado: `rollback/90_prontuario_rpc_operacional.sql` —
  `3184421E70ABAB2CCA90FA3B6A7B1FA7D472AB5221A4B8A68122F6AC459702D2`;
- harness de segurança: `database/tests/security/20260915_security_rpc_validation.sql` —
  `36025088373E7EAB62A89D7E7D16A65A7F002F37CB3A5908BC1109CFBBD257F6`;
- marcador de baseline existente: `update/20_mark_existing_baseline.sql` —
  `45E46DB8BD16EFA87E60A784BBADC6FF6EE969852C48CDAB0D10F7613F8DD863`.

## Evidências preservadas

- Reset final no clone descartável com as seis migrations exatamente acima:
  **PASS**.
- Catálogo final de instalação nova: `19|10|188|27|14|47|19|91|34|8`.
- Banco existente protegido por fingerprint anterior à baseline:
  `19|10|188|16|13|47|19|88|29|3`; 02 foi marcada, nunca executada.
- Oito RPCs aprovadas: `listar_atendimentos_prontuario`, `abrir_prontuario`,
  `iniciar_atendimento_avulso`, `iniciar_atendimento_agendado`,
  `salvar_rascunho_atendimento`, `finalizar_atendimento_seguro`,
  `adicionar_adendo_prontuario` e `criar_documento_prontuario`.
- RLS, owners, grants, acesso direto às tabelas clínicas, isolamento entre
  clínicas, I-05/I-06/I-08, S-17, U-07, U-12, R-12 e R-13: **PASS**.
- Instalação nova, atualização existente e rollback no clone descartável:
  **PASS**. O rollback não foi executado em banco original.

O relatório de checkpoint original, com a sequência detalhada dos ciclos, foi
preservado sem reescrita em `audit/migration_drafts/VALIDATION_REPORT.md`.

## Varredura de material sensível

A varredura dos artefatos versionados procurou credenciais, URLs, tokens,
senhas, chaves privadas, CPFs e dados pessoais. As ocorrências semânticas foram
somente referências de código a Vault (`cpf_key` e `cpf_pepper`), metadados de
Supabase e fixtures determinísticas de teste que terminam em `ROLLBACK`. As duas
ocorrências de CPF formatado são o sentinela inválido `111.111.111-11` usado para
testar a falha sem segredo no Vault, não um CPF de pessoa. Não há valores de
Vault, chaves, tokens, URLs privadas, dados de pacientes ou exportação de dados.
A baseline arquivada não contém `COPY` nem `INSERT` de dados; comandos de
escrita internos a funções fazem parte do DDL.

## Empacotamento e estado final

- Manifesto: `RELEASE_MANIFEST.md`.
- Runbook de banco existente: `RUNBOOK_EXISTING_DATABASE.md`.
- Runbook de rollback: `RUNBOOK_ROLLBACK.md`.

## Recibo de encerramento Git

O identificador completo do commit que contém este relatório é o `HEAD` do
checkout de encerramento (`git rev-parse HEAD`). Ele é reportado junto ao
handoff; não é materialmente inserido neste mesmo arquivo, pois isso alteraria o
próprio identificador do commit.

Status remanescente previsto após o commit, preservado fora do release:

```text
 M 09-DIARIO-DE-SESSOES.md
 M src/pages/Login.tsx
 M supabase/config.toml
?? 03-REGRAS-AGENTES-IA.md
?? 04-ISOLAMENTO-DE-SISTEMAS.md
?? 07-BENCHMARK-E-EVOLUCAO.md
?? 12-PROMPTS-ONBOARDING-IA.md
?? desativar_ibitiara.sql
?? docs/mockups/
?? public/login-bg.png
```
