# CLÍNICA PATRÍCIA
# DOCUMENTO FUNCIONAL MESTRE — PACIENTES

**Versão:** 0.1
**Status:** RASCUNHO
**Data do rascunho:** 24/09/2026
**Aprovação funcional:** PENDENTE

## 1. Natureza deste documento

Este documento organiza o contexto funcional do módulo Pacientes e separa explicitamente:

1. decisões já aprovadas pelo proprietário;
2. estado técnico confirmado nas auditorias locais;
3. propostas que ainda dependem de aprovação;
4. decisões pendentes;
5. critérios de aceite para uma implementação futura.

Somente a seção **Decisões aprovadas** representa comportamento funcional já decidido. As demais regras de produto descritas como proposta, recomendação ou pergunta não estão aprovadas por este rascunho.

Este documento não autoriza alteração de frontend, backend, banco, migrations, testes, infraestrutura ou Supabase remoto.

## 2. Objetivo do módulo

O módulo Pacientes deverá manter o cadastro administrativo das pessoas atendidas em cada clínica, fornecer identificação suficiente aos fluxos operacionais autorizados e proteger dados pessoais e clínicos de acordo com o papel do usuário e a clínica da operação.

O cadastro administrativo de paciente não substitui prontuário e não concede, por si só, acesso ao conteúdo clínico.

## 3. Escopo

O módulo abrange, após aprovação e implementação das etapas correspondentes:

- cadastro administrativo de pacientes;
- consulta, busca e paginação;
- ficha cadastral;
- edição de dados administrativos;
- inativação e reativação;
- prevenção de duplicidade dentro da mesma clínica;
- identificação de pacientes nos fluxos de Agenda, Lista de Espera, Prontuário e Financeiro;
- tratamento seguro do CPF;
- autorização por clínica e papel;
- auditoria dos eventos sensíveis aprovados;
- experiência responsiva em desktop, tablet e celular.

Não fazem parte deste módulo a definição do conteúdo clínico do prontuário, a criação de identidade global de paciente ou a integração com o sistema externo do laboratório.

# PARTE I — DECISÕES APROVADAS

## 4. Cadastros independentes por clínica

Clínica Brotas e Clínica Ipupiara possuem CNPJs diferentes e mantêm cadastros de pacientes independentes.

Cada registro de paciente pertence exatamente a uma clínica por meio de `pacientes.clinica_id`.

Consequências aprovadas:

- um registro de Brotas não é o mesmo registro de Ipupiara;
- a mesma pessoa pode possuir um registro em Brotas e outro em Ipupiara;
- os dois registros possuem identificadores próprios;
- alterações feitas em uma clínica não alteram automaticamente o cadastro da outra;
- inativação em uma clínica não inativa o registro da outra;
- o histórico administrativo, financeiro e clínico permanece associado ao registro da respectiva clínica.

## 5. CPF independente por clínica

A mesma pessoa e o mesmo CPF podem existir uma vez em Brotas e uma vez em Ipupiara.

A unicidade do CPF é por clínica, e não global. A regra funcional é a combinação:

`clínica + CPF`

Consequências aprovadas:

- CPF repetido dentro da mesma clínica deve ser tratado como possível duplicidade;
- CPF igual em clínicas diferentes é permitido;
- busca por CPF deve operar dentro do contexto de uma clínica;
- a existência de um CPF em uma clínica não deve revelar automaticamente sua existência na outra;
- relatórios consolidados não podem afirmar que dois registros com o mesmo CPF representam um único paciente global.

### 5.1. CPF opcional e complementação posterior

O cadastro de paciente pode ser concluído sem CPF.

Regras aprovadas:

- CPF não informado não pode ser substituído por número fictício, sequência genérica ou documento de outra pessoa;
- quando informado, o CPF deve ser validado;
- a busca por CPF é exata e ocorre somente dentro da clínica autorizada;
- ausência de CPF não bloqueia agendamento nem atendimento;
- na próxima interação operacional com o paciente, a recepção deve receber um lembrete para solicitar o CPF, se ele estiver disponível;
- o lembrete não bloqueia agendamento, chegada ou atendimento;
- ao acrescentar CPF posteriormente, o sistema deve verificar duplicidade na mesma clínica;
- a complementação do CPF nunca pesquisa nem revela a existência de registro na outra clínica.

Os dados alternativos usados para identificar pacientes sem CPF, o tratamento de pessoas que efetivamente não possuem CPF e o desenho técnico do lembrete permanecem decisões pendentes.

## 6. Clínica do paciente imutável no fluxo comum

`pacientes.clinica_id` não muda por edição cadastral comum.

Se uma pessoa atendida em Brotas passar a ser atendida também em Ipupiara, deverá possuir um cadastro independente em Ipupiara. O registro de Brotas permanece em Brotas com seu histórico.

Não existe transferência comum de paciente entre clínicas.

## 7. Ausência de identidade global e mesclagem

Não haverá:

- identidade global de paciente compartilhada pelas clínicas;
- mesclagem automática de cadastros;
- deduplicação entre Brotas e Ipupiara por CPF, nome, nascimento, telefone ou outro atributo;
- sincronização automática de dados cadastrais entre clínicas;
- movimentação automática de histórico entre registros.

## 8. Prontuários independentes

Não haverá compartilhamento automático de prontuário entre Brotas e Ipupiara.

Prontuários, atendimentos, documentos, adendos e demais registros clínicos permanecem vinculados à clínica e ao registro de paciente que originaram o atendimento.

A proprietária poder acessar administrativamente as duas clínicas não transforma os prontuários em um prontuário único e não concede acesso clínico automático.

## 9. Laboratório fora do cadastro ordinário

O laboratório de Ibitiara é um sistema externo e não integra o conjunto de tenants operacionais do Clínica Patrícia. Ele não participa do cadastro ordinário de pacientes de Brotas e Ipupiara.

Qualquer integração futura com o laboratório deverá possuir contrato próprio e não poderá ser interpretada como compartilhamento automático de cadastros ou prontuários.

## 9-A. Pacientes menores e responsável legal

Cada menor possui seu próprio cadastro de paciente.

Regras aprovadas:

