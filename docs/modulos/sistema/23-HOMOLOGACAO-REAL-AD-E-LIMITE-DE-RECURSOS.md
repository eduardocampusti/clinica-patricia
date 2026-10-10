# 23 — Homologação real de Acesso Direto e impedimento final

Execução de09/10/2026, aproximadamente16:36–16:47-03, exclusivamente xftnkusbyqzyvzrovroj. O navegador IAB voltou a funcionar, com sessão SDK legítima de Proprietário(a) nas duas clínicas. Não foram copiadas credenciais, cookies ou tokens do titular, nem simulada sua sessão.

## Origem das provas

Criação: Novo membro da aplicação normal na aba IAB existente. Instrumentação só da bancada adicionou antes do serviço a allowlist exata membro/ator/email das cinco fixtures autorizadas. Não houve resposta mockada, criação de Auth por SQL ou vinculação administrativa substituindo a criação normal. O serviço remoto preparou as contas e senhas reais.

Ativação: Chrome isolado de fixtures, SDK/Auth reais, login temporário, tela normal Defina sua senha pessoal e seu botão Salvar e continuar, seguida de novo login pessoal. Nenhuma senha foi salva em arquivo, log, prova, sessão do navegador do titular ou documentação; credenciais de fixtures somente no estado da tela normal e memória transitória do executor. Perfis de navegador fictícios destruídos. A requisição de ativação passou pela Edge instalada e pelo protocolo de verificação/revogação.

H4: a bancada induziu uma exceção no tratamento da resposta DEPOIS de o provisionamento remoto responder; não se afirma uma falha de rede observada. A tentativa de retomada normal conservou pessoa/conta/operação e não revelou a senha anterior. A bancada chamou explicitamente o serviço normal de substituição com novo identificador idempotente para essa fixture. A outra falha parcial H4 foi conectada: atualização/verificação Auth antes da revogação; conclusão recusada e dados bloqueados, aguardando lease natural125s antes da ativação normal.

## Requisito, teste, evidência e resultado

| Requisito | Teste realizado | Evidência | Resultado |
| --- | --- | --- | --- |
| Criador legítimo por clínica | SDK getUser, guarda, estado normal e papel; operação de Novo membro | Diagnóstico automático + IAB + preflight administrativo | Aprovado nas duas unidades |
| Criação individual | H1 ProprietárioB, H2 ProprietárioI, H3 RecepçãoB, H4 MédicoI, H5 MédicoB/RecepçãoI | Serviço real; catálogo5 contas/5 pessoas/5 operações,6 vínculos de acesso | Aprovado, sem duplicação |
| Senha e validade | Credencial24 caracteres individual; operação pendente e validade superior a23h após criação | Resposta real somente em RAM + SQL de operação | Aprovado H1–H5 |
| Bloqueio antes da troca | Dois logins temporários reais por conta; tabela, guarda RPC e Meu perfil recusados | Sessões Auth e chamadas conectadas | Aprovado H1–H5 |
| RPC financeira protegida | financeiro_resumo_caixa(p_sessao_caixa_id=UUID inexistente); assinatura conferida no catálogo | SDK H4/H5 antes da ativação, data null,42501 | Aprovado; nenhum valor financeiro consultado |
| Storage | Imagem JPEG sintética H1 via equipe-recursos; mesmo objeto antes/depois da troca e JWT antigo | HTTP negativo antes;200 na sessão nova; negativo no JWT temporário | Aprovado H1 |
| Obrigação não removível | Fixture tentou metadata must_change_password=false | Guarda real ainda recusou | Aprovado H1–H5 |
| Expiração e reemissão | Somente operação H3 expirou; serviço normal substituiu credencial | Estado expirada, bloqueio, senha antiga recusada, nova admitida | Aprovado H3 |
| Falha parcial e retomada | H4 como descrito acima | Mesma operação/pessoa/conta, segredo não recuperado; conclusão sem revogação negada | Aprovado nesses cenários; distinguir indução local de resposta e protocolo conectado |
| Email existente | H5 tentou H6 encerrada, recebeu CONTA_EXISTENTE, retomou mesma pessoa com emailH5 | Impressão da senha H6, ban e vínculos comparados apenas em RAM, iguais | Aprovado; sem reativação/redefinição/vínculo H6 |
| Troca e novo login | Tela normal e login pessoal distinto | SDK, Edge e interface reais | Aprovado H1–H5 |
| Senha e sessões antigas | Login temporário, guarda/tabela/refresh antigos; JWT H1 tentou mudar senha/email | Auth/REST reais recusados | Aprovado H1–H5; PUT H1 também recusados |
| Papéis confirmados | usuarios_clinicas da própria fixture | Papéis/quantidades exatos; Configurações negada aos não proprietários | Aprovado H1–H5 |
| Isolamento pelo módulo real | Último teste usou SELECT direto equivocado | Tabela e coluna id sem SELECT; caminho normal é equipe_listar(uuid) | NÃO aprovado; falta repetir RPC própria positiva e outra clínica negativa |
| Dashboard/F5 após ativação | Aplicação normal das cinco fixtures; perfil/navegação presentes após recarga | Chrome/SDK reais | Aprovado local; não é produção |
| Configurações privada | Nenhum contexto autorizado disponível após R2 | Relatório22 e catálogo4 contextos inativos | Bloqueado; persistência/uploads/layout/login pendentes |
| GraphQL | Extensão continua ausente | Leitura oficial pg_extension | Não homologado funcionalmente; não instalar/contar ausência como sucesso |
| Produção preservada | HTML/bundle e rotas HTTP nas duas clínicas | Prova pública19:48:32Z;0.3.0/de15bd14 | Preservada; validação autenticada MANUAL anterior permanece |

