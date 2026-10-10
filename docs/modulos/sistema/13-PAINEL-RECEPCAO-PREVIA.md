# Painel da recepção — prévia e integração local

**Estado vigente:** publicação seletiva autorizada pelo usuário em 03/10/2026; commit/envio/implantação em execução, ainda sem nova publicação comprovada. Revisão e manifesto abaixo; resultado efetivo será registrado após acompanhar as duas clínicas.
**Data:** 03/10/2026, America/Bahia (UTC−03).
**Pedido original (histórico):** conceitos desktop/celular enviados pelo usuário; primeira execução limitada à proposta.
**Git observado:** `codex/resgate-local-2026-09-26`, HEAD `2afff0a2dbc4b61ce85a6406d29b2d8e04a80b69`. Alterações desta etapa não commitadas; documentação anterior preservada.

## Resultado da prévia original (histórico, 16:49 -03:00)

Não foi encontrada prévia anterior do Painel da recepção nos arquivos controlados ou
nas prévias locais pesquisadas. Uma única entrada foi criada em
`tests/operacional/recepcao-preview.html`, com componente/CSS, servidor e testes próprios.
Não é importada por `src/App.tsx` nem por `src/pages/Dashboard.tsx`.

Cabeçalho, quatro indicadores, movimento com busca/modalidade exata de CPF,
profissional e abas, próximas chegadas, caixa compacto, pendências laranja,
profissionais com consultas e atualização. AppShell/Sidebar/ThemeProvider existentes
são reutilizados sem edição. O menu móvel conserva abertura, foco, navegação e fechamento.
Destinos de menu são demonstrações com retorno ao painel, não páginas conectadas.

Desktop: fila/próximas chegadas na coluna principal, apoio lateral. Celular/tablet:
fila primeiro, próximas chegadas, caixa e pendências inicialmente recolhidos.
Ações rápidas no cabeçalho em fluxo normal; nenhum rodapé fixo novo cobre o último item.
Botões informam ação simulada; não abrem gravação, fechamento direto ou WhatsApp.
Nenhuma dependência, banco, permissão, configuração operacional ou release foi alterada.
Notas de evolução do produto preservadas: esta etapa não entrega mudança no sistema normal.

## Contagens e significado dos dados simulados

Data civil fixa `2026-10-03`, referência inicial `10:20`, `America/Bahia`.
Atualizar usa `10:21` na simulação e recalcula a espera na mesma referência.
Contagem de Consultas do dia: IDs de agendamentos não cancelados na clínica/data;
Aguardando, Em atendimento e Concluídos: IDs por situação registrada.
Não são pacientes distintos: exemplo deliberado com 18 agendamentos e 17 pacientes.
Pacientes distintos: conjunto de identificações cadastrais por clínica/data, sem
união entre unidades. Totais não dependem da busca ou filtro por profissional.
As três pendências exemplificam três pacientes distintos; os avisos não bloqueiam.

Espera: diferença entre referência local e chegada fictícia explícita; jamais
hora agendada, `created_at` ou `updated_at`. Não há prioridade clínica. Em dados
desatualizados a espera fica indisponível. Horário passado em Agendado/Confirmado
sem chegada continua previsto e exige conferência; não gera falta automática.
Profissionais listados têm consultas, sem afirmação de presença/atraso/disponibilidade.

Valores financeiros são fixtures de exibição, sem soma de preços de consultas.
Recebido bruto simulado: R$ 1.450,00; saldo esperado em dinheiro: R$ 570,00.
São conceitos separados. A integração deverá usar exclusivamente os campos oficiais
do caixa autorizado, não reproduzir a fixture ou criar cálculo de negócio no frontend.
Falha financeira apresenta informação indisponível, sem valores zero, sem transformar
falha em pagamento pendente e sem ação Receber.

## Fontes identificadas antes da integração

Inventário **observado no código/documentação**, sem consulta ao banco nesta tarefa.
“Disponível” indica contrato/fluxo existente, não homologação conectada deste painel.

