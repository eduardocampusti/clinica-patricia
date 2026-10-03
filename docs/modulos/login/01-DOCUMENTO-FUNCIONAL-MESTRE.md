# Login — Documento Funcional Mestre

**Estado: APROVADO**

## Acesso multi-clínica por domínio — decisão aprovada em 24/09/2026

- Clínica Brotas e Clínica Ipupiara possuem links de entrada separados. Em desenvolvimento, os endereços canônicos são `/acesso/brotas` e `/acesso/ipupiara`.
- Os hostnames de produção serão definidos posteriormente por configuração de ambiente; este documento não fixa nem presume domínios ainda não aprovados.
- As duas clínicas usam o mesmo frontend, o mesmo código, o mesmo projeto Supabase e o mesmo Supabase Auth.
- O domínio define somente o contexto inicial e a marca. **Domínio não concede autorização.**
- Depois de autenticar, o sistema consulta somente vínculos ativos visíveis para a conta e confirma o papel real antes de abrir a área interna.
- Um usuário sem vínculo ativo com a clínica indicada pelo domínio deve ter o acesso negado, ainda que suas credenciais sejam válidas.
- Um usuário comum vinculado à clínica do domínio entra diretamente nesse contexto apó as revalidações.
- A proprietária vinculada às duas clínicas entra na clínica correspondente ao link usado. A página Brotas não oferece Ipupiara como unidade e a página Ipupiara não oferece Brotas; para entrar na outra clínica, deve-se usar o respectivo link.
- Em desenvolvimento local, `/acesso/brotas` e `/acesso/ipupiara` simulam somente o contexto visual e inicial. Essas rotas não alteram vínculos, papel ou RLS.
- Em desenvolvimento local, `/`, `/login` e os endereços legados `/login/:clinica` redirecionam ao endereço canônico correspondente. Não existe login visual genérico.
- Em produção, `/login` resolve exclusivamente pelo hostname. Um hostname desconhecido não recebe formulário: deve exibir erro de domínio não configurado e negar o acesso de forma segura.
- Sessões restauradas também devem passar pela resolução e validação de acesso antes de abrir a aplicação.
- Quando houver sessão válida, a interface não mostra um campo de senha bloqueado. Ela apresenta “Sessão ativa”, a clínica e o papel confirmados, com as ações “Continuar na Clínica [nome]” e “Entrar com outra conta”.

## Branding por clínica

A marca deve ser resolvida por uma configuração central com slug, nome, hostname, aliases/identificador de correspondência, logo, imagem, título, subtítulo, cores e textos auxiliares. O formulário e a autenticação são compartilhados; não devem existir cópias completas do login por clínica. IDs reais podem ser configurados centralmente por ambiente e nunca espalhados por componentes.

Esta entrega aprova a fundação, não o design final completo. A imagem hero de Brotas deve usar exclusivamente `/imagem_login_brotas.png`; a imagem hero de Ipupiara deve usar exclusivamente `/imagem_login_ipupiara.png`. A escolha permanece centralizada no branding de cada clínica.

## Apresentação aprovada

Em 24/09/2026, o usuário solicitou implementar a tela de login do protótipo fornecido. A direção visual é formulário claro à esquerda, identidade Clínica Patrícia, acento azul, fotografia clínica à direita e conteúdo institucional na base. Em tablet e celular, priorizar o formulário em coluna única. Usar os padrões tipográficos existentes no sistema.

Em revisão posterior da mesma data, o usuário aprovou recolocar a composição completa do formulário: quatro perfis visíveis, identificador, senha, recuperação/ajuda, contexto da clínica de entrada, preferência de lembrar o acesso, botão principal e posição do certificado digital.

## Refinamento responsivo aprovado

Em 24/09/2026, ficou aprovado que as telas Brotas e Ipupiara preservam integralmente a mesma estrutura, conteúdo e ordem, com os seguintes ajustes de apresentação:

