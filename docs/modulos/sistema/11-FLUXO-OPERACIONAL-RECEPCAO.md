# Recepção — conferência operacional local

Data: 01/10/2026, 10:22 -03:00 (America/Bahia).
Estado inicial histórico: correção local e testes simulados concluídos; fluxo integrado conectado não homologado nesta rodada. Publicação autorizada posteriormente: ver seção final.
Branch observada: `codex/resgate-local-2026-09-26`; HEAD: `ced16fd1ee5faef17fb9330eaa9a7770b2895abc`.
Na abertura deste relatório, as alterações abaixo não foram commitadas nem publicadas. Alterações anteriores de outras tarefas foram preservadas; estados posteriores constam nas seções datadas.

## Escopo e fontes

Conferidos instruções, memória operacional, convenções, regras de desenvolvimento,
documentação de Pacientes e integrações do contexto funcional existente, código de
Pacientes/Agenda, serviços e testes. Referências: [Pacientes](../pacientes/00-README-PACIENTES.md),
[checkpoint de Pacientes](../pacientes/08-CHECKPOINT.md),
[validação operacional histórica](../../12-VALIDACAO-OPERACIONAL.md) e
[restauração de rotas](10-RESTAURACAO-SESSAO-E-ROTAS.md).
F5 permanece encerrado pela validação manual relatada pelo usuário; não foi reaberto.

## Estado encontrado e correções

**Observado no código:** os formulários unificados, endereço estruturado, CPF opcional,
inclusão autorizada de CPF, correção auditada restrita à proprietária, foto confirmada e
feedback de Pacientes já existem. Não foram reconstruídos nem tiveram regras alteradas.
As evidências conectadas anteriores de Pacientes continuam nas fontes do módulo; não
foram reapresentadas como nova validação real da recepção.

**Defeito reproduzido por simulação:** ao mudar a situação na Agenda, `mudarStatus`
recebia erro do serviço, recarregava a lista, mas não mostrava falha. O teste com resposta
403 falhou antes da correção por ausência do alerta esperado. O retorno também não
comprovava que uma linha havia sido atualizada.

Correção focada em `src/pages/Agenda.tsx`:

- Mantém UPDATE limitado ao ID e à clínica; solicita o retorno de `id, status` e só
  confirma quando ambos correspondem à operação. Erro e ausência de linha não dão sucesso.
- Mostra andamento, impede envio repetido e reutiliza `FeedbackAlert`: sucesso verde,
  erro vermelho, texto e fechamento acessível. Sucesso fica visível por aproximadamente
  seis segundos, com o comportamento compartilhado de pausa durante interação.
- Respostas de uma clínica/data anterior não mostram confirmação ou lembrete atrasado;
  o controle de revisão também distingue saída e retorno ao mesmo contexto.
- Expõe a situação em texto no cartão e no nome acessível, além da cor. A primeira
  verificação após recarga evidenciou que o estado estava no mock, mas era indicado
  apenas visualmente por cor; agora “Aguardando” é legível.
- Mantém o lembrete de CPF não bloqueante, somente após confirmação da chegada.

Não houve alteração de banco, migrations, RLS/Auth, permissões, regras financeiras,
Pacientes, Equipe ou Site Geovana. Nota local em `src/config/notasEvolucao.json`.

## Resultado do fluxo existente

No harness com papel **recepção sintético**, em cada contexto:
cadastro sem CPF → seleção do paciente → agendamento com paciente/profissional/clínica,
data e horário conferidos → chegada → situação **Aguardando** → dispensa do lembrete
de CPF → recarga → mesmo agendamento aguardando.

A posição continua sendo o horário/coluna do profissional na Agenda. Não foi criada
fila por ordem de chegada. “Lista de espera” continua sendo o recurso existente de
espera de agendamento, não uma nova etapa de atendimento. A recepção não recebeu
“Iniciar atendimento”; a operação existente do médico e suas dependências permanecem.
O início efetivo de atendimento por sessão real de médico não foi testado nesta rodada.