| Informação / ação | Fonte existente | Classificação | Critério / trabalho necessário |
| --- | --- | --- | --- |
| Clínica, identidade, menu e tema | `src/components/shell/AppShell.tsx`, `Sidebar.tsx`, `src/theme/ThemeProvider.tsx`, contexto de clínica existente | Disponível para integração | Respeitar vínculo/perfil; seletor de unidades da prévia é controle de demonstração, não nova permissão da Recepção. |
| Data local da clínica | `src/lib/pacienteLista.ts`: `hojeNaBahia`; `financeiro.date.ts` | Disponível para integração | Bahia, UTC−03; não depender do fuso do computador. Dashboard atual usa data local do navegador e precisará adotar referência da clínica. |
| Consultas e situações do dia | `src/pages/Agenda.tsx`: `carregarGradeDoDia`, `agendamentos` por `clinica_id`/`data` | Disponível para integração | Contar agendamentos não cancelados por ID; situação vem do registro. Consulta completa/contagem exata e limites devem ser comprovados antes de mostrar totais globais. |
| Pacientes distintos / consultas por profissional | `agendamentos.paciente_id`, `profissional_id`; joins administrativos da Agenda | Disponível para integração | Agrupar por ID da mesma clínica/data, não por nome; remover cancelados e evitar contagem parcial por paginação. |
| Próximas chegadas | `Dashboard.tsx` e Agenda: Agendado/Confirmado, data/hora futura | Disponível para integração | Dashboard atual limita a uma consulta; adaptar a lista e assegurar ausência de chegada, não inferir presença pela agenda. |
| Registrar chegada | `Agenda.tsx`: `mudarStatus`, atualização contextual autorizada e confirmação; lembrete CPF separado | Disponível para integração | Reutilizar a Agenda. O handler é interno: exposição do ponto de entrada requer adaptação de interface, sem nova regra de gravação. |
| Horário exato da chegada / minutos de espera | Schema versionado `agendamentos` e seleção atual da Agenda não apresentam timestamp específico de chegada | Exige desenvolvimento adicional | Não identificada fonte confiável. Atualização atual grava status e confirma ID/status; `updated_at` tem outro significado. Definir evento/timestamp e contrato em etapa autorizada separada. Não afirmar ausência no banco vivo sem inventário. |
| Nome, especialidade, vínculo de profissional | Agenda: `profissionais_clinicas`, `profissionais`, `especialidades` | Disponível para integração | Restringir aos profissionais com agendamentos do dia; não transformar horário habitual em presença. |
| Presença, atraso real ou disponibilidade em tempo real do profissional | Nenhum contrato de presença identificado | Ainda não comprovado | Nenhum selo de presença/atraso foi implementado; a Agenda não basta. |
| Busca nominal / CPF exato | `Pacientes.tsx`, `src/lib/pacienteCpf.ts`: `paciente_buscar_por_cpf`; `cpf.ts` | Disponível para integração | 11 dígitos, validação existente, envio explícito, clínica autorizada; nunca filtro parcial de CPF ou comparação local. A prévia não armazena CPF de fixtures. |
| Novo paciente / cadastro | `src/pages/Pacientes.tsx`, cadastro compartilhado e edição existentes | Disponível para integração | Reutilizar formulário; ações desta proposta apenas informam destino. |
| Pendências individuais confirmadas | `paciente_cpf_pendente`, `consultarCpfPendentePaciente`, `pacientePreenchimento.ts`, resumo de Pacientes | Disponível para integração | CPF opcional; erro/mascarado/carregando não equivalem a ausência. |
| Total de pendências dos pacientes com consulta hoje | Não identificada agregação específica no painel; indicador global existente conta ativos/novos | Exige desenvolvimento adicional | Consulta em lote/autorizada e completa, sem N+1; deduplicar pacientes e estados desconhecidos. Não extrapolar indicadores globais para este conjunto. |
| Receber pagamento | `src/components/financeiro/ReceberPagamento.tsx`, `financeiro.agenda.ts`, `financeiro.recebimentos.ts` | Disponível para integração | Abrir fluxo da Agenda elegível; banco valida preço, caixa, quitação, permissões e idempotência. Pagamento não muda situação clínica. |
| Situação oficial por agendamento | `financeiro.types.ts`: Confirmado, Parcialmente estornado, Estornado; `recebimentos.status` | Exige desenvolvimento adicional | `consultarRecebimentosAgenda` retorna somente Set de IDs; insuficiente para este painel. Leitura dedicada deve incluir estado completo, elegibilidade, erros e vínculo do agendamento. Lista de estornos atual exclui estornado total; não é substituto. |
| Pagamento parcial informado | Mestre Financeiro: recebimento comum integral; parcial oficial identificado é **parcialmente estornado** | Ainda não comprovado | Cenário defensivo “Parcial informado • conferir” somente simulado, encaminha para conferência. Não é novo enum, permissão ou autorização de saldo devedor. Mapear resposta externa/legada se aparecer; nenhuma mudança de regra nesta etapa. |
| Caixa atual / abertura / recebido bruto / meios / saldo esperado | `financeiro.caixa-leitura.ts`: `consultarCaixaAtual`, RPC `financeiro_resumo_caixa` | Disponível para integração | Usar `sessao_caixa_id` e clínica retornados; recebido=`total_recebimentos_brutos`, meios=`total_dinheiro/pix/cartao_credito`; saldo em dinheiro=`valor_esperado`. Sessão desde `aberto_em`, não soma da Agenda nem produção prevista. Respeitar sem caixa, legado, operacional e falha. |
| Conferência e fechamento | Módulo Financeiro e tela Caixa; matriz de permissões aprovada | Disponível para integração | Abrir Financeiro; Recepção opera e envia, proprietária revisa. Painel não fecha/aprova diretamente. |
| Última atualização / falha / resposta obsoleta | Guardas contextuais da Agenda e componentes `FeedbackAlert` | Disponível para integração | Cada leitura deve levar clínica/data/revisão; invalidar requisição antiga e limpar dados ao trocar contexto. Prévia ensaia atraso local, sem comprovar integração. |
| Dados reais, permissões efetivas e integridade ponta a ponta deste painel | Não acessados nesta etapa | Ainda não comprovado | Integração futura exige autorização própria e validação por papel/clínica; fixtures/build não comprovam produção. |

