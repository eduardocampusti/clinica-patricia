# DATABASE_SCHEMA.md — Clínica Patrícia (Supabase / PostgreSQL)

> Fonte da verdade do banco. Tudo abaixo está aplicado no Supabase e testado,
> **exceto se a seção declarar explicitamente que é uma evolução preparada/não aplicada**.
> Projeto Supabase: `xftnkusbyqzyvzrovroj` (região São Paulo, sa-east-1).

## Estado arquitetural e estado documentado do banco

- **Estado histórico:** o banco foi criado e testado com três tenants, incluindo
  a Clínica Ibitiara. Os resultados históricos abaixo permanecem descritos com
  três clínicas.
- **Decisão arquitetural de 12/08/2026:** somente Brotas e Ipupiara serão tenants
  operacionais; Ibitiara será laboratório externo.
- **Estado documentado do banco nesta formalização:** a linha de Ibitiara ainda
  existe e não foi marcada como inativa. Nenhum SQL foi executado ou banco
  consultado para esta atualização documental.
- **Estado futuro aprovado:** preservar a linha e todos os dados históricos e,
  somente após inventário e plano aprovados, marcar `clinicas.ativo = false` e
  retirar seus acessos operacionais.

`desativar_ibitiara.sql` não está aprovado. A referência arquitetural canônica é
`DECISAO-IBITIARA-LABORATORIO.md`.

## Extensões

- `pgcrypto` (schema `extensions`) — criptografia e HMAC do CPF.
- `supabase_vault` — cofre de segredos (chaves de criptografia).

## Enums

| Enum | Valores |
|---|---|
| `tema_pref` | `claro`, `escuro`, `sistema` |
| `papel_usuario` | `proprietaria`, `medico`, `recepcao` |
| `acao_auditoria` | `INSERT`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `EXPORT`, `READ_SENSIVEL` |

## Tabelas

### `clinicas` — raiz do tenant + identidade visual
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK (default gen_random_uuid) | |
| nome | text NOT NULL | |
| cidade | text NOT NULL | |
| subdomain | text UNIQUE NOT NULL | resolve o clinica_id pelo endereço |
| cnpj | text | |
| logo_url | text | |
| cor_primaria | text NOT NULL default `#7f51b0` | CHECK formato hex `^#[0-9a-f]{6}$` |
| cor_secundaria | text NOT NULL default `#eaddff` | CHECK hex |
| cor_menu | text NOT NULL default `#2e1a47` | CHECK hex |
| fonte | text | opcional |
| ativo | boolean NOT NULL default true | **soft delete** |
| created_at / updated_at | timestamptz | |

### `usuarios` — espelha `auth.users` (Supabase Auth cuida de senha/sessão)
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK → `auth.users(id)` ON DELETE CASCADE | |
| nome_completo | text NOT NULL | |
| cpf_encrypted | bytea | CPF cifrado (reversível, para exibir) |
| cpf_hash | text UNIQUE | HMAC do CPF (busca/unicidade **global** para usuários) |
| conselho_classe | text | CRM / CRP / CRO... |
| registro_conselho | text | |
| preferencia_tema | tema_pref NOT NULL default `sistema` | persistência do modo claro/escuro |
| ativo | boolean NOT NULL default true | **soft delete** |
| created_at / updated_at | timestamptz | |

### `usuarios_clinicas` — vínculo N:N (coração do multi-tenant)
| Coluna | Tipo | Notas |
|---|---|---|
| usuario_id | uuid → usuarios(id) ON DELETE CASCADE | |
| clinica_id | uuid → clinicas(id) ON DELETE CASCADE | |
| papel | papel_usuario NOT NULL | RBAC **por clínica** |
| ativo | boolean NOT NULL default true | |
| PK | (usuario_id, clinica_id) | |

> Um médico que atende em N clínicas tem N linhas aqui. A proprietária tem 1 linha por
> clínica com papel `proprietaria`.