## Verificações realmente executadas

| Verificação | Resultado e alcance |
| --- | --- |
| `npm run test:pacientes` | 25/25 testes unitários aprovados |
| Pacientes: nove cenários em três tamanhos | 27 aprovações na execução inicial: endereço após recarga simulada; foto/andamento/erro/repetição; CPF opcional/inclusão; indisponibilidade de leitura; erros preservando rascunho; edição pelo resumo; sucesso após fechamento; gravação confirmada com falha separada da lista |
| Agenda e fluxo integrado dirigido | Execução final 27/27: cadastro → agenda → chegada nos dois contextos; erro 403; atualização sem linha; envio em andamento; resposta tardia após troca de clínica; retorno do cadastro à Agenda; lembretes não bloqueantes |
| Cadastro e edição pela tabela | Execução final 9/9: validação/CPF vazio/endereço manual, envio repetido e edição pela tabela com reabertura |
| Build e lint | Aprovados; lint sem erros, aviso preexistente de Fast Refresh em ThemeProvider; build mantém avisos preexistentes de tamanho/importação de chunks |

São **63 aprovações de cenários/tamanho nas execuções selecionadas**, não uma suíte
única nem comprovação de persistência no Supabase. Desktop, tablet e celular foram
executados. O harness usa Clínica A/B com seleção Brotas/Ipupiara, IDs fictícios e
`operacional.synthetic.invalid`; as respostas são interceptadas e o estado é mantido
no interceptador durante a recarga. Essa correspondência não valida clínicas reais,
Auth, RLS ou permissões do servidor.

Histórico das execuções: a primeira rodada conjunta terminou 44/48; um timeout de carga
fria e três seletores ambíguos após o novo nome acessível foram corrigidos no teste.
Os cenários afetados passaram na execução dirigida final. Antes disso, o novo harness
teve ajustes de tempo de carregamento e expectativa de CPF nulo, sem alteração da regra
do formulário. Não são omitidas essas falhas nem atribuídas ao banco.

Capturas exclusivamente sintéticas em `scratch/recepcao-brotas-{desktop,tablet,mobile}.png`
e `scratch/recepcao-ipupiara-{desktop,tablet,mobile}.png`, ignoradas pelo Git. Inspeção
visual das capturas desktop de Brotas e celular de Ipupiara confirmou leitura do
horário/situação sem depender apenas da cor. Os testes também verificam alertas e modais.

TypeSafe: skill consultada, sem benefício necessário para decisões determinísticas;
nenhuma API, chave ou integração utilizada. A revisão visual com impeccable preservou
os componentes e cores semânticas existentes, sem redesenho da interface.

## Limitações e limpeza

No navegador controlado, a rota pública de Ipupiara mostrou login, sem sessão autorizada
de recepção. A aplicação local também mostrou login. Não foram contornadas autenticação
ou permissões. Não houve nova gravação conectada, conferência de RLS real ou validação
integrada autenticada de Brotas/Ipupiara. O laboratório PostgreSQL das etapas anteriores
não equivale a um ambiente completo com Auth e Storage para este fluxo de interface.

Não foram criados registros remotos, contas, pacientes ou agendamentos nesta execução.
Fixtures eram apenas memória dos interceptadores e terminaram com os contextos dos testes;
nenhuma auditoria ou cadastro remoto precisou ser removido.

## Prévia e conferência

Servidor local iniciado nesta pasta, porta 3000:

- Brotas: `http://127.0.0.1:3000/acesso/brotas`.
- Ipupiara: `http://127.0.0.1:3000/acesso/ipupiara`.
- Menu: **Cadastros → Pacientes**; depois **Agenda**, cartão do agendamento → **Aguardando**.