- o cadastro do menor deve ter pelo menos um responsável legal vinculado;
- no cadastro regular do responsável, nome completo é obrigatório;
- o vínculo do responsável com o menor é obrigatório;
- pelo menos um número de contato do responsável é obrigatório no fluxo regular e deve ser apresentado na interface como “Telefone / WhatsApp”;
- CPF e e-mail do responsável são opcionais;
- o responsável não substitui o paciente;
- o vínculo com o responsável não transforma o prontuário do menor em prontuário compartilhado;
- paciente e responsável permanecem entidades distintas no sistema;
- o vínculo pertence à clínica do cadastro do menor;
- o contato pertence ao responsável vinculado ao menor naquela clínica;
- o vínculo não cria identidade global, sincronização ou compartilhamento automático entre Brotas e Ipupiara;
- cadastrar um número de contato não ativa envio automático de mensagens;
- esta decisão não concede ao responsável acesso ao prontuário do menor;
- o CPF do paciente menor continua opcional, conforme a regra aprovada na seção 5.1.

Permanecem pendentes a possibilidade de múltiplos responsáveis, a comprovação ou alteração da responsabilidade, as permissões de acesso ao prontuário, a regra operacional quando o responsável não estiver disponível e o tratamento da data de nascimento ainda não informada.

Nenhuma dessas pendências define, por si só, bloqueio de agendamento ou atendimento. O comportamento excepcional dependerá de decisão posterior do proprietário.

# PARTE II — ESTADO ATUAL CONFIRMADO

## 10. Limite das constatações

Esta parte registra somente achados confirmados no código e nas migrations locais examinadas nas auditorias.

Não foi realizada, para este documento, conferência do Supabase remoto. Portanto, não se afirma que policies, grants, funções, tabelas ou dados implantados sejam idênticos ao repositório local.

## 11. Estrutura local confirmada

A migration baseline local define `public.pacientes` com:

- `id`;
- `clinica_id`;
- `nome_completo`;
- `cpf_encrypted`;
- `cpf_hash`;
- `data_nascimento`;
- `sexo`;
- `telefone`;
- `email`;
- `endereco`;
- `consentimento_lgpd`;
- `consentimento_data`;
- `observacoes`;
- `ativo`;
- `created_by`;
- `created_at`;
- `updated_at`.

Fonte local: `supabase/migrations/20260915010002_baseline_instalacao_nova.sql`, linhas 805–823.

A mesma migration contém uma constraint única em `(clinica_id, cpf_hash)`, coerente com a decisão de CPF único por clínica. Fonte local: linhas 1080–1084.

Existe trigger de auditoria para `INSERT`, `UPDATE` e `DELETE` de pacientes. Fonte local: linhas 1202–1205. Essa auditoria de mutação não equivale a auditoria de revelação do CPF.

## 12. Listagem e busca atuais

Na implementação local ainda não publicada, o frontend:

- consulta diretamente a tabela `pacientes`, mas seleciona apenas `id`, nome, nascimento, telefone e endereço; não seleciona `cpf_encrypted` nem `cpf_hash`;
- aplica no cliente o `clinica_id` selecionado;
- lista somente `ativo = true`;
- ordena por `nome_completo` em ordem crescente;
- carrega todos os resultados sem paginação;
- faz busca local por parte do nome;
- oferece separadamente a busca exata por CPF, que somente é enviada quando os onze dígitos são válidos;
- chama a RPC local `paciente_buscar_por_cpf`, que exige proprietária ou recepção vinculada à clínica informada, calcula o hash no banco e retorna somente identificação administrativa e status, sem CPF completo, ciphertext ou hash;
- pode localizar por CPF um cadastro inativo da própria clínica, apresentando-o como inativo sem definir por isso um fluxo de reativação.

Fontes locais: `src/pages/Pacientes.tsx`, `src/lib/pacienteCpf.ts` e `supabase/migrations/20260924130000_pacientes_busca_cpf_segura.sql`.

A RPC foi aplicada ao projeto Supabase `xftnkusbyqzyvzrovroj` pela migration `20260924130000` em 24/09/2026. O frontend correspondente ainda não foi publicado; até essa publicação, a experiência disponível aos usuários permanece dependente da versão de frontend implantada.

O filtro de clínica do React melhora a experiência normal, mas não constitui autorização de banco.

## 13. Cadastro atual

O formulário atual possui:

- nome completo;
- CPF opcional;
- data de nascimento;
- sexo;
- telefone, apresentado no cadastro como “Telefone / WhatsApp”, sem indicar verificação do canal nem ativar mensagens automáticas;
- e-mail;
- CEP, rua/logradouro, número, complemento, bairro, cidade e UF como campos separados na interface;
- observações.

O nome, o logradouro, o bairro e a cidade digitados manualmente são normalizados ao sair do campo e antes do salvamento, com tratamento das partículas `de`, `da`, `do`, `dos`, `das` e `e`, inclusive em palavras com hífen ou apóstrofo. Depois da primeira normalização, uma correção manual é preservada para permitir siglas, nomes próprios e grafias excepcionais. Valores fornecidos pelo ViaCEP preservam a grafia do serviço enquanto não forem editados. Essa transformação não é aplicada a complemento, e-mail, CPF, telefone, CEP, UF, número do imóvel ou observações.

CPF, telefone e CEP possuem máscaras de apresentação. O CPF aceita colagem com ou sem pontuação, é validado somente quando informado e não é substituído por valor fictício. O telefone aceita dez dígitos para fixo e onze para celular. O CEP aceita oito dígitos.

O avatar ilustrativo do cadastro acompanha, durante a digitação, as iniciais do primeiro e do último nome informado. Enquanto o nome estiver vazio, a interface apresenta um símbolo neutro; esse recurso não captura nem persiste fotografia.

O formulário desta versão ainda não oferece cadastro nem vínculo de responsável legal. Portanto, ele não implementa o fluxo completo aprovado para pacientes menores e não deve ser publicado ou apresentado como cadastro completo de menor até que o vínculo clínico-administrativo exigido na seção 9-A seja implementado. Essa lacuna não cria bloqueio de agendamento ou atendimento e não autoriza inventar um responsável.

Ao completar o CEP, o frontend consulta `https://viacep.com.br/ws/{CEP}/json/` enviando somente o CEP. O retorno pode preencher rua, bairro, cidade e UF; campos corrigidos manualmente não são sobrescritos. A implementação cancela a solicitação anterior e também compara a identidade da requisição para ignorar respostas atrasadas. CEP não encontrado e falha de rede são informados sem impedir preenchimento manual.

O banco continua possuindo apenas a coluna textual `endereco`. Antes do `INSERT`, os campos estruturados da interface são compostos em uma string legível. Número e complemento permanecem manuais. Como os componentes estruturados não são armazenados separadamente e ainda não existe edição na página, uma edição estruturada futura não poderá reconstruí-los com total confiabilidade a partir do texto existente; resolver essa limitação exigirá decisão técnica posterior.

