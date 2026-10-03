# CLÍNICA PATRÍCIA
# 06 — ARQUITETURA TÉCNICA DO FINANCEIRO

**Versão:** 1.0
**Status:** APROVADO
**Base:** Documentos 01 a 05 do módulo Financeiro
**Banco principal:** Supabase PostgreSQL real

## 1. Objetivo
Reconstruir o Financeiro com Supabase real como banco principal, segurança no banco, isolamento multi-clínica e operações transacionais.

## 2. Arquitetura-alvo
Frontend React → Supabase Auth → Supabase Data API/RPC → PostgreSQL → RLS + constraints + transações + auditoria.

Integrações externas futuras: Frontend → Edge Function → serviço externo → Supabase PostgreSQL.

## 3. Fora da arquitetura padrão
- Docker
- banco paralelo
- VPS financeira
- FINANCEIRO_DATABASE_URL
- Fastify financeiro separado
- HMAC próprio
- role técnica externa conectada diretamente ao PostgreSQL

## 4. Aproveitamento do legado
Preservar conceitos úteis: autenticação, idempotência, validação, consultas parametrizadas, tratamento de erros e privilégio mínimo.

## 5. Supabase como núcleo
Responsável por autenticação, PostgreSQL, RLS, RPCs, transações, constraints, auditoria e estados financeiros.

## 6. Leitura e escrita
Leituras seguras podem usar Supabase com RLS. Escritas críticas preferencialmente via RPC/função transacional.

## 7. RPC em operações críticas
Recebimento deve validar usuário, clínica, caixa, agendamento, profissional, preço, percentual, componentes, snapshot, movimentos, pendência fiscal, valor do médico e auditoria em uma única operação.

## 8. Transações
Tudo ou nada.

## 9. Idempotência
Proteger recebimento, estorno, fechamento, aprovação e repasse contra repetição.

## 10. Autenticação
Supabase Auth com `auth.uid()`.

## 11. Autorização
Banco valida quem é usuário, clínica, papel, ação permitida e estado do registro.

## 12. Fonte dos papéis
Usar dados controlados pelo sistema e vínculos com clínicas/profissionais.

## 13. RLS
Todas as tabelas financeiras expostas ao Data API devem ter RLS.

## 14. Negar por padrão
Sem permissão explícita = acesso negado.

## 15. Grants
RLS e grants são camadas complementares. `anon` sem acesso financeiro e escrita crítica sem grants amplos.

## 16. Escrita direta
Evitar INSERT/UPDATE/DELETE irrestritos nas tabelas críticas. Preferir frontend → RPC → tabelas.

## 17. Funções PostgreSQL
Preferir SECURITY INVOKER. SECURITY DEFINER apenas quando necessário, com search_path e EXECUTE controlados.

## 18. Schema privado
Pode existir schema interno no mesmo PostgreSQL para helpers não expostos.

## 19. Views
Views do frontend devem respeitar RLS, usando security_invoker quando aplicável.

## 20. Multi-clínica
Todo registro financeiro possui origem inequívoca em uma clínica.

## 21. Consistência de clínica
Recebimento na Clínica A não pode usar caixa, agendamento, configuração ou CNPJ da Clínica B.

## 22. Configurações com vigência
Preço e percentual possuem vigência; histórico usa snapshot.

## 23. Snapshot financeiro
Preserva valor-base, percentual, parte da clínica, parte do médico, clínica, profissional e momento.

## 24. Valores monetários
PostgreSQL: numeric/decimal. Frontend: preferencialmente centavos inteiros.

## 25. Percentuais
Representação decimal exata. Banco valida cálculo definitivo.

## 26. Fonte de verdade
Frontend mostra prévia; PostgreSQL determina a verdade financeira.

## 27. Recebimento
Criado por operação transacional. Cliente não envia parte do médico como verdade.

## 28. Pagamento combinado
Banco valida SUM(componentes) = valor_recebimento.

## 29. Caixa
Máquina de estados controlada.

## 30. Fechamento
Banco calcula esperado; frontend informa contado e justificativa.

## 31. Estorno
Evento compensatório. Nunca DELETE recebimento. Deve validar saldo, aprovação, duplicidade e impacto.

## 32. Repasse
Calculado sobre snapshots históricos.

A aprovação do fechamento gera, na mesma transação, um repasse por profissional e seus itens. Antes de expor valor a pagar, um helper privado aplica ajustes negativos pendentes em ordem cronológica; saldos podem atravessar vários repasses futuros sem produzir repasse negativo.

Aplicações em repasse `pendente` são provisórias. A efetivação de estorno bloqueia o repasse antes do item, registra integralmente `valor_estornos_antes_pagamento` no item e chama `private.financeiro_rebalancear_ajustes_repasse`. O helper calcula o crédito bruto restante, desfaz o excedente de aplicações da mais recente para a mais antiga, reabre o ajuste correspondente e recalcula o repasse sem permitir valor líquido negativo. A confirmação de repasse usa o mesmo lock do repasse; assim, a primeira operação concorrente define se o estado será rebalanceado ou terminal.

## 33. Repasse já pago
Não alterar retroativamente. Correção vira AjusteRepasse.

A confirmação é uma RPC idempotente restrita à proprietária e registra apenas o pagamento externo por PIX ou transferência. Ela não cria `movimentos_caixa`. Repasses `pago` e `ajustado` são terminais.

