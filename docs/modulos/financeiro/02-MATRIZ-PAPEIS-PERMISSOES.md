# CLÍNICA PATRÍCIA
# MATRIZ DEFINITIVA DE PAPÉIS E PERMISSÕES — FINANCEIRO

**Versão:** 1.0
**Status:** APROVADO
**Base:** Documento Funcional Mestre do Financeiro — aprovado em 20/09/2026
**Importante:** este documento NÃO autoriza implementação, migration ou alteração no Supabase.

## 1. Papéis principais

### Proprietária / Administradora

Perfil com controle gerencial, aprovação, configuração e auditoria.

Responsabilidades principais:

- acompanhar todas as clínicas;
- aprovar operações sensíveis;
- configurar regras financeiras;
- visualizar auditoria;
- acompanhar médicos;
- controlar repasses;
- aprovar fechamentos;
- analisar alertas;
- visualizar relatórios e comparativos.

### Recepção / Secretária

Perfil operacional.

Responsabilidades principais:

- receber pacientes;
- registrar pagamentos;
- abrir caixa;
- fechar operacionalmente o caixa;
- emitir nota fiscal;
- cancelar nota fiscal;
- solicitar estorno;
- solicitar sangria;
- registrar suprimento;
- acompanhar tarefas operacionais da clínica.

A recepção NÃO administra regras financeiras.

### Médico / Profissional

Perfil de consulta do próprio financeiro.

Responsabilidades principais:

- acompanhar suas consultas;
- visualizar seus pacientes relacionados às próprias consultas;
- acompanhar valor bruto;
- acompanhar valor líquido;
- acompanhar repasses;
- exportar os próprios relatórios.

O médico não opera o caixa e não administra o Financeiro.

## 2. Princípio de segurança

O sistema adotará:

**NEGAR POR PADRÃO.**

O usuário somente poderá realizar uma ação financeira quando seu papel possuir permissão explícita.

Mostrar ou esconder um botão na interface NÃO será considerado segurança.

As permissões deverão posteriormente existir também no:

- banco;
- RLS;
- backend/RPC;
- camada de autorização.

## 3. Escopo multi-clínica

### Proprietária

Pode visualizar:

- clínica individual;
- todas as clínicas;
- visão consolidada;
- comparações entre clínicas.

### Recepção

Deverá operar somente nas clínicas às quais possuir vínculo/autorização.

Não deverá visualizar o financeiro de unidades às quais não tenha acesso.

### Médico

Visualiza somente:

- seus próprios atendimentos;
- seus próprios recebimentos;
- seus próprios repasses;

nas clínicas em que atua.

## 4. Dashboard Financeiro

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Abrir Financeiro | SIM | SIM | SIM, visão própria |
| Ver dashboard geral da clínica | SIM | OPERACIONAL | NÃO |
| Ver consolidado de todas as clínicas | SIM | NÃO | NÃO |
| Comparar clínicas | SIM | NÃO | NÃO |
| Ver faturamento geral | SIM | LIMITADO À OPERAÇÃO | NÃO |
| Ver financeiro de outros médicos | SIM | SOMENTE SE NECESSÁRIO À OPERAÇÃO | NÃO |
| Ver próprio financeiro | SIM | N/A | SIM |
| Ver alertas de auditoria | SIM | Apenas operacionais que lhe cabem | NÃO |
| Ver painel completo de auditoria | SIM | NÃO | NÃO |

## 5. Cadastro e configuração do médico

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Cadastrar médico | SIM | NÃO | NÃO |
| Alterar especialidade | SIM | NÃO | NÃO |
| Definir valor da consulta | SIM | NÃO | NÃO |
| Alterar valor da consulta | SIM | NÃO | NÃO |
| Configurar valor diferente por clínica | SIM | NÃO | NÃO |
| Visualizar valor cadastrado | SIM | SIM | SIM, próprio |

A recepção nunca poderá modificar o preço durante a cobrança.

