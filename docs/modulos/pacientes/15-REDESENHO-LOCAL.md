# Pacientes — redesenho local

Status: IMPLEMENTADO LOCALMENTE, acabamento e verificação isolada encerrados em 03/10/2026 09:37,
America/Bahia (-03:00). Visual aprovado pelo usuário; preparação revisada em03/10/2026 10:42 -03:00.
Leitura conectada de Recepção/Brotas realizada; outras limitações discriminadas ao final.
Base Git: codex/resgate-local-2026-09-26, 403a908; alterações não commitadas.

## Escopo implementado

- Lista com resumo lateral não modal a partir de 1280px; em tablet/celular diálogo sobreposto,
  Escape, foco contido e retorno ao acionador. Mudança de largura adapta o mesmo resumo.
- Cartões móveis, busca nominal/CPF exato, filtros e ordenação existentes; botão inferior Novo paciente.
- Cadastro/edição reais reutilizados, mesmas etapas, endereço, foto, responsáveis e contratos de gravação.
  Estilos do módulo usam tokens compartilhados sem modificar AppShell/Sidebar/ModalBase.
- Confirmação compartilhada de descarte no novo cadastro, sem descartar durante envio.
- Indicadores Pacientes ativos e Novos no mês: duas consultas HEAD/count exact, sem linhas nem N+1,
  filtros de clínica no servidor, independentes da busca. Mês civil Bahia UTC-03. Erro/contagem desconhecida
  não produz zero. O alcance é o conjunto autorizado por RLS, não acesso ampliado.
- Preenchimento individual: seis itens fixos, resultado somente quando todos conhecidos, pendências
  confirmadas preservadas. Consulta de campos administrativos apenas para a seleção atual, abortável,
  sem CPF completo/hash/ciphertext. Presença de CPF usa RPC existente, separada de responsável.
- Abrir agenda apenas navega, sem pré-seleção fictícia. Sucesso usa FeedbackAlert existente no pai.

## Critérios e limites

Endereço histórico não vazio conta sem decomposição; se há componentes estruturados, exige conjunto
completo. Texto `endereco` composto a partir de estrutura parcial não contorna esse conjunto.
`endereco_historico` explícito preserva a presença de endereço legado mesmo durante transição.
Campo número é textual: indicação já informada como s/n é contabilizada, nunca inferida de vazio.
Sexo nao_informado/vazio não pontua; desconhecido impede conclusão, sem conversão.
Presença confirmada de CPF não significa validação documental. Ausência continua opcional.

Omitidos: consultas hoje, próxima consulta, último atendimento/histórico, lista de espera e contagem
global de dados a completar, por ausência de leitura/agregação administrativa suficientemente estabelecida
sem consultas por paciente ou mudança de serviços/permissões. Inativos não incluídos na lista nominal;
não há chip Todos. Busca CPF mantém retorno de inativo autorizado pelo contrato existente.
Paginação global não foi criada: mantém ordenação/filtros e limite seguro existente (até1000 com contagem
completa; acima disso pede refinar). Não é apresentada como paginação global implementada.

## Prévia e isolamento

http://127.0.0.1:4192/tests/operacional/pacientes-redesenho.html
Ipupiara: acrescentar ?unidade=ipupiara. Cenarios: erro-cpf, erro-leitura, erro-contagem, lento, limite, erro-salvar.
Harness DEV exige URL sintética. Interceptações apenas em tests/operacional, não importadas pela aplicação.
AppShell/Sidebar e Pacientes/EditarPaciente reais; nenhuma interface paralela de cadastro.
Chamadas simuladas usam operacional.synthetic.invalid. Nenhum registro no principal.

## Evidências da primeira etapa e histórico das verificações

25 unitários existentes e5 novos aprovados, usando o runtime já instalado em server/node_modules.
Build final e lint exit0; avisos preexistentes de ThemeProvider, chunks e importação mista preservados.
Uma tentativa de npx tsx falhou por EPERM no cache externo; não instalou dependência. O ensaio novo
foi executado com sucesso pelo binário existente, sem contornar permissões.

Todas as rodadas Playwright abaixo configuradas com retries0:

