# Aplicação conjunta — 08/10/2026

## Aplicação real concluída; homologação parcial e fixtures encerradas — 09/10/2026, 07:16 -03 (America/Bahia)

Estado atual: SQL, sete serviços e hook aplicados; homologação parcial. Três contas e dois contextos encerrados, criação geral/frontend desligados. GraphQL funcional, fluxo direto e homologação privada permanecem pendentes. As fotografias anteriores abaixo são históricas, não autorização pendente do pre-request.
[Execução, falhas corrigidas, provas e operações pendentes](18-APLICACAO-GUARDA-E-SEQUENCIA-AUTORIZADA.md).


Atualização09/10/2026,06:15 -03: [correção GraphQL testada localmente e recusa pré-execução do ajuste global](17-CORRECAO-GRAPHQL-E-GATE-DE-APLICACAO.md).230000 já instalada, não reaplicar.230100 agora preserva a função gerenciada e propõe pre-request global REST/GraphQL,68 wrappers próprios (70 após adendo), mantendo69/71 entradas lógicas e51/57 políticas. Não aplicada após recusa da ferramenta; aprovação específica desse parâmetro pendente, demais autorizações vigentes. HTTP200 GraphQL contém errors de extensão já ausente; nenhuma homologação funcional/fixture. Registros abaixo conservam a fotografia histórica anterior.


Alvo exclusivo `xftnkusbyqzyvzrovroj`. Sequência autorizada do relatório13,
sem habilitação geral, commit, push ou publicação do frontend. Branch
`codex/equipe-fase2-2026-10-07`, HEAD `ad49386105b3ea19b10b11a4e40c31983ae38d69`;
trabalhos locais anteriores preservados, alterações não commitadas.

## Evidência manual e compatibilidade

Conferência do painel informada pelo usuário em08/10/2026,22:35–22:53 -03:
Hooks vazio; email ligado, signup desligado, confirmação ligada, outros provedores,
anonymous/manual linking desligados; secure password/current password desligados;
senha mínima6 sem requisito extra, JWT3600s, detecção de refresh comprometido ligada.
Data API somente public/graphql_public, private fechado, exposição automática
desligada; search path public/extensions. Complemento manual: aviso Password changed
e CAPTCHA desligados. Nenhum desses valores foi obtido por GET Management API;
usuário informou somente leitura, sem salvar. Nenhuma recomendação genérica aplicada.
Intervalo de reutilização de refresh não conferido; não é pré-requisito da DDL.

Proteção compatível: controle normal false, sem backfill de contas existentes,
verificação da sessão real na guarda única, hook restrito ao Auth. Senhas dos testes
serão fortes no fluxo existente, sem alterar política global. Schemas mantidos.

CLI oficial autenticada2.110.0, PostgreSQL17.6: preflight22:56 -03 confirmou
catálogo51/69 com fingerprints aprovados; novos objetos e fixtures ausentes,
quatro serviços anteriores v8/v3/v3/v2 inalterados. Manifestos54/59 sem divergência.
Definições/ACL/políticas/RLS e fontes publicadas anteriores preservadas em scratch
ignorado; estado Auth anterior ausente registrado manualmente para recuperação.
916 fontes locais fotografadas por SHA256. Nenhum dado clínico consultado.

## Aplicação efetiva e verificações

23:01–23:03 -03: migração `20261008230000_equipe_acesso_direto.sql` aplicada
uma vez por CLI `db query --linked --file`, transação com registro seletivo do
arquivo integral no ledger. SHA256 d878cc41b5a9795a14023920c2ed742ef98939f2aa52f046821e38e6a21f986a.
Prova complementar no catálogo: quatro tabelas privadas com RLS e sem SELECT
anon/authenticated, funções e triggers instalados; hook EXECUTE apenas Auth admin,
sem anon/authenticated/service_role. Controle normal/homologação/proteções false.
Nenhuma conta existente alterada, nenhuma fixture criada.

