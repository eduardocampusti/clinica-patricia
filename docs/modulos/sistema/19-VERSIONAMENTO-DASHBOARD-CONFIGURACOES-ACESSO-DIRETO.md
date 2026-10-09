# Versionamento seletivo de Dashboard, Configurações e Acesso Direto

## Publicação confirmada —09/10/2026,13:25:17 -03

Push explícito sem force/tags/merge de resgate-local confirmou HEADde15bd1432fc3cab0ea8c852e463970ae9e2381d no remoto. Contém 2bcd8a4f47a2dc78fcc8c1715e3242d114fbe651 e df74106eee4999a53a88a2bca72ab25cc1ab0c63. Auto-deploy autorizado efetivado: ambos domínios servem0.3.0/de15bd14/alteracoesLocais=false. Brotas compilada16:24:54.224Z, bundleindex-BEWapG86.js; Ipupiara16:24:51.026Z, index-8K6wtdfQ.js. HTML/bundle200 e rotas dashboard/equipe/financeiro/configuracoes200 com SPA correspondente. Não é prova autenticada nem leitura de status do job Hostinger.

Dashboard publicada; Configurações e Acesso Direto continuam bloqueados para liberação. Confirmação manual de indicadores e sessão LOCAL B/I preservada. Conferência autenticada da produção solicitada, ainda sem resposta nesta gravação. Bench real5189 preparado para leitura normal do criador, sem tokens no chat; nenhuma fixture nova consumida. Antigas3 contas/2 contextos seguem encerradas, GraphQL ausente. Não alterados banco/Auth/Edges/controles ou dados clínicos nesta publicação. Tipos/lint/notas/build/diff-check aprovados;4/4 provas de separação são simuladas. Recuperação exata por revert dos três commits preparada e não executada.

As linhas anteriores que dizem preparação/push pendente são HISTÓRICAS. O resultado acima é a evidência atual. Registros finais locais após o commit; não gerar deploy documental em ciclo.

[Resultado e pendências](20-PUBLICACAO-PARCIAL-E-HOMOLOGACAO-PENDENTE.md).


Data:09/10/2026,11:54 -03 (America/Bahia). Preparação e commits locais autorizados.
**Push pendente; não houve publicação nem nova escrita no Supabase.**

## Repositório, branch e preservação

Remoto confirmado: https://github.com/eduardocampusti/clinica-patricia.git.
Branch de entrega: codex/resgate-local-2026-09-26, em worktree isolada gerenciada.
Base remota atualizada por fetch/fast-forward:26909341beaa46b68bacc8e77684f6f6ba67f903.
A branch local anterior estava três commits atrás, sem divergência; esses commits
foram preservados. Nenhum merge para outra branch, reset, force push ou descarte.
Pasta principal permanece na branch codex/equipe-fase2-2026-10-07,
HEADad49386105b3ea19b10b11a4e40c31983ae38d69, com índice e trabalhos locais preservados.
Os documentos compartilhados na entrega foram compostos sobre a base remota,
acrescentando somente decisões/estados pertinentes, sem transportar histórias
locais alheias nem substituir o histórico remoto de Meu perfil.

## Seleção e segurança

174 candidatos dos manifestos e dependências explícitas;13 eram idênticos à base
normalizada e não geram alteração. Nove registros compartilhados, este relatório
e o manifesto de Git completam a seleção. Primeiro commit:149 arquivos,
2bcd8a4f47a2dc78fcc8c1715e3242d114fbe651, Configurações/Acesso Direto e suas dependências compartilhadas.
Segundo commit:dashboard, ajustes portáteis dos testes e registros finais.
Identificador do segundo commit é consultável no histórico; não é inserido no
próprio conteúdo, evitando referência circular. A lista exata e SHA256 dos blobs
normalizados constam em [manifesto de Git](../../../releases/2026-10-09-dashboard-configuracoes-acesso-direto.json).

Incluídos: interfaces/flags desligadas; rotas e guarda; serviços e fontes oficiais;
quatro migrations existentes; ferramentas SQL de proteção/verificação/recuperação;
proposta R2 adicional preparada, ainda não aplicada; testes reproduzíveis; fontes
livres de PDF e licença; documentação e evidências agregadas sanitizadas.
Financeiro recebe somente a dependência de timbrado; cálculo/contrato financeiro
preservado. Meu perfil/Equipe incluem apenas dependências já presentes nos
manifestos, principalmente guarda de ativação, sem alterações alheias da pasta principal.

Não incluídos: .env, segredos, credenciais, senhas temporárias, tokens, sessões,
capturas, PDFs gerados, logs brutos, scratch/output/resultados/cache/build,
artefatos pessoais ou clínicos, melhorias de outros módulos e trabalhos de Geovana.
Varredura dos candidatos e do índice não encontrou assinaturas de segredo.
Três e-mails exemplificativos foram revisados: placeholders de formulários e
comentário padrão do Supabase, sem contas reais. Nenhuma captura foi versionada.
Manifestos históricos conferidos:zero divergências SHA256 nos arquivos preparados
antes da inclusão final da nota de Dashboard; hashes aplicados ao banco permanecem
históricos e não são confundidos com a normalização LF do Git. O estado atual foi
acrescentado aos manifestos sem reaplicar seus componentes.

