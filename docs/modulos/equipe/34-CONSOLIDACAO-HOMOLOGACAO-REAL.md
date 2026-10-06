# Equipe31–33 — consolidação e validação conectada

## Equipe31–33 — consolidação e publicação autorizadas, 2026-10-06 09:58:40 -03:00

Usuário confirmou pessoalmente **“baixei e funcionou”**: download do documento
fictício v2 validado manualmente pelo usuário. Não é download observado pelo agente,
aprovação global dos recursos nem homologação de escritas/e-mails.
Pedido posterior autoriza commit, GitHub e frontend nas duas clínicas. Ressalva Auth
preservada: baseline só impressão digital da linha, campos/causa não identificáveis;
auditoria pertinente já examinada sem evidência concreta de alteração indevida.
Logs de runtime não consultados. Não é incidente confirmado nem mudança comprovadamente
inofensiva. A limitação histórica, por si só, deixa de impedir esta publicação
conforme decisão explícita do usuário. Nenhuma conta, sessão ou permissão restaurada.
Base local/remota e última publicação das duas clínicas: eff05f60e07c4042bbb931d1c14d19432612d01d.
Branch codex/resgate-local-2026-09-26; Git automático habilitado nas duas clínicas,
repositório eduardocampusti/clinica-patricia, Vite/Node22/build/dist existentes.
Backend confirmado ACTIVE: equipe-recursos v3, equipe-fichas v3, equipe-acessos v8;
sem reaplicar migrations ou funções. Cinco bloqueios finitos até06/10/2027 mantidos.
Seleção94 referências conferida por hashes, sem mudança posterior de código/dependências.
Tipos/build/lint (0 erros,16 avisos),5 unidades e4 UI sintéticas da cópia reaproveitados;
28 conectados anteriores não repetidos. Commit/push/deploy ainda pendentes neste registro.
Versão0.1.0 em desenvolvimento preservada: publicação do commit não cria tag/release.
Outros trabalhos locais e trechos compartilhados excluídos do pacote são preservados.
Próximo: commit exato na cópia, envio sem force, confirmação dos dois builds e leitura
publicada nas sessões autorizadas. Resultado posterior pode permanecer só local.

Triagem Jev apenas sintética: tipo code_change/confiança0,58 (incerto), complexidade1,18/2/confiança0,73, falta essencial0,52 (incerta). Codex decidiu conferir ambiente/remoto/hospedagem.882 entrada/119 saída,847,056ms,US$0,000037044. TypeSafe completa/índice público consultados; nenhuma IA no produto, nenhum dado privado enviado. ReUI existente preservado sem nova instalação.


## Ressalvas e pacote revisável — 2026-10-06 09:33:21 -03:00

**Pacote tecnicamente validado para revisão de commit local; publicação ainda não
recomendada.** Auth inconclusivo e download manual pendente. Não é aprovação
pessoal do usuário. Pedido atual somente de leitura no principal e preparação local:
sem Docker, nova migration, escrita em Auth/banco/Storage, commit/push/merge/deploy.
Auditoria automática de leitura do documento é efeito do serviço já instalado;
nenhuma conferência, documento armazenado ou acesso real foi alterado pelo agente
nesta preparação.

### Autenticação — diagnóstico e impedimento

- Captura anterior contém somente chave e hash MD5 da linha inteira; não contém
  valores anteriores nem hashes separados por campo. Não foi encontrada captura
  anterior por campo nos artefatos da execução examinados. Nenhum valor de senha,
  token, sessão, identidade privada ou e-mail real foi exibido ou gravado aqui.
- Os dois scripts usam exatamente a mesma projeção e expressão:
  `md5(to_jsonb(t)::text)`, com id como chave para Auth. JSONB usa a mesma forma
  de serialização no banco; a captura não registrou timezone/schema da sessão.
  Não há evidência de mudança da representação; os outros cinco registros Auth
  anteriores coincidiram na comparação anterior. Não se apresentou isso como
  prova absoluta de igualdade histórica de schema/timezone.
- **Nomes dos campos que efetivamente diferiram: não determináveis.** A leitura
  atual mostra somente updated_at entre os campos de data consultados com instante
  na janela da execução; last_sign_in_at não está nessa janela. Isso não permite
  afirmar que updated_at foi a única alteração. Campos atuais de bloqueio/exclusão
  estão ausentes nessa conta, mas sem valores antigos não comprovam imutabilidade.
- A tabela auth.audit_log_entries, filtrada pelo identificador do ator inclusive
  no conteúdo do payload, não apresentou eventos associados desde a captura.
  Não foram consultados logs de runtime/Auth do painel: não há ferramenta Supabase
  de logs conectada nesta sessão. Ausência na tabela não prova ausência de operação.
- Comparação hipotética, exclusivamente SELECT/READ ONLY, com quatro datas
  operacionais disponíveis substituindo somente updated_at numa expressão JSONB,
  não recompôs o fingerprint anterior. Nenhuma linha foi restaurada/atualizada.
  Não se atribuiu a alteração a login, refresh ou ao agente.
- **Não foi possível classificar a diferença como exclusivamente operacional,
  nem excluir credencial/identidade/bloqueio/autorização.** A restrição de publicação
  permanece até obter evidência histórica suficiente (snapshot anterior por campo
  ou logs correlacionáveis do Auth). Não se declarou incidente de credencial
  comprovado. Nenhuma conta real de administrador/recepção foi modificada.

### Download real — limitação exata e roteiro manual

Aplicação normal3000, principal xftnkusbyqzyvzrovroj, clínica Brotas, sessão
administrativa disponível. Somente documento fictício existente do Médico CLT
Fictício equipe3133-20261006-2e373461. Clique Baixar versão2 executado com observador
de download armado antes do clique (15 segundos): nenhum evento recebido pela
ferramenta. Nenhum arquivo com o nome esperado observado na pasta padrão Downloads.
Prévia abriu o contêiner PDF autorizado e o nome documento-contrato-v2.pdf, sem
erro visível; isso não confirma recebimento, arquivo não vazio ou abertura correta
do arquivo baixado. Não houve novo upload/conferência/alteração documental real.

Metadados confirmados por leitura: versão2, PDF,605 bytes, disponível, aguarda
conferência, unidades Brotas/Ipupiara. Código de leitura/download e dependências
coincidem com a Edge v3 ativa; autorização atual por pessoa/clínica/versão continua
no serviço. A matriz negativa conectada anterior foi preservada, não repetida.
Download de bytes/hash anterior via SDK continua evidência do serviço, distinta
da conclusão do navegador. Confirmação pessoal do download solicitada; sem resposta
até este registro, sem atribuir aprovação pessoal ou homologação global.

