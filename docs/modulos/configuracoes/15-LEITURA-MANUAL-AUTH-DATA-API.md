# Sequência conjunta — leitura manual de Auth e Data API

## Leitura oficial posterior — 09/10/2026, 07:11 -03

CLI2.120.0 autenticada consultou GET /v2/projects/{ref}/config por config diff somente leitura no alvo permitido. Confirmados por comparação declarada: Data API ligada, public/graphql_public, search path public/extensions, max_rows1000; hook agora ligado para acesso_direto_token_hook após aplicação autorizada. TOTP enroll/verify ligados; matrícula dos usuários e outros métodos não consultados. Intervalo de reutilização ainda não conferido. A leitura manual de08/10 abaixo permanece preservada com sua origem e valores históricos, não reclassificada como API. [Aplicação e provas](18-APLICACAO-GUARDA-E-SEQUENCIA-AUTORIZADA.md).


## Horários do complemento manual confirmado — 08/10/2026,23:15 -03

Origem: conferência manual do painel fornecida pelo usuário, somente leitura, sem alteração ou salvamento de configuração; não GET Management API. Alvo xftnkusbyqzyvzrovroj.

| Campo | Horário da conferência em08/10/2026, America/Bahia | Valor informado |
| --- | --- | --- |
| Authentication → Emails → Security → Password changed | 22h58 | DESLIGADO |
| Authentication → Attack Protection → Enable Captcha protection | 22h59 | DESLIGADO |
| Provedor CAPTCHA | 22h59 | Não exibido |

Intervalo de reutilização de refresh tokens e métodos MFA permanecem **não conferidos**. O complemento não informa o estado das demais notificações automáticas. Os dois itens solicitados foram atendidos; não pedir novamente esses campos ou autorização. Impedimento atual é a autoridade de alteração do objeto gerenciado GraphQL, identificado na execução; [resultado conectado](16-APLICACAO-E-HOMOLOGACAO-CONJUNTA.md).


## Complemento recebido e aplicação iniciada — 08/10/2026,23:10 -03

Titular confirmou manualmente **Password changed desligado** e **CAPTCHA desligado**,
sem salvar configurações; não são GET Management API. Esses dois pedidos mínimos
foram atendidos, não solicitar novamente. Reuse interval e MFA não conferidos não
são pré-requisito da DDL. Etapa0 liberada pela evidência manual compatível;230000
aplicada,230100 falhou por autoridade insuficiente no objeto interno GraphQL.
Não falta novo campo manual para esse bloqueio; [estado e recuperação atuais](16-APLICACAO-E-HOMOLOGACAO-CONJUNTA.md).

## Valores recebidos do titular — 08/10/2026,22:59 -03

**Origem: leitura manual do painel fornecida pelo usuário.** Conferência realizada
entre **22h35 e 22h53 de 08/10/2026**, America/Bahia, no projeto
`xftnkusbyqzyvzrovroj`. Não houve GET Management API pelo Codex para obter estes
valores. Esta seção substitui a pendência dos campos efetivamente informados;
pedidos e resultados anteriores abaixo permanecem históricos.

| Campo observado | Valor informado pelo titular |
| --- | --- |
| Auth Hooks | Lista vazia, com “Create an auth hook”; nenhum configurado, inclusive Custom Access Token |
| Email provider | Ligado |
| Allow new users to sign up | Desligado |
| Confirm email | Ligado |
| Allow manual linking | Desligado |
| Allow anonymous sign-ins | Desligado |
| Secure email change | Ligado |
| Secure password change | Desligado |
| Require current password when updating | Desligado |
| Prevent use of leaked passwords | Desligado; painel informa exigência de Pro ou superior |
| Minimum password length | 6 caracteres |
| Password requirements | Nenhuma opção selecionada |
| Email OTP expiration | 3600 segundos |
| Email OTP length | 8 dígitos |
| Single session per user | Desligado |
| Time-box user sessions | 0, exibido como “never”; campo menciona horas |
| Inactivity timeout | 0, exibido como “never”; campo menciona horas |
| Access token expiry time | 3600 segundos |
| Detect and revoke potentially compromised refresh tokens | Ligado |
| Enable Data API | Ligado |
| Exposed schemas | public e graphql_public; private desmarcado |
| Automatically expose new tables | Desligado |
| Extra search path | public e extensions |
| Max rows | 1000 |
| Pool size | Configurado automaticamente; nenhum tamanho numérico informado |

