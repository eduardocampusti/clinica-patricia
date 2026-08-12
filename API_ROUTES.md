# API_ROUTES.md — Clínica Patrícia

## Situação atual: Fastify obrigatório para mutações financeiras

Para autenticação, leituras e fluxos não financeiros, o frontend ainda acessa
dados **diretamente pelo Supabase**, usando o cliente `@supabase/supabase-js`
(arquivo `src/lib/supabase.ts`). A superfície disponível é:

1. **PostgREST do Supabase** — cada tabela vira endpoints REST automáticos, protegidos
   por **RLS**. O acesso se dá via os métodos do cliente (`.from('tabela').select()/
   .insert()/.update()`), nunca por URLs montadas à mão.
2. **Supabase Auth** — autenticação.
3. **Funções RPC** no banco (chamáveis via `supabase.rpc('nome', {...})`).

O código da fronteira financeira está implementado no `/server` e integrado ao
frontend. **Status: IMPLEMENTADO ESTATICAMENTE — AGUARDA TESTE EM BANCO.** Ele
ainda não opera de ponta a ponta porque os SQLs e o Vault aguardam ambiente
local/staging reproduzível e baseline do schema. Nenhum SQL financeiro foi
executado e produção/Supabase não foi alterado.

Todas as mutações financeiras exigem Bearer token, `X-Clinica-Id` e
`Idempotency-Key`. A identidade não é recebida no body.

## Autenticação (Supabase Auth) — em uso

| Operação | Chamada | Onde é usada |
|---|---|---|
| Login | `supabase.auth.signInWithPassword({ email, password })` | `src/pages/Login.tsx` |
| Logout | `supabase.auth.signOut()` | área logada (`App.tsx`) |
| Sessão atual | `supabase.auth.getSession()` | `App.tsx` (na carga) |
| Ouvir mudanças | `supabase.auth.onAuthStateChange(cb)` | `App.tsx` |

## Acesso a dados (via cliente + RLS) — disponível

Todas as leituras/escritas respeitam o RLS (ver `AUTH_AND_PERMISSIONS.md`). Exemplos do
que o usuário autenticado consegue fazer conforme suas permissões:

| Recurso | Operações disponíveis | Regra de acesso |
|---|---|---|
| `clinicas` | SELECT | só as clínicas do usuário |
| `usuarios` | SELECT/UPDATE (a si mesmo) | `id = auth.uid()` |
| `usuarios_clinicas` | SELECT (os próprios vínculos) | `usuario_id = auth.uid()` |
| `pacientes` | SELECT/INSERT/UPDATE | clínicas do usuário **+** trava por clínica ativa |
| `auditoria` | SELECT | só a proprietária |

## Funções RPC no banco (chamáveis via `supabase.rpc`)

- `clinicas_do_usuario()`, `eh_proprietaria(clinica)`, `clinica_ativa()` — usadas
  internamente pelo RLS; normalmente não chamadas direto pelo frontend.
- `cpf_encrypt`, `cpf_decrypt`, `cpf_hash` — criptografia de CPF (uso em INSERT/consulta
  de pacientes; idealmente encapsuladas em uma função de cadastro no futuro).

## Endpoints Fastify financeiros preparados

- `POST /api/caixa/abrir`
- `POST /api/caixa/entrada`
- `POST /api/financeiro/cobrancas`
- `POST /api/financeiro/cobrancas/:id/receber`
- `POST /api/financeiro/despesas`
- `POST /api/financeiro/despesas/:id/pagar`
- `POST /api/caixa/sangrias`
- `POST /api/caixa/suprimentos`
- `POST /api/caixa/fechar`
- `POST /api/financeiro/estornos`
- `POST /api/financeiro/repasses/:id/pagar`

As rotas estão registradas no Fastify, mas a execução financeira real depende
da configuração privada e dos SQLs aplicados em ambiente autorizado. O servidor
inicia normalmente sem `FINANCEIRO_DATABASE_URL` e
`FINANCEIRO_ASSERTION_HMAC_KEY`; nesse caso, a chamada a uma rota financeira
privada retorna HTTP `503` controlado, antes de criar o pool PostgreSQL.

Checks estáticos concluídos em 12/08/2026: typecheck/build do backend, 6/6
testes unitários, `npm audit` com 0 vulnerabilidades, typecheck/build do frontend
e revisão de que todas as mutações financeiras passam pelo Fastify. Isso não
equivale a teste de SQL, RPC, RLS, Vault, concorrência ou atomicidade em banco.

## Endpoints/funções ainda planejados

- **`clinica_publica_por_subdomain(subdomain)`** — RPC `SECURITY DEFINER` que retorna
  apenas `nome`, `logo_url`, `cor_primaria/secundaria/menu` de uma clínica, para o app
  **pintar a tela de login antes do login** (o papel `anon` não lê a tabela `clinicas`).
  Necessária para o theming por subdomínio.

## Variáveis de ambiente necessárias

Ver `.env` (frontend). Detalhes em `AUTH_AND_PERMISSIONS.md` e `.env.example`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

No backend, as variáveis financeiras privadas são lazy e obrigatórias somente
ao executar comandos financeiros:

- `FINANCEIRO_DATABASE_URL`
- `FINANCEIRO_ASSERTION_HMAC_KEY`
- `FINANCEIRO_ASSERTION_KEY_ID` (identificador, com default não secreto)