## 6. Configurações financeiras da clínica

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Definir percentual da clínica | SIM | NÃO | NÃO |
| Alterar percentual da clínica | SIM | NÃO | NÃO |
| Definir percentual diferente entre clínicas | SIM | NÃO | NÃO |
| Visualizar percentual vigente | SIM | SIM, para operação | SIM, referente ao próprio cálculo |
| Alterar regras de cálculo | SIM | NÃO | NÃO |

Toda alteração deverá gerar auditoria.

## 7. Abertura de caixa

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Abrir caixa | SIM | SIM | NÃO |
| Informar saldo inicial | SIM | SIM | NÃO |
| Abrir com R$ 0 | SIM | SIM | NÃO |
| Ver quem abriu | SIM | SIM | NÃO |
| Ver histórico de abertura | SIM | LIMITADO | NÃO |

A abertura deverá registrar:

- usuário;
- clínica;
- data/hora;
- saldo inicial.

## 8. Recebimento de consulta

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Registrar pagamento | SIM | SIM | NÃO |
| Selecionar paciente | SIM | SIM | NÃO |
| Selecionar consulta/agendamento | SIM | SIM | NÃO |
| Visualizar preço | SIM | SIM | SIM, próprio |
| Alterar preço na cobrança | NÃO COMO FLUXO NORMAL | NÃO | NÃO |
| Escolher forma de pagamento | SIM | SIM | NÃO |
| Dividir pagamento entre formas | SIM | SIM | NÃO |
| Confirmar quitação | SIM | SIM | NÃO |
| Ver recebimentos próprios | SIM | SIM, operação | SIM |
| Ver recebimentos de terceiros | SIM | Conforme necessidade operacional | NÃO |

## 9. Pagamento combinado

Recepção e proprietária poderão registrar pagamento combinado.

Exemplo:

- R$ 200 dinheiro;
- R$ 200 PIX.

O sistema deverá impedir confirmação enquanto:

**soma dos pagamentos ≠ valor integral da consulta.**

O médico apenas visualiza o resultado financeiro da própria consulta.

## 10. Suprimento de caixa

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Registrar suprimento | SIM | SIM | NÃO |
| Informar motivo | SIM | SIM | NÃO |
| Ver suprimentos | SIM | SIM, da operação | NÃO |
| Auditar suprimentos | SIM | NÃO | NÃO |

Suprimento não será considerado faturamento.

## 11. Sangria / retirada

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Solicitar sangria | SIM | SIM | NÃO |
| Informar valor e motivo | SIM | SIM | NÃO |
| Aprovar sangria | SIM | NÃO | NÃO |
| Efetivar sangria sem aprovação | NÃO | NÃO | NÃO |
| Visualizar histórico completo | SIM | LIMITADO À OPERAÇÃO | NÃO |

Fluxo:

**Solicitação → Aprovação → Efetivação → Auditoria**

## 12. Fechamento de caixa

### Recepção

Pode:

- iniciar fechamento;
- contar dinheiro;
- conferir PIX;
- conferir cartão;
- informar valores;
- justificar diferenças;
- enviar para aprovação.

Não pode aprovar definitivamente o próprio fechamento.

### Proprietária

Pode:

- revisar;
- comparar esperado × informado;
- visualizar divergências;
- aprovar;
- rejeitar;
- devolver para correção;
- registrar observação.

### Médico

Não participa do fechamento.

## 13. Matriz do fechamento

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Preparar fechamento | SIM | SIM | NÃO |
| Informar valor contado | SIM | SIM | NÃO |
| Justificar divergência | SIM | SIM | NÃO |
| Enviar para aprovação | SIM | SIM | NÃO |
| Aprovar fechamento | SIM | NÃO | NÃO |
| Rejeitar fechamento | SIM | NÃO | NÃO |
| Devolver para correção | SIM | NÃO | NÃO |
| Ver fechamento completo | SIM | SIM, operacional | NÃO |
| Ver fechamento de outras clínicas | SIM | NÃO | NÃO |

