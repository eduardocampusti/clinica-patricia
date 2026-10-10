# Clínica Patrícia — aplicação e validação da Equipe no Supabase atual

**Data:** 29/09/2026  
**Projeto:** Clínica Patrícia — referência Supabase `xftnkusbyqzyvzrovroj`  
**Escopo:** aplicar somente a migration de Equipe autorizada e validar cadastro/edição com uma sessão autorizada, sem criar projeto novo e sem alterar o Site Geovana.

## 1. Resultado executivo

A migration `supabase/migrations/20260928153000_equipe_cadastro_edicao.sql` foi aplicada no projeto Supabase atual da Clínica Patrícia em uma única execução transacional, após preflight somente leitura e backup protegido. Os objetos foram conferidos no catálogo do banco, a integridade foi verificada e somente essa versão foi marcada como aplicada na tabela de histórico.

O cadastro e a edição de Equipe agora estão disponíveis para uma Proprietária/Administradora autorizada. A interface local reconhece as RPCs e deixou de exibir o aviso de compatibilidade. A gravação não foi liberada por um bypass de frontend: ela depende das funções, RLS, grants e validações instaladas no banco.

A migration local `20260925130000_pacientes_menor_exigir_responsavel.sql` continua pendente de propósito. Ela não foi aplicada, pois a autorização desta etapa limitou a mudança à migration de Equipe.

## 2. O que já existia e o que foi realizado

### Implementado no código antes desta etapa

- Tela `Cadastros → Equipe & acessos`, com criação, edição, vínculos multi-clínica, ficha de consulta e bloqueio compatível quando as RPCs não estão disponíveis.
- Validações de formulário, mensagens de sucesso/erro, proteção de envio repetido, consulta de situação de acesso e tratamento de CPF sem expor o valor em logs.
- Operações de leitura e gravação chamando as RPCs da migration, com contexto de clínica.

### Alterações realizadas nesta etapa

- Aplicação integral da migration autorizada no projeto `Clinica Patrícia`.
- Verificação de dependências, constraints, índices, triggers, RLS, grants e funções no catálogo real.
- Registro da versão `20260928153000` como aplicada depois da confirmação dos objetos (a versão `20260925130000` não foi alterada).
- Execução do `supabase/tools/verificar-integridade.sql` depois da aplicação e depois da limpeza dos dados sintéticos.
- Atualização de `CHECKPOINT.md`, `docs/modulos/equipe/00-README-EQUIPE.md`, `docs/modulos/equipe/08-CHECKPOINT.md` e `src/config/notasEvolucao.json`.
- Este relatório, com o SQL integral da migration ao final.

Não houve alteração no arquivo da migration, em Auth, no Site Geovana, em planos ou em outras migrations nesta etapa.

## 3. Pré-verificações e proteção dos dados

As dependências foram consultadas por `information_schema`, `pg_proc`, catálogo de constraints, políticas, triggers e grants. A base estava em PostgreSQL 17.6. As tabelas e funções necessárias já existiam; `equipe_membros`, `equipe_membros_clinicas`, `equipe_idempotencia` e `profissionais.conselho_uf` ainda não existiam antes da aplicação.

Antes da escrita foi criado backup somente leitura fora do repositório:

- **Local:** `C:\Users\Eduardo\AppData\Local\Temp\clinica-patricia-equipe-backup-20260929\backup.json`
- **SHA-256:** `483329426102720E6F1276B3F2B1273776FB52A743C222E9A1CD827A601A240B`
- **Cobertura conferida:** dados e metadados de `profissionais`, `profissionais_clinicas`, `usuarios`, `usuarios_clinicas`, `clinicas`, `especialidades` e `auditoria`; constraints, índices, policies, triggers, funções e grants.
- **Contagens no backup:** profissionais 1; vínculos profissionais 2; usuários 5; vínculos de usuários 8; clínicas 3.

O ACL do arquivo foi conferido e o conteúdo não contém credenciais. A restauração do backup não foi ensaiada; o arquivo é a proteção de recuperação, não uma prova de restauração já validada.

## 4. Aplicação da migration

Hash SHA-256 do arquivo aplicado:

`F90E9278A46EC09DAE1A1F30B9B48AFC436B956AD42681946C358D7D503BB396`

A execução foi feita como uma consulta única do arquivo integral, cujo próprio conteúdo contém `begin;` e `commit;`. O resultado do banco foi `MIGRATION_SQL_EXECUTED`, sem erro e sem uso de `db push` geral. Depois da conferência de catálogo, somente `20260928153000` foi reparada como `applied` no histórico do Supabase.

Objetos confirmados após a aplicação:

- tabelas `equipe_membros`, `equipe_membros_clinicas` e `equipe_idempotencia` com RLS habilitado;
- coluna `profissionais.conselho_uf` e índice único `profissionais_registro_unico` com conselho, registro e UF;
- funções públicas `equipe_listar`, `equipe_detalhar`, `equipe_salvar` e `equipe_pode_editar_profissional_global` com `SECURITY DEFINER`, `search_path` vazio e execução concedida somente a `authenticated`;
- funções internas de sincronização/validação sem execução concedida a usuários da aplicação;
- grants diretos de tabela revogados para `authenticated`, `anon` e `public`, mantendo o acesso pelas funções autorizadas;
- políticas de leitura por clínica e política global de atualização de profissional exigindo autorização em todas as clínicas vinculadas;
- triggers de sincronização entre profissionais, vínculos profissionais e a projeção de Equipe.

