# 02 — STATUS DOS MÓDULOS (VISÃO RÁPIDA)

> **Última atualização:** 12/08/2026
> Consulte `TODO.md` para o histórico detalhado de cada etapa.
> Consulte `10-PLANO-DIRETOR.md` para o roadmap completo de longo prazo.
> Este arquivo existe para que qualquer agente IA saiba **em 30 segundos**
> qual módulo está em andamento e o que está bloqueado.

---

## RESUMO DE ESTADO

| # | Módulo | Status | Notas |
|---|---|---|---|
| 1 | Fundação (Auth, RBAC, Multi-tenant, Tema) | ✅ Funcional | Pendências pré-produção (Vault, dados de teste) |
| 2 | Cadastro de Pacientes | ✅ Funcional | Faltam edição e soft delete |
| 3 | Cadastros Estruturais (Especialidades, Profissionais, Serviços) | ✅ Funcional | — |
| 4 | Agenda / Atendimentos | ✅ Funcional | Integração Agenda→Financeiro e Agenda→Prontuário funcionando |
| 5 | Financeiro / Fluxo de Caixa | ⚠️ **IMPLEMENTADO ESTATICAMENTE — AGUARDA TESTE EM BANCO** | Código e SQL versionados; produção inalterada |
| 6 | Prontuário Eletrônico | ⚠️ Implementado, hardening pendente | SQL escrito, NÃO aplicado no banco |
| 7 | Relatórios e Dashboards | 🔲 Placeholder | Dashboard com dados fictícios (exceto "Próximo paciente") |

---

## MÓDULO ATUAL: 5 — FINANCEIRO

**Status oficial: IMPLEMENTADO ESTATICAMENTE — AGUARDA TESTE EM BANCO.**

O módulo financeiro é a **prioridade de negócio da proprietária** e deve ser
validado em ambiente local/staging antes de qualquer aplicação em produção.

### O que está implementado no repositório

- Fundação SQL, API privada, corte do PostgREST mutável e catálogo de testes SQL.
- Fronteira Fastify com JWT, clínica ativa, idempotência, asserção HMAC e pool
  PostgreSQL de privilégio mínimo.
- Abertura/fechamento de caixa, cobrança/cortesia, despesa, sangria, suprimento,
  estorno e pagamento integral de repasse implementados estaticamente.
- Frontend integrado aos comandos Fastify; cálculos financeiros relevantes
  permanecem no backend/banco.
- Backend inicia sem configuração financeira. Se uma rota financeira privada é
  chamada sem `FINANCEIRO_DATABASE_URL` ou `FINANCEIRO_ASSERTION_HMAC_KEY`,
  responde `503` controlado sem criar o pool.
- Checks locais: typecheck e build do backend; 6/6 testes unitários; `npm audit`
  sem vulnerabilidades; typecheck e build do frontend; revisão sem mutação
  financeira direta via Supabase/PostgREST.

### Commits do Financeiro nesta branch

- `ec36d1f6db3885d2e0fa4c55cc013f079f184fef` — fundação e API privada SQL.
- `271db411b106768f8b772ee939294e5e323a5af6` — fronteira Fastify.
- `88b5bca9cd8fbeba8b94184f8ec167b8372507ae` — integração frontend.

### O que ainda NÃO foi validado

- Nenhum SQL financeiro foi executado.
- Supabase/produção não foi alterado por esta implementação.
- SQL, RPCs, RLS, Vault, roles técnicas e corte do PostgREST não foram testados
  em banco.
- Idempotência concorrente, fechamento atômico, geração/ajustes de repasses,
  estornos e isolamento entre clínicas ainda aguardam testes transacionais/E2E.

**Próximo bloqueio:** criar ambiente local/staging reproduzível e capturar o
baseline real do schema antes de executar qualquer SQL financeiro.

### Regras já confirmadas (NÃO renegociar)

- Repasse calculado em batch no fim do expediente (confirmado com Patrícia, 03/08/2026)
- Percentual de comissão **congelado no momento do fechamento** — nunca recalculado
  retroativamente (integridade histórica, 10-PLANO-DIRETOR.md)
- Fechamento de caixa e lançamento de repasse devem ocorrer **atomicamente em uma única
  transação de banco** (10-PLANO-DIRETOR.md)
- Cálculos financeiros **nunca no frontend** — sempre via Fastify

---

## PRONTUÁRIO: HARDENING PREPARADO, NÃO APLICADO

Decisões foram confirmadas com Eduardo (sessão 04/08/2026):
- Assinatura = trava lógica no sistema (sem ICP-Brasil por enquanto)
- Núcleo comum de 7 campos + `dados_adicionais` jsonb para extensão por especialidade
- Auditoria de leitura clínica construída dentro do módulo
- Proprietária/recepção SEM acesso clínico automático

Arquivos preparados (no repositório, NÃO executados no banco):
- `prontuario_hardening.sql` — 9 RPCs de segurança, RLS restritivo, constraints
- `prontuario_seguranca_testes.sql` — testes para validar após aplicação

**BLOQUEIO:** o hardening NÃO pode ser aplicado em produção sem antes:
1. Existir ambiente local/staging funcional
2. Testes passarem em ambiente local
3. Autorização explícita de Eduardo

---

## INFRAESTRUTURA — BLOQUEIOS

| Item | Status | Impacto |
|---|---|---|
| Ambiente staging/local | ❌ Não existe | Bloqueia aplicação do hardening e qualquer migration futura |
| Migration-base | ❌ Não existe | Banco criado direto no Supabase, DDL nunca versionado |
| Docker daemon | ❌ Não está rodando | Necessário para Supabase local |
| Chaves Vault (cpf_key, cpf_pepper) | ⚠️ Valores de teste | Trocar antes de produção |
| Dados de teste no banco | ⚠️ Existem | Lista completa no TODO.md, seção "Remover dados de teste" |
| Dashboard com dados fictícios | ⚠️ Parecem reais | Risco de confusão para Patrícia |

---

## ORDEM DE PRIORIDADE RECOMENDADA

1. **Criar ambiente local/staging reproduzível + baseline do schema**
2. **Validar o Financeiro em banco**, sem tocar produção, e só então planejar aplicação
3. **Aplicar hardening do prontuário** — após testes em ambiente local
4. **Substituir dados fictícios do Dashboard** por dados reais
5. **Limpar dados de teste** e trocar chaves Vault — pré-produção

---

*Arquivo criado em 11/08/2026. Atualizar a cada conclusão de etapa.*
