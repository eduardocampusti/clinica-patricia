# Baseline remota — snapshot de 14/09/2026

Esta pasta preserva, sem aplicação, o estado real do schema `public` capturado do
banco oficial da Clínica Patrícia em 14/09/2026. Os arquivos são artefatos para
revisão e futura reconstrução exclusivamente em ambiente local ou staging.

## Origem e integridade

- Origem autorizada:
  `C:\Users\Eduardo\AppData\Local\Temp\clinica_patricia_schema_20260914_164807.sql`
- Tamanho original: `84.218 bytes`
- SHA-256 original:
  `47CAB27AA4A666F1E1E402C7B68467408F3C952497AD8706DC754170E992C124`
- Banco e `pg_dump` de origem: PostgreSQL 17.6, conforme cabeçalho do dump.
- O dump não contém `COPY ... FROM stdin`, `INSERT INTO`, `UPDATE`, `DELETE`
  ou `TRUNCATE` no nível principal. Comandos de escrita existentes dentro de
  funções fazem parte da lógica armazenada e não são registros exportados.

Nenhuma senha, token, chave ou valor do Vault foi incorporado por esta preparação.

## Arquivos

### `remote_public_20260914.sql`

Snapshot fiel, copiado byte por byte da origem autorizada. Não foi sanitizado,
formatado ou alterado.

- Tamanho: `84.218 bytes`
- SHA-256:
  `47CAB27AA4A666F1E1E402C7B68467408F3C952497AD8706DC754170E992C124`

### `candidate_public_20260914.sql`

Candidata portável produzida exclusivamente a partir do snapshot fiel. Preserva
a ordem e as definições de tabelas, colunas, enums, sequência, constraints,
índices, funções, triggers, RLS, policies, grants e privilégios padrão.

- Tamanho: `84.082 bytes`
- SHA-256:
  `99942BD9A94F0DBE51C6EAE395776B05C4998827E26860361AEB0338AC134261`

Adaptações de portabilidade, e somente estas:

1. remoção dos dois metacomandos `\restrict`/`\unrestrict`, exclusivos do
   cliente `psql`;
2. substituição de `CREATE SCHEMA public` por
   `CREATE SCHEMA IF NOT EXISTS public`, pois o Supabase local já fornece o
   schema.

As configurações de sessão do dump foram preservadas: o ambiente local está
configurado para PostgreSQL 17, compatível com a origem 17.6.

## Inventário de constraints validado localmente

- Primary keys: `19`
- Foreign keys: `49`
- UNIQUE constraints: `6`
- EXCLUDE constraints: `1`
- CHECK constraints: `13`
- Subtotal de PK, FK, UNIQUE e EXCLUDE: `75`
- Total geral de constraints: `88`

A contagem anterior de 75 representava apenas PK, FK, UNIQUE e EXCLUDE.
Incluindo as 13 CHECK constraints preservadas pela candidata, o total geral
correto é 88.

## Dependências externas

A candidata pressupõe que o ambiente autorizado forneça previamente:

- Supabase Auth, incluindo `auth.users` e `auth.uid()`;
- Supabase Vault, sem incluir ou criar seus segredos;
- `pgcrypto` no schema `extensions`;
- `btree_gist`, necessário à exclusão GiST da Agenda.

Essas dependências não devem ser substituídas por dados, usuários ou segredos
copiados da produção.

## Avisos de segurança

A candidata representa deliberadamente o estado legado encontrado no remoto.
Ela ainda contém grants amplos para `anon`, `authenticated` e `service_role`,
funções `SECURITY DEFINER` sem `search_path` fixado e as policies existentes na
data do snapshot. Preservar esse estado não significa aprová-lo como desenho de
segurança futuro.

O Financeiro novo, sua API privada e o corte de PostgREST não foram incluídos.
O hardening do Prontuário também não foi incluído. Esses componentes permanecem
como migrations posteriores, separadas, testáveis e auditáveis.

O código atual do Prontuário e a integração da Agenda já chamam RPCs do hardening
que não existem nesta baseline fiel. Esses fluxos somente poderão ser validados
depois da aplicação posterior e autorizada do hardening em ambiente não produtivo.

## Proibição de aplicação direta

Não executar estes arquivos diretamente em produção. A presença nesta pasta não
os transforma em migration e nenhum arquivo está sob `supabase/migrations`.

Nenhum dos dois SQLs foi executado, importado, restaurado ou aplicado durante a
preparação desta pasta. Nenhum banco ou serviço foi acessado ou alterado.

## Procedimento futuro sujeito a autorização expressa

1. Confirmar novamente hashes, versão do PostgreSQL e dependências externas.
2. Revisar os grants legados e documentar quais serão reproduzidos temporariamente.
3. Executar a candidata somente em Supabase local ou staging descartável.
4. Rodar testes de estrutura, RLS, isolamento entre clínicas e compatibilidade do
   frontend, sem reutilizar dados ou segredos reais.
5. Auditar separadamente as migrations do Financeiro e do hardening do Prontuário.
6. Solicitar nova autorização antes de qualquer aplicação posterior.
