# AUDITORIA DO FINANCEIRO ATUAL

## 1. Resumo executivo

A auditoria somente leitura encontrou dois estados distintos:

- No Supabase real, o Financeiro implantado é um módulo inicial composto apenas por `sessoes_caixa` e `entradas_caixa`, apoiado por pacientes, profissionais, clínicas e agendamentos.
- No repositório existe uma arquitetura financeira muito mais ampla — cobranças, despesas, fechamento, repasses, estornos, idempotência, HMAC e RPCs privadas — porém ela não foi implantada no Supabase real.

O Financeiro atual não atende integralmente ao fluxo aprovado. Os principais bloqueios são:

- recebimento sem vínculo com o agendamento;
- ausência do snapshot histórico da divisão clínica/médico;
- cálculo de repasse inexistente no remoto;
- fechamento, estorno e repasse inexistentes no remoto;
- frontend de escrita ligado a um backend que depende de estruturas privadas não implantadas;
- médicos vinculados à clínica podem ler entradas financeiras de todos os profissionais;
- recepção precisa digitar UUID em estorno e repasse;
- menu Financeiro não possui restrição por papel;
- formas de pagamento adicionais estão expostas;
- valores monetários são tratados como `number` no frontend.

Conclusão: o módulo contém elementos reaproveitáveis, mas o fluxo financeiro operacional deve ser reconstruído de forma compatível com o Supabase principal e com preservação histórica por recebimento.

Nenhum dado clínico ou financeiro foi lido. A auditoria remota consultou somente catálogos e metadados.

## 2. Estrutura atual do banco

### Estruturas implantadas no Supabase real

Todas pertencem ao schema `public`, owner `postgres`, com RLS habilitada.

#### `sessoes_caixa`

Colunas:

- `id uuid`, chave primária;
- `clinica_id uuid`, obrigatório;
- `aberto_por uuid`;
- `valor_abertura numeric(10,2)`;
- `aberto_em timestamptz`;
- `status status_sessao_caixa`;
- `fechado_por uuid`;
- `fechado_em timestamptz`;
- `valor_esperado numeric(10,2)`;
- `valor_contado numeric(10,2)`;
- `diferenca numeric(10,2)`.

Relacionamentos:

- clínica → `clinicas`;
- abertura e fechamento → `usuarios`.

Restrições e índices:

- valor de abertura não negativo;
- chave primária;
- índice parcial único `sessoes_caixa_aberta_unica`, permitindo no máximo um caixa aberto por clínica.

Trigger:

- `trg_audit_sessoes_caixa`, usando `fn_auditoria()`.

O fechamento foi antecipado na estrutura da tabela, mas não existe policy de `UPDATE` nem RPC financeira implantada para executá-lo.

#### `entradas_caixa`

Colunas:

- `id uuid`, chave primária;
- `sessao_caixa_id uuid`;
- `clinica_id uuid`;
- `forma_pagamento forma_pagamento_caixa`;
- `valor numeric(10,2)`;
- `descricao text`;
- `registrado_por uuid`;
- `registrado_em timestamptz`;
- `paciente_id uuid`;
- `profissional_id uuid`.

Relacionamentos:

- sessão → `sessoes_caixa`;
- clínica → `clinicas`;
- paciente → `pacientes`;
- profissional → `profissionais`;
- usuário responsável → `usuarios`.

Restrições e índices:

- valor maior que zero;
- todas as referências usam exclusão restrita;
- somente a chave primária foi encontrada como índice próprio relevante;
- não existe `agendamento_id`;
- não existe entidade de cobrança ou pagamento;
- não existe snapshot de percentuais ou valores da divisão financeira.

Trigger:

- `trg_audit_entradas_caixa`, usando `fn_auditoria()`.

#### Estruturas relacionadas

`profissionais` já possui:

- nome;
- especialidade principal;
- `valor_consulta numeric(10,2)`;
- `taxa_repasse_clinica numeric(5,2)`, padrão 20;
- vínculo opcional com usuário autenticado;
- validações de preço não negativo e percentual entre 0 e 100.

