-- PROPOSTA PARA REVISÃO: NÃO APLICAR ANTES DO FRONTEND COMPATÍVEL.
-- Versão posterior a 20260925120000. O arquivo 20260925101000 permanece
-- em supabase/review/ como histórico da proposta corrigida.
-- Data de nascimento ausente não permite inferir maioridade e fica fora
-- desta trava até decisão funcional específica.

begin;

do $$
begin
  if to_regclass('public.pacientes_responsaveis_legais') is null
     or to_regprocedure('public.paciente_menor_criar_com_responsavel(uuid,text,date,text,text,text,text,text,text,text,text,text,text,text)') is null then
    raise exception 'A estrutura de responsável legal ainda não foi instalada.';
  end if;

  -- Não instalar a trava sobre menores conhecidos sem vínculo: a correção
  -- desses registros requer análise operacional, nunca responsável fictício.
  if exists (
    select 1
    from public.pacientes p
    where p.data_nascimento <= current_date
      and p.data_nascimento > (current_date - interval '18 years')::date
      and not exists (
        select 1 from public.pacientes_responsaveis_legais r
        where r.paciente_id = p.id and r.clinica_id = p.clinica_id
      )
  ) then
    raise exception 'Há menores com nascimento conhecido sem responsável; revisar o legado antes da trava.';
  end if;
end;
$$;

create function public.pacientes_menor_exigir_responsavel()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_clinica_id uuid;
  v_nascimento date;
begin
  -- O trigger é diferido: avalie a linha FINAL, não NEW de um evento anterior
  -- na mesma transação. A exclusão do paciente não exige manter seu vínculo.
  select p.clinica_id, p.data_nascimento
    into v_clinica_id, v_nascimento
  from public.pacientes p
  where p.id = new.id;
  if not found then
    return null;
  end if;

  if v_nascimento is not null
     and v_nascimento <= current_date
     and v_nascimento > (current_date - interval '18 years')::date
     and not exists (
       select 1 from public.pacientes_responsaveis_legais r
       where r.paciente_id = new.id and r.clinica_id = v_clinica_id
     ) then
    raise exception 'Cadastro de paciente menor exige responsável legal vinculado.'
      using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger trg_pacientes_menor_exigir_responsavel
after insert or update of data_nascimento, clinica_id
on public.pacientes
deferrable initially deferred
for each row execute function public.pacientes_menor_exigir_responsavel();

create function public.pacientes_responsavel_preservar_minimo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_nascimento date;
begin
  select p.data_nascimento into v_nascimento
  from public.pacientes p
  where p.id = old.paciente_id and p.clinica_id = old.clinica_id
  for update;

  -- Exclusão em cascata do paciente não deixa cadastro de menor em aberto.
  if not found then
    return null;
  end if;

  -- Serializa remoções concorrentes de responsáveis distintos do mesmo menor.
  if v_nascimento is not null
     and v_nascimento <= current_date
     and v_nascimento > (current_date - interval '18 years')::date
     and not exists (
       select 1 from public.pacientes_responsaveis_legais r
       where r.paciente_id = old.paciente_id and r.clinica_id = old.clinica_id
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
