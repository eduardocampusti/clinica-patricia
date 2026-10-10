# E-mails institucionais — preparação e limite remoto

Data: 30/09/2026. Projeto autorizado: `xftnkusbyqzyvzrovroj`.

## Estado vigente — SMTP salvo, modelos aplicados e validação em andamento

### Atualização posterior — recebimento confirmado; retorno ao login em investigação

**Estado posterior01/10 — aceite real concluído; correção da continuação:** titular abriu o reenvio, definiu pessoalmente a senha e apresentou Acesso confirmado. SELECT restrito ao convite sintético confirmou statusaceito/aceito_em preenchido, mesma conta, tentativas2 e um vínculo clínico ativo. Isso confirma aceite persistido, mas não login posterior/recuperação. Não é autorização administrativa implícita nem prova de todas as permissões operacionais.

Defeito concreto no botão Continuar: callback usava somente history.replaceState e setters para null/false, iguais ao estado atual. Esses setters podiam não renderizar novamente; a tela continuava mostrando sucesso até atualização incidental. Além disso, listas consultadas antes do aceite podiam estar vazias. Correção mínima: navegação efetiva com location.replace para o mesmo caminho sem parâmetros, restaurando a sessão e refazendo consultas/autorização normais do Login. Botão mostra Abrindo sistema…, disabled/aria-busy; não repete aceite, não altera Auth/RLS/banco, não concede acesso só pela confirmação visual. Arquivos App.tsx/ConviteEquipe.tsx e nota de evolução; skill Impeccable aplicada somente ao feedback, sem redesign. TypeSafe não necessária para a navegação determinística.

Teste sintético dirigido em tests/login/convite.spec.ts reproduziu a tela parada antes da correção, nas duas unidades; após correção dois cenários aprovados (desktop Brotas/celular Ipupiara), consulta renovada, sessão Recepção, parâmetro removido, aceite chamado uma única vez e sem overflow. Primeira tentativa sem servidor4182 recebeu conexão recusada, não considerada reprodução; execução com servidor isolado reproduziu o defeito. Build/lint aprovados, avisos preexistentes de bundle/ThemeProvider. Publicação desta correção e conferência posterior pelo titular registradas abaixo conforme execução; não apresentar os testes interceptados como navegação conectada corrigida.

**Continuação01/10/2026:** titular informou ausência de `convite=` na página aberta. A navegação pública com UUID fictício preservou o parâmetro e exibiu Confirmar acesso à equipe/Nova senha; nenhum formulário foi enviado e a aba de prova foi fechada. Isso comprova roteamento/apresentação quando o identificador chega, não autenticação do destinatário nem validade de um convite fictício. Código publicado reconferido: preparo passa `retorno` autorizado a `garantirConta`, que acrescenta o convite na chamada Auth. Não comprovada causa final da perda na primeira navegação; não atribuir ao fragmento/SDK sem evidência.

Como o link anterior já teve verificação e recusas posteriores403, realizado **um único reenvio controlado**, pela sessão proprietária no sistema público, botão Reenviar convite da mesma fixture. Interface confirmou “Solicitação reenviada. O acesso continua pendente até o aceite.” SELECT posterior: mesmo convite/mesmo Auth, tentativas2, statusenviado, aceitofalse e zero acessos ativos. Nenhuma conta/membro duplicado, alteração de senha, código, template, SMTP, permissão ou deploy nesta continuação. Captura sanitizada da mensagem em `scratch/emails-institucionais/reenvio-confirmacao-20261001.png`.

Titular deve abrir somente a mensagem mais recente em janela separada/anônima, clicar uma vez e verificar a tela de confirmação/Nova senha. Definição e envio da senha são pessoais; não pedir link completo, token, código ou senha. Recebimento deste reenvio/aceite/recuperação/limpeza ainda pendentes. Não repetir build/testes locais sem alteração. Fixture mantida para concluir a validação, auditoria preservada.

Limitação da captura nesta continuação: o recorte PNG citado acima resultou visualmente vazio e **não serve como evidência**. A confirmação foi observada no estado acessível e na tela; tentativa de salvar captura integral foi rejeitada pela revisão automática da ferramenta de navegador por possível inclusão de dados pessoais da sessão. Nenhuma captura integral foi salva e nenhum controle contornado. A prova do reenvio é a resposta visível do serviço e a leitura de tentativas2/mesma conta/zero acessos, não aquele arquivo PNG.

O titular confirmou recebimento e apresentou captura: remetente `administracao@clinicabrotas.com.br`, nome Clínicas Brotas e Ipupiara, identidade Brotas e conteúdo profissional em português. O assunto e o destino completo do link não são visíveis nessa captura; não foram presumidos. Relatou que o botão abre o login sem oferecer definição de senha. Isso **não é aceite concluído**.

Consultas SELECT restritas aos IDs sintéticos desta execução confirmaram conta Auth existente, e-mail confirmado e `last_sign_in_at` preenchido; convite ainda `enviado`, sem `aceito_em` e não expirado. Essas consultas administrativas não comprovam que a tela de definição de senha funcionou. Logs Auth mostraram `/verify` Login em30/09 às20:28:40 (horário exibido no painel), seguido de `/logout` às20:28:41, e recusas posteriores `/verify` HTTP403 “Email link is invalid or has expired” às20:28:47,20:29:08,20:39:19 e20:39:20. Não foram consultados tokens ou links completos. A correlação da primeira navegação com o parâmetro `convite` ainda requer evidência do navegador do titular; não atribuir definitivamente a causa à expiração do convite de Equipe, que permanece válido, nem ao SMTP.

