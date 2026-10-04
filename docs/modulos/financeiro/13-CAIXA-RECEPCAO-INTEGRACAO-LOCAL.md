# Caixa da Recepção — integração e publicação controlada

## Sincronização posterior — 2026-10-04 19:13:49 -03:00

Matriz de todas as telas e estado Git/publicação no [relatório15](15-SINCRONIZACAO-E-MATRIZ-CAIXA.md).
O aplicativo continua2a6e88d0; A/B já concluídas estão representadas por fontes e registro
seguro, sem nova aplicação SQL. Arquivos privados/congelados citados historicamente são
locais e ignorados. Sincronização ocorre em branch sem deploy automático.

## Diagnóstico posterior do legado de Brotas — 04/10/2026, 10:04 -03:00

Esta publicação permanece no SHA2a6e88d09c0a8a51cd73649bf45530c2db6a6923.
Pedido posterior autoriza somente diagnóstico/proposta do legado, sem transição.
Leitura atual: Brotas legado aberto, R$150,50, abertura03/08/2026 14:55. Inventário
SQL completo indisponível no canal oficial; contagens históricas não reconfirmadas.
Não há fluxo ativo de transição localizado no código. Proposta administrativa,
conferência humana, desenvolvimento mínimo e recuperação estão no
[relatório14](14-CAIXA-LEGADO-BROTAS-DIAGNOSTICO.md). Nenhuma suíte de publicação repetida,
mudança de runtime/banco/permissões/operação real/commit/push/deploy nesta etapa.

## Publicação concluída — 04/10/2026, 09:32 -03:00 (America/Bahia)

**PUBLICADO em Brotas e Ipupiara:** SHA completo
`2a6e88d09c0a8a51cd73649bf45530c2db6a6923`, commit seletivo40 arquivos, push normal
na branch codex/resgate-local-2026-09-26. Remoto confirmado no mesmo SHA, alinhado0/0.
Versão embarcada0.1.0 com selo Em desenvolvimento, conforme processo vigente;
nenhuma tag/PR de versão ou incremento manual criado. Publicação do aplicativo não
representa lançamento semântico pelo Release Please. Etapas abaixo são históricas.

| Domínio | Build Hostinger completed | Conclusão Bahia | Bundle efetivamente servido |
| --- | --- | --- | --- |
| clinicabrotas.com.br | 01a106e0-c036-7244-824a-7904af18355b | 04/10/2026 09:26:37 | /assets/index-Dz5uHHiv.js |
| clinicaipupiara.com.br | 01a106e0-c0af-726b-84bf-7603fa42905f | 04/10/2026 09:26:40 | /assets/index-RQWYX2d8.js |

Ambos os builds apontam o SHA completo da seleção validada. Consulta HTTP dos domínios
e bundles confirma metadados `commit:2a6e88d0`, versão0.1.0, sem alterações locais,
texto Caixa da recepção e validação nova de parcelas. Os hashes dos bundles são distintos
por configuração/horário de build; não se afirma identidade binária entre os domínios.
Brotas SHA-256d9f325ae802f373200c5eab1a03d4d9a0af234d36c3629bf8b53b74d0e71d939;
Ipupiara506c97aef555b00faf4e04fdc14dad3c0eaa3b417b9b7fde15c7cae763436605.
Nove prévias de e-mail intencionais de cada domínio idênticas por SHA-256 antes/depois.
URL /tests/financeiro/recepcao-integracao.html devolve SPA normal, sem entrada de teste;
bundles sem controles/serviço/host sintéticos. Galerias/capturas/ZIPs não enviados.

Configuração Hostinger existente preservada: Node22, Vite, npm/build/dist, raiz por
domínio e instalação Git existentes. Push iniciou os dois builds automáticos; nenhuma
segunda escrita de start-build, troca de site, variável, assinatura, DNS ou serviço.
Não houve falha concreta atribuível à release nem necessidade de reversão.
Versão anterior0.1.0/cdfdec66 e seus builds/bundles continuam registrados na etapa
de autorização abaixo e nos artefatos locais para eventual retorno só do aplicativo.

### Conferência autenticada efetivamente realizada

Sessões autorizadas de **Recepção** disponíveis nas duas clínicas, pelo navegador
do Codex, somente leitura. Conferidos clínica/perfil, Caixa/Estornos/Fiscal, carregamento
seguido do resultado, histórico, Agenda→Financeiro e recarga completa da rota Financeiro.
Tecla F5 enviada pela ferramenta e recarga explícita confirmada; não se apresenta
isso como teclado físico, zoom nativo ou aparelho físico.

