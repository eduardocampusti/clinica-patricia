# 11 — Migração do frontend financeiro

**Status:** EM VALIDAÇÃO
**Subfase:** FASE 10 — interface operacional do caixa integrada localmente; migração frontend em execução
**Data:** 22/09/2026 — America/Bahia

## 1. Escopo executado

Esta subfase prepara a fronteira TypeScript `React → Supabase Auth → RPC/Data API → PostgreSQL`. Não redesenha as telas, não remove o legado antes da substituição visual e não altera banco, migrations, grants ou RLS.

As RPCs aplicadas nas FASES 3–9 são a fonte técnica de verdade. A camada cliente não recebe papel, usuário ou profissional arbitrário, não calcula snapshots, repasses ou indicadores oficiais e nunca usa `service_role`.

## 2. Inventário do frontend e legado

| Arquivo/área | Responsabilidade / tela | Dependências e fonte atual | Problema encontrado | Classificação e destino |
|---|---|---|---|---|
| `src/lib/supabase.ts` | Cliente oficial compartilhado | `@supabase/supabase-js`, URL e chave pública por Vite | Ambiente atual pode continuar usando a chave anon legada | **REAPROVEITAR**; cliente único mantido e preparado para preferir `VITE_SUPABASE_PUBLISHABLE_KEY`, com fallback compatível para anon |
| `src/lib/api.ts` | Escritas do Financeiro antigo | `fetch`, `VITE_API_URL`, token, headers de clínica/idempotência, Fastify | Gera chave nova dentro de cada chamada; contratos antigos, sete formas, despesas não homologadas e fronteira paralela | **REMOVER FUTURAMENTE** após telas migrarem; nenhuma nova tela financeira deve importar este arquivo |
| `src/pages/Financeiro.tsx` | Caixa, entrada e ações financeiras | Hooks legados, leitura direta e `src/lib/api.ts` | Mistura caixa/entradas legadas com Fastify; soma com `number`; trata sessão antiga como nova | **ADAPTAR** na FASE 10B; manter temporariamente para comparação/rollback visual |
| `src/components/financeiro/FormRegistrarEntrada.tsx` | Entrada usada por Financeiro e Agenda | `registrarEntradaCaixa`; paciente/profissional/valor manual | Sete formas, preço editável, `Number`, não suporta split e pode operar sem agendamento | **SUBSTITUIR** por formulário baseado em agendamento e wrapper `registrarRecebimento` |
| `src/components/financeiro/AcoesFinanceiras.tsx` | Sangria, suprimento, despesa, fechamento, estorno e repasse | Fastify antigo | UUID digitável, despesa fora do modelo homologado, ações compostas incompatíveis e reset após falha | **SUBSTITUIR**; seleções amigáveis e máquinas de estado das RPCs |
| `src/hooks/useSessaoCaixaAberta.ts` | Lê caixa legado aberto | `sessoes_caixa` direto | Ignora erro, considera somente `aberto`, não distingue sessão híbrida/legada e aceita resposta atrasada | **LEGADO AINDA NECESSÁRIO**; substituir por consulta tipada da nova tela |
| `src/hooks/useEntradasCaixa.ts` | Lista `entradas_caixa` | Data API e joins legados | Erro vira vazio, exposição inadequada ao médico no desenho antigo, não representa recebimentos canônicos | **REMOVER FUTURAMENTE** quando a tela usar recebimentos/RPCs homologadas |
| `src/pages/Agenda.tsx` | Abre pagamento ao concluir agendamento | `FormRegistrarEntrada` | Ponto de entrada correto, implementação financeira antiga | **ADAPTAR** preservando o contexto amigável do agendamento; não pedir UUID |
| `src/pages/Dashboard.tsx` | Dashboard geral demonstrativo | Constantes locais | Saldo, entradas, saídas, atendimentos e repasses mockados; calcula 80% com `number` | **SUBSTITUIR** nos blocos financeiros pelas RPCs de dashboard; preservar somente estrutura não financeira útil |
| `src/App.tsx` | Renderiza rotas/telas locais | Estado React | Tela financeira ainda aponta para implementação antiga | **ADAPTAR** somente quando a nova tela estiver pronta |
| `src/components/shell/Sidebar.tsx` | Menu e clínica ativa | Papel e hooks de contexto | Financeiro/Relatórios aparecem sem experiência específica por papel; rótulo fixo de visão proprietária | **ADAPTAR** por UX; autorização continua no banco |
| `src/pages/cadastros/Profissionais.tsx` | Preço e taxa legada | Tabelas/RPC de cadastro | Usa `Number`; taxa por profissional não é a regra financeira atual por clínica | **ADAPTAR**; preço/vínculo podem ser reaproveitados, taxa legada não alimenta novo cálculo |
| `src/lib/financeiroRelatorios.ts` | Geração PDF/XLSX homologada na FASE 9 | `jspdf`, `jspdf-autotable`, `write-excel-file` | Não estava ligado a tela; importação estática seria pesada se usada diretamente | **REAPROVEITAR** sem mover; consumir por wrapper dinâmico |
| `src/lib/financeiroRelatoriosRpc.ts` | Coleta paginada, cursor, drift e auditoria | RPCs da FASE 9 | Mensagem bruta da RPC e executor não injetável para testes | **ADAPTAR**; erro centralizado, cliente carregado sob demanda e executor testável |
| `src/lib/financeiroRelatoriosReconciliacao.ts` | Reconciliação em centavos inteiros | `BigInt` | Nenhum problema estrutural encontrado | **REAPROVEITAR** |
| `src/hooks/useClinicaAtiva.ts`, `useClinicasDoUsuario.ts`, `usePapelNaClinica.ts` | Contexto amigável e UX por papel | Supabase/RLS | Não substituem autorização do banco | **REAPROVEITAR** como contexto de UI |
| `server/src/routes/{caixa,entradaCaixa,estornos,repasses,despesas}.ts` e `server/src/financeiro/*` | Fastify financeiro antigo | PostgreSQL direto, HMAC, `FINANCEIRO_DATABASE_URL` | Arquitetura não homologada e configuração inexistente | **REMOVER FUTURAMENTE** após nova UI e E2E; não apagar junto com partes não financeiras do servidor |
| `server/src/plugins/*`, `server/src/routes/ping.ts` | Auth/contexto e diagnóstico do servidor | Supabase Auth | Podem atender outras responsabilidades | **LEGADO AINDA NECESSÁRIO**; não remover por associação com Fastify financeiro |
| `financeiro_fundacao.sql`, `financeiro_api_privada.sql`, `financeiro_bloqueio_postgrest.sql` | Rascunhos anteriores fora das migrations aplicadas | Roles/HMAC/schema privado antigo | Não representam o banco atual | **REMOVER/ARQUIVAR FUTURAMENTE** após conferência histórica; nunca aplicar como substituição |

