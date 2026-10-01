# Edição de data e horário — implementação e publicação

Estado: implementação local concluída; migration aplicada no principal; gravação real pela interface ainda não ensaiada. Atualizado em 01/10/2026, 15:40 -03:00 (America/Bahia).
Branch `codex/resgate-local-2026-09-26`, HEAD `9512aed39d554b4d8eeb9ff8fa1bf66b5658ca03`.
Alterações anteriores preservadas. Cabeçalhos e blocos datados abaixo conservam os
estados da implementação; a seção mais recente distingue publicação de validação real.

## Publicação autorizada — 01/10/2026

Usuário autorizou commit seletivo, push normal e deploy pelas duas integrações existentes.
MCP confirmou repositório eduardocampusti/clinica-patricia, branch
codex/resgate-local-2026-09-26 e auto-deploy habilitado em ambos. Git remoto e HEAD
coincidiram em 9512aed39d554b4d8eeb9ff8fa1bf66b5658ca03. Migration já aplicada: somente
versionar o arquivo correspondente, sem execução SQL/migrations adicionais nesta rodada.

Versão anterior para recuperação: Brotas build 01a0f7dd-2714-711b-92a4-07c39ca639b0;
Ipupiara build 01a0f7dd-2719-7323-ba2a-fce4125b338a; ambos completed no SHA 9512aed.
Preservados preset Vite, Node22, npm/build, dist e raiz existente. Não trocar integração,
variáveis, DNS, SMTP ou banco. Se necessário, selecionar a implantação anterior no histórico
do respectivo site, quando a opção existir; alternativa versionada: reverter apenas este
commit funcional por commit normal, revisar e redeploy na mesma branch, sem força/reset.
Não reverter migration ou dados automaticamente; nenhuma reversão foi executada.

Escopo do commit: Agenda, EditarAgendamento, nota de evolução pertinente, teste de edição,
ensaios SQL sintéticos/catálogo/recuperação e concorrência, documentos da Agenda e registro
de integridade da aplicação. Checkpoint operacional/índice e alterações anteriores de
memória/Equipe/Pacientes/Sistema ficam locais fora do commit, sem sobrescrita. Scratch,
.env, credenciais, snapshots e dados reais não são incluídos.

**Verificações para publicação em 01/10/2026, 15:54 -03:00:** build/lint aprovados,
avisos existentes ThemeProvider/import dinâmico/chunks; 60/60 testes dirigidos (42 edição,
18 chegada), desktop/tablet/celular, respostas interceptadas. .htaccess presente em dist;
diff sem erros de whitespace; varredura de indicadores de segredos sem ocorrência nos
16 arquivos selecionados. Ensaios SQL isolados anteriores aproveitados, código SQL
inalterado; sem repetir ensaios de banco ou gravar em produção. TypeSafe não pertinente.
Commit/deploy em preparação: não confundir esses resultados com publicação concluída.
Gravação legítima/persistência real pendentes para conferência pelo usuário no site publicado;
essa limitação conhecida não impede esta publicação e não será registrada como aprovação.

## Aplicação específica — 01/10/2026, 15:37 -03:00

O usuário autorizou excepcionalmente SQL Editor no navegador Codex para catálogo,
aplicação desta migration e pós-verificação. Essa exceção não altera a regra permanente
de isolamento do documento 04. Projeto confirmado pelo painel/URL e configuração local:
`xftnkusbyqzyvzrovroj`, Clinica Patrícia, main PRODUCTION. Antes: última versão
`20260930100000`; esta versão e suas quatro funções inexistentes. Dependências, colunas,
constraint GiST, trigger de duração, políticas e grants compatíveis. O WITH CHECK remoto
inclui paciente da clínica e profissional vinculado ativo: reproduzido e aprovado no
laboratório sob role authenticated/claim sintético (`agenda_lab_politica_remota.sql`).