O percentual está armazenado por profissional, não como configuração administrativa da clínica.

`profissionais_clinicas` controla o vínculo ativo entre profissional e clínica, mas não armazena preço ou percentual específico daquele vínculo.

`agendamentos` relaciona clínica, paciente e profissional, com data, horários e status. Não existe ligação física entre `agendamentos` e `entradas_caixa`.

`clinicas` não possui configuração financeira ou percentual da clínica.

### Enums implantados

`status_sessao_caixa`:

- `aberto`;
- `fechado`.

`forma_pagamento_caixa`:

- `dinheiro`;
- `pix`;
- `cartao_debito`;
- `cartao_credito`;
- `transferencia`;
- `convenio`;
- `cortesia`.

As formas atualmente aprovadas são somente dinheiro, PIX e cartão de crédito. Débito, transferência, convênio e cortesia já existem no legado.

### Funções e RPCs financeiras implantadas

Não foram encontradas funções ou RPCs relacionadas a caixa, cobrança, pagamento, recebimento, despesa, estorno ou repasse.

Também não existem no remoto:

- schema `financeiro_privado`;
- role `financeiro_api`;
- role `financeiro_executor`;
- role `financeiro_vault_guard`.

### Estruturas existentes somente no repositório

Os arquivos `financeiro_fundacao.sql`, `financeiro_api_privada.sql` e `financeiro_bloqueio_postgrest.sql` descrevem uma arquitetura não implantada contendo:

- cobranças;
- despesas;
- movimentos de caixa;
- fechamentos e totais;
- repasses e itens;
- pagamentos de repasse;
- estornos;
- ajustes futuros;
- idempotência;
- roles técnicas;
- HMAC com chave no Vault;
- dez funções privadas.

Essa arquitetura não representa o estado atual do Supabase.

Além disso, o rascunho calcula o percentual no fechamento consultando o valor atual de `profissionais.taxa_repasse_clinica`. Portanto, se o percentual mudar entre o recebimento e o fechamento, o histórico pode ser calculado pela regra nova. Isso viola o requisito de snapshot no momento do recebimento.

## 3. Frontend financeiro existente

| Arquivo | Finalidade e dados | Chamadas | Problemas | Reaproveitamento |
|---|---|---|---|---|
| `src/pages/Financeiro.tsx` | Tela de abertura, sessão atual, formulário e lista de entradas | Leitura direta do Supabase; abertura pelo backend | Sem controle por papel; mistura leitura legada com escrita da arquitetura não implantada; erros das leituras são ignorados; total usa `number` | Estrutura visual pode ser adaptada |
| `src/components/financeiro/FormRegistrarEntrada.tsx` | Seleção visual de paciente, profissional, forma e valor | `POST /api/caixa/entrada` | Expõe sete formas; valor pode ser alterado sem regra explícita; não mostra especialidade/consulta; usa ponto flutuante | Seletores e preenchimento pelo preço do médico são reaproveitáveis |
| `src/hooks/useSessaoCaixaAberta.ts` | Busca o caixa aberto da clínica | `sessoes_caixa` via Supabase | Descarta erro; resposta antiga pode sobrescrever estado após troca de clínica | Consulta conceitualmente reaproveitável |
| `src/hooks/useEntradasCaixa.ts` | Lista entradas com paciente e profissional | `entradas_caixa`, pacientes e profissionais | Descarta erro; não restringe visão por profissional; não traz consulta, divisão ou estorno | Precisa ser substituída pelo contrato financeiro definitivo |
| `src/components/financeiro/AcoesFinanceiras.tsx` | Sangria, suprimento, despesa, fechamento, estorno e pagamento de repasse | Backend Fastify | Funcionalidades não existem no remoto; estorno e repasse exigem UUID; formulário é limpo mesmo após falha; sem listagens para seleção | Layout parcial pode ser reaproveitado |
| `src/pages/Agenda.tsx` | Ao concluir agendamento, abre o formulário financeiro preenchido | Reutiliza `FormRegistrarEntrada` | Boa integração visual, mas o recebimento remoto não preserva `agendamento_id`; depende do backend indisponível | Ponto de entrada deve ser reaproveitado |
| `src/pages/cadastros/Profissionais.tsx` | Cadastra e edita preço e percentual por profissional | Supabase/RPC de cadastro | Preço atende ao requisito; percentual está modelado por profissional, não claramente como configuração da clínica | Preço é reaproveitável; percentual precisa de decisão/adaptação |
| `src/pages/Dashboard.tsx` | Cards e resumo por profissional | Dados fixos | Valores financeiros e repasses são placeholders, incluindo percentual fixo de 20% | Apenas apresentação visual |
| `src/components/shell/Sidebar.tsx` e `src/App.tsx` | Navegação para Financeiro | Renderização local | Financeiro aparece e pode ser aberto por qualquer papel | Deve ser corrigido |

