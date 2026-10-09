# Publicação parcial e homologação pendente — 09/10/2026

## Preparação comprovada — 13:21 -03 (America/Bahia)

Autorização explícita posterior inclui integração, push na branch acompanhada pela Hostinger e deploy dos dois domínios. Não é necessário desligar o auto-deploy. Preparação sobre df74106, que contém 2bcd8a4 e tem base publicada 26909341. Publicação ainda não executada no instante deste registro; o resultado efetivo será registrado após a leitura dos domínios. Não declarar concluída a homologação conjunta.

O conjunto independente pronto é a dashboard administrativa do Proprietário(a), preservando estrutura, fontes oficiais, Agenda e Financeiro. Os indicadores e pendências foram comparados MANUALMENTE pelo titular em Brotas e Ipupiara com mesma data/filtros. Esta confirmação explícita já foi recebida. Agendados conta estado agendado/confirmado; não é total do dia. Ausência de horário futuro mantém aguardando/em atendimento. Erro não vira zero; atualização consulta os blocos e mantém a data da última consulta válida quando há falha.

Configurações e Acesso Direto continuam pendentes. Flags gerais false; na produção, Configurações não aparece no menu e a rota direta mostra “Configurações em preparação”, sem editor. Prévia local preservada. Escolha de senha temporária continua indisponível no pacote normal. Nenhuma guarda, RLS, Auth ou regra financeira foi reduzida.

## Evidências e limites

| Requisito | Evidência | Resultado |
|---|---|---|
| Dashboard e números B/I | Confirmação explícita do titular, mesmas datas/filtros | Manual aprovada; sem acesso automatizado a valores |
| Sessão atual do criador B/I | Titular confirmou Proprietário(a), F5, Meu perfil e Equipe → Novo membro sem salvar | Manual por leitura; não comprova novo login/criação/ativação |
| Separação de produção | 4/4 testes Playwright juntos, desktop/celular e ambas clínicas, 31,1s | Simulado aprovado; rota bloqueada persiste no F5, dashboard preservada |
| Dashboard dirigida já válida | 18/18 juntos em 58,3s; conjunto 86/86 anterior | Reaproveitado, sem mudança funcional nos indicadores |
| Código novo | Tipos frontend, lint direcionado, notas, diff-check; build principal e bancada | Local aprovado; aviso de tamanho de chunk preexistente |
| Canal do navegador | Uma chamada IAB falhou: trusted Node process exited unexpectedly; kernel reset | Não repetido; não equivale a login recusado |
| Alvo remoto | MCP oficial get_project_url | Exclusivamente xftnkusbyqzyvzrovroj |
| Proteções existentes | Leitura SQL administrativa oficial 13:07 -03 | pre-request preservado; 57 RLS RESTRICTIVE; 6 funções de proteção confirmadas |
| Controles | Leitura oficial: habilitado=false, homologacao_habilitada=false, protecoes_instaladas=true; operações/lista0 | Nenhuma nova criação/liberação |
| Migrações e serviços | 20261008213000/230000/230050/230100 presentes; 7 Edges ACTIVE, versões10/5/5/4/1/1/1 | Nenhuma reaplicação, deploy de Edge ou alteração Auth |
| R2 | 20261009075000 ausente, contas/contextos0 | Não aplicado nem consumido |
| Fixtures antigas H6/C-A/C-B | 3 banidas; sessões/refresh válidos/perfis/vínculos ativos0;2 contextos inativos | Encerramento reconfirmado; nada reativado |
| GraphQL | Extensão ausente; resposta histórica do endpoint indica ausência | Operações funcionais/autorizações não homologadas; não contar como teste aprovado |
| Produção anterior | Leitura pública 13:02:56 -03 | Ambos domínios0.2.0/26909341; árvore suja informada no metadata; SPA200 não comprova login |

