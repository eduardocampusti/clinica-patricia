# Equipe — ReUI Data Grid na listagem normal

Consolidação conectada em06/10/2026: [resultado31–33, versões, limites e roteiro34](34-CONSOLIDACAO-HOMOLOGACAO-REAL.md).
Principal autorizado:32/33 e corretiva aplicadas, Edges v3,28 testes reais aprovados;
UI normal Brotas/Ipupiara com foto salva, dados confirmados e F5. Domínios preservam
frontend anterior eff05f60; cinco contas técnicas encerradas, três fichas mantidas.
Limites de Auth, download UI e demais cenários estão no34. Histórico datado abaixo.


## Correção visual da etapa31 — 2026-10-05 15:28:00 -03:00

**Estado atual: composição visual corrigida e conferida localmente pelo agente.**
O pedido posterior do usuário reabriu a apresentação da etapa31: a integração
funcional anterior não comprovava fidelidade visual. As seções seguintes conservam
seu histórico; esta seção descreve o resultado da correção, ainda sem publicação.

### Composição e causa corrigida

A regra local anterior dimensionava o próprio checkbox em44px e ocultava sua
área adicional; a tabela também empilhava Ver/Editar. Corrigidas essas regras em
`equipe.css`, sem alterar inputs/botões/tabelas globais ou primitivas compartilhadas.
Checkbox visual16px, alvo44×44 com clique além do quadrado e teclado verificados.
Avatar34px, nome com peso500, e-mail de contato discreto quando existente. Cargo
principal e tipo/profissão secundários com deduplicação textual; cadastro e acesso
continuam independentes. Colunas: seleção, Pessoa, Função, Clínicas vinculadas,
Conta e acesso, Ações. Removido o rótulo repetido Pessoa cadastrada.

Resumo mantém clínica, estado confirmado/desconhecido e papel quando confirmado;
Acesso ativo nesta clínica é abreviado para Acesso ativo ao lado do nome explícito
da clínica, sem mudar os estados do serviço. Detalhes seguem na ficha. Ações
visíveis lado a lado, com altura mínima44px; separadores finos, cabeçalho leve,
altura natural e rodapé de paginação dentro da mesma borda. Ordenação por
cabeçalhos no computador; seletor só nos cards móveis. Estado TanStack e contratos
anteriores preservados, inclusive seleção visual, foco, filtros e contagens por ID.

### Fotos: origem, proteção e dependência real

Investigados MembroEquipe, equipe_listar, migrations existentes de Equipe,
Profissionais e PacienteAvatar/pacienteFoto. **O contrato atual da equipe não
fornece foto, caminho ou URL autorizada.** A infraestrutura de fotos de pacientes
pertence a outro domínio, consulta individualmente e não foi reutilizada.
Não houve leitura de banco/SQL nesta investigação; somente arquivos locais.

Novo EquipeAvatar usa Root/Image/Fallback do Base UI já instalado. Até duas
iniciais, círculo34px e fallback com a mesma dimensão após falha. Interface
opcional fotos da listagem exige membroId e clinicaId correspondentes à linha e
à clínica ativa; não associa por nome ou e-mail e não faz consulta por pessoa.
Troca de contexto/imagem recria o avatar. O fluxo normal não fornece essa interface:
**pessoas reais exibem iniciais**. Uma futura fonte autorizada de fotos de equipe
precisa entregar as imagens por identificador confiável. Upload/cadastro de fotos,
nova coluna/bucket/permissões não foram implementados. Sem indicador online.

