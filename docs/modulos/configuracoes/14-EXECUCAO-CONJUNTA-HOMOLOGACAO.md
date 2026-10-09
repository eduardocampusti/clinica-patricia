# Configurações14 — execução conjunta autorizada e conferência conectada

Estado posterior23:10 -03: a leitura manual de Auth foi recebida,230000 aplicada
uma vez,230100 interrompida por permissão42501 em GraphQL interno, rollback confirmado.
Os resultados abaixo são a fotografia histórica22:15, não o estado final atual.
[Aplicação, recuperação e fixtures não criadas](16-APLICACAO-E-HOMOLOGACAO-CONJUNTA.md).

08/10/2026, 22:15 -03:00, America/Bahia. Projeto exclusivo `xftnkusbyqzyvzrovroj`.
Branch `codex/equipe-fase2-2026-10-07`, HEAD
`ad49386105b3ea19b10b11a4e40c31983ae38d69`; trabalho não commitado.

## Autorização vigente e resultado efetivo

O titular autorizou executar a sequência de [Configurações13](13-SEQUENCIA-CONJUNTA-E-ISOLAMENTO.md),
complementando a autorização anterior: backend completo de acesso direto, proteções,
Configurações, isolamento, adendo, serviços consumidores, ajuste do hook previamente
conferido, dois contextos e oito contas fictícias exatos, testes e encerramento.
Esta autorização substitui a pendência de autorização adicional registrada nos
relatórios anteriores. Permanecem excluídos habilitação geral, frontend remoto,
commit/push, outros projetos e funcionalidades adicionais. Não solicitar novamente
essa autorização na retomada.

**A etapa0 foi executada parcialmente por leitura conectada. Nenhuma escrita remota
foi efetuada.** O catálogo passou na conferência de compatibilidade e os serviços
anteriores foram preservados. A configuração privada vigente de Auth/hooks não pôde
ser obtida pelo canal disponível. Configurações13 exige essa leitura antes de
qualquer escrita: não substituir um hook desconhecido nem aplicar a sequência sem
preservar a definição anterior. É impedimento efetivo da ferramenta, não ausência
de autorização nem reprovação dos testes funcionais.

## Evidências novas, sem repetir baterias aprovadas

CLI oficial Supabase2.110.0, legitimamente autenticada, verificou ref vinculado e
URL do projeto permitido. SQL em transações READ ONLY, com catálogos e somente os
dois IDs/slugs fictícios reservados; nenhuma consulta a pacientes, prontuários ou
valores financeiros reais.

| Conferência conectada | Resultado observado |
| --- | --- |
| PostgreSQL | 17.6 |
| Catálogo de51 tabelas | MD5 `dc6f0d326c589446b7e94e0935ab6c77`, compatível com inventário aprovado |
| Catálogo de69 funções | MD5 `4f83ca78e5f8499a576c3859d4b11b8a`, compatível com inventário aprovado |
| `acesso_direto` / `acesso_direto_exigir_sessao()` | Ausentes no catálogo, sem reaplicação |
| Seis tabelas institucionais da sequência | Ausentes no catálogo |
| Dois IDs/slugs dos contextos aprovados | Nenhum registro encontrado |
| Manifestos locais direto/Configurações | 54/59 arquivos; zero divergências de SHA256 |
| API pública PostgREST | Perfil inexistente retorna406/PGRST106, hint informa somente `public, graphql_public`; nenhuma linha consultada |
| Auth settings público | 200; signup desabilitado, autoconfirmações de e-mail/telefone false |

O erro de perfil comprova os schemas efetivamente servidos nessa consulta; **não é
GET Management config/postgrest**. O endpoint público de Auth não informa o hook,
URI, TTL e demais parâmetros privados necessários à leitura/recuperação prevista.
Não inferir ausência do hook dessa resposta nem de NULL no catálogo.

Fontes de produção e flags gerais permanecem false. PDF já aprovado externamente
pelo titular; nenhuma rodada estética, build ou bateria local previamente aprovada
reexecutada nesta tentativa. Inventário inicial de914 arquivos conservado para
comparação final; contribuições preexistentes preservadas.

