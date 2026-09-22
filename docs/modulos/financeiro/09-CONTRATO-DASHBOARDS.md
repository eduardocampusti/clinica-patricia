# 09 — Contrato de dados dos dashboards — FASE 8

**Status atual (22/09/2026):** FASE 8 aplicada e homologada no Supabase; interface dos painéis da proprietária e do médico integrada localmente na FASE 10, com testes sintéticos aprovados. E2E autenticado remoto do frontend ainda pendente. As seções de preparação abaixo preservam o histórico anterior à aplicação.
**Migration:** `20260922015417_financeiro_fase8_dashboards.sql`, timestamp do CLI em UTC.
**Fontes funcionais:** documentos 01, 02, 04 e pedido autorizado da FASE 8.

## 1. Fronteira e contrato temporal

Três RPCs públicas, retornando `jsonb`:

- `financeiro_dashboard_proprietaria(p_inicio timestamptz, p_fim timestamptz, p_clinica_id uuid = NULL, p_profissional_id uuid = NULL, p_paciente_id uuid = NULL, p_forma_pagamento text = NULL, p_status_recebimento text = NULL, p_status_repasse text = NULL, p_status_fiscal text = NULL, p_timezone text = 'America/Bahia')`.
- `financeiro_dashboard_profissional(p_inicio timestamptz, p_fim timestamptz, p_clinica_id uuid = NULL, p_timezone text = 'America/Bahia')`.
- `financeiro_configurar_alertas(p_clinica_id uuid, p_limites jsonb)`.

Período obrigatório, finito, início menor que fim: `[inicio, fim)`. Comparações são entre instantes `timestamptz`. Cliente deve enviar offset explícito/UTC. Limite técnico de 366 × 86400 segundos por consulta, não um threshold financeiro. `p_timezone` controla exclusivamente os dias das séries e labels; default atual `America/Bahia`. É validado contra `pg_timezone_names`, e cada `timestamptz` é convertido explicitamente antes do agrupamento. A timezone da sessão não participa das fórmulas nem dos dias.

Retorno tem `versao=1`, período, `consultado_em` (timestamp da transação), `timezone_series`, `clinicas_autorizadas`, `escopos` e `resumo`. Consultas `STABLE` mantêm uma fotografia consistente durante a chamada. Estados são **atuais**, não reconstrução do estado existente em `p_fim`. O período não é um fechamento contábil imutável.

## 2. Domínios dos filtros — proposta técnica explícita para revisão

Não se atribui saldo integral de repasse/caixa a um paciente nem se inventa rateio de ajuste por item. Por isso, filtros têm domínios distintos, indicados também no campo `escopos` da resposta:

| Bloco | Data que seleciona a população | Filtros aplicados |
|---|---|---|
| Produção / pagamentos / séries da produção | `recebimentos.registrado_em` | Clínica, profissional, paciente, forma, status de recebimento e status fiscal; **não** status de repasse |
| Estornos-evento / sua série | `estornos.efetivado_em` | Clínica e filtros do recebimento de origem; **sem** restringir a data desse recebimento |
| Fiscal | `recebimentos.registrado_em` | Filtros da produção; estado atual do documento da coorte |
| Repasses gerados / lista | `repasses.gerado_em` | Clínica, profissional e status de repasse |
| Repasses pagos no período | `repasses.confirmado_em` | Clínica e profissional; somente status atual `pago` |
| Estoque atual de repasses pendentes / idade | Sem recorte temporal | Clínica e profissional; somente status atual `pendente` |
| Saldo de ajustes negativos | Sem recorte temporal; estoque atual | Clínica e profissional apenas |
| Caixa operacional atual | Sem recorte temporal | Clínica apenas |
| Caixas aprovados / diferenças no período | `sessoes_caixa.fechado_em` | Clínica apenas |
| Percentual de estorno | Coorte da produção por clínica | Todos os filtros da produção |

`repasses_pagos_periodo` e `valor_repasses_pagos_periodo` são movimento por `confirmado_em`, portanto incluem repasse gerado antes. `repasses_gerados_periodo` é outra métrica, por `gerado_em`. O estoque de repasses pendentes e o de ajustes pode continuar diferente de zero em período sem produção: isso não é erro nem produção do período.

