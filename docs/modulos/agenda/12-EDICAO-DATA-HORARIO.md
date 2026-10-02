# Edição de data e horário — implementação e publicação

Estado: transição manual concluída; fases 20261001193000 e 20261001194000 aplicadas
no principal, com publicação/verificação dos dois novos clientes entre as fases.
Proposta 173000 removida/substituída, jamais aplicada. Sem gravação operacional de teste.
Gravação real/persistência pela interface pendentes. Atualizado em 01/10/2026, 19:43 -03:00 (America/Bahia).
Branch `codex/resgate-local-2026-09-26`, HEAD publicado `b921a1c801f58cd91f0951366fcece18d720e35d`.
Alterações anteriores preservadas. Cabeçalhos e blocos datados abaixo conservam os
estados da implementação; a seção mais recente distingue publicação de validação real.

## Entrega concluída — 01/10/2026, 19:43 -03:00

Sequência efetiva: fase aditiva 193000 → push b921a1c → dois deploys/artefatos
conferidos → fase final 194000. Migração antiga 173000 removida antes do commit;
120000 não reaplicada. Ambas executadas em transações próprias no SQL Editor do
projeto xftnkusbyqzyvzrovroj, exceção autorizada exclusivamente nesta tarefa.

| Clínica | Build Hostinger | Resultado | Artefato JavaScript servido |
| --- | --- | --- | --- |
| Brotas | 01a0f99b-8db4-7373-9687-de68ead3528e | completed, 19:35:55 -03 | /assets/index-C9TWzOpt.js |
| Ipupiara | 01a0f99b-8e28-708e-a4e8-c5e6b6864b9a | completed, 19:35:52 -03 | /assets/index-ClnKwZ3i.js |

Os dois bundles retornaram 200 e contêm b921a1c, agenda_manual_criar e
agenda_manual_corrigir_horario. Navegador abriu e recarregou diretamente as rotas
/sistema/brotas/agenda e /sistema/ipupiara/agenda: login correto, sem 404.
CSS /assets/index-ChkyGt6y.css e as duas rotas retornaram 200; logs de console
capturados na abertura/recarga não apresentaram erros observáveis em ambos os sites.
Não havia sessão pública autorizada; isso não comprova gravação nem sessão Ipupiara.
Recepção/Brotas na prévia local: edição abriu, consulta da capability funcionou e
ausência de expediente virou aviso manual com confirmação exigida. Cancelado sem salvar.

Catálogo pós-fase final: história 120000/193000/194000, RLS ativa, cinco triggers,
RPCs INVOKER executáveis por authenticated, não anon; guardas DEFINER com search_path
pg_catalog/public e sem EXECUTE para authenticated/anon. Corpo normalizado final:
MD5 0ac9e5b552c3deec3b9f1cab0e06e512, igual ao SQL isolado. Não depende apenas da história.
Script oficial de integridade executado por leitura após ambas as mudanças, sem erro
observado; interface exibiu resultado final e catálogo foi conferido separadamente.
Não alegamos revisão exaustiva de cada resultado intermediário nem backup completo.

Testes desta transição: SQL aditivo legado/RPC, confirmação, conflito e auditoria;
concorrência mista com um vencedor e 23P01; edição concorrente com 40001;
matriz SQL pós-fechamento incluindo restrições, outras clínicas e INSERT antigo recusado.
Identidade Auth simulada no portátil, não sessão real Supabase. Fixtures isoladas
removidas por rollback/IDs exatos e auditoria preservada. 9/9 novos testes interceptados
da interface; build/lint sem erro, avisos preexistentes. Falha parcial de deploy não
provocada: critério explícito impedia fase final se qualquer site falhasse.

Abas antigas não se atualizam pelo deploy: devem recarregar. INSERT antigo recebe
P0001 sem criação parcial; a versão antiga pode mostrar erro genérico. Novo cliente
explica incompatibilidade, mantém rascunho e não volta ao INSERT nem repete gravação incerta.
Versão anterior 490ebca é referência histórica, NÃO rollback seguro após fase final.
Recuperar mantendo RPCs e cliente compatível/fix-forward; reabrir legado exigiria nova
avaliação e migration compensatória, nunca reversão silenciosa de permissões.
Snapshot limitado e hashes dos arquivos constam na seção de preparação abaixo.

Conferência manual pendente: entrar na clínica/perfil autorizado, Agenda → Editar
agendamento, corrigir somente uma operação legítima, conferir aviso/confirmação,
“Agendamento atualizado” e persistência após F5. Não houve teste operacional remoto.
Documentação final permanece local não commitada; implementação/migrations/testes
foram enviados. Outros trabalhos preservados.

## Fase 1 aplicada — 01/10/2026, 19:31 -03:00

SQL Editor Codex no projeto xftnkusbyqzyvzrovroj, exceção específica autorizada.
Preflight confirmou história somente 120000, RPC antiga, exclusão e ausência dos novos
objetos. Fase 1 executada em transação, incluindo registro verdadeiro da execução no
histórico e reload schema, resposta Success. Catálogo confirmou sete funções, assinaturas,
search_path e grants: RPCs INVOKER para authenticated, guardas DEFINER sem execução
authenticated/anon. Corpos normalizados (sem comentários/espaços) coincidem com os
ensaiados no portátil. Restrição final ainda NÃO aplicada. Integridade oficial executada
por leitura; conferência complementar dos novos triggers/ACLs em andamento.
9/9 testes de interface novos em desktop/tablet/celular aprovados por interceptação;
rascunho preservado, ausência de fallback, cenário de capability ausente. Não são
comprovação de publicação nem escrita real. GitHub remoto confirmado em 490ebca;
primeira consulta restrita falhou SEC_E_NO_CREDENTIALS, repetição autorizada funcionou.

