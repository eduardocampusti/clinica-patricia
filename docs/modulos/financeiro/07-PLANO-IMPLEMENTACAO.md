# CLÍNICA PATRÍCIA
# 07 — PLANO DE IMPLEMENTAÇÃO DO FINANCEIRO

**Versão:** 1.0
**Status:** APROVADO
**Base:** Documentos 01 a 06 do módulo Financeiro

## 1. Estado de partida
Supabase real possui principalmente `sessoes_caixa` e `entradas_caixa`, além de clínicas, profissionais, profissionais_clinicas, pacientes, agendamentos e usuários.

## 2. Princípio
Reconstrução incremental:
**Preparar → Proteger → Implementar núcleo → Validar → Migrar interface → Testar → Desativar legado**

## 3. Regra de segurança
Antes de migration:
1. preflight;
2. fingerprint;
3. tabelas/policies;
4. dependências;
5. rollback;
6. checkpoint.

Nenhuma migration deve destruir dados existentes.

## 4. Mapa atual × futuro
- `sessoes_caixa`: ADAPTAR
- `entradas_caixa`: ADAPTAR
- `profissionais.valor_consulta`: TRANSICIONAR
- `profissionais.taxa_repasse_clinica`: SUBSTITUIR como fonte futura
- `profissionais_clinicas`: ADAPTAR
- `agendamentos`: REAPROVEITAR + integrar
- auditoria existente: REAPROVEITAR + complementar
- backend Fastify: SUBSTITUIR gradualmente
- HMAC antigo: NÃO ADOTAR como requisito

## 5. Modelo físico proposto
Adaptar estruturas existentes sem apagar legado na primeira fase.

## 6. Novas estruturas conceituais
- `configuracoes_financeiras_clinica`
- extensão segura de `profissionais_clinicas` ou equivalente
- `recebimentos`
- `recebimentos_pagamentos`
- `movimentos_caixa`
- `solicitacoes_sangria`
- `estornos`
- `fechamentos_caixa`
- `revisoes_fechamento`
- `repasses`
- `itens_repasse`
- `ajustes_repasse`
- `documentos_fiscais`
- `eventos_auditoria_financeira`
- alertas financeiros como projeção calculada (sem tabela persistente na FASE 8)
- `configuracoes_alertas_financeiros`

## 7. Estados principais
### Caixa
aberto, em_fechamento, aguardando_aprovacao, devolvido_correcao, aprovado

### Recebimento
confirmado, parcialmente_estornado, estornado

### Sangria
solicitada, aprovada, rejeitada, efetivada

### Estorno
solicitado, aprovado, rejeitado, efetivado

### Repasse
em_formacao, pendente, pago, ajustado

### Documento fiscal
pendente, emissao_solicitada, emitida, erro_emissao, cancelamento_solicitado, cancelada, erro_cancelamento

## 8. Constraints essenciais
- valor > 0
- percentual entre 0 e 100
- componentes positivos
- soma componentes = recebimento
- estorno <= saldo estornável
- consistência de clínica
- profissional ativo na clínica
- caixa aberto para receber
- evitar duplicidades

## 9. Índices
Priorizar clinica_id, profissional_id, paciente_id, agendamento_id, sessao_caixa_id, datas, estados e combinações clínica + período.

## 10. RPCs principais
### Caixa
- `financeiro_abrir_caixa`
- `financeiro_registrar_suprimento`
- `financeiro_solicitar_sangria`
- `financeiro_aprovar_sangria`
- `financeiro_iniciar_fechamento`
- `financeiro_enviar_fechamento`
- `financeiro_revisar_fechamento`

### Recebimentos
- `financeiro_registrar_recebimento`
- `financeiro_registrar_complemento`

### Estornos
- `financeiro_solicitar_estorno`
- `financeiro_revisar_estorno`

### Repasses
- `financeiro_gerar_repasse`
- `financeiro_confirmar_repasse`

## 11. Leituras
Views seguras, RPCs de leitura ou consultas diretas protegidas por RLS.

## 12. RLS — proprietária
Acesso às clínicas administradas, configurações, aprovações e auditoria.

## 13. RLS — recepção
Opera somente clínicas autorizadas. Não aprova estorno, sangria, fechamento ou repasse.

## 14. RLS — médico
Lê apenas próprio financeiro nas clínicas vinculadas.

## 15. Grants
Reduzir escrita direta. `anon` sem acesso financeiro. EXECUTE explícito.

## 16. FASE 0 — BASELINE
Conferir remoto, fingerprint, migrations, RLS, grants, triggers, funções e rollback.
Resultado: CHECKPOINT PRÉ-FINANCEIRO.

