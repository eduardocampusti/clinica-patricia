# Equipe40 — revisão final do backend e pacote de aplicação

## Aplicação real concluída; homologação parcial e fixtures encerradas — 09/10/2026, 07:16 -03 (America/Bahia)

Estado atual: SQL, sete serviços e hook aplicados; homologação parcial. Três contas e dois contextos encerrados, criação geral/frontend desligados. GraphQL funcional, fluxo direto e homologação privada permanecem pendentes. As fotografias anteriores abaixo são históricas, não autorização pendente do pre-request.
[Execução, falhas corrigidas, provas e operações pendentes](../configuracoes/18-APLICACAO-GUARDA-E-SEQUENCIA-AUTORIZADA.md).


Atualização09/10/2026,06:15 -03: [correção GraphQL testada localmente e recusa pré-execução do ajuste global](../configuracoes/17-CORRECAO-GRAPHQL-E-GATE-DE-APLICACAO.md).230000 já instalada, não reaplicar.230100 agora preserva a função gerenciada e propõe pre-request global REST/GraphQL,68 wrappers próprios (70 após adendo), mantendo69/71 entradas lógicas e51/57 políticas. Não aplicada após recusa da ferramenta; aprovação específica desse parâmetro pendente, demais autorizações vigentes. HTTP200 GraphQL contém errors de extensão já ausente; nenhuma homologação funcional/fixture. Registros abaixo conservam a fotografia histórica anterior.


Complemento de encerramento — 08/10/2026, 21:11 -03:00: conferida a preparação
simultânea final de Configurações. A base213000 acrescentou proteção por trigger
contra UPDATE direto de campos institucionais e exige propriedade para
nome/cidade/CNPJ; contém16 funções e três triggers. Fonte relida, preservada
sem nova alteração de backend por esta revisão. O manifesto de54 arquivos foi
regenerado para refletir seu SHA-256 atual; havia uma divergência nesse arquivo,
resolvida por reconciliação da contribuição, não por aplicação ou alteração SQL.
Cobertura de autenticação permanece57 tabelas/71 RPCs; adendo6/2 inalterado.
[Plano único da sequência conjunta e operações de Configurações](../configuracoes/13-SEQUENCIA-CONJUNTA-E-ISOLAMENTO.md)
é a referência transversal; este relatório continua sendo a revisão detalhada
do acesso direto. Testes15 grupos da sequência real de SQL do módulo são evidência
local informada/registrada pela sessão de Configurações, sem repetição aqui.
Config Auth/schemas e homologação conectada permanecem pendentes; flags false.
Nenhuma operação remota, conta/reativação, commit, push ou deploy neste complemento.

08/10/2026, America/Bahia (-03:00). **Revisão local concluída; aplicação e homologação conectadas não executadas.**
Alvo único: `xftnkusbyqzyvzrovroj`. Branch `codex/equipe-fase2-2026-10-07`, HEAD `ad49386105b3ea19b10b11a4e40c31983ae38d69`; alterações não commitadas.
Este relatório complementa [Equipe39](39-ACESSO-DIRETO-SENHA-TEMPORARIA.md) e substitui seu resultado de regressão conjunta. Autorizações de Configurações continuam independentes.

## Resultado e limite de autorização

O pacote concreto está em [database/proposals/acesso-direto](../../../database/proposals/acesso-direto/README.md): manifesto SHA-256, inventário nominal de 51 tabelas/69 funções, duas migrações e adendo de cobertura de Configurações. Nada foi aplicado remotamente. Zero contas/vínculos reais ou fictícios remotos criados/reativados, zero alterações Auth, commit, push ou deploy.
Frontend `ACESSO_DIRETO_HABILITADO=false`; SQL inicia criação geral e homologação restrita desligadas. A habilitação normal fica fora deste pacote até aprovação da homologação conectada.

**Conferência remota ainda necessária antes da escrita:** configuração Auth/hook atual e lista de schemas expostos no serviço. A CLI oficial autenticada permitiu ler catálogo e serviços, mas não forneceu essa configuração; navegador indisponível e token oficial não presente no ambiente. Não extraí credenciais nem contornei controles. `NULL` em `pgrst.db_schemas` e ausência de configuração no papel authenticator não provam a configuração externa. As operações de leitura e a condição de interrupção estão definidas abaixo, sem presumir ausência de hook.

