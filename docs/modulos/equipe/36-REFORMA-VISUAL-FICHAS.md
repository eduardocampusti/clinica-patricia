# 36 — Reforma visual das fichas de Equipe

### Pacote e recuperação do frontend — 2026-10-06 16:11:19 -03:00

31 arquivos selecionados: componentes Atuação/Documentos/Ficha, páginas Equipe/
Profissionais, CSS, adaptador de atuação, duas notas de evolução, migration35 já
aplicada, cinco SQL/README de testes estritamente fictícios locais, testes de
contrato/atuação/workspace e regressões/fixtures, relatórios35–36 e trechos exclusivos
de README/DFM/índice/checkpoints/integridade. Lista exata no diff do commit posterior.
Sem dependência nova, Edge ou configuração de hospedagem. Caixa, Agenda, Pacientes,
Login, Sistema, SMTP, instruções, ferramentas e kit31–33 não selecionados permanecem
no diretório original. Notas retiram somente a indicação antiga de disponibilidade local.

Cópia física sem hardlinks/junctions baseada em1b0fc2c1; tipos do app/testes e build
aprovados. Código/testes selecionados idênticos ao estado local já validado;22 cenários
sintéticos36 anteriores reaproveitados. Dois cenários sintéticos de arquivos/rascunhos
e documentos repetidos na cópia passaram, com destinos externos bloqueados. Primeira
invocação não executou casos por formato do argumento --project; corrigida, sem
defeito de produto. Nenhuma identidade real usada nos testes sintéticos. Padrões de
segredos/arquivos privados sem achados; ambientes locais e artifacts ignorados.

| Destino | Frontend anterior confirmado em HTML+JS200 | Build anterior completed |
|---|---|---|
| Brotas |0.1.0/1b0fc2c1; index-DCo3AV6h.js;2026-10-06T13:03:19.273Z |01a1114e-e2c9-7216-b757-aea651a627e4 |
| Ipupiara |0.1.0/1b0fc2c1; index-DNphDueg.js;2026-10-06T13:03:12.232Z |01a1114e-e31f-7224-b03f-6dae5ae1e942 |

Recuperação prevista pelo mesmo fluxo Git/Hostinger existente: em cópia limpa da
branch remota vigente, restaurar **somente os oito caminhos src/ deste pacote** ao
conteúdo de1b0fc2c13132ac72f13ef89c7c6c9bd04a79c813, revisar diff/tipos/build e criar
novo commit corretivo; push normal na mesma branch dispara os dois builds. Preservar
commits remotos posteriores, notas/documents/migration versionada e todo backend.
Conferir HTML+bundle e leitura após a recuperação. Não fazer force/reset, rollback
de banco ou reaplicar SQL. É procedimento registrado, não recuperação ensaiada ou
executada; será usado apenas diante de falha concreta, com reavaliação do escopo.

Jev: uma descrição sintética, code_change/confiança0,74, complexidade1,51/2/confiança
0,27 e falta essencial0,46 incertas; investigação decidida pelo Codex.883 entrada,
119 saída,1134,0287ms,US$0,000037086. TypeSafe completa e índice oficial consultados;
verificação determinística, sem IA no produto, chave ou conteúdo privado enviado.
Usuário autorizou publicação funcional e **não aprovou o acabamento visual**.


## Etapas35–36 — publicação autorizada em preparação, 2026-10-06 16:06:15 -03:00

O usuário autorizou commit, envio à branch codex/resgate-local-2026-09-26 e
publicação do estado funcional nas aplicações existentes de Brotas e Ipupiara.
**Não aprovou o acabamento visual: considera o design abaixo do esperado.**
Nenhum redesenho nesta execução; nova proposta estética permanece pendente.
Base local/remota e versão anterior dos dois destinos: 1b0fc2c13132ac72f13ef89c7c6c9bd04a79c813,
0.1.0 em desenvolvimento. Git automático existente habilitado nos dois destinos,
mesmo repositório/branch, Node22/Vite/build/dist; o push iniciará um deploy em cada.
Pacote exclusivo35–36 preparado em cópia física, sem outras alterações locais.
Migration20261006150000 já aplicada e incluída somente como registro versionado;
nenhum SQL, backend, Auth, configuração ou documento armazenado será reaplicado.
Leitura local real por Proprietário(a) em Brotas/Ipupiara concluída anteriormente;
22 cenários sintéticos36 e negativas SQL com claims simuladas são evidências distintas.
Outros JWTs, escritas reais, expiração, aparelho físico e vínculos individuais de
serviços seguem limites. Tipos/build do pacote, commit/push/deploy e conferência
publicada ainda pendentes neste registro; resultados posteriores ficarão locais
para evitar outra publicação só por documentação. Caixa e outros módulos preservados.