**Aplicada somente 20261001120000_agenda_corrigir_horario.sql**, com corpo executado e
registro do histórico na mesma transação, não marcação de execução inexistente. Executor
restrito em scratch/agenda-aplicar-exclusivamente.sql, ensaiado no laboratório; aborta
se a versão já existir ou o histórico mudar. Nenhum db push geral/outra migration.
Arquivo local SHA-256 `14A9EA4891DF8B37D790F8BF5A14AD871335AC8486EDE8453EB6D53E2724D655`.
Cabeçalho de preparação do SQL preservado como histórico da revisão, não estado atual.
SQL registrado remotamente corresponde ao corpo local normalizando espaços/formatação
do editor; BEGIN/COMMIT ficaram no executor externo único.

**Conferência conectada posterior, somente catálogo:** quatro funções nas assinaturas
previstas; RPCs invoker, EXECUTE authenticated sim/anon não; funções de trigger definer
sem EXECUTE direto authenticated/anon, search_path pg_catalog/public; dois triggers novos
habilitados e cálculo preexistente preservado. RLS continua ativa; políticas e constraint
de sobreposição preservadas. Não é teste de escrita com sessão Supabase de Recepção.
Executadas todas as consultas de `supabase/tools/verificar-integridade.sql`, sem erro;
resultado agregado final, sem leitura de documentos ou prontuários. A inspeção não equivale
a restauração testada nem comprova todos os fluxos do sistema.

### Proteção e recuperação

Catálogo anterior exportado e copiado para
`scratch/backups/agenda-20261001-1522/catalogo-antes.csv`, ignorado pelo Git;
SHA-256 original/cópia iguais:
`DD9CBEBD4595556FACB7B3505C9EA412C295AD392DB5AD5946D7E5A07A2BF5E9`.
Cobertura: colunas críticas, constraint, cálculo/helper, políticas, grants e últimas
12 versões. Sem registros operacionais, Auth, arquivos ou chaves; **não é backup completo
nem restauração validada**. Exportação inicialmente retornou timeout no navegador, mas
arquivo baixado foi localizado, parseado e conferido antes da alteração.
Catálogo posterior: `scratch/backups/agenda-20261001-1522/catalogo-depois.csv`, hash
`4324EACFA54BE6D13CC75885CE5F918C018E6900E5CBB5A55E393277BF52F02C`.
Recuperação compensatória preparada em `supabase/tests/agenda_correcao_recuperacao.sql`,
não executada: exige revisão/autorização futura, remove apenas os novos objetos e não
desfaz horários, pagamentos ou auditoria. Não apagar o histórico aplicado nem restaurar
horários em massa. Retirada das guardas tem impacto de segurança e precisa ser revisada.

Nenhum paciente/agendamento real criado ou alterado; nenhuma limpeza remota necessária.
Laboratório sintético encerrado novamente, arquivos preservados em scratch. Sem commit,
push ou publicação; HEAD 9512aed. Frontend novo continua somente local. Falta comprovar
correção legítima e persistência pela interface; Ipupiara autenticada não validada nesta
etapa. Não usar esta inspeção ou ensaio com claim simulado como homologação Auth real.

### Conferência conectada da interface — 15:40 -03:00

Prévia desta pasta em http://127.0.0.1:3000/sistema/brotas/agenda, sessão real Recepção,
clínica Brotas. Nova aba preservou sessão e rota; lista independente e lista de espera
distintas. Editar aberto após instalação: carregamento de capacidade terminou e aviso
de operação ausente deixou de aparecer, conforme caminho pronta do componente. Serviço
instalado reconhecido sem fallback de UPDATE. Disponibilidade respondeu com orientação
“Horário fora da disponibilidade”; Salvar desabilitado por essa regra e confirmação
ainda não preenchida, não por ausência da migration. Fechado por Cancelar, sem alteração
de campos, envio ou captura com dados pessoais. Ipupiara real não conferida.