## Verificação e acesso

Prévia local: `http://127.0.0.1:4193/tests/operacional/recepcao-preview.html`.
Servidor: `node node_modules/vite/bin/vite.js --config tests/operacional/vite.recepcao.config.ts --host 127.0.0.1 --port 4193 --strictPort`.
O endereço passa para `/sistema/brotas/dashboard?previa=recepcao` apenas no servidor
isolado. A entrada HTML também permite recarga com cenário/unidade nos parâmetros.
Para reiniciar diretamente outro cenário, abrir a entrada com `?cenario=parcial`,
`vazio`, `falha`, `financeiro`, `passado` ou `desatualizado`. Controle de demonstração
também oferece esses cenários e troca sintética de unidade.

Capturas: `scratch/recepcao-preview/capturas/`, por desktop/tablet/mobile, claro/escuro,
vazio, falha de movimento, falha financeira, parcial e horário passado sem chegada.
Capturas claro/escuro de desktop e celular inspecionadas visualmente: fila primeiro,
apoio recolhido no celular, sem cobertura de rodapé e sem overflow horizontal observado.
Verificação TypeScript específica e lint dirigido passaram, exit 0, sem aviso no lint final.
Suíte final: **21/21 aprovados**, zero falhas, 29,1 segundos, três viewports
(1440×1000, 820×1180 e 390×844). 21 capturas produzidas (sete por tamanho).
Cobre teclado/setas/Home, ações simuladas sem mudança de situação, busca/filtros,
CPF incompleto sem consulta, menu móvel existente, último registro acessível,
temas e persistência após recarga, falhas sem zero/pendência, estados parciais,
horário passado sem chegada, guardas de resposta atrasada e desatualização.
Não houve chamada externa de aplicação observada no teste de composição, nem erro
de página. Chamadas injetadas pelo antivírus são uma categoria distinta abaixo.

Os testes bloqueiam HTTPS externo e observam ausência de chamadas de aplicação para
serviços externos. O Chrome desta máquina recebe requisições injetadas pelo antivírus
Kaspersky; o observador as classifica separadamente, sem desligar ou modificar o antivírus.
Falhas iniciais do harness foram corrigidas: reset de tema na recarga, seletores ambíguos
de alerta/cenário e nome do acionador móvel. Primeiro carregamento frio ultrapassou
30 segundos; testes subsequentes usaram servidor local já iniciado.

TypeSafe avaliada pela descrição: não pertinente a cálculos/filtros/estados determinísticos.
Skill impeccable utilizada com leitura do registro product e design system existente.
Nenhuma API de IA ou chave acessada. Referências visuais anexadas são conceitos, não
prova de campos disponíveis. Sem commit, push, deploy ou consulta/gravação real.

Próxima ação: usuário avaliar a proposta; integração só em nova etapa com fontes e
lacunas resolvidas, preservando Dashboard normal até aprovação específica.

## Primeira integração autorizada — 03/10/2026, 17:44 -03:00

**Estado implementado:** Dashboard normal do perfil Recepção integrado localmente. O pedido posterior explícito substitui a restrição histórica de prévia exclusiva. Os outros perfis mantêm o Dashboard básico anterior. Sidebar, AppShell, cabeçalho, navegação, temas, serviços de gravação, banco, permissões e configurações operacionais não foram alterados. Documentos e alterações de outras tarefas foram preservados. Nenhum commit, push ou deploy realizado.

A composição aprovada foi mantida com CSS e abas compartilhados entre o painel e a mesma prévia. Dados fictícios continuam somente em `tests/operacional`; o App normal importa exclusivamente o componente com serviços reais. Abas têm foco móvel único, setas/Home/End, indicação discreta de rolagem e ajuste da posição selecionada. O painel preserva o menu móvel existente; não adiciona rodapé fixo que cubra registros. Caixa e pendências começam recolhidos abaixo de 1024px. Explicações foram agrupadas em ajuda expansível; avisos de conferência, erros e indisponibilidade permanecem visíveis. A prévia passou a usar **Recebimento confirmado**, sem afirmar quitação integral; a aplicação normal omite as etiquetas financeiras individuais.

### Fontes de cada bloco e limite da primeira versão

