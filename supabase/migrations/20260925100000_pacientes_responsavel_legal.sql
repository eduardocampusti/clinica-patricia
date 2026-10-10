-- PROPOSTA PARA REVISÃO — NÃO APLICADA.
-- Pacientes: estrutura clínica e criação atômica de menor com responsável legal.
-- Esta etapa não concede acesso ao prontuário, não ativa mensagens e não cria
-- identidade compartilhada entre clínicas.

begin;

do $$
begin
  if to_regclass('public.pacientes') is null
     or to_regclass('public.clinicas') is null
     or to_regclass('public.usuarios') is null
     or to_regprocedure('public.eh_proprietaria_ou_recepcao(uuid)') is null
     or to_regprocedure('public.pacientes_cpf_valido(text)') is null
     or to_regprocedure('public.cpf_encrypt(text)') is null
     or to_regprocedure('public.cpf_hash(text)') is null then
    raise exception 'Responsável legal requer as migrations atuais de Pacientes.';
  end if;
end;
$$;

-- A relação guarda os dados do responsável no contexto do menor e da clínica.
-- Ela deliberadamente não transforma o responsável em uma pessoa global nem
-- deduplica responsáveis de irmãos; qualquer reutilização depende de decisão.
create table public.pacientes_responsaveis_legais (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  paciente_id uuid not null,
  nome_completo text not null,
  vinculo text not null,
  telefone text not null,
  cpf_encrypted bytea,
  cpf_hash text,
  email text,
  created_by uuid not null default auth.uid() references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pacientes_responsaveis_nome_preenchido
    check (btrim(nome_completo) <> ''),
  constraint pacientes_responsaveis_vinculo_preenchido
    check (btrim(vinculo) <> ''),
  constraint pacientes_responsaveis_telefone_valido
    check (length(regexp_replace(telefone, '[^0-9]', '', 'g')) in (10, 11)),
  constraint pacientes_responsaveis_cpf_par
    check ((cpf_encrypted is null) = (cpf_hash is null)),
  constraint pacientes_responsaveis_email_preenchido
    check (email is null or btrim(email) <> '')
);

comment on table public.pacientes_responsaveis_legais is
  'Vínculo clínico entre um paciente menor e um responsável legal; não concede acesso ao prontuário nem autorização para mensagens.';
comment on column public.pacientes_responsaveis_legais.telefone is
  'Telefone / WhatsApp informado para contato; não significa canal verificado nem consentimento para mensagens.';

-- A chave composta faz o banco rejeitar vínculo entre paciente e clínica
-- diferentes, mesmo que uma chamada direta tente combinar os identificadores.
alter table public.pacientes
  add constraint pacientes_id_clinica_id_key unique (id, clinica_id);

alter table public.pacientes_responsaveis_legais
  add constraint pacientes_responsaveis_paciente_clinica_fkey
  foreign key (paciente_id, clinica_id)
  references public.pacientes(id, clinica_id)
  on delete cascade;

create index pacientes_responsaveis_clinica_paciente_idx
  on public.pacientes_responsaveis_legais (clinica_id, paciente_id, created_at);

create or replace function public.pacientes_responsavel_validar_cpf_gravacao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_cpf text;
begin
  if new.cpf_encrypted is null and new.cpf_hash is null then
    return new;
  end if;

  if new.cpf_encrypted is null or new.cpf_hash is null then
    raise exception 'CPF do responsável incompleto.' using errcode = '22023';
  end if;

  v_cpf := public.cpf_decrypt(new.cpf_encrypted);
  if not public.pacientes_cpf_valido(v_cpf)
     or new.cpf_hash is distinct from public.cpf_hash(v_cpf) then
    raise exception 'CPF do responsável inválido.' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger trg_pacientes_responsavel_validar_cpf
before insert or update of cpf_encrypted, cpf_hash
on public.pacientes_responsaveis_legais
for each row execute function public.pacientes_responsavel_validar_cpf_gravacao();

alter table public.pacientes_responsaveis_legais enable row level security;

