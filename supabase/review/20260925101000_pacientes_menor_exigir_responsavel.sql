-- PROPOSTA CORRIGIDA PARA REVISÃO — NÃO APLICADA.
-- Este arquivo fica fora de supabase/migrations para não antecipar a trava.
-- Os triggers usam SECURITY DEFINER para consultar a tabela privada de responsáveis.
-- Aplicar somente depois de publicar o frontend compatível e conferir o legado.
-- Impede concluir uma nova gravação de menor conhecido sem responsável legal.

begin;

do $$
begin
  if to_regclass('public.pacientes_responsaveis_legais') is null
     or to_regprocedure('public.paciente_menor_criar_com_responsavel(uuid,text,date,text,text,text,text,text,text,text,text,text,text,text)') is null then
    raise exception 'A estrutura de responsável legal ainda não foi instalada.';
  end if;
end;
$$;

create or replace function public.pacientes_menor_exigir_responsavel()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Data de nascimento ausente continua fora desta regra até decisão funcional.
  if new.data_nascimento is not null
     and new.data_nascimento <= current_date
     and new.data_nascimento > (current_date - interval '18 years')::date
     and not exists (
       select 1
       from public.pacientes_responsaveis_legais r
       where r.paciente_id = new.id
         and r.clinica_id = new.clinica_id
     ) then
    raise exception 'Cadastro de paciente menor exige responsável legal vinculado.'
      using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger trg_pacientes_menor_exigir_responsavel
after insert or update of data_nascimento
on public.pacientes
deferrable initially deferred
for each row execute function public.pacientes_menor_exigir_responsavel();

create or replace function public.pacientes_responsavel_preservar_minimo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_paciente public.pacientes%rowtype;
begin
  select p.* into v_paciente
  from public.pacientes p
  where p.id = old.paciente_id
    and p.clinica_id = old.clinica_id;

  -- Exclusão em cascata do próprio paciente não precisa ser bloqueada.
  if not found then
    return null;
  end if;

  if v_paciente.data_nascimento is not null
     and v_paciente.data_nascimento <= current_date
     and v_paciente.data_nascimento > (current_date - interval '18 years')::date
     and not exists (
       select 1
       from public.pacientes_responsaveis_legais r
       where r.paciente_id = v_paciente.id
         and r.clinica_id = v_paciente.clinica_id
     ) then
    raise exception 'Paciente menor deve manter ao menos um responsável legal vinculado.'
      using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger trg_pacientes_responsavel_preservar_minimo
after delete or update of paciente_id, clinica_id
on public.pacientes_responsaveis_legais
deferrable initially deferred
for each row execute function public.pacientes_responsavel_preservar_minimo();

revoke execute on function public.pacientes_menor_exigir_responsavel()
  from public, anon, authenticated;
revoke execute on function public.pacientes_responsavel_preservar_minimo()
  from public, anon, authenticated;

commit;