Após esta etapa, executadas as oito consultas das seções1–5 de
`supabase/tools/verificar-integridade.sql`: sem ausência/alerta estrutural.
A seção6 conta pacientes reais: excluída deliberadamente pelo limite expresso do
usuário. Script original preservado. Não declarar execução integral nem integridade
exaustiva. Resultados em `scratch/configuracoes-aplicacao/execucao-2255/` ignorado,
sem senhas/chaves/JWT. Catálogo é prova da instalação, ledger não é prova única.

## Falha concreta, rollback e situação final — 23:05–23:10 -03

230100 tentada uma vez para aplicação. A CLI retornou falha; consulta posterior
confirmou ausência de inventário, políticas e ledger230100. Diagnóstico subsequente:
validações originais em READ ONLY aprovadas, incluindo fingerprint e formato das69
funções. Transação diagnóstica do arquivo original, **sem COMMIT e com ROLLBACK
obrigatório**, identificou erro42501 ao executar CREATE OR REPLACE da função
`graphql_public.graphql(text,text,jsonb,jsonb)`: **permission denied for schema
graphql_public**. Não foi reaplicação confirmada, não registrou ledger nem conservou
DDL; etapa permanece não aplicada.

Metadados conectados: current_user/session_user=postgres; schema e função pertencem
a supabase_admin; postgres não tem CREATE no schema nem herda seu proprietário.
A função é SECURITY INVOKER (prosecdef=false), mas seu wrapper consta expressamente
do pacote aprovado69. Não a retirar da cobertura, alterar owner/ACL, expor private,
retirar schema exposto, habilitar extensão ou executar SET ROLE para contornar isso.

O preflight anterior verificava conteúdo/fingerprints, sem detectar essa falta de
autoridade de substituição. Complemento local somente leitura preparado em
`database/proposals/acesso-direto/01-preflight-permissoes.sql`, antes de qualquer
nova aplicação. Os arquivos SQL revisados e manifestos aprovados permanecem intactos.
Complemento executado pelo canal oficial somente leitura: retornou exclusivamente
graphql_public.graphql como função do inventário sem autoridade de substituição.

**Interrupção conforme condição expressa do titular: incompatibilidade concreta.**
Não avançar213000/230050/adendo, pois instalar antes230100 invalida o catálogo
congelado e deixaria cobertura incompleta. Nenhum dos sete serviços publicado;
versões anteriores v8/v3/v3/v2 e seus verify_jwt reconfirmados idênticos. Hook não
configurado; nenhuma política Auth, schema exposto ou configuração global alterada.
Primeira migração permanece instalada, controles todos false, whitelist vazia,
operações zero. Nenhuma remoção de proteção ou recuperação permissiva.

Encerramento conectado23:10 -03: zero contas Auth novas desta etapa nos domínios
reservados, zero dos dois contextos, zero operações/whitelist. **Nenhuma das oito
contas, seis pessoas ou nove vínculos foi criada; nenhuma sessão fictícia emitida**.
Consequentemente não há ban/revogação/desativação nova a executar; não tocar técnicas
anteriores. Comparação MD5 das69 funções preexistentes idêntica ao snapshot anterior:
4f83ca78e5f8499a576c3859d4b11b8a. Registro de migração contém só230000. Controles
e frontend false conferidos. Nenhum paciente/prontuário/valor financeiro selecionado.

**Provas funcionais conectadas não executadas:** persistência/publicação/imagens,
isolamento, senhas e sessões antigas aguardam proteção instalável, consumidores e
hook. Diagnósticos de DDL/catálogos não substituem sessões por papel; os testes
sintéticos anteriores não foram repetidos nem apresentados como homologação.
Pacote ainda não liberado para habilitação/publicação do frontend.

## Operação exata pendente e retomada