| Informação / ação | Fonte existente confirmada no código | Classificação / uso integrado | Evidência e limite |
| --- | --- | --- | --- |
| Clínica / autorização | `useClinicaAtiva`, `usePapelNaClinica`, `useClinicasDoUsuario` e restauração do App | Disponível; somente Recepção autorizada | Leitura conectada em Brotas; nenhuma nova permissão |
| Dia / horário local | `hojeNaBahia`, `FUSO_PACIENTES=America/Bahia` | Disponível; mesma data civil em todas as consultas | Não usa a data UTC nem o fuso do navegador para as contagens |
| Consultas do dia / pacientes distintos | `agendamentos`, filtrado por clínica/data e status diferente de cancelado, `count:exact` e paginação completa | Disponível; consultas são agendamentos, pacientes são IDs distintos | 205 agendamentos/204 pacientes no teste sintético; 1/1 na leitura conectada do dia. Filtros não alteram totais |
| Aguardando / Em atendimento / Concluídos | `agendamentos.status` literal | Disponível; conta agendamentos por estado registrado | Nunca deduz estado pelo horário; previstos reúne agendado e confirmado |
| Busca nominal / filtro profissional | Conjunto completo da leitura autorizada, nome do paciente e profissional vinculado | Disponível; filtragem local da lista, ordenação por horário agendado e ID | Leitura conectada de busca/filtro; filtros não fazem a página representar um total global |
| CPF exato | `buscarPacientePorCpf` → `paciente_buscar_por_cpf`, mesma clínica, validação de 11 dígitos | Disponível; pesquisa exata por envio explícito | Teste sintético; nenhum CPF real digitado nesta conferência. Revisão monotônica descarta resposta após trocar filtros, inclusive voltar ao filtro inicial |
| Próximos agendamentos | Estados agendado/confirmado, data local e hora_inicio ainda futura | Disponível; mostra até três e oferece Ver previstos / Conferir na Agenda | Horários passados ainda previstos geram aviso; não significam falta |
| Cadastro / Novo paciente / Novo agendamento | Pacientes e Agenda existentes, com suas validações e confirmação de serviço | Disponível; encaminhamento temporário por clínica/ID, sem persistir dados do formulário | Abertura/cancelamento conectados e sintéticos, sem salvar. Cadastro selecionado usa ID exato e resumo existente; se não estiver entre os ativos autorizados, informa indisponibilidade |
| Registrar chegada / Receber | Fluxos internos da Agenda, inclusive estado confirmado pelo serviço | Encaminhamento à Agenda; não conectados diretamente no Dashboard | Rótulos Abrir na Agenda / Conferir na Agenda. Não registra chegada nem recebimento nesta execução |
| Caixa do turno | `consultarCaixaAtual` → sessão ativa acessível da clínica → `financeiro_resumo_caixa`, com validação de clínica/sessão | Disponível; resumo oficial por sessão, abertura, responsável, status, período e horário próprio de consulta | Integração sintética de caixa operacional. Na sessão conectada de Brotas o caixa é legado: valores omitidos e acesso ao Financeiro mantido |
| Recebido bruto / saldo esperado em dinheiro | `resumo.total_recebimentos_brutos` / `resumo.valor_esperado` da RPC oficial; meios de pagamento oficiais | Disponível; valores diferentes, sem somar consultas previstas | Valores inválidos/falha/legado/ausência não viram zero. Resumo operacional conectado ainda não comprovado nesta sessão |
| Profissionais com consultas hoje | IDs distintos no conjunto completo, junção `profissionais/especialidades` | Disponível; lista profissionais com agendamentos não cancelados e filtra o movimento | Não infere presença, atraso ou disponibilidade; nome ausente é explicitamente indisponível |
| Espera / ordem por chegada | Sem timestamp específico de chegada comprovado no contrato atual | Exige desenvolvimento adicional; omitidos | `updated_at`, `created_at` e hora prevista não são usados como chegada |
| Pagamento individual completo | Leitura da Agenda oferece Set de agendamentos com recebimento, insuficiente para estado financeiro completo | Exige desenvolvimento adicional; etiquetas omitidas | Existência de recebimento não comprova quitação. Não usa exemplos da prévia como fallback |
| Pendências consolidadas da clínica | Não há agregação segura comprovada para este bloco | Exige desenvolvimento adicional; contagens omitidas | Mantém somente conferência em Pacientes, com indisponibilidade explícita e sem bloqueio |

### Leitura, consistência e atualização

`dashboardRecepcao.ts` consulta páginas de 200 registros, exige contagem exata consistente, quantidade completa por página, IDs únicos e clínica/data/estados/revisões válidos; ao final reconfirma quantidade e última revisão. Qualquer falha, corte, divergência ou volume acima de 20 mil interrompe o resultado e não publica totais parciais. Trata-se de defesa de leitura, **não de snapshot transacional garantido pelo banco**; sob alterações concorrentes, pode ser necessária nova tentativa. Uma RPC de agregação/snapshot é evolução adicional, fora do escopo sem banco.