Não existe tela final de relatórios, dashboard médico final ou dashboard financeiro administrativo final. A entrada `relatorios` ainda é placeholder.

## 3. Achados objetivos

- Fastify financeiro encontrado somente na fronteira antiga `src/lib/api.ts` + `server/`; não foi reutilizado na nova camada.
- UUID visual encontrado em estorno e pagamento de repasse em `AcoesFinanceiras.tsx`.
- Mocks/demonstração encontrados em `Dashboard.tsx` para saldo, entradas, saídas, atendimentos e repasses.
- Cálculos financeiros em JavaScript encontrados: soma de entradas legadas, percentual fixo de repasse e parsing de moeda com `Number` nos formulários antigos.
- Formas antigas encontradas: débito, transferência, convênio e cortesia. A nova camada expõe somente dinheiro, PIX e cartão de crédito para recebimentos.
- Não existe `database.types.ts` ou equivalente gerado. Os tipos atuais eram manuais e dispersos. Nesta subfase os contratos financeiros foram centralizados e comparados automaticamente com as assinaturas SQL; gerar tipos globais do Supabase exige avaliação separada para não afetar os demais módulos.
- Não existe TanStack Query nem biblioteca equivalente. Nenhuma dependência de cache foi instalada.

## 4. Nova arquitetura TypeScript

Diretório central: `src/lib/financeiro/`.

- `financeiro.types.ts`: domínios, estados, filtros e payloads de dashboards.
- `financeiro.rpc.ts`: executor único, allowlist de RPCs/parâmetros e erro centralizado.
- `financeiro.errors.ts`: tradução de SQLSTATE/mensagens conhecidas sem vazar constraint, stack ou UUID.
- `financeiro.money.ts`: parsing pt-BR, centavos `BigInt`, soma visual e conversão controlada para `numeric` da RPC.
- `financeiro.date.ts`: `timestamptz`, timezone explícita, limite de 366 dias e `[inicio,fim)`.
- `financeiro.idempotency.ts`: chave persistida em `sessionStorage` por intenção; retry da mesma ação reutiliza a chave até conclusão/cancelamento explícito.
- `financeiro.recebimentos.ts`: `financeiro_registrar_recebimento`; envia somente agendamento, componentes permitidos e idempotência.
- `financeiro.caixa.ts`: abertura, suprimento, sangria, início/envio/revisão de fechamento.
- `financeiro.estornos.ts`: solicitação por componentes originais e revisão.
- `financeiro.repasses.ts`: confirmação externa sem recálculo de valor.
- `financeiro.fiscal.ts`: solicitações internas de emissão/cancelamento; não simula resultado externo.
- `financeiro.dashboard.ts`: dashboards separados; o wrapper médico não possui `profissional_id`.
- `financeiro.relatorios.ts`: preserva os arquivos da FASE 9 e carrega geradores PDF/XLSX por `import()`.
- `financeiro.cache.ts`: chaves estáveis e matriz explícita de invalidação.
- `useFinanceiroConsulta.ts`: estados ocioso/carregando/sucesso-vazio/erro, preservação opcional do dado anterior e descarte de resposta obsoleta.

