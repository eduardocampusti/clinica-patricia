# CLÍNICA PATRÍCIA
# CHECKPOINT — MÓDULO FINANCEIRO

**Fase atual:** FASE 10 — interface operacional do caixa integrada localmente; demais fluxos pendentes
**Status atual:** EM EXECUÇÃO
**Data do estado atual:** 22/09/2026 — America/Bahia

## 1. Resultado da FASE 0 (histórico)

A FASE 0 — Preflight/Baseline foi concluída.

- Nenhuma migration foi aplicada.
- Nenhum dado foi alterado.
- Nenhuma alteração funcional foi executada no banco, frontend ou backend.
- O Supabase real permanece como banco principal do projeto.

## 2. Ambiente validado

- **Projeto Supabase:** `Clinica Patrícia`
- **Status:** saudável

## 3. Baseline de dados

| Entidade | Quantidade |
|---|---:|
| Clínicas | 3 |
| Usuários | 5 |
| Vínculos usuário-clínica | 8 |
| Profissionais | 1 |
| Vínculos profissional-clínica | 2 |
| Agendamentos | 2 |
| Sessões de caixa | 1 |
| Entradas de caixa | 2 |

## 4. Migrations na baseline da FASE 0 (histórico)

1. `20260915010000 preflight_executor`
2. `20260915010001 btree_gist`
3. `20260915010002 baseline_instalacao_nova`
4. `20260915010003 acls_default_privileges`
5. `20260915010004 hardening_geral`
6. `20260915010005 prontuario_rpc`

## 5. Fingerprints da baseline

- **Schema fingerprint:** `0b760ffa9101c5ab59d9f1b6766c5a1d`
- **Migration fingerprint:** `39a4d922a21a859aba551d6d16f31263`

## 6. Achados do preflight

1. Os grants atuais de `anon` e `authenticated` são amplos e deverão ser reduzidos.
2. Existem funções `SECURITY DEFINER` executáveis por `anon` e `authenticated`.
3. Existem funções com `search_path` não fixado.
4. Existem foreign keys sem índices, inclusive em `entradas_caixa`.
5. `sessoes_caixa` atualmente possui apenas os estados `aberto` e `fechado`.
6. `entradas_caixa` ainda usa o modelo financeiro antigo.
7. `profissionais.valor_consulta` e `profissionais.taxa_repasse_clinica` ainda representam a configuração antiga.
8. O novo Financeiro deverá preservar os registros existentes durante a transição.

## 7. Garantias de preservação

- Os registros existentes constituem a baseline de transição.
- A evolução do Financeiro não poderá apagar ou descaracterizar os registros atuais.
- Alterações futuras deverão respeitar o Documento Funcional Mestre, a matriz de papéis e permissões e o plano técnico aprovado.
- Este checkpoint registra estado e evidências; não autoriza migration nem implementação.

## 8. Próximo passo oficial

**Continuar FASE 1: conferir o fechamento da fundação frente ao plano aprovado e preparar a FASE 2 — Segurança.**

A aplicação abaixo conclui a entrega desta migration, não a integração funcional do Financeiro. Policies, helpers, autorizações por papel e testes de isolamento pertencem à FASE 2. Nenhuma próxima alteração está autorizada por este registro isoladamente.

## 9. FASE 1 — Preparação local da migration (histórico anterior à aplicação)

**FASE 1 — migration de fundação criada e aguardando revisão/aplicação.**

- Arquivo: `supabase/migrations/20260921014112_financeiro_fase1_fundacao.sql`.
- Timestamp gerado pelo comando oficial `supabase migration new financeiro_fase1_fundacao`.
- Migration não aplicada; nenhum SQL remoto executado e nenhum dado alterado nesta tarefa.
- FASE 1 ainda não concluída. A baseline da FASE 0 acima permanece como registro histórico.
- Revisão de engenharia: adicionada exclusão de vigências sobrepostas por clínica, fortalecido o vínculo de movimentos com recebimentos e exigido motivo nos movimentos excepcionais. Revisão estática realizada; migration continua aguardando aplicação, sem execução de SQL remoto.

## 10. FASE 1 — Aplicação e verificação no Supabase real

**FASE 1 — Fundação do modelo financeiro: migration aplicada e verificada.**

- Projeto confirmado: `Clinica Patrícia`, ref `xftnkusbyqzyvzrovroj`, vinculado e `ACTIVE_HEALTHY`; PostgreSQL `17.6.1.155`.
- Migration: `20260921014112_financeiro_fase1_fundacao.sql`.
- SHA-256 do arquivo aprovado, reconferido após a aplicação: `6A50D20FED97E001C00AB9B2F729A739F8EF4517DE94895F208CBAD60EF077CA`.
- Data/hora da transação, obtida do timestamp das configurações iniciais: **20/09/2026 22:53:02.397809 -03 (America/Bahia)**, equivalente a **21/09/2026 01:53:02.397809 UTC**.
- Opções conferidas com `supabase db push --help`.
- `supabase db push --linked --dry-run`: somente a migration autorizada, sem divergência de histórico, repair, seed ou roles pendentes.
- Aplicação: `supabase db push --linked --yes`, concluída com exit code 0. Não houve reaplicação da baseline nem das migrations do release 20260915.
- Verificações posteriores executadas somente em leitura, via CLI/Management API; advisors reexecutados no Dashboard, sem SQL manual.

### 10.1. Verificações estruturais e de dados

| Verificação | Resultado |
|---|---|
| Histórico remoto | Sete migrations: as seis `20260915010000` a `20260915010005` e `20260921014112 financeiro_fase1_fundacao` |
| `profissionais_clinicas.valor_consulta` | Presente, `numeric(12,2)` |
| Backfill | Dois vínculos elegíveis; os dois conferem com o valor legado |
| `configuracoes_financeiras_clinica` | Criada; três registros, uma configuração aberta de 20% para cada clínica |
| `recebimentos` | Criada, zero registros |
| `recebimentos_pagamentos` | Criada, zero registros |
| `movimentos_caixa` | Criada, zero registros |
| `eventos_auditoria_financeira` | Criada, zero registros |
| RLS | Habilitado nas cinco tabelas novas |
| Policies | Zero nas cinco tabelas novas; bloqueio por padrão intencional nesta etapa |
| Escrita direta | `anon` e `authenticated` sem `INSERT`, `UPDATE`, `DELETE` ou `TRUNCATE` nas cinco tabelas novas |
| Constraints | Definições conferidas e validadas no catálogo, incluindo exclusão GiST de vigências, vínculos de recebimento e motivo obrigatório nos movimentos excepcionais |
| Índices | 25 índices nas cinco tabelas novas, incluindo os de constraints; todos válidos e prontos; índice parcial de configuração aberta única preservado |

### 10.2. Preservação do legado

Contagens agregadas conferidas antes e depois nas 19 tabelas legadas, sem leitura de conteúdo clínico:

| Tabela | Antes | Depois |
|---|---:|---:|
| agenda_excecoes | 1 | 1 |
| agendamentos | 2 | 2 |
| atendimentos | 0 | 0 |
| atendimentos_adendos | 0 | 0 |
| auditoria | 55 | 57 |
| auditoria_leitura_clinica | 0 | 0 |
| clinicas | 3 | 3 |
| disponibilidade_padrao | 1 | 1 |
| documentos_clinicos | 0 | 0 |
| entradas_caixa | 2 | 2 |
| especialidades | 1 | 1 |
| lista_espera | 1 | 1 |
| pacientes | 3 | 3 |
| profissionais | 1 | 1 |
| profissionais_clinicas | 2 | 2 |
| servicos | 1 | 1 |
| sessoes_caixa | 1 | 1 |
| usuarios | 5 | 5 |
| usuarios_clinicas | 8 | 8 |

Nenhuma redução de contagem observada. A migration não contém exclusão de registros legados. O acréscimo de dois registros em `auditoria` é compatível com os dois updates do backfill e o trigger existente; não foi inspecionado o conteúdo dessas auditorias. A conferência foi por contagem e revisão do SQL, não por comparação individual de todas as linhas.

### 10.3. Advisors pós-aplicação

| Advisor | Errors | Warnings | Info |
|---|---:|---:|---:|
| Segurança | 0 | 37 | 5 |
| Performance | 0 | 5 | 53 |

- Segurança: os cinco informes são `RLS Enabled No Policy`, um para cada tabela nova, coerentes com o bloqueio por padrão antes da FASE 2.
- Entre os warnings de segurança observados: funções com `search_path` mutável, funções `SECURITY DEFINER` executáveis por público e `btree_gist` em `public`. Não foram corrigidos nesta aplicação; a lista de categorias não é inventário individual dos 37 avisos.
- Performance: cinco warnings `Auth RLS Initialization Plan`, sendo dois em `usuarios` e um em cada uma de `usuarios_clinicas`, `agendamentos` e `lista_espera`.
- Entre os 53 informes de performance foram observadas FKs sem índice de cobertura em tabelas legadas. Não foi feita correção ou inventário individual dos 53 informes.
- Os resultados são a fotografia pós-aplicação; não demonstram ausência de todas as pendências de segurança ou performance do projeto.

### 10.4. Avisos operacionais e limites

- A CLI ignorou `.gitkeep` por não corresponder ao padrão de nome de migration; não afetou a aplicação.
- Após aplicar a migration, a CLI tentou automaticamente usar Docker para o cache opcional do catálogo de migrations (`pg-delta`). O daemon estava indisponível e esse cache falhou. A execução terminou com código 0 e a aplicação foi confirmada independentemente no histórico e no catálogo remoto. Não houve comando Docker manual, criação bem-sucedida de container ou download bem-sucedido de imagem; não se repetiu o push nem se iniciou Docker.
- Não foram executados reset, seed, repair, exclusão de dados, SQL manual no Dashboard, alteração de frontend/backend ou commit.
- Arquivo SQL aprovado preservado. Somente este checkpoint foi editado manualmente nesta tarefa.
- Fingerprints da seção 5 continuam sendo evidências históricas da FASE 0, não fingerprints do schema pós-migration.
- O README do módulo ainda contém estado anterior às aprovações dos documentos 04 a 07; não foi alterado nesta tarefa restrita ao checkpoint. Para o estado executado, prevalece este registro; para requisitos, os documentos aprovados.

**Resultado da aplicação: APROVADO nas verificações solicitadas, com avisos dos advisors preservados.**

**Próximo passo único:** conferir o fechamento da FASE 1 e preparar o desenho de segurança da FASE 2 conforme `07-PLANO-IMPLEMENTACAO.md`, sem aplicar novas mudanças automaticamente.

## 11. Transição para a FASE 2 (histórico anterior à aplicação)

**FASE 1 — CONCLUÍDA**

**FASE 2 — migration de segurança criada e aguardando revisão/aplicação**

## 12. FASE 2 — Aplicação e validação

**FASE 2 — Segurança: CONCLUÍDA**

### 12.1. Aplicação

- Projeto confirmado: `Clinica Patrícia`, ref `xftnkusbyqzyvzrovroj`, vinculado e `ACTIVE_HEALTHY`.
- Migration: `20260921102203_financeiro_fase2_seguranca.sql`.
- SHA-256 aplicado e reconferido: `450D3EB426E43E5C7702E03570116C5F12F8236C05F81124B9BEAC9369F90324`.
- FASE 1 `20260921014112 financeiro_fase1_fundacao` confirmada previamente no histórico remoto.
- Dry-run: somente a migration da FASE 2, sem seeds, roles, divergência ou pedido de repair.
- Aplicação concluída em **21/09/2026**. A confirmação estrutural no catálogo ocorreu às **07:32:07.809008 -03 (America/Bahia)**, equivalente a **10:32:07.809008 UTC**. A tabela remota de migrations não possui coluna com o instante real de aplicação; por isso o horário registrado é o da primeira verificação catalogal posterior.
- Histórico remoto final: oito migrations, de `20260915010000` a `20260921102203`.

### 12.2. Helpers e privilégios

- Schema privado `private` presente e fora dos schemas expostos pela Data API configurada.
- `private.financeiro_tem_papel_clinica(uuid, public.papel_usuario[])`: `SECURITY DEFINER`, `STABLE` e `search_path=pg_catalog`.
- `private.financeiro_eh_profissional(uuid, uuid)`: `SECURITY DEFINER`, `STABLE` e `search_path=pg_catalog`.
- `PUBLIC` e `anon` sem `EXECUTE` nos dois helpers; `anon` também sem `USAGE` no schema privado.
- `authenticated` com `USAGE` no schema privado e `EXECUTE` somente nos dois helpers financeiros nele existentes.
- `anon` sem `SELECT`, `INSERT`, `UPDATE`, `DELETE` ou `TRUNCATE` nas cinco tabelas financeiras.
- `authenticated` com somente `SELECT` nas cinco tabelas; nenhuma escrita direta concedida.
- Nenhuma função legada foi modificada pela migration.

