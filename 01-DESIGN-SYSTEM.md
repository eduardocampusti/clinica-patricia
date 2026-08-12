# 01-DESIGN-SYSTEM.md — Sistema visual corporativo (v3)

> **FONTE DA VERDADE VISUAL DO PROJETO.** Todo prompt de frontend DEVE citar
> os valores exatos deste arquivo. Nunca aproximar de memória.
>
> Substitui a v2 (sombras tingidas + Fraunces + categorias coloridas) em
> 11/08/2026. Motivação: adoção de nova referência visual gerada no Google
> Stitch, aprovada por Eduardo. A v2 está arquivada em
> `docs/_historico/01-DESIGN-SYSTEM-v2.md`.
>
> Direção visual: **Corporate SaaS moderno** (inspiração Linear/Stripe),
> com a personalidade de marca por clínica mantida na sidebar colorida.
> Decisão: repaginar TODAS as telas com este novo padrão.

---

## 1. Paleta de cores

### 1.1 Cor da clínica (dinâmica — mecânica JÁ IMPLEMENTADA, não mexer)

O código já tem `--cor-primaria`, `--cor-secundaria` e `--cor-menu`
injetados em runtime a partir da tabela `clinicas` no banco.
Tokens derivados via `color-mix()`:
- `--cor-primaria-hover` (85% da primária + 15% preto)
- `--cor-primaria-suave` (12% da primária + 88% transparente)

Paleta das duas clínicas que compõem o estado operacional aprovado:
| Clínica | `cor_primaria` | `cor_menu` |
|---|---|---|
| Brotas | `#2563eb` (azul) | escuro derivado |
| Ipupiara | `#16a34a` (verde) | escuro derivado |

> Estado arquitetural (12/08/2026): Ibitiara foi reclassificada como laboratório
> externo e não compõe a paleta operacional do sistema das clínicas. Estado real
> documentado do banco: a antiga linha "Clínica Ibitiara" ainda existe e não foi
> desativada; sua cor histórica deve ser preservada com o registro. A desativação
> futura depende de plano aprovado. Ver `DECISAO-IBITIARA-LABORATORIO.md`.

A v3 NÃO muda essa mecânica — usa os mesmos tokens.

### 1.2 Neutros (modo claro)

Mudança em relação à v2: fundo de página mais claro e limpo
(SaaS clean), sem tingimento roxo.

| Token CSS | Valor | Uso |
|---|---|---|
| `--fundo-pagina` | `#F8FAFC` | Fundo geral — clean, levemente frio |
| `--fundo-card` | `#FFFFFF` | Cards e superfícies elevadas |
| `--texto-principal` | `#131B2E` | Texto primário — azul-marinho muito escuro |
| `--texto-secundario` | `#434655` | Texto de apoio, labels |
| `--texto-terciario` | `#737686` | Legendas, placeholders, captions |
| `--borda` | `#E2E8F0` | Bordas de cards, inputs, divisores |
| `--borda-sutil` | `#F1F5F9` | Divisores internos de tabela |

### 1.3 Neutros (modo escuro)

| Token CSS | Valor | Uso |
|---|---|---|
| `--fundo-pagina` | `#0F172A` | Fundo geral escuro (slate-900) |
| `--fundo-card` | `#1E293B` | Cards elevados (slate-800) |
| `--texto-principal` | `#F1F5F9` | Texto primário claro |
| `--texto-secundario` | `#94A3B8` | Texto de apoio |
| `--texto-terciario` | `#64748B` | Legendas |
| `--borda` | `#334155` | Bordas (slate-700) |
| `--borda-sutil` | `#1E293B` | Divisores internos |

### 1.4 Semânticas (estados)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--cor-sucesso` | `#16A34A` | `#4ADE80` | Pago, confirmado, ativo |
| `--cor-erro` | `#DC2626` | `#F87171` | Cancelado, erro, pendência |
| `--cor-alerta` | `#D97706` | `#FBBF24` | Aguardando, atenção |
| `--cor-info` | `#2563EB` | `#60A5FA` | Informativo, em andamento |

