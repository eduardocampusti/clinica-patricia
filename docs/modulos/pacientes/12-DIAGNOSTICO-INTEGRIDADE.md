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

### 27/09/2026 — Leitura individual e correção auditada de CPF

- Projeto vinculado confirmado como `Clinica Patrícia` (`xftnkusbyqzyvzrovroj`), igual à configuração pública do frontend. O histórico remoto anterior continha `20260926101000`, mas não `20260925130000` nem a nova `20260927100000`.
- Antes da aplicação, catálogo confirmou a tabela `public.auditoria` sem `motivo`, unicidade de `cpf_hash` por clínica, helpers de papel/criptografia e ausência das duas novas RPCs. Um ensaio transacional usando essas dependências reais passou e o `ROLLBACK` deixou zero pacientes sintéticos, zero funções novas e nenhum registro de migration.
- Somente `20260927100000_pacientes_cpf_leitura_correcao.sql` foi aplicada, com seu registro de histórico na mesma transação. Verificação posterior: `auditoria.motivo` presente; duas RPCs `SECURITY DEFINER` presentes com assinaturas esperadas; `authenticated` tem `EXECUTE` e `anon` não; versão `20260927100000` registrada uma vez; `20260925130000` permanece não aplicada.
- `supabase/tools/verificar-integridade.sql` foi executado sem erro. Smoke sintético pós-aplicação com `ROLLBACK` passou para leitura, correção, autoria/motivo, duplicidade com paciente inativo, CPF inválido, revisão obsoleta e negações simuladas de papel/clínica. Consulta final confirmou zero pacientes e zero linhas de auditoria sintéticos. As identidades desse ensaio são SQL simuladas, não sessões HTTP autenticadas; esta homologação continua pendente.
- Não houve alteração de policy nem revogação de `cpf_decrypt`. O frontend local não foi publicado.

### 28/09/2026 — Endereço estruturado aplicado e homologado

- Projeto vinculado confirmado como `Clinica Patrícia` (`xftnkusbyqzyvzrovroj`). A migration `20260928110000_pacientes_endereco_estruturado.sql`, SHA-256 `43575F24187C76BC62D70F2469E227448C9A6C9FB7E4693101110A6D2D82ACEF`, foi aplicada isoladamente e registrada no histórico remoto. Não foi usado `db push --include-all`.
- A divergência anterior foi tratada sem executar a migration independente `20260925130000`: catálogo e histórico confirmaram que suas funções, triggers e versão continuam ausentes. Ela permanece não aplicada e fora desta ordem de implantação.
- Verificação pós-aplicação confirmou oito colunas opcionais em `public.pacientes`, constraints de formato de CEP e UF como `NOT VALID`, RPC administrativa `SECURITY DEFINER`, sobrecargas compatíveis da criação atômica de menor, `authenticated` permitido e `anon` negado. A coluna textual `endereco` foi preservada e nenhum registro histórico foi reescrito.
- Smoke conectado com dados sintéticos passou em nove cenários e terminou com `ROLLBACK`, incluindo isolamento entre clínicas e negação de médico. Homologação HTTP autenticada com conta técnica temporária de proprietária confirmou cadastro/edição/releitura de endereço ausente, histórico e estruturado em Brotas e Ipupiara, além de criação de adulto e menor pela RPC compatível.
- A homologação encontrou uma reconsulta indevida do ViaCEP ao reabrir CEP já persistido, que podia trocar somente a apresentação de uma cidade corrigida manualmente. O frontend agora reconhece o CEP carregado como já consultado; o backend nunca perdeu o valor salvo. Teste de regressão dirigido passou.
- `supabase/tools/verificar-integridade.sql` foi executado após a migration com saída 0. A limpeza final encontrou zero pacientes e zero usuários sintéticos restantes. Sessões HTTP próprias de recepção e médico continuam pendentes; seus limites foram exercitados apenas no ensaio SQL conectado.
- Objetos alterados no banco nesta investigação: colunas, constraints e funções definidos exclusivamente pela migration `20260928110000`; registro correspondente em `supabase_migrations.schema_migrations`.

### 29/09/2026 — Verificação catalogal após `equipe_gestao_acessos`