### 12.3. Policies instaladas

Todas são `FOR SELECT TO authenticated`:

1. `configuracoes_financeiras_select_proprietaria_recepcao`;
2. `recebimentos_select_financeiro`;
3. `recebimentos_pagamentos_select_por_recebimento`;
4. `movimentos_caixa_select_proprietaria_recepcao`;
5. `eventos_auditoria_financeira_select`.

Não existem policies de `INSERT`, `UPDATE` ou `DELETE` nessas tabelas.

### 12.4. Testes reais de autorização

Os testes usaram identidades existentes, `SET LOCAL ROLE`, claims locais à transação e `ROLLBACK`. Nenhum dado financeiro foi criado ou alterado.

| Cenário | Resultado |
|---|---|
| Proprietária | Viu exatamente as duas configurações correspondentes às duas clínicas em que possui vínculo ativo de proprietária |
| Recepção | Viu uma configuração da clínica autorizada e zero configurações de clínicas sem vínculo |
| Recepção — auditoria | Policy confirmada como limitada ao próprio `usuario_id`; a tabela ainda está vazia |
| Médico | Não viu configurações, movimentos ou auditoria; helper profissional retornou verdadeiro para o vínculo visível no contexto autenticado |
| Usuário existente sem autorização na clínica testada | Helper de papel retornou falso e nenhuma configuração financeira ficou visível |
| `anon` | Sem `SELECT` nas cinco tabelas e bloqueado no schema privado |

As tabelas `recebimentos`, `recebimentos_pagamentos`, `movimentos_caixa` e `eventos_auditoria_financeira` continuam com zero registros. Portanto, os casos de leitura de recebimentos próprios/de terceiros, componentes, movimentos e autoria de eventos tiveram **teste estrutural aprovado / teste com dados aguardando FASE 3**. Não foram inventados dados para completar esses cenários.

### 12.5. Advisors pós-aplicação

| Advisor | Errors | Warnings | Info |
|---|---:|---:|---:|
| Segurança | 0 | 37 | 0 |
| Performance | 0 | 5 | 50 |

- Os cinco informes `RLS Enabled No Policy` das tabelas financeiras desapareceram.
- Os 37 warnings de segurança já existentes permanecem fora do escopo desta migration.
- Os cinco warnings de performance permanecem fora do escopo.
- Os 50 informes de performance não foram corrigidos e nenhum índice novo foi removido.

### 12.6. Observação sobre o vínculo multi-clínica do médico

A assimetria indicada para registro foi conferida novamente no Supabase real e **não corresponde mais ao estado atual**:

- um profissional está vinculado ativamente a duas clínicas em `profissionais_clinicas`;
- a conta autenticada ligada a esse profissional possui atualmente dois vínculos ativos com papel `medico` em `usuarios_clinicas`, e não apenas um.

Logo, a assimetria 2×1 não foi registrada como fato atual. Ainda assim, os vínculos deverão ser reconferidos antes da implementação do seletor/dashboard multi-clínica do médico, para detectar qualquer mudança posterior.

### 12.7. Aviso operacional

Após aplicar a migration, o Supabase CLI tentou automaticamente gerar o cache opcional do catálogo por meio de Docker. Como o daemon não estava disponível, a tentativa falhou sem criar container ou executar imagem. O `db push` terminou com código 0, e a migration foi confirmada independentemente no histórico e nos catálogos remotos. Docker não foi iniciado e o push não foi repetido.

Não foram executados `db reset`, seed, migration repair, SQL manual no Dashboard, alterações de frontend/backend, RPCs de recebimento, mudanças em funções legadas ou commit.

**Próximo passo oficial: FASE 3 — Recebimento.**

## 13. FASE 3 — Preparação local

**FASE 3 — migration de Recebimento criada e aguardando revisão/aplicação.**

## 14. FASE 3 — Aplicação e validação

**FASE 3 — Recebimento: CONCLUÍDA**

### 14.1. Aplicação

- Projeto confirmado: `Clinica Patrícia`, ref `xftnkusbyqzyvzrovroj`, vinculado e `ACTIVE_HEALTHY`; PostgreSQL `17.6.1.155`.
- Migration: `20260921104621_financeiro_fase3_recebimento.sql`.
- SHA-256 aplicado e reconferido: `54C82FD21BAD33777320887E9C8D6CC05E61560DF9553B289F6201FB02E9647A`.
- FASE 1 `20260921014112` e FASE 2 `20260921102203` confirmadas no histórico antes da aplicação; FASE 3 confirmada como ausente.
- Dry-run: somente a migration da FASE 3, sem seeds, roles, divergência ou pedido de repair.
- Aplicação concluída em **21/09/2026**. A primeira confirmação catalogal posterior ocorreu às **08:24:28.390502 -03 (America/Bahia)**, equivalente a **11:24:28.390502 UTC**.
- Histórico remoto final: nove migrations, de `20260915010000` a `20260921104621`.

### 14.2. Verificação estrutural

- Tabela `documentos_fiscais` criada, com RLS habilitado, policy de leitura para proprietária/recepção e grants restritos.
- RPC `public.financeiro_registrar_recebimento(uuid, jsonb, text)` presente como `SECURITY DEFINER`, `search_path=pg_catalog`; `authenticated` possui `EXECUTE`, enquanto `PUBLIC` e `anon` não possuem.
- Função privada `private.financeiro_validar_soma_pagamentos()` presente como `SECURITY DEFINER`, `search_path=pg_catalog`, sem `EXECUTE` para `PUBLIC`, `anon` ou `authenticated`.
- Dois constraint triggers diferíveis instalados para validar a soma dos pagamentos.
- Constraint de formato da chave de idempotência presente.
- Índices esperados presentes: unicidade por agendamento, movimento principal por recebimento e os dois índices de `documentos_fiscais`.
- RLS permaneceu habilitado nas cinco tabelas financeiras preexistentes e foi habilitado em `documentos_fiscais`.

### 14.3. Testes reais transacionais

Todos os cenários usaram usuários e registros existentes apropriados. Cada cenário foi executado em transação própria e encerrado por `ROLLBACK`.

| Cenário | Resultado |
|---|---|
| Recebimento de R$ 500 em dinheiro | APROVADO |
| Recebimento de R$ 500 via Pix | APROVADO |
| Recebimento de R$ 500 em cartão de crédito | APROVADO |
| Pagamento dividido em R$ 200 dinheiro + R$ 300 Pix | APROVADO |
| Snapshot financeiro | APROVADO: 20% / 80%, R$ 100 clínica e R$ 400 profissional |
| Componentes, movimento, fiscal e auditoria | APROVADO: um movimento principal, documento fiscal pendente e um evento de auditoria por operação |
| Preservação de `entradas_caixa` | APROVADO: nenhuma entrada legada criada ou alterada |
| Idempotência | APROVADO: segunda chamada retornou o mesmo recebimento com `nova_operacao=false`, sem duplicações |
| Soma de pagamentos R$ 499 | REJEITADA como esperado, sem persistência |
| Soma de pagamentos R$ 501 | REJEITADA como esperado, sem persistência |
| Forma de pagamento inválida | REJEITADA como esperado, sem persistência |
| Médico tentando registrar recebimento | REJEITADO com `42501`, sem persistência |
| Operador vinculado somente a outra clínica | REJEITADO com `42501`, sem persistência |
| Caixa fechado | REJEITADO como esperado, sem persistência |
| Agendamento cancelado | REJEITADO como esperado, sem persistência |
| Agendamento concluído | REJEITADO como esperado, sem persistência |
| Preço de consulta ausente | REJEITADO como esperado, sem persistência |
| Mesma chave em outro agendamento | REJEITADA com `23505`, preservando uma única operação dentro da transação |
| Constraint diferível com soma adulterada | REJEITADA com `23514` na validação, restaurando a soma válida dentro da transação |

Após todos os rollbacks, as contagens foram reconferidas:

- `recebimentos`: 0;
- `recebimentos_pagamentos`: 0;
- `movimentos_caixa`: 0;
- `documentos_fiscais`: 0;
- `eventos_auditoria_financeira`: 0;
- `entradas_caixa`: 2;
- `sessoes_caixa`: 1;
- `agendamentos`: 2.

Nenhum recebimento, pagamento, movimento, documento fiscal ou evento de auditoria de teste ficou persistido.

### 14.4. Advisors pós-aplicação

Os dois linters foram reexecutados no Dashboard após a aplicação e os testes.

| Advisor | Errors | Warnings | Info |
|---|---:|---:|---:|
| Segurança | 0 | 38 | 0 |
| Performance | 0 | 5 | 47 |

- A RPC de recebimento mantém deliberadamente `SECURITY DEFINER` e `EXECUTE` somente para `authenticated`; o catálogo confirmou que `PUBLIC` e `anon` não podem executá-la.
- Os warnings de segurança remanescentes incluem pendências preexistentes, como funções legadas com `search_path` mutável, funções legadas executáveis sem autenticação e `btree_gist` em `public`. Não foram corrigidos nesta fase.
- Os cinco warnings de performance permanecem fora do escopo desta migration.
- Nenhum índice marcado como não utilizado foi removido.

### 14.5. Avisos operacionais e limites

- Após aplicar a migration, a CLI tentou automaticamente gerar o cache opcional do catálogo via Docker. O daemon estava indisponível; o `db push` terminou com código 0 e a migration foi confirmada independentemente no histórico e no catálogo. Docker não foi iniciado e o push não foi repetido.
- Não foram executados `db reset`, seed, migration repair, alteração manual substitutiva no Dashboard, mudanças de frontend/backend, alterações na Agenda, mudanças em `entradas_caixa`, funções legadas ou commit.
- Os únicos dados manipulados nos testes foram alterações transitórias dentro das transações de validação, todas revertidas por `ROLLBACK`.

**Resultado da FASE 3: APROVADO.**

**Próximo passo oficial: FASE 4 — Caixa.**

## 15. FASE 4 — Preparação local

**FASE 4 — migrations de Caixa criadas e aguardando revisão/aplicação.**

- `20260921115106_financeiro_fase4_caixa_estados.sql`: adiciona, em migration isolada, os estados `em_fechamento`, `aguardando_aprovacao`, `devolvido_para_correcao` e `aprovado` ao enum legado `status_sessao_caixa`; preserva `aberto` e `fechado` e não modifica dados.
- `20260921115109_financeiro_fase4_caixa_operacoes.sql`: prepara a máquina de estados e as operações transacionais de abertura, suprimento, sangria e fechamento.
- Os dois timestamps foram gerados pelo Supabase CLI, em ordem consecutiva de criação.
- A migration de operações reutiliza `public.sessoes_caixa`; nenhuma segunda tabela principal de caixa foi criada.
- A sessão existente, `entradas_caixa`, dados históricos e trigger legado de auditoria são preservados.
- O índice de sessão ativa passa a considerar `aberto`, `em_fechamento`, `aguardando_aprovacao` e `devolvido_para_correcao`; `aprovado` e `fechado` permanecem terminais.
- Foram modeladas `sangrias_caixa`, `fechamentos_caixa` e `revisoes_fechamento_caixa`, com histórico protegido contra exclusão.
- `movimentos_caixa` recebe vínculo controlado com sangria e chave opcional de idempotência para compatibilidade com registros anteriores.
- `sessoes_caixa` recebe chave opcional de idempotência e suas colunas monetárias são ampliadas de `numeric(10,2)` para `numeric(12,2)`, sem redução de precisão nem alteração de valores.
- Novas tabelas usam RLS, `anon` sem acesso e `authenticated` somente com `SELECT`; leitura limitada a proprietária ou recepção ativas da mesma clínica.
- As oito RPCs operacionais usam `SECURITY DEFINER`, `search_path=pg_catalog`, `auth.uid()`, autorização interna, locks e `EXECUTE` exclusivo de `authenticated`.
- O helper privado de cálculo usa: `valor_abertura + recebimentos em dinheiro + suprimentos - sangrias efetivadas`. PIX e cartão permanecem fora do dinheiro físico. A FASE 5 deverá ampliar o cálculo para estornos.
- Revisão estática local concluída após a correção de compatibilidade: duas transações balanceadas, quatro novos valores de enum, oito RPCs públicas, três helpers privados, onze funções com `SECURITY DEFINER` e `search_path` fixo, grants/revokes correspondentes, RLS e policies conferidos, sem `DELETE`, `TRUNCATE`, alteração de `entradas_caixa` ou referência a `service_role`.
- Nenhuma migration foi aplicada; nenhum SQL remoto, `db push`, alteração de frontend/backend, dado persistente ou commit foi executado nesta preparação.

