# Auditoria remota somente leitura — compatibilidade 20260916

## Escopo e integridade da coleta

- Projeto confirmado pela API da CLI e pelo `.env`: `xftnkusbyqzyvzrovroj`
  (Clinica Patrícia), saudável, PostgreSQL 17.6.
- Todas as consultas remotas usaram `BEGIN TRANSACTION READ ONLY` e `COMMIT`;
  nenhuma migration, DDL, função, dado clínico, relação de negócio, valor de
  Vault ou segredo foi lido ou alterado.
- A origem/proveniência abaixo é uma classificação por catálogo e por assinatura.
  PostgreSQL não guarda qual migration criou uma função; corpos (`prosrc`) não
  foram consultados.

## Resultado de compatibilidade

**NO-GO para aplicar o release atual diretamente no remoto.** O fingerprint foi
calculado com exatamente o mesmo critério do clone:

| Campo | Esperado para baseline existente | Remoto |
| --- | --- | --- |
| fingerprint | `19|10|188|16|13|47|19|88|29|3` | `19|10|188|204|13|47|19|88|29|3` |
| diferença | — | somente `+188` funções públicas |

As outras nove parcelas do fingerprint coincidem. As 188 funções adicionais são
todos os artefatos C de `btree_gist` instalados no schema `public`; as 16 funções
de domínio da baseline coincidem por schema, assinatura e retorno. Portanto não
há evidência de 188 funções de negócio desconhecidas.

## Inventário das 204 funções públicas

Todas as 204 estão no schema `public`.

### 16 funções da baseline

Origem classificada: `candidate_public_20260914.sql` (SHA-256
`99942BD9A94F0DBE51C6EAE395776B05C4998827E26860361AEB0338AC134261`), por
assinatura e retorno. Owner `postgres`; não foram lidos corpos de função.

| Assinatura | Linguagem | SECURITY DEFINER |
| --- | --- | --- |
| `public.abrir_atendimento(p_atendimento_id uuid) RETURNS atendimentos` | plpgsql | sim |
| `public.bloquear_edicao_atendimento_finalizado() RETURNS trigger` | plpgsql | não |
| `public.cadastrar_profissional(p_nome_completo text, p_cpf text, p_conselho_classe text, p_registro_conselho text, p_especialidade_principal_id uuid, p_clinica_id uuid, p_valor_consulta numeric, p_taxa_repasse_clinica numeric, p_duracao_consulta_minutos integer) RETURNS uuid` | plpgsql | sim |
| `public.calcular_hora_fim_agendamento() RETURNS trigger` | plpgsql | não |
| `public.clinica_ativa() RETURNS uuid` | sql | não |
| `public.clinicas_do_usuario() RETURNS SETOF uuid` | sql | sim |
| `public.cpf_decrypt(p_enc bytea) RETURNS text` | sql | sim |
| `public.cpf_encrypt(p_cpf text) RETURNS bytea` | sql | sim |
| `public.cpf_hash(p_cpf text) RETURNS text` | sql | sim |
| `public.eh_proprietaria(p_clinica uuid) RETURNS boolean` | sql | sim |
| `public.eh_proprietaria_alguma() RETURNS boolean` | sql | sim |
| `public.eh_proprietaria_de_profissional(p_profissional_id uuid) RETURNS boolean` | sql | sim |
| `public.eh_proprietaria_ou_recepcao(p_clinica_id uuid) RETURNS boolean` | sql | sim |
| `public.finalizar_atendimento(p_atendimento_id uuid) RETURNS void` | plpgsql | sim |
| `public.fn_auditoria() RETURNS trigger` | plpgsql | sim |
| `public.fn_bloqueia_mutacao() RETURNS trigger` | plpgsql | não |

### Oito RPCs do release

Origem esperada: `20260915010005_prontuario_rpc.sql` (SHA-256
`08FB16E6D846B2A1175FD3FC31117FC0AC51E66AF4E3AA94D62C9BADD650D967`). Todas
as oito estão **ausentes**, como esperado antes de aplicar o release:

`listar_atendimentos_prontuario`, `abrir_prontuario`,
`iniciar_atendimento_avulso`, `iniciar_atendimento_agendado`,
`salvar_rascunho_atendimento`, `finalizar_atendimento_seguro`,
`adicionar_adendo_prontuario` e `criar_documento_prontuario`.

### 188 funções de `btree_gist`

