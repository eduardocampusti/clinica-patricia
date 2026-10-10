# Correção GraphQL e aplicação bloqueada — 09/10/2026

## Aplicação real concluída; homologação parcial e fixtures encerradas — 09/10/2026, 07:16 -03 (America/Bahia)

Estado atual: SQL, sete serviços e hook aplicados; homologação parcial. Três contas e dois contextos encerrados, criação geral/frontend desligados. GraphQL funcional, fluxo direto e homologação privada permanecem pendentes. As fotografias anteriores abaixo são históricas, não autorização pendente do pre-request.
[Execução, falhas corrigidas, provas e operações pendentes](18-APLICACAO-GUARDA-E-SEQUENCIA-AUTORIZADA.md).


06:11 -03, America/Bahia. Alvo exclusivo `xftnkusbyqzyvzrovroj`.
Branch `codex/equipe-fase2-2026-10-07`, HEAD
`ad49386105b3ea19b10b11a4e40c31983ae38d69`; alterações locais não commitadas.
Continuação autorizada do [relatório16](16-APLICACAO-E-HOMOLOGACAO-CONJUNTA.md).
**Correção local testada; tentativa de aplicação recusada antes de executar SQL.**

## Causa comprovada novamente por leitura conectada

Conector `supabase-clinica-patricia` disponível nesta sessão; `get_project_url`
retornou `https://xftnkusbyqzyvzrovroj.supabase.co`, igual ao `.env` conferido
localmente sem imprimir suas credenciais. Nenhum instrumento de Geovana usado.
SQL oficial: operador `postgres`; proprietário do schema/função GraphQL
`supabase_admin`; CREATE no schema=false, função SECURITY INVOKER.
Primeira migração230000 instalada; inventário, políticas e efeitos230100 ausentes.
Fingerprints vivos idênticos ao inventário: tabelas `dc6f0d326c589446b7e94e0935ab6c77`,
funções `4f83ca78e5f8499a576c3859d4b11b8a`.

A instrução original recusada foi `EXECUTE protegida`, no loop que gerava
`CREATE OR REPLACE FUNCTION graphql_public.graphql(text,text,jsonb,jsonb)`.
O conteúdo da função gerenciada permanece intacto: MD5
`dfa83944e7a73368d44e3ee4d2a1167c`. Não assumido supabase_admin, não modificados
catálogos internos, ownership, privilégios, extensão ou exposição de schemas.

## Solução concreta preparada

Arquivo corrigido: `supabase/migrations/20261008230100_equipe_acesso_direto_protecoes.sql`.
**230000 já aplicada não é reaplicada**; o executor novo também recusa a etapa1.
O inventário congelado continua com69 entradas/fingerprint original; uma entrada
gerenciada recebe proteção por requisição,68 funções próprias recebem guardas.
Nenhuma entrada é retirada da cobertura ou dos testes.

Alteração global exata, na mesma transação das proteções:

```sql
alter role authenticator set pgrst.db_pre_request='public.acesso_direto_pre_request';
notify pgrst,'reload config';
```

A nova função invoker/STABLE chama `acesso_direto_exigir_sessao` antes das
requisições. Somente três caminhos de metadados são excetuados:
`rpc/acesso_direto_estado`, `rpc/acesso_direto_disponivel` e
`rpc/acesso_direto_sessao_permitida`. Eles não concedem vínculo nem alteram a
obrigação de senha. Não há exceção para GraphQL, tabelas, uploads ou RPCs de dados.
O caminho é fornecido pelo PostgREST, não por campo escolhido no corpo do cliente.
ACL explícita da guarda: anon/authenticated/service_role; sem grant de dados.

| Caminho | Proteção preparada | Limite da evidência |
| --- | --- | --- |
| REST `/rest/v1/*` e GraphQL `/graphql/v1` | Pre-request +51 políticas restritivas +68 wrappers próprios | Runtime HTTP com sessões reais ainda pendente |
| REST GraphQL direto, profile `graphql_public`, RPC `graphql` | Mesmo PostgREST/pre-request; função gerenciada preservada | Testar rota alternativa junto da rota GraphQL |
| Tabelas GraphQL | RLS restritiva sem concessão adicional; regras de unidade/papel preservadas | Testes de consulta/mutação a dados ainda pendentes |
| Funções próprias SECURITY DEFINER | Guarda antes do corpo, conservando OID/assinatura/ACL/owner/search_path |69 entradas:68 wrappers +1 entrada gerenciada por requisição |
| Views/foreign/materializadas | Public/graphql_public não contêm views, materializadas ou foreign expostas nesta fotografia; recusas/ invoker permanecem no SQL | Mudança posterior exige novo inventário |
| Storage | RLS própria em objects/buckets +guards nas Edges | Pre-request não cobre Storage; uploads/URLs pendentes |
| Realtime | RLS das tabelas próprias | Não alegar cobertura de Broadcast/Presence por pre-request; nenhum canal novo criado |
| Edges e API financeira | Guardas específicas preparadas | Pre-request não cobre esses runtimes; publicação e alvo financeiro são gates separados |

