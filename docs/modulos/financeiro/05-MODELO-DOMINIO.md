# CLÍNICA PATRÍCIA
# 05 — MODELO DE DOMÍNIO DO FINANCEIRO

**Versão:** 1.0
**Status:** APROVADO
**Base:** Documento Funcional Mestre, Matriz de Papéis e Permissões e Fluxos Operacionais aprovados

## 1. Princípio
O Financeiro será modelado como eventos rastreáveis. Pagamentos confirmados não serão reescritos silenciosamente.

## 2. Entidades centrais
- Clínica
- Profissional
- ProfissionalClínica
- Paciente
- Agendamento
- SessãoCaixa
- Recebimento
- ComponentePagamento
- RegraFinanceiraClínica
- SnapshotFinanceiro
- MovimentoCaixa
- SolicitaçãoSangria
- Estorno
- FechamentoCaixa
- RevisãoFechamento
- Repasse
- ItemRepasse
- AjusteRepasse
- DocumentoFiscal
- TentativaDocumentoFiscal
- EventoAuditoria
- AlertaAuditoria
- ConfiguraçãoAlerta

## 3. Clínica
Unidade jurídica e financeira. Determina CNPJ, conta/PIX, maquininha, caixa, percentual, notas, recebimentos, repasses e auditoria.

## 4. Profissional
Médico/profissional. Pode atuar em mais de uma clínica.

## 5. Profissional + Clínica
A relação define o valor da consulta por unidade. Somente proprietária altera.

## 6. Regra financeira da clínica
Percentual configurado por clínica, com vigência. Mudanças futuras não alteram recebimentos passados.

## 7. Agendamento
Origem operacional da consulta. Relaciona paciente, profissional, clínica, data/hora e situação.

## 8. Recebimento
Entidade central da consulta paga. Preserva clínica, paciente, profissional, agendamento, sessão de caixa, valor bruto, percentual, parte da clínica, parte do médico, estado, usuário e data/hora.

## 9. Snapshot financeiro
Congela valor da consulta, percentual e divisão clínica/médico no momento do recebimento.

## 10. Componentes de pagamento
Um recebimento pode possuir múltiplos componentes. A soma deve ser igual ao total quitado.

## 11. Formas de pagamento
Escopo inicial: DINHEIRO, PIX, CARTÃO_CRÉDITO.

## 12. Sessão de caixa
Estados conceituais:
- ABERTO
- EM_FECHAMENTO
- AGUARDANDO_APROVAÇÃO
- DEVOLVIDO_PARA_CORREÇÃO
- APROVADO

## 13. Movimento de caixa
Tipos:
- RECEBIMENTO
- SUPRIMENTO
- SANGRIA
- ESTORNO
- AJUSTE

## 14. Suprimento
Entrada de dinheiro que não representa receita.

## 15. Sangria
Estados:
- SOLICITADA
- APROVADA
- REJEITADA
- EFETIVADA

## 16. Estorno
Parcial ou total. Não apaga o recebimento.
Estados:
- SOLICITADO
- APROVADO
- REJEITADO
- EFETIVADO

Um Estorno possui Componentes de Estorno. Cada componente registra uma forma de pagamento e um valor.

Na primeira versão, os componentes devem respeitar as formas e os limites do recebimento original. Não existe conversão automática entre dinheiro, PIX e cartão.

## 17. Estorno e médico
Antes do repasse: ajusta valor devido. Depois do repasse: cria AjusteRepasse negativo.

## 18. Fechamento de caixa
Consolida saldo inicial, dinheiro, PIX, cartão, suprimentos, sangrias, estornos, esperado, contado e diferença.

## 19. Revisão do fechamento
Eventos separados de aprovação, observação e devolução. Revisões anteriores são preservadas.

## 20. Repasse
Obrigação financeira da clínica com o médico.
Estados:
- PENDENTE
- PAGO
- AJUSTADO

É gerado por profissional quando o fechamento é aprovado. A confirmação registra pagamento externo por PIX ou transferência, sem criar movimento de caixa.

## 21. Item de repasse
Composição rastreável apontando para recebimentos, estornos ou ajustes.

## 22. Ajuste de repasse
Corrige obrigação futura sem alterar repasse já pago.

O ajuste negativo pós-repasse permanece pendente até ser integralmente compensado. Sua aplicação pode ser distribuída por vários repasses futuros e cada parcela aplicada é preservada em uma Aplicação de Ajuste de Repasse, sem permitir saldo negativo no repasse.

Aplicações vinculadas a repasse `pendente` são provisórias. Após estorno anterior à liquidação, o sistema recalcula o crédito da produção, reduz ou remove aplicações em ordem inversa de criação e atualiza `valor_aplicado` e `status` do ajuste. O saldo devolvido volta a ser elegível para o próximo repasse. Aplicações vinculadas a repasse `pago` ou `ajustado` são definitivas e imutáveis.