## Transição em fases autorizada — 01/10/2026, 19:25 -03:00

Proposta 20261001173000 nunca aplicada conforme histórico e ausência de funções novas
no catálogo remoto; removida da pasta de migrations, não ficará pendente para aplicação
fora de ordem. Substituída por 20261001193000_agenda_manual_compatibilidade e
20261001194000_agenda_manual_encerrar_compatibilidade. Não reescrita a aplicada 120000.

Fase 1 instala RPCs e guarda manual para o caminho novo; INSERT anterior permanece com
RLS, duração e exclusão global anteriores, sem confirmação fabricada. Auditoria distingue
legado_transitorio/confirmacao null de rpc_manual. Portanto política nova não integralmente
ativa nessa janela. Restrição de exclusão remota confirmada por catálogo, cobrindo
clínica/profissional/intervalo completo e situação diferente de cancelado, ambos os caminhos.
Guarda de edição conserva motivos, revisão, chegada, vínculos e limites; cliente antigo
continua corrigindo apenas dentro da disponibilidade que sua interface anterior permite.

Fase 2 publica cliente RPC nas duas aplicações atuais. Critérios para fase 3: ambos os
builds completed no SHA aprovado, artefatos servidos contendo chamadas RPC, abertura e
recarga das rotas sem novo erro observável. Um deploy que falhar NÃO libera fase 3;
manter aditiva e corrigir/repetir somente publicação, sem repetir operações de dados.
Fase 3 substitui apenas a guarda de INSERT: legado recebe falha transacional que pede
atualizar a página e afirma nenhum agendamento criado. Abas antigas não são consideradas
atualizadas pelo deploy; cliente novo não retorna ao INSERT e mantém rascunho em falhas.
Resultado incerto impede repetição automática. Interface anterior pode apresentar seu
erro genérico, pois seu código já carregado não pode ser atualizado retroativamente;
a orientação detalhada é fornecida pelo servidor e exige recarregar a aba.

Ensaios executados: supabase/tests/agenda_manual_transicao.sql no laboratório 55442,
legado/RPC simultaneamente disponíveis, conflito e ausência de confirmação recusados,
auditoria sem confirmação fictícia; scripts/test-agenda-manual-concorrencia.mjs --misto
duas conexões (um vencedor 23P01, revisão 40001), limpeza por ID e auditoria mantida.
Aplicada fase final no laboratório e matriz agenda_manual_cenarios.sql passou incluindo
legado recusado, permissões, conflitos, limites e revisão. Auth simulado; não login real.
Build/lint aprovados; testes de interface direcionados em andamento. Não realizados
ensaios operacionais no principal. Hostinger confirmou builds anteriores 490ebca completed.