## Correções locais desta revisão

1. A troca agora atualiza Auth, captura fingerprint privado, faz **login com a senha pessoal no servidor**, registra a sessão verificada, revoga globalmente as sessões e confirma no SQL. O SQL exige fingerprint idêntico ao verificado e **nenhuma sessão Auth restante**; HTTP200 do logout isoladamente não encerra a pendência. Mudança concorrente ou falha parcial permanece bloqueada.
2. Trigger em `usuarios_clinicas` recusa concessão ativa para operação reservada, pendente ou substituindo, inclusive por serviços administrativos anteriores. A conclusão confirma estado e vínculos na mesma transação; erro desfaz ambos. Confere também existência de todos os vínculos/papéis esperados.
3. API financeira `server/src/plugins/auth.ts` exige a mesma guarda após Auth e antes de atribuir identidade à requisição. Falha/ausência/retorno diferente de booleano true não permite executar o serviço.
4. Escopos nulos/papel nulo são recusados antes da criação Auth. Administradora deve ser autorizada em **cada** clínica solicitada; vínculos cadastrais ativos e papéis explícitos continuam obrigatórios.
5. Reserva expirada mantém sua fase separada do estado de exibição; a ficha retoma reserva, em vez de tentar substituir conta ainda não confirmada. Retomada renova a validade da emissão e conserva pessoa/UUID Auth/operação.
6. Proteções não criam políticas permissivas de fallback. Tabela sem RLS aborta. Funções STABLE/VOLATILE conservam classificação; somente eventual IMMUTABLE sem índice exigiria STABLE. Guarda em política usa subconsulta para evitar custo de consulta por linha.
7. Catálogo de aplicação congelado: a segunda migração aborta integralmente se mudar o conjunto de tabelas ou a fonte das 69 funções. Configurações tem adendo separado; não se aplica tudo por `db push`/ordem cronológica.
8. Homologação limitada por ator, pessoa e e-mail fictício permite testar com criação geral false. Lista vazia/desligada por padrão; e-mail fora da lista é recusado antes de Auth.

## Revisão ponta a ponta e bloqueio no servidor

