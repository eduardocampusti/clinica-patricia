-- Endereço estruturado aditivo e compatível com a coluna textual histórica.
-- Não altera RLS, não cria URL pública e não reescreve registros existentes.
begin;

do $$
begin
  if to_regclass('public.pacientes') is null then
    raise exception 'Dependência ausente: public.pacientes.';
  end if;
  if to_regprocedure('public.paciente_editar_administrativo(uuid,uuid,timestamp with time zone,jsonb,jsonb)') is null then
    raise exception 'Dependência ausente: paciente_editar_administrativo.';
  end if;
  if to_regprocedure('public.paciente_menor_criar_com_responsavel(uuid,text,date,text,text,text,text,text,text,text,text,text,text,text)') is null then
    raise exception 'Dependência ausente: sobrecarga original de paciente_menor_criar_com_responsavel.';
  end if;
  if to_regprocedure('public.eh_proprietaria_ou_recepcao(uuid)') is null then
    raise exception 'Dependência ausente: eh_proprietaria_ou_recepcao.';
  end if;
end;
$$;

alter table public.pacientes
  add column if not exists cep text,
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists uf text,
  add column if not exists endereco_historico text;

alter table public.pacientes
  add constraint pacientes_cep_formato check (cep is null or cep ~ '^[0-9]{5}-?[0-9]{3}$') not valid,
  add constraint pacientes_uf_formato check (uf is null or uf ~ '^[A-Z]{2}$') not valid;

comment on column public.pacientes.endereco is
  'Representação textual integral e compatível do endereço. Cadastros históricos podem possuir somente esta coluna.';
comment on column public.pacientes.cep is 'CEP opcional, sem inferência para registros históricos.';
comment on column public.pacientes.logradouro is 'Logradouro opcional informado ou confirmado pelo operador.';
comment on column public.pacientes.numero is 'Número opcional informado pelo operador.';
comment on column public.pacientes.complemento is 'Complemento opcional informado pelo operador.';
comment on column public.pacientes.bairro is 'Bairro opcional informado ou confirmado pelo operador.';
comment on column public.pacientes.cidade is 'Cidade opcional informada ou confirmada pelo operador.';
comment on column public.pacientes.uf is 'UF opcional em duas letras maiúsculas.';
comment on column public.pacientes.endereco_historico is
  'Cópia imutável do endereço textual anterior à primeira transição para campos estruturados.';