[Escopo, evidências e limites](<36-REFORMA-VISUAL-FICHAS.md>).


Registro: 06/10/2026, 14:57 -03:00, America/Bahia. Execução local autorizada.
Branch `codex/resgate-local-2026-09-26`, HEAD
`1b0fc2c13132ac72f13ef89c7c6c9bd04a79c813`. Alterações não commitadas; índice vazio.
Este relatório descreve implementação e evidências técnicas, sem aprovação pessoal
atribuída ao usuário. Os registros anteriores continuam históricos.

## Conferência conectada concluída — 06/10/2026, 15:17 -03:00

Sessão pessoal **Proprietário(a)** disponível no navegador conectado, aplicação
normal `http://127.0.0.1:5173`, Supabase exclusivo `xftnkusbyqzyvzrovroj`.
Nenhuma porta alternativa/demonstração usada para substituir a leitura real.
O impedimento anterior de sessão/navegador foi superado nesta retomada.
Backend35 já aplicado, sem SQL, migration, mudança de função, CORS ou serviço.

| Leitura real | Brotas | Ipupiara |
|---|---|---|
| Funcionário CLT fictício existente | Seis seções aplicáveis percorridas; pessoal, contratos, documentos, acesso, histórico e resumo | Mesmas seis seções; sem áreas profissionais indevidas |
| Médico CLT fictício existente | Nove seções percorridas; contratos e informações profissionais preservados | Nove seções percorridas; clínica selecionada correta |
| Documentos | Dois documentos atuais de contrato, versões1/2, armazenamento disponível e conferência aguardando; escopo autorizado das duas clínicas | Mesma correspondência de escopo, versão e estado; nenhuma recusa da origem5173 |
| Versões documentais | Lista de versões anteriores acessível; sem operação de armazenamento | Versão1 arquivada/substituída, conferida, com fonte fictícia; documentos atuais distintos preservados |
| Funcionário sem documentos | Vazio confirmado no escopo da consulta, sem falha de serviço | Vazio confirmado no escopo da consulta, sem falha de serviço |
| Histórico | Eventos do funcionário/profissional carregados; versão1 de formação consultada em somente leitura | Histórico carregado, com ações de consulta de versões |
| Acesso existente | Membro institucional com papel Recepção confirmado nas duas unidades; ambos Salvar papel desabilitados | Mesmo papel/seletores e bloqueio sem mudança; nenhum seletor alterado |
| Sem conta/convite | Funcionário/profissional fictícios sem conta confirmada; sem presumir papel | Sem conta e solicitação pendente observados como estados distintos, sem reenviar/conceder acesso |
| Atuação | Profissional/unidade corretos, fontes de duração/preço/participação e disponibilidade; editor de horários aberto/fechado sem salvar | Correspondência correta e mesmo teste de editor sem salvar |
| Reabertura/recarga | Sessão conservada, ficha reaberta; documentos e unidade da atuação reconferidos | Sessão conservada, ficha reaberta e documentos reconferidos |

Editores de dados pessoais, contrato, formação, recebimento, duração/preço e horários
foram abertos e cancelados, conforme as fichas/unidades pertinentes. Nenhum campo
preenchido, arquivo escolhido, envio iniciado ou Salvar acionado na aplicação real.
Confirmações de descarte foram respeitadas. Leitura de versão gera a auditoria
automática já existente; não é edição de domínio ou de documento armazenado.
Não repetido download/visualização do binário já validado anteriormente; esta rodada
conferiu metadados, versões, estados e disponibilidade das ações documentais.

