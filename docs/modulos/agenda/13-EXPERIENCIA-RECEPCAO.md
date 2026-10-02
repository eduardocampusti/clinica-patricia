# Agenda — experiência da recepção

## Painel de remarcação conforme o mockup (02/10/2026)

Implementado localmente às 18:31; publicação autorizada em andamento (abaixo).

### Publicação autorizada — conferência por leitura no principal, 02/10/2026 ~19:35–19:50 -03:00

Estado na preparação do commit: **publicação autorizada em andamento**; resultado do deploy registrado
depois, fora do commit. Aplicação local 127.0.0.1:3000 (principal xftnkusbyqzyvzrovroj), sessão
Recepção/Brotas já aberta, sem gravação. Agendamento existente (sexta 02/10, 09:00, agendado) em Editar:
título “Remarcar agendamento”, horário atual 09:00–09:30 · Sex 02/10/2026 · profissional · 30 min, “Escolha
um novo horário”. Sugestões coerentes com o único expediente cadastrado (terça 08:00–18:00) e com o horário
(após 18h, nada “ainda hoje”): Ter 06/10 08:00, 08:30, 09:00 (Mesmo horário), 09:30; Ter 13/10 08:00, 09:00
(Mesmo horário). Faixa com terça “20 livres” e demais “Sem expediente”; blocos da sexta em estado vazio; 4
opções de motivo. Sugestão 06/10 09:00 + “Pedido do paciente” só no formulário: novo horário 09:00–09:30 ·
Ter 06/10/2026, rodapé “Falta: confirmação”; confirmação NÃO marcada, botão desabilitado; Cancelar →
Descartar. Rede: 23 chamadas HTTP 200, leitura de sugestões por intervalo 02/10–15/10 incluída, nenhuma
gravação; console só com os 2 erros 400 preexistentes de usePapelNaClinica. Nova rodada de
agenda-remarcacao: 24/24 em 79 s, sem travamento (terceira rodada completa seguida aprovada).
Pendência registrada, não corrigida nesta tarefa: contagem “N livres” da faixa considera o próprio horário.

Estado: **implementado e testado localmente; sem commit, push, deploy ou banco.** Branch
codex/resgate-local-2026-09-26, HEAD 1d16cf9; alterações não commitadas. Somente apresentação do
painel de edição; gravação exclusivamente por agenda_manual_corrigir_horario, envio único. WhatsApp e
“Mesma especialidade” não implementados (por instrução).

**Implementado (situações agendado, confirmado, aguardando):** título “Remarcar agendamento”, subtítulo
paciente · duração; bloco de → para (“Horário atual” riscado, data, profissional; “Novo horário” com borda
primária ou “Escolha um novo horário”; seta empilhada no celular); “Próximos horários livres” — até 6, mesmo
profissional, hoje + 13 dias, função pura sugestoesRemarcacao (src/lib/agendaSugestoes.ts, sobre janelasAgenda e
blocosHorarioAgenda, ignora o próprio agendamento, o horário atual e horários já passados de hoje) com leitura
por intervalo (useSugestoesRemarcacao, mesmas três tabelas, contexto antigo descartado). Prioridade: até 2
“Ainda hoje”, até 2 “Mesmo horário” em outro dia, o primeiro livre de cada dia seguinte e os demais; exibição
cronológica; etiquetas Ainda hoje/Mesmo horário/Manhã/Tarde/Noite. Após a chegada: só a mesma data, sem faixa.
Vazio: “Nenhum horário livre encontrado nos próximos 14 dias” + “Escolher data e horário manualmente”. Falha:
aviso discreto, painel segue. “Escolher outra data”: FaixaDiasAgenda + “Nova data” + DisponibilidadeFormulario
(blocos, Outro horário, avisos e confirmação manual). Motivo: Pedido do paciente / do profissional / Imprevisto
da clínica preenchem o mesmo p_motivo; “Outro” abre o texto livre (5–500, mesma validação). Confirmação
obrigatória, revisão anterior/novo, descarte, mensagens e regras inalteradas. Rodapé: “Falta: …” ou “O horário
das HH:MM de … volta a ficar livre…”, Cancelar e “Confirmar remarcação”; lista completa para leitor de tela.
Outras situações: painel anterior (“Editar agendamento”) preservado.