-- A tabela não é uma fonte geral de dados para médicos ou laboratório.
-- A leitura administrativa continua limitada ao vínculo ativo de proprietária
-- ou recepção na clínica ativa do próprio registro.
create policy pacientes_responsaveis_select
on public.pacientes_responsaveis_legais
for select
to authenticated
using (
  public.eh_proprietaria_ou_recepcao(clinica_id)
  and exists (
    select 1
    from public.clinicas c
    where c.id = clinica_id
      and c.ativo
  )
);

revoke all on table public.pacientes_responsaveis_legais from public, anon, authenticated;

create or replace function public.paciente_menor_criar_com_responsavel(
  p_clinica_id uuid,
  p_nome_completo text,
  p_data_nascimento date,
  p_responsavel_nome text,
  p_responsavel_vinculo text,
  p_responsavel_telefone text,
  p_cpf text default null,
  p_sexo text default null,
  p_telefone text default null,
  p_email text default null,
  p_endereco text default null,
  p_observacoes text default null,
  p_responsavel_cpf text default null,
  p_responsavel_email text default null
)
returns table (
  id uuid,
  nome_completo text,
  clinica_id uuid
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_paciente_id uuid;
  v_nome_paciente text := btrim(regexp_replace(coalesce(p_nome_completo, ''), '\s+', ' ', 'g'));
  v_nome_responsavel text := btrim(regexp_replace(coalesce(p_responsavel_nome, ''), '\s+', ' ', 'g'));
  v_vinculo text := btrim(regexp_replace(coalesce(p_responsavel_vinculo, ''), '\s+', ' ', 'g'));
  v_cpf_paciente text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  v_cpf_responsavel text := regexp_replace(coalesce(p_responsavel_cpf, ''), '[^0-9]', '', 'g');
  v_telefone_responsavel text := btrim(coalesce(p_responsavel_telefone, ''));
  v_telefone_responsavel_digitos text := regexp_replace(coalesce(p_responsavel_telefone, ''), '[^0-9]', '', 'g');
  v_email_paciente text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_email_responsavel text := nullif(lower(btrim(coalesce(p_responsavel_email, ''))), '');
begin
  -- p_clinica_id escolhe o escopo; a autorização vem do vínculo ativo no
  -- banco. Nenhum filtro React ou estado do navegador é aceito como autorização.
  if v_usuario_id is null
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not exists (
       select 1 from public.clinicas c
       where c.id = p_clinica_id and c.ativo
     ) then
    raise exception 'Sem permissão para cadastrar paciente nesta clínica.' using errcode = '42501';
  end if;

  if v_nome_paciente = '' then
    raise exception 'Informe o nome completo do paciente.' using errcode = '22023';
  end if;

  if p_data_nascimento is null
     or p_data_nascimento > current_date
     or p_data_nascimento <= (current_date - interval '18 years')::date then
    raise exception 'A data informada não identifica um paciente menor.' using errcode = '22023';
  end if;

  if v_nome_responsavel = '' or v_vinculo = '' then
    raise exception 'Informe nome e vínculo do responsável legal.' using errcode = '22023';
  end if;

  if length(v_telefone_responsavel_digitos) not in (10, 11) then
    raise exception 'Informe Telefone / WhatsApp do responsável com DDD.' using errcode = '22023';
  end if;

  if v_cpf_paciente <> '' and not public.pacientes_cpf_valido(v_cpf_paciente) then
    raise exception 'CPF do paciente inválido.' using errcode = '22023';
  end if;

  if v_cpf_responsavel <> '' and not public.pacientes_cpf_valido(v_cpf_responsavel) then
    raise exception 'CPF do responsável inválido.' using errcode = '22023';
  end if;

  if v_email_paciente is not null
     and v_email_paciente !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'E-mail do paciente inválido.' using errcode = '22023';
  end if;

  if v_email_responsavel is not null
     and v_email_responsavel !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'E-mail do responsável inválido.' using errcode = '22023';
  end if;

  insert into public.pacientes as novo_paciente (
    clinica_id,
    nome_completo,
    cpf_encrypted,
    cpf_hash,
    data_nascimento,
    sexo,
    telefone,
    email,
    endereco,
    observacoes,
    created_by
  ) values (
    p_clinica_id,
    v_nome_paciente,
    case when v_cpf_paciente = '' then null else public.cpf_encrypt(v_cpf_paciente) end,
    case when v_cpf_paciente = '' then null else public.cpf_hash(v_cpf_paciente) end,
    p_data_nascimento,
    nullif(btrim(coalesce(p_sexo, '')), ''),
    nullif(btrim(coalesce(p_telefone, '')), ''),
    v_email_paciente,
    nullif(btrim(coalesce(p_endereco, '')), ''),
    nullif(btrim(coalesce(p_observacoes, '')), ''),
    v_usuario_id
  )
  returning novo_paciente.id into v_paciente_id;

  insert into public.pacientes_responsaveis_legais (
    clinica_id,
    paciente_id,
    nome_completo,
    vinculo,
    telefone,
    cpf_encrypted,
    cpf_hash,
    email,
    created_by
  ) values (
    p_clinica_id,
    v_paciente_id,
    v_nome_responsavel,
    v_vinculo,
    v_telefone_responsavel,
    case when v_cpf_responsavel = '' then null else public.cpf_encrypt(v_cpf_responsavel) end,
    case when v_cpf_responsavel = '' then null else public.cpf_hash(v_cpf_responsavel) end,
    v_email_responsavel,
    v_usuario_id
  );

  return query
    select v_paciente_id, v_nome_paciente, p_clinica_id;
exception
  when unique_violation then
    raise exception 'CPF do paciente já cadastrado nesta clínica.' using errcode = '23505';
end;
$$;

-- Retorno mínimo para a ficha administrativa. Não devolve CPF, ciphertext ou
-- hash, e não concede qualquer dado ao prontuário por consequência do vínculo.
create or replace function public.paciente_responsavel_legal_resumo(
  p_paciente_id uuid,
  p_clinica_id uuid
)
returns table (
  id uuid,
  nome_completo text,
  vinculo text,
  telefone text,
  email text,
  cpf_informado boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not exists (
       select 1 from public.clinicas c
       where c.id = p_clinica_id and c.ativo
     ) then
    raise exception 'Sem permissão para consultar responsáveis nesta clínica.' using errcode = '42501';
  end if;

  return query
    select
      r.id,
      r.nome_completo,
      r.vinculo,
      r.telefone,
      r.email,
      r.cpf_hash is not null
    from public.pacientes_responsaveis_legais r
    where r.paciente_id = p_paciente_id
      and r.clinica_id = p_clinica_id
    order by r.created_at, r.id;
end;
$$;

revoke execute on function public.pacientes_responsavel_validar_cpf_gravacao()
  from public, anon, authenticated;
revoke execute on function public.paciente_menor_criar_com_responsavel(
  uuid, text, date, text, text, text, text, text, text, text, text, text, text, text
) from public, anon;
revoke execute on function public.paciente_responsavel_legal_resumo(uuid, uuid)
  from public, anon;

grant execute on function public.paciente_menor_criar_com_responsavel(
  uuid, text, date, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
grant execute on function public.paciente_responsavel_legal_resumo(uuid, uuid)
  to authenticated;

do $$
begin
  if has_table_privilege('authenticated', 'public.pacientes_responsaveis_legais', 'insert')
     or has_table_privilege('authenticated', 'public.pacientes_responsaveis_legais', 'update')
     or has_table_privilege('authenticated', 'public.pacientes_responsaveis_legais', 'delete')
     or has_function_privilege('anon', 'public.paciente_menor_criar_com_responsavel(uuid,text,date,text,text,text,text,text,text,text,text,text,text,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.paciente_menor_criar_com_responsavel(uuid,text,date,text,text,text,text,text,text,text,text,text,text,text)', 'execute') then
    raise exception 'Privilégios de responsável legal não foram aplicados.';
  end if;
end;
$$;

commit;
