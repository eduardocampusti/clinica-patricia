# Caixa da Recepção — diagnóstico e prévia isolada

**Estado:** EM VALIDAÇÃO — prévia implementada e verificada localmente; avaliação visual pelo usuário pendente, sem integração.
**Início:** 03/10/2026, 22:40 -03:00 (America/Bahia).
**Git observado:** `codex/resgate-local-2026-09-26`, HEAD `cdfdec6`; alterações desta etapa não commitadas. Trabalhos documentais anteriores preservados.

## Escopo e precedência

Pedido atual autoriza diagnóstico, prévia, capturas e documentação. Não autoriza banco, permissões, integração normal, commit, push ou deploy. As nove imagens fornecidas são referências visuais; a reprodução de débito, cobranças, recibo, destinação ou aparência de aprovação nelas não aprova regras financeiras.

Fontes lidas: AGENTS, checkpoints operacional/raiz/Financeiro, índice, DEVELOPMENT_RULES, design system v3, mensagens, README, mestre, matriz, auditoria histórica, fluxos e contrato de migração frontend. A auditoria 03 descreve o início da reconstrução e não comprova o ambiente atual; o README e as seções posteriores do mestre/11 registram evolução. A decisão FASE 10D substitui a regra antiga: recepção solicita estorno, proprietária decide. Não houve reconfirmação remota do banco nesta tarefa.

## Mapa das fontes, contratos e permissões

Legenda: **existente** = observado no código e nos contratos locais, não testado remotamente nesta sessão; **adaptação** = apresentação/consulta a preparar sem alterar regra; **adicional** = exige decisão ou contrato novo.

