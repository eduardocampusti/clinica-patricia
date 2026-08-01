# 01-DESIGN-SYSTEM.md — Referência visual (baseado no Soma Psico)

> Origem: análise técnica ao vivo do CSS computado de `app.somapsico.com/diario`
> (login autenticado como paciente teste, sem exposição de dados de terceiros).
> Uso: referência de inspiração visual para o sistema médico multiespecialidade.
> Não é cópia — é ponto de partida documentado.
>
> **Este arquivo é a FONTE DA VERDADE do visual do projeto.** Todo prompt de
> frontend (Login, Tema, Pacientes, Agenda, etc.) deve citar os valores exatos
> daqui. Não aproximar de memória — copiar os valores.

---

## 1. Paleta de cores

### Marca (Purple/Lavanda) — usada nos DEFAULTS do banco (tabela clinicas)
| Token | Valor | Uso observado |
|---|---|---|
| `--eko-color-purple-400` | `#8b53c5` | Tom médio da marca |
| `--eko-color-primary-700` | `#653399` | Roxo escuro, texto/hover sobre fundo claro |
| `--eko-color-purple-025` / `bg-primary-100` | `#f2ebfa` | Fundo lilás bem claro |
| `--secondary-brand-color` | `#eaddff` | Roxo pastel, cor secundária |
| CTA primário | `#7f51b0` | Cor de ação principal — fundo do botão primário |
| destaque "hoje" no calendário | `rgba(127, 81, 176, .16)` | mesmo roxo, opacidade baixa |

**Leitura:** a marca gira em torno de UM roxo/lavanda (~`#7f51b0` a `#8b53c5`), em
intensidades diferentes. Sem segunda cor de marca — o resto é neutro/semântico.

**Adaptação para o multi-clínica:** a cor de marca deixa de ser fixa e vira
variável por `clinica_id`. A estrutura "tom sólido + 16% opacidade + fundo claro"
se aplica a QUALQUER cor escolhida por clínica, não só ao roxo.

### Neutros / estrutura
| Token | Valor | Uso |
|---|---|---|
| Fundo da página | `#f2f2f2` | Fundo geral cinza muito claro |
| Fundo de card | `#fafafa` | Levemente mais claro que a página — profundidade sutil |
| Borda de card | `#e3e3e3` | Contorno fino |
| Fundo alternativo | `#eaeaea` | |
| Texto principal | `#424242` | Cinza escuro, NÃO preto puro |
| Cor de título | `#49454f` | Cinza levemente arroxeado — só títulos |

### Semânticas (estados) — SEMPRE baixa opacidade (~12%), nunca sólida forte
| Token | Valor |
|---|---|
| `--mood-angry-bg` | `rgba(214, 72, 28, .12)` |
| `--mood-heart-bg` | `rgba(194, 25, 81, .12)` |
| `--whatsapp-soft-bg` | `rgba(31, 173, 83, .12)` |
| `--todo-color-cyan` | `#0597ae` |

---

## 2. Tipografia

| Elemento | Fonte | Tamanho | Peso | Observação |
|---|---|---|---|---|
| Saudação principal ("Olá, ...") | **Lora** (serifada) | 35px | 400 | ÚNICO uso de serifa — toque acolhedor/editorial |
| Corpo / UI geral | **Inter** | 14px | 400 | Fonte padrão de toda a interface |
| Subtítulos de seção | Inter | 19.6px | 400 | Mesma família, só maior — sem variação de peso |

**Leitura:** hierarquia simples. Lora só no momento de "boas-vindas"; Inter para
tudo mais. Pesos quase todos 400 (regular); o TAMANHO faz a hierarquia, não o bold.

---

## 3. Componentes

### Botões
- Raio: `12px` (retangular), `50%` (circular/ícone/avatar). Seletor de idioma: `8px`.
- CTA primário: fundo roxo/cor-de-marca sólido, texto branco.
- **Nenhum `box-shadow` em botão** — o destaque vem só da cor de fundo.

### Cards
- Fundo: `#fafafa` (mais claro que a página `#f2f2f2`).
- Borda: `1px solid #e3e3e3`. Raio: `16px` (mais arredondado que os botões).
- Sombra: `0px 1px 8px rgba(0,0,0,0.1)` — bem sutil, quase imperceptível.

### Calendário / seletor de data
- Célula padrão: `#fdfcff`. Cabeçalho do mês: `#f8f7fa`.
- Dia atual: roxo/cor-de-marca em 16% de opacidade.

---

## 4. Princípios de design

1. **Monocromia de marca** — um tom só (por clínica), variando opacidade, não
   múltiplas cores competindo.
2. **Neutros levemente frios/arroxeados** — nunca cinza puro.
3. **Sombras quase invisíveis** — profundidade sutil, nada "flutuando" óbvio.
4. **Semântica em baixa opacidade** — nunca cor de estado sólida forte.
5. **Toque editorial pontual** — serifa só na saudação.
6. **Raio em duas escalas** — 12px controles (botões), 16px containers (cards).

---

## 5. Adaptação para o multi-clínica

- **Manter:** "uma cor de marca (por clínica) + neutros levemente tingidos +
  sombras sutis" — robusto e escala bem.
- **Adaptar:** cor de marca é variável por `clinica_id` (não fixa em roxo).
- **Adicionar:** reservar 1-2 cores semânticas extras para tipo de atendimento
  (consulta / retorno / exame), mesmo princípio de opacidade baixa.

---

*Arquivo restaurado a partir do histórico do projeto (extração original via Claude
for Chrome — CSS computado real). Ver DEVELOPMENT_RULES.md: todo prompt de
frontend deve citar estes valores exatos.*
