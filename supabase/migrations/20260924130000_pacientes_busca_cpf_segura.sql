-- Pacientes: busca exata de CPF dentro da clínica autorizada.
-- Mantém cpf_decrypt disponível durante a transição do frontend anterior.

begin;

create or replace function public.paciente_buscar_por_cpf(
  p_clinica_id uuid,
  p_cpf text
)
returns table (
  id uuid,
  nome_completo text,
  data_nascimento date,
  telefone text,
  endereco text,
  ativo boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  v_hash text;
begin
  if auth.uid() is null
     or not public.eh_proprietaria_ou_recepcao(p_clinica_id)
     or not (public.clinica_ativa() is null or public.clinica_ativa() = p_clinica_id)
     or not exists (select 1 from public.clinicas c where c.id = p_clinica_id and c.ativo) then
    raise exception 'Sem permissão para buscar pacientes nesta clínica.' using errcode = '42501';
  end if;

  if not public.pacientes_cpf_valido(v_cpf) then
    raise exception 'CPF inválido.' using errcode = '22023';
  end if;

  v_hash := public.cpf_hash(v_cpf);

  return query
  select
    p.id,
    p.nome_completo,
    p.data_nascimento,
    p.telefone,
    p.endereco,
    p.ativo
  from public.pacientes p
  where p.clinica_id = p_clinica_id
    and p.cpf_hash = v_hash
  order by p.nome_completo, p.id;
end;
$$;

revoke execute on function public.paciente_buscar_por_cpf(uuid, text) from public, anon;
grant execute on function public.paciente_buscar_por_cpf(uuid, text) to authenticated;

do $$
begin
  if has_function_privilege('anon', 'public.paciente_buscar_por_cpf(uuid,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.paciente_buscar_por_cpf(uuid,text)', 'execute') then
    raise exception 'Privilégios da busca segura de CPF não foram aplicados.';
  end if;
end;
$$;

commit;