## 17. FASE 1 — FUNDAÇÃO
Criar estruturas sem trocar frontend:
- configurações financeiras por clínica;
- valor por profissional+clínica;
- recebimentos;
- componentes;
- movimentos;
- auditoria financeira.

## 18. FASE 2 — SEGURANÇA
RLS, grants mínimos, helpers, vínculo médico↔usuário, isolamento multi-clínica e médico.

## 19. FASE 3 — RECEBIMENTO
Agenda → Pagamento → Caixa → Snapshot → Fiscal pendente → Médico.

## 20. FASE 4 — CAIXA
Abertura, saldo inicial, suprimento, sangria, conferência, fechamento, devolução e aprovação.

## 21. FASE 5 — ESTORNOS
Solicitação, parcial, total, aprovação, rejeição, impacto no caixa e médico.

## 22. FASE 6 — REPASSES
Formação, cálculo por snapshot, agrupamento, pendência, confirmação e ajuste pós-repasse.

## 23. FASE 7 — FISCAL INTERNO
Status fiscal, fila pendente, tentativas, permissões, vínculo, idempotência, auditoria e funções privadas de resultado. Resultados são correlacionados obrigatoriamente à tentativa de origem; uma única tentativa ativa é permitida por documento/tipo, retries geram histórico novo, callbacks stale são rejeitados e repetições idênticas são no-op. Integração externa depois; provedor/API não definido.

Critério da fase: concluir o workflow interno sem marcar emissão/cancelamento por clique e sem depender de fornecedor específico.

## 24. FASE 8 — DASHBOARDS
Médico e proprietária: somente camada de dados nesta entrega. Migration local `20260922015417_financeiro_fase8_dashboards.sql`; nenhuma aplicação autorizada por este documento. Fórmulas, alcance dos filtros e limites descritos em `09-CONTRATO-DASHBOARDS.md`.

Portas de validação: revisar SQL/contrato → autorizar aplicação pelo arquivo/hash → aplicar isoladamente → executar testes transacionais de números exatos, coorte/eventos, consolidação, médico, RLS/grants, alertas e legado → revisar EXPLAIN → registrar evidências. O arquivo `database/tests/financeiro/20260922_fase8_dashboards.sql` está preparado, não executado; fixtures somente na transação com ROLLBACK. Não avançar automaticamente à FASE 9 nem ao frontend.

## 25. FASE 9 — RELATÓRIOS
PDF e Excel com números calculados no banco, detalhes completos paginados e geração local autenticada.

Implementação concluída:

- reutilizar resumos homologados da FASE 8;
- acrescentar RPCs paginadas de recebimentos, repasses e fiscal, sem depender das listas limitadas do dashboard;
- resolver o médico internamente por `auth.uid()`;
- separar `gerados_periodo` por `gerado_em`, `pagos_periodo` por `confirmado_em` e `pendentes_atuais` como posição atual, inclusive no relatório médico;
- vincular o cursor ao contexto autorizado e bloquear deriva de dataset por marcador/totais em cada página e revalidação final;
- reconciliar no cliente linhas detalhadas contra totais oficiais com aritmética de centavos inteiros antes de gerar qualquer arquivo;
- tratar todo texto de XLSX como literal e sanitizar nomes de arquivo por allowlist;
- registrar auditoria da solicitação de exportação sem afirmar sucesso do arquivo;
- gerar PDF paginado e XLSX com células financeiras numéricas;
- validar exemplos exclusivamente sintéticos;
- aplicar a migration somente após revisão e autorização específica pelo arquivo e SHA-256 — concluído no SHA aprovado.

Contrato: `10-CONTRATO-RELATORIOS.md`. Migration aplicada: `20260922034925_financeiro_fase9_relatorios.sql`, SHA-256 `80559457C4C00CA66F5C91EBB269D13FE5994ED45B4C73D333E73F2DF10B056C`. Suíte transacional homologada com `ROLLBACK`; frontend definitivo permanece para a FASE 10.

## 26. FASE 10 — MIGRAÇÃO DO FRONTEND
Substituir gradualmente hooks legados, chamadas Fastify, formulários antigos, UUIDs digitados e dashboard demonstrativo.

### FASE 10A — camada de dados

Em execução local para revisão:

- inventariar e classificar frontend/Fastify legado sem remoção prematura;
- centralizar contratos em `src/lib/financeiro/`;
- consumir somente RPCs aplicadas das FASES 3–9;
- usar centavos inteiros na validação visual e manter cálculo oficial no banco;
- persistir chave de idempotência por intenção durante retries;
- sanitizar erros sem ocultar detalhes no log de desenvolvimento;
- separar erro, vazio e zero financeiro;
- preservar relatórios da FASE 9 com geradores sob demanda;
- testar parâmetros contra as assinaturas das migrations aplicadas;
- não alterar banco nem redesenhar as telas nesta subfase.