## 5. Idempotência

A chave não nasce dentro do retry de rede. A tela futura cria uma intenção estável, por exemplo `recebimento:<agendamento>` ou `fechamento:<sessao>:<tentativa>`, chama `iniciar()` uma vez e reutiliza o objeto retornado. Só chama `concluir()` após resposta definitiva do banco. Erro de rede mantém a chave. Nova intenção real cria nova chave.

## 6. Cache e invalidação

Como não existe biblioteca de data fetching, a camada não cria cache global. Cada tela futura deve invalidar/recarregar as leituras abaixo depois de sucesso definitivo:

| Mutação | Leituras a atualizar |
|---|---|
| Recebimento | caixa, recebimentos, fiscal, dashboards e relatórios |
| Caixa/fechamento | caixa, repasses, dashboards e relatórios |
| Estorno | caixa, recebimentos, estornos, repasses, dashboards e relatórios |
| Repasse | repasses, dashboards e relatórios |
| Fiscal | fiscal, dashboard da proprietária e relatórios |
| Thresholds | dashboard da proprietária |

Erro nunca é convertido em zero ou array vazio. Resposta atrasada de uma clínica/filtro anterior é descartada pelo hook.

## 7. Relatórios e bundle

Os geradores continuam em `src/lib/financeiroRelatorios.ts`, mas a nova fronteira importa o módulo somente ao solicitar PDF/XLSX. O build inicial não contém ocorrências de `jspdf`, `jspdf-autotable` ou `write-excel-file`; as telas futuras devem importar `financeiro.relatorios.ts`, não o gerador diretamente.

## 8. Segurança do cliente

- Cliente único reutilizado; nenhum segundo cliente criado.
- Frontend usa somente URL e chave pública de baixa permissão; nenhum `service_role`, secret key, URL PostgreSQL ou HMAC foi encontrado no código cliente.
- O cliente agora prefere `VITE_SUPABASE_PUBLISHABLE_KEY` e mantém fallback para `VITE_SUPABASE_ANON_KEY`. Conforme documentação atual do Supabase, `anon` continua compatível, mas deve ser substituída na configuração antes da descontinuação anunciada para o fim de 2026. Nenhuma credencial foi lida, impressa ou alterada nesta subfase.
- Papéis na UI servem somente à experiência. `auth.uid()`, RLS, grants e autorização interna das RPCs continuam sendo a segurança real.
- Nenhuma chamada médica aceita usuário, papel ou `profissional_id`.

## 9. Testes locais

`npm run test:financeiro` cobre:

- dinheiro em centavos e parsing pt-BR;
- intervalo `[inicio,fim)` e offset obrigatório;
- sanitização de erros;
- reutilização da idempotency key;
- transformação do recebimento split;
- ausência de `profissional_id`/papel no dashboard médico;
- rejeição de parâmetro não homologado;
- comparação automática da allowlist TypeScript com as assinaturas finais nas migrations aplicadas;
- paginação, cursor, revalidação e reconciliação;
- cancelamento por drift de marcador.

São testes unitários/contratuais do frontend com executor mockado. Não substituem os testes reais do Supabase já homologados nas FASES anteriores.

## 10. Bloqueios e pendências para as telas

1. A tela genérica antiga registra entrada sem exigir agendamento; a RPC canônica exige agendamento. Não há adaptação segura um-para-um: a nova UX deve começar pela Agenda ou por uma busca amigável de agendamentos elegíveis.
2. O Fastify possui despesas, mas despesas administrativas não fazem parte das FASES 1–9. Não criar equivalente no frontend sem decisão funcional/backend.
3. Não existe RPC aplicada para `financeiro_registrar_complemento`, apesar da menção conceitual no plano. Reagendamento com diferença maior exige fase própria se entrar no escopo visual.
4. Integração fiscal externa permanece bloqueada; o frontend pode apenas solicitar emissão/cancelamento internos.
5. A sessão histórica com `entradas_caixa` exige transição controlada. A nova tela não pode convertê-la ou operar nela.
6. Os tipos globais Supabase não estão gerados. Avaliar geração e impacto em etapa separada.

## 11. Estratégia de remoção do legado

1. Revisar esta camada e contratos.
2. Construir telas novas por papel com seletores amigáveis.
3. Migrar Agenda e operações uma a uma para os wrappers RPC.
4. Executar E2E autenticado, multi-clínica, médico e retry/idempotência.
5. Remover imports de `src/lib/api.ts` do Financeiro.
6. Somente então desativar rotas Fastify financeiras e componentes/hook legados, preservando qualquer uso não financeiro do servidor.

Estado ao final desta subfase: infraestrutura local pronta para revisão; telas antigas preservadas e ainda não convertidas.

## 12. FASE 10B — Agenda → Recebimento

**FASE 10 — Migração frontend: EM EXECUÇÃO**

### 12.1 Escopo e auditoria da Agenda