Comparação final: sete registros documentais preexistentes alterados e este
relatório novo; nenhum arquivo inicial ausente, nenhuma fonte de implementação
alterada. Manifestos54/59 continuam sem divergência. Sintaxe dos três verificadores
locais utilizados e diff documental com reconhecimento de finais CRLF passaram;
avisos de conversão futura LF/CRLF do Git não foram tratados como defeito funcional.

## Recuperação preservada e parcela ainda ausente

Artefatos sanitizados em `scratch/configuracoes-aplicacao/`, ignorado pelo Git;
não são backup de dados clínicos nem substituem a configuração de Auth:

- `preflight.json`: projeto, fingerprints, objetos, versões e hashes dos manifestos.
- `recuperacao-sql.json`: definições/owner/ACL de69 funções; owner/RLS/ACL de51
  tabelas; políticas, default privileges, triggers e constraints de clinicas.
- `servicos-preservados.json` e `servicos-anteriores/`: fontes anteriores baixadas
  pela CLI oficial, cada serviço em diretório próprio, sem sobrescrever fontes locais.
- `api-publica.json`: metadados públicos acima, `auth_hook_confirmado=false`.
- `fontes-antes.json`: hashes da árvore inicial; sem conteúdo de arquivos/credenciais.

| Serviço preservado | Versão ativa observada | JWT do gateway |
| --- | --- | --- |
| equipe-acessos | 8 | true |
| equipe-recursos | 3 | false |
| equipe-fichas | 3 | false |
| meu-perfil | 2 | true |

Todas as quatro cópias oficiais foram obtidas com sucesso; nenhuma publicação.
**Falta preservar Auth/hooks vigente. Recuperação prévia completa ainda não está
pronta.** Como não houve escrita, não foi necessário executar rollback.

## Impedimento exato e canal necessário

A única tentativa de inicialização da ferramenta de navegador falhou antes da
leitura, com `node_repl kernel exited unexpectedly` e
`windows sandbox failed: helper_unknown_error: setup refresh had errors`.
Não foram feitas tentativas repetidas, extração de cookies/tokens/PAT ou mudanças
nas proteções. Não houve rejeição do auto-review.

A CLI instalada oferece `config push`, mas não leitura de Auth/config nem dry-run
compatível. Não executar push cego: poderia modificar ajustes não autorizados.
Ainda é necessário um canal oficial legitimamente autenticado para
`GET /v1/projects/xftnkusbyqzyvzrovroj/config/auth`, ou painel Authentication → Hooks
e configurações pertinentes, salvando somente campos necessários à recuperação,
sem segredos de SMTP/providers. Obter também a configuração de Data API prevista
no plano, distinguindo-a da observação pública já obtida.

Consultada a skill plugin-management: o conector Supabase oficial foi localizado,
mas não estava instalado/conectado e seus instrumentos não estavam disponíveis.
Foi solicitado pela interface instalar/conectar a conta que possui este projeto,
ou recuperar o navegador autenticado. A sugestão de instalação não prova conexão
nem garante que seus instrumentos permitam a leitura específica: conferir as
capacidades e o projeto após conectar. Não enviar credenciais na conversa.

## Contas, contextos, provas e limites finais desta tentativa

| Item | Situação efetiva |
| --- | --- |
| Migrações/adendo aplicados | Nenhum |
| Serviços publicados | Nenhum; quatro versões anteriores preservadas |
| Auth/hook alterado | Nenhuma configuração alterada |
| H1–H6 de acesso direto | Zero das seis contas criadas nesta etapa |
| C-A/C-B de Configurações | Zero das duas contas criadas nesta etapa |
| Contextos A/B | Zero dos dois criados/ativados |
| Sessões/vínculos/whitelist novos | Nenhum criado; nada desta etapa a revogar/desativar |
| Contas reais/antigas técnicas | Nenhuma alterada ou reativada |
| Testes privados/públicos funcionais conectados | Não iniciados; não apresentá-los como aprovados |
| Frontend/habilitação geral | Continuam desligados/não publicados |

As evidências de simulação e SQL sintético de Configurações13/Equipe40 continuam
locais, sem substituir provas com sessões dos perfis, persistência, Storage,
histórico, conflito, publicação aplicada, troca obrigatória ou revogação de tokens.
O pacote ainda **não está liberado para habilitação/publicação do frontend**.