Metadados iguais para todas as assinaturas desta seção: schema `public`, owner
`supabase_admin`, linguagem `c`, `SECURITY DEFINER = não`, origem de catálogo
`$libdir/btree_gist`. São membros da extensão, não funções de negócio.

```text
public.cash_dist(money, money) RETURNS money
public.date_dist(date, date) RETURNS integer
public.float4_dist(real, real) RETURNS real
public.float8_dist(double precision, double precision) RETURNS double precision
public.gbt_bit_compress(internal) RETURNS internal
public.gbt_bit_consistent(internal, bit, smallint, oid, internal) RETURNS boolean
public.gbt_bit_penalty(internal, internal, internal) RETURNS internal
public.gbt_bit_picksplit(internal, internal) RETURNS internal
public.gbt_bit_same(gbtreekey_var, gbtreekey_var, internal) RETURNS internal
public.gbt_bit_union(internal, internal) RETURNS gbtreekey_var
public.gbt_bool_compress(internal) RETURNS internal
public.gbt_bool_consistent(internal, boolean, smallint, oid, internal) RETURNS boolean
public.gbt_bool_fetch(internal) RETURNS internal
public.gbt_bool_penalty(internal, internal, internal) RETURNS internal
public.gbt_bool_picksplit(internal, internal) RETURNS internal
public.gbt_bool_same(gbtreekey2, gbtreekey2, internal) RETURNS internal
public.gbt_bool_union(internal, internal) RETURNS gbtreekey2
public.gbt_bpchar_compress(internal) RETURNS internal
public.gbt_bpchar_consistent(internal, character, smallint, oid, internal) RETURNS boolean
public.gbt_bytea_compress(internal) RETURNS internal
public.gbt_bytea_consistent(internal, bytea, smallint, oid, internal) RETURNS boolean
public.gbt_bytea_penalty(internal, internal, internal) RETURNS internal
public.gbt_bytea_picksplit(internal, internal) RETURNS internal
public.gbt_bytea_same(gbtreekey_var, gbtreekey_var, internal) RETURNS internal
public.gbt_bytea_union(internal, internal) RETURNS gbtreekey_var
public.gbt_cash_compress(internal) RETURNS internal
public.gbt_cash_consistent(internal, money, smallint, oid, internal) RETURNS boolean
public.gbt_cash_distance(internal, money, smallint, oid, internal) RETURNS double precision
public.gbt_cash_fetch(internal) RETURNS internal
public.gbt_cash_penalty(internal, internal, internal) RETURNS internal
public.gbt_cash_picksplit(internal, internal) RETURNS internal
public.gbt_cash_same(gbtreekey16, gbtreekey16, internal) RETURNS internal
public.gbt_cash_union(internal, internal) RETURNS gbtreekey16
public.gbt_date_compress(internal) RETURNS internal
public.gbt_date_consistent(internal, date, smallint, oid, internal) RETURNS boolean
public.gbt_date_distance(internal, date, smallint, oid, internal) RETURNS double precision
public.gbt_date_fetch(internal) RETURNS internal
public.gbt_date_penalty(internal, internal, internal) RETURNS internal
public.gbt_date_picksplit(internal, internal) RETURNS internal
public.gbt_date_same(gbtreekey8, gbtreekey8, internal) RETURNS internal
public.gbt_date_union(internal, internal) RETURNS gbtreekey8
public.gbt_decompress(internal) RETURNS internal
public.gbt_enum_compress(internal) RETURNS internal
public.gbt_enum_consistent(internal, anyenum, smallint, oid, internal) RETURNS boolean
public.gbt_enum_fetch(internal) RETURNS internal
public.gbt_enum_penalty(internal, internal, internal) RETURNS internal
public.gbt_enum_picksplit(internal, internal) RETURNS internal
public.gbt_enum_same(gbtreekey8, gbtreekey8, internal) RETURNS internal
public.gbt_enum_union(internal, internal) RETURNS gbtreekey8
public.gbt_float4_compress(internal) RETURNS internal
public.gbt_float4_consistent(internal, real, smallint, oid, internal) RETURNS boolean
public.gbt_float4_distance(internal, real, smallint, oid, internal) RETURNS double precision
public.gbt_float4_fetch(internal) RETURNS internal
public.gbt_float4_penalty(internal, internal, internal) RETURNS internal
public.gbt_float4_picksplit(internal, internal) RETURNS internal
public.gbt_float4_same(gbtreekey8, gbtreekey8, internal) RETURNS internal
public.gbt_float4_union(internal, internal) RETURNS gbtreekey8
public.gbt_float8_compress(internal) RETURNS internal
public.gbt_float8_consistent(internal, double precision, smallint, oid, internal) RETURNS boolean
public.gbt_float8_distance(internal, double precision, smallint, oid, internal) RETURNS double precision
public.gbt_float8_fetch(internal) RETURNS internal
public.gbt_float8_penalty(internal, internal, internal) RETURNS internal
public.gbt_float8_picksplit(internal, internal) RETURNS internal
public.gbt_float8_same(gbtreekey16, gbtreekey16, internal) RETURNS internal
public.gbt_float8_union(internal, internal) RETURNS gbtreekey16
public.gbt_inet_compress(internal) RETURNS internal
public.gbt_inet_consistent(internal, inet, smallint, oid, internal) RETURNS boolean
public.gbt_inet_penalty(internal, internal, internal) RETURNS internal
public.gbt_inet_picksplit(internal, internal) RETURNS internal
public.gbt_inet_same(gbtreekey16, gbtreekey16, internal) RETURNS internal
public.gbt_inet_union(internal, internal) RETURNS gbtreekey16
public.gbt_int2_compress(internal) RETURNS internal
public.gbt_int2_consistent(internal, smallint, smallint, oid, internal) RETURNS boolean
public.gbt_int2_distance(internal, smallint, smallint, oid, internal) RETURNS double precision
public.gbt_int2_fetch(internal) RETURNS internal
public.gbt_int2_penalty(internal, internal, internal) RETURNS internal
public.gbt_int2_picksplit(internal, internal) RETURNS internal
public.gbt_int2_same(gbtreekey4, gbtreekey4, internal) RETURNS internal
public.gbt_int2_union(internal, internal) RETURNS gbtreekey4
public.gbt_int4_compress(internal) RETURNS internal
public.gbt_int4_consistent(internal, integer, smallint, oid, internal) RETURNS boolean
public.gbt_int4_distance(internal, integer, smallint, oid, internal) RETURNS double precision
public.gbt_int4_fetch(internal) RETURNS internal
public.gbt_int4_penalty(internal, internal, internal) RETURNS internal
public.gbt_int4_picksplit(internal, internal) RETURNS internal
public.gbt_int4_same(gbtreekey8, gbtreekey8, internal) RETURNS internal
public.gbt_int4_union(internal, internal) RETURNS gbtreekey8
public.gbt_int8_compress(internal) RETURNS internal
public.gbt_int8_consistent(internal, bigint, smallint, oid, internal) RETURNS boolean
public.gbt_int8_distance(internal, bigint, smallint, oid, internal) RETURNS double precision
public.gbt_int8_fetch(internal) RETURNS internal
public.gbt_int8_penalty(internal, internal, internal) RETURNS internal
public.gbt_int8_picksplit(internal, internal) RETURNS internal
public.gbt_int8_same(gbtreekey16, gbtreekey16, internal) RETURNS internal
public.gbt_int8_union(internal, internal) RETURNS gbtreekey16
public.gbt_intv_compress(internal) RETURNS internal
public.gbt_intv_consistent(internal, interval, smallint, oid, internal) RETURNS boolean
public.gbt_intv_decompress(internal) RETURNS internal
public.gbt_intv_distance(internal, interval, smallint, oid, internal) RETURNS double precision
public.gbt_intv_fetch(internal) RETURNS internal
public.gbt_intv_penalty(internal, internal, internal) RETURNS internal
public.gbt_intv_picksplit(internal, internal) RETURNS internal
public.gbt_intv_same(gbtreekey32, gbtreekey32, internal) RETURNS internal
public.gbt_intv_union(internal, internal) RETURNS gbtreekey32
public.gbt_macad8_compress(internal) RETURNS internal
public.gbt_macad8_consistent(internal, macaddr8, smallint, oid, internal) RETURNS boolean
public.gbt_macad8_fetch(internal) RETURNS internal
public.gbt_macad8_penalty(internal, internal, internal) RETURNS internal
public.gbt_macad8_picksplit(internal, internal) RETURNS internal
public.gbt_macad8_same(gbtreekey16, gbtreekey16, internal) RETURNS internal
public.gbt_macad8_union(internal, internal) RETURNS gbtreekey16
public.gbt_macad_compress(internal) RETURNS internal
public.gbt_macad_consistent(internal, macaddr, smallint, oid, internal) RETURNS boolean
public.gbt_macad_fetch(internal) RETURNS internal
public.gbt_macad_penalty(internal, internal, internal) RETURNS internal
public.gbt_macad_picksplit(internal, internal) RETURNS internal
public.gbt_macad_same(gbtreekey16, gbtreekey16, internal) RETURNS internal
public.gbt_macad_union(internal, internal) RETURNS gbtreekey16
public.gbt_numeric_compress(internal) RETURNS internal
public.gbt_numeric_consistent(internal, numeric, smallint, oid, internal) RETURNS boolean
public.gbt_numeric_penalty(internal, internal, internal) RETURNS internal
public.gbt_numeric_picksplit(internal, internal) RETURNS internal
public.gbt_numeric_same(gbtreekey_var, gbtreekey_var, internal) RETURNS internal
public.gbt_numeric_union(internal, internal) RETURNS gbtreekey_var
public.gbt_oid_compress(internal) RETURNS internal
public.gbt_oid_consistent(internal, oid, smallint, oid, internal) RETURNS boolean
public.gbt_oid_distance(internal, oid, smallint, oid, internal) RETURNS double precision
public.gbt_oid_fetch(internal) RETURNS internal
public.gbt_oid_penalty(internal, internal, internal) RETURNS internal
public.gbt_oid_picksplit(internal, internal) RETURNS internal
public.gbt_oid_same(gbtreekey8, gbtreekey8, internal) RETURNS internal
public.gbt_oid_union(internal, internal) RETURNS gbtreekey8
public.gbt_text_compress(internal) RETURNS internal
public.gbt_text_consistent(internal, text, smallint, oid, internal) RETURNS boolean
public.gbt_text_penalty(internal, internal, internal) RETURNS internal
public.gbt_text_picksplit(internal, internal) RETURNS internal
public.gbt_text_same(gbtreekey_var, gbtreekey_var, internal) RETURNS internal
public.gbt_text_union(internal, internal) RETURNS gbtreekey_var
public.gbt_time_compress(internal) RETURNS internal
public.gbt_time_consistent(internal, time without time zone, smallint, oid, internal) RETURNS boolean
public.gbt_time_distance(internal, time without time zone, smallint, oid, internal) RETURNS double precision
public.gbt_time_fetch(internal) RETURNS internal
public.gbt_time_penalty(internal, internal, internal) RETURNS internal
public.gbt_time_picksplit(internal, internal) RETURNS internal
public.gbt_time_same(gbtreekey16, gbtreekey16, internal) RETURNS internal
public.gbt_time_union(internal, internal) RETURNS gbtreekey16
public.gbt_timetz_compress(internal) RETURNS internal
public.gbt_timetz_consistent(internal, time with time zone, smallint, oid, internal) RETURNS boolean
public.gbt_ts_compress(internal) RETURNS internal
public.gbt_ts_consistent(internal, timestamp without time zone, smallint, oid, internal) RETURNS boolean
public.gbt_ts_distance(internal, timestamp without time zone, smallint, oid, internal) RETURNS double precision
public.gbt_ts_fetch(internal) RETURNS internal
public.gbt_ts_penalty(internal, internal, internal) RETURNS internal
public.gbt_ts_picksplit(internal, internal) RETURNS internal
public.gbt_ts_same(gbtreekey16, gbtreekey16, internal) RETURNS internal
public.gbt_ts_union(internal, internal) RETURNS gbtreekey16
public.gbt_tstz_compress(internal) RETURNS internal
public.gbt_tstz_consistent(internal, timestamp with time zone, smallint, oid, internal) RETURNS boolean
public.gbt_tstz_distance(internal, timestamp with time zone, smallint, oid, internal) RETURNS double precision
public.gbt_uuid_compress(internal) RETURNS internal
public.gbt_uuid_consistent(internal, uuid, smallint, oid, internal) RETURNS boolean
public.gbt_uuid_fetch(internal) RETURNS internal
public.gbt_uuid_penalty(internal, internal, internal) RETURNS internal
public.gbt_uuid_picksplit(internal, internal) RETURNS internal
public.gbt_uuid_same(gbtreekey32, gbtreekey32, internal) RETURNS internal
public.gbt_uuid_union(internal, internal) RETURNS gbtreekey32
public.gbt_var_decompress(internal) RETURNS internal
public.gbt_var_fetch(internal) RETURNS internal
public.gbtreekey16_in(cstring) RETURNS gbtreekey16
public.gbtreekey16_out(gbtreekey16) RETURNS cstring
public.gbtreekey2_in(cstring) RETURNS gbtreekey2
public.gbtreekey2_out(gbtreekey2) RETURNS cstring
public.gbtreekey32_in(cstring) RETURNS gbtreekey32
public.gbtreekey32_out(gbtreekey32) RETURNS cstring
public.gbtreekey4_in(cstring) RETURNS gbtreekey4
public.gbtreekey4_out(gbtreekey4) RETURNS cstring
public.gbtreekey8_in(cstring) RETURNS gbtreekey8
public.gbtreekey8_out(gbtreekey8) RETURNS cstring
public.gbtreekey_var_in(cstring) RETURNS gbtreekey_var
public.gbtreekey_var_out(gbtreekey_var) RETURNS cstring
public.int2_dist(smallint, smallint) RETURNS smallint
public.int4_dist(integer, integer) RETURNS integer
public.int8_dist(bigint, bigint) RETURNS bigint
public.interval_dist(interval, interval) RETURNS interval
public.oid_dist(oid, oid) RETURNS oid
public.time_dist(time without time zone, time without time zone) RETURNS interval
public.ts_dist(timestamp without time zone, timestamp without time zone) RETURNS interval
public.tstz_dist(timestamp with time zone, timestamp with time zone) RETURNS interval
```

