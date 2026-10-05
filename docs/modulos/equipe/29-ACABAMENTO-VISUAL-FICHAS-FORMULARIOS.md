# Equipe — acabamento visual de fichas e formulários

Estado: IMPLEMENTADO E CONFERIDO LOCALMENTE PELO CODEX; NÃO PUBLICADO.
Data: 05/10/2026, America/Bahia (-03:00). Pedido de implementação visual do titular;
não representa aprovação pessoal do resultado. Etapas24–28 preservadas.

## Escopo e resultado

- Ficha, criação, edição e seções de clínicas/acesso usam apresentação específica
  de Equipe. ModalBase ganhou largura opcional `xl` (960px) e `className` opcional;
  padrões `md`, `lg` e painel permanecem com suas classes anteriores.
- Desktop: até960px, margens32px no conteúdo, campos relacionados em duas colunas;
  cartões de acesso lado a lado quando a janela permite. Tablet mantém controles
  de acesso na largura disponível. Até767px: uma coluna e recuo16px.
- Cabeçalho identifica a pessoa/função disponível; subtítulo acompanha o detalhe
  autorizado quando carregado. Nomes/e-mails extensos quebram na leitura.
- Dados pessoais/função, dados profissionais, vínculos e acesso separados por
  títulos, espaçamento e divisores. Superfícies, bordas e sombra usam tokens existentes.
- Uma rolagem vertical no diálogo, sem áreas roláveis concorrentes ou rodapés
  sobrepostos. Cabeçalho/ações seguem o conteúdo; primeiros/últimos campos e
  botões são alcançáveis, inclusive na simulação de altura reduzida.
- Controles de acesso e áreas de escolha têm alvo de44px. Foco visível, contenção
  de teclado, retorno ao acionador, Esc, descarte e estado de envio preservados.
- Orientação de cadastro sem login mais curta, sem duplicação por seção. Limitação
  de vínculos inativos continua visível, incluindo ausência de informação anterior
  e confirmação da inclusão ao salvar. Não foi inventado estado de clínica livre.
- Inspeção revelou selo ativo com contraste fraco e convite usando tokens de atenção
  inexistentes. Somente a apresentação destes estados passou aos tokens de feedback
  existentes. Ações primárias do diálogo usam o tom mais escuro já disponível da
  própria cor da clínica; nenhum tema/cor de clínica foi modificado.

Nenhuma alteração em funções de salvamento, efeitos, permissões, CPF, regras,
payloads, referências de papel, tratamentos de erro ou atualização da lista.
Cadastro, conta, convite, vínculo e acesso mantêm suas operações independentes.
A listagem principal não foi redesenhada. Bibliotecas de Equipe/acesso/erros,
testes anteriores e relatórios24–28 preservados.

## Ambiente e conferência conectada

Windows; aplicação normal Vite em http://127.0.0.1:3000, sessão existente de
**Proprietário(a)** confirmada pela interface. Navegador interno com janela
disponível de699px de largura; diálogo observado667px, sem transbordamento.
Não confundir esta janela com os desktops1440px dos testes isolados.

| Clínica | Conferência feita pelo agente | Resultado |
| --- | --- | --- |
| Brotas | Ficha de saúde com conta e papel Médico, edição com vínculo existente/acréscimo separado, criação vazia, atualização/reabertura | Acabamento carregado; seletor Médico, Salvar papel bloqueado; tipo fixo e vínculo mantido; criação sem cargo mantém salvar bloqueado; controle de papel44px; sem overflow |
| Ipupiara | Ficha administrativa sem conta, edição com vínculo existente e outra ficha com conta/acesso nas duas clínicas | Estados separados; acabamento carregado sem overflow; tipo fixo; vínculos mantidos; texto/seletor Recepção e Salvar papel bloqueado nas duas clínicas |

Somente abrir, ler, percorrer e fechar/Cancelar. Nenhum campo real preenchido,
seleção de papel alterada, cadastro salvo, convite enviado, acesso concedido,
suspenso ou reativado. Retorno final à listagem de Brotas. Dados identificáveis
da sessão e de pessoas não foram copiados para este relatório ou para capturas
de entrega. Não houve aprovação expressa do resultado pelo usuário.

