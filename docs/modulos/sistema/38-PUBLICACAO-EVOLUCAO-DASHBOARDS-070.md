# Publicação da evolução das dashboards — 0.7.0

Estado: PREPARADA, ainda sem commit/push/deploy neste registro. 2026-10-10T14:17:30.403Z.

## Escopo

Integra relatórios35,36,37: análise por período, gráfico diário, comparação proporcional com nomes/valores/barras agrupados, resumo e detalhes, composição corrigida, Brotas azul/Ipupiara verde, identificação restrita da Recepção. Mesmos componentes, consultas e regras; não acrescentado tempo real ou perfil médico.

## Base e preparação

Prévia5190 confirmada pelo processo21644 e script dev-dashboard-acabamento.mjs: root do checkout C resgate-local. HEAD/remoto e ambos bundles públicos confirmados0.6.1/44b13bb639c671b88e4a5f2e26c30ffa269dfbfa. Branch codex/resgate-local-2026-09-26. Não houve avanço remoto. D equipe-fase2/ad493861 preservado; nenhuma sincronização de fontes.

Os25hashes do manifesto37 conferidos antes de preparar. Incremento MINOR0.7.0 por nova funcionalidade, alinhado pacote/lock/notas/initial-version; manifesto Release Please0.0.0 mantido conforme processo em desenvolvimento, sem tag/Release/ativação de workflow. Notas anteriores preservadas. Somente versão mudou nos fontes validados.

## Validação

Provas35/36/37 reutilizadas por correspondência dos hashes:38cenários da composição,7dirigidos do agrupamento e10dirigidos de identidade (conjuntos sobrepostos, não somar como total distinto). Incluem permissões, troca de conta/contexto, duas clínicas, zero/ausência/erro/parcial, lacunas, foco, cores e responsividade. Dados sintéticos limitados a tests; adaptador usa RPC existente e rejeita respostas inválidas, sem valores fictícios de fallback. Serviços/RLS/backend não alterados. Build final será registrado após execução.

## Publicação e recuperação

Processo existente: push único na branch resgate-local, auto-deploy dos dois destinos. Acompanhar versão servida, sem disparo manual duplicado. Logs internos Hostinger ainda não observados. Destinos clinicabrotas.com.br e clinicaipupiara.com.br.

Recuperação de referência:0.6.1/44b13bb639c671b88e4a5f2e26c30ffa269dfbfa. Após obter hash desta entrega, em checkout limpo partir do remoto atual e reverter somente o commit desta release, revisar/buildar e publicar novo commit normal, sem force/reset nem rollback automático; backend permanece intacto. Não repetir backups extensos nem executar a recuperação.

## Exclusões e limites

Sem .env, credenciais, sessões, dumps, capturas pessoais, scripts scratch ou provas antigas não relacionadas. Mudanças locais dos relatórios24/27, evidências anteriores e patch antigo permanecem fora da seleção. Fontes paralelos de Equipe/Caixa/Agenda em D intactos. Nenhuma alteração backend/RLS/banco/DNS/infraestrutura/Auth, SQL/migration/Docker ou dados reais.

TypeSafe consultada: sem integração. Jev só resumo sintético: code_change confiança0,60 incerta, complexidade1,11/2 confiança0,83; Codex definiu o caminho pela autorização e leituras.964tokens,925,411ms,US$0,00003549.

[Manifesto da seleção](publicacao-dashboard-070/manifesto.json); [versões anteriores servidas](publicacao-dashboard-070/antes.json).

## Build final aprovado

Build oficial0.7.0 concluído (notas, TypeScript e Vite). Aviso preexistente de chunk>500kB mantido. Análise sob demanda394,22kB/gzip113,71kB; principal1445,63/gzip409,41. Todos os fontes de produto modificados pertencem aos25caminhos revisados; somente metadados de versão mudaram após os testes anteriores. Configurações e fixture importadas pelos testes já estão rastreadas no Git.