## `btree_gist`: relocabilidade e dependências

- Extensão: `btree_gist` 1.7, hoje em `public`.
- `extrelocatable = true`: o PostgreSQL declara que a extensão pode ser movida
  de schema, mas isso não prova a segurança operacional da mudança.
- 264 membros da extensão: 188 funções acima e 76 outros objetos internos
  (tipos, operadores, classes/famílias de operadores e suporte GiST).
- Não há dependentes diretos externos na extensão nem constraints públicas
  diretamente dependentes. O índice público `agendamentos_sem_sobreposicao`
  depende dos objetos da extensão e deve ser validado após qualquer movimento.
- As dependências de função vistas no catálogo são componentes internos do
  próprio `btree_gist`; não foi encontrado dependente de função de domínio.

Consequência: a relocation é tecnicamente candidata, porém deve ser testada em
clone com o índice de agenda presente. O release 01 falha no remoto atual porque
`CREATE EXTENSION IF NOT EXISTS` não move uma extensão existente e a validação
seguinte exige `btree_gist` em `extensions`.

## Histórico de migrations

Não existe `supabase_migrations.schema_migrations`, nem schema com nome de
migration. As únicas relações encontradas foram internas de serviços Supabase:

| Schema | Relação |
| --- | --- |
| `auth` | `schema_migrations` |
| `realtime` | `schema_migrations` |
| `storage` | `migrations` |