`p_forma_pagamento` é filtro de **coorte de recebimentos**, implementado por `EXISTS`, nunca JOIN antes da agregação. Exemplo: R$ 200 dinheiro + R$ 300 PIX selecionado por dinheiro ou PIX continua um único recebimento de bruto R$ 500, clínica R$ 100 e profissional R$ 400: não há rateio retrospectivo de snapshots por forma. Já `resumo.pagamentos` soma exclusivamente componentes; para esse exemplo mostra dinheiro R$ 200 e PIX R$ 300. Filtro fiscal usa documento da mesma clínica. Status de repasse não altera produção/fiscal/estorno: filtra apenas blocos de repasse. IDs de profissional/paciente sem correspondência autorizada retornam produção vazia, sem revelar existência em outra clínica. Estado/forma/timezone inválidos retornam `22023`.

**Ponto de revisão:** se o produto desejar futuramente filtros globais sobre saldos de caixa ou rateio de repasses por paciente/forma, exige decisão funcional específica. Não aplicar esses filtros silenciosamente nem recalcular isso no frontend.

## 3. Métricas exatas — proprietária

Seja `C` a coorte de recebimentos autorizados e filtrados no período. Para cada recebimento `r`, `E(r)` são todos os estornos **efetivados** vinculados, inclusive posteriores ao fim. Estornos solicitados, aprovados ou rejeitados não entram.

| Campo em `resumo.producao` | Definição |
|---|---|
| `quantidade` | COUNT de recebimentos em C; não conta agendamentos sem recebimento |
| `pacientes_distintos` | COUNT DISTINCT `paciente_id` em C |
| `bruto` | SUM `r.valor_bruto` |
| `clinica_bruta` / `profissional_bruta` | SUM dos respectivos snapshots em r |
| `estornos_coorte` | SUM `E(r).valor_total` |
| `estornos_clinica` / `estornos_profissional` | SUM dos respectivos snapshots de E(r) |
| `liquido_atual_coorte` | bruto − estornos_coorte |
| `clinica_liquida` / `profissional_liquida` | snapshot bruto da parcela − estornos da mesma parcela |

`resumo.estornos_periodo`: `quantidade`, `total`, `clinica`, `profissional` exclusivamente de eventos `efetivado_em ∈ [inicio,fim)`, inclusive de recebimentos anteriores. **Não subtrair este total do bruto da coorte**: as populações são diferentes.

`resumo.pagamentos`: somas brutas `dinheiro`, `pix`, `cartao_credito` de `recebimentos_pagamentos` da coorte. Nunca `movimentos_caixa.valor`. Estornos não reescrevem os componentes originais.

`resumo.repasses`:

- `repasses_gerados_periodo` e `valor_liquido_repasses_gerados_periodo`: quantidade e `SUM(valor_liquido)` da coorte `gerado_em`.
- `repasses_ajustados_gerados_periodo`: quantidade na mesma coorte cujo estado atual é `ajustado`.
- `repasses_pagos_periodo` e `valor_repasses_pagos_periodo`: quantidade e valor líquido de repasses atualmente `pago` com `confirmado_em` no período. Não são substitutos dos gerados.
- `repasses_pendentes_atual` e `valor_repasses_pendentes_atual`: posição atual, sem data, de `pendente` autorizado.
- `aplicacoes_ajustes_periodo`: `SUM(aplicacoes_ajuste_repasse.valor_aplicado)` por `created_at` no período; é evento de aplicação.
- `aplicacoes_provisorias_repasses_gerados_periodo` e `aplicacoes_compensadas_repasses_gerados_periodo`: fotografia dos repasses gerados no período, separando estado pendente de terminal. Não chamar reserva provisória de compensação definitiva.

`resumo.ajustes`: entre `pendente`/`parcialmente_aplicado`, sem data limite, `quantidade_pendente`, `valor_pendente_atual = SUM(abs(valor) - valor_aplicado)` (positivo) e `saldo_contabil_negativo_pendente = -valor_pendente_atual`. Não subtrair novamente ajustes da produção líquida: o estorno de origem já afetou a parcela profissional. Conferir conservação da FASE 6 entre itens, repasses e aplicações no teste.