Allowlist remota reconferida: oito URLs anteriores preservadas, inclusive retorno público Brotas com `?convite=*`. Editor remoto confirmou `redirectComConvite` acrescentando o identificador na URL; nenhuma alteração/publicação executada. No código, App só abre ConviteEquipe com sessão e identificador UUID na query; sem ambos cai no Login. Login pode encerrar sessão sem vínculos ativos — esperados antes do aceite. SDK instalado preserva a query ao limpar o fragmento da sessão. Não há evidência suficiente para alterar essa lógica como causa comprovada. Solicitada apenas confirmação de presença de `convite=` na barra, nunca link completo/token/senha.

Nenhum reenvio, alteração de senha, conta, permissão ou limpeza nesta investigação. Fixture preservada exclusivamente para concluir o ensaio; aceite, definição de senha, login, recuperação e limpeza continuam pendentes. TypeSafe e índice oficial consultados; integração desnecessária para esta verificação determinística.

**Continuação pública — convite institucional enviado uma vez, aguardando titular:** a administradora informou que recebeu a recuperação, definiu a senha e conseguiu entrar. É confirmação do titular, não ação de alteração de senha pelo agente. Na aba pública https://clinicabrotas.com.br/acesso/brotas, o agente confirmou sessão ativa de Proprietário(a), entrou no sistema e abriu Equipe. Não repetiu build/testes, não alterou código/SMTP/senha real. Conta usada não registrada aqui por privacidade.

Preflight somente leitura por destinatário exato confirmou **zero contas Auth, zero membros e zero convites** antes da nova execução. Portanto a recuperação anterior do destinatário sintético sem conta não comprova falha de SMTP. O ensaio22 continua encerrado; esta é a nova execução institucional autorizada, identificada separadamente. Criada pela interface pública somente a fixture `Teste Email Institucional Recepção 20260930`, sem CPF/profissional, cadastro apenas em Brotas. Ficha inicialmente Sem conta vinculada/Sem acesso. Preparado modo convite, papel Recepção somente Brotas; um único clique Enviar convite. Interface confirmou “Convite enviado. O acesso ficará pendente até a pessoa aceitar e definir a própria senha.”

Leitura posterior confirmou convite **enviado**, **tentativas1**, conta Auth não confirmada, **zero acesso clínico ativo**, membro ainda não vinculado ao usuário, escopo exclusivo Recepção/Brotas. IDs exatos da nova execução:

- membro `08eee1c9-cc61-4550-832a-4b7ea28b4d53`;
- convite `6a3756f4-9502-48d7-9117-2c5195e0ba77`;
- conta Auth `ad378ac3-212a-42bf-bc4b-fdde4af237bc`;
- clínica Brotas `7c2a450d-7b9a-4701-8d5a-982eda331c58`.

Estado interno sem senha/token/e-mail em arquivo ignorado `scratch/emails-institucionais/ensaio-state.json`. Preflight registrou ausência de objetos do destinatário; essa proteção limitada permite identificar exclusivamente os alvos novos, não é backup completo de Auth/projeto nem recuperação validada. Captura da confirmação pública em `scratch/emails-institucionais/convite-publico-pendente.jpg`, sem senha ou token. Auditoria preservada; limpeza **não executada**, deve ocorrer após o titular concluir convite/recuperação e conferir dependências.

Separação atual: **solicitação aceita pelo serviço: comprovada**; **recebimento do novo convite: aguardando titular**; remetente/nome/assunto/conteúdo/link da mensagem recebida: aguardando conferência do titular; aceite/login da conta sintética: pendentes; recuperação da conta sintética após aceite: pendente; limpeza: pendente. Titular orientado a abrir a mensagem no endereço de teste autorizado em janela separada da administradora, conferir remetente institucional/nome conjunto/português/destino público Brotas, definir a própria senha e aceitar. Não solicitado link, token, código ou senha. Nenhum reenvio. Os diagnósticos e estados “nenhum envio/fixture” abaixo são anteriores a essa continuação.

Titular salvou SMTP; painel confirmou habilitado, nome Clínicas Brotas e Ipupiara, smtp.hostinger.com:465 e senha armazenada oculta. URLs públicas de convite/recuperação adicionadas preservando retorno local; SiteURL público Brotas. Modelos convite, magic link e recuperação salvos no painel; primeira tentativa de convite recusada pelo limite255 do assunto, expressão compactada preservando seleção de identidade. Recuperação implementada no código: resposta neutra, destino exato por domínio, evento PASSWORD_RECOVERY necessário, validação/erro/sucesso e saída da sessão após alteração, sem criação de vínculos. Build/lint aprovados; quatro testes de navegador com serviço interceptado aprovados (Brotas desktop, Ipupiara móvel, falha/retorno sem autorização, atualização sintética). Publicação e entrega real ainda em andamento. Histórico abaixo preservado.

### Aplicação e evidências desta execução

