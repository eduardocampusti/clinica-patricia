# Equipe — correções da revisão independente e homologação isolada

**Data:** 28/09/2026  
**Migration:** `supabase/migrations/20260928153000_equipe_cadastro_edicao.sql`  
**SHA-256 revisado:** `0827724AD4DC389ED2C568BD1077BE23DAECC7966B74EE953D6FE81A031A6C66`  
**Situação no Supabase principal:** **não aplicada**. Nenhuma escrita foi feita no principal nesta etapa.

## 1. Diagnóstico e resultado

A revisão independente foi conferida contra a migration e a aplicação atuais. Os achados A1–A11 eram procedentes. O A12 também é uma lacuna real, mas não pode ser corrigido com importação automática segura: os usuários antigos de recepção/administração não possuem um identificador confiável que prove que cada conta corresponde a um funcionário. A migration foi corrigida sem classificar pessoas por nome ou papel e essa reconciliação permanece explícita.

A versão revisada foi aplicada com sucesso em PostgreSQL 17.11 portátil, restaurado do backup local `clinica-patricia-app.dump`, em instância exclusiva nas portas `127.0.0.1:55440/55441`. Esse ambiente não era o Supabase principal, não usou Docker e foi encerrado após os testes.

## 2. Achados A1–A12

| Achado | Conclusão | Correção/evidência |
|---|---|---|
| A1 | Confirmado | Lista, detalhe e gravação agora exigem `auth.uid()`, usuário globalmente ativo e `eh_proprietaria(clinica)`. Recepção autenticada chamando a RPC diretamente foi bloqueada. |
| A2 | Confirmado | Na edição, a função consulta todos os vínculos de Equipe e Profissionais, inclusive inativos, e exige autoridade em todas as unidades antes de alterar dados globais. Proprietária fictícia somente de Brotas foi bloqueada ao tentar alterar pessoa vinculada também a Ipupiara. |
| A3 | Confirmado | A importação copia `profissionais.ativo`; a comparação pós-migration não encontrou divergência de estado global. |
| A4 | Confirmado | UPSERT reativador foi removido. Vínculo inativo provoca erro controlado e permaneceu inativo após a tentativa. Vínculos omitidos não são removidos. |
| A5 | Confirmado | Conselho/registro/UF são normalizados; índice usa UF vazia de forma determinística; validação serializada com advisory lock impede colisão com legado sem UF e permite números iguais quando ambas as UFs conhecidas são diferentes. Legado sem UF não recebe UF inventada. |
| A6 | Confirmado | Criação exige UUID da tentativa, persistido por ator com hash do payload. Repetição devolveu o mesmo ID; mesma chave com payload diferente foi rejeitada. O frontend mantém a chave no formulário. |
| A7 | Confirmado | Modos aceitos são somente `preservar`, `substituir` e `remover`; combinações contraditórias falham. Substituir por vazio foi rejeitado. |
| A8 | Confirmado | As rotas do repositório foram inventariadas. Agenda e Financeiro somente leem identidade. A edição antiga altera valores financeiros; a criação/vinculação antiga de Profissionais agora é sincronizada por triggers não recursivos, com marcador transacional restaurado antes do retorno. O ensaio pela RPC antiga apareceu na central de Equipe. |
| A9 | Confirmado | `possui_acesso` foi substituído por estado por unidade: ativo, conta inativa, sem acesso na unidade ou sem conta. No fallback legado a UI informa apenas “conta vinculada (estado não confirmado)”. |
| A10 | Confirmado | Auditoria registra somente grupos realmente alterados e marcador de CPF sem seu conteúdo. Edição apenas de telefone registrou somente `contato`; busca não encontrou CPF, ciphertext ou hash no JSON auditado. |
| A11 | Confirmado | Payload deve ser objeto completo, com allowlist, todas as chaves, array de UUIDs sem repetição, tipos/formatos e combinações coerentes. O preflight verifica relações, funções e colunas efetivamente usadas. |
| A12 | Confirmado como limitação | Profissionais existentes são importados. Contas antigas de recepção/administração não são convertidas automaticamente, pois papel/vínculo de login não prova cadastro trabalhista. Devem ser reconciliadas por fluxo futuro explícito, sem comparação por nome. |