`Agenda.tsx` representa agendamento com IDs internos, paciente/nome, profissional, horários, estado e observações; clínica/data vêm do contexto da grade. Ações existentes mudam estado clínico ou iniciam atendimento. Diálogos anteriores usavam `ModalBase` local. O formulário antigo `FormRegistrarEntrada` era aberto ao concluir consulta e buscava qualquer sessão aberta, sem distinguir legado.

Esse ponto foi substituído por ação explícita “Receber pagamento” no menu da consulta, exclusiva da proprietária/recepção, nos estados agendado/confirmado/aguardando previstos pela RPC. Concluir atendimento não dispara mais cobrança. `FormRegistrarEntrada` continua disponível no Financeiro antigo; não foi removido globalmente.

### 12.2 Preço, split e confirmação

Preço consultado sob RLS em `profissionais_clinicas.valor_consulta` filtrado por clínica/profissional/vínculo ativo. Não usa `profissionais.valor_consulta` global. Consulta só o preço, sem percentual. A RPC relê e valida a configuração oficial; eventual mudança entre leitura e envio é rejeitada pelo banco.

Formulário recebe somente dinheiro/PIX/cartão de crédito; valor da consulta não é editável. Helpers da FASE 10A convertem texto em BigInt e calculam total/restante/excedente. Revisão só habilita com valores positivos válidos e soma exata. Payload contém apenas agendamento, componentes e idempotency key.

Sucesso mostra exclusivamente valor bruto, parcelas, pagamentos, status e status fiscal retornados. O teste usa parcelas 123,45/376,55 para provar que não existe percentual presumido no React.

### 12.3 Idempotência e erros

`idempotenciaFinanceira` reutilizada com intenção `recebimento:<usuario>:<clinica>:<agendamento>`. Retry conserva a chave e os valores; após primeiro envio a revisão não permite editar componentes. Falha de rede não libera a chave. Sucesso libera pelo gerenciador; falha de storage posterior não transforma pagamento confirmado em erro. Uma nova intenção recebe nova chave.

Trava síncrona via ref impede dois submits antes de renderizar loading. Botão e fechamento ficam bloqueados durante envio; Escape não fecha a operação. Navegação externa durante envio recebe proteção `beforeunload` quando suportada pelo navegador. Não há sucesso otimista.

Mensagens são centralizadas em `financeiro.errors`. Caixa ausente: “Não há um caixa financeiro aberto para esta clínica. Abra o caixa antes de receber pagamentos.” Legado: “Esta clínica possui um caixa antigo ainda em aberto. Ele precisa ser regularizado antes de usar o novo Financeiro.” Preço/configuração ausente, duplicidade, autorização, rede e inesperado não expõem SQL/UUID. Não há mutação prévia para abrir ou regularizar caixa.

### 12.4 Invalidação e indicador

Matriz de recebimento inclui Agenda, recebimentos, caixa, fiscal, dashboards proprietária/profissional e relatórios. `invalidarFinanceiro` publica evento local por clínica; Agenda assina e relê a grade/recebimentos. `useFinanceiroConsulta` aceita assinatura opcional por clínica/leitura para consumidores da camada. Não existe cache global persistido; telas financeiras ainda não migradas não são reimplementadas nem passam a consumir dashboards nesta tarefa.

Indicador “Recebimento registrado” vem de leitura mínima de `recebimentos.agendamento_id` sob RLS ou de resposta confirmada. Não representa um novo status clínico nem presume ausência de estorno. Erro de leitura é mostrado com retry, não convertido silenciosamente em ausência de recebimento. A RPC permanece responsável pela proteção contra duplicidade.

### 12.5 UX e acessibilidade

`ModalBase` extraído para reutilização pelos diálogos da Agenda, com `<dialog>` nativo, nome acessível, foco inicial no título, Tab/Shift+Tab contidos, Escape controlado e restauração ao botão do agendamento mesmo após sua recriação por refetch. Backdrop não descarta formulário. Tokens e tipografia do design system v3 preservados; contraste do CTA usa os tokens de texto/superfície. Campos de 48px, `inputMode=decimal`, labels e mensagens associadas; layout sem overflow horizontal no diálogo.

Contexto visual existente foi consolidado em `PRODUCT.md` ao usar a skill Impeccable; não redefine produto ou design system.

### 12.6 Arquivos desta etapa

- `src/pages/Agenda.tsx`: ponto de entrada, remoção da integração legada desta página, consultas e indicador.
- `src/components/ModalBase.tsx`: extração e acessibilidade do diálogo já existente.
- `src/components/financeiro/ReceberPagamento.tsx`: formulário/revisão/processamento/resultado.
- `src/lib/financeiro/financeiro.agenda.ts`: leitura mínima de preço/recebimentos e elegibilidade visual.
- `src/lib/financeiro/financeiro.errors.ts`: mensagens de caixa e configuração.
- `src/lib/financeiro/financeiro.cache.ts`: eventos e Agenda na matriz.
- `src/hooks/useFinanceiroConsulta.ts`: assinatura de invalidação; função padrão estável para evitar refetch infinito por identidade de callback.
- `package.json`, `package-lock.json`: Playwright de desenvolvimento e script `test:financeiro:10b`.
- `tests/financeiro/{index.html,agenda.tsx,vite.config.ts,playwright.config.ts,recebimento.spec.ts}`: harness/testes locais, fora do bundle principal.
- `PRODUCT.md`, documentos financeiros `00`, `01`, `07`, `08`, `11`: contexto, decisão aprovada, execução e evidências.
- `scratch/financeiro-10b-screenshots/`: screenshots sintéticos inicial/split/erro/sucesso em três viewports.

