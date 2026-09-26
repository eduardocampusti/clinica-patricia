# 12 — Diagnóstico de integridade e lições aprendidas

**Data:** 26/09/2026
**Autor:** Eduardo (arquiteto) + Claude (senior engineer)
**Escopo:** Módulo 2 — Pacientes
**Status:** EM VALIDAÇÃO — relato de investigação externa; estado remoto não conferido nesta tarefa

---

## 1. Contexto

Durante a preparação da Iteração A do módulo Pacientes (correção de
CPF com auditoria via `set_config`), foi relatada uma investigação
do estado do banco Supabase para confirmar quais migrations
haviam sido efetivamente aplicadas. Essa investigação apontou:

- Boas práticas ausentes que precisam ser institucionalizadas.
- Padrões enganosos herdados de versões anteriores do fluxo de
  migration que geraram falsos alarmes de "aplicação parcial".
- Necessidade de guardas automáticas para prevenir problemas futuros.

Segundo o relato fornecido para este documento, nenhum problema real
foi encontrado no banco. **A integridade do banco remoto não foi
verificada nesta tarefa.** Este documento registra as lições do relato
e um roteiro de verificações para diagnósticos futuros.

---

## 2. Cabeçalho de migration enganoso

Algumas migrations do projeto foram escritas com o cabeçalho:

    -- PROPOSTA PARA REVISÃO — NÃO APLICADA.

**Observação:** nem toda migration do projeto usa esse cabeçalho.
Ao investigar migrations específicas, leia o arquivo real antes de
assumir seu conteúdo.

Esse texto pode **permanecer no arquivo mesmo depois da migration ser
aplicada** no Supabase real. A presença ou ausência do cabeçalho não
determina o estado de implantação; nem todas as migrations locais o
utilizam.

### Regra prática

- ❌ **NÃO** use o cabeçalho da migration como fonte de status.
- ✅ Consulte `supabase_migrations.schema_migrations` para
  saber se uma migration foi registrada.
- ✅ Consulte os catálogos do banco e teste os contratos relevantes para
  confirmar se os objetos foram criados e funcionam de fato.

---

## 3. `schema_migrations` só registra, não valida execução

A tabela `supabase_migrations.schema_migrations` guarda o **registro**
da migration (version, name, statements). Um registro isolado nessa
tabela não prova, por si só, que cada objeto e contrato esperado existe
e funciona; isso importa especialmente em fluxos manuais.

### Regra prática

- ✅ Verifique a existência e o comportamento dos objetos criados pela
  migration (tabelas, colunas, funções, políticas, triggers) após
  aplicação.
- ✅ **NUNCA** confie apenas em `schema_migrations` para atestar
  a integridade funcional de uma migration.

---

## 4. Convenção de nomenclatura descoberta

O projeto usa sufixo semântico nas tabelas de vínculo:

- `pacientes_responsaveis_legais` (não `pacientes_responsaveis`)

O sufixo `_legais` explicita que o vínculo tem natureza jurídica
(responsável legal por menor), diferenciando de outras formas de
"responsável" (financeiro, técnico, etc.) que possam surgir.

### Regra prática

- ✅ Ao criar tabelas de vínculo com natureza jurídica ou de papel,
  avaliar sufixo semântico (`_legais`, `_financeiros`, `_tecnicos`).
- ✅ Ao investigar problemas, **nunca chute o nome de tabela**.
  Consulte primeiro:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%<palavra_chave>%';
