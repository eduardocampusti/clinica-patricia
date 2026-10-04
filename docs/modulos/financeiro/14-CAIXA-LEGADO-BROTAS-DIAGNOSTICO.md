# Caixa legado de Brotas — diagnóstico e proposta de transição

## Sincronização posterior — 2026-10-04 19:13:49 -03:00

Matriz de todas as telas e estado Git/publicação no [relatório15](15-SINCRONIZACAO-E-MATRIZ-CAIXA.md).
O aplicativo continua2a6e88d0; A/B já concluídas estão representadas por fontes e registro
seguro, sem nova aplicação SQL. Arquivos privados/congelados citados historicamente são
locais e ignorados. Sincronização ocorre em branch sem deploy automático.

Atualização:04/10/2026,18:38 -03:00. **A/B APLICADAS; LEGADO ENCERRADO ADMINISTRATIVAMENTE**.
Resultado vigente na seção18 e pacote08; abertura normal disponível no perfil Recepção
de Brotas, inclusive após F5. Declaração de testes/ausência de dinheiro ou obrigações
atribuída ao usuário. As seções1–17 preservam o diagnóstico, homologação e pendências
com seus estados datados anteriores, sem apagar o histórico.

Data: 04/10/2026, 10:04 -03:00 (America/Bahia).
Estado histórico às 10:04: diagnóstico do código e leitura da aplicação concluídos; inventário então pendente. Proposta não aprovada nem executada.
Branch observada: `codex/resgate-local-2026-09-26`; HEAD `2a6e88d09c0a8a51cd73649bf45530c2db6a6923`.

## 1. Causa do bloqueio e critério exato

O caixa permanece financeiramente ativo no modelo antigo. A leitura atual consulta
`sessoes_caixa` pela clínica e pelos estados `aberto`, `em_fechamento`,
`aguardando_aprovacao`, `devolvido_para_correcao`. Uma sessão sem
`idempotency_key` é apresentada como legado. Essa chave identifica a abertura pelo
contrato moderno; não é um saldo, nem autorização para converter o registro.

O histórico usa o mesmo critério. O código recebe erros como erros, sem convertê-los
em ausência de caixa. A marca visual, isoladamente, não comprova quantas entradas existem.

Há uma proteção distinta no banco descrito pelas migrations: sessões com registros
em `entradas_caixa` são rejeitadas pelo resumo, cálculo, início/envio de fechamento,
suprimento e sangria modernos, e pelo trigger de novos recebimentos. O índice único
por clínica permite somente uma sessão nos quatro estados ativos. A RPC de abertura
também rejeita outra sessão ativa. Portanto, esconder o aviso ou preencher a chave
não resolve a incompatibilidade e compromete a proteção do histórico.

Evidência atual da aplicação: o ramo de legado foi observado em Brotas. Evidência
histórica documentada: essa sessão tinha duas entradas antigas. Definições de índice,
funções e contagens atuais ainda exigem conferência direta do catálogo real.

Fontes do código preservadas:

- `src/lib/financeiro/financeiro.caixa-leitura.ts`, `consultarCaixaAtual`.
- `src/lib/financeiro/financeiro.movimentos-leitura.ts`, `listarHistoricoCaixa`.
- `src/pages/FinanceiroCaixa.tsx` e `src/components/financeiro/HistoricoCaixa.tsx`.
- `supabase/migrations/20260921115106_financeiro_fase4_caixa_estados.sql`.
- `supabase/migrations/20260921115109_financeiro_fase4_caixa_operacoes.sql`.
- `supabase/migrations/20260922181438_financeiro_fase10c_resumo_caixa.sql`.

## 2. O que foi efetivamente encontrado

| Informação | Evidência | Limite |
| --- | --- | --- |
| Clínica e perfil da consulta | Aplicação publicada de Brotas, sessão autenticada de Recepção | Perfil conectado não identifica quem abriu o caixa antigo |
| Situação | Histórico: `Aberto · legado` | Nenhuma alteração executada |
| Abertura | Histórico: 03/08/2026 às 14:55, horário exibido pela aplicação | Timestamp bruto com fuso ainda não obtido |
| Valor inicial | Tela atual: R$ 150,50; fonte `sessoes_caixa.valor_abertura` | Não comprova contagem física, procedência do dinheiro ou saldo atual |
| Identificador da sessão e clínica | Não exibidos no ramo de legado | UUIDs precisam ser obtidos por leitura autorizada antes de qualquer procedimento |
| Operador original | Não exposto pela tela | `aberto_por` e vínculo/papel na época precisam ser confirmados; não inferir do login atual |
| Entradas antigas | Documentação de setembro: duas entradas, total R$ 1.000,00 | Quantidade, formas e valores atuais não reconfirmados; esse total não é dinheiro físico esperado |
| Recebimentos/movimentos/estornos/sangrias/fechamentos modernos | Documento 12 histórico registra zero nesses objetos; também pagamentos, repasses e documentos fiscais | Não comprova ausência atual nem todas as revisões/tentativas/ajustes |
| Detalhes disponíveis | Aplicação mostra preservação do legado e ausência de conversão/reutilização automática | Não oferece extrato antigo completo |
| Ipupiara | Evidência de publicação anterior: sem sessão aberta | Não revisitada; este diagnóstico não muda sua operação |

Os documentos `docs/12-VALIDACAO-OPERACIONAL.md` e
`docs/14-REMEDIACAO-PRE-CUTOVER.md` registram a preservação da abertura e das duas
entradas. O segundo descreve contas/registros de desenvolvimento e propõe um
encerramento administrativo. Essa descrição não prova que valores financeiros sejam
fictícios, não autoriza descarte e não equivale a procedimento implementado.
Nenhum dado identificável de paciente foi copiado para este relatório.

## 3. Acesso conectado e inventário que falta

Foi possível consultar a aplicação publicada, o histórico e os detalhes por leitura.
Não houve consulta SQL conectada nesta etapa. O canal de banco exigido por
`04-ISOLAMENTO-DE-SISTEMAS.md` é: “Acesso ao banco real do Clínica Patrícia é
EXCLUSIVAMENTE via Chrome logado no Supabase, com a extensão do Claude Code ativa.”
Esse Chrome/SQL Editor não está disponível nas superfícies expostas nesta sessão;
também não há conector SQL/Supabase disponível. Não houve tentativa de contornar o
canal, acessar chaves, usar conta de serviço ou simular identidade.

Isso é falta do canal conectado, não resultado vazio, erro SQL ou prova de permissão
negada. O inventário abaixo está preparado como escopo de leitura futura, ainda sem execução:

1. Confirmar projeto `xftnkusbyqzyvzrovroj`, clínica Brotas e sessão exata por UUID;
   listar todas as sessões ativas da clínica e conferir data, estado, chave, campos de
   abertura/fechamento e operador. Não selecionar nomes/documentos de pacientes.
2. Conferir objetos/colunas/FKs/índices/enum/triggers/policies/grants via
   `information_schema` e `pg_catalog`; consultar funções por assinatura em `pg_proc`.
   O histórico de migrations sozinho não prova os objetos atuais. Verificar eventuais
   referências adicionais, auditoria antiga e algum fluxo remoto não presente no código.
3. Inventariar todas as `entradas_caixa` da sessão, sem `LIMIT`: IDs internos, clínica,
   datas, forma, valor em centavos, responsável e integridade de vínculos. Descrições
   livres, pacientes e profissionais não devem ser exportados ao relatório. Quantidades
   de vínculos bastam; identidade do operador é restrita aos responsáveis pela conferência.
4. Inventariar `recebimentos` da sessão e seus `recebimentos_pagamentos`; comparar cada
   pai com a soma das parcelas, sem somar o pai novamente a elas. Verificar componentes,
   status e integridade por clínica, incluindo relações com atendimentos sem expor dados.
5. Inventariar todos os `movimentos_caixa` por tipo e forma. Suprimentos são movimentos,
   não uma tabela independente. Conferir sangrias e seus estados em `sangrias_caixa`.