Não foram encontrados relatórios financeiros funcionais, visão dedicada do médico, tela de configuração financeira da clínica ou listagens reais de repasses e estornos.

## 4. Backend financeiro existente

Existe um servidor Fastify com endpoints para:

- abrir caixa;
- registrar sangria e suprimento;
- fechar caixa;
- registrar e receber cobrança;
- registrar e pagar despesa;
- registrar estorno;
- pagar repasse integral.

Aspectos positivos:

- valida token com Supabase Auth;
- resolve a clínica ativa usando o token do usuário;
- exige chave de idempotência;
- normaliza payloads;
- usa consultas parametrizadas;
- não usa `service_role`;
- não retorna detalhes brutos do PostgreSQL;
- gera asserções HMAC com expiração curta;
- prevê role PostgreSQL limitada.

Estado real:

- `FINANCEIRO_DATABASE_URL` e `FINANCEIRO_ASSERTION_HMAC_KEY` não estão configuradas;
- schema, roles e funções privadas correspondentes não existem no remoto;
- operações financeiras retornariam indisponibilidade controlada;
- o frontend lê as tabelas legadas, enquanto o backend espera cobranças, repasses e demais estruturas inexistentes.

`FINANCEIRO_DATABASE_URL` não representa obrigatoriamente um banco financeiro separado: o código espera uma conexão PostgreSQL direta, idealmente com a role limitada `financeiro_api`, podendo apontar para o próprio Supabase principal. Entretanto, cria dependência operacional de:

- serviço Fastify ativo;
- conexão PostgreSQL direta;
- usuário técnico;
- HMAC compartilhado;
- chave correspondente no Vault;
- funções privadas instaladas.

Portanto, a arquitetura atual depende de um serviço intermediário e de infraestrutura privada inexistente, embora não exija conceitualmente um segundo banco.

## 5. Segurança e permissões atuais

Pontos presentes:

- RLS está habilitada nas duas tabelas;
- inserção exige usuário autenticado, vínculo com a clínica ativa e papel de proprietária ou recepção;
- entrada valida sessão aberta, paciente da clínica e profissional ativo na clínica;
- não existem policies normais de `UPDATE` ou `DELETE` para entradas;
- triggers de auditoria estão instalados;
- isolamento por clínica está presente nas condições de RLS.

Problemas:

- `entradas_caixa_select` permite leitura para qualquer usuário vinculado à clínica, sem restringir médico ao próprio movimento;
- `sessoes_caixa_select` também permite leitura a qualquer vinculado;
- grants de tabela são excessivamente amplos para `anon`, `authenticated` e `service_role`, incluindo operações que posteriormente dependem apenas da RLS para serem bloqueadas;
- a fronteira backend-only prevista no repositório não está implantada;
- usuários autenticados autorizados ainda podem inserir diretamente nas tabelas legadas;
- o frontend não restringe menu ou rota por papel;
- o resolvedor de clínica do backend confirma acesso à clínica, mas a autorização financeira específica dependeria das funções privadas inexistentes.

