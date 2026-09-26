# CLÍNICA PATRÍCIA
# 04 — FLUXOS OPERACIONAIS DO FINANCEIRO

**Versão:** 1.0
**Status:** APROVADO
**Base:** Documento Funcional Mestre + Matriz Definitiva de Papéis e Permissões

# 1. ABERTURA DE CAIXA
## Quem pode
- Proprietária
- Recepção

## Fluxo
1. Usuário acessa o Financeiro.
2. Seleciona/está vinculado à clínica ativa.
3. Sistema verifica se já existe caixa aberto.
4. Se não existir, apresenta `Abrir caixa`.
5. Usuário informa saldo inicial.
6. Saldo inicial pode ser R$ 0,00.
7. Sistema registra clínica, usuário, data/hora e saldo inicial.
8. Caixa passa para estado `ABERTO`.
9. Auditoria é gerada.

## Bloqueios
- Não abrir segundo caixa simultâneo para a mesma clínica sem regra futura que autorize.
- Médico não pode abrir caixa.

# 2. RECEBIMENTO DE CONSULTA
## Quem pode
- Recepção
- Proprietária

## Fluxo
1. Paciente chega.
2. Recepção abre o agendamento.
3. Sistema identifica clínica, paciente, médico, especialidade e valor da consulta naquela clínica.
4. Sistema verifica caixa aberto.
5. Sistema exibe o valor da consulta sem permitir alteração pela recepção.
6. Recepção seleciona forma de pagamento.
7. Pagamento deve quitar 100% da consulta.
8. Sistema confirma o recebimento.
9. Registra snapshot financeiro: valor bruto, percentual vigente da clínica, valor da clínica e valor líquido do médico.
10. Vincula o recebimento ao agendamento.
11. Atualiza caixa.
12. Gera pendência de nota fiscal.
13. Atualiza financeiro do médico.
14. Gera auditoria.
15. Paciente pode seguir para atendimento.

# 3. PAGAMENTO COMBINADO
Exemplo: consulta de R$ 400 paga com R$ 200 em dinheiro + R$ 200 em PIX.

1. Recepção seleciona `Dividir pagamento`.
2. Adiciona forma 1 e valor.
3. Adiciona forma 2 e valor.
4. Sistema soma os componentes.
5. Só permite confirmar se total = valor integral da consulta.
6. Cada componente fica registrado separadamente.
7. A consulta possui um único recebimento lógico.
8. Caixa e relatórios identificam os valores por modalidade.

Não permitir pagamento parcial com saldo para outro dia.

# 4. NOTA FISCAL PENDENTE
Após confirmação do pagamento:
1. Recebimento recebe status fiscal `PENDENTE`.
2. Entra automaticamente na fila de notas pendentes.
3. Fila exibe paciente, clínica, médico, data, valor e forma de pagamento.
4. CNPJ é determinado automaticamente pela clínica do atendimento.

# 5. EMISSÃO DE NOTA FISCAL
## Quem pode
- Recepção
- Proprietária

1. Usuário abre fila de notas pendentes.
2. Seleciona pagamento.
3. Sistema apresenta dados fiscais.
4. Usuário solicita emissão.
5. Sistema muda para `EMISSAO_SOLICITADA`, cria tentativa e audita.
6. Uma integração confiável futura registra o resultado.
7. Somente resultado de sucesso muda para `EMITIDA`; erro muda para `ERRO_EMISSAO`.
8. Guarda identificação/documento retornado pelo futuro provedor fiscal.

O resultado deve informar a tentativa fiscal específica que originou a chamada externa. Se essa tentativa já terminou, resposta idêntica é no-op; resposta conflitante ou resposta obsoleta de retry anterior é rejeitada sem alterar o documento.

A integração fiscal ainda será definida tecnicamente.

Não existe, nesta fase, RPC pública para marcar emissão ou cancelamento como concluídos.

# 6. CANCELAMENTO DE NOTA FISCAL
## Quem pode
- Recepção
- Proprietária

1. Usuário localiza nota emitida.
2. Seleciona `Cancelar`.
3. Informa motivo.
4. Sistema solicita confirmação.
5. Sistema muda para `CANCELAMENTO_SOLICITADO`, cria tentativa e audita.
6. Uma integração confiável futura registra o resultado.
7. Somente resultado de sucesso muda para `CANCELADA`; erro muda para `ERRO_CANCELAMENTO`.
8. Registra usuário, motivo, data/hora, estado anterior e novo estado.