## 3. Regra de CPF

CPF de equipe permanece **opcional** nesta etapa. Essa regra não veio de requisito aprovado: foi a menor decisão provisória da implementação para não bloquear funcionários sem CPF e não inventar obrigação funcional. Quando informado, o CPF precisa ser válido e é protegido com os helpers existentes. A migration não altera pacientes nem sua regra de CPF opcional.

Impacto da decisão pendente: se a clínica aprovar CPF obrigatório para toda a equipe, será necessário definir tratamento dos cadastros legados sem CPF antes de adicionar qualquer restrição. A alternativa mínima atual é manter opcional, validar quando preenchido e impedir duplicidade por hash.

## 4. Operações, segurança e compatibilidade

- Funcionário administrativo ou de apoio é salvo apenas em `equipe_membros`; não cria profissional de saúde nem usuário Auth fictício.
- Profissional de saúde recebe registro em `profissionais`, preservando Agenda e Financeiro.
- A mesma pessoa pode ter vínculos em Brotas e Ipupiara sem duplicação.
- A edição comum somente adiciona vínculo novo; não remove nem reativa vínculo existente.
- Tabelas novas não concedem acesso direto a `anon` ou `authenticated`; clientes usam somente as três RPCs públicas.
- Todas as funções `SECURITY DEFINER` têm `search_path=''`, nomes qualificados e grants explícitos. Helpers e triggers não são executáveis por clientes.
- A autorização é revalidada por usuário, ação, alvo e clínica dentro das RPCs; esconder botões não é usado como controle.
- CPF, hash e ciphertext não são gravados na auditoria nem impressos pelos testes.
- A idempotência impede gravação parcial/repetida na mesma transação.
- Registro profissional legado sem UF não é fundido automaticamente nem recebe BA por suposição.
- A rota antiga continua compatível por sincronização transacional; alterações financeiras continuam na tabela `profissionais`.

## 5. Testes realmente executados

### PostgreSQL isolado

Executados em PostgreSQL 17.11 real, restaurado de backup da aplicação:

- restore: 37 tabelas, 80 funções, 268 constraints, 10 enums, 63 policies e 36 tabelas com RLS;
- aplicação da dependência `20260924120000_pacientes_cpf_pendente_rpc.sql`;
- aplicação integral da migration revisada: sucesso;
- criação de recepcionista sem CPF e sem Auth: sucesso;
- criação de apoio sem login, em Brotas e Ipupiara: sucesso;
- criação de médica com CPF protegido e registro/UF: sucesso;
- repetição da mesma criação: mesmo ID, sem duplicata;
- chave repetida com payload diferente: bloqueada;
- substituir CPF por vazio: bloqueado;
- edição apenas de contato: auditoria registrou somente `contato`;
- rota antiga `cadastrar_profissional`: projeção e vínculo apareceram na central;
- duplicidade ambígua contra registro legado sem UF: bloqueada;
- vínculo inativo: não reativado;
- proprietária restrita a uma clínica: edição global bloqueada;
- recepção autenticada chamando `equipe_listar`: bloqueada;
- `anon`: sem EXECUTE nas RPCs;
- `authenticated`: sem grants diretos nas tabelas;
- persistência em nova conexão: confirmada;
- dados fictícios: removidos; ficaram apenas quatro eventos sintéticos append-only, sem segredo, dentro do cluster descartável;
- catálogo: três tabelas e seis funções de Equipe confirmadas em `information_schema`/`pg_proc`;
- grants e `search_path`: conferidos por catálogo;
- instâncias locais: encerradas.

