# Correção visual da dashboard — execução local

Estado: EM VALIDAÇÃO VISUAL PELO USUÁRIO; implementação local concluída. 10/10/2026, Bahia. O pedido posterior rejeitou a apresentação da etapa35; suas provas funcionais permanecem válidas, sem aprovação visual inferida. Implementação na prévia5190, checkout de publicação C, branch `codex/resgate-local-2026-09-26`, HEAD `44b13bb639c671b88e4a5f2e26c30ffa269dfbfa`. Árvore D e trabalhos paralelos preservados. Sem commit, push, deploy ou backend.

Escopo do diff-check aprovado: checkout de implementação C. Uma consulta global posterior na árvore principal D apontou espaços/finais de linha em documentos anteriores de Equipe e outros trabalhos fora do recorte. Não foram corrigidos nesta tarefa; não declarar limpeza integral de D. As duas árvores conservam alterações não relacionadas.

## Seleção registrada antes das alterações do produto

| Bloco | Componente/exemplo verificado | Fonte | Arquivo previsto e adaptação |
|---|---|---|---|
| Composição | shadcn dashboard-01 | https://ui.shadcn.com/blocks | Dashboard.tsx: referência de contêiner único; sem importar sidebar/bloco |
| Cartões | shadcn base-nova card | https://ui.shadcn.com/docs/components/base/card | ui/card.tsx: composição reduzida, tokens locais; AnalisePeriodo.tsx utiliza Card/Header/Content |
| Escopo segmentado | shadcn base-nova toggle-group | https://ui.shadcn.com/docs/components/base/toggle-group | AnalisePeriodo.tsx: adaptar primitivas Base UI instaladas, seleção única obrigatória e estilo local |
| Período | shadcn popover avaliado | https://ui.shadcn.com/docs/components/base/popover | Painel compacto de datas condicional, alternativa permitida pelo pedido; sem instalar calendário/dependências |
| Evolução diária | Chart local adaptado de shadcn + Recharts | https://ui.shadcn.com/docs/components/base/chart | GraficoAnalise.tsx: reutilização do gráfico/tooltip/tabela existentes, novo cabeçalho e vazio |
| Comparação horizontal | ReUI gratuito c-chart-2, código e thumbnail consultados | https://reui.io/components/chart/c-chart-2?ref=mcp | ComparacaoPeriodo.tsx: adaptar Card/BarChart/Bar para horizontal, sem badge de crescimento, dados oficiais já carregados |
| Resumo | tabela HTML sem Data Grid | https://reui.io/components/table?ref=mcp | AnalisePeriodo.tsx: superfície própria, cinco colunas, rolagem local móvel |

ReUI MCP respondeu a leituras; CLI oficial `shadcn view` confirmou código base-nova de card/popover/toggle-group e ReUI c-chart-2. MCP shadcn não exposto nesta sessão; leitura oficial por CLI não é prova de conexão MCP. Nenhuma instalação/configuração alterada. TypeSafe lida e avaliada como desnecessária para apresentação/cálculos determinísticos. Triagem Jev sintética: confiança0,91,977tokens,1078,51ms,US$0,000036036; decisão de execução do Codex sustentada no pedido completo.

## Diagnóstico observado e recorte

Na prévia autenticada, `.prop` tinha773,94px contra934px da análise: `margin-inline:auto` com max-width sem width, dentro de flex, reduziu a largura. Corrigir contêiner exclusivamente do Proprietário(a), mantendo margem do shell. Nova apresentação soma somente totais válidos/frescos em centavos para exibir “Duas clínicas”, conforme autorização específica posterior; não recalcula regras financeiras. Sem alterar serviços/permissões/adaptador.

O fixture anterior tinha somente primeiro/último dia; pontos separados eram lacunas deliberadas. Nova evidência separa série completa sintética, lacunas/dias diferentes e vazio. Não foi recebido um arquivo de imagem adicional identificável com os prints neste pedido; a referência objetiva é o documento integral e as capturas anteriores/atuais do projeto. Não atribuir inspeção de prints não disponíveis.

## Resultado — 10/10/2026, 10:30:56 -03:00

Correção implementada e verificada localmente, aguardando avaliação visual do usuário. Nenhuma aprovação pessoal presumida. O trecho de composição foi aplicado apenas no Proprietário(a); o CSS compartilhado recebeu seletores específicos, sem modificar as regras da Recepção. “Concluídos” clínico foi preservado; status passou a “Atualização concluída”. Não houve instalação de dependências, edição MCP, SQL, backend, dados, commit, push ou deploy.

### Reutilização efetiva