**Arquivos:** novos src/lib/agendaSugestoes.ts (+ .test.ts), src/hooks/useSugestoesRemarcacao.ts,
tests/operacional/agenda-remarcacao.spec.ts; alterados src/components/agenda/EditarAgendamento.tsx,
src/config/notasEvolucao.json, prévia agenda-preview.tsx (?remarcacao; último envio em data-ultimo-envio;
comparação de conflito em HH:MM — corrigido falso conflito por segundos, defeito antigo só da prévia) e
seletores de testes. Componentes compartilhados, criação, página principal, AppShell e Sidebar não alterados.

**Testes (prévia sintética, relógio fixo hoje 10:20 nos novos):** unitários 14/14 (7 novos de sugestões);
agenda-remarcacao 24/24 (8 × 3 telas); regressão agenda-pagina + novo-painel + horarios + experiencia 86/86
(+4 puladas por tela), refinamento + fechamento 45/45, agenda-edicao + recepcao-fluxo 76/76,
operacional.spec (Agenda) 12/12; build/lint sem erros novos. Rodada intermediária: 3 falhas por leitura de
texto do teste (textContent) e pelo falso conflito da prévia; 1 execução travou (tablet, “situação não
editável”) — passou isolada e em duas rodadas completas seguintes, causa não identificada. Ajustes de testes
antigos (asserções preservadas): diálogo “Editar agendamento” → “Remarcar agendamento”; botão “Salvar
alterações” → “Confirmar remarcação”; motivo digitado após clicar “Outro”; edição agora com faixa de dias
(asserção de ausência virou presença, conforme o pedido); abertura verifica o bloco “Horário anterior”
visível em vez de “Nova data”.

**Capturas:** scratch/agenda-ux/remarcacao/{abertura,sugestao-escolhida,motivo,revisao,sem-horarios,escuro}-
{desktop,tablet,mobile}.png. Prévia: http://127.0.0.1:4192/tests/operacional/agenda-preview.html?remarcacao
(Lista → Editar em 11:00 Clara; &sem-expediente; &falha-faixa).

**Diferenças em relação ao mockup:** sem WhatsApp, “Mesma especialidade” e histórico (fora do escopo / sem
leitura permitida); sem “Consulta” no subtítulo e especialidade nos cartões (dados não disponíveis no painel);
“Escolher outra data” sempre aberto com faixa e blocos (pedido) em vez de link; checkbox de confirmação mantido;
rodapé explica pendências; faixa de dias conta o próprio horário como ocupado (hook compartilhado com a criação
não alterado; os blocos o mostram livre); prévia tem expediente aos fins de semana, por isso as sugestões
mostram sábado/domingo; largura do painel é a dos demais painéis da Agenda.

**Histórico do agendamento (investigação por leitura, nada implementado):** criação manual
(trigger agenda_auditar_criacao_manual) e correção de data/horário (trigger agenda_auditar_correcao_horario)
já gravam em public.auditoria (append-only): clinica_id, usuario_id, acao, entidade='agendamentos',
entidade_id, dados_antes/dados_depois com data, hora_inicio, hora_fim e motivo, created_at. Mudanças de
situação (confirmar, chegada, cancelar — UPDATE direto) não são auditadas ali. Leitura: RLS de
public.auditoria só tem a política auditoria_leitura (SELECT para eh_proprietaria(clinica_id)); a Recepção
não lê, e o cliente não consulta essa tabela. Necessário para exibir “Histórico deste agendamento” à
Recepção: RPC SECURITY DEFINER somente leitura (ex.: agenda_historico(p_clinica_id, p_agendamento_id)) com
checagem de vínculo ativo Recepção/Proprietária na clínica, retornando apenas data/hora da ação, tipo,
data/horário antes/depois, motivo e nome de exibição do autor (não usuario_id cru); decidir se mudanças de
situação passam a ser auditadas (novo trigger) e a política de exposição do motivo (texto livre, LGPD).
O mockup também mostra “Confirmação enviada ao paciente”, que não existe no sistema (sem envio de mensagens).

Não validado: banco/sessão real, leitor de tela real, zoom nativo. Próxima ação: revisão do usuário.

## Redesenho visual da Agenda — publicação autorizada (02/10/2026)

