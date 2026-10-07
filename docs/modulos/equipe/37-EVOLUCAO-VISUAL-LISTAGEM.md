# 37 — Evolução visual da listagem Equipe & acessos (Fase 1)

## Fase 1 — implementação local, 2026-10-06 -03:00

**Estado: implementado localmente pelo Claude Code; não commitado, não publicado,
aguardando revisão do usuário.** Escopo aprovado pelo usuário em duas mensagens
(especificação + decisões da Etapa 0). Somente apresentação: consultas, RPC, RLS,
tipos de dados, permissões, filtros, ordenação, paginação, seleção, sidebar, topbar e
rotas preservados. Abas Profissionais, Especialidades, Serviços e o formulário de
membro ficam para fases seguintes.

### Decisões aprovadas pelo usuário (Etapa 0)

| Tema | Decisão |
|---|---|
| Selo de acesso | Um por pessoa, baseado na clínica ativa e no relatório 27: Acesso ativo (verde), Conta inativa (âmbar), Sem acesso nesta clínica, Sem conta e Não confirmado (cinza). Ponto + texto. “Ativo em X de Y” fora desta fase. |
| Tipo de membro | Segmentado com Todos, Saúde, Administrativo, Apoio e Outro no mesmo filtro; números calculados na tela (busca e vínculo aplicados, tipo ignorado) porque a lista completa já está no cliente. Abaixo de 1024px vira o select “Tipo de membro”, com os números nas opções. |
| Celular (<768px) | Cartões e “Ordenar por” mantidos; só recebem selos e pílulas. Grade expansível de 768px para cima. |
| Perfis sem gestão | Aviso mantido em uma linha. “Adicionar” só para Proprietária; demais veem “Não informado”. |
| Textos | Botão continua “Ver cadastro”. Abas sem pílula de contagem. CPF fora da linha expandida (não vem na lista). |
| ReUI | `shadcn add @reui/c-data-grid-8` somente em dry-run: sobrescreveria 8 arquivos (incluindo a grade adaptada) e traria @dnd-kit e @tanstack/react-virtual. Não aplicado. O exemplo usa a mesma API já instalada: `meta.expandedContent`, `getRowCanExpand`, `row.toggleExpanded`. |
| Menu | `src/components/ui/dropdown-menu.tsx` criado a partir do dropdown-menu shadcn (base-nova) com `@base-ui/react` já instalado e tokens da clínica; sem dependência nova. |

### Comportamento implementado (observado no código)

- Cabeçalho de Cadastros: título e subtítulo à esquerda; “Novo membro” à direita por
  portal na área do cabeçalho (mesmas condições de exibição/desabilitação). Sem o
  cabeçalho (montagem isolada da Equipe), o botão fica no topo da listagem.
- Removidos: bloco repetido “Equipe & acessos / Encontre pessoas… / Clínica ativa”,
  cartão de filtros, três cartões de contagem, linha de filtros aplicados, parágrafos
  explicativos e os dois parágrafos de rodapé. O título da seção segue como h2 oculto
  visualmente; um resumo `role=status` oculto anuncia “N pessoas no resultado”.
- Barra de filtros em uma linha (quebra em telas menores), controles de 44px e raio 10px:
  busca com lupa e rótulo oculto, segmentado/select de tipo, “Vínculo: …” e
  “Limpar filtros” somente com filtro ativo.
- Grade: expandir (aria-expanded, “Detalhes de {nome}”), seleção, Pessoa (avatar,
  nome semibold, e-mail, “Sem e-mail de contato” ou “Conselho e registro pendentes” em
  âmbar escuro para saúde sem conselho/registro), Função (cargo + “Saúde · profissão”
  ou rótulo do tipo), Clínicas (pílulas com nome curto, nome completo no título),
  Acesso (selo), Ações fixas à direita (“Ver cadastro” + “Mais ações para {nome}” com
  “Editar cadastro”). Cabeçalho 12px semibold em fundo cinza; linhas de 64px.