Elas não são histórico da aplicação e não podem ser reutilizadas pelo release.
O marcador `update/20_mark_existing_baseline.sql` depende do histórico próprio
`supabase_migrations.schema_migrations`; portanto também não pode rodar ainda.

## Estratégia de simulação — clone descartável somente

1. Criar um clone local PostgreSQL 17/Supabase isolado, sem dados de pacientes,
   Auth ou Vault de produção. Reconstituir somente o schema e os metadados de
   extensão observados nesta auditoria.
2. Reproduzir a condição de partida: as 16 funções da baseline, `btree_gist` 1.7
   em `public`, `pgcrypto` em `extensions`, o índice
   `agendamentos_sem_sobreposicao` e ausência de histórico da aplicação.
3. Em transação descartável no clone, testar `ALTER EXTENSION btree_gist SET
   SCHEMA extensions`; validar o schema da extensão, a validade e definição do
   índice de agenda, o fingerprint esperado de 16 funções públicas e a ausência
   de regressão no catálogo. Descartar a transação ou o clone ao fim do ciclo.
4. Num clone novo que tenha o histórico `supabase_migrations.schema_migrations`
   provido pelo ambiente Supabase local, executar o caminho de atualização:
   preflight 00, extensão 01, marcação segura de 02 e somente 03 → 04 → 05.
   Nunca executar 02 sobre o schema existente.
5. Rodar o harness de segurança, as oito RPCs, RLS, grants, owners e rollback
   exclusivamente no clone. Registrar hashes/fingerprint antes e depois.
6. Só se todos os ciclos passarem, preparar uma migration de compatibilidade
   explícita e revisada para a relocação/histórico. Não modificar o SQL aprovado
   nem tocar o remoto até essa validação e nova autorização.
