# CLÍNICA PATRÍCIA — MÓDULO FINANCEIRO

**Status do produto:** FASES 1–9 aplicadas e homologadas; FASES 10A/10B concluídas e aprovadas pelo usuário. **FASE 10 — MIGRAÇÃO FRONTEND CONCLUÍDA.** FASE 10C — Caixa: **HOMOLOGAÇÃO TÉCNICA APROVADA** no projeto `xftnkusbyqzyvzrovroj`, com RPC de leitura aplicada, validação transacional real e `ROLLBACK`. FASE 10D — Estornos: separação vigente de funções (recepção solicita; proprietária decide) e homologação transacional. FASE 10E — Repasses: geração, confirmação externa, permissões e ajustes homologados. FASE 10F — Painéis por papel homologados; Dashboard inicial sem números financeiros fictícios. FASE 10G — Fiscal interno homologado, sem integração externa. FASE 10H — Relatórios integrados com filtros, paginação, anti-drift, reconciliação, PDF/XLSX, cancelamento e auditoria. Cenário integrado final aprovado no banco real com `ROLLBACK`; rotas Fastify substituídas de caixa/recebimento/estorno/repasse desregistradas. Permanecem como evoluções externas, sem bloquear a conclusão da migração, o smoke visual autenticado, o provedor fiscal externo e a futura definição de despesas administrativas. Evidências em `11-MIGRACAO-FRONTEND.md` e `08-CHECKPOINT.md`.

## Objetivo do módulo

Reconstruir o Financeiro da Clínica Patrícia como um domínio:

- integrado à Agenda e ao atendimento;
- multi-clínica;
- seguro;
- auditável;
- simples para a recepção;
- transparente para o médico;
- controlável pela proprietária.

## Ordem obrigatória de leitura

### 1. Fonte funcional principal

`01-DOCUMENTO-FUNCIONAL-MESTRE.md`

Contém as regras de negócio aprovadas.

### 2. Segurança e papéis

`02-MATRIZ-PAPEIS-PERMISSOES.md`

Define o que proprietária, recepção e médico podem ou não fazer.

### 3. Estado técnico atual

`03-AUDITORIA-ESTADO-ATUAL.md`

Descreve o que existe atualmente no Supabase, frontend e backend.

**Atenção:** a auditoria não representa a arquitetura futura aprovada.

## Decisões estruturais já fixadas

- Supabase real é o banco principal.
- Não usar Docker por padrão.
- Não criar banco financeiro paralelo sem justificativa aprovada.
- Financeiro será reconstruído, não apenas remendado.
- Segurança deve existir no banco/backend.
- IDs técnicos não devem aparecer para usuários.
- Dinheiro não deve usar `float` como regra financeira.
- Estornos preservam histórico.
- Aplicações de ajustes em repasses `pendente` são alocações provisórias: podem ser rebalanceadas por operação financeira privilegiada quando um novo estorno ocorrer antes da liquidação. Após `pago` ou `ajustado`, tornam-se imutáveis.
- Na primeira versão, estornos respeitam as formas de pagamento do recebimento original; não há conversão automática entre dinheiro, PIX e cartão.
- Multi-clínica é segregado.
- Relatórios dependem de dados confiáveis.
- Autorizações são específicas por etapa; documentação não autoriza aplicação de migration.

## Decisão sincronizada — FASE 6

A decisão contábil de rebalanceamento foi registrada nos documentos funcionais, de domínio, arquitetura e checkpoint. Antes da autorização, a migration da FASE 6 permaneceu local e não aplicada.

Após autorização explícita, a migration da FASE 6 foi aplicada ao projeto remoto `xftnkusbyqzyvzrovroj`. A aplicação não autoriza alterações fora do escopo da fase.

## FASE 7 — Fiscal interno

Fase concluída no banco remoto como fundação e workflow fiscal provider-neutral. A integração externa permanece bloqueada até definição do provedor/API por clínica ou município; a emissão real de NF ainda não está integrada.