Estado em 02/10/2026 15:51 -03:00: **publicação autorizada em andamento** das três entregas abaixo
(painel “Novo agendamento”, página principal e acabamento). Resultado do push/deploy registrado depois,
fora deste commit, como nas publicações anteriores.

### Conferência por leitura no principal — 02/10/2026 ~15:45–15:50 -03:00

Aplicação local 127.0.0.1:3000 (principal xftnkusbyqzyvzrovroj), sessão autorizada Recepção/Brotas já
aberta, profissional de teste da clínica. Somente leitura; nada salvo, criado, editado, chegada ou expediente.
- Sexta 02/10 (sem expediente cadastrado): indicadores 2 agendamentos / 1 profissional, 2 a confirmar,
  0 aguardando, horários livres “—” + “sem expediente cadastrado”, lista de espera 1. Dia e Lista com os
  mesmos 2 registros; cartões “Agendado” com horário; coluna “Cardiologia Teste · sem expediente” com bloco
  neutro e nenhum livre; janela 09:00–11:00 ajustada aos agendamentos; legenda Agendado 2, demais 0.
- Terça 06/10 pelo mini calendário (dia marcado): 0 agendamentos, horários livres 20 / 1 profissional com
  expediente, coluna “· 20 livres”, cartões “+ 08:00 livre” … “+ 17:30 livre”, janela 08:00–18:00.
- Lista de espera: profissional · desde DD/MM, Encaixar e “+ Adicionar à lista de espera”.
- Novo agendamento pelo livre 10:00: subtítulo da clínica, seções 1–4, profissional marcado “· 30 min”, faixa
  com terça “20 livres” e demais “Sem expediente”, bloco 10:00 selecionado, rodapé “Ter, 06/10 · 10:00–10:30 ·
  profissional | 30 min · Falta: paciente”; paciente escolhido no formulário mostrou o cartão (iniciais,
  “Paciente da Clínica Brotas”, Trocar) e o rodapé completo. Fechado em Cancelar → Descartar, sem enviar.
- Novo agendamento pelo botão: “Falta: paciente, profissional e horário”; fechado. Editar de agendamento
  existente: Salvar desabilitado; fechado sem alteração.
- Rede: 32 chamadas durante as conferências, todas HTTP 200, nenhuma de gravação (RPCs só de consulta:
  agenda_manual_disponivel e paciente_cpf_pendente). Console: apenas os 2 erros 400 preexistentes na carga
  da sessão (usuarios_clinicas com usuario_id vazio, usePapelNaClinica), sem relação com a Agenda.

## Acabamento visual da página principal (LOCAL, 02/10/2026 15:43 -03:00)

Estado: **implementado e testado localmente; sem commit, push, deploy ou banco.** HEAD 9fe8df8;
soma-se às alterações locais da página principal e do painel “Novo agendamento” (seções abaixo).
Somente apresentação; nenhuma alteração em banco, RPC, permissões, hooks, política, outros módulos,
AppShell ou Sidebar.

**Ajustes:** escala da grade Dia 3 → 1,6 px/min (constante ESCALA_AGENDA em src/lib/agendaTemporal.ts):
30 min = 48 px, livre clicável = 44 px; duração/posição proporcionais. Acima da grade compactados:
indicadores, espaçamentos, barra (seletor Dia|Lista sem folga, botões de 44 px mantidos), cabeçalho das
colunas e rótulo do eixo. Resultado na prévia sintética (com a faixa de aviso da prévia, ausente no app real):
em 1440×900 o rótulo 12:00 termina em 896 px. Cartões: nome e horário em uma linha cada com reticências;
título (title) com nome, situação, disponibilidade e recebimento; nome acessível inalterado + disponibilidade;
em cartão estreito (container query ≤ 170 px) some o texto da situação e fica o ponto; consultas curtas
em linha única. Cabeçalho: nome em uma linha com reticências, “especialidade · N livres” na segunda,
“Expediente” virou botão de ícone (IconeCalendario existente) com nome acessível e 44 px. Celular:
indicadores em faixa de 5 itens (número + rótulo curto Total/A confirmar/Aguardando/Livres/Espera; rótulo
completo e apoio para leitor de tela), botão “+ Novo” visível com nome acessível “+ Novo agendamento”,
data curta da barra só para leitor de tela; primeiro agendamento em 473–667 px de 844. “Horários
relevantes · HH:MM–HH:MM / Ver dia inteiro” (e Início do dia / Primeiro agendamento no dia inteiro) na barra.