Configurações recebe posteriormente o adendo de6 tabelas/2 wrappers. Contagem final
esperada:57 políticas restritivas e70 funções próprias protegidas, mais a entrada
GraphQL preservada/protegida por requisição (71 entradas lógicas no total).

Catálogo adicional: nenhum SECURITY DEFINER acessível em `extensions`; duas views
gerenciadas de `pg_stat_statements`, sem anotação GraphQL de chave primária, não
alteradas. O pre-request cobre a requisição GraphQL antes de qualquer resolução,
inclusive tentativas contra superfícies adicionais. Não foram lidos resultados
de consultas estatísticas, pacientes, prontuários ou dados financeiros.

O componente global roda para **todas as requisições REST/GraphQL**, inclusive
contas atuais. A regra permite conta sem operação; bloqueia operações pendentes,
expiradas, parcialmente substituídas ou sessões temporárias anteriores à liberação.
Não modifica a configuração Auth nem reduz senha/MFA/CAPTCHA/signup ou proteção
de refresh. Componentes de Storage/Edges/Auth permanecem independentes.

## Dependências, falha e recuperação

Antes da aplicação, ausência de pre-request anterior e de override específico de
banco conferida em pg_roles/pg_db_role_setting. O SQL aborta se encontrar outro
componente, exigindo composição revisada em vez de sobrescrevê-lo.
Novo registro privado `acesso_direto.requisicao_configuracao`, com RLS/ACL fechada,
conserva valor anterior/novo e hash GraphQL para recuperação/verificação.

Se o pre-request ficar indisponível, PostgREST pode recusar inclusive usuários
existentes. Recuperação preferida: reparar/reinstalar a função revisada conservando
todas as guardas de dados. Alternativa revisável em
`database/proposals/acesso-direto/02-RECUPERACAO-REQUISICOES.sql`: restaurar somente
a configuração anterior, após encerrar/revogar todas as contas do fluxo. Esse SQL
recusa conta ainda ativa, conta ainda não confirmada/sem perfil, sessão remanescente
ou contribuição posterior na configuração. Não remover RLS/wrappers/Edges, não
ativar operações manualmente. A recuperação **não foi executada**.

Ordem autorizada preservada:230100 corrigida →213000 →230050 →adendo6/2 → checks
de objetos/integridade → sete serviços →hook → somente8 contas/2 contextos previstos
→homologação e encerramento. Flags gerais permanecem false. Os valores Auth manuais
do relatório15 são reutilizados como fornecidos pelo titular, não como GET API.

## Verificações efetivamente realizadas

- PostgreSQL17.11 local, porta55448: nove grupos de contratos aprovados, acrescidos
  de negação por pre-request em REST/GraphQL, estado consultável, conta sem operação,
  sessão temporária antiga recusada e nova permitida. Entrada gerenciada sem wrapper
  conferida; catálogo divergente continua recusado e adendo6/2 idempotente passou.
- PostgreSQL local separado, porta55449: sequência conjunta e contratos de isolamento
  de Configurações passaram; seeds/vínculos/encerramento compilados na fixture e
  repetição de vínculos recusada. Nenhuma conta Auth real nesses testes.
- A primeira tentativa local encontrou a bancada55448 parada (connection refused).
  Iniciada a bancada existente apenas em127.0.0.1; não houve aumento de timeout.
- Adaptações sintéticas: somente fingerprints da fixture e configuração do papel
  restrita ao banco descartável para não interferir em outros testes do cluster.
- Preflight conectado CLI oficial:56/59 entradas dos manifestos sem divergências;
  catálogo51/69 compatível; recuperação preservada;919 fontes locais fotografadas.
  Serviços anteriores seguem8/3/3/2. MCP de leitura confirma o mesmo alvo/metadados.
- Logs consultados apenas por contagens de fontes, sem mensagens privadas;
  advisories de segurança lidos sem alteração automática de permissões.
- Bateria UI81/81 anterior e demais checks válidos reutilizados; nenhum novo frontend
  alterado nesta correção SQL. Não declarar nova homologação funcional ou UI conectada.

## Impedimento atual: revisão automática de aprovação