Movimento e caixa têm estados e horários próprios de consulta bem-sucedida. Nova tentativa esconde os valores anteriores; se falhar, preserva a referência da última leitura válida e informa a falha, sem renovar falsamente o horário. Data local é reavaliada a cada 30 segundos; mudança de dia consulta novamente. Troca de clínica desmonta o contexto anterior, cancela a leitura de agendamentos e ignora retorno tardio do caixa. Busca por CPF usa clínica, texto, situação, profissional, revisão e número de requisição; mudar e voltar a um filtro invalida a requisição e seu estado de carregamento. Os encaminhamentos de paciente e formulários não são restaurados por F5 nem carregados de uma clínica para outra.

### Verificações efetivamente realizadas

**Testes locais sintéticos:** 20 combinações distintas aprovadas na integração, em execuções dirigidas (seis cenários em desktop/tablet/celular, mais preservação de Proprietária e Médico em desktop). Cobrem conjunto com segunda página, pacientes distintos, filtros, CPF exato, todas as abas e foco, claro/escuro/F5, vazio, erro, recusa explícita, resposta cortada, horário passado ainda previsto, troca de clínica e retorno ao filtro inicial durante consulta, abertura/cancelamento dos dois formulários, ID correto e último registro acessível. Além disso, **9/9** regressões pertinentes da prévia passaram (composição/temas, busca/teclado e parcial/último registro). As demais suítes previamente aprovadas e sem relação não foram repetidas.

Os transportes dos ensaios interceptam apenas serviços sintéticos e bloqueiam destinos externos; gravações não autorizadas pelo teste são recusadas e observadas. Problemas iniciais do harness corrigidos: formato array de maybeSingle, hora_fim necessária à Agenda, nomes reais das RPCs de leitura, cores clínicas ausentes e botão Fechar no formulário móvel. A verificação de retorno ao filtro inicial também revelou estado de busca obsoleto; corrigido na aplicação e retestado nos três tamanhos. Mocks não comprovam persistência nem homologação financeira conectada.

**Compilação:** `tsc -b` via build e TypeScript da prévia aprovados; `npm run build` e `npm run lint` exit 0. Permanecem avisos preexistentes de exportação no ThemeProvider, importação dinâmica ineficaz de Supabase e bundles grandes; sem alteração desses componentes nem novas dependências. `git diff --check` passou. Build local não significa publicação.

**Verificação conectada por leitura:** sessão existente Recepção/Brotas, aplicação normal em `http://127.0.0.1:3000`, em 03/10/2026 aproximadamente 17:22–17:38 -03:00. Confirmados Dashboard, dia e estado previsto real, profissionais vinculados, busca sem resultado, filtro, abas, abertura e cancelamento de cadastro e agendamento sem preenchimento, F5 com restauração e encaminhamento ao Financeiro. Caixa acessível classificado corretamente como legado, sem valores inventados. Nenhum paciente criado, chegada registrada ou pagamento recebido. Identidades de pacientes/credenciais não foram copiadas para documentação ou capturas. Ipupiara conectada e caixa operacional real permanecem não comprovados nesta execução.

**Capturas de entrega:** `scratch/recepcao-integracao/capturas/{desktop,tablet,mobile}-{claro,escuro}.png`, do App normal com transporte sintético. Desktop e celular nos dois temas inspecionados visualmente; composição preservada, fila antes dos apoios, recolhimento inicial móvel e ausência de cobertura/rolagem horizontal da página. Capturas de volume têm nomes separados `*-volume-*`. Prévia mantém suas capturas em `scratch/recepcao-preview/capturas/`. Estes arquivos locais não contêm dados reais.

### Arquivos desta integração

- `src/components/dashboard/PainelRecepcao.tsx`, `PainelRecepcaoUI.tsx`, `painelRecepcao.css` e `src/lib/dashboardRecepcao.ts` (novos).
- `src/pages/Dashboard.tsx` e `src/App.tsx` (perfil e encaminhamentos).
- `src/pages/Agenda.tsx` e `src/pages/Pacientes.tsx` (entrada opcional nos fluxos existentes; regras de gravação preservadas).
- `src/config/notasEvolucao.json` (nota não lançada).
- `tests/operacional/recepcao-preview.tsx`, `.css`, `.spec.ts`, `playwright.recepcao.config.ts`; novo `recepcao-integracao.spec.ts`.
- Este relatório, README/mestre/checkpoint Sistema, `docs/ia/CHECKPOINT.md` e `CHECKPOINT.md` (registros sincronizados, histórico preservado).

**Links locais separados:** App normal: `http://127.0.0.1:3000/sistema/brotas/dashboard`; prévia isolada: `http://127.0.0.1:4193/tests/operacional/recepcao-preview.html` (rota de desenvolvimento própria). A prévia só funciona com o Vite específico `tests/operacional/vite.recepcao.config.ts`; não é incluída na aplicação publicada. Normal usa a configuração existente. Servidores locais mantidos para revisão.

**TypeSafe:** descrição avaliada, sem pertinência para regras/filtros/cálculos determinísticos. Não foi introduzida IA nem acessada/exposta chave. Skill impeccable e design system usados para preservar composição/tokens; nenhum redesenho novo.