### 15.1. Compatibilidade com o caixa legado

- Existe uma sessão de caixa legada aberta, com valor de abertura de R$ 150,50 e duas entradas antigas em dinheiro de R$ 500,00 cada; o valor físico histórico esperado é R$ 1.150,50.
- A presença de qualquer registro em `public.entradas_caixa` torna a sessão incompatível com as operações do novo Financeiro. Essa regra impede a formação de caixa híbrido.
- A abertura de outro caixa continua bloqueada enquanto a sessão legada permanecer aberta. A migration não fecha, converte, migra nem exclui automaticamente a sessão ou suas entradas.
- Um trigger `BEFORE INSERT` em `public.recebimentos`, apoiado por função privada sem `EXECUTE` para `PUBLIC`, `anon` ou `authenticated`, rejeita novos recebimentos vinculados à sessão legada.
- As RPCs de suprimento, solicitação e efetivação de sangria, início de fechamento e envio de fechamento rejeitam a sessão legada antes de qualquer mutação.
- O helper de cálculo também rejeita a sessão legada; não soma `entradas_caixa` ao novo modelo e não produz snapshot retroativo ou híbrido.
- A regularização futura deverá ocorrer em uma etapa própria denominada **TRANSIÇÃO CONTROLADA DO CAIXA LEGADO**, com procedimento explícito, auditável e separado destas migrations.

### 15.2. Plano de validação posterior em ambiente descartável

Aplicar as duas migrations em ordem e executar cada cenário em transação própria, sempre finalizada com `ROLLBACK`:

**Positivos**

1. abertura com R$ 0;
2. abertura com fundo de troco;
3. suprimento;
4. solicitação, aprovação e efetivação de sangria;
5. fechamento sem diferença;
6. fechamento com diferença e justificativa;
7. devolução, correção, nova tentativa e aprovação, preservando a tentativa anterior;
8. abertura de novo caixa após aprovação definitiva.

**Negativos**

1. médico abrindo caixa;
2. usuário de outra clínica;
3. duas sessões financeiramente ativas na mesma clínica;
4. suprimento com caixa em fechamento;
5. sangria sem aprovação;
6. sangria duplicada;
7. sangria maior que o dinheiro físico esperado;
8. fechamento com sangria solicitada ou aprovada pendente;
9. fechamento divergente sem justificativa;
10. recepção aprovando fechamento;
11. novo recebimento depois de iniciado o fechamento;
12. segunda aprovação da mesma tentativa;
13. tentativa de sobrescrever ou excluir histórico.
14. recebimento novo vinculado à sessão legada;
15. suprimento na sessão legada;
16. solicitação e efetivação de sangria na sessão legada;
17. início de fechamento da sessão legada;
18. envio de fechamento da sessão legada.

Os testes funcionais normais deverão usar uma clínica existente sem sessão ativa e identidades existentes adequadas de proprietária ou recepção. Cada teste negativo da sessão legada deverá confirmar que ela continua aberta, que as duas entradas antigas permanecem intactas, que nenhum recebimento, movimento, sangria ou fechamento é criado e que nada persiste. Todos os cenários serão executados em transações isoladas e finalizados com `ROLLBACK`.

Além dos resultados funcionais, a validação deverá conferir idempotência, concorrência, RLS, grants, auditoria, integridade entre clínica/sessão e ausência de persistência após cada `ROLLBACK`.

**Próximo passo oficial:** revisão de engenharia das duas migrations da FASE 4 e validação em ambiente descartável antes de qualquer aplicação no Supabase real.

## 16. FASE 4 — Aplicação e validação

**FASE 4 — Caixa: CONCLUÍDA**

### 16.1. Aplicação

- Projeto confirmado: `Clinica Patrícia`, ref `xftnkusbyqzyvzrovroj`.
- CLI: Supabase CLI `2.110.0`; opções de `db push` reconferidas pelo `--help`.
- Hash `20260921115106_financeiro_fase4_caixa_estados.sql`: `305C67F8FA51E54762BC4322168F60F0C53F6F4D374A0BD829EBC1A1B31B74A1`.
- Hash `20260921115109_financeiro_fase4_caixa_operacoes.sql`: `FA6AB92A21D8BE97F37B0FEF355435728DB0D64AC050ADD32B89CBC11598A433`.
- Preflight: FASE 3 presente; as duas migrations da FASE 4 ausentes; sessão legada aberta preservada com R$ 150,50 de abertura, duas entradas e R$ 1.000,00 de total legado.
- Dry-run: somente `20260921115106` e `20260921115109`, nessa ordem, sem seed, roles, repair ou divergência.
- Aplicação concluída em **21/09/2026**, com verificação final às **09:33:22 -03 (America/Bahia)**. As duas versões foram confirmadas no histórico remoto.
- A tentativa automática da CLI de gerar cache opcional via Docker falhou porque o daemon não estava disponível. O push aplicou ambas as migrations antes desse aviso; não foi repetido e a aplicação foi confirmada independentemente no histórico e no catálogo.

### 16.2. Estrutura, segurança e compatibilidade

- Enum `status_sessao_caixa`: `aberto`, `fechado`, `em_fechamento`, `aguardando_aprovacao`, `devolvido_para_correcao` e `aprovado`.
- Índice de sessão ativa única cobre todos os estados não terminais.
- As quatro colunas monetárias de `sessoes_caixa` estão em `numeric(12,2)`.
- `sessoes_caixa`, `sangrias_caixa`, `fechamentos_caixa` e `revisoes_fechamento_caixa`: RLS/policies esperadas; `anon` sem acesso; `authenticated` somente `SELECT`, sem escrita direta; médico sem acesso ao caixa geral pela policy.
- `movimentos_caixa`: `sangria_id`, `idempotency_key`, constraints, FKs e índices únicos esperados presentes.
- Oito RPCs operacionais presentes como `SECURITY DEFINER`, `search_path=pg_catalog`, `EXECUTE` somente para `authenticated`, autorização interna por `auth.uid()` e vínculo ativo.
- Função privada e trigger de bloqueio de recebimentos legados presentes; `PUBLIC`, `anon` e `authenticated` sem `EXECUTE` no helper.
- Guards confirmados nas cinco RPCs que manipulam sessão existente e no helper de cálculo.
- Triggers de proteção contra `DELETE` confirmados nas três tabelas históricas.

### 16.3. Testes transacionais do novo caixa

Todos os cenários foram executados com identidades e clínica existentes adequadas, dentro de transação encerrada por `ROLLBACK`.

- abertura com R$ 0 e com fundo de troco;
- idempotência de abertura, suprimento, solicitação e efetivação de sangria;
- médico e usuário sem vínculo impedidos de abrir caixa;
- segundo caixa financeiramente ativo rejeitado;
- suprimento aumentou o dinheiro esperado sem aumentar faturamento;
- sangria percorreu `solicitada → aprovada → efetivada`, sem movimento antes da efetivação e com exatamente um movimento depois;
- sangria sem aprovação e sangria acima do dinheiro disponível rejeitadas;
- fechamento bloqueado com sangria pendente;
- fórmula validada: abertura + dinheiro recebido + suprimentos - sangrias; PIX e cartão fora do dinheiro físico;
- suprimento após início do fechamento rejeitado;
- diferença sem justificativa rejeitada;
- fechamento sem diferença e com diferença justificada aprovados;
- recepção impedida de aprovar fechamento;
- segunda aprovação idempotente, sem duplicação;
- devolução e correção geraram tentativa 2, preservaram a primeira e registraram substituição lógica;
- novo caixa pôde ser aberto após aprovação terminal;
- exclusão de sangria, fechamento e revisão bloqueada.

Não havia agendamento compatível na única clínica disponível para os testes normais. Por isso, o caso “novo recebimento após `em_fechamento`” não criou fixture clínica artificial: permaneceu com validação estrutural da RPC da FASE 3 e da máquina de estados, sem dado persistente.

### 16.4. Testes da sessão legada

Em transação com `ROLLBACK`, foram rejeitados:

- novo recebimento pelo trigger central;
- suprimento;
- solicitação de sangria;
- efetivação de sangria;
- início de fechamento;
- envio de fechamento;
- cálculo híbrido pelo helper privado.

Após os testes, a sessão histórica permaneceu `aberto`, com abertura de R$ 150,50, exatamente duas entradas e soma de R$ 1.000,00. As contagens finais permaneceram: uma sessão, duas entradas e zero recebimentos, movimentos, sangrias, fechamentos e revisões. Nada dos testes persistiu.

### 16.5. Advisors pós-aplicação

| Advisor | Errors | Warnings | Info |
|---|---:|---:|---:|
| Segurança | 0 | 46 | 0 |
| Performance | 0 | 5 | 57 |

- Ambos os linters foram reexecutados depois da aplicação e dos testes.
- As RPCs financeiras `SECURITY DEFINER` com `EXECUTE` para `authenticated` são intencionais: a escrita direta permanece revogada e cada RPC valida `auth.uid()` e vínculo real internamente.
- Warnings e sugestões de outros módulos não foram corrigidos.
- Nenhum índice marcado como não utilizado foi removido.

### 16.6. Limites e próximo passo

- Nenhuma alteração foi feita em frontend, backend, Agenda ou `entradas_caixa`.
- A sessão legada não foi fechada, convertida ou migrada.
- Não foram usados `db reset`, seed, migration repair, SQL manual substitutivo ou commit.
- Pendência futura preservada: **TRANSIÇÃO CONTROLADA DO CAIXA LEGADO**.

**Resultado da FASE 4: APROVADO.**

**Próximo passo oficial: FASE 5 — Estornos.**

## 17. FASE 5 — Preparação local

**FASE 5 — migration de Estornos criada e aguardando revisão/aplicação.**

- Migration criada exclusivamente pelo Supabase CLI: `20260921124154_financeiro_fase5_estornos.sql`.
- SHA-256 após revisão estática: `A64EC5CF8BA58C19AF0CDA8B5C9A390EA61E24BAF46506560082F9BAA4FA8CE6`.
- O recebimento original e seus componentes permanecem preservados; estornos são eventos históricos parciais ou totais, nunca exclusões ou reescritas do pagamento.
- Foram modelados `estornos` e `estornos_pagamentos`, com soma de componentes validada por constraint trigger diferível, componentes imutáveis e proteção contra exclusão histórica.
- A recepção ativa solicita; somente a proprietária ativa rejeita ou aprova e efetiva. A escrita ocorre exclusivamente pelas RPCs `financeiro_solicitar_estorno` e `financeiro_revisar_estorno`.
- O limite global e o limite por forma de pagamento reservam os estados `solicitado`, `aprovado` e `efetivado`; solicitações rejeitadas liberam o saldo.
- O impacto por forma de pagamento é preservado em componentes separados para dinheiro, PIX e cartão de crédito.
- Regra funcional sincronizada: cada forma de pagamento pode ser estornada somente até o valor originalmente pago naquela mesma forma; a primeira versão não converte dinheiro, PIX e cartão entre si. Reembolso por meio diferente dependerá de operação futura própria, aprovada e auditada.
- O impacto da clínica e do profissional é congelado a partir do snapshot do recebimento. O último estorno que consome o saldo usa exatamente os valores restantes, evitando diferença acumulada de centavos.
- `movimentos_caixa` passa a vincular exatamente um movimento total ao estorno efetivado, na sessão operacional aberta do dia; a sessão original do recebimento não é reaberta.
- O cálculo do caixa preserva os totais brutos e desconta de `valor_esperado` apenas o componente em dinheiro dos estornos efetivados na sessão atual.
- O fechamento recebe snapshots de estornos totais, por forma de pagamento e dos impactos da clínica e dos profissionais, sem alterar a semântica dos campos brutos existentes.
- RLS e grants mantêm `anon` sem acesso, `authenticated` somente com leitura direta administrativa para proprietária/recepção e nenhuma escrita direta; médico não lê as tabelas de estorno nesta fase.
- Solicitação e revisão usam locks, constraints e idempotência; retries equivalentes não duplicam componentes, movimento, auditoria ou atualização financeira.
- Repasse ainda não foi implementado. A FASE 6 usará os snapshots de `valor_clinica` e `valor_profissional` dos estornos para reduzir pendências ou criar ajuste negativo futuro.
- O fluxo fiscal continua separado: nenhum documento fiscal é cancelado ou alterado automaticamente.
- Plano de validação posterior preparado para estornos totais/parciais, formas isoladas e combinadas, múltiplos estornos, arredondamento final, rejeição, idempotência, concorrência, caixa, fechamento, autorização, RLS, grants e imutabilidade, sempre em transações com `ROLLBACK` e sem fixtures clínicas persistentes.
- Nenhuma migration foi aplicada, nenhum SQL remoto foi executado e nenhum dado, frontend, backend, Agenda, `entradas_caixa`, caixa legado, documento fiscal ou repasse foi alterado nesta preparação.