Na aplicação normal, não cadastrar dados fictícios no principal para repetir este ensaio.
Com sessão autorizada, é possível conferir apresentação por leitura dos registros
disponíveis. Para repetir os testes isolados sem gravação remota, usar
`npm run test:operacional -- recepcao-fluxo.spec.ts`.

**Próxima ação concreta:** disponibilizar ambiente de testes completo autorizado, com
Auth/Storage e sessões próprias de recepção em cada clínica e de médico para o início
do atendimento. Executar o mesmo cenário com fixtures identificadas, conferir persistência
e permissões reais e limpar apenas seus IDs após verificar dependências, preservando
auditoria. Publicação, commit/push ou mudança remota não foram realizados nesta tarefa.

## Continuação — diagnóstico do ambiente conectado (01/10/2026, 10:32 -03:00)

**Resultado:** ambiente de homologação adequado não identificado entre os recursos
acessíveis. Nenhum cenário de escrita conectado foi executado nesta continuação.
Não se trata somente de autenticação pendente da recepção.

### Evidências obtidas nesta sessão

- Git: mesma branch e HEAD `ced16fd1ee5faef17fb9330eaa9a7770b2895abc`, alterações
  anteriores preservadas, nenhuma alteração staged. Diff real de Agenda conferido.
- `.env`, arquivo de importação Hostinger e vínculo local da CLI apontam ao principal
  `xftnkusbyqzyvzrovroj`. `src/lib/supabase.ts` usa as variáveis Vite, sem seleção de
  homologação por ser localhost. Nenhum override local de ambiente foi encontrado nos
  arquivos `.env.local`/`.env.development`/`.env.development.local` verificados.
- Consulta HTTP somente de leitura ao módulo servido em
  `http://127.0.0.1:3000/src/lib/supabase.ts`: HTTP 200; o código transformado aponta para
  `https://xftnkusbyqzyvzrovroj.supabase.co`. Não foram impressas chaves públicas ou segredos.
  Portanto a prévia normal está conectada ao principal, não ao banco fictício dos testes.
- Porta 3000 respondeu; porta 54321, configurada para API Supabase local, não respondeu.
  Nenhum processo PostgreSQL foi retornado pela consulta disponível. Inventário detalhado
  de processos via CIM recebeu acesso negado; isso limita a prova de inexistência de
  outros serviços, mas não torna o laboratório portátil um Supabase completo.
- CLI instalada: ajuda de `projects list` conferida. Primeira chamada esbarrou na escrita
  de telemetria fora do workspace; com as opções de desativação de telemetria já usadas
  pelo projeto, a ajuda funcionou. A listagem retornou `LegacyPlatformAuthRequiredError`
  / “Access token not provided”. Não houve login, pedido de token ou alteração global.
- **Painel autenticado, somente inventário:** organização Clinica médica
  (`beorhmlwookvtxtghkii`) mostrou um projeto, Clinica Patrícia, ref
  `xftnkusbyqzyvzrovroj`. A organização siteGeovana (`kwjozzlrtmaffdfvyoqw`) mostrou
  Site Geovana APP (`osziekapsoeqhfwcnyjj`) e outro projeto externo
  (`gfghoytntropufdxeqwt`). Nenhum é identificado como homologação deste sistema.
  Não foram abertas tabelas, configurações, contas ou dados desses projetos externos.
  Não se presume ausência de uso. Outras contas/organizações fora dessa sessão não
  foram inventariadas. A observação não determina uma cota Free atual de projetos ativos.

### Correções que ainda precisam de comprovação conectada

Retorno real de `id, status` após UPDATE pela recepção; chegada/situação Aguardando
persistindo após nova consulta e recarga; confirmação/erro visíveis no fluxo real;
envio único durante requisição e descarte de resposta antiga; isolamento real entre
Brotas e Ipupiara. Cadastro e agendamento integram o ensaio, sem reconstruir seus recursos.
Testes anteriores permanecem evidência local/simulada, sem aprovação nova de RLS/Auth.
Nenhum perfil/clínica foi validado por gravação conectada nesta sessão.