## 14. Estorno

O estorno terá separação obrigatória de funções.

### Recepção

Pode:

- localizar pagamento;
- solicitar estorno;
- informar motivo;
- informar valor total ou parcial.

Não pode efetivar o estorno.

### Proprietária

Pode:

- revisar;
- aprovar;
- rejeitar;
- efetivar estorno.

## 15. Matriz do estorno

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Solicitar estorno | NÃO | SIM | NÃO |
| Escolher valor parcial | NÃO | SIM, na solicitação | NÃO |
| Escolher estorno total | NÃO | SIM, na solicitação | NÃO |
| Aprovar estorno | SIM | NÃO | NÃO |
| Rejeitar estorno | SIM | NÃO | NÃO |
| Efetivar estorno | SIM | NÃO | NÃO |
| Ver estorno relacionado à própria consulta | SIM | SIM, operacional | SIM |
| Ver estornos gerais | SIM | LIMITADO | NÃO |

**Decisão vigente da FASE 10D (22/09/2026):** solicitante operacional ≠ autoridade de aprovação. A recepção solicita; a proprietária revisa, aprova ou rejeita, e a aprovação efetiva pela RPC. A versão histórica da tabela permitia solicitação também pela proprietária; essa permissão foi substituída expressamente nesta execução, sem ampliar `financeiro_solicitar_estorno`.

## 16. Cancelamento de consulta paga

Consulta paga cancelada seguirá as mesmas permissões do estorno.

Recepção: solicita.

Proprietária: aprova e efetiva.

## 17. Falta / no-show

A decisão sobre manter cobrança ou estornar pertence à proprietária.

Recepção poderá registrar a situação operacional.

A proprietária decidirá entre:

- manter pagamento;
- aprovar estorno parcial;
- aprovar estorno total.

## 18. Reagendamento

### Mesmo médico

Recepção poderá realizar o reagendamento operacional conforme as permissões gerais da Agenda.

O pagamento existente acompanha a consulta.

### Outro médico — mesmo valor

Pagamento é transferido para o novo agendamento.

### Outro médico — valor maior

Recepção poderá cobrar somente a diferença.

### Outro médico — valor menor

A diferença deverá entrar no fluxo de solicitação/aprovação de estorno.

Todas as alterações financeiras deverão ser auditadas.

## 19. Repasses

### Proprietária

Pode:

- visualizar valores de todos os médicos;
- visualizar pendências;
- confirmar repasse;
- acompanhar histórico;
- gerar relatórios.

### Médico

Pode:

- visualizar seus próprios valores;
- visualizar valor devido;
- visualizar valor pago;
- visualizar saldo pendente.

### Recepção

Não terá como função padrão confirmar pagamento de repasse.

## 20. Matriz de repasse

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Ver repasses de todos os médicos | SIM | NÃO | NÃO |
| Ver próprio repasse | SIM | N/A | SIM |
| Confirmar repasse | SIM | NÃO | NÃO |
| Registrar pagamento ao médico | SIM | NÃO | NÃO |
| Alterar repasse já confirmado | NÃO DIRETAMENTE | NÃO | NÃO |
| Corrigir via ajuste | SIM | NÃO | NÃO |
| Exportar histórico geral | SIM | NÃO | NÃO |
| Exportar próprio histórico | SIM | N/A | SIM |

## 21. Periodicidade de repasse

Padrão:

**diário.**

Também haverá possibilidade futura de:

- semanal;
- mensal.

Somente a proprietária poderá configurar a periodicidade.

A definição exata de o parâmetro ser por médico, clínica ou outra regra permanece pendente.

## 22. Nota fiscal

### Recepção

Pode:

- visualizar fila de notas pendentes;
- emitir nota;
- cancelar nota.

### Proprietária

Pode realizar todas essas ações e auditar toda a operação.

### Médico

Não emite nem cancela nota.