Operação tentada: `node scratch/acesso-direto-graphql/execucao/aplicar-etapa.mjs 2`,
que aplicaria somente o arquivo230100 corrigido com registro seletivo/atômico.
**Ferramenta recusou antes de iniciar o processo.** Motivo informado:

> A migração alterará persistentemente o db_pre_request global do papel authenticator
> e a proteção de todas as requisições REST/GraphQL, com possível impacto amplo;
> a autorização cobre a correção em geral, mas não especifica esse ajuste global
> nem seu blast radius.

Não tentada execução indireta, MCP de escrita ou outro canal para contornar a
recusa. Capacidade necessária neste ponto: aprovação explícita dessa configuração
global exata e seu alcance, para nova revisão da ferramenta. A autorização conjunta
anterior permanece vigente para as demais operações; não é preciso repeti-la.

Leitura final conectada06:10–06:11 -03:230100 continua sem inventário/políticas/
pre-request; GraphQL MD5 intacto; Configurações ausente; controles false.
Zero novas contas nos domínios reservados, zero contextos previstos, zero operações
e whitelist vazia. **Nenhum recurso fictício criado a encerrar.** Nada enviado por
e-mail, nenhuma conta técnica antiga reativada, nenhum dado real alterado.
Sem commit, push, habilitação geral ou publicação do frontend.

Extensão `pg_graphql` já estava ausente e continua ausente. Portanto consultas e
mutações HTTP recebem erro de extensão e não podem ser apresentadas como leitura/
persistência GraphQL aprovada. Ativar a extensão não faz parte desta correção
automática; eventual habilitação precisa de operação/impacto explicitamente
revisados. A cobertura permanece obrigatória e os testes ficam pendentes, não removidos.
O conector atual não oferece configuração Auth/hook via Management API; a função
do hook instalada não significa hook configurado. Essa etapa continuará exigindo
canal oficial com essa capacidade/painel, preservando o procedimento já revisado.

TypeSafe consultada novamente e índice oficial lido; correção determinística sem
integração/chamada IA. Jev anterior reaproveitado como continuação do mesmo pedido.
Evidências ignoradas: `scratch/acesso-direto-graphql/execucao/`, resultados locais
nas bancadas existentes; sem senhas/tokens/chaves/JWT nos artefatos.

## HTTP real e confirmação final — 09/10/2026,06:15 -03

Quatro diagnósticos HTTP reais anônimos: consulta/mutação/RPC limitadas ao ID
fictício previsto e ausente, mais REST /rpc/graphql com profile graphql_public.
Todas retornaram HTTP200 **com errors**, mensagem de extensão ausente, sem data.
Não são prova de segurança com sessão pendente nem aprovação GraphQL funcional.
Estado remoto final/serviços/flags/zero fixtures conferidos às06:15:13 -03 e salvos
em scratch/acesso-direto-graphql/execucao/estado-final.json, sem chaves/JWT.
Uma falha local de formato do resultado CLI (objeto functions, não array direto)
foi corrigida no coletor antes de salvar; nenhuma escrita remota associada.

Hashes atuais dos arquivos diretamente revistos:

- supabase/migrations/20261008230100_equipe_acesso_direto_protecoes.sql: 7afc74cf94cc18d77c714c57b37c8e362bd00c7dfa23bdc2cc5cba7852bdc3ed
- database/proposals/acesso-direto/01-preflight-permissoes.sql: 43942a64439a48ff86d293b03abfe978375c836c64cbdce194efa282ca0b90cb
- database/proposals/acesso-direto/02-RECUPERACAO-REQUISICOES.sql: 87962d576a889920f1e751b555896311afc3ece89d95852925445d860a759392
- database/proposals/acesso-direto/manifesto.json: 84e4ff3eedd4abbc032ea06617f79f2cee8fac4e062809e8525adbb15ab69fc7
- database/proposals/configuracoes/manifesto.json: 4490b4c3c272eda696263402dd6f5bc8835a1205737dfffc1b458e6939a90358

Referências primárias consultadas: [segurança GraphQL](https://supabase.com/docs/guides/graphql/security), [funções GraphQL](https://supabase.com/docs/guides/graphql/functions), [views GraphQL](https://supabase.com/docs/guides/graphql/views), [RLS/views](https://supabase.com/docs/guides/database/postgres/row-level-security), [pre-request e limites](https://supabase.com/docs/guides/api/securing-your-api), [extensão/interop PostgREST](https://supabase.com/docs/guides/database/extensions/pg_graphql) e [rota oficial GraphQL para RPC PostgREST](https://github.com/supabase/supabase/blob/master/docker/volumes/api/kong.yml). O mapeamento self-hosted é evidência de arquitetura oficial; sua execução no projeto hosted só poderá ser comprovada com sessões reais depois da aplicação.