Resultados externos futuros deverão ser correlacionados à tentativa que originou a integração. Cada documento pode possuir somente uma tentativa ativa por tipo; retries geram novas linhas, callbacks obsoletos são rejeitados e respostas idênticas da mesma tentativa são idempotentes.

## FASE 8 — Dashboards (concluída)

Migration `20260922015417_financeiro_fase8_dashboards.sql` aplicada no projeto remoto autorizado. RPCs separadas para proprietária/médico e configuração auditada de thresholds; sem tabela de saldos, séries ou alertas derivados. Leia também `04` a `08` e o contrato exato `09-CONTRATO-DASHBOARDS.md`, incluindo alcance dos filtros, estoque atual de ajustes e diferença entre coorte líquida e eventos de estorno.

O teste de banco vazio, a prova positiva/negativa da constraint e o roteiro transacional amplo passaram no banco remoto, sempre com `ROLLBACK`. EXPLAIN utilizou os índices previstos e os Advisors não apontaram erro nem aviso novo ligado à FASE 8. Nenhuma fixture persistiu e o caixa legado foi preservado.

## FASE 9 — Relatórios (concluída)

A infraestrutura de PDF/XLSX, os datasets paginados com contexto/marcador de consistência, a reconciliação financeira em centavos inteiros, o roteiro transacional e exemplos sintéticos hostis foram validados. A migration `20260922034925_financeiro_fase9_relatorios.sql` foi aplicada no projeto `xftnkusbyqzyvzrovroj` e homologada com testes em `ROLLBACK`. O contrato exato está em `10-CONTRATO-RELATORIOS.md`; não existe ainda interface final, botão de exportação ou publicação de relatórios reais.

## FASE 10A — Migração frontend / camada de dados (concluída e aprovada)

A nova fronteira local está em `src/lib/financeiro/` e consome exclusivamente as RPCs homologadas. O inventário, estratégia de substituição, wrappers, tratamento de erro, idempotência, helpers e bloqueios estão em `11-MIGRACAO-FRONTEND.md`. O Fastify financeiro e as telas antigas não foram apagados: permanecem como legado temporário até a revisão da camada e a construção das telas na subfase seguinte. Nenhuma alteração de banco foi realizada.

## FASE 10B — Agenda → Recebimento

A Agenda oferece “Receber pagamento” à proprietária/recepção em agendamentos elegíveis, com preço do vínculo profissional–clínica, split em centavos, revisão, idempotência e confirmação pelos valores da RPC. Pagamento não muda status clínico. O diálogo compartilhado foi extraído e tornado acessível; o Financeiro antigo permanece separado. Leia a seção FASE 10B de `11-MIGRACAO-FRONTEND.md` para arquivos, testes, screenshots e limitações. Nenhuma outra tela financeira deve ser iniciada antes da revisão desta etapa.

## FASE 11 — Validação operacional

A validação automatizável foi concluída sem reabrir a migração frontend. Recebimento, Caixa e Estornos foram reexercitados nos viewports operacionais; o roteiro integrado passou novamente com `ROLLBACK` e sem alteração das contagens persistentes. O registro consolidado, as ressalvas e o checklist de prontidão estão em `../../12-VALIDACAO-OPERACIONAL.md`. A recomendação autoriza apenas preparar um piloto controlado, não iniciar produção automaticamente.

## FASE 12 — Preparação controlada

O Financeiro novo permanece limpo e tecnicamente homologado. A FASE 13 comprovou backup/restore e smoke autenticado, fechou signup público e aplicou hardening específico. O cutover real não foi executado: Brotas mantém caixa legado aberto, e clínica piloto, usuários reais e deploy/HTTPS continuam decisões externas. Estado vigente e runbooks: `../../14-REMEDIACAO-PRE-CUTOVER.md`.