```

---

## 5. Processo de diagnóstico correto (checklist)

Ao suspeitar de que uma migration não foi aplicada corretamente:

### Passo 1 — Confirmar registro

```sql
SELECT version, name, array_length(statements, 1) AS qtd_statements
FROM supabase_migrations.schema_migrations
WHERE version = '<TIMESTAMP>';
```

### Passo 2 — Listar objetos que a migration deveria ter criado

Ler o texto real do arquivo `.sql` no repositório e **fazer inventário
manual** de:

- Tabelas (`CREATE TABLE`)
- Colunas adicionadas (`ALTER TABLE ... ADD COLUMN`)
- Funções / RPCs (`CREATE FUNCTION`, `CREATE OR REPLACE FUNCTION`)
- Triggers (`CREATE TRIGGER`)
- Políticas RLS (`CREATE POLICY`)
- Índices (`CREATE INDEX`)
- Comentários (`COMMENT ON`)
- Grants (`GRANT`, `REVOKE`)

### Passo 3 — Verificar cada objeto no banco

```sql
-- Tabelas
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = '<nome>'
);

-- Colunas
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = '<tabela>'
    AND column_name = '<coluna>'
);

-- Funções/RPCs
SELECT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = '<funcao>'
);

-- Triggers
SELECT EXISTS (
  SELECT 1 FROM information_schema.triggers
  WHERE trigger_schema = 'public' AND trigger_name = '<trigger>'
);

-- Políticas RLS
SELECT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = '<tabela>'
    AND policyname = '<nome_politica>'
);
```

### Passo 4 — Só depois, decidir se há problema real

Se qualquer objeto esperado estiver ausente:

- Verificar se a RPC dependente referencia objeto inexistente.
- Ler o SQL da migration completo para entender ordem de execução.
- Comparar bytes de versões diferentes (repositório vs. banco) só
  se necessário — atenção a diferenças **puramente de encoding**
  que não afetam semântica.

### Passo 5 — Corrigir cirurgicamente

Se, e apenas se, um problema real for confirmado:

- Preparar uma correção versionada e idempotente onde couber, conforme
  o tipo de objeto e o histórico já aplicado.
- Ensaiar em transação com `ROLLBACK` quando tecnicamente possível.
- Publicar somente após revisar impacto, ordem e recuperação.
- Registrar o incidente e a correção neste documento.

---

## 6. Ferramentas de apoio

Consulte o script SQL de verificação em:

    supabase/tools/verificar-integridade.sql

Ele verifica um conjunto **selecionado** de objetos críticos do
módulo Pacientes (tabelas, RPCs, bucket de foto) — não é uma
auditoria exaustiva do banco inteiro. Para objetos fora dessa
lista, adapte as consultas descritas na seção 5 (passo 3) usando
`information_schema` e `pg_proc`.

Execute o script após cada nova migration para detectar divergências
em objetos cobertos. Amplie o script sempre que criar novo objeto
crítico. Isso não substitui testes funcionais e autenticados.

---

## 7. Histórico de investigações neste documento

### 26/09/2026 — Investigação da migration `pacientes_responsavel_legal`

- **Suspeita inicial relatada:** aplicação parcial (tabela e coluna faltando).
- **Resultado relatado:** falso alarme. Nomes de objetos foram chutados
  errados no diagnóstico inicial. A tabela real chama-se
  `pacientes_responsaveis_legais` (não `pacientes_responsaveis`).
  A coluna `pacientes.eh_menor` **não foi prevista** pela migration local.
- **Lição:** consultar `information_schema` **antes** de qualquer
  suposição, e ler o texto real da migration antes de propor
  correções.
- **Autor da investigação relatada:** Eduardo + Claude.
- **Objetos alterados no banco nesta tarefa:** nenhum.
- **Valor entregue nesta tarefa:** este documento e um script de
  verificação de leitura, ainda não executado aqui.

---

## 8. Referências cruzadas

- `AGENTS.md` — instruções para agentes IA que operam neste
  repositório.
- `DEVELOPMENT_RULES.md` — regras gerais do projeto.
- `04-ISOLAMENTO-DE-SISTEMAS.md` — regras de isolamento entre
  Clínica Patrícia e LabBrotas.
- `supabase/tools/verificar-integridade.sql` — script de
  verificação de integridade selecionada.