**Git:** branch `codex/resgate-local-2026-09-26`, HEAD `2afff0a2dbc4b61ce85a6406d29b2d8e04a80b69`; implementação/documentação não commitadas. Sem banco, permissões, dados reais, commit, push ou deploy. Próxima ação: revisão do usuário da integração local; conferência financeira operacional e Ipupiara por leitura em sessão autorizada futura, sem publicar automaticamente.

## Preparação para publicação — 03/10/2026, 18:03 -03:00

**Conclusão:** nenhum impedimento técnico encontrado para publicar seletivamente a primeira integração, preservando as omissões aprovadas. Build de produção gerado e auditado; isso não equivale a publicação nem a homologação conectada integral. A sessão disponível continua Recepção/Brotas. Ipupiara recusou explicitamente o acesso por ausência de vínculo ativo; não foi possível comprovar seu Dashboard autenticado. Caixa operacional real permanece não comprovado nesta integração; o caixa legado de Brotas já havia sido conferido por leitura. Nenhuma gravação, mudança de banco/permissões/configuração, commit, push ou deploy.

### Revisão de fontes, estados e ações

- O seletor de `Dashboard.tsx` exige perfil Recepção e clínica ativa. O corpo anterior continua em `DashboardBasico`, utilizado pelos demais perfis. Nenhuma alteração em Sidebar, AppShell ou tema nesta revisão.
- Movimento usa clínica/data America/Bahia e todas as páginas com `count:exact`; rejeita cortes, duplicatas e divergência de quantidade/revisão. Totais são agendamentos não cancelados; pacientes distintos usam IDs únicos. Filtros só modificam a lista. A limitação de concorrência sem snapshot transacional, já descrita acima, permanece.
- **Concluídos é exatamente `agendamentos.status = 'concluido'`.** Horário passado não muda situação. Espera, ordem por chegada, pagamento individual, presença profissional e contagens cadastrais sem fonte continuam omitidos. Junções não autorizadas/ausentes mostram nome indisponível.
- Leituras usam os vínculos/papéis existentes, RLS e RPCs autorizadas; CPF exato mantém o serviço `paciente_buscar_por_cpf` e a clínica. Revisão de código/contrato não substitui prova conectada de todas as permissões. Troca de clínica aborta/ignora respostas anteriores; filtros invalidam a requisição de CPF mesmo ao voltar ao contexto inicial. Falha esconde dados e não renova a última leitura válida.

| Ação | Destino e contexto efetivamente preservado | Limite explícito |
| --- | --- | --- |
| Ver cadastro | Pacientes, mesma clínica e ID exato, seleção do resumo existente | Somente pacientes ativos autorizados; informa quando indisponível. Encaminhamento temporário não persiste por F5 |
| Abrir Agenda (linhas e próximos) / Ver agenda | Agenda geral da mesma clínica, calendário e fluxos existentes | Não envia ID do agendamento, paciente, profissional ou data selecionada. Os antigos rótulos **Abrir na Agenda / Conferir na Agenda** foram substituídos por **Abrir Agenda**, para representar o destino geral |
| Novo paciente | Formulário existente de Pacientes, mesma clínica | Mantém validações e gravação existente; nenhum salvamento usado no teste |
| Novo agendamento | Formulário existente da Agenda, após autorização de escrita da clínica | Data/opções iniciais continuam pertencendo à Agenda; não encaminha paciente/profissional selecionado no painel |
| Abrir Financeiro | Módulo Financeiro da mesma clínica, autorizado pela navegação existente | Não seleciona automaticamente a sessão exibida; conferência/fechamento permanecem no módulo, sem novas gravações |
| Seleção de profissional | Filtro local por ID do profissional, com foco na busca | Mantém situação/busca atuais e totais completos; não afirma presença/disponibilidade nem abre agenda individual |

### Caixa: contrato e proteção adicional

O wrapper existente busca apenas sessões em aberto/em fechamento/aguardando aprovação/devolvidas para correção, por clínica; caixa aprovado/fechado não entra nessa consulta ativa. A RPC `financeiro_resumo_caixa` autoriza usuário ativo e vínculo ativo Proprietária/Recepção na clínica da sessão, rejeita legado incompatível e retorna resumo oficial. Código do contrato consultado; nenhuma migration executada.

| Resultado da fonte | Comportamento no painel |
| --- | --- |
| Operacional autorizado | Exibe status oficial, clínica, abertura/responsável, período e horário da leitura. Recebido bruto usa `total_recebimentos_brutos`; saldo esperado em dinheiro usa `valor_esperado`; não recalcula nem soma consultas |
| Fechado/inexistente/sem sessão ativa visível | **Nenhum caixa aberto acessível**, valores indisponíveis. Resultado vazio de RLS não prova inexistência nem distingue ausência de permissão silenciosa; não inventa saldo zero |
| Legado sem chave operacional ou rejeitado pelo contrato | Sem valores; orienta conferência no Financeiro. Não reconstrói cálculo legado |
| Falha de leitura/contrato inválido | **Caixa indisponível**, sem valores e sem novo horário de sucesso |
| Recusa explícita de permissão | **Caixa sem permissão**, sem valores; mantém destino ao módulo existente |

