# CLÍNICA PATRÍCIA
# DOCUMENTO FUNCIONAL MESTRE — FINANCEIRO

**Versão:** 1.0
**Status:** APROVADO
**Data de aprovação:** 20/09/2026

## 1. Objetivo do novo Financeiro

O Financeiro da Clínica Patrícia deverá ser um módulo profissional, simples para a recepção, transparente para os médicos e altamente auditável pela proprietária.

Fluxo principal:

**Agendamento → Recepção → Pagamento → Caixa → Atendimento → Nota Fiscal → Repasse → Auditoria → Relatórios**

O Financeiro deverá operar integrado à Agenda e ao cadastro dos pacientes e profissionais.

A interface não deverá expor UUIDs, IDs internos ou detalhes técnicos aos usuários.

## 2. Estrutura multi-clínica

Cada clínica possui de forma independente:

- CNPJ próprio;
- conta bancária/PIX próprios;
- maquininha de cartão própria;
- caixa próprio;
- movimentações financeiras próprias;
- emissão fiscal própria;
- percentual financeiro próprio.

Os registros financeiros de uma clínica não podem ser misturados com outra unidade.

A proprietária poderá visualizar:

1. cada clínica individualmente;
2. todas as clínicas em uma visão consolidada.

A visão consolidada não altera a origem dos registros.

## 3. Médico e valor da consulta

Cada médico possui nome, especialidade, vínculo com uma ou mais clínicas e valor de consulta.

O valor é definido pelo médico, mas cadastrado e administrado pela proprietária.

O mesmo médico pode possuir valores diferentes em clínicas diferentes.

Somente a proprietária/administradora pode alterar o valor da consulta.

Alterações de preço nunca modificam consultas já pagas.

## 4. Participação financeira da clínica

O percentual de referência atual é 20% para a clínica e 80% para o médico.

O percentual é configurado por clínica e não por médico.

Somente a proprietária pode alterá-lo.

Cada recebimento deve preservar historicamente:

- valor da consulta;
- percentual da clínica;
- valor da clínica;
- valor do médico.

Mudanças futuras nunca recalculam o passado.

## 5. Momento do pagamento

A consulta deve ser paga antes de o paciente entrar para o atendimento.

Fluxo:

1. paciente chega;
2. recepção identifica o agendamento;
3. sistema apresenta paciente, médico, especialidade e preço;
4. recepção confirma o pagamento;
5. Financeiro registra;
6. paciente segue para atendimento.

## 6. Quitação

A consulta deve ficar 100% paga no momento do atendimento.

Não haverá, nesta primeira versão:

- saldo pendente de consulta comum;
- pagamento parcial para data posterior;
- contas a receber do paciente para consulta comum.

## 7. Formas de pagamento

Inicialmente:

- dinheiro;
- PIX;
- cartão de crédito.

As formas são as mesmas em todas as clínicas.

## 8. Pagamento combinado

Uma consulta pode ser paga usando mais de uma forma.

Exemplo:

- R$ 200 em dinheiro;
- R$ 200 em PIX.

É uma única consulta quitada, mas cada componente fica registrado separadamente.

A soma deve atingir o valor integral.

## 9. Cartão de crédito

O sistema registra somente o valor normal da consulta e a forma `cartão de crédito`.

Taxas/acréscimos cobrados diretamente na maquininha não entram no Financeiro.

A divisão clínica/médico incide apenas sobre o valor normal da consulta.

## 10. Caixa — abertura

Podem abrir o caixa:

- recepcionista;
- proprietária.

Registrar:

- clínica;
- usuário;
- data/hora;
- saldo inicial.

O saldo inicial pode ser R$ 0,00 ou qualquer valor real disponível para troco.

Saldo inicial não é receita.

## 11. Suprimento

Pode existir entrada extra de dinheiro para troco.

Registrar separadamente da receita:

- valor;
- motivo;
- clínica;
- usuário;
- data/hora.

## 12. Sangria / retirada

Pode existir retirada de dinheiro durante o expediente.

