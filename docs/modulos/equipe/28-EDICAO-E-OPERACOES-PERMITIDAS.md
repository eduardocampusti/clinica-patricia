# Equipe — edição alinhada às operações permitidas

Estado: IMPLEMENTADO E CONFERIDO LOCALMENTE PELO AGENTE.
05/10/2026, 07:24 -03:00 (America/Bahia). Pedido específico autoriza frontend,
testes e documentação. Não representa aprovação pessoal do resultado pelo usuário.
Nenhuma alteração em pessoas, vínculos, convites ou acessos reais nesta etapa.

## Divergências comprovadas e contrato atual

Leitura do frontend e da migration vigente de cadastro/edição
`supabase/migrations/20260928153000_equipe_cadastro_edicao.sql`, sem executar SQL:

- `Equipe.tsx` oferecia o mesmo seletor de tipo na criação e na edição. O contrato
  de `equipe_salvar` rejeita qualquer mudança de tipo na edição (linha373), inclusive
  conversão entre administrativo e profissional de saúde.
- Clínicas existentes podiam ser desmarcadas. O servidor apenas acrescenta vínculos
  ausentes; omitir um identificador não remove vínculo (linhas405–417). A tela
  permitia interpretar uma remoção que não seria executada.
- Vínculos cadastrais/profissionais inativos são recusados ao salvar; não são
  reativados implicitamente (linhas406–415). `equipe_detalhar` usa `equipe_listar`,
  que retorna somente vínculos ativos autorizados, sem estado de inativos.
- A tabela `equipe_membros_clinicas` tem RLS, mas a migration revoga acesso direto
  de `authenticated`, sem grant SELECT posterior encontrado nas migrations.
  Não foi criada consulta direta nem tentativa de contornar esse contrato.
- O detalhe era aceito apenas pela presença de `id`. Campos opcionais ausentes
  viravam vazios/nulos na montagem da edição; o salvamento exige todos os campos.
  Uma resposta parcial poderia apagar informação não carregada. Guardas e testes
  sintéticos agora impedem abrir a edição nessa situação.

As correções posteriores de gestão de acessos não substituem `equipe_salvar` nem
introduzem remoção/reativação de vínculo cadastral. Reativar **acesso ao sistema**
é uma operação separada, não um procedimento de reativar vínculo cadastral.
Contrato descrito a partir do código local e evidências históricas do módulo;
não foi feita auditoria independente do catálogo remoto nesta etapa.

## Operações apresentadas

| Operação | Criação | Edição |
| --- | --- | --- |
| Tipo do membro | Seleção existente preservada. | Informação “Tipo de função atual”; sem seletor ou conversão. |
| Cargo e contatos | Campos existentes. | Continuam editáveis, separados do tipo. |
| Profissão/conselho/registro/UF/especialidade | Conforme tipo profissional e validação vigente. | Continuam editáveis para o profissional de saúde, sem conversão de tipo. |
| Clínicas atuais autorizadas | Escolha existente. | “Vínculos existentes — mantidos”, com vínculo ativo informado pelo detalhe. Sem controles de remoção. |
| Outra clínica autorizada | Escolha existente. | “Solicitar acréscimo em outra clínica”; seleção pode ser desfeita antes de salvar. |
| Vínculo inativo | Não reativado implicitamente. | Não reativado; ausência no detalhe não significa clínica livre. Acréscimo conferido ao salvar. |
| CPF | Regras anteriores intactas. | Preservação/substituição/remoção anteriores intactas; indisponível não vira remoção. |
| Login, convite ou papel | Operações separadas. | Salvar cadastro não concede nem altera acesso. |

O payload conserva os mesmos nomes/tipos/argumentos de `equipe_salvar`, identificador,
revisão esperada e chave da tentativa. A referência local do tipo e dos vínculos
conhecidos é separada do rascunho; não é enviada como campo novo. O tipo original
e os vínculos conhecidos são preservados também na montagem do payload. Não se
inventam identificadores de vínculos omitidos; o contrato aditivo do servidor os
preserva, e a autorização global continua exigida mesmo para unidades ocultas.
Uma recusa não provoca ajuste/reenvio automático para contornar autorização.

