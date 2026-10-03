# DECISÃO ARQUITETURAL — IBITIARA COMO LABORATÓRIO EXTERNO

> **Status:** decisão aprovada em 12/08/2026; efeitos no banco ainda não executados.
> **Referência canônica:** em caso de divergência sobre Ibitiara, este documento
> prevalece sobre descrições de estado futuro espalhadas pelos demais documentos.
> Registros históricos continuam válidos como relato do estado existente na data
> em que foram escritos.

## Contexto

O sistema Clínica Patrícia foi inicialmente concebido e testado como um
multi-tenant com três clínicas: Brotas, Ipupiara e Ibitiara. Durante esse período,
Ibitiara existiu como linha de `clinicas`, participou do seletor, recebeu vínculos
em `usuarios_clinicas` e foi usada em testes reais de isolamento, tema,
autenticação e autorização.

Em 12/08/2026 foi esclarecido que a unidade de Ibitiara não é uma clínica
operacional. Ela é um laboratório de exames, com CNPJ e sistema próprios. A
arquitetura precisa representar essa realidade sem apagar o histórico técnico e
sem misturar os dados jurídicos, assistenciais ou financeiros das clínicas com os
do laboratório.

## Decisão

1. O sistema Clínica Patrícia terá somente duas clínicas operacionais: **Brotas**
   e **Ipupiara**.
2. Ibitiara deixa de ser tenant operacional do sistema das clínicas.
3. O registro histórico de Ibitiara em `clinicas` será preservado e, após plano
   aprovado e validação em ambiente seguro, marcado como `ativo = false`.
4. Nenhum dado histórico relacionado ao antigo tenant será apagado.
5. O laboratório de Ibitiara pertence à mesma proprietária, mas possui CNPJ,
   sistema e domínio de dados próprios. Ele não será representado como uma linha
   operacional de `clinicas`.
6. A comunicação futura entre os dois sistemas será feita por API.
7. O arquivo `desativar_ibitiara.sql` é apenas um rascunho não aprovado. Não deve
   ser executado no estado atual.

## Arquitetura antes

- Um sistema multi-tenant com três clínicas: Brotas, Ipupiara e Ibitiara.
- As três unidades eram selecionáveis pela proprietária.
- Ibitiara usava `clinica_id`, vínculos de usuário, RLS, tema e fluxos funcionais
  iguais aos das demais clínicas.
- Testes históricos realizados nesse modelo continuam documentados como fatos.

## Arquitetura depois

- O sistema Clínica Patrícia continua sendo um único sistema multi-tenant, agora
  com dois tenants operacionais: Brotas e Ipupiara.
- O laboratório é um sistema externo e não participa do seletor, dos subdomínios
  das clínicas, do caixa, do Financeiro consolidado nem das políticas ordinárias
  de tenant do sistema Clínica Patrícia.
- O registro antigo permanece em `clinicas` somente como âncora histórica inativa.
- A integração futura é identificada como **INT-LAB — Integração com Laboratório**.
  `INT-LAB` não é “Módulo 7” e ainda não possui posição de implementação aprovada.

### Nomenclatura oficial

- **Módulo funcional 7:** Relatórios e Dashboards, conforme
  `02-STATUS-MODULOS.md`.
- **Etapa 7 do plano diretor:** Templates por Especialidade, conforme
  `10-PLANO-DIRETOR.md`.
- **INT-LAB:** iniciativa futura de integração externa com o laboratório, sem
  número de módulo enquanto seu escopo e prioridade não forem aprovados.

## Preservação histórica

A desativação futura será lógica, nunca exclusão física. Devem ser preservados:

- a linha histórica de Ibitiara em `clinicas`, inclusive identidade e CNPJ;
- vínculos históricos de usuários e profissionais;
- pacientes, serviços, agenda, lista de espera e disponibilidades;
- sessões e movimentos de caixa existentes;
- prontuários, atendimentos, documentos e adendos;
- cobranças, despesas, fechamentos, repasses, pagamentos, estornos e ajustes,
  caso existam;
- auditorias e evidências dos testes realizados quando Ibitiara era tenant.

Antes da desativação será necessário inventariar o schema real e definir como
usuários autorizados consultarão o acervo histórico sem reativar Ibitiara como
unidade operacional.

## Implicações de LGPD