Fundo suave derivado: `color-mix(in srgb, var(--cor-X) 10%, transparent)`.
Borda derivada: `color-mix(in srgb, var(--cor-X) 25%, transparent)`.
**Nunca cor sólida forte como fundo** — sempre opacidade baixa (10-15%).

### 1.5 Card de destaque financeiro (Caixa de Hoje)

O card principal de caixa usa a `--cor-primaria` da clínica como fundo
sólido, com texto branco. É o ÚNICO card com fundo colorido forte —
todos os demais são brancos com borda sutil.

```css
.card-caixa-destaque {
  background: var(--cor-primaria);
  color: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
}
```

### 1.6 Assinatura dourada (selo de clínica — MANTIDO da v2)

| Token | Claro | Escuro |
|---|---|---|
| `--dourado` | `#B8873D` | `#D4A64F` |
| `--dourado-texto` | `#8C6529` | `#E8C77A` |
| `--dourado-fundo` | `#FBF6EC` | `color-mix(in srgb, #B8873D 20%, transparent)` |

Uso: selo circular da clínica (identidade oficial + documentos impressos)
e card de repasse. **Nunca decorativo.**

---

## 2. Tipografia

### Mudança principal: Geist substitui Fraunces + Inter

A v3 adota **Geist** como fonte única do sistema e **JetBrains Mono**
para dados numéricos e labels técnicos. Justificativa: Geist tem
precisão técnica superior para interfaces densas em dados (agendas,
tabelas financeiras, prontuários) e é a fonte padrão de plataformas
SaaS de referência (Vercel, Linear).

| Elemento | Fonte | Peso | Tamanho | Letter-spacing | Uso |
|---|---|---|---|---|---|
| Display (valor financeiro grande) | Geist | 700 | 36-48px | -0.04em | Card de caixa, saldo |
| Título de tela (h1) | Geist | 600 | 28-30px | -0.02em | "Boa tarde, Patrícia", "Financeiro" |
| Título de seção (h2) | Geist | 600 | 20-24px | -0.01em | "Agenda do Dia", "Alertas" |
| Subtítulo de card (h3) | Geist | 600 | 16-18px | normal | Nome do card, coluna de tabela |
| Corpo (body) | Geist | 400 | 14px | normal | Texto geral, parágrafos |
| Corpo menor | Geist | 400 | 13px | normal | Descrições secundárias |
| Caption | Geist | 400 | 12px | normal | Legendas, timestamps |
| Label técnico/badge | JetBrains Mono | 500 | 11-12px | 0.02em | Status badges, IDs, preços em tabela |
| Mobile h1 | Geist | 600 | 24px | normal | Título de tela em celular |

**Regra:** `font-variant-numeric: tabular-nums` obrigatório em qualquer
número em coluna, lista ou tabela (alinhamento vertical perfeito).

Import via Google Fonts:
```
Geist:wght@400;500;600;700
JetBrains Mono:wght@400;500
```

---

## 3. Espaçamento e grid

### Unidade base: 4px (half-step do grid de 8px)

| Token | Valor | Uso |
|---|---|---|
| `--space-xs` | `4px` | Espaço mínimo (entre ícone e texto) |
| `--space-sm` | `8px` | Espaço interno de badges, gap entre elementos inline |
| `--space-md` | `16px` | Padding padrão, gap entre cards |
| `--space-lg` | `24px` | Padding de card, margin entre seções |
| `--space-xl` | `32px` | Margin entre blocos maiores |

### Grid responsivo

| Breakpoint | Colunas | Gutter | Margem lateral |
|---|---|---|---|
| Mobile (<640px) | 4 | 16px | 16px |
| Tablet (640-1024px) | 8 | 16px | 24px |
| Desktop (>1024px) | 12 | 20px | 24px |

Largura máxima do conteúdo: `1440px`.

---

## 4. Elevação e sombras

### Mudança da v2 → v3: sombras simplificadas

A v3 abandona as sombras tingidas por categoria da v2. Em vez disso,
usa sombras neutras sutis + borda de 1px para definição. Mais limpo,
mais fácil de manter, mais profissional.

