# CLÍNICA PATRÍCIA
# 07 — PLANO DE IMPLEMENTAÇÃO — UNIFICAÇÃO DE CADASTRO E EDIÇÃO DE PACIENTE

**Versão:** 1.0
**Status:** APROVADO
**Data de aprovação:** 26/09/2026 (arquiteto Eduardo)
**Base:** `01-DOCUMENTO-FUNCIONAL-MESTRE.md` §9-C, §9-D e §5.1

## 1. Objetivo

Fechar as lacunas funcionais da edição administrativa de paciente e caminhar, em iterações pequenas, para um formulário compartilhado entre cadastro e edição — sem quebrar o padrão RPC + RLS do projeto e sem duplicar auditoria.

## 2. Princípios

1. Backend é sempre RPC Supabase (`SECURITY DEFINER`, `search_path` explícito, RLS respeitada, mensagens genéricas). Fastify permanece legado.
2. Auditoria é sempre a tabela existente `public.auditoria` com trigger `trg_audit_pacientes`. Novas colunas de contexto (ex.: `motivo`) são acrescentadas por ALTER, nunca por tabela paralela.
3. Nenhuma migration é aplicada sem ensaio SQL local descartável e revisão do proprietário. Propostas ficam em `supabase/review/` até aprovação e são renomeadas para `supabase/migrations/<timestamp>_*.sql` na hora de instalar.
4. Cada iteração entrega um recorte independente com testes próprios. Nenhuma antecipa código da próxima.
5. Documentação sincroniza antes do código; nota curta em `src/config/notasEvolucao.json` só quando comportamento chega ao usuário.

## 3. Fora do escopo global desta unificação

- redefinir consentimento LGPD (tratado em outra frente);
- criar identidade global de paciente ou mesclagem entre clínicas;
- alterar policies existentes de CPF/foto/vínculos;
- tocar em Módulo 5 (Financeiro) — só consulta como referência de padrão;
- publicar frontend em produção; toda validação é local até homologação separada.

## 4. Iterações

### Iteração A — Backend puro: coluna `motivo` na auditoria e RPC de correção de CPF

**Status:** em execução (esta task).

Entra:

1. Atualização do Documento Funcional Mestre (§9-C, §9-D).
2. Este plano.
3. Proposta de migration em `supabase/review/pacientes_correcao_cpf_com_motivo.sql`, contendo:
   - `ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS motivo text;`
   - `CREATE OR REPLACE FUNCTION public.fn_auditoria()` reescrita para preencher `motivo` a partir de `current_setting('audit.motivo', true)` com `missing_ok = true` (nunca falha por ausência do setting);
   - `CREATE FUNCTION public.paciente_corrigir_cpf(p_paciente_id uuid, p_clinica_id uuid, p_updated_at timestamptz, p_cpf_novo text, p_motivo text) RETURNS void`, `SECURITY DEFINER`, `search_path = pg_catalog, public`, executando: autorização (proprietária/recepção da clínica ativa, usuário ativo, clínica ativa), validação de motivo (10 a 500 caracteres, `btrim`), validação de CPF novo (`pacientes_cpf_valido`), lock otimista por `updated_at`, checagem de unicidade `(clinica_id, cpf_hash)` sem revelar conflito, `set_config('audit.motivo', p_motivo, true)`, UPDATE em `pacientes` (`cpf_encrypted`, `cpf_hash`), retorno `void`;
   - `CREATE FUNCTION public.paciente_cpf_disponivel(p_clinica_id uuid, p_paciente_id uuid, p_cpf text) RETURNS boolean`, `SECURITY DEFINER`, sem retornar identificador do conflito;
   - `REVOKE ALL ... FROM public, anon;` e `GRANT EXECUTE ... TO authenticated;` para as duas funções novas;
   - ensaio SQL em `supabase/review/pacientes_correcao_cpf_ensaio.sql`, transacional com `ROLLBACK`, cobrindo os cenários da §6.

Não entra (fica para B–E):

- qualquer alteração no frontend;
- botão "Corrigir CPF" no resumo do paciente;
- `MotivoModal` reutilizável;
- endpoint de troca de foto com motivo;
- edição de responsável legal existente;
- refactor do `<form>` inline de `src/pages/Pacientes.tsx`.

### Iteração B — UI mínima da correção de CPF

Depende de A aprovada e migration aplicada. Entra: componente `MotivoModal` reutilizável, botão "Corrigir CPF" no resumo do paciente, chamada da nova RPC, `paciente_cpf_disponivel` consumido on-blur, mensagens genéricas de conflito, testes operacionais dedicados.

Não entra: foto, responsável, refactor.

### Iteração C — Troca de foto existente com motivo

Depende de B aprovada. Entra: RPC administrativa para trocar/remover `foto_path` já preenchido exigindo motivo; primeiro upload continua sem motivo (regra do §9-B); UI reutilizando `MotivoModal`; ensaio SQL.

Não entra: responsável, refactor.

### Iteração D — Edição de responsável legal existente

Depende de C aprovada. Entra: RPC administrativa para alterar dados de vínculo existente em `pacientes_responsaveis_legais` exigindo motivo (`nome_completo`, `vinculo`, `telefone`, `email`, `cpf`), preservando o vínculo original quando não houver mudança material, sem criar segundo responsável nesta operação. UI reutilizando `MotivoModal`.

Não entra: múltiplos responsáveis; remoção; substituição — permanecem pendências funcionais do §22 do DFM.

