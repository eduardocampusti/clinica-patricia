# GitHub, domínios e SMTP — execução de 30/09/2026

## Correção autorizada do404 de rotas — estado em 30/09/2026

Usuário concluiu o primeiro deploy GitHub na mesma branch/f177207 e autorizou publicar correção direcionada. Painel autenticado confirmou: Vite, raiz ./, Node22.x, commit f177207c, implantação concluída e automática ativada. Nenhuma troca para main. Alterações documentais da conferência anterior preservadas.

Causa comprovada: navegador público em https://clinicabrotas.com.br/acesso/brotas mostra404 Hostinger; raiz serve login. Arquivos reais de public_html (gerenciador autenticado) incluem index.html/assets/imagens/_redirects, mas **não .htaccess**. Fonte anterior tinha .htaccess somente em deploy/hostinger, fora do publicDir do Vite e do dist. _redirects não resolveu o fallback nesta modalidade; não é falta da rota no aplicativo.

Correção mínima: novo public/.htaccess, automaticamente copiado pelo Vite para dist/.htaccess em todo build, sem script dependente de shell/Windows/Linux. Rewrite interna para /index.html somente se alvo não é arquivo/diretório, com guarda do index para evitar loop. Sem redirect HTTP, regras canonical/HTTPS adicionais ou QSD: URL externa, query string e fragmento de Auth mantidos. Não mudados validação de domínio, permissões, Supabase, DNS, SMTP ou outros sites. Exemplo anterior em deploy/hostinger preservado como histórico; README esclarece fonte efetiva.

Arquivos desta correção: public/.htaccess, tests/deploy/spa-fallback.test.mjs, deploy/hostinger/README.md, src/config/notasEvolucao.json e registros de documentação/checkpoint. Build aprovado; teste dirigido1/1 confirmou cópia exata e diretivas sem descarte de query/redirecionamento; lint aprovado com aviso histórico ThemeProvider. Não repetir suítes clínicas/login não relacionadas. Os dois testes de login pendentes continuam separados, sem aprovação fictícia.

Publicação efetivamente comprovada: commit `643e428961d3850e520a4a695fc6602136d77728` enviado por push normal à mesma branch; ls-remote retornou SHA idêntico. Painel Hostinger mostrou implantação **Concluído**, commit643e4289, Vite/Node22.x, duração1m7s. Não precisou botão manual nem configuração nova no painel. Gerenciador remoto após deploy confirmou `.htaccess` em public_html, ausente antes: incluído pelo artefato, não por edição manual efêmera.

Evidência real no domínio: raiz e /acesso/brotas HTTP200, HTML idêntico ao index. Nova aba direta com UUID/parametro fictícios e fragmento #ajuda-acesso abriu login Brotas; F5 e reload mantiveram aplicação, caminho, query e fragmento. Recarregamento da aba antes404 também abriu login. JS principal/runtime HTTP200 application/x-javascript, CSS HTTP200 text/css, imagem Brotas HTTP200 image/png; DOM confirmou imagem carregada e2 folhas de estilo. Captura sem credenciais: `scratch/hostinger/rota-brotas-publicada.png` (ignorada pelo Git). Não são ensaios de convite/recuperação real: nenhum e-mail, token ou aceite usado.

Limitação específica: domínio público apresentou login sem sessão autorizada disponível; login e F5 já autenticado não executados. Sessão local não transferida, credenciais não extraídas e nenhum dado clínico consultado/alterado. Roteiro: titular entrar normalmente em https://clinicabrotas.com.br/acesso/brotas, escolher unidade/perfil autorizado e pressionar F5, confirmando retorno à aplicação sem404. Não enviar senha pelo chat. Dois ensaios sintéticos históricos de login continuam pendentes, não reabertos nesta correção de hospedagem.

Recuperação: reverter somente commit de fallback com commit novo/redeploy se necessário, sem reset/force push; versão anterior disponível no histórico Hostinger, sem backup de banco necessário para regra estática. Nenhum .htaccess remoto preexistente encontrado para sobrescrever. Fonte/build Windows e deploy gerenciado Node22/Linux aprovados; futuros builds copiam a regra versionada do publicDir.