| Nível | Box-shadow | Uso |
|---|---|---|
| Baixo (cards) | `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)` | Cards de conteúdo, linhas de tabela hover |
| Médio (dropdowns) | `0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.06)` | Menus dropdown, popovers |
| Alto (modais) | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` | Modais, drawers, overlays |

**Regra:** todo card e superfície elevada DEVE ter `border: 1px solid var(--borda)` além da sombra. Sem a borda, a definição se perde em
fundos claros. No modo escuro, a borda é o que mais importa (sombra
quase não se vê sobre fundo escuro).

Tokens CSS:
```css
--sombra-baixa: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
--sombra-media: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.06);
--sombra-alta: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
```

---

## 5. Formas (border-radius)

| Elemento | Raio | Uso |
|---|---|---|
| Botões, inputs | `8px` | Controles interativos |
| Cards, containers | `12-16px` | Superfícies de conteúdo |
| Modais | `16px` | Overlays |
| Badges, chips | `9999px` (pill) | Status, tags, contadores |
| Avatares | `50%` (círculo) | Fotos de paciente/profissional |

**Regra:** hover NUNCA muda a forma — só cor de fundo ou sombra.

---

## 6. Componentes

### 6.1 Sidebar (REGRA CRÍTICA — fundo colorido por clínica)

**Esta é a exceção deliberada ao padrão SaaS clean.** Enquanto o Stitch
gerou sidebar com fundo branco, o projeto Clínica Patrícia MANTÉM a
sidebar com fundo colorido por clínica. É identidade de marca e ajuda
a recepcionista a saber em qual sistema/clínica está operando.

```
Fundo:           var(--cor-menu) — vem do banco, por clínica
Texto/ícones:    rgba(255,255,255, 0.92)
Texto secundário: rgba(255,255,255, 0.60)
Item hover:      rgba(255,255,255, 0.08) sobre --cor-menu
Item ativo:      rgba(255,255,255, 0.15) sobre --cor-menu + barra lateral 3px branca
Separadores:     rgba(255,255,255, 0.12)
```

Ícones: 20px, stroke 1.5px (Lucide icons). Altura mínima de item: 40px.

**Menu padrão (definitivo — usar em TODAS as telas):**
1. Dashboard
2. Agenda
3. Atendimentos
4. Pacientes
5. Prontuários
6. Financeiro
7. Relatórios
8. Equipe
9. Especialidades
10. Configurações
---
(rodapé) Ajuda · Perfil · Sair

Botão de ação rápida: "+ Novo Agendamento" — fixo no topo da sidebar,
abaixo do logo. Fundo branco, texto na cor da clínica.

No mobile: sidebar vira drawer (abre por cima com overlay escuro).
O botão "+ Novo Agendamento" migra para FAB (floating action button)
no canto inferior direito.

### 6.2 Header (barra superior)

Fundo: `var(--fundo-card)` (branco/escuro conforme modo).
Borda inferior: `1px solid var(--borda)`.
Altura: `64px`.

Conteúdo (da esquerda para direita):
- **Abas de clínica** (SÓ para proprietária): "Brotas | Ipupiara"
  — aba ativa com underline na `--cor-primaria` e texto peso 600.
  Para funcionário/médico: texto fixo "Clínica [Nome]" sem abas.
- **Busca**: input com ícone de lupa + atalho "Cmd+K", fundo
  `var(--fundo-pagina)`, raio `8px`.
- **Notificações**: ícone de sino com badge vermelho para contagem.
- **Grid de apps**: ícone de grid (futuro).
- **CTA principal**: botão "Novo Atendimento", fundo `--cor-primaria`,
  texto branco, raio `8px`.
- **Avatar do usuário**: circular, 36px, com dropdown.

### 6.3 Cards de KPI (indicadores numéricos)

Layout: row de 4 cards no desktop, 2x2 no tablet, stack no mobile.

**Card de destaque** (Caixa de Hoje — o primeiro):
- Fundo: `var(--cor-primaria)` sólido
- Texto: branco
- Valor: Geist 700, 36px
- Badge interno: fundo `rgba(255,255,255,0.2)`, texto branco

**Cards secundários** (Recebido, Pendente, Atendimentos, Aguardando):
- Fundo: `var(--fundo-card)` (branco)
- Borda: `1px solid var(--borda)`
- Label: `--texto-terciario`, Geist 400, 11px, uppercase, letter-spacing 0.05em
- Valor: `--texto-principal`, Geist 600, 24px
- Ícone: 20px, cor semântica (verde=recebido, vermelho=pendente, etc.)

### 6.4 Botões

| Variante | Fundo | Texto | Borda | Uso |
|---|---|---|---|---|
| Primário | `--cor-primaria` | branco | nenhuma | CTA principal (Confirmar, Salvar) |
| Secundário | `--cor-primaria-suave` | `--cor-primaria` | nenhuma | Ação alternativa |
| Outline | transparente | `--cor-primaria` | `1px solid var(--borda)` | Cancelar, Voltar |
| Ghost | transparente | `--cor-primaria` | nenhuma | Links de ação inline |
| Destrutivo | `--cor-erro` | branco | nenhuma | Excluir, Cancelar agendamento |

Todos: raio `8px`, padding `8px 16px`, sem box-shadow. Hover muda
opacidade do fundo (90%) — nunca muda forma, borda ou sombra.

### 6.5 Inputs e formulários

- Borda: `1px solid var(--borda)`, raio `8px`
- Padding: `10px 12px`
- Focus: `ring` de 2px na `--cor-primaria` a 20% de opacidade
  (`box-shadow: 0 0 0 2px var(--cor-primaria-suave)`)
- Label: SEMPRE acima do input, Geist 500, 12-13px, `--texto-secundario`
- Placeholder: `--texto-terciario`
- Erro: borda troca para `--cor-erro`, mensagem em `--cor-erro` abaixo

### 6.6 Badges de status (chips)

Formato pill (border-radius `9999px`). Fundo em 10% de opacidade da
cor semântica, texto em 100% da cor.

| Status | Cor base | Fundo (10%) | Texto (100%) |
|---|---|---|---|
| Confirmado | `--cor-sucesso` | verde 10% | verde |
| Aguardando | `--cor-alerta` | amarelo 10% | amarelo escuro |
| Em atendimento | `--cor-info` | azul 10% | azul |
| Finalizado | `--texto-terciario` | cinza 10% | cinza |
| Pendente (pagamento) | `--cor-erro` | vermelho 10% | vermelho |
| Pago | `--cor-sucesso` | verde 10% | verde |
| Cancelado | `--cor-erro` | vermelho 10% | vermelho |

JetBrains Mono, 500, 11px, uppercase. Padding: `2px 10px`.

### 6.7 Tabelas de dados

- Header: fundo `var(--fundo-pagina)`, texto Geist 500 12px uppercase
  `--texto-terciario`, `letter-spacing: 0.05em`
- Linhas: altura mínima `48px` (acessibilidade touch), borda inferior
  `1px solid var(--borda-sutil)`
- Hover na linha: fundo `var(--fundo-pagina)` (sutil)
- Dados: Geist 400, 14px
- Valores monetários: JetBrains Mono 400, alinhados à direita,
  `font-variant-numeric: tabular-nums`
- Paginação: "Mostrando 1-10 de 54" + setas < >

### 6.8 Modais e drawers

- Overlay: `rgba(0,0,0,0.5)` com backdrop-blur `4px`
- Container: fundo `var(--fundo-card)`, raio `16px`, sombra alta,
  max-width `560px` (modal), `400px` (drawer lateral)
- Header do modal: título Geist 600 20px + botão X no canto direito
- Footer: botões alinhados à direita, gap `12px`

### 6.9 Calendário / agenda semanal

Referência visual: tela "Agenda Semanal" do Stitch.
- Grid de 7 colunas (Seg-Sáb, ou Dom-Sáb configurável)
- Header: dia da semana (Geist 400 12px) + número (Geist 600 18px)
- Dia atual: número com fundo `--cor-primaria`, texto branco, circular
- Slots de horário: coluna esquerda, Geist 400 12px, `--texto-terciario`
- Agendamento: card dentro da célula, fundo `--cor-primaria-suave`,
  borda-esquerda `3px solid --cor-primaria`, raio `6px`
- Painel lateral de detalhes: drawer à direita, 380px

### 6.10 Fila da recepção (Kanban)

Referência visual: tela "Fila da Recepção" do Stitch.
- 4 colunas: Chegou → Aguardando → Em Atend. → Finalizado
- Header de coluna: label uppercase + contagem em badge circular
- Cards: fundo `--fundo-card`, borda `1px solid --borda`, raio `12px`
- Alerta de espera longa: texto em `--cor-erro` (ex: "40 min aguardando")

---

## 7. Telas de referência (Stitch — 12 telas aprovadas)

As telas abaixo foram geradas no Google Stitch em 11/08/2026 e servem
como referência visual EXATA para implementação. Estão arquivadas em
`D:\Downloads\stitch_CLINICA PATRICIA\`.

| # | Tela | Arquivo | Módulo |
|---|---|---|---|
| 1 | Dashboard Executivo | `dashboard_executivo_cl_nica_brotas_1` | M6 |
| 2 | Agenda Semanal | `agenda_semanal_cl_nica_brotas_1` | M3 |
| 3 | Atendimentos de Hoje | `atendimentos_de_hoje_cl_nica_brotas_padronizado` | M3 |
| 4 | Fila da Recepção | `fila_da_recep_o_cl_nica_brotas_padronizado` | M3 |
| 5 | Novo Agendamento | `novo_agendamento_cl_nica_brotas_padronizado` | M3 |
| 6 | Detalhes do Agendamento | `detalhes_do_agendamento_cl_nica_brotas` | M3 |
| 7 | Reagendar | `reagendar_cl_nica_brotas` | M3 |
| 8 | Cancelar Agendamento | `cancelar_agendamento_cl_nica_brotas` | M3 |
| 9 | Check-in de Paciente | `check_in_cl_nica_brotas` | M3 |
| 10 | Financeiro | `financeiro_cl_nica_brotas_2` | M4 |
| 11 | Lista de Espera | `lista_de_espera_cl_nica_brotas_padronizado` | M3 |
| 12 | Prontuário Eletrônico | `prontu_rio_eletr_nico_psicologia_1` | M5 |

**Adaptações obrigatórias sobre o Stitch (não seguir cegamente):**
- Sidebar: usar fundo colorido por clínica (§6.1), NÃO branco.
- Menu lateral: usar a lista padronizada de 10 itens (§6.1), ignorar
  variações entre telas do Stitch (Faturamento/Estoque/Clínicas etc.).
- Tipografia: Geist + JetBrains Mono (§2), NÃO as fontes que o Stitch
  possa ter usado internamente.
- Subtítulo "Premium Health ERP": remover. Usar apenas "Clínica Patrícia"
  ou o nome da clínica ativa conforme o contexto.
- Prontuário: o template do Stitch é de Psicologia. No nosso sistema,
  o template é DINÂMICO por especialidade (definido no Módulo 5).

---

## 8. Princípios de design (v3)

1. **Clean corporate** — fundo claro limpo, cards brancos com borda sutil
   e sombra quase imperceptível. A cor aparece com propósito, não como
   decoração.
2. **Um destaque colorido** — o card de Caixa de Hoje é o ÚNICO elemento
   com fundo sólido na cor da clínica. Todo o resto é neutro. Isso
   garante hierarquia visual instantânea.
3. **Sidebar é identidade** — fundo colorido por clínica é o que dá
   personalidade ao sistema e orienta a recepcionista sobre qual unidade
   está operando.
4. **Dados primeiro** — tipografia Geist otimizada para escaneabilidade.
   Números tabulares, labels técnicos em JetBrains Mono, hierarquia por
   peso e tamanho (não por decoração).
5. **Semântica suave** — cores de status em baixa opacidade (10%),
   nunca cor sólida forte como fundo de badge.
6. **Consistência entre telas** — mesmo menu, mesmos tokens, mesmos
   componentes. A tela muda, o sistema visual não.

---

## 9. Regras inegociáveis (mantidas de todas as versões)

1. **ZERO cor literal** em componente. Só tokens CSS (`var(--...)`).
2. **Modo claro/escuro** obrigatório. Cor da clínica é a MESMA nos dois
   modos; só neutros mudam. Preferência persistida.
3. **Mobile-first** responsivo. Breakpoints nativos Tailwind.
4. **Design tokens no prompt** — todo prompt de tela DEVE citar este
   arquivo com valores exatos. Falha registrada no passado (v1/v2).

---

## 10. Ordem de implementação (v3)

A repaginação segue a ordem de impacto para o negócio:

| Ordem | Tela | Justificativa |
|---|---|---|
| 1 | **Layout Shell** (sidebar + header) | Base que todas as telas herdam. Fazer UMA vez, bem feito. |
| 2 | **Dashboard Executivo** | Tela que a Patrícia vê primeiro. Impacto visual máximo. |
| 3 | **Agenda + Atendimentos do Dia** | Telas de uso diário da recepção. |
| 4 | **Fila da Recepção (Kanban)** | Fluxo operacional em tempo real. |
| 5 | **Novo Agendamento + Modais** | Formulários de ação (modal/drawer). |
| 6 | **Financeiro** | Prioridade de negócio, cards de KPI. |
| 7 | **Lista de Espera** | Tabela de dados com filtros. |
| 8 | **Prontuário Eletrônico** | Depende do Módulo 5 (arquitetura pendente). |

---

## 11. Migração CSS: o que muda de v2 → v3

### Tokens que MUDAM de valor (atualizar no `src/index.css`):

| Token v2 | Valor v2 | Valor v3 | Motivo |
|---|---|---|---|
| `--fundo-pagina` | `#EFEBF5` (lilás) | `#F8FAFC` (slate claro) | Clean SaaS |
| `--fundo-card` | `#FFFFFF` | `#FFFFFF` | Sem mudança |
| `--texto-principal` | `#221D2E` (roxo) | `#131B2E` (azul-marinho) | Neutro frio |
| `--texto-secundario` | `#5B5468` | `#434655` | Idem |
| `--texto-terciario` | `#8B8594` | `#737686` | Idem |
| `--borda` | `#E4E0EC` (lilás) | `#E2E8F0` (slate) | Idem |
| `--sombra-neutra` | tingida roxo | neutra simples | Simplificação |