Uma primeira aba antiga retornou timeout de foco do navegador; utilizada nova aba no
mesmo navegador/sessão, sem contornar autenticação. Atualizações locais causaram recarga
durante a primeira abertura; conferência final repetiu somente abertura/cancelamento.
Sem teste de escrita ou persistência real. Esse limite é intencional: nenhuma autorização
para corrigir um agendamento real específico foi dada. Prévia mantida disponível.

**Para conferir:** Agenda → Agendamentos do dia → Editar agendamento (ou menu do cartão).
Brotas: http://127.0.0.1:3000/sistema/brotas/agenda.
Ipupiara: http://127.0.0.1:3000/sistema/ipupiara/agenda (login próprio/vínculo necessário).
A prévia usa o principal: salvar altera dados reais. Conferir somente uma correção
legítima, com expediente válido; comparar horários, informar motivo, confirmar e salvar
uma vez. Esperado alerta verde “Agendamento atualizado”; se data mudar, Ver na nova data;
recarregar para conferir. Resultado ambíguo: não repetir, consultar antes de agir.
Publicação é etapa separada ainda não autorizada nesta rodada. TypeSafe não pertinente;
Supabase skill indisponível, referências oficiais usadas e testes determinísticos acima.

## Histórico — continuação de 01/10/2026, 15:16 -03:00

O usuário aprovou expressamente: antes da chegada corrigir data/horário; após chegada,
somente horário na mesma data antes do atendimento, sem reset de chegada/fila. Mudança
de data exige reagendamento específico. Interface desabilita Nova data em Aguardando,
apresenta orientação e valida novamente no envio; servidor recusa outra data com a mesma
orientação. Não há mais decisão pendente sobre essa distinção nesta entrega.

Encontrado o PostgreSQL 17.11 já instalado em `scratch/tools/postgresql-17.11/pgsql/bin`.
Criado cluster novo `scratch/agenda-lab-20261001` em 127.0.0.1:55442, sem restauração de
backup ou cópia de dados reais, nem Docker/instalação. Executados bootstrap sintético,
baseline versionada, Financeiro fase1 e o arquivo exato da migration desta correção.
O laboratório não é o principal. RLS e helpers de autorização vêm do baseline; auth.uid()
lê um claim configurado pelo ensaio, Auth/Vault são auxiliares simulados. Não é sessão
autenticada real do Supabase e não comprova diferenças do catálogo remoto.

**Testes de PostgreSQL efetivamente executados e aprovados:** correção Recepção/Proprietária;
campos não envolvidos preservados; revisão antiga 40001; conflito 23P01; UPDATE direto
sem fluxo recusado; fora do expediente recusado; clínica não autorizada/médico recusados;
após chegada horário permitido/status/data mantidos e mudança de data recusada;
concluído/cancelado e atendimento existente recusados; mudança de data antes da chegada;
recebimento confirmado mantido no mesmo ID; contagem de auditoria corresponde somente
aos sucessos. Duas conexões PostgreSQL realmente concorrentes: apenas uma vencedora e
40001 na mesma linha; apenas uma vencedora e 23P01 em mesmo intervalo de duas linhas.

Arquivos reproduzíveis: `supabase/tests/agenda_lab_bootstrap.sql`, `agenda_lab_cenarios.sql`,
`agenda_lab_restricoes.sql` e `scripts/test-agenda-concorrencia.mjs` (host/porta local fixos,
sem leitura de .env). Os cenários exigem laboratório novo; não executar em principal.
Catálogo local confirmou duas RPCs invoker com EXECUTE só authenticated (não anon),
duas funções de trigger definer sem EXECUTE direto authenticated/anon, search_path
pg_catalog/public, três triggers esperados e RLS ativa em agendamentos.

