# Login — checkpoint

**Estado: APROVADO** — implementação e validação automatizada concluídas em 24/09/2026; login real não exercitado nesta entrega visual.

## Entrada separada por clínica e sessão ativa — 25/09/2026

- Criados os endereços locais canônicos `/acesso/brotas` e `/acesso/ipupiara`; os aliases locais anteriores redirecionam para eles.
- Cada página mostra somente a identidade e o contexto da clínica solicitada. Mesmo para proprietária com dois vínculos, o Login não oferece a outra clínica como opção.
- Hostnames de produção deixaram de ser presumidos no código e ficaram preparados nas variáveis públicas `VITE_CLINICA_BROTAS_HOSTNAME` e `VITE_CLINICA_IPUPIARA_HOSTNAME`.
- Sessão restaurada ou recém-confirmada não exibe senha desabilitada. O estado “Sessão ativa” oferece continuar na clínica do link ou encerrar a sessão para entrar com outra conta.
- “Continuar” envia ao `App` somente o vínculo e o papel confirmados para aquela clínica; o `App` repete a validação antes de liberar o shell. Link e marca não concedem autorização.
- A suíte completa de Login aprovou 23 cenários e ignorou 22 repetições deliberadas pela matriz de dispositivos. A regressão operacional de Login e troca de clínica com resposta atrasada aprovou 6/6 cenários em desktop, tablet e celular. Typecheck, lint e build passaram; o lint mantém somente a advertência preexistente de Fast Refresh em `ThemeProvider.tsx`, e o build mantém os avisos preexistentes de chunks/importação dinâmica.
- Nenhuma migration, SQL, dado de paciente, RLS ou configuração remota foi alterada.

## Correção da identidade visual dos perfis em Ipupiara — 24/09/2026

Corrigido o escopo dos tokens de perfil, que estava condicionado a `data-clinic-brand="brotas"`. Brotas e Ipupiara já compartilhavam `Login.tsx`; a correção centralizou a paleta semântica no componente comum por `data-active-profile`, sem duplicar CSS e sem alterar `ClinicBrandConfig`. Cada clínica continua fornecendo seus tokens institucionais, logomarca, foto e textos próprios.

As duas rotas foram navegadas de fato em 1366×768 e 390×844. Em cada clínica, os quatro perfis foram percorridos por teclado e tiveram seleção, marcador, foco de campo e CTA conferidos. As capturas das 16 combinações ficam em `scratch/login-perfis/`. O seletor de unidade permaneceu indisponível antes da autenticação; os testes de vínculo e autorização continuaram aprovados.

A suíte completa de login aprovou 21 cenários, com 18 skips deliberados pela matriz de projetos. Typecheck, lint, build e `git diff --check` aprovados; permanecem somente o warning preexistente de Fast Refresh no lint e os avisos preexistentes de chunks/import dinâmico no build. Nenhuma autenticação real, escrita remota, alteração de Supabase, RLS, banco ou Financeiro foi executada.

## Identidade visual por perfil — Brotas — 24/09/2026

Implementada tematização visual restrita à tela Brotas: azul para Médico / Clínico, turquesa para Recepção, violeta para Gestão & ADM e verde para Laboratório. O estado ativo controla somente tokens visuais do seletor, foco dos campos, detalhe ao lado do legend e CTA. Cada opção ativa combina fundo claro, borda, contraste, peso e marcador inferior; o rádio nativo continua sendo a fonte semântica da seleção e a navegação por setas foi preservada. As transições usam 180–200 ms e são removidas por `prefers-reduced-motion`.

Nenhuma regra de autenticação ou autorização foi alterada. A preferência selecionada continua sendo confrontada com os vínculos reais depois do login; Laboratório permanece sem autorização nesta versão. Supabase, Auth, RLS, banco, imagens, textos, branding de Ipupiara e Financeiro não foram modificados.

Validação visual e automatizada nos quatro estados em 1366×768 e 390×844, com capturas em `scratch/login-perfis/`. Contraste do CTA com texto branco: 5,18:1 a 6,27:1; contraste do texto selecionado: 6,78:1 a 8,54:1. A suíte completa de login aprovou 21 cenários, com 18 skips deliberados pela matriz de projetos. Typecheck, lint, build e `git diff --check` aprovados; permanecem somente o warning preexistente de Fast Refresh no lint e os avisos preexistentes de chunks/import dinâmico no build.