### Tokens que SAEM (remover):
- `--categoria-financeiro-*`, `--categoria-pessoas-*`,
  `--categoria-agenda-*`, `--categoria-repasse-*` (cards coloridos por
  categoria → todos viram brancos com borda)
- `--status-*-fundo/borda/texto/badge-*` (simplificar para derivação
  automática via `color-mix` a partir das 4 cores semânticas base)

### Tokens que ENTRAM:
- `--borda-sutil` (divisor interno de tabela)
- `--sombra-baixa`, `--sombra-media`, `--sombra-alta` (3 níveis)
- `--cor-info` (azul informativo, separado da cor da clínica)

### Classes CSS que MUDAM:
- `.texto-titulo-tela` → troca Fraunces por Geist 600
- `.texto-titulo-secao` → troca Fraunces por Geist 600
- `.fonte-selo` → troca Fraunces por Geist 600

### O que NÃO muda (preservar):
- Toda a mecânica de `--cor-primaria/secundaria/menu` (runtime)
- `--cor-primaria-hover` e `--cor-primaria-suave` (color-mix)
- Tokens de cor semântica base (`--cor-erro/sucesso/alerta`)
- Tokens derivados de semântica (`--cor-erro-suave`, `--cor-erro-borda`)
- Tokens da sidebar (`--menu-texto`, `--menu-hover-bg`, etc.)
- `--dourado*` (selo de clínica)
- `.numero-tabular`
- `.agenda-fora-expediente`
- Modo escuro: toda a estrutura com `[data-theme="escuro"]`

