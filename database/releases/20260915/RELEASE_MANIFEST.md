# Manifesto — Supabase hardening release 20260915

## Conteúdo canônico e ordem obrigatória

| Ordem | Artefato | SHA-256 | Papel |
| --- | --- | --- | --- |
| 00 | `supabase/migrations/20260915010000_preflight_executor.sql` | `43892729DBDBE5707B3328573A0F6F780CE271DA7E5BE2157F6177F3335CF2F0` | valida executor, PostgreSQL, dependências e fingerprint de domínio de banco existente |
| 01 | `supabase/migrations/20260915010001_btree_gist.sql` | `AE2845D0BBD20C10E62381C5D3027009AC9E23CF391E1457F2FE04D9CB3787F4` | instala extensões em instalação nova e preserva `btree_gist` legado em `public` |
| 02 | `supabase/migrations/20260915010002_baseline_instalacao_nova.sql` | `1AF2AD993B6817D9A4E583FE78F983A91D12B920AD3051FCE2185A68CF7F9B27` | baseline de instalação nova apenas |
| 03 | `supabase/migrations/20260915010003_acls_default_privileges.sql` | `2190FCE174EF19FE99C6DA8B511D62590B9AC0513178BA4B7B04DBBA90C8B3CD` | normaliza ACLs padrão de objetos futuros |
| 04 | `supabase/migrations/20260915010004_hardening_geral.sql` | `224E4F8D9F4552EDB3B24C365BC7B45820B9E9A642F136E8E903934E6A97FE8A` | endurece CPF, integridade e RLS geral |
| 05 | `supabase/migrations/20260915010005_prontuario_rpc.sql` | `7D06B55F3056DAADB93C42AA35227DB482EEC09A6B36587781A6AFB1B3E851F1` | fronteira RPC e RLS do Prontuário |

## Regras de instalação

- Instalação nova: aplica 00 → 01 → 02 → 03 → 04 → 05. `btree_gist` é criada
  em `extensions`.
- Banco existente com histórico próprio: nunca aplica 02; usa
  `update/20_mark_existing_baseline.sql` somente após 00/01 já registrados e
  fingerprint de domínio aprovado.
- Banco existente sem histórico (caso remoto auditado): executa 00 e 01
  manualmente, usa `update/10_bootstrap_existing_migration_history.sql` para
  marcar 00–02 sem executar a baseline, então aplica exclusivamente 03 → 04 →
  05 pelo mecanismo de migrations.
- O legado `btree_gist` em `public`, com seus 188 membros catalogados, é
  preservado. Não tentar relocação que requeira ownership de `supabase_admin`.
- Fingerprint de domínio obrigatório antes do marco da baseline:
  `19|10|188|16|13|47|19|88|29|3`.
- Fingerprint de domínio final: `19|10|188|27|14|47|19|91|34|8`.

## Artefatos operacionais

| Artefato | SHA-256 | Uso |
| --- | --- | --- |
| `update/00_verify_existing_compatibility_readonly.sql` | `BD76A38D2FE8A65CE29CCCC9B9C322792DE83263ECB3389960766A2C77CEF30A` | catálogo somente leitura: fingerprints bruto/domínio, extensão, índice e histórico |
| `update/10_bootstrap_existing_migration_history.sql` | `AC573B0796D79ACBE8D5F5F0131B388D8F1F75CE0180DCCEC6772D3B28F03039` | cria o histórico ausente e marca 00–02 com salvaguardas |
| `update/20_mark_existing_baseline.sql` | `184AA1995769E110F03587CF73B5701C0052640C67285A43B4AD3C08D230E2C2` | marca 02 somente quando o histórico próprio com 00 já existe |
| `rollback/90_prontuario_rpc_operacional.sql` | `3184421E70ABAB2CCA90FA3B6A7B1FA7D472AB5221A4B8A68122F6AC459702D2` | rollback manual, separado, somente de 05 |
| `database/tests/security/20260915_security_rpc_validation.sql` | `D5EEE18D56F4205C3F2D6DBCE1B1DDCAF62E05C0F466D7DF60705ACEB946123D` | harness local/clone: fixtures sintéticas e `ROLLBACK` |
| `REMOTE_READONLY_COMPATIBILITY_20260916.md` | `D605D24181FCE0B04FDD61C946E16C6740BBC6DBD7CA2B40886E48D454960BFE` | auditoria remota somente leitura que fundamenta a compatibilidade |

## Proveniência e auditoria

- Baseline candidata: `supabase/baseline/candidate_public_20260914.sql`
  (`99942BD9A94F0DBE51C6EAE395776B05C4998827E26860361AEB0338AC134261`).
- Fonte do hardening: `prontuario_hardening.sql`
  (`D3EA6DD41F15A2504EB1607DEEB62A75848466E5519F4F52E8F9307A4DD3BC48`).
- Rascunhos e checkpoint original: `audit/migration_drafts/`; não são fonte de
  implantação.
- Financeiro permanece fora de escopo.
