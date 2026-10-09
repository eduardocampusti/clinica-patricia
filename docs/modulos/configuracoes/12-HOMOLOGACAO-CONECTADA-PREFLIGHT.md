# Configurações — conferência conectada e interrupção antes de escrita

Estado: EM VALIDAÇÃO. 08/10/2026, 20:17 -03:00 (America/Bahia).
Alvo exclusivo: `xftnkusbyqzyvzrovroj`; URL de `.env` e referência vinculada
reconferidas. Branch `codex/equipe-fase2-2026-10-07`, HEAD
`ad49386105b3ea19b10b11a4e40c31983ae38d69`, alterações não commitadas, índice vazio.

## Autorização e resultado

O titular autorizou aplicação seletiva/homologação do backend de Configurações,
publicação de somente suas duas Edge Functions e o mínimo de novas contas fictícias,
sem e-mails, apenas com vínculos temporários em Brotas/Ipupiara. Essa autorização
substitui a proibição de novas contas do roteiro11 **somente nesta etapa**. Não
autoriza administração global, reutilizar técnicas encerradas, alterar dados/identidade
reais com fixtures, aplicar acesso direto, publicar frontend, commit ou push.

**Aplicação interrompida antes de qualquer escrita remota por incompatibilidade
concreta:** a Edge privada exige `public.acesso_direto_exigir_sessao()`, ausente no
banco. Nenhuma migração ou função publicada nesta execução; nenhuma conta, vínculo,
sessão, rascunho, versão, upload ou concessão criada. A proteção não foi retirada.
Não é falha de canal/autorização: a CLI oficial autenticada funcionou.

**Informado pelo titular:** PDF revisado conferido externamente nas três páginas,
sem reprodução do espaçamento anterior. Aceite externo registrado; não foi feita
nova rodada estética ou repetição de testes locais previamente aprovados.

## Provas conectadas efetivamente obtidas

CLI já instalada `2.110.0`, autenticação legítima existente, canal oficial
CLI/Management API explicitamente permitido pelo pedido atual, somente este ref.
Nenhum novo login administrativo, credencial solicitada, impressão de chave ou
tentativa de contornar proteções Windows/navegador. Não foi necessário tentar
novamente o navegador com falha conhecida. Leituras de catálogo entre 20:11 e
20:13 -03:00; primeira consulta registrada pelo servidor às
`2026-10-08 23:11:10.006563+00`, PostgreSQL17.6.

| Conferência | Resultado observado |
| --- | --- |
| Alvo | `.env` real e `supabase/.temp/project-ref` correspondem a xftnkusbyqzyvzrovroj; consultas vinculadas e lista de funções com ref explícito |
| Fonte institucional | `clinicas` possui as 13 colunas anteriores; nenhuma das 14 colunas desta proposta existe |
| Permissões da fonte | RLS ativa; política SELECT `clinicas_isolamento`, `id IN (SELECT clinicas_do_usuario())`; função lê apenas vínculos ativos do auth.uid; ACLs de tabela/colunas preservadas no inventário |
| Dependências da Equipe | `equipe_ficha_escopo(uuid[],uuid,uuid,boolean)`, `equipe_recebimento_decifrar(bytea)` e `eh_proprietaria(uuid)` presentes; assinatura/defaults/definições/ACLs consultados |
| Clínicas | Brotas `7c2a450d-7b9a-4701-8d5a-982eda331c58` e Ipupiara `80543c56-328d-400d-89a0-bd6d9352d9c5` ativas; metadado histórico Ibitiara inativo, sem alteração |
| Cinco tabelas institucionais | `configuracoes_globais_autorizacoes`, `configuracoes_escopos`, `configuracoes_versoes`, `configuracoes_ativos`, `configuracoes_publicas` ausentes via catálogos/to_regclass |
| Objetos homônimos | Existem `configuracoes_alertas_financeiros` e `configuracoes_financeiras_clinica`; são de outro recurso e não foram alteradas nem consideradas prova da migração institucional |
| Funções/bucket | Nenhuma função `public.configuracoes_%`; bucket `institucionais` ausente |
| Histórico de migrações |38 registros consultados; 20261008213000/20261008230000/20261008230100 ausentes. Conclusão de não aplicação baseada também nos objetos/colunas/funções, não somente no histórico |
| Primeiro acesso | Schema `acesso_direto` ausente; nenhuma função pública `acesso_direto_%`; RPC obrigatória ausente |
| Serviços publicados | Apenas equipe-acessos v8/JWT=true, equipe-recursos v3/JWT=false, equipe-fichas v3/JWT=false e meu-perfil v2/JWT=true, todos ACTIVE; Configurações privada/pública ausentes. Nenhum serviço de outro módulo publicado |
| Recuperação | Constraints e trigger existentes de clinicas preservados em snapshot; nenhuma view pública dependente de clinicas encontrada pela consulta de dependências; default privileges consultados |