- Remoto: modelos Invite user, Magic link or OTP e Reset password salvos em Authentication → Emails. A conferência de Preview encontrou texto inglês anterior concatenado ao HTML novo pelo editor; corrigido com seleção integral, substituição e salvamento dos três corpos. Prévias remotas agora mostram somente os títulos/mensagens profissionais em português, sem conteúdo inglês antigo. Assunto de convite também precisava respeitar limite255; compactado no arquivo versionado e aceito pelo painel. Não confundir a prévia do painel, que mostra expressões Go literalmente, com renderização de variáveis de uma mensagem entregue.
- Recuperação e magic link usam identidade conjunta: não usam metadados editáveis da conta para atribuir uma clínica. Convite usa contexto visual preparado pela Edge a partir das unidades autorizadas persistidas; sem contexto usa identidade conjunta. Nenhuma metadata visual concede permissão. Todos preservam `{{ .ConfirmationURL }}`.
- SiteURL: `https://clinicabrotas.com.br/acesso/brotas`. Allowlist confirmada com oito entradas: duas rotas públicas exatas, duas com `?recuperar=1`, duas com `?convite=*` restrito ao caminho correspondente e os dois acessos locais127.0.0.1:3000. Retorno local Brotas anterior preservado. Bases `EQUIPE_INVITE_REDIRECT_BROTAS_URL=https://clinicabrotas.com.br` e `EQUIPE_INVITE_REDIRECT_IPUPIARA_URL=https://clinicaipupiara.com.br` salvas e identificadas por digest no painel; fallback local existente preservado. Edge versão6 já suporta essas bases; não republicada sem necessidade.
- Recuperação nova: `src/pages/RecuperarSenha.tsx`, `src/lib/passwordRecovery.ts`, integração em App/Login e nota de evolução. Resposta de solicitação neutra, bloqueio de envio repetido; destino exato por domínio; somente evento PASSWORD_RECOVERY com sessão permite definir senha; erro/validação preservam formulário; sucesso exige retorno confirmado e encerra sessão local. Não cria vínculos ou permissões.
- Testes **sintéticos**, não entrega real: quatro cenários Playwright em `tests/login/recovery.spec.ts`,11,6s, aprovados: solicitação desktop Brotas e móvel Ipupiara/retorno correto/clique duplicado; falha500 e retorno inválido; evento de recuperação interceptado/validação/recusa422/sucesso confirmado. Build e lint aprovados; aviso preexistente ThemeProvider e avisos de bundle preservados. Gerador de nove prévias sintéticas aprovado, com asserção do limite de assunto e do link oficial. TypeSafe skill/índice consultados, sem IA ou chave, por ser fluxo determinístico.
- Publicação **real**: commit `4c89c13aba9cc4ab11e0009429a0945607ae85bc`, branch `codex/resgate-local-2026-09-26`, push sem force. MCP confirmou Brotas build `01a0f46f-3d0a-71cc-a090-1b6065ad60a5` completed22:29:56UTC; Ipupiara `01a0f46f-3d53-73b1-af5e-254a9a6c5e35` completed22:29:58UTC, ambos no mesmo commit/Vite/Node22/npm/build/dist. Navegador público conferiu acesso direto, recarga/login e clique em Esqueci minha senha abrindo a tela da clínica correta em ambos. Sem sessão pública autorizada, login e recarga autenticados continuam pendentes.
- Recuperação limitada de configuração: original de assuntos/corpos em `supabase/templates/equipe/originais-20260930.json` (SHA256 `C681F867FA0F60FCC32947AC448B38620B31EFE34E3889BDA8AD09BAC1DD7BD0`); SiteURL/allowlist anteriores em `retornos-anteriores-20260930.json`. Não são backup de Auth ou restauração validada; nenhuma senha exportada. Captura limpa da prévia remota em `scratch/emails-institucionais/recuperacao-remota.jpg`.

### Situação real do ensaio e continuidade

**Investigação posterior de acesso/recuperação da proprietária:** titular informou mesmos dados anteriores, login recusado e recuperação solicitada pessoalmente, sem recebimento. Leitura do bundle público confirmou somente o host Supabase autorizado. Logs Auth somente leitura mostraram `/token` HTTP400 `Invalid login credentials` em22:50–22:54UTC e `/recover` HTTP200, sem erro, em22:58:08UTC de30/09. Isso comprova resposta do serviço, não envio SMTP/recebimento; ainda falta correlacionar a identidade e o evento de entrega. Não atribuir o problema ao SMTP, à senha ou à indisponibilidade sem essa evidência. Status oficial consultado: Auth operacional, incidente de latência do gateway/EasternUS não comprova relação com estas tentativas. Nenhum envio repetido pelo agente, reset de senha, alteração de conta ou fixture. “Solicitação registrada” é neutra inclusive para certas recusas4xx, conforme contrato atual; não é confirmação de e-mail enviado. Não considerar esse pedido da conta real como ensaio sintético concluído.

Complemento da investigação: consulta reduzida confirmou `/recover`22:58:08UTC, `request completed`, HTTP200, erro vazio. Consulta com janela temporal recebeu `Backend error! Retry your query`; não atribuída a indisponibilidade de Auth, pois a consulta reduzida funcionou. Nenhuma confirmação SMTP ou de recebimento obtida. Correlacionar identidade antes de qualquer alteração: conta sintética do ensaio22 foi removida; ausência de conta pode produzir resposta neutra de recuperação. Não presumir que seja o endereço utilizado pelo titular.

