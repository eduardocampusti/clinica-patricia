# Equipe — documento funcional mestre

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