| Campo ainda não conferido | Estado da evidência / necessidade nesta sequência |
| --- | --- |
| Intervalo de reutilização dos refresh tokens | **Não conferido**. Não solicitar agora nem presumir intervalo padrão. Nenhuma alteração prevista; revogação/corte de sessão precisam passar nos testes reais independentemente de um intervalo presumido. |
| Password changed e demais notificações automáticas | **Não conferidos**. Solicitar somente estado de **Password changed**, indispensável para executar troca de senha/recuperação da conta controle sem envio. Demais notificações permanecem não conferidas; não exercitar mudanças positivas de e-mail, telefone, identidades ou fatores MFA. |
| Métodos MFA habilitados | **Não conferidos**. Não solicitar agora; contas fictícias novas sem fatores cadastrados e nenhum teste de inscrição/desinscrição MFA previsto. Não alterar MFA existente nem alegar homologação desse fluxo. |
| CAPTCHA e seu provedor | **Não conferidos**. Solicitar somente ligado/desligado e, se ligado, nome do provedor. Indispensável para avaliar login normal e verificação de senha pessoal da Edge, que usa signInWithPassword sem captchaToken. Não desligar ou contornar a proteção para executar testes. |

Avaliação do código: senha temporária de24 caracteres e senha pessoal com mínimo12
e quatro classes são compatíveis com as exigências informadas; não há razão para
reduzir proteção global. A lista vazia elimina a pendência de composição com hook
anterior na fotografia manual; os schemas informados coincidem com a cobertura
revisada. Isso **não comprova** hook novo aplicado, runtime correto, testes
funcionais conectados ou recuperação completa da configuração remota.

Para o próximo retorno, conferir **apenas**:

1. Authentication → Emails/Email Templates → Security notifications →
   **Password changed**: ligado/desligado.
2. Authentication → Attack Protection/Bot and Abuse Protection →
   **Enable CAPTCHA protection**: ligado/desligado; se ligado, nome do provedor.