Titular informou que tentou os dois endereços. Consulta SQL estritamente SELECT, agregada e sem retornar e-mails/segredos, em usuarios_clinicas/ auth.users: uma proprietária com vínculo ativo, uma conta Auth correspondente existente, e-mail confirmado, zero contas suspensas por banned_until. A conta real não foi excluída e seu vínculo permanece; essa leitura administrativa não é teste de login normal nem prova da senha ou da identidade digitada. Aberta Authentication → Users para o titular conferir pessoalmente o endereço cadastrado, sem informar senha ao agente. Nenhuma conta, permissão ou senha alterada; causa do login/ausência de entrega ainda não determinada.

Auth → Users, busca pelo destinatário autorizado, retornou zero contas. Ainda é necessário conferir os membros da Equipe por sessão autorizada antes de criar fixture. A aplicação local correta está na porta3000 e mostra login: sessão de proprietária não disponível nesta atualização; solicitada entrada normal do titular pela interface. Não contornar autenticação com SQL/conta administrativa para apresentar ensaio como fluxo da aplicação.

Até esta atualização: **nenhum envio solicitado, recebimento não confirmado, aceite não executado, senha real não alterada e nenhuma fixture criada/removida** nesta execução. Não houve limpeza a realizar; cadastros existentes e auditoria preservados. O ensaio antigo22 permanece encerrado, não recriado. Próximo passo: login normal da proprietária, conferir conflito de membro/e-mail, criar somente membro sintético, enviar uma vez para o destinatário autorizado e aguardar titular abrir mensagem/definir senha/aceitar. Depois testar recuperação por clínica, sem repetir envios desnecessários, e limpar exclusivamente IDs da nova execução após conferir dependências. Senha deve ser digitada e salva pelo próprio titular; não solicitar senha/código/link no chat.

Prévias **com links fictícios**, disponíveis nas duas aplicações: `/previas-emails/invite-brotas.html`, `/previas-emails/invite-ipupiara.html`, `/previas-emails/invite-conjunta.html`, `/previas-emails/magic-link-conjunta.html`, `/previas-emails/recovery-conjunta.html`. Não comprovam SMTP nem validade de um link real. Telas reais: https://clinicabrotas.com.br/acesso/brotas e https://clinicaipupiara.com.br/acesso/ipupiara → Esqueci minha senha. Local para continuidade: http://127.0.0.1:3000/acesso/brotas.

## Histórico — caixas institucionais confirmadas e senha pendente

Atualização de 30/09/2026: o titular criou as duas caixas e definiu o remetente. A proposta anterior `acesso@clinicabrotas.com.br` está **substituída**, não deve ser criada ou utilizada. Os registros abaixo desta seção descrevem o histórico da preparação anterior.

- MCP confirmou `administracao@clinicabrotas.com.br` e `administracao@clinicaipupiara.com.br` ativas, ambas com SMTP de entrada e saída habilitados. Uma caixa por pedido; nenhuma criada pelo agente.
- Remetente e usuário SMTP aprovados: `administracao@clinicabrotas.com.br`. Nome fixo: **Clínicas Brotas e Ipupiara**. Caixa Ipupiara preservada para uso administrativo; nenhuma alternância de configuração global por mensagem.
- Hostinger confirma `smtp.hostinger.com`, porta465/SSL-TLS na documentação oficial já referenciada. A zona Brotas tem MX5/mx1 e MX10/mx2, um SPF `include:_spf.mail.hostinger.com`, três seletores DKIM hostingermail-a/b/c e DMARC `p=none`. Nenhum registro modificado. Presença na zona não comprova assinatura/alinhamento de uma mensagem entregue.
- Pedidos ativos Brotas `ORbcb32b255ce28220dc773c1cab86` e Ipupiara `ORefb9aea47e129df4aade07021db9`, validade30/09/2027; API agora informa `is_trial=false` embora o nome do plano seja Starter Business Email Free Trial. Não inferir renovação gratuita ou compra a partir desse campo.
- Supabase reconferido: SMTP personalizado desabilitado no estado salvo. Formulário aberto e preenchido com remetente, nome, host e usuário acima; porta465 e intervalo60s preservados. **Não salvo**, senha em branco. Titular deve preencher Password e clicar Save changes em Authentication → Emails → SMTP Settings. Nenhuma credencial consultada.
- A interrupção inicial do navegador foi recuperada; não houve rejeição de autorização. Templates e retornos públicos ainda NÃO aplicados nesta atualização; recuperação segue sem fluxo implementado. Não houve deploy novo, envio ou teste de entrega. Não apresentar este preparo como conclusão integral.
- Templates versionados/prévias existentes preservados. Após salvar SMTP: conferir ativação, aplicar templates, configurar retornos públicos e bases por clínica descritos abaixo, concluir recuperação e validar antes de declarar publicação. Destinatário anteriormente autorizado: impdigital@gmail.com; nenhum envio nesta rodada, recebimento institucional não confirmado.
- Skill typesafe-ai e índice vivo consultados; sem benefício de IA para esta configuração determinística, sem chamada ou acesso à chave.