| Clínica | Resultado observado após publicação |
| --- | --- |
| Brotas | Caixa antigo em aberto continua bloqueado, sem ações modernas para converter/encerrar. Histórico lista somente o legado; detalhes reiteram preservação e ausência de reutilização automática. Estornos/Fiscal vazios. Agenda abriu e retorno/recarga conservaram /sistema/brotas/financeiro e clínica Brotas. |
| Ipupiara | Caixa fechado sem sessão ativa; abertura não acionada. Histórico vazio com paginação desabilitada; Estornos vazios. Fiscal informa emissão externa não configurada e filtro Emissão solicitada vazio. Agenda abriu e retorno/recarga conservaram /sistema/ipupiara/financeiro e clínica Ipupiara. |

Logs error/warn consultados nas duas abas retornaram listas vazias. A tentativa inicial
do seletor fiscal pela API DOM não encontrou o controle; foi usado o controle acessível
visível, que mostrou Emissão solicitada e resultado vazio. Foi limitação de seleção da
ferramenta, sem erro financeiro, escrita ou modificação da interface.

Não há sessão moderna disponível nessas clínicas para provar resumo/movimentos reais
deste estado. Não foi aberto caixa para produzir dados. Recebimento, fechamento,
aprovação, suprimento, sangria, estorno ou solicitação fiscal reais não foram executados.
As28 verificações dirigidas da revisão permanecem evidência sintética reaproveitada,
pois runtime/spec idênticos; nenhuma suíte financeira foi repetida nesta publicação.
Verificações novas: TypeScript das duas entradas mais runtime via build, lint/build/
diff-check no checkout isolado do commit; públicos por hash; dois deploys, bundles,
rotas e percurso de leitura autenticado. Não alegar que compilação sem .env local
comprova configuração/persistência remota. As duas sessões e bundles publicados
comprovam somente a leitura exercitada com a configuração existente.

### Preservação, evidências e limites finais

40 arquivos/trechos da release e SHA-256 do conteúdo do commit registrados em
scratch/caixa-publicacao/manifesto-commit.json. Mantido o manifesto histórico da revisão.
25 arquivos documentais não selecionados permaneceram com hashes iguais; alterações
restantes dos três documentos compartilhados preservadas no trabalho local. Outros
arquivos não rastreados, incluindo configuração documental ReUI, preservados.
Sem reset/limpeza destrutiva/force push. Checkout isolado limpo permanece em scratch
para auditoria; sem alterações de fonte nessa cópia, sem acesso a chaves/.env.

Evidências locais (fora do Git/build): versões-anteriores.json, versoes-publicadas.json,
bundles anteriores/novos, manifesto-commit.json e duas capturas PNG em
scratch/caixa-publicacao/. Capturas somente das telas de Caixa, sem dados de pacientes.
Relatório, README, índice e checkpoints atualizados após comprovação e mantidos locais
sem novo commit/push que dispararia deploy exclusivamente documental.

Links: https://clinicabrotas.com.br/sistema/brotas/financeiro e
https://clinicaipupiara.com.br/sistema/ipupiara/financeiro.
Persistência financeira real, RLS além das leituras exercitadas, aparelho físico,
teclado virtual, zoom nativo125%/150%, recibos/reimpressão, conciliação externa e
provedor fiscal permanecem não comprovados/não implementados conforme o contrato.
Nenhum banco/RPC/permissão/transição do legado ou outro sistema alterado.
Próximo: uso autorizado pelo titular; operações legítimas ou evoluções separadas
exigem escopo próprio, sem simular disponibilidade de recibos/integrações externas.

## Commit seletivo validado — 04/10/2026, 09:25 -03:00

Commit2a6e88d09c0a8a51cd73649bf45530c2db6a6923 na branch existente,40 arquivos.
Sem git add indiscriminado: índice recebeu conteúdo explícito dos arquivos/trechos.
Checkpoint raiz, operacional e índice selecionados por conteúdo do Caixa;25 arquivos
de outras tarefas conferidos por hash e preservados. Sem capturas/ZIP/build/segredos.
Diff-check do índice identificou linhas vazias finais em três fontes novas da prévia,
removidas sem mudança funcional; checagens do commit e árvore aprovadas depois.

Checkout isolado limpo do SHA em scratch/caixa-publicacao/release: TypeScript das duas
entradas de teste e runtime via build, lint, validador de notas/versão, build e
git diff/show --check aprovados. Lint mantém apenas aviso conhecido ThemeProvider;
build mantém aviso import Supabase/chunk. Não copiado/acessado .env ou chaves: build
local valida compilação da seleção, não configuração remota. Hostinger conserva seus
valores existentes; prova do runtime real dependerá da consulta pública e autenticada.
19 arquivos públicos existentes copiados idênticos no build, incluindo .htaccess/
nove prévias intencionais de e-mail. Nenhuma galeria/fixture/controle sintético da
entrega no pacote; src sem import dos testes. Sem dependências/banco/RPC/permissões,
configuração/shell/tema fora da entrega. Fonte runtime e spec de integração idênticos
à revisão, então28 verificações dirigidas reaproveitadas sem repetição de suítes.
Push/deploy a seguir; sucesso da compilação não é publicação. Registros posteriores
de verificação ficarão locais, sem redeploy meramente documental desta release.