Não solicitar assinatura, tokens, chaves, cookies, senhas ou captura. Informação
faltante não é nova autorização. Notificação Password changed ligada pode gerar
tentativa de envio no UserUpdate usado pela recuperação; não desligá-la globalmente
para acomodar a homologação. CAPTCHA ligado exige revisar o caminho compatível
antes dos testes, sem enfraquecê-lo. Fontes oficiais consultadas:
[CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha),
[notificações](https://supabase.com/docs/guides/auth/auth-email-templates) e
[UserUpdate](https://github.com/supabase/auth/blob/master/internal/api/user.go).
O código público vigente não prova a versão do Auth hospedado; o estado do painel
e as verificações conectadas continuam necessários.

Nenhuma escrita remota foi realizada nesta sessão. Autorização conjunta vigente;
TypeSafe/Jev anteriores reaproveitados, sem chamada nova. Pedido adicional restrito
a estes dois estados apresentado pela interface. Recebidos os valores, conferir
compatibilidade e estado mutável e retomar aplicação/homologação/encerramento
autorizados, mantendo frontend e habilitação geral desligados.

## Conexão separada efetivamente criada — 08/10/2026,22:36 -03

Conforme autorização explícita mais recente, executado o comando oficial
`codex mcp add supabase-clinica-patricia --url https://mcp.supabase.com/mcp?project_ref=xftnkusbyqzyvzrovroj`.
A CLI adicionou o servidor global separado, iniciou OAuth oficial e confirmou
**Successfully logged in**. Não usados bearer-env/PAT, cookies, tokens de outra
ferramenta ou credenciais fornecidas ao modelo. A URL fixa restringe este MCP ao
projeto aprovado; não há alteração de domínios/contas/Auth do produto.

Metadados de `supabase-geovanna` comparados antes/depois por SHA256: idênticos.
Nenhum comando de remoção, logout, remapeamento ou chamada ao projeto Geovana.
Definição nova habilitada, URL exata conferida e auth_status=o_auth. Evidências
sanitizadas em `scratch/configuracoes-aplicacao/mcp-antes-separacao.json` e
`mcp-depois-separacao.json`; somente hash/metadados, sem configurações secretas.

As ferramentas da nova conexão ainda não foram entregues a esta conversa.
Tentativa única de consulta `mcpServerStatus/list` pelo protocolo oficial Codex
app-server encerrou antes da resposta. Outros MCPs desabilitados **somente naquele
processo**, sem mudar configuração persistida. Nenhuma thread/agente/turno de IA
criado, nenhuma ferramenta de banco chamada. Não apresentar o catálogo documentado
como lista efetiva do runtime. Artefato `ferramentas-mcp-oficiais.json` registra falha,
nunca sucesso vazio. Os instrumentos efetivos devem ser reconferidos após recarga.

Se a nova conexão ainda não aparecer no cliente: **Settings/Configurações → MCP
servers → Restart/Reiniciar** para carregar a configuração, conforme documentação
oficial. OAuth já concluído; não solicitar autorização de novo sem erro concreto.
O catálogo oficial MCP não documenta GET Auth/config; OAuth MCP não permite
reutilizar/extraír seus tokens para construir um cliente da Management API.
Nenhum canal já disponível com GET Auth da Management API foi identificado.

### Coleta manual atual mínima

No [painel do projeto aprovado](https://supabase.com/dashboard/project/xftnkusbyqzyvzrovroj),
somente consultar; não salvar, trocar opções ou contratar recursos. Esta coleta
curta substitui o pedido amplo histórico abaixo. Campos ausentes: responder
**não aparece**, sem inferência. Retornar apenas estados/números/opções:

1. **Authentication → Hooks**: Custom Access Token ligado/desligado; PostgreSQL ou
   HTTP. Para PostgreSQL, schema/função selecionados, inclusive configuração
   desligada se visível. Nomes dos outros hooks ativos. Para HTTP não enviar URL
   completa/caminho/assinatura; informar só tipo e existência de destino configurado.
2. [**Sign In / Providers → Email**](https://supabase.com/dashboard/project/xftnkusbyqzyvzrovroj/auth/providers?provider=Email):
   Email enabled, Confirm email e Allow new users to sign up, ligado/desligado.
3. **Na mesma tela Email**: comprimento mínimo, caracteres exigidos, proteção
   contra senhas vazadas; Require reauthentication when changing password e
   Require current password when changing password. Somente regras/estados,
   nenhum exemplo ou valor de senha.
4. [**Authentication → Sessions**](https://supabase.com/dashboard/project/xftnkusbyqzyvzrovroj/auth/sessions):
   JWT expiry com unidade, Single session per user, duração máxima/inatividade
   se habilitados. Não solicitar qualquer JWT/refresh token.
5. [**Integrations → Data API**](https://supabase.com/dashboard/project/xftnkusbyqzyvzrovroj/integrations/data_api/overview)
   (ou Project Settings → Data API): somente lista de Exposed schemas. API já
   respondeu no preflight; não pedir chaves ou configuração completa.
6. **Authentication → Email Templates/Emails** e **Attack Protection**: somente
   estado de Password changed e de CAPTCHA. São necessários para zero envios e
   para não contornar uma proteção existente durante login/verificação de senha.

Os cinco primeiros itens e complemento de dois estados foram solicitados pela
interface; nenhuma resposta recebida até este registro. São informações faltantes,
nunca nova autorização para a sequência já aprovada. Hook PostgreSQL prévio será
revisado por SQL oficial; HTTP ativo exige preservar sua definição pelo painel sem
expor segredo. Nenhuma proteção será desligada para acomodar a homologação.

Nenhuma migração, conta/contexto fictício, publicação ou ajuste do Auth do produto
realizado. A ausência desses valores impede a primeira escrita conforme plano0.
Após retorno compatível e recuperação preservada, retomar a sequência já autorizada;
geral/frontend false, sem commit/push/deploy do frontend. Não repetir baterias locais.

TypeSafe integralmente consultada, índice vivo lido; sem IA neste fluxo. Triagem
Jev só sintética do novo pedido de configuração: agent_configuration, confiança0,54;
complexidade1,29/2, confiança0,56; falta de informação0,56. Codex assumiu decisão
operacional em incerteza.861+119=980 tokens,990,5972ms,US$0,000036162, chamada única.

Fontes: [MCP no Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli),
[MCP Supabase/projeto/OAuth/ferramentas](https://supabase.com/docs/guides/ai-tools/mcp),
[protocolo oficial de status](https://learn.chatgpt.com/docs/app-server).
Estado22:30 abaixo é histórico anterior à criação desta conexão.

08/10/2026, 22:30 -03:00, America/Bahia. Alvo exclusivo `xftnkusbyqzyvzrovroj`.
Continuação da autorização vigente; nenhuma nova autorização solicitada.

## Resultado da conferência do canal nesta sessão

| Canal | Evidência observada | Capacidade disponível para a leitura pendente |
| --- | --- | --- |
| Catálogo oficial de plugins | Supabase retorna `installed=false`, status ENABLED/installation_policy AVAILABLE. Isso é disponibilidade no catálogo, não conexão autenticada. | Nenhum instrumento Supabase entregue à conversa; nenhum descobridor que permita carregá-lo. Não confirma instalação em todas as interfaces do aplicativo. |
| Configuração MCP da CLI Codex | Único registro Supabase: `supabase-geovanna`, enabled=true, auth_status=o_auth, host mcp.supabase.com, project_ref diferente do alvo. | Somente metadados locais inspecionados; não comprova validade atual de OAuth nem capacidade no projeto permitido. Não utilizado, remapeado ou consultado remotamente. |
| CLI Supabase2.110.0 já autenticada | Evidências anteriores de alvo e conexão preservadas; `config` oferece somente `push`. | Consultas SQL e serviços anteriores já disponíveis. Nenhum comando documentado de leitura de Auth/REST nesta versão inspecionada. Não executar push para descobrir a configuração. |
| Navegador | Falha de inicialização já documentada em Configurações14. | Não houve nova tentativa nesta sessão, conforme instrução do titular. |

A lista vigente do [MCP oficial](https://supabase.com/docs/guides/ai-tools/mcp)
documenta consultas SQL, tabelas, serviços e outras operações; não lista uma
operação específica GET Auth/hooks ou GET configuração PostgREST. SQL pode mostrar
funções do banco, mas não comprova qual hook o serviço Auth está configurado para
executar. Conectar um projeto não comprova essa capacidade. Nenhum conector
autenticado do alvo com essas operações está disponível nesta sessão.

## Comprovado e pendente

Comprovado previamente por leitura conectada: projeto correto/saudável, catálogo
51 tabelas/69 funções compatível naquele momento, quatro versões anteriores de
serviços preservadas, backend novo ausente. A sessão Configurações observou
PostgREST servindo `public, graphql_public`, signup desabilitado e autoconfirmações
false pela API pública. São evidências datadas; não foram reexecutadas aqui.

Falta a configuração oficial de Auth/hooks e os parâmetros do painel de Data API.
Ainda não há prova de compatibilidade do hook, recuperação prévia completa ou
homologação com sessões das contas fictícias. Nenhuma migração, configuração Auth,
serviço, conta, vínculo ou contexto foi aplicado/criado nesta tentativa. Nada novo
a encerrar. Frontend e habilitação geral permanecem desligados.

## Histórico do roteiro amplo de leitura — 22:30

Preservado como contribuição anterior. O retorno atual solicitado é somente a
coleta mínima acima; não enviar o conjunto inteiro abaixo ou configuração completa.

Abra o [projeto autorizado no painel Supabase](https://supabase.com/dashboard/project/xftnkusbyqzyvzrovroj).
Confira a referência na barra de endereço antes de ler. Apenas consulte os valores;
não altere switches, não clique Save, não habilite hook e não crie contas.
Retorne texto com os campos abaixo. Campo ausente deve ser informado como
**não exibido**, nunca preenchido com um valor presumido.

| Tela/menu | Campos exatos a conferir e retornar |
| --- | --- |
| Authentication → Auth Hooks / Hooks | **Custom Access Token**: ativo/inativo, SQL ou HTTP. Se SQL, schema e nome da função selecionada, mesmo se configurada mas desligada. Para HTTP, somente host e caminho sem parâmetros/credenciais; informe se a assinatura está configurada, sem seu valor. Liste também os outros hooks ativos visíveis: Before User Created, After User Created se existir, Password Verification Attempt, MFA Verification Attempt, Send Email e Send SMS; para cada um, tipo e função SQL ou destino HTTP sanitizado. |
| Authentication → Sign In / Providers | **Allow new users to sign up**, **Confirm email**, login anônimo e vinculação manual se exibidos: ligado/desligado. Abra **Email**: Enabled, **Minimum password length**, **Password requirements/Required characters**, **Prevent use of leaked passwords**, **Secure password change**, **Require current password when updating**. Retorne números, opção selecionada e estados; nenhum exemplo de senha. |
| Authentication → Sessions | **JWT expiry/Access token expiry** com unidade; **Refresh token rotation**, **Refresh token reuse interval** com unidade; **Time-box user sessions**, **Inactivity timeout**, **Single session per user**, com estados/durações. Se uma opção não estiver disponível no plano, informe isso; não contrate/habilite recursos. |
| Project Settings → Data API (ou API → Data API) | **Enable Data API**, lista completa de **Exposed schemas**, **Extra search path** e **Max rows**, exatamente como aparecem. Não abrir/copiar API Keys, JWT Secret ou Connection string. |
| Authentication → Email Templates / Emails | Apenas estados das notificações de segurança, especialmente **Password changed**; liste outras notificações automáticas ativas. Não copiar modelos, links de confirmação, conteúdo de mensagens ou credenciais SMTP. |
| Authentication → Multi-Factor e Attack Protection | MFA TOTP/App Authenticator, Phone e WebAuthn: estados de enrollment/verification se visíveis. CAPTCHA: ligado/desligado e nome do provedor, sem site/secret key. Isso evita presumir que login de teste/verificação de senha dispensa controles existentes. |

Os nomes de navegação podem variar com a versão do painel; use os rótulos dos
campos. As localizações vêm da [configuração geral oficial](https://supabase.com/docs/guides/auth/general-configuration),
da [configuração de hooks](https://supabase.com/docs/guides/auth/auth-hooks), da
[política de senhas](https://supabase.com/docs/guides/auth/password-security), das
[sessões](https://supabase.com/docs/guides/auth/sessions) e dos
[schemas expostos](https://supabase.com/docs/guides/api/using-custom-schemas).

Formato de retorno sugerido, somente texto:

```text
Projeto: xftnkusbyqzyvzrovroj
Data/hora da conferência:
Custom Access Token: ativo/inativo; SQL/HTTP; função ou destino sanitizado:
Outros hooks ativos (nome, tipo, função/destino sanitizado):
Signup / Confirm email / Email enabled / Anonymous / Manual linking:
Senha: mínimo; caracteres exigidos; leaked-password protection:
Secure password change / Require current password when updating:
Sessões: JWT expiry; rotation; reuse interval (informar unidades):
Time-box / Inactivity timeout / Single session:
Data API enabled / Exposed schemas / Extra search path / Max rows:
Notificação Password changed / outras notificações automáticas ativas:
MFA (método e estados) / CAPTCHA (estado e provedor):
Campos não exibidos:
```

Não retornar tokens, senhas, cookies, chaves, assinatura de hook, segredos SMTP ou
provedores, JSON completo de configuração ou capturas que exponham segredos.
Um destino HTTP que contenha segredo no caminho deve ser descrito como
**HTTP com destino sensível**, sem copiá-lo. Não pedir ao usuário código privado
de hook nesta coleta. Se houver hook existente, o Codex deverá revisar sua função
SQL pelo canal oficial já disponível ou identificar o impedimento específico de
composição HTTP; não substituir automaticamente.

## Rotas oficiais e continuidade

A documentação vigente confirma:

- [Auth](https://supabase.com/docs/reference/api/v1-get-auth-service-config):
  `GET /v1/projects/xftnkusbyqzyvzrovroj/config/auth`, escopo OAuth auth:read.
- [Data API](https://supabase.com/docs/reference/api/v1-get-postgrest-service-config):
  `GET /v1/projects/xftnkusbyqzyvzrovroj/postgrest`, escopo rest:read. A referência
  anterior `/config/postgrest` não corresponde à rota GET documentada atualmente.
  A resposta pode incluir jwt_secret; não exportar seu JSON completo.

Nenhuma destas requisições privadas foi executada nesta sessão; documentação
pública não equivale a configuração real. As informações retornadas pelo titular
serão registradas como **conferência manual no painel informada pelo usuário**, e
não como GET executado pelo Codex. Valores compatíveis permitem prosseguir na
sequência seletiva já autorizada, após reconferir somente estado mutável e fontes
simultâneas. Hook ativo exige revisão/composição; schema adicional exposto exige
revisão específica antes de escrita. Não reduzir MFA, política de senha, CAPTCHA,
reautenticação ou demais controles para acomodar o teste. Notificações/hooks devem
ser compatíveis com o limite de zero envios da sequência.

Depois dos gates: aplicar na ordem de Configurações13, verificar integridade após
cada SQL, publicar somente serviços autorizados, homologar H1–H6 e C-A/C-B/dois
contextos, encerrar as oito contas/vínculos/contextos e manter flags gerais false.
Não repetir autorização nem baterias locais válidas. TypeSafe/Jev anteriores
reaproveitados, sem chamada ou IA determinando autenticação nesta retomada.
