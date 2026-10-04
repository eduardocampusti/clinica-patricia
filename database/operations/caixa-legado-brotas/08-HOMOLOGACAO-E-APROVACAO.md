# Encerramento administrativo — execução autorizada e verificada

## Representação versionada — 2026-10-04 19:13:49 -03:00

A/B estão concluídas, conforme evidências históricas abaixo. NÃO REAPLICAR. O Git conserva
registro-aplicacao-seguro.json (metadados mínimos),10.disabled (trava false/ROLLBACK), fontes
offline e exemplo sintético bloqueado. Inventário completo, manifesto real, resultado09 e
SQL02/03/04/05/06/07/11 gerados ficam locais e ignorados, como as cópias privadas em scratch.
Referências históricas a esses arquivos não significam inclusão no repositório. Os geradores
CLI requerem manifesto privado específico; nunca usar o registro seguro como autorização.
Testes: node --test database/operations/caixa-legado-brotas/preparo.test.mjs
database/operations/caixa-legado-brotas/candidato.test.mjs —27 contratos offline. Testes e
laboratório usam manifesto-revisao.exemplo.json. Três assertivas dos arquivos privados
congelados foram retiradas da suíte portável; hashes locais conferem sua preservação.
A adaptação de entrada não muda SQL financeiro/proteção e não requer repetir os12 cenários.
Sincronização/matriz de telas: docs/modulos/financeiro/15-SINCRONIZACAO-E-MATRIZ-CAIXA.md.

Estado atual: **A/B APLICADAS / ENCERRAMENTO ADMINISTRATIVO VERIFICADO**,
04/10/2026,18:38 -03:00. Abertura normal disponível em Brotas.


## Execução autorizada A/B concluída — 04/10/2026,18:38 -03:00

**Resultado: legado de Brotas encerrado administrativamente; abertura normal disponível.**
Projeto xftnkusbyqzyvzrovroj, branch main, conferidos na interface oficial. Autorização
específica A/B do usuário substitui a restrição histórica apenas nesta intervenção. Foi
usado exclusivamente SQL Editor no navegador interno, sem tokens/cookies/chaves/endpoints
privados. Eduardo Campos declarou que todos os dados são testes e que não existe dinheiro
ou obrigação real associados. Essa é declaração do usuário, não conclusão independente.
Conta de administração indicada pelo usuário corresponde ao UUID8792e28b-faf6-41fd-9d89-a84a453f0137,
ativo/Proprietária ativa em Brotas; nome exibido Proprietária. A conta de Recepção também
foi identificada, sem usá-la como responsável nem alterar seus vínculos.

### Alterações realmente aplicadas

- A: COMMIT confirmado21:23:53.285434UTC (18:23:53 -03). Criados somente
  private.financeiro_proteger_entrada_legado_administrativo() e trigger
  entradas_caixa_legado_administrativo BEFORE INSERT/UPDATE/DELETE em entradas_caixa.
  Alvo fixo sessão a4a18e49-6634-4058-9fd8-07f3b065fd63, clínica
  7c2a450d-7b9a-4701-8d5a-982eda331c58/Brotas. Função postgres/SECURITY DEFINER,
  search_path=pg_catalog; EXECUTE direto PUBLIC/anon/authenticated/service_role=false.
  Trigger habilitadaO/tipo31. Corpo igual linha por linha após normalizar somente CRLF
  e indentação do editor; comparação literal anterior false foi diferença de formatação,
  sem alteração lógica. Sessões modernas e demais clínicas não são alvo da trigger.
- B: COMMIT confirmado21:31:22.38201UTC; fechado_em=21:31:22.271619UTC
  (18:31:22 -03). Só status=fechado, fechado_por=8792e28b-faf6-41fd-9d89-a84a453f0137 e fechado_em
  foram alterados na sessão exata. Chave legada permanece NULL, fundo original R$150,50
  preservado; valor_esperado/valor_contado/diferenca continuam NULL.
- Auditoria geral1582 acrescentada pela trigger existente e evento administrativo único
  9ecb1e2a-5fe0-463c-8858-13919b1096f3. Evento sem valor financeiro, natureza administrativo, contagem e
  conciliação nao_comprovadas; responsável existente/papel proprietaria, executor SQL
  postgres e auth.uid=NULL reais, sem fabricar contexto autenticado. Motivo e declaração
  humana no manifesto congelado do evento. Pix excluído não restaurado, nenhum ajuste
  ou pagamento criado, registros originais não reclassificados/apagados.

### Revalidações e preservação comprovadas

Inventário integral pré-A e pré-B reconfirmou a sessão aberta/chaveNULL, duas entradas
de R$500 em dinheiro e14 grupos modernos vazios. Essas quantias não comprovam dinheiro
físico. Guardas internas de clínica/sessão/estado/responsável/snapshot/catálogo/auditoria
passaram; locks com timeout, advisorylock da abertura e conferência concreta de janela,
sem outras transações/preparadas observadas. Não houve pausa/revogação de serviços.

Catálogo antesA:712itens/15392c1671489765fe9074cb14fc8dad. DepoisA e depoisB:
714itens/cad06a1e68b26cae9ce77a867861552b, exatamente2adições,0remoções/alterações
de itens existentes.9 SELECTs de supabase/tools/verificar-integridade.sql executados
por leitura: objetos/colunas/RPCs pertinentes presentes, grants CPF restritos e bucket
privado; sem dados pessoais/documentos consultados. Ledger não prova a aplicação de A.

Leitores06/07 e leitura final independentes confirmaram:2entradas com MD5original
ca2117e340b8061508a2a00a05199b14,14 grupos modernos ainda vazios,7 auditorias originais
preservadas por MD5 e nova íntegra;8 auditorias finais/1evento;0sessões ativas em Brotas.
Única outra sessão, inclusive de outra clínica, preservada por fingerprint
bbc619b9b4fc8a4f1ebbe3d15636ba14.10 lotes READ ONLY concluídos (incluem9SELECTs oficiais);
2 erros de sintaxe na composição do leitor07 corrigidos sem repetir DML. A e B foram
as únicas2transações de alteração.12cenários/25execuções e4recuperações isoladas anteriores
reaproveitados,0ensaios novos; nenhuma gravação de teste no principal.

### Recuperação e limites preservados

Recorte mínimo renovado pelo Export/Copy as CSV oficial, protegido fora do Git/público/logs:
scratch/recuperacao-caixa-legado-04e234ba145b4c53813c971f4abbae9b/recorte.dpapi.
DPAPI do usuário Windows/ACL exclusiva e roundtrip verificados; SHA256
088f4ff0539678ea39ece9a6686c2c788739bd0a3f59f0ac9f3d94eb39d7f759.
Exportação18:31:42.569353UTC:1sessão/2entradas/7auditorias/0eventos e definições pertinentes.
Conteúdo decodificado idêntico ao recorte recuperado nos4ensaios, exceto momento; não foi
repetida homologação sem mudança material. Essa cópia recupera a intervenção, não o banco
inteiro. Falha préCOMMIT é atômica; resultado incerto deve ser resolvido pela leitura do
evento único/estado, nunca por reenvio cego. Depois de operações legítimas futuras, não
restaurar banco inteiro, sobrescrever dados posteriores ou reabrir automaticamente o legado.
A não promete impedir um administrador de remover deliberadamente a proteção.

### Interface e arquivos

Aplicação normal de Brotas, perfil Recepção da conta fornecida, mostrou Caixa fechado e
botão Abrir caixa, inclusive após F5. A leitura inicial de acesso falhou transitoriamente;
Tentar novamente resolveu sem alteração de conta/vínculo. Console sem erro relevante na
verificação concluída. URL clinicabrotas.com.br/sistema/brotas/financeiro. Nenhum botão
de abertura/formulário financeiro acionado. Captura: scratch/caixa-legado-brotas-encerrado-2026-10-04.png.

03/04/10 preservados;05 permanece disabled/false/ROLLBACK e contém o manifesto congelado
da execução,06/07 são somente leitura com UUID fixo. Cópias de execução autorizadas A/B
ficam somente no scratch ignorado, não constituem autorização permanente/repetível.
Manifesto/09/inventário e registros sincronizados. Sem src/backend/migration/dependência
alterados, commit/push/deploy ou mudança de permissões existentes. A única ACL nova é da
função criada. Não foram testados novos recebimentos/recibos/fiscal externo, aparelho físico,
teclado virtual ou zoom nativo. TypeSafe sem pertinência; sem IA/chaves.

**Próxima ação:** usuário pode realizar a abertura normal com dinheiro efetivamente contado,
fundo independente do legado. A/B esgotadas nesta execução; sem pendência humana para esta
transição. Registros datados anteriores abaixo são histórico, não estado atual.


## Autorizações registradas; pré-execução bloqueada — 04/10/2026,15:12 -03:00

**A e B autorizadas expressamente pelo usuário, ainda NÃO aplicadas.** Usuário declara
que todos os dados atuais do sistema são testes e que não há dinheiro nem obrigações
reais associados ao caixa legado. Declaração atribuída ao usuário, sem conclusão
independente da auditoria. Responsável informado: **Eduardo Campos, desenvolvedor de
software**. Motivo: encerrar administrativamente a sessão de testes identificada para
permitir o fluxo atual, preservando registros/auditoria, sem transportar valores,
apagar registros, fabricar contagem/conciliação ou abrir automaticamente outro caixa.
Declaração geral de testes não autoriza alterar outros dados, clínicas ou sessões.