Conferência local dirigida do consumidor legado: `src/lib/api.ts` usa
`VITE_API_URL`; o `.env` local aponta somente `http://localhost:3333`, sem listener
nessa porta nesta leitura. `server/src/index.ts` registra apenas ping/despesas;
`server/README.md` descreve Financeiro operacional por Supabase RPC. Isso não
comprova o runtime publicado: preservar o gate de identificação de eventual API
ativa antes de testar pendentes, sem publicar em alvo presumido nem consultar
finanças reais. Nenhum servidor foi iniciado/alterado/publicado nesta etapa.

## Skills e próxima operação

Skill typesafe-ai lida e pertinência avaliada: autorizações, identidade visual e
troca de senha exigem regras determinísticas verificáveis; nenhuma IA adicionada
ao produto. Jev recebeu apenas triagem sintética genérica, sem projeto, contas,
arquivos ou credenciais: confiança baixa, decisão operacional assumida pelo Codex.
Medição:1007 tokens (886 entrada/121 saída),3751,4102ms,US$0,000037212; sem alegação
de economia de tokens. Uma chamada, sem repetição automática.

Retomar **a autorização já concedida** assim que houver canal autenticado que
permita a leitura faltante. Preservar Auth e reconciliar hook anterior caso exista;
reconferir somente o estado mutável antes de cada aplicação, executar a ordem
seletiva aprovada230000 →230100 →213000 →230050 →adendo6/2 e seus gates, publicar
apenas serviços autorizados, homologar e encerrar as oito contas/dois contextos.
Uma conexão autenticada disponível não dispensa confirmar o projeto e a capacidade
da ferramenta. Não aplicar dependências/contas enquanto o pré-requisito continuar
ausente; não enfraquecer permissões para avançar.

## Retomada após conexão informada — 08/10/2026,22:21 -03

O titular informou instalação/conexão concluídas e pediu confirmar capacidade e
projeto antes de alterar. É continuação da mesma execução; triagem Jev anterior
reutilizada, sem nova chamada ou envio de dados. Nenhum teste/inventário completo
repetido.

Observado nesta sessão: nenhum instrumento Supabase disponível em ALL_TOOLS e
nenhum descobridor de ferramentas que permita carregá-lo. A consulta oficial ao
catálogo ainda retorna `installed=false` para o plugin Supabase sugerido. Esses
resultados não invalidam o relato do usuário; existe divergência entre instalação
informada e capacidades efetivamente entregues a esta conversa. A descrição do
catálogo sobre configurar autenticação não comprova uma operação GET Auth/hooks.

A CLI oficial `codex mcp list --json` foi consultada em memória, exibindo apenas
nome, enabled, tipo, host, project_ref e auth_status; sem env/headers/credenciais.
O único MCP Supabase nessa configuração local é `supabase-geovanna`, enabled,
OAuth, host mcp.supabase.com, vinculado a **outro projeto** (`osziekapsoeqhfwcnyjj`).
Não foi consultado remotamente, remapeado, desautorizado ou usado para a execução.
Não substituir essa conexão para resolver o impedimento da Clínica Patrícia.

Projeto permitido reconfirmado por **leitura na CLI oficial Supabase**: ref vinculado
`xftnkusbyqzyvzrovroj`, URL local validada desse mesmo projeto, banco postgres17.6
respondeu a current_database/server_version em READ ONLY, sem dados de domínio.
Isso não confirma que o novo conector esteja autenticado para esse projeto.

Capacidade ainda indisponível: instrumento oficial autenticado nesta conversa que
confirme o alvo e leia `GET /v1/projects/xftnkusbyqzyvzrovroj/config/auth` (hook ativo,
URI e parâmetros pertinentes), permitindo preservar a configuração vigente.
Leitura config/postgrest também deve ser conferida segundo plano0. **Não foi
possível inspecionar o catálogo de operações do conector novo**; não concluir que
o fornecedor não suporta Auth/hooks, nem que a instalação resolveu esse requisito.

Evidências sanitizadas: `scratch/configuracoes-aplicacao/conector-retomada.json` e
`confirmacao-alvo-retomada.json`. Nenhuma escrita, conta/contexto/sessão/vínculo
novo, publicação, alteração Auth ou credencial solicitada/extraída. Autorização
anterior permanece válida; frontend não liberado. Próximo: disponibilizar nesta
conversa a conexão do projeto correto, preservando Site Geovana, e conferir as
operações efetivamente oferecidas; somente então retomar a sequência autorizada.