Documentação consultada: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/ (preset Vite/frontend estático, integração automática e estrutura de arquivos); https://www.hostinger.com/support/1583307-how-to-create-an-htaccess-file-at-hostinger/ (suporte .htaccess e dotfiles visíveis); https://vite.dev/guide/assets.html (public copiado para raiz do output). TypeSafe/índice oficial consultados; IA não pertinente ao fallback determinístico, sem API/chave.

## Decisões e limites

## Conferência de variáveis Hostinger — continuação em 30/09/2026

Somente leitura, exportação local e documentação; não feito deploy, merge, push, configuração remota ou rotação de credenciais nesta conferência. TypeSafe/índice oficial consultados; IA não necessária para estas verificações determinísticas.

- Arquivo gerado: `D:\PROJETOS SAAS\CLINICA PATRICIA\scratch\hostinger\.env.hostinger`, fora de public/dist e ignorado pelo Git (`git check-ignore` confirmou regra scratch/). Contém exatamente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, sem chave administrativa, senha, sessão ou chave TypeSafe. Não anexar à documentação/versionamento. Importar pelo seletor de arquivo de variáveis do painel.
- URL local efetiva de produção: `https://xftnkusbyqzyvzrovroj.supabase.co`. JWT público existente conferido internamente: ref autorizada e role anon. Mesma chave preservada, sem exposição do valor; ausência de chave publishable diferente com prioridade confirmada. Consulta pública `/auth/v1/settings` com a chave existente retornou HTTP200; nenhuma conta/dado alterado.
- Atenção à branch: leitura atual do GitHub confirma main em `5fb56137e88af6a6144f6a7ce8c64592034c2855`, enquanto a versão atual está em `codex/resgate-local-2026-09-26`, `f177207c2e32df958f2989168a6fc8b9f70bb6db`. Main está 62 commits atrás, sem commits exclusivos. Não alterada automaticamente.
- Fonte atual: `src/lib/api.ts:28` é a única leitura operacional de VITE_API_URL. Exporta abrirCaixa, registrarEntradaCaixa, registrarDespesa, registrarMovimentoCaixa, fecharCaixa, estornarLancamento e pagarRepasseIntegral. Importações com execução estão no caminho legado `pages/Financeiro.tsx`, `FormRegistrarEntrada.tsx` e `AcoesFinanceiras.tsx`; dois hooks importam somente tipos. Rastreamento estático AST a partir de main.tsx, incluindo imports dinâmicos e excluindo imports só de tipos, percorreu 89 módulos: lib/api e componentes legados não alcançáveis. App atual usa FinanceiroModulo e `src/lib/financeiro/financeiro.rpc.ts`, com chamadas Supabase. Busca no build atual não encontrou localhost3333 nem os endpoints legados pesquisados.
- Portanto, VITE_API_URL pode ser removida do painel **para o código da branch atual**. Não recebe a URL Supabase nem a URL da clínica. Na main antiga, App importa Financeiro e a lib/api chama `/api/caixa/abrir` e `/api/caixa/entrada`; nesse código a variável ainda é necessária e teria de conter a base HTTPS de servidor próprio que forneça esses endpoints. Nenhum endereço público desse backend foi comprovado; localhost3333 não serve usuários públicos. Não usar o arquivo de duas variáveis como configuração completa da main antiga.
- Vite, `npm run build`, dist e raiz ./ correspondem ao projeto atual. Vite8.2 e plugin React6 exigem Node20.19+ ou Node22.12+; selecionar Node22 atualizado, não 22.0. Build anterior aprovado usou Node24.13.1 local: compatibilidade22 confirmada pelo contrato das dependências, não por execução real Node22/Hostinger. Sem novo build/testes gerais nesta conferência, pois não mudou o código. Ainda necessário testar HTTPS, fallback SPA e login nos sites após publicação autorizada.
- Duas verificações sintéticas de login continuam pendentes, sem nova execução/correção: timeout de navegação no ensaio desktop App (repetição também falhou) e igualdade de cores por perfil. Não são provas de falha autenticada em produção nem de aprovação geral. Ensaio dirigido de hostnames já aprovado; nenhuma credencial/conta recriada.