Roteiro curto: app normal → Cadastros → Equipe & acessos → buscar
equipe3133-20261006-2e373461 → Ver cadastro do Médico CLT Fictício → Documentos →
Baixar versão2. Conferir arquivo documento-contrato-v2.pdf nos downloads (nome pode
receber sufixo se já existente),605 bytes (>0), abrir no leitor PDF e verificar
texto **Documento ficticio versao dois**. Comparar versão2 solicitada com nome e
conteúdo; não enviar arquivos de pessoas reais. Qualquer confirmação futura deve
ser registrada como informação do usuário, separada de observação pelo agente.

### Versões documentais — ressalva esclarecida, sem defeito reproduzido

Existem três registros de contrato no escopo regular da mesma ficha fictícia:
1. Documento original versão1, conferido, arquivado, com uma substituta atual.
2. Sua substituta versão2, ligada pelo substitui_id ao original, atual, aguardando
   nova conferência. A conferência antiga não foi herdada.
3. Outro documento versão1, com ID distinto, sem substitui_id, atual, aguardando
   conferência, originado do cenário conectado de recuperação de upload parcial.
   Mesmo contrato/categoria ou conteúdo fictício reaproveitado não é elo de substituição.

Por isso, duas pendências da mesma categoria são corretas para os dois documentos
atuais. `pendenciasFicha` já filtra `!arquivado`; nenhum histórico é cobrado
como documento atual. Interface confirmou dois atuais; ao marcar Mostrar versões
anteriores, aparece o original como **arquivado / substituído**, conferido, apenas
com visualizar/baixar, sem exigir nova conferência dessa versão. Histórico
preservado. Nenhuma correção funcional, exclusão ou transferência de conferência.
Prova visual fictícia: scratch/equipe-entrega-3133/documentos-historico.png, ignorada.

### Cinco contas técnicas — prazo e revisão manual

Somente admin_duas,admin_brotas,recepcao,medico,sem_vinculo da execução indicada.
Leitura reconfirmou as cinco com bloqueio vigente até **06/10/2027,08:28:31 -03:00**
(milissegundos variam entre contas), zero vínculos ativos e zero capacidades
ocupacionais ativas.8760 horas, um ano; não é exclusão nem encerramento permanente.
Antes do vencimento, preferencialmente até05/10/2027, revisar manualmente se as
contas continuam sem uso, vínculos/capacidades inativos e se haverá necessidade
de novo bloqueio autorizado. O login pode voltar a ser possível após o prazo;
os vínculos/capacidades não se reativam por isso. Não existe automação criada.
Nenhuma reativação, exclusão ou prorrogação. Fichas/arquivos/históricos preservados.

### Seleção e cópia limpa

Base eff05f60e07c4042bbb931d1c14d19432612d01d, branch original
codex/resgate-local-2026-09-26, índice original vazio. Clone físico local separado,
sem hardlink/junction, em scratch/equipe-entrega-3133/copia, sem novo commit.
Overlay explicitamente listado:94 entradas de referência, incluindo AGENTS somente
do HEAD sem suas mudanças globais locais. Sete arquivos de instrução/memória
tratados separadamente; seis recebem somente HEAD+resumo31–33. Históricos atuais
com Caixa, SMTP, Agenda, Pacientes, login e outras tarefas permanecem no original,
sem incluir seus trechos adicionais no pacote.72 arquivos locais fora da seleção.
Não usado git add, reset, descarte ou sobrescrita do trabalho original.
Conferência final: baseline local165 arquivos, capturada após a sincronização inicial
do documento funcional; zero ausentes e zero alterações fora do escopo. Oito
arquivos dessa baseline mudaram apenas nos ajustes/teste/documentos descritos;
DFM sincronizado antes dela e nova config de tipos registrados separadamente.
As94 entradas da cópia coincidem com o manifesto; diff --check sem erros nas duas
árvores, índice original vazio e configuração pública .env.local ignorada.

Manifesto com seleção/hash por arquivo e excluídos: scratch/equipe-entrega-3133/pacote.json.
Diff dos arquivos rastreados da cópia: scratch/equipe-entrega-3133/alteracoes-rastreadas.patch.
Arquivos novos completos ficam na cópia; patch rastreado sozinho não os contém.
Preparador local ignorado em scratch/equipe-entrega-3133/preparar-pacote.mjs.
Não executar comandos de publicação nem reaplicar helpers de migrations/Auth do
kit encerrado; sua inclusão é documentação/reprodutibilidade da execução anterior.

Dependências/lockfile selecionados integralmente: TanStack9.2.6,cn0.4.0,
class-variance-authority0.7.1,lucide-react1.52.0; BaseUI e stack anteriores mantidos.
Aliases @/ no Vite/TypeScript correspondentes ao ReUI; styles/src/pages/componentes
todos selecionados. Componentes compartilhados, Auth/Clínica/CadastroLayout,
equipe/equipeLista/pacienteFormulario/supabase/index.css e conviteAuth já presentes
no HEAD são dependências, sem absorver outras mudanças locais.

Fontes baixadas por leitura via API: duas entradas Edge e sete dependências
correspondem ao servidor após normalizar CRLF/LF e espaços extremos. Recursos e
fichas ACTIVE v3, verify_jwt=false com Auth.getUser/autorização próprios; acessos
ACTIVE v8, verify_jwt=true preservada. As três migrations selecionadas coincidem
com suas fontes registradas; catálogo/objetos/integração já comprovados na execução
anterior, sem tratar ledger sozinho como prova de aplicação. Nada reaplicado.

### Ajustes efetivamente realizados nesta preparação

- Teste sintético multipart: Buffer convertido por cópia para Uint8Array aceito
  por Response/TypeScript6, sem afrouxar tipos nem alterar bytes esperados.
- Novo tests/operacional/tsconfig.equipe.json: mapeia caminhos de navegador
  /src e /tests e alias @/ para checagem dos specs/harness, sem mudar runtime.
- Documento funcional sincronizado com aplicação real já registrada32/33.
- Três notas ainda não lançadas atualizadas para não afirmar serviços/fotos
  ausentes após aplicação do backend. Não mudou versão nem declarou release.