Nesta revisão foi corrigida uma lacuna defensiva: os valores/data já eram validados, mas um estado desconhecido na resposta poderia produzir rótulo vazio e ainda mostrar valores. Agora o painel exige `STATUS_CAIXA` oficial antes de renderizar o resumo; estado inválido entra em indisponibilidade. O wrapper existente já rejeita clínica/sessão divergente. Não foram alteradas regras do Financeiro.

### Manifesto seletivo da entrega

Base observada: branch `codex/resgate-local-2026-09-26`, HEAD `2afff0a2dbc4b61ce85a6406d29b2d8e04a80b69`. Árvore permanece suja e não commitada. **Não incluir automaticamente todos os arquivos de `git status`**: há documentação anterior de várias tarefas.

| Grupo | Arquivos/trechos pertencentes à entrega | Dependência / seleção |
| --- | --- | --- |
| Runtime novo | `src/components/dashboard/PainelRecepcao.tsx`, `PainelRecepcaoUI.tsx`, `painelRecepcao.css`; `src/lib/dashboardRecepcao.ts` | Incluir os quatro completos. Reutilizam tokens/shell, Supabase, data/CPF e serviços Financeiro existentes |
| Dashboard | `src/pages/Dashboard.tsx`: imports e seletor Recepção, preservando corpo antigo | Todo o diff atual deste arquivo pertence à integração |
| Encaminhamentos | `src/App.tsx`: `entradaPainel`, `setTela`/`encaminharPainel`, limpeza em navegação/troca de clínica e props Dashboard/Agenda/Pacientes | Todo o diff atual pertence à integração; base depende das rotas/vínculos e Sidebar anteriormente publicados |
| Entrada na Agenda | `src/pages/Agenda.tsx`: prop opcional, ref e efeito que abre formulário existente | Somente esses trechos (12 linhas adicionadas no diff atual). Preservar restante da evolução da Agenda presente no HEAD |
| Entrada em Pacientes | `src/pages/Pacientes.tsx`: `pacienteInicialId`, estado/chave/filtro por ID, seleção do resumo e aviso/retorno à lista | Somente o diff atual de encaminhamento; depende do cadastro/resumo publicado no HEAD. Não selecionar outras revisões de Pacientes |
| Nota ao usuário | `src/config/notasEvolucao.json` | Somente a nova entrada Dashboard da Recepção em `naoLancadas.novidades`. Sem inventar data/versão lançada |
| Prévia/testes de desenvolvimento | `tests/operacional/recepcao-preview.{html,tsx,css,spec.ts}`, `recepcao-integracao.spec.ts`, `playwright.recepcao.config.ts`, `vite.recepcao.config.ts`, `tsconfig.recepcao.json` | Conservam única prévia e testes reproduzíveis no repositório. **Não entram em dist**; produção não depende das fixtures. Prévia depende do CSS/abas compartilhados |
| Documentação seletiva | Este relatório; seções Painel da Recepção no README/mestre/checkpoint Sistema, `docs/ia/CHECKPOINT.md` e histórico `CHECKPOINT.md` | Selecionar apenas trechos desta entrega. Esses arquivos também conservam registros de tarefas anteriores |
| Fora da entrega | AGENTS/índice/decisões e documentação de Equipe, Pacientes, Agenda, SMTP, rotas e Sidebar anterior | Alterações já existentes preservadas; não empacotar como novo trabalho desta entrega |

Nenhuma nova dependência npm, migration, RPC, permissão, variável de ambiente ou configuração de hospedagem necessária. Financeiro deve continuar com seu contrato já homologado; tabelas/campos/RLS existentes permanecem dependências. `vite.config.ts`, `package.json`, lockfile, `.htaccess`, redirects e configurações de teste base não foram alterados. A publicação futura ainda exige autorização própria e seleção da base/trechos acima; preparar não autoriza um push que dispare integração automática da hospedagem. Reversão futura deve retirar apenas essa integração e restaurar o Dashboard básico da Recepção, preservando as entregas anteriores; nenhum rollback de banco necessário.

### Pacote e verificações desta revisão