As consultas usaram o papel administrativo para **inventário**, sem simular sessões
de usuário nem alegar prova de autorização por papel. Não consultaram linhas de
pacientes, prontuários, valores financeiros, empresas reais ou dados pessoais de contas.
O catálogo de esquemas/migrações de outros módulos não foi usado para ler seus cadastros.

## Dependência concreta com acesso direto

`supabase/functions/configuracoes/index.ts` importa `_shared/guardaAtivacao.ts`.
Após `auth.getUser`, chama a guarda; esta exige retorno booleano true da RPC
`acesso_direto_exigir_sessao`. RPC ausente produz erro e o serviço converte em
HTTP403 **antes de consultar, salvar, restaurar ou enviar imagem**. É conclusão
pelo código e pela ausência conectada; não é uma requisição de sessão testada,
pois o serviço não está publicado e nenhuma conta foi criada.

A RPC é definida na proposta separada `20261008230000_equipe_acesso_direto.sql`
e depende de `acesso_direto_sessao_permitida`, do schema/tabela de operações e de
sessões Auth. A proposta `20261008230100_equipe_acesso_direto_protecoes.sql`
instala restrições em tabelas/Storage/views e RPCs SECURITY DEFINER. Nenhuma está
aplicada. Criar só uma RPC retornando true, omitir a chamada ou instalar qualquer
parte dessa etapa como dependência implícita retiraria/alteraria a proteção ou
aplicaria backend expressamente excluído. Essas alternativas não foram executadas.

O inventário de proteções da etapa separada também precisa cobrir as duas RPCs
autenticadas novas (`configuracoes_timbrado_consultar` e
`configuracoes_ativo_leitura_autorizada`) e os objetos novos de Configurações.
Se proteções forem instaladas antes deles, a revisão responsável terá de preparar
cobertura específica dos objetos novos, sem reaplicar migrações anteriores.
Esta dependência exige coordenação da etapa própria antes da ativação, conservando
as migrações separadas. `ACESSO_DIRETO_HABILITADO` e
`BACKEND_CONFIGURACOES_HABILITADO` permanecem false; o frontend não foi alterado.

## Isolamento da aplicação e da identidade pública

Rascunhos/uploads podem ser testados sem aplicar, mas ficam no escopo verdadeiro
da clínica; histórico/ativos são intencionalmente permanentes. Não são um ambiente
de teste separado. O pacote só permite unidades ativas Brotas/Ipupiara; projeção
pública só aceita os slugs dessas unidades, e a Edge pública só aceita os dois
domínios autorizados. Não há parâmetro, namespace ou domínio de homologação.

**Operação exata que não será executada com fixtures em produção:**
POST `/functions/v1/configuracoes` por sessão Proprietário(a) da própria unidade,
corpo `{acao:'aplicar',escopo:<UUID da unidade>,documento:<documento fictício
validado>,revisao:<revisão relida>,geralRevisao:<revisão geral relida>,
fonteRevisao:<hash da fonte relida>}`. Para Brotas o UUID é
`7c2a450d-7b9a-4701-8d5a-982eda331c58`; para Ipupiara,
`80543c56-328d-400d-89a0-bd6d9352d9c5`. O serviço prepara a projeção pública e
chama `configuracoes_salvar_interno` na mesma operação.