| Rodada | Aprovados | Falhas | Evidência/ação |
| --- | ---: | ---: | --- |
| Inicial123 |95|28|Mocks antigos proibiam HEAD, unidade sintética incorreta,503 ativando espera do SDK e tentativa de mudar clínica por trás do modal. Defeito real: efeito do resumo dependia do objeto da seleção e reabria sobre a foto ao atualizar dados. Corrigido para depender de clínica/ID/modo. Houve edições durante esta rodada; não é prova final.|
|126|122|4|Novo teste usava rótulo parcial de nascimento que também encontrava a idade (3 telas); teste de endereço legado verificava chamada antes do retorno (tablet). Seleção exata e espera explícita corrigidas.|
|129|127|2|Timeout5s do cabeçalho inicial em tablet (causa definitiva não comprovada); endereço estruturado/mobile verificava chamada antes do retorno. Espera15s pelo elemento inicial e espera pela gravação/fim do modal, sem repetir operação.|
|129|128|1|Endereço vazio/desktop fazia asserção síncrona antes da chamada. Corrigida espera pelo fechamento e chamada única.|
|Dirigida final42|42|0|Todos33 cenários do redesenho +9 de endereço vazio, foto e layout, nas3 telas. Inclui ajuste final de identificação no topo móvel, teclado/retorno do foco e último item acima do botão fixo.|

Na primeira etapa não houve nova rodada completa129/0 após o ajuste final; o resultado dirigido não substituía esse total. A execução completa posterior está registrada abaixo.
Falhas simuladas400 verificam tratamento determinístico; não houve indisponibilidade externa provocada.
Criação sem CPF, sucesso após retorno/fechamento, erro com rascunho preservado, edição/foto/CPF,
descarte, limites da consulta, atraso, troca de clínica e sexo legado desconhecido exercitados em isolamento.
Desktop1440x1000, tablet820x1180, celular390x844; Brotas/Ipupiara sintéticas em claro/escuro.
Identificação móvel fixada na primeira linha; ações desktop não se sobrepõem à situação.
Cadastro salvo com pendência de foto tem mensagem de fechamento própria: não afirma que nada foi salvo.

Capturas sintéticas em scratch/pacientes-redesenho, fora do Git.
Inspeção no navegador do Codex da composição sobreposta e criação; dimensões efetivas conferidas,
override de largura não refletiu o1440 solicitado (viewport real716), portanto não é prova de desktop.
Override restaurado; prévia mantida aberta. Desktop/celular documentados pelas execuções Playwright e
capturas inspecionadas. Zoom nativo não foi testado. Não foram usados pacientes, contas ou dados reais.

Arquivos funcionais: src/pages/Pacientes.tsx e CSSs do módulo; novos IndicadoresPacientes,
PreenchimentoCadastro e lib/pacientePreenchimento. Nota local em src/config/notasEvolucao.json.
Testes/prévia local em tests/operacional/pacientes-redesenho.*, configuração específica, helper test
e ajustes dos mocks/esperas em pacientes-edicao.spec.ts e pacientes-filtros.spec.ts.
Não houve mudança funcional de componentes compartilhados, Agenda ou outro módulo.
TypeSafe avaliada pela descrição: não pertinente aos cálculos/consultas determinísticos; nenhuma API usada.

Capturas finais: brotas-claro-desktop-lista.png, brotas-claro-desktop-criacao.png,
ipupiara-escuro-desktop-edicao.png e brotas-claro-mobile-cartoes.png, todas no diretório acima.
As três imagens na pasta indicada não possuem '(1)' no nome; versões substitutas não localizadas em
D:/Downloads. Não afirmar equivalência visual aprovada com arquivos indisponíveis.

## Acabamento final — 03/10/2026 09:37 -03:00

As três referências disponíveis em tela pacientes2 foram efetivamente abertas antes das edições:
1-pacientes-lista-com-resumo.jpg, 2-novo-paciente.jpg e 3-pacientes-celular.jpg.
Não foi localizado sufixo '(1)'; a indisponibilidade registrada às08:54 fica como histórico,
não como alegação de que esta rodada deixou de visualizar as imagens disponíveis.

Lista compactada e coluna redundante de nascimento removida; ordenação por nascimento mantida no
seletor existente. Identificação ganhou espaço. Dados a completar aparece separado de Ativo quando
há ausência confirmada em campos já recebidos, mesmo com CPF desconhecido, sem consultas por linha.
Indicadores existentes ganharam diferenciação sutil. Abrir agenda e Editar cadastro ficam junto à
identificação. Cadastro e edição usam PreviaIdentificacaoPaciente com dados do formulário e idade
calculada no dia civil da Bahia; rodapé acompanha as etapas reais, inclusive responsável legal.
Altura desktop de criação ajustada ao conteúdo, sem alterar ModalBase; celular permanece tela inteira.

