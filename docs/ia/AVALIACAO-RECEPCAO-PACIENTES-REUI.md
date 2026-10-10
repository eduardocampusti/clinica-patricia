# Avaliação de evolução — Recepção e Pacientes com referências ReUI

Estado atual: PUBLICAÇÃO AUTORIZADA das cinco melhorias e acabamento móvel; preparação conferida, implantação ainda em execução.
Data: 03/10/2026, avaliação entre 19:18 e 19:35 -03:00 (America/Bahia).
Escopo da avaliação original: leitura de documentação/código, aplicação normal, catálogo remoto e documentação.
Na avaliação original nenhuma tela foi alterada. A implementação posterior está registrada a seguir.

## Publicação autorizada — 03/10/2026, 21:24 -03:00

Pedido posterior autoriza commit seletivo, push normal e publicação nos dois domínios pelo
fluxo existente Hostinger. Não autoriza banco, dados reais, permissões, migração ou nova função.
Branch confirmada por fetch:codex/resgate-local-2026-09-26, HEAD8e68e303; alinhamento0/0,
nenhum commit anterior pendente que entraria junto. Integrações automáticas ativas em ambos,
repositório eduardocampusti/clinica-patricia, Node22/Vite/npm/build/dist e mesma instalação GitHub.

| Destino | Versão anterior comprovada no bundle | Build anterior para reversão |
| --- | --- | --- |
| clinicabrotas.com.br |0.1.0 /8e68e303 |01a103b8-c33a-70bf-8944-9b19243edb5b, completed |
| clinicaipupiara.com.br |0.1.0 /8e68e303 |01a103b8-c3ac-73a2-ae3c-9b2e0d171506, completed |

Em caso de regressão, restauração pela implantação anterior de cada domínio ou commit novo
que reverta somente esta entrega e novo deploy; sem reset/force push ou alterações de banco.
SHA anterior completo:8e68e303bef5c92fa197a840250f1551856465b1.
Nove prévias sintéticas de e-mail por domínio continuam servidas: conteúdo anterior registrado
por SHA256 em evidência privada ignorada pelo Git, para comparação pós-deploy. Não removê-las
por causa de orientações históricas genéricas de exclusão; o pedido atual determina preservação.

Runtime e testes não tiveram mudanças posteriores às verificações da etapa anterior:
última escrita em código/notas21:01:42, build21:04:45, testes direcionados até21:08:15.
Reutilizadas evidências12 cenários direcionados, TypeScript/build/lint e testes anteriores das
cinco melhorias;8 cenários adicionais de AppShell/navegação/Sobre passaram nesta entrega,
com três perfis, desktop/mobile e serviços sintéticos. Pacientes reais/fotos não gravados.
O pacote exato do commit será compilado/conferido antes do push, separado dos documentos de
outras tarefas. Publicar somente dist; fixtures/testes/server/segredos/capturas ficam fora.
Versionamento sem release/tag nova: permanece0.1.0, identidade efetiva pelo commit implantado.
TypeSafe consultada sem integração/API; ReUI não consultado novamente, sem dúvida de referência.

## Acabamento móvel autorizado — 03/10/2026, 21:05 -03:00

Escopo: refinamento das telas reais existentes, sem refazê-las. Branch
codex/resgate-local-2026-09-26, HEAD8e68e303; alterações não commitadas. Trabalhos anteriores
e contribuições simultâneas de Equipe/Ipupiara preservados. Nenhuma instalação ou escrita real.

| Ajuste | Implementado | Verificação efetiva |
| --- | --- | --- |
| Concordância do aviso | Singular “1 agendamento com horário passado ainda previsto”; plural “N agendamentos com horário passado ainda previstos” | Singular observado na aplicação normal;1 e2 previstos passados verificados em testes sintéticos, preservando o cálculo original |
| Etapas | Adulto:1. Identificação e2. Endereço e contatos; Convênios em nota secundária fora da navegação | Criação/edição normais e testes isolados. Menor conserva responsável legal como etapa2 e endereço como3 |
| Espaço antes do nome | Margens/padding móveis reduzidos; prévia vazia oculta até620px e exibida quando há nome, idade válida ou sexo informado | Normal: Nome no topo do campo em~448px em360px,~429px em390/430px; CPF opcional e proteção por clínica continuam visíveis. Desktop mantém a prévia |
| Foto e valores | Editor existente mantido, sem desmontar formulário; ações preservadas | Normal: expansor por Enter, criação/edição abertas/fechadas sem salvar. Sintético: seleção/confirmação, ações de trocar/remover presentes e nome preservado ao abrir/recolher |
| Abas estreitas | Setas de44px fora das abas, texto “Deslize as abas ou use as setas.”, rolagem contida e aba ativa visível ao selecionar/redimensionar | Toque simulado, Home/End/setas e filtros em testes; teclado/remoção por Enter e seleção em360/390/430px normais. Desktop sem transbordamento |

### Referência ReUI necessária nesta etapa

