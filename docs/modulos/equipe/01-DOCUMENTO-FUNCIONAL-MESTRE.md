# Equipe — documento funcional mestre

## Navegação de Cadastros — ajuste autorizado em 05/10/2026

A página deve permanecer na largura disponível; somente a faixa de abas pode rolar
horizontalmente. Todas as seções, inclusive Serviços, permanecem alcançáveis, com
rótulos legíveis e seleção/foco visíveis. Teclado, toque, rotas e seleção inicial
após recarga preservados. Não esconder transbordamento globalmente nem alterar regras
ou operações de Equipe. Estado técnico/publicação no relatório29.

## Rótulo de CPF — ajuste autorizado em 05/10/2026

Apresentar **CPF (opcional)**, refletindo o comportamento atual sem alterar validação,
proteção ou persistência. A divergência histórica sobre obrigatoriedade e a decisão
funcional pendente continuam preservadas; o ajuste de texto não as resolve.
As decisões24–29 permanecem vigentes; consulta completa pela Recepção, conversão de
tipo, remoção e identificação prévia de inativos/listagem futura ficam fora do pacote.

## Apresentação de fichas e formulários — pedido autorizado em 05/10/2026

- Ampliar somente Equipe; campos relacionados em duas colunas quando couberem,
  uma coluna no celular. Identificar a pessoa e separar dados pessoais/função,
  dados profissionais, vínculos, conta e acesso por clínica.
- Uma rolagem previsível; textos extensos adaptáveis, campos/ações alcançáveis,
  foco/teclado/Esc/descarte e estados de envio preservados. Ações de acesso
  independentes, sem botão geral de salvar na visualização.
- Usar identidade e tokens existentes; cores acompanhadas de texto. Restrições
  de salvar visíveis: cadastro não concede acesso, tipo fixo, vínculos mantidos,
  inclusão confirmada pelo serviço, sem reativação implícita ou estado inventado.
- Sem alterar contratos/regras das etapas24–28. Conferência do agente, cenários
  sintéticos e limitações no relatório29; não atribuir aprovação pessoal ao titular.

## Edição alinhada ao contrato — pedido autorizado em 05/10/2026

- Tipo selecionável na criação; na edição, apresentar o tipo atual como informação,
  sem conversão estrutural. Cargo, contatos e campos profissionais cabíveis continuam
  editáveis segundo as validações vigentes.
- Edição mantém vínculos existentes; apenas acrescenta clínica autorizada conforme
  contrato atual. Não oferecer desmarcação como remoção, inativação ou suspensão.
- Vínculo cadastral e acesso ao sistema são separados. Salvar cadastro não altera
  login/papel; vínculo inativo não é reativado implicitamente.
- Informação omitida sobre vínculos não comprova clínica livre. Sem estado autorizado
  de inativos na leitura atual, explicar a limitação e a conferência ao salvar;
  identificação prévia/remoção/reativação exigem evolução específica futura.
- Resposta parcial não vira campos vazios: só abrir edição com dados necessários
  carregados. Preservar tipo, identificador, revisão, CPF e vínculos conhecidos;
  vínculos ocultos mantidos pelo servidor, sem revelação/contorno de autorização.
- Pedido de execução não atribui aprovação pessoal ao resultado. Estado local,
  conferências e limites no relatório28; correções24–27 preservadas.

## Clareza de conta e acesso — pedido autorizado em 05/10/2026

- Cadastro, conta global, convite, vínculo profissional e acesso por clínica são
  informações distintas. Campo ausente não significa conta ou acesso inexistente.
- “Sem conta vinculada” exige ausência explícita confirmada; informação insuficiente
  recebe texto de não confirmação. E-mail de contato/convite não comprovam login.
- Lista usa os dados coletivos disponíveis e a leitura detalhada da ficha aberta,
  sem buscar conta por linha. Não reaproveitar resultado de pessoa/clínica diferente.
- Operação confirmada atualiza painel e lista sem F5, mantendo filtros/contexto;
  falha/incerteza não inventa sucesso nem repete escrita automaticamente.
- Papel atual vem do serviço; papel para nova operação continua explícito e separado.
  Sem escolha, resumo orienta selecionar e confirmação permanece bloqueada.
- Papéis, CPF, vínculos/permissões e acesso operacional de Recepção preservados.
  Evidências locais e limites no relatório27; execução pelo agente não representa
  aprovação pessoal do resultado pelo usuário.

## Novos convites e concessões — pedido autorizado em 04/10/2026

- Escolha de papel explícita por pessoa/clínica, com seletor inicialmente vazio
  e resumo próximo da confirmação. Cargo ou profissão não determina autorização.
- Uma clínica marcada sem papel bloqueia a solicitação inteira. Escolhas de
  clínicas diferentes são independentes; trocar pessoa/contexto ou desmarcar
  descarta o rascunho. Falha recuperável preserva escolha, sem sucesso falso.
- Convite e vínculo por confirmação atuais também preparam acesso; mantêm
  verificações de identidade/aceite. Conta já vinculada exige escolha visível
  para conceder acesso à clínica. Cadastro sem login continua permitido.
- Acesso existente conserva referência do serviço. Convite pendente exibe seu
  papel original; reenvio não altera papel nem cria concessão nova. Estado de
  erro de envio ainda pendente deve localizar a solicitação existente.