Verificações desta rodada, separadas das anteriores:

| Execução | Resultado | Evidência/ação |
| --- | --- | --- |
| Exploratória interrompida | Não é rodada completa | Tipagem da data na prévia corrigida antes da execução final. |
| Primeira completa129, retries0 |124 aprovados/5 falhas|Três projetos detectaram rolagem de adulto no cenário desktop768 após incluir a prévia: bloco de foto compactado. CPF ausente/desktop verificava payload antes do término: espera pelo fechamento observável adicionada. Brotas/claro/mobile perdeu o diálogo antes de fechar após captura; causa definitiva não comprovada, houve edição de nota de evolução durante essa rodada.|
| Final completa129, retries0 |129 aprovados/0 falhas,4,3min|Mesma suíte em desktop/tablet/celular, versão funcional e testes estabilizados; sem repetição isolada para compor o total.|
| Unitários |30 aprovados|25 existentes e5 de preenchimento.|
| Capturas comparáveis, retries0 |12 aprovados|Três formatos, duas clínicas e dois temas.|
| Build e lint finais |exit0|Avisos existentes de chunks/importação mista e um aviso Fast Refresh de ThemeProvider; nenhum erro.|

A espera de endereço vazio conserva expect.poll/chamada única e asserções do payload e reabertura.
A espera adicional de CPF aguarda o diálogo desaparecer antes de conferir os campos enviados.
Nenhuma asserção foi removida para passar; não há pausa fixa substituindo o resultado observável.

Capturas referencia-*-lista.png: viewport1440x1080/DPR2, saída2880x2160;
referencia-*-cadastro.png:960x860/DPR2, saída1920x1720;
referencia-*-celular.png:390x844/DPR2, saída780x1688.
Essas dimensões de imagem correspondem aos arquivos de referência abertos, mas seu viewport CSS
original não é conhecido. Arquivos em scratch/pacientes-redesenho, ignorado pelo Git.
Capturas de lista, criação, edição e celular inspecionadas; telas clara/escura e identidades preservadas.

Diferenças intencionais: somente dois indicadores sustentados pelas fontes atuais; sem próxima consulta,
histórico ou totais demonstrativos. Cabeçalho/sidebar reais e filtros/ações aprovados ocupam espaço
adicional no celular; não foram substituídos pelos elementos simplificados do mockup. Cadastro ajustado
ao conteúdo, não à grande área vazia da referência. CPF, foto, responsável e contratos permanecem reais.
Impeccable auxiliou o acabamento visual; TypeSafe avaliada pela descrição, sem pertinência/API nesta tarefa.
Sem mudança em Agenda/AppShell/Sidebar, banco, permissões, dependências ou serviços de gravação.

## Preparação para publicação — 03/10/2026 10:42 -03:00

APTO À PUBLICAÇÃO CONTROLADA, não publicado nesta tarefa. Visual aprovado pelo usuário, preservado.
Branch codex/resgate-local-2026-09-26, HEAD403a908. Nenhum código/teste/configuração alterado nesta
revisão; alterações documentais de outras tarefas preservadas. TypeSafe avaliada pela descrição,
sem necessidade de decisão semântica ou integração com IA. Não houve chamada à API.

Integração observada: App.tsx importa Pacientes e usa a página no módulo e no cadastro pela Agenda.
A prévia importa a mesma página/AppShell/ThemeProvider; EditarPaciente e componentes de formulário
são os reais. Somente o harness tests/operacional/pacientes-redesenho.tsx instala fetch sintético,
com guarda DEV e URL sintética obrigatória. Nenhum import de harness/interceptação em src ou index.html.
Na aplicação normal, Supabase usa variáveis públicas existentes; projeto principal confirmado
xftnkusbyqzyvzrovroj, sem revelar chave. Indicadores: duas consultas HEAD/count exact na tabela pacientes,
clínica explícita e RLS vigente; novos no mês usa created_at em mês civil Bahia. Resumo: lista existente,
leitura administrativa da seleção, paciente_cpf_pendente e paciente_responsavel_legal_resumo.
Não há número demonstrativo, botão de demonstração ou salvamento simulado nesse caminho.