6. Inventariar `estornos` e `estornos_pagamentos` dos recebimentos originais desta
   sessão **e** dos movimentos de estorno executados nesta sessão contra recebimentos
   de outras sessões. Não limitar pela sessão original e perder a outra direção.
7. Inventariar `fechamentos_caixa`, todas as tentativas/substituições e suas
   `revisoes_fechamento_caixa`; repasses, ajustes e fiscal ligados à sessão ou a seus
   recebimentos; auditoria da sessão e de todos os registros relacionados. Conferir
   também referências polimórficas em auditoria, que não aparecem como FK.
8. Produzir contagens integrais, somas por forma/status e lista interna de IDs;
   conferir abrangência/permissão/RLS. Se houver paginação, esgotar páginas com ordem
   estável por data e ID e reconciliar com `count(*)`. Erro, inacessível e vazio devem
   continuar separados. Uma consulta da Recepção pode não enxergar todo o inventário.

## 4. Há fluxo existente para tratar o legado?

Não foi localizado fluxo utilizável na aplicação normal nem RPC de transição nas
definições locais. O fechamento moderno é incompatível com entradas antigas.
`server/src/routes/caixa.ts` conserva um adaptador antigo para `fechar_caixa`, mas
`server/src/index.ts` registra somente ping/despesas: essa rota não está ativa e
seu contrato não comprova uma função remota homologada de encerramento de legado.
A proposta histórica de remediação também não comprova implementação.

O enum conserva `fechado` do modelo antigo, além de `aprovado` do fechamento moderno.
Isso permite propor um encerramento administrativo antigo, sem fingir aprovação
moderna. Seu uso concreto depende de confirmar restrições, triggers, auditoria e
relações atuais. Não chamar RPCs modernas diretamente para saltar as proteções.

## 5. Caminho recomendado, ainda sujeito à aprovação

Preparar um procedimento administrativo **pontual e transacional** para encerrar a
sessão antiga identificada, preservando o histórico. É a opção A da remediação
histórica, agora com condições explícitas. Não converter entradas antigas em novos
recebimentos e não liberar a proteção enquanto a sessão estiver ativa.

Desenvolvimento necessário: falta elaborar e homologar o procedimento específico,
após o inventário. A primeira opção é um script administrativo revisado, com guardas,
auditoria e reversão antes da confirmação da transação. Não exige redesenho, alteração
de permissões ou nova RPC de rotina a princípio. Se as restrições vigentes impedirem
o procedimento ou houver necessidade recorrente, apresentar separadamente uma RPC
restrita e idempotente; eventual migration deverá vir com efeitos e aprovação próprios.
Não está sendo entregue um script de escrita executável com UUID/valores presumidos.

| Ação posterior | Responsável e autorização |
| --- | --- |
| Confirmar origem das entradas, dinheiro físico, documentos e pendências | Responsável real pelo caixa/Recepção, com conferência da proprietária |
| Aprovar encerramento excepcional, divergências e custódia do dinheiro | Proprietária de Brotas; decisão explícita e registrada, não inferida da aprovação visual |
| Preparar/homologar e executar procedimento no canal oficial | Responsável técnico autorizado após aprovação específica; login administrativo não substitui decisão financeira da proprietária |
| Abrir nova sessão pelo fluxo normal | Recepção ou proprietária ativa e vinculada à clínica, conforme RPC vigente; clínica e fundo contado confirmados |

Registros propostos: somente a sessão antiga exata sairia de `aberto` para `fechado`,
com responsável/data e campos de conferência sustentados por evidência; seria acrescido
evento de auditoria com antes/depois, motivo, autorização e inventário. `id`, clínica,
abertura, `valor_abertura`, operador original e chave nula seriam preservados. Entradas,
recebimentos, parcelas, movimentos e relações não seriam apagados, recriados ou
reclassificados. Não criar repasse, ajuste, estorno, sangria, suprimento ou recibo
para fabricar um fechamento. Dependências encontradas podem bloquear este recorte.

Histórico: continuará sendo sessão **legada**, encerrada no modelo antigo. O histórico
atual a listará como fechada e os dados originais continuarão preservados no banco;
os detalhes atuais do legado continuam limitados. Um extrato antigo completo na UI
seria desenvolvimento separado, não requisito para apagar/reconverter dados.

Liberação: `fechado` não integra os quatro estados ativos. Sem outra sessão ativa e
com regras atuais confirmadas, a abertura normal poderá criar outra sessão com novo
UUID/chave. O fundo deverá ser dinheiro contado na ocasião, inclusive podendo ser
zero conforme contrato. R$ 150,50 não será sugerido como reaproveitamento automático.

## 6. Conferências e sequência concreta de execução futura

1. Concluir o inventário somente por leitura e registrar UUIDs, estado/contagens/somas
   e abrangência. Se houver qualquer relação não compreendida, parar antes da escrita.
2. A proprietária confirma se os registros representam operação real, a procedência
   dos R$ 150,50, as formas das entradas de R$ 1.000,00, retiradas/devoluções externas,
   obrigações pendentes, dinheiro efetivamente contado, divergências e sua justificativa.
   Não calcular R$ 1.150,50 como dinheiro esperado sem provar a composição física.
   Registros eletrônicos não se tornam conciliados por coincidirem com o sistema.
3. Definir responsável real, custódia/destino do dinheiro antigo e aprovação excepcional.
   Se o saldo esperado não puder ser comprovado, decidir/documentar essa limitação;
   não preencher zero nem inventar diferença. A regra de registro deve ser aprovada.
4. Preparar procedimento com alvo fixo, pré-condições, interrupção por divergência,
   atualização de uma única sessão e auditoria atômica. Validar constraints/triggers e
   os campos possíveis no banco atual; homologar em ambiente controlado/restore
   autorizado. Obter novo backup e comprovar possibilidade de recuperação.
5. Obter aprovação específica desse procedimento e dos valores. Agendar janela sem
   operação do caixa antigo; impedir concorrência no procedimento com bloqueio da
   sessão e proteção por clínica compatível com a abertura oficial. Verificar também
   escritores antigos e relações que possam mudar; não presumir que um bloqueio na UI
   impeça todos os escritores. Não alterar outras clínicas/permissões para isso.
6. Em uma transação, reconferir inventário/estado e autorização; se mudou, abortar.
   Encerrar a sessão e registrar auditoria juntos, com identificador fixo da execução.
   Conferir alteração de exatamente uma sessão e nenhuma alteração nas linhas/valores
   originais. Antes da confirmação, qualquer falha exige `ROLLBACK`.
7. Após confirmação, consultar sessão e evento pelo identificador da execução; comparar
   todos os IDs, contagens, valores e vínculos antes/depois. Entradas/recebimentos/
   parcelas/movimentos devem ser idênticos; diferenças permitidas limitadas aos campos
   aprovados da sessão e ao novo evento. Conferir ausência de outra sessão ativa em Brotas
   e integridade pertinente conforme processo vigente, sem modificar dados de Ipupiara.
8. Só depois, a Recepção abre uma nova sessão pelo fluxo oficial com dinheiro contado,
   confirmação da clínica e chave nova. Verificar nova sessão, auditoria de abertura e
   fundo correto, sem duplicar as entradas antigas. Essa abertura é ação separada,
   não efeito automático da transição e ainda exige autorização para execução posterior.

Interrupção: antes do commit da transação, rollback preserva o estado antigo. Em
resposta incerta após confirmação, primeiro consultar estado e evento; não repetir
escrita nem abrir outro caixa às cegas. O procedimento deve reconhecer o mesmo evento
e sessão já encerrada como execução concluída, e rejeitar estados divergentes. Depois
do commit, não reabrir/desfazer automaticamente, principalmente se houver nova operação;
qualquer correção precisa de decisão específica e trilha auditada. Restaurar todo o banco
poderia perder outras operações e não é recuperação automática aceitável.

## 7. Entrega desta etapa e limites

Realizado: recuperação documental, inspeção seletiva do código/Git, leitura autenticada
do estado/histórico/detalhes de Brotas e elaboração desta proposta. Nenhum teste financeiro,
SQL conectado, suíte de publicação ou percurso visual completo repetido. TypeSafe
avaliada pela descrição: não pertinente ao diagnóstico determinístico; nenhuma chave/API
acessada. ReUI não consultado novamente, pois não há alteração de interface.