## Histórico — proposta SMTP após publicação das duas clínicas

**Preparação local concluída; SMTP Supabase e entrega institucional NÃO executados.** Ações desta rodada limitadas a consulta/documentação. Brotas/Ipupiara publicadas e preservadas; confirmação manual de login/F5 continua pendente. Não enviados convites/reset nem acionados comandos de criação de caixa ou gravação de DNS/SMTP/Auth/secrets. TypeSafe avaliada conforme skill já lida: configuração determinística, sem IA ou chave.

**Mudança observada na reconsulta final:** Brotas passou de zero pedidos de e-mail para trial ativo, criado às19:55:16UTC, com DNS de e-mail configurado. A navegação do agente foi até a apresentação da oferta, sem acionar “Comece agora”; não há evidência nesta conferência que atribua a ativação a um autor específico. Não alegar que o estado remoto permaneceu integralmente idêntico, nem desfazer a mudança. Estado final abaixo prevalece sobre observações iniciais.

### Recursos efetivamente encontrados

| Domínio | Serviço ativo consultado pelo MCP | Benefício observado no painel, ainda não ativado |
| --- | --- | --- |
| clinicabrotas.com.br | Reconsulta: Hostinger `Starter Business Email Free Trial`, ativo, `is_trial=true`, pedido `ORbcb32b255ce28220dc773c1cab86`, `seats=199`, sem upgrade pendente; **zero caixas** na consulta do pedido | Criado30/09/2026 19:55:16UTC, expira30/09/2027 19:55:14UTC. Oferta consultada tinha1GB por caixa; o número real retornado é199, não presumir ilimitado |
| clinicaipupiara.com.br | Mesma consulta, total0; sem plano/caixa associada encontrada | Hostinger Free Business Email, R$0/mês por12meses, 1GB por caixa, **5 caixas por domínio** no cartão |

As ofertas foram consultadas em E-mails → Resgate e-mail grátis → escolher domínio → plano, sem acionar “Comece agora”. Provedor é Hostinger, não Titan. Brotas tem orderId e a consulta de caixas retornou total0; Ipupiara ainda não tem pedido associado. SMTP é recurso documentado do Hostinger Mail, mas **não existe credencial/caixa operacional comprovada para as clínicas**. Planos de e-mail de terceiros existentes na conta não foram reaproveitados.

Prazo: oferta de12meses, não e-mail gratuito permanente até o vencimento da hospedagem2030. Data de início/fim efetiva, quantidade final, renovação automática e eventual custo depois do benefício exigem conferência antes da ativação; não presumir contratação/renovação autorizada. Referência geral oficial informa100mensagens/dia para trial anual; conferir limite efetivo após ativação e preservar limites de envio do Auth. Não dimensionar volume de produção apenas pelo cartão promocional.

DNS inicial por MCP em ambos: somente ALIAS raiz/CDN, CNAMEwww/CDN e Aftp. **Na reconsulta final, Brotas já tem** MX5 `mx1.hostinger.com` e MX10 `mx2.hostinger.com` (TTL14400), SPF `v=spf1 include:_spf.mail.hostinger.com ~all` (TTL3600), DMARC `v=DMARC1; p=none` (TTL3600), três CNAME `hostingermail-a/b/c._domainkey` para os respectivos `hostingermail-a/b/c.dkim.mail.hostinger.com`, e autoconfig/autodiscover (TTL300). Registros do site preservados. Ipupiara não tinha registros de e-mail na consulta desta rodada. Não duplicar SPF/MX/DKIM já existentes em Brotas; sua presença na zona é configuração observada, não prova de entrega, propagação integral ou assinatura válida de mensagem.

### Supabase atual e risco de retorno local

Painel autenticado do projeto correto: Custom SMTP desabilitado; templates continuam padrão, com aviso de que assunto/corpo só podem ser editados após configurar SMTP próprio. Nenhuma senha consultada ou formulário alterado.

- Site URL salvo: `http://localhost:3000`.
- Allowlist: **uma** entrada, `http://127.0.0.1:3000/acesso/brotas`; não constam domínios públicos.
- Secrets da função: somente `EQUIPE_INVITE_REDIRECT_URL` customizado; nomes `EQUIPE_INVITE_REDIRECT_BROTAS_URL` e `EQUIPE_INVITE_REDIRECT_IPUPIARA_URL` ausentes. Digest do valor existente confere com a URL pública não secreta já documentada `http://127.0.0.1:3000/acesso/brotas`; valor secreto não revelado nem exportado.
- Código `redirectAutorizado` determina a unidade pelo convite persistido/autorizado e `redirectUnidade` usa base específica, quando configurada. Na ausência, Brotas retorna à base local e Ipupiara a `http://127.0.0.1:3000/acesso/ipupiara`; este último nem consta na allowlist atual. O Auth também pode cair no Site URL local ao receber retorno não permitido. Portanto, **mensagens geradas hoje ainda podem conduzir a localhost/127.0.0.1**.
- Convite novo usa `inviteUserByEmail`; vinculação/reenvio pode usar `signInWithOtp`, ambos com retorno construído por unidade e UUID `convite` preservado. Nenhum ensaio novo enviado nesta leitura.
- Recuperação: aplicação não chama `resetPasswordForEmail`; “Esqueci minha senha” só abre orientação à administração. Não existe fluxo público completo de recuperação aprovado nesta rodada. Uma solicitação manual pelo Auth sem retorno próprio pode usar Site URL local. Template preparado não implementa tela/fluxo de senha.

