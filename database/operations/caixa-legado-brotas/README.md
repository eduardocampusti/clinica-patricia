# Brotas — preparo do encerramento administrativo do caixa legado

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

## Atualização vigente — legado encerrado, 04/10/2026,18:38 -03:00

A/B expressamente autorizadas e aplicadas somente à sessão legada identificada de Brotas.
Registros/auditoria preservados, proteção instalada, três campos de encerramento alterados,
uma auditoria e um evento administrativo acrescentados. Contagem/conciliação continuam
não comprovadas; natureza teste e ausência de dinheiro/obrigações são declaração do usuário.
Recepção em produção mostrou Caixa fechado/Abrir caixa, inclusive após F5; nenhum caixa
novo aberto nem valor transportado. Outras sessões intactas. Sem commit/push/deploy.
Resultado vigente no pacote08/manifesto/09 e relatório14 seção18. Os registros datados
abaixo conservam as pendências históricas já superadas nesta execução.


## Atualização — A/B autorizadas, responsável bloqueado, 04/10/2026,15:12 -03:00

Usuário declarou testes e ausência de dinheiro/obrigações reais; Eduardo Campos,
desenvolvedor de software, autorizou A/B. Nenhuma aplicada:2 consultas não localizaram
conta nome Eduardo; candidato exige usuário ativo/vínculo Proprietária em Brotas.
Identificar a conta existente correspondente, sem promover/criar usuário, inventar
papel ou pedir novamente A/B. Sessão ainda aberta. Pacote08/manifesto/09/relatório14
seção17 e checkpoints atualizados; recuperação/testes anteriores preservados.

## Atualização — declaração do usuário, 04/10/2026,15:02 -03:00

Natureza de todos os lançamentos/operações declarada como testes do Codex/GPT pelo
usuário, sem conclusão independente da auditoria. Confirmação restante: dinheiro/
obrigações reais associados, responsável e A/B. Nenhuma execução autorizada.
Registro no pacote08/manifesto e relatório14 seção16; evidências técnicas preservadas.

## Atualização vigente — 04/10/2026,14:50 -03:00

Preparação técnica concluída no escopo das evidências existentes; decisões humanas e
A/B pendentes. Hostinger confirmou os dois sites Vite no SHA2a6e88d0; Supabase/main
mostrou somente equipe-acessos, sem writer financeiro identificado, e Data API/Vault
instalados. Não identificado serviço antigo ativo ou fila financeira; hipóteses genéricas
não são bloqueio técnico. Locks/trigger/concorrência já homologados preservados.
Pausa breve é precaução de disponibilidade; leitura, inventário e recuperação atualizados
na futura janela continuam condições da execução. writers=false guarda essa janela,
sem afirmar pausa ou autorização.0 testes/exportações novos; principal sem alteração.
Conclusão/matriz/janela vigentes no pacote08 e relatório14 seção15; histórico preservado.

## Atualização vigente — 04/10/2026,14:30 -03:00

Cópia real mínima exportada por SQL Editor oficial/Copy as CSV e protegida em scratch
privado DPAPI.4/4 casos finais de recuperação PostgreSQL aprovados; cluster parado,
senha descartada. Recorte suficiente para a intervenção, não backup integral/PITR.
Canais históricos e reais identificados; consultas12 e janela concreta no pacote08.
Deploys/filas/consumidores privilegiados externos ainda não comprovados/controlados.
Manter writers=false, A/B nulas e decisões humanas pendentes; principal sem escrita.
Histórico abaixo preserva a falta de cópia antes desta exportação, agora superada para
o recorte. [Pacote único](08-HOMOLOGACAO-E-APROVACAO.md).

Estado histórico às13:27: **REVISÃO TÉCNICA CONCLUÍDA / PRINCIPAL ENTÃO NÃO EXECUTÁVEL**.

## Pacote único para decisão