**Arquivos:** src/lib/agendaTemporal.ts (ESCALA_AGENDA, janelaVisivelAgenda), src/components/agenda/
GradeTemporalAgenda.tsx (dia inteiro controlado pela página), src/pages/Agenda.tsx, src/index.css,
src/config/notasEvolucao.json; testes agenda-pagina (3 verificações novas), agenda-refinamento e agenda-fechamento.

**Testes (prévia sintética):** agenda-pagina 23/23 (+4 execuções puladas de propósito: verificações de
1440×900 só no desktop e de 390×844 só no celular); novo-painel + horarios + experiencia + fechamento 81/81
e refinamento 27/27 (3 telas); agenda-edicao + recepcao-fluxo 76/76; operacional.spec (Agenda) 12/12;
build e lint sem erros novos (aviso de Fast Refresh evitado movendo janelaVisivelAgenda para src/lib).
Ajustes de testes: escala fixa 3 → ESCALA_AGENDA (posição, alturas de 15/20 min, dia inteiro); rolagem
do dia inteiro passou de “> 1400” para o valor exato (09:00 − 30 min) × escala; texto da janela na barra;
cartões curtos verificados como linha única (flex, sem quebra) em vez de “uma coluna de grade”.
Falha intermediária: essa última asserção (6 execuções) antes do ajuste.

**Limites:** consultas de 15/20 min ficam com 24/32 px (abaixo de 44 px) pela proporcionalidade — o
cartão inteiro continua clicável e a lista oferece alvo completo; no celular em modo Dia (não é o padrão)
cartões sobrepostos ficam estreitos e muito abreviados, e uma consulta curta estreita mostra só o horário.
Capturas: scratch/agenda-ux/pagina-acabamento/{desktop,tablet,celular}-{padrao,complexa}.png,
desktop-complexa-escuro.png, primeira-tela-1440x900.png, primeira-tela-390x844.png, sobreposicao-*.png.
Não validado: banco/sessão real, leitor de tela real, zoom nativo. Próxima ação: revisão e autorização de publicação.

## Página principal conforme o mockup aprovado (LOCAL, 02/10/2026 12:21 -03:00)