- Card/Header/Content adaptados do código oficial base-nova em ui/card.tsx e usados nos cartões, gráficos e resumo; tokens restritos à análise.
- ChartContainer/ChartTooltip existentes reutilizados; LineChart original mantém pontos, lacunas, tooltip exato, teclado e tabela diária. Novo cabeçalho, seletor de métrica no gráfico e detalhes progressivos.
- ReUI c-chart-2: adaptação real da composição Card/BarChart/Bar, horizontal, células com cores por clínica e escala comum. Retirados dados ilustrativos, percentuais e badge de crescimento do exemplo. Valores vêm das respostas já carregadas; sem consulta adicional. Bruto negativo continua visível em texto e suspende barras, com explicação explícita.
- ToggleGroup/Toggle: reutilização das primitivas Base UI já instaladas, seguindo a composição shadcn consultada, sem copiar variantes/dependência toggle adicional. Seleção única, teclado e permissões existentes.
- Popover e dashboard-01 foram referências avaliadas, NÃO instalados/reutilizados como blocos. Datas ficam em painel condicional permitido pelo pedido; rascunho só consulta ao aplicar. Tabela HTML simples, Skeleton e FeedbackAlert existentes.

### Medidas verificadas

| Viewport | Antes: cabeçalho/hoje vs análise | Depois |
|---|---|---|
|1440|x304,91/largura1070,19 vs x272/largura1136|Todos os sete blocos medidos x272/largura1136|
|1920|Contêineres anteriores diferentes, JSON em antes|Todos alinhados; largura máxima1440|
|390 e360|Captura390 anterior preservada|Margens16px, sem rolagem horizontal da página; tabela tem rolagem própria|

Cartões analíticos com padding22px (20 móvel), raio12, borda e duas sombras discretas; valores28–32px, texto monetário neutro e cores só nas marcas/séries. Gráfico diário300px/280px móvel; proporção desktop2:1, empilha abaixo de1200px. Paleta local, temas preservados. Descrição e período não se repetem em cada cartão. Total “Duas clínicas” aparece somente com duas fontes válidas e atualizadas. Erro/atualização o retira sem perder valores anteriores identificados. Repasses/estornos/parcela conservam suas definições.

### Verificações

38 cenários sintéticos distintos aprovados:24 anteriores adaptados executados juntos;3novos funcionais;11capturas completas com alinhamento/overflow/valores/zero verificados. As três provas novas cobrem totais exatos, rascunho sem consulta, teclado, detalhes, desaparecimento do consolidado com falha e bruto negativo sem transformação em positivo. Não foram repetidas baterias de outros módulos. Séries contínuas fictícias incluem zero explícito; cenário separado tem lacunas e datas diferentes entre clínicas. Não se fabricaram pontos nem movimento no Supabase.

Primeira rodada visual7/8: a navegação inicial não chegou à leitura concluída durante recompilação das novas importações. Na prévia normal foram observados erros transitórios de React durante HMR. A página recuperou; recarga normal posterior carregou os blocos/fontes. Rodada final11/11 passou sem relaxar expectativas. Todos os erros simulados esperados estão restritos às fixtures. Tipos, build com notas, lint dirigido e diff-check aprovados. Aviso preexistente de bundle>500kB permanece. JS da análise393,60kB/gzip113,53kB (antes365,39/106,84); CSS10,15/gzip2,39. Sem alegação de economia de pacote.

Conferência real desta etapa: sessão existente de Proprietário(a), prévia5190, consultas de Brotas/Ipupiara em comparação no mês e30dias concluídas com séries vazias; recarga concluída e largura390 sem overflow. Indicadores de hoje mantiveram seus horários/valores ao mudar o filtro analítico. Nenhuma operação de escrita. Sessões reais Recepção/Médico não repetidas. Movimentos não nulos, falhas e negativos são apenas sintéticos. Aviso anterior da foto pessoal permanece fora deste recorte. Produção não foi modificada nem reconferida nesta etapa.

### Capturas de página completa

Todas as capturas de arquivos desta etapa são **sintéticas**, com aviso visível “Dados fictícios — teste visual”. Não contêm dados de pessoas reais. Fonte: aplicação React normal com serviços interceptados exclusivamente na bancada de teste; não são mockups desenhados.

- [Preenchido1440](correcao-visual-dashboard-2026-10-10/depois/1440-preenchido.png), [vazio1440](correcao-visual-dashboard-2026-10-10/depois/1440-vazio.png), [escuro1440](correcao-visual-dashboard-2026-10-10/depois/1440-escuro.png).
- [Preenchido1920](correcao-visual-dashboard-2026-10-10/depois/1920-preenchido.png), [escuro1920](correcao-visual-dashboard-2026-10-10/depois/1920-escuro.png).
- [Celular390](correcao-visual-dashboard-2026-10-10/depois/390-preenchido.png), [escuro390](correcao-visual-dashboard-2026-10-10/depois/390-escuro.png), [celular360](correcao-visual-dashboard-2026-10-10/depois/360-preenchido.png), [vazio360](correcao-visual-dashboard-2026-10-10/depois/360-vazio.png), [escuro360](correcao-visual-dashboard-2026-10-10/depois/360-escuro.png).
- [Lacunas/datas diferentes](correcao-visual-dashboard-2026-10-10/depois/1440-lacunas.png).
- Comparação mesmo viewport: [antes1440](correcao-visual-dashboard-2026-10-10/antes/1440-preenchido.png) e depois1440 acima; [antes1920](correcao-visual-dashboard-2026-10-10/antes/1920-preenchido.png); [antes390](correcao-visual-dashboard-2026-10-10/antes/390-preenchido.png). JSONs junto às capturas registram medidas observadas.