## Refinamento responsivo final — 24/09/2026

Refinadas exclusivamente as telas compartilhadas de login Brotas e Ipupiara. Em desktop, a composição de duas colunas passou a usar a altura útil da viewport, com compactação vertical progressiva e todos os textos, campos, aviso e rodapé preservados. Em tablet e celular, o hero deixou de ser ocultado e passou a ocupar uma faixa compacta acima do formulário; o conteúdo segue em fluxo vertical natural, sem overflow horizontal. Cards, ícones e mensagem do hero receberam profundidade discreta, com hover somente em dispositivos compatíveis e respeito a `prefers-reduced-motion`.

Foram validados Brotas e Ipupiara em 1920×1080, 1600×900, 1440×900, 1366×768, 1024×1366, 1180×820, 768×1024, 390×844, 393×873, 360×800 e 430×932, além de redimensionamento contínuo e inspeção das capturas em `scratch/login-responsive/`. Não houve alteração em textos, imagens, JSX, autenticação, Supabase, vínculos, RLS, regras de acesso ou Financeiro. Nenhum commit foi criado.

Arquivos desta execução: `src/pages/login.css`, `tests/login/playwright.config.ts`, `tests/login/responsive.spec.ts` e documentação do módulo. A suíte completa de login aprovou 20 cenários, com 16 skips deliberados por matriz de projetos; a suíte responsiva final aprovou 3/3. Typecheck, lint, build e `git diff --check` aprovados. O lint manteve apenas o warning preexistente de Fast Refresh em `src/theme/ThemeProvider.tsx`; o build manteve avisos preexistentes de import dinâmico e tamanho de chunks.

## Remoção do login genérico — 24/09/2026

Eliminada a terceira experiência visual de login. `resolveClinicBrand` agora resolve Brotas e Ipupiara pelos hostnames de produção; em ambiente local, `/login/brotas` e `/login/ipupiara` permanecem explícitos e `/login` redireciona para `/login/brotas`. Outros caminhos locais usados pela aplicação recebem Brotas como fallback de desenvolvimento, sem renderizar a marca genérica anterior. Hostname não configurado retorna `dominio-invalido` e mostra somente bloqueio seguro, sem formulário.

Auth, Supabase, vínculos, RLS, regras de acesso, layout, imagens, textos das telas Brotas/Ipupiara e Financeiro permaneceram inalterados. Validação: 17 cenários Playwright aplicáveis aprovados e 10 repetições desktop-only ignoradas deliberadamente; typecheck, lint e build aprovados. O lint manteve apenas o warning preexistente em `ThemeProvider.tsx`; o build manteve avisos preexistentes de bundle/import dinâmico. O processo Playwright precisou ser interrompido apó a conclusão dos casos porque o teardown do Vite permaneceu ativo no Windows.

## Imagens hero por clínica — 24/09/2026

Alteradas somente as referências `imagemLogin` em `src/config/clinicBrands.ts`: Brotas usa `/imagem_login_brotas.png` e Ipupiara usa `/imagem_login_ipupiara.png`. Nenhum asset foi substituído ou renomeado; layout, CSS, textos, formulário, autenticação e regras de acesso permaneceram inalterados. Os dois previews locais foram confirmados pelo teste Playwright dedicado. Typecheck, lint, build e `git diff --check` aprovados; o lint manteve apenas o warning preexistente em `ThemeProvider.tsx` e o build manteve os avisos preexistentes de bundle/import dinâmico. Nenhum commit foi criado.

## Fundação multi-clínica por domínio — 24/09/2026

Implementada configuração central de marca para Brotas e Ipupiara, resolução pelos hostnames `clinicabrotas.com.br` e `clinicaipupiara.com.br`, e previews locais `/login/brotas` e `/login/ipupiara`. A rota de preview só é interpretada em host local.

O carregamento de vínculos ativos foi extraído para `src/lib/clinicAccess.ts`. Usuários comuns no domínio de sua clínica entram no contexto correspondente apó a revalidação; ausência de vínculo com a clínica do domínio desconecta e nega o acesso. A proprietária com vínculo de proprietária em Brotas e Ipupiara recebe seleção das duas clínicas e não fica presa ao domínio inicial. Sessões restauradas também passam pelo gate antes de abrir o shell.

