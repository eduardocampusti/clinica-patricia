# FASE 14 — Redesign do Financeiro

## Complemento — conceito visual aprovado aplicado (24/09/2026)

A referência aprovada em 23/09 foi aplicada à Visão geral, Caixa, Estornos, Repasses, Fiscal e Relatórios. A composição usa quatro indicadores principais, curva diária, distribuição por pagamento, indicadores secundários e cartões operacionais. O shell mantém a sidebar escura e os tokens de marca de cada clínica; não altera permissões. Relatórios tem barra compacta e filtros avançados recolhidos em todas as larguras.

`FinanceVisual.tsx` centraliza ícones, métricas, cartões e gráficos. Os dados continuam vindo dos wrappers oficiais existentes. Não foram adicionados percentuais de crescimento, comparação anterior, séries semanais/mensais, débito ou outras categorias sem contrato. O gráfico apresenta valores brutos e separa estornos; valores líquidos seguem os campos oficiais. Pendências de estornos/repasses são atuais; fiscal respeita o período. Últimas movimentações mostra somente os recebimentos elegíveis retornados pela consulta existente da clínica, sem filtro de período, não um extrato completo. Cartões operacionais não aparecem no consolidado nem para médico. O CTA de fechamento apenas abre o fluxo de Caixa existente.

Validação desta aplicação:

- Unitários/contratuais: 15/15. Suíte Playwright afetada: 59/59; após o último ajuste da barra de Relatórios, revalidação direcionada: 13/13.
- Build aprovado; lint sem erros. Persistem os avisos anteriores de chunk acima de 500 kB, importação estática/dinâmica de Supabase e Fast Refresh em `ThemeProvider`.
- 24 capturas sintéticas em `scratch/fase14-approved-concept/`: seis telas, médico e vazio em desktop 1440×1000, tablet 820×1180 e celular 390×844. Capturas locais não versionadas; nenhum dado sintético persistido.
- Sem overflow horizontal estrutural nos cenários testados. Gráfico ajusta largura e oferece valores diários em texto. Contraste dos principais pares verificado; navegação por teclado, Escape/retorno de foco do menu e isolamento do médico exercitados. Isso não substitui auditoria integral WCAG nem smoke autenticado real.
- Nenhuma alteração de backend, RPC, RLS, migration ou escrita no Supabase nesta aplicação. O histórico abaixo descreve a primeira implementação da FASE 14 e permanece preservado.

**Estado:** implementação visual concluída em 23/09/2026. **Escopo:** shell compartilhado e interface financeira; nenhuma regra, RPC de mutação, permissão, migration ou dado remoto foi alterado.

## Direção e decisões

O Financeiro usa a identidade cromática da clínica já existente, com superfícies claras, um único acento nas ações e seleção, tipografia Geist, números tabulares e estados escritos além da cor. A sidebar mantém a cor da clínica, agora com marca, seletor e navegação mais compactos. O header mostra tela, clínica e identidade; o seletor funciona também no celular. A navegação interna virou uma faixa horizontal rolável; a proprietária inicia na Visão geral, recepção no Caixa e médico na própria Visão geral.

Antes, as áreas financeiras apareciam como seis botões independentes e as métricas em cartões repetidos. Depois, a Visão geral destaca recebido, parcela da clínica/profissional e repasses, separando análise de situação operacional. O Caixa mostra status, valores oficiais e próximo passo; Estornos distinguem revisão de recebimentos disponíveis; Repasses destaca líquido e pagamento externo; Fiscal usa nomes legíveis para estados internos; Relatórios organiza filtros e exportação, com prévia paginada de leitura. O consolidado mostra recebimentos na prévia e inclui os demais conjuntos no PDF/Excel.

Componentes e padrões: `src/financeiro.css` contém tokens e estilos de superfícies, navegação, métricas, status, tabelas, vazios e skeletons. As telas mantêm os wrappers de `src/lib/financeiro/`. A prévia usa uma nova leitura de página no wrapper `src/lib/financeiroRelatoriosRpc.ts`, sem registro de exportação nem cálculo financeiro no componente. Somente colunas permitidas entram na prévia; UUID e CPF não são exibidos.

## Responsividade e acessibilidade

Capturas sintéticas de Home, Caixa, Estornos, Repasses, Fiscal, Visão geral, Relatórios e painel médico em **1440×1000**, **820×1180** e **390×844** estão em `scratch/fase14-before/` e `scratch/fase14-after/`; menu aberto de tablet/celular e resultado de relatório também foram capturados após o redesenho. Não são versionadas. O script local `scratch/fase14-capture.mjs` confirmou ausência de overflow horizontal estrutural. No celular, filtros avançados ficam recolhidos, a prévia de relatório e a série diária viram listas. A sidebar móvel contém o foco, fecha com Escape e devolve o foco ao acionador; o estado fechado é inerte. O diálogo financeiro preserva seu foco contido e retorno anterior.

## Validação e limites

- `npm run test:financeiro`: 15/15.
- Playwright afetado: Caixa 9/9 em desktop e 9/9 em mobile, Estornos 5/5, Repasses 1/1, Fiscal 3/3 e Painel médico isolado aprovados em desktop; prévia de Relatórios aprovada em desktop e mobile, filtro avançado mobile aprovado; testes existentes de exportação passaram nos cenários exercitados. O teardown do Vite/Playwright no Windows continuou retendo o processo após o último caso; foi interrompido depois dos resultados individuais.
- `npm run build`: aprovado; Relatórios continuam em chunk lazy e PDF/XLSX sob demanda. O chunk principal permanece acima do aviso de 500 kB, uma pendência histórica de otimização geral.
- `npm run lint`: sem erros; um warning histórico em `ThemeProvider`.
- `git diff --check`: sem erros de whitespace.

A prévia mostra 20 linhas por página e usa cursor oficial. Ela é uma consulta de leitura; a exportação mantém reconciliação completa, auditoria e cancelamento. Nenhum dado sintético foi persistido. Shell de Agenda, Pacientes e Prontuário mudou visualmente, mas seus conteúdos internos não foram redesenhados nesta fase. O cutover real continua fora deste trabalho.
