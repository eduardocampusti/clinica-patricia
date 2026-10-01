# Restauração da sessão e navegação após F5

## Revisão após relato de Recepção — 01/10/2026

O titular relatou Dashboard → Pacientes → F5 → Dashboard após o commit64e22df. A validação conectada anterior foi de proprietária/Brotas; **não comprova Recepção**. O relato reabre a conferência desse perfil, sem invalidar ou ampliar o escopo das evidências anteriores.

Investigação: menu chama `setTela`, que atualizava history e um estado React separado. Na conclusão da consulta, App escolhia o destino usando o estado capturado (`tela`), não a URL atual, e substituía history. Um teste dirigido com consulta pendente e atualização da URL reproduziu Pacientes → Dashboard na versão anterior. É reprodução **sintética da divergência**, não correlação definitiva com o evento real do titular. Outro teste demonstrou que rota válida fora do perfil era descartada silenciosamente para Dashboard. Não foram atribuídos cache ou erro do usuário.

Novos testes Recepção com atraso de700ms nas respostas sintéticas de vínculos e papel: ambas as unidades passaram já antes da correção. Logo, atraso sozinho não explicou o relato. Para comprová-lo no domínio, foi solicitada sessão Recepção no navegador controlado; a disponível era de proprietária/Brotas. Nenhuma credencial solicitada ou conta criada.

Correção local: `useCaminhoAtual` observa a URL com `useSyncExternalStore`; menu, histórico e conteúdo usam a mesma localização. `navegarPara` centraliza push/replace e notifica React. Ao confirmar autorização, App relê a URL vigente; Dashboard só é padrão quando não há rota interna válida. Rota não autorizada mantém destino e mostra erro explícito. Se a unidade solicitada mudou durante a consulta, a autorização é refeita para essa unidade; não reutiliza a clínica anterior. Token/foco não escolhem página padrão. Convite/recuperação preservados; nenhum dado pessoal/formulário armazenado, nenhuma mudança de banco/permissões.

Arquivos desta revisão: `src/App.tsx`, `src/lib/appRoute.ts`, `src/config/notasEvolucao.json`, `tests/login/navigation.spec.ts` e documentação/checkpoints. Resultado final dos testes, publicação e eventual conferência real serão registrados abaixo conforme execução; não declarar o fluxo Recepção aprovado somente pelo teste sintético.

Verificações locais efetivas: suíte de18 cenários aprovada (1,1min), build/lint aprovados com avisos históricos. Ensaio adicional de troca de unidade durante consulta inicialmente falhou porque a simulação retornava dois vínculos apesar do filtro de clínica; corrigido somente o harness para respeitar o contrato `maybeSingle`. Nova execução dos quatro cenários afetados (atraso nas duas unidades, prioridade da URL e mudança de unidade) passou4/4 em20,9s. Total19 cenários distintos aprovados. Dois testes de regressão falharam antes da correção: URL vigente substituída por Dashboard e rota não autorizada redirecionada silenciosamente.

URLs nos testes sintéticos de Recepção, em contextos separados Brotas/Ipupiara: autenticação restaurada `/sistema/<unidade>/dashboard`; clique Pacientes `/sistema/<unidade>/pacientes`; imediatamente antes do F5 igual; após carregamento a mesma URL e cabeçalho Pacientes. Agenda preservou `/sistema/<unidade>/agenda`. Voltar/Avançar mantiveram URL/conteúdo, acesso direto passou; logout/F5 foi coberto pela suíte. Não são evidências de sessão Recepção conectada em produção. TypeSafe consultada novamente (skill/índice): sem pertinência para roteamento determinístico, sem API/chave.

### Histórico da entrega 64e22df

Data: 01/10/2026. Estado: PUBLICADO — conferência autenticada Brotas executada; sessão própria Ipupiara/Recepção pendente conforme limites abaixo.

## Causa comprovada

`App.tsx` inicializava `acessoValidado=false` e `tela=dashboard`. O botão Continuar validava vínculos e liberava o shell apenas em memória. Menu e botão trocavam componentes, sem mudar o caminho `/acesso/brotas` (ou Ipupiara). Por isso F5 restaurava a sessão Supabase, mas exigia Continuar novamente e esquecia a página. A correção anterior do convite fez uma navegação efetiva, expondo essa etapa intermediária preexistente; não é perda de senha ou sessão.

## Decisão aprovada e implementação

- Sessão restaurada não equivale a autorização: `carregarAcessosClinicas` consulta vínculos ativos e clínicas pelo cliente comum/RLS. App verifica novamente a lista e o papel da clínica ativa antes de montar a área interna. Identidade validada deve corresponder ao usuário atual.
- Inicialização centralizada no App; Login não duplica a preparação de vínculos quando usado nesse fluxo. Carregamento discreto substitui o formulário enquanto há sessão em verificação. Sem sessão apresenta login; ausência confirmada de vínculo e erro técnico têm mensagens distintas. Falha de consulta não provoca logout automático nem comprova ausência.
- Rotas internas limitadas a `/sistema/brotas/<pagina>` e `/sistema/ipupiara/<pagina>`, com páginas da enumeração existente. Agenda e Pacientes são recuperadas pela URL, sem persistir dados pessoais, formulários ou filtros não salvos. Entrada autorizada substitui a rota de acesso no histórico; menu atualiza a URL; Voltar/Avançar lê a rota e seleciona apenas clínica presente na lista autorizada.
- A URL só guarda localização, não concede permissões. Destinos seguem os papéis já oferecidos pelo menu; Sobre continua disponível a todos os perfis. Clínica diferente exige vínculo ativo próprio; domínio não concede acesso.
- Convite válido e recuperação têm prioridade sobre a restauração comum. Link e evento PASSWORD_RECOVERY continuam necessários; senha é definida pelo titular. Após aceite, navegação refaz consultas sem repetir aceite. Recuperação não concede vínculo. Nenhum convite, recuperação ou senha real enviados/alterados nesta tarefa.
- Logout limpa a etapa validada e volta ao acesso; sessão ausente impede restauração por F5/Voltar. Entrar com outra conta permanece disponível em erro e login; Sair permanece no menu. Lembrar meu acesso continua guardando somente a unidade; restauração não apaga nem recria essa preferência. Eventos de foco/renovação do mesmo usuário não reiniciam navegação.