- Brotas e Ipupiara permanecem pessoas jurídicas e controladores de dados
  distintos.
- O laboratório, por possuir CNPJ e sistema próprios, deve ter seus papéis de
  controlador e/ou operador definidos juridicamente antes da integração.
- A mesma proprietária não autoriza compartilhamento automático de dados pessoais
  ou de saúde entre os sistemas.
- Pedido e resultado de exame devem ter finalidade, base legal, minimização,
  rastreabilidade, retenção e controle de acesso definidos.
- Identificação de paciente entre sistemas não poderá depender de um “paciente
  global” implícito.
- O acervo histórico de Ibitiara não pode ficar inacessível a ponto de impedir
  cumprimento de obrigações legais, assistenciais ou de atendimento ao titular.

## Relação entre os sistemas

O Clínica Patrícia é responsável pelos fluxos das duas clínicas. O laboratório é
responsável por seus próprios usuários, operação laboratorial, dados e segurança.
A propriedade comum não elimina a separação entre CNPJs, sistemas ou
responsabilidades.

Quando `INT-LAB` for aprovada, o sistema das clínicas atuará como consumidor da
API do laboratório. A integração não dará ao laboratório acesso direto ao banco,
ao Supabase ou ao tenant das clínicas.

## Impacto em autenticação e autorização

- Ibitiara não poderá ser escolhida como clínica ativa.
- Vínculos operacionais com Ibitiara deverão deixar de conceder acesso, mas seus
  registros históricos serão preservados.
- Marcar `public.usuarios.ativo = false` não equivale a remover ou bloquear uma
  identidade em `auth.users`; qualquer tratamento de usuário de teste exige plano
  específico.
- Frontend, backend, RLS e funções privadas deverão rejeitar explicitamente uma
  clínica inativa, mesmo se existir vínculo residual ativo.
- Deve existir uma política separada e auditável para eventual consulta ao acervo
  histórico.

## Impacto em multitenancy

- O conjunto operacional passa a ser `{Brotas, Ipupiara}`.
- Consultas operacionais e consolidadas devem excluir clínicas inativas.
- `clinicas_do_usuario()`, seletores e resolvedores de clínica deverão considerar
  simultaneamente vínculo ativo e `clinicas.ativo = true`.
- A linha histórica de Ibitiara não poderá voltar ao conjunto operacional apenas
  por um vínculo residual ou por um identificador salvo no cliente.
- O laboratório futuro terá identidade de integração própria, não `clinica_id`.

## Integração futura por API — INT-LAB

O fluxo conceitual é: solicitação de exame na clínica → envio autorizado ao
laboratório → processamento no sistema do laboratório → retorno de resultado →
vinculação auditável ao prontuário.

A API ainda não está especificada. Nenhuma implementação deve começar antes de
resolver as decisões pendentes abaixo.

## Riscos

- executar uma desativação incompleta e deixar acessos residuais;
- tornar dados históricos inacessíveis sem política de arquivo;
- misturar controladores LGPD por causa da proprietária comum;
- incluir Ibitiara em consolidações financeiras futuras;
- tratar a API externa como acesso entre tenants;
- identificar pacientes incorretamente entre sistemas;
- reescrever documentação histórica e perder evidência de testes anteriores;
- executar `desativar_ibitiara.sql` sem inventário, transação, guardas e plano de
  reversão.

## Decisões ainda pendentes

1. Nome jurídico e nome de exibição do laboratório.
2. Papéis LGPD de cada CNPJ no pedido e no resultado de exames.
3. Base legal e regras de consentimento/comunicação entre os sistemas.
4. Identificador e processo seguro de correspondência do paciente.
5. Contrato da API, autenticação máquina a máquina e rotação de credenciais.
6. Idempotência, retentativas, timeouts, indisponibilidade e reconciliação.
7. Modelo de solicitação, status, laudo, anexos, assinatura e versionamento.
8. Auditoria, retenção, exclusão/anonimização e atendimento ao titular.
9. Política de consulta ao acervo histórico do antigo tenant.
10. Inventário completo de tabelas, FKs, RLS, funções, views e dados de Ibitiara
    no schema real.
11. Tratamento de usuários e profissionais vinculados ao tenant antigo.
12. Versão transacional e reversível do plano de desativação.