| Caminho | Regra e prova no código |
| --- | --- |
| Novo membro | Pessoa salva primeiro; ID/chave em memória conservados para retomar. `coordenarNovoMembro` não salva novamente pessoa após sucesso cadastral. Nenhum segredo aparece antes da confirmação. |
| Autorizar | `acesso_direto.autorizar` + helpers existentes verificam proprietária ativa, contexto, todas as clínicas/papéis e vínculo cadastral. Cargo/profissão não concedem login. |
| Antes do Auth | `acesso_direto_reservar` grava operação/UUID reservado; já bloqueia esse UUID. Criação via Admin Auth usa apenas essa identidade. |
| E-mail existente | Consulta Auth antes da reserva; erro CONTA_EXISTENTE. Retomada exige UUID reservado + e-mail + app_metadata da operação, nunca coincidência isolada. Não redefine senha/vincula automaticamente conta anterior. |
| Emissão | 24 caracteres criptograficamente aleatórios; 24h; compromisso SHA-256 com salt, sem senha recuperável. `email_confirm=true` só para nova conta administrativa, **sem prova de posse da caixa postal**. Nenhuma confirmação global desativada. |
| Falha/retomada | Janela de reserva de dois minutos, chave/payload/revisão e UUID únicos. Repetição concluída não devolve segredo. Auth criado com resposta perdida conserva UUID; compromisso perdido exige substituição explícita. |
| Pendente | `acesso_direto_sessao_permitida` retorna false em todos os estados anteriores a ativa, independentemente das flags de disponibilidade. Vínculos inicialmente inativos e trigger impede concessão antecipada. |
| Tabelas | Política RESTRICTIVE em todas as 51 tabelas alvo; soma-se à RLS existente, não concede clínica/papel. Dados públicos intencionais permanecem públicos. |
| Funções/GraphQL | 69 funções SECURITY DEFINER expostas ou GraphQL recebem guarda antes do corpo, mantendo OID, assinatura, ACL, owner, search_path e regras. Função incompatível/índice/tabela externa/view materializada exposta aborta. Fonte anterior/protegida fica privada para recuperação. |
| Storage | `storage.objects` e `storage.buckets` recebem a mesma política restritiva. Os quatro buckets encontrados são privados. Serviços que assinam/acessam arquivos precisam passar pela guarda antes de usar service_role. URLs públicas intencionais não são dados privados. |
| Serviços privilegiados | Guards em equipe-acessos, equipe-recursos, equipe-fichas, meu-perfil e Configurações privada, antes de acesso administrativo; nova equipe-acesso-direto separa ativação mínima de operações administrativas. API financeira recebe gate explícito. Nenhum service_role no navegador. |
| Cliente | Guarda anterior à montagem de App; tela obrigatória é proteção adicional. F5/erro de consulta/sessão obsoleta não montam módulos. Flag normal false não simula sucesso. |
| Troca verificada | `ativarDireto`, preparar/registrar_verificacao/concluir_troca vinculam fingerprint anterior, esperado e confirmado, sessão real do desafio e prazo. RPCs administrativas somente service_role; usuário não escreve schema privado nem chama concluir_troca. user_metadata não controla pendência. |
| Sessão antiga | Após revogação e corte `liberado_em`, dados exigem linha real `auth.sessions`, mesmo usuário e `created_at > liberado_em`. JWT antigo, refresh antigo ou eventual registro anterior sobrevivente não ganham acesso. Hook recusa emissão/renovação antiga/expirada quando configurado. |
| Contas existentes | Ausência de **operação**, não ausência de campo novo, significa fluxo normal. Não há backfill de pendência em contas antigas. Guardas preservam as permissões e políticas existentes. |

Senha temporária/pessoal e token do desafio só vivem na memória da chamada. Endpoint sem console/logging/corpo em erro, respostas no-store e erros sanitizados. Auditoria privada registra IDs, estado, revisão e horário; não registra senha/token/fingerprint. Fingerprints temporários ficam exclusivamente na operação privada e são limpos na conclusão. Navegador conserva a sessão Auth padrão já existente, não senhas; copiar credencial usa clipboard externo do Windows, cuja limpeza/histórico não podem ser garantidos pelo aplicativo. A inspeção do código não comprova a política interna de logs do provedor: conferir logs reais sem copiar corpos/segredos durante a homologação.

## Inventário conectado obtido por leitura

CLI oficial2.110.0, referência vinculada/URL e projeto conferidos; PostgreSQL17.6. Queries READ ONLY `acesso-direto_inventario.sql` e `acesso-direto_revisao-catalogo.sql`, sem dados de pessoas/pacientes, entre 20:11 e 20:40 -03.

- 51 tabelas alvo, todas com RLS; nomes exatos no inventário JSON. Nenhuma view pública/materializada/tabela externa alvo observada.
- 69 funções alvo, todas com corpo reconhecido/linguagem suportada e sem dependência de índice encontrada; 32 STABLE preservadas. Esse resultado é compatibilidade de catálogo, não execução das 69 funções protegidas.
- Buckets privados: contas-fotos, equipe-documentos, equipe-fotos, pacientes-fotos.
- Ausentes: schema/RPCs de acesso direto, Configurações institucionais e seus serviços. Homônimos financeiros de Configurações não confundidos com o recurso novo.
- Serviços existentes ACTIVE: equipe-acessos v8/JWT=true; equipe-recursos v3/JWT=false; equipe-fichas v3/JWT=false; meu-perfil v2/JWT=true. As duas funções com gateway false já verificam sessão no serviço; configuração foi preservada.

## Configurações/Auth a alterar: finalidade, alcance, falha e recuperação