Projeto xftnkusbyqzyvzrovroj/main confirmado visualmente; VITE_SUPABASE_URL conferida
sem expor chaves. Branch Git codex/resgate-local-2026-09-26, HEAD2a6e88d0. Pedido de
execução A/B válido nesta conversa; histórico da restrição do canal preservado. Toda
consulta desta tentativa passou exclusivamente pelo SQL Editor oficial no IAB.

**Bloqueio concreto antes de A/B:** o procedimento homologado exige que responsavel_id
seja usuarios.id ativo com vínculo usuarios_clinicas ativo de papel proprietaria em
Brotas. Esse UUID preenche fechado_por e eventos_auditoria_financeira.usuario_id;
o evento registra papel proprietaria. Não é possível usar apenas um nome livre sem
alterar o contrato nem atribuir esse papel ao desenvolvedor por suposição.

Duas consultas READ ONLY executadas:18:09:51UTC e18:10:36UTC, executor postgres,
PostgreSQL17.6, pg_read_all_stats=true. Busca nome exato Eduardo Campos e busca mais
ampla nome_completo ILIKE %eduardo% retornaram0 contas. Nenhum CPF, e-mail, cadastro
de paciente ou credencial selecionado. Isso não exclui conta com outro nome.
Sessão exata a4a18e49-6634-4058-9fd8-07f3b065fd63, clínica
7c2a450d-7b9a-4701-8d5a-982eda331c58/subdomain brotas, continua aberta desde
03/08/2026 14:55:38.40657 -03, chave nula. Primeira fotografia:0 outras transações,
0 preparadas; segunda:0 locks de escrita em entradas/sessões. Proteção ainda ausente.

**Menor ação:** identificar qual conta já cadastrada corresponde a Eduardo e tem
vínculo ativo de Proprietária em Brotas. Não solicitar senha/chave. Se não existe
conta elegível, o contrato administrativo precisará de adaptação pontual revisada e
homologada; não criar/promover conta, atribuir a outra pessoa ou remover a guarda.
Não há novo pedido de autorização A/B: elas permanecem válidas para o escopo aprovado.

Nenhum A/B parcial foi aplicado. Não houve encerramento, abertura, ajuste, exclusão,
pausa, permissão existente alterada, commit/push/deploy. Recorte recuperável e ensaios
anteriores preservados; inventário completo/exportação não repetidos após a falha da
pré-condição. Renovação prevista antes da execução permanece obrigatória quando esse
impedimento for resolvido.03/04/10/inventário/gerador intactos;05 só atualiza o manifesto
embutido e permanece false/ROLLBACK. Sessão ainda aberta: abertura normal não liberada
pela transição, sem afirmar verificação da interface que não ocorreu nesta etapa.
Manifesto/09 e relatório14 seção17 contêm evidências mínimas. TypeSafe sem IA/chaves.

## Declaração do usuário — 04/10/2026,15:02 -03:00

O usuário declarou nesta conversa que **todos os lançamentos e operações da sessão
legada de Brotas foram testes realizados pelo próprio Codex/GPT**, incluindo as duas
entradas de R$500, o Pix de R$85,90 excluído e o fechamento seguido de reabertura.
**Fonte: declaração do usuário; não conclusão independente da auditoria.** O inventário,
registros e auditoria permanecem preservados, sem reclassificação/alteração no banco.

Objetivo informado: encerramento administrativo da sessão de testes para permitir o
fluxo atual, preservando registros/auditoria e sem transportar valores para nova abertura.
Não excluir registros nem fabricar contagem física, saldo zero ou conciliação financeira.
Não se infere ausência de dinheiro ou obrigações reais a partir da natureza declarada
de testes. Nome/função do responsável ainda não informados; A/B não concedidas.

**Única confirmação restante:** eventual dinheiro ou obrigação real associado (sim/não/
não sei; detalhes se houver), nome/função do responsável e decisões separadas A (instalar
a proteção restrita à sessão) / B (encerrá-la administrativamente, sem abertura automática).
Motivo proposto já registrado conforme objetivo do usuário; não repetir diagnóstico ou
questionário sobre natureza dos lançamentos. Principal sem escrita; scripts03/05/10
continuam desabilitados. Recuperação e homologação anteriores reaproveitadas.

## Conclusão limitada dos canais — 04/10/2026, 14:50 -03:00

**Preparação técnica concluída no escopo das evidências existentes; faltam somente
decisões humanas e autorizações A/B.** Não existe serviço antigo ativo identificado
que constitua bloqueio técnico adicional. Esta conclusão substitui a exigência genérica
de inventariar servidores/filas hipotéticos nas seções históricas abaixo. Não declara
que inexistem clientes externos desconhecidos nem que serviços foram interrompidos.

### Verificação oficial efetivamente realizada

Hostinger MCP autenticado, somente operações de leitura e filtros exatos dos dois
domínios: listagem de sites, configuração de build e três builds mais recentes por
site. Ambos habilitados; Node22, **Vite**, npm/build/dist, entry_file nulo; build mais
recente completed no SHA `2a6e88d09c0a8a51cd73649bf45530c2db6a6923`.
Brotas build `01a106e0-c036-7244-824a-7904af18355b`; Ipupiara
`01a106e0-c0af-726b-84bf-7603fa42905f`. Configuração corresponde ao frontend,
não à inicialização do Fastify histórico. Reaproveitados os hashes públicos e a leitura
do bootstrap atual; não repetidos percursos autenticados ou publicação.

Supabase IAB oficial, projeto `xftnkusbyqzyvzrovroj`, **main**, visualmente confirmado:
Functions mostrou **1 função em total**, `equipe-acessos`, atualizada “4 days ago”.
Code mostra index.ts/conviteAuth.ts/emailContext.ts/redirectUnidade.ts; index.ts lido
pela interface, 321 linhas. Ações listar/preparar/reenviar/alterar/aceitar, RPCs
equipe_acesso_* e Auth administrativo; nenhum destino de caixa/recebimento encontrado
nesse código. Não invocada a função, não aberto Secrets, não copiada credencial.
Integrations mostrou **INSTALLED somente Data API e Vault**. Cron, Queues e Database
Webhooks aparecem como opções, sem indicação INSTALLED; isso não equivale a examinar
todos os sistemas externos. Reaproveitada a consulta anterior cron.job ausente.
Nenhuma evidência concreta de fila financeira, integração de cobrança externa ou
backend antigo implantado foi encontrada; não se cria dependência de provar sua
inexistência universal. Outros projetos/sites não foram consultados ou alterados.

| Canal identificado | Existência, ambiente e situação | Gravação / alcance de A+B | Ação indispensável ou precaução |
| --- | --- | --- | --- |
| Sites atuais Brotas/Ipupiara | Ativos, Hostinger Vite, SHA2a6e88d0; serviço histórico Fastify não iniciado por essa configuração | Frontend/RPCs reais; legado já bloqueado no aplicativo e no recebimento moderno; locks de B cobrem relações relevantes | Pausa breve de envios afetados é precaução para evitar timeout/retry nas duas clínicas; não requisito de integridade nem suspensão do site |
| Registrar entrada histórico f08c37d/d3c664a | Fonte Git comprovada; implantação atual não encontrada nos sites verificados, rota não registrada no bootstrap atual | POST /api/caixa/entrada → SELECT sessão aberta + INSERT entradas_caixa, JWT normal; A+B recusa I/U/D sobre alvo fixo | Não há servidor concreto a suspender. Recomendar recarregar abas antigas. Se surgir evidência de backend antigo ativo, retirar esse caminho antes de nova abertura: ele resolve outra sessão aberta, que A não protege |
| Abertura histórica | Fonte d3c664a comprovada; não ativa nos sites conferidos | POST /api/caixa/abrir → INSERT sessoes_caixa; authenticated hoje só SELECT, portanto recusado; privilegiado não é operador normal | Sem pausa indispensável demonstrada; não testar endpoint por escrita |
| Fronteira Fastify posterior | Artefatos históricos; financeiro_privado/financeiro_api ausentes no catálogo, bootstrap atual só ping/despesas | RPC antiga não comprovadamente utilizável; não recebe proteção nova fora do alvo | Nenhum serviço identificado a parar; preservar Despesas/outros sistemas |
| Data API/PostgREST | Instalado e conexão observada; authenticated sujeito a RLS, service_role BYPASSRLS | Entradas diretas no alvo bloqueadas por A+B, inclusive serviço privilegiado; A isolada ainda permite INSERT enquanto aberto | Não pausar/revogar Data API. Revalidar inventário antes de B; escrita anterior muda fingerprint e aborta B |
| equipe-acessos | Única Edge Function implantada, código de Equipe/Auth lido; não é writer financeiro | Alterações de usuários/vínculos podem disputar locks de B; e-mail/convite tem efeito externo próprio, sem lançamento de caixa identificado | Adiar alterações de acesso na janela é precaução de disponibilidade; não suspender função ou e-mails como condição financeira |
| SQL administrativo / service_role | Papéis e grants comprovados; consumidor financeiro externo específico não identificado | Trigger protege DML ordinário do alvo; não protege TRUNCATE, DROP ou desabilitação deliberada por administrador | Executor autorizado não deve usar bypass; não investigar consumidores hipotéticos indefinidamente |
| Filas/retries/gateways externos | Nenhuma existência financeira concreta nas fontes consultadas | Não se afirma cobertura de efeitos externos por trigger | Não constituem bloqueio. Evidência nova de serviço concreto reabre somente seu caso |

