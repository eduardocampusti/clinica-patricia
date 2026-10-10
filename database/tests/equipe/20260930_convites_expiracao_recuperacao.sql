-- Ensaio conectado e reversível dos ajustes finais de convites.
-- Usa o membro sintético já existente, não envia e-mail e termina com ROLLBACK.
begin;

do $$
declare
  v_membro uuid;
  v_profissional uuid;
  v_usuario uuid;
  v_solicitante uuid;
  v_clinica uuid;
  v_email text := 'convite-expirado@teste.invalid';
  v_antigo uuid;
  v_novo uuid;
  v_novo_repetido uuid;
  v_reserva uuid;
  v_status text;
  v_resultado jsonb;
begin
  select m.id,m.profissional_id,m.usuario_id into v_membro,v_profissional,v_usuario
  from public.equipe_membros m
  where m.ativo and m.usuario_id is not null
  order by m.created_at limit 1;
  if v_membro is null then raise exception 'Fixture sintética de Equipe não localizada'; end if;

  select ec.clinica_id into v_clinica
  from public.equipe_membros_clinicas ec
  where ec.membro_id=v_membro and ec.ativo
  order by ec.created_at limit 1;
  select uc.usuario_id into v_solicitante
  from public.usuarios_clinicas uc join public.usuarios u on u.id=uc.usuario_id and u.ativo
  where uc.clinica_id=v_clinica and uc.ativo and uc.papel='proprietaria'::public.papel_usuario
  order by uc.usuario_id limit 1;
  if v_solicitante is null then raise exception 'Administradora ativa não localizada'; end if;

  perform set_config('app.equipe_origem','equipe',true);
  update public.equipe_membros set usuario_id=null where id=v_membro;
  if v_profissional is not null then update public.profissionais set usuario_id=null where id=v_profissional; end if;
  perform set_config('app.equipe_origem','',true);

  insert into public.equipe_acesso_convites(
    membro_id,solicitado_por,email,modo,clinicas_papeis,chave_idempotencia,payload_hash,status,expira_em
  ) values(
    v_membro,v_solicitante,v_email,'convite',
    jsonb_build_array(jsonb_build_object('clinica_id',v_clinica,'papel','medico')),
    gen_random_uuid(),md5(gen_random_uuid()::text),'enviado',now()-interval '1 minute'
  ) returning id into v_antigo;

  -- Listar continua estritamente leitura, inclusive diante de vencido.
  perform public.equipe_acesso_listar(v_solicitante,v_membro,v_clinica);
  select status into v_status from public.equipe_acesso_convites where id=v_antigo;
  if v_status<>'enviado' then raise exception 'Listagem alterou o convite vencido'; end if;

  -- A nova ação explícita encerra o anterior e cria outro, preservando ambos.
  v_resultado:=public.equipe_acesso_preparar(
    v_solicitante,v_membro,v_clinica,v_email,'convite',
    jsonb_build_array(jsonb_build_object('clinica_id',v_clinica,'papel','medico')),
    '11111111-1111-4111-8111-111111111111'::uuid
  );
  v_novo:=(v_resultado->>'id')::uuid;
  if v_novo=v_antigo
     or not exists(select 1 from public.equipe_acesso_convites where id=v_antigo and status='cancelado' and erro_codigo='CONVITE_EXPIRADO_SUBSTITUIDO')
     or not exists(select 1 from public.equipe_acesso_convites where id=v_novo and status='pendente') then
    raise exception 'Substituição do convite vencido falhou';
  end if;

  v_resultado:=public.equipe_acesso_preparar(
    v_solicitante,v_membro,v_clinica,v_email,'convite',
    jsonb_build_array(jsonb_build_object('clinica_id',v_clinica,'papel','medico')),
    '11111111-1111-4111-8111-111111111111'::uuid
  );
  v_novo_repetido:=(v_resultado->>'id')::uuid;
  if v_novo_repetido<>v_novo then raise exception 'Idempotência criou outro convite'; end if;

  -- Uma conclusão tardia nunca reabre cancelado nem aceito.
  v_resultado:=public.equipe_acesso_reservar_envio(v_solicitante,v_novo);
  v_reserva:=(v_resultado->>'reserva_id')::uuid;
  update public.equipe_acesso_convites set status='cancelado' where id=v_novo;
  v_resultado:=public.equipe_acesso_finalizar_envio(v_solicitante,v_novo,v_reserva,true,null);
  if v_resultado->>'status'<>'cancelado'
     or exists(select 1 from public.equipe_acesso_convites where id=v_novo and status<>'cancelado') then
    raise exception 'Finalização tardia reabriu convite cancelado';
  end if;
  update public.equipe_acesso_convites set status='aceito' where id=v_novo;
  v_resultado:=public.equipe_acesso_finalizar_envio(v_solicitante,v_novo,gen_random_uuid(),false,'TESTE');
  if v_resultado->>'status'<>'aceito'
     or exists(select 1 from public.equipe_acesso_convites where id=v_novo and status<>'aceito') then
    raise exception 'Finalização tardia alterou convite aceito';
  end if;

  -- Reserva expirada não executa UPDATE antes do erro; o novo preparo é quem
  -- persiste o cancelamento e libera o índice único.
  update public.equipe_acesso_convites
  set status='enviado',expira_em=now()-interval '1 minute',envio_reserva_id=null,envio_reservado_em=null
  where id=v_antigo;
  begin
    perform public.equipe_acesso_reservar_envio(v_solicitante,v_antigo);
    raise exception 'Reserva de convite vencido foi permitida';
  exception when sqlstate 'P0002' then null;
  end;
  if not exists(select 1 from public.equipe_acesso_convites where id=v_antigo and status='enviado') then
    raise exception 'Reserva executou gravação que deveria ser revertida';
  end if;

  v_resultado:=public.equipe_acesso_preparar(
    v_solicitante,v_membro,v_clinica,v_email,'convite',
    jsonb_build_array(jsonb_build_object('clinica_id',v_clinica,'papel','medico')),
    '22222222-2222-4222-8222-222222222222'::uuid
  );
  if not exists(select 1 from public.equipe_acesso_convites where id=v_antigo and status='cancelado') then
    raise exception 'Novo preparo não cancelou o convite expirado';
  end if;

  -- Finalização que percebe expiração grava cancelado e retorna sem RAISE.
  update public.equipe_acesso_convites
  set status='enviado',expira_em=now()-interval '1 minute',envio_reserva_id=gen_random_uuid(),envio_reservado_em=now()
  where id=(v_resultado->>'id')::uuid
  returning envio_reserva_id into v_reserva;
  v_resultado:=public.equipe_acesso_finalizar_envio(v_solicitante,(v_resultado->>'id')::uuid,v_reserva,true,null);
  if v_resultado->>'status'<>'cancelado' then raise exception 'Expiração na finalização não foi persistida'; end if;
end $$;

select jsonb_build_object(
  'listagem_somente_leitura',true,
  'novo_convite_apos_expiracao',true,
  'historico_preservado',true,
  'idempotencia_preservada',true,
  'finalizacao_tardia_nao_reabre',true,
  'rollback_integral',true
) as resultado;

rollback;