As83 verificações são asserções registradas pelo executor, algumas repetem o protocolo em contas diferentes; não são83 cenários independentes. Acrescentam-se duas provas financeiras separadas. A84ª asserção original falhou e o resultado global continua aprovado=false. Seu retorno bruto não foi preservado; não inventar código/quantidade do SELECT original. ACL oficial confirma a inadequação desse caminho. Não houve evidência de dados da outra clínica retornados.

## Correção local e limite de recursos

O executor agora verifica equipe_listar(p_clinica_contexto_id), conforme assinatura e fonte oficial lidas. Leitura positiva da própria pessoa é obrigatória antes da prova de recusa42501 na outra clínica; função ausente, transporte, tabela sem privilégio ou vazio não podem substituir esse par de provas. Helper isolamentoEquipeConectado.mjs e4 testes direcionados passaram (446ms), dados sintéticos; não são a repetição conectada.

Como o finally já encerrou H1–H5, não é permitido reativá-las. Total acumulado:10 contas criadas/banidas,4 contextos consumidos/inativos. O pacote database/proposals/homologacao-final-r3/ contém a decisão mínima preparada: duas novas contas restritas B/I para o isolamento RPC e duas novas contas/dois contextos CFG, máximo14/6, uso único. Migration adicional limitada a dois pares, ramo sintético e Edge pública3; nenhum Auth/hook/GraphQL adicional. Proposta com hashes, NÃO autorizada/aplicada; requer nova decisão pelo limite explícito, sem repetir aprovação de publicação.

## Encerramento comprovado

Finally do executor e leitura oficial independente: cinco contas banidas,0 auth.sessions,0 refresh válidos,0 vínculos e perfis ativos; cinco pessoas e seus vínculos cadastrais inativos. Allowlist de homologação removida, controle geral e homologação false, proteções true; flag da Edge restaurada false e reconferida por comparação de digest sem expô-lo. Auth/signup/hooks/pre_request/RLS/migrações/Edges não foram substituídos nesta fase. Somente controles temporários/recursos fictícios previstos foram escritos.

Uma imagem fictícia permanece referenciada em bucket equipe-fotos privado, vinculada à pessoa inativa; não foi apagado histórico/auditoria. Nenhuma marca fictícia em Brotas/Ipupiara. O fluxo usou createUser administrativo interno do serviço com email_confirm e não executou convite/envio; Password changed estava desligado na leitura MANUAL previamente fornecida pelo titular, não tratado como configuração consultada por API.

Executor de testes encerrado após comprovação; criação da bancada desarmada. Vite3000 e5189 permanecem em processos ocultos independentes, HTTP200. Sessão real do titular novamente confirmada na interface após encerramento, sem editar sua conta.

## Publicação e continuidade

Os dois recursos continuam desligados: não há prova suficiente para liberá-los. Nenhum novo commit/push/deploy foi feito nesta etapa. Dashboard0.3.0/de15bd14 permanece servida nos dois domínios. A presença de texto de editor no bundle não indica habilitação de Configurações. Fonte normal mantém as duas flags false.

TypeSafe consultada/reaproveitada: inadequada para cálculos/controles determinísticos, sem IA no produto. Jev não repetido por continuação do pedido. ReUI não traz benefício à correção do executor, sem redesenho ou dependências. Branch primária codex/equipe-fase2-2026-10-07/ad493861 e publicação codex/resgate-local-2026-09-26/de15bd14 preservadas; fetch confirmou0/0 divergência. Alterações desta etapa locais não commitadas.

Evidências sanitizadas: database/proofs/acesso-direto/2026-10-09-iab/. Roteiro e proposta de próximo passo: database/proposals/homologacao-final-r3/README.md. Próxima ação: decisão exclusiva sobre a ampliação limitada; após aprovação, conferir executor completo e executar somente pendências antes de habilitar/publicar.

Conferência adicional17:05-03: imagem H1 existente no bucket privado, vinculada à pessoa inativa, recusou HTTP público sem credenciais com400. Evidência storage-encerramento-sanitizado.json; não é teste de sessão autenticada depois do ban. Diff-check direcionado das alterações de bancada no checkout isolado aprovado. Check geral dos checkpoints no checkout primário reportou espaços finais/CRLF em blocos históricos já existentes, preservados sem normalizar trabalhos de outras etapas; novo conteúdo não tem espaços finais.
