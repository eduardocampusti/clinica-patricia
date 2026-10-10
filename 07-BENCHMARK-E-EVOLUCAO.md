# 07 — BENCHMARK DE MERCADO E PLANO DE EVOLUÇÃO

> **O que é.** Consolidação da sessão em que um benchmark de mercado (ChatGPT Deep
> Research) foi analisado e reconciliado com o estado real do projeto, mais o resultado
> da primeira auditoria de isolamento. Ponto de partida para qualquer IA acompanhar a
> trilha de evolução pós-benchmark.
>
> **Data:** 08/09/2026.
> **Relação com os outros arquivos:**
> - `02-STATUS-MODULOS.md` = estado rápido dos módulos (manda em caso de conflito).
> - `10-PLANO-DIRETOR.md` = roadmap de longo prazo (este arquivo NÃO o substitui).
> - `09-DIARIO-DE-SESSOES.md` = histórico cronológico (registrar esta sessão lá também).
> - Este `07` = a leitura de mercado e a fila de evolução dela derivada.

---

## 1. Origem

Relatório `Benchmark_Gestao_Clinica_2026.docx` (~9.500 palavras, 37 gaps, com fontes),
gerado no ChatGPT. Comparou o Clínica Patrícia com EHR open-source (OpenMRS, Medplum,
OpenELIS), SaaS BR (Ninsaúde, iClinic, Feegow) e padrões de mercado. Tratado como
**fonte de decisão**, não de implementação direta.

---

## 2. Reconciliação com o estado real (IMPORTANTE)

Durante a sessão, dois pressupostos do benchmark foram corrigidos pela realidade:

- **Alerta P0 "Prisma + BYPASSRLS" NÃO se aplica.** A auditoria provou que a rota de
  dados é PostgREST + RLS na role `authenticated` — não há Prisma nem role de runtime
  com BYPASSRLS. O cenário-pesadelo do relatório era baseado em stack que o projeto não usa.
- **O Financeiro não está "a começar".** Segundo `02-STATUS-MODULOS.md`, está
  IMPLEMENTADO ESTATICAMENTE, aguardando teste em banco. O gargalo real é a ausência de
  ambiente de staging/baseline, não o desenho de telas.

---

## 3. Auditoria de isolamento — resultado (rodada via SQL ao vivo, read-only)

**Veredito: isolamento BASE VERIFICADO** na rota real (frontend/Fastify → PostgREST →
RLS `authenticated`). Sem Prisma, sem role de runtime com BYPASSRLS.

| Caso | Resultado | Status |
|---|---|---|
| (a) Listagem só da própria clínica | vê só Brotas; 2 pacientes de Brotas, 0 de Ipupiara | ✅ PASSOU |
| (b) IDOR por clinica_id alheio | contagem de Ipupiara = 0 | ✅ PASSOU |
| (c) INSERT/UPDATE com clinica_id alheio | recusa esperada pela RLS | ⏸️ pende teste de escrita |
| (d) Unicidade não revela registro de outra clínica | UNIQUE(clinica_id, cpf_hash) por-clínica | ⏸️ pende teste de escrita |

(c) e (d) devem rodar em `begin…rollback` (nada persiste) ou em Branch de teste do Supabase.

**Fraquezas de defesa-em-profundidade encontradas (não corrigidas):**
1. Sem `FORCE ROW LEVEL SECURITY` nas 19 tabelas; dono `postgres` tem bypassrls.
2. Grants largos a `anon`/`authenticated` (inclui TRUNCATE/TRIGGER/REFERENCES).
3. `clinica_ativa()` inerte no PostgREST (trava de clínica ativa só vale no app).
4. Policies `{public}` onde deveriam ser `{authenticated}`.
5. **Caixa gravável direto do frontend** — é o `financeiro_bloqueio_postgrest.sql`
   AINDA NÃO APLICADO no banco. Não é bug novo; é migração pendente.

**Correções propostas (aguardam aprovação, nada aplicado):** P1 (FORCE RLS + revogar
grants perigosos, baixo risco), P2 (policies → `authenticated`), P3 = aplicar o corte do
financeiro (parte da validação do Financeiro em banco).