**Próximo passo oficial:** revisão de engenharia e validação da migration da FASE 5 antes de qualquer aplicação no Supabase real.

## 18. FASE 5 — Aplicação e validação

**FASE 5 — Estornos: CONCLUÍDA**

### 18.1. Aplicação

- Projeto confirmado: `Clinica Patrícia`, ref `xftnkusbyqzyvzrovroj`.
- Migration: `20260921124154_financeiro_fase5_estornos.sql`.
- SHA-256 aplicado e reconferido: `A64EC5CF8BA58C19AF0CDA8B5C9A390EA61E24BAF46506560082F9BAA4FA8CE6`.
- Preflight: FASE 4 presente; FASE 5, `public.estornos` e `public.estornos_pagamentos` ausentes; recebimentos, movimentos, sangrias e fechamentos com zero registros.
- Dry-run: somente `20260921124154_financeiro_fase5_estornos.sql`, sem seed, roles, repair ou divergência.
- Aplicação concluída em **21/09/2026**, com verificação final às **10:19:16 -03 (America/Bahia)**.
- A tentativa automática de cache opcional via Docker falhou após a aplicação. O push não foi repetido; a migration foi confirmada diretamente no histórico e no catálogo remoto.

### 18.2. Estrutura e segurança

- `public.estornos` e `public.estornos_pagamentos` presentes, com RLS habilitado.
- `anon` sem acesso; `authenticated` somente `SELECT`, sem escrita direta.
- Policies de leitura limitadas a proprietária e recepção ativas da clínica; médico sem leitura direta.
- Constraints de valores, snapshot clínica/profissional, estados, motivo, idempotência, FKs e contexto clínica/recebimento confirmadas.
- Componentes limitados a dinheiro, PIX e cartão de crédito, positivos, únicos por forma e com soma diferível igual ao total do estorno.
- O constraint trigger está instalado no pai e nos componentes; UPDATE e DELETE dos componentes e DELETE do estorno foram bloqueados em teste real.
- `movimentos_caixa.estorno_id`, FK de contexto, constraint de origem e unicidade de movimento por estorno confirmados.
- Seis snapshots de estorno presentes em `fechamentos_caixa`; campos anteriores permanecem brutos e registros históricos não foram reescritos.
- RPCs `financeiro_solicitar_estorno` e `financeiro_revisar_estorno` presentes como `SECURITY DEFINER`, `search_path=pg_catalog`, `auth.uid()`, autorização interna e `EXECUTE` somente para `authenticated`.
- `financeiro_enviar_fechamento` preservou assinatura, autorização, idempotência, máquina de estados e histórico.
- Nenhuma tabela de repasse foi criada e nenhum documento fiscal foi alterado automaticamente.

### 18.3. Testes transacionais com ROLLBACK

Foram usados proprietária, recepção e paciente existentes. Profissional, vínculo, preço, três agendamentos, caixa, recebimentos e demais registros de teste existiram somente dentro da transação revertida.

- Recebimento principal de R$ 500 pela RPC real, dividido em R$ 200 dinheiro e R$ 300 PIX.
- Estorno parcial em dinheiro, parcial em PIX, dividido entre dinheiro/PIX e consumo exato do saldo restante.
- Múltiplos estornos preservaram o limite global e o limite de cada forma de pagamento.
- Estorno total resultou em R$ 100 para a clínica e R$ 400 para o profissional, exatamente iguais ao snapshot original, sem diferença de centavos.
- PIX e cartão não reduziram o dinheiro físico; somente componentes em dinheiro reduziram `valor_esperado`.
- Cenário separado em cartão confirmou estorno total sem impacto no numerário.
- Rejeição não criou movimento nem alterou o recebimento e liberou a reserva para nova solicitação.
- Retries de solicitação, aprovação e rejeição retornaram a operação existente sem duplicar componentes, movimento ou auditoria.
- Proprietária, médico e usuário de outra clínica foram impedidos de solicitar; recepção foi impedida de aprovar.
- Foram rejeitados: excesso total, excesso em dinheiro, excesso em PIX, forma ausente no recebimento, conversão PIX→dinheiro e soma de reservas acima do saldo.
- Aprovação após rejeição e rejeição após efetivação foram bloqueadas.
- Caixa em fechamento, ausência de caixa aberto e dinheiro físico insuficiente bloquearam a efetivação.
- UPDATE/DELETE de componente e DELETE de estorno foram bloqueados.
- Fechamento após estornos preservou R$ 1.500 brutos e registrou R$ 1.000 em estornos: R$ 200 dinheiro, R$ 300 PIX, R$ 500 cartão, R$ 200 clínica e R$ 800 profissionais. O esperado físico ficou líquido apenas do dinheiro estornado e da sangria transitória do cenário.
- Concorrência foi validada pela reserva de solicitações pendentes, bloqueios `FOR UPDATE`, advisory lock, constraints e índices únicos. Nenhum teste dependeu de proteção do frontend.
- O bloqueio de sessão legada foi reconfirmado estruturalmente; não foi criado recebimento clínico artificial na sessão histórica nem alterada `entradas_caixa`.

### 18.4. Persistência e legado

Após o `ROLLBACK`, as contagens foram reconferidas:

- `recebimentos`: 0;
- `movimentos_caixa`: 0;
- `sangrias_caixa`: 0;
- `fechamentos_caixa`: 0;
- `estornos`: 0;
- `estornos_pagamentos`: 0;
- profissionais sintéticos da FASE 5: 0;
- agendamentos sintéticos da FASE 5: 0.

A sessão legada permaneceu `aberto`, com R$ 150,50 de abertura, exatamente duas entradas e R$ 1.000,00 históricos. Nenhuma fixture ou operação de teste persistiu.

### 18.5. Advisors pós-aplicação

| Advisor | Errors | Warnings | Info |
|---|---:|---:|---:|
| Segurança | 0 | 48 | 0 |
| Performance | 0 | 5 | 64 |

- Os dois linters foram reexecutados após aplicação e testes.
- As RPCs financeiras `SECURITY DEFINER` permanecem intencionais, com escrita direta revogada, `search_path` fixo e autorização interna.
- Warnings e sugestões fora do escopo não foram corrigidos; nenhum índice foi removido.

### 18.6. Limites e próximo passo

- Nenhuma alteração foi feita em frontend, backend, Agenda, `entradas_caixa`, caixa legado, fiscal ou repasses.
- Não foram usados `db reset`, seed, migration repair, SQL manual substitutivo ou commit.
- A FASE 6 utilizará os snapshots de `valor_clinica` e `valor_profissional` dos estornos.

**Resultado da FASE 5: APROVADO.**

**Próximo passo oficial: FASE 6 — Repasses.**

## 19. FASE 6 — Preparação da migration de Repasses

**FASE 6 — migration de Repasses criada e aguardando revisão/aplicação.**

- Migration local: `20260921132754_financeiro_fase6_repasses.sql`.
- SHA-256 local: `3E6258DD3BB65E9F675AE0A9E7B76E913236B660695F163428ADA71E6B8CE008`.
- Foram modelados `repasses`, `repasses_itens`, `ajustes_repasse` e `aplicacoes_ajuste_repasse`, com RLS, grants mínimos, constraints, índices, proteção de histórico e auditoria.
- A aprovação do fechamento passa a gerar automaticamente um repasse por profissional, usando exclusivamente os snapshots históricos dos recebimentos e estornos.
- A RPC `financeiro_confirmar_repasse` registra a confirmação externa por PIX ou transferência, sem criar movimento de caixa.
- Estorno antes do pagamento reduz o repasse pendente; estorno após liquidação cria ajuste negativo futuro sem reescrever repasse terminal.
- **Ajuste negativo pós-repasse permanece pendente até ser integralmente compensado, podendo ser distribuído por vários repasses futuros.**
- O plano de testes foi preparado para cenários financeiros, autorização, RLS/grants, idempotência, concorrência, imutabilidade e preservação do caixa legado, todos futuramente com `ROLLBACK`.
- Nenhuma migration foi aplicada, nenhum SQL remoto foi executado e nenhum dado, frontend, backend, Agenda, fiscal, `entradas_caixa` ou caixa legado foi alterado nesta preparação.

**Próximo passo oficial:** revisão de engenharia e validação da migration da FASE 6 antes de qualquer aplicação no Supabase real.

## 20. FASE 6 — Correção de rebalanceamento antes da aplicação

**Status:** migration corrigida localmente, aguardando revisão e validação; não aplicada.

- A migration `20260921132754_financeiro_fase6_repasses.sql` foi corrigida para tratar aplicações em repasse `pendente` como provisórias.
- O estorno pré-liquidação agora registra integralmente o impacto no item, sem limitá-lo ao valor externo inicialmente previsto.
- O helper privado `private.financeiro_rebalancear_ajustes_repasse` recalcula o crédito antes dos ajustes, desfaz o excedente de aplicações na ordem inversa de criação e atualiza `valor_aplicado`/`status` do ajuste.
- Se a aplicação for totalmente devolvida, ela é removida apenas pela função privilegiada e somente enquanto o repasse pai estiver `pendente`; escrita direta por usuários continua bloqueada.
- Repasses `pago` e `ajustado`, e suas aplicações, permanecem terminais e imutáveis. Estorno sobre repasse terminal cria novo `ajustes_repasse` negativo.
- A ordem de locks foi alinhada para repasse → item; a confirmação e o estorno disputam o lock do repasse para impedir pagamento de valor antigo ou rebalanceamento após terminalização.
- A auditoria registra `rebalancear_ajuste_repasse`, repasse, profissional, clínica, ajuste, estorno causador, valor anterior, valor novo e valor devolvido.
- Foi criado `database/tests/financeiro/20260921_fase6_repasses_rebalanceamento.sql`, com os cenários A–F, concorrência e proteção de histórico, sempre com `ROLLBACK` e sem fixtures persistentes.
- SHA-256 da migration corrigida: `344E41F371ADDD6954443E901521A9577FD0D8798E3CF6F2CC50E5D7141223E0`; o SHA anterior `3E6258DD3BB65E9F675AE0A9E7B76E913236B660695F163428ADA71E6B8CE008` não é mais válido.
- Nenhum `db push`, SQL remoto, fixture persistida, alteração de frontend/backend ou commit foi realizado.

## 21. FASE 6 — Aplicação e validação final

**FASE 6 — Repasses: CONCLUÍDA**

- Autorização explícita recebida para aplicar `20260921132754_financeiro_fase6_repasses.sql` no projeto `xftnkusbyqzyvzrovroj`.
- SHA-256 aplicado: `344E41F371ADDD6954443E901521A9577FD0D8798E3CF6F2CC50E5D7141223E0`.
- `supabase db push --linked --yes` aplicado com sucesso, retornando código 0. A única migration aplicada foi a FASE 6.
- O cache opcional do catálogo não foi gerado porque o Docker não estava disponível; o push não foi repetido.
- Histórico remoto confirma `20260921132754 | financeiro_fase6_repasses`.
- As tabelas `public.repasses`, `public.repasses_itens`, `public.ajustes_repasse` e `public.aplicacoes_ajuste_repasse` estão presentes com RLS habilitado.
- Verificados: 37 constraints, 16 índices, triggers de proteção/validação, RPCs com assinatura prevista e `search_path=pg_catalog`.
- Grants confirmados nas quatro tabelas: `anon` sem SELECT; `authenticated` somente SELECT, sem INSERT/UPDATE/DELETE.
- Contagens pós-aplicação: `recebimentos=0`, `estornos=0`, `movimentos_caixa=0`, `fechamentos_caixa=0`, `repasses=0`, `repasses_itens=0`, `ajustes_repasse=0`, `aplicacoes_ajuste_repasse=0`.
- Caixa legado preservado: sessão `aberto`, abertura R$ 150,50, duas entradas, total histórico R$ 1.000,00.
- Advisors executados. Os avisos encontrados são preexistentes, relacionados a funções públicas/SECURITY DEFINER, extensão em `public`, índices sem uso e recomendações de performance; nenhum warning fora do escopo foi alterado.
- O E2E com fixtures financeiras não foi executado porque o remoto não possui identidades, clínica ou dados operacionais disponíveis; não foram criadas fixtures persistentes. A concorrência foi validada estaticamente pela ordem de locks e pela definição das RPCs.
- Nenhuma alteração foi feita em frontend, backend, FASE 7, `entradas_caixa` ou dados persistentes de negócio.