- Escopo: somente a migration `20260929120000_equipe_gestao_acessos.sql` e a função remota `equipe-acessos` do projeto `xftnkusbyqzyvzrovroj`, autorizadas pelo responsável. Nenhuma tabela de Pacientes foi alterada.
- O verificador `supabase/tools/verificar-integridade.sql` foi executado após a mudança sem erro; a saída agregada terminou em `qtd_pacientes=3`. A consulta dirigida adicional confirmou histórico da migration, tabela de convites, RLS ativo, 10 funções, nenhum `EXECUTE` para `anon`/`authenticated` e nenhum privilégio direto de tabela para esses papéis.
- As consultas foram somente leitura e não retornaram CPF, e-mail, ciphertext, Auth ou segredos. As contagens agregadas pós-aplicação permaneceram clínicas `3`, equipe `1`, vínculos `2`, usuários `5` e vínculos de usuários `8`.
- A Edge Function foi publicada com JWT obrigatório e variáveis administrativas apenas no ambiente remoto; a configuração de redirect e os testes com contas não proprietárias continuam pendentes. Não houve escrita de dados sintéticos nem limpeza nesta investigação.
- Limitação: `supabase/tools/verificar-integridade.sql` cobre principalmente Pacientes e não substitui a verificação específica de Equipe registrada no relatório `docs/modulos/equipe/19-GESTAO-DE-ACESSOS.md`.

### 29/09/2026 — Diagnóstico de CPF legado indisponível em Ipupiara

- A sessão autorizada exibiu `CPF informado` no resumo do paciente existente, mas a ficha de edição mostrou `Situação do CPF indisponível`; a consulta não foi tratada como ausência.
- Consulta catalogal somente de leitura confirmou `paciente_ler_cpf(uuid,uuid)` e `paciente_cpf_pendente(uuid,uuid)`, ambas `SECURITY DEFINER`, com `search_path` fixo e `EXECUTE` para `authenticated`; não há ausência de RPC ou de grant como causa.
- Metadados não sensíveis confirmaram ciphertext e hash presentes. Diagnóstico transacional com `ROLLBACK`, sem retornar o CPF, confirmou descriptografia bem-sucedida, hash coincidente, 11 dígitos normalizados e não repetidos, porém validação dos dígitos falsa. A função rejeita corretamente o valor legado e a aplicação comunica indisponibilidade.
- Nenhum dado do paciente, CPF completo, segredo, token ou credencial foi registrado. Nenhuma função, policy, migration ou dado foi alterado. Uma correção futura exige decisão autorizada sobre o cadastro legado; não foi feita recriptografia ou correção automática.

### 29/09/2026 — Distinção segura de CPF legado inválido confirmada no servidor

- A análise anterior não era um erro genérico de rede: valor descriptografado e hash coerentes, mas dígitos verificadores inválidos. A migration específica `20260929210000_pacientes_cpf_legado_invalido.sql` substituiu somente `paciente_ler_cpf(uuid,uuid)`: após autorização e conferência de hash, retorna `PC422` quando falha a validação dos dígitos. Valor ausente continua `NULL`; falha de integridade de criptografia/hash continua `22000`; falta de autorização continua `42501`. Nenhum desses erros contém CPF, hash ou ciphertext.
- Projeto remoto conferido como `xftnkusbyqzyvzrovroj`. A aplicação seletiva terminou sem erro e foi registrada no histórico. Inspeção posterior do catálogo confirmou a função presente, owner `postgres`, `SECURITY DEFINER`, `search_path=pg_catalog`, `EXECUTE` para `authenticated` e ausência de `EXECUTE` para `anon`. A RPC de correção já existente foi preservada. `supabase/tools/verificar-integridade.sql` terminou sem erro. O histórico isolado não foi usado como única prova de instalação.
- A tentativa de inserir normalmente uma fixture com CPF inválido recebeu `22023` do trigger de gravação e não criou linhas. Para reproduzir exclusivamente o estado legado, duas fixtures identificadas foram depois incluídas em uma transação curta; o trigger de validação foi desabilitado apenas dentro dessa transação e reabilitado antes do `COMMIT`, sem desativar RLS ou auditoria. Nenhum cadastro real foi alterado. Os testes e a limpeza dessas fixtures estão no relatório `14-CPF-LEGADO-INVALIDO.md`.
- O CPF real de Ipupiara permanece intocado; não houve dedução de número correto, mudança de chave ou recriptografia. A decisão operacional exige conferência documental pela administradora.

### 30/09/2026 — Integridade após correção da gestão de acessos da Equipe

