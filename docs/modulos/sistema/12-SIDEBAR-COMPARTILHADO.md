# Navegação compartilhada — Sidebar Base UI

## Publicação autorizada — 02/10/2026 09:21 -03:00

Revisão de escopo concluída: somente navegação compartilhada, dependência Base UI,
construtor de rotas extraído sem mudança de regra, testes e documentação relacionada.
App/serviços da Agenda, Auth, RLS e migrations não são alterados. Entrada de produção
continua `index.html`/`src/main.tsx`; interceptações e fixtures ficam nos testes isolados,
não no build de produção. TypeSafe avaliada pela descrição: não pertinente.

GitHub e ambas as aplicações Hostinger confirmados na branch
`codex/resgate-local-2026-09-26`, versão anterior `a0e09bff07e00fbfd69857405188279c043f57e0`.
Integração automática habilitada, Vite/Node 22/npm/build/dist preservados.
Builds anteriores: Brotas `01a0fc57-12fb-7390-888a-f2ac5bda66bf`; Ipupiara
`01a0fc57-1344-7301-b7c6-8b17bd387719`, ambos completed e com o mesmo SHA.
Recuperação: reverter exclusivamente o commit do Sidebar e publicar novamente pela
mesma branch/integracão, sem force push, alteração do banco ou retorno ao cliente
antigo de gravação direta. A versão anterior já usa os serviços atuais da Agenda.

Build e lint da versão final aprovados; mantidos avisos preexistentes. Repetidos os
testes direcionados do Sidebar: 27 passaram, 3 não aplicáveis ao tamanho foram pulados.
As 69 regressões Agenda/Sobre e 19 cenários App anteriores continuam válidos: nenhum
código funcional foi alterado depois deles. Nota do Sidebar atualizada sem promessa
de release. Commit específico contém 18 arquivos; documentos compartilhados com
alterações anteriores ficam fora dele para não publicar trabalho alheio.
Commit/push e resultado de cada deploy serão registrados após confirmação efetiva.
Os registros locais abaixo são históricos, não comprovação da publicação.

## Resultado local — 02/10/2026 09:07 -03:00 (America/Bahia)

Implementado e verificado localmente. **Não publicado nesta tarefa.** Branch
`codex/resgate-local-2026-09-26`, HEAD observado
`a0e09bff07e00fbfd69857405188279c043f57e0`; alterações desta entrega não commitadas.
A Agenda publicada em a0e09bf e os trabalhos/documentos anteriores foram preservados.

## Implementação efetiva