### 12.7 Limites e próximos passos

Operação em clínica com sessão legada aberta continua bloqueada. Não foi executado pagamento contra o remoto, nem usado paciente real. Testes da FASE 10B são integração frontend no navegador com HTTP interceptado; não substituem homologação SQL das fases anteriores nem alegam novo E2E remoto.

Fluxo usa `React → registrarRecebimento → financeiro_registrar_recebimento`, independente do Fastify. Demais telas, despesas, estornos, repasses, fiscal externo, relatórios na UI e remoção global do legado ficam fora do escopo. Não houve banco, migration, deploy ou commit. Próximo passo é revisão desta etapa.

### 12.8 Validação executada

- `npm run test:financeiro`: **10/10 aprovados**.
- `npm run test:financeiro:10b`: **48/48 aprovados** (16 cenários × desktop 1440×1000, tablet 820×1180, mobile 390×844), Chrome. Runner terminou com código 0 após encerrar especificamente o Vite sintético que ficou retido no teardown do Windows neste ambiente.
- Cobertura: PIX 500; split dinheiro 200 + PIX 300; 499,99 incompleto; 500,01 excedente; duplo clique; loading/fechamento/Escape; retry e mesma chave; valores retornados pelo banco; erros de caixa ausente/legado, duplicidade/configuração; médico bloqueado; proprietária autorizada; preço do vínculo ausente; indicador de recebimento independente; estado clínico inelegível; foco contido/retornado. O teste integrado começa na Agenda real e percorre o wrapper real até a resposta HTTP mockada.
- Primeira rodada revelou falhas de foco após refetch e Tab no limite do diálogo; ambas corrigidas e comprovadas na rodada final.
- `npm run build`: **aprovado**, JS principal 582,98 kB / gzip 147,94 kB. Warning de chunk >500 kB já existente; novo aviso `INEFFECTIVE_DYNAMIC_IMPORT` porque o cliente Supabase único também é importado estaticamente pelo app. Não significa cliente duplicado nem afeta funcionamento.
- `npm run lint`: **aprovado**, somente warning preexistente de Fast Refresh em `src/theme/ThemeProvider.tsx:102`.
- `git diff --check`: sem erros de whitespace, avisos de conversão de finais de linha em arquivos já modificados.
- `npm audit`: apontou advisory em `nanoid` propagado por `postcss`/Vite e plugins (cinco entradas high na cadeia de desenvolvimento); nenhuma correção automática de dependências fora do escopo.
- Screenshots: 12 PNGs sintéticos em `scratch/financeiro-10b-screenshots/`, nomes `{desktop,tablet,mobile}-{inicial,split,erro,sucesso}.png`. Revisão visual confirmou labels, valores legíveis, foco visível, CTA acessível e ausência de scroll horizontal no diálogo; no mobile o resumo foi compactado em duas colunas para acomodar o formulário.
- Hashes das migrations FASES 8/9 conferidos e preservados: `4217009DDB6D2F657A7329FD4DB15B9BF953FBE476857BD4967246FAA4B79E48` e `80559457C4C00CA66F5C91EBB269D13FE5994ED45B4C73D333E73F2DF10B056C`.

FASE 10B entregue para revisão local. FASE 10 completa permanece EM EXECUÇÃO.

## 13. FASE 10C — Caixa operacional (auditoria histórica)

**Estado naquela auditoria:** implementação bloqueada por ausência de contrato público de leitura do resumo oficial. FASE 10B aprovada pelo usuário na solicitação desta etapa. O estado atual da RPC consta na seção 14.2.

**FASE 10 — Migração frontend: EM EXECUÇÃO**

### 13.1 Auditoria e destino dos componentes