## 6. Caixa atual

O banco permite representar abertura e manter um único caixa aberto por clínica.

Não existe procedimento remoto implantado para:

- fechar caixa;
- calcular dinheiro esperado;
- consolidar PIX e cartão;
- calcular participação da clínica;
- calcular valores por médico;
- gerar repasses;
- preservar fechamento diário detalhado.

A tela consegue consultar um caixa aberto, mas sua tentativa de abertura passa pelo backend indisponível. O caixa atual não é operacional de ponta a ponta.

## 7. Recebimentos atuais

O legado registra:

- clínica;
- sessão;
- paciente;
- profissional;
- forma;
- valor;
- descrição;
- usuário;
- data e hora.

Isso preserva parte importante da autoria e contexto.

Não registra:

- agendamento/consulta;
- preço configurado apresentado;
- eventual diferença entre preço e valor confirmado;
- percentual da clínica usado;
- valor da clínica;
- percentual ou critério do médico;
- valor do médico;
- estado formal do pagamento;
- vínculo com estorno;
- regra financeira versionada.

A Agenda já entrega `agendamento_id` ao frontend, mas a tabela implantada não possui essa coluna. O backend não consegue completar o fluxo porque espera estruturas não implantadas.

## 8. Repasses atuais

Não existem tabelas, funções, RPCs ou telas operacionais de repasse no Supabase real.

O SQL local não implantado propõe:

- geração no fechamento;
- agrupamento por profissional;
- percentual da clínica e do profissional;
- itens por entrada;
- pagamento integral;
- ajustes futuros para estornos posteriores.

A proposta contém conceitos úteis, mas calcula os repasses usando o percentual vigente no cadastro do profissional no momento do fechamento, e não um snapshot capturado no recebimento.

A interface atual solicita que a recepção digite o UUID do repasse, contrariando diretamente o fluxo aprovado.

## 9. Estornos atuais

Não existe estrutura de estorno implantada no remoto.

As entradas não possuem policy normal de atualização ou exclusão, o que ajuda a preservar o registro original, mas não oferece um fluxo formal de correção.

O rascunho local prevê estorno compensatório e ajustes futuros, preservando a origem. Porém:

- não está implantado;
- a tela exige UUID do lançamento;
- não há seleção visual;
- não está definida a autoridade necessária;
- não está decidido se haverá estorno parcial;
- a influência sobre valores da clínica também precisa ser explicitamente preservada.

## 10. Configurações financeiras atuais

Configurações existentes:

- `valor_consulta` por profissional;
- `taxa_repasse_clinica` por profissional, padrão 20%.

Não existe:

- configuração financeira por clínica;
- vigência da configuração;
- histórico de alteração;
- snapshot no recebimento;
- configuração administrativa dedicada;
- regra explícita para eventual preço diferente do cadastrado.

O preço do médico já pode ser administrado pela proprietária e é apresentado automaticamente no formulário. Essa parte está próxima do requisito aprovado.

## 11. O que atende ao novo fluxo

- Paciente, profissional e clínica já possuem vínculos estruturados.
- O agendamento já relaciona paciente e profissional.
- Cada profissional pode ter preço próprio.
- A proprietária pode editar o preço.
- A Agenda já abre o formulário de recebimento com paciente e profissional preenchidos.
- A seleção normal de paciente e médico é visual.
- O preço configurado é preenchido automaticamente.
- Dinheiro, PIX e cartão de crédito já existem no enum.
- Entradas preservam usuário, clínica, paciente, profissional, valor, forma e horário.
- Existe restrição de um caixa aberto por clínica.
- Existem RLS e auditoria.
- Não existe exclusão normal de entrada pela interface.
- O backend contém boas ideias isoladas de autenticação, idempotência, parametrização e sanitização de erros.

## 12. O que está incompatível