O script obrigatório `supabase/tools/verificar-integridade.sql` foi executado. Ele confirmou parte do inventário, mas parou em `storage.buckets`, inexistente no backup restrito aos schemas `public`, `private` e `supabase_migrations`. Portanto, não se afirma homologação completa de Storage.

### Aplicação

- `src/lib/equipe.test.ts`: 5/5 testes aprovados;
- `npm run lint`: aprovado, com um aviso histórico de Fast Refresh em `ThemeProvider.tsx`;
- `npm run build`: aprovado;
- servidor Vite: mantido disponível em `http://127.0.0.1:5173/acesso/brotas`.

## 6. Limitações da homologação

O banco era PostgreSQL real e as permissões foram exercidas com `SET ROLE authenticated` e identidades distintas. Entretanto:

- Auth foi representado pelo helper local `auth.uid()` alimentado por claim de teste;
- Vault foi representado por chaves fictícias em tabela local com `pgcrypto` real;
- PostgREST, serviço Auth e Storage não estavam em execução;
- o backup-base é de 23/09 e não contém todas as migrations posteriores;
- a migration não foi registrada em `supabase_migrations`, pois foi aplicada diretamente por `psql` somente para homologação;
- nenhum teste de escrita foi executado no Supabase principal.

Assim, a camada PostgreSQL/RPC/RLS foi homologada; a integração completa Supabase deve ser repetida em staging ou na janela controlada de aplicação antes de liberar usuários.

## 7. Dependências, aplicação e recuperação

### Objetos criados/alterados

- enum `tipo_membro_equipe`;
- tabelas `equipe_membros`, `equipe_membros_clinicas`, `equipe_idempotencia`;
- índices de e-mail e registro;
- RPCs `equipe_listar`, `equipe_detalhar`, `equipe_salvar`;
- helpers/triggers de validação e sincronização com Profissionais;
- RLS, policies, revokes e grants;
- importação referencial dos profissionais/vínculos existentes.

### Ordem de aplicação

1. colocar a interface em janela controlada sem gravações administrativas concorrentes;
2. executar backup lógico e testar restore;
3. confirmar, somente por leitura, PostgreSQL 17 configurado, objetos/helpers/colunas do preflight, duplicidades de CPF e conselho e estado dos vínculos;
4. confirmar que a versão `20260928153000` ainda não está aplicada;
5. aplicar migrations anteriores pendentes na ordem, especialmente o helper de CPF;
6. aplicar esta migration uma única vez;
7. confirmar tabelas/colunas por `information_schema`, funções/grants/`search_path` por `pg_proc`;
8. executar o verificador de integridade completo no ambiente Supabase;
9. repetir a suíte SQL e smoke pela aplicação com proprietária, recepção e médico;
10. liberar a interface somente quando `equipe_listar`, `equipe_detalhar` e a assinatura de cinco parâmetros de `equipe_salvar` estiverem disponíveis e os negativos passarem.

### Impacto e recuperação

A migration é aditiva e copia referências existentes, sem remover profissionais, vínculos, Agenda ou Financeiro. Antes do commit, qualquer erro reverte toda a transação. Depois do commit, se ainda não houver dados novos, a recuperação pode remover triggers, funções, policies, tabelas e enum em ordem inversa. Se já houver cadastros novos, não se deve apagar: restaurar o backup em ambiente separado, interromper gravações e preparar migration corretiva/extração dos novos dados.

## 8. Situação real da interface

No código, cadastro e edição estão implementados. Na homologação PostgreSQL, as gravações foram validadas. No ambiente aberto ao usuário, que usa o Supabase principal, as gravações **continuam bloqueadas**, porque a migration não foi aplicada ali. A aplicação identifica a ausência das RPCs pelos códigos `PGRST202`/`42883`, ativa o modo de compatibilidade, lista profissionais legados e mostra “Atualização do banco pendente”.