**Próximo passo oficial: FASE 7 — Fiscal.**

## 22. FASE 7 — Preparação da migration Fiscal interna

**FASE 7 — migration fiscal criada e aguardando revisão/aplicação.**

- Auditoria local/remota confirmou que `public.documentos_fiscais` já existe desde a FASE 3, com seis colunas, estados `pendente/emitida/cancelada/erro`, RLS habilitado, leitura autenticada por policy e zero registros.
- A migration `20260921141607_financeiro_fase7_fiscal_interno.sql` adapta a tabela existente; não a recria.
- SHA-256 após a revisão de compatibilidade e concorrência: `43A794EC1CFE616B29F23BA21AC8A9DC1A09780738FC439375FF44896E28A984`. Os SHAs anteriores `7451C2517D6EBBCA6111FDCE254CD65A8D09CB438306EAACDEB783973DE520F5`, `91F85E2D78E2D76EA8431BE40F0ED238E98B2647F34AED66815B47C6DF5263CC`, `AE6146ECC6029C955D830379BBB1666B67B87E8311975C6CCEDBE52249892017` e `C24DCCCD54F211F74C9791A5903DD978BBA5C018B01ECF7D75DEF9CCC6A4D4CE` não são mais válidos.
- Estados planejados: `pendente`, `emissao_solicitada`, `emitida`, `erro_emissao`, `cancelamento_solicitado`, `cancelada` e `erro_cancelamento`.
- Foi modelada `tentativas_documento_fiscal` para preservar tentativas de emissão/cancelamento, sem tokens, senhas, certificados privados ou payloads sensíveis.
- RPCs públicas solicitam emissão/cancelamento somente para proprietária ou recepção autorizadas. Elas criam tentativa, atualizam o estado de solicitação e auditam; não marcam resultado concluído.
- Funções privadas de resultado foram preparadas sem EXECUTE para `anon`/`authenticated`, para futura integração confiável provider-neutral.
- Cada resultado privado exige `documento_fiscal_id` e `tentativa_documento_fiscal_id`; clínica, tipo, estado do documento e tentativa ativa são conferidos. Não há fallback por `ORDER BY` da tentativa mais recente.
- Índice único parcial garante uma única tentativa `solicitada`/`processando` por documento e tipo. Cada retry gera nova linha e preserva a tentativa finalizada.
- Resposta atrasada de tentativa anterior é rejeitada sem alterar o documento. Resultado idêntico repetido para tentativa finalizada retorna no-op; resultado conflitante falha sem nova auditoria ou transição.
- RLS/grants mantêm `anon` sem acesso, `authenticated` somente SELECT e nenhuma escrita direta nas duas tabelas.
- Transições inválidas, exclusão de histórico, contexto de clínica e idempotência são protegidos por constraints, triggers e locks.
- Estorno financeiro não cancela documento fiscal automaticamente; a sinalização permanece separada.
- Testes preparados em `database/tests/financeiro/20260921_fase7_fiscal_interno.sql`, sempre com `ROLLBACK` e sem fixtures persistentes.
- Provedor/API fiscal permanece indefinido; não foram criadas integrações, segredos, certificados, webhooks ou Edge Functions reais.
- Nenhuma migration foi aplicada, nenhuma alteração remota persistiu, nenhuma fixture foi persistida, e não houve alteração em frontend/backend ou commit.
- A primeira tentativa autorizada de `db push` foi revertida pela transação ao encontrar assinatura incorreta no `REVOKE` final; o histórico remoto confirma a FASE 7 ainda ausente. O SQL foi corrigido localmente e aguarda nova autorização por ter novo SHA.

## 23. FASE 7 — Aplicação e validação final

**FASE 7 — Fiscal interno: CONCLUÍDA.**

- Projeto remoto: `Clinica Patrícia`, ref `xftnkusbyqzyvzrovroj`.
- Migration aplicada: `20260921141607_financeiro_fase7_fiscal_interno.sql`.
- SHA-256 aplicado: `43A794EC1CFE616B29F23BA21AC8A9DC1A09780738FC439375FF44896E28A984`.
- Histórico remoto confirma `20260921141607 | financeiro_fase7_fiscal_interno`; não houve outra migration, seed, role ou repair no push.
- `public.documentos_fiscais` foi adaptada sem recriação, permanece vazia e possui os sete estados fiscais aprovados; a constraint não contém o estado genérico `erro`.
- `public.tentativas_documento_fiscal` foi criada, permanece vazia, preserva emissão/cancelamento e possui tentativa ativa única por documento/tipo (`solicitada`/`processando`).
- RLS está habilitado nas duas tabelas; `anon` não possui acesso; `authenticated` possui somente SELECT autorizado; escrita direta permanece revogada.
- RPCs públicas de solicitação estão disponíveis apenas para `authenticated`; funções privadas de resultado exigem tentativa específica, usam `search_path=pg_catalog` e não possuem EXECUTE para `PUBLIC`, `anon` ou `authenticated`.
- Teste E2E temporário executado com a RPC real `financeiro_registrar_recebimento`, retry, stale response, duplicidade e conflito de callbacks de emissão/cancelamento; terminou com `ROLLBACK`.
- Pós-teste confirmou zero documentos, zero tentativas, zero recebimentos, zero estornos e zero repasses persistidos.
- Caixa legado preservado: uma sessão aberta, abertura de R$ 150,50, duas entradas e R$ 1.000,00 acumulados.
- `supabase db lint --linked` concluiu sem erros de schema.
- O cache opcional via Docker falhou após o push confirmado porque o daemon não estava disponível; a aplicação não foi repetida.
- Security Advisor e Performance Advisor do Dashboard não possuem comando equivalente na CLI usada nesta execução; o lint de schema passou. Avisos de Advisor permanecem pendentes de consulta no Dashboard.
- A integração fiscal externa permanece **PENDENTE/BLOQUEADA** até definição do provedor/API. `emissao_solicitada` e `cancelamento_solicitado` significam apenas solicitações internas registradas.
- Próximo passo oficial: **FASE 8 — Dashboards do médico e da proprietária**.

## 24. FASE 8 — Preparação local da camada de dashboards

**FASE 8 — camada de dados dos Dashboards criada e aguardando revisão/aplicação.**

### Revisão local posterior — não aplicada

- Correção solicitada antes de push: filtro de forma preserva uma linha por recebimento com `EXISTS`; componentes só entram no bloco de pagamentos.
- Removido UUID legado da lógica de dashboard; incompatibilidade é exclusivamente estrutural por `entradas_caixa`.
- Contrato e payload revisados: timezone explícita validada, caixa atual separado de aprovações por `fechado_em`, repasse gerado/pago/pendente separado e ajuste pendente com valor positivo/contra-partida contábil negativa.
- Alerta de tentativa fiscal duplicada foi consolidado no alerta do documento em erro; alertas operacionais atuais não usam intervalo do gráfico, exceto percentual da coorte.
- Teste local ampliado para split payment, segunda sessão legada, limites `[inicio,fim)`, timezone, profissional sem ativo e ambiguidade de dois ativos. Continua **não executado** e todo cenário termina em ROLLBACK.
- Revisão estática final: `git diff --check` também contra os três arquivos não rastreados passou; pglast aceitou 24 comandos externos da migration, seus dois corpos SQL e cinco funções PL/pgSQL; o roteiro possui 186 comandos externos, três blocos DO e as fixtures foram cruzadas por AST contra 36 tabelas da cadeia local, sem coluna ausente. O parser continua limitado ao serializar a árvore do trigger de auditoria; isso não é compilação PostgreSQL. Não houve `db push`, SQL remoto, fixture persistida, frontend ou commit.

- Projeto alvo futuro: `xftnkusbyqzyvzrovroj`. Nenhum SQL remoto ou `db push` nesta tarefa.
- Arquivo: `supabase/migrations/20260922015417_financeiro_fase8_dashboards.sql`, criado exclusivamente pelo CLI com `migration new financeiro_fase8_dashboards`. O timestamp UTC foi gerado pelo CLI, não inventado.
- SHA-256 local após revisão de correções: `4217009DDB6D2F657A7329FD4DB15B9BF953FBE476857BD4967246FAA4B79E48`. O SHA anterior `1674DF7B7E4339686D94F2C44DFF7AD27F3F3E3E141817218BB3E5752AA8F24E` não é válido para aplicação.
- A primeira chamada do CLI falhou ao escrever telemetria fora do sandbox; repetida com permissão para criar o arquivo local, sem aplicação remota.
- Duas RPCs de dashboard, uma de configuração, helpers privados e única tabela de thresholds. Sem tabelas de saldos/séries/alertas derivados, frontend, gráficos, relatórios, FASE 9 ou commit.
- Coorte líquida atual e eventos de estorno separados; parcelas exclusivamente por snapshots. Repasses distinguem aplicações provisórias/terminais e estoque atual de ajustes; filtros por domínio explicitados para revisão no contrato 09.
- Escopo administrativo por vínculos ativos de proprietária. Médico identificado internamente e limitado à interseção dos vínculos ativos. Caixa exclui sessão histórica e qualquer caixa híbrido/incompatível.
- Configuração com RLS, grants mínimos, PATCH validado, serialização por clínica, no-op idempotente e auditoria. Thresholds NULL por padrão; alertas calculados sem conteúdo pessoal sensível.
- Teste preparado em `database/tests/financeiro/20260922_fase8_dashboards.sql`: fixtures diretas transacionais, números exatos, três clínicas, dois médicos, sete estados fiscais, parcelas/ajustes, filtros, timezone, configurações, segurança e preservação do legado. Foi iniciado no banco remoto, mas **não concluiu**: a validação deferida de soma de componentes de pagamento falhou antes das asserções de dashboard. Todas as tentativas foram revertidas e requerem correção específica do harness antes de nova execução.
- EXPLAIN preparado no teste, **não executado**. Nenhum índice adicional fora da PK de configuração. Performance com volume representativo segue pendente.
- Verificação estática adicional com pglast 8.4 em diretório temporário: SQL externo e corpos SQL aceitos, cinco funções PL/pgSQL da migration aceitas, funções auxiliares/blocos DO dos testes aceitos. A conversão JSON da árvore do trigger de auditoria apresentou limitação do parser; não se declara compilação no servidor. Parser usa gramática PG 18.4, não substitui validação no PG 17 do projeto. Nenhum banco foi criado/conectado para essa verificação.
- As colunas dos INSERTs das fixtures foram comparadas por AST com a cadeia local de migrations (36 tabelas catalogadas), sem coluna ausente. Isso não executa constraints/FKs nem garante o resultado das asserções. A primeira passagem dessa checagem falhou por codificação da entrada; a repetição em UTF-8 passou.
- Documentação sincronizada: README, documentos 01, 02, 04, 05, 06, 07, este checkpoint e contrato novo 09. Auditoria histórica 03 preservada.
- A migration foi aplicada no projeto remoto `xftnkusbyqzyvzrovroj` e o histórico confirma `20260922015417 financeiro_fase8_dashboards`. Catálogo confirma as RPCs, helpers, RLS e grants previstos. Nenhuma fixture persistida ou legado modificado. A fase **não está concluída**: faltam testes dinâmicos integrais, isolamento final, EXPLAIN e Advisors.

## 25. FASE 8 — Validação dinâmica concluída

**FASE 8 — camada de dados dos Dashboards: CONCLUÍDA**