## Publicação controlada autorizada — 04/10/2026, 09:20 -03:00

Pedido posterior autoriza commit seletivo, push normal e deploy do mesmo commit validado
em clinicabrotas.com.br e clinicaipupiara.com.br. Não autoriza operação financeira,
banco, RPC, permissão ou transição do legado. Substitui o limite histórico de publicação
das etapas abaixo dentro deste recorte.40 hashes do manifesto conferidos iguais e HEAD/
branch remoto ainda emcdfdec66da31b20788939885e396eb16555db328, sem seleção staged prévia.
Arquivos documentais de outras tarefas serão preservados fora da seleção por trechos.
TypeSafe avaliada pela descrição, sem IA/API/chave; sem redesenho/instalação ReUI.
Processo de versão vigente mantém0.1.0 em desenvolvimento; deploy do aplicativo é
separado da PR/tag de release, sem incremento manual ou alteração de manifesto/pacote.

Retorno do aplicativo preparado: ambos os domínios ainda servem a versão anterior0.1.0/
cdfdec66; Hostinger completed Brotas01a10454-7af8-73ac-88c7-953674d89344 e
Ipupiara01a10454-7b4a-7178-b360-924fbcc7ea42. Bundles públicos anteriores respectivos
/assets/index-B109EBNO.js e /assets/index-DxsZyUaq.js arquivados localmente; nove prévias
de e-mail em cada domínio registradas por hash para preservar a publicação intencional.
Reversão eventual restrita ao aplicativo, nunca banco. Validação isolada/commit/push/
confirmação dos dois deploys em preparação; esta entrada não afirma publicação concluída.

Pedido de 04/10/2026 autoriza a integração local da direção visual aprovada e testes
sintéticos. Não autoriza banco, permissões, dados financeiros reais, commit, push ou
publicação. Complementa o diagnóstico e a prévia do [relatório 12](12-CAIXA-RECEPCAO-PREVIA.md).

## Resultado local — 04/10/2026, 08:33 -03:00 (America/Bahia)

Integração viável concluída localmente. Branch `codex/resgate-local-2026-09-26`, HEAD
`cdfdec66da31b20788939885e396eb16555db328`; alterações não commitadas. Código normal
estava limpo na retomada; mudanças documentais e arquivos da prévia já existentes
foram preservados. Nada foi publicado, aplicado ao banco ou executado financeiramente
em sessão real. Aprovação visual e autorização local não ampliam regras financeiras.

Descrição TypeSafe avaliada: implementação determinística, sem necessidade de IA,
API, acesso a chave ou nova dependência. ReUI reaproveita a avaliação de APIs, exemplos,
dependências e licença do relatório 12; sem instalação de Data Grid/Stepper ou troca
de infraestrutura. Permanecem AppShell, Sidebar, cabeçalho, marcas e temas reais,
ModalBase, FeedbackAlert, FinanceIcon e controles já presentes. Impeccable orientou
o acabamento acessível, sem redesenho adicional.

## Blocos integrados e fontes

| Bloco | Fonte/contrato existente | Entrega local e limites |
| --- | --- | --- |
| Clínica, operador, sessão e período | `consultarCaixaAtual` → `sessoes_caixa` e `consultarResumoCaixa` → `financeiro_resumo_caixa`; contexto e papel do App | Situação e abertura reais; sessão atravessando dias; sem número comercial ou quantidade inferida de recebimentos. |
| Dinheiro esperado e bruto | `financeiro.caixa-leitura.ts`, resumo oficial | Indicadores e composição usam `valor_esperado` diretamente. `total_dinheiro`, `total_pix` e `total_cartao_credito` são bruto por forma; `total_recebimentos_brutos` é da sessão. |
| Fundo, suprimento e sangria | `financeiro_abrir_caixa`, `financeiro_registrar_suprimento`, `financeiro_solicitar_sangria`, `financeiro_revisar_sangria`, `financeiro_efetivar_sangria` | Fundo contado aceita zero; clínica/valor explícitos, sem copiar histórico. Suprimento usa valor/motivo. Solicitar/aprovar sangria não efetiva retirada; ações gerenciais preservadas. |
| Recebimento | Agenda, `consultarPrecoConsulta`, vínculo profissional/clínica, `registrarRecebimento` → `financeiro_registrar_recebimento` | Caixa encaminha à Agenda da clínica com orientação explícita. Preço somente leitura; dinheiro/Pix/crédito; integral, revisão, idempotência e revalidação oficiais. |
| Movimentações | `movimentos_caixa`, `recebimentos`, `recebimentos_pagamentos`, `estornos`, `estornos_pagamentos`, nomes autorizados e sessões originais | Nova camada local SELECT paginada, sem migration/RPC/permissão nova; uma linha por movimento e detalhes. Não utiliza lista de elegíveis a estorno como extrato. |
| Histórico | `sessoes_caixa` sob RLS existente | Nova leitura por clínica com paginação e detalhes; legado preservado, sem conversão ou reaproveitamento de fundo. |
| Conferência/aprovação | `financeiro_iniciar_fechamento`, `financeiro_enviar_fechamento`, `financeiro_revisar_fechamento`; `fechamentos_caixa`, `revisoes_fechamento_caixa` | Abrir painel só apresenta; início exige ação explícita. Estado persistido recuperado após fechar/recarregar. Contagem zero, divergência justificada e decisão gerencial preservadas; histórico das tentativas paginado. |
| Estorno | Tela/wrappers existentes: `financeiro_solicitar_estorno`, `financeiro_revisar_estorno` | Recepção solicita, proprietária decide; aprovação efetiva pela RPC. Reservas, saldo elegível, motivo e original preservados. Estorno de outra sessão identificado no extrato atual. |
| Fiscal | `financeiro.fiscal-leitura.ts`, `financeiro_solicitar_emissao_fiscal`, `financeiro_solicitar_cancelamento_fiscal` | Filtros/paginação/ações existentes preservados; solicitação pendente azul, sem sugerir documento emitido. Provedor externo não implementado. |
| Cobranças/recibos/conciliação externa | Contrato operacional não comprovado | Nenhuma fila agregada, dívida inferida, recibo/reimpressão ou comprovação externa inventados. Propostas da prévia permanecem identificadas apenas ali. |