| Alteração futura | Alcance/dependência | Indisponibilidade e recuperação segura |
| --- | --- | --- |
| SQL230000 | Schema privado, cinco tabelas ao final das duas propostas, 15 funções públicas de acesso direto e helpers/triggers privados; trigger adicional em usuarios_clinicas. Sem modificar esquema Auth. Novas operações; contas sem operação seguem normais. |
| SQL230100 | 51 políticas restritivas + guarda em 69 funções atuais; todas as contas passam pela checagem, só contas do fluxo pendentes/antigas são negadas. Aplicar após230000, antes de qualquer pessoa de teste. Falha de catálogo aborta tudo; conservar primeira proposta desligada e não publicar novos serviços antes de completar. |
| Quatro Edges existentes | Publicar corpos revisados SOMENTE após RPC instalada: equipe-acessos, recursos, fichas, meu-perfil. Entrada indisponível/erro vira recusa, inclusive para contas antigas se faltar RPC. Restaurar serviço anterior só depois de remover/quarentenar todas as contas de teste pendentes e comprovar cobertura equivalente; preferir corrigir RPC/serviço mantendo gates. |
| Nova equipe-acesso-direto | JWT gateway true, verifica getUser e sessão real; Admin API restrita ao servidor. Segredo de disponibilidade inicialmente false/ausente. Nenhuma chave nova no frontend. Falha de Auth/SQL/login/logout não retorna ativa, mesmo se senha já mudou. Retomar com senha pessoal pendente ou substituir explicitamente após lease. |
| API financeira | Build do `server/` após RPC; todos os endpoints privados usam requireAuth. Ausência/retorno inválido recusa403; exceção de transporte503. Corrigir dependência, sem retorno true de fallback; não publicar servidor sem identificar seu alvo legítimo. Nesta sessão foi apenas compilado localmente. |
| Custom Access Token Hook | Configuração futura `hook_custom_access_token_enabled=true`, URI `pg-functions://postgres/public/acesso_direto_token_hook` **somente se leitura confirmar ausência de hook anterior**. Executa na emissão/refresh de todas as contas; sem operação devolve evento intacto. Componente indisponível pode impedir login/renovação de todas as contas. Restaurar configuração anterior somente mantendo RLS/RPC/serviços/trigger e contas pendentes bloqueadas; não remover operações ou marcá-las ativa. Se houver hook anterior, conservar/compor comportamento e ACL; não substituir automaticamente. Composição depende da fonte que ainda precisa ser lida. |
| Homologação restrita | `controle.habilitado=false`; cadastrar exatamente os cinco pares ator/pessoa/email fictícios e ativar somente `homologacao_habilitada`; serviço novo disponível, frontend normal false. Ator diverso/e-mail fora da lista bloqueia antes do Auth. Retirar lista/desligar homologação só após encerrar as contas e sessões de teste. |
| Configurações adendo | Seis tabelas + duas RPCs autenticadas após suas duas migrações próprias. Só soma guardas, sem conceder permissões/globais, aplicar identidade real ou publicar Configurações. Mantém seu isolamento e homologação separados. Falha aborta transação; não homologar acesso direto até completar cobertura. |

Nenhuma alteração proposta para signup público, confirmação global de e-mail, reautenticação/força de senha, MFA, duração global de JWT, SMTP, providers, redirect URLs, chaves de assinatura ou roles existentes. Confirmação administrativa é individual. Não ativar recursos pagos.

## Sequência concreta de aplicação futura

Executar por canal oficial autenticado no alvo único, arquivos conferidos pelo manifesto; **não executar nesta entrega**.