Os consumidores de chave estrangeira de `profissionais` (Agenda, Financeiro e demais tabelas operacionais) foram enumerados antes da aplicação. A migração não removeu registros existentes nem alterou esses vínculos.

## 5. Regra de CPF

O CPF da Equipe permanece **opcional**. Essa regra já estava definida na documentação funcional e nas etapas anteriores; esta migration não a transformou em obrigatório. Para cadastro novo, a operação precisa declarar explicitamente `substituir` (CPF válido) ou `remover`; `preservar` é reservado à edição de um valor já existente. O CPF dos pacientes não foi alterado.

O banco armazena somente o valor criptografado e o hash necessários ao fluxo. A ficha apresenta “Não cadastrado” quando o dado está ausente e não faz consulta de descriptografia apenas para completar a tela. Nenhum CPF foi incluído neste relatório ou em logs de teste.

## 6. Testes executados

### 6.1 Banco real e sessão autorizada

Os testes abaixo foram realizados no projeto `Clinica Patrícia`, com uma sessão autenticada de Proprietária/Administradora e dados sintéticos identificados apenas para esta execução:

1. Criado profissional de saúde com conselho/registro, profissão, UF e vínculos em Brotas e Ipupiara; CPF foi deixado ausente. Uma tentativa com CPF inválido foi recusada no campo com mensagem compreensível e foco no primeiro erro. O cadastro válido foi persistido.
2. Editado o profissional, inclusive a UF de `BA` para `SP`, nome e telefone. Os dois vínculos foram preservados. A ficha mostrou profissão, conselho, registro, UF, clínicas, “CPF — Não cadastrado” e “Login — Não confirmado por esta consulta”.
3. Criado e editado um membro administrativo de recepção, sem criar profissional de saúde nem usuário Auth fictício.
4. Criado e editado um membro de apoio, também sem profissional nem usuário Auth fictício.
5. Reaberta a ficha, recarregada a página e alternado o contexto Brotas/Ipupiara. Os registros e vínculos persistiram; não houve reapresentação de dados do contexto anterior.
6. Fechado e reaberto o cadastro. As mensagens observadas incluíram `Funcionário cadastrado com sucesso.` e `Cadastro atualizado com sucesso.`. A proteção de envio repetido foi observada na criação paralela: duas submissões simultâneas produziram uma única linha de membro, uma revisão inicial e um único registro de idempotência.
7. Tentativa de duplicar conselho/registro foi recusada com código `23505` e mensagem orientando a revisar a UF do legado; nenhuma duplicata foi criada.
8. Os dados sintéticos foram removidos por seus IDs exatos, dentro de transação, depois da verificação de dependências. A auditoria foi preservada.

Estado final após a limpeza: profissionais 1; vínculos profissionais 2; membros de Equipe 1; vínculos de Equipe 2; idempotências 0. A única profissional restante é a existente antes do teste.

### 6.2 Negativas e autorização

- Na simulação de um usuário autenticado sem papel de Proprietária, `equipe_listar`, `equipe_detalhar`, `equipe_salvar` e `SELECT` direto nas tabelas foram negados com `42501`.
- No contexto de clínica inativa/não autorizada, listagem e tentativa de salvar com clínica fora do escopo foram negadas com `42501`.
- A prova negativa foi feita no banco usando o papel autenticado e um usuário existente; não foi uma segunda sessão de navegador com credenciais informadas no chat. Portanto, ela valida a camada de autorização/RLS, mas não substitui uma conferência manual com cada perfil de usuário.

### 6.3 Integridade e compatibilidade

`supabase/tools/verificar-integridade.sql` foi executado com sucesso após a aplicação e após a limpeza final (resultado final de pacientes: 3). As chaves estrangeiras para Agenda, Financeiro e demais módulos permaneceram presentes e sem dependências dos registros temporários. Não foram criados atendimentos, lançamentos financeiros, convites ou contas.

## 7. O que é teste sintético e o que é validação real

- **Validação real:** catálogo, RLS, grants, funções, triggers, constraints, aplicação transacional, sessão autorizada no Supabase atual, persistência após recarregar, troca de clínicas, negativas por autorização, duplicidade e limpeza.
- **Dados sintéticos:** somente os três membros principais e o membro usado no teste de duplo envio; todos foram removidos e não aparecem na interface final.
- **Não é validação de produção ampla:** não foi feito teste de carga, restauração do backup, segundo login de navegador de usuário comum, criação de conta Auth ou fluxo financeiro/Agenda com novos dados.

## 8. Limitações e pendências

- A sessão de navegador usada foi a autorizada como Proprietária/Administradora. A negativa de usuário comum foi uma simulação controlada no banco, não um login adicional.
- A restauração do backup não foi executada.
- A versão local do frontend está disponível em Vite; não foi feito deploy de produção nesta etapa.
- A migration de pacientes `20260925130000_pacientes_menor_exigir_responsavel.sql` continua local-pendente e não faz parte desta homologação.
- O fluxo de Equipe depende das funções instaladas no Supabase atual; sem elas a interface deve continuar exibindo o aviso/bloqueio de compatibilidade.

## 9. Endereço e conferência manual