Nenhum consumidor GraphQL foi encontrado em src/server/serviços no pacote revisado. A dashboard usa REST/RPC existentes, por isso a ausência da extensão não impede esta publicação independente. Configurações/Acesso Direto não recebem liberação geral; se GraphQL for instalado futuramente será necessária revisão funcional das operações e caminhos SECURITY DEFINER. Instalação continua fora desta execução.

## Pendências concretas e execução manual

A chamada normal de Novo membro pelo criador, troca obrigatória, login pessoal, recusa da senha/sessão temporárias, permissões e isolamento precisam de sessões reais. Configurações precisa de upload/download privado, persistência/edição e configuração pública com os dois contextos R2. Leituras administrativas e fixtures simuladas não substituem estes testes.

Bancada local em tests/operacional/acesso-direto-conectado.* usa App/SDK reais, sem mocks, com verificação do projeto exato e flag de teste isolada. Não integra o entrypoint normal nem será publicada. Abrir localmente em127.0.0.1:5189/acesso/brotas, entrar pela própria interface e clicar “Conferir sessão real”. Nesta primeira etapa somente getUser, vínculos/clínicas e duas RPCs de guarda; não cadastra conta/pessoa. Não copiar senhas/tokens/cookies ao chat. Enquanto esta prova está pendente não consumir as novas fixtures.

Limite acumulado:10 contas/4 contextos. Já utilizadas e encerradas3 contas/2 contextos. Restantes H1–H5 (5 contas, papéis/escopos do plano original) e R2 (2 contas/2 contextos, uma única vez). H1–H5 não são substitutas ilimitadas; R2 aprovado expressamente em AMPLIACAO-PONTUAL-RETOMADA18.md. Somente dados fictícios controlados, sem contas adicionais/administração global/e-mails. Recursos deverão ser encerrados e conferidos mesmo na interrupção. Nesta etapa nenhum novo recurso consumido, portanto nenhum encerramento novo necessário.

## Versão e recuperação

Versão identificável0.3.0, sem dependências novas, tag ou release formal. Manifesto de release0.0.0 preservado. Nova interface administrativa independente é MINOR na série0.x. Compilar a árvore limpa após o commit para incorporar o SHA efetivo; comprovar o mesmo SHA e0.3.0 nos dois domínios depois do push.

Recuperação preparada: preservar a referência remota26909341beaa46b68bacc8e77684f6f6ba67f903 antes do push; em checkout limpo da branch de publicação, reverter em ordem inversa os três commits desta entrega (novo commit de separação, df74106, 2bcd8a4), criar commit de recuperação e push explícito somente resgate-local, sem force. Não executar salvo regressão comprovada. Isso recupera frontend anterior sem mudar banco/Auth/contas; verificar ambos domínios após auto-deploy. Estado do backend permanece com guardas instaladas e recursos gerais false.

Pasta principal, branch equipe-fase2/ad493861 e trabalhos alheios preservados. Só a seleção revisada sai da worktree isolada para resgate-local. Hostinger configurada anteriormente para essa branch nos dois domínios; esta autorização inclui o efeito automático. Não há canal Hostinger para ler IDs/status do job; conferir versão efetivamente servida é prova de entrega pública, não de testes autenticados. Login/dashboard/navegação/troca/F5 em produção deverão ser confirmados pelo titular se o navegador do agente continuar indisponível.

## Skills

TypeSafe consultada com índice oficial vigente: não pertinente a autenticação, cálculos ou versionamento determinísticos; nenhuma IA adicionada. Jev recebeu somente triagem sintética: code_change confiança0,69, complexidade1,9/2 (0,86), informação faltante0,43 incerta;1.066 tokens,939,1704ms,USD0,000039774. Decisão de publicação parcial é do Codex, baseada na autorização e evidências. ReUI sem benefício concreto nesta separação mínima; sem instalação/redesenho.

Referências: relatório18 de Configurações; relatório18 de Sistema/dashboard; relatório19 de versionamento; manifestos e recuperação do pacote existente. Histórico anterior preservado.