- Este relatório, README/índice/checkpoints e lista do pacote consolidados.
Nenhuma mudança funcional de documento, autorização, componente/estilo ou Edge.
Um comando inicial do preparador apontou para diretório errado e não executou;
caminho corrigido, cópia atualizada. Erro de configuração temporária de tipos
(caminhos Vite) e incompatibilidade Buffer identificados/corrigidos acima.

### Verificações proporcionais na cópia selecionada

| Verificação | Resultado | Limite |
|---|---|---|
| npm ci offline,ignore-scripts,include=dev |137 pacotes, lockfile aceito | Somente cache local; instalação original intacta |
| Tipos aplicativo, specs/harness, runner conectado e duas Edges | Passaram; configs de Edge com tipos locais fixados das mesmas versões | Checagem estática; não substitui os28 reais anteriores |
| Build final após atualização das notas | Passou; release notes coerentes | Avisos conhecidos de chunks grandes/import dinâmico; não publicado |
| Lint completo do pacote |0 erros,16 avisos conhecidos do ReUI/tema | Não houve refatoração para silenciar avisos |
| Lint do teste multipart alterado |0 erros/avisos | Direcionado ao arquivo corrigido |
| Unidade |5 passaram: PT409, pendências, PDF2, PDF íntegro e PDF ativo recusado | Sintéticos, sem Supabase |
| Interface composição |3 passaram: documentos/download/substituição/histórico, recuperação parcial e grade/ficha/foco | Chromium desktop sintético isolado, rede real bloqueada |
| Interface afetada pelo multipart |1 passou: seleção/cancelamento/salvar/substituir/remover foto e grade | Sintético; não houve upload real nesta execução |

Não repetidos os28 cenários conectados, e-mails, pagamentos ou bateria geral.
Nenhuma nova migration/Edge deploy. TypeSafe lida/índice público consultado:
determinístico, sem IA/OCR/chave no produto. Jev não chamado por pedido explícito
sem necessidade de IA e escopo exclusivo; triagem local, sem métricas inventadas.
ReUI existente preservado; nenhuma instalação de componentes/migração/redesenho.

### Arquivos do pacote (lista exata de referência)

- src/components/cadastros/EquipeAvatar.tsx — arquivo completo.
- src/components/cadastros/EquipeDocumentosPainel.tsx — arquivo completo.
- src/components/cadastros/EquipeFichaAmpliada.tsx — arquivo completo.
- src/components/cadastros/EquipeFichaCampos.tsx — arquivo completo.
- src/components/cadastros/EquipeFotoPainel.tsx — arquivo completo.
- src/components/cadastros/EquipeRecebimentoPainel.tsx — arquivo completo.
- src/components/cadastros/useEquipeFotos.ts — arquivo completo.
- src/components/reui/data-grid/data-grid-i18n.tsx — arquivo completo.
- src/components/reui/data-grid/data-grid-pagination.tsx — arquivo completo.
- src/components/reui/data-grid/data-grid-scroll-area.tsx — arquivo completo.
- src/components/reui/data-grid/data-grid-table.tsx — arquivo completo.
- src/components/reui/data-grid/data-grid.tsx — arquivo completo.
- supabase/functions/_shared/equipeDocumento.ts — arquivo completo.
- supabase/functions/_shared/equipeFicha.test.ts — arquivo completo.
- supabase/functions/_shared/equipeFicha.ts — arquivo completo.
- supabase/functions/_shared/equipeFoto.ts — arquivo completo.
- supabase/functions/_shared/equipePdf.ts — arquivo completo.
- supabase/functions/_shared/equipeRecebimento.ts — arquivo completo.
- supabase/functions/_shared/equipeRecursos.test.ts — arquivo completo.
- supabase/functions/_shared/equipeRecursosServico.ts — arquivo completo.
- supabase/functions/equipe-recursos/index.ts — arquivo completo.
- supabase/functions/equipe-recursos/NOTICE.md — arquivo completo.
- supabase/functions/equipe-fichas/index.ts — arquivo completo.
- supabase/functions/equipe-fichas/NOTICE.md — arquivo completo.
- database/tests/equipe/principal-31-33/aplicar.mjs — arquivo completo.
- database/tests/equipe/principal-31-33/atualizar-codec.mjs — arquivo completo.
- database/tests/equipe/principal-31-33/conferir-auditoria-final.mjs — arquivo completo.
- database/tests/equipe/principal-31-33/conferir-auth.mjs — arquivo completo.
- database/tests/equipe/principal-31-33/conferir-preservacao.mjs — arquivo completo.
- database/tests/equipe/principal-31-33/controle.mjs — arquivo completo.
- database/tests/equipe/principal-31-33/corrigir-conflitos.mjs — arquivo completo.
- database/tests/equipe/principal-31-33/encerrar-identidades.mjs — arquivo completo.
- database/tests/equipe/principal-31-33/identidades.mjs — arquivo completo.
- database/tests/equipe/principal-31-33/inventario.sql — arquivo completo.
- database/tests/equipe/principal-31-33/publicar.mjs — arquivo completo.
- database/tests/equipe/principal-31-33/README.md — arquivo completo.
- database/tests/equipe/principal-31-33/real.ts — arquivo completo.
- database/tests/equipe/principal-31-33/tsconfig.json — arquivo completo.
- components.json — arquivo completo.
- package.json — arquivo completo.
- package-lock.json — arquivo completo.
- vite.config.ts — arquivo completo.
- tsconfig.json — arquivo completo.
- tsconfig.app.json — arquivo completo.
- src/pages/cadastros/Equipe.tsx — arquivo completo.
- src/pages/cadastros/EquipeListagem.tsx — arquivo completo.
- src/pages/cadastros/equipe.css — arquivo completo.
- src/components/ui/button.tsx — arquivo completo.
- src/components/ui/checkbox.tsx — arquivo completo.
- src/components/ui/select.tsx — arquivo completo.
- src/components/ui/skeleton.tsx — arquivo completo.
- src/components/ui/spinner.tsx — arquivo completo.
- src/lib/equipeRecursos.ts — arquivo completo.
- src/lib/equipeFicha.ts — arquivo completo.
- src/lib/equipeFichaFormulario.ts — arquivo completo.
- src/config/notasEvolucao.json — arquivo completo.
- scripts/test-equipe-fichas.mjs — arquivo completo.
- scripts/preview-equipe-fichas.mjs — arquivo completo.
- scripts/test-equipe-recursos.mjs — arquivo completo.
- scripts/preview-equipe-recursos.mjs — arquivo completo.
- supabase/migrations/20261005170000_equipe_fotos_recebimento.sql — arquivo completo.
- supabase/migrations/20261005210000_equipe_fichas_documentos.sql — arquivo completo.
- supabase/migrations/20261006111000_equipe_conflitos_sem_retry.sql — arquivo completo.
- tests/operacional/vite.config.ts — arquivo completo.
- tests/operacional/tsconfig.equipe.json — arquivo completo.
- tests/operacional/equipe-erros.spec.ts — arquivo completo.
- tests/operacional/equipe-listagem.spec.ts — arquivo completo.
- tests/operacional/equipe-grid.spec.ts — arquivo completo.
- tests/operacional/equipe-avatar.tsx — arquivo completo.
- tests/operacional/equipe-avatar.html — arquivo completo.
- tests/operacional/equipe-avatar.spec.ts — arquivo completo.
- tests/operacional/equipe-recursos-demo.tsx — arquivo completo.
- tests/operacional/equipe-recursos-demo.html — arquivo completo.
- tests/operacional/equipe-recursos.spec.ts — arquivo completo.
- tests/operacional/equipe-fichas-contexto.tsx — arquivo completo.
- tests/operacional/equipe-fichas-demo.tsx — arquivo completo.
- tests/operacional/equipe-fichas-demo.html — arquivo completo.
- tests/operacional/equipe-fichas-simulador.ts — arquivo completo.
- tests/operacional/equipe-fichas.spec.ts — arquivo completo.
- tests/operacional/assets/avatar-equipe-ficticio.png — arquivo completo.
- tests/operacional/assets/README.md — arquivo completo.
- docs/ia/REUI-MCP.md — arquivo completo.
- docs/modulos/equipe/31-REUI-DATA-GRID.md — arquivo completo.
- docs/modulos/equipe/32-FOTOS-RECEBIMENTO.md — arquivo completo.
- docs/modulos/equipe/33-FICHAS-CONTRATOS-DOCUMENTOS.md — arquivo completo.
- docs/modulos/equipe/34-CONSOLIDACAO-HOMOLOGACAO-REAL.md — arquivo completo.
- docs/modulos/equipe/01-DOCUMENTO-FUNCIONAL-MESTRE.md — arquivo completo.
- AGENTS.md — somente HEAD; alterações globais excluídas.
- CHECKPOINT.md — HEAD + resumo exclusivo31–33; outros históricos locais excluídos.
- docs/ia/CHECKPOINT.md — HEAD + resumo exclusivo31–33; outros históricos locais excluídos.
- docs/ia/INDICE.md — HEAD + resumo exclusivo31–33; outros históricos locais excluídos.
- docs/modulos/equipe/00-README-EQUIPE.md — HEAD + resumo exclusivo31–33; outros históricos locais excluídos.
- docs/modulos/equipe/08-CHECKPOINT.md — HEAD + resumo exclusivo31–33; outros históricos locais excluídos.
- docs/modulos/pacientes/12-DIAGNOSTICO-INTEGRIDADE.md — HEAD + resumo exclusivo31–33; outros históricos locais excluídos.