create or replace function public.paciente_editar_administrativo(
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
    if k <> all(array[
      'nome_completo','data_nascimento','sexo','telefone','email','endereco','observacoes',
      'cep','logradouro','numero','complemento','bairro','cidade','uf'
    ]) or jsonb_typeof(p_alteracoes->k) not in ('string','null') then
      raise exception 'Campo não permitido.' using errcode = '22023';
    end if;
  end loop;
  select p.* into v from public.pacientes p
    where p.id = p_paciente_id and p.clinica_id = p_clinica_id for update;
  if not found then raise exception 'Operação não autorizada.' using errcode = '42501'; end if;
  if p_updated_at is null or v.updated_at is distinct from p_updated_at then
    raise exception 'Cadastro alterado por outra operação.' using errcode = 'PT409';
  end if;
  n := jsonb_populate_record(v, p_alteracoes);
  if n is not distinct from v and p_responsavel is null then
    raise exception 'Nenhuma alteração solicitada.' using errcode = '22023';
  end if;
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
  if n.cep is not null and n.cep !~ '^[0-9]{5}-?[0-9]{3}$' then
    raise exception 'CEP inválido.' using errcode = '22023';
  end if;
  if n.uf is not null and n.uf !~ '^[A-Z]{2}$' then
    raise exception 'UF inválida.' using errcode = '22023';
  end if;
  if p_alteracoes ?| array['cep','logradouro','numero','complemento','bairro','cidade','uf']
     and coalesce(
       nullif(btrim(v.cep),''), nullif(btrim(v.logradouro),''), nullif(btrim(v.numero),''),
       nullif(btrim(v.complemento),''), nullif(btrim(v.bairro),''),
       nullif(btrim(v.cidade),''), nullif(btrim(v.uf),'')
     ) is null
     and nullif(btrim(v.endereco), '') is not null then
    n.endereco_historico := coalesce(v.endereco_historico, v.endereco);
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
    insert into public.pacientes_responsaveis_legais
      (paciente_id, clinica_id, nome_completo, vinculo, telefone, cpf_encrypted, cpf_hash, email, created_by)
    values (v.id, v.clinica_id, r_nome, r_vinculo, r_telefone,
      case when r_cpf = '' then null else public.cpf_encrypt(r_cpf) end,
      case when r_cpf = '' then null else public.cpf_hash(r_cpf) end, r_email, auth.uid());
  elsif p_responsavel is not null then
    raise exception 'Vínculo não pode ser alterado por esta operação.' using errcode = '23514';
  end if;
  return query update public.pacientes p set
    nome_completo = n.nome_completo, data_nascimento = n.data_nascimento,
    sexo = n.sexo, telefone = n.telefone, email = n.email,
    endereco = n.endereco, observacoes = n.observacoes,
    cep = n.cep, logradouro = n.logradouro, numero = n.numero,
    complemento = n.complemento, bairro = n.bairro, cidade = n.cidade, uf = n.uf,
    endereco_historico = n.endereco_historico
  where p.id = v.id and p.clinica_id = v.clinica_id
  returning p.id, p.clinica_id, p.nome_completo, p.data_nascimento, p.sexo,
    p.telefone, p.email, p.endereco, p.observacoes, p.foto_path, p.ativo, p.created_at, p.updated_at;
  if not found then raise exception 'Atualização não concluída.' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function public.paciente_editar_administrativo(uuid,uuid,timestamptz,jsonb,jsonb) from public, anon;
grant execute on function public.paciente_editar_administrativo(uuid,uuid,timestamptz,jsonb,jsonb) to authenticated;

-- Sobrecarga compatível para o cadastro atômico de menor. A assinatura já
-- publicada permanece disponível para frontends anteriores; o frontend novo
-- seleciona esta versão somente quando as colunas acima existem.
create or replace function public.paciente_menor_criar_com_responsavel(
  p_clinica_id uuid,
  p_nome_completo text,
  p_data_nascimento date,
  p_responsavel_nome text,
  p_responsavel_vinculo text,
  p_responsavel_telefone text,
  p_cpf text,
  p_sexo text,
  p_telefone text,
  p_email text,
  p_endereco text,
  p_observacoes text,
  p_responsavel_cpf text,
  p_responsavel_email text,
  p_endereco_componentes jsonb
)
returns table (id uuid, nome_completo text, clinica_id uuid)
language plpgsql volatile security definer set search_path = pg_catalog, public as $$
declare
  v_criado record;
  v_componentes public.pacientes%rowtype;
  k text;
begin
  if p_endereco_componentes is null or jsonb_typeof(p_endereco_componentes) <> 'object' then
    raise exception 'Componentes do endereço inválidos.' using errcode = '22023';
  end if;
  for k in select jsonb_object_keys(p_endereco_componentes) loop
    if k <> all(array['cep','logradouro','numero','complemento','bairro','cidade','uf'])
       or jsonb_typeof(p_endereco_componentes->k) not in ('string','null') then
      raise exception 'Componente de endereço não permitido.' using errcode = '22023';
    end if;
  end loop;
  v_componentes := jsonb_populate_record(null::public.pacientes, p_endereco_componentes);
  if v_componentes.cep is not null and v_componentes.cep !~ '^[0-9]{5}-?[0-9]{3}$' then
    raise exception 'CEP inválido.' using errcode = '22023';
  end if;
  if v_componentes.uf is not null and v_componentes.uf !~ '^[A-Z]{2}$' then
    raise exception 'UF inválida.' using errcode = '22023';
  end if;

  select * into strict v_criado
  from public.paciente_menor_criar_com_responsavel(
    p_clinica_id, p_nome_completo, p_data_nascimento,
    p_responsavel_nome, p_responsavel_vinculo, p_responsavel_telefone,
    p_cpf, p_sexo, p_telefone, p_email, p_endereco, p_observacoes,
    p_responsavel_cpf, p_responsavel_email
  );

  update public.pacientes p set
    cep = nullif(btrim(v_componentes.cep), ''),
    logradouro = nullif(btrim(v_componentes.logradouro), ''),
    numero = nullif(btrim(v_componentes.numero), ''),
    complemento = nullif(btrim(v_componentes.complemento), ''),
    bairro = nullif(btrim(v_componentes.bairro), ''),
    cidade = nullif(btrim(v_componentes.cidade), ''),
    uf = nullif(btrim(v_componentes.uf), '')
  where p.id = v_criado.id and p.clinica_id = v_criado.clinica_id;

  return query select v_criado.id, v_criado.nome_completo, v_criado.clinica_id;
end;
$$;
revoke all on function public.paciente_menor_criar_com_responsavel(
  uuid,text,date,text,text,text,text,text,text,text,text,text,text,text,jsonb
) from public, anon;
grant execute on function public.paciente_menor_criar_com_responsavel(
  uuid,text,date,text,text,text,text,text,text,text,text,text,text,text,jsonb
) to authenticated;

do $$
declare
  v_colunas integer;
begin
  select count(*) into v_colunas
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'pacientes'
    and column_name = any(array[
      'cep','logradouro','numero','complemento','bairro','cidade','uf','endereco_historico'
    ]);

  if v_colunas <> 8 then
    raise exception 'Verificação falhou: endereço estruturado incompleto (%/8 colunas).', v_colunas;
  end if;
  if to_regprocedure('public.paciente_menor_criar_com_responsavel(uuid,text,date,text,text,text,text,text,text,text,text,text,text,text,jsonb)') is null then
    raise exception 'Verificação falhou: nova sobrecarga de paciente_menor_criar_com_responsavel ausente.';
  end if;
  if not has_function_privilege('authenticated', 'public.paciente_editar_administrativo(uuid,uuid,timestamp with time zone,jsonb,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.paciente_editar_administrativo(uuid,uuid,timestamp with time zone,jsonb,jsonb)', 'EXECUTE') then
    raise exception 'Verificação falhou: privilégios inesperados em paciente_editar_administrativo.';
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
