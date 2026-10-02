# Agenda — experiência da recepção

## Etapa 1 do redesenho — seletor visual de horários (02/10/2026)

Estado em 02/10/2026 10:50 -03:00: **publicação autorizada em andamento.** Implementação de
10:20 aprovada em testes sintéticos; conferência por leitura no principal concluída (abaixo).
Resultado do commit/push/deploy registrado depois, fora deste commit, como nas etapas anteriores.

### Conferência por leitura no principal — 02/10/2026 10:45 -03:00

Aplicação local 127.0.0.1:3000 conectada ao principal xftnkusbyqzyvzrovroj, sessão autorizada
Recepção/Brotas (login feito pelo usuário), profissional de teste da clínica. Somente leitura:
painéis fechados em Cancelar/Descartar, sem salvar, criar ou editar; nenhum dado gravado.
- Novo agendamento: faixa 02–08/10 com “20 livres” na terça 06/10 e “Sem expediente” nos
  demais dias; sem aviso de contagem indisponível. Na terça: faixa habitual 08:00–18:00,
  blocos de 30 min 08:00–17:30 (Manhã 8, Tarde 12), coerentes com a contagem.
- Leituras por intervalo (disponibilidade_padrao ativo; agenda_excecoes e agendamentos
  data gte/lte) e por data: todas HTTP 200. Duplicadas apenas pelo StrictMode do modo dev.
- Editar de agendamento existente na sexta: estado vazio sem expediente, campo manual com o
  horário atual, sem faixa de dias, Salvar desabilitado; fechado sem alterações.
- Console: nenhum erro durante os fluxos da Agenda. Na inicialização da sessão, 2 respostas
  400 de usuarios_clinicas: usePapelNaClinica consulta com usuario_id vazio antes de a sessão
  carregar e repete com o ID (200). Preexistente, arquivo não alterado; fora desta etapa.

### Implementação local (02/10/2026 10:20 -03:00)

Branch codex/resgate-local-2026-09-26, HEAD de partida 2530dbc.
Evolução exclusivamente de interface: política manual, RPCs, conflitos, folgas, regras após
chegada e permissões inalteradas. TypeSafe avaliada: não aplicável (UI determinística).

**Comportamento implementado**
- DisponibilidadeFormulario (criação e edição): o select de sugestões deu lugar a blocos
  clicáveis agrupados em Manhã (até 11:59), Tarde (12:00–17:59) e Noite (18:00+); grupos
  vazios não aparecem. Passo igual à duração, alinhado ao início de cada faixa da data.
  Ocupado (conflito com agendamento não cancelado): desabilitado, riscado, nome acessível
  “HH:MM ocupado”, nunca removido. Selecionado: cor primária da clínica e aria-pressed.
  O próprio agendamento não ocupa seu horário na edição.
- Função pura blocosHorarioAgenda em src/lib/agendaDisponibilidade.ts, reutilizando
  validarHorarioAgenda; demais funções da política não alteradas.
- “Outro horário”: ação secundária que revela o campo digitável (Início/Novo horário),
  avaliado por avaliarAgendaManual com os mesmos avisos e confirmação. Fica visível sozinho
  quando o horário vigente não é um bloco livre (ex.: vindo da grade ou fora do passo).
- Sem expediente: estado vazio “Sem expediente cadastrado nesta data” com “Outro horário”
  em evidência; não é erro. Folga/bloqueio, erro de consulta e carregamento mantêm
  mensagens e bloqueios anteriores (“Outro horário” continua disponível; a folga bloqueia).
- Faixa de 7 dias só no novo agendamento: dia da semana, dia do mês e “N livres”, “Sem
  expediente” ou “Folga”; clique troca a data. Hook useResumoDiasAgenda faz uma leitura por
  intervalo nas mesmas tabelas (clinica_id + profissional_id) e descarta contexto antigo.
  Falha mostra dias sem contagem e aviso discreto, sem bloquear o formulário. Decisão de UX:
  a janela começa na data escolhida e só se desloca quando a data sai dela (evita saltos a
  cada clique). Edição sem faixa nesta etapa. Resumo Início/Duração/Término preservado.
- Somente tokens (var(--cor-primaria), --cor-primaria-suave, --texto-*, --fundo-*, --borda);
  alvos ≥ 44 px; blocos/dias quebram em linhas no celular, sem rolagem horizontal.