### Concorrência, retentativa e necessidade real de pausa

H07/H08/H09/H11 já homologados em duas conexões reais são reaproveitados, sem nova
execução. CREATE TRIGGER espera escritores anteriores pelo lock de tabela. B usa
advisory lock da abertura, locks ordenados nas21 relações e lock da sessão. Escrita
concluída antes de B muda inventário e aborta; durante B aguarda/sofre timeout; após B
I/U/D tardios no alvo são recusados, incluindo service_role/postgres e snapshot antigo
(REPEATABLE READ40001). Repetição/resultado incerto exige leitura do evento/estado,
sem duplicação. A/B continuam desabilitados; nenhuma alteração lógica do candidato.

Portanto **não é indispensável suspender todos os serviços para assegurar atomicidade
e preservação do alvo**. Locks/guardas/trigger são a proteção comprovada; janela calma
é precaução para disponibilidade e conclusão sem timeout. A fotografia anterior sem
transações não prova situação futura. Antes da futura execução, consultar12 e aguardar
normalmente transações pertinentes/preparadas/locks de escrita que impeçam adquirir
os locks; timeout/deadlock/drift => abortar e analisar, nunca cancelar indiscriminadamente
conexões, enfraquecer trigger ou transformar pausa de UI em garantia de banco.

A análise do endpoint histórico d3c664a confirmou SELECTs/INSERT financeiro, sem
gateway, emissão externa ou fila antes do INSERT. Isso não faz a trigger desfazer
dinheiro fisicamente entregue ou cobranças de outro sistema. Retentativa que preserve
a sessão alvo é recusada após B; retentativa de backend antigo que resolva **nova**
sessão não é coberta por A. Nenhum backend assim ativo foi identificado: condição
concreta de reabertura da análise, não bloqueio por hipótese. Função de Equipe pode
enviar convites por Auth; não é cobrança/recibo nem writer do legado.

### Janela futura ajustada — condições de execução, não nova etapa de preparo

1. Somente após decisões e autorizações específicas, combinar horário/responsável.
   Recomendar que não haja envios financeiros e alterações de Equipe/vínculos por
   alguns minutos; recarregar telas antigas. Não desligar sites, Data API, Supabase
   ou serviços de outros projetos. Nenhum canal foi pausado agora.
2. Confirmar mesma release/configuração e fazer as leituras anteriores à execução:
   catálogo, inventário, sessão/auditoria e12. Se houver transação pertinente, esperar
   conclusão normal; não exigir “zero conexões” nem zero transações alheias. Se surgir
   serviço financeiro antigo concreto ou efeito externo não controlado, interromper
   e tratar esse caso identificado antes de prosseguir.
3. Atualizar inventário e renovar cópia protegida **na janela antes da intervenção**,
   como já previsto; não repetido nesta conferência por ausência de mudança invalidante.
   A somente com aprovação A; depois conferir seus objetos e diferença esperada de
   catálogo, atualizar selo do inventário sem aceitar diferenças inesperadas.
4. B somente com aprovação B/responsável/motivo/decisões e guardas satisfeitas. Drift,
   timeout ou conflito => rollback e revisão. Resposta incerta => leitura do UUID/evento/
   estado antes de decidir; nunca reenviar cegamente nem reabrir automaticamente.
5. Pós-verificações06/07 e auditoria; liberar uso atual após confirmação. Nova abertura
   permanece ação separada, com fundo contado independente. Se aparecer servidor
   histórico ativo, não retomá-lo contra novas sessões; caso contrário não inventar
   serviço a “retomar”.

`escritores_antigos_controlados=false` permanece como guarda conservadora da futura
janela, **não como bloqueio por canais hipotéticos**. Não foi marcada execução/suspensão
ou autorização concluída por inferência. Sua conferência concreta e registro técnico
na janela não exigem infraestrutura adicional. A/B e respostas da proprietária permanecem
nulas. Reaproveitados recuperação4/4 e concorrência12 cenários; **0 testes e0 exportações
novos**, nenhuma SQL de escrita principal ou invocação financeira. TypeSafe sem IA/chaves.


## Histórico — recuperação e canais antigos — resultado efetivo de 04/10/2026, 14:30 -03:00

Este complemento atualiza as duas pendências do quadro único abaixo. O diagnóstico
anterior de ausência de cópia recuperável foi superado **para o recorte da intervenção**.
Não representa backup integral, PITR, aprovação humana ou controle de todos os escritores.
TypeSafe reaproveitada: tarefa determinística, sem IA, API ou acesso a chave.

### Exportação oficial e proteção da cópia

Projeto `xftnkusbyqzyvzrovroj`, branch `main`, confirmados na aba oficial do SQL Editor.
`11-exportacao-recuperacao.sql` usa transação REPEATABLE READ / READ ONLY, com snapshot
único e guarda de sessão, quinze grupos, catálogo e auditorias iguais ao manifesto.
Uma primeira consulta teve erro de sintaxe no empacotamento JSON, corrigido localmente;
nenhum comando de escrita foi executado. O resultado válido é de17:02:33.816355UTC.
Foram obtidas **8 partes, 31.571 bytes**, sequência/total/tamanho e MD5 conferidos,
mais leitura de volta da cópia criptografada. SHA256:
`d5d9f3cb93d9fea1e37b510271fa1e8e7336f48d6c21c5b560f42113964e6a99`.
Hash confirma integridade; a prova de recuperação é a restauração descrita adiante.