Fluxo:

1. recepção solicita;
2. informa valor;
3. informa motivo;
4. proprietária analisa;
5. proprietária aprova;
6. retirada é registrada;
7. caixa é atualizado.

Tudo auditado.

## 13. Fechamento

Duas etapas:

### Etapa 1 — Recepção

Faz fechamento operacional e conferência.

### Etapa 2 — Proprietária

Pode:

- aprovar;
- aprovar com observação;
- rejeitar;
- devolver para correção.

Fluxo:

**Recepção fecha → Proprietária revisa → Aprova ou devolve → Correção → Nova revisão**

## 14. Divergência de caixa

Comparar valor esperado × valor contado.

Se houver diferença em dinheiro físico, a recepção deve justificar obrigatoriamente.

Registrar:

- esperado;
- contado;
- diferença;
- falta/sobra;
- justificativa;
- responsável;
- data/hora;
- decisão da proprietária.

## 15. Conciliação do fechamento

Mostrar separadamente:

- dinheiro;
- PIX;
- cartão;
- total geral;
- valor bruto;
- participação da clínica;
- participação dos médicos;
- estornos;
- repasses;
- repasses pendentes;
- divergências.

Usar indicadores, tabelas, gráficos e detalhamento.

## 16. Repasses

Calcular:

- produção bruta;
- parte da clínica;
- valor líquido do médico;
- valor já repassado;
- valor pendente.

Padrão: repasse diário após o fechamento do expediente.

Também permitir modalidade semanal ou mensal quando necessário.

## 17. Confirmação de repasse

Quando Patrícia fizer PIX/transferência ao médico, deverá existir ação de `Confirmar repasse`.

Registrar:

- médico;
- clínica;
- valor;
- período;
- data/hora;
- usuário responsável;
- valores quitados.

Distinguir claramente:

**Gerado → Devido → Pago → Pendente**

## 18. Dashboard do médico

O médico vê apenas o próprio financeiro:

- consultas;
- nome do paciente;
- valor de cada consulta;
- valor bruto;
- percentual da clínica;
- parte da clínica;
- valor líquido;
- repasses pagos;
- repasses pendentes.

Não vê outros médicos, caixa geral ou auditoria administrativa.

## 19. Exportação do médico

Pode exportar o próprio financeiro em:

- PDF;
- Excel.

## 20. Estorno

Pode ser total ou parcial.

Recepção solicita e informa motivo/valor.

Somente a proprietária aprova e efetiva.

O pagamento original nunca é apagado.

Na primeira versão, o estorno deve respeitar as formas de pagamento existentes no recebimento original. A soma histórica dos estornos em cada forma nunca pode ultrapassar o valor originalmente pago naquela mesma forma.

Não é permitida conversão automática entre dinheiro, PIX e cartão. Um reembolso por meio diferente do pagamento original será uma operação futura própria, expressamente aprovada e auditada.

## 21. Estorno e repasse

Antes do repasse: ajustar o valor líquido antes do pagamento.

Depois de repasse já confirmado: gerar ajuste negativo e descontar automaticamente do próximo repasse.

Enquanto o repasse estiver `pendente`, as aplicações de ajustes sobre ele são alocações provisórias. Um estorno efetivado antes da liquidação deve registrar integralmente seu impacto na produção e rebalancear as aplicações quando necessário, desfazendo primeiro a aplicação mais recente. O excedente devolvido reabre o saldo do ajuste antigo para repasses futuros. Repasse `pago` ou `ajustado` é terminal: suas aplicações não podem ser alteradas, e novo estorno gera ajuste negativo futuro.

Se o ajuste exceder um único repasse futuro, o saldo permanece pendente e é compensado, em ordem, nos repasses seguintes até sua aplicação integral. A confirmação do repasse apenas registra o PIX ou a transferência feita externamente e não movimenta o caixa da clínica.

Manter vínculo com o estorno original.

## 22. Cancelamento de consulta paga

Segue o mesmo fluxo de estorno.