Importação recomendada: primeiro escolher a versão atual na Hostinger (ou autorizar separadamente a integração revisada em main); importar `.env.hostinger`; conferir os dois nomes e excluir VITE_API_URL somente para essa versão. Não adicionar chave service_role/secret ou variáveis TypeSafe. Variáveis VITE entram no bundle público no build, conforme https://vite.dev/guide/env-and-mode.html. Importação não modifica automaticamente o código remoto nem libera deploy por este agente.

## Histórico da execução de publicação/preparação

Anexo de decisões e prompt lidos integralmente. Supabase mantido em xftnkusbyqzyvzrovroj. Domínios autorizados: clinicabrotas.com.br e clinicaipupiara.com.br; não usar/comprar versão .com. TypeSafe/índice oficial consultados, sem Jev: Git/DNS/Auth/SMTP determinísticos.

Após o login manual no painel, o usuário determinou: **não fazer deploy na Hostinger sem nova autorização**. Nenhum upload, site novo, DNS, SMTP, assinatura ou contratação feito na Hostinger. Site Geovana intacto. Ensaio do relatório22 não recriado.

## Git e revisão

Remote: https://github.com/eduardocampusti/clinica-patricia. Branch efetiva: `codex/resgate-local-2026-09-26`, não a branch antiga citada em checkpoints históricos. Fetch remoto realizado. Antes desta execução: HEAD `016a029`, alinhado com origin dessa branch (0/0); main remoto `5fb56137e88af6a6144f6a7ce8c64592034c2855`, 60 commits atrás da branch atual, sem commits exclusivos de main. Não mesclado automaticamente nem acionado release de main.

Árvore tinha 52 arquivos modificados e dezenas de arquivos novos de implementações anteriores. Foram preservados e incluídos na sincronização autorizada: código, migrations, Edge, testes, modelos/assets e documentação. Varredura dirigida em 474 candidatos não encontrou padrões de credenciais privadas; não é garantia absoluta. .gitignore reforçado para ambientes e backups. Capturas novas limitadas às quatro prévias/bloqueio sem dados clínicos ou credenciais. Scratch, backups, .env, node_modules e resultados clínicos não enviados. Não feito force push ou alteração de visibilidade.

Workflow definido no repositório: Release Please em main/manual, não deploy da branch atual. Nenhum pipeline Hostinger das clínicas configurado nesta execução. Hooks/integrações externas não são comprovados apenas pelo arquivo de workflow.

Sincronização efetivamente concluída por push normal em `codex/resgate-local-2026-09-26`: commit de código `063a2baf0f3c52db19d66f0f3df3f32571edcd3e`. `git ls-remote` retornou exatamente o mesmo SHA do HEAD local. Commit reúne 149 arquivos alterados/criados. Build repetido e aprovado com árvore limpa desse SHA; não é release nem merge em main. Este registro documental posterior não altera o código compilado.

## Hostinger consultada somente por leitura

Painel autenticado mostrou planos existentes **Business** (expiração 06/03/2030) e **Unlimited** (20/07/2030). Listagem não contém sites identificados pelos dois domínios das clínicas. Isso confirma recursos existentes, não a reserva de slots/site/docroot ou suporte Node de um plano específico. Não foram reaproveitados sites temporários ou sites de terceiros.

Área E-mails não mostra plano/caixa nos dois domínios das clínicas. Há serviços de outros domínios, que não foram reaproveitados. Oferta de resgate grátis não foi ativada: não comprova caixa existente nem custo futuro/autorização do remetente. Falta endereço institucional escolhido e caixa/serviço autorizado com credencial segura. Nenhum segredo solicitado pelo chat.

Consulta DNS: ambos os A retornaram `2.57.91.91`; consulta MX retornou somente autoridade SOA, sem resposta MX. Não alterados DNS ou registros de e-mail. Não afirmar domínio de e-mail verificado a partir disso.

## Preparação e Supabase efetivamente aplicado