### Iteração E — Refactor do formulário compartilhado

Depende de A–D aprovadas. Entra: extração do `<form>` inline de `src/pages/Pacientes.tsx` para `src/components/pacientes/CadastroPaciente.tsx`; extração de campos comuns (`TextoNome`, `CampoTelefone`, seção de Responsável, seção de Endereço textual) para `src/components/pacientes/campos/`; consolidação visual entre cadastro e edição preservando os dois contratos de submit (o cadastro segue com `paciente_menor_criar_com_responsavel` / INSERT direto + `cpf_encrypt`; a edição segue com `paciente_editar_administrativo`); testes de regressão do cadastro atual.

Não entra: fusão dos dois submits em um único caminho — decisão adiada para depois desta iteração, condicionada à evidência de que os contratos podem convergir sem perda de segurança ou auditoria.

## 5. Ordem de instalação da migration da Iteração A

1. Ensaio local em PostgreSQL descartável (`supabase/review/pacientes_correcao_cpf_ensaio.sql`).
2. Ensaio no Supabase real com `ROLLBACK`, papéis SQL e fixtures sintéticas.
3. Revisão do proprietário e autorização explícita.
4. Cópia de `supabase/review/pacientes_correcao_cpf_com_motivo.sql` para `supabase/migrations/<timestamp>_pacientes_correcao_cpf_com_motivo.sql`, com registro em `supabase_migrations.schema_migrations` na mesma transação.
5. Conferência pós-instalação: coluna `motivo` presente; `fn_auditoria` reescrita; grants restritos a `authenticated` para as duas RPCs novas; nenhuma alteração em policies existentes de pacientes, CPF, foto ou vínculos.

Rollback: migration compensatória específica revogando/removendo apenas as duas RPCs novas e restaurando `fn_auditoria` para a definição anterior (guardada como comentário no cabeçalho da migration). A coluna `motivo` permanece — sua remoção exige decisão separada.

## 6. Critérios de aceite da Iteração A

Todos ensaiados com `ROLLBACK` em conexão dedicada, sem tocar em dados reais:

1. Proprietária de Brotas corrige CPF de paciente de Brotas com motivo válido → sucesso, uma linha em `auditoria` com `entidade = 'pacientes'`, `acao = 'UPDATE'`, `dados_antes.cpf_hash` distinto de `dados_depois.cpf_hash`, `motivo` preenchido.
2. Recepção de Brotas idem → sucesso.
3. Médico → `42501`.
4. Anônimo → `42501`.
5. Proprietária de Brotas tenta corrigir paciente de Ipupiara → `42501` sem revelar existência.
6. `clinica_ativa()` não nula e diferente de `p_clinica_id` → `42501`.
7. Clínica inativa → `42501`.
8. Motivo com menos de 10 caracteres, apenas whitespace, ou maior que 500 → `22023`.
9. CPF inválido (formato, dígitos, sequência) → `22023`.
10. CPF idêntico ao já gravado → `22023` ("nenhuma alteração solicitada").
11. `updated_at` divergente → `PT409` (código próprio para conflito otimista, coerente com `20260926101000`).
12. CPF novo em uso por outro paciente ativo ou inativo da mesma clínica → `23505`, sem revelar id/nome do conflitante.
13. Mesma pessoa com o mesmo CPF em Brotas e Ipupiara continua permitida.
14. Cadastro sem CPF (cpf_hash NULL) → correção rejeitada com `P0001`: o caminho para adicionar CPF quando ausente permanece `paciente_definir_cpf`.
15. Retorno é `void`; nenhum CPF, ciphertext, hash ou identidade de conflito trafega para o cliente.
16. Trigger `trg_audit_pacientes` continua registrando `INSERT`/`DELETE` de pacientes sem exigir motivo (fallback silencioso).
17. Auditorias de outras entidades (clinicas, entradas_caixa, etc.) continuam sem exigência ou quebra por `audit.motivo` ausente.
18. `paciente_cpf_disponivel` responde `true`/`false` sem revelar id/nome, com as mesmas guardas de autorização; usuário sem vínculo válido recebe `42501`.

## 7. Definição de pronto da Iteração A

- [ ] `01-DOCUMENTO-FUNCIONAL-MESTRE.md` inclui §9-C e §9-D aprovados.
- [ ] `07-PLANO-IMPLEMENTACAO.md` (este arquivo) criado e aprovado.
- [ ] `supabase/review/pacientes_correcao_cpf_com_motivo.sql` proposto e revisado.
- [ ] `supabase/review/pacientes_correcao_cpf_ensaio.sql` proposto e revisado.
- [ ] `docs/modulos/pacientes/00-README-PACIENTES.md` atualizado com referência a esta iteração (após aprovação).
- [ ] `docs/modulos/pacientes/08-CHECKPOINT.md` atualizado somente quando houver instalação real da migration.
- [ ] `src/config/notasEvolucao.json` recebe entrada não lançada somente quando a UI da Iteração B chegar ao usuário.

## 8. O que este plano NÃO autoriza

- alterar `supabase/migrations/` na Iteração A (as propostas vivem em `supabase/review/`);
- alterar frontend nesta iteração;
- consultar ou modificar dados reais de pacientes;
- executar `npx supabase db push`, `db reset`, `db diff` ou similares no remoto;
- fazer commit da migration em `supabase/migrations/` sem autorização explícita e ensaio prévio no Supabase real.