- Mesmos três papéis/autorizações vigentes, com validação no backend. Não criar
  restrições por profissão ou ampliar acesso de Recepção. Sem repetição
  automática em falha/resultado incerto; conferir estado antes de nova tentativa.
- Implementação/conferências locais e limites no relatório26; pedido autorizado
  não representa aprovação pessoal do resultado pelo usuário.

## Tratamento de erros — pedido autorizado em 04/10/2026

- Sessão, permissão, validação, conflito, tentativas, rede e serviço usam mensagens
  seguras, preservando códigos/status internamente. Não exibir texto bruto do
  servidor nem revelar existência de pessoa/conta/vínculo fora da autorização.
- Falha de comunicação após escrita exige conferir o estado atual; não afirmar
  ausência de gravação nem repetir automaticamente. Preservar preenchimento e
  liberar carregamento; aviso deve ficar visível dentro da ficha no celular.
- Listagem antiga só com sinal específico de ausência da função. Recusa não é
  migração pendente; lista vazia confirmada não é erro. Não reaproveitar dados de
  outra clínica/sessão/perfil nas transições.
- Autorizações vigentes não são ampliadas. Manter navegação de Cadastros e consulta
  operacional Profissionais da Recepção. Uma consulta completa da equipe por esse
  perfil permanece pendente de definição, sem criar permissão para implementá-la.
- Estado local e evidências em `25-TRATAMENTO-ERROS-E-COMPATIBILIDADE.md`. Pedido
  de implementação não representa aprovação pessoal da conferência concluída.


## Seletor de acesso existente — decisão aprovada em 04/10/2026

- Papel retornado pelo servidor para a pessoa/clínica é a referência; tipo de
  cadastro não o substitui. Seleção local não grava automaticamente.
- Salvar papel só é permitido com mudança válida sobre papel confirmado. Voltar
  ao original desabilita o botão. Ausência/papel desconhecido bloqueia edição.
- Envio e releitura bloqueiam repetição. Sucesso atualiza a referência com leitura
  confirmada do serviço; falha não apresenta a seleção como papel salvo.
- Reabertura/F5 recuperam dados atuais; troca de pessoa/contexto e respostas
  atrasadas não reaproveitam edição. Estados sem acesso/convite permanecem separados.
- Implementação local e limites registrados em `24-CORRECAO-SELETOR-PAPEL.md`;
  não altera papéis, autorização, convites/concessões ou banco.



## E-mails — decisão aprovada em 30/09/2026

Usar modelos compartilhados em português, identidade Brotas/Ipupiara/conjunta derivada no servidor e link oficial do Auth preservado. Ausência de contexto usa identidade conjunta. Marca/metadados não autorizam acesso; não trocar template global por destinatário nem mutar metadados de contas existentes por envio. Recuperação somente quando houver fluxo disponível. Estado técnico/previews e bloqueio de aplicação remota registrados no relatório 23, sem contratação ou alteração SMTP.

**Estado:** APROVADO em 28/09/2026 para a primeira entrega.

- Proprietária/Administradora pode consultar, cadastrar e editar membros da equipe nas clínicas em que possui autorização.
- Cargo, profissão e acesso ao sistema são conceitos separados. Funcionário pode existir sem login; e-mail de contato não altera e-mail de autenticação.
- Uma pessoa possui cadastro global e vínculos com uma ou duas clínicas, sem duplicação. Vínculos fora da autorização do operador não são removidos por uma visão parcial.
- A obrigatoriedade do CPF para equipe ainda aguarda decisão funcional. Até essa decisão, o campo é opcional; quando informado, deve ser válido, protegido por criptografia e hash e único no cadastro global. CPF indisponível nunca é tratado como campo vazio nem sobrescrito silenciosamente. Essa regra não altera o CPF opcional de pacientes.
- Profissionais de saúde podem ter profissão, conselho, registro, UF e especialidade. Campos profissionais não são exigidos de funções administrativas ou de apoio.
- Novo profissional de saúde continua integrado às tabelas já consumidas por Agenda e Financeiro. Funcionários de apoio não são inseridos em `profissionais`.
- Cadastro e edição exigem papel interno `proprietaria` no banco para cada clínica de destino. A interface não concede papéis, cria usuário Auth, define senha, envia convite ou exclui registros.
- Após confirmação do banco, a interface mostra “Funcionário cadastrado com sucesso.” ou “Cadastro atualizado com sucesso.”; falhas preservam o formulário.

## Convites vencidos e suspensão — decisão confirmada em 30/09/2026

- Preparar uma nova solicitação é a ação explícita que encerra um convite vencido; o registro anterior permanece no histórico e não é reativado.
- Repetição da mesma tentativa é idempotente. Resposta externa atrasada não pode transformar convite cancelado ou aceito em enviado/erro.
- Conta criada no Auth e ainda não registrada no convite deve ser recuperada pelo e-mail exato, sem duplicação e sem acesso clínico antes do aceite.
- Suspensão por clínica vale no servidor imediatamente, inclusive para token emitido antes da ação. Reativação devolve somente o acesso autorizado.
- Endereços locais permitidos para desenvolvimento são explicitamente `localhost` e `127.0.0.1` nas portas 3000 e 5173.
- Entrega e aceite por e-mail exigem redirect allowlisted e caixa de teste autorizada; ausência desses itens não deve ser apresentada como convite homologado.