- Linha expandida em fundo cinza, alinhada à coluna Pessoa e presa à área visível:
  Contato (E-mail, Tel/WhatsApp), Acesso por clínica (conta + selo por clínica + papel
  confirmado + nota “Não confirmado não significa sem acesso…”) e Ações (“Ver cadastro”
  primário, “Editar cadastro”). Em áreas estreitas os blocos passam a duas colunas.
- Estados: carregando com linhas de esqueleto na grade (cartões pulsantes no celular),
  vazio com filtros “Nenhuma pessoa encontrada” + “Limpar filtros”, erro com mensagem
  + “Tentar novamente” (nome mantido igual ao restante do sistema e aos testes).
- Rodapé: “Pessoas por página” + “1–5 de 5” e navegação. Barra “N pessoas
  selecionadas” só com seleção. Linha única de informação com ícone e a clínica ativa.

### Divergências e limites declarados

- **Selos além da lista aprovada:** “Convite pendente” e “Acesso suspenso” (âmbar)
  aparecem somente quando a ficha já confirmou esse estado na sessão; reduzi-los a
  “Não confirmado” seria falso. Pendente de confirmação do usuário.
- **Acesso por clínica:** mostra o estado confirmado quando a ficha já o consultou
  (inclusive de outras clínicas) e “Não confirmado” nas demais; respeita o filtro de
  vínculo como a coluna anterior.
- Paginação: componente instalado mantido; mostra números de página e esconde as
  setas quando há uma página só.
- Nome curto da clínica: remoção visual do prefixo “Clínica ”; não altera dados.

### Arquivos

Alterados: `src/pages/cadastros/Cadastros.tsx`, `src/pages/cadastros/Equipe.tsx`
(apenas repassa a área do cabeçalho), `src/pages/cadastros/EquipeListagem.tsx`,
`src/pages/cadastros/equipe.css`, `src/config/notasEvolucao.json` e testes
`tests/operacional/equipe-{listagem,grid,estados,avatar,acabamento,edicao}.spec.ts`,
`tests/operacional/equipe.spec.ts`. Criados: `src/components/ui/dropdown-menu.tsx`,
`tests/operacional/equipe-listagem-helpers.ts` e este relatório.

### Verificações

Teste local, 2026-10-06, Windows, Playwright sintético (sem banco real):

- `tsc -b`: sem erros. `npm run lint`: exit 0; 16 avisos, todos em arquivos ReUI não
  alterados. `npm run build`: concluído (avisos de chunk/import dinâmico já existentes).
- Linha de base **antes** da mudança (interrompida a pedido em 219/354): 83 falhas
  (51 desktop, 32 tablet), já existentes. Causa dominante: testes esperam
  `painel-gestao-acessos` visível ao abrir a ficha, mas desde a etapa 36 o painel fica
  na seção “Acesso ao sistema”; também `equipe-recursos` (foto/recebimento),
  `equipe-papeis`, `equipe-papel-explicito`, `equipe-acabamento` (largura do diálogo).
- Suíte completa **depois** (equipe-* + cadastros-navegacao, 3 projetos): 194 aprovados,
  160 falhas. Comparadas por título: no desktop, mesmas 51 da linha de base após duas
  correções de teste reexecutadas com sucesso (fixture do avatar e clique no segmento).
  Tablet/celular repetem os mesmos títulos do desktop, exceto 2 de `equipe-grid` no
  celular (botões de ordenação inexistentes nos cartões desde antes; inferido pelo
  código, não reproduzido na versão anterior porque a linha de base não chegou ao celular).
- Testes adaptados sem remoção nem pulo; data-testid e nomes acessíveis preservados
  (`equipe-contagem-*` passam a um resumo `role=status` oculto; `resumo-acesso-*` no
  bloco Acesso por clínica). Novos: contagens dos segmentos e pendência de conselho.
- Capturas locais (dados fictícios) em `scratch/equipe-fase1/`: grade, linhas expandidas,
  menu, filtro ativo, escuro, tablet820 e celular390.
- Prévia no painel do navegador falhou por cache de dependências do Vite inconsistente
  (duas cópias de React); `node_modules/.vite` removido e recriado pelo próprio Vite.