### `pacientes` — cadastro (entidade central)
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK (default gen_random_uuid) | |
| clinica_id | uuid NOT NULL → clinicas(id) ON DELETE RESTRICT | isolamento |
| nome_completo | text NOT NULL | |
| cpf_encrypted | bytea | CPF cifrado |
| cpf_hash | text | HMAC do CPF |
| data_nascimento | date | |
| sexo | text | |
| telefone | text | |
| email | text | |
| endereco | text | |
| consentimento_lgpd | boolean NOT NULL default false | consentimento explícito |
| consentimento_data | timestamptz | |
| observacoes | text | (não-clínicas; diagnóstico é do Prontuário) |
| ativo | boolean NOT NULL default true | **soft delete** |
| created_by | uuid → usuarios(id) default `auth.uid()` | quem cadastrou |
| created_at / updated_at | timestamptz | |
| **UNIQUE (clinica_id, cpf_hash)** | | CPF único **por clínica** (cada clínica tem sua lista) |

### `auditoria` — trilha imutável (append-only)
| Coluna | Tipo | Notas |
|---|---|---|
| id | bigint IDENTITY PK | |
| clinica_id | uuid | |
| usuario_id | uuid | quem (null = ação de sistema) |
| acao | acao_auditoria NOT NULL | |
| entidade | text NOT NULL | tabela tocada |
| entidade_id | text | |
| dados_antes / dados_depois | jsonb | estado antes/depois |
| ip | inet | |
| user_agent | text | |
| created_at | timestamptz | quando |

## Funções

| Função | Tipo | O que faz |
|---|---|---|
| `clinicas_do_usuario()` | SQL, SECURITY DEFINER | retorna os clinica_id do usuário logado (vínculos ativos). Base do RLS. |
| `eh_proprietaria(clinica)` | SQL, SECURITY DEFINER | true se o usuário logado é proprietária daquela clínica |
| `clinica_ativa()` | SQL | lê a var de sessão `app.clinica_ativa` (a clínica do endereço); null se não setada |
| `cpf_encrypt(text)` | SQL, SECURITY DEFINER | cifra o CPF (pgp_sym_encrypt) usando o segredo `cpf_key` do Vault |
| `cpf_decrypt(bytea)` | SQL, SECURITY DEFINER | decifra o CPF |
| `cpf_hash(text)` | SQL, SECURITY DEFINER | HMAC-SHA256 do CPF usando o segredo `cpf_pepper` do Vault |
| `fn_auditoria()` | trigger, SECURITY DEFINER | grava automaticamente na auditoria em INSERT/UPDATE/DELETE |
| `fn_bloqueia_mutacao()` | trigger | barra UPDATE/DELETE na auditoria (append-only) |

## Prontuário eletrônico

A fundação aplicada está registrada em `prontuario_fundacao.sql`. O hardening
incremental está preparado em `prontuario_hardening.sql`, mas **ainda não foi
aplicado ao banco**.

Quando autorizado e aplicado, o frontend deixará de ter grants diretos nas
tabelas `atendimentos`, `atendimentos_adendos` e `documentos_clinicos`:

- a listagem usará `listar_atendimentos_prontuario` e retornará somente
  metadados;
- a leitura completa usará `abrir_prontuario`, que grava
  `auditoria_leitura_clinica` na mesma transação;
- criação, rascunho, finalização, adendos e documentos serão escritos por RPCs
  com validação de `auth.uid()`, papel médico e isolamento por `clinica_id`;
- `finalizar_atendimento_seguro` salvará o conteúdo e finalizará atomicamente;
- um índice único parcial impedirá mais de um atendimento por agendamento.

As RPCs do hardening são `SECURITY DEFINER`, usam `search_path = pg_catalog`,
qualificam os objetos por schema e concedem `EXECUTE` somente a
`authenticated`. As RPCs legadas são preservadas, mas terão execução revogada
do aplicativo após a migration.

## Financeiro — IMPLEMENTADO ESTATICAMENTE — AGUARDA TESTE EM BANCO

Quatro artefatos foram preparados sem execução:

- `financeiro_fundacao.sql`: cobranças, despesas, movimentos físicos,
  fechamentos congelados, repasses, estornos, ajustes e idempotência;
- `financeiro_api_privada.sql`: schema `financeiro_privado`, papéis técnicos,
  asserção HMAC lida do Vault e RPCs atômicas;