A listagem administrativa local passou a selecionar e exibir, sob a ação “Ver endereço”, a string textual integral já salva. A interface não tenta inferir CEP, rua, número, complemento, bairro, cidade ou UF. Assim, a leitura literal é preservada, mas nenhuma parte individual pode ser recuperada com garantia para uma futura edição estruturada.

Fonte local: `src/pages/Pacientes.tsx` e `src/lib/pacienteFormulario.ts`.

As validações atuais exigem:

- clínica selecionada no frontend;
- nome preenchido;
- CPF válido, quando informado;
- telefone com DDD e dez ou onze dígitos, quando informado;
- e-mail em formato válido, quando informado, antes de iniciar a gravação;
- CEP com oito dígitos, quando informado.

O cadastro atual:

- quando há CPF, envia seus onze dígitos como argumento de chamadas RPC feitas pelo frontend;
- quando há CPF, recebe de `cpf_encrypt` o valor cifrado e de `cpf_hash` o hash calculados pelas funções do banco;
- quando o CPF está vazio, não chama as RPCs de criptografia/hash e insere `null` em `cpf_encrypted` e `cpf_hash`;
- insere diretamente em `pacientes`;
- envia `clinica_id` e `created_by` pelo cliente;
- trata erro `23505` como CPF já existente naquela clínica.

O código JavaScript coordena as chamadas e recebe seus resultados; ele não executa localmente os algoritmos de criptografia ou hash. Fontes locais: `src/pages/Pacientes.tsx`, `src/lib/cpfCripto.ts` e `supabase/migrations/20260915010002_baseline_instalacao_nova.sql`, linhas 408–433.

Esse fluxo de cadastro é diferente da listagem descrita na seção 16: a versão local revisada não solicita dados de CPF na carga da lista.

A versão local de design não apresenta nem exige consentimento genérico e não envia os campos de consentimento no cadastro. A interface informa que texto, finalidade e forma de consentimento dependem de aprovação específica. Essa remoção não aprova uma base legal nem define o substituto funcional, que permanece sujeito à validação jurídica descrita na seção 46.

## 14. Edição, inativação e reativação atuais

A página auditada não implementa edição, inativação ou reativação de paciente.

A tabela possui `ativo` e `updated_at`, mas a existência desses campos não comprova um fluxo funcional completo.

## 15. Autorização atual nas migrations locais

As policies locais de `SELECT`, `INSERT` e `UPDATE` verificam vínculo ativo do usuário com a clínica e, quando `app.clinica_ativa` possui valor, comparam esse valor com `clinica_id`.

Elas não distinguem proprietária, recepção e médico. Fonte local: `supabase/migrations/20260915010002_baseline_instalacao_nova.sql`, linhas 2000–2020.

Quando `app.clinica_ativa` está nula, a condição local aceita qualquer clínica presente nos vínculos ativos do usuário. Não foi encontrado no fluxo auditado de Pacientes um mecanismo que transforme a seleção mantida no navegador em contexto confiável do banco.

Não foi encontrada policy `DELETE` de pacientes no conjunto auditado.

## 16. CPF atual

A versão local revisada da listagem não seleciona `cpf_encrypted` ou `cpf_hash` e não chama `cpf_decrypt`. A lista comum deixou de apresentar uma máscara derivada do documento e passou a apresentar somente o status do cadastro. A busca exata envia o CPF informado como argumento da RPC, mas a resposta não contém CPF completo, ciphertext ou hash.

Fonte local: `src/pages/Pacientes.tsx`, `src/lib/pacienteCpf.ts` e `supabase/migrations/20260924130000_pacientes_busca_cpf_segura.sql`.

A função local `cpf_decrypt(bytea)`:

- é `SECURITY DEFINER`;
- recebe ciphertext;
- retorna o CPF em texto;
- não valida paciente, clínica, papel ou finalidade;
- não registra, por si própria, um evento auditável de revelação.

Fonte local: `supabase/migrations/20260915010002_baseline_instalacao_nova.sql`, linhas 393–405.

A migration local de hardening concede execução de `cpf_decrypt` e `cpf_hash` ao papel `authenticated`. Fonte local: `supabase/migrations/20260915010004_hardening_geral.sql`, linhas 43–50.

`cpf_decrypt` permanece disponível nesta etapa por compatibilidade com versões anteriores do frontend e continua sendo usado internamente pelo trigger de validação de gravação. Sua permissão para clientes autenticados só poderá ser revogada em migration posterior, depois de comprovado que nenhuma versão publicada ou consumidor autorizado ainda depende da chamada direta.

## 17. Integrações atuais confirmadas

### 17.1. Agenda

A Agenda consulta diretamente pacientes ativos da clínica escolhida para montar seletores. Também obtém nomes de pacientes em agendamentos e na Lista de Espera.

Fonte local: `src/pages/Agenda.tsx`, linhas 259–281.

### 17.2. Lista de Espera

O fluxo usa `paciente_id`, `profissional_id` e `clinica_id`, com inserção direta pela interface. Fonte local: `src/pages/Agenda.tsx`, linhas 1284–1306.

### 17.3. Prontuário

O atendimento avulso carrega diretamente a lista de pacientes ativos da clínica. Fonte local: `src/pages/Prontuario.tsx`, linhas 114–126 e 680–704.

As funções locais de Prontuário já possuem verificações contextuais para médico, profissional, clínica e atendimento. A abertura de prontuário registra leitura clínica. Isso não autoriza considerar toda a segurança futura concluída.

Fonte local: `supabase/migrations/20260915010005_prontuario_rpc.sql`, linhas 275–409 e 413–468.

### 17.4. Financeiro

O caminho financeiro oficial montado atualmente por `App.tsx` é `FinanceiroModulo`, que reúne Caixa, Estornos, Repasses, Fiscal, Painel e Relatórios. Nesse caminho ativo, o Financeiro depende de `paciente_id` e do nome do paciente para operações, estornos, fiscal, repasses, filtros e relatórios. Permanecem consultas diretas de identificação de pacientes em consumidores ativos.

Fontes locais do caminho ativo incluem:

- `src/App.tsx`, linhas 8 e 163–165;
- `src/pages/FinanceiroModulo.tsx`, linhas 17–63;
- `src/pages/FinanceiroRelatorios.tsx`, linhas 84–102;
- `src/lib/financeiro/financeiro.estornos-leitura.ts`, linhas 73–110;
- `src/lib/financeiro/financeiro.fiscal-leitura.ts`, linhas 35–44;
- `src/lib/financeiro/financeiro.repasses-leitura.ts`, linhas 70–84.