O cancelamento segue a mesma correlação por tentativa, unicidade de tentativa ativa, proteção contra resposta atrasada e idempotência de resultado do cancelamento.

# 7. SUPRIMENTO DE CAIXA
## Quem pode
- Recepção
- Proprietária

1. Usuário seleciona `Adicionar suprimento`.
2. Informa valor.
3. Informa motivo.
4. Sistema registra entrada operacional.
5. Saldo esperado do caixa é atualizado.
6. Valor não entra no faturamento.
7. Auditoria é gerada.

# 8. SANGRIA / RETIRADA
1. Recepção solicita retirada.
2. Informa valor e motivo.
3. Solicitação fica `AGUARDANDO_APROVACAO`.
4. Proprietária recebe alerta.
5. Proprietária pode aprovar ou rejeitar.
6. Se aprovada, retirada é efetivada e saldo esperado atualizado.
7. Sistema registra solicitante e aprovador.
8. Auditoria é gerada.

Recepção não efetiva sangria sem aprovação.

# 9. SOLICITAÇÃO DE ESTORNO
## Quem solicita
- Recepção

**Decisão vigente da FASE 10D:** a proprietária não solicita; ela revisa e decide. Registros históricos anteriores também a listavam como solicitante, regra substituída nesta execução para separar operação e aprovação.

1. Usuário localiza visualmente o recebimento.
2. Seleciona `Solicitar estorno`.
3. Escolhe total ou parcial.
4. Informa valor.
5. Informa motivo obrigatório.
6. Solicitação fica `AGUARDANDO_APROVACAO`.
7. Proprietária recebe alerta.

# 10. APROVAÇÃO E EFETIVAÇÃO DE ESTORNO
## Quem pode
- Proprietária

1. Proprietária abre solicitação.
2. Vê pagamento original, paciente, médico, clínica, valor, motivo e solicitante.
3. Pode aprovar ou rejeitar.
4. Se aprovar, sistema cria evento de estorno e preserva pagamento original.
5. Caixa é ajustado.
6. Financeiro do médico é ajustado.
7. Auditoria é gerada.

# 11. ESTORNO ANTES DO REPASSE
Se o médico ainda não recebeu, o sistema reduz automaticamente o valor líquido pendente antes do repasse.

# 12. ESTORNO DEPOIS DO REPASSE
1. Consulta já foi repassada.
2. Estorno posterior é aprovado.
3. Sistema não altera o repasse já confirmado.
4. Cria ajuste negativo.
5. Ajuste fica vinculado ao recebimento original, estorno, médico e clínica.
6. Valor é descontado automaticamente do próximo repasse.

# 13. REAGENDAMENTO — MESMO MÉDICO
1. Consulta já está paga.
2. Paciente muda data/horário.
3. Recepção realiza reagendamento.
4. Pagamento existente acompanha o novo agendamento.
5. Nenhum novo recebimento é criado.
6. Histórico anterior é preservado.

# 14. REAGENDAMENTO — OUTRO MÉDICO
## Mesmo valor
Pagamento é transferido ao novo agendamento sem cobrança adicional.

## Novo valor maior
Sistema calcula diferença e recepção cobra somente o complemento.

## Novo valor menor
Sistema calcula excedente e cria solicitação de estorno para aprovação.

# 15. FALTA / NO-SHOW
1. Paciente já pagou.
2. Consulta recebe status de falta/no-show.
3. Proprietária decide manter cobrança, estornar parcialmente ou estornar integralmente.
4. Decisão e motivo ficam registrados.
5. Estorno, se houver, segue fluxo normal.

# 16. FECHAMENTO OPERACIONAL DO CAIXA
## Quem executa
- Recepção
- Proprietária

1. Usuário seleciona `Fechar caixa`.
2. Sistema calcula saldo inicial, recebimentos em dinheiro, PIX, cartão, suprimentos, sangrias e estornos.
3. Sistema exibe valor esperado em dinheiro.
4. Recepção informa valor contado.
5. Sistema calcula diferença.
6. Se diferença = zero, pode enviar para aprovação.
7. Se diferença ≠ zero, justificativa é obrigatória.
8. Fechamento recebe `AGUARDANDO_APROVACAO`.
9. Proprietária recebe alerta.

# 17. APROVAÇÃO DO FECHAMENTO
A proprietária visualiza dinheiro esperado, contado, diferença, justificativa, PIX, cartão, total bruto, valor da clínica, valores dos médicos, estornos, sangrias, suprimentos, repasses e notas fiscais pendentes.