## 23. Falta / no-show

A proprietária decide entre:

- manter a cobrança;
- estornar parcial ou totalmente.

Tudo auditado.

## 24. Reagendamento — mesmo médico

Pagamento continua válido.

Não criar novo recebimento.

Transferir vínculo ao novo agendamento e preservar histórico.

## 25. Reagendamento — outro médico

### Mesmo valor
Pagamento acompanha o novo agendamento.

### Valor maior
Cobrar apenas a diferença.

### Valor menor
Diferença segue fluxo de estorno com aprovação.

## 26. Nota fiscal

Emitida pela própria Clínica Patrícia.

Vinculada a:

- clínica;
- paciente;
- consulta;
- recebimento;
- valor.

A nota usa obrigatoriamente o CNPJ da clínica onde ocorreu o atendimento.

## 27. Momento da emissão fiscal

A nota não precisa ser emitida imediatamente.

Fluxo:

**Pagamento confirmado → Nota pendente → Emissão posterior**

## 28. Fila de notas pendentes

Deve existir lista com:

- paciente;
- médico;
- clínica;
- consulta;
- data;
- valor;
- forma;
- status fiscal.

## 29. Emissão e cancelamento fiscal

Recepção e proprietária podem emitir e cancelar nota fiscal.

Toda ação deve ser auditada.

Cancelamento registra:

- usuário;
- data/hora;
- clínica;
- paciente;
- consulta;
- valor;
- motivo;
- status anterior;
- status novo.

A emissão e o cancelamento possuem solicitações e resultados separados. Solicitar emissão não marca o documento como emitido; solicitar cancelamento não marca o documento como cancelado. Os estados fiscais são `pendente`, `emissao_solicitada`, `emitida`, `erro_emissao`, `cancelamento_solicitado`, `cancelada` e `erro_cancelamento`. O provedor/API ainda não foi definido e não deve ser inventado.

Resultados fiscais são correlacionados à tentativa que originou a integração. Uma única tentativa de cada tipo pode estar ativa por documento; cada retry preserva a tentativa anterior. Respostas obsoletas não alteram o estado atual, e a repetição idêntica do resultado da mesma tentativa não duplica transição, auditoria ou histórico. Resultado conflitante para tentativa finalizada deve ser rejeitado.

## 30. Auditoria da recepção

Todas as ações financeiras da recepção geram auditoria.

Inclui:

- abertura;
- recebimento;
- pagamento combinado;
- suprimento;
- solicitação de sangria;
- fechamento;
- justificativa;
- solicitação de estorno;
- emissão/cancelamento fiscal;
- reagendamentos com impacto financeiro;
- demais ações permitidas.

A auditoria deve responder:

**Quem fez? O quê? Quando? Em qual clínica? Sobre qual registro? Qual valor? O que mudou? Por quê?**

## 31. Acesso à auditoria

Proprietária: acesso completo.

Recepção: apenas resultado/registro das próprias ações quando necessário.

Médico: sem acesso à auditoria administrativa.

## 32. Dashboard da proprietária

Dois modos:

- por clínica;
- consolidado.

## 33. Comparação entre clínicas

Comparar:

- faturamento;
- consultas;
- ticket médio;
- dinheiro;
- PIX;
- cartão;
- participação da clínica;
- repasses;
- estornos;
- divergências;
- notas emitidas;
- notas pendentes.

Usar cards, gráficos, tabelas e filtros.

## 34. Painel de Controle e Auditoria

Dashboard da proprietária também será painel de controle e auditoria.

Alertas possíveis:

- diferença de caixa;
- fechamento aguardando aprovação;
- estorno aguardando aprovação;
- repasse pendente;
- nota pendente;
- divergência entre unidades;
- movimentação atípica.

Cada alerta deve ser clicável e rastreável.

## 35. Prioridade dos alertas

- Informativo;
- Atenção;
- Crítico.

Mostrar:

- situação;
- clínica;
- valores;
- usuários;
- data/hora;
- histórico;
- ação pendente.