- O recebimento não fica vinculado à consulta/agendamento no banco implantado.
- Não há snapshot histórico da divisão clínica/médico.
- O percentual é lido do cadastro somente posteriormente no rascunho de fechamento.
- O percentual está por profissional, enquanto o requisito descreve configuração administrativa da clínica.
- Não há cálculo automático implantado de 20%/80%.
- Não há visão financeira do médico.
- O médico pode ler entradas de outros profissionais na mesma clínica.
- Não há visão operacional completa da proprietária.
- Não há fechamento diário real.
- Não há repasse implantado.
- Não há estorno implantado.
- A recepção precisa digitar UUID em ações avançadas.
- O frontend oferece formas de pagamento ainda não aprovadas.
- Leituras financeiras podem exibir falha como lista vazia.
- Formulários avançados são limpos mesmo quando a requisição falha.
- Valores monetários são enviados, somados e formatados como ponto flutuante JavaScript.
- A interface mistura leitura do modelo legado e escrita para um modelo futuro inexistente.
- Dashboard financeiro é demonstrativo, não real.
- A infraestrutura privada antiga não está configurada nem implantada.

## 13. Matriz

| Item atual | Situação | Ação sugerida | Motivo |
|---|---|---|---|
| Cadastro de preço por profissional | REAPROVEITAR | Manter como origem do preço exibido | Atende preços diferentes por médico |
| Edição de preço pela proprietária | REAPROVEITAR | Preservar controle administrativo | Compatível com a regra aprovada |
| `taxa_repasse_clinica` por profissional | ADAPTAR | Alinhar com a configuração administrativa definida | Não está claro se a taxa é global ou individual |
| Valor padrão 20 no banco | ADAPTAR | Tratar como configuração inicial, não regra histórica | O padrão não substitui snapshot |
| Integração Agenda → formulário | REAPROVEITAR | Preservar o ponto de entrada | Já entrega paciente, profissional e agendamento |
| Seletores de paciente/profissional | REAPROVEITAR | Ampliar com especialidade e consulta | Evita digitação de IDs |
| `sessoes_caixa` | ADAPTAR | Evoluir para fechamento e consolidação real | Abertura está modelada; restante está incompleto |
| Índice de caixa aberto único | REAPROVEITAR | Manter a garantia | Protege contra sessões simultâneas |
| `entradas_caixa` | ADAPTAR | Tornar o recebimento historicamente completo | Faltam consulta e snapshot financeiro |
| Enum com sete formas | CORRIGIR | Restringir a interface inicial às três aprovadas | Há modalidades ainda não aprovadas |
| Auditoria das tabelas | REAPROVEITAR | Preservar e validar no novo fluxo | Registra mutações |
| Imutabilidade por ausência de update/delete | REAPROVEITAR | Manter correção por evento compensatório | Compatível com preservação histórica |
| Leitura financeira por qualquer vinculado | CORRIGIR | Aplicar visões por papel e profissional | Expõe dados de outros médicos |
| Grants amplos das tabelas | CORRIGIR | Reduzir à superfície necessária | Privilégios excedem o uso esperado |
| Menu/rota Financeiro | CORRIGIR | Restringir por papel | Atualmente visível a todos |
| Hooks de leitura direta | CORRIGIR | Tratar erros e respostas obsoletas | Falhas podem parecer ausência de dados |
| Totalização com `number` | CORRIGIR | Usar representação monetária segura | Ponto flutuante pode produzir divergências |
| Formulário de recebimento | ADAPTAR | Vincular consulta e aplicar regra histórica | A base visual é útil, o contrato é insuficiente |
| Cobranças do SQL local | ADAPTAR | Revisar antes de qualquer implantação | Conceito útil, mas sem snapshot da divisão |
| Cálculo de repasse no fechamento | SUBSTITUIR | Calcular a partir do snapshot do recebimento | Percentual atual pode alterar resultado histórico |
| Tabelas de repasse locais | ADAPTAR | Manter rastreabilidade por item | Não estão implantadas e dependem do cálculo incorreto |
| Estorno compensatório local | ADAPTAR | Manter origem e incluir todos os impactos históricos | Conceito correto, fluxo e autorização incompletos |
| Campo UUID de estorno | SUBSTITUIR | Usar busca e seleção visual do lançamento | Recepção não deve conhecer IDs |
| Campo UUID de repasse | SUBSTITUIR | Usar lista visual de repasses elegíveis | Viola o fluxo operacional |
| Fechamento diário completo | CRIAR | Definir totais bruto, clínica e médicos | Não existe no remoto |
| Snapshot no recebimento | CRIAR | Preservar regra e valores daquele momento | Requisito central inexistente |
| Visão própria do médico | CRIAR | Exibir somente produção e repasses próprios | Não existe |
| Visão consolidada da proprietária | CRIAR | Consolidar recebimentos, caixa, estornos e repasses | Não existe funcionalmente |
| Configuração financeira da clínica | CRIAR | Registrar percentual e vigência | Não existe |
| Liquidação do repasse | DEPENDE DE DECISÃO | Definir processo antes da modelagem | Regra foi intencionalmente adiada |
| Serviço Fastify/HMAC | DEPENDE DE DECISÃO | Decidir se continuará como fronteira de escrita | Adiciona infraestrutura e hoje está inoperante |
| Suporte a pagamentos combinados | DEPENDE DE DECISÃO | Confirmar necessidade | Backend antigo aceita múltiplos itens, regra atual não define |
| Desconto ou alteração do preço na recepção | DEPENDE DE DECISÃO | Definir autorização e justificativa | O formulário permite alterar livremente |

