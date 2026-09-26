# Runbook — implantação em banco existente

Este procedimento é manual, para executor autorizado, durante janela de
manutenção aprovada. Não executa a baseline no banco existente, não autoriza
aplicação automática e não substitui uma decisão de implantação.

## 1. Go/no-go obrigatório

Antes de qualquer escrita, registre no ticket de mudança:

- backup restaurável e PITR verificados, com RPO/RTO aceitos;
- janela de manutenção, responsáveis e plano de comunicação aprovados;
- executor autorizado, membro de `postgres` e com `CREATE` no banco;
- PostgreSQL **17+**;
- serviços/esquemas Supabase `auth`, `vault` e `extensions` disponíveis;
- `pgcrypto` instalada em `extensions`;
- `btree_gist` instalada: `extensions` para instalação nova ou `public` para o
  legado catalogado nesta compatibilidade; não relocar a extensão legada;
- segredos `cpf_key` e `cpf_pepper` existentes no Vault, sem imprimir valores;
- hashes conferidos contra `RELEASE_MANIFEST.md`;
- nenhum dado clínico, Vault ou segredo será consultado pelo procedimento;
- rollback separado, manual e nunca automático, compreendido e aprovado.

Antes de implantar, execute
`update/00_verify_existing_compatibility_readonly.sql` em sessão somente
leitura. Para o remoto auditado em 2026-09-16, o resultado obrigatório antes do
marco é:

| Campo | Valor |
| --- | --- |
| fingerprint bruto | `19|10|188|204|13|47|19|88|29|3` |
| fingerprint de domínio | `19|10|188|16|13|47|19|88|29|3` |
| `btree_gist` | versão `1.7`, schema `public`, owner `supabase_admin`, 188 membros de função públicos |
| índice `agendamentos_sem_sobreposicao` | válido |
| histórico da aplicação | ausente |

O fingerprint de domínio usa o mesmo catálogo do fingerprint aprovado e exclui
somente membros de `btree_gist` identificados pela dependência de extensão. A
contagem bruta é evidência obrigatória e detecta qualquer outra função pública.
Qualquer outra combinação é **stop**: não adaptar SQL no ambiente, não executar
02 e investigar primeiro em clone descartável.

## 2. Preparação segura do histórico

O remoto auditado não possui `supabase_migrations.schema_migrations`. Os
históricos em `auth`, `realtime` e `storage` são internos da plataforma e não
podem ser reutilizados.

1. Faça backup lógico de schema e confirme PITR/restauração conforme a seção 1.
2. Anexe ao ticket a saída do preflight somente leitura, os hashes e a decisão
   de go/no-go.
3. Execute manualmente e em ordem as migrations 00 e 01, com seu conteúdo
   canônico e hashes conferidos. A 00 é somente preflight; a 01 preserva
   `btree_gist` legado em `public` e não tenta assumir ou alterar o owner
   `supabase_admin`.
4. Execute `update/10_bootstrap_existing_migration_history.sql` uma única vez.
   Ele falha se o schema de histórico já existir, exige o fingerprint de domínio,
   cria exatamente a tabela de histórico usada pela CLI e registra 00, 01 e 02.
   Não executa o SQL de 02 nem recria objetos da baseline.
5. Confira no histórico as versões 00, 01 e 02. A versão 02 é somente o marco
   lógico da baseline existente.

Não execute `supabase db push` antes do passo 4: ele pode tentar executar 02 em
um banco existente. `update/20_mark_existing_baseline.sql` permanece apenas
para alvo que **já** tenha o histórico próprio e as versões 00/01 registradas;
não é o caminho para o remoto auditado.

## 3. Aplicação do hardening

Com 02 marcada, aplique exclusivamente as migrations posteriores ao marco, na
ordem e com os hashes do manifesto:

1. `20260915010003_acls_default_privileges.sql`
2. `20260915010004_hardening_geral.sql`
3. `20260915010005_prontuario_rpc.sql`

Registre o histórico de migrations e interrompa no primeiro erro. Não edite,
reordene, repita parcialmente nem execute 02 para contornar uma falha.

## 4. Validação pós-implantação

Ainda na janela, registre:

- a consulta de compatibilidade com resultado final de domínio
  `19|10|188|27|14|47|19|91|34|8`; no legado com `btree_gist` em `public`, a
  contagem bruta de funções é `215` (27 de domínio + 188 da extensão);
- índice `agendamentos_sem_sobreposicao` válido e `btree_gist` preservada no
  schema/owner previamente verificados;
- existência e grants `EXECUTE` somente para `authenticated` das oito RPCs;
- RLS ativo nas 19 tabelas e grants diretos fechados nas tabelas clínicas;
- owners e ACLs/default privileges esperados;
- chamadas autorizadas e negadas das oito RPCs com identidades de teste
  aprovadas, sem dados reais;
- controles S-17, U-07, U-12, R-12 e R-13.

O harness em `database/tests/security/20260915_security_rpc_validation.sql` é
somente para clone local/descartável: usa fixtures sintéticas em transação e
sempre executa `ROLLBACK`. A validação no banco implantado deve seguir o plano
de mudança e gerar apenas as evidências permitidas.

## 5. Encerramento

Anexe hashes, fingerprints bruto e de domínio, histórico, validações de
RPC/RLS/grants e decisão de encerramento ao ticket. O rollback está em
`RUNBOOK_ROLLBACK.md`; é separado e nunca é disparado automaticamente.