`resumo.fiscal`: sete chaves, sempre presentes com zero quando ausentes: `pendente`, `emissao_solicitada`, `emitida`, `erro_emissao`, `cancelamento_solicitado`, `cancelada`, `erro_cancelamento`. Contagem de documentos associados à coorte, não de tentativas. Solicitação nunca equivale a emissão/cancelamento concluído.

`resumo.caixa.situacao_operacional_atual`: estoque sem recorte temporal de `aberto`, `em_fechamento`, `aguardando_aprovacao`, `devolvido_para_correcao`. `resumo.caixa.aprovados_periodo`: sessões atualmente aprovadas por `sessoes_caixa.fechado_em ∈ [inicio,fim)`, com `quantidade`, `fechamentos_com_diferenca`, `diferenca_total`, `diferencas_positivas` e `diferencas_negativas`. Diferenças usam **uma única última tentativa por sessão**, maior `tentativa`; uma tentativa devolvida anterior substituída por tentativa aprovada não continua alerta nem soma ocorrência antiga. Não são saldo disponível nem movimentação de dinheiro.

## 4. Séries e agrupamentos

`resumo.series` é array ordenado por `dia`: `bruto`, `liquido_atual_coorte`, `clinica_bruta`, `profissional_bruta`, `clinica_liquida`, `profissional_liquida`, `estornos_eventos`, `estornos_eventos_clinica`, `estornos_eventos_profissional`. Valores da coorte agrupam pelo dia do recebimento; eventos pelo dia de efetivação. Há linhas somente para dias com produção ou evento. Período inteiramente vazio retorna `[]`; UI futura pode completar dias com zeros, sem alterar fórmulas.

`por_clinica`: clínica, nome e resumo completo (sem séries/listas/alertas repetidos), incluindo repasses, fiscal e caixa. Clínica autorizada sem dados retorna zeros; estoque de ajuste permanece atual. `por_profissional`: ID interno, nome e resumo de produção, estornos, pagamentos, repasses, ajustes; nunca caixa/fiscal por profissional. Inclui profissionais com produção, estorno-evento, repasse no período ou ajuste pendente nas clínicas autorizadas. Filtros adicionais podem zerar sua produção, preservando seu resumo de repasse/estoque.

Totais monetários e contagens de registros somam entre clínicas. `pacientes_distintos` é `COUNT(DISTINCT paciente_id)` dos registros do modelo atual: não afirma pessoa única global entre clínicas, não usa CPF e não expõe CPF. Não é aditivo entre profissionais/clínicas; total é a união de IDs, nunca soma dos cartões. As fixtures testam paciente compartilhado entre médicos. Total consolidado não é calculado a partir dos primeiros 100 elementos exibidos.

## 5. Médico e segurança

RPC médica não aceita `profissional_id`. Identidade única ativa por `profissionais.usuario_id = auth.uid()`; identidade ausente/ambígua é negada. Exige usuário ativo, profissional ativo, clínica ativa, vínculo ativo em `profissionais_clinicas` **e** vínculo `medico` ativo em `usuarios_clinicas`. Clínica explícita sem autorização retorna `42501`; NULL consolida a interseção dos vínculos válidos. Proprietária precisa usuário/clínica/vínculo `proprietaria` ativos; recepção não chama nenhum dashboard.

Médico recebe exclusivamente próprio `resumo.producao`, estornos-evento, pagamentos, repasses, ajustes e série. As mesmas fórmulas usam apenas seus recebimentos, inclusive parcelas clínica/profissional desses recebimentos. Não recebe receita de outros médicos, caixa, diferenças, fiscal, alertas nem auditoria geral; não consulta o helper administrativo.

`lista_repasses` médica: `id` técnico, `data=gerado_em`, clínica/nome, `valor_bruto_profissional`, `valor_estornos_antes_pagamento`, `valor_ajustes_aplicados`, `valor_liquido`, `status`, `confirmado_em`, `meio_pagamento`. Ordenação por data/ID decrescente. No máximo 100; `lista_repasses_total` informa o total e `lista_repasses_limite=100`. Não é relatório completo. Não há RPC de detalhes paginados nesta fase; poderá ser criada quando necessária.