Respostas de detalhe incompletas, tipo/revisão inválidos, pessoa diferente ou sem
vínculo com o contexto não abrem formulário para gravação. Valores nulos explícitos
continuam válidos conforme regras existentes. Mensagem: “Não foi possível carregar
todos os dados para editar. Reabra o cadastro antes de salvar.”

## Limitação dos inativos e mensagens

O frontend atual **não consegue identificar previamente cada vínculo inativo**
porque essa informação não vem do serviço autorizado. As opções não são chamadas
de clínicas livres/disponíveis. O bloco informa: “O vínculo anterior dessas clínicas
não é informado nesta tela. O acréscimo será conferido ao salvar; vínculos inativos
não serão reativados.”

Se o servidor devolver uma das duas recusas exatas de vínculo inativo com `22023`
e status compatível, a mensagem fixa segura orienta: “Existe um vínculo inativo
entre as clínicas selecionadas. Este formulário não o reativa. Revise apenas as
clínicas que tentou acrescentar.” Não inventa qual clínica está inativa, não exibe
texto remoto, não modifica os vínculos e mantém o preenchimento. Outros erros
continuam no tratamento seguro da etapa25, incluindo recusa de autorização.

Identificar o inativo por clínica antes de salvar exige evolução futura da leitura
autorizada do backend. Conversão de tipo e remoção/reativação de vínculo cadastral
também exigem fluxo/regra próprios. Nenhum botão ou procedimento inexistente foi
oferecido. Essas funcionalidades não foram implementadas nesta etapa.

## Verificações e resultados

Serviços simulados no domínio `operacional.synthetic.invalid`, bloqueando outros
destinos externos; aplicação de teste local `127.0.0.1:4191`.

| Execução | Resultado |
| --- | --- |
| Regras Node de Equipe/edição/erros | 19/19 aprovados; quatro novos de edição. |
| Interface: nove cenários novos + três existentes, em três tamanhos | 35/36 aprovados. Um timeout desktop antes de carregar a lista/abrir formulário; sem snapshot de defeito do controle. |
| Reconferência do cenário administrativo + regressões24–27, em três tamanhos | 15/15 aprovados, sem alterar teste para forçar aprovação. |
| TypeScript/build final | Aprovado (`tsc -b` incluído no build). |
| Lint final | Aprovado, com aviso preexistente ThemeProvider. |
| Diff/preservação | `git diff --check` aprovado; hashes dos arquivos anteriores fora do recorte conservados. |

Não apresentar a rodada inicial como36/36. O mesmo cenário administrativo passou
em tablet/mobile inicialmente e nas três variantes na reconferência. Nenhuma
falha anterior das etapas24–27 ficou sem reconferência documentada; não se repetiu
toda a bateria histórica. Avisos preexistentes de build (importação/chunks) mantidos.

Novos cenários: escolha do tipo na criação; profissional com tipo fixo e demais
campos editáveis; administrativo sem campos profissionais; vínculos existentes
mantidos/acréscimo/reabertura com persistência **simulada**; vínculo inativo omitido
com recusa e sem reativação; vínculo omitido preservado pelo contrato aditivo;
recusa global sem revelar unidade oculta; detalhe incompleto sem envio de vazios;
falha preservando campos/seleção e sem texto bruto; teclado e responsividade.
Os nove testes UI combinam esses comportamentos, sem operações reais.

Regressões selecionadas: papel confirmado/retorno ao original (24), erros sem
repetição e alerta visível (25), escolhas independentes/resumo/payload (26),
atualização de painel/lista sem F5 mantendo filtros (27). Testes antigos intactos.
Imagens desktop1440 e mobile360/390 examinadas: tipo informativo legível,
vínculo mantido distinto do acréscimo, teclado/foco no botão Cancelar, sem
transbordamento horizontal do modal. Tablet820 também testado.
Artefatos locais ignorados pelo Git: `scratch/equipe-edicao/resultados` e
`scratch/equipe-edicao/reconferencia`; capturas `tipo-edicao-*.png` e
`vinculos-edicao-*.png` contêm exclusivamente dados sintéticos.

## Interface real — somente leitura pelo agente

Aplicação local `http://127.0.0.1:3000`, após atualização, sessão **Proprietário(a)**
confirmada no menu. Sem identificação pessoal necessária na documentação.