Acesso para conferência: `http://127.0.0.1:5173/acesso/brotas` → entrar → **Cadastros** → **Equipe & acessos**. Ipupiara: `http://127.0.0.1:5173/acesso/ipupiara`.

## 9. Próxima ação estrita

Não aplicar automaticamente. A próxima ação é revisar este relatório e autorizar uma janela específica para preflight somente de leitura, backup/restore e aplicação controlada. A gravação só pode ser liberada após confirmação de objetos e testes negativos no ambiente Supabase que atenderá a aplicação.

## 10. TypeSafe e fontes técnicas

A skill TypeSafe foi lida e avaliada. Ela não se aplica: autorização, CPF, idempotência e integridade são regras determinísticas e devem permanecer em código/SQL, sem IA e sem uso de `TYPESAFE_API_KEY`.

A skill Supabase solicitada não estava instalada/disponível nesta sessão. Foram usadas as orientações oficiais do Supabase sobre migrations, RLS, funções `SECURITY DEFINER`, `search_path` e grants, além da documentação PostgreSQL 17 sobre constraints.

## 11. SQL integral revisado

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
  conselho_classe,registro_conselho,especialidade_id,usuario_id,ativo,created_by,created_at,updated_at
)
select p.id,btrim(p.nome_completo),
  case when upper(coalesce(p.conselho_classe,'')) like 'CRM%' then 'Médico(a)' else 'Profissional de saúde' end,
  'profissional_saude',case when upper(coalesce(p.conselho_classe,'')) like 'CRM%' then 'Medicina' else null end,
  p.cpf_encrypted,p.cpf_hash,nullif(upper(btrim(p.conselho_classe)),''),
  nullif(upper(btrim(p.registro_conselho)),''),p.especialidade_principal_id,p.usuario_id,
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
declare v_membro uuid;
begin
  if current_setting('app.equipe_origem',true)='equipe' then return new; end if;
  perform public.equipe_validar_registro(
    (select id from public.equipe_membros where profissional_id=new.id),
    nullif(upper(btrim(new.conselho_classe)),''),nullif(upper(btrim(new.registro_conselho)),''),null
  );
  insert into public.equipe_membros(
    profissional_id,nome_completo,cargo,tipo,profissao,cpf_encrypted,cpf_hash,
    conselho_classe,registro_conselho,especialidade_id,usuario_id,ativo,created_by,created_at,updated_at
  ) values(
    new.id,btrim(new.nome_completo),
    case when upper(coalesce(new.conselho_classe,'')) like 'CRM%' then 'Médico(a)' else 'Profissional de saúde' end,
    'profissional_saude',case when upper(coalesce(new.conselho_classe,'')) like 'CRM%' then 'Medicina' else null end,
    new.cpf_encrypted,new.cpf_hash,nullif(upper(btrim(new.conselho_classe)),''),
    nullif(upper(btrim(new.registro_conselho)),''),new.especialidade_principal_id,new.usuario_id,new.ativo,
    new.created_by,new.created_at,new.updated_at
  ) on conflict(profissional_id) do update set
    nome_completo=excluded.nome_completo,cpf_encrypted=excluded.cpf_encrypted,cpf_hash=excluded.cpf_hash,
    conselho_classe=excluded.conselho_classe,registro_conselho=excluded.registro_conselho,
    conselho_uf=case when public.equipe_membros.conselho_classe is distinct from excluded.conselho_classe
      or public.equipe_membros.registro_conselho is distinct from excluded.registro_conselho
      then null else public.equipe_membros.conselho_uf end,
    especialidade_id=excluded.especialidade_id,usuario_id=excluded.usuario_id,ativo=excluded.ativo,
    revisao=public.equipe_membros.revisao+1,updated_at=now()
  returning id into v_membro;
  return new;
end $$;

