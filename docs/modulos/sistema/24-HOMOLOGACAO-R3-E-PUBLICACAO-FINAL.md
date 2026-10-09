# 24 — Homologação R3 e publicação final

## Etapa comprovada — 09/10/2026, 17:27:01 -03

Autorização explícita: quatro contas/dois contextos adicionais, máximo acumulado14 contas/6 contextos; nenhuma reativação. Preparação corrigiu emails e app_metadata R2 indevidos no template R3, transporte SQL por arquivo e confirmação de vínculo no login da bancada.

**Acesso Direto:** duas contas I1/I2 criadas pela operação normal de Novo membro, na sessão legítima do criador confirmada pelo SDK na aba IAB3000. Duas sessões Auth reais por fixture, bloqueio pendente, troca obrigatória na tela normal, novo login pessoal, negação da senha antiga/JWT/dados/refresh e F5 passaram. Isolamento repetido pela RPC correta equipe_listar(p_clinica_contexto_id): pessoa própria presente; outra clínica recebe data=null/código42501, bilateral. 30 asserções reais passaram. Provas anteriores83+2 financeiras preservadas sem converter a antiga falha em aprovação. I1/I2 banidas,0 sessões/refresh/vínculos/perfis ativos, pessoas inativas; lista0, gates gerais/homologação false, serviço false. Conferência independente MCP confirmou encerramento. Worker encerrado, bancada de criação desarmada.

**Configurações:** aplicada seletivamente20261009170000_configuracoes_homologacao_r3.sql, ledger20261009202252/configuracoes_homologacao_r3. Catálogo confirmou função md5=07143050da7846c0c5d60de4bc3fbd41, dois CHECKs com seis pares/aliases e ACLanon/authenticated=false/service_role=true. Oito consultas de supabase/tools/verificar-integridade.sql sem contagem de pacientes passaram. Alterado somente configuracoes-publicas: versão observada anterior5, posterior7/ACTIVE, verify_jwt=false preservado, bundle9789851ad9903bea3b82b09a5f7a284812b85745cc3a0271aa5b24bc96e2c72d; fonte exata conferida por get_edge_function. Não inferir uma versão intermediária aplicada. Recuperação da fonte/DDL anteriores conservada no canal administrativo local privado. Serviços privados, Auth/hook e migrations anteriores não reaplicados. Executor C-A3/C-B3 conectado em andamento; ainda sem declarar aprovação privada ou publicar frontend.

**Limitação GraphQL:** extensão continua ausente e não foi ativada. Resposta de extensão ausente não é teste funcional aprovado. Aplicação utiliza REST/RPC/Storage/Edges; ausência funcional de GraphQL não bloqueia esses consumidores após suas proteções e testes passarem. Introduzir GraphQL futuramente exige nova revisão/homologação.

Dashboard0.3.0/de15bd14 permanece publicada, com conferências manuais anteriores aprovadas de números/login/navegação nas duas clínicas. Não alterados valores ou regras da dashboard. Frontend normal de Configurações/AD segue false nesta etapa. Próximo: terminar Configurações, encerrar suas fixtures, habilitar somente os recursos comprovados, publicar e conferir versões efetivamente servidas. TypeSafe consultada/avaliada, sem IA em autenticação/cálculos.

| Requisito | Teste | Evidência | Resultado |
|---|---|---|---|
| Sessão legítima do criador | SDKgetUser/guarda/Owner nas duas unidades em IAB | Faixa e diagnóstico3000 sem extração de token | Conectado aprovado |
| Primeiro acesso e sessões antigas | Auth e interface normal I1/I2 | database/proofs/acesso-direto/2026-10-09-r3/isolamento-real.json | Conectado aprovado |
| Isolamento por clínica | equipe_listar própria/outra42501 em I1/I2 | Mesma evidência | Conectado aprovado |
| Encerramento I1/I2 | Authban/0sessões/0refresh/0vínculos | Finally e MCP independente | Aprovado |
| Catálogo Configurações R3 | pg_proc/information_schema/CHECK/ACL | integridade-r3.json, manifesto | Aplicado/verificado |
| Configurações privada | C-A3/C-B3 | Execução em andamento | Pendente |
| GraphQL funcional | Extensão ausente | Catálogo oficial | Não homologado |
| Dashboard e produção0.3.0 | Conferência manual anterior do usuário + HTTP/bundle | Relatório20/23 | Preservado |

