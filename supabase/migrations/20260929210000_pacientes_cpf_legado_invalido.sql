-- Diferencia CPF legado inválido de indisponibilidade técnica na leitura individual.
-- A função mantém assinatura, grants, autorização e retorno anteriores.
begin;

create or replace function public.paciente_ler_cpf(
  p_paciente_id uuid, p_clinica_id uuid
) returns text
  language plpgsql stable security definer
  set search_path = pg_catalog as $$
declare
  v_cpf_encrypted bytea;
  v_cpf_hash text;
  v_cpf text;
begin
  if auth.uid() is null
     or not public.eh_proprietaria(p_clinica_id)
     or not exists (select 1 from public.usuarios u
                    where u.id = auth.uid() and u.ativo)
     or (public.clinica_ativa() is not null
         and public.clinica_ativa() <> p_clinica_id)
     or not exists (select 1 from public.clinicas c
                    where c.id = p_clinica_id and c.ativo) then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  select p.cpf_encrypted, p.cpf_hash into v_cpf_encrypted, v_cpf_hash
  from public.pacientes p
  where p.id = p_paciente_id and p.clinica_id = p_clinica_id;
  if not found then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  if (v_cpf_encrypted is null) <> (v_cpf_hash is null) then
    raise exception 'Não foi possível confirmar o CPF.' using errcode = '22000';
  end if;
  if v_cpf_encrypted is null then return null; end if;

  -- Falha de descriptografia ou divergência do hash não é diagnóstico de
  -- documento inválido: propaga erro técnico ou mantém o erro genérico.
  v_cpf := public.cpf_decrypt(v_cpf_encrypted);
  if public.cpf_hash(v_cpf) is distinct from v_cpf_hash then
    raise exception 'Não foi possível confirmar o CPF.' using errcode = '22000';
  end if;
  if not public.pacientes_cpf_valido(v_cpf) then
    raise exception 'O CPF cadastrado precisa de revisão.' using errcode = 'PC422';
  end if;
  return v_cpf;
end $$;

revoke all on function public.paciente_ler_cpf(uuid, uuid) from public, anon;
grant execute on function public.paciente_ler_cpf(uuid, uuid) to authenticated;

commit;
