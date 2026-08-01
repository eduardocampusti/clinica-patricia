# 02 — ARQUITETURA TÉCNICA

## Decisão de arquitetura: híbrido Supabase + Node.js

Modelo escolhido após discussão de prós e contras. **Não** é Node.js 100% independente (risco alto de segurança para dado médico), nem Supabase puro (limitado para regras de negócio complexas).

### Camadas

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS v4 | Mesma stack dos outros sistemas do Eduardo (SME Escolar, Brotar) — zero curva de aprendizado |
| **Backend / API** | Node.js + **Fastify** | Mais rápido que Express, validação de schema nativa (JSON Schema/Zod), menos boilerplate de segurança |
| **ORM** | **Prisma** | Migrations versionadas, type-safety, facilita auditoria de schema |
| **Banco de dados** | PostgreSQL (via Supabase) | Suporta RLS nativo — essencial para multi-tenant e isolamento entre clínicas |
| **Autenticação** | Supabase Auth + JWT + Refresh Token + RBAC | Solução testada em produção; reduz risco de brecha de segurança |
| **Storage de arquivos** | Supabase Storage (ou Cloudflare R2) | Exames, laudos, documentos — nunca armazenar binário direto no banco |
| **Deploy** | Vercel + GitHub | Mesmo pipeline dos outros projetos do Eduardo |

### Papel de cada camada

- **Supabase** = fundação de dados e autenticação. Telas simples (listar pacientes, agenda) podem ler direto do Supabase, com RLS garantindo isolamento.
- **Node.js/Fastify** = camada de regras de negócio complexas. TUDO que envolve cálculo, validação de permissão multiespecialidade, ou lógica financeira passa OBRIGATORIAMENTE pelo Node.js antes de tocar o banco. Nunca cálculo financeiro direto do frontend.

## Multi-tenancy (multi-clínica)

**Padrão: 1 sistema só, isolamento por `clinica_id` + RLS.** NÃO são 3 sistemas separados.

- Toda tabela sensível (pacientes, atendimentos, financeiro, usuários, especialidades) tem coluna `clinica_id`.
- Política de RLS no Postgres garante, **no nível do banco**, que um usuário de uma clínica não acessa dado de outra — mesmo com bug na aplicação. Isso é "defesa em profundidade" (aplicação + banco).
- Acesso provavelmente por **subdomínio por clínica**: `brotas.dominio.com`, `ipupiara.dominio.com`, `ibitiara.dominio.com` — mesmo código, cada subdomínio resolve seu `clinica_id`.

### Vantagens do multi-tenant sobre 3 sistemas
- Corrige bug uma vez, resolve nas 3 clínicas
- 1 projeto Supabase, 1 deploy, 1 domínio (custo menor)
- Isolamento garantido no banco (RLS)
- Visão consolidada da proprietária fica viável no futuro
- Nova clínica futura = adicionar uma linha na tabela `clinicas`

## Identidade visual por clínica (THEMING — REGRA FUNDAMENTAL)

> Esta é uma regra de fundação. TODO módulo deve segui-la. Violá-la é a causa raiz de "módulo novo saiu do padrão visual" em projetos anteriores.

A tabela `clinicas` guarda tanto isolamento quanto identidade visual:
- `logo_url`, `cor_primaria`, `cor_secundaria`, `cor_menu` (e opcionalmente `fonte`)
- Exemplos de tema por clínica:
  - Clínica Brotas → tons de **azul**
  - Clínica Ipupiara → tons de **verde**
  - Clínica Ibitiara → outro tom (a definir)
- Cada clínica tem seu tema, editável, sem tocar em código.

### Como funciona (3 camadas)

1. **Banco (`clinicas`)** — cada clínica guarda sua cor. Fonte única da verdade sobre a cor.
2. **Variáveis CSS dinâmicas** — no login/carga, o sistema lê a cor da clínica ativa e injeta em CSS custom properties: `--cor-primaria`, `--cor-secundaria`, `--cor-menu`, etc. Isso gera automaticamente também as variações (hover, fundo suave a ~12% de opacidade, etc.) a partir da cor base.
3. **Componentes** — TODO componente (botão, menu, badge, card) usa `var(--cor-primaria)`, NUNCA um hex direto (`#1D9E75`) nem nome de cor ("azul"). O mesmo botão fica azul em Brotas e verde em Ipupiara sem código duplicado.