- Marca por hostname tem defaults dos dois domínios confirmados; www normalizado; hostname desconhecido continua rejeitado. Domínio não concede permissão.
- CORS da equipe inclui somente HTTPS dos dois domínios/www, preservando quatro origens locais. Autenticação e autorização permanecem obrigatórias.
- Retorno do convite obtém unidade do convite persistido já autorizado, não do Origin. Convite Ipupiara não reutiliza caminho Brotas. Bases públicas opcionais específicas validadas contra o domínio exato; caminhos oficiais/UUID preservados. Secrets públicos novos NÃO ativados enquanto sites públicos não existem. Base local anterior mantida, ajustando somente caminho da unidade efetiva.
- Fonte remota anterior preservada em scratch/publicacao-edge-pre (fora do Git); SHA-256 do index.ts `44026E7919D19212738480333989E13C237D13DB2584DE401532E906DA1F805F`. Cobertura somente fonte, não backup de banco/Auth ou restauração validada.
- Edge equipe-acessos publicada: **versão6 ACTIVE, verify_jwt=true**. Nenhuma migration aplicada. Configuração de URLs Auth existentes e secret-base local preservados; não ativados retornos públicos antes de HTTPS/rota pronta.
- deploy/hostinger contém orientação e .htaccess condicional Apache/LiteSpeed com HTTPS/canonical/fallback. Não instalado no remoto; deve preservar arquivo anterior e certificar HTTPS antes de usar.
- App usa FinanceiroModulo e RPCs. Fastify/server e lib/api são caminho legado; endpoints localhost:3333/antigos ausentes do build atual. Não é dependência comprovada de publicação da SPA atual; não remover legado nem modificar financeiro.

## Verificações e limitações

Build aprovado e lint com aviso histórico Fast Refresh. Testes unitários: 25 Pacientes, 15 Financeiro, 10 convite/redirect, 2 domínio (fonte real compilada em ambiente vazio), todos aprovados. São testes isolados, não publicação pública.

Preflight remoto por leitura: OPTIONS HTTP200 retornou origem permitida exata para HTTPS Brotas, HTTPS Ipupiara e local127.0.0.1:3000; origem externa desconhecida não recebeu permissão CORS. Não é comprovação de ação autenticada pelo navegador público. Uma primeira tentativa PowerShell restrita falhou na conexão TLS; repetição autorizada fora dessa restrição retornou os resultados acima. Checagem de espaços do índice aponta somente quebras Markdown/espaços finais de relatórios históricos preservados, não erro de compilação.

Suíte sintética login: 21 passaram, 22 pulados, 2 falharam (timeout inicial de navegação App e igualdade de cores por perfil). Reexecução App ainda atingiu timeout; não apresentar aprovação. Teste dirigido de hostnames, usando harness de Login e assertivas dos dois domínios/www/host desconhecido, passou. Nenhum comportamento funcional foi enfraquecido para esconder falhas; checagem de paleta fica identificada para investigação, sem redesign fora de escopo. Uma tentativa paralela colidiu na porta4182; o ensaio dirigido foi executado novamente sem essa colisão.

Não executados: deploy/HTTPS/login público/recarga interna/chamada de navegador dos domínios públicos; sem deploy permitido. SMTP/envio institucional/recebimento não executados, sem caixa/remetente. Nenhuma fixture criada, nada a limpar nesta rodada.

## Recuperação e próxima etapa

Código protegido por commits normais, sem reescrever histórico. Deploy preparado a partir do SHA sincronizado com variáveis somente públicas; pacote não deve incluir fonte/server/.env/previews. .htaccess anterior e pacote anterior precisam ser preservados no destino específico antes de upload. DNS/Auth/SMTP devem ter seus valores anteriores registrados antes de mudança; nesta rodada não foram mudados.

Para prosseguir: autorização nova de deploy na Hostinger, destino exclusivo/slot de cada clínica confirmado e remetente/serviço institucional definido. Preparação não equivale a publicação. SMTP próprio permite personalização no Free, segundo https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier. Templates do relatório23 permanecem locais até essa dependência existir. Não há necessidade comprovada de upgrade/VPS.