Nas transições observadas, títulos/conteúdo antigos foram retirados na troca de
pessoa. Troca global mostrou Verificando acesso à clínica sem ficha antiga aberta.
Contrato **Exclusivo Fictício Brotas** presente em Brotas e ausente em Ipupiara.
Escolher Ipupiara dentro de Atuação conservou o contexto global Brotas; a seção
mostrou carregamento e retornou dados da unidade escolhida. Após recarga/reabertura,
Atuação voltou ao contexto global correto. Não é prova de todas as corridas possíveis
nem de isolamento de outros perfis; testes de atraso anteriores continuam sintéticos.

### Acabamento observado e capturas

Computador1440x1000: diálogo1180x900, largura interna1178 sem excesso horizontal;
página1440px. Celular emulado390x844: diálogo390x844, largura interna388 sem excesso;
página390px. Apenas `equipe-ficha-conteudo` com rolagem principal nos estados medidos.
Navegação lateral200px e seletor Seção operáveis. Nome fictício longo quebra em linhas
sem cobrir fechamento44px; cabeçalho e navegação permanecem acessíveis. Mudança de
seção leva foco ao h3 e reinicia sua rolagem; Tab chegou a Adicionar documento dentro
do diálogo, com foco visível. Abertura por teclado e fechamento devolveram foco ao
botão correspondente da listagem. Sem sobreposição de ações/escape horizontal nas
telas observadas; hierarquia, contraste, alinhamento e ajuda recolhível conferidos.

**Nenhum defeito concreto de frontend encontrado nesta rodada.** Sem nova reforma,
alteração de componentes, regra funcional ou nota de evolução duplicada. Build,
tipos/lint e22 cenários sintéticos distintos da implementação continuam evidências
anteriores válidas; não repetidos sem correção. Preservação de rascunho/foto/arquivo
entre seções e descarte reaproveita os cenários sintéticos36 já aprovados, sem envio
ao Supabase. Capturas atuais vêm da aplicação normal e de registros comprovadamente
fictícios existentes; não são novas escritas nem demonstração substituindo sessão.

- `scratch/equipe-35-36-conferencia/real-ficticio-visao-desktop.jpg`
- `scratch/equipe-35-36-conferencia/real-ficticio-documentos-desktop.jpg`
- `scratch/equipe-35-36-conferencia/real-ficticio-visao-mobile.jpg`
- `scratch/equipe-35-36-conferencia/real-ficticio-documentos-mobile.jpg`

Capturas inspecionadas, sem CPF completo, dados bancários, credenciais ou contatos
privados. Computador recortado para a ficha, removendo o contexto externo; imagens
transitórias removidas após recorte. Primeiras capturas tiveram render de tamanho
anterior/recorte inadequado e foram substituídas; não atribuído defeito ao frontend.
Override de tamanho removido ao encerrar. Aplicação normal deixada em Ipupiara,
ficha profissional fictícia, **Visão geral**, aba preservada para avaliação humana.

### Limites mantidos

Esta rodada conclui a leitura pendente por Proprietário(a) nas duas clínicas.
Não comprova Recepção/Médico/proprietário parcial com seus próprios JWTs, escritas,
convites/e-mails, limpeza/expiração de temporários ou comportamento em aparelho e
teclado virtual físicos. Preço/grade de horários populados não foram criados para
esta conferência. Serviços individuais continuam sem modelo definido.
Backend aplicado e18 negativas com claims SQL simuladas permanecem evidências
anteriores, não testes de identidades reais da aplicação nesta sessão.

TypeSafe lida e índice oficial consultado novamente: verificação determinística,
sem IA/API privada no produto. Jev não repetido por continuação da conferência35–36,
sem novo pedido de implementação ou envio de arquivos/dados privados.
Relatórios35–36/README/estado técnico/índice/checkpoints atualizados; nenhuma aprovação
pessoal visual/funcional atribuída. Branch/HEAD mantidos, índice vazio, frontend35–36
local e não publicado; sem commit, push, merge, deploy, Docker ou alteração backend,
Auth, contas/bloqueios, acessos, convites, horários, preços, repasses ou arquivos reais.
Próxima ação: avaliação humana da ficha aberta. Publicação depende de pedido específico.

## Resultado e limites — histórico da implementação, 14:57 -03:00

Reforma integrada aos componentes da aplicação normal, com build local. A demonstração
fictícia usa os mesmos componentes, mas não comprova sessão, autorização ou persistência
no Supabase. A conferência conectada restante da etapa35 continua pendente: na última
observação válida, a aplicação normal5173 mostrou o login de Brotas.