Impacto: atualiza os campos oficiais de `clinicas`, campos/variações aplicados e
ponteiro de versão; grava versão/auditoria e substitui `configuracoes_publicas`
do slug real. Passaria a ser lido pelo domínio real e pelo PDF financeiro por
unidade quando seus consumidores forem ativados. Hoje a flag do frontend permanece
false, mas a projeção de produção ainda seria substituída. Repor depois exigiria
uma nova versão e não apagaria o histórico; isso **não satisfaz** a exigência de
não substituir informações oficiais nem identidade real por dados fictícios.

Para comprovar aplicação/publicação fictícia sem esse impacto, falta um contexto
de homologação isolado no próprio projeto, com autorização, persistência e leitura
pública próprias, sem escrita em `clinicas`/projeções reais nem novo tenant.
Essa adequação deve ser preparada/revisada explicitamente antes da operação;
não foi criada como alteração adicional silenciosa. Não foi escolhida identidade
real para copiar/aplicar só para obter um teste aprovado.

## Operações seletivas pendentes e recuperação

Migração revisada: `supabase/migrations/20261008213000_configuracoes_institucionais.sql`,
SHA256 `b1226c368784aed56a042227e497b4caabd685e9f8cf7e12904d736a3da661fc`.
Fonte conservada, sem edição neste atendimento. Alvos planejados: 14 novas colunas
e FK em clinicas; cinco tabelas institucionais com RLS/ACLs; 11 funções; dois
triggers de imutabilidade; três políticas (uma restritiva anon em clinicas, duas
de leitura de ativos); bucket privado5MB PNG/JPEG. Não altera valores institucionais
na aplicação do DDL, não cria conta/concessão global, não muda tabelas financeiras.
DDL pode adquirir locks; não foi medida sua duração em produção.

Após resolver os dois impedimentos acima e repetir o preflight fresco, operações
previstas, **não executadas**; sintaxe conferida na ajuda da CLI instalada:

```powershell
node node_modules/supabase/dist/supabase.js db query --linked --file supabase/migrations/20261008213000_configuracoes_institucionais.sql --output-format json
node node_modules/supabase/dist/supabase.js db query --linked --file supabase/tests/configuracoes_pos_aplicacao.sql --output-format json
node node_modules/supabase/dist/supabase.js db query --linked --file supabase/tools/verificar-integridade.sql --output-format json
node node_modules/supabase/dist/supabase.js functions deploy configuracoes --project-ref xftnkusbyqzyvzrovroj --use-api
node node_modules/supabase/dist/supabase.js functions deploy configuracoes-publicas --project-ref xftnkusbyqzyvzrovroj --use-api --no-verify-jwt
```

Não usar `db push`, deploy sem nomes ou `--prune`. Confirmar novamente alvo,
hashes/compatibilidade e imports Deno antes de escrever. Catálogos de todos os
objetos/ACLs/políticas/triggers/bucket devem ser reconferidos; arquivos com vários
SELECTs exigem capturar todos os resultados, não tratar só o último como validação.
Se uma aplicação retornar resultado incerto, consultar objetos antes de qualquer
nova execução. Registro operacional/histórico deve acompanhar os objetos realmente
criados; nenhuma migration anterior deve ser enfileirada por consequência.

Recuperação preparada por cenário:

1. Antes do COMMIT: a migração contém BEGIN/COMMIT, e erro deve desfazer sua
   transação. Confirmar no catálogo em caso de perda da resposta; não repetir cegamente.
2. Depois do DDL, com falha de serviço/teste: manter consumidores desabilitados,
   suspender as novas contas e vínculos da etapa, revogar sessões, retirar somente
   os novos endpoints se precisarem ser interrompidos. Ambos estavam ausentes,
   portanto não há versão anterior de Configurações a substituir. Nenhuma
   definição/configuração de serviço de outro módulo precisa ser alterada.