Recuperação por fase: antes dos deploys, manter fase aditiva e frontend 490ebca se
necessário; não remover RPCs enquanto algum cliente novo as utiliza. Após fase 3, manter
frontend RPC compatível ou publicar correção dele; NÃO voltar a 490ebca sem migration
compensatória previamente revisada que reestabeleça compatibilidade. Snapshot técnico
da guarda capturado por leitura em scratch/agenda-transicao-recuperacao/guarda-anterior.sql
(SHA256 BC20E5E25FB7748ADA9F4CAB19B6E9FE7EE59B2E9D85D12620C3F5437F0AA92D);
somente definição/ACL da guarda afetada, sem dados/Auth/Vault. Não backup completo,
restauração ainda não ensaiada; funções/ACLs/políticas/triggers anteriores lidos no catálogo.
Não restaurar dados por cima de operações legítimas nem apagar auditoria/histórico.
Referências: [funções Supabase](https://supabase.com/docs/guides/database/functions)
e [restrições PostgreSQL](https://www.postgresql.org/docs/17/ddl-constraints.html).
Skill Supabase ausente do catálogo; utilizadas fontes oficiais. TypeSafe não pertinente.
Impeccable utilizado para manter padrão de mensagens e rascunhos, sem redesenho.

## Histórico — revisão autorizada da publicação — 01/10/2026, 19:11 -03:00

**Bloqueio comprovado por código, não teste em produção:** o HEAD `490ebca`
de `src/pages/Agenda.tsx` cria por INSERT direto. A incremental, linhas 98–103,
instala guarda que exige `app.agenda_manual_clinica`, definido somente pela nova
RPC. Aplicar antes dos deploys recusaria a criação do cliente anterior. Inverter a
ordem também bloqueia o cliente novo enquanto capability/RPC não existem.
O pedido atual exige continuidade e determina interrupção diante de divergência
material; portanto a sugestão histórica de interrupção breve abaixo está superada.

Migration revisada sem alteração nesta sessão, SHA-256
`FF61288AFCB9DE4AEF8A4C67454B81F44BC6BEDE080F2F9158E3BAF571951724`,
correspondente ao arquivo previamente ensaiado no laboratório. Não repetidos testes
válidos; não há teste de transição entre versões que elimine esta incompatibilidade.
Não houve consulta SQL remota, aplicação, commit, push ou deploy; estado servido dos
domínios não foi novamente confirmado. Exceção de canal autorizada apenas nesta tarefa,
não utilizada nem incorporada à regra permanente. TypeSafe não pertinente; skill Supabase
não disponível no catálogo desta sessão.

**Próxima ação concreta:** preparar publicação em fases com ponte de compatibilidade:
cliente intermediário que conserva o fluxo atual e sabe usar o novo quando disponível;
instalação/ativação coordenada das guardas após ambas as aplicações estarem compatíveis.
Isso exige revisar o desenho de ativação e testar também clientes anteriores/abas abertas;
não basta relaxar o trigger, permitir confirmação implícita ou remover bloqueios.
O arquivo atual não deve ser aplicado como está sob a exigência de continuidade.
Aplicação e publicação permanecem não executadas; gravação legítima e persistência,
bem como sessão autenticada de Ipupiara, permanecem verificações distintas pendentes.

## Política manual aprovada e implementação local — 01/10/2026, 18:14 -03:00

**Decisão do usuário:** opção 2; mesmos critérios de disponibilidade na criação e edição.
Sem expediente e fora da faixa habitual: aviso e confirmação explícita; folgas/bloqueios
e limites de exceção explícita permanecem obrigatórios, assim como conflitos completos,
autorização, duração, auditoria, revisão concorrente, restrições de chegada/atendimento/financeiro.
O expediente histórico de teste não se tornou regra de negócio e não foi modificado.

**Implementado:** `src/lib/agendaDisponibilidade.ts` concentra a política; novo hook
`src/hooks/useDisponibilidadeAgenda.ts` consulta padrão/exceção/ocupações e descarta respostas
do contexto anterior. Erros das três consultas bloqueiam, sem falso “sem expediente”.
`Agenda.tsx` (criação) e `EditarAgendamento.tsx` reutilizam hook/política; avisos laranja,
confirmação, sugestões e campos manuais. Criação agora usa RPC com retorno confirmado,
trava de repetição e erro preservando dados. Sucesso fica fora do modal; resultado incerto
não permite novo envio nessa ficha. Edição preserva motivo, comparação e Ver na nova data.
Impeccable orientou reaproveitamento de alertas e estilos existentes, sem redesenho.
TypeSafe avaliada pela descrição, sem pertinência/integração/API nesta regra determinística.

**Banco preparado:** nova migration `supabase/migrations/20261001173000_agenda_politica_manual.sql`.
Sem reescrever/reaplicar `20261001120000`. Guarda compartilhada valida identidade/papel
atual, vínculos ativos de usuário/profissional na clínica, profissional ativo, duração,
exceções, confirmação e conflitos; `INSERT`
direto não contorna a política. Wrapper de correção reutiliza RPC anterior com revisão,
auditoria e preservação dos campos. RPCs novas SECURITY INVOKER conservam RLS; guardas
SECURITY DEFINER têm search_path fixo e sem EXECUTE para anon/authenticated. Não altera
RLS/grants de tabelas. Criação auditada na mesma transação com confirmação manual.
Bloqueio por clínica/profissional/data e exclusão existente protegem concorrência.
Referência oficial: [bloqueios PostgreSQL](https://www.postgresql.org/docs/17/explicit-locking.html).

**Verificado até esta etapa:** build aprovado; lint sem erros, aviso preexistente em
ThemeProvider; 78/78 ensaios Playwright da edição/política em desktop/tablet/celular,
incluindo três fusos. Interceptação só em `operacional.synthetic.invalid`, sem conexão
ou persistência Supabase. Matriz SQL `supabase/tests/agenda_manual_cenarios.sql` passou
em PostgreSQL 17.11 portátil `127.0.0.1:55442`, com RLS/roles SQL do baseline e Auth
simulado: criação/edição sem expediente, fora/dentro, fim exato, folga, horário especial,
conflito completo, revisão antiga, chegada, concluído, atalhos recusados, autorizações
A/Recepção, B/Recepção, A/Proprietária e médico/outra clínica recusados, auditoria/grants.
Tudo em transação local descartada. `scripts/test-agenda-manual-concorrencia.mjs` passou
com duas conexões reais locais: criação concorrente retorna 23P01 e revisão 40001,
um vencedor em cada corrida; fixture removida por ID exato, dependências conferidas e
auditoria local preservada. Primeiro ensaio deste script parou antes de escrever porque
o inet retornou sufixo /32; ajustado para `host(inet_server_addr())` e repetido com sucesso.
Não comprova autenticação real/integração Supabase. Execução adicional final: 30/30,
desktop/tablet/celular, quatro cenários novos de criação (erro mantém rascunho, repetição
impedida, confirmação visível após fechar, folga/falha de consulta/conflito bloqueantes)
e seis regressões do fluxo afetado da recepção, incluindo contextos sintéticos Brotas/
Ipupiara. Harness `recepcao-fluxo.spec.ts` adaptado ao novo contrato RPC, sem alterar
Pacientes/chegada. Total 108 aprovações interceptadas, não gravações no principal.
Build/lint repetidos sobre a versão final: aprovados, avisos preexistentes de ThemeProvider,
chunks/importação dinâmica preservados. `git diff --check` sem erro; migration antiga sem diff.
Matriz SQL ampliada confirmou também recusa de edição por médico e outra clínica.

**Conferência visual conectada somente de leitura:** navegador Codex, prévia 3000,
sessão Recepção/Brotas. Agenda e agendamento existente continuam acessíveis; edição
exibiu faixa ausente, aviso “Marcação manual”, motivo/confirmação e recurso novo ainda
indisponível. Criação exibiu sugestões sem faixa, aviso e confirmação manual ao informar
horário, sem selecionar paciente. Ambos cancelados, nenhum Salvar/Agendar acionado.
Não é validação de gravação/persistência nem comprovação de Ipupiara conectada.
Aba anterior deu timeout de foco; nova aba na mesma prévia recuperou a conferência.
Não incluídos nomes, IDs reais, imagens pessoais ou credenciais neste relatório.
Servidor local preservado, servindo `Agenda.tsx`/hook atuais; URL de conferência:
`http://127.0.0.1:3000/sistema/brotas/agenda`. Outra entrada disponível:
`http://127.0.0.1:3000/acesso/ipupiara`, sem sessão própria verificada nesta etapa.
Menu Agenda → Agendamentos do dia → Editar agendamento (ou + Novo agendamento).
Prévia aponta ao principal: não salvar operações reais sem indicação/autorização específica.

**Integridade local:** script oficial executado no laboratório; retorna lacunas esperadas
de Pacientes e erro `storage.buckets` inexistente. Laboratório não tem Storage/Auth completo;
não reinterpretar como defeito do principal nem afirmar integridade integral. Conferência
dos novos objetos/privilégios por catálogo foi realizada: RPCs INVOKER executáveis apenas
por authenticated, guardas DEFINER sem EXECUTE para anon/authenticated, search_path fixo,
triggers presentes e RLS Agenda ativo. Identidade real Supabase ainda não homologada.

**Aplicação futura (não executada):** conferir alvo xftnkusbyqzyvzrovroj, definições atuais
das guardas/trigger de duração/constraint/exceção única/RLS/grants, histórico e dependências
da migration antiga. Preservar snapshot de definições/ACLs antes de aplicar somente esta
incremental; nenhuma atualização de agendamento/expediente existente. Novas criações passam
a exigir RPC e confirmação; cliente anterior com INSERT direto será recusado — coordenar
instalação com atualização das duas aplicações, avisando interrupção breve de criação.
Recuperação: frontend anterior + migration compensatória revisada que restaure a guarda
anterior, retire exclusivamente trigger/RPCs novos e preserve auditoria e registros criados.
Não restaurar dados antigos por cima de operações legítimas nem manipular histórico.
Após instalar: confirmar definições/assinaturas/grants/triggers, recarregar schema da API
quando necessário, executar verificação de integridade e conferir capability/leituras pela
sessão autorizada. Só então validar escrita legítima autorizada; não fabricar agendamento.
Nova política não liberada no principal nesta etapa; faltam autorização/aplicação incremental,
publicação futura autorizada e conferência conectada da nova versão. Sem commit/push/deploy.

## Histórico — origem dos dados e política então pendente — 01/10/2026, 17:08 -03:00

**Esclarecimento informado pelo usuário:** não definiu nem conhece o intervalo cadastrado
para o profissional de teste. O dado encontrado não é decisão aprovada. A leitura física
anterior está preservada, mas a recomendação de fornecer expediente para esse profissional
de teste fica superada: não pedir intervalo inventado, não cadastrar exceção para passar teste.

**Origem documentada, distinta de prova por auditoria do banco:**

- `09-DIARIO-DE-SESSOES.md`, sessão 02/08/2026, relata INSERT de profissional,
  especialidade e serviço sintéticos para teste de Cadastros, orientado pelo agente;
  versão histórica encontrada no commit `122b62d` (03/08/2026), com identificação
  sintética correspondente no TODO histórico. Relato de execução orientada de teste
  não significa que o usuário definiu regra operacional de expediente.
- Mesmo diário, sessão 04/08/2026, relata cadastro de terça-feira 08:00–18:00 no
  painel de horários durante ensaio com perfil Recepção/Brotas. Texto introduzido
  no commit `33f7bbf` (05/08/2026). É origem histórica compatível com a configuração
  lida anteriormente, não comprovação por auditoria de quem criou a linha atual nem
  prova de que ela nunca foi substituída. Autor exato da linha atual não verificado.
- `supabase/seed.sql` é neutro, sem INSERT. Buscas dirigidas em migrations, testes,
  baseline e Git não localizaram seed/migration que instale esse profissional/terça.
  Ensaios SQL isolados usam outros IDs e expediente de todos os dias; browser usa
  IDs sintéticos próprios/dia corrente. Não são fonte comprovada do registro principal.
  Nenhum seed, teste anterior ou registro remoto modificado para forçar aprovação.

**Origem da restrição:** documento de correção criado no commit `490ebca` descreveu
como APROVADO o conjunto, incluindo ausência de encaixe. O pedido original exigiu
validar disponibilidade no servidor, mas a escolha de bloquear absolutamente quando
não há expediente foi uma interpretação conservadora da implementação. Não localizada
decisão que aprove essa política uniforme para criação e edição. O diário de 04/08/2026
registra relato de decisão por padrão semanal com exceções e duração fixa por profissional;
isso define o modelo de configuração, não a obrigatoriedade de bloquear marcação sem ele.
Corrigido o documento funcional para separar núcleo aprovado de política EM DECISÃO.
Não reaberta a investigação de ausência física na quinta-feira.

**Proposta concreta, aguardando somente decisão de negócio:**

1. Agenda controlada por expediente: exigir a mesma cobertura de duração na criação
   e edição; compartilhar cálculo e validação no servidor, preservar conflitos e dados
   existentes acessíveis. Requer ajuste do INSERT/criação, não cadastro de horários fictícios.
2. Agenda manual, com conflitos verificados e avisos de disponibilidade: permitir nos
   dois fluxos horário sem expediente, manter avisos e controles de duração, conflito,
   clínica/perfil, concorrência, auditoria e restrições clínicas/financeiras. Requer
   ajuste da guarda de edição por nova migration específica após decisão/autorização,
   nunca UPDATE alternativo para contornar a RPC instalada.

Criação atual corresponde à opção manual quanto ao envio sem expediente; edição à
opção controlada. Não há coerência aprovada a presumir. Nenhuma opção imposta, nenhuma
alteração funcional feita antes dessa escolha. Orientação de horários de teste superada.

**Verificação dirigida: quatro cenários com resultado final aprovado, desktop, respostas
interceptadas exclusivamente em `operacional.synthetic.invalid`:**

- Criação sem expediente enviou um POST interceptado; mesmo contexto da edição impediu
  envio da RPC. Duração/fim não enviados pelo cliente, preservando cálculo do servidor.
  **Comprova a inconsistência atual da interface, não persistência real nem política aceita.**
- Médico não recebe ações de criação/edição; zero solicitações de escrita no harness.
  Comprova interface simulada, não autorização efetiva do servidor.
- Conflito de outro agendamento bloqueia edição, próprio ID não causa falso conflito.
- Auxiliar de duração/faixas permite término exato, rejeita ultrapassagem e intervalos,
  e respeita exceções/data civil. Prova local do cálculo, não banco conectado.

Primeira execução teve três aprovações e falha do teste novo por seletor ambíguo; ao
delimitar o campo ao combobox do diálogo, segunda tentativa revelou interceptação que
não cobria POST sem query string. Corrigido somente o teste, não a aplicação; cenário
afetado repetido e aprovado (1/1, 1,6 minuto). Os três anteriores não repetidos.
Lint dirigido e diff-check sem erros; nenhum build redundante, código funcional intacto.
Esses cenários devem mudar após decidir a política comum; não são testes de regressão
que obriguem preservar a inconsistência. Ensaios SQL anteriores não repetidos.

Sem consultas remotas novas, alteração de dados/expediente/agendamento, permissions,
migration, commit, push ou deploy. Código funcional e alterações alheias preservados.
TypeSafe avaliada pela descrição, não pertinente. Próxima ação: escolher uma das duas
políticas; não informar intervalo fictício para o profissional de teste.

## Causa física por leitura conectada — 01/10/2026, 16:57 -03:00 (histórico; recomendação operacional superada acima)

**Conclusão: falta configuração para a data investigada.** Exceção expressa do usuário
nesta tarefa permitiu SELECT no SQL Editor pelo navegador Codex, somente no projeto
`xftnkusbyqzyvzrovroj`. URL/painel confirmaram Clínica Patrícia, main/PRODUCTION;
`VITE_SUPABASE_URL` conferido corresponde ao destino. A exceção encerra-se com esta
investigação e não altera `04-ISOLAMENTO-DE-SISTEMAS.md`.

**Evidências efetivamente obtidas no principal, não simuladas:**

- Um único profissional correspondeu ao profissional mostrado no formulário, na clínica
  Brotas. Profissional e clínica ativos, duração 30 minutos, vínculo profissional/Brotas
  ativo. Não consultados pacientes, CPF, prontuários, senhas ou tokens.
- Consulta administrativa de todos os expedientes desse profissional, sem filtro de
  atividade ou dia, retornou **um único padrão: terça-feira (DOW 2), 08:00–18:00,
  ativo, em Brotas**. Nenhum padrão inativo, de quinta-feira ou em outra clínica
  retornado. Não copiado expediente de outra unidade.
- Nenhuma exceção desse profissional para 01/10/2026, em qualquer clínica. Assim,
  não há folga/horário especial oculto que explique esse caso.
- Servidor confirmou `extract(dow from date '2026-10-01') = 4` (quinta-feira),
  coincidente com navegador e testes anteriores. Campos de hora são `time without
  time zone`; data da exceção é `date`. Não existem campos de vigência no esquema
  atual de `disponibilidade_padrao`: não é expiração de um expediente existente.
- Consulta com mesmos filtros da edição (profissional, Brotas, ativo e DOW 4)
  retornou contagem **0**, correspondente ao resultado vazio recebido na sessão
  comum Recepção/Brotas na etapa anterior.
- Catálogo atual: RLS habilitada; `authenticated` tem SELECT em
  `disponibilidade_padrao`, `agenda_excecoes` e `profissionais_clinicas`.
  Políticas SELECT dessas tabelas exigem `clinica_id IN (clinicas_do_usuario())`.
  Helper instalado, STABLE/SECURITY DEFINER, search_path public, retorna vínculos
  de `usuarios_clinicas` do `auth.uid()` com `ativo=true`, e é executável por
  `authenticated`. A conta da sessão de Recepção observada tem vínculo ativo
  de papel `recepcao` em Brotas; retornados apenas papel/atividade, não identidade.
- Papel do SQL Editor confirmado `postgres` com bypass RLS. Essa leitura comprova
  a existência física dos registros e sua ausência para quinta-feira; **não é um
  teste de operação com autenticação Recepção**. Combinada com o retorno real da
  interface comum e catálogo, não sustenta hipótese de registro de quinta-feira
  escondido por RLS neste caso. Nenhuma permissão modificada.

Foram executados somente SELECT de catálogo/metadados e registros de disponibilidade
necessários. Uma tentativa de consulta falhou com sintaxe 42601 porque a ferramenta
inseriu o segundo texto no meio do anterior; uma digitação interrompeu por timeout.
Texto substituído integralmente e resultado final conferido. Não foram falhas de
consulta da aplicação nem evidência de problema no banco. Não executados comandos
de escrita/DDL ou funções de negócio com efeitos de escrita; não salvo template de
consulta pelo botão Save. IDs internos e identidade da sessão não reproduzidos aqui.

**Solução funcional, sem executar configuração:** Recepção ou Proprietária com vínculo
na clínica → Agenda de Brotas → ⋯ do profissional → Marcar folga / horário especial
→ Tipo **Horário especial** → data 01/10/2026, início e fim definidos pela administração;
motivo opcional. A tela foi conferida/cancelada anteriormente e cria disponibilidade
apenas nessa data, sem recorrência permanente. Para a tentativa 16:40/30 minutos,
a faixa autorizada deve conter 16:40–17:10 integralmente. Isso não autoriza esse
intervalo: falta informar o expediente real da data. Não alterar o padrão de terça-feira
nem tratar a lista de espera como agendamento. Depois de configurar legitimamente,
reabrir a edição para consultar a disponibilidade atual e confirmar a correção específica.

**Alinhamento criação/edição:** regra aprovada da edição continua exigindo expediente,
sem encaixe. Não repetir investigação da diferença de criação já registrada nem
atribuir a ela a origem deste agendamento; origem/histórico não comprovados.
Os documentos de Agenda consultados não definem uma autorização geral para criar
manualmente sem expediente. Decisão a aprovar: **a criação também deve exigir a faixa
completa de expediente, ou deve existir um fluxo explícito de encaixe autorizado?**
Recomendação sujeita à aprovação: usar o mesmo cálculo de disponibilidade na criação
e edição, validado no servidor; eventual encaixe precisa de regra própria de papel,
motivo e auditoria, nunca de contorno silencioso. Nenhuma dessas mudanças implementada
como nova regra nesta investigação.

Sem defeito comprovado de leitura/validação nesse caso, preservado o código e os 66
testes anteriores; não repetidos build/lint/ensaios sem alteração funcional. TypeSafe
avaliada pela descrição, não pertinente. Sem mudança de dados, expediente, agendamento,
RLS, migration, commit, push ou deploy. Ipupiara não validada. Arquivos ajustados:
relatório 12, README Agenda e checkpoint operacional; demais alterações preservadas.

## Continuação do diagnóstico — 01/10/2026, 16:42 -03:00 (histórico; lacuna resolvida acima)

**Conclusão: evidência ainda insuficiente.** Reutilizada a leitura conectada anterior
Recepção/Brotas, sem repetir os 66 testes aprovados nem consultar dados pessoais adicionais.
Retorno vazio de consultas autorizadas não comprova ausência física: políticas RLS podem
filtrar linhas ([documentação oficial Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)).

| Possibilidade | Evidência disponível e limite |
| --- | --- |
| Expediente inexistente | Nenhum padrão ativo de quinta-feira nem exceção retornados à Recepção para 01/10/2026. Ausência física não confirmada. |
| Inativo / fora da vigência | Consulta filtra `ativo=true`; não consultados registros inativos. Baseline versionado não contém campos de vigência nessa tabela; catálogo atual não reinspecionado nesta etapa. |
| Vínculo profissional/clínica incorreto | Carregamento da Agenda exige vínculo ativo e devolve o profissional da clínica. Isso sustenta o vínculo atual visível à sessão, não verifica vínculos dos registros de expediente ocultos. |
| Exceção / bloqueio da data | Nenhuma exceção retornada à sessão. Folga bloqueia; horário especial substitui o padrão no código e na migration revisada. Não excluída exceção não visível. |
| Registro existente oculto à Recepção | Possibilidade não descartada. Baseline permite SELECT conforme clínicas do usuário; não é comprovação das políticas/grants efetivamente instalados hoje. |
| Erro de consulta / filtro / dia / fuso | Nenhum erro apresentado na leitura conectada anterior; filtros de clínica, profissional, ativo e DOW civil conferidos. Testes anteriores em três fusos mantiveram data e DOW 4. Não encontrado defeito desses filtros; isso não exclui erro de configuração ou de autorização no banco. |

**Criação original:** `src/pages/Agenda.tsx`, `ModalNovoAgendamento`, usa horário manual
e INSERT; não valida expediente na interface. No baseline, a função
`calcular_hora_fim_agendamento` calcula duração/fim, e a política de INSERT verifica
perfil, clínica, paciente e vínculo do profissional, não cobertura de expediente.
A guarda da migration `20261001120000` atua em UPDATE, não INSERT. Portanto há uma
diferença comprovada nos caminhos de validação versionados que permite explicar a
possibilidade de criar sem expediente; não prova que este agendamento foi criado por
esse caminho. Não confirmados encaixe autorizado, origem legada ou alteração posterior
do expediente. Faltam definições atuais dos triggers de INSERT e histórico pertinente
do expediente/agendamento, se disponível, sem identificação do paciente.

**Canal que impede concluir a distinção:** nesta sessão só está disponível o navegador
interno do Codex, não Chrome com extensão Claude Code, exigidos por
`04-ISOLAMENTO-DE-SISTEMAS.md`. Não há connector Supabase autorizado disponível.
A exceção anterior era restrita à aplicação/conferência da migration; não foi
transformada em autorização permanente. Nenhuma ferramenta rejeitou uma consulta:
ela não foi executada por falta do canal autorizado. Skill Supabase não consta do
catálogo desta sessão; consultada documentação oficial pertinente. TypeSafe avaliada
pela descrição, não pertinente a estas verificações determinísticas.

**Configuração existente localizada, não executada:**

- Recorrente: Cadastros → Profissionais → Horários de atendimento. Código permite
  Proprietária e Recepção na clínica autorizada. Campos: dia da semana, início e fim,
  com múltiplas linhas. O salvamento substitui o conjunto recorrente da clínica/profissional;
  não recomendar uma recorrência permanente para resolver um caso pontual. A leitura
  desse painel filtra ativos e não trata `error` explicitamente; painel vazio também
  não seria prova de ausência. Não utilizado como evidência da causa na edição.
- Uma data: Agenda → ⋯ do profissional → Marcar folga / horário especial →
  Tipo **Horário especial**. Data, início e fim obrigatórios; motivo opcional.
  Confirmado nesta sessão pela interface local autenticada Recepção/Brotas;
  formulário aberto, tipo selecionado e cancelado, sem salvar. Permissão no código
  para Proprietária/Recepção; não comprovada escrita por esta navegação.
  Se já houver exceção para a data, a tela recusa duplicidade e não oferece edição
  dessa exceção; conferir o registro existente antes de indicar novo cadastro.

**Próxima ação concreta:** disponibilizar consulta somente de leitura pelo canal
documentado, ou autorizar especificamente o SQL Editor pelo navegador do Codex para
esta investigação. Conferir padrão do profissional/clínica em todos os dias e estados,
exceção da data, vínculos, políticas/grants atuais e triggers de INSERT. Somente se
confirmada falta de configuração, pedir à administração o intervalo real autorizado
para essa data; ele precisa comportar a duração integral (a tentativa 16:40 exige
cobertura até 17:10). Não inventar esse intervalo nem copiar outra clínica.

Nesta continuação foram alterados apenas este relatório e o checkpoint operacional.
Melhorias visuais anteriores preservadas; nenhuma nova correção funcional atribuída
à causa sem evidência. Sem escrita no principal, mudança de expediente/agendamento,
migration, commit, push ou publicação. Prévia mantida em
http://127.0.0.1:3000/sistema/brotas/agenda. Ipupiara não validada nesta etapa.

## Bloqueio de disponibilidade — revisão concluída em 01/10/2026, 16:35 -03:00

**Relato do usuário:** Recepção/Brotas, tentativa de 01/10/2026 às 16:00 para 16:40,
duração 30 minutos, aviso fora da disponibilidade e confirmação desmarcada. A imagem
não autorizou nenhuma alteração operacional. Nenhum paciente identificado nesta documentação.

**Observado no código publicado:** Salvar desabilitado por envio em curso, resultado
incerto, RPC de capacidade não confirmada, validação de intervalo/conflito/carregamento/
erro de consulta ou confirmação desmarcada. Motivo era exigido pela validação nativa e
servidor, mas faltava explicação conjunta. A confirmação era resetada em cada consulta
por horário. O código já exigia o intervalo inteiro em uma única janela e excluía o
próprio agendamento do conflito; não identificado erro aritmético que liberaria 16:40–17:10.

**Leitura conectada realmente realizada:** navegador da prévia desta pasta, porta3000,
sessão Recepção/Brotas, data/horário/duração coincidentes com o relato. Formulário consultou
as mesmas tabelas sob a sessão comum, sem erro apresentado: não retornou expediente padrão
ativo para quinta-feira (DOW 4) nem exceção para a data. O componente novo torna esse
resultado explícito. Sem janelas retornadas, não é possível aprovar o intervalo completo,
nem o horário anterior. Não foi feita consulta privilegiada para concluir que dados não
existem fisicamente ou que RLS está incorreta. A evidência é do retorno autorizado, não
diagnóstico de permissão. Campo 16:40 conferido no formulário, sem confirmar/enviar;
fechar sem salvar mantém agendamento original. Não houve teste de escrita ou RPC de alteração.

**Servidor preservado:** migration instalada anteriormente, código local conferido: exceção
de folga bloqueia, horário especial substitui padrão; sem exceção, uma janela padrão ativa
do DOW deve cobrir início/fim inclusivos. Duração do profissional, fim antes da meia-noite,
conflito protegido pela constraint, sessão/perfil/clínica e revisão continuam obrigatórios.
O limite exato do fim é permitido; ultrapassar não é. Não existe exigência de múltiplo de
30 minutos no servidor desta correção. Nenhuma migration reaplicada ou alterada nesta tarefa;
catálogo remoto não foi consultado novamente, correspondência instalada tem evidência na
etapa anterior deste relatório. Datas civis sem conversão UTC; time SQL sem fuso.

**Criação versus edição:** criação atual em Agenda.tsx usa campo manual e INSERT com
constraint de conflito, sem seletor/calculador frontend de disponibilidade reaproveitável.
O grid usa as mesmas tabelas e precedência de exceções. Não copiar permissividade da
criação para contornar a guarda específica da correção aprovada. Criação permaneceu intacta.

**Correções locais:** EditarAgendamento e auxiliar agendaDisponibilidade:

- Consulta por data/contexto, não a cada tecla do horário; estado vinculado ao contexto
  descarta respostas antigas, inclusive rejeições de rede; capacidade rejeitada também tratada.
- Carregamento textual separado de erro vermelho com Tentar novamente e consulta vazia.
  Falha não afirma que migration está ausente; nenhum dado digitado é apagado ao repetir leitura.
- Faixas e origem da consulta, seletor nativo com sugestões início/fim a cada 5 minutos,
  removendo conflitos e próprio ID. Sugestões não impõem nova regra: horário manual continua
  permitido e é validado pelas mesmas faixas/duração/conflitos, inclusive minutos não sugeridos.
- Pendências junto ao botão e aria-describedby: motivo, horário, recurso, confirmação,
  ausência de alteração e andamento/resultado incerto. Quando apenas confirmação falta,
  a interface diz isso explicitamente. Mudança de data/horário invalida confirmação anterior.
- Componentes Alert/ModalBase e tokens preservados, sem nova notificação ou regra de encaixe.
  Sucesso permanece no pai após resposta confirmada e fechamento; edição após chegada intacta.

**Verificações finais:** build e lint aprovados (avisos preexistentes ThemeProvider,
import dinâmico/chunks), diff sem erro; **66/66** testes dirigidos aprovados em 3,7 minutos,
22 cenários em desktop/tablet/celular, respostas interceptadas exclusivamente no destino
sintético. Cobertura: horário válido e confirmação marcada/desmarcada; fim exato e
ultrapassagem; intervalo entre janelas; folga/especial; conflitos e próprio ID; consulta
vazia; falha 503, repetição de leitura e preservação do rascunho; resposta atrasada de
outra data/clínica; erros de gravação, revisão e contexto; regra após chegada; sucesso
após fechar e recarga simulada. Bahia, Los Angeles e Auckland mantêm 01/10/2026 e DOW 4.
Não é execução de SQL ou autenticação real no harness. O servidor real não foi alterado.

Rodadas de desenvolvimento foram interrompidas para corrigir problemas encontrados;
não são declaradas aprovadas. Nome acessível
do seletor contaminado pelas opções (corrigido com label associado por ID), seletor de
teste ambíguo devido à nova orientação repetida (teste delimitado ao alerta) e falha simulada
afetando carregamento da página em vez de somente o formulário (interceptação restringida).
Foi ajustado também o dia da fixture para o fuso do navegador (Auckland pode estar no
dia seguinte ao Windows) e o prazo de observação do erro simulado: o SDK instalado
repete GET 503 três vezes antes de retornar erro. Esses ajustes não criaram temporizador
na aplicação nem reduziram controles. Resultado final acima obtido após estabilização.
Essas ocorrências não são prova de erro do Supabase. Não confundir ensaios interceptados
com gravação real. Navegador da aplicação normal mostrou carregamento, origem da consulta
sem janelas, seletor desabilitado sem opções e pendências; cancelado sem salvar.

**Limites e próxima ação:** sem gravação, sem alteração de expediente, RLS, permissões,
migrations, commit, push ou deploy. Ipupiara conectada não verificada nesta rodada. Prévia:
http://127.0.0.1:3000/sistema/brotas/agenda → Agendamentos do dia → Editar agendamento.
Salvar na prévia altera o principal; nenhuma gravação de teste permitida por este pedido.
Para o caso relatado, confirmar administrativamente o expediente real é necessário;
não ampliar automaticamente nem afirmar que só marcar a caixa resolverá. TypeSafe avaliada
pela descrição, não pertinente; Impeccable aplicada para clareza/acessibilidade, sem redesign.

## Resultado da publicação — 01/10/2026, 16:00 -03:00

Commit **490ebca2810e58f3eb0899ad4952e8b15f307dc3**, 16 arquivos pertinentes, enviado
por push normal; ls-remote confirmou o mesmo SHA. Nenhum arquivo funcional de outra
tarefa, .env, scratch, snapshot ou segredo incluído. Não reaplicada a migration, nem
executados SQL, mudanças de permissões ou gravações operacionais nesta publicação.

| Domínio | Build Hostinger | Resultado efetivo |
| --- | --- | --- |
| clinicabrotas.com.br | 01a0f8d2-73b1-7042-8bea-4a640be7b06c | completed no SHA 490ebca; 18:56:10 UTC / 15:56:10 -03 |
| clinicaipupiara.com.br | 01a0f8d2-7430-724a-8a24-ea4681992ec8 | completed no SHA 490ebca; 18:56:13 UTC / 15:56:13 -03 |

**Artefatos servidos por HTTPS verificados, não apenas build/push:**

- Brotas `/assets/index-ro79BPU6.js`, SHA-256
  `47F3865D8D9F6D253146F45CC5621F2D31697DD7C750AF543EE7E0A8D5C89BA0`.
- Ipupiara `/assets/index-BtfcquwA.js`, SHA-256
  `80B5CE323D8E899ED94F6248D3B9E4C537045F900D67F243F81512FB16A4D170`.
- Ambos identificam commit 490ebca2 e contêm Editar agendamento, Agendamento atualizado
  e agenda_corrigir_horario. Raiz, rota Agenda, JavaScript, CSS e imagens PNG das unidades
  responderam 200; conexão HTTPS normal, sem ignorar certificado.
- Navegador controlado: abertura direta em nova aba e recarga de ambas as rotas mantiveram
  a URL e exibiram login/identidade da clínica correspondente, sem 404/erro visual novo.
  Zero entradas de erro de console observadas nessas abas.

**Limitação explícita:** não havia sessão pública autenticada nas abas do navegador.
Presença do botão após login, salvamento e persistência não foram executados em produção.
Presença dos textos no bundle não é prova de fluxo autenticado. A sessão local de
Recepção/Brotas conferida anteriormente não substitui validação do site publicado ou
de Ipupiara. Nenhum agendamento real foi alterado, nenhuma fixture criada ou reversão
executada. Ambiente local e alterações de outras tarefas preservados.

### Conferência manual legítima no site publicado

[Agenda Brotas](https://clinicabrotas.com.br/sistema/brotas/agenda) e
[Agenda Ipupiara](https://clinicaipupiara.com.br/sistema/ipupiara/agenda).
Entrar como Recepção/Proprietária autorizada na unidade → Agendamentos do dia → Editar
agendamento (também no menu do cartão). Selecionar somente um horário que realmente
precise de correção; comparar anterior/novo, conferir expediente, preencher motivo e
confirmação e salvar uma vez. Antes da chegada pode mudar data/horário; após chegada
apenas horário na mesma data, sem desfazer chegada/fila. Esperado alerta verde
Agendamento atualizado. Se mudou data, Ver na nova data; recarregar para conferir
data/horário e preservação dos demais vínculos/situação. Em resultado ambíguo, parar
sem reenviar; consultar antes de agir. Não criar dados fictícios nem desfazer correção legítima.

Resultados finais deste relatório, README, índice e checkpoint salvos localmente após
o commit; sem segundo commit/push para documentação e sem novo deploy. Versão anterior
9512aed e procedimento de reversão preservados no histórico abaixo.

## Histórico — preparação da publicação em 01/10/2026

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