### REGRA INEGOCIÁVEL para todos os módulos
- **Proibido** escrever cor literal (hex, rgb, nome) em qualquer componente.
- **Obrigatório** usar sempre os tokens (`var(--cor-...)` ou classes de tema do Tailwind mapeadas para esses tokens).
- Isso torna impossível um módulo novo "sair do padrão": ele é obrigado a herdar o token. O padrão se auto-reforça.
- Ao gerar prompts de implementação de qualquer módulo, SEMPRE incluir a instrução: "use exclusivamente os design tokens definidos na fundação; nunca cores literais".

## Modo claro e escuro (light/dark — REGRA FUNDAMENTAL)

> Também é regra de fundação. Combina-se com o tema por clínica usando o mesmo sistema de tokens.

Existem DUAS dimensões de tema independentes que atuam ao mesmo tempo:

| Dimensão | Controlada por | Exemplo |
|---|---|---|
| Cor da clínica | Banco (`clinicas`) | Brotas = azul, Ipupiara = verde |
| Claro / Escuro | Preferência do usuário (salva) | Cada usuário escolhe seu modo |

O sistema deve funcionar nas 4 combinações (ex: Brotas-claro, Brotas-escuro, Ipupiara-claro, Ipupiara-escuro).

### Como funciona
- A **cor da clínica** (o "azul", o "verde") é a mesma nos dois modos.
- O que muda entre claro e escuro são os **neutros**: fundos, textos, bordas.
- Tokens de neutro (`--texto-principal`, `--texto-secundario`, `--fundo-pagina`, `--fundo-card`, `--borda`) trocam de valor automaticamente conforme o modo ativo.
- O componente nunca sabe qual modo está ativo — ele só pede "cor de texto principal" e o token resolve.

### REGRA INEGOCIÁVEL (dark mode)
- **Proibido** cor de texto/fundo literal (ex: `color: #333`). O erro clássico é texto que some no modo escuro (cinza escuro sobre fundo escuro).
- **Obrigatório** usar tokens de neutro para todo texto, fundo e borda.
- A preferência claro/escuro do usuário é **persistida** (salva no perfil ou storage), não reseta a cada visita.
- Teste mental antes de finalizar qualquer tela: "se o fundo fosse quase preto, todo texto ainda seria legível?"
- Prompts de implementação sempre exigem que a tela funcione nos dois modos.

## Responsividade (REGRA FUNDAMENTAL — mobile-first)

> Também é regra de fundação, não ajuste posterior. "Deixar responsivo depois" é outra armadilha conhecida de projetos anteriores.

- Abordagem **mobile-first**: construir primeiro para celular (tela pequena, mais restritiva), depois expandir para tablet e desktop.
- Usar os **breakpoints nativos do Tailwind** (`sm`, `md`, `lg`, `xl`).
- Alvos: **celular, tablet e computador** — os três obrigatórios.
- Padrões esperados: sidebar vira menu hambúrguer/drawer no celular; cards empilham em coluna única no mobile e vão para grid em telas maiores; tabelas viram cards no mobile (padrão que Eduardo já usou no SME Escolar).
- Todo módulo nasce responsivo por padrão. Prompts de implementação sempre incluem a exigência de responsividade nos 3 tamanhos.

## Segurança / LGPD (dado sensível)

Nível de exigência mais alto (dado de saúde). Requisitos desde o início:
- Criptografia AES-256 em campos sensíveis (CPF, diagnóstico, prontuário) + TLS em trânsito
- Consentimento explícito do paciente registrado no sistema
- Direito de portabilidade e esquecimento (exportar/apagar dados do paciente)
- **Trilha de auditoria** — log de toda leitura/escrita em dado de paciente (quem, quando, o quê). É defesa jurídica em caso de fiscalização/incidente.
- Política de retenção de logs definida