- O `23514` era causado pelo harness: após validar o primeiro lote com `SET CONSTRAINTS ALL IMMEDIATE`, o modo permanecia imediato e o primeiro recebimento da fixture de bordas era verificado antes da inserção de seu componente. O roteiro agora restaura `SET CONSTRAINTS ALL DEFERRED` antes do próximo lote pai/componentes.
- Prova positiva aprovada: recebimento bruto R$ 500,00 com R$ 200,00 dinheiro + R$ 300,00 PIX. Prova negativa isolada aprovou o `23514` para bruto R$ 500,00 com apenas R$ 200,00, revertendo a subtransação inválida.
- Suíte integral `database/tests/financeiro/20260922_fase8_dashboards.sql` executada com sucesso no remoto e encerrada com `ROLLBACK`. Todas as assertions de coorte, split, filtros, estornos, timezone, multi-clínica, médicos, repasses, ajustes, fiscal, caixa, legado, thresholds, no-op, auditoria, alertas, limites e papéis passaram.
- A fixture de timezone foi corrigida para `2000-02-02 01:30:00Z`: em fevereiro de 2000 Bahia usava UTC-2, portanto `02:30Z` não cruzava a meia-noite local.
- EXPLAIN com fixtures temporárias: produção/estornos usou `recebimentos_clinica_data_idx` (0,140 ms); repasses usou `repasses_clinica_status_data_idx` (0,107 ms). Nenhum problema diretamente causado pela FASE 8.
- Advisors rerodados: Security `0 erros`, `54 avisos`, `0 sugestões`; Performance `0 erros`, `5 avisos`, `77 sugestões`. Os avisos exibidos pertencem a objetos legados/fases anteriores; nenhum referencia objetos da FASE 8. Nada foi corrigido automaticamente.
- Contagens finais: recebimentos, componentes, estornos, repasses, documentos fiscais, configurações e entidades sintéticas = 0. Caixa legado `a4a18e49-6634-4058-9fd8-07f3b065fd63` permanece aberto, abertura R$ 150,50, duas entradas e total R$ 1.000,00.
- Migration aplicada permaneceu imutável no SHA-256 `4217009DDB6D2F657A7329FD4DB15B9BF953FBE476857BD4967246FAA4B79E48`. Nenhuma fixture persistiu, nenhum frontend foi alterado e nenhum commit foi feito.

**Próximo passo oficial: FASE 9 — Relatórios PDF/Excel.**

A FASE 9 não foi iniciada nesta validação.

## 26. FASE 9 — Preparação local de Relatórios PDF/Excel

**FASE 9 — Relatórios PDF/Excel: EM PREPARAÇÃO / AGUARDANDO REVISÃO**

- Migration local criada pelo Supabase CLI: `20260922034925_financeiro_fase9_relatorios.sql`.
- SHA-256 local após revisão de segurança/consistência: `80559457C4C00CA66F5C91EBB269D13FE5994ED45B4C73D333E73F2DF10B056C`. O SHA anterior `CD1C04A7671FAE8BA8C4081736397A73DA969BAC2334F3925AE7DB21C148D8E4` não é válido para aplicação.
- A migration não foi aplicada; não houve conexão, escrita ou fixture no projeto remoto `xftnkusbyqzyvzrovroj`.
- Foram preparadas cinco RPCs paginadas de leitura e uma RPC de auditoria da solicitação de exportação. Resumos permanecem nas RPCs homologadas da FASE 8.
- Paginação keyset de até 500 linhas, ordenação determinística e cursor vinculado a usuário, escopo, período, filtros e timezone. Cada página devolve contexto, marcador e totais integrais; o cliente compara todas as páginas, revalida ao final e aborta se houver deriva.
- O cliente reconcilia quantidade e totais monetários aditivos das linhas detalhadas usando centavos inteiros com `BigInt`; divergência cancela a geração.
- Repasses distinguem `gerados_periodo`, `pagos_periodo` e `pendentes_atuais`; o terceiro modo também está disponível para o médico.
- Médico é identificado internamente e não recebe fiscal, caixa, auditoria ou dados de outro profissional. Proprietária permanece limitada às clínicas ativas autorizadas.
- `PUBLIC`/`anon` sem EXECUTE; `authenticated` somente nas RPCs públicas; helpers privados sem EXECUTE para clientes; `search_path=pg_catalog`.
- Auditoria registra pedido, público, dataset, formato, período e filtros sanitizados, uma linha por clínica autorizada. Não afirma sucesso da geração local.
- Dependências fixadas após auditoria: `jspdf@4.2.1`, `jspdf-autotable@5.0.8` e `write-excel-file@4.1.1`. `exceljs` foi removida antes da implementação por dependência transitiva vulnerável.
- `npm audit` reportou cinco entradas de pacote em severidade alta, todas propagadas do único advisory de `nanoid@3.3.16` na cadeia preexistente Vite/PostCSS; nenhuma pertence às três bibliotecas da FASE 9 e não há correção disponível na árvore atual.
- Geradores locais criados em `src/lib/financeiroRelatorios.ts`; coletor paginado e auditoria em `src/lib/financeiroRelatoriosRpc.ts`. Nenhum componente, botão ou tela final foi criado.
- Roteiro `database/tests/financeiro/20260922_fase9_relatorios.sql` preparado com `ROLLBACK`; não executado, pois a migration não foi aplicada.
- Parser pglast 8.4 aceitou integralmente a migration revisada e o roteiro transacional. Isso não substitui compilação no PostgreSQL remoto.
- `npm run build` passou. `npm run lint` passou com apenas um aviso preexistente em `src/theme/ThemeProvider.tsx`.
- Exemplos sintéticos regenerados e validados: PDF com 4 páginas e XLSX com abas `Resumo`, `Recebimentos`, `Repasses` e `Fiscal`. Nenhum dado real foi utilizado.
- Fixtures hostis com fórmulas aparentes, HTML/script, aspas e travessia de caminho permaneceram texto literal. XLSX contém zero fórmulas; PDF não contém JavaScript, formulário, link/anotação ativa ou ação executável.
- Split payment permanece em uma linha com colunas numéricas separadas para dinheiro, PIX e cartão. PDF e todas as abas do XLSX foram renderizados e inspecionados visualmente.
- A auditoria aceita somente chaves, tipos e valores de filtros em allowlist; nenhum campo livre ou conteúdo pessoal é persistido.
- Contrato documentado em `10-CONTRATO-RELATORIOS.md`; plano e README sincronizados.
- Migration aplicada da FASE 8 permaneceu intocada e com SHA-256 `4217009DDB6D2F657A7329FD4DB15B9BF953FBE476857BD4967246FAA4B79E48`.
- Nenhum `db push`, reset, repair, seed, storage, frontend final, dado real, commit ou FASE 10 foi executado.

**Próximo passo:** revisão de engenharia da migration e do contrato da FASE 9. Aplicação remota exige autorização específica futura pelo arquivo e SHA-256.

## 27. FASE 9 — Preflight e dry-run

**FASE 9 — preflight e dry-run concluídos / aguardando autorização de aplicação.**

- SHA-256 confirmado antes do acesso remoto: `80559457C4C00CA66F5C91EBB269D13FE5994ED45B4C73D333E73F2DF10B056C`.
- Projeto confirmado pela API e pelo vínculo local: `Clinica Patrícia`, ref `xftnkusbyqzyvzrovroj`, estado `ACTIVE_HEALTHY`.
- Histórico remoto confirmou as FASES 1–8 até `20260922015417 financeiro_fase8_dashboards`; a FASE 9 permanece ausente e não há migration posterior.
- As nove funções previstas da FASE 9 estão ausentes no catálogo remoto antes da aplicação.
- Contagens operacionais permanecem zeradas: recebimentos/componentes, movimentos, sangrias, fechamentos/revisões, estornos/componentes, repasses/itens/ajustes/aplicações, documentos/tentativas fiscais, configurações de alertas e eventos de auditoria. As três configurações financeiras-base permanecem.
- Caixa legado preservado: sessão `a4a18e49-6634-4058-9fd8-07f3b065fd63` aberta, valor de abertura R$ 150,50, duas entradas e total de R$ 1.000,00.
- Dependências e lockfile conferidos: `jspdf@4.2.1`, `jspdf-autotable@5.0.8`, `write-excel-file@4.1.1`; `exceljs` ausente; lockfile v3 sincronizado.
- Revisão estrutural confirmou seis RPCs públicas, três helpers privados, nenhuma tabela/view/bucket/Edge Function e nenhuma alteração das migrations das FASES 1–8.
- RPCs médicas não recebem `profissional_id`; identidade e escopo são derivados internamente. Os três modos de repasse, coorte fiscal, cursor contextual, marcador anti-drift e allowlists de auditoria permanecem no SQL aprovado.
- `supabase db push --help` foi consultado antes do dry-run.
- `supabase db push --dry-run` retornou somente `20260922034925_financeiro_fase9_relatorios.sql`, com `seeds=[]` e `roles=[]`.
- O histórico foi consultado novamente após o dry-run e confirmou a FASE 9 ainda ausente.
- Nenhum `db push` real, DDL/DML remoto, roteiro transacional, fixture, frontend, FASE 10 ou commit foi executado.

**Próximo passo:** aplicação somente após a autorização exata para a migration `20260922034925` no projeto `xftnkusbyqzyvzrovroj`.

## 28. FASE 9 — Aplicação e validação final

**FASE 9 — Relatórios PDF/Excel: CONCLUÍDA**

- Autorização explícita recebida para aplicar `20260922034925_financeiro_fase9_relatorios.sql` no projeto `xftnkusbyqzyvzrovroj`.
- SHA-256 aplicado: `80559457C4C00CA66F5C91EBB269D13FE5994ED45B4C73D333E73F2DF10B056C`.
- `supabase db push --linked --yes` concluiu com código 0 e aplicou somente a FASE 9; `seeds=[]` e `roles=[]`.
- O cache opcional do catálogo falhou depois da aplicação confirmada porque o Docker não estava disponível. O push não foi repetido.
- Histórico remoto confirma `20260922034925 | financeiro_fase9_relatorios`.
- Catálogo confirma seis RPCs públicas e três helpers privados com as assinaturas previstas. Públicas: `SECURITY DEFINER`, `search_path=pg_catalog`, `authenticated` com `EXECUTE`, `PUBLIC`/`anon` sem `EXECUTE`. Helpers: `SECURITY INVOKER` e sem `EXECUTE` para papéis clientes.
- As RPCs médicas não aceitam `profissional_id`; a identidade continua derivada internamente. Repasses mantêm `gerados_periodo`, `pagos_periodo` por `confirmado_em` e `pendentes_atuais`.
- A suíte `database/tests/financeiro/20260922_fase9_relatorios.sql` passou no remoto e terminou com `ROLLBACK`. Foram validados banco vazio, período `[inicio,fim)`, timezone inválida, paginação/contexto, cursor adulterado, split payment, estorno posterior no líquido atual, multi-clínica, isolamento médico, três modos de repasse, fiscal, auditoria, grants e papéis bloqueados.
- Pós-teste confirmou zero recebimentos, componentes, estornos, repasses, documentos fiscais, auditorias e entidades sintéticas persistidas.
- Caixa legado preservado: sessão aberta, abertura R$ 150,50, duas entradas e total histórico R$ 1.000,00.
- `supabase db lint --linked` concluiu sem erros. Permanecem três warnings preexistentes da FASE 8 e um warning não funcional da FASE 9: variável `v_profissional` resolvida durante a validação de escopo da auditoria, mas não lida posteriormente. Nenhuma correção manual foi aplicada à migration imutável.
- Exemplos sintéticos PDF/XLSX, proteção contra fórmula, sanitização de filename, privacidade e reconciliação local permanecem conforme o contrato aprovado.
- Nenhum seed, role, repair, frontend, botão, relatório com dados reais, FASE 10 ou commit foi executado.

**Próximo passo oficial: FASE 10 — Migração do frontend.**

A FASE 10 não foi iniciada nesta validação.

## 29. FASE 10A — Migração frontend / camada de dados

**FASE 10A — Migração frontend / camada de dados: EM EXECUÇÃO**