Manifesto documental desta etapa: este relatório, relatório 13 (referência ao diagnóstico),
README e checkpoint do Financeiro, `docs/ia/INDICE.md`, checkpoint operacional e raiz.
Snapshot local dos outros 26 arquivos alterados: `scratch/caixa-legado/trabalhos-preservados.json`.
Fontes de runtime, banco, permissões e visual permanecem intactas. Sem commit/push/deploy.

Verificações documentais: `git diff --check` aprovado; novo relatório sem espaços
finais; hashes dos 26 arquivos externos idênticos ao início desta etapa; diff vazio
em `src`, `server`, `supabase`, `package.json` e `package-lock.json`. Zero testes
financeiros automatizados executados nesta etapa, sem necessidade de repetir build/lint.

Parecer: **proposta preparada; execução da transição bloqueada até completar inventário,
conferência humana e aprovação do procedimento concreto**. Não existe evidência atual
suficiente para afirmar ausência de pendências ou segurança de encerramento imediato.

## 8. Procedimento local preparado — 04/10/2026, 10:31 -03:00

Pedido posterior autoriza concluir leitura e preparar arquivos, sem executar a
transição ou teste DML no principal. O preparo possível foi concluído. Não declarar
o inventário completo: clínica/sessão ainda não têm UUIDs reconfirmados por banco.
Estado/data/R$150,50 são a leitura de 10:04 e o contexto informado; duas entradas
R$1.000,00 continuam sendo evidência histórica. Não houve nova leitura de Brotas
nem consulta SQL nesta etapa; os demais registros/obrigações atuais seguem desconhecidos.

### Canais e homologação

- Catálogo de ferramentas atual: nenhum conector Supabase/PostgreSQL. Sites/Hostinger
  oferecem bancos de outros escopos e não foram utilizados como substitutos.
- Inventário das superfícies: apenas navegador interno com uma aba de Ipupiara,
  sem Chrome/extension/SQL Editor oficial ou aplicativo nativo disponível.
- A primeira tentativa de inventariar o navegador foi rejeitada pelo controle
  automático porque faltava retomar sua documentação. O pré-requisito foi cumprido
  e a leitura seguinte funcionou; isso não produziu acesso ao banco nem bloqueio adicional.
- Para completar o inventário, restabelecer Chrome com extensão Claude Code ativa e
  login pela interface no SQL Editor do projeto `xftnkusbyqzyvzrovroj`. Se esse canal
  não estiver exposto ao Codex, usar o Claude Code que o dispõe. Não copiar credenciais
  ou contornar o canal. Solicitação de restabelecimento enviada, sem pedir senha/chave.
- Docker CLI está instalado, mas o daemon não foi encontrado; leitura de sua configuração
  também foi negada pelo ambiente. `psql`/`postgres` não estão disponíveis no PATH.
  Nenhum PostgreSQL isolado ativo foi confirmado; não instalar/iniciar outro serviço
  nem usar o principal para homologar DML. Homologação SQL/PostgreSQL permanece pendente.

### Arquivos entregues

Pasta: `database/operations/caixa-legado-brotas/`, fora de migrations/runtime:

| Arquivo | Conteúdo |
| --- | --- |
| `README.md` | Runbook completo, restabelecimento do canal, decisões humanas, efeitos, limites e recuperação |
| `01-catalogo.sql` | SELECTs/read-only para identidade, operador, objetos/restrições/triggers/auditoria/RLS/grants e funções oficiais |
| `manifesto-revisao.json` | Estado bloqueado, UUIDs/snapshots nulos, flags não confirmadas; números históricos separados dos parâmetros operacionais |
| `02-inventario.sql` | Leitura integral por grafo, contagens/fingerprints, valores em centavos, componentes sem dupla soma, vínculos/auditoria minimizados |
| `03-encerramento.sql.disabled` | DML proposto, transação, guardas, estado original/catálogo revalidados, auditoria, repetição e verificação de preservação |
| `04-pos-verificacoes.sql` | Conferência somente por leitura do estado/evento e de originais após eventual execução futura |
| `preparar.mjs` | Gerador offline; não lê .env, não conecta ao banco e sempre gera a trava de execução falsa |
| `preparo.test.mjs` | Testes sintéticos em memória do preparador/bloqueios; não chama SQL |

Leitura preparada não significa executada. 02/04 bloqueiam com alvo ausente; 03 tem
extensão `.disabled`, trava incondicional antes do DML, parâmetros pendentes e rollback
final. Até um manifesto preenchido/sintético continua produzindo SQL desabilitado.
Não retirar a trava nem trocar por commit nesta etapa. Falta inspeção do catálogo real,
transcrição revisada dos UUIDs/snapshots, homologação isolada e aprovação específica.

### Representação administrativa, sem contagem histórica fabricada

Revisão local adicional confirma: campos de conferência da sessão são anuláveis;
estado antigo `fechado` existe; novo `aprovado` significa aprovação financeira.
Fechamentos modernos exigem contagem/totais/diferença/revisão e não são apropriados
para registrar esse encerramento com informações históricas não comprovadas.
Há trigger geral da sessão em `fn_auditoria()` e trigger de imutabilidade de
`auditoria`; a função geral usa `auth.uid()`, que não deve ser inventado no SQL Editor.
Contratos financeiros revogam escrita direta dos clientes e usam eventos financeiros
explícitos. Constraints/FKs/triggers e ACLs atuais ainda dependem do catálogo conectado.

O recorte proposto altera somente `status`, `fechado_por`, `fechado_em` da sessão
antiga exata, acrescenta um evento financeiro administrativo com UUID fixo/valor nulo
e preserva o evento geral automático. Abertura/operador original/chave e todos os
valores permanecem iguais. Esperado/contado/diferença continuam nulos; se já houver
dados nesses campos, este rascunho aborta em vez de limpá-los ou reinterpretá-los.
Não gera fechamento/revisão/recebimento/ajuste/estorno/sangria/suprimento/repasse/Fiscal.

O evento explicita natureza administrativa, contagem histórica e conciliação não
comprovadas, motivo, responsável, manifesto e identidade técnica real separada do
responsável autorizado. Estado `fechado` retira a sessão da unicidade ativa; histórico
continua legado. UI atual mostra “Fechado · legado”, sem aprovação financeira;
não foi alterada. Se o modelo/catalogação real exigir outro tratamento ou o evento
não representar adequadamente a natureza, propor metadado auditado específico na
sessão e procedimento correspondente; nunca usar `aprovado` ou preencher zero.
Nenhuma migration/RPC/metadado foi aplicada ou criada como migration nesta etapa.

### Abrangência, segurança e recuperação do rascunho

O inventário usa agregações SQL sem paginação/limite, com contagens/hash por objeto e
catálogo completo relevante. Trata role sem abrangência como insuficiente, não como
ausência. Fontes antigas e modernas são distintas; não somar pai/parcelas/movimento
nem deduplicar fontes por valor/data. Hash detecta drift, não legitima lançamento.

O grafo inclui 15 objetos: entradas, recebimentos/componentes, movimentos, estornos/
componentes nas duas direções, sangrias/suprimentos por movimentos, fechamentos/
revisões, repasses/itens/ajustes/aplicações e fiscal/tentativas. Outras FKs/referências
descobertas pelo catálogo exigem ampliação. Auditoria principal é consultada sem
conteúdo livre; se houver estrutura moderna, completar trilha de todos os IDs e
referências polimórficas. Não declarar essa cobertura futura como dados já observados.

Qualquer objeto moderno não vazio bloqueia o procedimento simples, mesmo concluído:
relações mistas precisam de investigação/deduplicação por vínculo comprovado e revisão
do procedimento, não descarte automático. Estado inesperado, sessão moderna, outra
clínica, responsável sem vínculo ativo, catálogo/snapshot divergente ou ausência dos
triggers esperados também abortam. Row locks e advisory lock da abertura por clínica
mais janela sem writers antigos protegem a reconferência; isso precisa de homologação.