Regra preservada: **DOMÍNIO ≠ AUTORIZAÇÃO**. O Supabase Auth, o projeto Supabase, os vínculos ativos, o papel real e a RLS continuam sendo as fontes de identidade e autorização. Nenhum banco, migration, RLS, dado remoto, Financeiro ou hospedagem foi alterado.

Assets históricos preservados: `login-bg.png` e `login-clinica.jpg`. As imagens hero ativas passaram a ser `imagem_login_brotas.png` e `imagem_login_ipupiara.png`.

Arquivos da fundação: `src/config/clinicBrands.ts`, `src/lib/clinicAccess.ts`, `src/pages/Login.tsx`, `src/pages/login.css`, `src/App.tsx`, `.env.example`, testes de login e documentos do módulo. Typecheck e build aprovados; lint sem erros, mantendo somente o warning preexistente de Fast Refresh em `ThemeProvider.tsx`; `git diff --check` aprovado. Na suíte Playwright, todos os 16 cenários aplicáveis concluíram com sucesso e 8 repetições foram ignoradas deliberadamente por serem exclusivas de desktop. No Windows, o processo precisou ser interrompido depois da conclusão dos casos porque o teardown do servidor Vite não encerrou sozinho.

Layout implementado em `src/pages/Login.tsx` e `src/pages/login.css`. Fotografia indicada no HTML fornecido copiada para `public/login-clinica.jpg`; o navegador não depende do servidor de imagens externo. A imagem anterior `public/login-bg.png` foi preservada. O arquivo Login já tinha alterações locais: a implementação partiu desse conteúdo, mantendo a chamada de autenticação existente.

Os testes em `tests/login/` usam somente endpoint sintético interceptado; nenhum login real nem escrita no Supabase. Cobrem layout, senha, ajuda, validação, carregamento, credenciais inválidas e evento de sessão, em desktop/tablet/celular. Capturas locais em `scratch/login-aprovado/`.

Nenhum commit ou push solicitado nesta tarefa. Demais modificações locais preservadas.

Validação: 9/9 testes Playwright aprovados (três cenários em três tamanhos), capturas desktop e mobile inspecionadas e ausência de overflow verificada também em 320 px. Build aprovado; lint sem erros, com warning preexistente de Fast Refresh no ThemeProvider. Os avisos de bundle/importação do build são anteriores à entrega. A revisão com impeccable orientou foco visível, contraste, estrutura responsiva e estados; a revisão Supabase manteve o cliente e o contrato de sessão existentes, sem introduzir autorização por perfil selecionável.

## Correção do formulário — 24/09/2026

Reintroduzidos quatro perfis visíveis, identificador, senha/visibilidade, ajuda e esquecimento, unidade, preferência “Lembrar” e posição indisponível do certificado. Os nomes de unidade vêm da consulta autenticada de vínculos ativos e clínicas acessíveis; não há lista pública inventada. O aplicativo segura a navegação até confirmar novamente o papel da unidade escolhida; ausência ou mudança de vínculo resulta em erro e saída da sessão. Laboratório continua visível, porém sem vínculo autorizado nesta versão. “Lembrar” persiste somente o ID da unidade; não altera a persistência de sessão do cliente nem armazena credenciais.

Arquivos desta correção: `src/pages/Login.tsx`, `src/pages/login.css`, `src/App.tsx`, `src/hooks/useClinicaAtiva.ts`, `src/hooks/usePapelNaClinica.ts`, testes em `tests/login/` e estes três documentos do módulo. A imagem existente permanece. Sem migration, escrita em tabelas ou push.

Verificações da correção: 12/12 cenários Playwright aprovados em desktop, tablet e celular; revalidação integrada 4/4 aprovada, com dois casos de repetição propositalmente ignorados por serem exclusivos de desktop; validação de teclado 3/3. Cobertura de sessão simulada, vínculo divergente, unidade real, recusa da entrada e preferência de não lembrar a unidade. Capturas antes/depois da escolha de unidade em `scratch/login-aprovado/` comparadas com `screen.png`; largura de 320 px sem overflow. `npm run test:financeiro` 15/15; `npm run build` aprovado; `npm run lint` sem erros, com o aviso preexistente em `ThemeProvider`. Nenhuma autenticação real foi executada no teste.