- `financeiro_bloqueio_postgrest.sql`: corte final dos INSERT/UPDATE/DELETE
  diretos de `authenticated`;
- `financeiro_seguranca_testes.sql`: testes para local/staging.

Os SQLs dependem do schema-base real, da localização confirmada de `pgcrypto`,
do comportamento de `fn_auditoria()` e do Vault. Esses pontos são preflights
explícitos e não foram presumidos.

Nenhum desses SQLs foi executado. Produção/Supabase não foi alterado. Não há
validação em banco de RPCs, RLS, Vault, roles técnicas, idempotência concorrente,
fechamento atômico, estornos ou repasses. Checks de TypeScript/build e testes
unitários do backend não substituem os testes transacionais do catálogo SQL.

**Próximo bloqueio:** ambiente local/staging reproduzível e baseline do schema
real antes de executar `financeiro_fundacao.sql` ou qualquer etapa posterior.

## Triggers

- `trg_audit_clinicas`, `trg_audit_usuarios`, `trg_audit_usuarios_clinicas`,
  `trg_audit_pacientes` → executam `fn_auditoria()` após INSERT/UPDATE/DELETE.
- `trg_auditoria_imutavel` → executa `fn_bloqueia_mutacao()` antes de UPDATE/DELETE na
  `auditoria` (impede rasura).

## RLS (Row Level Security) — ATIVO nas tabelas atualmente aplicadas

Esta seção descreve o banco existente. As policies financeiras versionadas nos
arquivos `financeiro_*.sql` ainda não foram aplicadas nem testadas em banco.

| Tabela | Política | Regra (resumo) |
|---|---|---|
| clinicas | clinicas_isolamento (SELECT) | `id in (select clinicas_do_usuario())` |
| usuarios | usuarios_self_select / _update | `id = auth.uid()` (cada um vê/edita a si) |
| usuarios_clinicas | uc_self (SELECT) | `usuario_id = auth.uid()` |
| auditoria | auditoria_leitura (SELECT) | `eh_proprietaria(clinica_id)` (só proprietária lê). Sem INSERT/UPDATE/DELETE p/ app. |
| pacientes | pacientes_select / _insert / _update | `clinica_id in (clinicas_do_usuario())` **E** (`clinica_ativa() is null OR clinica_id = clinica_ativa()`) — a "trava por clínica ativa" |

## Grants

- `authenticated` tem: SELECT em clinicas, usuarios, usuarios_clinicas, auditoria;
  UPDATE em usuarios; SELECT/INSERT/UPDATE em pacientes.
- O papel `anon` (pré-login) **não** tem acesso às tabelas (por isso o theming pré-login
  exigirá uma RPC pública dedicada — ver TODO).

## Segredos no Vault

- `cpf_key` — chave de criptografia do CPF. **PROVISÓRIA** (gerada para testes).
- `cpf_pepper` — pepper do HMAC do CPF. **PROVISÓRIA**.
- ⚠️ **Trocar ambos por valores definitivos, gerados de forma privada, antes da produção.**

## Dados de TESTE presentes no banco (remover antes da produção)

- Usuário médico de teste: `teste_medico_brotas@teste.local` (id `4444...`), vinculado a
  Brotas e Ipupiara — criado para validar a trava.
- Usuário histórico de teste `teste_medico_ibitiara@teste.local`, criado quando
  Ibitiara ainda era tenant. Seu estado precisa ser inventariado. Inativar
  `public.usuarios` não equivale a bloquear/remover `auth.users`.
- 2 pacientes de amostra: **Maria Teste Silva** (Brotas) e **João Teste Souza** (Ipupiara).

## Testes de fumaça já realizados (todos passaram, no banco)

- No modelo histórico então vigente, médico de Brotas via só Brotas, médico de
  Ipupiara via só Ipupiara e a proprietária via as 3 clínicas, incluindo Ibitiara.
- UPDATE/DELETE na auditoria é bloqueado ("append-only").
- Médico não lê a auditoria; proprietária lê.
- CPF criptografa e descriptografa corretamente; hash gera valor; unicidade funciona.
- Trava: médico multi-clínica "entrando por Brotas" vê só paciente de Brotas (e vice-versa).