Repetição exige mesmo UUID de evento, manifesto, motivo, responsável e estados; evita
nova escrita. Resposta incerta exige pós-leitura antes de repetir. Rollback antes da
confirmação preserva a situação anterior; depois dela não reabrir/deletar/restaurar
todo o banco automaticamente. Verificar auditoria anterior separadamente dos eventos
novos e não confundir nova sessão posterior com reversão. Abertura permanece ação
independente, com contagem na ocasião e sem transportar qualquer valor histórico.

### Decisões humanas estritamente necessárias

Origem/natureza conhecida das entradas; dinheiro atualmente sob responsabilidade da
clínica (sim/não/não comprovado, com data); pendências conhecidas e seu responsável;
responsável autorizado e motivo administrativo, com limitações explícitas. Onde não
há comprovação, registrar desconhecido. Uma contagem atual não é contagem histórica
e não deve preencher a conferência antiga. Essa orientação refina os exemplos da
seção 6; não exige produzir contagem histórica inexistente nem concluir quitação.

### Verificações locais e parecer

12 casos sintéticos do preparador aprovados, em duas rodadas de 12 (24 execuções,
nenhuma falha); não são testes PostgreSQL/RLS/persistência. Parsing Node e lint dos
arquivos mjs pertinentes, diff-check e consistência dos arquivos gerados conferidos.
27 arquivos anteriores preservados por hash, inclusive relatório 13; snapshot local
em `scratch/caixa-legado-preparo/trabalhos-preservados.json`. Sem mudanças em runtime,
migrations, banco, permissões, dependências ou visual. TypeSafe avaliada pela descrição
e não pertinente; nenhuma API/chave acessada. Sem commit/push/deploy.

**Preparo local concluído; inventário real e homologação do SQL pendentes. Procedimento
explicitamente não executável até completar essas evidências e aprovação posterior.**

## 9. Continuidade com execução bloqueada — 04/10/2026, 10:40 -03:00

Usuário confirma que restabelecerá o acesso separadamente e pede concluir o preparo
local. Não houve nova busca de acesso conectado, navegação/login no Supabase,
extração de credenciais ou consulta ao banco. Nenhuma evidência financeira nova:
dados históricos não reconfirmados e lacunas das seções anteriores permanecem pendentes.

Os oito artefatos foram comparados com os hashes registrados da entrega anterior:
todos iguais antes desta atualização documental. Três SQLs gerados conferem exatamente
com o gerador/manifesto. Nova verificação offline confirmou estado bloqueado,
UUIDs/snapshot/autorização nulos, flags falsas, trava SQL incondicional e rollback;
33 pendências de preparo permanecem. Os 12 casos sintéticos anteriores foram
reaproveitados, sem repetir suíte ou afirmar homologação PostgreSQL. Somente README,
relatório/checkpoints/índices são atualizados nesta continuidade; SQL/gerador/manifesto
permanecem intactos. TypeSafe avaliada pela descrição, sem pertinência; nenhuma API/chave.