A composição explicita `valor_abertura + total_dinheiro + total_suprimentos −
total_sangrias − total_estornos_dinheiro`, mas seu resultado exibido vem do serviço,
sem recomputação no cliente. Teste de outra sessão: fundo150 + dinheiro370 − sangria100
− estorno50 = esperado370; bruto900 permanece900. Pix330/crédito200 não são dinheiro
físico nem conciliação externa. Valores e validações monetárias usam centavos (`bigint`).

Fontes de autorização observadas no código: migrations FASES 1/2/3/4/5 e
`20260922181438_financeiro_fase10c_resumo_caixa.sql`, mais contratos do documento 11.
SELECT de movimentos/sessões/fechamentos é restrito ao vínculo e papel existentes;
componentes herdam acesso do registro original. Isso é inspeção local das políticas,
não nova homologação de toda a RLS remota. Nenhuma chave ou credencial foi registrada.

## Leitura paginada, apresentação e proteção de contexto

Movimentos: escopo explícito `clinica_id,sessao_caixa_id`, ordem decrescente
`registrado_em,id`, cursor exclusivo e 20+1 registros (20 exibidos; o extra indica
continuação). Histórico usa `aberto_em,id`; tentativas usam número único da tentativa
por sessão. Componentes de recebimento/estorno são consultados separadamente, sem
multiplicar linhas. Extrato exibe apenas formas efetivamente estornadas no movimento
de devolução, preservando o original. Totais vêm exclusivamente do resumo oficial.
Filtro de tipo consulta toda a sessão; busca textual informa que alcança a página atual.
Contagem é de movimentos carregados, não de recebimentos totais. Ajuste sem direção
classificada aparece neutro, com limite explícito; não se presume seu efeito financeiro.

Pendência de sangria é consultada separadamente das últimas50 solicitações, evitando
liberar fechamento por truncamento da lista. Falha de extrato/histórico não altera
saldo oficial para zero. Carregamento, erro, recusa, sessão ausente, caixa vazio e legado
possuem estados distintos. A camada falha quando vínculos necessários não estão
disponíveis, em vez de alegar composição completa.

Recepção mantém três abas; proprietária conserva seis áreas, indicadores gerenciais,
aprovação/rejeição e efetivação de sangria; médico conserva as duas áreas próprias.
No celular, composição/formas ficam recolhidas perto dos indicadores; desktop mantém
lateral. Detalhes têm nomes acessíveis. Modal compartilhado preservado: rolagem interna,
fundo inerte, foco inicial, contenção e retorno de foco, Escape e erros associados.

Recebimento mostra só formas escolhidas, adição/remoção sem repetição, total/restante.
Dinheiro entregue/troco são temporários e não entram nos parâmetros da RPC. Exemplo
220 = dinheiro100 + Pix120, entregue150/troco50, registro220. Confirmação somente após
RPC e verificação de contexto; duplo envio travado. Resposta incerta conserva a chave
para repetição manual da mesma solicitação. Troca de clínica desmonta formulários e
descarta callbacks tardios; fechamento iniciado não é desfeito ao fechar o painel.

## Verificações efetivamente realizadas