`src/pages/Financeiro.tsx` e `src/components/financeiro/FormRegistrarEntrada.tsx` constituem o fluxo anterior/legado de entrada financeira. O primeiro importa e renderiza o segundo, mas nenhum deles é montado pelo caminho oficial atual de `App.tsx`. Eles devem permanecer inventariados para evitar regressão ou reativação acidental, sem serem descritos como consumidores ativos do módulo atual.

## 18. Testes existentes e lacunas confirmadas

Existem testes de interface para a ausência de CPF/ciphertext na listagem, busca exata, validação local, visibilidade de menu por papel e troca de clínica na Agenda. Existem também testes locais de grants das funções de CPF e cenários sintéticos de Prontuário/Financeiro.

As melhorias locais do cadastro possuem testes unitários de formatação de nomes portugueses, máscaras de CPF/telefone/CEP, composição do endereço, CEP encontrado, CEP inexistente e falha de rede. Os cenários operacionais sintéticos cobrem CPF opcional sem chamada às RPCs, digitação/exclusão das máscaras, resposta atrasada após troca de CEP, preservação de cidade corrigida manualmente, persistência e visualização literal da composição textual, lembrete de CPF no agendamento e na chegada, frequência por interação, preservação do formulário, CPF inválido, conflito com registro inativo e isolamento do parâmetro de clínica.

Fontes locais: `src/lib/pacienteFormulario.test.ts` e `tests/operacional/operacional.spec.ts`.

Não foram encontrados, nas auditorias realizadas, testes completos que comprovem em conjunto:

- autorização de pacientes por papel;
- sessão com vínculos ativos em Brotas e Ipupiara;
- contexto seguro de clínica fora do navegador;
- bloqueio de mudança de `clinica_id`;
- paciente e clínica inativos;
- revelação individual auditada de CPF;
- ausência de acesso direto às colunas cifrada e hash;
- regressão integrada de todos os consumidores após restrição da tabela.

# PARTE III — PROPOSTAS PARA APROVAÇÃO

## 19. Princípios funcionais propostos

Propõe-se que o módulo futuro observe:

- minimização de dados por papel e finalidade;
- separação entre cadastro administrativo e conteúdo clínico;
- autorização efetiva fora do controle exclusivo do navegador;
- negação segura quando clínica, usuário, vínculo ou papel não forem válidos;
- preservação de históricos após inativação;
- nenhuma exclusão física no fluxo comum;
- nenhum dado técnico ou sensível desnecessário nas respostas de interface;
- auditoria de eventos sensíveis sem registrar o conteúdo revelado.

## 20. Campos do cadastro

### 20.1. Identificação

Proposta:

- nome completo obrigatório;
- nome social/preferido opcional, se aprovado;
- CPF opcional, conforme decisão aprovada na seção 5.1;
- data de nascimento com obrigatoriedade ainda pendente de decisão;
- sexo e/ou gênero somente após definição dos conceitos e da necessidade operacional;
- status ativo/inativo;
- clínica definida pelo contexto autorizado e não editável no formulário.

### 20.2. Contatos

Proposta:

- telefone principal;
- telefone alternativo opcional;
- indicação se aceita mensagens pelo canal informado;
- e-mail opcional;
- contato de emergência opcional e separado do responsável legal;
- normalização de telefone e e-mail sem impedir casos reais justificados.

### 20.3. Endereço

Proposta:

- substituir o campo livre único por campos estruturados quando necessário: CEP, logradouro, número, complemento, bairro, município e UF;
- permitir endereço incompleto quando não for indispensável ao atendimento;
- não tornar endereço obrigatório apenas por conveniência do sistema;
- definir separadamente quais dados são necessários para emissão fiscal.

### 20.4. Observações administrativas

Proposta:

- manter observação administrativa apenas quando necessária;
- deixar claro que esse campo não é prontuário;
- impedir uso como depósito de diagnóstico, evolução, prescrição ou outros dados clínicos;
- avaliar lista de marcadores administrativos estruturados em vez de texto livre sempre que possível.

## 21. Pacientes sem CPF

O cadastro sem CPF e seu caráter não bloqueante estão aprovados na seção 5.1. Permanecem como propostas de detalhamento funcional:

- definir os dados alternativos mínimos após decisão do proprietário;
- registrar a ausência sem usar CPF fictício ou sequência genérica;
- permitir complementação posterior;
- aplicar prevenção de duplicidade na própria clínica sem mesclagem automática;
- continuar pertencendo a uma única clínica.

### 21.1. Experiência do lembrete implementada localmente

A experiência aprovada foi implementada localmente e homologada em navegação autenticada de Brotas e Ipupiara. A migration necessária já foi aplicada de forma controlada; o frontend correspondente ainda não foi publicado:

- ao selecionar paciente sem CPF para novo agendamento ou registrar sua chegada, a recepção vê um aviso discreto;
- o aviso oferece as ações “Adicionar CPF” e “Lembrar na próxima visita”;
- “Adicionar CPF” permite completar o cadastro sem perder o contexto operacional em andamento;
- “Lembrar na próxima visita” adia a solicitação sem bloquear agendamento, chegada ou atendimento;
- o aviso não deve se repetir várias vezes dentro do mesmo atendimento ou interação operacional;
- quando o CPF for preenchido, a pendência e o lembrete desaparecem;
- “Lembrar na próxima visita” evita nova exibição durante a interação aberta, sem criar persistência própria entre sessões.

A complementação usa RPC dedicada com paciente e clínica explícitos, valida novamente o CPF no banco e verifica a constraint/duplicidade apenas naquela clínica, incluindo pacientes inativos. A RPC devolve erro genérico fora do par paciente/clínica e não consulta a outra clínica. A migration que cria esse contrato e restringe alterações administrativas a proprietária/recepção foi aplicada e validada no Supabase da Clínica Patrícia; o uso operacional continua dependente da publicação do frontend compatível.

## 22. Menores e responsável legal

O cadastro próprio do menor, a exigência de pelo menos um responsável legal e a independência entre paciente, responsável, clínica e prontuário estão aprovados na seção 9-A.

Também estão aprovados, para o cadastro regular do responsável, nome completo e vínculo com o menor obrigatórios, um contato obrigatório exibido como “Telefone / WhatsApp” e CPF/e-mail opcionais.