1. Ler config Auth e Data API: GET oficial `/v1/projects/xftnkusbyqzyvzrovroj/config/auth` e `/config/postgrest`, ou painel Authentication → Hooks/Data API. Reter somente campos necessários, nunca secrets de SMTP/providers. Conferir hook atual, força/reautenticação, confirmação, signup, TTL e schemas. Schemas adicionais expostos ou hook anterior não revisado **interrompem antes de escrita**. Esta conferência já está especificada; não autoriza alterar outros valores.
2. Reconferir ref, inventário/fingerprints, source SHA dos serviços, flags false, ausência de DDL concorrente e registrar cópia recuperável de definições/ACL/políticas e config anterior. Não coletar senhas/linhas clínicas. Se catálogo mudou, não eliminar o bloqueio de fingerprint; reconciliar a diferença concreta.
3. Aplicar seletivamente `20261008230000_equipe_acesso_direto.sql` → `20261008230100_equipe_acesso_direto_protecoes.sql`. A ordem cronológica de todas as pendências é inadequada: Configurações anterior alteraria o catálogo congelado. Confirmar objetos por information_schema/pg_proc/triggers/policies e rodar `supabase/tools/verificar-integridade.sql` após cada proposta; registrar integridade no histórico de Pacientes12. Controles gerais e de teste continuam false.
4. Sob autorização própria de Configurações: `20261008213000_configuracoes_institucionais.sql` → `20261008230050_configuracoes_homologacao_isolada.sql` → `supabase/tools/acesso-direto-proteger-configuracoes.sql`. Não aplicar as duas primeiras com autorização só de acesso direto. Cobertura passa a57 tabelas/71 funções protegidas; 51+6 e69+2. Helpers internos novos de Configurações têm ACL service_role e não exigem exposição adicional. Storage institucional permanece privado sob política de objects existente. Se Configurações não for aplicada, não executar adendo ausente; manter o recurso direto desligado até resolver essa sequência conjunta.
5. Publicar seletivamente as quatro Edges revisadas e a nova equipe-acesso-direto desabilitada, preservando seus verify_jwt; publicar API financeira somente em alvo identificado/autorizado. Configurações privada/pública dependem da sua autorização própria e preservam flags próprias. Não publicar frontend nesta fase.
6. Configurar o hook revisado, após confirmar função/ACL e testar emissão de uma sessão de controle sem operação; registrar impacto global sobre emissão. Em falha, restauração restrita conforme tabela, conservando gates.
7. Executar roteiro abaixo com lista restrita. `ACESSO_DIRETO_HABILITADO=true` apenas libera execução da Edge; a criação geral no SQL e o frontend normal permanecem false. Bancada conectada local deve usar componentes reais e declarar explicitamente ausência de interceptação; a bancada sintética não é essa prova.
8. Encerrar fixtures, reconferir integridade, disponibilizar evidências sanitizadas, desligar disponibilidade/homologação e manter criação geral/frontend false. Nova autorização para habilitação geral/publicação só após aprovação desse resultado conectado.

## Roteiro mínimo conectado e quantidade de fixtures

Proposta para futura autorização: **seis contas novas**, **seis pessoas**, **sete vínculos cadastrais e sete vínculos de login**, três papéis e duas clínicas existentes (Brotas e Ipupiara), sem criar clínica. Nenhuma técnica encerrada reaproveitada. Usar titular/proprietária atual autorizado nas duas unidades apenas como criador, sem gravar seu perfil ou mudar suas permissões.

| Conta nova | Origem e escopo |
| --- | --- |
| H1 | Direto; Proprietária somente Brotas |
| H2 | Direto; Proprietária somente Ipupiara |
| H3 | Direto; Recepção somente Brotas |
| H4 | Direto; Médico somente Ipupiara |
| H5 | Direto; Médico Brotas e Recepção Ipupiara, escolhas independentes |
| H6 | Controle Auth normal por Admin create/generateLink sem envio; Proprietária Brotas, sem operação de acesso direto |

H1–H5: e-mails individuais no domínio reservado `acesso-direto.example.invalid`, cadastrados exatamente na lista privada após salvar as pessoas. H6: conta de controle com senha/links por Admin API sem envio, fora da lista de operações. **Zero e-mails na sequência conjunta atual**. Gerar/verificar links de recuperação/convite pode validar Auth e aceite sem entrega; não comprova transporte da Edge normal. Entrega/reenvio continuam cobertos pelos testes simulados, não homologados por e-mail. Opcional futuro separado: três envios (convite/reenvio/recuperação) somente a caixa de teste explicitamente autorizada.

