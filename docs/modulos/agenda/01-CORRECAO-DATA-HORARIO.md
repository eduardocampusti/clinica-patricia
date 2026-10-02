# Correção de data e horário — comportamento aprovado e limites

Estado: núcleo e política manual comum APROVADOS pelo usuário em 01/10/2026.
Política manual aplicada/publicada no commit b921a1c, conforme relatório 12; gravação
legítima e persistência ainda pendentes. Evolução visual posterior implementada somente
localmente, conforme relatório 13; não confundir essa prévia com a versão publicada.

## Experiência da recepção — direção aprovada em 01/10/2026

Lista cronológica como visão inicial, alternativa compacta por profissional e mesmos
agendamentos em ambas, inclusive sem expediente. Data, Hoje, navegação, pesquisa e filtro
acima dos registros. Situações em texto e cor; aguardando atendimento é diferente de
aguardando vaga. Não duplicar agendamentos em um bloco auxiliar.

Consulta/criação/edição em painéis laterais com rodapé visível, tela inteira no celular,
foco contido e fechamento por teclado. Seleção de paciente pesquisável e explícita;
cadastrar novo paciente e voltar preserva o rascunho da marcação, sem persistir formulário
não salvo. Exibir início/duração/término, sugestões baseadas em leitura autorizada e
avisar que não são reservas ou garantia. Nunca inventar expediente.

Reutilizar política manual, serviços/RPCs, revisão concorrente, motivo e auditoria
existentes. Carregamento/erro/consulta sem expediente são estados distintos. Se a leitura
de disponibilidade falhar, manter agendamentos lidos visíveis com indicação de informação
não confirmada; falha não libera criar/editar. Explicar pendências junto às ações,
proteger envio repetido e manter confirmação verde na página depois de fechar o painel.
Detalhes e evidências locais: [experiência 13](13-EXPERIENCIA-RECEPCAO.md).

## Decisão vigente — agenda manual, 01/10/2026

Recepção e Proprietária com vínculo ativo podem criar/corrigir data e horário sem
expediente cadastrado. Ausência ou intervalo fora da faixa habitual gera aviso laranja
e exige confirmação explícita, na interface e no servidor. Não é autorização de
sobreposição: duração completa, conflitos, perfil/clínica e integridade continuam obrigatórios.
Folga/bloqueio explícito impedem. Horário especial é uma restrição explícita da data:
o intervalo completo deve caber nela; terminar exatamente no fim é permitido.
Erro ao consultar disponibilidade bloqueia e permite tentar a leitura novamente,
sem apagar o formulário; não equivale a ausência de expediente.
Criação e edição reutilizam `avaliarAgendaManual`/`useDisponibilidadeAgenda` e a guarda
SQL `agenda_validar_manual`. Não criar/configurar expedientes para passar testes.
Paciente, profissional, clínica, observações, chegada, situação e vínculos financeiros
são preservados na correção. Antes da chegada, data/horário; após chegada, só horário
na mesma data e antes do atendimento. Demais restrições abaixo permanecem.
Migration anterior intacta; proposta 20261001173000 substituída pelas fases
20261001193000 (compatibilidade temporária) e 20261001194000 (encerramento após
verificar os dois sites). Aplicação/publicação autorizadas na tarefa de transição;
durante a fase aditiva o legado conserva as proteções anteriores, sem confirmação
inventada, e a política nova ainda não está integralmente ativa. Estado efetivo no relatório 12.
Evidências e limites no [relatório 12](12-EDICAO-DATA-HORARIO.md).

## Histórico de esclarecimento antes da aprovação manual — 01/10/2026

O usuário esclareceu que não definiu/não conhece o intervalo do profissional de teste.
O padrão de terça-feira encontrado no banco é configuração de ensaio histórico, não
decisão de negócio atual. Não pedir intervalo inventado nem cadastrar horário especial
para contornar o bloqueio.

O pedido de correção exigiu validação de disponibilidade, mas não definiu explicitamente
a mesma política para criação e edição quando não há expediente. A proibição absoluta
implementada na edição não comprova essa aprovação geral. Texto anterior APROVADO não
é evidência suficiente para transformar uma interpretação técnica em decisão do usuário.
Os limites abaixo sobre cobertura/folga descrevem a implementação existente, preservada
até a decisão, não uma nova decisão para o fluxo de criação.

Decisão necessária (não executada):

- **Agenda controlada por expediente:** criação e edição só permitem intervalos completos
  em disponibilidade válida, com conflito, duração, autorização e auditoria no servidor.