| Recurso | Fonte e contrato observado | Permissão e restrições | Classificação / destino |
| --- | --- | --- | --- |
| Caixa ativo, clínica, operador, abertura | `src/lib/financeiro/financeiro.caixa-leitura.ts`: `consultarCaixaAtual`, `consultarResumoCaixa`; `sessoes_caixa`, RPC `financeiro_resumo_caixa`, `CaixaOperacional` | Proprietária/recepção ativas na clínica; médico não consulta. Status ativo inclui aberto/em_fechamento/aguardando_aprovacao/devolvido_para_correcao | Existente; adaptar identificação. “Caixa 024” é somente rótulo sintético: não há número comercial sequencial comprovado no contrato |
| Período | Sessão identificada por `sessao_caixa_id`; `aberto_em`, timestamps dos eventos | Não tratar calendário de hoje como período da sessão. Fechamento pode atravessar dias | Existente; UI deve mostrar abertura e período real, sem truncar no dia atual |
| Abertura/fundo | `financeiro.caixa.ts`: `abrirCaixa`; RPC `financeiro_abrir_caixa(p_clinica_id,p_valor_abertura,p_idempotency_key)` | Recepção/proprietária; zero permitido; identidade pelo serviço; bloqueios do banco | Existente; adaptação de entrada após contagem e confirmação explícita, sem copiar valor histórico |
| Origem de pagamento | `financeiro.agenda.ts`: `consultarPrecoConsulta`, `consultarRecebimentosAgenda`, `podeReceberNaAgenda`; `ReceberPagamento.tsx`, `ConsultaParaReceber` | Paciente/profissional/clínica/data/horário do agendamento. Preço do vínculo ativo `profissionais_clinicas`. Recepção/proprietária; agendado/confirmado/aguardando | Existente. O termo atendimento na composição visual deve usar o vínculo realmente existente: agendamento, não inventar chave de prontuário/atendimento |
| Recebimento/split/quitação | `financeiro.recebimentos.ts`: `registrarRecebimento`; RPC `financeiro_registrar_recebimento(p_agendamento_id,p_pagamentos,p_idempotency_key)`; `ResultadoRecebimento` | Uma forma por componente; dinheiro/Pix/crédito; soma integral; preço/caixa/autorizações novamente validados na transação | Existente; adaptar seleção rápida sem débito e sem pagamento parcial posterior |
| Dinheiro entregue/troco | Não são parâmetros nem campos do `ResultadoRecebimento` | Não somar dinheiro entregue nem troco ao valor recebido | Adaptação para auxílio temporário; adicional se for preciso persistir/reimprimir esses valores. Cálculos demonstrativos em bigint centavos |
| Cobranças em aberto/A receber hoje | `consultarRecebimentosAgenda` devolve conjunto de agendamentos com recebimento, não uma fila paginada com preços/saldos/eligibilidade. Rascunhos `financeiro_fundacao.sql`/Fastify não provam contrato operacional | Mestre não prevê contas a receber posteriores de consulta comum. Não usar preço atual para inventar dívida histórica | Fonte agregada não comprovada. Bloco omitido por padrão; toggle “Exibir proposta de cobranças” mostra demonstração identificada. Integração precisa de leitura contratada específica |
| Suprimento | `registrarSuprimento`; RPC `financeiro_registrar_suprimento(sessão,valor,motivo,chave)`; `movimentos_caixa` | Recepção/proprietária, caixa aberto, valor positivo; separado da receita | Existente; adaptar revisão. “Origem” estruturada das imagens não existe no wrapper |
| Sangria | `solicitarSangria`, `revisarSangria`, `efetivarSangria`; `sangrias_caixa` com solicitada/aprovada/rejeitada/efetivada | Solicitar não retira. Proprietária decide; efetivação é etapa distinta e exige aprovação/caixa aberto. Fechamento bloqueado com sangria pendente | Existente. “Destino” das imagens não é parâmetro estruturado; não criar transferência/guarda automática. Prévia cobre solicitação, projeção e nenhum débito antes da efetivação |
| Dinheiro esperado/composição | `ResumoOperacionalCaixa`; helper bancário da FASE 5 e RPC 10C; campos valor_abertura/total_dinheiro/total_suprimentos/total_sangrias/total_estornos_dinheiro/valor_esperado | Origem oficial no banco. Pix/crédito excluídos do dinheiro físico. Estorno já está abatido no esperado, não descontar duas vezes | Existente. Fórmula ilustrativa somente no serviço sintético; integração exibe campo oficial |
| Recebido neste caixa/por forma | total_recebimentos_brutos, total_dinheiro, total_pix, total_cartao_credito | Bruto da sessão, não caixa físico nem líquido após estorno. Resumo não traz contagem de recebimentos | Existente para valores; contagem precisa de leitura adicional, não deduzir do número de componentes |
| Movimentações/busca/filtros/páginas/detalhes | `movimentos_caixa` existe; policy `movimentos_caixa_select_proprietaria_recepcao` em migration FASE 2. Estorno guarda vínculo com recebimento de outra sessão. Wrappers atuais de caixa não retornam timeline completa | Consulta deve filtrar clínica/sessão e respeitar RLS; não confundir recebimentos de `financeiro.estornos-leitura.ts` com todos os movimentos | Adaptação de camada de leitura paginada, ordenação estável e joins de componentes/origens; não há wrapper pronto. Validar sinais e movimento de estorno com múltiplas formas, sem duplicar valor total |
| Estorno/elegibilidade | `financeiro.estornos-leitura.ts`: listagem por clínica, originais, estornos, `saldoDisponivelPorForma`; wrappers `solicitarEstorno`, `revisarEstorno` | Recepção solicita; proprietária aprova/rejeita, aprovação efetiva. Reservas não rejeitadas reduzem disponível; motivos obrigatórios e formas originais | Existente; adaptar detalhe e navegação. Sem UPDATE/DELETE de recebimento |
| Estorno de outro caixa | FASE 5 SQL: recebimento original preservado; revisão busca caixa atualmente aberto na mesma clínica, rejeita legado e dinheiro acima do esperado; novo movimento nessa sessão | Não reabrir caixa original nem permitir outra clínica. Aprovação exige caixa operacional aberto até para operação cujo dinheiro é zero | Existente no contrato local. Prévia mostra REC018/Caixa023 e atual024, sem serviço real; vínculo/dados reais e RLS não reconfirmados |
| Contagem cega | `FinanceiroCaixa.tsx` mostra dinheiro esperado antes do envio. Nenhum indicador/contrato de contagem cega localizado nas fontes de fechamento revisadas | Não declarar uma nova obrigação nem ocultar esperado como prova de contagem cega | Não existente nas fontes revisadas. Prévia organiza contagem/revisão por legibilidade e informa limite; se desejada, exige decisão/contrato próprio |
| Iniciar/enviar fechamento | `iniciarFechamento`, `enviarFechamento`, RPCs correspondentes; `fechamentos_caixa` com snapshot/tentativa; justificativa para diferença | Estados aberto → em_fechamento → aguardando_aprovacao. Sangrias pendentes bloqueiam início/envio; banco recalcula esperado | Existente; futura integração precisa chamar início explicitamente e atualizar estado; abrir painel visual sozinho não inicia operação real |
| Revisão/aprovação/devolução | `revisarFechamento(fechamentoId,aprovar/devolver,observação)`; `revisoes_fechamento_caixa`; `consultarDetalhesCaixa` | Somente proprietária; observação para devolução. Histórico de tentativas preservado | Existente; não retirar dinheiro, transferir, abrir próxima sessão ou gerar destinação no cliente |
| Eletrônicos/conciliação | Totais Pix/crédito registrados; não há integração bancária/maquininha nem campo externo comprovado nos wrappers de caixa | Igualdade com sistema não confirma liquidação/conciliação externa | Existente como registros. Conciliação é adicional; prévia informa “Conferência externa não informada” |
| Recibos/reimpressão | Recebimento confirmado e componentes existem; não localizado serviço/registro de recibo operacional vinculado, emissão, numeração e reimpressão. Exportação PDF de relatórios não equivale a recibo | Impressão deve usar referência confirmada e nunca registrar novamente pagamento | Adicional. Prévia apresenta recibo/impressão explicitamente demonstrativos, primeira impressão falha e retry simula sucesso sem segundo envio |
| Fiscal/documentos | `financeiro.fiscal-leitura.ts`, `financeiro.fiscal.ts`, `FinanceiroFiscal.tsx`; documentos_fiscais/tentativas, sete estados oficiais, RPCs solicitar emissão/cancelamento | Recepção/proprietária na clínica; solicitar não emite/cancela. Nenhum provedor externo configurado no fluxo | Existente para workflow interno; emissão, arquivo/download/autenticidade/vínculo externo adicionais. Prévia não oferece emissão real |
| Histórico/legado | sessoes_caixa e fechamentos; wrapper atual consulta sessão ativa/detalhes da última tentativa, não histórico paginado. Chave nula sinaliza legado; RPC rejeita sessão com entradas_caixa | Preservar todas as entradas/legado. Não converter ou encerrar automaticamente | Adaptação de leitura paginada; histórico da prévia rotulado proposta. Situações “Fechado” são rótulos humanos; status técnico terminal atual é aprovado |