O caminho é **Export → Copy as CSV**, pela interface oficial. Download CSV existe,
mas o navegador interno não entregou um arquivo/evento de download; não se afirma
que houve download concluído. Copy as CSV efetivamente forneceu o resultado completo.
A exportação CSV do SQL Editor também integra o
[teste oficial do Supabase Studio](https://github.com/supabase/supabase/blob/master/e2e/studio/features/sql-editor.spec.ts).
Nenhum token, cookie, chave, endpoint privado ou conexão alternativa foi utilizado.
O transporte local foi criptografado antes de gravar arquivos; a cópia final usa
DPAPI CurrentUser, isto é, proteção vinculada à mesma conta/perfil do Windows,
e pasta nova com ACL exclusiva. Transporte/chave temporários foram descartados.

Local protegido, relativo ao projeto:
`scratch/recuperacao-caixa-legado-82186a79d4054153ad8f629e69ee9574/recorte.dpapi`.
Pasta fora de Git/public/build; relatório e scripts não contêm os registros exportados.
Os bancos locais usados na recuperação também permanecem em scratch privado com
ACL exclusiva, parados e sem arquivo de senha. Não há garantia de apagamento físico
seguro em SSD nem cópia offline em outro dispositivo; não é recuperação de desastre
caso computador/perfil Windows sejam perdidos.

Recorte: **1 sessão, 2 entradas, 7 auditorias, 0 eventos financeiros**; quatorze grupos
modernos confirmados vazios pelo inventário, sem truncamento. Inclui os IDs necessários
dos vínculos financeiros, os before/after originais das auditorias (inclusive o Pix
excluído), definições de quatro tabelas, colunas/defaults/identity, constraints/FKs
internas e externas, índices, RLS/ACLs/policies/enums, duas funções de auditoria com
owner/ACL e três triggers. Ausência dos novos objetos A registrada explicitamente.
Não exporta prontuários, cadastro demográfico de pacientes, nomes, CPF, contatos ou
contas/credenciais de Auth. UUIDs pertinentes permanecem privados na cópia.
As decisões da proprietária continuam desconhecidas; descrição histórica não prova
que operações eram fictícias. Fundo/entradas não são saldo físico atual.

### Recuperação comprovada, fidelidade e reprodução

PostgreSQL17.11 portátil; laboratório novo `homolog_legado_5ffc40de3e9248f38abe0d1e2b273e8a`,
127.0.0.1:55896, diretório exclusivo marcado. Migrations relevantes, constraints,
FKs, RLS e funções reais recompostas, sem funções vazias para auditoria financeira.
Antes de carregar, compararam-se todas as colunas e constraints do recorte com o
catálogo exportado. Referências externas foram satisfeitas por cadastros auxiliares
**sintéticos**, com os UUIDs pertinentes, sem importar pessoas/usuários reais. A tabela
auth.users é apenas auxiliar de FK, sem GoTrue/login/JWT de produção.

Na restauração inicial, somente triggers de auditoria dos INSERTs de carga no banco
vazio foram temporariamente suspensos e reativados na mesma transação; FKs não foram
desabilitadas, não se usou replication_role e nenhuma auditoria original foi reescrita.
IDs de auditoria foram preservados com OVERRIDING SYSTEM VALUE. Fuso UTC e JSON
original, sem reserialização de números por JavaScript, preservam timestamps, escala
decimal e fingerprints. A rotina nunca fecha/abre a sessão restaurada.

| Caso dirigido novo | Evidência real |
| --- | --- |
| REC-R1 | Dez registros recuperados; JSON integral e MD5 de entradas/auditoria iguais; Pix excluído permanece somente na auditoria |
| REC-R2 | Duas funções reais recuperadas com owner e grants equivalentes e três triggers habilitados; registros preservados |
| REC-R3 | Resultado conferido novamente sem reaplicar dados; evento posterior sintético de outro escopo continua presente, sem duplicação |
| REC-R4 | Before-image incompatível recusado pelo próprio PostgreSQL, SQLSTATE55000, antes de DML; originais continuam iguais |

**4/4 casos finais aprovados.** Cinco invocações do executor nesta etapa: três
interrompidas por correções no próprio ensaio (UTC/escala decimal, ordem textual
equivalente de ACL, campos obrigatórios do evento sintético), uma passagem preliminar,
e uma final limpa com os quatro casos, incluindo a recusa SQL real. Não foram repetidos
H01–H12; suas evidências de atomicidade/concorrência permanecem reaproveitadas.
Candidato05 e proteção10 não tiveram alteração de lógica; apenas o manifesto
embutido em05 acompanha a evidência de recuperação, mantendo trava falsa/ROLLBACK.

O último cluster foi parado14:27:59 -03:00; PIDfile ausente, porta sem listener e
senha descartada. As outras duas instâncias desta etapa também estão paradas.
Scripts: `homologacao/exportar-recorte.mjs`, `recuperacao-privada.ps1`,
`recuperar-recorte.mjs`; resultados mínimos em09. O executor de recuperação exige
host, porta, banco, diretório e marcador do cluster exclusivo, recusa banco existente
com dados na carga inicial e não tem caminho de conexão ao principal.

Para reproduzir: abrir laboratório novo com ambiente.ps1, preparar-banco.mjs e usar
recuperacao-privada.ps1 -Action homologar -ArchiveDirectory <pasta privada>
-RuntimeFile <runtime novo>. O conteúdo é decifrado em memória e passado ao executor
por stdin, sem arquivo SQL/JSON financeiro em texto claro. Parar com ambiente.ps1
-Action stop ao terminar. ResumeObjects somente retoma ensaio local já carregado,
após conferir os mesmos originais; não habilita restauração principal.

Limites: PostgreSQL17.11 vs principal17.6; Auth/Vault auxiliares; catálogo relevante
recomposto, sem clonagem integral de Supabase. Metadados de policies incluem OIDs
locais do principal; não são um dump portátil de todos os papéis. A/B não alteram
policies/papéis existentes. A cópia é suficiente para recuperar/conferir o recorte
testado, não todo o banco. Não foi testada restauração no principal.

Após novas operações legítimas, **não usar a before-image para reabrir o legado**,
remover evento ou sobrescrever dados posteriores. A cópia permite comparar e preparar
correção pontual separada; não autoriza correção automática. Falha antes do commit
continua atômica; resposta incerta exige consulta por leitura do evento/estado/UUID;
evento/estado divergente exige investigação e outra aprovação. Recuperação de objetos
usa definições arquivadas e escopo pontual, sem restaurar banco inteiro nem remover
proteção já necessária às operações posteriores.

### Canais identificados e lacunas operacionais

Leituras de catálogo/metadados às17:18:34 e17:21:31UTC; consultas reproduzíveis em
`12-canais-escrita-leitura.sql`. Executor tem pg_monitor/pg_read_all_stats: a fotografia
de transações é integral nesse escopo. **0 outras transações, 0 prepared transactions,
0 locks de escrita nas21 relações**; conexões idle não provam suspensão operacional.
PostgREST14.5 é conexão real observada. cron.job ausente; presença do processo
pg_cron scheduler não comprova jobs. Não executada nenhuma função financeira.

| Caminho | Evidência e papel | Alcance / ação futura |
| --- | --- | --- |
| Aplicativo público atual | Dois domínios continuam com os bundles e SHA256 da publicação2a6e88d0; App usa FinanceiroModulo/Caixa, não Financeiro antigo. authenticated; Recepção/Proprietária sob RLS. | Legado bloqueado na UI e recebimentos modernos pelo trigger existente. Suspender envios financeiros de ambas as clínicas durante os locks, sem confundir UI com trava de banco. |
| Tela histórica Registrar entrada | f08c37d e d3c664a (03/04 agosto) chamam POST /api/caixa/entrada; servidor d3c insere diretamente entradas_caixa com JWT do usuário, incluindo paciente/profissional. | Snapshot antigo não comprova implantação ainda ativa. Backend/tabs antigos devem ser identificados e retirados do fluxo. A primeira versão sem vínculos obrigatórios também não comprova INSERT hoje aceito. |
| Backend antigo de abertura | POST /api/caixa/abrir inseria sessoes_caixa diretamente. | authenticated tem hoje só SELECT em sessoes_caixa: caminho antigo normal é recusado por grants; service_role/owner permanecem capazes. Não chamar para testar. |
| Artefatos Fastify preservados | Fronteira271db41/68f2016 chama financeiro_privado; bootstrap atual ddc47bc só registra ping/despesas. Schema financeiro_privado, papel financeiro_api e antiga RPC consultada ausentes no principal. | Fonte antiga não prova servidor implantado; o bootstrap atual não registra POSTs antigos. Não pausar despesas ou outros aplicativos sem necessidade demonstrada. |
| Data API sobre entradas_caixa | Grants reais de authenticated/service_role e policy INSERT com sessão aberta/vínculos; PostgREST real observado. | Operator normal sujeito a RLS; A+B impede I/U/D tardios na sessão fixa, inclusive serviço BYPASSRLS. A sozinha permite INSERT enquanto alvo aberto. |
| Serviços privilegiados / SQL administrativo | service_role e postgres têm I/U/D/TRUNCATE; nenhum writer SQL literal de entradas encontrado nas16 rotinas do recorte public/private/financeiro_privado. | Trigger protege DML comum do alvo, não TRUNCATE/desabilitação/drop ou outro alvo. Varredura textual não exclui SQL dinâmico, scripts externos, Edge Functions ou outros deploys não inventariados. |

Consulta confirmou trigger `recebimentos_bloquear_sessao_legada` BEFORE INSERT,
habilitado O. Não foi invocada RPC/endpoint de escrita. Os dois bundles públicos
foram conferidos por HTTP200 e SHA256 iguais ao relatório13; isso não inspeciona
abas já carregadas em computadores de terceiros nem um backend externo antigo.

**Lacuna que permanece:** não há inventário conectado dos deploys antigos, filas,
scripts externos ou consumidores reais de service_role. Não se declara todos os
canais controlados; `escritores_antigos_controlados` permanece false. Responsável
técnico precisa mostrar pela interface do provedor os aplicativos/deploys antigos
e seus agendamentos e confirmar quais ainda atendem caixa; no Supabase conferir
Edge Functions/deploys e eventuais integrações configuradas. Não fornecer senhas,
chaves ou dumps de configurações. Sem essa evidência, B continua bloqueado.

### Sequência concreta da janela futura — não executada agora

1. Nomear responsável e horário; obter inventário dos serviços acima. Confirmar que
   POST /api/caixa/entrada e /api/caixa/abrir dos backends históricos **não serão
   retomados** contra o principal. Se deployment/rotina privilegiada não identificado,
   interromper o preparo de B, sem marcar controle como verdadeiro por suposição.
2. Na janela autorizada, suspender envios de caixa/recebimento/estorno/sangria/
   suprimento/fechamento das duas clínicas e gravações de clinicas/usuarios/
   usuarios_clinicas atingidas pelos locks. Retirar abas históricas, impedir retomada
   de filas/retries dos serviços identificados e obter confirmação dos responsáveis.
   Encerrar somente os processos/canais de caixa antigos identificados, pela interface
   do provedor; não revogar papéis, pausar todo o Supabase, outros sites ou despesas.
3. Com os envios suspensos, executar12 por leitura. Exigir pg_read_all_stats verdadeiro,
   nenhuma outra transação ativa/idle-in-transaction, prepared transaction ou lock
   de escrita nas21 tabelas. Verificar novamente depois da confirmação de suspensão.
   Persistência de transação/timeout => aguardar responsável encerrar normalmente;
   não usar pg_cancel_backend/pg_terminate_backend nem desativar triggers por atalho.
4. Revalidar01/02/auditoria e renovar11/cópia protegida **ainda sem A**. Drift => parar,
   analisar alterações legítimas, rever o pacote; não atualizar hashes às escondidas.
   Cópia datada desta etapa não substitui cópia imediatamente anterior à intervenção.
5. Somente com autorização **A**, instalar os dois novos objetos no artefato autorizado
   e transação controlada. Conferir owner/ACL/trigger/ausência de alterações financeiras.
   Catalogo mudará por A: registrar a diferença esperada, revisar e selar manifesto
   posterior a A; não tratar o MD5 anterior como válido após instalar objetos novos.
6. Manter os escritores suspensos; conferir inventário novamente. Somente com decisões
   humanas e autorização **B** específicas, gerar/revisar artefato habilitado separado,
   executar o candidato validado e fazer06/07 + catálogo/auditoria por leitura.
   Erro antes do commit => abortar; resposta incerta => não reenviar nem reabrir;
   consultar estado/evento pela mesma identificação. Divergência => parar/investigar.
7. Retomar **apenas o aplicativo e serviços atuais conferidos**, depois de concluir
   pós-verificações. Fluxo antigo não pode voltar: ao resolver próxima sessão aberta
   poderia contaminar caixa moderno; A protege exclusivamente o alvo antigo, não esse
   caso. Nova abertura é ação futura com dinheiro contado e fundo independente.

Nenhum serviço foi pausado, acesso revogado ou permissão alterada nesta etapa.
A cria função/trigger, sem linha financeira; B altera somente status/fechado_por/
fechado_em e acrescenta auditoria/evento administrativo, sem contagem/conciliação,
ajuste, transporte de dinheiro ou abertura automática. **A/B continuam nulas**;
natureza das entradas/Pix, custódia, obrigações, responsável e motivo continuam pendentes.

## Histórico — revisão técnica anterior às novas evidências de recuperação

## Pacote único para decisão final — revisão técnica de 04/10/2026, 13:27 -03:00

**Preparação técnica concluída no escopo autorizado. Execução principal bloqueada.**
Este quadro consolida a proposta vigente; as seções anteriores de preparo abaixo são
histórico. Não há autorização A ou B preenchida no manifesto. Nenhuma regra financeira
nova, permissão de objeto existente, frontend, publicação ou transição foi aplicada.

### Alvo e revalidação conectada

Projeto `xftnkusbyqzyvzrovroj`, branch Supabase `main`, confirmados no endereço e
seletor do SQL Editor oficial no IAB. Exceção de canal do usuário mantida somente
para leitura. PostgreSQL17.6, executor postgres/BYPASSRLS, sem SUPERUSER, transações
READ ONLY. Seis lotes SQL de leitura concluídos, sem erro SQL. Um literal MD5 digitado
incorretamente deu comparação false; corrigido, o corpo real da auditoria correspondeu
à migration. Não houve mudança de função para fazer a comparação passar.

- Clínica Brotas `7c2a450d-7b9a-4701-8d5a-982eda331c58`, ativa.
- Sessão `a4a18e49-6634-4058-9fd8-07f3b065fd63`, aberta em03/08/2026
  14:55:38.40657 -03:00, status aberto, idempotency_key nulo: critério de legado.
- Operador UUID já registrado, conta/vínculo ativos, papel atual recepcao.
  Papel atual não comprova papel na abertura; nome do operador/pacientes desnecessário.
- Fundo original15050centavos, duas entradas50000centavos em dinheiro cada;
  MD5 entradas `ca2117e340b8061508a2a00a05199b14` igual. Não é saldo físico.
- Os14 grupos modernos do grafo completo de02 continuam vazios. Não há outra sessão
  ativa na clínica. Isso não comprova inexistência de obrigações fora desse grafo.
- Sete auditorias originais e fingerprint `8c4a81ef391349157ff07140e5559200` iguais;
  Pix excluído permanece parte da auditoria, sem restauração. Eventos financeiros0.
- Catálogo21 tabelas/712 itens, MD5 `15392c1671489765fe9074cb14fc8dad` igual ao
  inventário anterior: colunas, constraints/FKs, índices, RLS/ACLs, triggers e funções
  financeiras incluídos. SELECT integral nos21 objetos; vínculos das duas entradas
  continuam válidos, sem selecionar nomes ou IDs de pacientes.
- Triggers de auditoria e imutabilidade habilitadas. Corpo de fn_auditoria igual ao
  laboratório/migration, SECURITY DEFINER/search_path pg_catalog, owner postgres.
- A nova função e trigger **ausentes** no principal. Extensões pgcrypto1.3,
  btree_gist1.7 e plpgsql1.0 iguais às do laboratório.
- Nenhuma outra transação ativa/preparada no instante16:21:15UTC. Fotografia datada,
  não prova de suspensão de jobs/clientes antigos ou ausência de transações futuras.

Nenhuma diferença material nova encontrada no recorte. Diferenças conhecidas mantidas:
17.11 no laboratório vs17.6, postgres superuser local vs postgres não-superuser/BYPASSRLS
principal, Auth/Vault auxiliares, demais migrations/Storage parciais. As roles reais
service_role e authenticated conferidas; não foi fabricada autenticação no principal.
Evidência mínima acrescentada a inventario-confirmado.json; snapshot anterior preservado.

### Caminho de gravação e alcance revisado

| Agente | Caminho e evidência | Alcance da proteção |
| --- | --- | --- |
| Operador do aplicativo | authenticated, sujeito a RLS/clinica/papel e sessão aberta. Aplicativo atual bloqueia legado; useEntradasCaixa apenas SELECT. H08 já recusou escrita tardia normal. | Sem acesso novo. Trigger soma proteção do alvo às regras existentes; não substitui autenticação/RLS. |
| Serviço privilegiado | INSERT SQL direto em public.entradas_caixa com SET ROLE service_role no laboratório. BYPASSRLS ignorou a policy que exige aberto; **sem trigger**, inserção após fechamento passou, revertida no ensaio. Não há prova de que um serviço real fez isso. | BEFORE trigger também executa para service_role e recusa INSERT/UPDATE/DELETE do alvo encerrado. Não depende da interface. |
| Administrador do banco | SQL Editor postgres é owner dos quatro objetos e BYPASSRLS, embora não seja SUPERUSER no principal. | DML comum passa pela trigger, conforme H08. Um owner/administrador pode deliberadamente desabilitar/remover proteção ou usar TRUNCATE; isso **não é impedido** pela proposta. |

A proposta10 cria somente:

1. Função `private.financeiro_proteger_entrada_legado_administrativo()`, plpgsql,
   SECURITY DEFINER, search_path=pg_catalog, referências qualificadas e UUIDs fixos;
   propriedade esperada postgres. EXECUTE direto revogado de PUBLIC/anon/authenticated/
   service_role **somente nessa função nova**. ACLs existentes não modificadas.
2. Trigger `entradas_caixa_legado_administrativo` na tabela `public.entradas_caixa`,
   BEFORE INSERT OR UPDATE OR DELETE, FOR EACH ROW, função acima. CREATE simples,
   sem OR REPLACE/DROP: objeto inesperado preexistente causa erro/rollback.

O SQL principal continua falso/ROLLBACK. Sem alteração de tipo/status/constraint,
RPC, RLS, auditoria ou colunas. Novos objetos exigem autorização A específica.

Só entradas cujo OLD ou NEW pertença à sessão fixa passam pela guarda. Outras sessões,
caixas modernos e clínicas retornam NEW/OLD sem novo bloqueio; continuam sujeitos às
regras originais. Na sessão alvo exige clínica correta, chave nula e SELECT FOR SHARE
na sessão. Recusa estado diferente de aberto ou evento administrativo já existente,
mesmo após reabertura manual. UPDATE não pode deslocar entrada do alvo para outra
sessão/clínica; isso é uma restrição específica de preservação desse histórico, inclusive
antes de B. Não impede novas entradas no legado ainda aberto entre A e B: nova leitura
e controle de escritores são necessários. Não bloqueia SELECT nem cria auditoria nova
para comandos recusados. Auditoria real permanece para comandos efetivamente aceitos.

CREATE TRIGGER adquire lock da tabela e espera escritores anteriores. B usa advisory
lock da abertura e locks SHARE ROW EXCLUSIVE ordenados em21 relações, mais lock da
sessão. Gravação que concluir antes de B altera fingerprint e aborta B; concorrente
aguarda/recebe timeout; após B a trigger nega o alvo. Snapshot antigo foi recusado40001
em H08. Timeout/deadlock é interrupção, nunca motivo para contornar locks. Os locks de B
afetam temporariamente escritas das **duas clínicas** e de clínica/usuário/vínculo;
planejar janela breve, sem cancelar conexões indiscriminadamente. Clientes/jobs antigos
que escrevam diretamente entradas_caixa precisam ser identificados e seus envios
pausados; observar metadados de transações não identifica sozinho todos esses canais.

### Preservação e recuperação

**Hashes e arquivos SQL são verificações de identidade, não backups recuperáveis.**
No painel oficial Database > Backups > Scheduled backups do principal foi observado:
“Free Plan does not include project backups.” Não há backup agendado demonstrado nesse
painel. Não verificar preço/assinar plano/restaurar/provisionar. Uma eventual cópia
manual externa pode existir, mas não foi apresentada nem validada: recuperação principal
permanece não comprovada e bloqueia B. O plano Free não demonstra perda dos registros.

Antes de A: arquivar pelo canal oficial autorizado os metadados dos objetos atuais,
owner/ACL/RLS/definitions/dependências e ausência dos dois novos objetos; comparar o
alvo e catálogo imediatamente antes de DDL. Armazenar versões da função/trigger proposta
para recuperação pontual. Como A cria objetos novos e não escreve registros financeiros,
a recuperação técnica testada é transação atômica ou reinstalação desses objetos,
com janela e validação; nunca remover a proteção por simples urgência operacional.

Antes de B: responsável técnico deve disponibilizar por canal oficial autorizado uma
cópia lógica íntegra do grafo afetado, estados originais, auditoria histórica incluindo
exclusões, eventos e objetos/dependências necessárias. Dados sensíveis ficam em arquivo
privado protegido, fora de Git/logs/relatório, com responsável, data, abrangência e retenção.
Validar leitura e restauração numa cópia separada autorizada, conservando constraints,
vínculos e auditoria. Não presumir que CSV parcial de tabela ou exportação de hashes
atende isso. Nenhuma extração de registros reais ou credencial foi feita nesta revisão.
Se o canal disponível não permitir tal cópia/validação, manter B bloqueada e solicitar
apenas a habilitação de canal oficial adequado, sem extração de tokens como atalho.

| Situação | Procedimento |
| --- | --- |
| A ou B falha antes do commit | PostgreSQL reverte transação. Consultar por conexão nova o estado/objetos/eventos; não completar partes manualmente. REC-A-ATOMICA e H06/H11 comprovam isso no laboratório. |
| Resposta incerta A após commit | Ler os dois objetos, corpo/owner/ACL/trigger e estado enabled. Ambos exatos: concluído; ambos ausentes e originais iguais: reavaliar repetição. Um objeto ou corpo divergente: parar. Não reenviar CREATE cegamente. |
| Resposta incerta B após commit | Reabrir somente leitura, UUID fixo do evento + estado + auditoria + originais. H11 já demonstrou repetição sem duplicidade. Evento conflitante/ausente com sessão alterada bloqueia; nunca presumir falha pelo silêncio. |
| Proteção precisa de correção após novas operações legítimas | Arquivar estado novo; preparar reparo dos dois objetos, com autorização separada, locks e pós-checks. Reinstalação do corpo/owner/ACL/trigger arquivados foi executada em laboratório, preservando sessão posterior e todos os registros. Nunca DROP/desabilitar como recuperação automática. |
| Decisão administrativa B precisa de correção após novas operações | Preservar fechamento/evento e sessões novas; investigar e preparar registro corretivo auditável, sem reescrever originais ou fazer ajuste monetário para zerar. Não há procedimento genérico de reversão aprovado. Restaurar eventual cópia só em ambiente separado para investigação, jamais sobre principal inteiro ou reabrindo legado automaticamente. |

Nova comprovação de laboratório: instância exclusiva40330f20a003432198f9417579cd7cfc,
127.0.0.1:59026, PostgreSQL17.11. H01/H05 repetidos como preparação/regressão necessária;
REC-A-ATOMICA e REC-A-PONTUAL aprovados. Reinstalação usou arquivo efetivamente arquivado,
com corpo, owner, ACL, trigger e enabled iguais, nenhuma linha reescrita; sessão moderna
posterior com12345centavos preservada e service_role permaneceu recusado. Resultado lido
por conexão nova. **4 testes dirigidos aprovados nesta revisão**;12 cenários/25 execuções
anteriores reaproveitados, não reexecutados indiscriminadamente. Pg_dump/pg_restore
anterior é evidência apenas sintética. Instância nova parada13:24:51 -03:00, senha
removida, PIDfile ausente, porta livre. Script existente complementos.mjs ganhou opção
--revisao-recuperacao; nenhuma série nova de documentos. SQL lógico de05/10 não alterado;
só cabeçalhos/comentários corrigidos e metadados do manifesto atualizados.

### Autorizações futuras separadas, ordem e condições

| Autorização pendente | Efeito exato e pré-condições |
| --- | --- |
| **A — instalar proteção revisada** | Criar função e trigger descritas, restringir EXECUTE só da nova função e nenhuma linha financeira. Não encerra sessão nem libera nova abertura. Exige executor autorizado, catálogo/alvo iguais, janela/controle de writers, arquivo aprovado por hash e cópia de metadados dos objetos. |
| **B — encerrar administrativamente somente o alvo** | Depois de A validada e novo inventário/catalogo (hash necessariamente muda), alterar somente status aberto→fechado, fechado_por→responsável aprovado e fechado_em→momento real; acrescentar1 auditoria pela trigger e1 evento financeiro administrativo com valor nulo, motivo, responsável/execução fixos, evidências e limitações. Exige backup recuperável comprovado, writers/janela, decisões humanas e aprovação específica B. |

Sequência concreta para execução posterior: (1) resolver cópia/recuperação e identificar
writers; (2) arquivar metadados e obter A vinculada aos arquivos; (3) nova leitura do alvo,
instalar A em transação aprovada separada e verificar definitions/ACL/owner/trigger;
(4) refazer01/02 após A e aceitar explicitamente o novo catálogo, sem atualizar hashes
às escondidas; (5) concluir avaliação humana/custódia/obrigações e obter B com UUID fixo;
(6) executar futuro artefato B aprovado em transação, com guards e pós-condições internas;
(7) consultar06/07 e evento integral por leitura, conferir três campos, entradas/auditorias
antigas iguais, exatamente1 novo evento/auditoria, nenhuma sessão aberta automaticamente.
Mudança material de qualquer dado/catálogo, objeto inesperado, acesso parcial, backup
inválido, escritor não controlado ou decisão faltante interrompe essa sequência.
03/05/10 atuais continuam desabilitados; aprovação futura não autoriza editá-los como atalho.

B preserva fundo15050centavos, duas entradas100000centavos no total e Pix excluído,
sem contagem física, saldo esperado, diferença, aprovação financeira ou quitação
inventados. Histórico mantém “Fechado · legado” e evento administrativo inequívoco.
Se essa representação não for aceita pela responsável, parar e revisar antes de B.
Abertura posterior é ação independente no aplicativo, com dinheiro efetivamente contado;
nenhum transporte automático de fundo ou criação de recibo/repasse/estorno/sangria.

**Respostas humanas ainda pendentes:** natureza das duas entradas e do Pix excluído;
o que se sabe do fechamento/reabertura; dinheiro sob custódia e tratamento; pagamentos/
devoluções/obrigações e encaminhamento; proprietária responsável, motivo e aceitação dos
limites. “Não foi possível comprovar” é permitido e fica registrado. Custódia ou obrigação
sem avaliação, responsável ou plano definido bloqueia B; desconhecido nunca vira zero.

**Parecer final:** pacote técnico concluído; nenhuma diferença nova do inventário.
Bloqueios de execução: recuperação principal não comprovada (Free sem backups no painel),
controle efetivo de escritores/janela e autorizações/decisões humanas pendentes.
TypeSafe anterior reaproveitada, sem IA ou chaves. Sem escrita principal/commit/push/deploy.

## Homologação real sem Docker — resultado atual

Foram encontrados binários portáteis PostgreSQL17.11 em `scratch/tools`, já utilizados
no laboratório Agenda. Não houve download/instalação, serviço, PATH global, firewall
ou configuração do projeto normal alterados. O fornecedor EDB é indicado pelo
[PostgreSQL para Windows](https://www.postgresql.org/download/windows/).
SHA-256 do ZIP e executáveis registrado em09; postgres/psql/libpq/pgcrypto/btree_gist
extraídos correspondem aos respectivos arquivos dentro do ZIP local. EXE sem assinatura
Authenticode e checksum autoritativo do fornecedor não disponível: não declarar
origem criptograficamente atestada. Consultas HEAD públicas EDB não provam igualdade
de bytes com esse ZIP preexistente.

Cluster novo exclusivo `scratch/homologacao-caixa-legado-e075e28c6f0448139c9a48f71259be5f/data`,
`127.0.0.1:64752`, banco `homolog_legado_e075e28c6f0448139c9a48f71259be5f`.
Initdb, banco inicial vazio, diretório, porta, endereço e marcador conferidos por SQL
antes das alterações. Senha de teste aleatória, SCRAM, pasta privada e nenhum segredo
no Git/log/comando. O sandbox falhou com token Windows87; revisão automática autorizou
a execução pela conta normal, sem instalação administrativa ou contorno manual.
Instância **parada em12:50:39 -03:00**; senha descartada, PIDfile ausente e porta sem listener.
O cluster, dump sintético e rodadas permanecem privados em scratch para reprodução;
nunca são pacote servido ou artefatos para Git. Banco principal não conectado nesta etapa.

**12 cenários distintos PostgreSQL aprovados**,25 execuções aprovadas contando regressões.
H02/H03 reaproveitados porque rejeitam antes dos trechos alterados. Após correção,
repetidos H01/H04–H12; depois H01/H08 e H12 após ajuste de acesso ao novo objeto.
Erros de preparação (FK no reset, comparação inet, coluna de fixture, nome duplicado
no helper) corrigidos e rodadas preservadas; não são falhas financeiras no principal.
Nenhuma nova suíte de testes offline foi usada como prova desta homologação.

| Caso | Resultado observado no PostgreSQL |
| --- | --- |
| H01 | Só3 campos da sessão alterados;2 entradas e7 auditorias preservadas; +1 auditoria e+1 evento administrativo; contagem nula |
| H02/H03 | Outra clínica/sessão, chave moderna e fechado sem evento recusados, sem efeitos |
| H04 | Entrada, auditoria, vínculo moderno e catálogo alterados detectados e recusados |
| H05 | Repetição sem efeitos, inclusive com nova sessão posterior preservada |
| H06 | Falhas após UPDATE/trigger e após evento: rollback integral, nenhum efeito parcial |
| H07 | Duas conexões; RPC real de abertura espera advisory lock e só abre após commit válido; antes é recusada |
| H08 | Duas conexões; antes detecta drift, durante55P03, depois55000; snapshot antigo40001 sem entrada; service_role/postgres bloqueados; outra clínica permitida |
| H09 | TRUNCATE concorrente55P03; UPDATE de auditoria recusado; Pix continua excluído |
| H10 | Nova abertura pela RPC real com12345centavos; sem transportar15050/100000 |
| H11 | Conexão interrompida após UPDATE: conexão nova comprova rollback; resposta descartada após commit: evento único e repetição íntegra |
| H12 | Aprovação/avaliação ausentes, role parcial, responsável inativo e evento divergente recusados |

### Defeito encontrado e correção proposta

Sem proteção adicional, `service_role` com BYPASSRLS conseguiu INSERT em
`entradas_caixa` depois do encerramento. Foi comprovado em transação sintética,
sem persistir o lançamento. Locks protegem a transação, mas não os escritores depois
do commit; a interface sozinha não protege esse canal.

Correção mínima homologada **só no laboratório**:

- Nova função privada `private.financeiro_proteger_entrada_legado_administrativo()`
  e trigger `entradas_caixa_legado_administrativo`, BEFORE INSERT/UPDATE/DELETE.
- Alvo fixo clínica/sessão. Bloqueia DML se estado não for aberto ou se existir evento
  administrativo, mesmo com BYPASSRLS e mesmo após reabertura manual sintética.
  Usa lock de linha FOR SHARE e conserva os checks reais de FK/RLS e auditoria.
- Retorna sem restringir entradas de outra sessão/clínica; operação válida de outra
  clínica foi efetivamente testada. Não altera valores, vínculos ou registros existentes.
- EXECUTE direto revogado somente no **novo objeto privado**; ACLs de objetos existentes
  não modificadas por essa proposta. Não concede novo papel ou privilégio aos clientes.

Proposta principal em `10-protecao-escritor-legado.sql.disabled`: trava falsa e rollback,
**não aplicada**.05 continua falso/rollback e agora exige essa proteção antes de DML;
o catálogo/fingerprint precisará ser revisto após eventual adaptação aprovada.
Não usar o fingerprint anterior como se já incluísse a nova trigger no principal.
São dois passos futuros com autorização específica: primeiro adaptação revisada;
depois novo inventário/catálogo e aprovação de encerramento. Nenhum deles autorizado agora.

Fluxo antigo a controlar: gravação direta em `public.entradas_caixa`, por authenticated,
service_role ou SQL administrativo. O código vigente encontrado só lê essa tabela;
isso não prova ausência de jobs/clientes antigos. Identificar esses escritores,
suspender seus envios durante a janela, e conferir transações em andamento por
metadados de `pg_stat_activity` autorizados, sem divulgar queries com dados privados.
Não considerar logout, tela bloqueada ou manutenção do frontend como controle do banco.
Com a proteção proposta, envios tardios ao alvo serão recusados pelo banco; a pausa
permite adquirir locks e inventariar sem drift. Sem adaptação aprovada, manter bloqueio.

A nova proteção não impede um DBA de removê-la/desabilitá-la, alterar eventos ou
executar TRUNCATE. Controle desses poderes e recuperação continuam necessários;
não alterar permissões existentes como solução silenciosa nesta tarefa.

### Fidelidade, recuperação e reprodução

Estruturas reais de baseline/migrations Financeiro fases1–7, estados, resumo e hardening;
35 tabelas,36 triggers antes da proteção nova, pgcrypto1.3/btree_gist1.7.
RPC de abertura, constraints/índice de sessão ativa, RLS/helpers de papéis,
auditoria/imutabilidade executados com corpos reais. `fn_auditoria` tem prosrc
exatamente igual ao recorte da migration27/09, SECURITY DEFINER/search_path conferidos.
Não substituímos esses mecanismos por funções vazias.

Limites: PostgreSQL17.11 vs principal17.6; Auth/Vault são auxiliares de contrato do
bootstrap versionado, sem GoTrue, login/JWT Supabase real ou Vault criptográfico.
Contas auxiliares de FK são exclusivamente sintéticas, não usuários de autenticação
Supabase nem prova de login. Storage, histórico da CLI/migrations e demais evoluções
de Pacientes não reproduzidos integralmente. Catálogo recomposto, sem equivalência
completa remota. Script de integridade consultado por blocos; catálogo financeiro
conferido separadamente. Dependências `supabase_migrations.schema_migrations` e `storage.buckets`
ausentes, registradas como limitação, sem fingir integridade total do sistema.

Pg_dump/pg_restore em segunda cópia do mesmo cluster exclusivo comprovou hashes iguais
da sessão, entradas, auditoria e eventos. Não comprova backup/PITR/restauração seletiva
do principal. Recuperação por interrupção/resultado incerto confirmada; nunca reabrir
automaticamente ou restaurar todo o banco sobre operações posteriores.

Reprodução, sem segredo e somente em instância nova:

```powershell
# Pela conta Windows autorizada; sem instalação de serviço ou administrador.
& database/operations/caixa-legado-brotas/homologacao/ambiente.ps1 -Action start
# Usar o caminho RUNTIME retornado, sempre novo; não usar banco/credencial existente.
node database/operations/caixa-legado-brotas/homologacao/preparar-banco.mjs "CAMINHO_RUNTIME"
node database/operations/caixa-legado-brotas/homologacao/executar.mjs "CAMINHO_RUNTIME" H01,H02,H03,H04,H05,H06,H07,H08,H09,H10,H11,H12 --protecao
node database/operations/caixa-legado-brotas/homologacao/complementos.mjs "CAMINHO_RUNTIME"
& database/operations/caixa-legado-brotas/homologacao/ambiente.ps1 -Action stop -RuntimeFile "CAMINHO_RUNTIME"
```

Parar a instância mesmo diante de erro; não repetir start/reutilizar runtime antigo.
Dados e credenciais temporárias nunca versionados. Casos/rodadas mínimos em09 e
`homologacao-casos.json`; fontes/hashes/rodadas completas sintéticas em scratch privado.

**Parecer:** homologação financeira isolada concluída com correção proposta;
principal bloqueado para adaptação, revalidação e autorização. Decisões humanas,
custódia/obrigações, responsável/motivo e aprovação continuam vazios. Não há saldo
físico/quitação comprovados. TypeSafe determinístico, sem IA/chaves. Sem operação
real, alteração no principal, commit/push/deploy.

## Histórico do preparo documental anterior — não é o resultado atual

O conteúdo abaixo conserva o estado anterior à autorização de PostgreSQL portátil.

## Ambiente efetivamente encontrado

O executável Docker existe, mas `docker version --format '{{.Server.Version}}'`
falhou: o pipe `docker_engine` não existe, e a leitura da configuração Docker foi
negada pelo sistema. Não extraímos a configuração nem contornamos a restrição.
`Get-Command` não encontrou `psql`, `postgres` ou `pg_ctl`; o diretório conhecido
`C:/Program Files/PostgreSQL` não apresentou instalação. PGlite não está instalado
nas dependências. Nenhum conector PostgreSQL/Supabase utilizável foi disponibilizado
nas ferramentas desta sessão; ferramentas de outros sistemas não são substitutos.

O projeto possui configuração Supabase local para PostgreSQL17, mas não há servidor
isolado funcionando comprovado. Não executamos start/reset/stop, não instalamos
dependências e não presumimos que um banco local existente está vazio ou é dedicado.
Não criamos infraestrutura paga, não alteramos Docker ou projetos de terceiros.
A aba Supabase principal não foi usada nesta etapa. Evidências do inventário anterior
foram reaproveitadas; não são uma revalidação ao vivo para execução.

**Homologação PostgreSQL: zero cenários executados.** Os testes Node verificam arquivos,
guardas e geração; não comprovam SQL válido, atomicidade, RLS, concorrência ou persistência.
Os14 testes anteriores do preparador também são offline, não homologação em banco.

Nesta etapa foram executados30 testes offline, todos aprovados:14 do preparador e16
do candidato separado, em uma rodada. Lint dos4 arquivos mjs com saída0. As verificações
de preservação por SHA-256 incluem03/04 congelados; candidatos gerados correspondem
ao gerador/manifesto. Verificação sintática Node e diff-check registrados no resultado
local. TypeScript/build e suítes da publicação não repetidos: nenhum código da aplicação,
dependência ou pacote servido foi alterado. Nada disso substitui H01–H12 em banco.

## Candidato e adaptação mínima proposta

`05-candidato.sql.disabled` é um candidato separado, gerado por `candidato.mjs`.
O03 original e o04 histórico permanecem intactos. Ambos os candidatos têm trava
incondicional falsa antes dos locks/DML e rollback final. O gerador não oferece
opção para habilitar a transição, não acessa rede/banco/.env e não preenche aprovação.
Nenhum arquivo desta entrega é um comando de produção pronto para executar.

O modelo observado admite o estado antigo `fechado` com valores de conferência
nulos. A proposta utiliza esse estado com **evento administrativo explícito**, sem
usar `aprovado` ou criar fechamento moderno. Não se propõe novo enum, coluna, RPC,
migration, grant ou alteração da interface nesta etapa. Isso continua uma escolha
em revisão: se o evento e “Fechado · legado” não forem aceitos como distinção suficiente,
será necessária uma proposta separada de representação, nunca aprovação fictícia.

Efeitos propostos, exclusivamente na sessão já identificada de Brotas:

| Registro | Alteração proposta | Limite |
| --- | --- | --- |
| Uma `sessoes_caixa` | `status: aberto → fechado`, `fechado_por: responsável autorizado`, `fechado_em: momento da operação` | Só esses3 campos; abertura/fundo/operador/chave e outros campos iguais |
| Um `eventos_auditoria_financeira` | UUID fixo; ação administrativa, motivo, responsável, snapshots, manifesto/evidências e limitações | `valor=null`; contagem e conciliação não comprovadas; executor SQL separado do responsável |
| Uma `auditoria` | INSERT automático da trigger de atualização da sessão | Motivo em `audit.motivo`, estados antes/depois; referência e hash guardados no evento administrativo |
| Entradas antigas, Pix excluído, grafo e7 auditorias anteriores | **Nenhuma alteração** | Hashes completos comparados, sem exportar dados de pacientes |
| Próxima sessão | **Nenhuma criação** | Abertura futura independente, pelo serviço existente, com fundo efetivamente contado |

Proprietária ativa na clínica responde pelo encerramento administrativo; executor
técnico deve possuir acesso oficialmente autorizado para a ação pontual futura.
Recepção não ganha permissão nova. `auth.uid()` real pode ser nulo no SQL Editor;
não criar claims para fabricar identidade. Não chama RPCs de fechamento/aprovação,
não gera repasse, recibo, devolução, sangria ou suprimento.

## Pré-verificações concretas

1. Comprovar isolamento antes de qualquer teste: identificação do servidor/processo,
   diretório/container dedicado, banco vazio e sem uso por outro sistema; PostgreSQL17.6
   ou registrar a diferença. Não apontar ferramentas para o principal por conveniência.
2. Reproduzir os objetos relevantes do catálogo observado e comparar tipos, constraints,
   índice único de ativos, funções/triggers, RLS/grants. A fixture descritiva em
   `homologacao-casos.json` não é uma cópia completa do schema. Não aplicar todas as
   migrations locais sem revisar dependências/paridade com o catálogo confirmado.
3. Criar somente dados sintéticos conforme a fixture, inclusive os vínculos válidos
   de pessoa/profissional, duas entradas em dinheiro, auditoria do Pix excluído e
   fechamento/reabertura sem contagem. Nunca importar registros reais nem `auth.users`
   do principal. Não usar INSERT direto para criar usuários de autenticação Supabase.
4. Produzir artefato de homologação **separado** com UUIDs sintéticos e uma guarda
   positiva de banco/ambiente dedicado.03 e05 destinados ao principal continuam falsos.
   Trocar apenas os identificadores de teste; manter a lógica de preservação/recuperação.
   Selar o catálogo e inventário sintéticos após a preparação; aprovação de teste
   não preenche o manifesto do principal.
5. Executar H01–H12, registrar resultados e hashes antes/depois por conexão. Comparar
   preservação total e verificar atomicidade com falhas injetadas somente no artefato
   isolado. Registrar separadamente teste simples e teste com duas conexões.
6. Para a **futura execução principal**, revalidar01,02 e complemento histórico por
   leitura integral; comparar clínica/sessão/data/estado/chave,15 grupos, catálogo e
   auditorias. Não usar o snapshot datado como aprovação automática. Mudança => abortar,
   registrar novo inventário e obter nova revisão, sem atualizar hashes às escondidas.
7. Exigir decisões humanas, aprovação específica ligada ao hash dos arquivos e manifesto,
   motivo/UUID fixo/responsável ativos, recuperação e controle dos escritores antigos
   comprovados. Não preencher isso agora. Nenhuma autorização anterior de inventário
   ou publicação autoriza o encerramento.

## Concorrência e janela de manutenção

O candidato usa READ COMMITTED, mesmo advisory lock por clínica da RPC de abertura,
e locks `SHARE ROW EXCLUSIVE` nas21 relações do catálogo relevante, em ordem fixa.
Eles impedem novas escritas/TRUNCATE/DDL nas relações durante a transação; SELECTs
comuns continuam permitidos. São locks **de tabela inteira**: uma eventual execução
exige janela breve sem gravações financeiras de **Brotas e Ipupiara**, inclusive
cadastros de clínica/usuário/vínculo bloqueados nesse intervalo. Nenhum dado de outra
clínica é alterado pelo candidato. Timeout5s ou deadlock aborta a operação inteira.

Isso **não** comprova sozinho que escritores antigos são seguros após o commit.
Uma transação antiga com snapshot persistente/política antiga pode ter observado
`aberto` e tentar inserir posteriormente. É obrigatório suspender os canais antigos
de gravação e drenar transações já iniciadas de maneira autorizada antes da operação,
sem desativar RLS/grants ou cancelar sessões indiscriminadamente. H08 deve tentar esse
cenário. Se permitir movimento tardio, a homologação falhou: execução permanece
bloqueada até controle comprovado, eventualmente exigindo adaptação separada do
contrato antigo. Não propor resolver removendo a proteção de legado da interface.

Grants históricos incluem TRUNCATE; trigger de UPDATE/DELETE e RLS não demonstram
proteção contra ele. Locks protegem a janela da transação, não todo o futuro.
Recuperação/backup e controle operacional devem ser revisados sem mudar permissões
nesta tarefa. Não declarar auditoria universalmente imutável além da evidência obtida.

## Pós-verificações e recuperação

Antes de concluir o candidato, a própria transação verifica: exatamente uma sessão
alterada, somente3 campos diferentes, inventário/catalogo iguais,7 auditorias antigas
iguais, exatamente uma nova auditoria coerente e evento financeiro com UUID fixo.
Qualquer falha reverte sessão, evento e auditoria **na mesma transação**.

Após futura execução autorizada, usar por leitura `06-pos-candidato.sql` e
`07-reinventario-pos.sql`, regenerados do manifesto final aprovado. O06 identifica
estado/evento/auditoria; o07 lê novamente15 grupos e catálogo aceitando sessão fechada.
Exigir contexto válido, abrangência integral, UUID de execução identificado, estado
compatível, auditorias preservadas e snapshot/catalogo iguais ao aprovado. Um leitor
parcial ou um evento isolado não comprova a conclusão. Resultado truncado/erro não
equivale a ausência. Comparar também todos os campos do evento aprovado, motivo,
responsável, manifesto e dados de limitação; o06 é verificação parcial, não selo sozinho.

| Situação após interrupção/resposta incerta | Recuperação |
| --- | --- |
| Sessão original aberta, evento ausente e hashes iguais | Não houve conclusão comprovada; revalidar pré-condições antes de eventual repetição autorizada |
| Sessão fechada, evento fixo e auditoria íntegros, hashes anteriores iguais | Operação concluída; repetir o mesmo identificador no candidato validado não gera efeitos novos |
| Evento ausente com sessão alterada; evento conflitante; hash mudou; acesso insuficiente | Parar; investigar por leitura e preparar correção separada. Nunca completar “metade” manualmente |
| Nova sessão/operação posterior existente | Preservá-la; não reabrir o legado, não excluir evento nem restaurar o banco inteiro automaticamente |

Backup/restauração ainda não verificados. Na homologação, comprovar restauração de
uma cópia sintética em outro banco dedicado; não usar rollback como plano para erro
pós-commit. Sem conexão após resultado incerto, aguardar restabelecimento e consultar
por leitura, nunca presumir falha e reenviar. Repetição verifica também grafo, catálogo
e auditorias antes de retornar sem escrita.

## Quadro para a proprietária — respostas e aprovação continuam pendentes

| Informação necessária | Resposta permitida | Quando bloqueia |
| --- | --- | --- |
| Natureza das duas entradas em dinheiro e do Pix excluído | Operação real, teste ou “não foi possível comprovar”, com evidência disponível | Desconhecido não autoriza excluir/zerar; precisa ficar explicitamente registrado e aceito |
| O que se sabe do fechamento e da reabertura | Explicação ou “não foi possível comprovar” | Sem fabricar motivo/contagem históricos; limitação registrada |
| Dinheiro atualmente sob responsabilidade da clínica | Sim, não ou não comprovado, com data/contexto | Tratamento da custódia sem responsável/plano definido bloqueia; contagem atual não vira histórica |
| Pagamentos, devoluções e outras obrigações pendentes | Obrigações conhecidas e responsáveis; ou desconhecimento explícito | Avaliação inconclusa ou obrigação incompatível com o recorte sem encaminhamento bloqueia. Desconhecido não é ausência |
| Responsável e motivo administrativo | Proprietária autorizada, motivo e aceitação dos limites | Não informado ou vínculo inativo bloqueia |
| Aprovação específica de execução | Somente após homologação, recuperação e revisão dos hashes/efeitos | **Pendente**; esta etapa não solicita aprovação para executar |

Encerramento administrativo libera apenas o impedimento de sessão ativa antiga,
após conclusão válida. Não certifica saldo físico, quitação, aprovação de fechamento
financeiro nem legitimidade dos lançamentos. R$150,50 e R$1.000,00 permanecem registros
históricos, sem transporte. A nova abertura é operação futura separada.

## Parecer e próximo passo

Preparo local concluído no limite disponível; **bloqueado para execução e para aprovação
final**, porque homologação PostgreSQL, controle de writers, recuperação e decisões
humanas não foram comprovados. Nenhuma mudança no principal, schema, permissões,
runtime, infraestrutura ou publicação. Avaliação TypeSafe reaproveitada: decisões e
cálculos determinísticos, sem chamadas de IA e sem acesso a chaves.

Próximo passo técnico: disponibilizar PostgreSQL dedicado e comprovar isolamento;
então preparar a cópia sintética executável e cumprir H01–H12. Só após sucesso,
decisões humanas e nova leitura do principal preparar outro artefato para aprovação
específica. Nunca habilitar03/05 como atalho.
