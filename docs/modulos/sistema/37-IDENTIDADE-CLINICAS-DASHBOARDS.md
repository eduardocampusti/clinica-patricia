# 37 — Identidade visual das clínicas nas dashboards

Registro: 10/10/2026, 11:10 -03:00. **Implementado localmente; não publicado.**

## Escopo e ambiente

Pedido explícito: Brotas azul e Ipupiara verde, preservando a composição36 e o agrupamento posterior da comparação. Proprietária/Administradora: análise e identificação da clínica; Recepção: somente identificações já existentes no cabeçalho e detalhe do caixa. Não acrescentada comparação financeira na Recepção.

Fontes alteradas no checkout de prévia C, branch codex/resgate-local-2026-09-26, HEAD 44b13bb639c671b88e4a5f2e26c30ffa269dfbfa. Prévia habitual localhost:5190. Checkout D permanece codex/equipe-fase2-2026-10-07 / ad49386105b3ea19b10b11a4e40c31983ae38d69; recebe somente registros/evidências deste trabalho, sem substituir fontes paralelas. Os registros anteriores de testes reais são históricos; esta etapa teve validação sintética local.

## Referência observada e cores adotadas

O arquivo 01-DESIGN-SYSTEM.md define Ipupiara em **#16A34A**. A imagem public/imagem_login_ipupiara.png foi inspecionada: contém o nome Ipupiara verde; não foi localizada uma logomarca vetorial isolada. A configuração de login em clinicBrands.ts mantém a mesma cor primária nas duas clínicas, por isso não foi modificada. Não se afirma que cores do banco foram consultadas.

| Unidade | Tema claro | Tema escuro |
|---|---|---|
| Brotas | #326BEA, existente | #7EAEFF, existente |
| Ipupiara | #15803D | #4ADE80 |

Os verdes são variantes para contraste do verde documentado, não extração automática de pixels nem identidade sem referência verificável. Nova propriedade coresDashboard na configuração existente, por slug estável brotas/ipupiara. Identificação operacional reutiliza clinicaCorrespondeAoBrand (ID configurado, quando disponível, ou correspondência existente de nome); não cria regra de autorização. Séries analíticas usam o slug da unidade consultada, independentemente da clínica operacional selecionada.

Linhas/pontos/barras, legendas, marcadores, cartões, filtros, resumo e tooltip recebem as mesmas variáveis. O traço de Ipupiara continua descontínuo. Nomes e valores permanecem visíveis. Sem substituição global de roxo. Status clínicos, repasses, alertas e indicadores mantêm suas cores. Seletor global do sistema permanece neutro, compartilhado com outros módulos; nenhum estilo global de marca, login ou site público foi alterado.

## Componentes e preservação

Reutilizados os componentes já adaptados de shadcn/ReUI: Card/Header/Content, ChartContainer, Recharts e ToggleGroup existente. Nenhuma instalação ou consulta adicional ao catálogo necessária para troca restrita de tokens. Dimensões, sombras, espaçamentos e agrupamento nome/valor/barra permanecem. ComparacaoPeriodo.tsx e GraficoAnalise.tsx não foram editados nesta etapa.

TypeSafe consultada e avaliada: tarefa determinística, sem IA no produto. Triagem Jev somente com resumo sintético: classificação code_change com confiança0,46 incerta; complexidade1/2 com confiança0,91; incerteza sobre informação essencial resolvida pelo Codex após leitura local. Consumo medido969tokens,932,1326ms,US$0,0000357. Nenhuma credencial ou dado privado enviado.

## Verificações efetivamente realizadas

- Tipos TypeScript, lint dirigido sem avisos e consistência das notas aprovados. Build completo e baterias anteriores não repetidos por se tratar de estilos/configuração tipada sem dependências novas.
- **10 cenários distintos aprovados:**3 de identidade (desktop claro, desktop escuro, celular390);4 de Recepção (Brotas desktop e Ipupiara celular, cada uma em claro/escuro);3 reaproveitados de erro parcial inicial, ausência confirmada e zero/falha/dados anteriores sem barra positiva.
- Nos3 cenários de identidade: comparação, seleção individual B/I, troca operacional para Ipupiara, manutenção das cores, barra verde, legenda descontínua e foco por teclado. Verde com contraste mínimo4,5:1 sobre cartões nos dois temas. Provas anteriores de escala e agrupamento reaproveitadas; funções financeiras e de acesso intactas.
- Recepção B/I: cor do nome correta, sem análise financeira e sem chamada ao serviço financeiro da Proprietária; sem extravasamento horizontal nos tamanhos testados. Cores semânticas permanecem visíveis nas capturas.
- Primeiro ensaio de foco programático após clique não ativou :focus-visible; teste corrigido para entrada real de teclado e aprovado. Não foi necessário alterar estilo de foco do produto. Um aviso de lint motivou mover a constante visual para seu único consumidor; tipos/lint e cenário claro revalidados depois.
- Dados exclusivamente sintéticos, recursos externos bloqueados pela configuração de testes; nenhuma escrita ou criação de dados reais. Não equivale a nova homologação autenticada nem comprovação de persistência/backend.

## Capturas atuais — dados fictícios

- [Análise desktop claro](identidade-dashboard-2026-10-10/claro.png)
- [Análise desktop escuro](identidade-dashboard-2026-10-10/escuro.png)
- [Análise celular](identidade-dashboard-2026-10-10/celular.png)
- [Recepção Brotas claro](identidade-dashboard-2026-10-10/recepcao-brotas-claro.png) e [escuro](identidade-dashboard-2026-10-10/recepcao-brotas-escuro.png)
- [Recepção Ipupiara celular claro](identidade-dashboard-2026-10-10/recepcao-ipupiara-claro.png) e [escuro](identidade-dashboard-2026-10-10/recepcao-ipupiara-escuro.png)

As séries das capturas têm lacunas sintéticas; não conectar pontos distantes é comportamento preservado, não desaparecimento de linhas por cor. Testes de vazio/zero/erro/parcial preservados; não foram produzidas novas capturas desses estados inalterados.

## Arquivos deste ajuste

- src/config/clinicBrands.ts
- src/components/dashboard/IdentificacaoClinicaDashboard.tsx
- src/components/dashboard/identidadeClinicasDashboard.css
- src/components/dashboard/AnalisePeriodo.tsx
- src/components/dashboard/analisePeriodo.css
- src/components/dashboard/CabecalhoDashboard.tsx
- src/components/dashboard/PainelProprietaria.tsx
- src/components/dashboard/PainelRecepcao.tsx
- src/config/notasEvolucao.json
- tests/login/analise-periodo.spec.ts

Além destes10arquivos, relatório37, manifesto/capturas, checkpoints raiz/operacional/Sistema, índice, README e documento funcional receberam registros. [Manifesto](identidade-dashboard-2026-10-10/manifesto.json): hashes dos10alterados e conjunto cumulativo de25caminhos. Os15caminhos não abrangidos desta vez coincidem com a fotografia anterior; isso inclui consultas/cálculos, dependências, gráfico e comparação. Evidência limitada a esses caminhos, não afirma comparação de todo o histórico.

## Limites e próxima ação

Sem backend/banco/SQL/migrations/Docker/dependências/commit/push/deploy. Sem aprovação pessoal do acabamento atribuída. Implementação local concluída; próxima ação é avaliação visual na prévia5190. Publicação não solicitada nesta etapa.