Proposta vigente consolidada no [quadro A/B em08](08-HOMOLOGACAO-E-APROVACAO.md#pacote-único-para-decisão-final--revisão-técnica-de-04102026-1327--0300).
Revisão da função/trigger concluída; nenhum SQL lógico alterado. Principal revalidado
por6 lotes READ ONLY: mesma sessão,2 entradas,14 grupos modernos vazios,7 auditorias
originais e catálogo21 tabelas/712 itens com hashes iguais. A proteção está ausente.
Não há diferença nova material. Papéis e alcance, recuperação e pós-checks em08.

4 testes dirigidos reais nesta revisão: H01/H05 e2 verificações de recuperação dos
objetos, todos aprovados. Reinstalação preservou sessão posterior/registros e bloqueio
service_role. Cluster exclusivo novo parado13:24:51, senha descartada. Os12 cenários
anteriores não foram repetidos indiscriminadamente. Limites Supabase/versão mantidos.

Bloqueio concreto: painel oficial Free sem backups do projeto; cópia recuperável
principal não apresentada/testada. Identificação/pausa de writers e janela também
pendentes. A/B nulas no manifesto, respostas humanas intactas. A cria2 objetos e
restringe EXECUTE só da função nova; B altera3 campos da sessão e acrescenta1 auditoria
+1 evento administrativo, sem saldo/contagem/abertura automática. Nenhuma ação real,
assinatura paga, permissão existente, commit/push/deploy. Histórico abaixo preservado.

## Resultado real sem Docker

PostgreSQL17.11 portátil preexistente localizado em scratch/tools; cluster exclusivo
novo em127.0.0.1:64752, sem credenciais de produção/serviço/instalação global.
**12 cenários distintos aprovados em PostgreSQL real**,25 execuções aprovadas com
regressões. Duas conexões comprovaram concorrência; interrupção, resposta incerta e
pg_dump/pg_restore sintéticos comprovaram recuperação no recorte.
Instância parada em12:50:39 -03:00; senha descartada, PIDfile ausente, porta sem listener.

Defeito encontrado: service_role com BYPASSRLS inseria entrada após fechamento.
Proteção mínima homologada só no laboratório: função privada+trigger do alvo exato
bloqueiam INSERT/UPDATE/DELETE após fechamento ou evento administrativo, inclusive
service_role/postgres; outra clínica permanece permitida. Proposta principal em
`10-protecao-escritor-legado.sql.disabled`, falsa/rollback;05 continua falsa/rollback,
agora exigindo a proteção. Nenhum objeto/ACL existente do principal alterado.

Scripts reproduzíveis em `homologacao/`; resultados mínimos em09 e
`homologacao-casos.json`, detalhes e limitações em [08](08-HOMOLOGACAO-E-APROVACAO.md).
Auth/Vault auxiliares, PostgreSQL17.11 vs17.6, catálogo recomposto: não equivalência
completa de Supabase. Hashes de binários/ZIP local registrados, sem atestar assinatura
do fornecedor inexistente. Não foi copiado dado real nem executada leitura do principal.

Execução principal bloqueada: adaptação nova exige revisão/aprovação; depois nova
leitura do catálogo/inventário, writers/janela e recuperação principal, decisões
humanas e aprovação específica de encerramento. A homologação não preenche essas
decisões.03/04 e inventário confirmado intactos; nenhum commit/push/deploy.

## Histórico anterior à instância portátil — preservado

Preparado em04/10/2026, ainda não aplicado no principal. O estado abaixo descreve
o preparo anterior à homologação real; não substitui o resultado atual acima.
Inventário técnico e catálogo confirmados por leitura em 04/10/2026, conforme a
exceção específica abaixo. Homologação, recuperação e decisões humanas pendentes.
Nenhuma autorização de escrita ou de encerramento.

## Preparo concluído no limite disponível — 04/10/2026, 12:04 -03:00

Candidato separado em `05-candidato.sql.disabled`, com trava falsa e rollback,
guardas de alvo/estado/inventário/obrigações, locks durante a transação, preservação
da auditoria histórica e repetição sem novos efeitos.03/04 anteriores intactos.
Leitores posteriores `06-pos-candidato.sql` e `07-reinventario-pos.sql` preparados,
nunca executados. Gerador `candidato.mjs`, testes `candidato.test.mjs`, fixture
descritiva e12 cenários planejados em `homologacao-casos.json`.

**30/30 testes Node offline aprovados** (14 anteriores +16 novos), lint dos4 mjs
com saída0. Não homologam PostgreSQL. **Zero testes em banco isolado**: Docker
sem daemon (`docker_engine` inexistente), configuração negada pelo sistema,
PostgreSQL/binários e PGlite não encontrados, nenhum conector de banco utilizável.
Nenhum servidor/projeto foi iniciado, resetado ou usado como alternativa.
Inventário conectado anterior reaproveitado; nenhuma nova consulta ao principal.

Procedimento, efeitos exatos, limitações dos locks, recuperação e quadro para
proprietária em [08-HOMOLOGACAO-E-APROVACAO.md](08-HOMOLOGACAO-E-APROVACAO.md).
Execução e aprovação final continuam bloqueadas por homologação PostgreSQL,
controle de writers antigos, backup/recuperação e decisões humanas. Manifesto
continua sem responsável, motivo, UUID de execução ou autorização. “Não comprovado”
não vira zero; custódia/obrigações sem avaliação e encaminhamento bloqueiam.
Não existe script habilitado para principal nem nova RPC/migration/permissão.
TypeSafe determinístico: sem chamadas de IA/chaves. Sem commit/push/deploy.

Gerar somente os novos arquivos bloqueados, sem tocar03/04:

```powershell
node database/operations/caixa-legado-brotas/candidato.mjs
```

Não executar `preparar.mjs` pelo CLI geral para sobrescrever os arquivos históricos.
Próximo passo é disponibilizar/comprovar PostgreSQL dedicado e executar H01–H12
com artefato sintético separado. Futuro principal exige nova leitura e aprovação
específica; não remover as travas de03/05.

O projeto principal é `xftnkusbyqzyvzrovroj`; usar exclusivamente o canal previsto em
`04-ISOLAMENTO-DE-SISTEMAS.md`. Nunca usar credenciais extraídas, claims simuladas,
outro projeto ou SQL de teste no principal, mesmo com intenção de rollback.

## Arquivos e ordem de revisão

| Arquivo | Finalidade | Situação |
| --- | --- | --- |
| `01-catalogo.sql` | Descobrir clínica/sessão/operador e inspecionar constraints, FKs, enum, índices, triggers, auditoria, RLS/grants e funções de transição | Consultado por blocos somente leitura; ordenação de alias corrigida após erro 42703, sem escrita |
| `manifesto-revisao.json` | Alvo fixo, snapshots, catálogo, decisões humanas e pré-condições | UUIDs/snapshots confirmados; aprovação e execução continuam nulas |
| `02-inventario.sql` | Contagens e fingerprints integrais do grafo financeiro, detalhes minimizados e auditoria | SELECT único revisado/exportável; 11 seções confirmadas por leitura |
| `02-auditoria-historica.sql` | Somente campos financeiros da auditoria, inclusive entrada excluída e fechamento/reabertura antigos | Complemento somente leitura consultado; 7 eventos, sem dados de pacientes |
| `inventario-confirmado.json` | Evidência minimizada, contagens/hashes, catálogo e cronologia | Fotografia datada do principal; não significa saldo físico ou aprovação |
| `03-encerramento.sql.disabled` | Alteração transacional proposta, pré/pós-verificações e repetição | Trava incondicional falsa antes do DML e rollback final; não executar |
| `04-pos-verificacoes.sql` | Verificar estado/evento e preservação dos originais após eventual execução futura | Somente leitura; alvo/evento ainda não confirmados |
| `preparar.mjs` | Gerar localmente 02/03/04 usando o manifesto, sem banco/rede/.env | Sempre mantém a trava de escrita falsa, mesmo se preencher o manifesto |
| `preparo.test.mjs` | Exercitar bloqueios do preparador com dados sintéticos em memória | 14 casos locais aprovados nesta etapa; não executa SQL nem comprova homologação do banco |

Comandos locais sem banco:

```powershell
node database/operations/caixa-legado-brotas/preparar.mjs
node --test database/operations/caixa-legado-brotas/preparo.test.mjs
```

Nesta etapa somente 02 foi regenerado; 03 e 04 permanecem congelados com seus
parâmetros anteriores, não executáveis. Não rodar o comando de geração geral como
passo de execução da transição. Um procedimento futuro precisará de outro arquivo
revisado/homologado/aprovado; os hashes anteriores de 03/04 foram preservados.

O gerador não modifica o manifesto, não confirma nenhuma flag e não produz uma versão
habilitada para execução. Não há migration, RPC nova ou script de deploy nestes arquivos.
Não remover a trava nem trocar rollback por commit nesta etapa. A revisão posterior
deverá produzir outro arquivo autorizado, após as condições abaixo; este rascunho não
é um atalho para testar escrita no banco principal.

## Recuperar o acesso necessário

### Exceção autorizada exclusivamente para este inventário — 04/10/2026

Eduardo autorizou expressamente nesta conversa o SQL Editor oficial na aba
autenticada do navegador interno do Codex, somente para as consultas de leitura
do inventário do legado de Brotas. Essa autorização substitui, apenas nesta tarefa,
a exigência histórica de Chrome externo/extensão Claude Code ou conector Supabase.
Projeto `xftnkusbyqzyvzrovroj` e branch Supabase `main` confirmados na interface antes
das consultas. Git local: `codex/resgate-local-2026-09-26`, HEAD
`2a6e88d09c0a8a51cd73649bf45530c2db6a6923`. Ambiente principal: somente leitura.
Sem extração de tokens/cookies/chaves, endpoints privados ou ampliação de permissões.
Não autoriza escrita, transição ou aprovação humana. `03-encerramento.sql.disabled`
continua desabilitado. A restrição anterior abaixo é preservada como histórico;
esta exceção não modifica a regra global nem vale para outras tarefas.

Correção de orientação, 04/10/2026, 10:40 -03:00: a extensão Claude Code não é
a ponte de controle deste Codex. Não presumir que sua instalação/login torna o Chrome
acessível aqui. A conexão oficial suportada pelo aplicativo para esse navegador usa
a extensão **ChatGPT**. Configuração documentada, ainda não verificada nesta instalação:

1. No aplicativo desktop, abrir **Settings > Computer Use** (Configurações > Uso do computador).
2. Selecionar **Chrome**, em **More browsers** (Mais navegadores), se necessário.
   Seguir os avisos do plugin e selecionar **Install** para instalar a extensão ChatGPT.
3. Voltar à configuração; confirmar **Manage** e ativar o Chrome no menu de menções.
4. No mesmo perfil do Chrome, abrir o
   [SQL Editor oficial](https://supabase.com/dashboard/project/xftnkusbyqzyvzrovroj/sql/new)
   e entrar pessoalmente na conta autorizada. Não enviar senha ou chave no chat.
5. Nesta conversa, mencionar **@Chrome** ou a aba do SQL Editor. Confirmar que o
   navegador/aba efetivamente aparecem para o Codex antes de retomar qualquer leitura.

Fonte: [documentação oficial OpenAI — Browser extension](https://learn.chatgpt.com/docs/chrome-extension).
Disponibilidade depende da versão/configuração do aplicativo; se Chrome/Manage/@Chrome
não aparecerem, o canal ainda não está disponível, mesmo com o Supabase aberto fora dele.

A regra vigente de `04-ISOLAMENTO-DE-SISTEMAS.md` continua exigindo Chrome/Supabase
com extensão Claude Code ativa. A ponte ChatGPT não dá ao Codex controle dessa extensão,
nem altera/dispensa a regra do projeto. Antes de SQL, conferir a compatibilidade do
canal conectado com essa regra; se não puder ser comprovada, manter o inventário
bloqueado até decisão específica do usuário sobre o canal. Não modificar a regra
nesta etapa, substituir pelo navegador interno ou extrair credenciais.

Confirmar URL/ref, branch, ambiente e permissões antes das consultas. Verificar apenas
`VITE_SUPABASE_URL`, sem imprimir outras variáveis. Quando o acesso estiver disponível,
retomar **somente leitura**: 01 primeiro; depois, 02 com alvo reconfirmado. O arquivo
03 permanece bloqueado e a execução da transição continua não autorizada.

Histórico do preparo às 10:40: nenhum conector Supabase/PostgreSQL disponível; Sites e Hostinger têm
outros bancos/escopos e não foram usados como substitutos. Inventário de superfícies
expôs somente o navegador interno, uma aba de Ipupiara e nenhum Chrome/app nativo.

## Inventário confirmado e próxima etapa — 04/10/2026

Clínica e sessão inequívocas no manifesto e em `inventario-confirmado.json`.
Uma sessão de Brotas, aberta em 03/08/2026 14:55:38 -03:00, chave moderna nula,
fundo original registrado de 15.050 centavos. Operador identificado por UUID;
conta/vínculo atuais ativos em Recepção, papel histórico não comprovado.
Duas entradas antigas atuais de 50.000 centavos cada, ambas dinheiro, em 04 e
05/08/2026. Vínculos de paciente/profissional válidos na clínica, sem exportar seus IDs.
14 objetos modernos vazios no grafo: recebimentos/parcelas/movimentos/estornos/
sangrias/fechamentos/revisões/repasses/ajustes/fiscal/tentativas. Suprimento estaria
em movimentos, igualmente vazio. Sem referência financeira adicional nas FKs lidas.
Abrangência confirmada: role SQL existente `postgres`, BYPASSRLS e SELECT nas
tabelas, transação read-only; sem mudança de role/RLS. Nenhum LIMIT nas contagens.

Auditoria: 7 eventos preservados. Fundo de R$150,50 consta do INSERT original.
Uma entrada Pix de R$85,90 foi inserida e depois excluída antes das duas atuais;
não somá-la às entradas existentes nem recriá-la. Sessão foi marcada `fechado` em
05/08/2026 08:19:24 -03:00 e voltou a `aberto` às 08:26:59, sem contagem/diferença.
Executor de DELETE/UPDATE não identificado por `usuario_id` (nulo), sem motivo
registrado. `fechado_por` histórico não comprova quem executou o SQL. Origem/natureza
e justificativa desses eventos permanecem humanas; não há prova de lançamentos fictícios.

Catálogo real permite, em princípio, o estado antigo `fechado` com conferência nula
e evento administrativo separado. Não há rotina de transição encontrada pelos
nomes pesquisados; não existe fluxo ativo comprovado. O procedimento pontual
continua recomendado, sujeito à revisão/homologação; não exige fabricar fechamento
moderno, contagem, estorno, retirada ou repasse. Nova abertura continua independente.

Antes de aprovação futura: esclarecer origem/natureza das duas entradas, Pix excluído
e fechamento/reabertura (ou registrar explicitamente desconhecido); custódia atual,
obrigações conhecidas, responsável e motivo administrativo. Homologar em PostgreSQL
isolado incluindo repetição/interrupção/concorrência e preservação dos 7 eventos.
Verificar recuperação e janela sem writers antigos. Grants amplos de entradas e
auditoria incluem TRUNCATE; não presumir proteção por RLS/trigger de UPDATE/DELETE.
Revisar esse controle e as consequências para preservação sem executar teste de
escrita ou alterar permissões nesta etapa. Não foi encontrada trigger de mutação
nos eventos financeiros; clientes têm somente SELECT ali. Não declarar controles
de imutabilidade mais amplos que os observados.

Antes de qualquer execução posterior, revalidar 01/02, histórico e hashes, fixar
novo arquivo/UUID de evento, responsável/motivo e autorização específica. Nenhuma
aprovação humana foi preenchida agora. Se houver divergência, relação moderna ou
estado inesperado, abortar e revisar. Encerramento administrativo não quita obrigação
nem comprova dinheiro físico; R$150,50 e R$1.000,00 não são fundo de próxima abertura.

## Completar e selar o inventário

1. Executar 01 somente no projeto/canal confirmado. Não escolher sessão apenas pelo
   valor R$150,50 ou pela quantidade de entradas. Confirmar UUID da clínica com
   `subdomain='brotas'` e UUID da sessão antiga, data bruta/fuso, estado e chave nula.
   O operador é `aberto_por`; conta/papel atuais não provam seu papel histórico.
2. Inspecionar os resultados completos do catálogo. Todas as FKs de entrada, colunas
   extras, writers antigos, triggers/functions e obrigações polimórficas precisam ser
   compreendidos. Se aparecer referência não coberta pelos 15 objetos do grafo, ampliar
   a leitura e o rascunho; não marcar catálogo revisado apenas por existir um hash.
3. Preencher somente os UUIDs confirmados e regenerar 02. O leitor deve possuir
   privilégios de leitura integral e abrangência sobre RLS. Role limitada é recusada,
   mesmo que enxergue parte dos dados. O preparador não muda a role/RLS para obter acesso.
4. Executar 02 por leitura e conferir a seção `contexto`: `valido=true` e
   `somente_leitura=on` são obrigatórios. Guardar as seções minimizadas `sessao_original`,
   `snapshot` e `catalogo_md5` no manifesto/revisão. Eles não incluem uma determinação
   de saldo. Resultado nulo de soma de parcelas não será convertido para zero.
   Contagens/fingerprints são agregações SQL sem paginação/limite. Confirmar ausência
   de truncamento na apresentação do SQL Editor antes de transcrever os detalhes.
5. `snapshot` contém contagem/hash por objeto, não total financeiro. Pai, parcelas e
   movimento são diferentes representações e nunca são somados. Estornos incluem
   recebimentos originais da sessão e recebimentos de outra sessão associados a
   estornos executados nela. Repasses/fiscal/ajustes/tentativas são alcançados pelos
   vínculos. Não deduplicar antigo/moderno por valor, data ou semelhança de descrição.
6. Completar a trilha de auditoria e vínculos. A consulta de auditoria entregue cobre
   sessão/entradas e referências explícitas principais; se houver dados modernos,
   expandir para todos os IDs do grafo e referências polimórficas antes de declarar
   inventário completo. RLS/acesso parcial, erro e vazio continuam estados diferentes.
7. Registrar as decisões humanas abaixo, verificar backup/recuperação e homologar em
   PostgreSQL comprovadamente isolado. Nenhuma flag está confirmada por esta entrega.
8. Guardar hashes SHA-256 dos arquivos finais revisados e do manifesto, ligados à
   aprovação futura. O MD5 interno detecta drift dos registros/catálogo; não é
   assinatura de autorização, prova de procedência ou mecanismo de conciliação.

## Escolha do modelo e limites do procedimento

Pelo modelo local, `sessoes_caixa` conserva o estado antigo `fechado`. Os campos
`valor_esperado`, `valor_contado` e `diferenca` são anuláveis. A restrição local da
sessão exige apenas abertura não negativa, além da chave moderna/composição de IDs.
`fechamentos_caixa`, ao contrário, exige totais, contagem, diferença, justificativa,
tentativa e aprovação/devolução: inserir um fechamento moderno fabricaria evidência.

Proposta mínima: `aberto -> fechado` **antigo**, mantendo chave nula, campos de
conferência desconhecidos nulos e evento `encerrar_caixa_legado_administrativamente`
com natureza administrativa, contagem histórica/conciliação não comprovadas, motivo,
responsável e evidências. Não usar `aprovado` e não criar `fechamentos_caixa`/revisão.
A autorização administrativa da proprietária não é aprovação de fechamento conciliado.
O histórico atual mostra “Fechado · legado”, sem chamar esse registro de aprovado;
a classificação administrativa estará explicitamente no evento e no relatório.

O rascunho aceita exclusivamente a sessão aberta sem chave moderna e sem dados
prévios de conferência/encerramento. Qualquer registro moderno do grafo, mesmo
aparentemente concluído, bloqueia o recorte simples. Não há resolução automática de
relações mistas nem descarte de lançamentos. Isso limita a solução até o inventário.

Se o catálogo real exigir campos financeiros não comprovados, impedir esse estado,
ou se o evento não for considerado representação suficiente de sua natureza,
**não preencher zeros nem reaproveitar aprovação**. Proposta mínima alternativa:
metadado específico e auditado de natureza do encerramento na sessão, preservando
valores desconhecidos, com procedimento autorizado correspondente. Essa alteração
de modelo/contrato e sua apresentação precisam ser especificadas/aprovadas separadamente;
nenhuma migration alternativa foi criada ou aplicada aqui.

## Registros que seriam alterados

- **Uma sessão**, pelo par UUID clínica/sessão fixado: somente `status`, `fechado_por`
  e `fechado_em`. Abertura, operador original, dinheiro inicial, chave e demais campos
  devem ficar exatamente iguais. Valores esperado/contado/diferença permanecem nulos.
- **Um evento financeiro novo**, com UUID fixo de execução, `valor=null`, snapshots,
  manifesto, natureza/limitações e motivo. `usuario_id`/`papel` representam o responsável
  administrativo aprovado; `executor_sql`, `login_sql` e `auth.uid()` real ficam separados
  no evento. Não criar claims para fazer o SQL Editor parecer o operador original.
- **Auditoria geral nova do trigger existente** para a atualização da sessão. O modelo
  local usa `fn_auditoria()` e trigger de imutabilidade da tabela `auditoria`; ambos
  precisam estar ativos e com corpos revisados. Eventos financeiros têm grants de
  escrita dos clientes revogados; conferir controles reais de preservação.

Nenhuma entrada/recebimento/parcela/movimento/estorno/sangria/suprimento/repasse/fiscal
seria editado. Nenhuma auditoria anterior seria apagada ou alterada. Pós-verificar os
IDs/contagens e hashes da auditoria anterior separadamente dos eventos novos esperados.

## Segurança, repetição e recuperação

Além da trava falsa, o rascunho exige inventário/catalogação completos, alvo exato,
responsável proprietária com conta/vínculo ativo, motivo/autorização registrados,
sessão antiga no estado esperado, catálogo e fingerprints idênticos ao revisado e
nenhuma relação moderna. Usa o mesmo advisory lock da abertura por clínica, trava
a sessão e suas entradas, e reconfere o estado. Janela sem escritores antigos continua
necessária; advisory lock não obriga writers que não o usam. Verificar as políticas
atuais de entradas antigas: a local exige sessão aberta, mas isso não foi comprovado no real.

Há atualização de exatamente uma sessão; um trigger que modificar qualquer campo
além dos três permitidos faz abortar. Evento financeiro e auditoria são feitos na
mesma transação. O grafo e o catálogo são comparados novamente antes de concluir.
Não há abertura de sessão, repasse ou destinação automática de dinheiro.

Repetição consulta primeiro o evento pelo UUID fixo e exige igualdade de alvo,
manifesto, motivo, responsável e snapshots/estado final: retorna sem outra escrita.
Evento ausente com estado inesperado, evento conflitante ou nova alteração da sessão
faz abortar. Resposta incerta exige 04 por leitura antes de qualquer repetição; a
preservação do grafo/auditoria precisa ser novamente conferida, não inferida do retorno.

Antes do commit futuro, qualquer falha provoca rollback da transação inteira. Depois
do commit, não reabrir/excluir o evento nem restaurar todo o banco automaticamente.
Se houver nova operação, preservá-la. Correção posterior exige procedimento separado
e auditado; uma nova sessão não integra a recuperação desta transição.

## Decisões humanas indispensáveis

Solicitar à proprietária somente:

1. Origem/natureza conhecida das entradas e quais documentos ou lembranças sustentam
   essa informação; registrar “não comprovado” onde faltar evidência histórica.
2. Existência de dinheiro atualmente sob responsabilidade da clínica: sim, não ou
   não comprovado, com data/contexto. Uma contagem de hoje é contagem de hoje; não
   preencher `valor_contado` do caixa antigo como se tivesse sido feita no passado.
3. Pendências conhecidas, quem continuará responsável e como acompanhá-las. Encerrar
   administrativamente não extingue uma obrigação nem declara quitação.
4. Responsável autorizado e motivo do encerramento administrativo, aceitando
   explicitamente as limitações registradas. Autorização para executar virá depois
   do preparo técnico/homologação; esta etapa não pede aprovação de escrita.

Contagem para **nova abertura** pertence à operação futura e independente. Não
transportar automaticamente R$150,50, R$1.000,00 ou qualquer saldo presumido.
