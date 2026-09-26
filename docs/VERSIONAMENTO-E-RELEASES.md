# Versionamento e releases — processo em preparação

## Marco inicial e evidências

- `0.1.0` é a primeira versão **identificada no código local desta fase de desenvolvimento**. Não comprova módulos concluídos, publicação ou release no GitHub.
- `package.json` e `package-lock.json` identificam o código/build atual. `.release-please-manifest.json` permanece em `0.0.0` como referência inicial da automação — **isso não afirma que existiu uma release 0.0.0**. `0.1.0` ainda não foi lançado. `initial-version: 0.1.0` prepara a primeira proposta de release para esse número; confirmar o resultado da primeira PR de release antes do merge.
- A API pública do GitHub, consultada em 26/09/2026, confirmou `main` como branch padrão, sem tags ou releases. A falha inicial de autenticação Git ocorreu no sandbox; na worktree isolada com permissão de rede, `gh auth status`, `push` e a abertura de PRs em rascunho foram confirmados. Isso não implica merge ou publicação.
- O repositório remoto configurado é `eduardocampusti/clinica-patricia`. `main` é o destino de integração/lançamento **após** revisão dos 37 commits do checkpoint e das mudanças locais. Uma antiga branch de checkpoint não deve ser usada automaticamente como alvo de releases. O inventário está em `docs/releases/0.1.0-CONSOLIDACAO-LOCAL.md`.

## Notas e versão no aplicativo

1. Toda mudança relevante para usuários recebe texto curto e verificado em português nas categorias de `src/config/notasEvolucao.json` (`naoLancadas`) **na própria PR da mudança**. O título/descrição do commit de integração usa Conventional Commits em português (`feat:`, `fix:` ou `perf:`); o Release Please usa esse texto para preparar automaticamente o `CHANGELOG.md` com seções “Novidades”, “Correções” e “Melhorias”. A automação não traduz nem valida a veracidade dos textos. Pendências de homologação ficam no checkpoint do módulo, não nas novidades destinadas ao usuário.
2. `versaoEmDesenvolvimento` deve corresponder à versão de `package.json` e `package-lock.json`. O build valida essa correspondência e exige notas. A página mostra “Versão em execução”, o ambiente real e o selo “Em desenvolvimento” enquanto a versão só constar em `naoLancadas`.
3. Na PR de release, revisar e mover as notas pertinentes para `versoesLancadas`, registrar resumo e data **efetiva** (quando conhecida) e alinhar o manifesto ao número publicado. Esta etapa de curadoria humana continua necessária: Release Please gera o changelog da PR, mas não inventa notas clínicas nem preenche automaticamente `notasEvolucao.json`. O build recusa manifesto e versão iguais sem notas lançadas correspondentes. O histórico na interface só usa entradas de `versoesLancadas`; enquanto vazio, informa que será atualizado no primeiro lançamento.
4. O Vite incorpora versão, commit de origem, existência de alterações locais e hora da compilação. O SHA de uma árvore suja não identifica sozinho o código. A hora de compilação não é a data de publicação. Uma instalação antiga continua mostrando o que veio no seu próprio bundle; não consulta GitHub para anunciar funcionalidades que não recebeu. `npm run dev` não incrementa versões.

## Política da série 0.x

- Correção compatível sem funcionalidade nova: incremento PATCH (`0.1.0` → `0.1.1`).
- Funcionalidade nova ou mudança intencional de comportamento: incremento MINOR (`0.1.x` → `0.2.0`).
- Mudança incompatível antes da estabilidade: propor novo MINOR e descrever a incompatibilidade explicitamente na PR e nas notas. A automação deve ser revisada porque sua interpretação de `BREAKING CHANGE` em pré-1.0 pode diferir da política do produto.
- A passagem a `1.0.0` exige decisão deliberada do proprietário; nunca é inferida de uma compilação ou de commits isolados.

## Automação Release Please — ainda sem gatilho automático

1. A configuração nesta branch de integração de `.github/workflows/release-please.yml` propõe `push` restrito a `main` e `workflow_dispatch`, ambos com `target-branch: main`. Ela não está em `main` e não está ativa; a API pública retornou 404 para `.github/workflows` em `main` nesta revisão. Conferir proteção de `main`, permissões do Actions para criar PRs e se o fluxo publicado corresponde ao diff revisado antes de ativar.
2. A configuração cria PR de versão em rascunho, para revisão humana, com `initial-version: 0.1.0` e regras pré-1.0 explícitas. Release Please 17.11.2 foi exercitado **nas funções de cálculo**, sem escrita remota: sem release anterior, a primeira versão foi `0.1.0`; partindo de `0.1.0`, `fix` resultou em `0.1.1`, `feat` em `0.2.0` e breaking pré-1.0 em `0.2.0`. O dry-run integral contra `codex/integracao-010-sistema` terminou com código 0 e propôs exatamente uma PR **em rascunho**, `release 0.1.0`, sem criá-la; os arquivos previstos incluem manifesto, pacote, lockfile e changelog. Repetir a conferência na primeira PR automática efetivamente criada após a integração em `main`.
3. A automação usa Conventional Commits e prepara PR de release, manifesto, pacote/lockfile e `CHANGELOG.md`. Antes do merge, revisar número proposto, notas em português, código incluído e compatibilidade com a política 0.x. No primeiro ciclo, confirmar na própria PR que a proposta é `0.1.0` e completar `versoesLancadas`; o build deve passar com esse estado de release.
4. Após o merge da PR de versão, confirmar a criação da tag e GitHub Release conforme o fluxo aprovado. Eventos gerados pelo `GITHUB_TOKEN` podem não disparar outros workflows automaticamente; conferir o pipeline real. Publicar o frontend é uma ação separada, com aprovação e retorno planejado.

O `CHANGELOG.md` será gerado pela automação quando houver PR de release. A página Sobre usa as notas embarcadas em `src/config/notasEvolucao.json`, não texto remoto em tempo de execução.