3. Preservar novas versões, ativos e auditoria; não usar DROP de tabelas/bucket ou
   apagar imagens históricas como rollback automático. Se houver necessidade de
   reverter a estrutura/política, usar inventário anterior e revisar dependências/
   dados posteriores antes de preparar a operação seletiva. A recuperação que
   ampliaria acesso anônimo ou eliminaria histórico não será automática.

Snapshot local ignorado e sem credenciais:
`scratch/configuracoes-conectada/preflight-remoto.json` (colunas, RLS/ACLs,
políticas, quatro definições de dependências, serviços e histórico),
`recuperacao-remota.json` (constraints/triggers/views/default privileges),
`fontes-revisadas.json` (hashes de 11 fontes/arquivos de apoio),
`fontes-antes.json` (877 arquivos não ignorados). Não é backup dos valores
institucionais, dos arquivos históricos ou de toda a base; não afirma recuperação
de dados que não foram exportados. Como não houve alteração remota, não existe
operação de recuperação necessária desta execução.

## Testes e contas: situação real e preparação

| Cenário exigido | Situação nesta execução |
| --- | --- |
| Salvar, recarregar e recuperar dados | Não executado: serviço/RPC obrigatória ausentes |
| Isolamento bilateral e edição sem autorização | Não executado com sessões; metadados/definições de permissões conferidos somente |
| Herança/vazio deliberado e negação global | Não executado; nenhuma concessão global criada |
| Upload, leitura/substituição e ativos anteriores | Não executado; bucket/serviço ausentes |
| Histórico, restauração e conflito entre edições | Não executado; tabelas/serviço ausentes |
| Aplicação/leitura anônima dos campos permitidos | Não executado; contexto público de teste isolado ainda necessário |
| Login com serviço/imagem indisponível | Provas locais anteriores preservadas; nenhuma nova prova conectada deste frontend |

Não apresentar leitura administrativa de catálogo, inspeção de fonte, build ou
mock como prova desses cenários. Testes de PostgreSQL/Deno/Storage da nova proposta,
pós-aplicação e script transversal de integridade **não foram executados**,
pois nenhuma mudança de esquema foi feita e o preflight interrompeu a etapa.

Preparação mínima futura: duas contas NOVAS exclusivas `configuracoes-a-<execucao>@example.invalid`
e `configuracoes-b-<execucao>@example.invalid`, confirmadas por Auth Admin sem e-mail,
nenhum privilégio global. A: Proprietário(a) apenas Brotas; B: Proprietário(a)
apenas Ipupiara. Após provas bilaterais, o vínculo **fictício novo** de B pode ser
temporariamente reduzido a Recepção de Ipupiara, com nova sessão para provar recusa
de consulta/edição/upload/restauração; depois desativado para provar falta de vínculo.
Assim não é obrigatória uma terceira conta nem papel Médico para o aceite solicitado.
Contas anteriores permanecem intocadas. IDs reais/vínculos/timestamps da execução
devem ser registrados só quando forem efetivamente criados.

Usar sessões Auth reais via mecanismo oficial sem envio de e-mail, tokens apenas
em memória. Salvar rascunhos/fixtures e conferir estado oficial sem alterar; testar
dois clientes com a mesma revisão, vazio deliberado, preservar imagem de versão
anterior e restauração como rascunho. Não editar empresas/contas/dados reais.
Aplicação/publicação fictícia só depois de resolver o isolamento acima.

Ao encerrar uma futura homologação: bloquear exatamente os IDs novos via Auth
Admin, `usuarios.ativo=false`, desativar seus vínculos, revogar sessões Auth e
refresh tokens por mecanismo oficial, confirmar contagens restritas aos IDs
novos e testar nova autenticação/refresh/operação recusados. Registrar validade
residual dos JWTs efetivamente emitidos (não presumir revogação imediata do JWT),
URLs assinadas e cache público, mantendo bloqueio por conta/vínculo/guarda e
histórico. Não apagar auditoria/versões/ativos referenciados; qualquer descarte
precisa de inventário dos resíduos próprios sem referências.