---

*Design System v3 — 11/08/2026. Referência: Google Stitch (12 telas) +
DESIGN.md do Stitch + regras de fundação do projeto (02-ARQUITETURA.md).
Versão anterior arquivada em `docs/_historico/01-DESIGN-SYSTEM-v2.md`.*


---

## 12. Tela de Login (adicionado em 11/08/2026)

### 12.1 Layout — Split-screen (desktop) / Full-width (mobile)

**Desktop (≥1024px):** tela dividida em duas metades.
- **Lado esquerdo (50%):** fundo com `var(--cor-menu)` da clínica ativa
  (determinada pelo subdomínio ANTES do login, via RPC `clinica_publica_por_subdomain`).
  Contém: nome do sistema ("Clínica Patrícia"), badge com nome da clínica
  (ex: "Clínica Brotas"), slogan, descrição e ilustrações abstratas de
  cards do sistema (decorativas, sem dados reais).
- **Lado direito (50%):** fundo `var(--fundo-card)` (branco/escuro conforme
  modo). Contém o formulário de login centralizado vertical e
  horizontalmente, max-width `420px`.

**Mobile (<1024px):** tela full-width.
- Fundo com gradiente sutil de `var(--cor-primaria-suave)` para
  `var(--fundo-pagina)` (de cima para baixo).