`supabase/tools/verificar-integridade.sql` executado no laboratório: **parcial**, com erros
esperados de ausência de supabase_migrations e Storage; módulos posteriores de Pacientes
não foram instalados. Não simular registro de migration aplicada nem Storage completo.
Não é aprovação de integridade completa ou diagnóstico do principal.

Frontend: **6/6** testes dirigidos de chegada e edição Recepção em desktop/tablet/celular;
respostas interceptadas, inclusive persistência simulada. Build/lint aprovados, com avisos
existentes ThemeProvider/chunks; aviso createRoot observado no harness durante HMR, não
reproduzido na aplicação normal após recarga. Resultados anteriores 54+6 preservados abaixo.
Prévia real em porta3000 recarregada e ficha aberta/cancelada como Recepção/Brotas, somente
leitura, sem preencher/salvar. Serviço ausente explicado e Salvar desabilitado. Ipupiara
autenticada não verificada. Não há prova de correção persistida pela UI no principal.

**Bloqueio concreto para aplicação remota:** `04-ISOLAMENTO-DE-SISTEMAS.md` §§2/4 exige
Chrome com extensão Claude Code. Nesta sessão só há navegador Codex/IAB. O editor SQL
do ref correto foi aberto, mas nenhuma consulta/execução de banco remoto foi feita nesta
continuação. Foi pedida decisão explícita sobre esse canal; não há rejeição de ferramenta
ou revisão automática. .env confirma xftnkusbyqzyvzrovroj. Autorização da migration está
concedida, condicionada à compatibilidade/validação; não resolve silenciosamente a
restrição de canal. Falta conferir histórico, triggers, helpers, tipos/colunas, grants/RLS
e dependências Financeiro/Prontuário reais, preservar definições para recuperação e,
havendo diferenças críticas, reproduzi-las no laboratório antes da aplicação.

Procedimento compensatório preparado em `supabase/tests/agenda_correcao_recuperacao.sql`,
não executado: remove somente objetos novos, sem alterar horários, pagamentos ou auditoria.
Não foi criado snapshot remoto nesta etapa, pois não houve operação remota. Aplicação
deverá usar exclusivamente este arquivo, nunca db push geral; o registro verdadeiro no
histórico deve ser produzido pelo mecanismo normal de migration, sem marcação artificial.
Depois: consultar assinaturas/privilégios/triggers reais e executar integridade oficial.

Laboratório encerrado com pg_ctl stop; arquivos sintéticos preservados em scratch ignorado.
Nenhum registro criado/alterado no principal, portanto nenhuma limpeza nele foi necessária.
Sem commit/push/publicação. Próxima ação concreta: resolver o canal remoto e executar
preflight/snapshot; aplicar somente após compatibilidade confirmada e conferir capacidade
pela aplicação. Salvamento ainda bloqueado no principal por ausência da RPC, não por falta
de autorização genérica. Skill Supabase não disponível no catálogo; documentação oficial
consultada. TypeSafe avaliada pela descrição, não pertinente. Impeccable preservou os
componentes/tokens existentes ao apresentar a regra de chegada.

## Histórico da primeira rodada (até 15:00)

## Diagnóstico confirmado

Não encontrado fluxo executável de editar/reagendar horário. Criação já tem formulário
e constraint de sobreposição. Financeiro documenta reagendamento pelo mesmo médico sem
novo recebimento. Esta correção mantém o próprio ID, portanto não precisa transferir FK.

Em Agenda, indicador Hoje usa a quantidade de agendamentos carregados do dia, enquanto
profissionaisVisiveis excluía profissionais sem expediente/exceção. A consulta carregava
o agendamento, mas o filtro ocultava sua coluna. Lista de espera vem de outra consulta
e o botão Agendar abre criação; não comprova consulta marcada. Causa confirmada no código.

## Implementado localmente

- Lista Agendamentos do dia independente de expediente, inclusive profissional que não
  aparece na lista ativa; aviso textual de incompatibilidade. Colunas também incluem
  profissionais com agendamento, mesmo sem expediente. Registros fora da faixa visual
  do grid permanecem acessíveis na lista.