### Proposta concreta — não aplicada

**Recomendação para começar com os recursos oferecidos:** uma caixa técnica monitorada, proposta `acesso@clinicabrotas.com.br`, nome fixo **Clínicas Brotas e Ipupiara**, utilizando o benefício Hostinger. O endereço é uma proposta para aprovação/criação, não uma caixa existente. O mesmo remetente atende ao projeto Auth compartilhado; a marca da unidade fica no assunto/corpo do convite e no domínio de destino. Não trocar remetente/template global a cada envio. O destinatário de teste `impdigital@gmail.com` nunca será remetente.

| Campo | Valor proposto | Condição |
| --- | --- | --- |
| Sender email / usuário SMTP | `acesso@clinicabrotas.com.br` | Aprovar endereço e criar caixa no benefício; pode ser outro nome institucional escolhido |
| Sender name | `Clínicas Brotas e Ipupiara` | Fixo para o projeto compartilhado |
| Host | `smtp.hostinger.com` | Confirmar em Hostinger → E-mails → domínio → Configurar aplicativos/dispositivos |
| Porta/transporte | 465, TLS implícito | Alternativa documentada587/STARTTLS se requerida pela configuração; nunca sem criptografia |
| Password | Inserção direta pelo titular | Supabase → Authentication → Emails → SMTP Settings → campo Password; não inserir em chat, Git, arquivo público ou VITE |
| Site URL | `https://clinicabrotas.com.br/acesso/brotas` | Fallback único proposto; não define permissões nem deve substituir retorno explícito de Ipupiara |
| Redirect URLs públicas | `https://clinicabrotas.com.br/acesso/brotas` e `https://clinicaipupiara.com.br/acesso/ipupiara` | Acrescentar preservando a entrada local existente; validar o UUID/query no teste futuro e restringir qualquer padrão necessário ao caminho de convite, sem domínio/caminho arbitrário |
| Secret BROTAS específico | `EQUIPE_INVITE_REDIRECT_BROTAS_URL=https://clinicabrotas.com.br` | Em Edge Functions → Secrets; valor de configuração não secreto |
| Secret IPUPIARA específico | `EQUIPE_INVITE_REDIRECT_IPUPIARA_URL=https://clinicaipupiara.com.br` | Idem; manter base local existente para compatibilidade, com ambas as bases públicas explicitamente definidas |

Hostinger → E-mails → Resgate grátis → domínio → oferta R$0/12meses permite iniciar a futura ativação; reconferir custo/renovação antes de confirmar. Titular define a senha na interface da caixa e a preenche diretamente na interface SMTP do Supabase. Não é necessário compartilhar a credencial com o agente. Só ativar envio após o serviço confirmar a caixa e os registros de autenticação do domínio.

**Limite da identidade multiclínica:** SMTP nativo do projeto tem um remetente padrão. Criar duas caixas não faz o Auth escolher a correta automaticamente. Se a exigência futura for From diferente por unidade, será necessário outro desenho, como Send Email Hook com seleção autorizada no servidor; não incluído/implementado nesta preparação. A recomendação atual mantém identidade conjunta no remetente e unidade correta no conteúdo/destino, sem configuração global variável.

### Templates reaproveitados e validação futura

Arquivos existentes preservados: `supabase/templates/equipe/invite.html`, `magic-link.html`, `recovery.html`, `subjects.json` e cópia original. Convite novo usa contexto visual gerado no servidor para Brotas/Ipupiara e fallback conjunto; link/vinculação/reenvio e recuperação usam identidade conjunta, pois não há contexto confiável específico por mensagem nesses modelos atuais. Não inferir unidade a partir de metadados antigos do usuário. Todos mantêm `{{ .ConfirmationURL }}`; não trocar por URL local/manual. Previews e verificações visuais já aprovadas permanecem locais/sintéticas, sem nova execução ou aprovação fictícia do interpretador remoto.

Na execução futura: (1) preservar configurações/assuntos/corpos atuais; (2) ativar caixa gratuita confirmada e DNS de e-mail, conferir SPF/DKIM/DMARC e limites; (3) configurar SMTP e retornos públicos, sem enviar durante preparo; (4) salvar convite/link e conferir conteúdo remoto/variáveis; recuperação fica preparada até existir seu fluxo; (5) com autorização de execução, usar somente destinatário de teste indicado e sessão autorizada, conferir cabeçalhos From/SPF/DKIM/DMARC, entrega/spam, marca, link sem localhost e destino por unidade, incluindo fallback conjunto; (6) aceite/permissões/limpeza só se fixtures forem necessárias e expressamente incluídas no ensaio. Não repetir ensaio22 para apenas conferir aparência. Sem destinatários reais aleatórios nem indisponibilidade provocada.

