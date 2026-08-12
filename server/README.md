# Servidor (Node.js + Fastify)

Camada de backend obrigatória para comandos do módulo Financeiro
(ver `10-PLANO-DIRETOR.md` e `11-PERFIL-PROPRIETARIA.md` na raiz do projeto).
O código da nova fronteira Fastify → PostgreSQL está preparado, mas depende de
`financeiro_fundacao.sql`, `financeiro_api_privada.sql` e do Vault em um
ambiente local/staging. **Nenhum desses SQLs foi executado.**

## Como rodar localmente

```bash
cd server
npm install
cp .env.example .env   # preencher SUPABASE_ANON_KEY (ver abaixo)
npm run dev
```

Sobe em `http://localhost:3333` (porta configurável via `PORT`, ver `.env.example`).

Outros scripts:
- `npm run build` — typecheck + compila para `dist/`.
- `npm run start` — roda a versão compilada (`dist/index.js`).

## Variáveis de ambiente (`.env`, arquivo próprio deste servidor)

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase (mesmo projeto do frontend). |
| `SUPABASE_ANON_KEY` | Chave pública `anon` — mesma natureza da usada no frontend, protegida por RLS. **Não é uma chave privilegiada.** |
| `FINANCEIRO_DATABASE_URL` | Conexão exclusiva do papel técnico `financeiro_api`. Nunca usar `postgres` ou `service_role`. |
| `FINANCEIRO_ASSERTION_HMAC_KEY` | Cópia da chave HMAC mantida somente no ambiente do servidor. Não versionar. |
| `FINANCEIRO_ASSERTION_KEY_ID` | Identificador da versão da chave (`financeiro-hmac-v1`). |
| `FINANCEIRO_DB_SSL` | `disable` somente no Supabase local; staging/produção exigem TLS. |
| `FINANCEIRO_DB_POOL_MAX` | Limite do pool PostgreSQL do Fastify. |
| `PORT` | Porta do servidor Fastify (padrão `3333`). |
| `CORS_ORIGIN` | Origem do frontend permitida por CORS (padrão `http://localhost:5173`). |

**Este servidor não usa e não prevê `service_role` no Financeiro.** O token do
usuário é validado pelo Supabase Auth. O Fastify assina uma asserção interna e
chama RPCs privadas por uma conexão PostgreSQL de privilégio mínimo. O banco
revalida vínculo, clínica e papel antes de escrever.

A chave HMAC fica cifrada no Supabase Vault e é lida somente pela função de
verificação. Não existe tabela própria de segredos e o valor não aparece em
migration, código, log ou documentação.

## Contrato de autenticação + clínica ativa

Toda rota protegida usa dois `preHandler` em sequência (`src/plugins/`):

1. **`requireAuth`** (`src/plugins/auth.ts`) — exige
   `Authorization: Bearer <access_token>` (o mesmo token que
   `supabase.auth.getSession()` já retorna no frontend). Valida contra o
   Supabase Auth (`auth.getUser`, chamada de rede — não decodifica o JWT
   localmente, para não precisar do segredo de assinatura). Decora
   `request.usuario` e `request.supabaseClient` (client já escopado a esse
   token). 401 se ausente/inválido/expirado.

2. **`resolveClinicaAtiva`** (`src/plugins/clinicaAtiva.ts`) — exige o header
   `X-Clinica-Id: <uuid>`. Confirma, consultando `clinicas` com o client
   escopado (RLS), que essa clínica pertence ao usuário autenticado. 400 se o
   header faltar, 403 se a clínica não pertencer a ele (a RLS já existente —
   `clinicas_do_usuario()` — decide isso, o servidor só reforça). Decora
   `request.clinicaAtiva`.

**Por que header e não subdomínio:** a resolução por subdomínio
(`brotas.dominio`, `ipupiara.dominio`...) ainda não existe nem no frontend
(ver `TODO.md`). O header é a ponte mínima até essa etapa existir — o
frontend de hoje já sabe qual é a `clinicaAtivaId`
(`src/hooks/useClinicaAtiva.ts`), só falta mandar para o servidor. Trocar por
subdomínio depois é mudança isolada em `resolveClinicaAtiva`, nada mais.

## Rota de teste: `GET /api/ping`

Prova que a base funciona — sem lógica de negócio.

```bash
curl http://localhost:3333/api/ping \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Clinica-Id: <uuid-da-clinica>"
```

Respostas:
- `401` — sem token ou token inválido/expirado.
- `400` — sem o header `X-Clinica-Id`.
- `403` — clínica informada não pertence ao usuário autenticado.
- `200` — `{ "usuario": { "id", "email" }, "clinica": { "id", "nome" } }`.

## Como o frontend chama comandos financeiros

```ts
const { data: { session } } = await supabase.auth.getSession()
const resp = await fetch('http://localhost:3333/api/algum-endpoint', {
  headers: {
    Authorization: `Bearer ${session?.access_token}`,
    'X-Clinica-Id': clinicaAtivaId, // já disponível via useClinicaAtiva
    'Idempotency-Key': crypto.randomUUID(),
  },
})
```

## Estrutura

```
server/
  src/
    env.ts                  # lê/valida variáveis de ambiente
    database.ts             # pool PostgreSQL do papel financeiro_api
    financeiro/             # contratos, canonicalização, HMAC e cliente RPC
    supabase.ts              # factory: client Supabase escopado ao token da requisição
    plugins/
      auth.ts                # preHandler requireAuth
      clinicaAtiva.ts         # preHandler resolveClinicaAtiva
    routes/
      ping.ts                 # GET /api/ping
      caixa.ts                # abertura, sangria, suprimento e fechamento
      entradaCaixa.ts         # cobranças e recebimentos
      despesas.ts             # despesas
      estornos.ts             # estornos compensatórios
      repasses.ts             # pagamento integral
    index.ts                  # bootstrap Fastify (cors + rotas + listen)
```