| Área | Estado encontrado | Destino planejado |
|---|---|---|
| `src/pages/Financeiro.tsx` | Abre caixa via Fastify, converte texto com Number, apresenta entradas legadas e ações antigas | Substituir como fluxo principal somente quando a leitura oficial estiver disponível; preservar código anterior deprecated fora da navegação |
| `src/components/financeiro/AcoesFinanceiras.tsx` | Suprimento/sangria como movimento direto; fechamento antigo imediato; despesas, UUID de estorno/repasse; formulário limpo mesmo após erro | Substituir apenas operação de caixa por etapas homologadas; não implementar os demais domínios |
| `src/hooks/useSessaoCaixaAberta.ts` | SELECT apenas status aberto, erro ignorado, sem proteção de resposta obsoleta | Substituir pela consulta operacional com estados e erro explícito |
| `src/hooks/useEntradasCaixa.ts` | SELECT de entradas_caixa, joins de nomes, erro vira vazio | Manter somente no legado; nunca usar como recebimentos novos |
| `src/lib/api.ts` | Fronteira HTTP Fastify, chave gerada por chamada | Não usar na nova tela; preservar outros consumidores |
| `src/lib/financeiro/financeiro.caixa.ts` | Oito wrappers de mutações homologadas | Reaproveitar integralmente |
| Helpers dinheiro/idempotência/erros/cache + useFinanceiroConsulta | Infraestrutura FASES 10A/10B | Reaproveitar; sem soma oficial no cliente |
| `src/components/ModalBase.tsx` | Diálogo compartilhado acessível da FASE 10B | Reaproveitar para confirmações críticas |
| Contexto clínica/papel e tokens do design system | Seleção de clínicas autorizadas e UX por papel | Reaproveitar; autorização continua no banco |

### 13.2 Evidências do bloqueio

Consulta somente de catálogo executada no projeto vinculado `xftnkusbyqzyvzrovroj` em 22/09/2026, usando `scratch/financeiro-10c-catalogo-leitura.sql`. Confirmadas as oito RPCs públicas informadas e o helper `private.financeiro_calcular_caixa(uuid)` com `authenticated_execute=false`. Nenhuma função financeira foi executada e nenhum dado de paciente foi consultado.

As migrations homologadas explicam o alcance:

- FASE 4: helper calcula o resumo, mas revoga privilégios para PUBLIC/anon/authenticated.
- FASE 5: helper atualizado desconta estornos em dinheiro; continua privado. O total de estornos é variável interna e não integra separadamente seu retorno atual.
- `financeiro_iniciar_fechamento` retorna sessão, status e nova_operacao; não retorna resumo.
- `financeiro_enviar_fechamento` calcula e grava esperado/contado/diferença e snapshots **depois** do envio. Usar essa escrita para obter uma prévia alteraria a sequência aprovada.
- Dashboard da proprietária retorna contagens de estados e diferenças de fechamentos aprovados; não é resumo corrente por sessão e não atende à recepção.
- Leitura de fechamentos anteriores fornece snapshots históricos, não o saldo corrente de uma sessão ainda aberta ou de uma correção que exija novo cálculo.

Portanto, naquela auditoria, os requisitos de resumo oficial aberto, conferência anterior ao envio e justificativa condicional não podiam ser concluídos usando apenas os contratos então disponíveis, sem recalcular saldo no frontend ou acrescentar backend. Ambas as alternativas estavam fora da autorização daquela etapa.

Valores de revisão já confirmados no SQL: sangria `aprovar`/`rejeitar`; fechamento `aprovar`/`devolver` (observação integra a ação, não existe enum separado para aprovar com observação). Não se deve inventar `devolver` para sangria.

### 13.3 Proposta histórica para desbloqueio — substituída pelo contrato da seção 14

Preparar em etapa separada um contrato público somente de leitura, por exemplo `financeiro_consultar_caixa(p_clinica_id uuid)`. Nome/retorno são proposta, não API existente.

O contrato deve:

1. Derivar identidade via auth.uid(), exigir usuário/clínica/vínculo ativos e papel proprietária ou recepção; negar médico/anon e clínica não autorizada.
2. Identificar sessão operacional sem hardcode; informar legado incompatível sem executar ou alterar operações nele.
3. Entregar resumo consistente calculado no banco: abertura, dinheiro, PIX, cartão, total recebido, suprimentos, sangrias efetivadas, estornos em dinheiro e valor esperado. Reutilizar a regra homologada; não duplicá-la no React.
4. Entregar estado, responsável e horário, sangrias com estados reais e última tentativa de fechamento por ordem determinística, com snapshots/justificativa/revisão necessários.
5. Definir representação distinta de caixa fechado, legado, sucesso com zeros reais e falha. Retornar apenas dados operacionais necessários.
6. Manter helper privado sem grants a clientes; se SECURITY DEFINER, search_path=pg_catalog e autorização interna. Sem escrita, auditoria de mutação ou alterações no legado.
7. Ser revisado e testado quanto a multi-clínica, papéis, estados, estornos, última tentativa, zeros e concorrência antes da integração visual.

Nenhuma migration ou implementação desse contrato foi criada. Sua preparação/aplicação exige ampliação explícita do escopo; aplicação nunca está implícita na aprovação de preparação.

### 13.4 Entrega da auditoria histórica

Auditoria, assinaturas, permissões e lacuna confirmadas. Documentos 00/07/08/11 atualizados. Frontend, wrappers, rotas, Fastify e legado permanecem como estavam no início desta etapa; nenhuma tela parcial foi apresentada como caixa operacional homologado.

Testes unitários/integração específicos, build/lint e screenshots da FASE 10C não foram executados ou produzidos, pois não houve implementação. Evidências da FASE 10B permanecem históricas e não são reapresentadas como validação da FASE 10C.