### Situação e próxima ação

**Revisável para commit local futuro, mediante pedido específico; não liberado
para publicação enquanto Auth não for esclarecido e download não for confirmado.**
Não atribuir todos os campos Auth à simples atualização operacional. Obter evidência
histórica de campo/ação pelo canal autorizado e concluir roteiro de download.
App normal3000 disponível na ficha fictícia. Sem commit/push/merge/frontend deploy,
nova aplicação de backend ou aprovação pessoal do usuário. Relatos de etapas
anteriores abaixo permanecem datados e não substituem este diagnóstico.


## Resultado consolidado — 2026-10-06 08:40:12 -03:00

**Validação funcional passou no escopo executado:28 cenários conectados e
conferência do frontend local normal.** Não é aprovação pessoal do usuário,
homologação integral de segurança, entrega de e-mails ou publicação do frontend.
Persistência comprovada no principal xftnkusbyqzyvzrovroj, sem Docker/projeto novo.
Pedido posterior substituiu a proposta Docker e a proibição histórica de aplicação.
Alvo conferido por URL .env, project-ref CLI e claims das credenciais em memória.
Autorização específica desta execução não é autorização permanente.

### Matriz de aplicação e evidência

| Item | Resultado efetivamente observado | Limites |
|---|---|---|
| Migration20261005170000 — fotos/recebimento | Aplicada individualmente;2 tabelas/RLS,14 funções e bucket privado verificados no catálogo | Original aplicada não foi reescrita |
| Migration20261005210000 — fichas/documentos | Aplicada individualmente;6 tabelas/RLS,12 funções e bucket privado verificados | Original aplicada não foi reescrita |
| Migration20261006111000 — conflitos | Aplicada aditivamente;seis funções mantêm assinatura/ACL/corpo, alterando apenas SQLSTATE de conflito para PT409; hashes anteriores conferidos | Nenhuma migration de outro módulo aplicada |
| equipe-recursos | ACTIVE versão3, verify_jwt=false; Auth.getUser valida JWT e autorização por pessoa/clínica | Configuração evita depender do gateway antigo; não dispensa autenticação própria |
| equipe-fichas | ACTIVE versão3, verify_jwt=false; mesmo controle próprio de Auth e escopo | Apenas as duas funções novas publicadas |
| equipe-acessos | ACTIVE versão8, verify_jwt=true, preservada | Não republicada; convites/e-mails não testados nesta execução |
| Storage | equipe-fotos e equipe-documentos privados, leitura autorizada, negativas e arquivo/registro confirmados | Não é varredura antivírus nem validação de assinatura digital |
| Persistência | Foto enviar/recuperar/substituir/remover; PIX/conta/ambos, máscaras e clínica; pessoal/contrato/jornada/formação/histórico; documentos/download/substituição/conferência | Só registros e arquivos fictícios próprios |
| Concorrência e recuperação | Revisão antiga recusada409, versão anterior preservada; upload sem confirmação recuperado em nova sessão; repetição do mesmo documento sem duplicação | Não foi teste de carga/falha global |
| Permissões | Administração nas duas clínicas e só Brotas, recepção, médico e sem vínculo; escopo atual das versões/documentos; capacidade ocupacional por unidade; RPC interna/tabela/Storage direto negados | Não comprova todos os perfis/fluxos de outros módulos |
| Frontend local normal3000 | Sessão administrativa disponível, Brotas e Ipupiara; três fichas reais fictícias; foto salva pela UI, reabertura/F5, dados/contrato/formação/documentos e recebimento mascarado reconfirmados | Nova sessão Auth foi comprovada pelo SDK; não houve logout/login manual novo do usuário no navegador |
| Brotas publicado | Bundle index-DNZ0RQo6.js, commit eff05f60, compilado2026-10-05T16:39:38.045Z, HTTP200 | Frontend anterior preservado; etapas31–33 ainda não publicadas no domínio |
| Ipupiara publicado | Bundle index-D6jH7aNU.js, commit eff05f60, compilado2026-10-05T16:39:29.445Z, HTTP200 | Mesmo limite; backend novo aplicado não equivale a frontend publicado |

