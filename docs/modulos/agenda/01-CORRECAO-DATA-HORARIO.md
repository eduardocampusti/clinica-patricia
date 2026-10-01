# Correção de data e horário — comportamento aprovado e limites

Estado: APROVADO no escopo dos pedidos de 01/10/2026, incluindo regra explícita após chegada.

Recepção e Proprietária com vínculo ativo na clínica podem corrigir data e início de
agendamento elegível, mantendo ID, paciente, profissional, clínica, observações, situação
e vínculos financeiros. Não é troca de médico ou cancelamento/recriação. No mesmo médico,
o pagamento permanece válido conforme Financeiro, sem novo recebimento ou cálculo.

Exigir motivo, comparação de horário anterior/novo, confirmação explícita, disponibilidade
e ausência de conflito. O próprio agendamento não é conflito. Servidor é autoridade:
operação atômica, revisão concorrente e auditoria de autor/instante/antes/depois/motivo.
Sem encaixe fora do expediente: não há regra específica aprovada para autorizá-lo neste
fluxo. Folga impede; horário especial substitui o padrão. Duração vem do profissional.

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
