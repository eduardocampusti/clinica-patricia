# 07 — REFERÊNCIA VISUAL DO DASHBOARD (APROVADO)

> Esta é a tela de referência APROVADA, desenhada no Claude Design. Todo módulo visual deve seguir este padrão. Origem do design fiel: arquivo `Dashboard Clinica.dc.html` (Claude Design).
> **IMPORTANTE:** o desenho de alta fidelidade é feito no Claude Design. Este arquivo documenta o padrão para que o Claude Code / Cursor reconstrua fielmente e nenhum módulo novo saia do contexto visual.

## Link do projeto no Claude Design (fonte da verdade visual)

- Projeto Claude Design: `https://claude.ai/design/p/25cc3eae-8902-467d-b2b3-62a711475a61`
- Arquivo principal: `Dashboard Clinica.dc.html`
- Arquivo auxiliar: `support.js`

## Estrutura da tela (dashboard da proprietária)

### Sidebar (menu lateral esquerdo)
- Fundo: roxo escuro / indigo profundo (referência `#2E1A47`) — **mas via token `--cor-menu`, editável por clínica** (ver regra de theming no arquivo 02).
- Texto e ícones do menu: branco.
- Item ativo: destaque com fundo levemente mais claro / barra na lateral.
- No topo da sidebar: **seletor de clínica** (bloco clicável com logo em iniciais "CB", nome da clínica, subtítulo "Multiespecialidade" e chevron).
- Acima do seletor: rótulo discreto **"VISÃO PROPRIETÁRIA"** com ícone de cadeado (maiúsculas pequenas, cor suave) — deixa claro que só a proprietária alterna entre clínicas.
- Itens do menu: Dashboard, Agenda, Pacientes, Prontuário, Financeiro, Relatórios, Configurações.
- No rodapé da sidebar: avatar do usuário logado (iniciais), nome e cargo ("Dra. Camila Duarte / Proprietária").

### Cabeçalho (topo do conteúdo)
- Saudação em fonte serifada (Lora), grande: "Olá, Dra. Camila".
- Subtítulo: data por extenso + "Painel do dia" (ex: "Sábado, 01 de agosto · Painel do dia").
- Canto direito: badge/pílula com contagem ("7 atendimentos hoje").

### Card de destaque — Fluxo de caixa do dia
- Ocupa o topo, largura total.
- Três blocos: **Saldo líquido** (número grande, verde), **Entradas** (com seta ↑ e barra de progresso verde), **Saídas** (com seta ↓ e barra de progresso laranja/vermelha).
- Números em destaque, formato R$ brasileiro.

### Card — Atendimentos de hoje
- Título + contador ("7 no total").
- Lista de atendimentos: avatar em iniciais, nome do paciente, especialidade, horário, e **badge de status** com cor suave.
- Status observados: Concluído, Em atendimento, Confirmado, Aguardando, Cancelado — cada um com sua cor suave (baixa opacidade).

### Card — Resumo por especialidade
- Lista de especialidades com contagem e barra de proporção colorida.
- Cada especialidade com um ponto/cor: Clínica Geral, Psicologia, Pediatria, Cardiologia, Dermatologia.

## Princípios visuais a preservar (do arquivo 01-DESIGN-SYSTEM)
- Cards: fundo claro, raio 16px, sombra quase imperceptível.
- Botões: raio 12px, destaque pela cor (via token).
- Cores de status/semânticas: sempre baixa opacidade, nunca tom sólido forte.
- Tipografia: Lora (serifada) só em saudações/títulos de destaque; Inter no resto.

## Regras que este dashboard já respeita (NÃO quebrar nos próximos módulos)
1. Cor via token (`--cor-primaria`, `--cor-menu`) — editável por clínica (Brotas azul, Ipupiara verde, etc.).
2. Preparado para claro/escuro via tokens de neutro.
3. Responsivo (mobile-first): no celular, a sidebar vira menu hambúrguer/drawer e os cards empilham em coluna única.

## Fluxo de trabalho recomendado (importante)
- **Telas / visual** → desenhar no **Claude Design** (que já provou fidelidade) e importar o código para o Claude Code.
- **Lógica / banco / backend** → construir no Claude Code / Cursor.
- Este arquivo `.md` mantém os dois alinhados: é a "trava de contexto visual" que impede módulos novos de fugirem do padrão.