| Camada | Resultado comprovado |
|---|---|
| Backend35 | Aplicado anteriormente exclusivamente em xftnkusbyqzyvzrovroj; nenhum SQL, migration ou função reaplicado nesta etapa |
| Identidades simuladas no servidor | Fontes das duas clínicas e18 recusas SQL anteriores preservadas; não repetidas e não equivalentes a JWT real |
| Interface com sessão real | Leitura anterior de Atuação35 por Proprietário(a), Brotas/Ipupiara em4182, preservada como evidência anterior |
| Interface normal5173 | Login observado; documentos, histórico, acessos e ficha36 com sessão real ainda pendentes |
| Escritas/perfis reais | Nenhuma escrita nesta execução; nenhum convite, papel, conta ou bloqueio alterado; demais perfis não homologados |
| Frontend36 | Integrado ao código normal e compilado localmente; testes de interação com serviços fictícios |
| Publicação | Sem commit, push, merge ou deploy; publicação anterior31–33 não recebe automaticamente35/36 |

O controle de navegador mudou de disponibilidade ao final. A aba de revisão fictícia
apareceu como página de erro; sua seleção foi recusada pela política do navegador por
protocolo não permitido. Não houve contorno nem inspeção da sessão por outro canal.
A abertura de painel solicitada ao aplicativo retornou `queued`, o que não comprova
que a ficha estava visível ao encerrar. Login5173 é a última observação válida da
aplicação normal; capturas fictícias verificadas ficam disponíveis abaixo.

## Experiência implementada

- Computador: diálogo1180px adaptável, cabeçalho compacto com avatar/iniciais,
  identificação e clínica; navegação lateral200px; uma seção principal por vez e
  uma área principal de rolagem. ModalBase e os demais módulos não foram alterados.
- Celular: painel com100dvh, cabeçalho e seletor nativo acessível **Seção**,
  conteúdo em uma coluna e espaçamento de área segura. Os nove botões empilhados
  foram substituídos pelo seletor. Fechamento e navegação permanecem fora da rolagem.
- Visão geral: vínculos, resumo autorizado de contrato/atuação e pendências existentes
  com ações para a seção pertinente. Sem nova consulta privada, CPF completo, banco,
  porcentagem de cadastro completo ou selo de regularidade inventado.
- Seções: Visão geral, Dados pessoais, Contratos e jornada, Atuação e atendimentos,
  Formação e registros, Recebimento, Documentos, Acesso ao sistema e Histórico,
  conforme aplicabilidade/permissões. Médico CLT mantém contratos e área profissional.
- Consulta e edição: operações atômicas existentes mantidas. Formulários permanecem
  montados, ocultos entre seções, conservando rascunhos e arquivos em memória.
  Fechamento protege descarte, operações em andamento bloqueiam duplicação/saída;
  troca de pessoa/clínica e logout conservam as proteções de contexto anteriores.
- Novo cadastro: linguagem visual compatível, CPF opcional e requisitos anteriores.
  Após confirmação do serviço, **Continuar na ficha criada** consulta o detalhe
  autorizado antes de abrir. Falha de leitura mantém o cadastro confirmado e permite
  nova consulta explícita; resposta atrasada não abre outro contexto. Sem autosave
  ou persistência de rascunhos privados no navegador da aplicação normal.
- Documentos: lista com categoria, escopo, versão, data, armazenamento e conferência;
  Visualizar/Baixar visíveis, demais operações em **Mais ações**. Versões antigas e
  arquivados recolhidos; documentos distintos não agrupados como uma única cadeia.
  Formulário aberto por **Adicionar documento**, nome do arquivo e cancelamento,
  estados reais de envio/confirmação/falha/incerteza. Sem progresso percentual fictício.
- Componentes Button/Avatar instalados, biblioteca de ícones, cores/tokens e modo
  escuro existentes reutilizados. Ajuda secundária expansível; avisos essenciais
  de clínica, privacidade, erro e consequência continuam presentes.

## Ações existentes mapeadas e preservadas