Uma foto inteiramente fictícia foi gerada pela ferramenta integrada imagegen,
modo geração, sem imagem de entrada, para testes isolados. Arquivo:
`tests/operacional/assets/avatar-equipe-ficticio.png`; prompt final e origem em
`tests/operacional/assets/README.md`. Somente a entrada de testes equipe-avatar.html
importa essa demonstração; nenhuma pessoa real recebe foto demonstrativa.
A imagem não integra o bundle normal. Base UI/shadcn Avatar consultado pelo MCP
ReUI e na [documentação oficial](https://ui.shadcn.com/docs/components/base/avatar).
Nenhuma nova instalação, atualização ou migração de dependências nesta correção.

### Comparação visual e evidências fictícias

Prévia oficial c-data-grid-7 inspecionada no navegador: avatar32px, checkbox16px,
nome moderado/e-mail discreto, linhas próximas58px, separadores finos e rodapé
integrado. Comparadas visualmente as capturas locais, além dos testes funcionais.
A adaptação possui avatar34px e linha simples próxima62px; função longa,
múltiplos vínculos e estados completos aumentam a altura naturalmente, sem cortes.
Mantidas as cores por clínica e as ações que o exemplo não possui; sem contêiner
alto/vazio, bolinha de disponibilidade ou fotos fictícias no fluxo normal.

Capturas novas em `scratch/equipe-reui-visual/` (artefatos locais):

| Captura | Conteúdo |
| --- | --- |
| brotas-1440-avatar.png / ipupiara-1440-avatar.png | Computador, foto fictícia e iniciais, três pessoas e rodapé |
| brotas-390-avatar.png / ipupiara-390-avatar.png | Cards, mesma foto/iniciais e paginação, identidades por clínica |
| variantes360/430/820-avatar.png | Celular estreito, celular maior e tablet; ambas as clínicas |
| desktop-paginado.png / mobile-paginado.png | 36 pessoas sintéticas, paginação e seleção compartilhadas |

Capturas anteriores da etapa31 em scratch/equipe-reui preservadas como histórico.
As capturas são fictícias; não contêm CPF, credenciais ou identificação real.

### Verificações efetivamente realizadas

**21 cenários /24 execuções finais aprovadas**:21 no projeto desktop,2 adicionais
mobile390 com toque emulado e1 tablet820 com toque emulado. Arquivos:
`equipe-avatar.spec.ts` (6), `equipe-grid.spec.ts` (5), `equipe-listagem.spec.ts` (10).
Foto válida/ausente/quebrada, identificação/clínica divergentes sem requisição da
foto, ausência de e-mail sem linha de aviso, nome longo/múltiplas clínicas,
checkbox16/alvo44/teclado, ações44/lado a lado, ordenação sem seletor duplicado,
rodapé integrado, busca/filtros/limpeza, contagens/deduplicação,10/25/50,
seleção atual/limpeza, foco/ficha e atualização sintética36→12 passaram.
Larguras360/390/430/820/1440, navegação de Cadastros/Serviços e tema escuro passaram.

Na primeira execução houve uma espera inicial de imagem não concluída durante o
preparo do ambiente e asserções de teste que confundiam requisições de módulos
locais do Supabase com chamadas de API. Corrigido o teste para distinguir caminhos
rest/functions e aguardar a imagem; execuções finais aprovadas, sem defeito de
interface pendente identificado. Rotas externas dos testes de fotos bloqueadas.

TypeScript do aplicativo e do harness/spec isolados aprovados. Lint sem erros,
16 avisos preexistentes (Fast Refresh/dependência do núcleo). Build aprovado,
com avisos preexistentes de chunks grandes/import dinâmico do Supabase;
notas de evolução coerentes. Não repetida a auditoria geral nem os testes de
banco/e-mail anteriores. Build não constitui prova de produção.

### Aplicação normal conectada — somente leitura

Ambiente http://127.0.0.1:3000, sessão Proprietário(a) confirmada pela interface,
05/10/2026. Sem usar fixtures na aplicação normal.

| Conferência | Brotas | Ipupiara |
| --- | --- | --- |
| Clínica/lista/avatar | Correta;2 pessoas,2 iniciais;1 e-mail de contato fornecido | Correta;2 pessoas,2 iniciais; nenhuma foto fornecida |
| Busca/limpeza | Nome sem acento/caixa:1; limpeza:2 | Nome sem acento/caixa:1; limpeza:2 |
| Computador1440 | Checkbox16; rodapé integrado; linhas80/99px com conteúdo real | Checkbox16; rodapé integrado; linhas79/99px na composição final |
| Ficha/acesso | Médico=seletor; Salvar bloqueado; reabertura/foco/filtro preservados | Recepção=seletores nas duas clínicas; ambos Salvar bloqueados; outra pessoa com convite pendente |
| Editar/Cancelar | Tipo saúde fixo;1 vínculo apresentado | Tipo administrativo fixo;2 vínculos apresentados |
| Novo/Cancelar | CPF(opcional), sem preencher/salvar | CPF(opcional), sem preencher/salvar |
| Mobile390/Serviços/retorno | Cards com avatar; documento375/390; navegação e recarga funcionaram | Cards com avatar; documento375/390; navegação e recarga funcionaram |

A composição final foi observada separadamente nas duas clínicas, incluindo
a abreviação contextual de Acesso ativo. Não se atribui equivalência de sessão/perfil
de uma clínica à outra. Navegador terminou na Equipe local Ipupiara, sem ficha
aberta e com viewport temporário restaurado.

Mais de uma página, redução36→12, estados controlados de erro e fotos são **somente
sintéticos**. Fotos reais, outros perfis, aparelho físico e entrega de e-mails não
verificados. Nenhum cadastro, convite, papel, acesso ou vínculo real alterado;
sem SQL, alteração de Auth/configuração ou homologação de operações de escrita.
Conferência interna do agente não é aprovação pessoal do usuário.

### Arquivos, Git e preservação

Correção: `src/components/cadastros/EquipeAvatar.tsx`, EquipeListagem.tsx,
equipe.css; novo harness/html/spec/assets isolados; ajustes direcionados nos testes
grid/listagem. Documentação: este relatório, documento funcional, README,
checkpoint do módulo, checkpoints operacional/raiz, índice e notasEvolucao.json.
Equipe.tsx, equipeLista.ts, primitivas/núcleo ReUI, CSS global, package/lock e
arquivos de banco permanecem intactos em relação ao início desta correção.
Baseline90 arquivos locais anteriores conferida,12 alterações restritas aos arquivos
autorizados desta correção (mais arquivos novos); Caixa/SMTP/Jev/outros módulos
não alterados pela correção. Mudanças existentes da primeira etapa31 mantidas.

Branch codex/resgate-local-2026-09-26; HEAD eff05f60e07c4042bbb931d1c14d19432612d01d;
índice vazio, etapa31 e sua correção visual não commitadas. **Sem commit, push,
merge ou deploy.** Última publicação relatada/registrada continua eff05f60;
não houve nova conferência dos sites publicados nesta tarefa.

Jev: única triagem sintética, code_change/confiança0,92, complexidade1,17/2
(confiança0,74);905 tokens entrada/119 saída,919,9929ms,US$0,00003801. Nenhum
conteúdo privado enviado. typesafe-ai consultada/reavaliada: determinística,
sem IA no produto, integração/API direta ou leitura/exposição de TYPESAFE_API_KEY.
Próxima ação: revisão pessoal da aparência local; fotos reais dependem de fonte
autorizada futura e publicação exige pedido específico. Não consta aprovação pessoal.

## Histórico da implementação funcional inicial

Estado: IMPLEMENTADO E VERIFICADO LOCALMENTE PELO AGENTE.
Data: 05/10/2026, America/Bahia (-03:00).
Autorização: etapa 31, frontend, dependências necessárias, testes e documentação.
Sem autorização de commit, push, merge ou publicação nesta etapa. A conferência
interna não equivale à aprovação pessoal do usuário.

## Componente exato e compatibilidade

O exemplo gratuito **@reui/c-data-grid-7** foi consultado no catálogo oficial e
instalado pelo comando `npx --yes shadcn@latest add @reui/c-data-grid-7 --yes`
em um checkout isolado do HEAD eff05f60. Registro consultado:
https://reui.io/r/base-nova/c-data-grid-7.json.
Referências: [prévia](https://reui.io/preview/base/components/c-data-grid-7?ref=mcp),
[API Base UI](https://reui.io/docs/components/base/data-grid?ref=mcp).
Workflow ReUI consultado pelo MCP, versão e7aac3424a; CLI shadcn4.21.2 confirmado
no cache da instalação; variante Base Nova, gratuita.
Não houve substituição do identificador nem aquisição de licença.

O instalador gerou 24 arquivos, oito dependências diretas e alteração no CSS global
isolado. A revisão selecionou somente a cadeia de dez arquivos importada pelo
núcleo/tabela/paginação/área de rolagem. Nenhum componente antigo foi sobrescrito.
Avatar, exemplo demonstrativo, fotos, bandeiras, DnD, virtualização e dependências
dessas variantes não foram transferidos. O CSS global gerado não foi transferido.

Versões efetivas do projeto: React/React DOM19.2.8, Base UI1.8.0, Tailwind4.3.3,
Vite8.2.0 e TypeScript6.0.3. Dependências diretas novas e fixadas:

| Dependência | Versão | Utilização |
| --- | --- | --- |
| @tanstack/react-table | 9.2.6 | Instância única `useTable`, ordenação, paginação e seleção |
| cn | 0.4.0 | Composição de classes do código oficial |
| class-variance-authority | 0.7.1 | Variantes do botão instalado |
| lucide-react | 1.52.0 | Ícones importados pelas primitivas oficiais |

O registro usa a API v9, efetivamente instalada, sem conversão para v8. São oito
pacotes novos contando transitivos. Comparação do lock anterior confirmou que
nenhuma entrada de pacote preexistente mudou; só o manifesto raiz recebeu adições.
Sem atualização geral, migração de framework ou integração de IA.

`validate_usage` confirmou o exemplo gratuito e as propriedades oficiais da raiz.
Paginação/scroll são exports do Data Grid, sem entrada individual no índice desse
validador: suas propriedades foram conferidas na documentação e no código instalado.
Checklist ReUI consultado. As adaptações autorizadas preservam a composição:
tokens existentes nas primitivas novas, textos e dimensões de toque; remoção de
declarações não utilizadas para cumprir TypeScript estrito; propriedades locais
opcionais `tableLabel`/`rowTestId` para acessibilidade/evidência. Essas duas extensões
são locais e não são apresentadas como API original do ReUI.

## Comportamento implementado

- `EquipeListagem.tsx` usa os componentes reais DataGrid, DataGridContainer,
  DataGridScrollArea, DataGridTable, DataGridPagination e seleção do exemplo7
  na aplicação normal. O exemplo isolado não é uma nova tela do produto.
- Uma instância TanStack recebe o resultado já filtrado/deduplicado de equipeLista.
  Ordenação por nome ou tipo/profissão, com comparação pt-BR e desempate por ID,
  antecede paginação local. Nome A–Z é inicial; cabeçalhos e seletor usam o mesmo estado.
- Paginação10/25/50, inicialmente10, controles acessíveis em português. Tabela com
  altura natural, região de rolagem própria e ações fixas à direita. Cards móveis
  usam exatamente `table.getRowModel().rows`, mesmos dados, handlers e paginação.
- IDs estáveis da pessoa; seleção visual, quantidade explícita e checkbox de página.
  O helper oficial usa `toggleAllPageRowsSelected`, nunca todas as páginas.
  Seleção não abre ficha nem envia operação. É limpa por clínica, busca/filtros,
  página, tamanho, ordenação e atualização da lista recebida.
- Busca/filtros voltam à primeira página; redução da lista ajusta a última página
  válida. Abrir/fechar ficha mantém filtro, página, seleção e foco; renderers estáveis
  evitam substituir o botão que originou a ficha. Operação existente pode reconsultar
  a lista e limpar seleção, mantendo filtros/página válida. Nenhuma escrita duplicada.
- Resumos **Pessoas encontradas**, saúde e demais contam todo resultado filtrado
  recebido, não apenas a página. A consulta não comprova total global: RPC sem total
  ou paginação e limite remoto não auditado. Texto mantém “desta consulta”.
- Clínica da sessão não se confunde com filtro de vínculo. Conta/convite/acesso
  desconhecidos continuam não confirmados; cache de fichas pode refinar a lista.
  Sem filtros de estado não sustentados pelo contrato e sem consulta por linha.
- Estados de carga, recusa, erro, vazio e filtro sem resultado preservados.
  Fichas/formulários/permissões/CPF e operações24–29 não foram reimplementados.

## Arquivos e efeitos compartilhados

Alterados: package.json/package-lock.json, EquipeListagem.tsx, equipe.css,
tsconfig.json/tsconfig.app.json e vite.config.ts (alias `@/`), notasEvolucao.json,
testes equipe-listagem/equipe-erros e documentos deste encerramento.
Novos: components.json, equipe-grid.spec.ts, este relatório, cinco arquivos em
`src/components/reui/data-grid/` (núcleo, i18n, tabela, paginação, scroll) e cinco em
`src/components/ui/` (button, checkbox, spinner, select, skeleton).

As primitivas novas só são importadas por esta integração. Alertas/sidebar antigos,
src/index.css, Equipe.tsx, equipeLista.ts e demais módulos permanecem inalterados.
Sem ReUI global/OAuth/configuração pessoal alterada. Sem dados fictícios/imports
de fixtures na aplicação normal; capturas e testes usam somente o servidor sintético.

## Verificações efetivamente executadas

**23 cenários dirigidos aprovados**, projeto Playwright desktop; os testes de layout
definem suas próprias larguras360/390/430/820/1440.
Composição:5 novos equipe-grid,10 equipe-listagem e8 regressões selecionadas de
papéis/edição/erros. Não foi repetida a bateria completa de outros módulos.

Novos:36 pessoas fictícias, ordem de serviço invertida e ID multi-clínica repetido;
ordenar antes de paginar,10/25/50, contagem36/18/18 e filtros combinados; carga
atrasada sem falso vazio; seleção de página/Space/limpeza por contexto; ficha na
quarta página com foco e papel bloqueado; escrita exclusivamente simulada reduzindo
lista36→12 e ajustando página válida; alternância tabela/cards mantém estado sem
consultas adicionais. Demais: desconhecido/convite por clínica, erros/recuperação403,
foco, filtros preservados, Serviços/retorno, ausência de overflow, ações44px e
contraste de textos claros/escuros. Papéis Administradora/Recepção mantidos,
troca de pessoa/clínica/leitura atrasada e tipo/vínculos de edição conferidos.

Falha de foco encontrada na primeira integração foi corrigida e revalidada.
Um teste antigo ainda esperava texto genérico para403; foi alinhado ao texto específico
de recusa já implementado na etapa30, sem alterar regra de permissão. Um primeiro
teste excedeu30s durante otimização inicial; nova execução passou. Após isso,
22 cenários passaram juntos e o cenário de recusa passou separadamente.
Verificações adicionais com dispositivo emulado:3 execuções mobile de carga,
seleção/contexto e continuidade tabela/cards, com toque habilitado. A primeira
carga mobile excedeu o timeout padrão durante inicialização; limite do arquivo
novo ajustado a90s, como no teste de listagem existente, e cenário passou sem
alterar comportamento da aplicação.
Mais1 execução tablet820 com toque habilitado aprovou tabela/ações/Serviços/retorno.
Total27 execuções aprovadas cobrindo23 cenários distintos e variações de dispositivo;
nenhuma verificação foi feita em aparelho físico.

TypeScript e build passaram; lint sem erros, com avisos de Fast Refresh do código
ReUI/ThemeProvider e dependência de hook do componente importado. Build conserva
avisos de importação Supabase estática/dinâmica e chunk grande; bundle principal
final observado1.365,04kB (377,43kB gzip). Não houve otimização de outros módulos.
`npm audit --omit=dev`: um aviso baixo em DOMPurify preexistente e inalterado,
fora desta integração; nenhuma correção automática/atualização foi executada.

Capturas apenas fictícias: `scratch/equipe-reui/1440-lista.png`, `390-lista.png`,
`desktop-paginado.png`, `mobile-paginado.png`, demais larguras e Ipupiara escuro.
Prévia visual inspecionada pelo agente. Evidências da etapa30 preservadas em sua pasta.

## Conferência conectada — aplicação local normal

05/10/2026, porta3000, sessão **Proprietário(a)** confirmada na interface; clínica
trocada pelo seletor autorizado, sem alterar vínculos. Data Grid confirmado por
componente renderizado, distinto das páginas sintéticas e do frontend publicado.

| Cenário | Brotas | Ipupiara |
| --- | --- | --- |
| Clínica/perfil e consulta | Correta;2 pessoas,1 saúde/1 demais | Correta;2 pessoas,0 saúde/2 demais |
| Busca/filtros | Nome normalizado1; tipo saúde1; limpeza2 | Nome normalizado1; limpeza2 |
| Desktop | Data Grid real1440;2 linhas; altura acompanha conteúdo | Data Grid real1440;2 linhas; altura405px observada |
| Ordenação/seleção visual | Nome Z–A e seleção de2 sem abrir ficha/escrever | Seleção da página filtrada1 sem abrir ficha/escrever |
| Ficha/conta/acesso | Médico atual=seletor; Salvar papel bloqueado; foco/filtro mantidos | Recepção atual=seletor nas clínicas autorizadas; ambos Salvar bloqueados; foco/filtro/seleção mantidos |
| Convite/cache | Cenário pendente não exercitado nesta clínica | Sem conta e convite pendente refletidos separadamente na lista após ficha |
| Editar/Cancelar | Tipo saúde fixo;1 vínculo mantido | Tipo administrativo fixo;2 vínculos mantidos |
| Novo/Cancelar | CPF(opcional), sem preencher/salvar | CPF(opcional), sem preencher/salvar |
| Mobile390/Serviços/retorno | Cards2; documento375/390; Serviços390/390 | Cards2; documento375/390; Serviços390/390 |
| Paginação/recarga | Tamanho25 mantém2; F5 retorna10, seleção0 e clínica correta | F5 mantém clínica, cards e consulta2 |

Em Ipupiara apareceu inicialmente “Não foi possível abrir a clínica / Não foi
possível consultar seu acesso”. “Tentar novamente” recuperou a sessão e a consulta;
recargas posteriores nas duas clínicas funcionaram. Não foi atribuída causa de
banco, Auth ou frontend a esse episódio e nenhuma configuração foi alterada.

Somente2 registros por clínica: múltiplas páginas,36→12, seleção entre páginas,
erros controlados e operações permanecem **simulados**, não comprovados pelos dados
reais. Outros perfis, aparelho físico e total completo do serviço não verificados.
Nenhum cadastro, convite, papel, acesso ou vínculo real foi alterado. Escritas,
entrega de e-mails e aprovação pessoal do usuário não homologadas por esta leitura.

## TypeSafe/Jev e preservação

typesafe-ai consultada/avaliada: regras determinísticas, sem integração com IA,
chamada direta ou leitura/exposição de TYPESAFE_API_KEY. Jev: única triagem sintética
inicial, code_change/confiança0,80; complexidade1,24/confiança0,63 incerta. Codex
assumiu a execução direta com evidência local.924 tokens entrada/119 saída,
1.335,3575ms e US$0,000038808 medidos. Nenhum conteúdo privado foi enviado.

Baseline67 arquivos dirty/untracked anteriores: hashes preservados antes das
atualizações documentais autorizadas; documentos anteriores mantidos como histórico.
Trabalhos de Caixa, Jev, SMTP, ReUI e outros módulos preservados. Checkout de inspeção
usado apenas para revisar o instalador; componentes necessários transferidos;
worktree de inspeção arquivado pelo aplicativo após a transferência.

## Git, publicação e conferência do usuário

Branch mantida `codex/resgate-local-2026-09-26`, HEAD
`eff05f60e07c4042bbb931d1c14d19432612d01d`, mesma referência remota conferida na
preparação. Índice vazio; etapa31 somente mudanças locais não commitadas.
Sem commit de implementação, push, merge, SQL, alteração de banco/Auth/configuração
externa ou deploy. Publicação anterior da etapa30 continua sendo a referência; esta etapa
não foi conferida nem publicada nos domínios. Próxima ação: revisão pessoal local.

Para conferir: abrir Equipe na aplicação local, buscar/combinar tipo e vínculo,
ordenar, mudar10/25/50 e selecionar linhas. Abrir e fechar ficha sem salvar;
confirmar filtro/página/foco. Mais de uma página exige resultado acima do tamanho
escolhido; não criar pessoas reais só para isso. Capturas fictícias mostram esse caso.