| Evidência | Resultado e alcance |
| --- | --- |
| Suíte inicial de integração/regressão | 77 aprovados/1 skip em desktop e celular: Caixa, recebimento, abas e integração. Um timeout inicial de carregamento na partida fria passou na execução completa; não foi atribuído a causa financeira. |
| Rodada final dirigida da integração | 39 aprovados/1 skip após últimos ajustes: valores oficiais, split/troco, duplicidade, resposta incerta, troca de clínica, cursores/ordenação empatada, estados/continuidade, sangria, suprimento, restrição, legado e perfis. Skip desktop do roteiro de larguras é intencional; roteiro360/390/430 executado no projeto móvel. Execuções se sobrepõem à suíte anterior, não são casos distintos somados. |
| Ajuste de fixture vazia | 2 aprovados: carregamento, sessão operacional vazia e recusa; fixture sem sangria incompatível com saldo zero. |
| Prévia após componente visual compartilhado | 6 aprovados: composição/paginação e split/troco/impressão sintética, em desktop/tablet/celular. Não repetidas as45 execuções históricas sem motivo. |
| Unitários financeiros | 15 aprovados (`npm run test:financeiro`). |
| TypeScript | Runtime, entrada da prévia e entrada dos testes da integração aprovados. Build inicial apontou acesso indevido a `erro.codigo`; corrigido usando mapeador existente e build final aprovado. |
| Lint | Sem erros; um aviso preexistente de Fast Refresh em `src/theme/ThemeProvider.tsx`. Nenhum aviso novo nos componentes entregues. |
| Build | Aprovado; avisos de chunks grandes, import estático/dinâmico de Supabase e tempo de plugins. Sem migração de infraestrutura para suprimir avisos. |
| Isolamento do pacote | Busca no `dist` não encontrou entradas/fixtures/host sintético/galeria desta entrega; `src` não importa `tests`. Artefatos públicos anteriores intencionais preservados. |
| Git | `git diff --check` aprovado; branch/HEAD preservados. Sem diff em migrations, dependências, layout compartilhado ou tema. Avisos de conversão LF/CRLF não são erro de conteúdo. |
| Capturas/arquivos | 11 PNGs sintéticos revisados; ZIP com11 entradas, 1.288.231 bytes. Galeria e prévia responderam HTTP200. Pacote das41 JPGs anteriores preservado. |

Leitura conectada local com sessão autorizada de **Recepção**: Ipupiara mostrou
ausência de sessão e histórico vazio; Estornos sem recebimentos disponíveis, Fiscal
sem documentos no filtro “Emissão solicitada”. Brotas mostrou caixa legado e histórico
com detalhes do legado, sem conversão. Navegação, filtro, troca de clínica e recarga
realizados apenas por leitura. Nenhuma operação financeira ou solicitação foi enviada.
Não se armazenaram nomes/dados de pacientes nas capturas ou memória.
Recarga final retornou à clínica Ipupiara e ao estado sem sessão; leitura dos logs de
erro do navegador local não apresentou entradas. As11 imagens da galeria carregaram.

Essa leitura confirma as consultas exercitadas, não recebimento/fechamento persistido,
movimentos de sessão moderna com dados reais, todas as policies ou outro perfil real.
Testes de proprietária/médico e operações são HTTP sintético com destinos externos
bloqueados; mocks não comprovam persistência ou autorização no servidor. Teclado virtual
de aparelho físico, impressora e zoom nativo125%/150% não verificados pelas ferramentas;
emulação de largura e teclado automatizado não substituem essas verificações.

## Arquivos desta entrega

Runtime alterado: `src/App.tsx`, `src/pages/Agenda.tsx` (proteção imediata do formulário
ao trocar clínica), `FinanceiroCaixa.tsx`, `FinanceiroModulo.tsx`, `FinanceiroFiscal.tsx`,
`src/components/financeiro/ReceberPagamento.tsx`, `src/lib/financeiro/financeiro.caixa-leitura.ts`
e `src/config/notasEvolucao.json` (nota do comportamento local).

Runtime criado: `src/components/financeiro/CaixaRecepcaoVisual.tsx`, `caixa-recepcao.css`,
`ExtratoCaixa.tsx`, `HistoricoCaixa.tsx`, `TentativasFechamento.tsx` e
`src/lib/financeiro/financeiro.movimentos-leitura.ts`.

Testes/artefatos: entradas `tests/financeiro/recepcao-integracao.{html,tsx,spec.ts,tsconfig.json}`,
`recepcao-integracao.playwright.config.ts`, `recepcao-integracao-capturas.html`;
ajustes em `caixa.spec.ts`, `recebimento.spec.ts`, `recepcao-preview.tsx` e
`recepcao-preview.spec.ts`. A prévia injeta resumo fictício nos mesmos componentes visuais;
suas operações/propostas continuam separadas. Harness de integração usa componentes
reais com HTTP interceptado pelos testes; aberto sozinho, não constitui serviço financeiro
nem uma nova prévia operacional. Não é importado pelo runtime.