| Grupo | Ações/serviço preservados | Evidência36 |
|---|---|---|
| Cadastro básico | Novo/editar, tipo fixo, vínculos mantidos, confirmar serviço, continuar ficha | Novo fictício/obrigatórios/CPF opcional; regressão edição incompleta/tipo/vínculos |
| Pessoal/contratos | Consulta, edição, salvar/cancelar, empresa/checklist/ocupacional conforme autorização, versões | Rascunho/falha/descarte/reabertura/F5 e contrato/histórico sintéticos; ocupacional sem nova sessão real |
| Formação | Cursos/inscrições/especialidades, conferência com fonte, histórico | Regressão sintética de múltiplos registros, conferência e reset |
| Atuação | Clínica da seção, duração/preço/participação, editor de horários, cancelar | Regressões de leitura negada/editor/rejeição/cancelar; sem escrita real35 |
| Foto | Selecionar/salvar/substituir/remover/reconsultar | Arquivo fictício conservado entre seções e descarte; serviço anterior preservado |
| Recebimento | Consulta protegida, edição própria, máscaras, conflito, cancelar/reconsultar | Rascunho fictício conservado entre seções; proteção sem reescrever serviço |
| Documentos | Envio, recuperação idempotente, visualizar/baixar, substituir/conferir/arquivar, versões/temporários | Fluxo fictício e regressão de upload parcial/recuperação; limpeza/expiração real não repetidas |
| Acesso | Papel confirmado, escolha explícita por clínica, salvar alteração válida, convite/vínculo/concessão e confirmações existentes | Sem mudança bloqueia salvar; papel indisponível não é presumido; nova escolha e rascunho testados; operações reais de conta/e-mail não executadas |
| Listagem/contexto | Grid, avatar, busca/filtro/ordenação/página/seleção, retorno de foco, troca de clínica/pessoa | Regressões sintéticas de filtro/página/foco, recarga, contexto, atrasos/logout |

Concessão, suspensão, reativação, reenvio, limpeza de temporários e acompanhamento
ocupacional continuam alcançáveis conforme componentes/regras existentes. Não
declarar cada escrita novamente executada só por preservação de código.
Jornada contratual não vira disponibilidade na Agenda; valores históricos não são
recalculados. Serviços individuais seguem pendentes de definição do modelo.

## Componentes e arquivos

Produto: `src/components/cadastros/EquipeFichaAmpliada.tsx`,
`src/components/cadastros/EquipeDocumentosPainel.tsx`,
`src/pages/cadastros/Equipe.tsx`, `src/pages/cadastros/equipe.css` e
`src/config/notasEvolucao.json`.

Testes: novo `tests/operacional/equipe-ficha-workspace.spec.ts`; adaptações de
navegação em `equipe-fichas.spec.ts`, `equipe-atuacao.spec.ts` e `equipe-grid.spec.ts`;
fixtures fictícias em `equipe-fichas-demo.tsx`/`equipe-fichas-simulador.ts`.
As fixtures não integram o bundle normal nem substituem sua configuração Supabase.

Documentação: este relatório, relatório35, README/Documento Funcional Mestre/checkpoint
do módulo, índice/checkpoint operacional e checkpoint raiz. Sem nova regra de negócio.
Baseline dos quatro componentes antes da reforma em `scratch/equipe-36/antes/` e
`baseline.json`, preservando o trabalho35 usado como ponto de partida.

## Testes efetivamente realizados

Tipos do aplicativo e dos testes passaram. Lint: zero erros,16 avisos preexistentes
nos componentes de UI/ReUI/tema. Build normal e consistência das notas passaram;
avisos anteriores de tamanho de chunks/importação Supabase continuam, sem nova
dependência. Build é compilação local, não publicação nem prova do servidor real.
Verificação final do artifact normal: contém workspace/navegação e referência ao
projeto oficial; não contém o destino `operacional.synthetic.invalid`. A origem
normal5173 respondeu HTTP200. Isso comprova integração/servidor local disponível,
sem comprovar login ou abertura da ficha com dados reais.

**22 cenários distintos pertinentes passaram:**12 novos de workspace e10 regressões
selecionadas. Os novos cobrem foto/recebimento entre seções, cadastro com nome longo
e CPF opcional/continuação, papel confirmado e nova concessão explícita, aplicabilidade
dos três tipos de membro, edição/falha/descarte/reabertura/F5, operações documentais,
teclado/foco/tema/contexto e dimensões360/390/430/820/1440px. Regressões cobrem atuação,
recusa/escopo parcial, contratos/histórico, formação, recuperação documental, atraso
após logout, tipo/vínculos/consulta incompleta, grid e preservação de contexto.