- **Agenda manual:** criação e edição permitem horários sem expediente, com avisos de
  disponibilidade e conflitos obrigatórios. Duração, autorização, auditoria, concorrência,
  restrições clínicas/financeiras e regras antes/depois da chegada continuam preservadas.

A criação atual funciona de forma manual; a edição atual é controlada por expediente.
Nenhuma opção já rege ambos coerentemente. Histórico de padrão semanal e exceções
não decide, por si só, se ausência de padrão deve impedir a marcação.
Depois da escolha, implementar uma política compartilhada sem alterar registros de teste:
na opção controlada, ajustar criação/servidor; na manual, ajustar edição/servidor por
nova migration específica, sem reescrever a aplicada. Aplicação remota exige etapa autorizada.
Origem e evidências no [relatório 12](12-EDICAO-DATA-HORARIO.md).

## Núcleo preservado e comportamento atualmente implementado

Recepção e Proprietária com vínculo ativo na clínica podem corrigir data e início de
agendamento elegível, mantendo ID, paciente, profissional, clínica, observações, situação
e vínculos financeiros. Não é troca de médico ou cancelamento/recriação. No mesmo médico,
o pagamento permanece válido conforme Financeiro, sem novo recebimento ou cálculo.

Exigir motivo, comparação de horário anterior/novo, confirmação explícita, disponibilidade
e ausência de conflito. O próprio agendamento não é conflito. Servidor é autoridade:
operação atômica, revisão concorrente e auditoria de autor/instante/antes/depois/motivo.
Agenda manual aprovada: fora do expediente habitual exige aviso e confirmação, não
proibição absoluta. Folga impede; horário especial substitui o padrão e seus limites
continuam explícitos. Duração vem do profissional.
Apresentar faixas e sugestões de horários, sem criar regra nova de múltiplos de duração;
nas sugestões e no horário especial o intervalo completo deve caber em uma janela,
inclusive podendo terminar exatamente no fim. Separar carregamento, falha de consulta
e consulta sem disponibilidade. Junto ao
botão explicar todas as pendências, inclusive quando faltar somente confirmação.

Agendamentos continuam acessíveis quando expediente foi removido/alterado ou profissional
não aparece no cadastro ativo; indicar inconsistência sem apagar. Falta de profissional/
duração impede escolher novo horário. Lista de espera permanece no fluxo próprio Agendar.

Elegíveis: agendado/confirmado, ou aguardando para horário no mesmo dia. Atendimento
iniciado/existente, concluído e cancelado bloqueados; não resetar chegada/status.
**Decisão aprovada pelo usuário nesta continuação:** após chegada e antes do atendimento,
somente horário na mesma data, preservando chegada e posição na fila. Para outra data,
orientar ao reagendamento específico; não desfazer chegada. O bloqueio conservador da
rodada anterior foi confirmado por essa decisão, não por presunção do código.
Nenhuma etapa de fila/cobrança/triagem criada. Não implementado reagendamento entre datas
depois da chegada neste fluxo de correção.

Sucesso verde “Agendamento atualizado” somente após retorno correspondente do servidor,
fora do modal; conflitos/revisão em laranja; falha em vermelho preservando rascunho.
Envio em andamento impede repetição. Resultado incerto bloqueia novo envio nessa ficha,
orientando consulta da Agenda. Se data mudou, ação Ver na nova data.

Interface depende da capacidade confirmada no servidor. RPC ausente/recusada bloqueia
Salvar alterações; não utilizar UPDATE direto como alternativa. RLS e papéis preservados.

## Experiência local da recepção — rodada 2, 01/10/2026

Lista inicial compacta e grade temporal apresentam os mesmos registros, inclusive sem
expediente. Eixo comum de horários, altura proporcional à duração e faixas laterais para
interseções são apresentação, não autorização de sobreposição. Selecionar um horário
somente preenche profissional, data e início; não reserva nem grava.
Criação/edição mantêm identificação, início/duração/término, avisos concentrados, ações
visíveis e explicação das pendências. Cancelar, fechar e Escape pedem confirmação quando
há alterações não salvas. Troca de clínica continua descartando contexto antigo.
Consulta oferece à recepção somente ações operacionais permitidas, não mudanças clínicas.
Comportamento implementado/testado localmente; publicação e prova conectada distintas.
Detalhes e limitações: [experiência da recepção](13-EXPERIENCIA-RECEPCAO.md).
