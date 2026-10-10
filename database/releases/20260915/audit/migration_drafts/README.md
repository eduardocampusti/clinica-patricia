# Cadeia de migrations — rascunho de implantação

Estes arquivos são rascunhos de revisão. Eles estão deliberadamente fora de
`supabase/migrations`, não têm histórico de aplicação e não foram executados.
Os snapshots em `supabase/baseline/` e `prontuario_hardening.sql` continuam
imutáveis e são as fontes canônicas desta proposta.

## Ordem para uma instalação nova

1. Execute `00_preflight_executor.sql` e resolva qualquer erro de papel,
   versão, Supabase Auth, Vault ou fingerprint.
2. Execute `01_btree_gist.sql` com um papel autorizado a criar extensões.
3. Execute `02_baseline_instalacao_nova.sql`; ele é uma cópia autocontida e
   transacional da baseline candidata, preservada com o hash de referência
   `99942BD9A94F0DBE51C6EAE395776B05C4998827E26860361AEB0338AC134261`.
5. Execute `03_acls_default_privileges.sql` como `postgres` ou como membro
   desse papel. O Supabase local não permite ao executor alterar defaults de
   `supabase_admin`; essa ACL legada é intencionalmente omitida.
6. Execute `04_hardening_geral.sql` e depois `05_prontuario_rpc.sql`.
7. Valide as RPCs e o frontend antes do corte. O arquivo de rollback não é
   uma migration e só deve ser considerado em janela operacional.

## Ordem para um banco já existente

1. **Não** execute `02_baseline_instalacao_nova.sql`.
2. Compare schema, policies, grants e fingerprint com a baseline candidata;
   registre o marco da baseline no mecanismo de migrations escolhido somente
   após a equivalência ser aprovada. Corrija drift antes do hardening.
3. Execute o preflight e confirme que o executor é `postgres` ou membro de
   `postgres`; `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` não pode ser
   feito por um papel sem essa associação. Não tente alterar defaults de
   `supabase_admin` sem uma migration executada pelo próprio papel.
4. Aplique `01`, `03`, `04` e `05` nessa ordem, primeiro no clone/staging.
   `03` normaliza os defaults já registrados para `postgres`, mas não altera
   ACLs de objetos existentes nem defaults de `supabase_admin`; as ACLs
   sensíveis existentes são tratadas explicitamente em `04` e `05`.

## Empacotamento posterior

Antes de promover, transforme cada rascunho aprovado em migration versionada.
Os SQLs `00` a `05` são autocontidos e não usam metacomandos do `psql`, caminhos
locais ou placeholders. Não inclua o diretório `rollback/` no histórico
automático de migrations.

O rollback em `rollback/90_prontuario_rpc_operacional.sql` reverte apenas a
fronteira RPC do Prontuário e reabre temporariamente o vazamento S-17 legado.
As correções U-07, U-12, R-12 e R-13 são hardening de segurança e não têm
rollback automático neste rascunho.
