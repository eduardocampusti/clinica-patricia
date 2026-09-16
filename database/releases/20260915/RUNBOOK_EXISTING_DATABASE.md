# Runbook — implantação em banco existente

Este procedimento é manual, para executor autorizado, durante janela de
manutenção aprovada. Ele não autoriza aplicação automática e não deve ser usado
como substituto de uma decisão de implantação.

## 1. Go/no-go obrigatório

Antes de qualquer comando, registre no ticket de mudança:

- backup restaurável e PITR verificados, com RPO/RTO aceitos;
- janela de manutenção, responsáveis e plano de comunicação aprovados;
- executor autorizado, superusuário ou membro do papel `postgres`;
- PostgreSQL **17+**;
- serviços/esquemas Supabase `auth`, `vault` e `extensions` disponíveis;
- extensões `pgcrypto` e `btree_gist` instaladas no schema `extensions`;
- segredos `cpf_key` e `cpf_pepper` existentes no Vault, sem imprimir seus
  valores em terminal, ticket, log ou arquivo;
- cópia dos hashes deste release conferida com `RELEASE_MANIFEST.md`;
- fingerprint remoto calculado e comparado com
  `19|10|188|16|13|47|19|88|29|3` **antes** de implantar.

Qualquer divergência é stop: não adaptar SQL no ambiente, não executar 02 e não
prosseguir para migrations posteriores. Investigue em clone descartável.

## 2. Preparação do histórico sem executar a baseline

1. Faça backup lógico de schema e confirme PITR/restauração segundo o item 1.
2. Capture o histórico atual de `supabase_migrations.schema_migrations` e o
   fingerprint remoto como evidência do ticket.
3. Execute o preflight 00 de forma controlada e somente após sucesso registre a
   versão 00 como aplicada pelo mecanismo oficial de migrations.
4. Confirme ou instale controladamente `pgcrypto` e `btree_gist` com o conteúdo
   idempotente de 01; somente depois registre 01 como aplicada.
5. Execute `update/20_mark_existing_baseline.sql`. Ele exige o fingerprint e a
   versão 00, registra 02 e **não executa** o SQL da baseline.
6. Confira que 00, 01 e 02 aparecem como aplicadas e que nenhuma tabela da
   baseline foi recriada.

Não use `supabase db push` antes desse marco: ele poderia tentar executar 02 em
um banco existente. A baseline é exclusiva de instalação nova.

## 3. Aplicação do hardening

Com 02 marcada, aplique apenas as migrations posteriores ao marco da baseline,
em ordem e com os hashes do manifesto:

1. `20260915010003_acls_default_privileges.sql`
2. `20260915010004_hardening_geral.sql`
3. `20260915010005_prontuario_rpc.sql`

Registre o histórico de migrations e interrompa no primeiro erro. Não edite,
reordene, repita parcialmente ou execute a migration 02 para contornar falha.

## 4. Validação pós-implantação

Ainda na janela, registre:

- existência e grants `EXECUTE` somente para `authenticated` das oito RPCs do
  manifesto;
- RLS ativo nas 19 tabelas e grants diretos fechados nas tabelas clínicas;
- owners esperados e ACLs/default privileges esperados;
- chamadas autorizadas e negadas das oito RPCs com identidades de teste
  aprovadas, sem dados reais;
- isolamento de clínicas e os controles S-17, U-07, U-12, R-12 e R-13.

O harness em `database/tests/security/20260915_security_rpc_validation.sql` é
para clone local/descartável: cria apenas fixtures sintéticas em uma transação e
sempre executa `ROLLBACK`. A validação no banco implantado deve respeitar o
plano de mudança, usar identidades de teste autorizadas e produzir apenas as
evidências permitidas.

## 5. Encerramento

Anexe hashes, fingerprint, histórico de migrations, validações de RPC/RLS/grants
e decisão de encerramento ao ticket. Rollback é um procedimento separado em
`RUNBOOK_ROLLBACK.md`; ele nunca é disparado automaticamente.