- Escopo: somente `20260929190000_equipe_gestao_acessos_correcoes.sql` no projeto autorizado `xftnkusbyqzyvzrovroj`; nenhuma tabela, função ou dado de Pacientes foi alterado pela migration.
- Antes da aplicação, o catálogo confirmou ausência das três colunas e dos dois índices corretivos, versão remota da Edge Function igual a 1, zero convites/idempotências e nenhuma duplicidade ou divergência Equipe/Profissionais. O snapshot externo prévio foi reconferido por SHA-256.
- Após a aplicação, `information_schema`, `pg_proc` e `pg_indexes` confirmaram colunas de expiração/reserva, índices únicos, assinaturas corretivas, `SECURITY DEFINER`, `search_path=""` e execução somente por `service_role`; assinaturas antigas ficaram sem execução.
- `supabase/tools/verificar-integridade.sql` terminou sem erro e retornou `qtd_pacientes=3`, igual ao estado anterior conhecido. A verificação específica de Equipe e o ensaio integrado conectado também passaram.
- O ensaio funcional foi executado em transação com `ROLLBACK`. Contagens finais: membros `1`, vínculos ativos `2`, profissionais com usuário `1`, convites `0`, idempotências `0`, duplicidades `0` e divergências `0`. Nenhuma fixture, idempotência ou auditoria de ensaio persistiu.
- A Edge Function versão 2 foi publicada com JWT obrigatório; requisição sem autenticação retornou 401. O ciclo de e-mail não foi executado porque o redirect e o destinatário de teste não estão configurados.

### 30/09/2026 — Integridade após ajustes finais de convites da Equipe

- Escopo de banco restrito à migration `20260930100000_equipe_convites_expiracao_recuperacao.sql`; nenhuma tabela, função, policy ou dado de Pacientes foi alterado.
- `pg_proc` confirmou as novas definições das RPCs de convite com `SECURITY DEFINER`, `search_path=""` e grants internos preservados. O índice único anterior e as migrations aplicadas foram confirmados pelo catálogo.
- O ensaio funcional conectado terminou com `ROLLBACK`; o ensaio de suspensão usou contas e membro sintéticos e limpou todos os IDs exatos, preservando somente dois eventos de auditoria.
- Estado final de Equipe: membros `1`, vínculos ativos `2`, acessos ativos `6`, convites `0`, idempotências `0`.
- `supabase/tools/verificar-integridade.sql` terminou sem erro e retornou `qtd_pacientes=3`, igual ao estado anterior. Não houve leitura ou gravação de paciente nesta etapa.
- A Edge Function versão 3 foi publicada com JWT obrigatório; fontes local e publicada coincidem. A pendência de redirect/caixa de e-mail não afeta a integridade de Pacientes.

---

## Verificação isolada de Agenda — 01/10/2026, 15:16 -03:00

Migration 20261001120000 executada apenas em PostgreSQL portátil sintético 127.0.0.1:55442,
com baseline/Financeiro fase1. Catálogo da Agenda, concorrência e cenários dirigidos
aprovados; Auth claim simulado, RLS do baseline ativa. Script oficial de integridade
executado parcialmente: sem schemas supabase_migrations/Storage nem migrations posteriores
de Pacientes no laboratório. Ausências não são falhas do principal, que não foi consultado/
alterado nesta continuação. Instância encerrada; pacientes reais preservados.
Detalhes: [Agenda 12](../agenda/12-EDICAO-DATA-HORARIO.md).

## Aplicação de Agenda — 01/10/2026, 15:37 -03:00

Somente migration 20261001120000 aplicada no ref xftnkusbyqzyvzrovroj, pela exceção de
canal autorizada nesta tarefa. Conferidos pg_proc, assinaturas, grants, triggers e RLS
da Agenda; corpo registrado corresponde ao arquivo local normalizando formatação.
Todas as consultas do script oficial verificar-integridade.sql executadas sem erro.
Consulta de contagem agregada não é acesso a documentos/prontuários nem prova completa
de integridade. Nenhuma escrita em Pacientes ou agendamentos reais, nenhum CPF consultado.
Catálogo técnico preservado; proteção não inclui dados/Auth/Storage nem restauração testada.
Detalhes e limitações: [Agenda 12](../agenda/12-EDICAO-DATA-HORARIO.md).

## 8. Referências cruzadas

- `AGENTS.md` — instruções para agentes IA que operam neste
  repositório.
- `DEVELOPMENT_RULES.md` — regras gerais do projeto.
- `04-ISOLAMENTO-DE-SISTEMAS.md` — regras de isolamento entre
  Clínica Patrícia e LabBrotas.
- `supabase/tools/verificar-integridade.sql` — script de
  verificação de integridade selecionada.
