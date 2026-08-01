# API_ROUTES.md — Clínica Patrícia

## Situação atual: NÃO há uma camada de API própria (Node/Fastify)

Hoje o frontend acessa os dados **diretamente pelo Supabase**, usando o cliente
`@supabase/supabase-js` (arquivo `src/lib/supabase.ts`). A "API", na prática, é:

1. **PostgREST do Supabase** — cada tabela vira endpoints REST automáticos, protegidos
   por **RLS**. O acesso se dá via os métodos do cliente (`.from('tabela').select()/
   .insert()/.update()`), nunca por URLs montadas à mão.
2. **Supabase Auth** — autenticação.
3. **Funções RPC** no banco (chamáveis via `supabase.rpc('nome', {...})`).

> Quando o **módulo financeiro** exigir cálculos/regra de negócio que não devam rodar no
> frontend, avaliar introduzir a camada **Node.js + Fastify** planejada. Enquanto isso,
> este arquivo descreve a superfície de acesso atual.

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

## Endpoints/funções PLANEJADOS (ainda não criados)

- **`clinica_publica_por_subdomain(subdomain)`** — RPC `SECURITY DEFINER` que retorna
  apenas `nome`, `logo_url`, `cor_primaria/secundaria/menu` de uma clínica, para o app
  **pintar a tela de login antes do login** (o papel `anon` não lê a tabela `clinicas`).
  Necessária para o theming por subdomínio.
- **API Node/Fastify** para o módulo financeiro (cálculos, fechamento por profissional),
  com propagação da identidade do usuário e da clínica ativa para o RLS continuar valendo.

## Variáveis de ambiente necessárias

Ver `.env` (frontend). Detalhes em `AUTH_AND_PERMISSIONS.md` e `.env.example`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
