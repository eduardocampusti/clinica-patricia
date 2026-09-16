# Validation checkpoint — migrations locais

Status: COMPLETE
Data de início: 2026-09-15 (America/Bahia)

## Guardrails confirmados

- Nenhuma conexão, comando ou metadado remoto foi utilizado.
- A stack original `CLINICA_PATRICIA` está parada.
- O clone `CLINICA_PATRICIA_RLS_CLONE` está ativo e será preservado.
- A validação usará somente um novo clone Docker local descartável, em portas
  isoladas.
- `supabase/baseline/candidate_public_20260914.sql` e
  `prontuario_hardening.sql` são somente leitura neste trabalho.
- O rollback continua em `database/migration_drafts/rollback/`, fora de
  `supabase/migrations/`.

## Git inicial

- Branch: `codex/checkpoint-local-2026-08-14`
- HEAD: `ffcceae2e4857dee7b827d2400f362f2091730c2`
- Alterações preexistentes: `09-DIARIO-DE-SESSOES.md`, `src/pages/Login.tsx`,
  `supabase/config.toml` e os arquivos não rastreados já presentes no status
  inicial. Nenhum deles deve ser sobrescrito ou descartado.

## Hashes iniciais SHA-256

| Artefato | SHA-256 |
| --- | --- |
| `00_preflight_executor.sql` | `B3278E33C9DABFC05E1DB4AAA75DCFFD2F6C038708F6560059E05A7FC9C10D44` |
| `01_btree_gist.sql` | `42F4C418D0F43E2B0B44B5B37E90DA8F64C08C5273CB9997A5565CECC2F6D45C` |
| `02_baseline_instalacao_nova.sql` | `1AF2AD993B6817D9A4E583FE78F983A91D12B920AD3051FCE2185A68CF7F9B27` |
| `03_acls_default_privileges.sql` | `2190FCE174EF19FE99C6DA8B511D62590B9AC0513178BA4B7B04DBBA90C8B3CD` |
| `04_hardening_geral.sql` | `5E81E010FB9C3BDC5E31B211FB982BB6D8C66207549C4AA3243B266216B9427D` |
| `05_prontuario_rpc.sql` | `08FB16E6D846B2A1175FD3FC31117FC0AC51E66AF4E3AA94D62C9BADD650D967` |
| `rollback/90_prontuario_rpc_operacional.sql` | `3184421E70ABAB2CCA90FA3B6A7B1FA7D472AB5221A4B8A68122F6AC459702D2` |
| Fonte baseline imutável | `99942BD9A94F0DBE51C6EAE395776B05C4998827E26860361AEB0338AC134261` |
| Fonte Prontuário imutável | `D3EA6DD41F15A2504EB1607DEEB62A75848466E5519F4F52E8F9307A4DD3BC48` |

## Ciclos de reset

| Ciclo | Resultado | Observações |
| --- | --- | --- |
| 0 | PASS | Clone novo criado; reset limpo descobriu as seis migrations timestampadas. |
| 1 | PASS | Instalação nova: catálogo '19|10|27|14|47|91|34|19', oito RPCs e harness PASS. |
| 2 | PASS | Correção real em '04': 'cpf_decrypt' deixou de ser executável por 'anon'; reset e harness PASS. |
| 3 | PASS | Atualização existente: fingerprint obrigatório, 02 marcada e não executada; 01/03/04/05 aplicadas; harness PASS. |
| rollback | PASS | Executado apenas no clone; oito RPCs removidas, histórico sem versão 90. |
| final | PASS | Reset final executado uma vez no clone de migrations, usando exatamente os seis arquivos promovidos. |

Após a promoção, o reset final foi executado uma vez sem erro. O histórico
registrou 00–05; o catálogo resultante foi
'19|10|188|27|14|47|19|91|34|8'; as 19 tabelas públicas e 'auth.users'
ficaram vazias.

## Promoção final

'supabase/migrations/' contém somente as seis migrations abaixo (mais o
'.gitkeep' preexistente); o rollback não foi promovido:

- '20260915010000_preflight_executor.sql'
- '20260915010001_btree_gist.sql'
- '20260915010002_baseline_instalacao_nova.sql'
- '20260915010003_acls_default_privileges.sql'
- '20260915010004_hardening_geral.sql'
- '20260915010005_prontuario_rpc.sql'

Todos os seis hashes coincidem com os rascunhos atuais. Nenhum commit foi
criado.

## Testes executados

- PASS — descoberta automática e histórico das seis versões.
- PASS — 19 tabelas, 10 enums, 27 funções, 14 triggers, 47 policies,
  91 constraints, 34 índices e RLS ativo nas 19 tabelas.
- PASS — owners 'postgres' e grants de tabelas/RPCs/CPF.
- PASS — oito RPCs do Prontuário, isolamento entre clínicas e acesso direto
  às tabelas clínicas bloqueado.
- PASS — I-05 em duas instruções; I-06/I-08 bloqueados pelo trigger com
  SQLSTATE 'P0001'.
- PASS — S-17, U-07, U-12, R-12 e R-13 com as correções reais.
- PASS — atualização existente e marcação segura da baseline.
- PASS — rollback apenas em clone descartável, fora do histórico.

## Estado operacional no encerramento

- Stack original 'CLINICA_PATRICIA': parada (não foi iniciada).
- Clone RLS 'CLINICA_PATRICIA_RLS_CLONE': preservado.
- Clones descartáveis de migrations: parados; seus containers e volumes foram
  preservados.

## Encerramento operacional

Não houve acesso remoto, alteração de migration, execução de rollback, nova
suíte de testes ou commit nesta etapa final.