Pode:
- Aprovar;
- Aprovar com observação;
- Rejeitar/devolver para correção.

Toda decisão é auditada.

# 18. CORREÇÃO DE FECHAMENTO DEVOLVIDO
1. Recepção recebe retorno.
2. Vê motivo/observação.
3. Corrige dados permitidos.
4. Histórico da primeira tentativa é preservado.
5. Reenvia.
6. Nova revisão é criada.

# 19. GERAÇÃO DE REPASSE
1. Sistema reúne consultas elegíveis do médico.
2. Utiliza snapshots históricos.
3. Calcula bruto, parte da clínica, líquido do médico, ajustes, estornos e saldo devido.
4. Agrupa conforme periodicidade.
5. Repasse recebe `PENDENTE`.

Nunca recalcular valores antigos usando percentual atual.

# 20. CONFIRMAÇÃO DE REPASSE
## Quem pode
- Proprietária

1. Proprietária abre repasses pendentes.
2. Seleciona médico.
3. Sistema mostra composição completa.
4. Patrícia realiza PIX/transferência externamente.
5. Clica `Confirmar repasse`.
6. Sistema registra médico, clínica, valor, período, data/hora, usuário e itens quitados.
7. Repasse passa para `PAGO`.
8. Dashboard do médico é atualizado.
9. Auditoria é gerada.

# 21. DASHBOARD DO MÉDICO
Visualiza somente o próprio universo:
- consultas do dia;
- pacientes;
- valor bruto;
- parte da clínica;
- líquido;
- repasses pagos;
- repasses pendentes.

Pode filtrar por período e exportar PDF/Excel.

# 22. DASHBOARD DA PROPRIETÁRIA
## Por clínica
Faturamento, consultas, ticket médio, dinheiro, PIX, cartão, valor da clínica, valor dos médicos, repasses, estornos, notas e divergências.

## Consolidado
Compara todas as unidades mantendo origem dos registros.

# 23. PAINEL DE CONTROLE E AUDITORIA
Alertas:
- caixa com diferença;
- fechamento aguardando aprovação;
- estorno aguardando;
- sangria aguardando;
- repasse pendente;
- nota fiscal pendente;
- movimentação atípica.

Prioridades: Informativo, Atenção e Crítico.

# 24. AUDITORIA
Registrar usuário, papel, clínica, data/hora, ação, entidade, registro, valor, estado anterior, estado posterior, motivo e vínculo com operação original.

# 25. RELATÓRIOS
Proprietária: PDF/Excel de caixa, recebimentos, repasses, estornos, médicos, notas, auditoria e comparação entre clínicas.

Médico: PDF/Excel apenas do próprio financeiro.

# 26. FILTROS
Proprietária: período, clínica, médico, paciente, forma de pagamento, status financeiro, status de repasse, status fiscal e caixa.

Médico: somente o próprio universo.

Recepção: filtros operacionais da clínica autorizada.

# 27. REGRAS GERAIS DE ERRO
Distinguir carregando, sem dados, erro, acesso negado e serviço indisponível.

Formulários não podem apagar dados após falha.

Operações duplicadas devem ser impedidas.

# 28. REGRAS GERAIS DE ESTADO
Nenhuma operação confirmada desaparece.

Correções acontecem por novo evento, estorno, ajuste, complemento ou mudança de estado controlada.

# 29. PRÓXIMA ETAPA
`05-MODELO-DOMINIO.md`

# 30. FASE 8 — Consulta e configuração (preparação local)

Proprietária autentica → banco resolve clínicas ativas autorizadas → valida intervalo/filtros → calcula coorte, eventos, repasses, fiscal, caixa e alertas → devolve resumo e breakdowns limitados. Médico autentica → banco resolve identidade única e vínculos ativos → calcula apenas próprio universo; não passa pelo agregador administrativo.

Configuração: proprietária da clínica envia PATCH tipado → banco revalida acesso → bloqueia linha da clínica para serializar → valida limites e relação atenção/crítico → persiste configuração e evento de auditoria atomicamente. Repetição sem mudança é no-op. NULL desativa threshold; erros não alteram nada.

Intervalo `[inicio,fim)`, séries America/Bahia, domínios de filtros e fórmulas são os de `09-CONTRATO-DASHBOARDS.md`. Não confundir ausência de produção com ausência do estoque atual de ajustes; não mostrar listagens limitadas como relatório completo. Fluxos foram codificados localmente, sem aplicação ou frontend.