## Arquivos e preservação

App, Login, hooks de clínica/vínculos/papel, `clinicAccess`, `appRoute`, `clinicBrands`, tipos/Sidebar e notas de evolução. Nenhuma migration, RLS, Auth remoto, SMTP, senha, regra financeira ou cadastro alterado. Fallback `.htaccess` já publicado é reutilizado para as rotas internas. Site Geovana e os ensaios anteriores permanecem preservados.

## Verificações executadas

Testes interceptados em `tests/login/navigation.config.ts`: 15 cenários dirigidos (navegação, convite e recuperação), aprovados. Brotas e Ipupiara em contextos separados: entrada automática; F5 repetido em Agenda/Pacientes; acesso direto; logout/F5/acesso protegido sem sessão; falta de vínculo; erro técnico; login normal; sessão expirada recusada pelo Auth; destino fora do perfil; convite pós-aceite desktop/móvel; recuperação neutra, erro e retorno validado. Somente dados sintéticos e respostas interceptadas, sem gravar no Supabase. Uma execução inicial falhou porque o harness usava a chave de storage do principal em vez do endpoint sintético; corrigido o teste, não as credenciais do aplicativo.

Build e lint aprovados. Avisos preexistentes: Fast Refresh ThemeProvider e tamanho/importação de bundle. `git diff --check` conferido. TypeSafe skill e índice vivo consultados: autenticação/roteamento determinísticos, sem Jev/API/chave. Referência oficial Supabase: https://supabase.com/docs/reference/javascript/auth-onauthstatechange — evento SIGNED_IN pode reaparecer ao focar a aba; consultas permanecem fora do callback Auth.

## Conferência simples

1. Abrir o acesso público da unidade com sua própria sessão autorizada; deve abrir a área interna sem Continuar.
2. Abrir Agenda e pressionar F5; repetir em Pacientes. URL deve indicar página/unidade.
3. Sair; F5 não pode abrir área interna. Login/convite/recuperação são conferências distintas, sem enviar novas mensagens só para testar aparência.

Local preservado: http://127.0.0.1:3000/acesso/brotas e http://127.0.0.1:3000/acesso/ipupiara. Público: https://clinicabrotas.com.br/acesso/brotas e https://clinicaipupiara.com.br/acesso/ipupiara.

## Publicação efetiva e evidências conectadas

Commit `64e22dfe6b626b71dc152b4a91664bbb607d13bc`, branch `codex/resgate-local-2026-09-26`, push normal, sem main/force push. Hostinger confirmou builds `completed`: Brotas `01a0f711-4816-712c-8897-ab1e5a9b66d2`, 10:46:52 UTC; Ipupiara `01a0f711-4891-72a0-aece-40d5bac982a1`, 10:46:57 UTC. Navegador confirmou bundles servidos `index-QOJO83ek.js` e `index-CR26p8vz.js`, respectivamente.

Antes da ativação, observação conectada do bundle anterior: clicar Continuar abria shell, mas URL continuava `/acesso/brotas`. Depois da ativação, na sessão real já autorizada de proprietária em Brotas:

- Recarga do acesso encaminhou automaticamente a `/sistema/brotas/dashboard`.
- Menu Agenda mudou a URL para `/sistema/brotas/agenda`; recarga preservou essa URL e o cabeçalho Agenda, sem botão Continuar.
- Pacientes seguido de recarga preservou `/sistema/brotas/pacientes` e o cabeçalho Pacientes. Nova recarga repetida permaneceu na mesma página, sem loop.
- Navegação direta para a URL interna de Agenda recuperou a área interna e a página correta.

Somente navegação/leitura; não foram abertos formulários nem alterados registros, credenciais ou permissões. Não expostos dados de pacientes ou tokens nas evidências registradas. Sem fixtures novas, portanto nenhuma limpeza de banco nesta tarefa; a fixture anterior do ensaio de e-mails continua pendente de seu próprio encerramento.

Ipupiara: sem sessão autenticada nesse domínio no navegador controlado. Rota direta `/sistema/ipupiara/agenda` e recarga carregaram login com identidade Ipupiara, bundle novo e nenhuma área protegida. Não se presume sessão compartilhada com Brotas. F5 autenticado e login normal em Ipupiara precisam do titular em sua sessão própria. Recepção real em Brotas também não foi usada pelo agente; o perfil foi coberto nos testes sintéticos, não deve ser apresentado como conferência conectada desse perfil. Logout real da proprietária não executado para preservar sua sessão; logout/F5, expiração, negativas, convite e recuperação foram verificados sinteticamente, sem novos envios ou alterações de senha real.

Execução final dos 15 testes: todos aprovados em46,9s; build/lint finais aprovados, somente avisos históricos. Documentação/checkpoints atualizados após publicação sem novo deploy de código. Ambiente local mantido em3000, HTTP200 para acesso Ipupiara. Próximo passo de conferência pessoal: F5 em Agenda/Pacientes com a conta Recepção em Brotas e sessão autorizada própria em Ipupiara. Não exige novo convite.
