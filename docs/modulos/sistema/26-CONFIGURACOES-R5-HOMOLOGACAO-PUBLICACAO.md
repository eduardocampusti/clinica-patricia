# Configurações R5 — homologação e publicação

Registro 2026-10-09T22:46:29.131Z.

Ampliação única autorizada: duas contas e dois contextos novos; máximo acumulado 18/10. Nenhuma reativação ou envio de e-mail. Migração restrita aplicada uma vez, ledger 20261009224204; catálogo, ACL e integridade 8/8 confirmados. Edge pública versão 10, fonte exata conferida; privada versão 7 e correção encode preservadas. Nenhum recurso R5 criado nesta preparação.

Executor revisado: renovação real da sessão auxiliar após novo login; saída local apenas no cliente auxiliar; saída global normal do produto preservada. Seis testes locais de sessão (SDK real com transporte sintético) e oito testes SQL locais passaram. Não substituem testes conectados. Serviços 3000/5189 disponíveis e sessão legítima confirmada pela bancada. Execução restante preparada com diagnóstico em pausa para aproveitar os mesmos recursos autorizados em caso de falha corrigível.

Configurações permanece desabilitado em produção. Dashboard e Acesso Direto 0.4.0 preservados. GraphQL sem extensão: não homologado funcionalmente, não ativado; fluxos em escopo usam REST/RPC/Storage/Edges. TypeSafe consultada e avaliada: controles determinísticos, sem IA.

Próxima etapa: testes reais restantes de contexto B, histórico, concorrência, imagens e isolamento bilateral; encerramento obrigatório antes da habilitação e publicação.

## Correção conectada durante R5 — 2026-10-09T22:55:43.602Z

Produto: conflitos funcionais40001 provocaram retry do PostgREST14.5 e timeout, conforme documentação oficial vigente. Migração20261009225100_configuracoes_conflito_http.sql troca exclusivamente cinco códigos porPT409 na mesma função. Fingerprint anterior281430da981e54b994cccf57a2522fec, posterior9244bd2c8b76a25d3ffabec1bdf179fc; proprietário/ACL/service_role/SECURITYDEFINER/search_path/guards/locks preservados. Edgeprivada8 corrigida para mapearPT409→409; nenhuma redução de segurança.3testes locais do mapeamento e tipos aprovados, integridade8/8. Recusa real409 confirmada com as mesmas fixtures. Encerramento de conexão foi recusado pela revisão automática e não contornado; leitura subsequente0requisições presas, sem impacto pendente.

Executor: restauração ocorreu no servidor (revisão5, cinco versões, nome anterior recuperado), mas uma espera pela mensagem genérica anterior antecipou a asserção. Corrigida para aguardar mensagem específica. Não é falha do produto nem aprovação parcial do conjunto. Mesmas duas contas permanecem na rodada, nenhuma substituta criada; testes restantes continuam.

Fonte: https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b


## Homologação concluída e publicação preparada — 2026-10-09T23:01:31.694Z

Rodada R5 real:82 registros de asserções,80 aprovados e duas falhas históricas corrigidas/retestadas. Último resultado dos75 requisitos nomeados aprovado, incluindo pré-condições; não chamar82/82. Rejeições bilaterais foram executadas sobre outro contexto fictício e duas unidades reais, somente leitura. As duas contas R5 foram banidas, senha de teste recusada, sessões/refresh/vínculos0; dois contextos inativos/públiconull. MCP reconfirmou10contextos totais/0ativos e0versões deConfigurações nasclínicas reais. Acumulado18contas/10contextos, todos encerrados conforme provas históricas e R5; nenhuma reativação/email.

| Requisito | Teste e evidência | Resultado |
|---|---|---|
| Sessões normais e novo login | Auth/SDK/Chrome reais A/B, guarda ativa, renovação após saída global | Aprovado |
| Dados e persistência | Salvar interface, consultar Edge, F5 A/B | Aprovado |
| Imagens | Upload PNG privado/público, substituição/histórico, JPEG normalizado A/B | Aprovado |
| Validação de imagem | Assinatura falsa, GIF, tamanho e dimensão recusados A/B | Aprovado |
| Timbrado/cabeçalho/rodapé | Persistência, recarga e PDF demonstrativo com dados consultados A/B | Aprovado |
| Personalização do login | Projeção aplicada, logo e formulário anônimos, novo login normal A/B | Aprovado |
| Histórico | Restaurar cria novo rascunho, mantém versões, sem publicação automática A/B | Aprovado após corrigir espera do executor |
| Concorrência/fonte | Duas sessões, versão antiga409, fonte fictícia409 e reconciliação A/B | Aprovado após correção PT409 do produto |
| Isolamento/permissões | Sessões reais: Edge leitura/escrita/upload, Storage e REST cruzados; Recepção403; geral403 | Aprovado |
| Identidade real | Hash da projeção pública B/I preservado,0versões reais durante homologação | Aprovado |
| Encerramento | Auth login negativo, ban,0sessões/refresh/vínculos,contextos fechados e público nulo | Aprovado |
| GraphQL | Extensão continua ausente, sem teste funcional | Limitação preservada; sem dependência dos fluxos liberados |
| Publicação0.5.0 | Flag CFGtrue após aprovação; dashboard/AD inalterados no checkout isolado | Preparada, ainda não publicada nesta gravação |

Provas: database/proofs/configuracoes/2026-10-09-r5. Testes locais específicos:6sessões com transporte sintético,3mapeamento RPC,3hosts,8SQL R5 local; tipos backend aprovados. Esses testes não substituem a rodada conectada. TypeSafe consultada, sem IA necessária; ReUI não pertinente para habilitação/correção de backend, visual preservado.

Recuperação de frontend: git revert do futuro commit0.5.0 e push normal para resgate-local; mantém dashboard/AD0.4.0 e proteções. Não retornar códigos funcionais a40001 por regressão visual. Sem alterarAuth/hooks/RLS, sem ativarGraphQL. Próximo: build/tipos e revisão explícita de arquivos, commit/push autorizado, conferir bundles0.5.0 e leitura autenticadaB/I.
