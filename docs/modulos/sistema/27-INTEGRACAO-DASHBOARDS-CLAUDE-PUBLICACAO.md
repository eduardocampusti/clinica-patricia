# Integração das dashboards do Claude

Estado: LOCAL APROVADO; PUBLICAÇÃO EM EXECUÇÃO. 09/10/2026, America/Bahia.

Base publicada confirmada por Git remoto: `f4b6891e49922ef199096e7b91274cfe6ee0f3da`, versão 0.5.0, branch `codex/resgate-local-2026-09-26`. Fetch confirmou ausência de commits posteriores nesta branch. Integração no checkout isolado já anexado; árvore principal e índice preservados.

## Origem e revisão

A evolução está sem commit na árvore principal (`codex/equipe-fase2-2026-10-07`, `ad49386`), descrita em [relatório 24](24-EVOLUCAO-DASHBOARDS-PROPRIETARIA-RECEPCAO.md). O checkout `claude/jev-base-2026-10-04` permanece em `2a6e88d`, com trabalho separado de Jev; não foi confundido com a entrega de dashboards. Processos Claude estavam abertos. Foram capturados 14 arquivos selecionados, com SHA-256 conferido antes/depois da cópia e novamente após a revisão. Isso comprova uma fotografia estável, não o encerramento de todas as sessões do Claude. Nenhum arquivo de implementação da pasta principal foi sobrescrito.

Revisadas as diferenças contra a publicação, preservando fontes de dados existentes. Dashboard.tsx, serviço financeiro e seus testes eram idênticos à base, portanto não foram transplantados. Escopo: Proprietária e Recepção; Médico não recebeu nova dashboard. Não se incorporaram alterações paralelas de Equipe, Agenda, Financeiro ou infraestrutura.

## Comportamento integrado

- Proprietária: financeiro de hoje, explicação acessível dos valores, pendências com seus escopos, operação com total separado dos quatro estados e até cinco próximos horários previstos.
- Recepção: atualização de movimento/caixa a cada 60 segundos com página visível; retomada somente quando vencida; estados agendado e confirmado distintos; contagens por profissional; filtros conservados e profissional ausente indicado explicitamente; atalho funcional de cadastro.
- Leitura, erro, recusa de permissão e contexto de clínica/dia permanecem distintos. Falha não vira zero. Valores financeiros continuam calculados nas fontes oficiais, sem novas fórmulas no frontend.

## Correções identificadas na integração

1. Fixtures antigas não contemplavam a guarda de ativação habilitada: resposta normal adicionada exclusivamente nos hosts sintéticos, mantendo testes próprios de pendência/expiração/erro.
2. Consultas de timbrado e marca pública usam POST e eram classificadas como escrita. Fixtures passaram a reconhecer especificamente essas leituras; operações de escrita continuam recusadas.
3. Disco D sem espaço para cache do otimizador. Cache das bancadas direcionado para pasta temporária no disco C; não removidos arquivos locais.
4. Defeito real de novo login: a guarda desmontava Login durante SIGNED_IN, perdendo a indicação de entrada nova e restaurando a rota anterior. Login passou a fixar a dashboard após autenticação bem-sucedida. Isso não concede acesso: guardas e validação de vínculos continuam obrigatórias; F5 conserva a rota solicitada.

## Evidências e limites atuais

- 40 testes unitários direcionados aprovados; tipos, lint completo e build da preparação 0.6.0 aprovados (avisos preexistentes de lint/tamanho do bundle).
- Execuções de interface inicialmente interrompidas/reprovadas pelas causas acima. Não equivalem à aprovação conjunta; reexecução dirigida em andamento.
- Leitura oficial MCP confirmou alvo `xftnkusbyqzyvzrovroj`, RLS nas quatro tabelas consultadas e presença das três RPCs com guardas e search_path restrito. Nenhuma escrita remota, migração ou mudança de Auth.
- Sessões existentes da Proprietária disponíveis nos dois domínios. Conferência autenticada da nova versão ainda pendente. Nenhuma sessão legítima de Recepção foi assumida ou simulada como real.
- Conferência manual anterior dos números de Agenda/Financeiro preservada como prova manual histórica; não prova automaticamente a nova apresentação.
- Configurações 0.5.0 e Acesso Direto 0.4.0 continuam habilitados e suas provas reais anteriores permanecem válidas. As 18 contas/dez contextos fictícios seguem encerrados; nenhum novo recurso criado ou reativado.
- GraphQL permanece ausente e sem homologação funcional. Os recursos integrados usam os serviços REST/RPC existentes; não foi introduzida dependência GraphQL.

## Publicação e recuperação

Preparação 0.6.0, ainda sem commit/push/publicação nesta gravação. Publicar somente depois das verificações dirigidas. Recuperação prevista: revert dos novos commits sobre a branch de publicação e novo push normal, retornando ao comportamento da base 0.5.0, sem rollback de backend ou desligamento das proteções.

TypeSafe consultada integralmente e índice oficial lido; cálculos e controles determinísticos não receberam IA. Triagem Jev somente com texto sintético: code_change, confiança 0,74; complexidade 1,21/2, confiança 0,69 (incerta); falta de informação 0,46 (incerta), resolvida por inspeção do Codex. 843 tokens de entrada/119 de saída, 1,13 s, US$ 0,000035406. Nenhum dado privado ou segredo enviado.

## Resultado final local antes do envio

| Verificação | Resultado | Origem |
|---|---|---|
| Tipos / lint / build / diff-check | Aprovados; avisos preexistentes | Local |
| Unidade: política, leitura, dashboard e Financeiro |40/40| Local determinístico |
| Dashboards administrativas em conjunto |64/64| Browser sintético desktop/mobile |
| Recepção com atualização automática e filtros |41 aprovados/1 ignorado| Browser sintético desktop/tablet/mobile |
| Identidade, convites e recuperação em conjunto |29/29| Browser sintético |
| Acesso Direto: pendência, expiração, sessão antiga, erro |14/14| Browser sintético; não nova homologação real |
| Configurações: rotas, papéis, edição/troca |4/4| Browser sintético |
| Meu perfil: cancelar, identidade, novo login, teclado |4/4| Browser sintético |

A execução inicial108 teve102 aprovações e6 falhas históricas. Não foi declarada aprovada: os cenários afetados foram corrigidos e reexecutados nas suítes conjuntas acima. Interrupções por ambiente/fixtures também permanecem como falhas históricas, não compõem os totais finais. Não aumentados limites de tempo. Depois da última correção da prova de recuperação, a suíte29 foi executada integralmente em revisão estável.

Correção adicional: a guarda observava PASSWORD_RECOVERY antes de App montar. A prova do evento verificado é agora passada em contexto React, somente após estado normal confirmado; nenhum campo de URL ou metadata concede essa prova. Teste de retorno sem prova continua recusando atualização; os14 cenários de bloqueio continuam aprovados.

A revisão do lockfile detectou e corrigiu uma substituição excessiva de número de versão em eciesjs. Comparação estruturada confirmou todas as dependências exatamente iguais à base; apenas as versões da raiz foram incrementadas.