Contrato e inventário: `11-MIGRACAO-FRONTEND.md`. As telas e a desativação do legado só avançam após revisão desta camada.

## 27. FASE 11 — DESATIVAÇÃO DO LEGADO
Somente após novo banco validado, frontend migrado, E2E aprovado, dados consistentes e rollback documentado.

## 28. Testes de segurança
Proprietária, recepção, médico, usuário sem vínculo, anon, acesso cruzado entre clínicas e médicos.

## 29. Testes financeiros
Recebimentos, percentuais por clínica, preços por clínica, pagamentos, clique duplo, estornos, repasses, reagendamentos, fechamento, sangria e suprimento.

## 30. Testes históricos
Alterar percentual/preço depois e confirmar que registros antigos não mudam.

## 31. Testes multi-clínica
Validar CNPJ, configuração, preço, percentual, caixa, médico, nota e isolamento.

## 32. Testes de concorrência
Duplo clique, duas abas, estorno duplicado, fechamento duplicado e repasse repetido.

## 33. Rollback
Cada migration com estratégia de reversão. Nunca excluir automaticamente dados financeiros já criados.

## 34. Checkpoints
Após cada fase, atualizar `08-CHECKPOINT.md`.

## 35. Critérios para iniciar alterações reais
Depois do plano aprovado:
1. desenho final de migrations;
2. preflight;
3. migrations versionadas;
4. revisão SQL;
5. aplicação incremental;
6. testes.

## 36. Critério de sucesso
Financeiro integrado à consulta, snapshots históricos, isolamento multi-clínica/médico, operação sem IDs técnicos, caixa auditável, estorno preservando histórico, repasse rastreável, auditoria, idempotência, dashboards reais, E2E aprovado e documentação sincronizada.

## 37. Ordem definitiva
1. Baseline
2. Fundação de dados
3. Segurança
4. Recebimento
5. Caixa
6. Estorno
7. Repasse
8. Fiscal interno
9. Dashboards
10. Relatórios
11. Migração completa do frontend
12. Desativação do legado

## 38. Execução
FASE 0 já concluída e registrada no checkpoint.

## 39. Próximo passo
FASE 1 — Fundação do novo modelo financeiro.

## 40. Atualização de execução — 22/09/2026

A seção 39 preserva o plano inicial. FASES 1–9 estão homologadas e FASE 10A foi aprovada pelo usuário.

**FASE 10 — Migração frontend: EM EXECUÇÃO**

FASE 10B implementada para revisão: ação na Agenda, leitura de preço do vínculo, diálogo acessível, split, revisão, wrapper RPC, idempotência, resposta bancária e invalidação. Testes e screenshots em `11-MIGRACAO-FRONTEND.md`.

Não avançar para outra tela financeira antes da revisão. Operação exige caixa compatível; tratamento do legado, cobranças após início/conclusão clínica e tela de abertura de caixa não pertencem a esta etapa.

## 41. FASE 10C — Dependência identificada na auditoria (histórico)

FASE 10B aprovada pelo usuário; autorizada a interface de caixa sem migration ou regras financeiras novas no cliente. Auditoria e SELECT no catálogo remoto confirmaram que o resumo oficial corrente só existe em helper privado, não exposto ao frontend. As RPCs de mutação não permitem prévia/conferência completa antes do envio.

**FASE 10 — Migração frontend: EM EXECUÇÃO.** Implementação da FASE 10C depende de decisão para uma etapa separada de leitura oficial. Contrato mínimo proposto e evidências na seção 13 de `11-MIGRACAO-FRONTEND.md`. Proposta não autoriza criar/aplicar migration; o frontend não deve recalcular saldo para contornar a lacuna.

### Atualização: preparação local autorizada

Naquele momento, a migration `20260922181438_financeiro_fase10c_resumo_caixa.sql` e o roteiro transacional estavam preparados exclusivamente no local. O contrato final por sessão (`financeiro_resumo_caixa(uuid)`) consta na seção 14 do documento 11. A FASE 10C **aguardava a RPC de leitura do caixa**; preflight, dry-run e aplicação ainda não estavam autorizados naquela etapa.

### Estado atual após autorização específica

A migration 10C foi aplicada e validada no projeto `xftnkusbyqzyvzrovroj`. O roteiro integrado passou com `ROLLBACK`, e a RPC `public.financeiro_resumo_caixa(uuid)` está disponível. A interface operacional do caixa foi integrada localmente à navegação e validada em navegador sintético; ainda faltam E2E autenticado remoto e os demais fluxos visuais da FASE 10. Evidências em `08-CHECKPOINT.md`, seções 33–34, e `11-MIGRACAO-FRONTEND.md`, seções 14–15. Os parágrafos anteriores registram a sequência histórica de auditoria e preparação.