Nenhuma migration, DDL/DML remoto, operação financeira persistente, fechamento do legado, fixture ou commit. Único SQL remoto: SELECT de metadados. Estornos UI não iniciados. Próximo passo: decidir a etapa de leitura oficial necessária para retomar o fluxo solicitado.

## 14. FASE 10C — RPC mínima: preparação e aplicação

**FASE 10 — Migração frontend: EM EXECUÇÃO**
**Registro da preparação:** FASE 10C aguardava RPC de leitura do caixa. **Estado atual:** RPC aplicada e validada; interface pendente (seção 14.2).

Decisão aprovada: **FASE 10C bloqueou corretamente porque o frontend não possuía fonte oficial de leitura do resumo do caixa. A correção proposta é uma RPC de leitura mínima, sem cálculo financeiro no React.** A autorização inicial abrangia somente preparação local e substituiu a proposta por clínica da seção 13 por parâmetro único de sessão. A aplicação foi autorizada depois, conforme seção 14.2.

- CLI utilizada: `supabase migration new financeiro_fase10c_resumo_caixa`.
- Arquivo: `supabase/migrations/20260922181438_financeiro_fase10c_resumo_caixa.sql`.
- SHA-256: `153738A292F4EF10CDE775D84C8D2E976122CBEF7BD3B28D7D2CCD7CC4075F8E`.
- Assinatura: `public.financeiro_resumo_caixa(p_sessao_caixa_id uuid) returns jsonb`.
- Uma função nova, PL/pgSQL, STABLE, SECURITY DEFINER, search_path=pg_catalog. Sem tabela/view/trigger, snapshot persistente ou alteração de função existente.
- auth.uid() obrigatório; usuário existente/ativo; clínica ativa; vínculo ativo de proprietária/recepção. Médico, outra clínica e vínculos/usuários inativos rejeitados. NULL: 22023; sessão inexistente: P0002; autorização: 42501; sem identidade: 28000.
- Autorização antecede inspeção do legado e retorno de dados. Existência de qualquer entradas_caixa na sessão gera erro 22023; nenhum UUID hardcoded.
- Retorno: sessao_caixa_id, clinica_id, clinica_nome, status, aberto_em, aberto_por_nome e resumo. Nenhum identificador de usuário, CPF, hash ou dado clínico.
- Resumo reaproveita integralmente os dez campos de private.financeiro_calcular_caixa. Acrescenta total_estornos_dinheiro pela mesma base SQL da FASE 5: movimentos da sessão/tipo estorno, estornos efetivados e componentes dinheiro. Não desconta novamente do valor_esperado. PIX/cartão não entram no dinheiro físico esperado.
- STABLE mantém a leitura das consultas no snapshot da instrução chamadora. Resumo é posição corrente, não substitui snapshots históricos de fechamento nem garante saldo futuro após outra transação.
- REVOKE ALL da RPC para PUBLIC/anon/authenticated e GRANT EXECUTE apenas authenticated. Nenhum grant, alteração ou exposição do helper privado; roteiro futuro verifica seus ACLs.
- Roteiro: `database/tests/financeiro/20260922_fase10c_resumo_caixa.sql`, com fixtures sintéticas, papéis reais via SET LOCAL ROLE, zeros/abertura, split, suprimento, sangria solicitada/aprovada/efetivada, estorno dinheiro/PIX, estados, privacidade e ausência de efeitos de leitura. Finaliza com SET CONSTRAINTS ALL IMMEDIATE e ROLLBACK. **Preparado, não executado.**
- Revisão estática: assinatura, allowlist, autenticação/autorização, ordem dos checks, consulta de estorno comparada ao helper e ausência de DML na função. `git diff --check` executado. Parser PostgreSQL local não encontrado (pglast ausente); compilação e testes reais permanecem pendentes e não são alegados como aprovados.
- Nenhum SQL remoto, push, dry-run, alteração de migrations anteriores, frontend, helper, caixa legado ou commit nesta preparação.

Próximo passo: revisão do arquivo e do SHA acima. Preparação local não autoriza aplicação.

### 14.1 Preflight autorizado — bloqueio de autenticação naquela execução

SHA obrigatório reconfirmado: `153738A292F4EF10CDE775D84C8D2E976122CBEF7BD3B28D7D2CCD7CC4075F8E`. Hashes das migrations anteriores comparados ao baseline local e intactos. Uma única função pública nova, somente leitura, helper e grants privados inalterados. Identidade validada antes da busca da sessão; autorização antecede legado, cálculo e retorno. Dez valores oficiais vêm do helper. Índice único de movimento por estorno e unicidade de componente por estorno/forma na FASE 5 impedem multiplicação do JOIN.

Assertion explícita adicionada ao roteiro: esperado = abertura + dinheiro + suprimentos - sangrias - estornos em dinheiro, conforme fórmula oficial. Roteiro não executado; migration e SHA inalterados. Diff-check sem erros.

