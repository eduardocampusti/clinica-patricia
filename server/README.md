# Servidor (Node.js + Fastify)

Fundação mínima da camada de backend, pré-requisito para o módulo Financeiro
(ver `10-PLANO-DIRETOR.md` e `11-PERFIL-PROPRIETARIA.md` na raiz do projeto).
Nesta etapa **não há lógica financeira nenhuma** — só prova que dá para
validar identidade e resolver a clínica ativa num servidor próprio, separado
do frontend.

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
| `PORT` | Porta do servidor Fastify (padrão `3333`). |
| `CORS_ORIGIN` | Origem do frontend permitida por CORS (padrão `http://localhost:5173`). |

**Este servidor NÃO usa `service_role` (chave privilegiada) nesta etapa.**
Toda consulta ao banco é feita com um client Supabase escopado ao próprio
token JWT de quem fez a requisição (`src/supabase.ts`) — ou seja, a mesma RLS
que já protege o frontend também protege o servidor, sem bypass nenhum.
**Quando introduzir `service_role`:** só quando um módulo futuro precisar de
verdade ignorar RLS de propósito (ex.: o Financeiro, ao processar uma
transação de caixa que grava em várias tabelas atomicamente e não deve
depender do vínculo de clínica do usuário logado para cada escrita
individual). Quando isso acontecer: variável nova `SUPABASE_SERVICE_ROLE_KEY`
só neste `.env`, nunca no `.env` do frontend nem versionada.

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

## Como o frontend vai chamar isso (futuro — ainda não implementado no frontend)

```ts
const { data: { session } } = await supabase.auth.getSession()
const resp = await fetch('http://localhost:3333/api/algum-endpoint', {
  headers: {
    Authorization: `Bearer ${session?.access_token}`,
    'X-Clinica-Id': clinicaAtivaId, // já disponível via useClinicaAtiva
  },
})
```

## Estrutura

```
server/
  src/
    env.ts                  # lê/valida variáveis de ambiente
    supabase.ts              # factory: client Supabase escopado ao token da requisição
    plugins/
      auth.ts                # preHandler requireAuth
      clinicaAtiva.ts         # preHandler resolveClinicaAtiva
    routes/
      ping.ts                 # GET /api/ping
    index.ts                  # bootstrap Fastify (cors + rotas + listen)
```
