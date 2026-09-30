-- Ensaio conectado e reversível da gestão de acessos.
-- Usa somente o membro profissional sintético já identificado no ambiente.
-- Todas as alterações e auditorias desta execução são revertidas ao final.
begin;

do $$
declare
  v_membro uuid;
  v_profissional uuid;
  v_usuario uuid;
  v_solicitante uuid;
  v_clinica uuid;
  v_outra_clinica uuid;
  v_email text;
  v_convite uuid;
  v_reserva uuid;
  v_antes_convites bigint;
  v_antes_auditoria bigint;
  v_antes_vinculos bigint;
  v_resultado jsonb;
begin
  select m.id, m.profissional_id, m.usuario_id
    into v_membro, v_profissional, v_usuario
  from public.equipe_membros m
  where m.tipo = 'profissional_saude'::public.tipo_membro_equipe
    and m.profissional_id is not null
    and m.usuario_id is not null
    and m.ativo
  order by m.created_at
  limit 1;

  if v_membro is null then
    raise exception 'Membro profissional sintético vinculado não localizado';
  end if;

  select ec.clinica_id
    into v_clinica
  from public.equipe_membros_clinicas ec
  where ec.membro_id = v_membro and ec.ativo
  order by ec.created_at
  limit 1;

  select uc.usuario_id
    into v_solicitante
  from public.usuarios_clinicas uc
  join public.usuarios u on u.id = uc.usuario_id and u.ativo
  where uc.clinica_id = v_clinica
    and uc.ativo
    and uc.papel = 'proprietaria'::public.papel_usuario
  order by uc.usuario_id
  limit 1;

  if v_solicitante is null then
    raise exception 'Administradora ativa não localizada para a clínica sintética';
  end if;

  select lower(email) into v_email from auth.users where id = v_usuario;
  if v_email is null then
    raise exception 'Conta Auth sintética não localizada';
  end if;

  select count(*) into v_antes_convites from public.equipe_acesso_convites;
  select count(*) into v_antes_auditoria from public.auditoria;
  select count(*) into v_antes_vinculos from public.usuarios_clinicas;

  -- Consultar é estritamente leitura.
  v_resultado := public.equipe_acesso_listar(v_solicitante, v_membro, v_clinica);
  if v_resultado->>'membro_id' <> v_membro::text then
    raise exception 'A listagem não retornou o membro esperado';
  end if;
  if (select count(*) from public.equipe_acesso_convites) <> v_antes_convites
     or (select count(*) from public.auditoria) <> v_antes_auditoria
     or (select count(*) from public.usuarios_clinicas) <> v_antes_vinculos then
    raise exception 'A listagem produziu gravação indevida';
  end if;

  -- Um usuário comum não administra a própria ficha por chamada direta.
  begin
    perform public.equipe_acesso_listar(v_usuario, v_membro, v_clinica);
    raise exception 'Usuário sem autorização conseguiu listar acessos';
  exception when sqlstate '42501' then
    null;
  end;

  -- Suspensão, reativação e papel operam somente na clínica-alvo.
  perform public.equipe_acesso_alterar(v_solicitante, v_membro, v_clinica, v_clinica, 'suspender', null);
  if exists(select 1 from public.usuarios_clinicas where usuario_id = v_usuario and clinica_id = v_clinica and ativo) then
    raise exception 'Suspensão não foi aplicada';
  end if;
  perform public.equipe_acesso_alterar(v_solicitante, v_membro, v_clinica, v_clinica, 'reativar', null);
  perform public.equipe_acesso_alterar(v_solicitante, v_membro, v_clinica, v_clinica, 'papel', 'recepcao');
  if not exists(select 1 from public.usuarios_clinicas where usuario_id = v_usuario and clinica_id = v_clinica and ativo and papel = 'recepcao') then
    raise exception 'Alteração de papel não foi aplicada';
  end if;
  perform public.equipe_acesso_alterar(v_solicitante, v_membro, v_clinica, v_clinica, 'papel', 'medico');

  -- Se houver outra clínica administrada, comprova o isolamento da suspensão.
  select uc.clinica_id into v_outra_clinica
  from public.usuarios_clinicas uc
  join public.usuarios u on u.id = uc.usuario_id and u.ativo
  where uc.usuario_id = v_solicitante
    and uc.ativo
    and uc.papel = 'proprietaria'::public.papel_usuario
    and uc.clinica_id <> v_clinica
  order by uc.clinica_id
  limit 1;

  if v_outra_clinica is not null then
    insert into public.equipe_membros_clinicas(membro_id, clinica_id, ativo, created_by)
    values(v_membro, v_outra_clinica, true, v_solicitante)
    on conflict(membro_id, clinica_id) do update set ativo = true;
    insert into public.usuarios_clinicas(usuario_id, clinica_id, papel, ativo)
    values(v_usuario, v_outra_clinica, 'medico', true)
    on conflict(usuario_id, clinica_id) do update set papel = 'medico', ativo = true;

    perform public.equipe_acesso_alterar(v_solicitante, v_membro, v_clinica, v_clinica, 'suspender', null);
    if not exists(select 1 from public.usuarios_clinicas where usuario_id = v_usuario and clinica_id = v_outra_clinica and ativo) then
      raise exception 'Suspensão em uma clínica afetou a outra clínica';
    end if;
    perform public.equipe_acesso_alterar(v_solicitante, v_membro, v_clinica, v_clinica, 'reativar', null);
  end if;

  -- Aceite exige e-mail confirmado e sincroniza Equipe/Profissionais.
  insert into public.equipe_acesso_convites(
    membro_id, solicitado_por, email, modo, clinicas_papeis,
    chave_idempotencia, payload_hash, auth_user_id, status
  ) values(
    v_membro, v_solicitante, v_email, 'vinculo',
    jsonb_build_array(jsonb_build_object('clinica_id', v_clinica, 'papel', 'medico')),
    gen_random_uuid(), md5(gen_random_uuid()::text), v_usuario, 'enviado'
  ) returning id into v_convite;

  begin
    perform public.equipe_acesso_aceitar(v_convite, v_usuario, v_email, false);
    raise exception 'Aceite sem e-mail confirmado foi permitido';
  exception when sqlstate '42501' then
    null;
  end;

  perform set_config('app.equipe_origem', 'equipe', true);
  update public.equipe_membros set usuario_id = null where id = v_membro;
  update public.profissionais set usuario_id = null where id = v_profissional;
  perform set_config('app.equipe_origem', '', true);

  v_resultado := public.equipe_acesso_aceitar(v_convite, v_usuario, v_email, true);
  if v_resultado->>'status' <> 'aceito'
     or not exists(select 1 from public.equipe_membros where id = v_membro and usuario_id = v_usuario)
     or not exists(select 1 from public.profissionais where id = v_profissional and usuario_id = v_usuario) then
    raise exception 'Aceite não sincronizou Equipe e Profissionais';
  end if;
  v_resultado := public.equipe_acesso_aceitar(v_convite, v_usuario, v_email, true);
  if v_resultado->>'status' <> 'aceito' then
    raise exception 'Repetição idempotente do aceite falhou';
  end if;

  -- Reserva do reenvio acontece antes do serviço externo e não se duplica.
  update public.equipe_acesso_convites
  set status = 'erro', aceito_em = null, ultimo_envio_em = null,
      envio_reserva_id = null, envio_reservado_em = null
  where id = v_convite;
  v_resultado := public.equipe_acesso_reservar_envio(v_solicitante, v_convite);
  v_reserva := (v_resultado->>'reserva_id')::uuid;
  begin
    perform public.equipe_acesso_reservar_envio(v_solicitante, v_convite);
    raise exception 'Uma segunda reserva concorrente foi permitida';
  exception when sqlstate '22023' then
    null;
  end;
  perform public.equipe_acesso_finalizar_envio(v_solicitante, v_convite, v_reserva, false, 'TESTE_CONTROLADO');

  -- Uma administradora não pode suspender o próprio acesso.
  begin
    perform public.equipe_acesso_alterar(v_solicitante, v_membro, v_clinica, v_clinica, 'papel', 'proprietaria');
    perform public.equipe_acesso_alterar(v_usuario, v_membro, v_clinica, v_clinica, 'suspender', null);
    raise exception 'Autobloqueio da administradora foi permitido';
  exception when sqlstate '42501' then
    null;
  end;
end $$;

select jsonb_build_object(
  'listar_sem_gravacao', true,
  'negativa_usuario_comum', true,
  'suspensao_reativacao_papel', true,
  'isolamento_entre_clinicas_quando_disponivel', true,
  'aceite_confirmado_e_idempotente', true,
  'sincronizacao_equipe_profissional', true,
  'reserva_atomica_reenvio', true,
  'autobloqueio_recusado', true,
  'rollback_integral', true
) as resultado;

rollback;