Além desses cenários distintos,5 execuções em celular emulado e2 em tablet passaram.
Após a correção final de quebra do botão Conferir e adaptação da navegação do teste
de grid, mais2 execuções em celular passaram (390px e filtro/página/foco/alteração
simulada de papel). Não contar repetições como novos cenários distintos.

Uma tentativa final restrita não lançou Chrome por acesso do Windows; o runner
sintético autorizado fora da restrição executou os dois casos e passou. Nenhum
destino real ou perfil pessoal usado por esse runner. Falhas intermediárias de
seletores/foco/normalização de nome dos testes foram corrigidas, não consideradas
aprovação. O estado inicial do formulário de acesso foi ajustado para não tratar
a clínica inicialmente selecionada, ainda sem papel escolhido, como alteração.

Capturas fictícias inspecionadas e sem dados bancários/CPF completo:

- Antes: `scratch/equipe-36/antes-navegacao-real-ficticia.jpg` (ficha fictícia35),
  `antes-documentos-{360,390,430,820,1440}.png` (referência documental33).
- Depois: `scratch/equipe-36/depois-{360,390,430,820,1440}.png`, Visão geral36 sintética,
  e `nome-longo.png` para novo cadastro. Não são mesma pessoa/seção/estado em todas
  as imagens; a comparação avalia organização, navegação e espaço, não pixels idênticos.
- Artifacts em scratch ignorado pelo Git, preservados localmente. Uma captura do
  resumo não comprova consulta real nem segurança de outros perfis.

Limites: aparelho físico, teclado virtual físico/zoom nativo e sessões reais dos
demais perfis não testados. CSS usa altura dinâmica/área segura, sem prometer prova
de todo teclado/dispositivo. Não repetidas baterias completas31–35, homologação
SQL, escritos reais, expiração/limpeza hospedada ou auditoria runtime nesta etapa.

## Como conferir na aplicação normal

Abrir [Equipe de Brotas](http://127.0.0.1:5173/sistema/brotas/equipe), entrar pessoalmente
se necessário e seguir **Cadastros → Equipe → Ver cadastro**. A ficha abre em
**Visão geral**; usar navegação lateral ou **Seção** no celular. Trocar para
[Ipupiara](http://127.0.0.1:5173/sistema/ipupiara/equipe) pelo contexto autorizado.

Conferir Documentos, Histórico e Acesso nas duas clínicas somente por leitura; abrir
e encerrar o editor de horários sem salvar, reabrir ficha e recarregar. Não salvar
dados reais nesta revisão. Após login, atualizar relatório35/36 com a evidência
realmente obtida. A [demonstração fictícia](http://127.0.0.1:4193/tests/operacional/equipe-fichas-demo.html)
permite exercitar escritas simuladas, com aviso explícito de sua natureza.

## Skills e preservação

TypeSafe lida integralmente e avaliada: tarefa determinística, sem IA no produto,
API direta, envio privado ou leitura/exposição de chave. Impeccable aplicado à
hierarquia/navegação/uso móvel. ReUI accordion consultado genericamente; escolhidos
componentes já instalados e details/select nativos acessíveis, sem instalação ou
recursos pagos. Jev teve uma única tentativa inicial com payload sintético; helper
não iniciou por erro de argumento/caminho, sem resposta HTTP ou métricas do modelo.
Confiança, tokens, custo e latência da API indisponíveis; execução decidida pelo Codex,
sem repetir automaticamente a tentativa ou enviar arquivos privados.

ModalBase, componentes de grid/foto/recebimento, dependências e backend não editados
pela36. Migration35 mantém SHA256
`2C02502224F1CFE5B47A4B361142531B5AFC95661BF83A27A5D64AFD670722F8`.
Demais trabalhos locais preservados; nenhuma alteração no Site Geovana, Ibitiara,
Auth, contas técnicas bloqueadas, permissões, horários, preço, repasse ou dados reais.
Próxima ação: entrada pessoal na5173 para leitura das seções pendentes e revisão
humana da reforma. Commit/publicação dependerão de pedido futuro específico.