- `src/components/ui/sidebar.tsx`: adaptação localizada do [Sidebar oficial Base UI](https://ui.shadcn.com/docs/components/base/sidebar), consultando também o registry base-nova/sidebar. Provider, primitives de composição e `useRender`/`mergeProps`; diálogo móvel Base UI com foco, Escape, sobreposição e retorno ao gatilho.
- `src/components/shell/AppShell.tsx`: provider único no layout autenticado. Conteúdo é irmão da navegação, sem chave ou remontagem por expansão. Login, convite e recuperação continuam fora desse layout.
- `src/components/shell/Sidebar.tsx`: identidade e unidade no topo; área central rolável; usuário/perfil/Sair no rodapé. Desktop 240/76px; até 1023px, menu sobreposto independente. Botão de menu sempre disponível no cabeçalho. Tokens, ícones, temas e identidades existentes reutilizados.
- `navigation.ts`: configuração central com títulos, ícones, links e visibilidade baseada em `TELAS_POR_PAPEL`. Papel desconhecido não recebe itens. Item atual deriva do pathname, aceita prefixo de subpágina com separador e usa `aria-current`. Isso **não cria subrotas novas nem substitui os guardas de App.tsx**.
- `src/lib/routePaths.ts`: extrai somente o construtor de caminhos existente; `appRoute.ts` reexporta a mesma função, sem alterar validação/restauração de sessão.
- Unidade continua vindo de `clinicaAtiva`/`clinicasDoUsuario` e do callback autorizado existente. Seletor Base UI também funciona recolhido; seletor do cabeçalho usa a mesma fonte, não outro estado de clínica. Foram preservadas as opções já oferecidas pelo sistema, sem ampliar vínculos ou permissões.
- Somente o booleano desktop `clinica:sidebar:expanded` é persistido em localStorage; indisponibilidade de armazenamento não bloqueia navegação. Mobile não salva estado. Sem atalho global, evitando conflito com campos/editores.
- “Novo agendamento” do menu preserva seu comportamento anterior: navega à Agenda; o botão próprio da Agenda abre o formulário existente, com seu contexto. Não foi criado outro cadastro nem gravação direta.
- Dependência `@base-ui/react` 1.8.0 acrescentada com lockfile. Não havia components.json. Não foi executada conversão/init da biblioteca, nem sobrescritos Alert/AlertDialog/ModalBase personalizados. Notas de evolução identificam implementação local, não release.

## Evidências e limites

| Verificação | Ambiente e resultado |
| --- | --- |
| Sidebar direcionado | **27 passaram**, 3 pulados por não se aplicarem ao tamanho: Recepção/Médico/Proprietária, ambas as marcas, links, estado ativo, F5/histórico, preferência, seletor recolhido, teclado/foco/Escape e independência móvel |
| Regressões afetadas | **69 passaram**: Agenda experiência/refinamento/fechamento + Sobre, em desktop/tablet/celular; componentes reais com respostas sintéticas |
| App completo / autenticação | **19 cenários distintos aprovados por respostas interceptadas**: 12 na primeira rodada e 7 na rodada dirigida, incluindo seis combinações clínica/perfil, módulos oferecidos, guardas, logout, restauração e consultas atrasadas. Não são sessões de usuários reais |
| Execução inicial | Primeiro cenário Brotas atingiu timeout de 30s durante page.goto, antes de produzir evidência de UI. Runner foi encerrado após resultados dos demais cenários e espera de teardown; repetido somente esse cenário e os seis novos, com servidor sintético separado. Os 7 passaram. Não foi presumido defeito/cache do usuário |
| Último ajuste visual | 3 cenários de captura/temas/geometria repetidos após adequar texto de Novo agendamento aos tokens claro/escuro; passaram. Estão incluídos no escopo dos 27, não acrescentam 3 cenários distintos |
| Formulário preservado | DOM e observações de criação permaneceram iguais ao mudar expansão do provider em ensaio programático isolado. O modal deixa o fundo inert: **não foi simulado clique de usuário através do overlay**. Grade/painéis/descarte/foco e sucesso externo passaram nas regressões |
| Zoom/responsividade | Viewports Chromium/Chrome 1440×1000, 820×1180, 390×844, com toque emulado e zoom **CSS** 125%/150%. Não comprova zoom nativo nem aparelho físico |
| Build/lint/diff | Build final e lint aprovados; lint conserva aviso preexistente de Fast Refresh em ThemeProvider; build conserva avisos de chunks/importação dinâmica. Diff whitespace conferido. Nenhuma mudança de serviços, SQL ou permissões |
| Dependências | npm audit indicou aviso baixo de DOMPurify propagado a jsPDF/jsPDF-autotable, não introduzidos pelo Sidebar (sem alteração dessas versões no lockfile). Sem atualização indiscriminada/autofix nesta entrega |

### Conferência conectada somente por leitura

Navegador do Codex, prévia normal `http://127.0.0.1:3000`, sessão **Recepção/Brotas**:
Agenda e item ativo corretos; recolhimento funcionou; navegação para Pacientes;
recarga preservou `/sistema/brotas/pacientes`, perfil, item ativo e preferência recolhida.
Financeiro, Equipe e Sobre abriram com seus cabeçalhos/URLs correspondentes; retorno à
Agenda e expansão conferidos. Trata-se de navegação/leitura, **não auditoria completa
dos módulos nem comprovação de gravação**. Nenhum registro real foi alterado.
Uma aba antiga apresentou timeout antes do despacho; nova aba permitiu a conferência.
Não foram copiadas credenciais, dados pessoais ou capturas de pacientes reais.

Ipupiara autenticada, Médico/Proprietária reais e zoom nativo **não verificados**.
Ensaios de escrita/persistência legítima da Agenda continuam pendentes da oportunidade
real já documentada em [Agenda 13](../agenda/13-EXPERIENCIA-RECEPCAO.md). F5 anteriormente
encerrado por relato do usuário não foi reaberto. Claude Code/Antigravity não verificados.

## Como conferir

Aplicação normal (banco principal; salvar altera dados reais):

- Brotas: http://127.0.0.1:3000/acesso/brotas
- Ipupiara: http://127.0.0.1:3000/acesso/ipupiara

Prévia **isolada, sem banco real**, usando o mesmo AppShell/Sidebar/Agenda:

- http://127.0.0.1:4192/tests/operacional/agenda-preview.html?complexa&curtas
- http://127.0.0.1:4192/tests/operacional/agenda-preview.html?unidade=ipupiara&complexa&curtas
- Para composição de perfis: acrescentar `&papel=medico` ou `&papel=proprietaria`.
- Outros destinos dessa demonstração são avisos explícitos, não módulos simulados como completos. A integração dos módulos reais foi testada separadamente no App com transporte interceptado.

Clique no botão do cabeçalho para recolher/expandir. No celular, abra o menu, navegue
ou feche por X/Escape. Confira Pacientes → Agenda, recarga e Voltar/Avançar. O seletor
oferece somente unidades já retornadas ao usuário autorizado. Não salvar dados reais
somente para demonstrar a navegação.

Capturas finais exclusivamente sintéticas, ignoradas pelo Git:
`scratch/sidebar/expandido.png`, `recolhido.png`, `movel-mobile.png` e `movel-tablet.png`.

Reprodução dirigida: `tests/operacional/playwright.sidebar.config.ts` agrupa os testes
afetados. Com servidor isolado 4192 já iniciado, definir `PACIENTES_TEST_EXTERNAL_SERVER=1`
e executar Playwright com esse config; sem a variável, ele inicia servidor próprio na
mesma porta e exige que ela esteja livre. Nunca executar esses ensaios apontando ao principal.

## Prontidão e próxima ação

Implementação local pronta para revisão. Nenhum commit, push, deploy, migration, alteração
de conta/vínculo ou integração de IA realizado. Publicação depende de autorização futura;
conferir zoom nativo e sessões não disponíveis, sem promover testes sintéticos a homologação.