Aplicações e ajustes ligados a repasse terminal não podem ser atualizados ou removidos. A escrita direta permanece revogada; somente funções financeiras privilegiadas podem rebalancear aplicação de repasse pendente, com auditoria `rebalancear_ajuste_repasse` contendo valores anterior, novo, devolvido e o estorno causador.

## 34. Auditoria
Duas camadas:
- técnica
- negócio

## 35. Imutabilidade da auditoria
Sem UPDATE/DELETE para usuários comuns.

## 36. Alertas
Derivados de eventos e estados financeiros.

## 37. Dashboard
Projeção sobre o domínio, não fonte de dados independente.

## 38. Dashboard do médico
Proteção no banco: profissional vinculado ao auth.uid().

## 39. Dashboard da proprietária
Consulta por clínica, múltiplas clínicas e consolidado.

## 40. Troca de clínica no frontend
Invalidar consultas anteriores e evitar resposta atrasada contaminando novo contexto.

## 41. Tratamento de erros
Distinguir carregando, vazio, erro, acesso negado, indisponível, conflito e duplicidade.

## 42. Formulários
Só limpar após sucesso real.

## 43. Nota fiscal
Integração futura via Edge Function segura. Credenciais nunca no navegador.

A FASE 7 implementa somente a fundação interna: estados, fila, tentativas, auditoria, RLS e RPCs de solicitação. `financeiro_solicitar_emissao_fiscal` e `financeiro_solicitar_cancelamento_fiscal` registram intenção e nunca concluem o resultado. Funções privadas em `private` registram sucesso/erro futuramente por uma fronteira confiável; não possuem EXECUTE para `anon` ou `authenticated`.

O provedor, API, webhook, certificado, token e segredo permanecem indefinidos e fora da migration. A integração externa deverá ser adicionada depois sem reescrever a história financeira.

Resultados fiscais são correlacionados à tentativa que originou a integração: as funções privadas exigem `documento_fiscal_id` e `tentativa_documento_fiscal_id`, validam clínica, tipo, tentativa ativa e estado do documento, e não escolhem tentativa por ordenação temporal. Um índice único parcial impede duas tentativas ativas do mesmo tipo. Tentativas finalizadas preservam o resultado; repetição idêntica retorna no-op, enquanto conflito ou callback obsoleto falha sem nova auditoria ou transição. Como essas funções estão em `private` e sem `EXECUTE` para `anon`/`authenticated`, uma futura Edge Function via PostgREST precisará de adaptador seguro ou conexão backend controlada.

## 44. Edge Functions
Reservadas principalmente a integrações externas.

## 45. Service role
Nunca no frontend.

## 46. Backend Fastify antigo
SUBSTITUIR como fronteira obrigatória, mas não apagar antes da migração e validação.

## 47. HMAC antigo
Não será requisito da nova arquitetura.

## 48. Estruturas existentes
Classificar como REAPROVEITAR, ADAPTAR, SUBSTITUIR ou CRIAR.

## 49. Migração
Incremental: preparar, implementar regras, segurança, testar, adaptar frontend, validar E2E, só depois desativar legado.

## 50. Compatibilidade
Agenda e demais módulos não podem quebrar durante reconstrução.

## 51. Testes obrigatórios
Segurança, financeiro, histórico e isolamento multi-clínica/médico.

## 52. Observabilidade
Erros com contexto técnico sem expor dados sensíveis.

## 53. Checkpoint
Após cada etapa, atualizar `08-CHECKPOINT.md`.

## 54. Decisão arquitetural central
Supabase PostgreSQL é o núcleo transacional e fonte de verdade. RPCs protegem operações compostas. RLS protege acesso. Edge Functions para integrações externas.

## 55. Próxima etapa
`07-PLANO-IMPLEMENTACAO.md`

## 56. FASE 8 — Fronteira de leitura (não aplicada)

Migration local `20260922015417_financeiro_fase8_dashboards.sql`: duas RPCs públicas de dashboard e uma RPC de configuração. Dashboards são STABLE/SECURITY DEFINER, com escopo interno por auth.uid(), search_path fixo e sem EXECUTE público/anônimo. Justificativa: médico não possui leitura direta de estornos e não deve ganhar acesso amplo; vínculos legados são enumerados na fronteira privada. Agregadores privados são SECURITY INVOKER, sem EXECUTE comum; não existe view exposta ou saldo materializado.

Tabela única de configuração com RLS/SELECT da proprietária, escrita comum revogada, validação numérica e trigger de auditoria. Não altera RPCs/policies das fases anteriores. Reutiliza índices existentes; apenas PK da configuração é criada. Intervalo limitado tecnicamente a 366 dias e listas a 100, com totais sem truncamento.

Sem Docker, banco paralelo, conexão remota, frontend, provedor ou service role no cliente. EXPLAIN e teste transacional estão preparados, não executados. Contrato, limitações de performance e reversão segura estão em `09-CONTRATO-DASHBOARDS.md`.

Na revisão local subsequente, as RPCs receberam `p_timezone` validado contra o catálogo e default `America/Bahia`; não dependem de timezone de conexão para séries. A exclusão de caixa legado passou a depender unicamente de `NOT EXISTS entradas_caixa`, sem UUID de exceção. Métricas de repasse foram decompostas por evento/estoque para não chamar pagamento confirmado de produção gerada. Permanecem locais e não aplicadas.