- **Servidor local:** [http://127.0.0.1:5173/acesso/brotas](http://127.0.0.1:5173/acesso/brotas)
- **Outra clínica:** [http://127.0.0.1:5173/acesso/ipupiara](http://127.0.0.1:5173/acesso/ipupiara)
- **Caminho:** `Cadastros → Equipe & acessos`.

O navegador foi deixado na página de Equipe de Brotas, com apenas o registro existente visível. Para conferir gravação, use `Novo membro` ou `Editar` com a sessão autorizada. Não há membros sintéticos pendentes de remoção.

## 10. Plano de recuperação e aplicação futura

1. Antes de qualquer nova aplicação, confirmar por leitura a referência do projeto, a versão da migration, as dependências e a ausência de duplicidades de conselho/registro/UF.
2. Preservar o backup protegido e gerar um novo snapshot antes de qualquer alteração subsequente.
3. Aplicar somente a versão revisada em transação; não usar `db reset --linked`, não aplicar todas as migrations pendentes e não registrar uma versão como aplicada sem confirmar objetos via catálogo.
4. Conferir tabelas, colunas, funções, `SECURITY DEFINER`, `search_path`, grants, RLS, policies, triggers, constraints, índices e FKs.
5. Executar `supabase/tools/verificar-integridade.sql` e registrar o resultado.
6. Liberar as gravações somente quando as RPCs existirem, os grants estiverem restritos a `authenticated`, as políticas autorizarem o papel correto e a aplicação receber respostas de sucesso do serviço.
7. Em caso de recuperação, interromper novas gravações, preservar auditoria e dados criados depois da aplicação, comparar com o backup e executar um script de reversão revisado. A restauração nunca deve ser inferida apenas pelo histórico de migrations; nesta rodada ela não foi ensaiada.

Referências oficiais utilizadas: [Supabase — Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations), [Supabase CLI — orgs/projects](https://supabase.com/docs/reference/cli/v0/supabase-orgs) e [Supabase — CLI workflows](https://supabase.com/docs/guides/local-development/cli-workflows).

## 11. TypeSafe AI

A skill `typesafe-ai` foi consultada. Não há decisão probabilística, classificação ou extração de linguagem natural nesta etapa: migração, autorização, integridade e mensagens são determinísticas. Portanto, nenhuma integração TypeSafe foi adicionada e nenhuma chave foi solicitada ou exposta.

## 12. SQL integral aplicado

O bloco abaixo é a cópia integral, sem credenciais ou dados pessoais, do arquivo aplicado. O arquivo fonte permanece em `supabase/migrations/20260928153000_equipe_cadastro_edicao.sql`.

```sql
-- ETAPA 1 — cadastro e edição de equipe.
-- Migration aditiva revisada para homologação isolada; não aplicar automaticamente.
-- public.profissionais segue como fonte operacional; Equipe mantém projeção sincronizada.

begin;

do $$
declare v_faltantes text[];
begin
  if to_regclass('public.profissionais') is null
     or to_regclass('public.profissionais_clinicas') is null
     or to_regclass('public.usuarios') is null
     or to_regclass('public.usuarios_clinicas') is null
     or to_regclass('public.clinicas') is null
     or to_regclass('public.especialidades') is null
     or to_regclass('public.auditoria') is null
     or to_regprocedure('public.eh_proprietaria(uuid)') is null
     or to_regprocedure('public.clinicas_do_usuario()') is null
     or to_regprocedure('public.cpf_encrypt(text)') is null
     or to_regprocedure('public.cpf_decrypt(bytea)') is null
     or to_regprocedure('public.cpf_hash(text)') is null
     or to_regprocedure('public.pacientes_cpf_valido(text)') is null then
    raise exception 'Dependências da migration de Equipe não estão disponíveis.';
  end if;
  select array_agg(requisito) into v_faltantes
  from (values
    ('profissionais.nome_completo'),('profissionais.cpf_encrypted'),('profissionais.cpf_hash'),
    ('profissionais.conselho_classe'),('profissionais.registro_conselho'),
    ('profissionais.especialidade_principal_id'),('profissionais.usuario_id'),('profissionais.ativo'),
    ('profissionais_clinicas.profissional_id'),('profissionais_clinicas.clinica_id'),('profissionais_clinicas.ativo'),
    ('usuarios.id'),('usuarios.ativo'),('usuarios_clinicas.usuario_id'),('usuarios_clinicas.clinica_id'),
    ('usuarios_clinicas.papel'),('usuarios_clinicas.ativo'),('auditoria.clinica_id'),
    ('auditoria.usuario_id'),('auditoria.acao'),('auditoria.entidade'),
    ('auditoria.entidade_id'),('auditoria.dados_depois')
  ) r(requisito)
  where not exists (
    select 1 from information_schema.columns c where c.table_schema='public'
      and c.table_name=split_part(r.requisito,'.',1)
      and c.column_name=split_part(r.requisito,'.',2)
  );
  if v_faltantes is not null then
    raise exception 'Colunas obrigatórias ausentes: %', array_to_string(v_faltantes, ', ');
  end if;
end $$;

-- O legado não armazenava a jurisdição do conselho e, por isso, sua constraint
-- bloqueava registros iguais em UFs distintas. A coluna começa nula: nenhuma UF
-- histórica é inventada.
alter table public.profissionais
  add column conselho_uf text check (conselho_uf is null or conselho_uf ~ '^[A-Z]{2}$');
alter table public.profissionais drop constraint profissionais_conselho_unico;
create unique index profissionais_registro_unico on public.profissionais(
  upper(btrim(conselho_classe)),upper(btrim(registro_conselho)),coalesce(conselho_uf,'')
) where conselho_classe is not null;

create type public.tipo_membro_equipe as enum ('profissional_saude','administrativo','apoio','outro');

create table public.equipe_membros (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid unique references public.profissionais(id) on delete restrict,
  nome_completo text not null check (length(btrim(nome_completo)) >= 3),
  cargo text not null check (length(btrim(cargo)) >= 2),
  tipo public.tipo_membro_equipe not null,
  profissao text,
  cpf_encrypted bytea,
  cpf_hash text unique,
  telefone text,
  email_contato text,
  conselho_classe text,
  registro_conselho text,
  conselho_uf text check (conselho_uf is null or conselho_uf ~ '^[A-Z]{2}$'),
  especialidade_id uuid references public.especialidades(id) on delete restrict,
  usuario_id uuid references public.usuarios(id) on delete set null,
  ativo boolean not null default true,
  revisao integer not null default 1 check (revisao > 0),
  created_by uuid default auth.uid() references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipe_cpf_par check ((cpf_encrypted is null)=(cpf_hash is null)),
  constraint equipe_profissao_coerente check (tipo='profissional_saude' or profissao is null),
  constraint equipe_conselho_coerente check (
    (conselho_classe is null and registro_conselho is null and conselho_uf is null)
    or (conselho_classe is not null and registro_conselho is not null)
  )
);
create index equipe_email_contato_idx on public.equipe_membros(lower(email_contato))
  where email_contato is not null;
create unique index equipe_registro_unico on public.equipe_membros(
  upper(btrim(conselho_classe)),upper(btrim(registro_conselho)),coalesce(conselho_uf,'')
) where conselho_classe is not null;

create table public.equipe_membros_clinicas (
  membro_id uuid not null references public.equipe_membros(id) on delete restrict,
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  ativo boolean not null default true,
  created_by uuid default auth.uid() references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(membro_id,clinica_id)
);

create table public.equipe_idempotencia (
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  chave uuid not null,
  payload_hash text not null,
  membro_id uuid references public.equipe_membros(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(usuario_id,chave)
);

insert into public.equipe_membros(
  profissional_id,nome_completo,cargo,tipo,profissao,cpf_encrypted,cpf_hash,
  conselho_classe,registro_conselho,conselho_uf,especialidade_id,usuario_id,ativo,created_by,created_at,updated_at
)
select p.id,btrim(p.nome_completo),
  case when upper(coalesce(p.conselho_classe,'')) like 'CRM%' then 'Médico(a)' else 'Profissional de saúde' end,
  'profissional_saude',case when upper(coalesce(p.conselho_classe,'')) like 'CRM%' then 'Medicina' else null end,
  p.cpf_encrypted,p.cpf_hash,nullif(upper(btrim(p.conselho_classe)),''),
  nullif(upper(btrim(p.registro_conselho)),''),p.conselho_uf,p.especialidade_principal_id,p.usuario_id,
  p.ativo,p.created_by,p.created_at,p.updated_at
from public.profissionais p on conflict(profissional_id) do nothing;

insert into public.equipe_membros_clinicas(membro_id,clinica_id,ativo,created_by,created_at,updated_at)
select em.id,pc.clinica_id,pc.ativo,coalesce(pc.created_by,em.created_by),pc.created_at,pc.updated_at
from public.equipe_membros em join public.profissionais_clinicas pc on pc.profissional_id=em.profissional_id
on conflict(membro_id,clinica_id) do nothing;

create or replace function public.equipe_validar_registro(
  p_membro_id uuid,p_conselho text,p_registro text,p_uf text
) returns void language plpgsql security definer set search_path='' as $$
begin
  if (p_conselho is null)<>(p_registro is null) then
    raise exception 'Conselho e registro devem ser informados juntos.' using errcode='22023';
  end if;
  if p_conselho is null then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(upper(btrim(p_conselho))||'|'||upper(btrim(p_registro)),0)
  );
  if exists(select 1 from public.equipe_membros m
    where m.id is distinct from p_membro_id
      and upper(btrim(m.conselho_classe))=upper(btrim(p_conselho))
      and upper(btrim(m.registro_conselho))=upper(btrim(p_registro))
      and (m.conselho_uf is null or p_uf is null or m.conselho_uf=upper(p_uf))) then
    raise exception 'Já existe cadastro com este conselho e registro; revise a UF do legado.' using errcode='23505';
  end if;
end $$;

create or replace function public.equipe_sincronizar_profissional()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_membro uuid;
  v_uf_validacao text;
begin
  if current_setting('app.equipe_origem',true)='equipe' then return new; end if;
  select id into v_membro
  from public.equipe_membros where profissional_id=new.id;
  -- NEW contém o valor efetivamente persistido pelo UPDATE/INSERT. Isso
  -- preserva uma UF quando a rota omite a coluna e valida a remoção quando
  -- a rota a define explicitamente como NULL; nunca validamos a projeção
  -- antiga e gravamos uma UF diferente.
  v_uf_validacao:=nullif(upper(btrim(new.conselho_uf)),'');
  perform public.equipe_validar_registro(
    v_membro,nullif(upper(btrim(new.conselho_classe)),''),
    nullif(upper(btrim(new.registro_conselho)),''),v_uf_validacao
  );
  insert into public.equipe_membros(
    profissional_id,nome_completo,cargo,tipo,profissao,cpf_encrypted,cpf_hash,
    conselho_classe,registro_conselho,conselho_uf,especialidade_id,usuario_id,ativo,created_by,created_at,updated_at
  ) values(
    new.id,btrim(new.nome_completo),
    case when upper(coalesce(new.conselho_classe,'')) like 'CRM%' then 'Médico(a)' else 'Profissional de saúde' end,
    'profissional_saude',case when upper(coalesce(new.conselho_classe,'')) like 'CRM%' then 'Medicina' else null end,
    new.cpf_encrypted,new.cpf_hash,nullif(upper(btrim(new.conselho_classe)),''),
    nullif(upper(btrim(new.registro_conselho)),''),v_uf_validacao,new.especialidade_principal_id,new.usuario_id,new.ativo,
    new.created_by,new.created_at,new.updated_at
  ) on conflict(profissional_id) do update set
    nome_completo=excluded.nome_completo,cpf_encrypted=excluded.cpf_encrypted,cpf_hash=excluded.cpf_hash,
    conselho_classe=excluded.conselho_classe,registro_conselho=excluded.registro_conselho,
    conselho_uf=excluded.conselho_uf,
    especialidade_id=excluded.especialidade_id,usuario_id=excluded.usuario_id,ativo=excluded.ativo,
    revisao=public.equipe_membros.revisao+1,updated_at=now()
  returning id into v_membro;
  return new;
end $$;

create trigger equipe_profissional_sync
after insert or update of nome_completo,cpf_encrypted,cpf_hash,conselho_classe,registro_conselho,conselho_uf,
  especialidade_principal_id,usuario_id,ativo on public.profissionais
for each row execute function public.equipe_sincronizar_profissional();

create or replace function public.equipe_sincronizar_vinculo_profissional()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_membro uuid;
begin
  if current_setting('app.equipe_origem',true)='equipe' then return new; end if;
  select id into v_membro from public.equipe_membros where profissional_id=new.profissional_id;
  if v_membro is null then raise exception 'Profissional sem projeção na central de Equipe.'; end if;
  insert into public.equipe_membros_clinicas(membro_id,clinica_id,ativo,created_by,created_at,updated_at)
  values(v_membro,new.clinica_id,new.ativo,new.created_by,new.created_at,new.updated_at)
  on conflict(membro_id,clinica_id) do update set ativo=excluded.ativo,updated_at=excluded.updated_at;
  return new;
end $$;

create trigger equipe_profissional_clinica_sync
after insert or update of ativo on public.profissionais_clinicas
for each row execute function public.equipe_sincronizar_vinculo_profissional();

create or replace function public.equipe_pode_editar_profissional_global(p_profissional_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
    and exists(select 1 from public.profissionais_clinicas pc where pc.profissional_id=p_profissional_id)
    and not exists(select 1 from public.profissionais_clinicas pc
      where pc.profissional_id=p_profissional_id and not public.eh_proprietaria(pc.clinica_id));
$$;

-- Escritas diretas legadas em identidade profissional são globais: o ator precisa
-- administrar todas as clínicas já vinculadas, não somente uma delas.
drop policy if exists profissionais_update on public.profissionais;
create policy profissionais_update on public.profissionais for update to authenticated
using (public.equipe_pode_editar_profissional_global(id))
with check (public.equipe_pode_editar_profissional_global(id));

alter table public.equipe_membros enable row level security;
alter table public.equipe_membros_clinicas enable row level security;
alter table public.equipe_idempotencia enable row level security;
create policy equipe_membros_select on public.equipe_membros for select to authenticated using(
  exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
  and exists(select 1 from public.equipe_membros_clinicas ec where ec.membro_id=id and ec.ativo
    and public.eh_proprietaria(ec.clinica_id))
);
create policy equipe_clinicas_select on public.equipe_membros_clinicas for select to authenticated using(
  exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
  and public.eh_proprietaria(clinica_id)
);

create or replace function public.equipe_listar(p_clinica_contexto_id uuid)
returns setof jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
     or not public.eh_proprietaria(p_clinica_contexto_id) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  return query select jsonb_build_object(
    'id',m.id,'nome_completo',m.nome_completo,'cargo',m.cargo,'tipo',m.tipo,
    'profissao',m.profissao,'telefone',m.telefone,'email_contato',m.email_contato,
    'conselho_classe',m.conselho_classe,'registro_conselho',m.registro_conselho,'conselho_uf',m.conselho_uf,
    'especialidade_id',m.especialidade_id,'especialidade_nome',e.nome,
    'acesso_status',case when m.usuario_id is null then 'sem_conta'
      when not exists(select 1 from public.usuarios u where u.id=m.usuario_id and u.ativo) then 'conta_inativa'
      when exists(select 1 from public.usuarios_clinicas uc where uc.usuario_id=m.usuario_id
        and uc.clinica_id=p_clinica_contexto_id and uc.ativo) then 'ativo_na_unidade'
      else 'sem_acesso_na_unidade' end,
    'revisao',m.revisao,'clinicas',coalesce((select jsonb_agg(
      jsonb_build_object('id',c.id,'nome',c.nome) order by c.nome)
      from public.equipe_membros_clinicas ec join public.clinicas c on c.id=ec.clinica_id
      where ec.membro_id=m.id and ec.ativo and public.eh_proprietaria(c.id)),'[]'::jsonb)
  ) from public.equipe_membros m left join public.especialidades e on e.id=m.especialidade_id
  where m.ativo and exists(select 1 from public.equipe_membros_clinicas ec
    where ec.membro_id=m.id and ec.clinica_id=p_clinica_contexto_id and ec.ativo)
  order by m.nome_completo;
end $$;

create or replace function public.equipe_detalhar(p_membro_id uuid,p_clinica_contexto_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r jsonb; v_cpf text;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
     or not public.eh_proprietaria(p_clinica_contexto_id)
     or not exists(select 1 from public.equipe_membros_clinicas
       where membro_id=p_membro_id and clinica_id=p_clinica_contexto_id and ativo) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  select case when m.cpf_encrypted is null then null else public.cpf_decrypt(m.cpf_encrypted) end
  into v_cpf from public.equipe_membros m where m.id=p_membro_id;
  select x||jsonb_build_object('cpf',v_cpf,'cpf_situacao',case when v_cpf is null then 'ausente' else 'informado' end)
  into r from public.equipe_listar(p_clinica_contexto_id) x where x->>'id'=p_membro_id::text;
  return r;
end $$;

create or replace function public.equipe_salvar(
  p_membro_id uuid,p_clinica_contexto_id uuid,p_revisao_esperada integer,p_dados jsonb,p_chave_idempotencia uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_id uuid:=p_membro_id; v_prof uuid; v_cpf text; v_modo text; v_clinica uuid;
  v_clinicas uuid[]:=array[]::uuid[]; v_ant public.equipe_membros%rowtype;
  v_nome text; v_cargo text; v_tipo text; v_profissao text; v_telefone text; v_email text;
  v_conselho text; v_registro text; v_uf text; v_especialidade uuid; v_hash text;
  v_campos text[]:=array[]::text[]; v_adicionadas uuid[]:=array[]::uuid[];
  v_repeticao public.equipe_idempotencia%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.usuarios u where u.id=auth.uid() and u.ativo)
     or not public.eh_proprietaria(p_clinica_contexto_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_dados is null or jsonb_typeof(p_dados)<>'object' then raise exception 'O formulário enviado é inválido.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_dados) k where k not in(
    'nome_completo','cargo','tipo','profissao','cpf_modo','cpf','telefone','email_contato',
    'conselho_classe','registro_conselho','conselho_uf','especialidade_id','clinicas_ids'))
    or not(p_dados ?& array['nome_completo','cargo','tipo','profissao','cpf_modo','cpf','telefone',
      'email_contato','conselho_classe','registro_conselho','conselho_uf','especialidade_id','clinicas_ids']) then
    raise exception 'O formulário contém campos inesperados ou ausentes.' using errcode='22023';
  end if;
  if jsonb_typeof(p_dados->'clinicas_ids')<>'array'
     or exists(select 1 from jsonb_array_elements(p_dados->'clinicas_ids') x where jsonb_typeof(x)<>'string') then
    raise exception 'A lista de clínicas é inválida.' using errcode='22023';
  end if;
  if jsonb_typeof(p_dados->'nome_completo') is distinct from 'string'
     or jsonb_typeof(p_dados->'cargo') is distinct from 'string'
     or jsonb_typeof(p_dados->'tipo') is distinct from 'string'
     or jsonb_typeof(p_dados->'cpf_modo') is distinct from 'string' then
    raise exception 'Nome, cargo, tipo e modo de CPF devem ser textos não nulos.' using errcode='22023';
  end if;
  if exists(
    select 1 from unnest(array[
      'profissao','cpf','telefone','email_contato','conselho_classe',
      'registro_conselho','conselho_uf','especialidade_id'
    ]) campo
    where jsonb_typeof(p_dados->campo) not in ('string','null')
  ) then
    raise exception 'Campos opcionais devem ser texto ou nulos.' using errcode='22023';
  end if;
  v_nome:=nullif(btrim(p_dados->>'nome_completo'),''); v_cargo:=nullif(btrim(p_dados->>'cargo'),'');
  v_tipo:=p_dados->>'tipo'; v_profissao:=nullif(btrim(p_dados->>'profissao'),''); v_modo:=p_dados->>'cpf_modo';
  v_cpf:=regexp_replace(coalesce(p_dados->>'cpf',''),'[^0-9]','','g'); v_telefone:=nullif(btrim(p_dados->>'telefone'),'');
  v_email:=nullif(lower(btrim(p_dados->>'email_contato')),''); v_conselho:=nullif(upper(btrim(p_dados->>'conselho_classe')),'');
  v_registro:=nullif(upper(btrim(p_dados->>'registro_conselho')),''); v_uf:=nullif(upper(btrim(p_dados->>'conselho_uf')),'');
  begin v_especialidade:=nullif(p_dados->>'especialidade_id','')::uuid;
  exception when invalid_text_representation then raise exception 'Especialidade inválida.' using errcode='22023'; end;
  if v_nome is null or length(v_nome)<3 or v_cargo is null or length(v_cargo)<2
     or v_tipo is null or v_tipo not in('profissional_saude','administrativo','apoio','outro') then
    raise exception 'Dados cadastrais obrigatórios inválidos.' using errcode='22023'; end if;
  if v_tipo='profissional_saude' and v_profissao is null then raise exception 'Profissão obrigatória para profissional de saúde.' using errcode='22023'; end if;
  if v_tipo<>'profissional_saude' and (v_profissao is not null or v_conselho is not null or v_registro is not null or v_uf is not null or v_especialidade is not null) then
    raise exception 'Campos profissionais não são aceitos para esta função.' using errcode='22023'; end if;
  if (v_conselho is null)<>(v_registro is null) or (v_uf is not null and v_conselho is null)
     or (v_uf is not null and v_uf!~'^[A-Z]{2}$') then raise exception 'Conselho, registro e UF estão inconsistentes.' using errcode='22023'; end if;
  if v_email is not null and v_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail de contato inválido.' using errcode='22023'; end if;
  if v_modo is null or v_modo not in('preservar','substituir','remover') or (v_modo='preservar' and v_cpf<>'')
     or (v_modo='remover' and v_cpf<>'') or (v_modo='substituir' and(length(v_cpf)<>11 or not public.pacientes_cpf_valido(v_cpf))) then
    raise exception 'Operação de CPF inválida.' using errcode='22023'; end if;
  if p_membro_id is null and v_modo='preservar' then raise exception 'Cadastro novo deve informar ou remover explicitamente o CPF.' using errcode='22023'; end if;
  begin select coalesce(array_agg(distinct x::uuid),array[]::uuid[]) into v_clinicas from jsonb_array_elements_text(p_dados->'clinicas_ids') x;
  exception when invalid_text_representation then raise exception 'Uma das clínicas é inválida.' using errcode='22023'; end;
  if cardinality(v_clinicas)=0 or cardinality(v_clinicas)<>jsonb_array_length(p_dados->'clinicas_ids') then
    raise exception 'Selecione clínicas válidas, sem repetição.' using errcode='22023'; end if;
  foreach v_clinica in array v_clinicas loop
    if not exists(select 1 from public.clinicas c where c.id=v_clinica) or not public.eh_proprietaria(v_clinica) then
      raise exception 'Sem autorização para uma das clínicas.' using errcode='42501'; end if;
  end loop;

  if p_membro_id is null then
    if p_chave_idempotencia is null then raise exception 'Identificador da tentativa é obrigatório.' using errcode='22023'; end if;
    v_hash:=md5(p_dados::text||'|'||p_clinica_contexto_id::text);
    insert into public.equipe_idempotencia(usuario_id,chave,payload_hash) values(auth.uid(),p_chave_idempotencia,v_hash) on conflict do nothing;
    select * into v_repeticao from public.equipe_idempotencia where usuario_id=auth.uid() and chave=p_chave_idempotencia for update;
    if v_repeticao.payload_hash<>v_hash then raise exception 'Esta tentativa já foi usada com dados diferentes.' using errcode='22023'; end if;
    if v_repeticao.membro_id is not null then return v_repeticao.membro_id; end if;
  else
    -- Ordem única para evitar ciclo com a escrita legada: profissional primeiro,
    -- projeção de Equipe depois. O trigger legado segue a mesma ordem.
    select profissional_id into v_prof from public.equipe_membros where id=p_membro_id;
    if v_prof is not null then
      perform 1 from public.profissionais where id=v_prof for update;
    end if;
    select * into v_ant from public.equipe_membros where id=p_membro_id for update;
    if not found or not exists(select 1 from public.equipe_membros_clinicas where membro_id=v_id and clinica_id=p_clinica_contexto_id and ativo) then
      raise exception 'Cadastro não encontrado.' using errcode='P0002'; end if;
    if exists(select 1 from(
      select ec.clinica_id from public.equipe_membros_clinicas ec where ec.membro_id=v_id
      union select pc.clinica_id from public.profissionais_clinicas pc where pc.profissional_id=v_ant.profissional_id
    ) vinculos where not public.eh_proprietaria(vinculos.clinica_id)) then
      raise exception 'A alteração global requer autorização em todas as unidades vinculadas.' using errcode='42501'; end if;
    if p_revisao_esperada is null or v_ant.revisao<>p_revisao_esperada then raise exception 'Cadastro alterado por outra sessão; recarregue antes de salvar.' using errcode='40001'; end if;
    if (v_ant.profissional_id is null)<>(v_tipo<>'profissional_saude') or v_ant.tipo::text<>v_tipo then raise exception 'A alteração do tipo funcional exige fluxo específico.' using errcode='22023'; end if;
    if v_conselho is not null and v_uf is null and(v_ant.conselho_classe is distinct from v_conselho or v_ant.registro_conselho is distinct from v_registro) then
      raise exception 'Informe a UF ao alterar um registro profissional.' using errcode='22023'; end if;
  end if;
  perform public.equipe_validar_registro(v_id,v_conselho,v_registro,v_uf);
  perform set_config('app.equipe_origem','equipe',true);

  if p_membro_id is null then
    if v_tipo='profissional_saude' then
      insert into public.profissionais(nome_completo,cpf_encrypted,cpf_hash,conselho_classe,registro_conselho,conselho_uf,especialidade_principal_id,created_by)
      values(v_nome,case when v_modo='substituir' then public.cpf_encrypt(v_cpf) end,
        case when v_modo='substituir' then public.cpf_hash(v_cpf) end,v_conselho,v_registro,v_uf,v_especialidade,auth.uid()) returning id into v_prof;
    end if;
    insert into public.equipe_membros(profissional_id,nome_completo,cargo,tipo,profissao,cpf_encrypted,cpf_hash,telefone,email_contato,
      conselho_classe,registro_conselho,conselho_uf,especialidade_id,created_by)
    values(v_prof,v_nome,v_cargo,v_tipo::public.tipo_membro_equipe,v_profissao,
      case when v_modo='substituir' then public.cpf_encrypt(v_cpf) end,case when v_modo='substituir' then public.cpf_hash(v_cpf) end,
      v_telefone,v_email,v_conselho,v_registro,v_uf,v_especialidade,auth.uid()) returning id into v_id;
    v_campos:=array['cadastro','clinicas']; if v_modo='substituir' then v_campos:=array_append(v_campos,'cpf'); end if;
  else
    if v_ant.nome_completo is distinct from v_nome then v_campos:=array_append(v_campos,'nome'); end if;
    if v_ant.cargo is distinct from v_cargo or v_ant.profissao is distinct from v_profissao then v_campos:=array_append(v_campos,'funcao'); end if;
    if v_ant.telefone is distinct from v_telefone or v_ant.email_contato is distinct from v_email then v_campos:=array_append(v_campos,'contato'); end if;
    if v_ant.conselho_classe is distinct from v_conselho or v_ant.registro_conselho is distinct from v_registro
       or v_ant.conselho_uf is distinct from v_uf or v_ant.especialidade_id is distinct from v_especialidade then
      v_campos:=array_append(v_campos,'registro_profissional'); end if;
    if (v_modo='substituir' and v_ant.cpf_hash is distinct from public.cpf_hash(v_cpf))
       or (v_modo='remover' and v_ant.cpf_hash is not null) then
      v_campos:=array_append(v_campos,'cpf');
    end if;
    v_prof:=v_ant.profissional_id;
  end if;
  foreach v_clinica in array v_clinicas loop
    if exists(select 1 from public.equipe_membros_clinicas where membro_id=v_id and clinica_id=v_clinica and not ativo) then
      raise exception 'Há vínculo inativo; use o fluxo explícito de reativação.' using errcode='22023'; end if;
    if not exists(select 1 from public.equipe_membros_clinicas where membro_id=v_id and clinica_id=v_clinica) then
      insert into public.equipe_membros_clinicas(membro_id,clinica_id,created_by) values(v_id,v_clinica,auth.uid());
      v_adicionadas:=array_append(v_adicionadas,v_clinica);
    end if;
    if v_prof is not null then
      if exists(select 1 from public.profissionais_clinicas where profissional_id=v_prof and clinica_id=v_clinica and not ativo) then
        raise exception 'Há vínculo profissional inativo; use o fluxo explícito de reativação.' using errcode='22023'; end if;
      insert into public.profissionais_clinicas(profissional_id,clinica_id,created_by)
      select v_prof,v_clinica,auth.uid() where not exists(select 1 from public.profissionais_clinicas where profissional_id=v_prof and clinica_id=v_clinica);
    end if;
  end loop;
  if cardinality(v_adicionadas)>0 and not('clinicas'=any(v_campos)) then v_campos:=array_append(v_campos,'clinicas'); end if;
  if p_membro_id is not null and cardinality(v_campos)>0 then
    update public.equipe_membros set nome_completo=v_nome,cargo=v_cargo,profissao=v_profissao,telefone=v_telefone,email_contato=v_email,
      conselho_classe=v_conselho,registro_conselho=v_registro,conselho_uf=v_uf,especialidade_id=v_especialidade,
      cpf_encrypted=case when v_modo='substituir' and cpf_hash is distinct from public.cpf_hash(v_cpf) then public.cpf_encrypt(v_cpf)
        when v_modo='remover' then null else cpf_encrypted end,
      cpf_hash=case when v_modo='substituir' then public.cpf_hash(v_cpf) when v_modo='remover' then null else cpf_hash end,
      revisao=revisao+1,updated_at=now() where id=v_id;
    if v_prof is not null then
      update public.profissionais set nome_completo=v_nome,conselho_classe=v_conselho,registro_conselho=v_registro,
        conselho_uf=v_uf,especialidade_principal_id=v_especialidade,
        cpf_encrypted=case when v_modo='substituir' and cpf_hash is distinct from public.cpf_hash(v_cpf) then public.cpf_encrypt(v_cpf)
          when v_modo='remover' then null else cpf_encrypted end,
        cpf_hash=case when v_modo='substituir' then public.cpf_hash(v_cpf) when v_modo='remover' then null else cpf_hash end,
        updated_at=now() where id=v_prof;
    end if;
  end if;
  if p_membro_id is null then update public.equipe_idempotencia set membro_id=v_id where usuario_id=auth.uid() and chave=p_chave_idempotencia; end if;
  -- Não deixe o marcador interno vazar para outras operações na mesma transação.
  perform set_config('app.equipe_origem','',true);
  if cardinality(v_campos)>0 then
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois)
    values(p_clinica_contexto_id,auth.uid(),case when p_membro_id is null then 'INSERT' else 'UPDATE' end::public.acao_auditoria,
      'equipe_membros',v_id::text,jsonb_build_object('escopo','global','campos_alterados',to_jsonb(v_campos),'clinicas_adicionadas',to_jsonb(v_adicionadas)));
  end if;
  return v_id;
end $$;

revoke all on function public.equipe_validar_registro(uuid,text,text,text),
  public.equipe_sincronizar_profissional(),public.equipe_sincronizar_vinculo_profissional(),
  public.equipe_pode_editar_profissional_global(uuid),
  public.equipe_listar(uuid),public.equipe_detalhar(uuid,uuid),
  public.equipe_salvar(uuid,uuid,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.equipe_listar(uuid),public.equipe_detalhar(uuid,uuid),
  public.equipe_salvar(uuid,uuid,integer,jsonb,uuid),
  public.equipe_pode_editar_profissional_global(uuid) to authenticated;
revoke all on public.equipe_membros,public.equipe_membros_clinicas,public.equipe_idempotencia from public,anon,authenticated;

commit;
```