## Testes locais e inspeção das imagens

Ambiente isolado4191, endpoints sintéticos e bloqueio de destinos reais nos testes
de Equipe. Escritas necessárias às regressões somente em respostas simuladas.

| Verificação | Resultado e alcance |
| --- | --- |
| Novo `equipe-acabamento.spec.ts` |9/9: computador1440×1000, tablet820×1180, celular360/390/430×844; criação administrativa/saúde, edição, fichas com/sem conta, convite, acesso ativo/sem acesso, erro e carregamento |
| Ajuste final de identificação e alvos de escolha |6/6 adicionais dos dois casos de Equipe, sem repetir as regressões funcionais anteriores |
| Geometria e teclado | Sem cortes horizontais; uma rolagem; primeiros/últimos campos, ações, Tab/Shift+Tab, Esc/descarte/retorno do foco. Altura420px simula espaço reduzido pelo teclado |
| Contraste | Ações primárias habilitadas e selos ativo/convite testados com mínimo4,5:1 no tema claro sintético; não afirmar auditoria completa de acessibilidade |
| Modal compartilhado | Agenda: “Marcar folga / horário especial” inspecionado em computador/tablet/celular, com CSS de Equipe também carregado; largura padrão até448px, sem classe específica ou escrita |
| Regressões selecionadas24–28 |24/24: edição/tipo/vínculos, recusa de inativo, detalhe parcial, falhas seguras, atualização de lista, papel contrário ao tipo e escolhas independentes de convite |
| Regras Node |19/19 em equipe/equipeEdicao/equipeErros |
| TypeScript/build/lint | Aprovados; avisos anteriores de exportação de ThemeProvider, importação dinâmica e tamanho de pacotes permanecem |

A primeira rodada visual teve6/9 aprovados: três tentativas da Agenda aguardavam
um nome de botão incorreto no teste novo. Corrigido o localizador para o rótulo
real e modo Dia; reconferência3/3, seguida da rodada completa9/9. Foi falha do
teste, sem evidência de defeito da aplicação. Resultados não foram somados como
se a primeira rodada tivesse sido integralmente aprovada.

Capturas em `scratch/equipe-29/` (artefatos locais ignorados por Git). Inspecionadas
visualmente pelo agente, além das interações automatizadas: computador/tablet,
formulários360/390/430, fim do formulário, área de acessos, conta ausente/convite,
erro, carregamento e Agenda. Exemplos finais com dados **fictícios**:

- `desktop-1440-novo-saude.png` e `desktop-1440-ficha-ativa-acessos.png`.
- `mobile-390-novo-saude.png`, `mobile-390-novo-fim.png` e
  `mobile-390-ficha-ativa-acessos.png`.
- `mobile-360-novo-fim.png`, `mobile-430-altura-reduzida.png` e
  `tablet-agenda-modal-padrao.png`.

## Limitações

Celulares/tablet são tamanhos e capacidades emulados no Chrome, sem equipamento
físico nem teclado virtual de Android/iOS. Altura reduzida comprova alcance por
rolagem nessa simulação, não todos os comportamentos de teclado do sistema.
Tema escuro, leitores de tela e outros motores de navegador não receberam
conferência visual nesta etapa. Tokens existentes de tema foram mantidos.

Criação preenchida, escrita, convite pendente, erros, carregamento controlado,
inativo omitido e resposta parcial foram cobertos somente por cenários sintéticos;
não foram produzidos registros reais para completar a matriz. Recepção real e
autorização no banco não foram revalidadas: escopo de apresentação, sem mudança
de regra nem execução de SQL. Persistência real não é comprovada por estes mocks.

## Skills e ferramentas

Impeccable aplicado ao acabamento, usando design system/formulários existentes.
ReUI avaliado: nenhum componente novo era necessário; catálogo/instalação/migração
não agregavam benefício concreto a este ajuste. Nenhuma dependência adicionada.

