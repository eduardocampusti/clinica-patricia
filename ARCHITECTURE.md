# ARCHITECTURE.md — Clínica Patrícia

## Stack ATUAL (o que está implementado hoje)

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | **React 19 + TypeScript + Vite + Tailwind CSS v4** | Rodando em `localhost:5173` em dev |
| Acesso a dados | **@supabase/supabase-js + pg** | Leituras simples via RLS; mutações financeiras via Fastify/RPC privada |
| Banco de dados | **PostgreSQL via Supabase** | Com RLS (Row Level Security) nativo |
| Autenticação | **Supabase Auth** (JWT) | signInWithPassword / getSession / onAuthStateChange |
| Cofre de segredos | **Supabase Vault** | Guarda as chaves de criptografia de CPF |
| Lint | oxlint | Configuração padrão do template Vite |

## Divergência importante em relação ao plano original

O plano de arquitetura inicial (docs do projeto, "aba projetos") previa uma camada
**Node.js + Fastify + Prisma** entre o frontend e o banco, para regras de negócio
complexas (especialmente o financeiro).

**Estado real (atualizado em 12/08/2026): IMPLEMENTADO ESTATICAMENTE — AGUARDA
TESTE EM BANCO.** O `/server` contém a fronteira financeira e o frontend está
integrado aos comandos Fastify. O Fastify valida o JWT real, assina o comando
com HMAC e usa uma conexão PostgreSQL limitada ao papel `financeiro_api`. As
RPCs mutáveis ficam em `financeiro_privado`, fora do PostgREST, e revalidam
identidade, clínica e papel. Não há Prisma nem `service_role`.

Essa arquitetura ainda está **bloqueada para execução**: os SQLs não foram
aplicados, o segredo não foi criado no Vault e o schema-base local/staging não
foi reconstruído. Produção/Supabase não foi alterado. Até essa validação, o
banco continua no estado anterior; RPCs, RLS, Vault, roles técnicas,
idempotência concorrente, fechamento atômico e repasses não foram testados em
banco.

A configuração financeira é lazy: o backend existente inicia sem
`FINANCEIRO_DATABASE_URL` e `FINANCEIRO_ASSERTION_HMAC_KEY`. A primeira operação
financeira privada sem essas variáveis recebe HTTP `503` controlado e não cria o
pool. Typecheck/build do backend, 6/6 testes unitários, `npm audit` sem
vulnerabilidades e typecheck/build do frontend passaram em 12/08/2026.

Commits técnicos na branch `financeiro-v2`: `ec36d1f` (SQL), `271db41`
(Fastify) e `88b5bca` (frontend). O próximo bloqueio é um ambiente local/staging
reproduzível com baseline do schema antes de executar os SQLs.

**Implicação de segurança a conhecer:** a "trava por clínica ativa" (ver
`AUTH_AND_PERMISSIONS.md`) usa uma variável de sessão (`app.clinica_ativa`) que é
plenamente aplicável quando o acesso passa por um backend próprio. No caminho
**frontend-direto** atual, a segurança-base (isolamento por vínculo via RLS) continua
valendo sempre; a trava de "clínica ativa" precisa ser reforçada pela própria aplicação
(sempre filtrar pela clínica do endereço). Ver TODO.

## Multi-tenancy (multi-clínica)

- **Um único sistema para as duas clínicas operacionais**, com isolamento por
  coluna `clinica_id` + **RLS**.
- Toda tabela sensível tem `clinica_id`. A política de RLS garante, **no nível do banco**,
  que um usuário de uma clínica não acessa dado de outra — mesmo com bug na aplicação
  (defesa em profundidade).
- **Acesso por subdomínio por clínica** (planejado): `brotas.dominio`, `ipupiara.dominio`
  (equipe, travados na clínica) + `gestao.dominio` (proprietária, vê as 2, com seletor).
  O subdomínio resolve o `clinica_id` ativo. **O médico não escolhe clínica** — o
  endereço decide.
- **O laboratório da proprietária (Ibitiara) NÃO é uma unidade neste sistema.** Terá
  sistema próprio; integração futura via API exposta pelo lab, identificada como
  **INT-LAB**. A decisão canônica está em `DECISAO-IBITIARA-LABORATORIO.md`.

### Estado histórico, decisão e banco atual

- **Histórico:** Ibitiara existiu como tenant e foi usada em testes de isolamento,
  tema, autenticação e autorização. Esses fatos não devem ser reescritos.
- **Decisão arquitetural:** somente Brotas e Ipupiara são tenants operacionais;
  Ibitiara é laboratório externo.
- **Estado documentado do banco:** o registro antigo ainda existe e não foi
  desativado. A futura mudança será lógica (`ativo = false`), preservará todos os
  dados e depende de plano aprovado. `desativar_ibitiara.sql` não está aprovado.

## Integração com laboratório externo — INT-LAB

`INT-LAB` será uma integração entre dois sistemas e dois domínios de dados, não
uma comunicação entre tenants. O fluxo conceitual é pedido de exame na clínica →
API do laboratório → resultado → vínculo auditável ao prontuário.

O laboratório não terá acesso direto ao banco/Supabase das clínicas. Antes de
implementar devem ser definidos contrato da API, autenticação máquina a máquina,
identificação do paciente, base legal LGPD, idempotência, retentativas, auditoria,
assinatura/versionamento do laudo, anexos e retenção. A iniciativa ainda não tem
posição aprovada no roadmap.

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

## Estrutura de pastas (frontend + servidor)

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
├─ server/              # backend Node.js + Fastify — projeto próprio, package.json
│  │                    # e node_modules independentes do frontend (ver server/README.md)
│  └─ src/
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