## 36. Alertas externos

Nesta primeira versão, somente dentro do sistema.

Sem WhatsApp, e-mail, SMS ou push externo.

## 37. Parâmetros de auditoria

Critérios de alerta configuráveis pela proprietária.

Exemplos:

- limite de diferença de caixa;
- valor de estorno relevante;
- quantidade de estornos;
- prazo de repasse pendente;
- outros limites.

Toda mudança é auditada.

## 38. Relatórios da proprietária

Exportação em PDF e Excel.

Incluindo:

- fechamento;
- recebimentos;
- médicos;
- repasses;
- estornos;
- formas de pagamento;
- notas fiscais;
- auditoria;
- comparativo entre clínicas.

## 39. Filtros

A proprietária pode filtrar por:

- período;
- clínica;
- médico;
- paciente;
- forma de pagamento;
- status financeiro;
- status de repasse;
- status fiscal;
- situação do caixa.

Aplicável a dashboards, tabelas, relatórios e exportações.

## 40. Histórico

Operações confirmadas não são apagadas.

Preferir:

- registro original;
- ajuste;
- estorno;
- complemento;
- mudança de estado;
- novo evento.

## 41. Precisão monetária

Não usar `float` binário como regra financeira.

No PostgreSQL usar `numeric/decimal`.

Frontend deverá usar estratégia segura de valor monetário.

## 42. Proteção contra duplicidade

Impedir:

- cobrança dupla;
- recebimento duplicado;
- estorno duplicado;
- fechamento duplicado;
- repasse duplicado.

A arquitetura deverá tratar idempotência, constraints, transações, estados e concorrência.

## 43. Segurança

Permissão visual não é segurança suficiente.

As regras também existirão no banco/backend.

Garantir:

- isolamento por clínica;
- isolamento por médico;
- RLS;
- autorização por papel;
- operações críticas controladas;
- ausência de `service_role` no frontend.

## 44. UX

Usuários não digitam:

- UUID;
- ID interno;
- ID de paciente;
- ID de profissional;
- ID de caixa;
- ID de lançamento;
- ID de repasse.

Trabalham com:

- paciente;
- médico;
- especialidade;
- clínica;
- consulta;
- data;
- valor;
- forma;
- status.

## 45. Questões ainda não definidas

Não inventar:

1. provedor de nota fiscal;
2. API fiscal;
3. regra exata da periodicidade alternativa de repasse;
4. integração automática com banco/PIX/maquininha;
5. conciliação bancária externa;
6. convênios;
7. contas a pagar administrativas;
8. despesas completas;
9. fornecedores;
10. folha;
11. impostos;
12. fluxo entre clínicas quando o paciente reagendar para outra unidade;
13. cartão de débito;
14. número máximo de caixas simultâneos como regra funcional definitiva.

## 46. Fora do escopo de implementação agora

Este documento não autoriza:

- migration;
- alteração de banco;
- alteração de frontend;
- alteração de backend;
- apagar tabelas;
- implantar HMAC;
- criar banco paralelo;
- criar VPS;
- implementação automática.

## 47. Próxima fase

Após este documento:

1. matriz de papéis e permissões;
2. fluxos operacionais;
3. estados;
4. arquitetura funcional;
5. modelo de domínio;
6. modelo de dados;
7. aproveitamento do banco existente;
8. contratos;
9. wireframes;
10. design system;
11. plano técnico;
12. só depois migrations e implementação.

## 48. Regra principal

**Simplicidade para quem trabalha, transparência para o médico e controle total para a proprietária.**

A recepção opera.

O médico acompanha o que é dele.

A proprietária controla, aprova, compara e audita.

O sistema preserva a história de tudo.

## 49. FASE 8 — Camada de dados dos dashboards

Pedido aprovado nesta etapa: preparar somente leitura segura, indicadores e configuração auditada de alertas; não aplicar SQL nem construir frontend. Proprietária consolida exclusivamente clínicas com vínculo ativo. Médico é identificado internamente por sua conta, sem parâmetro para escolher outro profissional.