**Arquivos:** novos src/components/agenda/FaixaDiasAgenda.tsx, src/hooks/useResumoDiasAgenda.ts,
src/lib/agendaDisponibilidade.test.ts, tests/operacional/agenda-horarios.spec.ts; alterados
src/components/agenda/{DisponibilidadeFormulario,EditarAgendamento}.tsx, src/pages/Agenda.tsx
(somente o painel de criação), src/lib/agendaDisponibilidade.ts (acréscimo),
src/hooks/useDisponibilidadeAgenda.ts (retorno aditivo das exceções), src/config/notasEvolucao.json,
harness tests/operacional/agenda-preview.tsx (intervalo de datas, ?terca, ?falha-faixa) e seletores
de testes antigos. Sem banco, migration, RLS, grants, RPC, Auth, Sidebar ou ModalBase.

**Testes executados (prévia sintética, sem banco real)**
- Unitários blocosHorarioAgenda: 7/7 (faixa única, duas faixas, conflito, duração que não cabe,
  sem expediente, cancelado/próprio não ocupam, períodos).
- agenda-horarios.spec.ts: 24/24 em desktop/tablet/celular (Brotas e Ipupiara, clique preenche
  início/término, ocupado não clicável, teclado/foco visível, Outro horário fora da faixa com aviso
  e confirmação, dia sem expediente, troca de dia pela faixa, falha da faixa, edição, modo escuro).
  Rodada final completa aprovada; na rodada anterior, 1 falha por compilação a frio do Vite na
  primeira carga (sem relação com o componente) levou a tolerância de 30 s só nessa carga.
- Regressão: agenda-edicao + recepcao-fluxo 76/76 (desktop/celular); agenda-experiencia +
  agenda-refinamento + agenda-fechamento 63/63 (desktop/tablet/celular).
- Ajustes de testes antigos (asserções preservadas): clicar “Outro horário” antes de digitar
  horário em agenda-edicao, agenda-experiencia, agenda-refinamento e recepcao-fluxo; selectOption
  do select removido virou clique no bloco 11:00; “select desabilitado” virou “nenhum bloco
  escolhível + estado vazio”. npm run build e npm run lint sem erros novos (avisos preexistentes).