- Auditoria atualizada do frontend, Fastify financeiro, mocks, UUIDs visuais, tipos, cálculos JS, formas antigas e pontos de entrada Agenda/Financeiro.
- Cliente Supabase oficial reutilizado; prefere chave publishable e mantém fallback temporário para anon. Nenhum segundo cliente, `service_role`, secret key, credencial PostgreSQL ou HMAC foi adicionado ao browser.
- Nova camada criada em `src/lib/financeiro/`, separada por tipos, RPC, erros, idempotência, dinheiro, datas, recebimentos, caixa, estornos, repasses, fiscal, dashboards, relatórios e invalidação.
- Wrapper médico não aceita `profissional_id`, usuário ou papel. Recebimento não aceita preço, percentual, parcela da clínica ou parcela profissional calculados pelo frontend.
- Dinheiro validado com centavos `BigInt`; a conversão para número ocorre apenas na borda RPC e o banco permanece autoridade.
- Idempotência persiste em `sessionStorage` por intenção: retry de rede usa a mesma chave; chave só é liberada após resultado definitivo ou cancelamento explícito.
- `useFinanceiroConsulta` diferencia carregamento, sucesso vazio e erro e descarta resposta obsoleta após mudança de contexto.
- Infraestrutura da FASE 9 preservada. Coletor paginado recebeu executor testável e erro sanitizado; PDF/XLSX são expostos por `import()` sob demanda.
- Teste automático compara nomes de parâmetros dos wrappers com as assinaturas finais nas migrations aplicadas.
- `npm run test:financeiro`: 10 testes aprovados, zero falhas.
- `npm run build`: aprovado. Bundle inicial permaneceu sem ocorrências de `jspdf`, `jspdf-autotable` ou `write-excel-file`; warning de chunk principal acima de 500 kB permanece geral/preexistente.
- `npm run lint`: aprovado com somente o warning preexistente em `src/theme/ThemeProvider.tsx:102`.
- Fastify financeiro, telas, hooks e componentes antigos foram preservados para comparação/rollback visual. Nenhuma tela definitiva foi redesenhada e nenhum UUID visual legado foi removido ainda.
- Bloqueios documentados: despesas fora do domínio aplicado, complemento sem RPC aplicada, fiscal externo indefinido, transição do caixa legado e ausência de tipos globais Supabase gerados.
- Documentação detalhada criada em `11-MIGRACAO-FRONTEND.md`; README e plano sincronizados.
- Nenhuma migration criada/editada, nenhum `db push`, SQL remoto, alteração de RLS/grant/policy, fixture, backend remoto ou commit foi executado.

**Próximo passo:** revisão da camada da FASE 10A antes de iniciar o redesenho e integração das telas. A FASE 10 completa não está concluída.

## 30. FASE 10B — Agenda → Recebimento

**FASE 10 — Migração frontend: EM EXECUÇÃO**

A FASE 10A foi declarada concluída e aprovada pelo usuário na autorização da FASE 10B. A seção 29 descreve a entrega histórica anterior.

- Primeiro fluxo ligado a `registrarRecebimento`: Agenda → consulta elegível → formas → revisão → RPC → resposta confirmada.
- Preço de `profissionais_clinicas.valor_consulta` sob RLS; sem edição ou percentual no formulário. RPC relê preço/configuração na transação.
- Dinheiro/PIX/cartão de crédito e split com centavos BigInt; parcelas clínica/profissional vêm da resposta.
- Idempotência da FASE 10A, intenção por usuário/clínica/agendamento, trava síncrona, loading, retry com mesma chave e bloqueio de fechamento durante envio.
- Mensagens para caixa ausente e legado; nenhuma sessão fechada, convertida ou contornada.
- `ModalBase` extraído da Agenda: diálogo nativo, foco contido, retorno ao acionador e campos grandes.
- Agenda relê dados após sucesso e sinaliza recebimento registrado sem novo status clínico. Invalidações publicadas conforme matriz.
- Harness Playwright executa Agenda real com interceptação HTTP sintética e bloqueio de conexões externas.
- Evidências e arquivos em `11-MIGRACAO-FRONTEND.md`, seção 12.
- Nenhuma migration, alteração de banco, RPC nova, deploy, commit ou outra tela financeira.

- Validação final: 10/10 testes da camada + 48/48 testes de integração navegador; build e lint aprovados. Doze screenshots sintéticos gerados; foco e responsividade revisados. Warnings e limitação do teardown Windows documentados em 11, seção 12.8.

Próximo passo: revisão da FASE 10B. Migração completa do frontend permanece em execução.

## 31. FASE 10C — Auditoria e dependência de leitura (histórico)

**FASE 10 — Migração frontend: EM EXECUÇÃO**

- FASE 10B aprovada pelo usuário ao solicitar a FASE 10C.
- Tela antiga, Fastify, entradas_caixa, cálculos Number, UUIDs e componentes reaproveitáveis auditados.
- Catálogo remoto consultado somente por SELECT: oito RPCs de mutação disponíveis, cálculo oficial privado sem EXECUTE para authenticated; nenhuma RPC pública de resumo operacional encontrada.
- Início de fechamento não retorna resumo; valores oficiais retornam após envio. Dashboards não suprem conferência por sessão para recepção.
- Não é possível cumprir resumo/conferência usando apenas contratos atuais sem violar a proibição de cálculo financeiro no cliente ou ampliar backend.
- Proposta mínima de contrato de leitura registrada em 11, seção 13; não implementada, não aprovada e nenhuma migration criada.
- Nenhuma alteração no frontend ou banco; nenhum teste/screenshot novo alegado. SQL diagnóstico em scratch/financeiro-10c-catalogo-leitura.sql.

Próximo passo: decisão de escopo para disponibilizar leitura oficial; não iniciar Estornos UI.

## 32. FASE 10C — Preparação local autorizada (histórico)

**FASE 10 — Migração frontend: EM EXECUÇÃO**
**Estado naquele checkpoint: FASE 10C aguardando RPC de leitura do caixa.**

CLI criou `20260922181438_financeiro_fase10c_resumo_caixa.sql`; SHA-256 `153738A292F4EF10CDE775D84C8D2E976122CBEF7BD3B28D7D2CCD7CC4075F8E`. Única RPC nova: `public.financeiro_resumo_caixa(uuid) returns jsonb`, STABLE, somente leitura, autorização interna e helper privado preservado. Dez valores reutilizados do helper mais estornos em dinheiro pela base homologada.

Testes transacionais preparados em `database/tests/financeiro/20260922_fase10c_resumo_caixa.sql`, não executados. Revisão estática e diff-check locais; sem parser PostgreSQL disponível. Nenhum SQL remoto, push/dry-run, mudança nas fases anteriores, frontend, legado ou commit. Detalhes na seção 14 do documento 11. Aguardando revisão; fase não concluída.

## 33. FASE 10C — Aplicação e validação da RPC de leitura

**RPC DE LEITURA DO CAIXA APLICADA E VALIDADA; interface pendente.**

- Autorização específica recebida para aplicar somente `20260922181438_financeiro_fase10c_resumo_caixa.sql` no projeto `Clinica Patrícia`, ref `xftnkusbyqzyvzrovroj`, `ACTIVE_HEALTHY`.
- SHA-256 reconfirmado antes da aplicação: `153738A292F4EF10CDE775D84C8D2E976122CBEF7BD3B28D7D2CCD7CC4075F8E`.
- Dry-run listou somente a migration 10C, `seeds=[]` e `roles=[]`. O comando `supabase db push --linked --yes` aplicou somente essa migration; esse comando não é um `git push`. Histórico remoto confirma `20260922181438 | financeiro_fase10c_resumo_caixa` como última versão.
- Catálogo confirma a única RPC nova `public.financeiro_resumo_caixa(uuid) returns jsonb`, `STABLE`, `SECURITY DEFINER`, `search_path=pg_catalog`; `authenticated` com `EXECUTE`, `PUBLIC`/`anon` sem `EXECUTE`. Helper privado permanece sem `EXECUTE` para clientes.
- Roteiro integrado `database/tests/financeiro/20260922_fase10c_resumo_caixa.sql` passou com código 0 e `ROLLBACK`, incluindo a assertion da fórmula oficial e cenários de autorização, estados, zeros, split, sangrias, estornos e leitura sem efeitos.
- Pós-teste: 16 tabelas operacionais verificadas em zero; três configurações-base preservadas; nenhuma identidade, clínica ou paciente sintético permaneceu. A única sessão legada segue aberta, abertura R$ 150,50, duas entradas, total R$ 1.000,00.
- O cache local opcional da CLI falhou por Docker indisponível depois da aplicação; o comando terminou com código 0. Na etapa de aplicação não houve seed global, reset, Git push, commit, alteração de frontend ou dado legado.

## 34. FASE 10 — Interface operacional do caixa (incremento local)

**Estado:** integrada ao aplicativo; validação automatizada sintética aprovada; E2E autenticado remoto pendente. Esta entrega não reaplica nem modifica a migration 10C.

- `FinanceiroCaixa.tsx` substitui a tela Fastify/`entradas_caixa` na navegação principal. `Financeiro.tsx` e componentes antigos permanecem fora dessa rota para comparação e remoção controlada posterior.
- `financeiro.caixa-leitura.ts` seleciona a sessão ativa sob RLS, distingue sessão legada por chave de idempotência ausente e consulta `public.financeiro_resumo_caixa(uuid)` somente para sessão operacional. A RPC conserva o bloqueio adicional por `entradas_caixa`; a UI não calcula o resumo oficial.
- Proprietária/recepção veem abertura, recebimentos por forma, suprimentos, sangrias, estornos em dinheiro, dinheiro esperado e parcelas retornados pela RPC. Médico não consulta nem opera o caixa geral.
- Abertura, suprimento, solicitação/revisão/efetivação de sangria e início/envio/revisão de fechamento usam os wrappers RPC homologados, com confirmações e invalidação da leitura. Dados do legado não são convertidos, fechados ou alterados.
- A mesma chave de idempotência é preservada para retry; formulários ficam bloqueados para edição após envio até conclusão ou cancelamento explícito. Erros não são convertidos em valores zero; a consulta pode ser repetida.
- `npm run test:financeiro`: 11/11; Playwright sintético da tela real: 14/14 em desktop/mobile, com bloqueio de toda conexão externa; `npm run build` e `npm run lint` aprovados. A suíte inclui sangria em três etapas, fechamento divergente justificado, aprovação, devolução com orientação e segunda tentativa. O warning de Fast Refresh do tema e os avisos de divisão de bundle continuam não bloqueantes. Capturas sintéticas em `scratch/financeiro-caixa-{desktop,mobile}.png` foram inspecionadas; contraste do CTA foi corrigido após a inspeção.
- Nenhuma migration, SQL remoto, fixture no Supabase, `supabase db push`, reset ou Git push nesta etapa. O E2E autenticado real e as demais interfaces financeiras da FASE 10 continuam pendentes.

## 35. FASE 10 — Estornos e painéis (incremento local)

**Estado:** interfaces integradas localmente; testes sintéticos e unitários aprovados; E2E autenticado remoto pendente.

- Nova tela de Estornos para recepção solicitar por componente original e proprietária revisar/aprovar/rejeitar. Lista paginada de recebimentos, saldo visual conservador que reserva solicitações existentes, motivos, chave idempotente, loading, erros e feedback. O banco continua autoridade sobre saldo, papéis e transição. A proprietária não recebe botão de solicitação: a FASE 5 aplicada verifica somente `recepcao` em `financeiro_solicitar_estorno`, enquanto a matriz funcional aprovada permite também `proprietaria`. Não alterar a FASE 5 homologada; correção exige migration aditiva testada.
- Painéis da proprietária e do médico usam as RPCs separadas da FASE 8. O médico nunca envia `profissional_id`; clínica única ou consolidação de vínculos autorizados. Datas selecionadas são dias inclusivos de Bahia convertidos ao intervalo bancário `[início, próximo dia)`; a UI separa produção, estornos-evento, estoque atual de ajustes/repasses, fiscal, caixa e alertas conforme contrato. O médico não vê fiscal/caixa administrativo.
- `FinanceiroModulo` organiza Caixa/Estornos/Painel por papel. Nenhum UUID técnico é digitado. O Financeiro antigo e dados legados não foram removidos ou alterados.
- `npm run test:financeiro`: 13/13; Playwright Estornos: 6/6 e Painel: 4/4 em desktop/mobile com HTTP sintético interceptado; `npm run build` e `npm run lint` passaram (warning preexistente de tema e aviso de tamanho de bundle). Capturas em `scratch/financeiro-estornos-{desktop,mobile}.png` e `scratch/financeiro-painel-{proprietaria,medico}-{desktop,mobile}.png` foram revisadas; não são artefatos de produção.
- Nenhuma migration, SQL remoto, fixture no Supabase, `supabase db push` ou Git push neste incremento. Permanecem pendentes: correção aditiva da autorização de solicitação pela proprietária, repasses, fiscal interno, relatórios visuais e E2E autenticado remoto.

## 36. FASE 10 — Repasses (incremento local)

**Estado:** tela integrada para a proprietária; confirmação com RPC homologada; teste sintético aprovado; E2E autenticado remoto pendente.