- **2/2 novos testes dirigidos**, desktop e celular, 18,8 segundos: operacional com recebido bruto e saldo em dinheiro diferentes; ausência de sessão; legado; recusa de permissão; estado desconhecido; valor inválido; clínica divergente; falha financeira; destino Agenda geral na mesma clínica e nenhuma escrita/erro de página. Transporte sintético do App normal, não prova conectada. As **20 combinações + 9 regressões já aprovadas não foram repetidas**.
- `npm run build`: exit 0, inclui `tsc -b` e validação de notas; Vite 8.2 gerou pacote de produção. `npm run lint`: exit 0. Avisos anteriores de ThemeProvider, importação dinâmica de Supabase, tamanho de bundles e tempo de plugins continuam; nenhum novo código nesses módulos. `git diff --check`: exit 0. Temas/abas/teclado/composição usam a evidência pertinente anterior; não houve alteração estética ou repetição dessas suítes nesta revisão.
- Auditoria estática desde `src/main.tsx`, seguindo imports de runtime/dinâmicos e excluindo apenas tipos: **130 fontes alcançáveis, nenhuma em tests/scratch ou arquivo de teste**. Pacote: **29 arquivos**, sem páginas/capturas/specs/fixtures da Recepção nem source maps. JS não contém os marcadores pesquisados de transporte sintético, pacientes fictícios, operador de teste, prévia ou simulação de salvamento. Classes CSS compartilhadas não instanciam botões de demonstração. O HTML de entrada aponta somente os assets normais.
- **Exceção preexistente identificada e preservada:** nove HTML estáticos em `dist/previas-emails`, copiados de public. São prévias de e-mail com links fictícios de uma entrega anterior, cuja disponibilização pública foi documentada expressamente em `equipe/23-EMAILS-INSTITUCIONAIS.md`; não são a prévia do Dashboard nem fallback de dados da aplicação. Não foram removidas nem apresentadas como parte desta integração. Uma decisão futura de retirar todas as prévias de e-mail públicas seria alteração dessa outra entrega/configuração; não foi inferida nesta revisão.
- Manifesto local de artefatos, bytes/SHA-256, fontes alcançáveis e resultados da busca salvo em `scratch/recepcao-publicacao/auditoria-pacote.json` (ignorado pelo Git, fora do pacote). Entrada `dist/index.html`: SHA-256 `66e5cf87e0f2e88a94148a97ad15a86a27bb060ed4588d6f7600a96c328f89b0`. Compilação da árvore local suja; o HEAD sozinho não identifica esse pacote.
- **Leitura conectada nesta revisão:** rota Ipupiara local3000 negou explicitamente ausência de vínculo ativo da sessão, sem retornar ao Dashboard de outra clínica. Retorno a Brotas recuperou o Dashboard autorizado. Não houve login novo, elevação de acesso ou gravações. Evidências conectadas de Brotas da etapa anterior permanecem válidas dentro do escopo ali descrito; não reapresentadas como nova homologação.
- **Zoom nativo 125%/150% não verificado:** navegador disponível anuncia somente visibility/viewport e não expõe zoom nativo; APIs nativas estão desabilitadas. Nenhuma emulação/escala CSS foi usada como substituto. Capturas desktop/celular e claro/escuro anteriores continuam sendo evidências sintéticas da composição aprovada.

TypeSafe novamente avaliada pela descrição e não pertinente às verificações determinísticas; sem uso de IA/chaves. Próxima ação: decisão do usuário sobre publicação seletiva, com os limites acima; antes de comprovar Ipupiara e caixa operacional, usar sessão legitimamente autorizada por leitura. Links locais permanecem separados: aplicação normal `http://127.0.0.1:3000/sistema/brotas/dashboard`; prévia sintética `http://127.0.0.1:4193/tests/operacional/recepcao-preview.html`. Nenhuma publicação nesta execução.

## Publicação seletiva autorizada — 03/10/2026, 18:36 -03:00

Pedido posterior explícito autoriza commit seletivo, push e fluxo existente Hostinger
nas duas clínicas, sem banco/permissões/dados reais/configuração. Visual, Abrir Agenda,
STATUS_CAIXA e omissões da primeira versão mantidos. TypeSafe consultada pela descrição,
sem pertinência para esta tarefa determinística e sem uso de chave/API.
Fetch confirmou branch codex/resgate-local-2026-09-26 alinhada0/0 com origin,
HEAD2afff0a2; índice inicialmente vazio. Diff do runtime coincide com a preparação;
nenhuma nova alteração funcional nesta retomada. Resultados anteriores são evidência
da versão preparada, não testes executados novamente nesta publicação.
Seleção documental por conteúdo no índice preservará os registros misturados de
outras tarefas no diretório de trabalho. Prévia/testes serão versionados para
reprodução, mas não incluídos em dist; nove prévias de e-mail anteriores mantidas.
Hostinger MCP solicitou reconexão; painel web também não tem sessão disponível.
Reconexão solicitada ao titular enquanto seleção e conferência do Git continuam.
Antes do envio, ambos os endereços normais responderamHTTPS200 com assets da versão
anterior, sem painel novo; essa leitura de arquivos não valida login/painel autenticado.
Nenhuma permissão ou vínculo alterado para Ipupiara; ausência de sessão é limite de
validação, não defeito comprovado do painel. Reversão: novo commit seletivo retirando
somente esta integração, com base anterior2afff0a2; sem force push/rollback de banco.
Próxima ação: revisar índice, confirmar fluxo efetivo, concluir commit/push e verificar
os builds/arquivos servidos e sessões legitimamente autorizadas disponíveis.