**Prévias e capturas:** Brotas http://127.0.0.1:4192/tests/operacional/agenda-preview.html?terca ·
Ipupiara http://127.0.0.1:4192/tests/operacional/agenda-preview.html?unidade=ipupiara&terca
(sem ?terca, o harness mantém expediente 08–18 em todos os dias; também ?sem-expediente, ?folga,
?falha-faixa). Capturas em scratch/agenda-ux/etapa1: blocos-, selecionado-{brotas,ipupiara}-,
sem-expediente-, faixa-terca-, edicao-, escuro- × {desktop,tablet,mobile}.png.
Observação: clinicBrands configura a mesma primária (#006194) para as duas clínicas.

**Expediente semanal (leitura do código):** cadastrado em Equipe (menu) → aba Profissionais →
“Horários de atendimento” de cada profissional (src/pages/cadastros/Profissionais.tsx), visível a
proprietária e recepção; o salvamento apaga e reinsere as linhas de disponibilidade_padrao.

**Não validado:** persistência/RLS reais, sessão autenticada pública, leitura por intervalo no
Supabase real (filtros gte/lte só exercitados no harness), leitores de tela reais, zoom nativo e
teclado virtual. A leitura por intervalo no principal foi conferida depois (seção acima).

## Publicação autorizada — preparação em 02/10/2026 08:00 -03:00

Integrações consultadas pelo MCP Hostinger: ambas usam eduardocampusti/clinica-patricia,
branch codex/resgate-local-2026-09-26, auto-deploy habilitado, Vite/Node22/npm/build/dist.
Git remoto e HEAD coincidem em b921a1c801f58cd91f0951366fcece18d720e35d.
Versão anterior completed: Brotas 01a0f99b-8db4-7373-9687-de68ead3528e,
Ipupiara 01a0f99b-8e28-708e-a4e8-c5e6b6864b9a. Não alteradas configurações remotas.
Recuperação: novo commit revertendo somente esta entrega visual/redeploy do cliente
b921a1c compatível com as RPCs atuais; sem reset/force push ou reversão do banco.
Nunca voltar ao INSERT legado de versões anteriores à política manual.

Revisão dirigida confirma componentes reais, mesmas RPCs e ausência de entrada de teste
no build normal. Demonstração exige DEV/destino sintético e fica em tests, fora de public.
Notas da versão 0.1.0 em desenvolvimento ajustadas ao comportamento, sem alegar release.
Commit selecionará implementação/testes/documentação da Agenda; memória e documentação
alheias permanecerão locais. Resultados posteriores serão registrados abaixo, não inferidos
do push. Gravação legítima/persistência, Ipupiara autenticada e zoom nativo continuam pendentes.
Build final e lint aprovados, com avisos preexistentes. Reexecução final: 45/45 testes
isolados (fechamento/refinamento em desktop/tablet/celular). Regressões anteriores válidas
reaproveitadas; serviços/hooks/SQL não mudaram. Não houve teste de persistência real.

## Histórico local (anterior à publicação)

Atualização: 02/10/2026 06:34 -03:00, America/Bahia. Estado: implementação LOCAL concluída; não publicada.
Branch observada: codex/resgate-local-2026-09-26. HEAD: b921a1c801f58cd91f0951366fcece18d720e35d.
Alterações desta tarefa não commitadas; trabalhos documentais anteriores preservados.

## Fechamento da etapa — 02/10/2026 06:34 -03:00

### Verificação visual e ajustes mínimos

A direção visual anterior foi preservada. Na abertura, criação e edição começam no topo,
com foco no título e cabeçalho, corpo rolável e rodapé separados. O corte do primeiro
trecho nas capturas anteriores correspondia à posição de rolagem, não a sobreposição
na abertura. Contudo, foi reproduzido um defeito pontual: focar apenas o checkbox podia
deixar aproximadamente 7 px do seu texto de confirmação fora da área visível no desktop.
Margens de rolagem dos controles e margem inferior maior para checkbox corrigem esse
caso. Não houve necessidade de alterar ModalBase nesta etapa; modais padrão preservados.

Também reproduzido excesso de conteúdo nos cartões de 15 minutos: duração/situação
consumiam o espaço antes da identificação do paciente. Cartões de até 20 minutos agora
priorizam início/término e paciente, com nome longo abreviado apenas visualmente. A altura
continua exatamente proporcional: 15 min = 45 px; 20 min = 60 px. Sem altura mínima que
invente duração e sem rolagem interna nesses cartões. O botão inteiro abre consulta por
clique/toque/Enter, com nome completo, duração, situação e disponibilidade informativa.
O nome acessível inclui informações complementares; não depende de hover.

Arquivos ajustados nesta conclusão: src/index.css, src/pages/Agenda.tsx,
src/config/notasEvolucao.json, tests/operacional/agenda-preview.tsx e novo
tests/operacional/agenda-fechamento.spec.ts; este relatório, README e checkpoint operacional.
GradeTemporalAgenda, ModalBase, serviços, hooks de disponibilidade, SQL e regras não
foram alterados nesta etapa. Nenhuma funcionalidade nova ou redesenho adicional.

### Integração confirmada por inspeção do código

A prévia importa src/pages/Agenda.tsx, AppShell e ThemeProvider reais, os mesmos usados
por src/App.tsx. PainelAgenda, EditarAgendamento, SelecionarPaciente e a grade são os
componentes da aplicação, não uma implementação paralela. Apenas transporte/dados são
substituídos no harness. Sua configuração fixa o destino em operacional.synthetic.invalid;
a entrada exige DEV e esse destino; requisições externas são bloqueadas. Os marcadores
da demonstração não foram encontrados no artefato normal dist após o build.

| Caminho | Operação atual preservada | Confirmação |
| --- | --- | --- |
| Criação | ModalNovoAgendamento → agenda_manual_criar | Identidade, clínica, paciente, profissional, data e início do retorno conferidos antes de onSalvo |
| Edição | EditarAgendamento → agenda_manual_corrigir_horario | ID, data, início e situação conferidos; revisão/motivo/confirmação enviados |
| Chegada | Atualização autorizada de status com filtros de ID/clínica e select/maybeSingle | ID e situação retornados conferidos antes de “Chegada registrada” |
| Feedback | Estado da página Agenda → FeedbackAlert compartilhado | Fora do painel; sobrevive ao fechamento e à atualização da lista |

Criação/edição não voltam ao insert direto. Política manual, duração, conflitos,
folgas/bloqueios, regras após chegada, financeiro, autorização, auditoria e descarte de
respostas antigas permanecem nos caminhos existentes. Esta inspeção não é uma nova
homologação das funções ou permissões do banco.

### Testes isolados e suas limitações

- agenda-fechamento.spec.ts: **18/18** aprovados na versão final, desktop 1440×1000,
  tablet 820×1180 e celular 390×844. Abertura/rolagem/foco, primeiro/último campo,
  confirmação inteira, cabeçalho/título/rodapé, teclado, consultas de 15/20 min,
  mesmos IDs em lista/grade, detalhes completos por toque/Enter e foco devolvido.
  Capturas preenchidas e sucesso após fechamento incluem desktop 1440×1180.
- agenda-refinamento.spec.ts: **27/27** reexecutados e aprovados nesta etapa, no mesmo
  código funcional final. Incluem Brotas/Ipupiara sintéticas, interseções, prefill sem
  envio, descarte, dia vazio, chegada, falha de consulta, conflito, folga, envio único,
  andamento, sucesso externo e tema escuro. Total de 45 execuções distintas por variante;
  reexecuções não são contadas como novos cenários de negócio.
- Escala 125%/150% verificada por **emulação CSS de ampliação/layout**, com compensação
  da altura útil do painel para representar a redução de viewport. Não foi controlado
  o zoom nativo do IAB: o atalho não mudou as métricas. Zoom nativo e teclado virtual
  permanecem uma conferência complementar manual, não um resultado alegado destes testes.
- Uma captura intermediária falhou porque o teste rolou ao topo mantendo o checkbox
  já focado; focar de novo o mesmo elemento não provoca nova rolagem. A preparação passou
  a mover o foco a um campo visível antes de voltar à confirmação. Reexecuções dirigidas
  aprovaram; a rodada final completa de 18 também aprovou. O seletor pesquisável foi fechado
  antes da captura preenchida, para não confundir a lista de opções com campo encoberto.
- npm run build e npm run lint aprovados, notas coerentes e diff sem erro de whitespace.
  Avisos anteriores de bundle/importação dinâmica e Fast Refresh continuam sem novos erros.
  Regressões anteriores de edição, CPF/cadastro e modais financeiros não repetidas: caminhos
  correspondentes não alterados. Nenhum teste sintético comprova persistência Supabase.

### Conferência conectada somente de leitura

Na rota normal http://127.0.0.1:3000/sistema/brotas/agenda, a sessão já autorizada foi
identificada como **Recepção/Brotas**. A aba ainda continha a apresentação anterior; após
recarga carregou a versão local atual. Conferidos lista/grade com o mesmo registro
existente, abertura/fechamento da consulta, criação vazia e edição sem mudanças.
Painéis atuais, seleção pesquisável, comparação anterior/novo, confirmação e rodapé
presentes; corpo inicia com scrollTop 0. Criação/edição fechadas sem enviar.
Nenhum nome/ID de paciente ou horário real foi registrado nas evidências compartilhadas.

Código servido na porta 3000 contém os ajustes e as RPCs atuais; módulo Supabase servido
aponta para xftnkusbyqzyvzrovroj. **Essa prévia normal conecta ao principal: salvar altera
dados reais.** Não ocorreu qualquer gravação nesta conferência. Ipupiara autenticada não
foi conferida nesta etapa; sua identidade/grade foram inspecionadas na prévia isolada.
Gravação legítima, auditoria e persistência real após recarga continuam pendentes,
separadas dos sucessos em memória sintética e das evidências anteriores do relatório 12.

### Prévias e capturas finais

- Brotas: http://127.0.0.1:4192/tests/operacional/agenda-preview.html?complexa&curtas
- Ipupiara: http://127.0.0.1:4192/tests/operacional/agenda-preview.html?unidade=ipupiara&complexa&curtas
- Só consultas curtas: ?curtas (ou ?unidade=ipupiara&curtas).
- Capturas em scratch/agenda-ux/fechamento: lista-final-desktop.png;
  grade-curtas-{brotas,ipupiara}-desktop.png; criacao-final-desktop.png;
  edicao-final-desktop.png; sucesso-final-desktop.png; variantes tablet/mobile,
  abertura/confirmacao e zoom125/zoom150. Capturas antigas preservadas.

As capturas finais dos painéis mostram campos e confirmação sem sobreposição indevida.
No celular há vistas distintas do início e do final, pois todo o formulário exige rolagem;
não se afirma que campos fora da área rolável estejam simultaneamente visíveis.
Roteiro seguro: Lista/Grade → abrir registro ou horário → consultar/criar/editar;
conferir avisos, motivo, confirmação e rodapé. Salvar em 4192 é simulação em memória;
recarregar reinicia a demonstração. Os controles são os da aplicação, não um banco de testes.

**Conclusão:** implementação local pronta para revisão/publicação específica autorizada,
sem bloqueio funcional local identificado. Publicação não executada; produção continua na
versão anterior b921a1c. Persistência real, Ipupiara autenticada e zoom nativo complementar
não são aprovados por esta etapa. Próxima ação: revisão do usuário e autorização de uma
entrega de publicação, seguida de operação legítima para validar gravação/persistência.
Sem commit, push, deploy, migration ou alterações de dados reais. Trabalhos alheios,
Site Geovana, pendências e histórico preservados. F5 permanece encerrado pelo relato do
usuário; Claude Code/Antigravity não verificados. Impeccable orientou apenas a revisão
de foco/legibilidade; typesafe-ai avaliada pela descrição, sem aplicação/API/chave.

## Histórico — rodada 2, concluída localmente em 01/10/2026 22:42 -03:00

### Implementação e correções

- Grade temporal real, com eixo compartilhado de 00h a 24h, escala de 3 px/minuto,
  duração proporcional e interseções distribuídas em faixas laterais. Registros permanecem
  visíveis sem expediente; não há permissão nova de sobreposição. Abre próxima do primeiro
  compromisso; dia vazio inicia próximo das 08h apenas como posição de rolagem. Dia inteiro
  acessível por rolagem e atalhos. No celular, a grade permite rolagem horizontal interna.
- Selecionar um horário preenche profissional, data e início no painel. Não reserva nem
  grava. Lista e grade usam o mesmo conjunto de IDs. Lista desktop alinhada em colunas,
  ações compactas e nomes longos com quebra; celular reorganiza os mesmos dados.
- Chegada e edição disponíveis na lista e consulta quando elegíveis. Recepção não recebe
  atalhos para Em atendimento/Concluído ou Iniciar atendimento. Médico e financeiro
  conservam os fluxos anteriores. Nenhuma autorização de servidor alterada.
- Avisos/sugestões compartilhados em DisponibilidadeFormulario; faixas habituais em
  detalhe expansível, ausência/fora da faixa e erro de consulta distintos. Comparação
  anterior/novo compacta com início/duração/término. Motivo, confirmação, impedimentos
  junto ao botão, envio único e sucesso fora do painel preservados.
- Cancelar/X/Escape confirmam descarte quando há alteração não salva, com foco inicial
  seguro em Continuar preenchendo. Cancelar o descarte conserva o rascunho. ModalBase
  não intercepta Tab da confirmação compartilhada; modais padrão continuam funcionais.
- AppShell/menu/cabeçalho reais incorporados ao harness. Cores da clínica reutilizadas de
  clinicBrands/ThemeProvider, sem nova paleta. Demonstração continua DEV/sintética, com
  destinos externos bloqueados. Mocks nunca entram no aplicativo normal.

Revisão visual encontrou e corrigiu herança indevida das colunas da lista dentro dos
cartões temporais no desktop (texto cortado horizontalmente). Teste novo verifica uma
coluna interna e ausência desse corte. Outro defeito de acessibilidade corrigido: o label
do seletor incluía suas opções, impedindo identificação exata por nome; label e select
agora são separados e associados pelo ID. Nenhuma regra de disponibilidade mudou.

Arquivos desta rodada: src/components/agenda/{GradeTemporalAgenda,DisponibilidadeFormulario,
useDescarteAgenda}.tsx, EditarAgendamento.tsx, PainelAgenda.tsx, src/lib/agendaTemporal.ts,
src/pages/Agenda.tsx, ModalBase.tsx, src/index.css, src/config/notasEvolucao.json; harness
agenda-preview.tsx e testes relacionados. Componentes SelecionarPaciente/PainelAgenda e
demais melhorias da primeira rodada reaproveitados. README/regras deste módulo atualizados.
Alterações documentais de outras tarefas preservadas; sem nova dependência.

### Verificações realmente executadas nesta rodada

Todos os grupos abaixo tiveram seus cenários aprovados em rodadas dirigidas, com reexecução
dos casos afetados por correções. Números incluem variantes de tela, não cenários de negócio
distintos. Usam respostas interceptadas ou memória: não comprovam Auth, RLS ou persistência
Supabase. Papéis e unidades são sintéticos.

| Grupo | Execuções aprovadas | Evidência |
| --- | ---: | --- |
| agenda-refinamento.spec.ts | 27 | 9 testes em desktop/tablet/celular: Brotas/Ipupiara, eixo comum, proporcionalidade, interseções, mesmos IDs, shell, prefill sem envio, descarte/teclado, rodapé, dia vazio, erro/conflito/folga, envio único e sucesso externo |
| agenda-experiencia.spec.ts | 18 | 6 em desktop/tablet/celular, filtros, paciente pesquisável, lista/grade, criação/edição, temas, espera e responsividade |
| agenda-edicao.spec.ts | 64 | 32 em desktop/celular; 54 aprovaram inicialmente, 10 afetadas reexecutadas após ajuste do seletor/cópias: regras após chegada, bloqueios, RPC/retorno, falhas, revisão, manual, situação e fuso |
| recepcao-fluxo.spec.ts | 12 | 6 em desktop/celular: cadastro/agenda/chegada sintéticos, envio repetido, erro/zero retorno, descarte de resposta de outra clínica |
| operacional.spec.ts, seleção pertinente | 12 | 4 em desktop/tablet/celular: contexto, retorno do cadastro sem perda do rascunho, CPF opcional e lembrete de chegada |
| recebimento.spec.ts, seleção pertinente | 12 | 6 em desktop/celular: regressão de modais padrão, foco/retorno, pagamento existente e ações por papel/situação |

Rodada intermediária de 94 execuções teve 72 aprovadas e 22 falhas: 10 por seletores/cópias
de edição (incluindo o label corrigido), 12 por ambiguidade entre o novo botão de chegada
da lista e o da consulta. Seletores passaram a delimitar o diálogo, sem reduzir asserções;
22/22 reexecutadas e aprovadas. Teste antigo de CPF também esperava fechar um formulário
alterado sem responder à confirmação nova: timeout no tablet, rodada interrompida no
mesmo cenário móvel. Ajustado para confirmar descarte; 3/3 variantes do cenário aprovaram,
demais selecionadas aprovadas. Não foi falha de validação/gravação de CPF nem erro do banco.
Captura escura foi refeita após desativar animações só na captura, para não registrar
um quadro intermediário translúcido; 3/3 cenários correspondentes aprovados novamente.

Build final npm run build e lint npm run lint sem erros. Avisos anteriores: tamanho de
bundle/importação dinâmica e Fast Refresh em ThemeProvider. Notas de evolução verificadas
após atualização; git diff --check sem erro. Sem alteração de hooks/serviços/RPCs, SQL,
RLS/Auth, permissões ou dados reais. Nenhum teste foi uma gravação conectada nesta rodada.

Comandos adicionais reproduzíveis pelo servidor sintético do projeto:

```powershell
npm run test:operacional -- agenda-refinamento.spec.ts --project desktop --project tablet --project mobile
npm run test:operacional -- agenda-edicao.spec.ts recepcao-fluxo.spec.ts --project desktop --project mobile
```

Execuções finais reutilizaram Vite sintético 4192 e 4178 com configurações ignoradas em
scratch/agenda-ux, evitando iniciar outro servidor sobre o existente. A prévia segura 4192
permanece disponível; a aplicação normal 3000, conectada ao principal, foi preservada.
Nenhuma limpeza remota necessária: somente memória sintética/arquivos de teste.

### Interface, capturas e conferência

Inspeção no navegador controlado: Brotas, lista/grade temporal atualizada; Ipupiara,
lista e painel de edição com identidade, horários e impedimentos correspondentes.
Ensaios de desktop 1440×1000, tablet 820×1180 e celular 390×844 cobrem ambas as unidades,
menu/cabeçalho reais, teclado, modo claro/escuro e rodapés. Capturas finais dessas variantes
foram inspecionadas visualmente. São pessoas/profissionais fictícios, sem dados reais.

- Brotas: http://127.0.0.1:4192/tests/operacional/agenda-preview.html?complexa
- Ipupiara: http://127.0.0.1:4192/tests/operacional/agenda-preview.html?unidade=ipupiara&complexa
- Dia vazio: ?vazio; erro sintético: ?falha; folga sintética: ?folga.
- Capturas: scratch/agenda-ux/rodada2/{lista,grade,criacao,edicao}-desktop.png;
  variantes -tablet/-mobile e descarte-escuro-{desktop,tablet,mobile}.png.

Roteiro: alternar Lista/Grade; abrir registro → Editar ou clicar um horário na grade;
conferir profissional/data/início, escolher paciente, avisos, motivo e confirmação.
Cancelar um rascunho mostra confirmação de descarte. Salvar nessa prévia é simulação;
recarregar reinicia os dados, não demonstra persistência real. Sobreposições do cenário
complexo servem somente à visualização, não autorizam novas gravações com conflito.

### Limites e próxima ação

Entrega local concluída e não publicada. HEAD/branch b921a1c/codex/resgate-local-2026-09-26
inalterados, arquivos não commitados. Sem commit/push/deploy/migration remota, gravação
operacional ou conta nova. Principal, sites públicos, Pacientes, Equipe e Site Geovana
preservados. Auditoria real, persistência e autorização conectada desta experiência não
validadas; pendências legítimas anteriores de chegada/edição e Ipupiara autenticada
continuam separadas no relatório 12. F5 não reaberto; Claude/Antigravity não verificados.
Próxima ação: usuário revisar a experiência segura e autorizar eventual publicação/ensaio
conectado em etapa específica. Impeccable orientou densidade/hierarquia/tokens; computer-use
orientou a inspeção. Descrição typesafe-ai avaliada, sem necessidade de IA/API/chave.

Os resultados da rodada 1 abaixo são históricos, não uma nova validação conectada.

## Histórico — rodada 1: direção aprovada e implementação

- Lista cronológica inicial e grade compacta por profissional reutilizam o mesmo conjunto
  filtrado/ordenado e o mesmo componente de registro. Agendamentos sem expediente ou com
  profissional fora do cadastro ativo continuam acessíveis. Sem bloco duplicado/hachura.
- Topo com data civil, dias anterior/próximo, Hoje, busca, filtro, alternância de visão e
  Novo agendamento. Resumo usa “na data”, não “Hoje” para qualquer dia selecionado.
- Consulta, criação e edição usam PainelAgenda/ModalBase, mantendo foco, Escape e proteção
  durante envio. Desktop lateral; celular ocupa a tela. Corpo rola, rodapé não desaparece.
- SelecionarPaciente oferece pesquisa com opções e seleção explícita; setas/Enter/Escape,
  limpeza e estado vazio. Digitar nome não cria nem troca silenciosamente um paciente.
  Retorno do cadastro existente conserva profissional/data/início/observações.
- Resumo compartilhado de início/duração/término. Sugestões respeitam duração completa,
  conflitos e faixas consultadas; texto esclarece que não são reservas nem garantia.
- “Aguardando atendimento” consta nos agendamentos/situações. “Aguardando vaga” é lista
  de espera separada, com ação Agendar abrindo o fluxo de criação, sem conversão automática.
- Alert compartilhado preservado: verde sucesso, laranja orientação/conflito, vermelho
  falha, com texto/ícone. Sucesso nasce depois do retorno correspondente da RPC e permanece
  na página ao desmontar o formulário; resultado incerto não repete gravação automaticamente.

## Correção concreta encontrada

carregarGradeDoDia tratava erro em disponibilidade/exceções como erro dos agendamentos e
limpava toda a lista. Agora diferencia essas respostas: agendamentos lidos permanecem
visíveis, disponibilidade aparece como não confirmada e o Alert explica a limitação.
O formulário continua fazendo sua consulta válida obrigatória; erro não significa
“sem expediente” nem autorização manual. A verificação de capacidade na criação também
distingue carregando de recurso indisponível, sem aviso antecipado de falha.

## Serviços e limites preservados

Sem alteração de SQL, RLS, Auth, permissões, serviços externos ou dados operacionais.
Criação usa agenda_manual_criar; edição agenda_manual_corrigir_horario e capacidade
agenda_manual_disponivel. Nenhum fallback de INSERT/UPDATE direto para criar/corrigir.
Registro de chegada mantém sua operação anterior; financeiro/prontuário/CPF permanecem
nos serviços existentes. Política vigente no documento funcional e relatório 12:
aviso/confirmação sem expediente/fora da faixa habitual; folgas/bloqueios/conflitos
impedem; após chegada, somente horário na mesma data; revisão/motivo/auditoria e demais
restrições são responsabilidade das RPCs existentes.

Arquivos: src/pages/Agenda.tsx, src/components/agenda/{PainelAgenda,SelecionarPaciente,
EditarAgendamento}.tsx, src/components/ModalBase.tsx, src/index.css. A opção painel é
aditiva em ModalBase; apresentação modal padrão mantida. Notas não lançadas atualizadas
em src/config/notasEvolucao.json. Sem dependência nova.

## Verificação desta tarefa

Resultado final: 118 execuções dirigidas aprovadas (incluem variantes de tela, não 118
cenários de negócio distintos). Os ensaios usam operacional.synthetic.invalid ou
financeiro.synthetic.invalid, respostas interceptadas/serviços em memória exclusivamente
no harness. Não são autenticação Supabase, auditoria real nova ou persistência de banco.

| Grupo | Execuções aprovadas | Escopo |
| --- | ---: | --- |
| agenda-edicao.spec.ts | 64 | 32 testes em desktop/celular; RPC, falha, conflito, manual, repetição, revisão, chegada, data/fuso, clínica e papéis sintéticos |
| recepcao-fluxo.spec.ts | 12 | 6 em desktop/celular; cadastro sem CPF, chegada simulada, erros e descarte de resposta de outra clínica |
| agenda-experiencia.spec.ts | 18 | 6 em desktop/tablet/celular; lista/grade equivalentes em Brotas/Ipupiara, filtros, paciente/teclado, criação/edição, erro de leitura, rodapé/tela inteira, tema e espera |
| operacional.spec.ts (seleção dirigida) | 12 | 4 em desktop/tablet/celular; troca de clínica, retorno após novo paciente preservando rascunho, CPF não bloqueante e lembrete de chegada |
| recebimento.spec.ts (seleção dirigida) | 12 | 6 em desktop/celular; acesso ao fluxo existente, foco/retorno, papéis, recebimento existente e situação concluída |

As primeiras rodadas localizaram seletores antigos/ambíguos (select de paciente,
status em menu, profissional também no filtro). Adaptados e cenários afetados reexecutados;
nenhuma regra alterada para passar testes. Houve timeout inicial de compilação/navegação
no harness financeiro; a seleção final sobre o servidor sintético aquecido aprovou 12/12.
O wrapper antigo ficou aberto após os testes e foi encerrado; não é defeito de produção.
Nenhum teste de escrita no principal. Persistência após recarga dos ensaios interceptados
usa estado do interceptador, não prova banco. A prévia visual reinicia seus dados ao recarregar.

Build final npm run build e lint npm run lint aprovados; somente avisos anteriores de
bundle/importação e ThemeProvider. Exportar o componente do harness removeu seu aviso de
Fast Refresh. git diff --check sem erro; HEAD/branch inalterados. Nenhuma mudança em
supabase, src/lib, src/hooks ou App.tsx nesta tarefa.

Comandos reproduzíveis (scripts usam servidor sintético):

```powershell
npm run test:operacional -- agenda-edicao.spec.ts recepcao-fluxo.spec.ts --project desktop --project mobile
npm run test:operacional -- agenda-experiencia.spec.ts --project desktop --project tablet --project mobile
npm run test:operacional -- operacional.spec.ts --grep 'Agenda descarta|novo paciente retorna|Agenda lembra CPF|registro de chegada exibe' --project desktop --project tablet --project mobile
npm run test:financeiro:10b -- --timeout 90000 --project desktop --project mobile --grep 'Agenda → PIX|foco contido|médico|recebimento existente|consulta concluída|proprietária pode'
```

Rodadas finais dirigidas reutilizaram os servidores sintéticos em 4192/4178 por configurações
temporárias em scratch/agenda-ux, fora do Git: 24/24 e 12/12 aprovados, respectivamente.

Prévia inspecionada no navegador controlado: lista/grade, pesquisa/seleção, sugestão,
aviso/confirmação manual e sucesso fora do painel em cenário sintético Brotas. Capturas
dos ensaios desktop/tablet/celular estão em scratch/agenda-ux (ignorado pelo Git), contendo
somente pessoas e profissionais fictícios. Essa inspeção não comprova sessão real.
Capturas finais: lista-desktop.png, grade-desktop.png, criacao-desktop.png,
edicao-desktop.png; variantes -tablet/-mobile e edicao-escuro também conferidas.

## Prévia e conferência

Prévia segura, DEV e sem banco real, executando os componentes atuais:

- Brotas: http://127.0.0.1:4192/tests/operacional/agenda-preview.html
- Ipupiara: http://127.0.0.1:4192/tests/operacional/agenda-preview.html?unidade=ipupiara
- Falha sintética de leitura: acrescente ?falha (ou &falha).

Inicialização: node node_modules/vite/bin/vite.js --config tests/operacional/vite.config.ts
--host 127.0.0.1 --port 4192 --strictPort. Guardas exigem DEV/configuração sintética,
destinos externos são bloqueados e o harness não entra no build normal. Recarregar essa
prévia descarta mudanças em memória: não é persistência fictícia na aplicação normal.

Aplicação normal preservada na porta 3000: /acesso/brotas e /acesso/ipupiara; menu Agenda,
rotas /sistema/brotas/agenda e /sistema/ipupiara/agenda. Conecta ao principal autorizado:
salvar nela altera dados reais. Nesta tarefa, nenhuma gravação operacional autorizada.
Use a prévia 4192 para experimentar, não dados fictícios no principal.
Servidor normal iniciado pelo procedimento npm run dev -- --host 127.0.0.1 --port 3000
--strictPort, sem substituir um processo ativo. /acesso/brotas respondeu 200. O primeiro
probe HTTP de Ipupiara excedeu 10 segundos; no navegador, a aplicação abriu e recusou a
sessão existente por ausência de vínculo ativo com essa clínica. Não é homologação do
perfil de Recepção/Ipupiara. Nenhuma autenticação/permissão foi alterada para desbloquear.

Roteiro seguro: alternar Lista/Grade, filtrar profissional/paciente, abrir um registro
sintético para consultar/editar; Novo agendamento → pesquisar/selecionar paciente →
profissional/início → conferir término/avisos → confirmação manual se necessária.
Os resultados de salvar na 4192 são simulados e se perdem após recarga.

## Pendências e recuperação

Sem commit/push/deploy/migration remota nesta tarefa. Publicação anterior b921a1c permanece
intacta. Validação de gravação real/persistência e sessão autenticada de Ipupiara continuam
distintas e pendentes, conforme relatório 12. F5 permanece encerrado pelo relato manual
do usuário, sem reabrir investigação. Nenhuma conta/registro criado no principal para
limpar; fixtures limitadas à memória/processos de teste. Claude Code/Antigravity não
foram usados nem validados. Próxima ação: usuário revisar esta experiência local e definir
eventual publicação/validação conectada em etapa própria.

Skill impeccable orientou hierarquia, densidade, componentes/tokens existentes e rodapé
responsivo. Descrição typesafe-ai avaliada: sem aplicação necessária em fluxo determinístico;
nenhuma API/chave de IA usada. Skill de computer-use utilizada para inspeção do navegador.