É necessária uma solução oficialmente suportada para proteger a entrada GraphQL
sem modificar objeto interno com um papel sem autoridade. O canal SQL Editor do
painel também executa como postgres segundo [documentação oficial dos papéis](https://supabase.com/docs/guides/database/postgres/roles);
supabase_admin é papel interno, portanto trocar CLI por MCP/SQL Editor ou coletar
novos campos de Auth não resolve esta restrição. [Limites de superusuário](https://supabase.com/docs/guides/database/postgres/roles-superuser).

Texto exato preparado para consulta manual ao suporte oficial (não enviado):

> Projeto xftnkusbyqzyvzrovroj. Uma transação de proteção de primeiro acesso
> precisa proteger também graphql_public.graphql(text,text,jsonb,jsonb).
> CREATE OR REPLACE falha42501 permission denied for schema graphql_public.
> Executor postgres; schema/função owner supabase_admin; postgres sem CREATE e
> sem herança do owner. Transação desfeita, nenhuma cobertura parcial/conta de
> teste ativa. Qual é o mecanismo oficialmente suportado para impor esta proteção
> na entrada GraphQL sem ampliar privilégios, mudar ownership de objeto interno
> ou interromper APIs existentes? Não pretendemos acesso ao papel supabase_admin.

Não solicitar token/senha, não enviar documentação privada automaticamente, não
abrir ticket pelo agente sem instrução do titular. Alteração do desenho aprovado
de cobertura ou exposição precisa de revisão concreta e autorização correspondente;
não é novo pedido das operações já aprovadas. Nenhuma nova leitura manual de Auth
pendente para resolver **este** bloqueio. Autorização conjunta continua vigente.

Retomar após resolver: não reaplicar230000; conferir autoridade/objetos vivos,
aplicar230100→213000→230050→adendo seletivamente, executar checks e publicar os sete
serviços. Instalar hook pelo canal oficial disponível, testar com sessões reais,
criar só as fixtures previstas e encerrar. O plano13 conserva gates da API financeira
em alvo legítimo e do ator autorizado nas unidades; não presumir sessões desses
atores nem ampliar H6 fora de Brotas.

Skill typesafe-ai consultada; fluxo determinístico, sem IA no produto.
Triagem Jev anterior preservada como continuação do mesmo pedido, sem nova chamada.


## Confirmação independente nesta sessão — 08/10/2026,23:15 -03

Os complementos manuais foram registrados com horários22h58 (Password changed desligado) e22h59 (CAPTCHA desligado, provedor não exibido), conforme titular; não houve nova consulta Auth Management. Reuse interval e métodos MFA continuam não conferidos. Nenhum novo campo manual é necessário para o impedimento de DDL atual.

A sessão de acesso direto preservou a execução da sessão Configurações: não reaplicou230000 nem230100 e não escreveu em backend concorrente. Duas consultas independentes READ ONLY por CLI oficial autenticada confirmaram alvo/ref/URL e metadados: postgres é operador e papel de sessão; owner da função/schema graphql_public é supabase_admin; CREATE no schema=false; função invoker e extensão pg_graphql ausente nessa fotografia. Não foi tentado SET ROLE, grant, alteração de ownership/exposição ou remoção da função da cobertura. A falta de autoridade continua concreta; a ausência de extensão não substitui a proteção do pacote aprovado.

Confirmação conectada às23:13:56 -03: quatro tabelas privadas presentes/quatro com RLS; controle habilitado=false, homologacao_habilitada=false, protecoes_instaladas=false; inventário230100 ausente, zero políticas/wrappers da proteção; objetos de Configurações ausentes; ledger da sequência somente230000. Zero operações/lista de homologação/novas contas fictícias/contextos previstos. Serviços anteriores ACTIVE: equipe-acessos8/JWTtrue, equipe-recursos3/JWTfalse, equipe-fichas3/JWTfalse, meu-perfil2/JWTtrue; serviços novos da sequência não publicados. Esses dados confirmam a instalação parcial e a ausência de efeitos da etapa recusada; não são homologação funcional.

Evidências sanitizadas próprias em scratch/acesso-direto/estado-conjunto-2309.json e confirmacao-conjunta-interrupcao.json, ignoradas pelo Git. Nenhuma conta/contexto novo a encerrar; contas técnicas encerradas não utilizadas, nenhuma conta real ou dado clínico consultado/alterado nesta confirmação. Sem escrita remota nesta sessão, frontend/commit/push/deploy. Preflight de autoridade e diagnóstico de suporte preparados pela sessão Configurações preservados, sem novas edições do SQL aprovado. Autorização conjunta vigente; retomar da proteção230100 após solução oficialmente suportada, sem reaplicar230000 ou pedir os campos manuais já recebidos.