Coordenação com a preparação simultânea de Configurações: suas duas contas/contextos de teste isolados A/B somam-se a H1–H6, totalizando **oito contas** no roteiro conjunto, sem reutilizar técnicas encerradas. Os seis membros/sete vínculos deste recorte são de acesso direto/controle; as duas contas, clínicas/contextos fictícios e vínculos adicionais de Configurações pertencem ao seu roteiro13, cuja autorização e isolamento continuam separados. Nenhuma clínica real é alterada para seus testes.
Operações principais: seis cadastros, cinco provisionamentos diretos, uma criação Auth normal do controle, links de convite/recuperação sem envio para o controle, um replay idempotente, uma tentativa com e-mail do controle existente, duas substituições explícitas, cinco ativações completas e uma tentativa parcial controlada sem revogação. Uma expiração antecipada será **fixture de tempo no banco real**, restrita à operação H3; não se altera TTL global nem se alega espera natural de24h. Uma imagem fictícia pequena em bucket equipe-fotos para testar Storage; nada em pacientes/financeiro/identidade institucional real.

1. H6 entra pelo fluxo normal/define senha; confirmar login antes/depois do hook, Meu perfil, F5 e recuperação por link sem envio. Aceite de convite via link conserva papel original; entrega/reenvio normal não são prova conectada nesta sequência. Antes de H5 provisionar, tentar e-mail de H6: recusa sem alterar senha, identidade ou vínculo; depois provisionar H5 com seu e-mail autorizado.
2. Cada H1–H5 entra com senha temporária e tenta tabela/RPC/GraphQL/Storage/Edges/API financeira, além de acesso direto por URL. Tolerar somente estado mínimo/ativação/saída. Abrir **duas sessões independentes** H1, preservar temporária antiga exclusivamente em memória para teste posterior; não gravar token/segredo no relatório.
3. Antes da troca: tentar alterar user_metadata/retirar flag/callar concluir_troca diretamente/ativar vínculo pelo fluxo antigo. Todos devem continuar bloqueados. Testar H1 administrar Ipupiara e H2 Brotas; H3/H4 conceder acesso; nenhum pode contornar escopo/papel.
4. H3: antecipar expiração da sua operação, comprovar recusa de emissão/refresh/dados; substituir uma vez, recusar senha/sessão temporária anterior e confirmar nova validade. H4: simular resposta de provisionamento perdida, replay com mesma chave, comprovar uma pessoa/conta/operação/vínculos, sem segredo reapresentado; substituir explicitamente para recuperar a credencial.
5. H4: executar etapas reais de atualização+login verificado, interromper **antes da revogação**; chamar concluir_troca por canal administrativo controlado deve recusar por sessões existentes e dados continuar bloqueados. Após lease, retomar pelo fluxo seguro com senha pessoal pendente/novo login; revogar globalmente e concluir. Sem debug endpoint/fallback no produto.
6. H1–H5 concluem senha pessoal: conferir fingerprint/prova/ausência de sessões/corte somente como estados/booleanos, sem valores. Entrar novamente com senha pessoal e chegar à dashboard; senha temporária anterior deve ser recusada. Sessão antiga H1 não deve ler dados, refresh nem alterar senha/e-mail via Auth após a revogação; testar token antes do vencimento. JWT revogado isolado não é prova, validar endpoints reais da versão Auth em uso.
7. Validar matriz clínica/papel: seis combinações presentes entre H1–H5, recusa da clínica ausente H1/H2/H3/H4, troca/F5 H5 conservam papéis distintos. H6 não vira pendente por não possuir operação. Meu perfil/convites/recuperação/login normal continuam funcionando. Configurações usa somente seu contexto fictício isolado, sem aplicar fonte/identidade de Brotas/Ipupiara; validação detalhada pertence ao roteiro13 desse módulo.
8. Encerrar as **seis** contas: desativar sete vínculos de login e sete vínculos cadastrais/pessoas exclusivamente desses IDs, cancelar convite pendente se houver, revogar sessões e banir Auth por Admin API (`ban_duration` adequado/confirmado). Conferir impossibilidade de login/dados e nenhum vínculo ativo restante. Conservar operações/auditoria/histórico, não excluir para retirar gate; lista restrita desligada/removida após quarentena confirmada. Imagem fictícia somente sob retirada autorizada e sem remover arquivos reais. Nenhuma conta real desativada, antiga técnica reativada ou dado clínico alterado.

## Verificações realizadas e regressão80/81