---

## 4. O que o benchmark VALIDOU (não muda nada — reforça decisões vigentes)

- Lançamento compensatório em vez de UPDATE/DELETE (padrão Formance ledger).
- Comissão congelada no fechamento — diferencial nosso; concorrentes não comprovam.
- Cálculo financeiro só no backend.
- Manter a stack — sem evidência para trocar.

## 5. Gaps do benchmark — classificação (resumo)

Legenda: 🟢 cabe no Financeiro atual · 🟡 evolução próxima · ⚪ módulo futuro · ⚫ descartado.

- 🟢 **Agora/curto prazo (evolução do Financeiro):** home de caixa com origem de cada
  valor + vencidos por CNPJ; botão "Receber" no atendimento; "Explicar meu caixa";
  registrar nº de nota externa (mantém NF manual); clínica+CNPJ visível em toda ação.
- 🟡 **Próximo:** conciliação OFX assistida; PSP (Pix/cartão); desconto/reembolso com
  aprovação; aging/repasses; exportação para o contador.
- ⚪ **Futuro (outros módulos):** prontuário versionado + assinatura ICP-Brasil; agenda
  (confirmação por canal, lista de espera); contrato REST do laboratório (INT-LAB);
  RNDS/FHIR.
- ⚫ **Descartado:** internação/leitos, PACS/DICOM, drivers de analisador no EHR (é do
  laboratório), ERP, NFS-e automática, TISS enquanto for particular.

Detalhe completo dos 37 gaps: ver o relatório original `Benchmark_Gestao_Clinica_2026.docx`.

---

## 6. Plano de evolução RECONCILIADO com o estado real

A ordem abaixo respeita a "ORDEM DE PRIORIDADE RECOMENDADA" do `02-STATUS-MODULOS.md`.
O benchmark entra só na fase de evolução, DEPOIS de validar o que já existe.

**FASE A — Infraestrutura de teste (bloqueio nº 1, sem isso nada avança com segurança)**
1. Criar ambiente local/staging reproduzível.
2. Capturar baseline real do schema (DDL nunca foi versionado; banco nasceu direto no Supabase).

**FASE B — Validar o Financeiro em banco (local/staging, sem tocar produção)**
3. Executar e testar o SQL financeiro já escrito (fundação, API privada, corte do PostgREST).
4. Provar em transação: idempotência concorrente, fechamento atômico, repasse batch,
   estorno por compensação, isolamento entre clínicas (fecha os casos c/d da auditoria).

**FASE C — Hardening de segurança (aplicar após testes locais)**
5. Aplicar P1/P2 da auditoria (FORCE RLS, revogar grants, policies `authenticated`).
6. Aplicar o corte do financeiro (`financeiro_bloqueio_postgrest.sql`) — fecha a fraqueza 5.
7. Hardening do Prontuário (`prontuario_hardening.sql`), já preparado.

**FASE D — Evolução guiada pelo benchmark (só depois de B/C)**
8. Home de caixa "na palma da mão" (mockup aprovado — ver §7). Botão "Receber",
   "Explicar meu caixa", nota externa. Mobile → tablet → desktop, tokens do Design System.
9. Dashboard com dados reais (hoje é fictício).

**FASE E — Pré-produção**
10. Trocar chaves Vault (cpf_key/cpf_pepper) por definitivas; limpar dados de teste.

## 7. Norte visual

Mockup interativo da Home de Caixa aprovado nesta sessão (mobile-first, com theming por
clínica Brotas=azul/Ipupiara=verde e claro/escuro via tokens). É referência para a FASE D.
Arquivo: `mockup-home-caixa.html` (gerado no chat; gravar em `docs/mockups/` se desejado).

## 8. Próximos passos concretos

1. Decidir a via da FASE A: Docker + Supabase local, ou Branch de teste do Supabase.
2. Fechar casos (c)/(d) da auditoria em `begin…rollback` e preparar SQL P1/P2 para revisão.
3. Registrar esta sessão no `09-DIARIO-DE-SESSOES.md`.

---

*Criado em 08/09/2026 (sessão de benchmark). Atualizar conforme as fases avançam.*