## Complemento de leitura desta sessão — 08/10/2026,22:22 -03

CLI oficial autenticada confirmou somente o projeto xftnkusbyqzyvzrovroj, região sa-east-1, status ACTIVE_HEALTHY e URL/ref compatíveis. A tentativa de cua.getState() encerrou antes de obter estado do painel: node_repl kernel exited unexpectedly; kernel24036/code1; windows sandbox failed: helper_unknown_error: setup refresh had errors. É falha local da ferramenta, sem resposta HTTP de Auth e sem rejeição do auto-review. CLI2.110.0 oferece somente config push, sem comando de leitura. Nenhuma triagem Jev ou avaliação TypeSafe foi repetida nesta sessão.

Operações impedidas: GET oficial de /config/auth e /config/postgrest na Management API deste projeto, ou leitura equivalente no painel autenticado. As evidências públicas e de catálogo registradas pela sessão Configurações acima são preservadas e não foram reexecutadas aqui. A observação pública dos schemas não substitui a configuração oficial exigida para recuperação. Compatibilidade com Auth/hooks permanece desconhecida. Autorização conjunta vigente; condição anterior à aplicação ainda não satisfeita. Nenhuma migração, alteração de Auth, publicação de serviço, conta ou contexto nesta tentativa; nada novo a encerrar. Sem frontend/commit/push/deploy. Próxima operação: restabelecer o canal oficial autenticado para obter essas leituras, preservar os parâmetros necessários sem segredos e prosseguir na sequência autorizada se compatíveis.


## Canal inspecionado e conferência manual fornecida — 08/10/2026,22:32 -03

Nova consulta oficial do catálogo retorna Supabase installed=false. Nenhuma ferramenta Supabase aparece nas capacidades entregues à sessão. A CLI Codex confirma somente supabase-geovanna habilitado/OAuth configurado para outro projeto; não usado remotamente nem remapeado. Não foi repetida a tentativa do navegador, não extraídas credenciais nem repetidas avaliações TypeSafe/Jev. Autenticação de um conector do alvo não comprovada. Documentação MCP vigente não lista GET Auth/hooks ou GET PostgREST config específico; SQL não comprova hook selecionado em Auth.

Consulta à referência oficial identificou GET Data API atual /v1/projects/{ref}/postgrest, em lugar da referência anterior /config/postgrest. Correção feita na etapa0 do plano13; registros datados anteriores preservados como histórico. Nenhuma requisição GET privada executada. O [roteiro manual](15-LEITURA-MANUAL-AUTH-DATA-API.md) especifica telas, campos, formulário de retorno e critérios de continuidade. Informação do titular será evidência manual informada, sem rotular como leitura automática. Aguarda essa informação antes de aplicar; autorização vigente e sequência/fixtures preservadas. Zero novas operações remotas, contas ou contextos; nada desta tentativa a encerrar.


## Conferência manual informada recebida — 08/10/2026,23:01 -03

O titular realizou leitura do painel entre22h35 e22h53 de08/10/2026 no projeto xftnkusbyqzyvzrovroj. Valores completos registrados em [Configurações15](15-LEITURA-MANUAL-AUTH-DATA-API.md), como leitura manual fornecida pelo usuário, não GET Management API. Nenhum hook configurado; Data API ligada, só public/graphql_public expostos. Demais valores de e-mail/senha/sessões/OTP/search_path/limite de linhas/pool preservados literalmente. Não detectada incompatibilidade nesses itens, sem alteração global.

Ainda NÃO CONFERIDOS: intervalo de reutilização de refresh tokens; Password changed/demais notificações; métodos MFA; CAPTCHA/provedor. Solicitação adicional limitada a Password changed e CAPTCHA/provedor, porque o roteiro inclui recuperação com UserUpdate e a Edge verifica senha pessoal por signInWithPassword sem captchaToken. Não desligar proteção ou notificação global para viabilizar teste. Reuse interval e métodos MFA não são solicitação adicional nesta etapa; conservar como não conferidos, não alterar nem alegar regressão MFA validada. Nenhuma escrita remota nesta sessão, teste funcional conectado, conta/contexto novo ou nova triagem IA. Autorização vigente. Próximo: obter dois estados e retomar a sequência seletiva compatível, reconferindo somente estado mutável antes de cada aplicação.