- desktop em duas colunas deve caber na altura útil da viewport, sem scrollbar vertical nos tamanhos validados;
- tablet e celular devem manter a imagem hero como identidade visual em faixa compacta acima do formulário, em vez de removê-la;
- tablet e celular podem usar fluxo vertical natural, mas nunca overflow horizontal ou conteúdo cortado;
- campos e ações permanecem fluidos e utilizáveis por toque; no celular, entradas usam tamanho tipográfico que evita zoom automático;
- cards, ícones e mensagem do hero podem receber profundidade discreta, sem mudar textos, imagens ou hierarquia;
- hover visual dos cards só se aplica a dispositivos que realmente suportam hover, e preferências de movimento reduzido continuam respeitadas.

## Comportamento preservado

- Acesso por e-mail e senha usando `supabase.auth.signInWithPassword`; o aplicativo recebe a sessão pelo listener existente.
- O seletor de perfil mostra Médico / Clínico, Recepção, Gestão & ADM e Laboratório. Só os três primeiros têm papel no domínio atual (`medico`, `recepcao`, `proprietaria`). Laboratório aparece como preferência visual, mas não tem vínculo autorizável nesta versão. A escolha de perfil nunca concede permissão.
- A clínica determinada pelo link aparece antes da autenticação como contexto de entrada. Após autenticar, consultar os vínculos ativos, mas manter somente o vínculo correspondente ao link; a outra clínica nunca aparece como opção nessa página.
- Antes de abrir a área interna, revalidar o par perfil/unidade usando o vínculo ativo da conta no fluxo do aplicativo. Uma combinação sem autorização mostra erro genérico e não abre conteúdo interno.
- Senha inicialmente oculta, com controle acessível de mostrar/ocultar; campos obrigatórios, autocomplete e estado de carregamento.
- O campo identifica a forma aceita: e-mail cadastrado. CRM ou outro identificador não são aceitos pelo método de autenticação atual.
- “Lembrar meu acesso” guarda somente o identificador da clínica do link no navegador, aproveitando a preferência já existente. Desmarcado, a escolha não é persistida; e-mail e senha nunca são guardados por este controle.
- “Esqueci minha senha” e “Ajuda no Acesso” abrem orientação para procurar a administração; não anunciam recuperação automática inexistente.
- Erros não expõem respostas técnicas. Ajuda não inventa endereço ou telefone.

## Identidade visual dos perfis — Brotas e Ipupiara

Em 24/09/2026, foi aprovada uma identidade visual suave por preferência de perfil nas telas das clínicas Brotas e Ipupiara:

- Médico / Clínico: azul;
- Recepção: turquesa;
- Gestão & ADM: violeta;
- Laboratório: verde.

Ao selecionar uma opção, a interface usa fundo claro, borda, texto contrastante e marcador geométrico, sem depender somente da cor. O acento ativo também pode aparecer de forma moderada no foco dos campos, em um pequeno detalhe do formulário e no botão principal. A troca deve ser discreta e respeitar `prefers-reduced-motion`; teclado, rádio nativo e semântica de seleção devem permanecer íntegros.

A paleta de perfis é uma camada semântica compartilhada do componente de login. Ela não substitui o tema-base de cada clínica: logomarca, imagem, título, textos, cores institucionais e demais elementos continuam vindo do respectivo `ClinicBrandConfig`.

Essa identidade é estritamente visual. O perfil selecionado não concede acesso, não substitui o papel persistido e não altera vínculos ou RLS. Depois da autenticação, o fluxo existente continua consultando e revalidando as permissões reais antes de abrir a aplicação.

## Limites da adaptação

O HTML é referência visual, não evidência de capacidades implantadas. O certificado digital ocupa seu lugar visual com estado explicitamente indisponível, sem botão de autenticação fictício. Não ativar login por CRM/certificado, perfil Laboratório ou recuperação automática sem integração real. A configuração de sessão do cliente Supabase permanece intacta: “Lembrar” controla apenas a preferência de unidade, não a duração da sessão. Não afirmar certificação CFM, conformidade legal auditada, integração HL7/TISS, latência/uptime ou dados profissionais fictícios. Não modificar banco, autenticação do servidor ou políticas de autorização para reproduzir elementos do protótipo.
