-- FASE 13 — limpeza controlada de fixtures conhecidas
-- NÃO EXECUTADO em 23/09/2026. Requer decisão humana sobre a clínica piloto.
-- Nunca remove auth.users: essa etapa deve usar exclusivamente a API Admin.
-- Para liberar deliberadamente, na mesma sessão:
--   select set_config('app.pre_go_live_cleanup_confirm',
--     'CONFIRMO_FIXTURES_FASE13_20260923', false);

begin;

do $$
declare
  v_confirm text := current_setting('app.pre_go_live_cleanup_confirm', true);
  v_patient_ids uuid[] := array[
    '49913321-0bc4-442e-aa77-3edb9012497b'::uuid
  ];
  v_user_ids uuid[] := array[
    '2b4199e9-04c9-4ce8-90c7-593edc8257fb'::uuid,
    '2c774d4e-aece-45da-83ba-b8bff80b09fa'::uuid
  ];
begin
  if v_confirm is distinct from 'CONFIRMO_FIXTURES_FASE13_20260923' then
    raise exception 'Limpeza bloqueada: confirmação explícita ausente.';
  end if;

  if (select count(*) from public.pacientes where id = any(v_patient_ids)) <> 1 then
    raise exception 'Guard falhou: pacientes esperados divergiram.';
  end if;
  if (select count(*) from public.agendamentos where paciente_id = any(v_patient_ids)) <> 0 then
    raise exception 'Guard falhou: agendamentos esperados divergiram.';
  end if;
  if exists (select 1 from public.atendimentos where paciente_id = any(v_patient_ids))
     or exists (select 1 from public.lista_espera where paciente_id = any(v_patient_ids))
     or exists (select 1 from public.recebimentos where paciente_id = any(v_patient_ids))
     or exists (select 1 from public.entradas_caixa where paciente_id = any(v_patient_ids)) then
    raise exception 'Guard falhou: fixture de paciente ganhou prontuário/financeiro/legado.';
  end if;

  if (select count(*) from public.usuarios where id = any(v_user_ids)) <> 2 then
    raise exception 'Guard falhou: usuários sintéticos esperados divergiram.';
  end if;
  if exists (select 1 from public.profissionais where usuario_id = any(v_user_ids)) then
    raise exception 'Guard falhou: candidato passou a ter profissional.';
  end if;
  if exists (
    select 1 from public.sessoes_caixa
    where aberto_por = any(v_user_ids) or fechado_por = any(v_user_ids)
  ) then
    raise exception 'Guard falhou: candidato passou a ter vínculo com caixa.';
  end if;

  -- Ordem explícita; não toca caixa, configurações, migrations nem Auth.
  delete from public.pacientes where id = any(v_patient_ids);
  delete from public.usuarios_clinicas where usuario_id = any(v_user_ids);
  delete from public.usuarios where id = any(v_user_ids);
end;
$$;

-- Revisar as contagens e substituir por COMMIT somente na janela aprovada.
rollback;
