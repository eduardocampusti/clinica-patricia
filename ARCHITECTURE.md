# ARCHITECTURE.md — Clínica Patrícia

## Stack ATUAL (o que está implementado hoje)

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | **React 19 + TypeScript + Vite + Tailwind CSS v4** | Rodando em `localhost:5173` em dev |
| Acesso a dados | **@supabase/supabase-js** (cliente oficial) | O frontend fala **direto** com o Supabase |
| Banco de dados | **PostgreSQL via Supabase** | Com RLS (Row Level Security) nativo |
| Autenticação | **Supabase Auth** (JWT) | signInWithPassword / getSession / onAuthStateChange |
| Cofre de segredos | **Supabase Vault** | Guarda as chaves de criptografia de CPF |
| Lint | oxlint | Configuração padrão do template Vite |

## Divergência importante em relação ao plano original

O plano de arquitetura inicial (docs do projeto, "aba projetos") previa uma camada
**Node.js + Fastify + Prisma** entre o frontend e o banco, para regras de negócio
complexas (especialmente o financeiro).

**Estado real:** essa camada Node/Fastify/Prisma **NÃO foi implementada.** Hoje o
frontend acessa o Supabase diretamente, e a segurança é garantida por **RLS no banco**.
Isso é adequado para leituras/escritas simples (login, cadastro, listagem). A decisão
de introduzir (ou não) a camada Node/Fastify fica para quando o **módulo financeiro**
(cálculos, fechamento por profissional) exigir lógica que não deva rodar no frontend.

**Implicação de segurança a conhecer:** a "trava por clínica ativa" (ver
`AUTH_AND_PERMISSIONS.md`) usa uma variável de sessão (`app.clinica_ativa`) que é
plenamente aplicável quando o acesso passa por um backend próprio. No caminho
**frontend-direto** atual, a segurança-base (isolamento por vínculo via RLS) continua
valendo sempre; a trava de "clínica ativa" precisa ser reforçada pela própria aplicação
(sempre filtrar pela clínica do endereço). Ver TODO.

## Multi-tenancy (multi-clínica)

- **Um único sistema**, isolamento por coluna `clinica_id` + **RLS**. NÃO são 3 sistemas.
- Toda tabela sensível tem `clinica_id`. A política de RLS garante, **no nível do banco**,
  que um usuário de uma clínica não acessa dado de outra — mesmo com bug na aplicação
  (defesa em profundidade).
- **Acesso por subdomínio por clínica** (planejado): `brotas.dominio`, `ipupiara.dominio`,
  `ibitiara.dominio` (equipe, travados na clínica) + `gestao.dominio` (proprietária, vê
  as 3, com seletor). O subdomínio resolve o `clinica_id` ativo. **O médico não escolhe
  clínica** — o endereço decide.

## Identidade visual por clínica (theming) — regra fundamental

- A tabela `clinicas` guarda a identidade visual: `cor_primaria`, `cor_secundaria`,
  `cor_menu` (e `logo_url`, `fonte`).
- Em runtime, o app lê a cor da clínica ativa e injeta em **CSS custom properties**
  (`--cor-primaria`, etc.). Variações (hover, fundo ~12%) derivam da base com `color-mix()`.
- **Regra inegociável:** componentes usam **sempre tokens** (`var(--cor-...)`),
  **nunca** cor literal (hex/rgb/nome). (Status: sistema de tema ainda não implementado —
  é o próximo passo.)

## Modo claro/escuro — regra fundamental

- Duas dimensões independentes: **cor da clínica** (do banco) e **claro/escuro**
  (preferência do usuário, persistida). A cor da clínica é a mesma nos dois modos; o que
  muda são os **neutros** (fundos, textos, bordas), via tokens.

## Responsividade — regra fundamental

- **Mobile-first**, breakpoints nativos do Tailwind (sm/md/lg/xl). Alvos: celular,
  tablet e desktop.

## Estrutura de pastas (frontend)

```
CLINICA PATRICIA/
├─ .env                 # VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (não versionado)
├─ .env.example         # modelo das variáveis
├─ .npmrc               # include=dev (contorna NODE_ENV=production do ambiente)
├─ index.html
├─ vite.config.ts       # plugins: react() + tailwindcss()
├─ package.json
├─ tsconfig*.json
├─ public/
└─ src/
   ├─ main.tsx
   ├─ App.tsx           # controle de sessão (getSession / onAuthStateChange)
   ├─ App.css
   ├─ index.css         # @import "tailwindcss";
   ├─ vite-env.d.ts     # tipagem das variáveis VITE_SUPABASE_*
   ├─ lib/
   │  └─ supabase.ts    # cliente Supabase (lê as env vars)
   ├─ pages/
   │  └─ Login.tsx      # tela de login (signInWithPassword)
   └─ assets/
```
(A pasta `.claude/` contém config do Claude Code — não afeta o build.)

## Deploy (planejado)

- **Vercel + GitHub**. Wildcard de subdomínio (`*.dominio`) apontando para o mesmo app;
  HTTPS automático. Backup/versionamento via **GitHub** (NÃO usar pasta sincronizada em
  nuvem como Google Drive/OneDrive para o código — causa conflito com `node_modules`).