Pacote existente inspecionado: dist/index.html aponta index-kHow25Lp.js e index-Dlzxam2f.css,
gerados03/10 às09:31 -03:00 na etapa anterior. Zero ocorrências nos arquivos de dist de:
operacional.synthetic.invalid; PRÉVIA SINTÉTICA ISOLADA; Trocar clínica de demonstração;
Ana Exemplo Sintético; Registro exclusivamente sintético; pacientes-redesenho.html.
Inventário sem tests/scratch/resultados/specs/testes/capturas de Pacientes. Os nove HTMLs estáticos
de prévias de e-mails são preexistentes e preservados, não simulações operacionais de Pacientes.
Vite mantém entrada padrão index.html; tsconfig exclui src/**/*.test.ts, sem configuração de build nova.

Conferência conectada somente de leitura: porta3000, principal, Recepção/Brotas. Abertura de Pacientes,
busca nominal, seleção/resumo, contagens e leitura de preenchimento retornaram; criação e edição abertas
e canceladas, sem preenchimento ou salvamento. Reload preservou /sistema/brotas/pacientes, página,
clínica e perfil, com lista recarregada. Não houve erro visível de consulta nem console error observado.
Aviso de múltiplos clientes Auth do módulo de fotos preexistente, fora do diff, permanece registrado;
não se afirma ausência de todo aviso nem inspeção exaustiva de rede. Nenhum dado pessoal capturado.
Não constitui teste de gravação ou persistência de campos. Ipupiara não foi conferida com sessão real.
Zoom nativo125%/150% não verificado: APIs disponíveis controlam viewport, não zoom nativo.

Sem mudança funcional, mantidas evidências129/0 sem retries,30 unitários,12 capturas e build/lint
da versão final anterior. git diff --check exit0 nesta revisão. Nenhuma suíte repetida sem necessidade.
Não há nova dependência de banco, migration, permissões, pacote ou configuração para esta entrega;
usa objetos/serviços já utilizados e leitura conectada de Brotas compatível. Sem aplicação remota.

### Manifesto seletivo da entrega

Código/notas:
- src/pages/Pacientes.tsx
- src/pages/pacientes-lista.css
- src/pages/pacientes-cadastro.css
- src/components/pacientes/EditarPaciente.tsx
- src/components/pacientes/IndicadoresPacientes.tsx
- src/components/pacientes/PreenchimentoCadastro.tsx
- src/components/pacientes/PreviaIdentificacaoPaciente.tsx
- src/lib/pacientePreenchimento.ts
- src/config/notasEvolucao.json (somente entrada de Pacientes)

Testes e prévia, fora do bundle:
- src/lib/pacientePreenchimento.test.ts
- tests/operacional/pacientes-edicao.spec.ts
- tests/operacional/pacientes-filtros.spec.ts
- tests/operacional/pacientes-redesenho.html
- tests/operacional/pacientes-redesenho.tsx
- tests/operacional/pacientes-redesenho.spec.ts
- tests/operacional/playwright.pacientes-redesenho.config.ts
- tests/operacional/pacientes-capturas.spec.ts
- tests/operacional/playwright.pacientes-capturas.config.ts

Documentação: este relatório15; apenas trechos desta entrega no README, mestre e checkpoint de
Pacientes e no checkpoint operacional. Esses arquivos misturam histórico anterior não commitado:
não adicionar integralmente sem revisão seletiva futura. Integridade12, docs de outros módulos,
AGENTS/memória transversal e checkpoint raiz não pertencem automaticamente a este commit futuro.
Fora de versionamento: scratch/capturas/resultados, .env, logs e dist; cobertos pelo .gitignore existente.

## Publicação autorizada — 03/10/2026 11:03 -03:00

Pré-publicação: Hostinger confirma Brotas/Ipupiara completed em403a908899b3a0ccd3f7c59b44a2d6a3ba629697,
ambas na branch codex/resgate-local-2026-09-26 do repositório previsto. Fetch atualizado:0/0;
índice inicialmente vazio. Build/lint desta execução exit0, avisos conhecidos, sem mudanças funcionais
desde129/0. Esses testes não foram repetidos. Commit seletivo e publicação em execução, ainda não
comprovados por este marco. Sem banco, permissões, migrations ou configurações remotas.
Reversão por novo git revert do commit desta entrega, push normal e acompanhamento das duas clínicas;
não usar reset/force push nem tocar no banco. Referência anterior403a908.
Alterações documentais alheias preservadas, inclusive trechos nos mesmos arquivos.

## Pendente

Publicação mediante nova autorização e conferência dos artefatos dos dois domínios.
Ipupiara conectada, outros perfis, zoom nativo e gravação/persistência real não verificados nesta entrega.
Nenhuma migration, commit, push ou publicação executada nesta etapa.