**Pendente:** revisão visual do usuário, decisão sobre os selos extras, correção das
falhas anteriores das fichas (fora do escopo desta fase), commit/publicação.

## Fase 1 — rodada 2 (revisão do usuário), 2026-10-06 -03:00

**Estado: ajustes locais concluídos; não commitado, não publicado.** O usuário aprovou
o visual no computador e no tema escuro e pediu ajustes e verificações antes do commit.

### Decisões do usuário

- “Convite pendente” (âmbar) e “Acesso suspenso” (vermelho) ficam, só quando a ficha
  confirmou o estado; ponto + texto.
- “Tentar novamente” e a paginação do componente instalado aprovados como estão.
- Falhas antigas das fichas (painel de acesso desde a etapa 36) ficam fora desta
  entrega e viram pendência a tratar antes da Fase 2.

### Ajustes implementados

- **Grade estreita:** a grade completa só aparece quando a largura da própria lista
  comporta todas as colunas (≈1060px); abaixo disso a coluna Clínicas sai (as clínicas
  seguem na linha expandida) e Pessoa, Função, Acesso e ações cabem sem rolagem a partir
  de ~700px. Critério pela largura da lista, não da janela: no computador com a barra
  lateral aberta (1024–1280px) o mesmo problema do tablet ocorria e foi conferido na
  prévia real. Recuo da linha expandida calculado para seguir a coluna Pessoa.
  Com rolagem horizontal, a barra não cobre mais a última linha (espaço inferior).
- Linha expandida só com Contato e Acesso por clínica (bloco Ações removido).
- Nota “Não confirmado não significa sem acesso…” só quando alguma clínica da pessoa
  está “Não confirmado”, na linha expandida e nos cartões.
- Nome em até 2 linhas e e-mail em 1, com reticências e `title` com o texto completo.
- Cabeçalho “Ações” (e “Detalhes”) visível só para leitores de tela.
- Selo neutro: 8% de mistura + borda fina; texto secundário sobre o fundo ≈5:1 no tema
  escuro e ≈8:1 no claro (cálculo pelos tokens; teste automático de contraste inclui o selo).
- Celular até 480px: selects de tipo e vínculo um abaixo do outro, largura total.

### Cor do botão primário

Nenhum token alterado: `src/index.css` sem diferença e a regra `.equipe-botao-principal`
(`var(--cor-primaria-hover)`) idêntica ao HEAD. O azul-petróleo das capturas vem da
cor fictícia `#006194` aplicada a Brotas pelos harnesses de teste; na sessão real
(prévia em 5173) o botão aparece no azul vivo da clínica.

### Verificações (teste local e prévia real, 2026-10-06)

- **Prévia real (A):** servidor `npm run dev` iniciado do zero; sessão real de
  Proprietário(a) em Brotas, somente leitura. Sem erro de React duplicado. Linha
  expandida (Contato, Acesso por clínica) e menu “Mais ações” com “Editar cadastro”
  conferidos por teclado; menu fechado sem editar. Em 1024px: modo compacto, sem rolagem.
  Console: duas respostas 400 de `usuarios_clinicas` e 4 leituras de `equipe_listar`,
  **idênticas na versão anterior** (conferido com as alterações guardadas no stash).
  Nenhuma captura com dados reais foi salva.
- **Causa do React duplicado anterior:** o `define` de `vite.config.ts` inclui a hora
  de compilação; cada início do Vite registra “Re-optimizing dependencies because vite
  config has changed” e regrava `node_modules/.vite`, compartilhado entre o app (5173),
  a suíte (4191) e as prévias sintéticas. Com dois servidores ativos ao mesmo tempo, ou
  com um deles interrompido durante a otimização (ficou `deps_temp_*`), a página recebe
  pedaços de otimizações diferentes. Observado nos logs; o `dropdown-menu` não é a causa
  (carregou normalmente na prévia real). Mitigação operacional: um servidor Vite por vez.
