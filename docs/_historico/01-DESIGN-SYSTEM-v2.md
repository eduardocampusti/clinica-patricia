# 01-DESIGN-SYSTEM.md — Sistema visual premium (v2)

> **Este arquivo é a FONTE DA VERDADE do visual do projeto.** Todo prompt de
> frontend deve citar os valores exatos daqui. Não aproximar de memória.
>
> Substitui a v1 (baseada em referência externa/Soma Psico) a partir de
> 04/08/2026. Direção definida por Claude (papel de design lead) e aprovada
> por protótipo interativo em duas rodadas — ver 09-DIARIO-DE-SESSOES.md.
> Decisão: repaginar TODAS as telas já prontas (Dashboard, Pacientes,
> Cadastros, Financeiro), não só as novas.

---

## 1. Paleta de cores

### Marca (por clínica — já implementado, não mexer na mecânica)
O código já tem `--cor-primaria` calculada em runtime a partir de
`clinicas.cor_primaria` (`src/index.css`, `--cor-primaria-hover` e
`--cor-primaria-suave` derivados via `color-mix()`). A v2 do design system
NÃO introduz uma cor de marca nova — usa esse token existente como está.
Valores reais hoje: Brotas `#2563eb`, Ipupiara `#16a34a`, Ibitiara
`#c2410c`. (O roxo usado no protótipo do Dashboard era só ilustrativo —
na implementação real, tudo que hoje é `--cor-primaria`/`-hover`/`-suave`
continua sendo, sem hardcode.)

### Assinatura (dourado — uso EXCLUSIVO do selo e do card de repasse)
| Token | Valor |
|---|---|
| `--gold` | `#B8873D` |
| `--gold-ink` | `#8C6529` |
| `--gold-tint` | `#FBF6EC` |

**Regra:** dourado nunca em botão, CTA ou decoração solta. Só no selo de
clínica e no card de repasse/receita da clínica. Se aparecer em tudo, deixa
de significar algo — é a exceção que carrega peso.

### Neutros
| Token | Valor | Uso |
|---|---|---|
| `--ink` | `#221D2E` | Texto principal — nem preto puro, nem cinza; tingido de roxo |
| `--ink-soft` | `#5B5468` | Texto secundário |
| `--ink-muted` | `#8B8594` | Legendas, texto terciário |
| `--paper` | `#EFEBF5` | Fundo da página — propositalmente mais escuro que os cards, senão a sombra não aparece |
| `--surface` | `#FFFFFF` | Fundo de card neutro (conteúdo misto, sem categoria única) |
| `--border` | `#E4E0EC` | Contorno fino — uso raro; sombra substitui borda na maioria dos cards |

### Categorias de card (fundo suave por SIGNIFICADO, não decoração)

**Atenção — paleta verificada contra as cores reais de marca no banco**
(`select nome, cor_primaria from clinicas`: Brotas `#2563eb` azul, Ipupiara
`#16a34a` verde, Ibitiara `#c2410c` laranja). Azul e verde foram trocados
por rosa e verde-água pra não colidir com a cor da própria clínica no menu
lateral — ex: card "financeiro" verde na tela da Clínica Ipupiara (que É
verde) confundiria marca com categoria.

| Categoria | Fundo | Label | Valor | Sombra (tingida) |
|---|---|---|---|---|
| Financeiro positivo (entradas, receita) | `#DEF5F1` | `#0F766E` | `#0A5048` | `rgba(15,148,132,·)` |
| Pessoas (pacientes, profissionais) | `#F3EEFA` | `#6B3FA0` | `#3A2159` | `rgba(107,63,160,·)` |
| Agenda/tempo (consultas, horários) | `#FBEAF0` | `#9A3B63` | `#5C2038` | `rgba(154,59,99,·)` |
| Repasse/retenção da clínica | `#FBF6EC` | `#8C6529` | `#6B4A17` | `rgba(184,135,61,·)` |

**Regra de aplicação:** a cor do card é definida pelo que o número
representa, nunca por posição na grade. Um card de "pacientes" é sempre
roxo, em qualquer tela do sistema — isso é o que dá consistência.

**Regra de governança (nova):** violeta, dourado, verde-água e rosa ficam
RESERVADOS para categorias — ao cadastrar a cor de uma clínica nova, evitar
esses 4 tons pra não repetir a colisão que corrigimos aqui.