- `FinanceiroRepasses` lê repasses da clínica em páginas de 30, filtra estado, apresenta profissional e valores oficiais, e abre a composição de itens e ajustes sob RLS. A proprietária registra a confirmação somente após pagamento externo via PIX/transferência, com referência, revisão e chave idempotente. O banco valida estado/autoridade e audita; o frontend não movimenta caixa, não recalcula o repasse e não altera linha terminal.
- O detalhe usa limite explícito e contagem exata, bloqueando confirmação visual se a composição exceder o limite da tela; relatório paginado continua sendo a via para composição muito extensa. Recepção não recebe esta aba; médico acompanha apenas seus repasses no próprio painel.
- Playwright com HTTP sintético interceptado: 2/2 desktop/mobile para composição, referência externa e payload idempotente. Build/typecheck passou. Captura local `scratch/financeiro-repasses-mobile.png` revisada. Nenhum teste autenticado remoto ou pagamento real foi realizado.
- Nenhuma migration, SQL remoto, fixture persistente, `supabase db push` ou Git push neste incremento. Fiscal interno, relatórios visuais, divergência da permissão de estorno e E2E remoto permanecem pendentes.

## 37. FASE 10 — Fiscal interno (incremento local)

**Estado:** interface interna integrada para proprietária/recepção; validação sintética de emissão solicitada aprovada; integração externa não implementada.

- `FinanceiroFiscal` lista documentos da clínica sob RLS, por estado e em páginas de 30, com paciente e datas. Proprietária/recepção podem solicitar emissão de documentos `pendente`/`erro_emissao` e cancelamento de `emitida`/`erro_cancelamento` com motivo. A interface chama somente as RPCs homologadas e reutiliza chave idempotente em retry.
- A confirmação deixa explícito que a operação registra apenas solicitação interna. Não chama prefeitura/provedor, não gera nota real e não trata `emissao_solicitada` como `emitida`. O provedor fiscal permanece indefinido.
- Playwright com HTTP sintético interceptado: 2/2 desktop/mobile para pedido de emissão, aviso e payload idempotente. Build/typecheck, lint e 13 testes unitários/contratuais passaram. Nenhum teste autenticado remoto ou documento real foi criado.
- Nenhuma migration, SQL remoto, fixture persistente, `supabase db push` ou Git push nesta etapa. Relatórios visuais, divergência da permissão de estorno e E2E remoto permanecem pendentes.

## 38. FASE 10C — Homologação técnica e estabilização do Caixa

**FASE 10C — Caixa: HOMOLOGAÇÃO TÉCNICA APROVADA.** **FASE 10 — Migração frontend: EM EXECUÇÃO.** Smoke visual autenticado: **PENDENTE** (não foi identificada sessão autenticada segura para esta execução).

- Projeto remoto vinculado e saudável: `xftnkusbyqzyvzrovroj`. Migration 10C não alterada; SHA-256 reconfirmado `153738A292F4EF10CDE775D84C8D2E976122CBEF7BD3B28D7D2CCD7CC4075F8E`. Não houve nova migration, `supabase db push` ou alteração persistente.
- Leitura autenticada com vínculos reais: proprietária vinculada a duas clínicas e com acesso à sessão legada; cada recepção vinculada a uma clínica, e somente a recepção da clínica da sessão a visualiza; médico não vê sessão operacional. `anon` sem `EXECUTE` da RPC. A RPC rejeitou o legado para a proprietária (`22023`) e negou clínica alheia/médico (`42501`). Como não existe sessão nova persistente, a consulta bem-sucedida do resumo por papel foi comprovada nas fixtures transacionais, não em uma sessão real persistente.
- O roteiro `database/tests/financeiro/20260922_fase10c_resumo_caixa.sql` foi ampliado e passou no banco real em transação única `BEGIN`/`ROLLBACK`: abertura de R$ 100,00, split de R$ 500,00 (R$ 200,00 dinheiro, R$ 200,00 PIX, R$ 100,00 cartão), suprimento de R$ 50,00, sangria de R$ 25,00, esperado R$ 325,00, fechamento sem diferença, outro fechamento com diferença de R$ -10,00, justificativa obrigatória, devolução, correção e aprovação da tentativa 2. Também passou estorno em dinheiro de R$ 50,00 no cenário inicial, sem desconto do estorno PIX no dinheiro físico. Fórmula oficial verificada em ambos os cenários; idempotência e chaves conflitantes verificadas para abertura, suprimento, sangria e envio de fechamento. Negativas de médico/usuário de outra clínica e aprovação vedada à recepção verificadas.
- Contagens persistentes antes/depois idênticas: recebimentos 0, componentes 0, estornos 0, repasses 0, fiscal 0, sessões 1, movimentos 0, sangrias 0, fechamentos 0. Sessão legada `a4a18e49-6634-4058-9fd8-07f3b065fd63` intacta: aberta, abertura R$ 150,50, duas entradas totalizando R$ 1.000,00. Uma tentativa inicial do roteiro ampliado falhou porque o preço de consulta sintético ainda era R$ 1.000,00 para um split de R$ 500,00; a transação foi abortada, o preço da fixture foi ajustado para R$ 500,00 dentro do roteiro e a reexecução passou. Nenhuma fixture persistiu.
- `FinanceiroModulo` agora deriva a aba efetiva das permissões do papel antes de montar conteúdo; ao mudar de proprietária em Repasses para recepção ou em Painel para médico, a aba restrita deixa de ser renderizada imediatamente. Teste Playwright sintético: 4/4 transições desktop/mobile. Caixa: 14/14. `npm run test:financeiro`: 13/13; build e lint aprovados, com warning preexistente de Fast Refresh em `ThemeProvider` e avisos gerais de bundle; `git diff --check` aprovado.
- Interface Caixa utiliza `financeiro_resumo_caixa` e as oito RPCs operacionais oficiais via cliente Supabase; nenhuma operação financeira desta interface passa pelo Fastify antigo. Não houve commit, Git push, reset, seed ou alteração da regra de solicitação de estorno nesta homologação.

## 39. FASE 10D — Estornos

**Estado:** homologação transacional real aprovada; smoke visual autenticado pendente. **FASE 10 — Migração frontend: EM EXECUÇÃO.**

- Decisão posterior resolveu a divergência histórica: recepção solicita; proprietária revisa, aprova ou rejeita e a aprovação efetiva. Solicitante operacional ≠ autoridade de aprovação. Matriz, fluxo e documento funcional atualizados; nenhuma migration ou ampliação de `financeiro_solicitar_estorno`.
- Interface mostra componentes originais, filtro da página e preenchimento do total disponível; continua sem UUID digitável e sem cálculo oficial de impacto no cliente. Testes sintéticos cobrem parcial, total split e valor excedente.
- `database/tests/financeiro/20260922_fase10d_estornos.sql` passou no Supabase `xftnkusbyqzyvzrovroj` em `BEGIN`/`ROLLBACK`: parcial/total, dinheiro/PIX/cartão, múltiplos estornos, saldo restante, excedente por forma, rejeição, caixa fechado e legado, negativas de médico/recepção/usuário de outra clínica, aprovação da proprietária, idempotência e conflito. A primeira execução encontrou apenas erro de aspas no roteiro de teste; corrigido, a reexecução passou.
- Contagens antes/depois iguais: recebimentos 0, componentes 0, estornos 0, repasses 0, fiscal 0, movimentos 0, sessões 1. Nenhuma fixture persistiu e a sessão histórica permaneceu intocada. Smoke visual autenticado real pendente por falta de sessão segura identificada.

## 40. FASE 10E — Repasses

**Estado:** homologação transacional real aprovada; interface local validada; smoke visual autenticado pendente. **FASE 10 — Migração frontend: EM EXECUÇÃO.**

- Projeto remoto `xftnkusbyqzyvzrovroj` reconfirmado pelo vínculo local. `database/tests/financeiro/20260922_fase10e_repasses.sql` passou no Supabase em `BEGIN`/`ROLLBACK`: geração após aprovação do fechamento, um item sem duplicação, leitura própria do médico, negação de confirmação ao médico/recepção/outra clínica, confirmação externa da proprietária idempotente e conflito de chave. Confirmou ausência de movimento de caixa pela confirmação.
- Estorno posterior ao pagamento gerou ajuste negativo de R$ 80,00 sem reescrever o repasse pago; repasse futuro aplicou o ajuste. Estorno anterior ao pagamento reduziu o mesmo item; outro ajuste zerou um repasse pendente sem líquido negativo e carregou saldo de R$ 80,00 para o terceiro repasse. Confirmação de repasse zerado foi recusada. Todos os valores foram afirmados pelo banco, sem cálculo oficial na UI.
- Contagens persistentes após o teste: recebimentos 0, estornos 0, repasses 0, ajustes 0, movimentos 0, sessões 1. Nenhuma fixture persistiu. A sessão legada permaneceu fora do roteiro e intocada. Nenhuma migration nova, `supabase db push` ou Git push.
- `FinanceiroPainel` médico agora expõe bruto, estornos anteriores, ajustes, líquido e estado da RPC oficial. Testes locais: 13/13 unitários/contratuais, Painel 4/4 e Repasses 2/2 em desktop/mobile, build e lint aprovados (somente avisos preexistentes de bundle e Fast Refresh). Captura mobile do painel foi inspecionada. Navegador intercepta HTTP sintético e não comprova sessão real.

## 41. FASE 10F — Painéis por papel e remoção dos números fictícios do início

**Estado:** homologação técnica automatizável aprovada; smoke visual autenticado real pendente.

- O roteiro já homologado `database/tests/financeiro/20260922_fase8_dashboards.sql` foi reexecutado no projeto `xftnkusbyqzyvzrovroj` com `BEGIN`/`ROLLBACK`. Cobriu proprietária, médico, recepção negada, clínica alheia, coorte, pagamentos, repasses, ajustes, fiscal, caixa, alertas e série. O `EXPLAIN ANALYZE` da própria suíte usou os índices financeiros previstos. Contagens finais: recebimentos 0, estornos 0, repasses 0, documentos fiscais 0, sessões 1; legado preservado.
- `FinanceiroPainel` usa somente `financeiro_dashboard_proprietaria`/`financeiro_dashboard_profissional`; não envia `profissional_id` do médico. Proprietária vê produção, formas, clínica/profissional, estornos, repasses, ajustes, fiscal, caixa, alertas e série. A lista por profissional passou a aparecer com valor oficial e aviso de truncamento. Recepção segue sem painel gerencial.
- `src/pages/Dashboard.tsx` tinha saldos, entradas, saídas, repasses calculados com percentual placeholder e briefing de caixa fictícios apresentados como dados do dia. Esses blocos foram removidos, assim como as listas clínicas demonstrativas da mesma tela; a consulta real ao próximo paciente permaneceu com tratamento explícito de erro. A tela orienta a consultar o módulo Financeiro para indicadores oficiais.
- Playwright: Painel 4/4 e início 2/2 em desktop/mobile com HTTP sintético; capturas móveis inspecionadas. Testes financeiros 13/13, build e lint passaram. Bundle inicial ainda excede 500 kB (621,98 kB nesta etapa), a revisar no fechamento. Nenhuma migration nova, fixture persistente ou Git push.

## 42. FASE 10G — Fiscal interno

**Estado:** workflow interno homologado tecnicamente; provedor/API externo indefinido; smoke visual autenticado real pendente.

- `database/tests/financeiro/20260922_fase10g_fiscal_interno.sql` passou no projeto `xftnkusbyqzyvzrovroj` com `BEGIN`/`ROLLBACK`. Gerou recebimento/documento sintéticos, percorreu exatamente os sete estados fiscais, verificou tentativas e resultados idempotentes, erro e retry de emissão/cancelamento, motivo obrigatório, conflito de chave e transições inválidas. Médico e usuário de outra clínica tiveram leitura/operação negadas; recepção e proprietária realizaram solicitações permitidas. Resultado de `private.financeiro_registrar_resultado_*` foi **simulação local da transação**, não comunicação com prefeitura/provedor.
- A UI lista última tentativa e erro interno genérico sem revelar payload nem mensagem bruta do provedor. Continua a informar que solicitar não significa emitir/cancelar externamente. Playwright 6/6 em desktop/mobile cobriu emissão, cancelamento pela proprietária, erro e repetição com mesma chave. Captura móvel de cancelamento revisada. Testes financeiros 13/13, build e lint aprovados (warning preexistente de Fast Refresh e bundle >500 kB).
- Contagens finais: recebimentos 0, documentos fiscais 0, tentativas 0, auditorias 0, sessões 1; `anon` sem `EXECUTE` de emissão, `authenticated` com privilégio limitado pela RPC. Nenhuma fixture persistiu, migration nova, `supabase db push` ou Git push.