## Verificações

| Verificação | Evidência/ambiente | Resultado |
|---|---|---|
| Tipos frontend | tsc -b na seleção isolada | Aprovado |
| Tipos servidor e serviços | tsc --noEmit do servidor e configs backend de ambos os módulos | Aprovado |
| Notas/build | check-release-notes e Vite, saída fora do repositório | Aprovado; versão0.2.0, aviso de bundle grande preservado |
| Revisão estática direcionada | Oxlint no painel/adaptador e testes administrativos alterados | Aprovado |
| Dashboard, ajustes finais |18 testes Playwright juntos, desktop/celular, Brotas/Ipupiara sintéticas |18/18 em58,3s |
| Atualização/erros/pendências | Mesmo conjunto, fontes sintéticas e rede externa bloqueada | Aprovado localmente; não consulta real |
| Correspondência Agenda/Financeiro | Confirmação explícita do titular nas duas clínicas, mesmas datas/filtros | Conferência manual informada pelo usuário; não API |
| Integridade/segredos do índice | Seleção explícita, varredura e git diff --cached --check | Aprovado |
| Resultados anteriores válidos | Dashboard86/86 conjunto,24/24 contraste,24/24 contratos; provas CFG/AD nos relatórios próprios | Reaproveitados, sem reinício indiscriminado |

Só os18 cenários diretamente afetados foram repetidos: os configs de teste
passaram a usar diretório temporário do sistema em lugar de caminho pessoal fixo.
Não mudou o comportamento do produto, timeout, número de cenários ou critérios.
Nenhuma conta/fixture remota consumida nesta etapa. Tipos/build não comprovam produção.

## Estado verdadeiro dos recursos

Dashboard funcional e ajustada localmente; comparação real de indicadores e
quantidades foi manualmente confirmada pelo titular em Brotas/Ipupiara.
Valores individuais e data escolhida não foram fornecidos e não são inventados.

Configurações e Acesso Direto:backend instalado com homologação parcial,
ambas as flags gerais false. Última leitura oficial READ ONLY11:22–11:23, anterior
a esta etapa Git:três contas fictícias antigas banidas,zero sessões/refresh/perfis/
vínculos ativos,dois contextos encerrados; lista e operações diretas vazias.
H1–H5 não criadas e R2 (duas contas/dois contextos adicionais autorizados uma única
vez, máximo acumulado10/4) não consumida. Não reativar os antigos.

Limite de navegador:falha no kernel oficial de Computer Use antes de acessar a
sessão legítima do criador. URL ambiente e SQL administrativo não provam esse fluxo.
Criação pelo serviço com sessão legítima, ativação/troca, novo login/rejeição da
senha e sessão temporária antiga, Configurações privada/upload/persistência e
isolamento com sessões reais continuam nas pendências do relatório18.

GraphQL:extensão ausente, resposta HTTP200 com erro de extensão não comprova
autorização de consultas/mutações. Não instalar/ativar extensão nem contabilizar
essa resposta como aprovação. Sem consumidor GraphQL encontrado no código
anteriormente inspecionado; isso não exclui consumidor externo. A limitação fica
explícita e não autoriza habilitação geral. RLS, hook, pre-request e guardas preservados.
[Provas/pendências conjuntas](../configuracoes/18-APLICACAO-GUARDA-E-SEQUENCIA-AUTORIZADA.md).

## Push e publicação

Documentação9/17 do Sistema registra integração Hostinger com auto-deploy habilitado
na mesma branch para Brotas/Ipupiara; o último deploy de Meu perfil confirmou esse
efeito. Leitura oficial GitHub dos webhooks retornou lista vazia, o que não confirma
desligamento da integração GitHub App/Hostinger. Sem ferramenta Hostinger disponível
para leitura atual; não repetidas tentativas do navegador já falhas.

**Não executar push nesta condição.** Operação afetada:git push origin
codex/resgate-local-2026-09-26. Motivo:pode publicar em produção, efeito excluído da
autorização atual. Para prosseguir sem publicar, conferir na Hostinger a integração
Git das duas aplicações e comprovar auto-deploy desligado; alternativamente,
precisa de autorização específica de publicação. Não foi alterada essa integração.
Nenhum link dos novos commits no GitHub é apresentado como existente antes do push.
Os commits permanecem recuperáveis na worktree anexada. Sem deploy frontend/servidor,
Auth, migrations, contas ou dados reais alterados nesta etapa.

## Skills

TypeSafe consultada integralmente e documentação vigente avaliada:versionamento,
seleção literal e hashes são determinísticos; nenhuma IA acrescentada ao produto.
Jev inicial recebeu somente descrição sintética da tarefa, sem arquivos privados:
julgamento incerto (confiança0,42),complexidade1,44/2 (confiança0,34),990 tokens,
1.578,27ms,US$0,000036498. O procedimento explícito do titular orientou a execução;
não foi alegada economia de tokens. Não foram expostas credenciais.
