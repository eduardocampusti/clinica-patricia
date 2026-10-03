-- Pacientes: complementação segura de CPF e hardening das mutações administrativas.
-- Não altera a separação de cadastros por clínica nem cria identidade global.

begin;

-- Validação única para a complementação e o cadastro inicial.
create or replace function public.pacientes_cpf_valido(p_cpf text)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_soma integer := 0;
  v_digito_1 integer;
  v_digito_2 integer;
  i integer;
begin
  if p_cpf is null or p_cpf !~ '^[0-9]{11}$'
     or p_cpf = repeat(substr(p_cpf, 1, 1), 11) then
    return false;
  end if;

  for i in 1..9 loop
    v_soma := v_soma + substr(p_cpf, i, 1)::integer * (11 - i);
  end loop;
  v_digito_1 := 11 - (v_soma % 11);
  if v_digito_1 >= 10 then v_digito_1 := 0; end if;

  v_soma := 0;
  for i in 1..10 loop
    v_soma := v_soma + substr(p_cpf, i, 1)::integer * (12 - i);
  end loop;
  v_digito_2 := 11 - (v_soma % 11);
  if v_digito_2 >= 10 then v_digito_2 := 0; end if;

  return substr(p_cpf, 10, 1)::integer = v_digito_1
     and substr(p_cpf, 11, 1)::integer = v_digito_2;
end;
$$;