| Classificação | Estado desta rodada |
| --- | --- |
| Disponível | Trial Brotas ativo até30/09/2027,199seats e zero caixas; oferta Ipupiara12meses/5caixas ainda não ativada; fontes/prévias existentes |
| Preparado | Proposta de caixa/SMTP/retornos e roteiro de validação acima; nenhum segredo em arquivos |
| Configurado | Plano/DNS de e-mail Brotas observados na reconsulta; Supabase permanece serviço padrão e retorno local; SMTP institucional/caixas/templates novos ainda não configurados |
| Validado por entrega real | Ensaio histórico22 com e-mail padrão; **nenhuma entrega dos modelos institucionais/SMTP Hostinger** |

Fontes oficiais consultadas: [SMTP Hostinger](https://www.hostinger.com/support/4305847-set-up-hostinger-email-on-your-applications-and-devices/), [limites e prazo](https://www.hostinger.com/support/4625828-parameters-and-limits-of-hostinger-email/), [benefício](https://www.hostinger.com/support/how-the-hostinger-mail-trial-works/), [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [retornos](https://supabase.com/docs/guides/auth/redirect-urls). A oferta específica do painel prevalece sobre inferências de planos genéricos.

Falta para executar: escolher/aprovar a caixa e o remetente conjunto propostos, criar a caixa no trial **já ativo de Brotas** e conferir sua renovação, inserir a senha diretamente no Supabase, conferir DNS existente sem duplicá-lo, configurar SMTP/templates/retornos e realizar entrega controlada. Ativar e-mail de Ipupiara é opcional para a proposta de remetente compartilhado. Esta solicitação limitou-se a leitura/preparação; não foram executadas essas ações pelo agente.

## Histórico das rodadas anteriores

## Retomada — solicitação de aplicação efetiva

**Entrega remota não concluída: nenhum assunto/corpo personalizado aplicado.** Foi reaberto o painel autenticado do projeto correto e novamente conferido o impedimento atual, inclusive na tela individual de convite: assunto somente leitura, Source desabilitado e Save changes desabilitado. Não é uma suposição sobre SMTP nem uma rejeição da ferramenta: é a restrição exibida pelo serviço Supabase.

O menu oferece explicitamente “Upgrade to Pro — Customize templates while using Supabase’s email service” e “Configure Send Email hook — Send auth emails through your own workflow”. Portanto, no serviço padrão **Free atual**, a restrição alcança assunto e corpo, não apenas o nome do remetente. Não houve clique de upgrade, contratação, alteração de SMTP/DNS ou contorno do bloqueio por outra rota. A documentação oficial apresenta a Management API para templates; a CLI disponível oferece apenas config push amplo, não atualização pontual. Não foi executado config push nem PATCH remoto: não apresentar esse estado como uma rejeição da API ou como conteúdo salvo. Uma rota programática não foi usada para contornar a restrição explicitamente mostrada pelo serviço.

### Concluído nesta retomada

- Reaproveitados modelos/cópias existentes; `originais-20260930.json` preservado, SHA-256 `C681F867FA0F60FCC32947AC448B38620B31EFE34E3889BDA8AD09BAC1DD7BD0`. Cobertura: assuntos/corpos observados de convite, link e recuperação; não configurações ou segredos SMTP.
- Convite ajustado ao texto solicitado: “sistema da unidade” e “Este convite é pessoal. Não compartilhe o link. Se você não reconhece este convite, não prossiga.” Identidade conjunta usa “das unidades”.
- Assunto/corpo normalizam o valor visual antes da comparação para que contexto de tipo inesperado não cause comparação Go entre tipos incompatíveis; ausência/desconhecido mantém identidade conjunta. Links oficiais inalterados; nenhum dado visual concede permissão.
- Gerador executado: nove prévias fictícias, assertivas do texto final para Brotas/Ipupiara/conjunto e ausência de variáveis não resolvidas. `node --check` aprovado. Não é execução do interpretador Go remoto.
- Navegador: textos das três identidades conferidos; móvel Ipupiara 390×844 sem rolagem horizontal. Capturas finais sem dados pessoais em `evidencias-emails/`: Brotas desktop, Ipupiara móvel, conjunto desktop e bloqueio do Supabase.
- Não repetidos ensaio/contas/convites/senhas. Não alterado código da aplicação ou Edge Function nesta retomada: somente templates, gerador, prévias e documentação. Build/lint gerais não repetidos por ausência de mudança no aplicativo; verificações anteriores permanecem na seção histórica abaixo.
- Recuperação continua indisponível na aplicação: “Esqueci minha senha” abre orientação para contatar a administração, sem resetPasswordForEmail. Modelo preparado, não ativado nem solicitado por e-mail.

### Dependências separadas

1. **Assuntos/conteúdos:** liberar um mecanismo de personalização permitido pelo projeto (SMTP próprio ou fluxo de envio próprio; alternativa oferecida pelo painel é Pro para continuar usando o serviço padrão). Não há autorização para contratar e nenhuma contratação foi feita. Não basta inserir o HTML local para o serviço Free enviá-lo.
2. **Remetente institucional:** falta mecanismo próprio de envio com remetente validado; não foi inventado endereço, usado destinatário como remetente ou alterado DNS. Remetente padrão permanece.
3. **Renderização Auth e entrega:** não verificadas remotamente, pois o template novo não pôde ser salvo. Prévia local não deve ser chamada de e-mail real ou template remoto.

Prévia final deixada aberta: http://127.0.0.1:3000/previas-emails/invite-brotas.html. As outras URLs abaixo permanecem válidas. Captura da restrição: `evidencias-emails/bloqueio-templates-supabase.jpg`. A participação do titular e limpeza do relatório22 continuam encerradas.

## Continuidade de infraestrutura — 30/09/2026

Painel Hostinger autenticado consultado somente por leitura: não apresentou caixa/plano de e-mail nos domínios das clínicas. Remetente institucional ainda não definido; destinatário de teste não será usado como remetente. Nenhum SMTP/DNS alterado nem oferta de e-mail ativada. Deploy Hostinger exige nova autorização, conforme determinação posterior do usuário. Templates continuam locais, não aplicados no Auth.

Edge `equipe-acessos` agora publicada na versão **6**, ACTIVE e JWT obrigatório: inclui CORS explícito dos domínios aprovados e retorno do convite pela unidade persistida/autorizada, preservando endereços locais. Essa publicação não aplica os templates. Detalhes, testes e sincronização: `../sistema/09-GITHUB-DOMINIOS-SMTP.md`. Histórico da versão 5 abaixo preservado.

## Histórico da preparação anterior

## Resultado real

Modelos em português preparados para convite e link de acesso com identidade azul existente. Recuperação preparada somente como modelo futuro: a interface atual não oferece recuperação, e nenhum fluxo novo foi habilitado.

**Templates NÃO aplicados no Auth.** No painel autenticado Free/SMTP personalizado desativado, aparecem “Set up custom SMTP to edit templates” e “Emails will be sent using the default templates. Set up custom SMTP to edit their subject and body.” Save/edição desabilitados. O menu oferece upgrade ou envio próprio; nenhum foi contratado/configurado nem o bloqueio contornado. SMTP e remetente preservados. O destinatário de teste não foi usado como remetente.

## Implementação e publicação

- `supabase/templates/equipe/`: HTML, assuntos e cópia dos assuntos/corpos originais visíveis (`originais-20260930.json`). Não é backup completo de Auth/SMTP.
- Layout de tabelas, estilos inline, máximo 600px, sem scripts/imagens externas, contatos inventados ou promessa de duração. `{{ .ConfirmationURL }}` preservada integralmente.
- Contexto visual Brotas/Ipupiara/conjunto derivado no servidor dos vínculos persistidos do convite já autorizado; contexto inválido/ausente usa identidade conjunta. Link de acesso/recuperação usam identidade conjunta. Nenhum metadado de conta existente é alterado por envio; marca não concede permissão.
- `emailContext.ts` e alteração pontual de `index.ts`: marca enviada somente no convite de conta nova. Autorizações e aceite determinísticos preservados. Sem consulta administrativa de contas no frontend.
- Edge Function `equipe-acessos` efetivamente publicada por API: **versão 5, ACTIVE, verify_jwt=true**. Publicação do contexto NÃO significa aplicação dos templates.
- Fonte anterior baixada em `scratch/equipe-email-pre/supabase/functions/equipe-acessos/`, ignorada pelo Git. SHA-256 do `index.ts`: `98DE28E01991D5E44B08E6F9EE6C86085909A5FB4C0C049211681ED505333860`. Proteção limitada à fonte, não backup de banco/Auth. Nenhuma migration nesta rodada.

## Verificação

- 7/7 testes dirigidos aprovados: recuperação/repetição Auth e seleção de identidade, inclusive ausente/indevida.
- Build e lint aprovados; aviso histórico Fast Refresh no ThemeProvider e avisos de importação/tamanho no build.
- Gerador produziu nove prévias fictícias verificando link oficial, ausência de scripts/imagens e substituições resolvidas. Não executa compilador Go do Auth nem comprova envio/renderização em cliente de e-mail.
- Convite Brotas observado no navegador desktop e Ipupiara em viewport móvel de 390×844: texto/botão legíveis, sem rolagem horizontal (largura do conteúdo 390px) e zero imagens. Isso cobre apresentação sem carregamento de imagens; não é ensaio em cliente de e-mail.
- Sem novo envio. O convite aceito/login relatado usam templates padrão, não os personalizados.
- TypeSafe AI/documentação consultados; Jev não chamado: contexto e autorização determinísticos. Nenhuma chave solicitada/exposta.

## Conferência e pendências

Servidor atual na porta 3000:

- Aplicação: http://127.0.0.1:3000/acesso/brotas
- Brotas: http://127.0.0.1:3000/previas-emails/invite-brotas.html
- Ipupiara: http://127.0.0.1:3000/previas-emails/invite-ipupiara.html
- Conjunta: http://127.0.0.1:3000/previas-emails/invite-conjunta.html
- Link de acesso: http://127.0.0.1:3000/previas-emails/magic-link-conjunta.html

Botões das prévias apontam para `example.invalid`: não autenticam. Gerador: `scripts/gerar-previas-emails.mjs`.

Aplicação remota da personalização depende de mecanismo de envio permitido, com remetente institucional validado. Não se presume necessidade de upgrade; nenhuma contratação executada. Aparência/rodapé/remetente padrão não foram personalizados. Redirects existentes preservados. Ensaio do titular e limpeza separados no relatório 22. Site Geovana/Pacientes/banco estrutural fora desta alteração.

Fonte oficial: https://supabase.com/docs/guides/auth/auth-email-templates
