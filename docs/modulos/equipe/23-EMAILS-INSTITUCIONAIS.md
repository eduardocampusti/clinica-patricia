# E-mails institucionais — preparação e limite remoto

Data: 30/09/2026. Projeto autorizado: `xftnkusbyqzyvzrovroj`.

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
