# Design System — Referência visual (baseado no Soma Psico)

> Origem: análise técnica ao vivo do CSS computado de `app.somapsico.com/diario` (login autenticado como paciente teste, sem exposição de dados de terceiros).
> Uso: referência de inspiração visual para o sistema médico multiespecialidade. Não é cópia — é ponto de partida documentado.

---

## 1. Paleta de cores

### Marca (Purple/Lavanda)
| Token | Valor | Uso observado |
|---|---|---|
| `--eko-color-purple-400` | `#8b53c5` | Tom médio da marca |
| `--eko-color-primary-700` | `#653399` | Roxo escuro, provavelmente texto/hover sobre fundo claro |
| `--eko-color-purple-025` / `--eko-color-bg-primary-100` | `#f2ebfa` | Fundo lilás bem claro (cards de destaque, estados ativos) |
| `--secondary-brand-color` | `#eaddff` | Roxo pastel, cor secundária de apoio |
| CTA primário (botão "+ Novo diário") | `rgb(127, 81, 176)` → `#7f51b0` | Cor de ação principal — fundo do botão primário |
| `--calendar-month-current-bg` | `rgba(127, 81, 176, .16)` | Mesmo roxo do CTA, em opacidade baixa, pra marcar "hoje" no calendário |

**Leitura:** a marca inteira gira em torno de **um único roxo/lavanda** (~`#7f51b0` a `#8b53c5`), usado em intensidades diferentes (sólido no CTA, 16% de opacidade em destaques sutis, muito claro em fundos de card). Não há uma segunda cor de marca — o resto da paleta é neutro ou semântico.

### Neutros / estrutura
| Token | Valor | Uso |
|---|---|---|
| Fundo da página (`body`) | `rgb(242, 242, 242)` → `#f2f2f2` | Fundo geral cinza muito claro |
| Fundo de card | `rgb(250, 250, 250)` → `#fafafa` | Levemente mais claro que o fundo da página — cria profundidade sutil |
| Borda de card | `#e3e3e3` | Contorno fino |
| `--secondary-background-color` | `#eaeaea` | Fundo alternativo |
| Texto principal | `rgb(66, 66, 66)` → `#424242` | Cinza escuro, não preto puro |
| `--title-color` | `#49454f` | Cinza levemente arroxeado — títulos |

### Semânticas (estados / humor)
Esse ponto é específico do contexto de psicologia, mas o padrão é reaproveitável:
| Token | Valor | Significado |
|---|---|---|
| `--mood-angry-bg` | `rgba(214, 72, 28, .12)` | Vermelho-terra suave |
| `--mood-heart-bg` | `rgba(194, 25, 81, .12)` | Rosa/vinho suave |
| `--humor-color2` | `#BD681E` | Laranja queimado |
| `--whatsapp-soft-bg` | `rgba(31, 173, 83, .12)` | Verde suave (provavelmente CTA de contato) |
| `--todo-color-cyan` | `#0597ae` | Ciano — categoria/etiqueta |

**Padrão importante:** todas as cores semânticas usam baixa opacidade (~12%) sobre fundo claro — nunca cor sólida forte. Isso mantém a interface calma, apropriada para um contexto de saúde mental. Vale considerar o mesmo princípio no sistema multiespecialidade: **cores de status suaves, nunca gritantes**.

---

## 2. Tipografia

| Elemento | Fonte | Tamanho | Peso | Observação |
|---|---|---|---|---|
| Saudação principal ("Olá, Carlos Eduardo") | **Lora** (serifada) | 35px | 400 | Único uso de serifa identificado — dá um tom acolhedor/editorial ao cumprimento, contrasta com o resto sans-serif |
| Corpo / UI geral | **Inter** | 14px | 400 | Fonte padrão de toda a interface |
| Subtítulos de seção ("Acompanhamento de humor", "Histórico") | Inter | 19.6px | 400 | Mesma família, só aumenta o tamanho — sem variação de peso |
| Variante iOS (`--eko-font-caption-200-ios-font-family`) | SF Pro Text | — | — | Fallback nativo pra iOS, não afeta a web |

**Leitura:** hierarquia tipográfica simples — uma fonte serifada só no momento de "boas-vindas" (toque humano), e Inter pra tudo mais. Pesos ficam quase todos em 400 (regular); não há uso agressivo de bold pra hierarquia, o tamanho é que faz esse trabalho.

---

## 3. Componentes

### Botões
- Raio de borda: `12px` (botão retangular) e `50%` (botão circular/ícone, ex: avatar)
- Botão de idioma/seletor: raio `8px`
- CTA primário: fundo roxo sólido (`#7f51b0`), texto branco
- Nenhum `box-shadow` nos botões — o destaque vem só da cor de fundo

### Cards
- Fundo: `#fafafa` (mais claro que a página `#f2f2f2`)
- Borda: `1px solid #e3e3e3`
- Raio: `16px` (mais arredondado que os botões)
- Sombra: `0px 1px 8px rgba(0,0,0,0.1)` — sombra bem sutil, quase imperceptível, só pra descolar do fundo

### Calendário / seletor de data
- Célula padrão: `#fdfcff` (quase branco, tom levemente roxo)
- Cabeçalho do mês: `#f8f7fa`
- Dia atual: destaque com o roxo da marca em 16% de opacidade

---

## 4. Princípios de design identificados

1. **Monocromia de marca** — um roxo só, variando em opacidade/tom, em vez de múltiplas cores de destaque competindo.
2. **Neutros levemente frios** — cinzas com leve tendência a roxo (`#49454f`, `#424242`) em vez de cinza puro, mantém coerência com a marca mesmo no texto.
3. **Sombras quase invisíveis** — profundidade sutil, sem "cards flutuando" de forma óbvia.
4. **Semântica em baixa opacidade** — cores de estado (humor, alertas) nunca em tom sólido forte; sempre suavizadas.
5. **Toque editorial pontual** — uma fonte serifada usada com moderação (só na saudação) pra humanizar a interface, sem comprometer a legibilidade geral em Inter.
6. **Raio de borda em duas escalas** — 12px pra controles (botões), 16px pra containers (cards) — hierarquia visual clara entre "ação" e "conteúdo".

---

## 5. Adaptação sugerida para o sistema multiespecialidade

- **Manter**: a lógica de "uma cor de marca + neutros levemente tingidos + sombras sutis" — isso é robusto e escala bem.
- **Adaptar**: como seu sistema atende múltiplas clínicas (Brotas, Ipupiara, Ibitiara), a cor de marca deixa de ser fixa e vira **variável por `clinica_id`** (ver conversa sobre multi-tenant) — a estrutura de "tom sólido + 16% opacidade + fundo claro" pode ser aplicada a qualquer cor escolhida por clínica, não só ao roxo.
- **Adicionar**: como você atende múltiplas especialidades (não só psicologia), talvez valha reservar 1-2 cores semânticas extras para diferenciar tipo de atendimento visualmente (ex: consulta vs retorno vs exame), seguindo o mesmo princípio de opacidade baixa.

---

*Arquivo gerado a partir de inspeção ao vivo via Claude for Chrome — CSS computado real, não estimativa visual.*