Breakdowns e alertas também limitados a 100, com total e limite explícitos. Nunca apresentar lista truncada como completa. Resumos e séries não são truncados. UUIDs são referências internas para ligação, nunca textos de interface.

Dashboards públicos são `SECURITY DEFINER`: médico não tem acesso direto a estornos; escopo depende de vínculos legados e agregadores privados não concedidos aos clientes. Escopo é construído internamente antes das consultas. `auth.uid()`, `search_path=pg_catalog`, referências qualificadas e ausência de SQL dinâmico. Agregadores privados `SECURITY INVOKER` executam somente dentro da fronteira privilegiada; nenhum EXECUTE para PUBLIC/anon/authenticated. Helper de escopo e trigger de auditoria são DEFINER privados também sem EXECUTE comum. Sem views nem ampliação dos grants das tabelas canônicas.

## 6. Configuração de alertas

Única tabela nova: `configuracoes_alertas_financeiros`, PK/FK `clinica_id`, autor/data da última alteração. Valores monetários e percentuais são `numeric`; os quatro thresholds de idade são `integer`; todos nullable. Nenhuma linha inicial/seed; ausência equivale a todos NULL. Não replica saldo, série ou alerta.

| Chaves do PATCH | Unidade / validação |
|---|---|
| `caixa_atencao`, `caixa_critico` | reais absolutos, finitos, >= 0, no máximo 2 decimais, sem arredondar entrada inválida |
| `repasse_dias_atencao`, `repasse_dias_critico` | dias inteiros >= 0 e finitos |
| `fiscal_dias_atencao`, `fiscal_dias_critico` | dias inteiros >= 0 e finitos |
| `estornos_percentual_atencao`, `estornos_percentual_critico` | percentual entre 0 e 100 |

Sempre atenção <= crítico se ambos definidos. Strings numéricas, NaN/Infinity, campos desconhecidos ou tipos não numéricos são rejeitados. NULL desativa somente aquela prioridade. Zero é escolha explícita válida da proprietária, não default. `p_limites` é PATCH: chave ausente preserva; null limpa. Lock da clínica serializa concorrência, inclusive primeira configuração. Retry do mesmo estado é no-op sem nova auditoria; não requer chave de idempotência, pois não é evento monetário.

RLS para leitura da proprietária ativa das próprias clínicas. `anon` sem acesso; `authenticated` somente SELECT sujeito à policy. INSERT/UPDATE/DELETE/TRUNCATE comuns revogados. Escrita somente pela RPC administrativa, com revalidação interna; trigger audita toda INSERT/UPDATE em `eventos_auditoria_financeira`, anterior/novo/autor/clínica/data. DELETE bloqueado; desativar por PATCH com NULL, preservando história.

## 7. Alertas calculados

Alertas têm `tipo`, `prioridade`, `clinica_id`, `entidade`, `entidade_id`, `data`, `mensagem` estruturada. Sem nome de paciente, conteúdo clínico, payload do provedor, URL externa ou texto livre de erro. Prioridades: `informativo`, `atencao`, `critico`. Ordenação por prioridade, data, ID e tipo; total computado antes do limite.

- Documento atualmente `erro_emissao`/`erro_cancelamento`: atenção, origem documento. A tentativa correspondente não produz segundo alerta: é evidência histórica do mesmo incidente, não problema independente.
- Sessão atualmente devolvida: atenção, origem última tentativa de fechamento.
- Diferença: magnitude absoluta da última diferença >= threshold da clínica. Crítico prevalece sobre atenção; origem fechamento.
- Idade de repasse: `(now() - gerado_em)` em segundos / 86400, somente pendente na coorte de geração. Origem repasse.
- Idade fiscal: `(now() - updated_at)` / 86400, estados não terminais (exclui emitida/cancelada). FASE 7 atualiza esse marco nas transições; não é data de criação da tentativa antiga. Origem documento.
- Percentual: `100 × estornos_efetivados_da_coorte / bruto_da_coorte`, **por clínica**, com mesmos filtros. Inclui estornos tardios; não usa eventos do período de recebimentos anteriores. Denominador zero não dispara. Compara numeric sem arredondar para decidir. Origem clínica + período estruturado, pois a razão é agregada, não atribuível a um único estorno.