Produção deriva de snapshots históricos; líquido atual da coorte desconta todos os seus estornos efetivados, inclusive tardios. Estornos efetivados no período constituem métrica separada e podem ter origem em produção anterior. Pagamentos vêm dos componentes. Repasses seguem snapshots da FASE 6, distinguindo aplicações provisórias de compensações terminais. Estoque negativo atual não é descontado novamente da produção líquida. Fiscal preserva os sete estados e caixa exclui legado incompatível.

Definições exatas e proposta técnica dos domínios dos filtros estão em `09-CONTRATO-DASHBOARDS.md`, seções 1–7. Este contrato deve ser revisado junto da migration antes da aplicação; nenhum frontend futuro poderá trocar fórmulas ou presumir filtros globais não definidos. Configuração inicia com thresholds NULL, somente proprietária altera, toda mudança é auditada; alertas são calculados e rastreáveis, não persistidos como saldo.

### Revisão da FASE 8 — semântica aprovada para validação

Forma de pagamento seleciona a coorte por componente, sem repartir nem duplicar snapshots do recebimento. Repasses distinguem eventos gerados (`gerado_em`), pagamentos confirmados (`confirmado_em`) e posição atual pendente; ajustes distinguem aplicações no período de saldo atual positivo ainda devido. Caixa distingue situação operacional atual de caixas aprovados por `fechado_em`, sempre usando somente a última tentativa. Alertas operacionais são atuais; somente o percentual de estornos é dependente da coorte/intervalo. A regra detalhada, ainda aguardando aplicação, prevalece no documento 09.

### FASE 10B — Primeiro fluxo visual aprovado (22/09/2026)

Entrada operacional: Agenda → consulta → Receber pagamento → formas → revisão → confirmação. Proprietária e recepção podem operar; médico não recebe ação de cobrança. Paciente/profissional/clínica/data/horário vêm do agendamento e não são digitados; preço do vínculo profissional–clínica é somente leitura. Dinheiro, PIX e cartão de crédito podem compor split integral. A UI compara centavos para UX e o banco valida oficialmente preço, autorização, caixa e integridade.

O sucesso apresenta valor recebido, parcelas clínica/profissional, componentes e estados de recebimento/fiscal retornados pela RPC. Nunca calcula snapshots nem presume emissão fiscal. Pagamento não altera estado clínico. Caixa inexistente ou legado gera orientação e bloqueio, sem conversão ou encerramento automático.

Limite técnico atual do contrato aplicado: novo recebimento somente nos estados agendado, confirmado ou aguardando. A primeira UI segue esse contrato; não cria cobrança após início/conclusão nem muda status para contorná-lo. Detalhes da implementação e evidências locais em `11-MIGRACAO-FRONTEND.md`.

### FASE 10C — Fonte oficial do resumo operacional

Na etapa inicial, foi autorizada somente a preparação local da RPC de leitura por sessão do novo Financeiro. Resumo oficial reutiliza cálculo bancário homologado e explicita estornos em dinheiro; a UI não recompõe saldo. Proprietária/recepção com usuário, clínica e vínculo ativos podem consultar; médico não. Sessão com entradas legadas é incompatível e permanece intocável. Decisão e contrato na seção 14 do documento 11. A aplicação foi autorizada posteriormente; a UI ainda está pendente.

Atualização de execução (22/09/2026): o usuário autorizou especificamente a aplicação da migration `20260922181438_financeiro_fase10c_resumo_caixa.sql`, SHA-256 `153738A292F4EF10CDE775D84C8D2E976122CBEF7BD3B28D7D2CCD7CC4075F8E`. A RPC foi aplicada e validada no projeto `xftnkusbyqzyvzrovroj`; a decisão funcional acima permanece a mesma. A interface operacional do caixa foi integrada localmente após a validação do banco, sem alterar esta migration ou o legado. O E2E autenticado remoto ainda está pendente. Evidências nos checkpoints 33–34 e no documento 11, seções 14–15.