SELECT preparado em `scratch/financeiro-10c-preflight.sql`. Execução remota impedida antes do comando: revisão automática não pôde completar porque o refresh token foi revogado, solicitando novo login. Não foi determinação de insegurança do SQL e não houve contorno do controle.

Histórico, ausência da RPC, ACLs, contagens e legado **não reconfirmados remotamente nesta execução**. Help de push e dry-run pendentes; nenhuma aplicação, fixture ou roteiro executado. Retomar após restabelecer autenticação; não solicitar aplicação antes do dry-run limpo.

### 14.2 Aplicação autorizada e validação da RPC

Em 22/09/2026, após autorização específica do usuário, o SHA-256 foi reconfirmado como `153738A292F4EF10CDE775D84C8D2E976122CBEF7BD3B28D7D2CCD7CC4075F8E`. O projeto vinculado era `Clinica Patrícia` (`xftnkusbyqzyvzrovroj`, `ACTIVE_HEALTHY`). O dry-run listou exclusivamente `20260922181438_financeiro_fase10c_resumo_caixa.sql`, com `seeds=[]` e `roles=[]`. O comando `supabase db push --linked --yes` aplicou somente essa migration; não foi um `git push`. O histórico remoto a confirma como última versão e o catálogo confirma uma função nova, `public.financeiro_resumo_caixa(uuid)`.

A RPC retorna `jsonb`, é `STABLE`, `SECURITY DEFINER`, `search_path=pg_catalog` e concede `EXECUTE` apenas a `authenticated`; `PUBLIC` e `anon` não executam. O helper `private.financeiro_calcular_caixa(uuid)` permaneceu sem `EXECUTE` para clientes. O roteiro `database/tests/financeiro/20260922_fase10c_resumo_caixa.sql` passou no remoto com código 0, incluindo a assertion da fórmula `abertura + dinheiro + suprimentos - sangrias - estornos em dinheiro`, papéis, estados, split, estorno e ausência de efeitos de leitura. Fixtures sintéticas foram revertidas pelo `ROLLBACK` do roteiro.

Após o teste, as 16 tabelas operacionais verificadas permaneceram vazias, as três configurações financeiras-base foram preservadas e nenhuma identidade, clínica ou paciente sintético permaneceu. A única sessão legada continuou `aberto`, com abertura de R$ 150,50, duas entradas e total de R$ 1.000,00. O cache local opcional da CLI em Docker falhou após a aplicação; o comando terminou com código 0 e a aplicação foi confirmada diretamente no histórico e catálogo. Na etapa de aplicação não houve Git push, commit, seed global, reset ou alteração no frontend. A FASE 10C de banco está validada; a interface do caixa ainda não foi implementada naquela etapa.

## 15. FASE 10 — Interface operacional do caixa (execução local posterior à RPC 10C)

A rota Financeiro em `App.tsx` aponta agora para `FinanceiroCaixa.tsx`; a tela anterior continua no repositório, fora da navegação. O fluxo novo lê a sessão ativa via Data API sob RLS, separa a sessão histórica pela ausência da chave de idempotência e consulta a RPC 10C por ID de sessão. A RPC ainda rejeita qualquer sessão que contenha `entradas_caixa`. Não há hardcode do UUID legado nem cálculo de saldo oficial no React.

Para proprietária/recepção, a tela apresenta os onze valores do resumo oficial, status, responsável e horário da sessão, sangrias e última tentativa de fechamento. A revisão devolvida apresenta sua orientação. Médico não aciona as leituras administrativas. Abertura, suprimento, sangria (solicitar, revisar e efetivar) e fechamento (iniciar, enviar e revisar) chamam somente os wrappers da FASE 10A. Valor contado é comparado ao esperado da RPC para exigir justificativa visual, mas o banco recalcula e valida no envio. Os controles seguem os estados reais; encerramento com sangria pendente é bloqueado também no banco.

As ações com chave idempotente preservam valores e chave após erro de rede; retry usa a mesma tentativa. Cancelamento explícito abandona a tentativa local. Não há sucesso otimista. Erros de consulta são visíveis e podem ser repetidos. A antiga soma de `entradas_caixa` e o Fastify não são usados pela nova rota. A sessão legada segue aberta e inacessível para operações novas; não foi migrada ou encerrada.

Validação: 11 testes unitários/contratuais, 8 testes Playwright com HTTP sintético interceptado em desktop/mobile, build e lint aprovados. O teste de navegador cobre legado, médico sem acesso, abertura, leitura do resumo e suprimento. Capturas `scratch/financeiro-caixa-{desktop,mobile}.png` foram revisadas; o contraste do botão principal foi corrigido. Nenhum teste autenticado contra o Supabase real foi executado nesta etapa; portanto, a migração integral da FASE 10 não está homologada. Próximos trabalhos independentes: ampliar testes dos demais estados/ações, concluir as interfaces de estornos, repasses, fiscal interno, dashboards e relatórios, depois validar E2E e planejar a desativação do legado conforme as dependências da FASE 11.