- Logo + nome do sistema no topo.
- Formulário centralizado, padding lateral `16px`.

### 12.2 Elementos do formulário

| Elemento | Especificação |
|---|---|
| Título | "Bem-vindo" — Geist 600, 36px (display-md) |
| Subtítulo | "Entre na sua conta para acessar a [nome da clínica]." — Geist 400, 16px, `--texto-secundario` |
| Label dos inputs | Geist 500, 12px, uppercase, `--texto-secundario` (classe `.texto-label-tecnico`) |
| Inputs | Borda `--borda`, raio `8px`, padding `10px 12px`, focus ring `--cor-primaria` 20% |
| Botão "Entrar →" | Full-width, fundo `--cor-primaria`, texto branco, Geist 600, raio `8px`, seta → |
| "Lembrar meu acesso" | Checkbox + label à esquerda (VISUAL ONLY por enquanto — sem lógica) |
| "Esqueci minha senha" | Link à direita, cor `--cor-primaria` (VISUAL ONLY — sem navegação por enquanto) |
| Erro de login | Badge com fundo `--cor-erro-suave`, borda `--cor-erro-borda`, texto `--cor-erro` |

### 12.3 Branding do lado esquerdo (desktop)

| Elemento | Especificação |
|---|---|
| Nome do sistema | "Clínica Patrícia" — Geist 600, 24px, branco |
| Badge da clínica | Pill com dot verde + nome da clínica, fundo `rgba(255,255,255,0.1)`, texto branco |
| Slogan | "Cuidado conectado. Gestão inteligente." — Geist 700, 36-40px, branco |
| Descrição | "Uma experiência integrada para cuidar de pacientes, atendimentos e da gestão da clínica." — Geist 400, 16px, `rgba(255,255,255,0.75)` |
| Ilustrações | 3 cards abstratos em perspectiva, fundo `rgba(255,255,255,0.08)`, borda `rgba(255,255,255,0.12)`, com ícones e barras placeholder. Rotação sutil (-5° a +3°). Efeito decorativo, sem dados reais. |