## 23. Documento fiscal
Estados:
- PENDENTE
- EMISSAO_SOLICITADA
- EMITIDA
- ERRO_EMISSAO
- CANCELAMENTO_SOLICITADO
- CANCELADA
- ERRO_CANCELAMENTO

O DocumentoFiscal pertence à clínica do recebimento e possui no máximo um documento principal por recebimento. A solicitação de emissão ou cancelamento não conclui a operação; o resultado de uma integração confiável é registrado separadamente.

## 24. Tentativa de documento fiscal

Preserva tipo (`emissao` ou `cancelamento`), status (`solicitada`, `processando`, `sucesso` ou `erro`), provider opcional, identificador externo, mensagem sanitizada, resultado fiscal normalizado, resposta resumida e horários. Tentativas são históricas e não podem ser apagadas. Segredos, tokens, senhas, certificados privados e payloads sensíveis não pertencem à entidade.

Há no máximo uma tentativa ativa (`solicitada` ou `processando`) por documento e tipo. O resultado é sempre recebido com o identificador da tentativa; a clínica, o documento, o tipo, o estado atual e a terminalidade da tentativa são validados antes da transição. Retries geram nova linha, respostas obsoletas não sobrescrevem a tentativa atual, e o mesmo resultado terminal repetido é idempotente.

## 25. Reagendamento e financeiro
Não duplica pagamento. Preserva relação entre agendamento original, novo agendamento e recebimento.

## 26. Complemento financeiro
Diferença adicional em reagendamento para médico mais caro. Mantém vínculo com origem.

## 27. Evento de auditoria
Registra usuário, papel, clínica, data/hora, ação, entidade, registro, estado anterior, estado novo, valor e motivo.

## 28. Alerta de auditoria
Prioridades: INFORMATIVO, ATENÇÃO, CRÍTICO.

## 29. Configuração de alerta
Somente proprietária pode definir limites. Mudanças geram auditoria.

## 30. Relacionamentos principais
- Clínica possui Sessões de Caixa
- Clínica possui Regra Financeira
- Clínica possui Documentos Fiscais
- Profissional atua em Clínica
- ProfissionalClínica define Valor da Consulta
- Agendamento pertence a Clínica
- Agendamento referencia Paciente
- Agendamento referencia Profissional
- Recebimento nasce de Agendamento
- Recebimento possui Componentes de Pagamento
- Recebimento possui Snapshot Financeiro
- Recebimento gera Valor de Repasse
- Recebimento pode sofrer Estorno
- Estorno possui Componentes de Estorno
- SessãoCaixa possui Movimentos
- SessãoCaixa gera Fechamento
- Fechamento possui Revisões
- Repasse possui Itens de Repasse
- DocumentoFiscal referencia Recebimento
- DocumentoFiscal possui TentativasDocumentoFiscal
- EventoAuditoria referencia operação de domínio

## 31. Invariantes
1. Recebimento confirmado pertence a uma clínica.
2. Recebimento de consulta está relacionado à origem operacional.
3. Soma dos componentes = valor quitado.
4. Consulta normal não fica parcialmente pendente.
5. Percentual histórico não é recalculado.
6. Recepção não altera preço.
7. Recepção não aprova estorno.
8. Recepção não aprova sangria.
9. Recepção não aprova definitivamente fechamento.
10. Médico não acessa financeiro de outro médico.
11. Repasse pago não é reescrito.
12. Estorno não apaga recebimento.
13. Auditoria não é apagada.
14. Nota usa CNPJ da clínica do atendimento.
15. Suprimento não é receita.
16. Saldo inicial não é receita.
17. Documento fiscal pertence à clínica do recebimento.
18. Solicitação não equivale a emissão ou cancelamento concluído.
19. Estorno não cancela nota automaticamente.
20. Histórico fiscal não é apagado.

## 32. O que este documento não define
Não define SQL, tabelas físicas definitivas, índices, RLS concreta, RPCs, endpoints, integração fiscal ou migrations.

## 33. Próxima etapa
`06-ARQUITETURA-TECNICA.md`

## 34. FASE 8 — Projeções e configuração

Dashboard não possui saldo próprio. Produção é projeção dos snapshots de recebimentos; impacto de estorno é projeção de eventos efetivados. Coorte de produção, eventos por data de efetivação, coorte de repasses e estoque atual de ajustes são populações distintas. Contagem de pacientes é distinta sobre a união, não soma automática por profissional.

Único novo estado persistido: configuração de alertas por clínica, oito thresholds nullable, autor e data. Mudanças geram eventos de auditoria; ausência equivale a NULL. Alertas calculados referenciam entidades fonte, sem nova tabela de alertas. Diferença de caixa usa a última tentativa de fechamento por sessão elegível, sem duplicar tentativas anteriores. Dinheiro físico/legado não vira produção.

Contrato físico e fórmulas: `09-CONTRATO-DASHBOARDS.md`. Snapshot bruto, estorno pré-pagamento, aplicação provisória, compensação terminal e saldo negativo restante mantêm exatamente os conceitos da FASE 6. Implementação local, aguardando revisão/aplicação.