O formato técnico dessa representação não está aprovado e não deve antecipar regras de guarda, acesso ao prontuário, comprovação documental ou responsabilidade financeira. O número informado é apenas dado de contato: não autoriza acesso ao prontuário e não ativa mensagens automáticas.

### 22.1. Propostas futuras para contatos

Sem aprovar implementação nesta etapa, propõe-se futuramente:

- identificar se o número informado também utiliza WhatsApp;
- definir preferências e permissões de comunicação por finalidade antes de qualquer automação;
- distinguir contato do responsável, contato do paciente e contato de emergência;
- definir o tratamento excepcional quando o responsável não tiver telefone disponível.

Essas propostas não alteram a regra regular aprovada e não autorizam disparo de mensagens, integração com WhatsApp ou acesso do responsável ao prontuário.

## 23. Prevenção de duplicidade

Proposta:

- CPF igual na mesma clínica: bloquear novo cadastro e oferecer acesso ao registro existente conforme a permissão do usuário;
- CPF igual em outra clínica: permitir cadastro independente sem revelar automaticamente a existência externa;
- paciente sem CPF: alertar sobre possíveis correspondências na própria clínica por nome, nascimento e contato;
- homônimos: permitir registros distintos;
- nunca mesclar automaticamente;
- mesclagem manual não integra a primeira versão proposta;
- registrar tentativas e decisões relevantes sem expor CPF em logs.

## 24. Listagem, busca, ordenação e paginação

Proposta:

- paginação no servidor;
- tamanho de página e limites a definir tecnicamente após aprovação funcional;
- ordenação inicial por nome;
- busca por nome dentro da clínica;
- em cumprimento à decisão aprovada, busca exata por CPF dentro da clínica autorizada, sem pesquisa parcial do CPF completo;
- filtros por ativo/inativo e, quando necessário, faixa de nascimento ou contato;
- estado padrão mostrando pacientes ativos;
- resultados contendo somente os campos necessários ao papel e ao fluxo;
- nenhuma carga integral de todos os pacientes para filtragem no navegador;
- nenhuma descriptografia em massa para montar a lista.

## 25. Ficha administrativa do paciente

Proposta:

A ficha deverá apresentar:

- identificação e clínica de origem;
- dados de contato e endereço aprovados;
- CPF mascarado;
- status;
- responsável legal, quando aplicável;
- metadados administrativos úteis, sem exibir UUIDs;
- atalhos para Agenda, Lista de Espera e Financeiro somente quando o papel permitir;
- referência a atendimentos/prontuário apenas para usuários com autorização clínica própria.

A ficha administrativa não deverá mostrar automaticamente conteúdo clínico à proprietária ou à recepção.

## 26. Edição

Proposta:

- edição apenas de campos administrativos autorizados;
- `clinica_id`, `created_by` e `created_at` não editáveis pelo fluxo comum;
- atualização automática e confiável de `updated_at`;
- registro auditável de autor, data e alterações relevantes;
- mudança de CPF submetida novamente à regra de unicidade da clínica;
- nenhuma alteração retroativa de documentos ou snapshots históricos;
- conflitos concorrentes tratados sem sobrescrever silenciosamente alterações mais recentes.

## 27. Inativação e reativação

Proposta:

- inativação lógica, sem exclusão física;
- motivo padronizado e auditoria;
- paciente inativo não aparece em novas agendas, nova Lista de Espera ou novo atendimento avulso;
- históricos de Agenda, Prontuário e Financeiro permanecem legíveis aos papéis autorizados;
- reativação restaura o uso operacional na mesma clínica;
- inativação ou reativação em Brotas não afeta Ipupiara;
- permissões específicas dependem de decisão do proprietário.

## 28. Permissões por papel

Matriz proposta, ainda não aprovada:

| Operação | Proprietária | Recepção | Médico |
|---|---:|---:|---:|
| Listar pacientes ativos da clínica | SIM, administrativo | SIM, administrativo | NÃO como cadastro geral |
| Buscar por nome | SIM | SIM | SIM, identificação mínima e contextual |
| Buscar CPF exato | SIM | SIM | NÃO por padrão |
| Ver ficha administrativa | SIM | SIM | NÃO |
| Criar paciente | SIM | SIM | NÃO |
| Editar cadastro administrativo | SIM | SIM | NÃO |
| Inativar/reativar | SIM | A DECIDIR | NÃO |
| Alterar `clinica_id` | NÃO | NÃO | NÃO |
| Identificar paciente de agenda própria | Conforme função administrativa | Conforme função operacional | SIM |
| Selecionar paciente para atendimento avulso | Não como ato clínico | NÃO | SIM, com projeção mínima |
| Ver paciente em histórico próprio | Sem conteúdo clínico automático | Conforme operação autorizada | SIM, vinculado ao próprio atendimento |
| Revelar CPF integral | A DECIDIR | A DECIDIR | NÃO por padrão |

O laboratório não é papel operacional deste sistema e não recebe permissões no módulo Pacientes.

## 29. CPF e privacidade

### 29.1. Exibição mascarada

Proposta:

- listas e fichas comuns mostram somente CPF mascarado;
- a máscara deve ser produzida sem enviar CPF integral ao navegador;
- `cpf_encrypted` e `cpf_hash` não devem ser expostos à interface;
- a quantidade de dígitos visíveis depende de decisão do proprietário.

### 29.2. Busca exata

A busca exata e limitada à clínica autorizada é decisão aprovada. Para sua experiência e proteção, propõe-se:

- normalizar e processar o CPF dentro de uma fronteira confiável;
- pesquisar obrigatoriamente dentro de uma clínica;
- não retornar hash ou ciphertext;
- não indicar se o CPF existe em outra clínica;
- restringir a busca aos papéis aprovados.

### 29.3. Revelação individual

Caso seja aprovada, a revelação integral deverá ser:

- individual, nunca em massa;
- contextual;
- limitada a papéis e finalidades aprovados;
- justificada quando necessário;
- auditada com usuário, clínica, paciente, finalidade, data e resultado;
- protegida contra automação abusiva;
- registrada sem armazenar o CPF revelado no log.

## 30. Clínica selecionada e autorização

Comportamento funcional proposto:

- toda consulta ou mutação ocorre no contexto de uma clínica autorizada;
- Brotas nunca recebe ou altera o registro de Ipupiara e vice-versa;
- proprietária pode alternar entre clínicas autorizadas, operando uma clínica por vez no módulo;
- médico e recepção vinculados a mais de uma clínica não obtêm acesso cruzado apenas manipulando valores no navegador;
- clínica inativa não aceita novas operações ordinárias;
- o contexto visual não substitui a autorização efetiva.