### Arquivos e continuidade

12 arquivos de produto/teste alterados nesta correção:

- src/pages/Dashboard.tsx
- src/components/dashboard/PainelProprietaria.tsx
- src/components/dashboard/dashboardAcabamento.css
- src/components/dashboard/AnalisePeriodo.tsx
- src/components/dashboard/GraficoAnalise.tsx
- src/components/dashboard/ComparacaoPeriodo.tsx
- src/components/dashboard/analisePeriodo.css
- src/components/ui/card.tsx
- src/config/notasEvolucao.json
- tests/login/analise-periodo.spec.ts
- tests/login/visual-dashboard.config.ts
- tests/login/visual-dashboard.spec.ts

[Manifesto atual](correcao-visual-dashboard-2026-10-10/manifesto.json): hashes dos12 caminhos e do conjunto cumulativo20. O manifesto35 conserva a fotografia anterior e não deve ser usado sozinho como pacote atual. Os oito caminhos da etapa35 fora deste recorte coincidem exatamente com os hashes anteriores, incluindo adaptador financeiro, tipos/serviço, App, dependências e proteção de importação. Demais trabalhos locais permanecem fora do recorte. Fontes só no checkoutC; a árvoreD recebe relatório, checkpoints, decisões funcionais e cópia das evidências, preservando suas fontes.

Próxima ação: avaliar a correção na prévia http://localhost:5190/sistema/brotas/dashboard. A implementação local está concluída; publicação não foi autorizada nesta tarefa e não foi executada. Aprovação visual continua sendo decisão do usuário.


## Ajuste final: grupos da comparação — 10/10/2026, 10:43:03 -03:00

Pedido posterior: preservar toda a composição36 e agrupar nome à esquerda, valor exato à direita e barra imediatamente abaixo por clínica. Aplicado exclusivamente no card, com espaçamento24px entre grupos, cores anteriores e dois gráficos de uma barra com domínio numérico compartilhado iniciando em zero. ChartContainer/BarChart/Bar existentes reaproveitados, sem novas dependências/consulta de catálogo necessária. Não mudou serviço, período, cálculo financeiro, autorização, dados ou Recepção. O máximo numérico serve somente à escala gráfica; rótulos continuam em centavos exatos.

Zero, ausência, carregamento ou erro não produzem barra positiva. Se houver valor anterior após falha, o texto permanece identificado e sua barra é suprimida. Comparação parcial fica explícita. Mensagem vazia “Nenhum valor bruto recebido no período.” preservada; valor negativo permanece visível com a proteção anterior.

**Verificado:** sete testes dirigidos aprovados (três capturas, sequência zero/sucesso/falha com valor anterior, erro parcial inicial, ausência confirmada e negativo). Geometria verifica barras sob seu próprio rótulo, início comum e proporção2:1 para R$2.000/R$1.000; celular390 sem overflow. Tipos e lint dirigido passaram. As38provas anteriores foram reaproveitadas; não repetida bateria integral nem build completo, pois o ajuste não modifica dependências ou imports novos. Não houve nova homologação de sessão real/backend.

Capturas do card, todas **Dados fictícios — teste visual**: [desktop claro](comparacao-grupos-2026-10-10/claro.png), [desktop escuro](comparacao-grupos-2026-10-10/escuro.png), [celular](comparacao-grupos-2026-10-10/celular.png). Elas substituem apenas a apresentação deste card; as capturas completas anteriores continuam históricas.

Arquivos alterados: ComparacaoPeriodo.tsx (grupos e escala comum), analisePeriodo.css (apenas seletores do card), notasEvolucao.json (complemento da nota existente), tests/login/analise-periodo.spec.ts (quatro cenários novos parametrizados em sete verificações selecionadas). [Manifesto atual](comparacao-grupos-2026-10-10/manifesto.json) contém esses4caminhos e hashes atualizados do conjunto20; os16demais coincidem com a fotografia36. Checkpoints, README e funcional mestre receberam este complemento. Fontes no checkoutC resgate-local/44b13bb6; D conserva fontes paralelas e recebe apenas documentação/evidência.

TypeSafe consultada: ajuste determinístico, sem IA no produto. Jev recebeu resumo sintético: code_change, confiança0,74, complexidade0,97/2 (confiança0,93), informação ausente0,47 incerta resolvida pelo Codex;970tokens,900,798ms,US$0,000035742. Sem conteúdo privado enviado.

Concluído localmente, sem banco/backend/dependências/SQL/migrations/Docker/commit/push/deploy. Próxima ação: avaliação do card na prévia5190; não atribuir aprovação visual do resultado ao usuário.
