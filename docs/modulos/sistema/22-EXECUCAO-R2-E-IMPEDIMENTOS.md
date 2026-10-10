# Execução real R2 e impedimentos específicos —09/10/2026,15:10 -03

Continuação do relatório20/21, exclusivamente xftnkusbyqzyvzrovroj. Dashboard0.3.0/de15bd14 preservada e novamente identificada por HTTP nos dois domínios às18:08:29.999Z; aprovação autenticada anterior é MANUAL, fornecida pelo titular. Não houve novo commit/push/deploy do frontend ou habilitação geral.

## Operações efetivamente realizadas

- Sessão legítima da bancada comprovada automaticamente pelo SDK normal17:14/17:15Z: guarda aprovada, estado normal e propriedade nas duas clínicas. Não é emulação SQL. Essa sessão pertence à bancada do titular; o Chrome novo controlado não está autenticado. Não foram copiados cookies/storageState/tokens/credenciais.
- Migration adicional R2 autorizada aplicada uma vez: fonte database/proposals/configuracoes/r2/20261009075000_configuracoes_homologacao_r2.sql, SHA25673eebe6b09ebc63d712184bc7eccc0758ac79cd6c1ebb94f78d21b9ba38b8566. Ledger real20261009174524/configuracoes_homologacao_r2. NÃO reaplicar pelo nome/data da fonte. Catálogo confirma dois CHECKs com os quatro pares/slugs fictícios e padrão sintético restrito; MD5 atualad8fe4e81ac543b66e7146d2a1205dcd. anon/authenticated sem EXECUTE; service_role com EXECUTE. Nenhuma guarda/hook/RLS anterior removida.
- Somente Edge configuracoes-publicas atualizada de1 para2, ACTIVE, verify_jwt=false preservado, SHA bundlefdb1a681ae566c97408cd88877ddba52ceb71e0824f13bc632285ba74a09e98e. Arquivos conferidos integralmente após deploy: index anterior idêntico, resolver acrescenta somente os dois aliases R2 fixos. Recuperação anterior salva antes da aplicação. Outros seis serviços/hook não reaplicados.
- Criados SOMENTE dois contextos R2 e duas contas Auth Admin novas com email_confirm=true, metadados próprios e senhas individuais aleatórias em RAM. Nenhum envio por convite/recuperação; notificação Password changed DESLIGADA é leitura MANUAL anterior do titular, não inferência de ausência em API.
- Executor falhou na preparação de vínculos, antes de login privado/salvamento/upload. Causa do executor confirmada por consultas SELECT equivalentes: argumento SQL iniciado por comentário -- retorna ajuda/exit1 na CLI2.110.0; sem comentário retorna transporte1; por --file, mantendo comentário, retorna transporte1. O erro aconteceu no transporte local, não foi rejeição das guardas do banco. Durante o diagnóstico, uma chamada posterior ao seed R2 foi recusada pela guarda ‘Fixture já existe’, sem criação/reativação/alteração adicional. Não repetir esse seed. Consulta a logs PostgreSQL no intervalo não trouxe eventos; não inventar um SQLSTATE remoto. Corrigida a execução por arquivo temporário noC, sem segredos; arquivo removido ao final. Não executar novamente fixtures encerradas.

## Requisitos e evidências

| Requisito | Teste/evidência real | Resultado |
| --- | --- | --- |
| Criador legítimo B/I | SDK getUser/exigir_sessao/estado/vínculos próprios na bancada | Aprovado para essa sessão; Chrome controlado ainda sem login |
| Pacote R2 restrito | Catálogo pg_proc/constraints/ACL + conteúdo Edge version2 | Aplicado e conferido |
| Integridade após migration |8 SELECTs das seções1–5 de verificar-integridade.sql, cada um por arquivo | Aprovado;0 ausências/alertas; sem contagem/dados de pacientes |
| Contas/contextos novos | Auth Admin e seed exatos,2/2, sem reativação | Criados; encerrados após falha |
| Preparação de vínculos | Chamada CLI com comentário inicial | Falhou antes do SQL; transporte corrigido localmente |
| Salvamento/leitura/F5/logos/timbrados/cabeçalho/rodapé/login/permissões/isolamento privados | Não alcançados pela execução R2 | PENDENTES;0 testes funcionais privados aprovados |
| Troca obrigatória/login pessoal/sessões antigas/H1–H5 | Executor preparado; não iniciou sem sessão no Chrome próprio | PENDENTES;0 novas contas AD consumidas |
| GraphQL funcional | Extensão permanece ausente em leitura oficial atual | NÃO HOMOLOGADO; ausência não é aprovação de autorização |
| Dashboard publicada | HTTP/bundle0.3.0/de15bd14 em B/I; prova MANUAL autenticada anterior preservada | Publicada, sem alteração |
| Encerramento R2 | Ban,0 sessões/refresh/vínculos; ausência de perfil; contextos/clínicas inativos; público null | Aprovado por executor e reconferência MCP |