### 12.4 Rodapé

- Desktop: no lado direito, abaixo do formulário. "Ambiente seguro" com
  ícone de cadeado + "Privacidade · Termos de Uso" + "Problemas para
  acessar? Falar com o administrador".
- Mobile: na parte inferior da tela. "Ambiente seguro" + "Privacidade ·
  Termos de Uso".
- Cor: `--texto-terciario`.

### 12.5 Regras importantes

- A cor do lado esquerdo vem do banco (`cor_menu`), via a RPC pública
  que já existe. NÃO é azul fixo.
- O texto "Premium Health ERP" do Stitch foi REMOVIDO. Não usar.
- Nenhuma foto stock ou depoimento fictício. Manter ilustrações abstratas.
- O formulário de login NÃO muda de lógica — mesma autenticação Supabase
  (email + senha). Só o visual evolui.
- Funcionalidades novas (mostrar/ocultar senha, recuperação de senha,
  lembrar acesso) ficam para um prompt posterior. Este prompt é SÓ visual.

### 12.6 Referências visuais do Stitch

Arquivadas em `D:\Downloads\tela login\stitch_patr_cia_health_ecosystem\`:
- `login_cl_nica_brotas` — Login desktop (referência principal)
- `login_mobile_cl_nica_brotas` — Login mobile
- `recuperar_senha_cl_nica_brotas` — Recuperar senha (futuro)
- `sucesso_recupera_o_cl_nica_brotas` — Sucesso de recuperação (futuro)