create or replace function public.paciente_cpf_pendente(
  p_paciente_id uuid,
  p_clinica_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_pendente boolean;
begin
  if auth.uid() is null
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not (public.clinica_ativa() is null or public.clinica_ativa() = p_clinica_id)
     or not exists (select 1 from public.clinicas c where c.id = p_clinica_id and c.ativo) then
    raise exception 'Sem permissão para consultar o paciente nesta clínica.' using errcode = '42501';
  end if;

  select p.cpf_hash is null
    into v_pendente
  from public.pacientes p
  where p.id = p_paciente_id
    and p.clinica_id = p_clinica_id;

  if not found then
    raise exception 'Paciente não encontrado nesta clínica.' using errcode = 'P0002';
  end if;

  return v_pendente;
end;
$$;

create or replace function public.paciente_definir_cpf(
  p_paciente_id uuid,
  p_clinica_id uuid,
  p_cpf text
)
returns void
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  v_hash text;
  v_cpf_atual text;
begin
  if auth.uid() is null
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not (public.clinica_ativa() is null or public.clinica_ativa() = p_clinica_id)
     or not exists (select 1 from public.clinicas c where c.id = p_clinica_id and c.ativo) then
    raise exception 'Sem permissão para alterar o paciente nesta clínica.' using errcode = '42501';
  end if;

  if not public.pacientes_cpf_valido(v_cpf) then
    raise exception 'CPF inválido.' using errcode = '22023';
  end if;

  select p.cpf_hash
    into v_cpf_atual
  from public.pacientes p
  where p.id = p_paciente_id
    and p.clinica_id = p_clinica_id
  for update;

  if not found then
    raise exception 'Paciente não encontrado nesta clínica.' using errcode = 'P0002';
  end if;
  if v_cpf_atual is not null then
    raise exception 'CPF já preenchido para este paciente.' using errcode = 'P0001';
  end if;

  v_hash := public.cpf_hash(v_cpf);
  if exists (
    select 1
    from public.pacientes outro
    where outro.clinica_id = p_clinica_id
      and outro.id <> p_paciente_id
      and outro.cpf_hash = v_hash
  ) then
    raise exception 'CPF já cadastrado nesta clínica.' using errcode = '23505';
  end if;

  update public.pacientes
  set cpf_encrypted = public.cpf_encrypt(v_cpf),
      cpf_hash = v_hash,
      updated_at = now()
  where id = p_paciente_id
    and clinica_id = p_clinica_id;
exception
  when unique_violation then
    raise exception 'CPF já cadastrado nesta clínica.' using errcode = '23505';
end;
$$;

-- O INSERT do formulário continua direto: valide também esta entrada no banco.
create or replace function public.pacientes_validar_cpf_gravacao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_cpf text;
begin
  if new.cpf_encrypted is null and new.cpf_hash is null then
    return new;
  end if;
  if new.cpf_encrypted is null or new.cpf_hash is null then
    raise exception 'CPF incompleto.' using errcode = '22023';
  end if;

  v_cpf := public.cpf_decrypt(new.cpf_encrypted);
  if not public.pacientes_cpf_valido(v_cpf)
     or new.cpf_hash is distinct from public.cpf_hash(v_cpf) then
    raise exception 'CPF inválido.' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pacientes_validar_cpf_gravacao on public.pacientes;
create trigger trg_pacientes_validar_cpf_gravacao
before insert or update of cpf_encrypted, cpf_hash on public.pacientes
for each row execute function public.pacientes_validar_cpf_gravacao();

create or replace function public.pacientes_bloquear_troca_clinica()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.clinica_id is distinct from old.clinica_id then
    raise exception 'A clínica do paciente não pode ser alterada.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pacientes_bloquear_troca_clinica on public.pacientes;
create trigger trg_pacientes_bloquear_troca_clinica
before update of clinica_id on public.pacientes
for each row execute function public.pacientes_bloquear_troca_clinica();

alter policy pacientes_insert on public.pacientes
  with check (
    public.eh_proprietaria_ou_recepcao(clinica_id)
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
    and exists (select 1 from public.clinicas c where c.id = clinica_id and c.ativo)
  );

alter policy pacientes_update on public.pacientes
  using (
    public.eh_proprietaria_ou_recepcao(clinica_id)
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
    and exists (select 1 from public.clinicas c where c.id = clinica_id and c.ativo)
  )
  with check (
    public.eh_proprietaria_ou_recepcao(clinica_id)
    and (public.clinica_ativa() is null or clinica_id = public.clinica_ativa())
    and exists (select 1 from public.clinicas c where c.id = clinica_id and c.ativo)
  );

revoke execute on function public.paciente_cpf_pendente(uuid, uuid) from public, anon;
revoke execute on function public.paciente_definir_cpf(uuid, uuid, text) from public, anon;
grant execute on function public.paciente_cpf_pendente(uuid, uuid) to authenticated;
grant execute on function public.paciente_definir_cpf(uuid, uuid, text) to authenticated;

revoke execute on function public.pacientes_bloquear_troca_clinica() from public, anon, authenticated;
revoke execute on function public.pacientes_validar_cpf_gravacao() from public, anon, authenticated;
revoke execute on function public.pacientes_cpf_valido(text) from public, anon, authenticated;

revoke update on table public.pacientes from anon, authenticated;
grant update (
  nome_completo, data_nascimento, sexo, telefone, email, endereco,
  consentimento_lgpd, consentimento_data, observacoes, updated_at
) on table public.pacientes to authenticated;

do $$
begin
  if has_function_privilege('anon', 'public.paciente_cpf_pendente(uuid,uuid)', 'execute')
     or has_function_privilege('anon', 'public.paciente_definir_cpf(uuid,uuid,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.paciente_cpf_pendente(uuid,uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.paciente_definir_cpf(uuid,uuid,text)', 'execute') then
    raise exception 'Privilégios das RPCs de CPF de pacientes não foram aplicados.';
  end if;

  if has_column_privilege('authenticated', 'public.pacientes', 'cpf_encrypted', 'update')
     or has_column_privilege('authenticated', 'public.pacientes', 'cpf_hash', 'update')
     or has_column_privilege('authenticated', 'public.pacientes', 'clinica_id', 'update')
     or has_column_privilege('authenticated', 'public.pacientes', 'ativo', 'update') then
    raise exception 'Colunas protegidas continuam alteráveis diretamente por authenticated.';
  end if;
end;
$$;

commit;
