-- Edição administrativa: ensaiada em PostgreSQL descartável e Supabase com ROLLBACK.
-- Não instala a trava de menores nem altera policies/grants existentes.
begin;

-- O timestamp deixa de depender do relógio/cooperação dos clientes.
-- Inclui UPDATE direto, CPF e foto. Não reescreve registros existentes.
create or replace function public.pacientes_revisionar_edicao()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
revoke all on function public.pacientes_revisionar_edicao() from public, anon, authenticated;
create trigger trg_pacientes_revisionar_edicao before update on public.pacientes
for each row execute function public.pacientes_revisionar_edicao();

create function public.paciente_editar_administrativo(
  p_paciente_id uuid, p_clinica_id uuid, p_updated_at timestamptz,
  p_alteracoes jsonb, p_responsavel jsonb default null
)
returns table (
  id uuid, clinica_id uuid, nome_completo text, data_nascimento date,
  sexo text, telefone text, email text, endereco text, observacoes text,
  foto_path text, ativo boolean, created_at timestamptz, updated_at timestamptz
)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v public.pacientes%rowtype;
  n public.pacientes%rowtype;
  k text;
  hoje date := (clock_timestamp() at time zone 'America/Bahia')::date;
  r_nome text; r_vinculo text; r_telefone text; r_cpf text; r_email text;
  tem_responsavel boolean;
begin
  if auth.uid() is null
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not exists (select 1 from public.usuarios u where u.id = auth.uid() and u.ativo)
     or (public.clinica_ativa() is not null and public.clinica_ativa() <> p_clinica_id)
     or not exists (select 1 from public.clinicas c where c.id = p_clinica_id and c.ativo) then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;
  if p_alteracoes is null or jsonb_typeof(p_alteracoes) <> 'object' then
    raise exception 'Alterações inválidas.' using errcode = '22023';
  end if;
  for k in select jsonb_object_keys(p_alteracoes) loop
    if k <> all(array['nome_completo','data_nascimento','sexo','telefone','email','endereco','observacoes'])
       or jsonb_typeof(p_alteracoes->k) not in ('string','null') then
      raise exception 'Campo não permitido.' using errcode = '22023';
    end if;
  end loop;
  select p.* into v from public.pacientes p
    where p.id = p_paciente_id and p.clinica_id = p_clinica_id for update;
  if not found then raise exception 'Operação não autorizada.' using errcode = '42501'; end if;
  if p_updated_at is null or v.updated_at is distinct from p_updated_at then
    raise exception 'Cadastro alterado por outra operação.' using errcode = '40001';
  end if;
  n := jsonb_populate_record(v, p_alteracoes);
  if n is not distinct from v and p_responsavel is null then
    raise exception 'Nenhuma alteração solicitada.' using errcode = '22023';
  end if;
  -- Valida somente campos modificados: legado sem nascimento pode corrigir contato.
  if p_alteracoes ? 'nome_completo' and coalesce(btrim(n.nome_completo), '') = '' then
    raise exception 'Nome obrigatório.' using errcode = '22023';
  end if;
  if p_alteracoes ? 'data_nascimento' and (n.data_nascimento > hoje or not isfinite(n.data_nascimento)) then
    raise exception 'Nascimento inválido.' using errcode = '22023';
  end if;
  if v.data_nascimento > (hoje - interval '18 years')::date and n.data_nascimento is null then
    raise exception 'Não remover nascimento de menor conhecido.' using errcode = '23514';
  end if;
  if p_alteracoes ? 'telefone' and n.telefone is not null
     and length(regexp_replace(n.telefone, '[^0-9]', '', 'g')) not in (10,11) then
    raise exception 'Telefone inválido.' using errcode = '22023';
  end if;
  if p_alteracoes ? 'sexo' and n.sexo is not null
     and n.sexo not in ('nao_informado','feminino','masculino','outro') then
    raise exception 'Sexo inválido.' using errcode = '22023';
  end if;
  if p_alteracoes ? 'email' and n.email is not null
     and n.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  select exists(select 1 from public.pacientes_responsaveis_legais r
    where r.paciente_id = v.id and r.clinica_id = v.clinica_id) into tem_responsavel;
  if n.data_nascimento > (hoje - interval '18 years')::date and not tem_responsavel then
    if p_responsavel is null or jsonb_typeof(p_responsavel) <> 'object' then
      raise exception 'Responsável obrigatório.' using errcode = '23514';
    end if;
    for k in select jsonb_object_keys(p_responsavel) loop
      if k <> all(array['nome_completo','vinculo','telefone','cpf','email'])
         or jsonb_typeof(p_responsavel->k) not in ('string','null') then
        raise exception 'Campo de responsável não permitido.' using errcode = '22023';
      end if;
    end loop;
    r_nome := btrim(p_responsavel->>'nome_completo');
    r_vinculo := btrim(p_responsavel->>'vinculo');
    r_telefone := btrim(p_responsavel->>'telefone');
    r_cpf := regexp_replace(coalesce(p_responsavel->>'cpf',''), '[^0-9]', '', 'g');
    r_email := nullif(btrim(p_responsavel->>'email'), '');
    if coalesce(r_nome,'') = '' or coalesce(r_vinculo,'') = ''
       or length(regexp_replace(coalesce(r_telefone,''), '[^0-9]', '', 'g')) not in (10,11)
       or (r_cpf <> '' and not public.pacientes_cpf_valido(r_cpf))
       or (r_email is not null and r_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
      raise exception 'Responsável incompleto ou inválido.' using errcode = '22023';
    end if;
    -- Vincula ao MESMO paciente antes de atualizar o nascimento, na mesma transação.
    insert into public.pacientes_responsaveis_legais
      (paciente_id, clinica_id, nome_completo, vinculo, telefone, cpf_encrypted, cpf_hash, email, created_by)
    values (v.id, v.clinica_id, r_nome, r_vinculo, r_telefone,
      case when r_cpf = '' then null else public.cpf_encrypt(r_cpf) end,
      case when r_cpf = '' then null else public.cpf_hash(r_cpf) end, r_email, auth.uid());
  elsif p_responsavel is not null then
    -- Não substitui, remove ou cria múltiplos responsáveis nesta operação.
    raise exception 'Vínculo não pode ser alterado por esta operação.' using errcode = '23514';
  end if;
  return query update public.pacientes p set
    nome_completo = n.nome_completo, data_nascimento = n.data_nascimento,
    sexo = n.sexo, telefone = n.telefone, email = n.email,
    endereco = n.endereco, observacoes = n.observacoes
  where p.id = v.id and p.clinica_id = v.clinica_id
  returning p.id, p.clinica_id, p.nome_completo, p.data_nascimento, p.sexo,
    p.telefone, p.email, p.endereco, p.observacoes, p.foto_path, p.ativo, p.created_at, p.updated_at;
  if not found then raise exception 'Atualização não concluída.' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.paciente_editar_administrativo(uuid,uuid,timestamptz,jsonb,jsonb) from public, anon;
grant execute on function public.paciente_editar_administrativo(uuid,uuid,timestamptz,jsonb,jsonb) to authenticated;
-- Grants/policies existentes, CPF, foto e a trava de menores NÃO são revogados aqui.
commit;