## 14. Riscos encontrados

- Exposição entre profissionais: médico vinculado pode consultar entradas de toda a clínica.
- Perda de fidelidade histórica: alteração de percentual antes do fechamento mudaria o cálculo proposto.
- Recebimentos sem consulta: não é possível provar qual agendamento originou uma entrada.
- Interface aparentemente funcional com backend efetivamente indisponível.
- Mistura de contratos: leitura usa o legado implantado e escrita espera o modelo futuro.
- Privilégios de tabela excessivos.
- Operações por UUID sujeitas a erro humano.
- Modalidades financeiras não aprovadas disponíveis ao usuário.
- Erros de leitura mascarados como listas vazias.
- Arredondamento monetário no frontend.
- Formulários apagados após falha.
- Dashboard com números demonstrativos que podem ser confundidos com dados reais.
- Ausência de índice de consulta por clínica, sessão, profissional e data em `entradas_caixa`.
- Arquitetura local extensa ainda não validada contra os requisitos recém-aprovados.

## 15. Perguntas que ainda precisam ser respondidas pelo proprietário

1. O percentual da clínica será único por clínica ou poderá variar por profissional?
2. A recepção pode alterar o preço configurado pelo médico? Se puder, quem autoriza e qual justificativa deve ser registrada?
3. O pagamento precisa ser integral ou poderá ser dividido entre formas?
4. Uma cobrança pode ficar pendente ou o primeiro fluxo aceitará apenas pagamento confirmado?
5. Em qual estado do agendamento o recebimento pode ser confirmado?
6. O fechamento contará somente dinheiro físico ou também conciliará PIX e cartão?
7. Qual será a periodicidade e o evento de geração dos repasses?
8. Repasse será sempre integral ou poderá ser parcial?
9. Quais papéis poderão aprovar estorno e pagamento de repasse?
10. Estorno poderá ser parcial?
11. Como tratar registros legados de débito, transferência, convênio e cortesia?
12. Qual contexto mínimo do paciente poderá aparecer na visão do médico?

## 16. Próximo passo recomendado

Produzir uma especificação funcional e de segurança do Financeiro, resolvendo as decisões pendentes e definindo os contratos de recebimento, snapshot histórico, fechamento, estorno e repasse antes de desenhar qualquer migration ou implementação.