- Ação Editar agendamento na lista e no menu do cartão para perfis/situações elegíveis.
- Componente `src/components/agenda/EditarAgendamento.tsx` reaproveita ModalBase, tokens,
  FeedbackAlert e apresentação do formulário existente; dados fixos, motivo, comparação,
  confirmação, Cancelar/Salvar alterações e bloqueio duplicado por ref.
- Consulta autorizada de disponibilidade do novo dia, excluindo o próprio ID ao conferir
  conflito. Consulta/capacidade ausente bloqueia salvar. Nenhum fallback de escrita direta.
- RPC envia ID/clínica/revisão/status/horário anterior; resposta precisa confirmar ID,
  data/início/status. Sucesso no pai sobrevive ao fechamento, com Ver na nova data.
- Mudança de contexto desmonta formulário/descarta respostas; lista só aparece com
  contexto carregado. Resultado incerto impede reenviar naquela ficha.

## Migration preparada, não aplicada

Arquivo: `supabase/migrations/20261001120000_agenda_corrigir_horario.sql`.
Motivo: frontend/UPDATE genérico não garante disponibilidade, revisão nem histórico.
Não reescritas migrations anteriores. Nenhuma alteração no principal.

Objetos: RPC invoker `agenda_corrigir_horario`; RPC de capacidade invoker
`agenda_correcao_disponivel`; guarda BEFORE UPDATE e auditoria AFTER UPDATE, funções
SECURITY DEFINER com search_path controlado, execução direta revogada. Sem novas tabelas,
grants genéricos ou desligamento de RLS. Somente authenticated executa as RPCs.

RPC valida solicitante/perfil/clínica; SELECT FOR UPDATE sob RLS, comparação de revisão,
status/data/início anteriores, atualização de data/início somente. Guarda aplica também
a UPDATE direto, impede troca simultânea de vínculos/status e exige motivo do fluxo.
Atualiza revisão inclusive nas outras mudanças de linha para detectar concorrência.
Folga/especial/padrão e duração validados no servidor; exclusão existente continua sendo
a garantia de conflitos concorrentes. Transação falha inteira sem perder horário original.

Atendimento existente/iniciado, concluído/cancelado bloqueiam. Financeiro não é alterado:
mesmos ID/paciente/profissional/clínica mantêm recebimentos, inclusive já pagos; vínculos
financeiros incoerentes são recusados. Histórico mínimo em auditoria append-only existente:
autor, instante, horários antes/depois e motivo, sem nome/CPF/prontuário.

Na primeira rodada, mudança de data após chegada aguardava decisão e foi bloqueada;
a decisão explícita da continuação confirmou o limite. Sem bypass de encaixe.

### Aplicação futura e recuperação

1. Confirmar alvo e obter proteção do escopo antes de alterações; não há snapshot novo
   nesta tarefa porque o banco não foi modificado.
2. Executar preflight somente leitura em `supabase/tests/agenda_correcao_preflight.sql`:
   conferir schemas/colunas, enum/constraints, RLS, grants, cálculo de duração, auxiliares,
   triggers existentes (evitar histórico duplicado) e dependências Financeiro/Prontuário.
3. Executar testes abaixo em laboratório identificado e sintético, antes da autorização
   de aplicação no principal. Baseline local é referência, não prova do catálogo remoto.
4. Aplicar somente esta migration após revisão/autorização; conferir pg_proc/triggers/
   grants/RLS e rodar `supabase/tools/verificar-integridade.sql`. Registrar execução real.
5. Liberar edição somente após RPC de capacidade funcionar e operações serem comprovadas.
6. Recuperação exige migration compensatória específica e retorno do frontend; não apagar
   auditoria, não restaurar horários em massa e não desfazer operações legítimas. Guardar
   definições anteriores e revisar impacto da retirada das guardas antes da execução.