Alertas operacionais atuais (erros fiscais, repasse pendente, fiscal envelhecido, fechamento devolvido e diferença de sessão operacional) **não dependem do intervalo de gráficos**; clínica e profissional autorizado continuam restringindo o alcance. O alerta percentual é exceção: usa a coorte selecionada do período. Idade é atual, não idade no fim do período. Identidade é determinística por `tipo + entidade + entidade_id`; NULL em ambos os thresholds desativa o tipo; não desativa alertas determinísticos. Nada disso é persistido como alerta. Auditoria persiste apenas mudanças de configuração.

## 8. Legado, performance e validação

Caixa elegível exige somente ausência de `entradas_caixa` associadas. Não há UUID hardcoded na RPC: qualquer sessão atual ou futura com entrada legada/importada é incompatível. O UUID histórico aparece somente no teste de preservação. Sessão/entradas antigas não são convertidas, somadas como produção, fechadas ou alteradas. Produção depende exclusivamente de recebimentos canônicos, não de saldo inicial/suprimento/movimento/entrada antiga.

Nenhum índice adicional além da PK da configuração. Reutilizados índices clínica/data, profissional/clínica/data, estorno por recebimento/status, itens por recebimento, pagamentos por recebimento, repasses, aplicações por repasse, ajustes pendentes e sessão/tentativa. Consultas por breakdown reutilizam o agregador por escopo; custo cresce com clínicas/profissionais e merece medição antes de otimização. A seleção de recebimentos para eventos inclui EXISTS fora do período; EXPLAIN com volume representativo poderá justificar índice por efetivação ou reestruturação futura. Não há resultado de EXPLAIN medido nesta preparação.

Teste transacional: `database/tests/financeiro/20260922_fase8_dashboards.sql`. Somente preparação/revisão estática; **não executado**, sem banco paralelo ou Docker. Requer executor autorizado após aplicar a migration em etapa própria; terminar sempre com ROLLBACK, interromper ao primeiro erro. Fixtures diretas de snapshots não constituem E2E das operações de recebimento, estorno, fiscal ou pagamento.

Verificação local adicional: parser pglast 8.4 (gramática PostgreSQL 18.4), instalado somente em diretório temporário, sem conexão ao banco. SQL externo e corpos SQL aceitos; cinco funções PL/pgSQL da migration aceitas. O parser bruto analisou o trigger de auditoria, mas sua conversão JSON apresentou limitação (`JSONDecodeError`); não é evidência de compilação do trigger no servidor. Catálogo, tipos, resolução de colunas, grants/RLS em execução, PostgreSQL 17 do projeto e planos reais continuam pendentes de validação dinâmica.

Valores-base preparados: bruto 2100, estornos da coorte 275, líquido atual 1825; eventos no período 450. Médico A: bruto 1100, parcela líquida 740; médico B: bruto 1000, parcela líquida 720. Pagamentos 700 dinheiro + 600 PIX + 800 cartão. Repasses gerados 4/R$ 1.380; pagos no período 2/R$ 1.120; pendentes atuais 1/R$ 260; aplicações no período R$ 180, das quais R$ 100 provisórias e R$ 80 terminais; ajuste pendente atual R$ 160 (saldo contábil -R$ 160). Fiscal: uma unidade de cada estado. Caixa: diferença positiva 10, negativa -5, total 5; tentativa anterior +99 excluída. Há teste específico de split R$ 500 = R$ 200 dinheiro + R$ 300 PIX, bordas `[inicio,fim)`, timezone, sessão legada adicional e identidade médica ausente/ambígua.

Rollback de aplicação futura: a migration é transacional. Após sucesso com configurações reais, **não** executar DROP automático: bloquear EXECUTE das novas RPCs sob autorização e preparar correção aditiva, preservando configuração/auditoria. Nenhuma reversão automática ou mudança das FASES 1–7 nesta entrega.