**Encerramento atual:** zero contas criadas, zero vínculos temporários, zero sessões/
tokens emitidos e zero uploads. Nada a bloquear/revogar/remover nesta etapa.
Não se reconferiu nem alterou contas reais ou técnicas encerradas em etapas antigas.

## Frontend e próxima ação

Coordenação conferida ao encerrar: chat **Planejar acesso para novo membro** está
revisando localmente o backend de acesso direto, também sem autorização de aplicação
daquela etapa. A comparação dos877 arquivos apontou alterações simultâneas em seu
componente, helper/Edge, migração própria, plugin de autenticação do servidor,
adapter de Equipe e testes. `supabase/config.toml` recebeu apenas a declaração
do seu serviço; declarações/JWT dos dois serviços de Configurações preservados.
Nenhuma dessas contribuições foi sobrescrita ou atribuída a esta implementação.
Não foram enviadas mensagens para aquela tarefa, alterados login/rotas ou executadas
mudanças de acesso direto por esta sessão. Hashes da migração e dos dois serviços
de Configurações permanecem iguais ao inventário; o snapshot de fontes compartilhadas
é datado, não deve substituir o arquivo atual da outra revisão. Comparação final
e caminhos identificados guardados em `preservacao-final.json` e
`contribuicao-simultanea.json`, no scratch desta etapa.

A tarefa simultânea continua alterando testes de Equipe. Comparação global
permanece uma fotografia datada, com diferenças adicionais registradas, e não
certifica árvore inteira congelada/preservação por igualdade de todos os arquivos.
Foram conferidos separadamente os hashes das fontes próprias, flags false,
declarações/JWT de Configurações, índice vazio e referências documentais. Não
restaurar testes/arquivos da outra tarefa para coincidir com o inventário inicial.

Reconferência remota após detectar atividade simultânea, às20:19:45 -03:00:
schema/RPC de acesso direto e escopos/projeções de Configurações continuam ausentes;
os quatro serviços existentes mantêm versões/JWT/status anteriores. Resultado em
`scratch/configuracoes-conectada/reconferencia-final.json`. Nenhuma escrita remota
executada por esta sessão. O estado continua sujeito a nova conferência ao retomar.

Nenhum pacote de frontend liberado para publicação: critérios conectados não
passaram porque não puderam começar. Código/PDF/UI atuais e trabalho de acesso
direto preservados; duas flags false; sem commit, push ou deploy de frontend.
Ao retomar, primeiro resolver em etapa própria a dependência de sessão e
preparar isolamento da homologação; depois repetir somente preflight afetado,
aplicar seletivamente Configurações, publicar seus dois serviços, testar com
sessões e encerrar acessos. Somente após aceite conectado, habilitar flag de
Configurações localmente e congelar seleção de frontend/trechos compartilhados,
hashes, notas/versão e testes dirigidos antes de solicitar publicação separada.
A autorização de Configurações foi registrada; não foi solicitado repeti-la.

## TypeSafe e verificações locais

Skill typesafe-ai completa e [índice oficial](https://docs.typesafe.ai/llms.txt)
consultados. Homologação determinística: nenhuma IA ou dependência introduzida
no produto. Jev recebeu somente resumo sintético: code_change/confiança0,51,
complexidade1,64/2/confiança0,46, probabilidade0,54 de faltar informação essencial;
respostas incertas, Codex decidiu iniciar leituras e interromper pelo catálogo
comprovado.903 tokens de entrada+119 saída,710,823ms,US$0,000037926. Nenhum arquivo/
dado privado enviado; economia de tokens não medida.

Fontes oficiais para os canais/mecanismos preparados:
[CLI](https://supabase.com/docs/reference/cli/introduction),
[bloqueio de conta](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid),
[encerramento de sessão](https://supabase.com/docs/reference/javascript/auth-signout).