Estado: **implementado e testado localmente; sem commit, push, deploy ou banco.** Branch
codex/resgate-local-2026-09-26, HEAD 9fe8df8; soma-se às alterações locais do painel “Novo
agendamento” (seção abaixo), também não commitadas. O pedido do usuário chegou truncado após
“sem rolagem horizontal da página (a grade pode”; testes/entrega seguiram o padrão das etapas anteriores.
Somente apresentação e dados já carregados; nenhuma consulta nova, RPC, política, RLS ou banco.
Não implementados (por instrução): visão Semana, Remarcar no topo, busca global, “Turno da manhã”;
AppShell e Sidebar intactos.

**Implementado:** título com data por extenso; 5 indicadores (agendamentos do dia, a confirmar =
agendado, aguardando atendimento, horários livres = blocos livres por blocosHorarioAgenda/janelasAgenda
dos profissionais com expediente — “—” com “sem expediente cadastrado” ou “disponibilidade não
confirmada” —, lista de espera); duas colunas no computador (grade/lista + coluna de 21rem). Barra:
dia anterior, Hoje, próximo, data curta, Dia | Lista, filtro e busca. Grade: cabeçalho com iniciais,
nome e “especialidade · N livres”; cartão por situação (fundo, ponto + texto, “início–término · N min”
monoespaçado); “+ HH:MM livre” tracejado só dentro do expediente (pré-seleção existente); blocos
neutros “Sem expediente”, “Fora do expediente”, “Folga”, “Disponibilidade não confirmada”; escala
3 px/min mantida; janela padrão do primeiro ao último horário relevante (sempre inclui todos os
agendamentos) com “Ver dia inteiro” (Início do dia / Primeiro agendamento). Coluna direita: mini
calendário (navegação de mês, dia escolhido na cor primária, recolhível no celular/tablet), lista de
espera com “profissional · desde DD/MM”, Encaixar (mesma ação de Agendar) e “+ Adicionar à lista de
espera”, e “Situação dos atendimentos” com ponto, nome e contagem. Computador abre em Dia; tablet e
celular em Lista, com a coluna direita empilhada. Ações, consulta, filtros, busca, feedback, descarte de
contexto antigo e distinção erro × ausência de expediente preservados.

**Tokens:** criados --status-agendado-* e --status-faltou-* (claro/escuro) e --status-*-ponto para as
7 situações. Medição com fundo composto sobre o cartão mostrou textos do escuro existentes entre
3,5 e 4,2:1; ajustados (texto e etiqueta do escuro, etiquetas de confirmado/aguardando/em atendimento
no claro) — todos ≥ 4,5:1 nos dois modos. Esses tokens só são usados pela Agenda. Ponto no escuro
usa a cor do texto. “Faltou” não existe nos dados: tokens criados, legenda mostra só as 6 situações reais.

**Arquivos:** novos src/components/agenda/MiniCalendarioAgenda.tsx e tests/operacional/agenda-pagina.spec.ts;
alterados src/pages/Agenda.tsx (página principal), src/components/agenda/GradeTemporalAgenda.tsx (reescrito:
colunas com livres/neutros e janela), src/index.css (tokens de situação e estilos da grade),
src/config/notasEvolucao.json e seletores de testes.

**Testes (prévia sintética):** agenda-pagina 18/18 (6 × 3 telas: estrutura e modo inicial, indicador
sem expediente × falha, grade, coluna direita, Lista no computador, escuro + Ipupiara com contraste ≥ 4,5).
Rodada final com o código definitivo: pagina + novo-painel + horarios + experiencia + refinamento +
fechamento 126/126 (3 telas); agenda-edicao + recepcao-fluxo 76/76 (desktop/celular); operacional.spec
(Agenda) 12/12 (3 telas). Build e lint sem erros novos. Falhas intermediárias corrigidas: alvos de toque
abaixo de 44 px (setas do dia 38,6 px; dias do calendário 43,7 px) — produto ajustado; seletor
/Novo agendamento/ ambíguo com os cartões livres; textos que mudaram de lugar; 1 timeout de compilação
a frio no primeiro teste (não repetiu). Ajustes de testes (asserções preservadas): cenários de lista
clicam “Lista” no computador; “Grade por profissional” → “Dia”; “Aguardando vaga”/“Agendar” →
“Lista de espera”/“Encaixar”; criação fora do expediente via “+ Novo agendamento” → “Outro horário”
(antes pelo clique na grade, hoje bloco neutro); rolagem/“23:30” verificados em “Ver dia inteiro”;
nome da clínica (agora só no AppShell) → contexto da clínica B carregado.

**Prévia e capturas:** http://127.0.0.1:4192/tests/operacional/agenda-preview.html (?complexa,
?unidade=ipupiara, ?sem-expediente, ?falha). Capturas em scratch/agenda-ux/pagina: inicial, dia,
lateral, lista, escuro-ipupiara × {desktop,tablet,mobile}.

**Diferenças restantes em relação ao mockup:** linha “· serviço” virou “· N min” (sem dado de serviço);
“Faltou” e “Finalizado” → situações reais (Concluído); “Almoço” → “Fora do expediente”; marcação fora
do expediente não parte da grade; filtro/busca em segunda linha da barra; apoio dos indicadores
adaptado aos dados; ação “Expediente” no cabeçalho preservada; links na cor primária com contraste
baixo no escuro (regra do DS). Não validado: banco/sessão real, leitor de tela real, zoom nativo.
Próxima ação: revisão do usuário; commit/publicação somente com autorização específica.

## Fidelidade visual do painel “Novo agendamento” (LOCAL, 02/10/2026 11:32 -03:00)

Estado: **implementado e testado localmente; sem commit, push, deploy ou banco.** Branch
codex/resgate-local-2026-09-26, HEAD 9fe8df8; alterações não commitadas. Somente apresentação
do painel de criação, guiada pelo mockup aprovado (imagem do painel enviada pelo usuário);
tokens do projeto, sem cores/medidas da imagem. Tipo de atendimento e WhatsApp não implementados.