- **Comparação completa (B):** `git stash` dos arquivos desta entrega, suíte equipe-* +
  cadastros-navegacao nos três projetos até o fim, restauração e mesma suíte. Uma falha
  nova no celular (nota ausente nos cartões) foi corrigida e as 5 specs da listagem
  foram reexecutadas nos três projetos.

| Tamanho | Testes | Falhas antes | Falhas depois | Novas | Corrigidas |
|---|---|---|---|---|---|
| Computador 1440 | 118 | 51 | 51 | 0 | 0 |
| Tablet 820 | 118 | 50 | 50 | 0 | 0 |
| Celular 390 | 118 | 53 | 53 | 0 | 0 |

  As falhas restantes são as mesmas da versão anterior, por título (painel de acesso
  das fichas, papéis, foto/recebimento, acabamento das fichas etc.).
- **equipe-grid no celular (C):** as 2 falhas (“ordena antes de paginar…” e “seleção
  apenas da página…”) reproduzidas na versão anterior: o teste procura botões de
  ordenação de cabeçalho que não existem nos cartões.
- **Capturas (D/E):** `zz-capturas-fase1.spec.ts` foi removido da suíte; as capturas
  agora usam `scripts/capturas-equipe-listagem.mjs` (fora da execução padrão, Vite
  sintético na porta 4194, sem credenciais). Novas capturas fictícias em
  `scratch/equipe-fase1-r2/`: Cadastros com abas 1440, linhas expandidas, menu,
  escuro, tablet 820 e celular 390.
- `tsc -b` sem erros; `npm run lint` exit 0 (16 avisos em arquivos ReUI não alterados);
  `npm run build` concluído.

**Pendente:** revisão final do usuário e commit; falhas antigas das fichas antes da Fase 2.

## Fase 1 — conferência manual pelo agente, 2026-10-06 -03:00

A pedido do usuário (“faça os testes você mesmo”), conferência manual no app real
(`npm run dev`, único Vite ativo), sessão Proprietário(a) Brotas, **somente leitura**:
nenhum cadastro salvo, nenhuma preferência alterada (tema aplicado só na página).

| Área | Resultado |
|---|---|
| Cartões (701px) | Busca “medico” → 3 e contagens das opções; tipo sem resultado → “Nenhuma pessoa encontrada” + Limpar → 5; vínculo Ipupiara → 4 e resumo só dessa clínica; Z–A; “5 pessoas selecionadas”; Ver cadastro abre/fecha com foco de volta; Editar abre e Esc fecha com foco de volta |
| Grade 1440/1024/820 | Sem rolagem lateral; Acesso visível; Clínicas só em 1440; segmentos por teclado (Espaço/setas); Limpar; ordenação por Pessoa; linha expandida alinhada à coluna Pessoa |
| Contraste medido | Selo neutro 4,98:1 (escuro) e 8,21:1 (claro); Acesso ativo 11,15 e 6,81 |

**Defeitos encontrados e corrigidos nesta conferência:**
1. Edição aberta pelo menu “Mais ações” não devolvia o foco ao gatilho ao fechar (ia
   para o corpo da página): a edição abria enquanto o menu ainda fechava. Agora abre
   em `onOpenChangeComplete` do menu, depois do retorno do foco; conferido no app real.
   O teste automático desse caminho (acabamento) já falhava antes por outro motivo.
2. Linha expandida 4px desalinhada no modo compacto (margem interna 8px vs 12px).

**Observação fora do escopo:** fechar a ficha de uma pessoa sem alterar nada pede
“Descartar alterações desta ficha?”; não havia rascunho salvo no navegador (estado em
memória da ficha, etapa 36). Registrado com as pendências das fichas.

**Testes após as correções:** specs que passam pelo menu/listagem reexecutadas nos três
projetos e mescladas à comparação: 0 falhas novas e 0 corrigidas (51/50/53).
`equipe.spec.ts` não estava no filtro `equipe-` da comparação; executado agora:
3/3 aprovados em cada tamanho (sem linha de base). tsc, lint (exit 0, sem avisos nos
arquivos alterados) e build passaram.