- Brotas: edição de profissional mostra tipo Profissional de saúde fixo, vínculo
  Brotas mantido e solicitação separada de acréscimo Ipupiara. Edição de outro
  membro administrativo mostra os dois vínculos mantidos e nenhum checkbox de
  remoção/acréscimo onde ambos já existem.
- Ipupiara: administrativo com um vínculo mostra Ipupiara mantida e solicitação
  de acréscimo Brotas; outro administrativo com dois vínculos mantém ambos,
  com tipo fixo e sem controles de remoção.
- Nenhum campo preenchido, checkbox marcado ou botão Salvar usado. Formulários
  fechados e retorno à lista de Brotas, preservando a sessão. Uma tentativa de
  Cancelar encontrou formulário já fechado; o estado atual foi conferido antes
  de continuar. Confirmação de perfil encontrou texto duplicado oculto/visível;
  leitura do menu confirmou o perfil, sem alteração de conta.

Não houve impedimento para ler os formulários da amostra. Inativos, visões
parciais, autorização recusada, campos ausentes, falhas e salvamentos/reabertura
após escrita foram apenas sintéticos. Não comprova persistência real nem sessão
Recepção/produção e não representa aprovação expressa do usuário.

## Arquivos e ferramentas

- `src/pages/cadastros/Equipe.tsx`: controles de edição, bloqueio de detalhe parcial,
  orientação de inativo conhecido e preservação dos demais campos.
- `src/lib/equipe.ts`: referência imutável da edição, montagem aditiva, validação
  de leitura completa e reconhecimento restrito das recusas de inativo.
- `src/lib/equipeEdicao.test.ts` e `tests/operacional/equipe-edicao.spec.ts`: novos
  testes; os anteriores não foram alterados.
- `src/config/notasEvolucao.json`: nota local não lançada, notas antigas preservadas.
- Este relatório, README/mestre/checkpoint de Equipe, índice/checkpoint operacional
  de IA e checkpoint raiz: decisões, execução e limitações desta etapa.

Impeccable usado para controles/instruções localizados; tokens/componentes existentes
suficientes, sem catálogo/instalação ReUI ou recurso pago. Typesafe-ai consultada e
[índice oficial](https://docs.typesafe.ai/llms.txt) lido: regras determinísticas
mantidas diretamente no código. Skill Supabase não encontrada no catálogo/pastas
pesquisados; contratos locais e [RPC oficial](https://supabase.com/docs/reference/javascript/rpc)
consultados, sem novas chamadas ou integração de backend.

Triagem Jev inicial tentou enviar somente resumo sintético sem dados do projeto:
bloqueio local `UnauthorizedAccessException` ao abrir credencial DPAPI, antes de
HTTP. `elapsed_ms=0` do helper; resposta/confiança/tokens/custo indisponíveis.
Isso não comprova indisponibilidade do serviço. Não houve envio nem repetição.
Codex assumiu a análise local. Atualização posterior das instruções/skill passou
a exigir execução autorizada desde a primeira tentativa Windows; aplica-se aos
próximos pedidos, sem repetir triagem nesta continuação. Credenciais/ACL preservadas.

## Git, publicação e continuidade

Branch `codex/resgate-local-2026-09-26`, HEAD
`2a6e88d09c0a8a51cd73649bf45530c2db6a6923`. Correção não commitada; nenhuma ação
de GitHub, commit/push/merge/deploy nesta tarefa. Remoto/publicação não reconsultados;
esta correção continua apenas local. Baseline de entrada com54 arquivos locais
comparado; trabalhos preexistentes e contribuições simultâneas Jev nos checkpoints
preservados. Bibliotecas de acesso/erros, relatórios24–27 e testes anteriores intactos.

Sem SQL, banco, migrations, RLS, Auth, SMTP, Edge Function, CPF/permissões,
Ibitiara, pessoas/vínculos/convites/acessos reais ou dependências alterados.
Consulta completa da equipe pela Recepção continua pendente fora deste escopo.

Próxima ação opcional do titular: F5 na aplicação local → Cadastros → Equipe &
acessos → Editar; observar tipo fixo, vínculos mantidos e eventuais acréscimos;
fechar por Cancelar sem salvar. Na criação, seleção de tipo permanece disponível,
mas não criar cadastro real para conferir esta etapa. Etapa encerrada pelo agente;
nenhuma melhoria adicional iniciada automaticamente.