## Encerramento e limites

Conta A2 UUID92967fa0-aec9-4ea5-a950-3e6a80f9cbee e B2 UUIDd0ab6dff-5285-4d7d-bc60-3a5921bd33e4: ban confirmado,0 auth.sessions,0 refresh não revogados,0 vínculos ativos; perfis public.usuarios AUSENTES, pois a transação de vinculação não foi enviada. Login com a senha criada recusado após ban. Senhas foram substituídas por valores aleatórios apenas das fixtures durante encerramento e nunca persistidas.

Contextos ed60a2c6-59c8-45bc-80b7-e53aa005da01/02: clínicas e contextos ativo=false,0 vínculos, consulta pública null. Nenhum ativo/configuração institucional foi enviado/salvo, nenhuma marca fictícia aplicada em B/I. Preservados histórico/auditoria/recursos já encerrados.

Reconciliação: H6/C-A/C-B antigas3 contas encerradas; A2/B2 novas2 encerradas. Total deste plano consumido5 contas,4 contextos, todos encerrados. H1–H5 restantes5 continuam inexistentes. Limite máximo10 contas/4 contextos e ampliação R2 de uso ÚNICO permanecem vigentes. Não supor autorização para outra R2/R3; os quatro contextos permitidos estão consumidos e não podem ser reativados. Configurações depende agora de uma decisão concreta para novo par de contextos/contas além desse limite; autorização geral de publicação não altera esse limite específico.

## Situação de liberação e próxima ação

Configurações NÃO apta a habilitação/publicação: execução privada não ocorreu e nenhum contexto fictício autorizado está disponível. Acesso Direto NÃO apto: operação normal/controlada de Novo membro e os testes H1–H5 ainda não executados. SQL geral/homologação false; flag booleana do serviço false confirmada por comparação do hash (sem leitura/exposição de segredo); flags normais do frontend false. GraphQL ausente não é dependência de consumo atual encontrada para essas telas REST/RPC; sua homologação funcional continua separada, sem instalação autorizada.

Chrome de teste aberto em http://127.0.0.1:3000/acesso/brotas. Executor aguarda login legítimo nessa janela; a sessão normal de outra origem/navegador não pode ser transferida. Login interativo é a única ação exclusiva do titular necessária ao Acesso Direto; não pedir questionários nem credenciais no chat. Preparação contempla guardas, tentativa parcial H4 antes de revogação, lease natural, sessão antiga com JWT em RAM exclusivamente de fixture, reemissão H3, papéis e finally. Código preparado e sintaxe/lint não significam testes reais aprovados; revisão de cobertura continua obrigatória antes de habilitar.

TypeSafe consultada/reaproveitada, não pertinente a controles determinísticos; sem IA no produto. Jev não repetido por continuidade do mesmo pedido. Não enviados dados privados a serviço de IA.

Branch principal codex/equipe-fase2-2026-10-07/ad493861; checkout de publicação codex/resgate-local-2026-09-26/de15bd14. Alterações desta etapa locais NÃO commitadas. Remotos/Hostinger/contas/dados reais e demais trabalhos preservados. Evidências sanitizadas: database/proofs/configuracoes-r2/2026-10-09/. Scripts operacionais privados em pasta local, sem credenciais em arquivos.


## Verificações finais —09/10/2026,15:12 -03