## 2. Tipografia

| Elemento | Fonte | Peso/Tam | Uso |
|---|---|---|---|
| Título de tela / saudação | Fraunces (serifada) | 500, 28–32px | Todo cabeçalho principal de tela — não só a saudação como na v1 |
| Subtítulo de card/seção | Fraunces | 500, 15px | Nome de bloco (ex: "Últimas entradas") |
| Corpo / UI | Inter | 400, 13–14px | Texto geral, labels, formulários |
| Valores numéricos (R$, contagens) | Inter | 500, 21–22px | `font-variant-numeric: tabular-nums` OBRIGATÓRIO em qualquer número em coluna/lista |

Import: `Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600` +
`Inter:wght@400;500;600` via Google Fonts.

---

## 3. Sombras — elevação real (principal mudança da v2)

Duas camadas sempre — contato (curta, mais opaca) + difusa (longa, mais
suave) — **tingidas na cor do card**, nunca cinza neutro:

```css
box-shadow: 0 2px 5-6px rgba(<cor-da-categoria>, 0.08-0.10),
            0 12-14px 24-30px rgba(<cor-da-categoria>, 0.14-0.18);
```

- Cards brancos/neutros usam sombra tingida de `--ink`: `rgba(34,29,46,·)`.
- Elementos pequenos (avatar, selo, indicador de status) usam sombra de
  1 camada só, proporcionalmente mais forte pro tamanho.
- Sem essa sombra tingida (em vez de cinza padrão), o efeito "premium" não
  se sustenta — é o detalhe que mais diferencia da v1.

## 4. Componentes

### O selo (elemento-assinatura do sistema)
Círculo, borda `1.5px solid var(--gold)`, fundo `var(--gold-tint)`, letra
inicial da clínica em Fraunces, sombra `rgba(184,135,61,0.25-0.35)`.
Aparece: cabeçalho ao lado do nome do sistema (34px), seletor de clínica
(mini, 16px), e futuramente em documentos/recibos impressos.
Justificativa: as três clínicas têm CNPJ próprio e registro oficial — o
selo não é enfeite, é a identidade oficial de cada unidade.

### Cards
Raio `18px` (subiu de 16px na v1 — mais suave). Fundo por categoria (§1)
ou `--surface` branco quando o conteúdo é misto/neutro. Sombra sempre
presente (§3) — borda de 1px reservada a elementos de UI densos (inputs,
linhas de tabela), não a cards.

### Botões
Sem mudança em relação à v1: raio `12px`, CTA primário com fundo
`--brand` sólido, texto branco, sem `box-shadow`.

---

## 5. Princípios (v2)

1. Sombra tingida > sombra cinza — a cor do card "vaza" pra sombra e
   reforça a categoria visualmente.
2. Cor de card = significado, não decoração — mesma categoria, mesma cor,
   em qualquer tela.
3. Fraunces em todo título de bloco/tela; Inter em todo dado/controle.
4. Números tabulares sempre que estiverem em lista ou coluna.
5. Dourado é escasso e reservado (selo + repasse) — nunca decorativo.
6. Fundo da página mais escuro que os cards — sem isso a sombra não se lê.

## 6. Adaptação multi-clínica

O anel do selo é sempre dourado (identidade do SISTEMA — "clínica
oficial registrada", igual nas três unidades). A letra dentro do selo usa
`--cor-primaria` da clínica ativa (não uma cor nova) — assim o selo liga
as duas ideias: "isto é oficial" (dourado, fixo) + "esta é a clínica X"
(cor da própria marca, variável). Evita inventar mais uma cor variável
além da que já existe.

---

## 7. Ordem de repaginação (decidida em 04/08/2026)

1. **Dashboard** — protótipo já aprovado (duas rodadas), pronto pra virar
   prompt de implementação.
2. **Financeiro** — reaproveita direto os cards de categoria (entradas,
   repasse) já validados no protótipo do Dashboard.
3. **Pacientes** — tela de maior uso diário pela recepção.
4. **Cadastros Estruturais** — menor frequência de uso, fica por último.

---

*Protótipo de referência aprovado: Dashboard, sessão 04/08/2026 (duas
iterações — v1 sombra sutil, v2 sombra tingida + cards por categoria).
Ver 09-DIARIO-DE-SESSOES.md para o histórico completo da decisão.*