### Alternativa mínima e situação para publicação

1. Se já existir homologação da Clínica Patrícia em outra conta, indicar seu painel/ref
   e autorizar especificamente seu uso. Conferir isolamento, esquema, RPCs, RLS, Auth,
   Storage/Vault e dados sintéticos antes de conectar uma prévia separada.
2. Se não existir, a alternativa sem Docker é preparar um projeto Supabase separado
   para homologação, **em etapa expressamente autorizada**, com esquema/dependências
   necessários e identidades sintéticas de recepção nas duas clínicas. Não copiar dados
   reais nem reaproveitar Site Geovana. Prévia usa configuração local separada e porta
   própria; não substitui a configuração do principal. Essa preparação não foi executada.
3. Free custa US$0/mês, limitado a dois projetos ativos; disponibilidade na conta precisa
   ser confirmada. Se a cota impedir, registrar a decisão necessária antes de qualquer
   contratação, pausa ou mudança. Pro começa em US$25/mês e não foi solicitado/contratado.
   [Preços oficiais](https://supabase.com/pricing). O caminho local oficial completo exige
   Docker, portanto não foi adotado: [documentação](https://supabase.com/docs/guides/local-development).
4. Com ambiente adequado confirmado, pedir login pela interface da **prévia de homologação**
   na rota `/acesso/brotas` ou `/acesso/ipupiara`, conforme o vínculo. Não pedir senha e
   não confundir login no principal com autorização de escrita de teste.

**Aptidão:** implementação local com testes/build/lint aprovados anteriormente; não há
nova falha de código comprovada. Ainda não está homologada para afirmar liberação segura
do fluxo conectado, especialmente o novo contrato UPDATE com retorno sob RLS de recepção.
Nenhuma publicação realizada ou autorizada nesta continuação. Não repetidos build,
testes aprovados ou F5; TypeSafe avaliada pela descrição, sem uso de API/chave.
Somente este relatório e o checkpoint operacional foram atualizados. Nenhuma fixture
remota criada: não houve limpeza de dados nem remoção de auditoria.

## Preparação autorizada de homologação — 01/10/2026, 10:37 -03:00

**Estado: BLOQUEADO pela cota Free, confirmado no painel.** O usuário autorizou
preparar um ambiente separado sem custo adicional e validar a recepção quando disponível.
Essa autorização substitui a pendência anterior de autorização da preparação, mas não
permite plano pago, excedentes ou alterações em projetos existentes/de terceiros.

Foi feita uma única verificação de disponibilidade, no formulário de criação da organização
**Clinica médica**, ID `beorhmlwookvtxtghkii`:
`https://supabase.com/dashboard/new/beorhmlwookvtxtghkii`.
O painel autenticado informou “The organization has members who have exceeded their free
project limits”, identificou o limite de **2 projetos Free** atingido por um membro e
explicou que a criação exige resolver esse limite. **Create new project estava desabilitado.**
A identidade pessoal do membro não é reproduzida neste relatório. Não foi tentada criação
em outra organização, upgrade, pausa, exclusão ou alteração de membros para contornar a cota.

A documentação oficial confirma que o limite considera todas as organizações em que
o usuário é Owner/Administrator; simplesmente criar outra organização não garante vaga.
[Cobrança e limite Free](https://supabase.com/docs/guides/platform/billing-on-supabase).
Free custa US$0/mês, sujeito à elegibilidade e aos limites;
[preços oficiais](https://supabase.com/pricing). Nenhum custo foi contratado.

### O que não foi preparado ou testado

- Nenhum projeto, esquema, migration, conta, clínica, paciente ou agendamento novo.
- Nenhuma configuração de homologação funcional ou URL nova. A prévia 3000 continua
  configurada para o principal: **não deve ser usada como homologação**.
- Indicador “HOMOLOGAÇÃO” não foi instalado em uma aplicação conectada ao principal,
  pois isso daria identificação enganosa. Configuração isolada e trava de destino deverão
  acompanhar o ambiente real, não uma ref fictícia.
- Não foram habilitados e-mail, cobrança, emissão fiscal ou outras integrações.
- Nenhuma validação conectada de cadastro/agendamento/chegada/Aguardando/persistência,
  mensagens, repetição ou isolamento por sessão real de recepção em qualquer clínica.
  Resultados simulados anteriores permanecem válidos no seu escopo, sem repetição.
- Sem fixtures novas, não houve limpeza de registros nem alteração de auditoria.

### Alternativa mínima e continuidade

Disponibilizar uma **vaga gratuita legítima na organização correta**, resolvendo a cota
fora desta execução sem alterar principal ou projetos de terceiros, ou indicar um
ambiente isolado de homologação já existente, com alvo e autorização específicos.
Não há alternativa gratuita completa identificada nos recursos atuais que satisfaça
simultaneamente todos os limites. PostgreSQL portátil não substitui Auth/PostgREST/
Storage/Vault; Docker e contratação não foram adotados. Não se promete que outra conta
ou organização resolverá a cota sem verificar sua elegibilidade.

Quando houver vaga/ambiente, a preparação sem custo já está autorizada neste escopo:
nome claramente de homologação; estrutura necessária revisada antes da aplicação;
Auth e RLS reais; dados/acessos sintéticos; configuração de prévia separada com indicador;
confirmação do destino das requisições; integrações externas desabilitadas; então ensaio
da recepção em cada clínica e limpeza segura por IDs, preservando auditoria.

Git conferido: branch/HEAD ced16fd inalterados, alterações existentes preservadas e
nenhuma alteração staged. Nesta etapa somente relatório 11 e checkpoint operacional
atualizados; sem código, commit/push, publicação ou banco. Skill Supabase não disponível
no catálogo/pasta local consultados; documentação oficial usada como alternativa.
TypeSafe avaliada pela descrição e não aplicada a esta tarefa determinística.

**Agenda:** aprovada localmente nos testes anteriores, mas a aptidão final para publicação
continua pendente de homologação conectada sob permissões reais de recepção. F5 continua
encerrado por relato manual; não foi reaberto. O bloqueio desta rodada é o serviço/cota,
não uma rejeição de revisão automática da ferramenta nem falta de senha da recepção.

## Revisão focada e inspeção conectada — 01/10/2026, 10:45 -03:00

**Conclusão:** nenhuma incompatibilidade encontrada entre o novo retorno de `id, status`
e as definições instaladas de autorização da recepção. Implementação preservada, sem
nova alteração funcional ou repetição de testes/build. Esta conclusão é de inspeção,
não comprovação de UPDATE pela sessão real de recepção. Não reaberta a investigação de cota.

Revisado o diff de Agenda: erro/ausência de registro não produz sucesso; ID e situação
precisam corresponder; ref em andamento impede requisição repetida e botões ficam
desabilitados; contexto clínica/data com revisão descarta retorno antigo; cartão traz
texto de situação. A recarga da grade trata falha de consulta separadamente por alerta
de carregamento; confirmação de UPDATE não é prova de que a consulta seguinte funcionou.

### Evidência do banco principal, somente catálogo

Painel autenticado do projeto `xftnkusbyqzyvzrovroj`, Clinica Patrícia, main PRODUCTION.
SELECTs executados no SQL Editor, consultando somente `pg_policies`, `pg_class`, `pg_proc`
e funções de inspeção de privilégios. Nenhum paciente, conta, agenda ou conteúdo pessoal
foi consultado; nenhum INSERT/UPDATE/DELETE, migration ou alteração de configuração.

- `agendamentos_select`: vínculo retornado por `clinicas_do_usuario()` e papel autorizado
  por `eh_proprietaria_ou_recepcao(clinica_id)` (ou próprio profissional).
- `agendamentos_update`: exige o mesmo vínculo e papel; WITH CHECK exige ainda paciente
  da mesma clínica e vínculo ativo do profissional naquela clínica.
- RLS em `agendamentos`: `true`; `authenticated` pode SELECT de `id` e `status`, UPDATE
  de `status` e EXECUTE dos dois auxiliares: todas as cinco verificações retornaram `true`.
- `clinicas_do_usuario()` filtra `usuarios_clinicas.usuario_id = auth.uid()` e `ativo=true`.
  `eh_proprietaria_ou_recepcao(uuid)` verifica usuário, clínica, vínculo ativo e papel
  `proprietaria`/`recepcao`. Definições lidas por `pg_get_functiondef`, não executadas
  como substituto de identidade de recepção.

A sessão administrativa do editor foi usada para ler o catálogo, **não** para afirmar
que o UPDATE de um usuário comum passou. Como alterar apenas status não muda os predicados
da clínica/papel, o retorno é compatível para uma linha elegível, enquanto vínculos e
dependências permanecerem válidos. Negativa/conflito real continua possível e deve ser
respeitado, sem ampliar permissões.
[UPDATE com retorno](https://supabase.com/docs/reference/javascript/update),
[RLS oficial](https://supabase.com/docs/guides/database/postgres/row-level-security).

A primeira digitação da consulta foi interrompida pela ferramenta antes da execução;
editor recuperado e substituído por SELECTs curtos, resultados conferidos na tabela.
Não se atribuiu a interrupção ao banco. O editor criou uma aba de consulta privada;
nenhuma mudança de esquema/dados/configuração foi feita, nem foi acionado Save.
Skill Supabase indisponível no catálogo consultado; documentação oficial usada.
Descrição TypeSafe avaliada: não pertinente, sem integração/chave/API.

### Roteiro manual — somente uma operação necessária à rotina

**Aviso:** a prévia local está conectada ao principal, confirmado novamente no módulo
servido pela porta 3000. Salvar altera dados reais. Não criar fixture, antecipar chegada
ou alterar um agendamento apenas para testar. A IA não executará a atualização.

1. Abrir `http://127.0.0.1:3000/acesso/brotas` ou
   `http://127.0.0.1:3000/acesso/ipupiara`, conforme a unidade. Entrar pessoalmente
   pela interface com a conta legítima de recepção; não enviar senha pelo chat.
2. Conferir clínica e papel **Recepção** após autenticar, abrir Agenda e confirmar data,
   horário, paciente e profissional do agendamento que realmente precise registrar chegada.
   Se papel/unidade não corresponderem, parar antes de qualquer ação.
3. Quando o paciente realmente chegar, abrir o cartão e selecionar **Aguardando** uma
   única vez. Esperar “Atualizando situação...”, sem repetir clique ou trocar de clínica.
4. Esperar alerta verde **Chegada registrada**, “O paciente está aguardando atendimento
   na Agenda.” e texto **Aguardando** no cartão. Lembrete de CPF, se aparecer, não bloqueia
   chegada; não incluir documento apenas para testar.
5. Recarregar a página e conferir o mesmo agendamento/data/clínica, ainda **Aguardando**.
   O alerta temporário não precisa reaparecer após a recarga.
6. Se houver alerta vermelho, ausência de confirmação, divergência ou falha de leitura,
   **parar e não reenviar**. Conferir por leitura após recarga, se possível, e informar
   clínica, papel e mensagem, sem dados pessoais. Não presumir que uma falha de rede
   significa que o banco não gravou. Não desfazer chegada legítima para repetir o ensaio.

Informar o resultado da unidade efetivamente utilizada; uma clínica não valida a outra.
Erros/repetição/retorno tardio continuam cobertos pelas simulações anteriores; não serão
provocados em registros reais. Sem publicação, commit/push ou nova infraestrutura.
**Aptidão:** revisão local e compatibilidade de permissões por inspeção aprovadas;
confirmação operacional manual do retorno/persistência permanece pendente antes de
declarar funcionamento real validado. F5 permanece encerrado no escopo já relatado.

## Conferência pela interface iniciada — 01/10/2026, 10:50 -03:00

Prévia existente preservada, sem reiniciar serviços. Consulta aos módulos servidos na
porta 3000 retornou HTTP 200: Agenda contém “Chegada registrada” e validação de retorno;
cliente aponta para `xftnkusbyqzyvzrovroj.supabase.co`. Confirma código corrigido servido,
não sua execução autenticada. TypeSafe avaliada pela descrição, sem integração.

Navegador: seleção da aba local anterior de Ipupiara esbarrou em timeout de comando de
foco. Aberta nova aba visível em `http://127.0.0.1:3000/acesso/brotas`; login/identidade
Brotas carregaram. Recepção selecionada, mas esse seletor não comprova perfil autorizado.
Nenhuma sessão autenticada de recepção foi confirmada. Aba preservada para participação
do usuário; solicitado login pessoal pela interface, sem senha pelo chat.

Ponto de parada: aguardando autenticação. Agenda/lista/situação textual/recarga interna
ainda não conferidas nesta etapa. Nenhuma chegada ou outro dado foi gravado. Depois do
login, conferir perfil e clínica por leitura e solicitar indicação pela interface e
confirmação específica do agendamento cuja chegada realmente tenha ocorrido, antes
de executar uma única atualização. A autorização anterior para roteiro manual não é
tratada como indicação desse alvo. Persistência e ambas as clínicas não declaradas aprovadas.
Git/alterações preservados; somente documentação atualizada, sem publicação/commit/push.

## Interface autenticada — 01/10/2026, 10:55 -03:00

Usuário informou “logado”. A IA conferiu na interface local **Recepção / Clínica Brotas**,
sem usar o seletor do login como prova. Navegação real Dashboard → Agenda:

- Antes: `http://127.0.0.1:3000/sistema/brotas/dashboard`.
- Após abrir Agenda e após recarga: `http://127.0.0.1:3000/sistema/brotas/agenda`.
- Após carregamento: mesma página, clínica e perfil; grade de 01/10/2026 sem
  agendamentos e aviso “Nenhum profissional com expediente cadastrado para este dia.”
- Lista de espera presente, não confundida com agendamento ou estado Aguardando.

Comprovados por navegação conectada: sessão autorizada de recepção em Brotas, abertura
e carregamento da Agenda e manutenção da página após recarga. Não houve cartão de
agendamento nessa data para verificar situação textual. Não houve gravação, alerta de
chegada ou comprovação de persistência de atualização. Ipupiara não validada nessa etapa.
Não registradas identidades de pacientes nem capturas contendo dados pessoais.

O pedido atual permite à IA registrar uma chegada somente após o usuário indicar o
agendamento pela interface e confirmar que a chegada realmente ocorreu e deve ser
registrada. Isso sucede o roteiro histórico acima, que previa execução pelo usuário.
Aviso reforçado: prévia aponta ao principal e salvar altera dados reais. Próximo passo:
usuário selecionar a data/agendamento legítimo, sem registrar ainda, e confirmar o alvo
e a operação. Não escolher paciente, fabricar chegada, usar lista de espera ou antecipar
atendimento para viabilizar o teste. Depois da confirmação, um envio; em resultado
ambíguo, somente leitura, sem repetir ou reverter chegada legítima.

TypeSafe avaliada pela descrição, não pertinente. Nenhuma alteração funcional,
repetição de build/testes, migration, publicação, commit ou push.

## Chegada autorizada, alvo não localizado — 01/10/2026, 11:16 -03:00

Usuário confirmou que a chegada ocorreu e autorizou registrar uma única vez o agendamento
selecionado. Na inspeção pela IA, aba local da Agenda permaneceu em Brotas, 01/10, sem
agendamentos e sem expediente; as outras duas abas locais autenticadas exibiam Dashboard.
Perfil Recepção/Brotas confirmado. Nenhum cartão selecionado disponível para identificar
com segurança o alvo autorizado. Lista de espera não usada como substituto.

Não houve clique de atualização, gravação, alerta de chegada nem teste de persistência.
Não houve recusa de ferramenta: a limitação é a ausência da seleção nas abas disponíveis.
Solicitado ao usuário deixar o cartão indicado visível na Agenda local e avisar, sem enviar
dados pessoais. A autorização específica já concedida será preservada; não se pede nova
autorização genérica. Não escolher outro atendimento nem criar dados. Somente documentação
atualizada, sem publicação, alteração funcional, commit/push ou migration.

## Publicação autorizada — 01/10/2026, 11:25 -03:00

Usuário encerrou o ensaio conectado sem agendamento elegível: somente gravação e
persistência permanecem pendentes, para oportunidade legítima. Depois autorizou commit,
push e deploy das correções revisadas da Agenda nas duas aplicações existentes.

Confirmado nesta etapa pelo MCP Hostinger, não presumido pela branch local:
ambas usam `eduardocampusti/clinica-patricia`, branch `codex/resgate-local-2026-09-26`,
auto-deployment habilitado, Vite/Node 22/npm/build/dist. Brotas conta `u377474033`,
Ipupiara `u395888544`; configurações e variáveis preservadas. Versão anterior em ambas:
`a9abeea117cfca6b41f17f67078c319c393fdc1c`, builds completed
Brotas `01a0f73b-f890-710c-9898-cc161298f51e` e
Ipupiara `01a0f73b-f8f8-70e0-98b3-226eb666b28f`.

Revisão do diff: somente Agenda, sua nota de evolução, harness e testes correspondentes,
este relatório serão incluídos no commit específico. Demais mudanças locais de memória,
Equipe, Pacientes e histórico de outras tarefas permanecerão fora do commit. A branch
remota está em a9abeea e a local já contém o commit documental ced16fd: o push normal
leva também esse ancestral existente de memória, sem alterações funcionais adicionais.
Não houve reset, force push, alteração de integração/variáveis, banco, SMTP ou DNS.

Verificações atuais: build e lint aprovados, avisos preexistentes de ThemeProvider/chunks;
18/18 testes dirigidos de `recepcao-fluxo.spec.ts` (desktop/tablet/celular) aprovados.
São respostas interceptadas; não comprovam gravação real. Resultados anteriores pertinentes
mantidos, pois o código da Agenda não mudou desde sua aprovação. TypeSafe avaliada pela
descrição, não pertinente; sem chamada de IA, credenciais ou dados pessoais.

Recuperação: versão anterior identificada pelos builds acima; selecionar a implantação
anterior no histórico do mesmo site se o painel oferecer restauração. Para retorno
versionado, reverter somente o novo commit da Agenda em commit normal, revisar e fazer
push/redeploy na mesma branch, sem force push/reset nem reversão de banco. Não executar
reversão preventiva. Configuração de produção permanece igual.

Roteiro após publicação: entrar como Recepção na clínica correspondente e abrir
`/sistema/brotas/agenda` ou `/sistema/ipupiara/agenda`. Somente quando uma chegada realmente
ocorrer, conferir o agendamento e selecionar Aguardando uma vez; esperar alerta verde
“Chegada registrada” e situação “Aguardando”; pressionar F5 e conferir persistência.
Se houver erro ou resultado ambíguo, não repetir a gravação. Não criar fixture nem
reverter chegada legítima. Uma clínica/perfil não comprova outra.

Publicação ainda em acompanhamento; push não será registrado como deploy concluído.