Chamada real genérica `get_component({name:["tabs"],maxChars:4500})` ao MCP oficial:
`found:true`, `free:true`, `kind:"shadcn"`,9 exemplos gratuitos. Referência pública:
[Tabs](https://reui.io/components/tabs?ref=mcp). É referência de composição, não API própria
do ReUI; preservado nosso AbasPainelRecepcao e sua semântica. Orientação da skill ReUI já
consultada nesta conversa (versão e7aac3424a). Sem instalador, dependência ou recurso pago.
Skill typesafe-ai consultada; tarefa determinística de texto/layout/navegação não precisa
de decisões estruturadas com IA. Nenhuma chamada TypeSafe ou leitura/exposição de chave.

### Ambiente e verificações

- Normal: processo17240/porta3000 identificado anteriormente no diretório deste projeto,
  continua ativo; código atualizado carregado por HMR, comprovado pelo aviso e pelas etapas novas.
  Sessão legítima Recepção/Brotas ficou disponível; não solicitada nem manipulada credencial.
- Aplicação normal: Dashboard e criação em360,390,430px; edição nas mesmas larguras;
  desktop1440px para Dashboard/cadastro e cabeçalho. Navegação de foto e filtros sem salvar.
- Um transbordamento de~2px no cabeçalho em360px foi identificado: um espaçador flex separado
  consumia um gap desnecessário. AppShell agora distribui o espaço no próprio título truncado.
  Sidebar, seletor de clínica, tema e identidade preservados. Medida final da página <=clientWidth
  no Dashboard e Pacientes, inclusive360px; impacto compartilhado conferido nessas telas.
-12 cenários direcionados aprovados:2 singular/plural,4 abas/filtros,4 cadastro/foto e2 edição
  entre etapas com endereço estruturado em desktop
  e mobile. Testes percorrem360/390/430 e1440px com componentes reais, serviços sintéticos e sem
  gravação externa. Um seletor do teste de retorno à Identificação precisou aceitar o subtítulo
  visível no desktop; corrigido e cenários pertinentes repetidos com sucesso.
- `npm run build` (inclui TypeScript), `npm run lint` e `git diff --check` aprovados. Avisos
  anteriores de fast refresh/ThemeProvider, importação Supabase e tamanho de bundles permanecem.
- Console normal sem erros nas interações conferidas; avisos anteriores de múltiplas instâncias
  GoTrueClient ao abrir foto permanecem. Não alterada autenticação nesta tarefa.

### Arquivos desta etapa

`PainelRecepcao.tsx`, `PainelRecepcaoUI.tsx`, `painelRecepcao.css`,
`FormularioPacienteCompartilhado.tsx`, `PreviaIdentificacaoPaciente.tsx`, `Pacientes.tsx`,
`pacientes-cadastro.css`, `AppShell.tsx`, `notasEvolucao.json` e testes direcionados de Recepção,
redesenho/edição de Pacientes. Relatório, checkpoints operacional/raiz/módulos, READMEs e
decisões específicas nos documentos funcionais atualizados em conjunto.

Capturas privadas locais de cadastro vazio e Dashboard sem resultados foram revisadas;
nenhum nome/CPF/prontuário aparece nas capturas entregues. Dados sintéticos usados só no servidor
isolado; consultas ReUI públicas/genéricas. Sem banco, permissões, regra de negócio, commit,
push ou deploy. Permanecem fora da comprovação desta etapa: câmera/toque em aparelho físico,
outra clínica conectada e persistência real de foto/cadastro. Nada disso foi declarado validado.

Fechamento das evidências:03/10/2026,21:09 -03:00. Capturas de entrega:dashboard-390.jpg,
cadastro-360.jpg,cadastro-390.jpg,cadastro-430.jpg; todas da aplicação normal.

Conferência pessoal: [Dashboard normal](http://127.0.0.1:3000/sistema/brotas/dashboard) — use
setas/teclado, selecione a última aba e remova um filtro; [Pacientes normal](http://127.0.0.1:3000/sistema/brotas/pacientes)
— abra Novo paciente, veja etapas e Foto, depois feche sem salvar. Em360/390/430px,
o nome aparece cedo e a prévia vazia permanece oculta; no computador a prévia continua disponível.

## Implementação autorizada das cinco melhorias — 03/10/2026, 20:36 -03:00

Autorização explícita do titular: implementar A–E na aplicação local normal, sem commit,
push, publicação, banco, dependências ou alterações de regras. HEAD8e68e303bef5c92fa197a840250f1551856465b1,
branch codex/resgate-local-2026-09-26; mudanças desta etapa permanecem não commitadas.
Preservadas as contribuições documentais simultâneas de Equipe/Ipupiara, inclusive20:17.

| Melhoria | Implementação | Evidência final |
| --- | --- | --- |
| A. Indicadores | Números tabulares, ícones circulares, bordas, espaçamento e sombras moderadas com tokens existentes; estados desconhecidos preservados | Verificada na aplicação normal Recepção/Brotas, desktop e390x844; fontes e contagens existentes mantidas |
| B. Seleção de abas | Texto no acento legível da clínica, fundo suave do contador, borda inferior e peso700; avisos mantêm semântica | Teclado/seleção e claro/escuro na aplicação normal; contraste do texto >=4,5 e foco nas duas clínicas/temas em testes sintéticos |
| C. Estados vazios | Limpar consulta, Ver previstos e fluxos existentes de cadastro/agendamento somente nas causas pertinentes | Ver previstos e limpeza na aplicação normal; carregamento, falha, permissão, resposta incompleta e dia vazio separados em testes isolados |
| D. Filtros removíveis | Busca, situação/profissional e cada limite de cadastro/idade/nascimento removidos separadamente; foco recuperado | Normal: remoção por Enter preserva outros critérios e busca; testes também preservam ordem, CPF exato e isolamento |
| E. Foto móvel | Foto opcional recolhida até620px, expansor acessível; editor permanece montado e prévia da identificação visível | Criação/edição normais abertas e fechadas sem salvar; desktop preservado. Seleção, confirmação, troca, salvamento, remoção e recarga verificados apenas em serviços sintéticos |

### ReUI realmente consultado

Servidor oficial remoto, OAuth,19 ferramentas; chamadas públicas genéricas bem-sucedidas nesta retomada:

- `get_agent_skill({})`: orientação oficial, versão e7aac3424a.
- `get_component({name:["badge","alert","filters"],maxChars:4000})`: APIs gratuitas; retorno de Filters limitado pelo tamanho solicitado, sem instalar sua implementação.
- `get_example({name:"c-empty-2"})`: referência gratuita de vazio com ação.

Referências: [Badge](https://reui.io/docs/components/base/badge?ref=mcp),
[Alert](https://reui.io/docs/components/base/alert?ref=mcp),
[Filters](https://reui.io/docs/components/base/filters?ref=mcp),
[prévia Empty](https://reui.io/preview/base/components/c-empty-2?ref=mcp).
As ideias de hierarquia, seleção, etiquetas e ações foram adaptadas aos componentes reais.
Não houve cópia/instalação do Data Grid, Filters/Stepper ou bloco pago, nem instalador remoto.
typesafe-ai integralmente consultada a pedido; tarefa determinística, sem integração ou API.
Impeccable aplicada ao acabamento preservando identidade/tokens do produto. Nenhuma chave foi lida.
Nenhum conteúdo do projeto, credencial ou dado de paciente foi enviado ao ReUI.

### Servidor normal e identificação antiga

Porta3000 inicialmente atendida pelo Vite PID21484, iniciado17:21:14. CommandLine
e módulo transformado com caminho físico `D:/PROJETOS SAAS/CLINICA PATRICIA/src/components/dashboard/PainelRecepcao.tsx`
confirmaram o projeto. Vite calcula a identificação na inicialização: o código podia receber
atualização imediata, enquanto o commit exibido permanecia antigo. Não era outra pasta.
Stop-Process falhou no PowerShell; nenhuma interrupção alheia. Após nova checagem do PID,
somente esse Vite foi encerrado e iniciado oculto, na pasta autorizada, com os mesmos argumentos.
Novo PID17240, iniciado20:16:52; aplicação disponível em `http://127.0.0.1:3000`.
Sobre normal conferido:0.1.0, Desenvolvimento local, commit8e68e303, alterações locais Sim,
compilado03/10/2026 20:16:54. Isso identifica o servidor em desenvolvimento, não uma publicação.

### Verificações e limites

- `tsc -b` aprovado; `npm run build` aprovado, incluindo nova conferência TypeScript/notas.
- `npm run lint` aprovado com aviso preexistente ThemeProvider:only-export-components.
- `npm run test:pacientes`:26 testes aprovados.
- Navegador:27 cenários de Pacientes +33 de Recepção,60 cenários distintos, resultado final aprovado após repetições dirigidas. Chrome,1440x1000/820x1180/390x844; serviços/auth sintéticos. Algumas expectativas foram adaptadas ao expansor móvel, à borda3px existente e ao reinício normal da busca na troca de clínica; o foco foi testado por teclas, sem simular mouse como teclado.
- Base Pacientes: `playwright.config.ts`, seleção dos arquivos pacientes-filtros, pacientes-redesenho e pacientes-edicao; Recepção: `playwright.recepcao.config.ts`, recepcao-integracao. Porta4193 existente identificada como Vite da configuração sintética antes de reutilizar; outros processos preservados.
- Aplicação normal Recepção/Brotas: indicadores, aba/cor, Enter/setas, filtro individual, busca genérica sem resultados, ação Ver previstos, filtros de idade, limpeza, criação/edição390x844, expansão da foto e criação desktop. Nenhum campo real editado, foto enviada ou formulário salvo.
- Console da aplicação normal sem error/warn devolvido nos percursos observados. Logs do Vite/testes incluem aviso preexistente Multiple GoTrueClient; build avisa imports/chunks grandes. Não são apresentados como resolvidos nesta etapa.
- Estilos e usos compartilhados inspecionados: controles/indicadores ficam em Pacientes; novo expansor usado somente na criação/edição; Dashboard integrado e perfis médico/proprietária preservados pelos testes. Sidebar, rotas, Supabase, consultas/contratos, CPF/responsável/duplicidade e Financeiro não alterados.
- Mudança de filtro profissional/situação conserva o resultado já consultado de CPF; clínica, data, revisão e texto ainda invalidam respostas antigas. Teste conectado não incluiu CPF real; contrato/isolamento verificados sinteticamente.
- Ipupiara autenticada nesta implementação, persistência real de cadastro/foto, câmera física, toque físico e zoom nativo125/150% não verificados. Pendências anteriores de acesso/publicação continuam separadas; usuário pode conferir uma sessão legítima disponível sem mudar permissões.
- Revisão automática rejeitou uma tentativa de captura fullPage por possível exposição pessoal; ação não executada. Foi usada captura do formulário inteiramente vazio. Não se contornou a revisão nem se capturou ficha real.

Capturas entregues fora do repositório, no diretório de artefatos desta conversa:
dashboard-mobile.jpg, pacientes-filtros-mobile.jpg e cadastro-mobile.jpg. Conferidas visualmente,
sem nome/documento/telefone de paciente, nome de profissional ou e-mail. Imagens recortadas preliminares
foram descartadas da entrega. Não há captura de edição com dados reais.

### Arquivos e conferência pela interface

Código: PainelRecepcao/painelRecepcao.css; IndicadoresPacientes; ControlesListaPacientes;
pacienteLista; Pacientes/pacientes-lista.css; EditarPaciente; novo FotoPacienteCompacta/CSS;
notasEvolucao.json. Testes: pacienteLista.test e quatro specs operacionais citados.
Relatório, índice, mestres/README/checkpoints de Pacientes e Sistema e checkpoints compartilhados
atualizados juntos, preservando histórico e contribuições anteriores.

1. Abra `http://127.0.0.1:3000/sistema/brotas/dashboard`: alterne abas; use busca genérica sem resultado, filtros e ×/Ver previstos.
2. Abra `http://127.0.0.1:3000/sistema/brotas/pacientes`: aplique dois critérios e remova somente um; confira a ação de limpeza no vazio.
3. No celular, abra Novo paciente ou Editar: nome/identificação acessíveis, foto recolhida, Ver foto e opções abre os controles existentes. Cancele sem salvar para conferir sem mudar dados.

Próximo: revisão visual pessoal das cinco mudanças e conferência autenticada pendente em Ipupiara;
nenhuma autorização de commit, push ou deploy decorre desta entrega.

## Avaliação original — histórico anterior à autorização

## Recomendação para escolha

Começar pelo acabamento dos componentes existentes e pela redução de passos desnecessários.
A estrutura atual já atende boa parte da operação: ações principais visíveis, dados por clínica,
busca exata de CPF, resumo responsivo e mensagens que distinguem informação ausente de falha.
Não há benefício demonstrado para substituir as duas telas por um dashboard pronto.

As cinco primeiras mudanças recomendadas, nesta ordem, são:

1. **Unificar cartões e hierarquia (#1):** mesma escala de números, ícones, bordas e espaçamento nas duas telas, com cor moderada.
2. **Separar seleção de alerta (#2):** aba selecionada na cor da clínica; âmbar reservado para uma situação que exige atenção.
3. **Dar uma saída clara ao estado vazio (#3):** ação para limpar filtros ou ver previstos; carregamento com espaço reservado estável.
4. **Permitir remover filtros individualmente (#4):** etiquetas com ação de remoção e resumo visível do que está aplicado.
5. **Compactar foto no celular (#5):** nome e identificação aparecem primeiro; foto continua disponível em uma seção expansível.

Os itens 1–3 formam a primeira etapa; 4–6 melhoram produtividade. Paginação e contagem
consolidada de pendências ficam separadas, como funcionalidades futuras. Não comprar ReUI
para executar estas cinco mudanças: todas podem usar o código existente e referências gratuitas.

## Evidência e ambientes

| Fonte | Conferência efetiva | Limite |
| --- | --- | --- |
| Código local | Branch `codex/resgate-local-2026-09-26`; HEAD `8e68e303bef5c92fa197a840250f1551856465b1`; sem diff em src/package/config de build no momento da leitura | Há alterações documentais de outras sessões, preservadas |
| Aplicação normal local | `http://127.0.0.1:3000/sistema/brotas/dashboard` e `/sistema/brotas/pacientes`, sessão Recepção/Brotas; desktop 1440×960 e celular 390×844 | Servidor já estava em execução; não foi iniciado/reiniciado por esta avaliação |
| Dashboard local | Indicadores carregados, lista vazia de Aguardando, linha em Previstos, filtros, aviso de horário passado, caixa legado e profissionais; setas do teclado selecionaram Previstos e moveram o foco | Não houve criação de agendamento, registro de chegada ou operação financeira |
| Pacientes local | Listagem, filtros abertos, resumo lateral/overlay móvel, criação vazia, edição de cadastro de teste e etapa de endereço; Escape fechou criação e resumo; formulário móvel sem largura excedente ao viewport | Sem salvar, enviar foto, abrir webcam, consultar CPF digitado ou provocar erros no serviço |
| Publicado Brotas | Dashboard e listagem de Pacientes abertos em sessão Recepção; aparência conferida; Sobre informa versão 0.1.0, build produção, commit `8e68e303`, sem alterações locais detectadas, compilado 03/10/2026 18:43:58 | Metadado exibido pela aplicação, não auditoria byte a byte dos arquivos publicados |
| Metadados locais | Sobre informa desenvolvimento local, origem `2afff0a2`, alterações locais e compilação 17:21:16 | Diverge do HEAD atual; não usar esse metadado antigo para identificar sozinho o código servido. Não foi reiniciado apenas para corrigir identificação |
| Ipupiara/outros perfis | Código e documentos aplicáveis examinados; bloqueio de acesso Ipupiara consta do checkpoint de outra sessão | Nenhum teste visual autenticado de Ipupiara ou da proprietária nesta avaliação; Brotas não comprova esses cenários |

Nas superfícies comparadas, não foi observada diferença estrutural entre local e publicado.
Formulários, comportamento móvel e teclado foram examinados localmente; não atribuir essa
cobertura ao publicado. Tema escuro foi inspecionado nos estilos, sem trocar a preferência
do usuário; contraste quantitativo, leitor de tela, zoom nativo e toque em aparelho físico
não foram certificados. Não foram armazenados nomes, fotos, telefones ou documentos de pacientes neste relatório.

Fontes funcionais: [Sistema](../modulos/sistema/00-README-SISTEMA.md),
[painel integrado e limites das fontes](../modulos/sistema/13-PAINEL-RECEPCAO-PREVIA.md),
[Pacientes](../modulos/pacientes/00-README-PACIENTES.md),
[mestre Pacientes](../modulos/pacientes/01-DOCUMENTO-FUNCIONAL-MESTRE.md),
[evolução recente](../modulos/pacientes/15-REDESENHO-LOCAL.md),
[design system](../../01-DESIGN-SYSTEM.md),
[cadastros BR](../padroes/PADRAO-PREENCHIMENTO-CADASTROS-BR.md) e
[mensagens](../padroes/PADRAO-MENSAGENS-SISTEMA.md).
Índice, decisões, checkpoints e regras aplicáveis foram considerados; requisitos aprovados prevalecem sobre fotografias históricas.

## MCP realmente utilizado

ReUI global permaneceu cadastrado e autenticado por OAuth. O processo de verificação do
Codex retornou `authStatus: oAuth` e 19 ferramentas. As ferramentas não estão expostas
diretamente na lista desta conversa; foram chamadas pelo endpoint de ferramentas do
`codex app-server`, em contexto efêmero fora do projeto, sem executar um modelo ou enviar
código privado. Outros MCPs/plugins foram desativados somente nesse processo de teste;
a configuração global não foi modificada. Detalhes de configuração: [guia ReUI](REUI-MCP.md).

Consultas reais que tiveram retorno bem-sucedido:

- `search({query:"compact dashboard metrics daily activity list empty loading states", type:"example", free:true, surface:"card", limit:4})`.
- `search({query:"directory table contacts search filtering pagination detail panel", type:"example", free:true, surface:"card", limit:4})`.
- `get_component({name:["badge","alert","filters"], maxChars:4000})`: APIs e dependências reais, com limite por componente.
- `get_example({name:"c-data-grid-34"})`, `get_example({name:"c-empty-2"})` e `get_examples({component:"stepper",limit:2})`.
- `get_component({name:"stepper",maxChars:4000})` e `get_component({name:"data-grid",sections:["DataGridPagination"],maxChars:12000})`.
- `get_agent_skill({})`: workflow oficial, versão `e7aac3424a`, consultado novamente nesta etapa.

A primeira busca marcou correspondência fraca para parte dos termos. Não foi tomada como
prova de um dashboard pronto adequado. Selecionamos referências específicas de estados,
etiquetas e navegação, conferindo getters e prévias. A API de paginação veio omitida no
primeiro limite de 6.000 caracteres; nova chamada de 12.000 retornou a seção solicitada.
Não foi lida nem alegada a totalidade das cerca de 70 mil letras da API Data Grid.

O catálogo marcou todos os itens selecionados abaixo como `free: true`. Prévia/API não
comprovam integração no produto. Nenhum instalador, `shadcn add` ou código de exemplo foi
executado. Orientações de instalação da skill foram subordinadas ao pedido de análise.
TypeSafe foi consultada e reavaliada: esta comparação e seus filtros são determinísticos;
não precisam de classificação ou pontuação com IA. Não houve chamada TypeSafe nem leitura de sua chave.

## Referências exatas e custo

| Código | Item real / prévia | Documentação | Acesso observado / uso |
| --- | --- | --- | --- |
| R1 | [Badge](https://reui.io/components/badge?ref=mcp) | [API Base UI](https://reui.io/docs/components/base/badge?ref=mcp) | Gratuito; variantes de estado, tamanhos e raio |
| R2 | [Alert](https://reui.io/components/alert?ref=mcp) | [API Base UI](https://reui.io/docs/components/base/alert?ref=mcp) | Gratuito; título, descrição e ação |
| R3 | [Filters](https://reui.io/components/filters?ref=mcp) | [API Base UI](https://reui.io/docs/components/base/filters?ref=mcp) | Gratuito; referência de filtros visíveis; não recomendado instalar o construtor completo |
| R4 | [c-empty-2 — busca sem resultados](https://reui.io/preview/base/components/c-empty-2?ref=mcp) | [Exemplo](https://reui.io/components/empty/c-empty-2?ref=mcp) | Gratuito; prévia aberta e carregada |
| R5 | [c-data-grid-34 — paginação no servidor](https://reui.io/preview/base/components/c-data-grid-34?ref=mcp) | [Exemplo](https://reui.io/components/data-grid/c-data-grid-34?ref=mcp), [API Data Grid](https://reui.io/docs/components/base/data-grid?ref=mcp) | Gratuito; prévia aberta e carregada, busca/filtro/paginação demonstrativos |
| R6 | [c-stepper-2 — etapas com estado concluído](https://reui.io/preview/base/components/c-stepper-2?ref=mcp) | [Exemplo](https://reui.io/components/stepper/c-stepper-2?ref=mcp), [API Stepper](https://reui.io/docs/components/base/stepper?ref=mcp) | Gratuito; prévia aberta e carregada |

Estas são imagens públicas reais do catálogo, não telas da clínica nem uma implementação proposta:

[![Referência gratuita de tabela com paginação](https://reui.io/thumbnails/components/c-data-grid-34-light.webp)](https://reui.io/preview/base/components/c-data-grid-34?ref=mcp)

[![Referência gratuita de busca sem resultados](https://reui.io/thumbnails/components/c-empty-2-light.webp)](https://reui.io/preview/base/components/c-empty-2?ref=mcp)

Os demonstrativos contêm campos e ações sem relação com a clínica. Não copiar saldos,
contatos, estados financeiros ou links de marketing do exemplo. A prévia R6 serve à
hierarquia das etapas; não torna navegação de etapa equivalente a validação ou gravação.

Qualidade premium significa clareza, acabamento e rapidez de uso. Não implica licença
paga. O workflow do ReUI distingue componentes/exemplos gratuitos de blocos premium
(planos Pro/Ultimate) e Motion Icons (Ultimate). Nenhum item pago foi selecionado:
não há ganho adicional comprovado que justifique compra para esta proposta. Cotas e
condições da conta podem mudar; esta leitura não é promessa de consultas ilimitadas.

## Compatibilidade e decisão de reutilização

Versões verificadas no package/lock: React e React DOM 19.2.8, Tailwind e plugin Vite
4.3.3, Base UI 1.8.0 e Radix AlertDialog 1.1.15. Atendem às versões básicas indicadas
pelo ReUI, mas isso não torna todos os exemplos prontos para colar.

- shadcn aparece em adaptações locais de Sidebar/AlertDialog; `components.json` está ausente.
- Alias `@/`, utilitário padrão `cn`, `class-variance-authority`, `clsx`, `tailwind-merge` e `lucide-react` não fazem parte da estrutura completa esperada pelos exemplos consultados.
- Data Grid requer TanStack Table/Virtual e dnd-kit, ausentes. A API atual usa contrato TanStack v9 com instância `table`; não assumir API v8 nem props `data/columns` diretamente no DataGrid.
- Filters edita uma árvore `FilterQuery`, por `fields`, `query` e `onQueryChange`; não equivale ao objeto plano de filtros atual. Seu construtor completo traria cascader, popovers, vários arquivos de registry e `date-fns`.
- Badge depende de Base UI, `class-variance-authority` e `cn`; Alert depende dos dois últimos; Stepper depende de Base UI e `cn`. Instalar só para reproduzir estilos existentes ampliaria trabalho sem benefício confirmado.
- Exemplo R4 usa `button`/`empty`; R5 também envolve avatar, card, campos, select, skeleton e partes Data Grid. Dependências transitivas devem ser inspecionadas se houver adoção futura.
- Tokens de ReUI e da clínica têm nomes diferentes. Preservar `--cor-primaria`, estados, superfícies e tema por clínica; não importar uma paleta paralela.

Decisão recomendada: itens 1–6 usam componentes locais. R5 é uma referência para avaliar
paginação futura; não uma decisão de instalar Data Grid. Não migrar Tailwind, remover
Radix, substituir Base UI ou adicionar bibliotecas para obter somente uma mudança visual.

## Oito melhorias selecionadas

### 1. Cartões e orientação da tela — oportunidade visual e clareza

**Observado:** Dashboard usa ícones circulares à esquerda, números 30px e fundos brancos;
Pacientes usa ícones à direita, números 24px, fundo levemente colorido e sombra.
Ambos já são legíveis. A diferença é de consistência, não falha funcional.
`PainelRecepcao.tsx` também mantém “Bom dia” fixo à noite e mostra data ISO/fuso na linha
de critérios. Evidência: aplicação normal; [CSS Dashboard](../../src/components/dashboard/painelRecepcao.css),
[CSS Pacientes](../../src/pages/pacientes-lista.css), [painel](../../src/components/dashboard/PainelRecepcao.tsx).

**Proposta/benefício:** alinhar altura, escala numérica, posição/tamanho de ícone e respiro;
preservar descrições úteis. Título neutro “Recepção” com data por extenso evita saudação
incorreta; conservar fuso/critério na ajuda existente e instante de atualização visível.
A recepção lê as duas telas com a mesma hierarquia e encontra o contexto do turno.
**ReUI:** R5 para hierarquia de cabeçalho/lista e R1 para acentos discretos; gratuitos.
Não são geradores de indicadores ou de saudação.
**Implementação:** adaptar cartões/CSS locais; sem nova biblioteca. Compatibilidade por
tokens e fontes atuais. **Esforço pequeno; risco baixo; novos dados/regras: não.**

### 2. Aba selecionada e etiquetas — dificuldade potencial de leitura

**Observado:** `.rp-tab[aria-selected=true]` usa âmbar independentemente da aba. Previstos
selecionada mantém o mesmo destaque de atenção; status do registro permanece textual.
Pacientes já separa Ativo de “Dados a completar”. Evidência: prévia publicada do movimento,
[CSS Dashboard](../../src/components/dashboard/painelRecepcao.css), [listagem](../../src/pages/Pacientes.tsx).

**Proposta/benefício:** seleção em primária da clínica, status em etiqueta discreta com
texto, âmbar apenas para aviso confirmado. Preservar a distinção entre Ativo e pendência.
Reduz a interpretação de “aba escolhida” como problema e facilita escanear a fila.
**ReUI:** R1, gratuito, especialmente variantes suaves/contorno; não transferir estados
do exemplo para o negócio. **Implementação:** adaptar classes/etiquetas locais, preservando
abas e foco existentes; sem novas dependências. **Esforço pequeno; risco baixo;
novos dados/regras: não.** Contraste precisa ser medido após escolher tons reais.

### 3. Carregamento, vazio e indisponibilidade — dificuldade de uso

**Observado:** no Dashboard, Aguardando vazio exige interpretar texto e mudar a aba; já
há botão “Ver previstos” em outra seção. Carregamento usa traço e texto. Pacientes já
possui skeleton, erro com nova tentativa e vazio específico. Caixa legado exibe mensagem
correta e Abrir Financeiro, sem valores. Erro e sem permissão foram conferidos no código,
não provocados no serviço. Fontes: [painel](../../src/components/dashboard/PainelRecepcao.tsx)
e [Pacientes](../../src/pages/Pacientes.tsx).

**Proposta/benefício:** reaproveitar espaço reservado de carregamento também no Dashboard;
no vazio filtrado, oferecer “Limpar filtros” e, quando pertinente, “Ver previstos”. Vazio
do dia pode orientar Novo agendamento com a ação existente. Manter caixa legado/sem
permissão com explicação curta, ícone neutro e destino autorizado. Nunca desenhar R$0
ou selo verde de caixa operacional onde o serviço não confirmou esse estado.
**ReUI:** R4 e R2, gratuitos. **Implementação:** componentes locais `FeedbackAlert` e
estados existentes; sem dependências. **Esforço pequeno; risco baixo;
novos dados/regras: não.** Ação de limpar precisa preservar a clínica e os totais oficiais.

### 4. Filtros visíveis e removíveis — produtividade

**Observado:** Pacientes aplica filtros por botão e mostra resumos textuais; limpar fica
no painel expandido, sem remoção individual. Dashboard combina situação, nome/CPF e
profissional; não mostra um resumo removível dessa combinação. Fonte:
[ControlesListaPacientes](../../src/components/pacientes/ControlesListaPacientes.tsx), painel e inspeção dos controles.

**Proposta/benefício:** mostrar etiquetas de filtros realmente aplicados, remover cada
critério por botão com nome acessível e manter Limpar todos próximo da lista. Mostrar
profissional/situação ativos também no Dashboard. Evita resultados aparentemente
desaparecidos e permite retomar uma consulta sem reabrir todo o painel.
**ReUI:** R3, gratuito, como referência visual; sua árvore avançada não é necessária.
**Implementação:** adaptar o modelo plano existente, sem `date-fns`/cascader/popovers.
Preservar rascunho versus filtro aplicado, validações de data/idade, CPF exato e contagens.
**Esforço médio; risco médio; novos dados/regras: não.** Verificar retorno à lista sem resíduos de filtros antigos.

### 5. Foto opcional compacta no celular — dificuldade de uso

**Observado:** a 390×844, criação mostra aviso, foto e prévia antes do nome, que fica fora
da primeira área visível. A edição apresenta a foto de outra forma. Não foi observado
overflow horizontal no formulário. Fonte: inspeção móvel,
[CSS cadastro](../../src/pages/pacientes-cadastro.css), [EditarPaciente](../../src/components/pacientes/EditarPaciente.tsx).

**Proposta/benefício:** avatar pequeno e ação “Adicionar foto” expansível; nome, nascimento
e CPF opcional ganham prioridade. Aplicar padrão equivalente na edição respeitando o
salvamento separado da foto. Economiza rolagem na tarefa comum sem tirar acesso à foto.
**ReUI:** R5 para avatar/identificação compactos e R6 para organização da etapa; gratuitos.
Essas referências não implementam upload, privacidade ou webcam.
**Implementação:** adaptar editor/avatar locais; não instalar pacote de upload.
Preservar limite/tipos, armazenamento privado, confirmação e permissão explícita da câmera.
**Esforço médio; risco médio; novos dados/regras: não.** Testar seleção/cancelamento e não perder arquivos ou formulário.

### 6. Etapas reais com progresso mais claro — produtividade

**Observado:** criação e edição já compartilham navegação e endereço/contatos; Convênios
“Em planejamento” ocupa um bloco entre etapas reais, inclusive no celular. Isso é
placeholder existente, não funcionalidade ativa. Fonte:
[FormularioPacienteCompartilhado](../../src/components/pacientes/FormularioPacienteCompartilhado.tsx).

**Proposta/benefício:** dar prioridade visual às duas etapas reais de adulto ou três do
menor, com rótulo atual/concluída; manter Convênios como nota discreta de planejamento,
fora da trilha operacional. Não retirar silenciosamente a informação aprovada.
**ReUI:** R6, gratuito. **Implementação:** adaptar o navegador compartilhado, sem Stepper
novo. Compatibilidade: manter estado React e callbacks de validação existentes; avançar
visualmente não significa formulário válido. **Esforço médio; risco médio;
novos dados/regras: não; aprovação do reposicionamento visual: sim.**

### 7. Paginação real de Pacientes — funcionalidade nova

**Observado:** ordenação possui seis opções; lista sem controles de página. O limite é
1.000; contagem acima disso apresenta “Refine a busca ou os filtros” e evita mostrar
lista incompleta. Não é paginação. Fonte: [pacienteLista](../../src/lib/pacienteLista.ts),
[consulta e renderização](../../src/pages/Pacientes.tsx). O volume limite não foi produzido no banco.

**Proposta/benefício:** considerar páginas de 25/50 registros quando volume/uso justificar,
com intervalo e total autorizado, ordenação determinística e filtros executados na consulta.
Permite percorrer uma base maior sem obrigar conhecer parte do nome. Não paginar só o
primeiro lote de 1.000 como se representasse todo o resultado.
**ReUI:** R5, gratuito; API consultada exige `recordCount` e `rowCount/pageCount` coerentes
quando `data` contém só uma página; rótulos em português precisam ser configurados.
**Implementação:** motivo concreto para avaliar outro componente somente se os controles
locais se tornarem difíceis de manter; primeiro avaliar paginação sobre a consulta atual.
Data Grid acrescentaria TanStack/dnd-kit/registry, por isso não é a opção inicial.
**Esforço grande; risco alto; novos dados de domínio: não; revisão de consulta/total,
ordenação, seleção, concorrência e autorização por clínica: sim.** Nova implementação requer escolha explícita.

### 8. Pendências cadastrais consolidadas — funcionalidade nova condicionada

**Observado:** Dashboard declara contagem consolidada indisponível. Pacientes apresenta
seis itens fixos no resumo e pendências parciais dos campos carregados na lista; presença
do CPF é consultada separadamente. Somar etiquetas visíveis não representa a clínica.
Fontes: painel, [PreenchimentoCadastro](../../src/components/pacientes/PreenchimentoCadastro.tsx)
e [mestre Pacientes](../modulos/pacientes/01-DOCUMENTO-FUNCIONAL-MESTRE.md).

**Proposta/benefício:** somente após aprovar definição e fonte autorizada, resumo agregado
com critério/instante explícitos e acesso à consulta correspondente. Orienta a recepção
na complementação, sem tornar CPF obrigatório nem confundir ausência com erro.
**ReUI:** R2/R1, gratuitos, apenas apresentação. Nenhum componente fornece essa fonte.
**Implementação:** reutilizar apoio ao turno; serviço/RPC apropriado e revisão de isolamento
podem ser necessários, fora desta etapa. **Esforço grande; risco alto; novos dados/regras:
sim, agregação confiável, escopo de ativos/período, tratamento do desconhecido e permissão.**

## Direção visual comum

Preservar Sidebar, cor por clínica, superfícies claras/escuras, Geist, tokens existentes,
listagem que vira cartões no celular, resumo lateral no desktop e overlay móvel,
ações Novo paciente/Novo agendamento e fonte/instante do caixa. São estruturas úteis
já implementadas; troca ampla aumentaria risco sem evidência de ganho operacional.

- **Paleta:** primária atual da clínica para ação/seleção; verde para estado confirmado de sucesso; âmbar para atenção; vermelho para erro. Indicadores neutros com acento em ícone/número ou fundo muito suave, evitando colorir todo cartão.
- **Profundidade:** borda sutil e raio de card coerente (referência 12px já existente), sombra baixa por token. Painéis/diálogos podem usar nível superior aprovado; sem sombra colorida forte em cada controle.
- **Tipografia:** escala existente do design system: h1 28–30px/24px móvel, seção 20–24px, corpo 14px, apoio 12–13px; números tabulares. Geist para texto; preservar JetBrains Mono nos usos técnicos aprovados. Não diminuir aviso importante para caber.
- **Espaço:** unidades 4/8/16/24/32; alinhar gutters e padding dos cartões. Compactar sem comprimir alvo clicável; referência de 44px nas ações móveis.
- **Controles:** mesma altura/raio/borda nos campos e botões; primário para ação principal, secundário para alternativa, link para navegação. Rótulo sempre claro; campo de CPF não se transforma em busca parcial.
- **Tabela/lista:** nome e identidade em primeiro plano; telefone e situação como dados secundários; ações reconhecíveis com foco visível. Não adicionar prontuário ou CPF integral à lista. Não copiar colunas monetárias da prévia R5.
- **Estado/foco:** texto acompanha cor/ícone; skeleton só durante consulta; desconhecido/erro jamais zero. Movimento discreto respeita preferência reduzida; foco e contraste medidos nos dois temas antes de aprovar.

O desenho atual não tem “cores erradas” por ser diferente de um exemplo do catálogo.
São propostas de consistência e prioridade; mudanças de gosto devem ser escolhidas pelo usuário.

## Regras preservadas e lacunas que não devem virar números

| Regra vigente | Evidência documental/código | Limite desta avaliação |
| --- | --- | --- |
| Isolamento | Consultas com clinica_id, chaves de contexto e descarte de respostas antigas; regras de duas clínicas independentes | Não foi executado ensaio cruzado no banco |
| Perfis | Pacientes administrativos para proprietária/recepção; correção CPF preenchido só proprietária; papel Recepção observado | Sem abrir sessão de outro perfil nem conceder acesso |
| CPF | Opcional e não bloqueante; duplicidade no escopo da clínica; Recepção não recebe CPF integral; inclusão e correção separadas | Busca com documento e correção não executadas |
| Menores | Cadastro próprio e nome/vínculo/telefone do responsável obrigatórios; CPF/e-mail do responsável opcionais | Confirmado na fonte e validações do código, sem criar menor nesta etapa |
| Endereço/telefone/foto | Endereço histórico literal preservado; campos estruturados compartilhados; telefone formatado; foto opcional privada | Sem ViaCEP, upload, câmera ou alteração de vínculo |
| Indicadores | Contagens do movimento completo autorizado, cancelados excluídos; filtros só alteram lista; pacientes ativos/mês consultados, sem zeros fictícios | Valor observado não comprova todos os cenários de falha/volume |
| Caixa | Serviço oficial; bruto separado de saldo esperado em dinheiro; legado sem valores homologados; sem permissão distinto de ausência | Nesta sessão só caixa legado; operacional/erro/outros perfis pendentes |
| Rotas/sessão | Navegação normal por /sistema/brotas e encaminhamentos existentes | Não refatorar autenticação, trocar clínica ou usar ReUI para autorização |

Sem timestamp confiável de chegada no contrato do painel, não recomendar “minutos de
espera” como recurso já calculável, nem deduzir de updated_at/horário previsto. Sem fonte
homologada de pagamento por agendamento, não criar selo “não pago” ou botão Receber no
painel. Profissionais com consultas hoje não equivalem a profissionais presentes na clínica.
Ausência de nascimento não autoriza inventar idade/regra nova. Todas essas dependências
permanecem explícitas; nenhuma operação de banco foi proposta como execução já autorizada.

## Plano e verificação após escolha

| Etapa | Entrega proposta | Verificação na aplicação normal antes de considerar concluída |
| --- | --- | --- |
| 1 — visual, baixo risco | Itens 1–3; cartões/contexto, seleção/status, loading/vazio/feedback | Comparar ambos os módulos em claro/escuro, desktop/tablet/celular, textos longos e zoom; medir contraste. Conferir indicadores e timestamps iguais para mesma fonte; foco por Tab e setas, ações existentes e destinos. Ensaiar erro/sem permissão em ambiente de teste sem provocar falha de produção |
| 2 — navegação/produtividade | Itens 4–6; remover filtros, foto compacta e etapas reais | Nome/CPF exato, profissional, cada ordenação, aplicar/remover/limpar filtro, resumo/edição/criação e retorno. Teclado/Escape/foco, celular e rodapé sem encobrir campos. Em ambiente autorizado com fixture sintética: adulto sem CPF, menor com responsável, foto separada, descarte e confirmação somente após serviço. Preservar estado/roteamento e respostas antigas |
| 3 — novas capacidades | Itens 7–8, separadamente e após aprovar fonte/critério | Testar total/páginas/filtros no servidor com mais de um lote, ordenação estável sem duplicação/omissão e seleção correta. Agregação desconhecida/erro sem número falso; CPF opcional. Validar por perfil/clínica, concorrência e isolamento; qualquer alteração de banco segue processo específico com alvo e autorização concretos |

Critério transversal: nenhuma melhoria pode alterar situação clínica, liberar acesso,
mesclar pacientes entre clínicas ou presumir sucesso antes de confirmação. Build futuro
não substitui essas verificações conectadas. Nesta avaliação não houve build ou suites
repetidas: não houve alteração de produto que justificasse executá-los.

## Prompt pronto para uma futura execução escolhida

Este texto só deve ser enviado quando o usuário escolher a Etapa 1; não é autorização nesta sessão:

```text
Execute somente a Etapa 1 (itens 1–3) de docs/ia/AVALIACAO-RECEPCAO-PACIENTES-REUI.md
no projeto Clínica Patrícia. Leia AGENTS, checkpoint, índice e fontes funcionais dos
dois módulos; confira Git e preserve alterações de outras sessões. Antes de editar,
confirme no código e na aplicação normal as evidências do relatório, que é datado.
Unifique escala e acabamento dos indicadores, use cor da clínica para seleção de aba
e cores semânticas para status, e melhore carregamento/vazio com ações existentes.
Adapte os componentes locais, sem instalar dependências, trocar bibliotecas, alterar
banco, consultas, permissões, autenticação, rotas, regras de CPF/menores ou publicar.
Considere as referências ReUI gratuitas do relatório quando úteis, consultando API
atual sem enviar dados privados. Avalie typesafe-ai pela descrição; não force IA para
esta tarefa determinística nem leia/exponha sua chave. Confira a aplicação normal
em claro/escuro, teclado e telas menores, estados/destinos e valores iguais às fontes;
testes proporcionais para eventuais mudanças de lógica. Atualize documentação e
checkpoint com evidência/limites, diferenciando local de publicado. Sem commit/push/deploy.
```

## Encerramento da avaliação original — histórico

Entregues proposta, evidências, oito itens, três etapas e prioridades. Implementação
aguarda escolha do usuário. Relatório, índice e checkpoint atualizados; ajuste textual
no guia ReUI remove a pressuposição de paginação já existente. Não foram alterados
mestres funcionais, notas de release ou decisões aprovadas para converter proposta em requisito.
Pendências de Ipupiara/Equipe de outras sessões permanecem no checkpoint.

Verificação documental final: todos os links locais do relatório resolvem; oito itens
numerados e referência no índice conferidos. Hashes do inventário de src, package/lock,
Vite/TypeScript e config/AGENTS globais permaneceram iguais durante a redação documental.
A contribuição simultânea Equipe de 19:26 continua no checkpoint. Não interpretar o
diff documental preexistente do repositório como alterações de produto desta avaliação.