A forma técnica poderá usar backend, funções restritas, contexto transacional, claims assinados ou outra solução avaliada posteriormente. Node/Fastify, RPCs e demais alternativas não estão aprovados por este documento funcional.

## 31. Integração com Agenda

Proposta:

- novos agendamentos usam somente pacientes ativos da mesma clínica;
- paciente, profissional e agendamento devem pertencer à mesma clínica;
- recepção/proprietária identificam paciente pela projeção administrativa necessária;
- médico vê somente identificação necessária às agendas que puder acessar;
- o fluxo de novo agendamento oferece a ação “Novo paciente” quando a pessoa ainda não estiver cadastrada na clínica;
- ao concluir o cadastro iniciado pela Agenda, o usuário retorna ao modal de agendamento com o novo paciente já selecionado;
- os demais dados já preenchidos no agendamento, como profissional, data, horário e observações, são preservados durante a ida e o retorno ao cadastro;
- cancelar o cadastro retorna ao agendamento sem criar paciente e sem descartar silenciosamente os dados já preenchidos;
- agendamentos históricos mantêm identificação mesmo após inativação;
- nenhuma troca de clínica modifica o cadastro do paciente.

## 32. Integração com Lista de Espera

Proposta:

- incluir somente paciente ativo da clínica;
- validar no servidor/banco a coincidência entre clínica, paciente e profissional;
- preservar a prevenção de duplicidade por paciente e profissional enquanto estiver aguardando;
- ao gerar um agendamento a partir de uma entrada da Lista de Espera, essa entrada deixa de aparecer como `aguardando`;
- o resultado esperado é uma transição rastreável entre a entrada de espera e o agendamento gerado, sem duplicar a fila nem perder seu histórico;
- manter histórico conforme regra de retenção a aprovar;
- remover ou concluir a espera sem alterar o cadastro do paciente.

A forma técnica de representar a transição — estado, vínculo, evento ou operação atômica — será definida na etapa de arquitetura e não é fixada por este rascunho.

## 33. Integração com Prontuário

Proposta:

- médico identifica somente os pacientes necessários às próprias atividades clínicas;
- atendimento avulso usa projeção mínima de pacientes ativos da clínica autorizada;
- atendimento agendado valida clínica, agenda, paciente e profissional;
- abertura de prontuário continua contextual e auditada;
- paciente posteriormente inativado continua visível no histórico do atendimento autorizado;
- proprietária e recepção não recebem conteúdo clínico por terem acesso administrativo ao paciente;
- nenhum prontuário atravessa automaticamente de Brotas para Ipupiara.

## 34. Integração com Financeiro

Proposta:

- recebimento referencia paciente da mesma clínica;
- proprietária e recepção conseguem selecionar o paciente nos fluxos autorizados;
- registros históricos continuam exibindo identificação mínima após inativação;
- médico visualiza somente pacientes associados às próprias consultas e recebimentos autorizados;
- relatórios mantêm origem por clínica;
- visão consolidada não mescla pacientes por CPF;
- CPF integral não integra relatórios comuns nem nomes de arquivos.

## 35. Desktop, tablet e celular

Proposta:

### Desktop

- tabela paginada com colunas essenciais;
- filtros e ações visíveis sem excesso de informação;
- ficha e formulário com hierarquia clara.

### Tablet

- tabela adaptada ou cartões compactos conforme largura;
- ações utilizáveis por toque;
- formulário em uma ou duas colunas sem cortes.

### Celular

- cartões ou lista vertical, sem tabela larga obrigatória;
- busca e filtros acessíveis;
- ações primárias fáceis de tocar;
- formulário em coluna única;
- nenhum overflow horizontal;
- CPF sempre mascarado nas superfícies comuns.

### Requisitos comuns

- navegação por teclado;
- rótulos associados aos campos;
- foco visível;
- mensagens de erro próximas ao contexto;
- estados de carregamento, vazio, erro e sucesso;
- não depender somente de cor;
- evitar exposição de dados em notificações, URLs ou títulos de página.

# PARTE IV — ALTERNATIVAS TÉCNICAS PARA ETAPA POSTERIOR

## 36. Fronteira de acesso

Alternativas a avaliar na arquitetura técnica:

1. gateway confiável que valide identidade, clínica e papel antes das operações;
2. funções restritas com contratos específicos e validação interna;
3. contexto de clínica em claim assinado por serviço confiável;
4. separação física entre dados básicos e dados sensíveis;
5. combinação dessas abordagens com RLS como defesa em profundidade.

Critérios para a escolha futura:

- não permitir bypass por chamada direta;
- não confiar em filtro React, `localStorage` ou cabeçalho livre;
- suportar Brotas e Ipupiara sem misturar dados;
- preservar integrações existentes;
- permitir teste sintético e auditoria;
- minimizar complexidade operacional compatível com o risco.

Nenhuma alternativa desta seção está aprovada como arquitetura.

## 37. CPF

Alternativas a avaliar:

- armazenar sufixo mínimo separado para máscara sem descriptografia;
- produzir máscara em camada confiável;
- operação específica para busca exata por hash;
- operação específica e auditável para revelação individual;
- retirada do acesso genérico do cliente às funções de criptografia, hash e descriptografia.

A escolha deverá evitar descriptografia em massa e impedir que hash ou ciphertext cheguem ao navegador.

# PARTE V — DECISÕES PENDENTES

## 38. Cadastro mínimo

O cadastro sem CPF já está aprovado. **Recomendação pendente:** definir um conjunto mínimo de dados alternativos suficiente para distinguir pacientes na própria clínica, sem criar identificador fictício e sem bloquear o atendimento quando alguma informação ainda não estiver disponível.

Perguntas:

1. Data de nascimento será obrigatória ou poderá ser “não informada”?
2. Nome social/preferido deverá existir já na primeira versão?
3. Quais opções de sexo/gênero são necessárias e para qual finalidade?
4. Quais campos são indispensáveis para atendimento e quais apenas para emissão fiscal?
5. Quais dados alternativos identificarão com segurança um paciente sem CPF?
6. Como registrar e revisar o caso de quem efetivamente não possui CPF, em vez de apenas não estar com o documento disponível?
7. Em quais interações o lembrete deve reaparecer, como evitar repetição no mesmo atendimento e quando ele poderá ser encerrado manualmente?

## 39. Menores e responsáveis