**Implementado:** subtítulo com a clínica ativa (prop opcional em ModalBase/PainelAgenda; fechar
já tinha 44 px); seções numeradas 1. Paciente, 2. Profissional, 3. Data e horário, 4. Observações;
cartão do paciente (iniciais, nome, “Paciente da <clínica>”, ação Trocar que volta à pesquisa,
foco acompanha a troca) usando só id/nome já carregados; profissionais em cartões (rádios nativos,
setas/Espaço) até 6, select acima disso, duração junto ao escolhido; faixa de dias com número em
JetBrains Mono e dia escolhido preenchido na cor primária, “Outra data” compacta e estado vazio
dentro da seção; bloco Início/Duração/Término removido do meio; rodapé com resumo
“Ter, 06/10 · 10:00–10:30 · Profissional” e duração, ou “Falta: …”; lista “Para agendar:” só
para leitor de tela (status + aria-describedby do botão). Observações: o título é o rótulo do campo.
Interpretação: com profissional, data e início definidos, o resumo aparece e pendências restantes
seguem na 2ª linha (“30 min · Falta: confirmação manual”), para o término ficar visível antes de confirmar.

**Arquivos:** novos src/components/agenda/EscolhaProfissional.tsx e
tests/operacional/agenda-novo-painel.spec.ts; alterados src/pages/Agenda.tsx (só ModalNovoAgendamento),
src/components/agenda/{SelecionarPaciente,FaixaDiasAgenda,PainelAgenda}.tsx, src/components/ModalBase.tsx
(prop aditiva), src/index.css (.agenda-fonte-tecnica), src/config/notasEvolucao.json, harness
agenda-preview.tsx (?muitos-profissionais) e seletores de testes. Edição, lista, grade, sidebar,
DisponibilidadeFormulario, hooks, RPCs, política e banco não alterados.

**Testes (prévia sintética, sem banco real):** agenda-novo-painel 21/21 (7 × desktop/tablet/celular);
agenda-novo-painel + horarios + experiencia + refinamento + fechamento 108/108 (3 telas);
agenda-edicao + recepcao-fluxo 76/76 (desktop/celular); operacional.spec seleção Agenda 12/12 (3 telas);
refinamento + edicao reconfirmados 41/41 (desktop) após remover helper não usado. Rodada intermediária:
14 falhas por getByLabel('Observações') ambíguo (região e campo com o mesmo nome) — corrigido no
produto. Build e lint sem erros novos. Ajustes de seletores (asserções preservadas): select de
profissional → rádio por valor; valor do combobox de paciente → cartão “Paciente selecionado”;
“Data” → “Outra data”; “Limpar seleção” → “Trocar”; texto “Paciente selecionado:” → ausência do cartão.

**Lacuna encontrada na Etapa 1 publicada (9fe8df8):** operacional.spec não estava na regressão daquela
etapa; em worktree temporária no 9fe8df8, 2 de 4 testes de Agenda falharam (timeout em “Início”, atrás
de “Outro horário”). Falha de teste, não da interface; corrigida nos testes locais desta tarefa.

**Prévia e capturas:** http://127.0.0.1:4192/tests/operacional/agenda-preview.html?terca (Ipupiara:
&unidade=ipupiara; ?sem-expediente; ?muitos-profissionais). Capturas em scratch/agenda-ux/fidelidade:
painel-vazio, paciente-escolhido, profissional-blocos, horario-resumo, sem-expediente, escuro,
escuro-topo, ipupiara-resumo × {desktop,tablet,mobile}.

**Diferenças restantes em relação ao mockup:** ver lista entregue ao usuário nesta data (tipo de
atendimento/WhatsApp excluídos; seção 2 “Profissional”; 7 dias; blocos/“Outro horário” do componente
compartilhado com a edição; botão fechar sem borda; título no tamanho do DS; linha secundária do
paciente sem idade/telefone/última consulta/lista de espera; “Data escolhida” extra; resumo sem rótulo
“Resumo”). Não validado: sessão real, leitor de tela real, zoom nativo; contraste da cor primária
como texto no modo escuro (regra do DS de cor igual nos dois modos) merece revisão.
Próxima ação: revisão do usuário; publicação somente com autorização específica.

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