Typesafe-ai consultada, incluindo [índice oficial](https://docs.typesafe.ai/llms.txt).
Layout e regras existentes são determinísticos; decisão do Codex de executar
diretamente, sem IA no produto ou uso da chave direta TypeSafe.

Triagem inicial única por Jev/OpenRouter, conforme preferência global, com resumo
**sintético genérico**, sem arquivos, histórico, nomes, caminhos ou dados privados
do projeto. Helper Windows chamado desde o início pelo canal autorizado da
ferramenta; credencial protegida não exposta. Modelo typesafe/jev-1.13-20260917:
classificação code_change/confiança0,93; complexidade1,18 em0–2/confiança0,72;
probabilidade de faltar informação essencial0,17 (Noul, sem confiança separada).
HTTP835,1072ms;987 tokens entrada/119 saída; custo medidoUS$0,000041454. Sem
repetição automática ou alegação de economia de tokens do Codex.

## Arquivos, Git e publicação

Implementação: `src/pages/cadastros/Equipe.tsx`, novo `equipe.css`,
`src/components/ModalBase.tsx`. Verificação: novo
`tests/operacional/equipe-acabamento.spec.ts`. Notas:
`src/config/notasEvolucao.json`. Documentação: este relatório, README/mestre/08
de Equipe, `docs/ia/CHECKPOINT.md`, `docs/ia/INDICE.md` e `CHECKPOINT.md`.

Branch `codex/resgate-local-2026-09-26`; HEAD
`2a6e88d09c0a8a51cd73649bf45530c2db6a6923`. Alterações locais não commitadas;
baseline de89 arquivos levantado antes das edições, incluindo trabalhos de outras
tarefas. Revisão incremental e comparação de hashes preservam arquivos fora do
escopo; documentação acrescentada sem substituir histórico ou contribuição Jev.
Comparação final:80/89 arquivos idênticos; diferenças somente nos nove arquivos
preexistentes desta etapa, mais três novos (CSS, teste, relatório). As notas
anteriores permanecem integralmente iguais após retirar a única nota acrescentada.
Comparação da árvore de código confirma151 atributos funcionais anteriores
idênticos (eventos, valores, bloqueios, seleção e estados/erros dos campos).
`git diff --check` aprovado; bibliotecas e testes/relatórios24–28 inalterados.

Sem commit, push, merge, deploy, publicação, SQL, banco, migrations, RLS, Auth,
SMTP, Edge Functions, configuração de segredos ou alterações de acessos reais.
Aplicação normal3000 permanece funcionando; build local não comprova produção.

## Conferência pelo titular

Abrir http://127.0.0.1:3000/sistema/brotas/equipe e atualizar com F5. Em Cadastros →
Equipe & acessos, usar Ver cadastro, Editar e Novo membro; percorrer o diálogo e
fechar/Cancelar. Trocar para Ipupiara pelo seletor de clínica para examinar seus
registros autorizados. A conferência pelo titular permanece pendente de confirmação;
não é necessário salvar nem operar acessos para avaliar esta apresentação.

## Consolidação das etapas24–29

Registro de 2026-10-05 08:16:49 -03:00; os estados Git anteriores deste relatório descrevem seus
respectivos momentos. Esta consolidação reúne o pacote e autoriza somente um commit
local. Nenhum estado histórico sem commit/publicação é reescrito como publicado.

| Etapa | Resultado preservado | Evidência e alcance |
|---|---|---|
| 24 | Papel existente usa referência confirmada do serviço; bloqueio sem mudança válida | Testes sintéticos e leitura local de Proprietário(a), Brotas/Ipupiara, com reabertura/F5/outra pessoa; relatório24 |
| 25 | Response/código/status tratados com mensagens seguras; fallback só para ausência específica da listagem | Testes de erros/convite/perfil e leitura real local; falhas simuladas e reconferências separadas, relatório25 |
| 26 | Novo convite/concessão exige papel por clínica; cargo não infere autorização | Cenários sintéticos de operações; fichas reais somente leitura, relatório26 |
| 27 | Cadastro, conta, convite e acesso separados; consulta atualiza lista sem F5 | Operações/ausências/falhas simuladas; duas clínicas reais por leitura, relatório27 |
| 28 | Tipo fixo na edição, vínculos conhecidos mantidos, acréscimos separados; detalhe parcial bloqueia edição | 19 Node e UI35/36 com reconferência15/15; recusa de inativo simulada, relatório28 |
| 29 | Fichas/formulários responsivos e rolagem única; ModalBase opcional sem mudar defaults | UI9/9, regressões24/24, reconferência6/6 e Agenda representativa; limites abaixo e nos registros anteriores |

**Ajuste atual:** somente texto em Equipe.tsx, para **CPF (opcional)**. Validador
aceita vazio e rejeita valor informado inválido; proteção, modo de preservação e
persistência inalterados. Divergência histórica de obrigatoriedade registrada na revisão
09/checkpoint e decisão ainda pendente no mestre mantidas. Não houve decisão de tornar
CPF obrigatório ou mudança na regra de pacientes.

**Revisão combinada:** contratos existentes, limpeza de seleção por pessoa/contexto,
referência do servidor, mensagens para estados desconhecidos, fallback restrito,
controle de respostas atrasadas, atualização coletiva, preservação de CPF/tipo/vínculos
e CSS restrito aos diálogos Equipe examinados. ModalBase mantém largura md,
ocupado/suspenso false e apresentação modal; xl/className opcionais. Agenda padrão
já documentada nesta etapa, sem repetição. Dados sintéticos permanecem somente em
testes interceptados, com destinos reais bloqueados; nenhuma fixture no fluxo normal.
Não foram introduzidas dependências, correções extras ou alterações de serviço.

**Verificações adicionais — 05/10/2026, 08:19–08:21 -03:00:** índice de33 arquivos
exportado em cópia isolada ignorada pelo Git, com dependências já instaladas por
junções locais; sem copiar .env ou instalar pacotes. Cópia construída a partir do
HEAD e dos trechos selecionados, excluindo trabalho paralelo. npm run build
(notas de evolução + TypeScript + Vite) e npm run lint aprovados. Lint mantém o
aviso preexistente de ThemeProvider:102; build mantém avisos de importação
estática/dinâmica de Supabase, tamanho de chunks e tempo de plugins; não impedem
a compilação e não foram objeto de correção fora do escopo.

Na mesma cópia: **1/1 Node**, filtro do teste existente de CPF opcional (vazio/válido/
inválido), e **1/1 UI desktop**, teste existente de criação com seleção de tipo/campos
profissionais e envio totalmente interceptado. Rodada adicional sem falhas; nenhuma
matriz integral ou operação real repetida. Hashes normalizados dos21 arquivos de
fontes/testes/notas conferem exatamente com o índice testado; bibliotecas novas, CSS,
ConviteEquipe, Cadastros e fixtures necessários incluídos. Componentes importados
resolvidos pelo build; nenhuma dependência de arquivo novo excluído.

git diff --cached --check aprovado. Revisão de adições sem credenciais, dados
pessoais reais, domínios pessoais ou artefatos temporários. Referências sintéticas
permanecem em testes isolados. Comparação SHA256 de92 arquivos de partida:84
inalterados e8 diferenças somente autorizadas (rótulo/relatório/consolidação); nenhuma
mudança em Caixa ou outros trabalhos. Seis documentos compartilhados preparados
a partir do HEAD com apenas trechos24–29/consolidação; histórico não relacionado
continua no diretório de trabalho, fora do índice.

**Conferência atual do agente:** mesma aplicação normal em3000/Brotas, sessão
proprietária já confirmada nesta sequência. Abriu Novo membro vazio: texto **CPF
(opcional)**, atributo required ausente e Salvar cadastro desabilitado. Fechou por
Cancelar, sem preenchimento ou envio. Matriz conectada Brotas/Ipupiara anterior
reaproveitada; não se declara nova validação de escrita, Recepção ou aprovação pessoal
do titular. Aplicação normal3000 não foi substituída pelo ambiente sintético de testes.

**Limitações e pendências:** teclado virtual em aparelho físico, tema escuro/leitor
de tela/outros motores não conferidos nesta sequência; escrita, convites, erros e
estados ausentes só simulados nos cenários24–29. Consulta não identifica antecipadamente
todos os vínculos inativos; acréscimo não reativa e a recusa específica depende do
contrato conhecido. CPF obrigatório, consulta completa pela Recepção, conversão de
tipo, remoção, identificação antecipada de inativos e evolução de listagem permanecem
pendentes de decisão/etapa própria. Falhas iniciais dos relatórios continuam explícitas,
com suas reconferências, sem somar rodadas nem transformá-las em aprovação integral.

**Skills:** typesafe-ai lida e avaliada; consolidação determinística executada diretamente,
sem integração IA ou uso/exposição da chave direta. ReUI sem benefício concreto para
o rótulo/registro Git; componentes existentes preservados. Contratos Supabase conhecidos
não exigiram consulta adicional nem alteração. Triagem Jev única com resumo sintético
genérico: code_change/confiança0,88; complexidade0,97 em0–2/confiança0,95; Noul0,55
de faltar informação (incerta, sem confiança separada). Decisão do Codex: pedido completo
e inspeção local suficientes para seguir. HTTP1205,3411ms;867 entrada/119 saída;
US$0,000036414 medidos. Sem arquivos/dados privados enviados ou repetição automática.

**Git:** branch codex/resgate-local-2026-09-26; partida
2a6e88d09c0a8a51cd73649bf45530c2db6a6923; índice inicialmente vazio.
Preparação seletiva para único commit local; confirmação do commit será registrada
após a criação. Sem push, merge, deploy, GitHub ou publicação. Sem banco, migrations,
RLS, Auth, SMTP, Edge Functions, dados, convites ou acessos reais modificados.

**Arquivos selecionados (33):**

- `src/components/ModalBase.tsx`
- `src/config/notasEvolucao.json`
- `src/lib/equipe.ts`
- `src/lib/equipeAcessos.ts`
- `src/lib/equipeErros.ts`
- `src/lib/equipeEdicao.test.ts`
- `src/lib/equipeErros.test.ts`
- `src/pages/ConviteEquipe.tsx`
- `src/pages/cadastros/Cadastros.tsx`
- `src/pages/cadastros/Equipe.tsx`
- `src/pages/cadastros/equipe.css`
- `tests/login/convite.spec.ts`
- `tests/operacional/equipe-contexto.tsx`
- `tests/operacional/equipe-ficha.spec.ts`
- `tests/operacional/equipe.spec.ts`
- `tests/operacional/equipe-acabamento.spec.ts`
- `tests/operacional/equipe-edicao.spec.ts`
- `tests/operacional/equipe-erros.spec.ts`
- `tests/operacional/equipe-estados.spec.ts`
- `tests/operacional/equipe-papeis.spec.ts`
- `tests/operacional/equipe-papel-explicito.spec.ts`
- `docs/modulos/equipe/24-CORRECAO-SELETOR-PAPEL.md`
- `docs/modulos/equipe/25-TRATAMENTO-ERROS-E-COMPATIBILIDADE.md`
- `docs/modulos/equipe/26-ESCOLHA-EXPLICITA-PAPEL.md`
- `docs/modulos/equipe/27-CLAREZA-ESTADOS-CONTA-ACESSO.md`
- `docs/modulos/equipe/28-EDICAO-E-OPERACOES-PERMITIDAS.md`
- `docs/modulos/equipe/29-ACABAMENTO-VISUAL-FICHAS-FORMULARIOS.md`
- `CHECKPOINT.md` — somente trechos de Equipe24–29/consolidação.
- `docs/ia/CHECKPOINT.md` — somente trechos de Equipe24–29/consolidação.
- `docs/modulos/equipe/08-CHECKPOINT.md` — somente trechos de Equipe24–29/consolidação.
- `docs/modulos/equipe/00-README-EQUIPE.md` — somente trechos de Equipe24–29/consolidação.
- `docs/modulos/equipe/01-DOCUMENTO-FUNCIONAL-MESTRE.md` — somente trechos de Equipe24–29/consolidação.
- `docs/ia/INDICE.md` — somente trechos de Equipe24–29/consolidação.

**Fora do commit e preservados:** Caixa/financeiro e operações legadas, Agenda/Pacientes/
Sistema/Login anteriores, AGENTS.md, configuração/documentação/helper Jev, ReUI-MCP,
relatório23/SMTP anterior e seus trechos nos documentos compartilhados. Scratch,
capturas, logs, resultados, cópias de verificação e segredos não entram no pacote.
Notas anteriores mantidas; somente as seis notas24–29 participam do diff.

**Próxima ação:** criar o commit local autorizado com a seleção verificada;
conferência pessoal e qualquer publicação exigem etapa posterior autorizada.
