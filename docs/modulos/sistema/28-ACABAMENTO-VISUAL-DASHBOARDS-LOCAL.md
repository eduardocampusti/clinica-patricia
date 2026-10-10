# Acabamento visual local das dashboards

Estado: IMPLEMENTADO E VERIFICADO LOCALMENTE. 2026-10-09 22:16:41 -03:00

O pedido anexado autoriza somente acabamento de Proprietária/Administradora e Recepção/Secretaria. A autorização anterior de publicação não foi reutilizada: esta etapa proíbe commit, push e deploy.

## Alterações realizadas

Agenda usada como referência real: src/pages/Agenda.tsx, agendaAcabamento.css, conjuntos KPI do index.css e seção aditiva do design system. Faixas superiores3px, tonalização perceptível, bases de ícones, raio13–14px e sombras curtas/espalhadas em tokens exclusivos do escopo .prop/.rp-integrado; cores de marca preservadas. As sombras não dependem de hover; cartões informativos sem cursor de ação. Temas claro/escuro e reduced-motion preservados. Nenhuma biblioteca instalada nem token global alterado.

Proprietária: azul/verde/violeta no Financeiro, sem caixa externa duplicada; cinco indicadores oficiais com azul/ciano/laranja/violeta/verde e ícones; sem novos cálculos. Atenção com texto “Sem pendências nos itens consultados” somente com leitura bem-sucedida, detalhes “Ver escopo” preservando posição atual versus documentos dos recebimentos do dia. Carregamento/erro/recusa nunca recebem confirmação verde. Agenda vazia compacta; lista, alertas e destinos preservados. Horários independentes continuam visíveis.

Recepção: indicadores com faixas/tonalização, movimento e filtros separados, seleção de aba visível. Caixa usa estado confirmado para ícone/valor; sem sessão/consulta/erro não herdam verde de caixa aberto. Valores podem continuar ocultados. Profissionais compactos, atalho cadastral discreto. Busca, filtros, CPF, abas, ações, consultas e política periódica intactos.

## Arquivos desta etapa

- src/components/dashboard/PainelProprietaria.tsx
- src/components/dashboard/PainelRecepcao.tsx
- src/components/dashboard/dashboardAcabamento.css (novo)
- tests/login/dashboard-administrativa.spec.ts (rótulo aprovado; matrizes com valores/nomes sintéticos longos)
- tests/login/dashboard-acabamento-util.ts (novo: contraste e limites, sem comparar valores literais de CSS)
- tests/operacional/recepcao-integracao.spec.ts (matrizes de apresentação)
- src/config/notasEvolucao.json (nota explicitamente ainda não publicada, versões preservadas)
- relatórios/README/mestre/checkpoints do Sistema e índice compartilhado.

As duas árvores foram atualizadas seletivamente; o checkout isolado mantém fixtures de leitura/autenticação da publicação0.6 que a árvore paralela antiga ainda não havia incorporado. Fontes de dashboard coincidentes verificadas; não sincronizados integralmente App/guardas, arquivos do Claude ou outros trabalhos. Branch principal local equipe-fase2/ad49386 intacta, índice vazio; checkout de prévia resgate-local/e012c4e4 com alterações não commitadas.

## Verificações

| Verificação | Resultado e origem |
|---|---|
| Tipos/lint/build/diff-check direcionado | Aprovados no checkout isolado, avisos preexistentes |
| Dashboards administrativas e rotas em conjunto |64/64 locais sintéticas |
| Proprietária: matriz de apresentação |6/6, cada caso1440/1024/768/430/390/360px, B/I, ambos os temas, vazio/valores e nomes longos |
| Recepção: regressão e apresentação conjunta final |59aprovados/1inaplicável |
| Sessão local real Proprietária |B/I carregados, sem alertas ou transbordamento; atualizaçãoB conservou valores/contagens e F5I conservou clínica/rota |
| Sessão local real Recepção |Indisponível; nenhuma conta criada para obtê-la |
| Produção |Não alterada nem declarada homologação nova deste acabamento |

Falhas encontradas e corrigidas: selos escuros da Recepção tinham contraste4,01:1; fundo local ajustado para passar4,5:1. A expansão visual deslocou Movimento além do limite original600px no tablet/celular (603/660,69px); compactados espaçamento e disposição dos ícones sem reduzir fonte/rótulos, ocultar ações ou aumentar o limite do teste. Repetições parciais não foram apresentadas como aprovação da execução conjunta; resultado final acima distingue a rodada completa.

Nenhuma lógica de acesso ou cálculo foi corrigida nesta etapa. Não há nova migração, dependência de backend, RLS/hook/Auth alterado ou SQL executado. Nenhuma consulta administrativa ao Supabase nem recursos novos; provas anteriores de18contas/dezcontextos encerrados preservadas. Configurações, AD, Meu perfil, Médico, sidebar/topbar e Agenda preservados. GraphQL permanece ausente conforme relatório27, sem nova dependência.

## Como conferir e evidências

Prévia REAL ativa em http://127.0.0.1:5190/acesso/brotas (Ipupiara: /acesso/ipupiara), sobre a publicação0.6 +acabamento local. A sessão legítima retomada está em /sistema/ipupiara/dashboard. Sem credenciais copiadas ou extraídas. Servidores anteriores não encerrados.

Capturas de demonstração isoladas na pasta privada dashboard-acabamento-local da sessão (sem dados pessoais reais, sem logs brutos no Git). Antes da Proprietária reconstruído da fotografia preservada em configuração Vite temporária de teste, sem restaurar fontes atuais; capturas comparáveis de zero em1440/360px. Antes da Recepção capturado antes das mudanças com15registros fictícios. Depois nos mesmos cenários e temas. Datas/horários das fixtures são simulação; não relógio real de última leitura. Capturas reais da sessão autenticada não publicadas para evitar exposição de valores/nome pessoal.

TypeSafe lida/avaliada: sem decisões estruturadas de IA. Nenhuma chamada à API TypeSafe/Jev pelo limite explícito desta tarefa; triagem assumida diretamente pelo Codex. Impeccable aplicada respeitando a direção visual específica do usuário, que prevalece sobre preferências genéricas da skill. Componentes e ícones existentes suficientes; ReUI avaliado sem necessidade de catálogo/dependências.

Pendência: revisão visual pelo usuário e eventual autorização futura de publicação. Nenhuma nova decisão técnica ou ampliação de contas necessária para concluir o escopo local.

## Evidências selecionadas e reprodução

Prova sanitizada: `database/proofs/dashboard/2026-10-09-acabamento-local/verificacoes.json`. As seis imagens em `database/proofs/dashboard/2026-10-09-acabamento-local/capturas/` são demonstrações sintéticas, incluindo antes/depois e celular escuro. Não contêm resultados financeiros ou pacientes reais. Diferenças nos horários das capturas são próprias das fixtures e não indicam alteração da atualização real.

Total: **129 testes de interface aprovados e um caso não aplicável**, sem somar capturas auxiliares. Comandos reproduzíveis no checkout isolado: `npx tsc -b`, `npm run lint`, `npm run build`; Playwright com `tests/login/dashboard-administrativa.config.ts` e `tests/operacional/playwright.recepcao.config.ts`, selecionando os respectivos arquivos de dashboard. A matriz administrativa foi executada separadamente das 64 regressões; a Recepção foi concluída em execução conjunta do arquivo inteiro. Cache e saídas ficaram no disco C devido à falta de espaço no D. Nenhuma repetição isolada foi usada para substituir a prova conjunta final.