## Configurações: execução interrompida, causa corrigida

Sessão real C-A3: dados institucionais salvos pela interface, serviço posterior e F5 aprovados. Upload PNG128x64 pela interface falhou503; prévia não surgiu,0ativos e0arquivos registrados. Logs oficiais agregados confirmaram POSTconfiguracoes503 (20:24–20:26Z) e nenhuma operação Storage de gravação no intervalo. Código e pacote oficial imagescript@1.3.0 confirmam método encodePNG inexistente. Corrigido para encode, com PNG/decode128x64/transparência aprovados LOCALMENTE na biblioteca exata; não é prova Edge/Storage conectada. Somente serviço privado configuracoes atualizado5→6, verify_jwt=true preservado, fonte e bundlec68efac28dd3cd071fa32ac657a104d6fdb527a8e3739ecaf27d8fbb83af9bbb conferidos. Fonte anterior conservada para recuperação.

Finally encerrou C-A3/C-B3 e dois contextosR3: bantrue,0sessões/refresh/vínculos, perfis/clínicas/contextosinativos, públicoencerrado=true, novosloginsrecusados. MCP independente confirmou0ativos/arquivos e ambasbanidas. Total acumulado14contas/6contextos consumidos e encerrados; nenhuma reativação. Configurações não homologada: faltam upload posterior, timbrados/cabeçalho/rodapé, aplicação/loginpúblico, bilateral/papéis, conflito/restauração/substituição. Executor completo está corrigido/preparado; repetição conectada exige NOVA decisão específica sobre recursos limitados. Não criar substitutas implicitamente.

Publicação prevista0.4.0: liberar SOMENTE Acesso Direto comprovado; Configurações segue BACKEND_CONFIGURACOES_HABILITADO=false/interfacefechada. Dashboard preservada, sem reexecução indiscriminada. Ainda sem commit/push nesta gravação.

## Verificações locais da release0.4.0 — 09/10/2026, 17:36:42 -03

Tipos tsc-b, notas/versionamento e buildprod passaram. Lint dirigido:0erros, avisoFastRefresh na bancada (não publicada). Contrato isolamento4/4 sintéticos passou. Conjunto separação dashboard/Configurações4/4 desktop+celular passou junto41,2s após corrigir APENAS a fixture: ela não respondia POSTacesso_direto_estado agora usado pela guarda habilitada; quatro casos anteriores foram corretamente bloqueados por Ativação não verificada. Timeout não aumentado; nenhum código real/guarda modificado para aceitar erro. Estes4testes são simulados, não novos acessos autenticados de produção. Provas reais de AD e ausência de aprovaçãoCFG mantidas. Dependências do aplicativo preservadas; ImageScript1.3.0 baixado apenas em diretório temporário de teste.

## Recuperação preparada

Antes do push, origem publicada0.3.0/de15bd1432fc3cab0ea8c852e463970ae9e2381d. Se houver regressão: desligar APENAS provisionamento por update acesso_direto.controle set habilitado=false, homologacao_habilitada=false where id; restaurar segredo ACESSO_DIRETO_HABILITADO=false por CLI oficial e reverter o commit de release por git revert, push normal na branchresgate. Nunca remover hook/RLS/pre-request ou alterar operações pendentes/sessões para recuperar disponibilidade. Fonte anterior da Edge privada5 e pública5 conservada no canal administrativo; preferir correção pontual. Não estreitar CHECKs após consumo das fixtures históricas.
