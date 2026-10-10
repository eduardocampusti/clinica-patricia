# Supabase local

Esta pasta prepara um ambiente exclusivamente local e reproduzivel. O baseline real do banco ainda
nao foi capturado: `migrations/` permanece vazio de proposito e `seed.sql` nao cria objetos nem dados.
A versao remota do PostgreSQL tambem nao foi confirmada; portanto, a configuracao atual nao declara
paridade com producao.

## Pre-requisitos

- Node.js e dependencias instaladas com `npm install` ou `npm ci`.
- Docker Desktop com o daemon em execucao.
- Supabase CLI fornecida pelo proprio projeto; nao e necessaria instalacao global.

## Operacoes locais

```text
npm run supabase:version
npm run supabase:validate
npm run supabase:start
npm run supabase:status
npm run supabase:reset
npm run supabase:stop
```

`supabase:reset` usa explicitamente `db reset --local`. Os comandos nao aceitam argumentos extras,
nao expoem operacoes remotas e recusam execucao quando encontram metadados de projeto linked. Nunca
use comandos da CLI diretamente para contornar essa protecao e nunca use `--linked` neste projeto.

## Baseline pendente

Quando houver uma conexao PostgreSQL temporaria e somente leitura, o schema real devera ser capturado
sem dados, sem `auth.users` e sem conteudo do Vault. O resultado precisa ser sanitizado e revisado antes
de virar a primeira migration. Os SQLs historicos da raiz e os SQLs financeiros nao devem ser movidos,
copiados ou executados como migrations durante esta etapa.

Somente depois do baseline devem ser criados seeds sinteticos com identidades, clinicas e operacoes de
teste ficticias. Nenhum UUID, CNPJ, paciente, segredo ou outra informacao real deve ser reutilizado.