3/3 testes Node direcionados de aliases públicos passaram (328ms, dados sintéticos), incluindo reais/históricos, somente os dois adicionais e rejeição de seletor privado. Import direto do resolver local confirmou correspondência com a Edge2 instalada. Lint das três bancadas, sintaxe dos executores e diff-check direcionado passaram. Esses resultados não são homologação privada. Índice vazio no checkout de publicação; HEADde15bd1432fc3cab0ea8c852e463970ae9e2381d preservado. Acesso Direto permanece impedido no Chrome controlado por ausência de autenticação interativa nessa janela; a prova SDK da outra bancada continua válida para sua própria sessão. Não deixar executor criar recursos depois de encerrada a etapa sem retomada supervisionada: marcador de execução removido; navegador aberto aguarda somente autenticação e não consome H1–H5.


## Recuperação dos servidores da bancada —09/10/2026,15:29 -03

Usuário informou “logado” e a interface ambiente indicou5189/dashboard; isso é informação do usuário, não nova prova SDK. Leitura HTTP constatou conexão recusada nas portas3000/5189; antigo executor não consta mais no gerenciador de processos da ferramenta. Recuperados apenas servidores Vite em processos Windows ocultos independentes (5189/PID16604,3000/PID37736), sem reiniciar navegador, transferir sessão ou consumir fixtures. Ambas respondem HTTP200, diagnóstico aguardando_browser; nenhum resultado novo de guarda/papel confirmado. Canal alternativo Computer Use inicializou e enumerou janelas, mas a captura foi interrompida pelo controle da ferramenta por não determinar o URL atual do navegador com confiança suficiente; cessadas ações gráficas, sem contorno. Não afirmar que a janela Chrome anterior continua controlada. Próxima ação exclusiva da interface: F5 na bancada5189 já aberta para o SDK normal registrar automaticamente a sessão; não solicitar credenciais nem questionário. Esta recuperação não habilita recursos, altera backend, publica frontend ou renova recursos consumidos. Dashboard0.3.0 e provas manuais preservadas; Configurações continua impedida pelo limite4 contextos consumidos/encerrados, AD H1–H5 não executado nesta etapa. GraphQL continua ausente e sem homologação funcional. TypeSafe consultada, sem IA para controles determinísticos; Jev não repetido por continuidade.


## Homologação real AD executada; prova final pendente —09/10/2026,17:05 -03

Sessão3000 confirmada automaticamente e aba IAB controlável; cinco contas H1–H5 criadas por Novo membro com SDK/sessão real e allowlist restrita.83 verificações reais registradas passaram, mais duas provas de RPC financeira pendente42501. Troca na tela normal, novo login pessoal, senha/JWT/refresh temporários antigos recusados, Storage com mesmo objeto, expiração/reemissão H3, metadata, atualização parcial H4 e email existente H6 preservado H5 comprovados. Última asserção de isolamento falhou: executor consultou tabela equipe_membros sem SELECT e exigiu vazio. Catálogo confirma sem SELECT inclusive na coluna id; aplicação usa equipe_listar(uuid). Corrigido localmente para RPC própria positiva/outra clínica42501;4 testes sintéticos passaram, repetição conectada AINDA PENDENTE. Não registrar falha como aprovação nem vazamento comprovado. Finally e MCP confirmaram cinco contas novas banidas,0 sessões/refresh/vínculos/perfis/pessoas ativos; allowlist0, gates gerais/homologação false, serviço false, proteções true. Total acumulado10 contas banidas/4 contextos inativos, limites esgotados. Bancadas3000/5189 HTTP200 mantidas; executor encerrado e criação local desarmada. Configurações privada ainda sem homologação; GraphQL ausente não homologado. Domínios seguem0.3.0/de15bd14, HTTP/bundle/rotas conferidos19:48Z; prova manual autenticada anterior preservada, sem novo deploy. Proposta R3 concreta NÃO AUTORIZADA/NÃO APLICADA: exatamente4 contas/2 contextos adicionais, máximo14/6, migration restrita e somente Edge configuracoes-publicas2→3; nova decisão solicitada exclusivamente pelo limite explícito de recursos. Dashboard e demais trabalhos preservados; sem novo commit/push.

Estado detalhado posterior:23-HOMOLOGACAO-REAL-AD-E-LIMITE-DE-RECURSOS.md.