### Defeitos reais corrigidos e reexecuções proporcionais

1. Duas Edges v1 falhavam500/WORKER_ERROR antes de Auth. ImageScript npm1.3.0
   importa addon nativo incompatível com Edge. Troca somente pela distribuição
   Deno/WASM fixada1.3.0, avisos MIT preservados. v2 iniciou corretamente;
   sem token403/NAO_AUTORIZADO e upload real de foto passaram.
2. Contrato com revisão antiga expirava a chamada60s. Observado PostgREST14.5
   e SQLSTATE40001 utilizado para conflito de negócio. A documentação oficial
   descreve repetição infinita nessa condição. Migration corretiva somente nas
   seis funções novas e tradução PT409 pelo serviço/UI; v3 publicada. Retorno409
   e consulta da versão anterior passaram, incluindo foto e documentos com
   revisões antigas/substituição de versão arquivada. Leitura posterior de
   pg_stat_activity não encontrou backends authenticator ativos. Nenhum backend
   de terceiro encerrado, reinício do projeto ou configuração global alterada.

Fontes técnicas públicas: [WASM na Edge](https://supabase.com/docs/guides/functions/examples/image-manipulation),
[distribuição Deno](https://deno.land/x/imagescript@1.3.0/mod.ts),
[diagnóstico40001 oficial](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).
Migrations e código anteriores mantidos; o novo arquivo corretivo documenta a mudança.
Tipos Edge/frontend/runner, lint dos arquivos afetados, coerência das notas e um
teste específico de tradução PT409 passaram. Não repetida toda a bateria sintética.
Reexecutados somente cenários falhos/afetados. Erros do kit corrigidos: servicos_pf,
validade textual vazia, valores únicos para concorrência e ordem de inicialização.
Proteção de foto inválida agora exige foto anterior existente; não aceita vazio como prova.
Timeout504 de preparação e montagem literal do registrador SQL foram corrigidos;
transação rejeitada reconferida sem aplicação parcial. Nenhum reset/db push geral.

### Execução fictícia, ambiente e encerramento

Execução equipe3133-20261006-2e373461. Cinco contas Auth técnicas criadas pela API
administrativa, confirmadas sem convite/envio de e-mail, com UUIDs próprios e papéis
para os testes. Testes funcionais usam JWT dos cinco perfis e caminhos Edge/RPC/Storage;
service_role fica só no servidor/apoio restrito à preparação da interrupção documental.
Não se usou service_role como única prova de autorização.

Usuário autorizou expressamente encerrar as cinco contas técnicas após identificar
seus perfis: admin_duas, admin_brotas, recepcao, medico e sem_vinculo desta execução.
Revisão automática inicialmente rejeitou esse encerramento; nada foi bloqueado antes
da autorização específica. Encerramento confirmado às08:28:39 -03:00: cinco logins
bloqueados, vínculos técnicos inativos, capacidade ocupacional de teste inativa;
sessão anterior403 e novo login negado. Contas não excluídas; histórias preservadas.
Bloqueio Auth configurado por8760 horas; os vínculos e capacidades técnicas seguem
inativos mesmo após esse prazo. Não se declarou exclusão nem bloqueio permanente.
Senhas técnicas locais descartadas após confirmação. Nenhuma conta real incluída.
Journal fora da raiz Vite, em pasta Windows com ACL restrita; DPAPI não foi usada.
service_role e tokens não foram gravados em frontend/documentação/journal.

Três pessoas mantidas para a conferência humana nas duas clínicas:
- Funcionário CLT Fictício equipe3133-20261006-2e373461.
- Médico Prestador Fictício equipe3133-20261006-2e373461.
- Médico CLT Fictício equipe3133-20261006-2e373461.

Abra o app normal http://127.0.0.1:3000/sistema/brotas/equipe ou selecione Ipupiara
no cabeçalho. Cadastros → Equipe & acessos → busca equipe3133-20261006-2e373461 →
Ver cadastro. No médico CLT, Resumo mostra foto; Recebimento mostra configuração
específica da clínica, mascarada; Contratos e jornada e Documentos mostram registros
confirmados e versões. Arquivos são fictícios. ASO administrativo permanece restrito
após retirar a capacidade específica; não foi concedida capacidade ao usuário real.
Há registros adicionais de execução/reexecução com IDs distintos; repetição documental
foi conferida pelo mesmo ID, sem duplicar sua confirmação. Não há pagamentos/convites.

### Conferência visual efetivamente realizada pelo agente

| Clínica no app local | Observado | Limitação |
|---|---|---|
| Ipupiara | Busca/ficha fictícia; foto salva pela UI e depois recuperada após F5/reabertura; nome social, contrato CLT, jornada, formação, dois documentos disponíveis; recebimento por transferência mascarado | Sem novo login manual; sem aprovação pessoal do usuário |
| Brotas | Alternância pela seleção normal; mesma foto canônica; contrato exclusivo de Brotas além do compartilhado, ausente na ficha de Ipupiara; recebimento PIX mascarado; documentos confirmados; F5 manteve Brotas e reabertura funcionou | Clique Baixar versão2 sem erro visível, mas a ferramenta não recebeu evento de download; recepção do arquivo pela UI não foi confirmada |

Download autenticado, bytes/hash e cache no-store passaram no servidor/SDK.
A falha de captura do evento pelo navegador não foi declarada defeito do produto.
Na entrega final, houve a mensagem “Não foi possível consultar seu acesso”.
Uma única ação Tentar novamente recuperou a listagem normal de Brotas; a janela
foi mantida com a busca da execução e três pessoas no resultado. Não houve
alteração de vínculo nem nova correção para esse evento transitório.
Primeira seleção de arquivo foi interrompida pela atualização local; seleção posterior,
prévia e Salvar foto passaram. Prova visual fictícia em scratch ignorado, sem CPF/segredos.

### Preservação, integridade e limitações

Integridade oficial em9 SELECTs encapsulados antes/após cada uma das três migrations;
nenhum objeto obrigatório ausente. Catalogados objetos e permissões além da tabela
de migrations. Registro transversal em Pacientes é documental: nenhum dado/fluxo de
Pacientes alterado. Funções/políticas preexistentes permanecem com mesmos hashes;
equipe-acessos v8 e bucket/objeto pacientes-fotos preservados.

Fingerprints dos12 conjuntos anteriores: zero registro ausente; cadastros, clínicas,
usuários públicos, vínculos, profissionais, pacientes, identidades Auth, bucket e
arquivo anteriores idênticos. **Um registro auth.users preexistente mudou de hash.**
updated_at avançou durante a execução, último login não avançou; consulta agregada
da trilha Auth desse ator não retornou eventos. Baseline conserva hashes, não campos
anteriores, portanto não permite atribuir origem nem provar quais outros campos
mudaram. Não houve chamada de escrita do agente nesse UUID nem tentativa de revertê-lo.
Diferença registrada como limitação de atribuição, sem alegar imutabilidade de todo Auth.

Auditoria final:34 eventos próprios conferidos; somente campos/evento/revisão,
sem valores pessoais/financeiros, conteúdo documental ou segredos detectados.
Não é inspeção integral de logs de runtime do projeto. Expiração natural de JWT,
expiração/limpeza após o prazo documental, todas as variantes EXIF no Deno hospedado,
malware/assinatura digital e carga permanecem não verificados nesta execução;
testes sintéticos anteriores não foram promovidos a prova de servidor para isso.
E-mails, convites, pagamentos, acessos reais e Ibitiara não foram operados.

Recuperação disponível: fontes/configuração v1 baixadas pela API e definições/ACL
anteriores das seis funções SQL preservadas em artefatos locais ignorados. A v1 contém
o defeito de inicialização, portanto não é recomendação de rollback. Migrations
transacionais revertiam antes do commit; após sucesso, preservar dados e corrigir
aditivamente. Não se promete restauração completa/backup integral do projeto.

Baseline local152: sem arquivo anterior ausente; mudanças limitadas ao kit novo,
correções comprovadas, notas e documentação correlata. Trabalhos de outras tarefas
preservados. Branch codex/resgate-local-2026-09-26,
HEAD eff05f60e07c4042bbb931d1c14d19432612d01d, índice vazio; alterações não commitadas.
Sem commit/push/merge/frontend deploy. Typesafe-ai consultada: tarefa determinística,
sem integração com IA/chave. Jev não chamado por restrição explícita de operar
exclusivamente neste sistema; triagem local do Codex, sem métricas de chamada inventadas.

Próxima ação: usuário conferir os três exemplos conectados; publicação do frontend
31–33 exige outro pedido autorizado. Não reabrir contas técnicas nem repetir execução
encerrada automaticamente. O histórico abaixo descreve a preparação anterior;
proposta Docker/restrições daquela data foram substituídas pelo pedido atual.

## Histórico — preparação offline concluída

Estado: **EM VALIDAÇÃO — pacote preparado offline, servidor real NÃO homologado**.
Inspeção iniciada em05/10/2026; consolidação em06/10/2026, America/Bahia (-03:00).
Branch `codex/resgate-local-2026-09-26`,
HEAD `eff05f60e07c4042bbb931d1c14d19432612d01d`, índice vazio. Sem commit/push/merge/
deploy/SQL no principal. Conferência do agente não é aprovação pessoal do usuário.

## Revisão integrada e problemas encontrados

Relatórios31/32/33, checkpoints, instruções e código relidos. Seguido o caminho
frontend → serviço → Edge/RPC → tabelas/Storage → consulta posterior.16 operações
literais dos serviços localizadas nas migrations selecionadas; nenhuma referência
de função SQL ausente na conferência estática. Não é compilação/execução PostgreSQL.

| Ponto | Evidência no código e preparação | Limite |
|---|---|---|
| Campos e operações | UI/validadores compartilhados, DTOs estritos, ações Edge e RPCs correspondentes | Tipos não provam persistência |
| Foto/recebimento32 | Foto canônica, recebimento por profissional/clínica, máscara, revisão e consultas reais reutilizadas | Execução Deno/Storage/Vault pendente |
| Pessoa/contrato/empresa/unidades | IDs, empregador separado de clínica, conjunto explícito; médico CLT compatível | Sem inventário SQL novo do principal |
| Listagem31 | Usa equipe_listar, foto coletiva autorizada; não solicita salário/contrato/recebimento/histórico geral | Ausência dos valores será reconferida no JSON real isolado |
| Documento33 | Reserva → validação/upload privado → confirmação; sucesso só após arquivo+registro; repetição por ID | Falhas/concorrência em servidor pendentes |
| Substituição | Documento anterior só arquivado na confirmação; falha conserva anterior; arquivo antigo não apagado | Storage real pendente |
| Histórico | Versão exige escopo atual do registro e da versão, vínculo atual e capacidade específica quando pertinente; pessoal/formação exigem administração global atual | Teste preparado revoga vínculo e reconsulta a versão com o JWT existente |
| Proteção | Grants/RLS, RPCs internas apenas serviço, ator obtido por Auth.getUser, origens/limites; documentos sem caminho/hash/URL no JSON | Não declarar segurança homologada só por fonte |
| Ocupacional | Capacidade adicional por todas as unidades, sem concessão automática, campos administrativos limitados | Negativas/admissão/revogação preparadas no ambiente fictício |
| Concorrência/recuperação | Revisão/travas, histórico imutável, tentativa documental idempotente e limpeza só de candidatas comprovadas | Expiração/limpeza efetivas ainda precisam de prova real |

**Não identificado defeito concreto do produto nesta revisão estática. Nenhuma
correção funcional/refatoração foi feita.** Encontrado impedimento de execução:
a pasta Supabase original está linked ao principal; o helper antigo bloqueia esse
alvo e seu texto sobre baseline ausente é histórico/desatualizado. Não foi alterado
nem contornado. Preparado workdir separado com scripts/manifesto e travas próprias.
Simulações permanecem só em testes/demos; a aplicação normal não recebeu fixtures,
mock, seed, troca de serviço ou alteração de configuração.

## Ambiente efetivamente observado

- Aplicação normal3000 respondeuHTTP200; `.env` e link locais apontam ao principal
  `xftnkusbyqzyvzrovroj`. Essa leitura não fez login novo/teste de escrita nem
  comprova os serviços32/33 aplicados. Estado de não aplicação continua o registrado
  nas etapas anteriores; não foi inventariado por SQL nesta execução.
- Docker CLI29.6.2/Desktop e WSL2 presentes; distribuições Ubuntu/docker-desktop,
  virtualização disponível,15,4GB RAM total. Motor Linux ausente/parado também na
  inspeção autorizada fora do sandbox. Portas usuais54321/22/23 sem stack disponível.
- Disco livre observado: C25GB, D12GB. Viabilidade local preliminar; não foi medido
  desempenho/consumo das imagens. Confirmar espaço e requisitos ao iniciar, parar
  diante de impedimento sem instalar/atualizar/configurar automaticamente.
- CLI protegido conseguiu inventário remoto de3 projetos: principal e Geovana
  ativos, terceiro de outro contexto inativo. Nenhum identificado/autorizado como
  homologação desta tarefa. Só metadados; nenhum SQL/dado desses projetos consultado
  ou alterado. Nenhuma sessão Supabase disponível no navegador controlado.
- Ausências: stack PostgreSQL/Auth/Storage/Edge em execução e destino isolado
  autorizado. Psql e Deno no host não são necessários à recomendação: vêm nos
  containers. Não instalar ferramentas adicionais nesta etapa.

## Alternativa recomendada e custos verificados

**Iniciar Docker Desktop já instalado e criar uma stack Supabase LOCAL dedicada**,
com banco/Auth/Storage/Edge/Vault novos e dados exclusivamente fictícios. Workdir
`scratch/equipe-homologacao/ambiente`, identidade `equipe-homologacao-3133`,
API55431, banco55432, Studio55433 e frontend normal5173. Não instalar Docker nem
criar projeto remoto. CLI pode precisar baixar imagens oficiais de containers.

Não há contratação de infraestrutura Supabase remota nessa alternativa; utiliza
o computador. Docker Desktop é gratuito para empresas com menos de250 empregados
**e** faturamento anual menor queUS$10 milhões, além das demais hipóteses oficiais;
elegibilidade/licença da organização não foi auditada. Se houver termos de uso,
aceite pessoal do usuário. [Licença e requisitos Docker](https://docs.docker.com/desktop/setup/install/windows-install/),
[stack Supabase local](https://supabase.com/docs/guides/local-development/cli/getting-started).

Alternativa remota, não recomendada como primeiro passo: novo projeto vazio
independente, sem copiar/restaurar principal. FreeUS$0/mês,500MB banco/1GB Storage,
limite2 projetos ativos e pausa após uma semana inativa; disponibilidade dessa cota
não confirmada para a organização. Pro desdeUS$25/mês por organização, projeto
adicional desdeUS$10/mês, sujeitos a consumo/impostos/câmbio. Não inferir plano por
statusACTIVE_HEALTHY, não pausar projetos nem usar o terceiro inativo. Qualquer plano
pago/criação remota exigiria autorização distinta. [Preços oficiais Supabase](https://supabase.com/pricing).

Autorização ainda necessária: iniciar o motor instalado, baixar imagens necessárias
e criar/executar **somente** a stack local dedicada e testes fictícios. O pedido
atual veda modificar infraestrutura nesta execução; esta preparação não fez isso.

## Pacote reproduzível e dependências exatas

[Scripts, proteção, comandos futuros e recuperação](../../../database/tests/equipe/homologacao-31-33/README.md).

As migrations são copiadas sem alteração, apenas em diretório isolado vazio:

1. `20260915010000_preflight_executor.sql` — executor/PostgreSQL17/instalação nova.
2. `20260915010001_btree_gist.sql` — pgcrypto e btree_gist.
3. `20260915010002_baseline_instalacao_nova.sql` — DDL real, Auth externo/Vault,
   usuários/clínicas/profissionais/auditoria/roles/RPCs e tabelas legadas; sem dados.
4. `20260915010003_acls_default_privileges.sql` — ACLs/default privileges.
5. `20260915010004_hardening_geral.sql` — helpers CPF/Vault/capacidades.
6. `20260924120000_pacientes_cpf_pendente_rpc.sql` — provê pacientes_cpf_valido usado
   pela Equipe; aplicação somente no banco vazio fictício, sem pacientes reais.
7. `20260928153000_equipe_cadastro_edicao.sql` — membros/projeção/vínculos/cadastro.
8. `20260929120000_equipe_gestao_acessos.sql` — conta/vínculo/convite/acesso separados.
9. `20260929190000_equipe_gestao_acessos_correcoes.sql` — contratos vigentes corrigidos.
10. `20260930100000_equipe_convites_expiracao_recuperacao.sql` — estado vigente.
11. **32:** `20261005170000_equipe_fotos_recebimento.sql`.
12. **33:** `20261005210000_equipe_fichas_documentos.sql`, depende32.

Bootstrap **somente do pacote de testes**, anterior às12: marcador privado, extensão
Vault/pgcrypto e cpf_key/cpf_pepper gerados no banco isolado. Não integra migration
de produção. Não usar seed.sql real, copiar dados ou todas as migrations pendentes
por conveniência. Não alterar baseline/migration32/33 ou objetos de Caixa.

Funções servidas: `equipe-recursos/index.ts` e `equipe-fichas/index.ts`; cadeia
`_shared/equipeFoto.ts`, `equipeRecebimento.ts`, `equipeRecursosServico.ts`,
`equipeFicha.ts`, `equipeDocumento.ts`, `equipePdf.ts`; dependência de origens em
`equipe-acessos/conviteAuth.ts` (copiada, sem servir fluxo de convites/SMTP).
NOTICEs preservados. SupabaseJS2.111.0, ImageScript1.3.0, pdf-lib1.17.1 fixados nas
Edges; CLI local2.110.0, PostgreSQL17/EdgeDeno2 no config. Dependências frontend31
existentes: TanStack9.2.6/cn0.4.0/CVA0.7.1/lucide1.52.0 e BaseUI1.8.0. Nenhuma
dependência nova instalada. As versões de imagens efetivamente baixadas ainda
precisam ser inventariadas quando o stack iniciar.

Config isolado `verify_jwt=false` só nas duas Edges, que fazem Auth.getUser e
autorização reais; não confiar no gateway legado para JWT assimétrico. Não alterou
configuração remota/raiz. [Autenticação de Edge Functions](https://supabase.com/docs/guides/functions/auth).

Arquivos do pacote: manifesto.mjs/config.toml/ambiente.mjs/fixtures.ts/real.ts/
frontend.mjs/interface.mjs/ui.real.spec.ts/playwright.config.ts/catalogo.sql/
seguranca.test.mjs/revisar.mjs/tsconfig.json/README.md. Manifesto/hash gerados
ignorados em scratch, com confirmação de origem antes de comandos. Nenhum segredo
em arquivos versionáveis; credenciais sintéticas só no destino ignorado.

## Matriz de evidências

| Grupo | Aprovado em ambiente real | Simulado/local anterior | Preparado/pendente agora |
|---|---|---|---|
| Listagem31/busca/ficha/tipo/CPF | Leitura conectada histórica Brotas/Ipupiara no31; hojeHTTP200 | Paginação múltipla/erros controlados/avatar fictício | Reconferência integrada normal5173/Ipupiara manual |
| Fotos | Nenhum upload/troca/remoção homologado | Codec real em Node; UI/mock32 | Enviar/relogin/substituir/falha/remoção/negativas reais |
| Recebimento | Nenhuma escrita/leitura nova homologada | Validador/máscara/codec/portas/UI sintéticas | PIX/conta/ambos/unidades/relogin/conflito/perfis/listagem/logs |
| Fichas/contratos/jornada/formação | Nenhuma persistência real33 |18 cenários novos de UI e20 testes33 anteriores | Três tipos de pessoa, histórico, concorrência e escopos reais |
| Documentos | Nenhum arquivo/registro real homologado | Parser PDF real Node, UI IndexedDB e falhas mockadas | Confirmação/binário/relogin/conferência/substituição/repetição/falha parcial |
| Autorização/Storage/histórico | Sem homologação real32/33 | Código/RLS estático e negativas simuladas | Cinco identidades+sem JWT, tabela/RPC/objeto/IDs/escopo/revogação atual/ocupacional |
| URLs/expiração | Não verificado em servidor | Não são emitidas signed URLs; blobs locais revogados | Pública/assinada negadas, token vencido sintético assinado; tempo Auth/limpeza continuam pendentes |
| Auditoria/Vault/logs/Deno | Não executados | Código/tipos/portas/verificações anteriores | Catálogo real, ciphertext/mascaramento/auditoria/logs; integridade completa contextual |

Nesta preparação passaram3 testes de travas, tipos TypeScript e lint do pacote, sintaxeJS,
preparação offline e mapa estático de16 RPCs.38 testes determinísticos/61 cenários
UI anteriores continuam evidência anterior, não foram repetidos. Build/tipos/lint
do produto aprovados na33 às20:35 continuam anteriores: fonte de produto preservada.
**27 cenários conectados e7 de UI foram apenas escritos/preparados, NÃO executados.**
Sem “approved_real” registrado por preparação. UI sem screenshot/trace/vídeo de
campos sensíveis. O caso parcial monta reserva/upload reais com serviço só como
controle da interrupção; recuperação/repetição são pelo JWT da pessoa em sessão
nova. Não declarar testado timeout real da Edge ou toda limpeza/expiração por isso.
Todos os papéis do usuário exercitam os caminhos reais, não apenas service_role.

## Ordem futura, recuperação e publicação

1. Obter autorização específica da alternativa local; iniciar motor e stack dedicada.
   Não alterar principal, link raiz ou Geovana. Parar se runtime/disco/config faltar.
2. Aplicar bootstrap/dependências/32/33 **apenas no vazio isolado**; verificar objetos vivos
   e rodar catálogo + verificar-integridade.sql contextual, sem expor Vault/valores.
3. Servir duas funções, gerar identidades via Admin API/pessoas pela RPC real; rodar
   27 casos e frontend normal/sete UI, completar Ipupiara pela interface e pendências
   de expiração/limpeza/limites Deno. Cada falha reabre cenário; não marcar por build.
4. Recuperação mantém journal/idempotência/revisões/arquivos anteriores; não repetir
   migrations sobre estado parcial nem apagar dados para esconder defeito. Consultar
   inventário/resultado sanitizado e retomar cenário pertinente.
5. Só depois de aprovação técnica real, preparar proposta separada de publicação:
   compatibilidade/objetos do principal pelo canal autorizado, aplicação apenas32/33
   (dependências anteriores já existentes não rerodadas), integridade, Edges,
   frontend31–33/notas/release e conferência nas duas clínicas. Commit/push/deploy
   exigem pedido futuro; nada disso autorizado/executado aqui.
6. Descarte futuro: confirmação específica, inventariar/remover somente recursos
   com ID da stack e pasta de fixtures; preservar evidência sanitizada. Parar hoje
   não apaga dados. Sem prune global nem recursos dos demais sistemas.

## Preservação e skills

Baseline desta tarefa135 arquivos dirty/untracked anteriores, com hashes antes de
editar. Antes da consolidação documental135 idênticos/0 ausentes. Ao encerrar, a
comparação final registra127 idênticos/8 documentos relacionados atualizados/0 ausentes;
produto, migrations31–33, Caixa, SMTP, ReUI e outros trabalhos preservados.
README/índice/checkpoints e relatórios31/32/33 remetem a este registro, mantendo
histórico. Não alterada nota de evolução: não há funcionalidade nova nesta etapa.

Documentos anteriores atualizados: `CHECKPOINT.md`, `docs/ia/CHECKPOINT.md`,
`docs/ia/INDICE.md`, `docs/modulos/equipe/00-README-EQUIPE.md`,
`docs/modulos/equipe/08-CHECKPOINT.md`, `docs/modulos/equipe/31-REUI-DATA-GRID.md`,
`docs/modulos/equipe/32-FOTOS-RECEBIMENTO.md` e
`docs/modulos/equipe/33-FICHAS-CONTRATOS-DOCUMENTOS.md`. Novos: este relatório34 e
os14 arquivos do pacote enumerados acima. Manifesto/cópias/evidência offline ficam
apenas em scratch ignorado; nenhuma fixture ou resultado real foi criado.

TypeSafe consultada: determinístico, sem IA/OCR/integração/chave no produto. ReUI
reavaliado sem benefício de nova consulta/instalação nesta preparação, interface31
preservada. Jev uma triagem sintética: code_change/confiança0,85; complexidade1,98/2/
confiança0,96; falta essencial0,37 incerta, investigação decidida pelo Codex.
873 entrada/119 saída,985,5145ms,US$0,000036666; nenhum arquivo/dado privado enviado.

Nenhum cadastro/documento/convite/acesso/pagamento real alterado. Sem SQL em qualquer
banco nesta preparação, alteração de infra, publicação ou aprovação pessoal atribuída.
Próxima ação: autorização única para iniciar a stack LOCAL recomendada e homologar.