create trigger equipe_profissional_sync
after insert or update of nome_completo,cpf_encrypted,cpf_hash,conselho_classe,registro_conselho,
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
  v_nome:=nullif(btrim(p_dados->>'nome_completo'),''); v_cargo:=nullif(btrim(p_dados->>'cargo'),'');
  v_tipo:=p_dados->>'tipo'; v_profissao:=nullif(btrim(p_dados->>'profissao'),''); v_modo:=p_dados->>'cpf_modo';
  v_cpf:=regexp_replace(coalesce(p_dados->>'cpf',''),'[^0-9]','','g'); v_telefone:=nullif(btrim(p_dados->>'telefone'),'');
  v_email:=nullif(lower(btrim(p_dados->>'email_contato')),''); v_conselho:=nullif(upper(btrim(p_dados->>'conselho_classe')),'');
  v_registro:=nullif(upper(btrim(p_dados->>'registro_conselho')),''); v_uf:=nullif(upper(btrim(p_dados->>'conselho_uf')),'');
  begin v_especialidade:=nullif(p_dados->>'especialidade_id','')::uuid;
  exception when invalid_text_representation then raise exception 'Especialidade inválida.' using errcode='22023'; end;
  if v_nome is null or length(v_nome)<3 or v_cargo is null or length(v_cargo)<2
     or v_tipo not in('profissional_saude','administrativo','apoio','outro') then
    raise exception 'Dados cadastrais obrigatórios inválidos.' using errcode='22023'; end if;
  if v_tipo='profissional_saude' and v_profissao is null then raise exception 'Profissão obrigatória para profissional de saúde.' using errcode='22023'; end if;
  if v_tipo<>'profissional_saude' and (v_profissao is not null or v_conselho is not null or v_registro is not null or v_uf is not null or v_especialidade is not null) then
    raise exception 'Campos profissionais não são aceitos para esta função.' using errcode='22023'; end if;
  if (v_conselho is null)<>(v_registro is null) or (v_uf is not null and v_conselho is null)
     or (v_uf is not null and v_uf!~'^[A-Z]{2}$') then raise exception 'Conselho, registro e UF estão inconsistentes.' using errcode='22023'; end if;
  if v_email is not null and v_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail de contato inválido.' using errcode='22023'; end if;
  if v_modo not in('preservar','substituir','remover') or (v_modo='preservar' and v_cpf<>'')
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
      insert into public.profissionais(nome_completo,cpf_encrypted,cpf_hash,conselho_classe,registro_conselho,especialidade_principal_id,created_by)
      values(v_nome,case when v_modo='substituir' then public.cpf_encrypt(v_cpf) end,
        case when v_modo='substituir' then public.cpf_hash(v_cpf) end,v_conselho,v_registro,v_especialidade,auth.uid()) returning id into v_prof;
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
    if v_modo in('substituir','remover') then v_campos:=array_append(v_campos,'cpf'); end if;
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
      cpf_encrypted=case when v_modo='substituir' then public.cpf_encrypt(v_cpf) when v_modo='remover' then null else cpf_encrypted end,
      cpf_hash=case when v_modo='substituir' then public.cpf_hash(v_cpf) when v_modo='remover' then null else cpf_hash end,
      revisao=revisao+1,updated_at=now() where id=v_id;
    if v_prof is not null then
      update public.profissionais set nome_completo=v_nome,conselho_classe=v_conselho,registro_conselho=v_registro,
        especialidade_principal_id=v_especialidade,
        cpf_encrypted=case when v_modo='substituir' then public.cpf_encrypt(v_cpf) when v_modo='remover' then null else cpf_encrypted end,
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
  public.equipe_listar(uuid),public.equipe_detalhar(uuid,uuid),
  public.equipe_salvar(uuid,uuid,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.equipe_listar(uuid),public.equipe_detalhar(uuid,uuid),
  public.equipe_salvar(uuid,uuid,integer,jsonb,uuid) to authenticated;
revoke all on public.equipe_membros,public.equipe_membros_clinicas,public.equipe_idempotencia from public,anon,authenticated;

commit;

```