Correção da orientação anterior: este Codex não recebeu acesso à extensão Claude Code.
A documentação oficial OpenAI descreve a conexão pela extensão **ChatGPT** em
Settings > Computer Use > Chrome. Passos detalhados e uso de @Chrome estão no runbook.
Fonte consultada:
[Browser extension](https://learn.chatgpt.com/docs/chrome-extension).
Essa configuração não foi executada/verificada nesta instalação; não presumir que
Chrome ficou conectado apenas porque existe login externo ou extensão Claude Code.

O runbook traz os passos completos e a distinção entre conexão técnica e autorização.
`04-ISOLAMENTO-DE-SISTEMAS.md` permanece intacto: exige Chrome/Supabase com extensão
Claude Code ativa. Conectar pela ponte ChatGPT não torna essa extensão acessível ao
Codex nem modifica a regra. Confirmar compatibilidade do canal antes de qualquer SQL;
se não puder ser comprovada, manter bloqueado até decisão específica, sem usar IAB
como substituto automático. Não foi solicitado nem executado ajuste de permissões.

Retomada futura: confirmar project ref/ambiente/canal/permissões e executar **somente
01 por leitura**, depois 02 com clínica/sessão exatas. Não executar 03, testar DML no
principal nem abrir sessão. Identificação, inventário integral, catálogo e homologação
isolada continuam requisitos pendentes; aprovação da transição será outra etapa.
Sem banco/encerramento/abertura/commit/push/deploy. HEAD2a6e88d permanece observado.

## 10. Inventário conectado por leitura — 04/10/2026, 11:31 -03:00

**Inventário técnico concluído; encerramento administrativo não homologado, não
aprovado e não executado.** Evidência minimizada em
`database/operations/caixa-legado-brotas/inventario-confirmado.json`; parâmetros
confirmados e aprovação pendente em `manifesto-revisao.json`, no mesmo diretório.
Carimbo local da evidência: 04/10/2026 11:27:13 -03:00. Dados de pacientes, seus IDs,
conteúdos livres clínicos, cookies e credenciais não foram exportados/registrados.

### Canal, abrangência e consultas efetivamente feitas

Usuário autorizou expressamente o SQL Editor oficial na aba autenticada do navegador
interno do Codex, substituindo nesta tarefa a exigência histórica de Chrome externo
ou conector. Exceção registrada no runbook sem modificar a regra global de isolamento.
URL confirmou `xftnkusbyqzyvzrovroj`; cabeçalho da interface confirmou `main` antes
das consultas. `VITE_SUPABASE_URL` corresponde ao mesmo ref, sem expor outras variáveis.
Ambiente principal. Git: `codex/resgate-local-2026-09-26`, HEAD
`2a6e88d09c0a8a51cd73649bf45530c2db6a6923`, com trabalhos locais anteriores preservados.

Sessão SQL existente: database/current_user/session_user `postgres`, PostgreSQL17.6,
`rolsuper=false`, `rolbypassrls=true`. SELECT confirmado nas 18 tabelas financeiras;
RLS ativo, sem FORCE RLS nos objetos consultados. Cada lote usou `repeatable read
read only` e rollback; `transaction_read_only=on`. Nenhuma mudança de role/RLS.

15 submissões somente leitura concluíram com sucesso, com 22 SELECTs principais
(incluindo releitura dos resultados intermediários de catálogo, pois o editor
apresenta somente o último SELECT de cada lote). Uma submissão anterior de catálogo
retornou erro42703: `ORDER BY assinatura::text` não aceita o alias nessa expressão.
Corrigido localmente para `p.oid::regprocedure::text` e repetido por leitura, sem DML.
Resultados copiados pelo recurso oficial Export/Copy as JSON, conferindo cabeçalhos,
quantidades e completude. Uma cópia intermediária antiga foi detectada pelo formato
de colunas e descartada; só o resultado final de constraints foi registrado.

`01-catalogo.sql` e complementos: 232 colunas, 169 constraints/FKs de entrada (todas
validadas), 10 índices (válidos), 7 triggers habilitados e seus corpos, 5 policies,
86 grants, 6 definições de funções operacionais e o enum real. Nenhuma função
financeira foi invocada; corpos foram apenas inspecionados com `pg_get_functiondef`.
Não apareceu FK de outra tabela fora do grafo previsto. Consulta de funções e
procedimentos nos schemas public/private não encontrou rotina com os nomes de
legado/administrativo/transição pesquisados ou `fechar_caixa`. Isso, junto à análise
do runtime anterior, não comprova um fluxo ativo de tratamento do legado.
Tabela adicional `auditoria_leitura_clinica` tem vínculo com atendimento e não caixa;
somente suas quatro colunas foram inspecionadas, sem consultar seus registros.

`02-inventario.sql` foi adaptado localmente para SELECT único exportável, sem DO ou
NOTICE, mantendo o mesmo grafo e fingerprints. Seção de contexto explícita impede
confundir falta de abrangência/alvo incorreto com ausência; todas as condições OR
de escopo são agrupadas antes dessa guarda. Texto enviado ao editor conferido com
o arquivo local:14.610 caracteres, checksum de comparação `b9459661`. Não é prova
de aprovação, apenas conferência do texto.11 seções de resultado, contexto válido,
15 objetos com contagem/hash, sem LIMIT. Catálogo MD5
`15392c1671489765fe9074cb14fc8dad`. Auditoria histórica complementada por SELECT de
campos financeiros permitidos, salvo em `02-auditoria-historica.sql`.

### Identificação e registros atuais confirmados

- Clínica Brotas ativa, subdomain `brotas`, UUID
  `7c2a450d-7b9a-4701-8d5a-982eda331c58`.
- Uma única sessão na consulta sem LIMIT: UUID
  `a4a18e49-6634-4058-9fd8-07f3b065fd63`, status `aberto`, `idempotency_key=null`.
- Abertura UTC `2026-08-03T17:55:38.40657+00:00`, equivalente a03/08/2026
  14:55:38 -03:00. Fundo registrado 15.050 centavos. Auditoria39 confirma o mesmo
  valor no INSERT original; não é valor deduzido das duas entradas.
- Operador `aberto_por`: `4ae3f28e-f197-4281-a5a4-0f4a06d59ef1`, também registrador
  das duas entradas. Conta e vínculo atuais ativos, papel atual Recepção; papel
  histórico na abertura não comprovado. Nenhum nome de paciente consultado.
- `fechado_por`, `fechado_em`, `valor_esperado`, `valor_contado` e `diferenca`
  atualmente nulos. Isso não significa inexistência de fechamento antigo na auditoria.
- Duas entradas atuais em `entradas_caixa`, ambas dinheiro, 50.000 centavos cada:
  04/08/2026 07:56:26 -03:00 e05/08/2026 08:08:27 -03:00. Total registrado100.000
  centavos. Vínculos de paciente e profissional válidos na mesma clínica, verificados
  por booleanos sem exportar seus identificadores. Não existe ligação declarada
  dessas entradas com recebimentos modernos; nenhuma deduplicação por semelhança.
-14 objetos modernos vazios no grafo: recebimentos/parcelas, movimentos, estornos/
  componentes, sangrias, fechamentos/revisões, repasses/itens/ajustes/aplicações e
  documentos fiscais/tentativas. Suprimentos estariam em movimentos, também vazio.
  Sem objeto moderno vinculado pendente. Obrigações externas não são cobertas por
  essa ausência e não podem ser declaradas quitadas.

Não somar fundo/entradas como dinheiro físico atual. Não reapresentar a entrada já
excluída como recebimento atual. Parent, parcelas e movimento continuam fontes
diferentes: nenhum valor foi duplicado na contagem do inventário.

### Histórico relevante confirmado na auditoria

Há7 eventos gerais, hash `8c4a81ef391349157ff07140e5559200`;0 eventos financeiros
vinculados. Motivo não registrado nos7 eventos. Cronologia no horário da Bahia:

| Auditoria | Data/hora -03:00 | Registro confirmado |
| --- | --- | --- |
|39|03/08/2026 14:55:38|INSERT da sessão aberta com fundo de R$150,50|
|42|03/08/2026 21:27:43|INSERT de uma entrada Pix de R$85,90|
|43|04/08/2026 07:23:59|DELETE dessa mesma entrada Pix; executor no campo usuario_id nulo|
|46|04/08/2026 07:56:26|INSERT da primeira entrada atual de R$500,00 em dinheiro|
|47|05/08/2026 08:08:27|INSERT da segunda entrada atual de R$500,00 em dinheiro|
|48|05/08/2026 08:19:24|Sessão passou de aberto para fechado; campos de contagem/diferença nulos|
|49|05/08/2026 08:26:59|Sessão voltou a aberto; fechado_por/em voltaram a nulo|

O `fechado_por` do evento48 registra o UUID do operador original, mas os dois
UPDATEs têm `auditoria.usuario_id=null`: não atribuir execução humana por inferência.
Não há aprovação/fechamento moderno correspondente. O valor de abertura permaneceu
R$150,50 nos estados consultados. Justificativa/origem/natureza dessas operações
não consta dos campos auditados; não declarar que foram fictícias ou legítimas por
suposição. Preservar todos os eventos, inclusive o registro da exclusão anterior.

### Condições técnicas e recomendação

Índice `sessoes_caixa_ativa_unica` e `financeiro_abrir_caixa` impedem nova sessão enquanto
este estado ativo existir. Resumo/cálculo/início e envio do fechamento modernos têm
guarda contra `entradas_caixa`; trigger de recebimento também rejeita o legado.
`fechado` antigo continua permitido no enum; campos de conferência da sessão são
anuláveis, e evento financeiro aceita ação/entidade não vazias e valor nulo. Triggers
de auditoria da sessão/entradas e de imutabilidade UPDATE/DELETE da auditoria estão
ativos. `fn_auditoria` captura `audit.motivo` e `auth.uid()` real, sem claims simuladas.

O catálogo sustenta **em princípio** o recorte administrativo específico: atualizar
somente status/fechado_por/fechado_em dessa sessão e acrescentar evento administrativo
e auditoria, preservando abertura, valores, chave nula, vínculos, entradas e histórico.
Não criar `fechamentos_caixa`/revisão, não usar `aprovado`, nem fabricar contagem/
conciliação/retirada/repasse. Nenhuma mudança de esquema/RPC é imposta pelo catálogo
observado para representar esse recorte; ainda falta homologar o procedimento e
aprovar sua representação administrativa. Não há fluxo oficial pronto comprovado.

Pendência técnica concreta: grants amplos de `entradas_caixa` e `auditoria` incluem
TRUNCATE para clientes anon/authenticated. RLS e trigger UPDATE/DELETE não comprovam
proteção contra TRUNCATE; não se executou teste de escrita. Revisar preservação,
recuperação e risco para a janela administrativa antes da aprovação. Eventos
financeiros têm somente SELECT para authenticated e nenhuma trigger de mutação foi
encontrada nessa tabela; não alegar imutabilidade técnica além dos controles lidos.
Policy antiga ainda permite INSERT em entradas com sessão aberta; janela sem writers
antigos/concorrência precisa ser comprovada, não presumida do advisory lock moderno.
Não alterar grants ou bloquear writers em produção nesta tarefa.

Próxima etapa concreta, ainda sem execução autorizada:

1. Proprietária esclarecer origem/natureza das duas entradas, Pix excluído e
   fechamento/reabertura (ou reconhecer explicitamente o que não puder comprovar),
   custódia atual de dinheiro, obrigações conhecidas, responsável e motivo.
   Não exigir contagem atual como histórica nem presumir transferência do fundo.
2. Homologar o procedimento em PostgreSQL comprovadamente isolado com catálogo
   compatível, dados sintéticos e histórico equivalente. Cobrir repetição, resposta
   incerta, interrupção, concorrência com writer antigo e preservação dos7 eventos.
   Verificar recuperação/backup e os controles de auditoria antes do aceite técnico.
3. Revalidar 01/02 e auditoria por leitura imediatamente antes de eventual execução;
   abortar em drift, vínculo moderno ou estado diferente. Produzir outro arquivo
   revisado com UUID fixo de execução, responsável e motivo e obter autorização
   específica. Não habilitar este arquivo03 nem reutilizar a exceção de leitura
   como autorização futura de escrita.
4. Após eventual execução aprovada, verificar sessão/evento e todos os hashes
   anteriores, separando auditoria nova da preservada. Resposta incerta exige leitura
   antes de repetição. Não reabrir/excluir/restaurar todo o banco automaticamente.
   Nova abertura será independente, pelo contrato oficial e com dinheiro contado.

### Arquivos, verificações locais e limites finais

Alterados somente nesta continuação: runbook,01,02,manifesto,preparar.mjs,preparo.test.mjs,
este relatório e os checkpoints/índices pertinentes. Novos:
`inventario-confirmado.json` e `02-auditoria-historica.sql`.03 e04 preservados por SHA256
respectivamente `330560c3c2a533fad76710034991c4be244292168b8ef8ffbc5ef67f333c7f5f`
e `219297a9ccb9a0270595850a3e6da1014261082fefca358249df4ddb0d5cd42f`.
03 continua .disabled, trava incondicional falsa, parâmetros antigos nulos e rollback;
04 não foi executado. Aprovação, motivo, responsável e UUID de execução no manifesto
continuam nulos; flags de writers/homologação/recuperação falsas.8 pendências de
preparo apontadas pelo validador; inventário técnico e aprovação são estados distintos.

14 casos locais do preparador aprovados em uma rodada,0 falhas, incluindo duas
guardas novas de SELECT/contexto e alvo não identificado; nenhum SQL de escrita de
teste. Parsing Node e lint dos2 mjs com saída0, diff-check aprovado e geração de02
coerente com o manifesto. PostgreSQL isolado permanece não homologado; não houve
nova tentativa de usar Docker nem instalação. Suítes visuais/financeiras da publicação
não repetidas. TypeSafe: avaliação anterior reaproveitada, etapa determinística,
sem chamadas de IA. Runtime, migrations, banco, RPCs, permissões, dependências,
visual e publicação intactos. Sem operação financeira, abertura/encerramento,
commit, push ou deploy.

Conferência de preservação ao final:27 arquivos de outras tarefas iguais aos hashes
obtidos no início desta retomada, inclusive relatório13, AGENTS e documentação de
Sistema/Agenda/Equipe/Pacientes. Asserts offline conferiram a igualdade evidência/
manifesto, centavos e vínculos booleanos, ausência de aprovação,8 pendências e SHA
original do03. Nenhum espaço final nos artefatos locais desta operação; diff-check
com a configuração vigente do projeto aprovado. HEAD permaneceu2a6e88d.

## 11. Candidato separado e homologação indisponível — 04/10/2026, 12:04 -03:00

**Preparo local concluído; bloqueado para execução e aprovação final.** O banco
isolado necessário não foi encontrado. Docker existe, mas `docker_engine` não está
disponível; configuração negada pelo sistema. Sem psql/postgres/pg_ctl no PATH,
instalação no diretório conhecido, PGlite ou conector de banco utilizável. Nenhum
start/reset/stop, instalação, infraestrutura paga ou acesso a outro projeto.
A aba do principal não foi usada; as evidências da seção10 foram reaproveitadas.

Manifesto seletivo desta etapa, todos locais e não commitados:

| Arquivo | Resultado |
| --- | --- |
| `database/operations/caixa-legado-brotas/candidato.mjs` | Novo gerador offline separado; trava sempre falsa |
| `database/operations/caixa-legado-brotas/05-candidato.sql.disabled` | Novo candidato bloqueado, pré/pós-condições, transação, locks, auditoria e repetição |
| `database/operations/caixa-legado-brotas/06-pos-candidato.sql` | Novo leitor parcial de estado/evento/auditoria, sem escrita |
| `database/operations/caixa-legado-brotas/07-reinventario-pos.sql` | Novo leitor do grafo/catálogo após sessão fechada, sem escrita |
| `database/operations/caixa-legado-brotas/candidato.test.mjs` |16 novos testes offline de contratos/guardas/arquivos |
| `database/operations/caixa-legado-brotas/homologacao-casos.json` | Fixture descritiva e12 casos PostgreSQL planejados, resultados vazios |
| `database/operations/caixa-legado-brotas/08-HOMOLOGACAO-E-APROVACAO.md` | Procedimento, recuperação, efeitos e quadro humano |
| `database/operations/caixa-legado-brotas/preparar.mjs` | Exportação de fragmentos SQL compartilhados; CLI histórico permanece bloqueado |
| `database/operations/caixa-legado-brotas/manifesto-revisao.json` | Referência ao candidato e avaliação de pendências nula; nenhuma aprovação preenchida |
| `database/operations/caixa-legado-brotas/README.md` | Novo estágio e sequência, preservando histórico |
| `database/operations/caixa-legado-brotas/09-RESULTADOS-PREPARO.json` | Evidência offline, limites e hashes dos artefatos locais |
| Este relatório, README/checkpoint Financeiro, checkpoints raiz/operacional e índice IA | Continuidade sincronizada; histórico preservado |

03.disabled,04 histórico e inventário confirmado permanecem byte a byte iguais.
Não há mudança de runtime, status/enum, RPC, migration, banco, permissão, dependência,
configuração ou publicação. AGENTS, relatório13 e trabalhos de outros módulos preservados.

Proposta: só os3 campos `status`, `fechado_por`, `fechado_em` da sessão fixa mudariam;
um evento financeiro administrativo com valor nulo e uma auditoria automática novos.
Todo dinheiro/contagem esperado/diferença, entradas/vínculos e auditorias anteriores
intactos. Não restaura Pix excluído, não zera, não quita e não abre sessão nova.
Nenhum status de aprovação reutilizado. “Fechado · legado” com evento administrativo
separado continua proposta de representação mínima, não regra funcional aprovada.

Diferenças técnicas do candidato: guardas de UUIDs fixos independentes do manifesto,
avaliação de custódia/obrigações explícita, mesmo advisory lock da abertura, locks de
tabela e READ COMMITTED para revalidar após adquiri-los; hashes das auditorias antigas,
motivo para trigger, ligação/hash da auditoria nova e verificação completa da repetição.
Locks são sobre relações inteiras e podem pausar gravações de ambas as clínicas;
janela autorizada sem writers/transações antigas é obrigatória. H08 deve comprovar
que políticas/snapshots antigos não permitem entrada tardia após commit. Sem isso,
a flag de writers permanece falsa; não resolver com mudanças de permissões nesta etapa.

Verificações novas:30 testes Node offline aprovados, uma rodada (14 existentes +16
novos), lint dos4 mjs com saída0; parsing Node e diff-check registrados no resultado.
Não repetidas suítes visuais/publicação, TypeScript ou build da aplicação, que não mudou.
**Homologação em banco:0 casos executados.** H01–H12 apenas planejados;14 testes
anteriores e30 atuais não comprovam SQL, atomicidade, concorrência ou persistência real.

Recuperação preparada: rollback integral antes de concluir; resposta incerta consultada
por UUID fixo/estado/hash, sem reenvio cego. Repetição íntegra não grava novamente.
Evento/estado divergentes ou acesso insuficiente bloqueiam. Não reabrir legado nem
restaurar o banco inteiro automaticamente se houver operação posterior. Backup e
restauração continuam não verificados; ensaio de recuperação deve ser isolado.

Decisões humanas: natureza das duas entradas/Pix, fechamento/reabertura conhecidos ou
não comprovados, custódia atual, obrigações/plano de acompanhamento, responsável e
motivo. “Não foi possível comprovar” é permitido como informação, sem virar ausência;
custódia ou obrigações sem avaliação/encaminhamento impedem executar. Aprovação
específica só depois dos testes, recuperação e nova leitura dos inventários/catálogo.
Ninguém respondeu ou aprovou em nome da proprietária.

Próxima ação: disponibilizar PostgreSQL dedicado e provar isolamento; criar artefato
de teste sintético separado e cumprir H01–H12. Depois esclarecer decisões, controlar
writers, verificar recuperação, revalidar principal por leitura e preparar outro
artefato para aprovação específica.03/05 continuam desabilitados; sem operações
financeiras, IA, chaves, commit/push/deploy. Branch/HEAD observados inalterados.

## 12. PostgreSQL portátil real, correção de escritores e recuperação — 04/10/2026,12:52 -03:00

**12 cenários distintos aprovados em PostgreSQL real**,25 execuções aprovadas contando
regressões. Instância nova exclusiva, PostgreSQL17.11 portátil encontrado em scratch/tools,
127.0.0.1:64752, marcador/data_directory/banco inicial vazio comprovados por SQL.
Sem Docker, instalação, serviço, PATH/firewall global, credencial ou dado de produção.
Sandbox Windows falhou com token87; revisão automática autorizou execução normal
Windows do mesmo laboratório, sem instalação administrativa. Parado em12:50:39 -03:00,
senha descartada, PIDfile ausente e porta sem listener. Nenhuma consulta ao principal.

Baseline/Financeiro fases1–7, estados/resumo/hardening e corpo real da auditoria
reproduzidos; constraints/FKs/RLS/índice único/helpers/RPC de abertura reais executados.
H01 preservou todos os campos salvo3,2 entradas e7 auditorias; evento e auditoria novos.
H02–H06 recusaram alvo/legado/estado/drift, garantiram repetição e rollback integral.
H07/H08 usaram duas conexões: abertura aguarda commit; escrita durante fechamento
55P03; snapshot antigo40001 sem entrada. H09 preservou auditoria/Pix excluído.
H10 abriu sessão sintética com12345centavos independentes. H11 interrompeu conexão
e comprovou rollback por outra; resposta pós-commit descartada e repetição sem efeitos.
H12 recusou aprovação ausente, papel parcial, vínculo inativo e evento divergente.
Detalhes/tempos em09 e homologacao-casos.json. Não confundir com os30 testes offline anteriores.

**Defeito concreto:** service_role/BYPASSRLS inseria entrada diretamente após fechamento;
locks/RLS não eram proteção permanente desse canal. Correção mínima preparada e
homologada só no laboratório: função privada e trigger BEFORE INSERT/UPDATE/DELETE
para clínica/sessão exatas, lock de linha e bloqueio por estado/evento administrativo.
Service_role e SQL postgres recusados55000 para3 operações; reabertura manual sintética
não removeu a proteção; outra clínica continuou permitida. EXECUTE direto restrito
somente no novo objeto, sem alterar ACLs existentes. Proposta10.disabled falsa/rollback;
05 permanece falso/rollback e agora exige a proteção. **Não aplicada no principal.**

Scripts de reprodução novos em `database/operations/caixa-legado-brotas/homologacao/`:
ambiente.ps1, banco.mjs, preparar-banco.mjs, executar.mjs, complementos.mjs,
fixture.sql e protecao.mjs.03/04/inventário conectado intactos. Gerador/candidato05,
manifesto, casos/resultados e documentos existentes atualizados; testes offline
existentes ajustados ao estágio técnico, sem usá-los como prova desta homologação.
Falhas de preparo corrigidas (reset/FK, inet, coluna de fixture, identificador helper,
WaitForExit), rodadas privadas preservadas. Nenhum código normal, banco principal,
RPC/permissão existente principal, dependência, publicação, commit/push/deploy alterado.

Pg_dump/pg_restore para segunda cópia da mesma instância sintética confirmou hashes
iguais de sessão/entradas/auditoria/eventos. Não comprova backup/PITR do principal.
Sem restaurar Pix, apagar história, fabricar saldo/contagem, zerar ou transportar fundo.
Proteção não cobre DBA que remova/desabilite triggers/eventos ou use TRUNCATE;
controle operacional e recuperação continuam pré-condições.

Limites de fidelidade:17.11 vs17.6; Auth/Vault auxiliares de contrato, sem login/JWT
Supabase real/GoTrue/Vault criptográfico; recorte de migrations, sem equivalência
total do catálogo remoto. Script de integridade lido/executado por blocos: histórico
de migrations e Storage ausentes, sem fingir integridade completa de Pacientes.
Hashes de5 componentes iguais ao ZIP local; EXE NotSigned, sem checksum autoritativo
do fornecedor. Binários locais já usados na Agenda; sem download nesta etapa.

Principal continua bloqueado. Próximo: revisar/aprovar a adaptação nova, confirmar
catálogo/índices/FKs/funções e escritores diretos de entradas por leitura; após eventual
adaptação, inventário/catalogo novos (hash muda), recuperação principal e janela sem
gravações de ambas as clínicas; decisões humanas e aprovação específica da transição.
Nada respondido pela proprietária. TypeSafe determinístico/sem IA/chaves; branch
codex/resgate-local-2026-09-26 e HEAD2a6e88d09c0a8a51cd73649bf45530c2db6a6923 inalterados.

## 13. Revisão técnica concluída e pacote único A/B — 04/10/2026,13:27 -03:00

Proposta integral consolidada em [08, quadro A/B](../../../database/operations/caixa-legado-brotas/08-HOMOLOGACAO-E-APROVACAO.md).
Projeto xftnkusbyqzyvzrovroj/main confirmado visualmente;6 lotes SQL READ ONLY pelo
canal oficial IAB autorizado, sem erro SQL. Igualdade do catálogo712 itens/21 tabelas,
sessão/operador,2 entradas dinheiro100000centavos,14 grupos modernos vazios,7 auditorias
históricas e0 eventos. Vinculações continuam válidas. Proteção ainda ausente. Literal
MD5 incorreto corrigido na comparação, sem modificar corpo da auditoria; corpo igual
à migration. Nenhuma diferença material nova do inventário. Fotografia de transações
ativas/preparadas vazia não comprova controle permanente de writers.

Caminho da falha: SQL direto como service_role/BYPASSRLS no laboratório, não uma
operação comprovada do aplicativo/serviço real. Authenticated normal sujeito a RLS;
postgres owner/BYPASSRLS pode deliberadamente desabilitar/drop/TRUNCATE, não protegido
contra abuso administrativo. A função específica é SECURITY DEFINER/search_path fixo;
trigger I/U/D só aplica ao alvo OLD/NEW. Caixas modernos/outras clínicas preservados;
UPDATE do alvo não pode mover a entrada. ACLs existentes/auditoria não alteradas.

4 casos reais dirigidos aprovados: H01/H05 e REC-A-ATOMICA/REC-A-PONTUAL. Falha após
CREATE FUNCTION reverteu objetos; recuperação pontual do arquivo arquivado devolveu
corpo/owner/ACL/trigger e preservou nova sessão12345centavos e todos os registros,
com bloqueio de service_role ativo. Reutilizadas as evidências anteriores H06/H11
para falha B/resposta incerta e dump/restore exclusivamente sintético. Cluster novo
40330f20a003432198f9417579cd7cfc/127.0.0.1:59026 parado13:24:51, senha removida,
PIDfile ausente/porta livre. Sem reexecutar12 cenários. Opção --revisao-recuperacao
em complementos.mjs; lógica05/10 intacta, comentários/metadados atualizados.

No painel Database > Backups > Scheduled backups, principal Free informa que não
inclui backups do projeto. Nenhuma cópia principal recuperável apresentada/testada;
B bloqueada até canal oficial/cópia/restauração separada autorizados. Não contratar,
restaurar principal inteiro ou reabrir legado. Reparo após operações novas exige
revisão/autorização separadas, preservando originais e acrescentando evidência corretiva,
sem desfazer contagem/saldo inventados. Cópia/SQL/hash não provam recuperação.

A pendente: instalar função+trigger e restringir EXECUTE só da função nova, nenhuma
linha financeira alterada. B pendente: após A/reinventário/backup/writers e decisão
humana, mudar apenas status/fechado_por/fechado_em e acrescentar auditoria automática
+evento administrativo inequívoco. Não criar nova sessão ou transportar fundo.
Respostas sobre entradas/Pix, fechamento/reabertura, custódia/obrigações, responsável
e motivo continuam pendentes; desconhecido exige registro/plano, não zero.
Inventário recebeu revalidação datada, mantendo snapshot original. Manifesto tem
A/B nulas e recuperação/writers falsos;03/04 preservados,05/10 falsos/rollback.
Relatório/checkpoints/runbook/resultados atualizados, demais trabalhos preservados.
Branch/HEAD inalterados; sem escrita principal, chaves, IA, commit/push/deploy.

## 14. Recuperação do recorte e canais antigos — 04/10/2026,14:30 -03:00

Principal xftnkusbyqzyvzrovroj/main somente leitura. Exportação oficial Copy as CSV:
8 partes/31.571 bytes; recorte1 sessão+2 entradas+7 auditorias,0 eventos, definições
pertinentes. Snapshot/catálogo/fingerprints iguais; Pix excluído só na auditoria.
Cópia DPAPI/ACL exclusiva em scratch/recuperacao-caixa-legado-82186a79d4054153ad8f629e69ee9574,
fora de Git/public; não backup integral/PITR ou recuperação de desastre.
4/4 casos finais de recuperação PostgreSQL17.11 aprovados: dados exatos, funções/
ACL/triggers, conferência repetida preservando evento posterior, recusa SQLSTATE55000
antes de DML. Cinco invocações do ensaio,3 interrompidas por ajustes do próprio teste,
1 preliminar e1 final.12 cenários anteriores reaproveitados, sem repetição integral.
Cluster final5ffc40de3e9248f38abe0d1e2b273e8a parado14:27:59, senha descartada, PIDfile
ausente/porta livre; outras2 instâncias desta etapa também paradas. Cadastros auxiliares
sintéticos e Auth/Vault/versão parcial limitam fidelidade; não houve restore principal.
Canais: tela/endpoint antigos de agosto inseriam entradas diretamente com JWT usuário;
bootstrap atual não registra rotas antigas, financeiro_privado/financeiro_api ausentes
no principal. Data API/serviço BYPASSRLS continuam caminhos técnicos possíveis.
pg_monitor/pg_read_all_stats confirmados;0 transações/preparadas/locks de escrita nas
fotografias17:18/17:21UTC. Isso não comprova suspensão de servidores/filas externos.
Bundles públicos das duas clínicas continuam iguais à publicação2a6e88d0 por SHA256.
Sequência concreta da janela em08/consultas12: identificar e retirar backends antigos,
suspender somente envios afetados, drenar transações, renovar cópia/inventário, A só
após aprovação, revalidar catálogo posterior a A, B só após decisões/aprovação, retomar
somente serviços atuais. Trigger A protege sessão fixa; não torna writer antigo seguro
para próxima sessão. Não desativar controles/usar TRUNCATE/cancelar conexões por atalho.
Pendência real: deploys/filas/consumidores privilegiados externos não inventariados;
writers=false. Backup=true refere só ao recorte comprovado e exige renovação na janela.
A/B e respostas da proprietária continuam nulas.03/10 intactos;05 apenas manifesto
embutido atualizado, trava falsa/ROLLBACK. Sem mudança financeira principal, pausa,
permissões, commit/push/deploy. TypeSafe sem IA/chaves. Trabalho existente preservado.
Branch codex/resgate-local-2026-09-26, HEAD2a6e88d09c0a8a51cd73649bf45530c2db6a6923;
alterações locais não commitadas. Pacote/relatório14 seção14 guardam detalhes atuais.

A lista de arquivos novos concretos é11-exportacao-recuperacao.sql,12-canais-escrita-leitura.sql,
homologacao/exportar-recorte.mjs,recuperacao-privada.ps1 e recuperar-recorte.mjs.
Manifesto/inventário/09/runbook/08 e checkpoints atualizados; runtime/financeiro publicado
preservados. Detalhes, reprodução, alcance e condições da janela no
[pacote08](../../../database/operations/caixa-legado-brotas/08-HOMOLOGACAO-E-APROVACAO.md#recuperação-e-canais-antigos--resultado-efetivo-de-04102026-1430--0300).

## 15. Conclusão limitada dos canais — 04/10/2026,14:50 -03:00

Preparação técnica concluída no escopo existente; faltam decisões humanas e A/B.
Hostinger oficial: ambos sites ativos/Node22/Vite, build2a6e88d0 completed, sem entry_file
Fastify. Supabase xftnkusbyqzyvzrovroj/main:1 Edge Function equipe-acessos; index321
linhas lidas trata Equipe/Auth, sem caixa. Integrations instalado Data API/Vault;
Cron/Queues/Webhooks são opções sem INSTALLED. Não identificado serviço antigo
ativo/fila financeira; possibilidades genéricas deixam de bloquear o preparo.
H07/H08/H09/H11 reaproveitados: locks/fingerprints/trigger cobrem escrita anterior,
concorrente/tardia e resultado incerto; pausa ampla não é condição de integridade.
Janela breve sem envios é precaução de disponibilidade. Leitura/drenagem pertinente,
inventário/cópia imediatamente anteriores e pós-checks continuam condições da execução.
writers=false preserva guarda da janela, não afirma suspensão nem cria busca genérica.
Se surgir backend histórico ativo, não retomar antes de nova abertura: resolve outro
caixa e A só protege alvo fixo. Efeitos externos não são revertidos pela trigger;
nenhum gateway financeiro concreto identificado. Equipe/e-mails/outros sites preservados.
Pacote08/matriz/janela e manifesto/09 atualizados; recuperação4/4/12 cenários mantidos,
0 exportações/0 testes novos.05 só manifesto embutido, lógica/trava falsa/ROLLBACK intactas;
03/10 e geradores inalterados. A/B/respostas nulas; sem pausa, escrita principal,
financeiro real, permissões, commit/push/deploy. TypeSafe determinística sem IA/chaves.
Branch codex/resgate-local-2026-09-26, HEAD2a6e88d09c0a8a51cd73649bf45530c2db6a6923.
Alterações locais não commitadas; detalhes no pacote08 e relatório14 seção15.


## 16. Declaração do usuário e confirmação final pendente

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


## 17. Execução autorizada e pré-condição de responsável não satisfeita

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


## 18. Execução específica A/B — 04/10/2026,18:38 -03:00

A instalada18:23:53; B concluída18:31:22, projeto xftnkusbyqzyvzrovroj/main, exclusivamente
pelo SQL Editor oficial no navegador interno, sob autorizações expressas do usuário.
Responsável Eduardo Campos, desenvolvedor de software: conta de administração indicada,
UUID8792e28b-faf6-41fd-9d89-a84a453f0137, ativa/Proprietária ativa em Brotas, nome exibido
Proprietária. Não houve criação/promoção de conta. Declaração de testes e ausência de
dinheiro/obrigações reais atribuída ao usuário, sem conclusão independente da auditoria.

Sessão a4a18e49-6634-4058-9fd8-07f3b065fd63 fechada administrativamente. Só status,
fechado_por e fechado_em alterados; duas entradas e sete auditorias originais preservadas.
Acrescentados auditoria1582 e evento único9ecb1e2a-5fe0-463c-8858-13919b1096f3; nenhum
valor, contagem ou conciliação fabricado. Outras sessões intactas,14 grupos modernos vazios.
A cria somente função privada/trigger I/U/D da sessão fixa; catálogo714itens,0 objetos
antigos modificados.9 SELECTs oficiais de integridade conformes. Recorte protegido DPAPI
renovado e comparado ao recuperado no laboratório;12 cenários/4 recuperações reaproveitados.

Aplicação normal clinicabrotas.com.br/sistema/brotas/financeiro, Recepção: Caixa fechado
e Abrir caixa disponíveis, inclusive após F5. Nenhum formulário/caixa novo aberto.
Captura em scratch (ignorado pelo Git); motivo, recuperação e limites no pacote08 e
relatório14 seção18.03/05/10 continuam disabled; não repetir scripts executados. Nenhuma
exclusão, transporte de valores, pausa de serviços, permissão existente, commit/push/deploy.
Branch codex/resgate-local-2026-09-26; HEAD2a6e88d09c0a8a51cd73649bf45530c2db6a6923;
alterações documentais locais não commitadas. TypeSafe determinística sem IA/chaves.
Próxima ação: operação normal pelo usuário, com fundo efetivamente contado; qualquer nova
intervenção requer escopo próprio. Não restaurar/reabrir automaticamente o legado.

Detalhes de objetos/ACLs, dados preservados, cópia privada recuperável, consultas,
recuperação e limites: [pacote08](../../../database/operations/caixa-legado-brotas/08-HOMOLOGACAO-E-APROVACAO.md#execução-autorizada-ab-concluída--041020261838--0300).
10 lotes READ ONLY concluídos;2composições do leitor pós-B falharam por sintaxe e foram
corrigidas sem repetir A/B. Nenhum teste de escrita no principal.9 SELECTs oficiais de
integridade executados após A; corpo novo igual por linha exceto CRLF/indentação; catálogo
714itens com somente2adições. O bloqueio anterior de identidade foi resolvido pela conta
fornecida, não por criação/promoção ou remoção de guarda. Estado real fechado às18:31:22,
execução9ecb1e2a-5fe0-463c-8858-13919b1096f3; auditoria1582/evento administrativo com
valorNULL, contagem/conciliação não comprovadas. Nenhuma nova sessão/fundo transportado.