| Verificação | Resultado/limite |
| --- | --- |
| Regras/portas |25/25; falhas de Auth/verificação/logout/conclusão e API financeira. Simulação determinística, não Auth real. |
| UI dirigida desta revisão |8/8; reserva expirada, substituição, bloqueio/F5/troca pessoal em desktop/mobile, respostas interceptadas. |
| Regressão Equipe conjunta |81/81 e81/81; três arquivos juntos, desktop/tablet/mobile, worker1, mesmos timeouts, sem retry/skip. Artefato compilado por rodada. |
| SQL PostgreSQL17.11 local |Duas propostas compiladas; nove grupos de contratos passaram: flags/lista, escopo, reserva, RLS/RPC/GraphQL/Storage/ACL/trigger, prova/hash/revogação, sessão antiga, nova sessão, expiração/falha. Fixture sintética Auth/sessions e helper de autorização mínimo; não Supabase/GoTrue. |
| Catálogo congelado |Proposta exata recusa fixture divergente e não deixa objetos parciais; cópia local adapta somente dois fingerprints à fixture para executar a cobertura. Nenhum bypass/flag de teste na migração versionada. |
| Adendo Configurações |6 tabelas/2 funções sintéticas compiladas, repetição segura. Informado pela sessão de Configurações: sua sequência com fontes SQL reais passou em outro cluster55449; não atribuir essa prova à nossa fixture. |
| Tipos/frontend/backend/servidor, build0.2.0 e lint dirigido |Passaram; dois avisos FastRefresh da bancada e aviso de bundle acima500KB. Sem erro ou publicação. |
| Provas anteriores válidas |34 cenários iniciais +29 acesso/login/identidade/F5/recuperação/convite +21 Configurações reaproveitados; sem repetir bateria inteira. |
| Remoto |Somente inventário/compatibilidade/serviços; nenhuma sessão por papel, escrita, hook, Storage, persistência ou primeira dashboard real testada. Runtime Deno real continua pendente. |

A repetição Vite de desenvolvimento permaneceu80/81 em dois cenários diferentes; separar cache não corrigiu. Instrumentação registrou carregamento incompleto no terceiro cenário e recargas/reset de clínica nos anteriores; não se comprovou origem específica nem vazamento entre mapas/contextos dos testes. A execução compilada fixa código/dependências e elimina HMR/otimização durante a rodada; duas rodadas conjuntas passaram. **Não declarar a causa original definitivamente corrigida no servidor Vite**; aprovação é do conjunto no ambiente compilado reproduzível, não das repetições isoladas.

Comandos reproduzíveis: `node scripts/test-equipe-regressao.mjs`; `server/node_modules/.bin/tsx.cmd --test tests/acesso-direto/regras.test.ts`; tipos em `tests/acesso-direto/tsconfig.backend.json` e `server/tsconfig.json`; `npm run build`. SQL: iniciar somente cluster local descartável127.0.0.1:55448, `node scripts/test-acesso-direto-sql.mjs`, encerrar cluster. Runner nunca aceita alvo Supabase. Evidências em `scratch/acesso-direto-revisao/`, ignorado pelo Git; manifesto/inventário seguros versionáveis no pacote.

## Skills e documentação

[typeSafe-ai](C:/Users/Eduardo/.agents/skills/typesafe-ai/SKILL.md) consultada integralmente, índice vivo consultado; autenticação exige decisões determinísticas, sem integração IA/dependência nova. Jev fez uma única triagem inicial sintética: code_change0,90; confiança0,88; incerteza de complexidade tratada por Codex mediante leitura.986 tokens,1,234s,USD0,000036414; nenhuma chave/histórico/arquivo privado enviado. ReUI sem benefício concreto numa revisão de backend sem redesenho; componentes existentes preservados.

Documentação/checkpoints e nota de evolução atualizados; Configurações e contribuições simultâneas preservadas. Fontes oficiais: [sessões e JWT residual](https://supabase.com/docs/guides/auth/sessions), [hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook), [leitura Auth](https://supabase.com/docs/reference/api/v1-get-auth-service-config), [leitura Data API](https://supabase.com/docs/reference/api/v1-get-postgrest-service-config).