O cadastro próprio do menor, a existência de pelo menos um responsável legal vinculado e os campos mínimos do cadastro regular já estão aprovados. **Recomendação pendente:** detalhar exceções, múltiplos vínculos, comprovação e permissões sem confundir o responsável com o paciente, sem compartilhar prontuário automaticamente e sem criar vínculo entre clínicas.

Perguntas:

1. Um menor poderá ter mais de um responsável?
2. Como será comprovada, registrada e alterada a responsabilidade legal?
3. Quais permissões o responsável terá para solicitar, visualizar ou autorizar acesso ao prontuário do menor?
4. Qual será o procedimento quando o responsável não estiver disponível no momento da interação operacional?
5. Como tratar excepcionalmente o cadastro regular quando o responsável não possuir telefone disponível?
6. Como cadastrar e identificar o menor quando a data de nascimento ainda não tiver sido informada?
7. Como registrar se o contato também usa WhatsApp sem presumir autorização para mensagens?
8. Quais preferências e permissões serão exigidas para cada finalidade de comunicação?
9. Como separar, na experiência e nos dados, contato do responsável, contato do paciente e contato de emergência?

Estas perguntas não estabelecem bloqueio de agendamento ou atendimento. O tratamento das exceções permanece pendente.

## 40. Contatos e endereço

**Recomendação:** tornar telefone principal o contato operacional preferencial, manter e-mail opcional e estruturar endereço sem torná-lo universalmente obrigatório.

Perguntas:

1. Deve existir telefone alternativo e contato de emergência?
2. Deve haver preferência/autorização por canal de mensagem?
3. Endereço completo é necessário no cadastro inicial ou apenas em fluxos fiscais específicos?

## 41. Duplicidade sem CPF

**Recomendação:** mostrar alerta de possível duplicidade dentro da mesma clínica, sem bloquear automaticamente e sem mesclar registros.

Perguntas:

1. Quais campos formam o alerta: nome, nascimento, telefone e responsável?
2. Quem pode decidir continuar o cadastro apesar do alerta?
3. Haverá, no futuro, procedimento manual de correção de duplicidade dentro da mesma clínica?

### CPF duplicado em paciente inativo

**Recomendação:** CPF já vinculado a paciente inativo na mesma clínica não deve resultar silenciosamente em novo cadastro. O sistema deve indicar a existência do registro inativo aos papéis autorizados e conduzir a uma decisão explícita de reativação ou tratamento excepcional, preservando o histórico.

Perguntas:

1. O cadastro com CPF de paciente inativo deverá ser sempre bloqueado?
2. O usuário poderá solicitar reativação a partir do próprio aviso de duplicidade?
3. Quem poderá autorizar a reativação ou eventual exceção?
4. Quais dados do registro inativo podem ser mostrados antes da reativação?

## 42. Inativação e reativação

**Recomendação:** proprietária pode inativar/reativar; recepção pode solicitar ou executar somente se o proprietário aprovar essa responsabilidade.

Perguntas:

1. Recepção poderá inativar e reativar diretamente?
2. Motivo será obrigatório?
3. Atendimento já agendado poderá começar se o paciente for inativado depois do agendamento?
4. Como tratar itens ainda ativos na Lista de Espera no momento da inativação?
5. Agendamentos futuros existentes devem ser mantidos, bloqueados, cancelados ou encaminhados para decisão manual?
6. Entradas `aguardando` devem ser canceladas, suspensas ou permanecer visíveis para tratamento operacional?
7. Quem será responsável por resolver os agendamentos e esperas afetados antes de concluir a inativação?

## 43. Identificação disponível ao médico

**Recomendação:** fornecer nome, data de nascimento e identificador interno apenas no contexto necessário; CPF permanece indisponível por padrão.

Perguntas:

1. Médico pode procurar qualquer paciente ativo da clínica para iniciar atendimento avulso?
2. Ou somente pacientes previamente agendados/encaminhados?
3. Quais campos mínimos são necessários para distinguir homônimos?

## 44. CPF

**Recomendação:** busca exata restrita a proprietária/recepção; listas com máscara de dois últimos dígitos; médico sem revelação; CPF integral somente em operação individual justificada e auditada, se realmente necessária.

Perguntas:

1. Proprietária, recepção ou ambas podem revelar o CPF integral?
2. Quais finalidades justificam a revelação?
3. Dois ou quatro dígitos devem permanecer visíveis na máscara?
4. Qual retenção da auditoria e quem pode consultá-la?

## 45. Permissões administrativas

**Recomendação:** proprietária e recepção criam e editam cadastro; médico recebe apenas identificação mínima contextual; proprietária não recebe acesso clínico automático.

Perguntas:

1. Há campos que somente a proprietária pode editar?
2. Observações administrativas serão visíveis à recepção?
3. Quem pode consultar pacientes inativos fora de um histórico operacional?

## 46. Base legal e privacidade

**Proposta sujeita à validação jurídica:** revisar o consentimento genérico obrigatório do cadastro e documentar separadamente cada finalidade, necessidade de tratamento e eventual consentimento específico. Nenhuma base legal aplicável às clínicas é declarada aprovada por este rascunho. A definição deverá ser validada juridicamente antes de alterar formulário, textos, dados armazenados ou fluxos operacionais.

**Recomendação para avaliação jurídica:** quando houver consentimentos específicos aprovados, mantê-los separados por finalidade, sem transformar uma autorização em concordância genérica para todos os usos.

Perguntas:

1. Quais finalidades específicas exigirão consentimento registrado?
2. Quais avisos de privacidade deverão ser apresentados na recepção?
3. Quem responderá solicitações de correção, acesso e demais direitos do titular?

## 47. Paginação e ficha

**Recomendação:** paginação no servidor, busca por nome e CPF exato, ficha administrativa com histórico de alterações e atalhos autorizados.

Perguntas:

1. Qual volume típico e máximo esperado por clínica?
2. Quais colunas são essenciais na lista?
3. A ficha deve mostrar resumo de próximas agendas e situação financeira, ou apenas atalhos para os respectivos módulos?

# PARTE VI — CRITÉRIOS DE ACEITE

## 48. Critérios das decisões já aprovadas

Uma implementação futura deverá comprovar que:

1. todo paciente pertence a exatamente uma clínica;
2. Brotas e Ipupiara aceitam registros distintos com o mesmo CPF;
3. a mesma clínica não aceita dois pacientes com o mesmo CPF normalizado, ressalvado o fluxo aprovado para correção de duplicidade;
4. busca por CPF em Brotas não revela o registro de Ipupiara e vice-versa;
5. `clinica_id` não muda em criação posterior, edição, inativação ou reativação comum;
6. dados alterados em uma clínica não alteram a outra;
7. inativação em uma clínica não inativa a outra;
8. não existe mesclagem ou identidade global automática;
9. prontuários e atendimentos não são compartilhados entre clínicas;
10. relatórios consolidados preservam a origem e não deduplicam pessoas por CPF;
11. o laboratório não aparece como tenant operacional do módulo;
12. o cadastro pode ser concluído sem CPF;
13. CPF ausente não é substituído por número fictício, sequência genérica ou documento de outra pessoa;
14. ausência de CPF e lembrete não bloqueiam agendamento, chegada ou atendimento;
15. a próxima interação operacional gera lembrete à recepção para solicitar o CPF, quando disponível;
16. CPF acrescentado posteriormente é validado e submetido à verificação de duplicidade somente na mesma clínica;
17. busca ou complementação de CPF não revela a existência de registro na outra clínica;
18. cada menor possui cadastro próprio como paciente;
19. o cadastro concluído do menor possui pelo menos um responsável legal vinculado;
20. o responsável não substitui o menor nem transforma seu prontuário em prontuário compartilhado;
21. o vínculo com o responsável pertence à clínica do cadastro e não cria identidade ou compartilhamento automático entre Brotas e Ipupiara;
22. o CPF do paciente menor permanece opcional;
23. no cadastro regular do responsável, nome completo e vínculo com o menor são obrigatórios;
24. o cadastro regular possui pelo menos um contato obrigatório, apresentado como “Telefone / WhatsApp”;
25. CPF e e-mail do responsável são opcionais;
26. o contato permanece associado ao responsável e à clínica daquele cadastro, sem criar vínculo automático com a outra clínica;
27. cadastrar um número não ativa envio automático de mensagens;
28. os dados cadastrais e de contato do responsável não concedem acesso ao prontuário do menor.

## 49. Critérios propostos de operação

Sujeitos à aprovação das propostas correspondentes:

1. a experiência do lembrete apresenta aviso discreto e as ações “Adicionar CPF” e “Lembrar na próxima visita” nos pontos operacionais aprovados;
2. o aviso não se repete várias vezes no mesmo atendimento e desaparece quando o CPF é preenchido;
3. eventual identificação de uso de WhatsApp não equivale a permissão de comunicação;
4. preferências de comunicação são separadas por finalidade antes de qualquer automação;
5. contato do responsável, contato do paciente e contato de emergência são distinguíveis;
6. o fluxo excepcional sem telefone segue a regra que vier a ser aprovada, sem inventar contato fictício;
7. duplicidade é prevenida sem fundir homônimos;
8. lista é paginada e não carrega todo o cadastro no navegador;
9. busca por CPF é exata e restrita à clínica;
10. edição preserva clínica, autoria e histórico;
11. inativação é lógica e não destrói referências;
12. históricos identificam paciente inativo quando necessário;
13. Agenda e Lista de Espera aceitam apenas paciente da própria clínica;
14. durante um novo agendamento, “Novo paciente” permite cadastrar e retornar ao modal com o paciente selecionado, preservando os demais dados já preenchidos;
15. cancelar o cadastro iniciado pela Agenda não cria paciente nem apaga silenciosamente o agendamento em preparação;
16. gerar um agendamento a partir da Lista de Espera faz a entrada deixar de aparecer como `aguardando`, preservando vínculo e histórico conforme a regra aprovada;
17. atendimento avulso e agendado validam paciente, profissional e clínica;
18. Financeiro preserva identificação histórica e isolamento;
19. desktop, tablet e celular não apresentam perda de função nem exposição adicional de dados.

## 50. Critérios propostos de segurança

Sujeitos à aprovação da matriz de permissões e da arquitetura futura:

1. proprietária, recepção e médico têm autorizações distintas no banco ou em fronteira equivalente não contornável;
2. chamada direta à API não amplia o acesso oferecido pela interface;
3. usuário vinculado a Brotas e Ipupiara não mistura dados em uma mesma operação;
4. clínica, usuário ou vínculo inativo bloqueia novas operações ordinárias;
5. médico não cria nem altera cadastro administrativo;
6. médico não obtém `SELECT` geral de pacientes ou dados administrativos desnecessários;
7. `cpf_encrypted` e `cpf_hash` não chegam ao navegador;
8. listas não descriptografam CPF em massa;
9. revelação integral, se aprovada, é individual, contextual e auditada;
10. auditoria não armazena o CPF em texto;
11. tentativa de mudar paciente entre clínicas é rejeitada;
12. testes sintéticos cobrem cada papel, duas clínicas, clínica inativa, paciente inativo, vínculo inativo, chamadas diretas e tentativa de movimentação.

## 51. Homologação futura

Antes de qualquer implantação deverão ocorrer, em tarefa própria e autorizada:

- conferência entre migrations locais e Supabase remoto;
- aprovação deste documento e da matriz de papéis;
- arquitetura técnica separada;
- plano de implementação e rollback;
- testes com dados exclusivamente sintéticos;
- regressão de Agenda, Lista de Espera, Prontuário e Financeiro;
- validação independente de Brotas e Ipupiara;
- atualização do checkpoint após execução real.

# PARTE VII — FORA DO ESCOPO E AÇÕES NÃO AUTORIZADAS

## 52. Fora do escopo deste rascunho

- identidade global de paciente;
- mesclagem automática entre clínicas;
- compartilhamento automático de prontuário;
- transferência comum de `clinica_id`;
- integração com o laboratório externo;
- exclusão física de histórico;
- definição da arquitetura final;
- implantação de alterações.

## 53. Ações não autorizadas por este documento

Este rascunho não autoriza:

- criar ou executar migration;
- alterar banco local ou remoto;
- alterar código, policies, grants, funções ou testes;
- escolher definitivamente Node/Fastify, RPC, claims ou outra arquitetura;
- consultar ou modificar dados reais de pacientes;
- executar scripts de correção;
- realizar commit, push ou deploy.

## 54. Próximo passo documental

O proprietário deverá responder aos blocos de decisões pendentes. Depois disso:

1. promover somente as decisões confirmadas para a parte aprovada;
2. criar a matriz formal de papéis e permissões;
3. documentar os fluxos operacionais aprovados;
4. elaborar arquitetura técnica sem confundi-la com requisito funcional;
5. preparar plano de implementação e testes;
6. manter as auditorias como fotografia histórica do estado atual.
