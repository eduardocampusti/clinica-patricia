# Manifesto — Supabase hardening release 20260915

## Conteúdo canônico e ordem obrigatória

| Ordem | Artefato | SHA-256 | Papel |
| --- | --- | --- | --- |
| 00 | `supabase/migrations/20260915010000_preflight_executor.sql` | `B3278E33C9DABFC05E1DB4AAA75DCFFD2F6C038708F6560059E05A7FC9C10D44` | valida executor, PostgreSQL, Auth, Vault, extensions e fingerprint de banco existente |
| 01 | `supabase/migrations/20260915010001_btree_gist.sql` | `42F4C418D0F43E2B0B44B5B37E90DA8F64C08C5273CB9997A5565CECC2F6D45C` | instala/valida `pgcrypto` e `btree_gist` em `extensions` |
| 02 | `supabase/migrations/20260915010002_baseline_instalacao_nova.sql` | `1AF2AD993B6817D9A4E583FE78F983A91D12B920AD3051FCE2185A68CF7F9B27` | baseline de instalação nova apenas |
| 03 | `supabase/migrations/20260915010003_acls_default_privileges.sql` | `2190FCE174EF19FE99C6DA8B511D62590B9AC0513178BA4B7B04DBBA90C8B3CD` | normaliza ACLs padrão de objetos futuros |
| 04 | `supabase/migrations/20260915010004_hardening_geral.sql` | `224E4F8D9F4552EDB3B24C365BC7B45820B9E9A642F136E8E903934E6A97FE8A` | endurece CPF, integridade e RLS geral |
| 05 | `supabase/migrations/20260915010005_prontuario_rpc.sql` | `08FB16E6D846B2A1175FD3FC31117FC0AC51E66AF4E3AA94D62C9BADD650D967` | fronteira RPC e RLS do Prontuário |

## Regras de instalação

- Instalação nova: aplica 00 → 01 → 02 → 03 → 04 → 05.
- Banco existente que corresponde à baseline: nunca aplica 02. Usa o marcador
  `update/20_mark_existing_baseline.sql` somente depois do fingerprint remoto
  aprovado e do preflight; aplica exclusivamente 03 → 04 → 05 como migrations
  de hardening posteriores à baseline.
- Fingerprint aprovado de instalação nova: `19|10|188|27|14|47|19|91|34|8`.
- Fingerprint obrigatório de banco existente antes do marco da baseline:
  `19|10|188|16|13|47|19|88|29|3`.

## Artefatos operacionais

| Artefato | SHA-256 | Uso |
| --- | --- | --- |
| `rollback/90_prontuario_rpc_operacional.sql` | `3184421E70ABAB2CCA90FA3B6A7B1FA7D472AB5221A4B8A68122F6AC459702D2` | rollback manual, separado, somente de 05 |
| `database/tests/security/20260915_security_rpc_validation.sql` | `36025088373E7EAB62A89D7E7D16A65A7F002F37CB3A5908BC1109CFBBD257F6` | harness de segurança local/clone descartável; fixtures sintéticas e `ROLLBACK` |
| `update/20_mark_existing_baseline.sql` | `45E46DB8BD16EFA87E60A784BBADC6FF6EE969852C48CDAB0D10F7613F8DD863` | registro protegido de 02 para banco existente; não executa a baseline |

## Proveniência e auditoria

- A fonte da baseline candidata é `supabase/baseline/candidate_public_20260914.sql`
  (`99942BD9A94F0DBE51C6EAE395776B05C4998827E26860361AEB0338AC134261`).
- A fonte do hardening é o arquivo já versionado `prontuario_hardening.sql`
  (`D3EA6DD41F15A2504EB1607DEEB62A75848466E5519F4F52E8F9307A4DD3BC48`).
- Os rascunhos e o checkpoint original foram preservados em
  `audit/migration_drafts/`; não são fonte de implantação.
- Financeiro é explicitamente fora de escopo.