## 23. Matriz fiscal

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Ver notas pendentes | SIM | SIM | NÃO |
| Emitir nota | SIM | SIM | NÃO |
| Cancelar nota | SIM | SIM | NÃO |
| Ver histórico fiscal completo | SIM | LIMITADO À OPERAÇÃO | NÃO |
| Ver notas de todas as clínicas | SIM | NÃO | NÃO |
| Alterar CNPJ emissor manualmente | NÃO | NÃO | NÃO |

O CNPJ deverá ser determinado automaticamente pela clínica do atendimento.

## 24. Auditoria

Toda ação financeira relevante deverá registrar:

- usuário;
- papel;
- clínica;
- data/hora;
- tipo de ação;
- registro afetado;
- valor;
- estado anterior;
- estado novo;
- motivo, quando aplicável.

## 25. Acesso à auditoria

| Ação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Ver painel completo de auditoria | SIM | NÃO | NÃO |
| Ver ações de todos os usuários | SIM | NÃO | NÃO |
| Ver ações de todas as clínicas | SIM | NÃO | NÃO |
| Ver próprias ações | SIM | SIM | NÃO ADMINISTRATIVAMENTE |
| Alterar registro de auditoria | NÃO | NÃO | NÃO |
| Excluir auditoria | NÃO | NÃO | NÃO |

A trilha de auditoria deverá ser imutável para usuários comuns.

## 26. Configurações de auditoria

Somente a proprietária poderá:

- definir limites de diferença de caixa;
- definir critérios de alerta;
- alterar níveis de prioridade;
- definir limite de estorno relevante;
- configurar prazo de repasse pendente;
- ajustar parâmetros de exceção.

Recepção e médico: sem permissão.

Toda alteração deverá ser auditada.

## 27. Alertas

### Proprietária

Pode:

- ver todos;
- abrir;
- investigar;
- tratar.

### Recepção

Pode visualizar somente alertas operacionais que dependam de sua ação.

### Médico

Não acessa o painel administrativo de alertas.

## 28. Níveis de alerta

- Informativo;
- Atenção;
- Crítico.

Somente a proprietária poderá modificar parâmetros que determinam essas classificações.

## 29. Relatórios e exportações

### Proprietária

Pode exportar PDF e Excel de:

- fechamento;
- recebimentos;
- médicos;
- repasses;
- estornos;
- notas fiscais;
- auditoria;
- comparativo entre clínicas.

### Médico

Pode exportar somente o próprio financeiro.

### Recepção

Não terá acesso irrestrito à exportação gerencial.

Relatórios operacionais específicos poderão ser definidos posteriormente conforme necessidade.

## 30. Filtros

A proprietária poderá utilizar todos os filtros financeiros aprovados:

- período;
- clínica;
- médico;
- paciente;
- forma de pagamento;
- status do pagamento;
- status de repasse;
- status fiscal;
- situação do caixa.

O médico poderá filtrar apenas o próprio universo financeiro.

A recepção utilizará filtros necessários à sua operação na clínica autorizada.

## 31. Ações que nenhum usuário deve poder fazer diretamente

Nenhum papel deverá possuir fluxo normal para:

- apagar pagamento confirmado;
- apagar estorno;
- apagar repasse;
- apagar fechamento;
- modificar histórico financeiro antigo;
- recalcular passado após alteração de percentual;
- editar auditoria;
- excluir auditoria;
- trocar a clínica de origem de uma operação financeira confirmada;
- trocar arbitrariamente o CNPJ de uma nota;
- acessar dados de clínica sem vínculo/permissão.

Correções deverão ocorrer por:

- estorno;
- ajuste;
- complemento;
- novo evento;
- mudança de estado controlada.

## 32. Resumo por papel

### PROPRIETÁRIA / ADMINISTRADORA

**Controla, configura, aprova e audita.**

Pode:

- ver tudo;
- comparar clínicas;
- configurar preços;
- configurar percentual;
- configurar auditoria;
- aprovar fechamento;
- aprovar sangria;
- aprovar estorno;
- confirmar repasse;
- emitir/cancelar nota;
- gerar relatórios;
- acessar auditoria completa.