## ReUI e TypeSafe

Consultas genéricas executadas no MCP instalado: `search(free:true)`; `get_component(data-grid,stepper,tabs,dialog,accordion)`; `get_examples(stepper,data-grid)`; `get_example(c-stepper-2)`; `get_install_command(stepper)` e checklist. Nenhum arquivo/dado privado enviado.

| Item avaliado | API / dependências | Decisão nesta etapa |
| --- | --- | --- |
| [Data Grid](https://reui.io/docs/components/base/data-grid), exemplo [paginação c-data-grid-1](https://reui.io/components/data-grid/c-data-grid-1) | `useTable` TanStack v9, `DataGrid table/recordCount`, paginação; Base UI, TanStack Table/Virtual, dnd-kit e primitivas shadcn | Não instalado: adicionaria várias dependências. A tabela semântica demonstrativa reutiliza o estilo local e não se apresenta como DataGrid ReUI. Considerar futura adoção só se justificar a dependência |
| [Stepper](https://reui.io/docs/components/base/stepper), exemplo [c-stepper-2](https://reui.io/components/stepper/c-stepper-2) | `StepperItem step`, `StepperContent value`, `StepperPanel`; Base UI/cn | Referência de duas etapas. Não instalado: fluxo local ModalBase já suficiente. Indicador semântico local não usa API inventada nem se apresenta como componente ReUI |
| Tabs/Dialog/Accordion | MCP informa shadcn, API pertence ao shadcn; não é API ReUI | Reuso de Base UI Tabs já instalado, ModalBase e details nativo. Sem migração de biblioteca ou identidade |

Componentes gratuitos do repositório oficial sob [licença MIT](https://github.com/keenthemes/reui/blob/main/LICENSE.md), conferida em 03/10/2026; catálogo informou plano free, sem licença premium. **Nenhum componente ReUI novo foi incorporado.** Escolhas são referências consultadas e componentes existentes, não declaração de instalação. ReUI premium/Motion Icons não utilizados.

Descrição disponível da typesafe-ai avaliada: decisões estruturadas/probabilidades não beneficiam cálculo, autorização ou regras determinísticas desta etapa. Instruções completas/API/chave não acessadas; nenhuma IA introduzida no fluxo.

## Prévia e fronteira de isolamento

Entrada: `tests/financeiro/recepcao-preview.html`, porta local 4186, configuração dedicada `recepcao-preview.vite.config.ts` estendendo a configuração sintética existente. Somente esse servidor aceita `previa=caixa-recepcao` na rota para realçar Financeiro na Sidebar existente. Não existe import desta prévia em `src/App.tsx`, menus ou rotas normais. AppShell/Sidebar/ThemeProvider/ModalBase/FeedbackAlert são os mesmos componentes locais, sem edição. Recepção recebe somente uma clínica no shell; mudança de clínica é um comando de laboratório. Proprietária simulada pode usar seletor real com duas clínicas sintéticas.

Componentes visuais separados do serviço em memória, com tipos e helpers reaproveitáveis. `ServicoSintetico` não importa RPC, Supabase, Fastify nem API. Chaves locais e trava evitam duplicidade; mudança de contexto invalida respostas. Recarregar reinicia os dados; nenhuma persistência financeira. O tema usa a infraestrutura existente somente nesta origem local.

Composição padrão omite cobranças. A proposta explícita por toggle/`?proposta=1` não agrega automaticamente saldo nem quita consultas. O fluxo recebe agendamentos sintéticos independentes. Movimento confirmado atualiza valores da demonstração; suprimento não aumenta receita; solicitação de sangria/estorno não diminui dinheiro.

Dados-base: cinco recebimentos = 90000 centavos (37000 dinheiro, 33000 Pix, 20000 crédito); fundo 15000 e sangria efetivada −10000 → esperado 42000. Split novo = 12000 Pix + 10000 dinheiro = 22000; entregue 15000 e troco5000 → bruto112000, dinheiro esperado52000. Nenhum cálculo financeiro oficial foi movido para frontend.

## Primeira integração viável — proposta, não executada

1. Adaptar somente identificação, barra de ações, dois indicadores e composição por forma à `FinanceiroCaixa` e ao resumo oficial existente. Preservar erros/legado/sem caixa, clínica/perfil/estado e invalidação de cache. Omitir cobranças e contagem de recebimentos até fonte própria. Não usar “024” ou outro número inventado em caixas reais.
2. A ação principal inicialmente abre a seleção/consulta pela Agenda existente e reutiliza `ReceberPagamento`. Não oferecer seleção manual de paciente/preço nem recebimento sem agendamento. Acrescentar auxílio de troco temporário se aprovado, sem modificar os parâmetros da RPC.
3. Reutilizar os wrappers de abertura, suprimento, sangria em três etapas, fechamento e revisão; testar assinaturas/estados/negativas no ambiente autorizado futuramente. Operações reais dependem de autorização própria, esta etapa não a fornece.
4. Movimentações/histórico exigem primeiro uma camada de leitura paginada sobre as tabelas existentes e auditoria dos joins/sinais/RLS. Não usar relatórios administrativos como atalho para recepção nem transformar último recebimento em histórico completo.

## Decisões/contratos ainda pendentes

- Fila agregada de agendamentos não pagos: elegibilidade, preço, período local, paginação, cancelados/iniciados, estados financeiros e atualização concorrente. Isso não aprova dívida posterior.
- Recibo: finalidade, dados mínimos, número comercial, clínica emissora, geração, auditoria/reimpressão, arquivo e persistência opcional do dinheiro entregue/troco. Não confundir com documento fiscal.
- Nome amigável do caixa e período; filtros e consulta de histórico completo; detalhe com pagamentos divididos e estorno originado em outra sessão.
- Contagem cega (se desejada), conciliação externa, débito, destino/origem estruturados de retiradas/entradas: decisões próprias, não inferidas das imagens.
- Fiscal externo: provedor por clínica/município, contrato e credenciais no backend, tentativas e retorno correlacionado, vínculo/consulta do documento.

## Evidências e limites

**Concluído em 03/10/2026, 23:08 -03:00, ambiente local sintético.** TypeScript específico da prévia e lint dos arquivos novos aprovados sem erros/avisos; `npm run build` aprovado. O build normal continua com avisos sobre chunks grandes, importação dinâmica ineficaz e tempo de plugins, sem relação funcional com esta entrega. `git diff --check` sem erros. Não houve mudança em `src`, migrations, permissões, package.json ou lockfile.

Playwright: **45 execuções aprovadas** em desktop1440×1000, tablet820×1180 e mobile390×844. O caso de larguras360/430 é efetivamente executado somente no projeto mobile (retorna sem ações nos outros dois). Cobertura: composição, filtro/paginação, quitação integral, campos monetários inválidos, split/troco, confirmação após serviço, duplo clique no mesmo ciclo, falha do serviço com preservação de campos, descarte de resposta ao mudar clínica, abertura com fundo zero/sem copiar histórico, justificativa de divergência, Pix/crédito sem conciliação presumida, sangria solicitada sem débito, suprimento sem receita, reservas/saldo de estorno de outro caixa, aprovação pela proprietária preservando original, revisão/devolução/aprovação de fechamento sem próxima abertura, teclado/foco/retorno, Fiscal indisponível e estados erro/carregando/vazio/permissão/legado. O estorno aprovado sintético reduz o dinheiro do caixa atual em5000 centavos, sem alterar bruto dos recebimentos dessa sessão.

A primeira rodada encontrou12 falhas: inicialização do cenário vazio, ativação de abas por setas, menu que permanecia aberto entre operações, seletor incorreto do teste de tema e recarga durante edição da prévia. Corrigidos e reexecutada a suíte completa45/45; os resultados finais acima prevalecem. Rotina de capturas adicionais concluída, sem testes reais. Rodapé do painel acompanha a rolagem em fluxo normal, sem sobreposição fixa; posição do botão conferida no viewport. Capturas de caixa aberto/móvel, recebimento, tema escuro e fechamento inspecionadas visualmente; restante da galeria é evidência gerada automaticamente, sem alegar inspeção individual de cada arquivo.

Capturas: **41 PNGs** em `scratch/caixa-recepcao/` (fora do Git), incluindo estornos, Fiscal, sangria, suprimento, recibo/falha de impressão e estados excepcionais. [Galeria local](http://127.0.0.1:4186/tests/financeiro/recepcao-capturas.html), [prévia](http://127.0.0.1:4186/tests/financeiro/recepcao-preview.html), [proposta de cobranças](http://127.0.0.1:4186/tests/financeiro/recepcao-preview.html?proposta=1). Os links exigem servidor local ativo, não são sites publicados.

Arquivos criados: `tests/financeiro/recepcao-modelo.ts`, `recepcao-preview.tsx`, `.css`, `.html`, `.vite.config.ts`, `.playwright.config.ts`, `.spec.ts`, `.tsconfig.json`, `.capturas.mjs`, `recepcao-capturas.html`, este relatório. Documentos atualizados: README/checkpoint Financeiro, checkpoint operacional/raiz e índice compartilhado. Componentes/shell/serviços normais preservados. Para retomar a prévia: `npm.cmd run dev -- --config tests/financeiro/recepcao-preview.vite.config.ts --host 127.0.0.1 --port 4186 --strictPort`. Testes: `node node_modules/@playwright/test/cli.js test --config tests/financeiro/recepcao-preview.playwright.config.ts`.

O relato do usuário não contém outras decisões recuperáveis de uma conversa anterior além do pedido e das imagens presentes; não se atribui aprovação ausente ao “conceito final”. Sangria: prévia cobre solicitação/projeção e bloqueio do fechamento com pendência; aprovação/efetivação de sangria ficam no fluxo existente e não foram reimplementadas integralmente neste demonstrador. O mock não reproduz todas as transações/constraints do banco; a primeira integração deve preservar os wrappers oficiais, inclusive a etapa de iniciar fechamento.

Não houve sessão autenticada, verificação conectada de RLS, operação financeira real, teste de impressora/aparelho físico ou publicação. Testes locais não comprovam persistência, aprovação real, conciliação nem emissão fiscal. Notas de evolução do aplicativo normal não alteradas: nenhuma funcionalidade desta prévia foi entregue ao usuário da aplicação normal.

Próxima ação: avaliação visual do usuário na prévia; se solicitada integração futura, executar o recorte mínimo descrito acima e contratar as leituras adicionais separadamente. Esta etapa está concluída, sem autorização automática para a próxima.

## Exportação solicitada — 04/10/2026, 07:38 -03:00

As41 capturas PNG existentes foram convertidas localmente para JPEG qualidade95,
sem redimensionamento, com os mesmos nomes e conteúdo visual. Originais preservados.
JPGs em `scratch/caixa-recepcao-jpg-2026-10-04/`; pacote
`scratch/Caixa_Recepcao_41_Capturas_JPG.zip`, 7.371.458 bytes.
Verificação:41 entradas, todas JPEG decodificáveis, dimensões iguais às fontes e
integridade CRC do ZIP aprovada. Somente conversão/empacotamento e registros;
sem mudanças de código normal, banco/permissões/integração/publicação ou Git.
HEADcdfdec6, branch codex/resgate-local-2026-09-26; arquivos locais fora do Git.
Próximo: usuário baixar e avaliar as capturas; pendências funcionais preservadas.

## Continuação autorizada — 04/10/2026, 08:33 -03:00

O usuário aprovou a direção visual e solicitou explicitamente integração local ao
Financeiro normal. O limite anterior de somente prévia foi substituído dentro desse
novo pedido; permanecem proibidos dados financeiros reais, banco/permissões e publicação.
Integração viável concluída e documentada no [relatório13](13-CAIXA-RECEPCAO-INTEGRACAO-LOCAL.md).
Componentes de indicadores/composição agora são compartilhados com a prévia mediante
resumo sintético injetado; operações e propostas demonstrativas continuam isoladas.
Seis verificações dirigidas da prévia aprovadas após essa adaptação, sem repetir as45
execuções históricas. Galeria/41JPGs preservadas; as11 capturas novas da integração
têm galeria e pacote separados. A autorização posterior não aprova novas regras ou
contratos de recibo, cobrança, débito, conciliação ou fiscal externo.