## Evidências e limites

Executados: build/lint aprovados (avisos existentes ThemeProvider/chunks), 54/54 cenários
na suíte dirigida (36 de edição e 18 de regressão de chegada), desktop/tablet/celular.
Verificação final dirigida: 6/6 testes de conflito local e troca de clínica aprovados
em desktop/tablet/celular, com a versão final do frontend. Respostas interceptadas em
operacional.synthetic.invalid; recarga usa memória do interceptador, não banco real.

Conferência conectada somente de leitura: prévia porta3000, Recepção/Brotas, novo registro
acessível com aviso de expediente ausente; lista de espera separada; edição abriu com
dados atuais, bloqueio Correção ainda indisponível e Salvar desabilitado. Cancelado sem
salvar. Não capturadas imagens com dados pessoais, nem identidades neste relatório.
Ipupiara real não conferida nesta etapa; contextos sintéticos não substituem essa sessão.

Migration: revisão estática realizada; execução/compilação em PostgreSQL ainda não
verificada. PostgreSQL portátil anterior estava encerrado conforme relatório Equipe10;
nenhum laboratório completo disponível identificado nesta etapa. Guarda revisada para
exigir exceção `horario_especial` com início/fim informados, conforme enum do baseline.
Parser local pglast
incompleto (ModuleNotFoundError: pglast.enums.cmptype), portanto nem sua tentativa foi
registrada como sintaxe aprovada. Sem instalar ferramentas ou iniciar outra infraestrutura.

### Histórico — ensaios preparados na primeira rodada, então não executados

Somente em laboratório isolado com schema/RLS/Audit/Financeiro e fixtures sintéticas:
Recepção/Proprietária de A e Recepção de B, profissional vinculado ativo, expediente,
agendamento agendado/confirmado/aguardando e outro concorrente, recebimento sintético.

- Sessão authenticated real de A corrigir sem alterar ID/vínculos/status/observações;
  reconectar, conferir horário e auditoria de antes/depois/motivo/autor.
- Repetir para Proprietária; sessão B e médico devem ser recusados; anon sem EXECUTE.
- Novo intervalo conflitante inclusive duas conexões concorrentes: 23P01, uma vencedora,
  sem parciais. Mesma linha com revisão antiga: 40001 após aguardar lock.
- Fora do expediente/folga/duração inválida/encaixe não autorizado: recusa; próprio ID
  não conflita. Exceção especial válida substitui o padrão.
- Alterar status enquanto ficha aberta: revisão/status antigos recusados.
- Atendimento existente, concluído/cancelado recusados; aguardando só horário no mesmo
  dia conforme decisão posterior. Recebimento consistente permanece intacto, não novo recebimento.
- UPDATE direto de hora sem fluxo/motivo: recusado; status sem horário segue regras
  existentes. Auditoria imutável; erro não deixa histórico de operação inexistente.

NÃO comprovados por testes de browser: autorização efetiva, atomicidade, concorrência,
auditoria/Financeiro do SQL. Negativas simuladas só conferem apresentação da resposta.

## Conferência local

http://127.0.0.1:3000/sistema/brotas/agenda e
http://127.0.0.1:3000/sistema/ipupiara/agenda → Agendamentos do dia → Editar agendamento,
ou cartão → Editar agendamento. Banco principal: não salvar sem etapa autorizada.
Servidor local reiniciado com Vite nesta pasta, host 127.0.0.1, porta 3000/strictPort,
após constatar conexão recusada; rota de acesso e componente atualizado servidos novamente.
Não houve commit, push, deploy, migration remota ou escrita real.
TypeSafe avaliada pela descrição, não pertinente. Impeccable orientou reutilização visual.
Fontes técnicas consultadas: [constraints PostgreSQL](https://www.postgresql.org/docs/17/ddl-constraints.html)
e [funções Supabase](https://supabase.com/docs/guides/database/functions).