Documentação: este relatório, complemento histórico no12, README/mestre/checkpoint
Financeiro, checkpoint operacional/raiz e índice. Demais arquivos sujos de Agenda,
Equipe, Pacientes, Sistema, Login e instruções são trabalhos anteriores preservados.

## Acesso local e capturas

- [Aplicação normal — Ipupiara](http://127.0.0.1:3000/sistema/ipupiara/financeiro).
- [Aplicação normal — Brotas](http://127.0.0.1:3000/sistema/brotas/financeiro).
- [Prévia isolada sintética](http://127.0.0.1:4186/tests/financeiro/recepcao-preview.html).
- [Galeria das11 capturas da integração](http://127.0.0.1:4187/tests/financeiro/recepcao-integracao-capturas.html).
- Arquivos: `scratch/caixa-integracao/`, `scratch/Caixa_Recepcao_Integracao_Capturas_PNG.zip`.
- [Galeria histórica das41 capturas](http://127.0.0.1:4186/tests/financeiro/recepcao-capturas.html).

Conferência final do pacote histórico:41 JPGs continuam em
`scratch/caixa-recepcao-jpg-2026-10-04/`; o ZIP anterior foi localizado na pasta
Downloads do usuário, com7.371.458 bytes. O caminho scratch registrado no relatório12
é histórico e não contém mais esse ZIP nesta conferência; nenhum arquivo foi movido
ou removido nesta integração.

Servidores são locais e podem precisar ser retomados. Aplicação: `npm.cmd run dev`.
Prévia: comando do relatório12. Galeria/testes integração:
`npm.cmd run dev -- --config tests/financeiro/vite.config.ts --host 127.0.0.1 --port 4187 --strictPort`.
Testes: `node node_modules/@playwright/test/cli.js test --config tests/financeiro/recepcao-integracao.playwright.config.ts`.

## Dependências e próxima ação

O recorte antes proposto como primeira integração está entregue localmente: resumo,
operação existente, Agenda, extrato e histórico sob estruturas existentes. Próximo:
usuário revisar no ambiente local; publicação depende de autorização posterior.
Validação com operações legítimas, dispositivos físicos e outros perfis conectados
fica fora desta execução. Nenhum commit, push, deploy, banco ou permissão alterados.

Evoluções que exigem definição/contrato próprio: cobranças agregadas/dívidas, débito,
emissão/reimpressão de recibo, provedor/documento fiscal externo, conciliação externa,
contagem cega (não encontrada no contrato aplicado), direção de ajustes não classificada
e transição acompanhada do legado. Nenhuma dessas pendências bloqueia os blocos locais
entregues; aprovação do visual não aprova essas novas regras.

## Revisão para publicação — 04/10/2026, 09:02 -03:00

**Parecer: pronta para publicação controlada do recorte implementado, após autorização
posterior. Não publicada nesta etapa.** Nenhuma mudança de banco, RPC, permissão,
dependência ou configuração nova é necessária para esta entrega. Permanecem as
configurações oficiais já usadas pelo aplicativo e os vínculos/autorização existentes.
O caixa legado de Brotas continua bloqueado para novas operações, conforme comportamento
anterior; publicar a apresentação não executa sua transição nem autoriza dados reais.

Visual aprovado preservado: sem alteração de composição, cores, Sidebar, cabeçalho,
demais perfis ou ModalBase. A descrição TypeSafe foi novamente avaliada: regras de
leitura/cálculo/estado determinísticas, sem necessidade de IA/API/chave. Avaliação ReUI
anterior reaproveitada, sem instalação ou consulta adicional desnecessária.

### Defeito confirmado e correção mínima

Ao retornar um recebimento existente com `recebimentos_pagamentos: []`, a camada
de leitura permitia uma linha com forma em branco. Teste refinado isolou a ausência
das parcelas sem remover outros recebimentos e reproduziu a falha. Corrigido apenas
`financeiro.movimentos-leitura.ts`: composição de recebimento/estorno precisa estar
disponível, ter formas suportadas e únicas, valores positivos e soma em centavos igual
ao valor do movimento. Falha exibe “Movimentações indisponíveis”; resumo oficial
continua visível e inalterado. A checagem não recalcula saldo nem altera regras/RPCs.
Nota da entrega não lançada em `notasEvolucao.json` complementada com esse comportamento.

Nenhum corte real encontrado no recebimento. Modal possui `overflow-y-auto` e limite
de altura do viewport; Tab alcança Revisar/Confirmar sem sobreposição. Testes com
nomes sintéticos extensos e seleção de três formas (para gerar mensagens de validação)
conferiram desktop1440×1000 e celular360/390/430×844. Foram alcançados total distribuído,
restante, excedente, erros associados, fechamento por Escape e confirmação pelo teclado.
Foco retorna ao agendamento da Agenda, conforme implementação existente; o botão de
recebimento pertence ao menu transitório, já fechado, e não é o alvo de retorno.
Capturas novas mostram o painel rolado e a etapa de confirmação, em vez de inferir
problema a partir da captura inicial. Modal compartilhado e consumidores preservados.

Split comprovado: dinheiro100 + Pix120 = registro220; entregue150, troco50, sem
parâmetro de troco/entregue enviado. Incompleto210/restante10, excedente230/excesso10
e entregue99 para parcela100 bloqueiam revisão. Campos inválidos continuam associados
à ajuda/erro. Resposta incerta não dispara retry automático; repetição manual usa
chave/payload idênticos e representa uma efetivação no mock, sem alegar persistência real.

Fechamento: painel inicial não persiste por abrir; após início explícito, cancelar
a contagem não volta a “Aberto”. Continua conferência após cancelar/Escape e recarregar,
sem reutilizar rascunho não enviado; envio permanece aguardando aprovação. Não há RPC
de reversão acionada por Cancelar/Fechar.

### Leitura, paginação e proteção de contexto

Revisão seletiva confirmou escopo explícito clínica/sessão, desempate por id, cursor
exclusivo e busca limitada à página com rótulo correspondente. Totais continuam no
resumo oficial. Recebimento dividido é uma linha pelo valor integral, não por parcela;
estorno usa componentes da devolução e vínculo original, inclusive de outra sessão.
Reaproveitada a evidência anterior de esperado370/bruto900 com estorno50 de outra sessão.

Novos testes: movimentos24 =20+4, todos os18 suprimentos identificados por motivos
nos detalhes sem omissão/duplicação e retorno à primeira página; histórico45 =20+20+5
com datas empatadas, ordem/cursor completos e retorno; tentativas23 =20+3, revisões
vinculadas às tentativas consultadas. Histórico acima de uma página era lacuna anterior,
agora coberta. Sessão substituída reinicia extrato; respostas atrasadas são descartadas
ao mudar filtro, clínica ou sessão. Testes controlam a liberação da resposta antiga
depois que a nova seleção carregou, sem depender apenas de uma captura.

### Execuções novas e evidências reaproveitadas

| Execução nesta revisão | Resultado |
| --- | --- |
| Sondas iniciais | 3 execuções:2 aprovadas e1 falha esperada que confirmou parcelas vazias. Primeiro teste foi refinado para excluir outros recebimentos ausentes; a sonda de troca de sessão passou sem exigir correção. |
| Rodada dirigida | 28 execuções:24 aprovadas,4 falhas em assertions dos testes (alvo de retorno de foco e espaço não separável no formato de moeda); nenhum desses4 resultados exigiu mudança de UI. |
| Reexecução somente dos2 casos ajustados | 4 execuções aprovadas (desktop/celular); roteiro de recebimento móvel percorre360/390/430. |
| Cobertura final | 28 verificações dirigidas aprovadas entre rodada válida e reexecução, sem falha pendente/skip. Total efetivamente executado nesta revisão:35, sendo30 aprovações e5 falhas nas rodadas iniciais; não são35 casos distintos. |
| TypeScript | Entrada de integração com tipos dos testes e runtime aprovados; build executa `tsc -b`. |
| Lint | Sem erros; aviso preexistente de Fast Refresh em ThemeProvider. |
| Build | Aprovado depois da correção e novamente após nota de evolução. Validador de notas/versão aprovado; versão local continua0.1.0 em desenvolvimento. Avisos de chunks/imports/plugins conhecidos, sem problema novo funcional. |
| Git/pacote | `git diff --check` aprovado; nenhuma entrada, fixture, galeria, captura ou controle sintético desta entrega em `dist`; nenhum import de tests em src.19 artefatos públicos anteriores preservados com hashes iguais, incluindo prévias de e-mail intencionais. |

Comando dirigido:
`node node_modules/@playwright/test/cli.js test --config tests/financeiro/recepcao-integracao.playwright.config.ts recepcao-integracao.spec.ts --grep "revisão:|resposta incerta conserva|painel não inicia fechamento"`.
Reexecução limitada ao recebimento longo e extrato após correção das assertions.
Checks: TypeScript específico, `npm.cmd run lint`, `npm.cmd run build`, `git diff --check`.
As suítes históricas completas77/39/45 e unitários15 não foram repetidos sem motivo.

Leitura conectada anterior de Recepção em Ipupiara/Brotas e estados de erro/carregamento/
vazio/legado/restrição dos testes anteriores foram reaproveitados: apresentação desses
estados e serviços oficiais permanecem iguais. Não houve nova consulta conectada ou
operação real nesta revisão. A aplicação normal chama os wrappers reais; sucesso depende
da confirmação da RPC. Controles artificiais e serviços em memória estão em tests,
fora do runtime e do build. Recibo/reimpressão ou integração externa não são oferecidos
como implementados. As alterações não comprovam persistência real nem toda a RLS remota.

Capturas sintéticas novas:8 PNGs em `scratch/caixa-revisao/`, pares
`recebimento-{1440,360,390,430}-{rodape,confirmacao}.png`; três inspecionados diretamente
(rodapé desktop/360 e confirmação390), demais gerados pelo mesmo roteiro verificado.
Sem fotografia de paciente ou dado real. Teclado virtual, aparelho físico e zoom
nativo125%/150% continuam **não verificados**; teclado em teste não equivale ao físico.

### Manifesto seletivo da integração acumulada

O manifesto cobre a entrega revisada, incluindo arquivos novos ainda não rastreados.
Não autoriza `git add .`, commit ou publicação. Documentos compartilhados já têm
contribuições anteriores; futura seleção deve respeitar os trechos desta entrega,
sem incluir mudanças de Equipe/Pacientes/Sistema/Login/Agenda documental por arrasto.
O estado local não é identificado somente pelo HEAD, porque há arquivos não commitados.
Lista e SHA-256 de conteúdo atual em `scratch/caixa-revisao/manifesto-entrega.json`.

**Runtime (14 arquivos):**

```text
src/App.tsx
src/pages/Agenda.tsx
src/pages/FinanceiroCaixa.tsx
src/pages/FinanceiroModulo.tsx
src/pages/FinanceiroFiscal.tsx
src/components/financeiro/ReceberPagamento.tsx
src/components/financeiro/CaixaRecepcaoVisual.tsx
src/components/financeiro/caixa-recepcao.css
src/components/financeiro/ExtratoCaixa.tsx
src/components/financeiro/HistoricoCaixa.tsx
src/components/financeiro/TentativasFechamento.tsx
src/lib/financeiro/financeiro.caixa-leitura.ts
src/lib/financeiro/financeiro.movimentos-leitura.ts
src/config/notasEvolucao.json
```

**Testes da integração e galeria (8):**

```text
tests/financeiro/caixa.spec.ts
tests/financeiro/recebimento.spec.ts
tests/financeiro/recepcao-integracao.html
tests/financeiro/recepcao-integracao.tsx
tests/financeiro/recepcao-integracao.spec.ts
tests/financeiro/recepcao-integracao.playwright.config.ts
tests/financeiro/recepcao-integracao.tsconfig.json
tests/financeiro/recepcao-integracao-capturas.html
```

**Prévia isolada preservada (10, fora do build):**

```text
tests/financeiro/recepcao-modelo.ts
tests/financeiro/recepcao-preview.tsx
tests/financeiro/recepcao-preview.css
tests/financeiro/recepcao-preview.html
tests/financeiro/recepcao-preview.vite.config.ts
tests/financeiro/recepcao-preview.playwright.config.ts
tests/financeiro/recepcao-preview.spec.ts
tests/financeiro/recepcao-preview.tsconfig.json
tests/financeiro/recepcao-preview.capturas.mjs
tests/financeiro/recepcao-capturas.html
```

**Documentação pertinente (8, seleção por trechos nos arquivos compartilhados):**

```text
docs/modulos/financeiro/00-README-FINANCEIRO.md
docs/modulos/financeiro/01-DOCUMENTO-FUNCIONAL-MESTRE.md
docs/modulos/financeiro/08-CHECKPOINT.md
docs/modulos/financeiro/12-CAIXA-RECEPCAO-PREVIA.md
docs/modulos/financeiro/13-CAIXA-RECEPCAO-INTEGRACAO-LOCAL.md
docs/ia/CHECKPOINT.md
docs/ia/INDICE.md
CHECKPOINT.md
```

Nesta revisão foram alterados somente reader, notas e spec de integração, mais
relatório13, README e checkpoints pertinentes. Não se alterou mestre funcional ou12:
nenhuma decisão/regra nova. Arquivos sujos das outras tarefas e instruções preservados.
Capturas/manifesto/build gerados são artefatos locais, não fontes a incluir em produção.

### Condições para a publicação futura

Nenhum bloqueio técnico novo permanece no recorte revisado. Próximo passo é aprovação
humana da publicação e seleção dos arquivos/trechos do manifesto, com conferência do
checkout efetivamente selecionado antes de publicar. A versão/notas devem seguir o
processo de release vigente; build local não identifica uma release publicada.
Não há alteração de variáveis de ambiente, banco ou permissões a aplicar junto.
Conferência operacional futura deve usar somente operações legítimas autorizadas.
Recibos, provedor fiscal, conciliação externa, contagem cega, dívida agregada e transição
de legado continuam evoluções separadas, não motivos para afirmar que foram entregues.
Sem commit, push, deploy, operações financeiras reais ou banco/permissões nesta revisão.