### RECEPÇÃO / SECRETÁRIA

**Opera, registra e solicita.**

Pode:

- abrir caixa;
- receber paciente;
- registrar pagamento;
- dividir pagamento;
- emitir nota;
- cancelar nota;
- registrar suprimento;
- solicitar sangria;
- fechar operacionalmente o caixa;
- justificar divergência;
- solicitar estorno;
- realizar tarefas financeiras operacionais permitidas.

Não pode:

- alterar valor da consulta;
- alterar percentual;
- aprovar estorno;
- aprovar sangria;
- aprovar fechamento;
- confirmar repasse;
- alterar auditoria;
- alterar regras de segurança.

### MÉDICO

**Acompanha somente o que é dele.**

Pode:

- ver suas consultas;
- ver pacientes das próprias consultas;
- ver valores;
- ver produção bruta;
- ver participação da clínica;
- ver valor líquido;
- ver repasses;
- exportar próprio financeiro.

Não pode:

- ver financeiro de outros médicos;
- ver caixa geral;
- operar recebimentos;
- estornar;
- aprovar;
- ver auditoria;
- mudar configurações financeiras.

## 33. Regra de ouro de autorização

A interface deverá ser simples, mas a segurança não dependerá dela.

Toda operação crítica deverá ser protegida por regra de autorização do lado do servidor/banco.

A pergunta para cada ação deverá ser:

**Este usuário pode fazer esta ação, nesta clínica, sobre este registro, neste estado?**

Somente quando todas as condições forem válidas a operação será permitida.

## 34. Pontos ainda pendentes

Ainda não estão definidos:

1. regra exata de configuração de periodicidade alternativa de repasse;
2. provedor fiscal;
3. integração com API de nota fiscal;
4. eventual integração bancária automática;
5. conciliação externa com PIX e cartão;
6. permissões operacionais detalhadas caso existam vários tipos diferentes de recepcionista;
7. eventual criação futura de outros papéis administrativos.

Esses pontos não deverão ser inventados durante implementação.

## 35. Próxima etapa

Depois da aprovação desta matriz, produzir:

**FLUXOS OPERACIONAIS DETALHADOS DO FINANCEIRO**

Incluindo:

1. abrir caixa;
2. receber consulta;
3. pagamento combinado;
4. emitir nota;
5. reagendar;
6. solicitar estorno;
7. aprovar estorno;
8. suprimento;
9. sangria;
10. fechar caixa;
11. aprovar/rejeitar fechamento;
12. gerar repasse;
13. confirmar repasse;
14. ajuste pós-repasse;
15. auditoria e alertas.

Nenhuma implementação deverá começar antes da validação desses fluxos.

## 36. FASE 8 — Permissões da camada de dashboards (preparada localmente)

| Operação | Proprietária ativa | Médico autenticado e vinculado | Recepção / anon |
|---|---|---|---|
| Dashboard administrativo | Próprias clínicas, uma ou consolidado | Negado | Negado |
| Dashboard profissional | Somente se identidade/vínculos médicos satisfizerem a RPC própria | Exclusivamente próprio financeiro | Negado |
| Ler thresholds | SELECT com RLS nas próprias clínicas | Negado | Negado |
| Alterar thresholds | RPC administrativa auditada | Negado | Negado |
| Escrita direta na configuração | Negada | Negada | Negada |

Dashboards exigem usuário e clínica ativos. Médico exige também profissional ativo e interseção dos vínculos ativos profissional-clínica e usuário-clínica com papel medico; identidade ambígua é rejeitada. NULL não significa todas as clínicas do banco. Clínica explícita não autorizada gera `42501`. Helpers novos não são executáveis por clientes. Não houve ampliação das policies de estorno, caixa, fiscal ou auditoria para dar acesso ao médico.

Contrato detalhado: `09-CONTRATO-DASHBOARDS.md`, seções 5–7. Estado: não aplicado; testes preparados, não executados.
