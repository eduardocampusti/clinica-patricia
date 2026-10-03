\set ON_ERROR_STOP on

-- Validação local e descartável. Não é migration e termina em ROLLBACK:
-- não deixa dados, usuários, segredos ou mudanças de ACL no clone.
-- Os UUIDs abaixo são fixtures sintéticas, sem reaproveitamento de dados reais.

begin;

\echo '[catalog] conferindo instalação nova, owners, RLS, grants e RPCs'
do $$
declare
  v_fingerprint text;
  v_oid oid;
  v_rpc_count integer;
begin
  select concat_ws('|',
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
    (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e'),
    (select count(*)
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and not exists (
          select 1
          from pg_depend d
          join pg_extension e on e.oid = d.refobjid
          where d.classid = 'pg_proc'::regclass
            and d.objid = p.oid
            and d.refclassid = 'pg_extension'::regclass
            and d.deptype = 'e'
            and e.extname = 'btree_gist'
        )),
    (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    (select count(*) from pg_constraint con join pg_class c on c.oid = con.conrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    (select count(*) from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and i.indisvalid),
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity)
  ) into v_fingerprint;

  if v_fingerprint <> '19|10|27|14|47|91|34|19' then
    raise exception 'Catálogo final incompatível: esperado 19|10|27|14|47|91|34|19, encontrado %.', v_fingerprint;
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and (c.relowner <> 'postgres'::regrole or not c.relrowsecurity)
  ) then
    raise exception 'Todas as tabelas públicas precisam ter owner postgres e RLS ativo.';
  end if;

  select count(*) into v_rpc_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'listar_atendimentos_prontuario',
      'abrir_prontuario',
      'iniciar_atendimento_avulso',
      'iniciar_atendimento_agendado',
      'salvar_rascunho_atendimento',
      'finalizar_atendimento_seguro',
      'adicionar_adendo_prontuario',
      'criar_documento_prontuario'
    );

  if v_rpc_count <> 8 then
    raise exception 'Esperadas 8 RPCs do Prontuário; encontradas %.', v_rpc_count;
  end if;

  for v_oid in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'listar_atendimentos_prontuario',
        'abrir_prontuario',
        'iniciar_atendimento_avulso',
        'iniciar_atendimento_agendado',
        'salvar_rascunho_atendimento',
        'finalizar_atendimento_seguro',
        'adicionar_adendo_prontuario',
        'criar_documento_prontuario'
      )
  loop
    if not has_function_privilege('authenticated', v_oid, 'execute')
       or has_function_privilege('anon', v_oid, 'execute')
       or has_function_privilege('service_role', v_oid, 'execute') then
      raise exception 'Grant inválido para RPC %.', v_oid::regprocedure;
    end if;
  end loop;

  for v_oid in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('cpf_encrypt', 'cpf_decrypt', 'cpf_hash')
  loop
    if not has_function_privilege('authenticated', v_oid, 'execute')
       or not has_function_privilege('service_role', v_oid, 'execute')
       or has_function_privilege('anon', v_oid, 'execute') then
      raise exception 'Grant CPF inválido para %.', v_oid::regprocedure;
    end if;
  end loop;
end;
$$;

\echo '[fixtures] criando identidades, clínicas e vínculos sintéticos'
insert into auth.users (id) values
  ('00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-0000000000a3'),
  ('00000000-0000-4000-8000-0000000000a4'),
  ('00000000-0000-4000-8000-0000000000a5'),
  ('00000000-0000-4000-8000-0000000000a6'),
  ('00000000-0000-4000-8000-0000000000a7');

insert into public.usuarios (id, nome_completo) values
  ('00000000-0000-4000-8000-0000000000a1', 'Proprietária A'),
  ('00000000-0000-4000-8000-0000000000a2', 'Recepção A'),
  ('00000000-0000-4000-8000-0000000000a3', 'Médica A'),
  ('00000000-0000-4000-8000-0000000000a4', 'Médica B'),
  ('00000000-0000-4000-8000-0000000000a5', 'Médica Multi'),
  ('00000000-0000-4000-8000-0000000000a6', 'Proprietária Cruzada'),
  ('00000000-0000-4000-8000-0000000000a7', 'Usuária sem vínculo');

insert into public.clinicas (id, nome, cidade, subdomain) values
  ('00000000-0000-4000-8000-0000000000b1', 'Clínica A Sintética', 'Salvador', 'migval-a'),
  ('00000000-0000-4000-8000-0000000000b2', 'Clínica B Sintética', 'Salvador', 'migval-b');

insert into public.usuarios_clinicas (usuario_id, clinica_id, papel, ativo) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b1', 'proprietaria', true),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000b1', 'recepcao', true),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000b1', 'medico', true),
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-0000000000b2', 'medico', true),
  ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-0000000000b1', 'medico', true),
  ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-0000000000b2', 'medico', false),
  ('00000000-0000-4000-8000-0000000000a6', '00000000-0000-4000-8000-0000000000b1', 'proprietaria', true),
  ('00000000-0000-4000-8000-0000000000a6', '00000000-0000-4000-8000-0000000000b2', 'proprietaria', true);

insert into public.profissionais (
  id, nome_completo, usuario_id, conselho_classe, registro_conselho,
  ativo, duracao_consulta_minutos, created_by
) values
  ('00000000-0000-4000-8000-0000000000c1', 'Profissional A', '00000000-0000-4000-8000-0000000000a3', 'CRM', 'A-1', true, 30, '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000c2', 'Profissional B', '00000000-0000-4000-8000-0000000000a4', 'CRM', 'B-1', true, 30, '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000c3', 'Profissional Multi', '00000000-0000-4000-8000-0000000000a5', 'CRM', 'M-1', true, 30, '00000000-0000-4000-8000-0000000000a1');

insert into public.profissionais_clinicas (profissional_id, clinica_id, ativo, created_by) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', true, '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000b2', true, '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000b1', true, '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000b2', false, '00000000-0000-4000-8000-0000000000a1');

insert into public.pacientes (id, clinica_id, nome_completo, created_by) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000b1', 'Paciente A Sintético', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000b2', 'Paciente B Sintético', '00000000-0000-4000-8000-0000000000a1');

insert into public.agendamentos (
  id, clinica_id, paciente_id, profissional_id, data, hora_inicio, created_by
) values (
  '00000000-0000-4000-8000-0000000000e1',
  '00000000-0000-4000-8000-0000000000b1',
  '00000000-0000-4000-8000-0000000000d1',
  '00000000-0000-4000-8000-0000000000c1',
  (clock_timestamp() at time zone 'America/Bahia')::date,
  '14:00',
  '00000000-0000-4000-8000-0000000000a1'
);

\echo '[I-05] sessão e entrada em duas instruções independentes'
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a2', true);

insert into public.sessoes_caixa (
  id, clinica_id, aberto_por, valor_abertura, status
) values (
  '00000000-0000-4000-8000-0000000000f1',
  '00000000-0000-4000-8000-0000000000b1',
  '00000000-0000-4000-8000-0000000000a2',
  0,
  'aberto'
);

insert into public.entradas_caixa (
  id, sessao_caixa_id, clinica_id, forma_pagamento, valor, descricao,
  registrado_por, paciente_id, profissional_id
) values (
  '00000000-0000-4000-8000-0000000000f2',
  '00000000-0000-4000-8000-0000000000f1',
  '00000000-0000-4000-8000-0000000000b1',
  'pix',
  50,
  'Entrada sintética',
  '00000000-0000-4000-8000-0000000000a2',
  '00000000-0000-4000-8000-0000000000d1',
  '00000000-0000-4000-8000-0000000000c1'
);

reset role;

\echo '[I-06] recepção A agenda clínica B: trigger deve bloquear com P0001'
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a2', true);
do $$
declare v_code text;
begin
  begin
    insert into public.agendamentos (
      id, clinica_id, paciente_id, profissional_id, data, hora_inicio, created_by
    ) values (
      '00000000-0000-4000-8000-0000000000e2',
      '00000000-0000-4000-8000-0000000000b2',
      '00000000-0000-4000-8000-0000000000d2',
      '00000000-0000-4000-8000-0000000000c2',
      (clock_timestamp() at time zone 'America/Bahia')::date,
      '15:00',
      '00000000-0000-4000-8000-0000000000a2'
    );
    raise exception using errcode = 'P0002', message = 'I-06 deveria ter sido bloqueado.';
  exception when others then
    get stacked diagnostics v_code = returned_sqlstate;
    if v_code <> 'P0001' then
      raise;
    end if;
  end;
end;
$$;

\echo '[I-08] proprietária A usa profissional B em agenda A: trigger deve bloquear com P0001'
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
do $$
declare v_code text;
begin
  begin
    insert into public.agendamentos (
      id, clinica_id, paciente_id, profissional_id, data, hora_inicio, created_by
    ) values (
      '00000000-0000-4000-8000-0000000000e3',
      '00000000-0000-4000-8000-0000000000b1',
      '00000000-0000-4000-8000-0000000000d1',
      '00000000-0000-4000-8000-0000000000c2',
      (clock_timestamp() at time zone 'America/Bahia')::date,
      '15:30',
      '00000000-0000-4000-8000-0000000000a1'
    );
    raise exception using errcode = 'P0002', message = 'I-08 deveria ter sido bloqueado.';
  exception when others then
    get stacked diagnostics v_code = returned_sqlstate;
    if v_code <> 'P0001' then
      raise;
    end if;
  end;
end;
$$;

reset role;

\echo '[U-07] atualização cruzada só pode falhar pela policy endurecida'
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a6', true);
do $$
declare v_code text;
begin
  begin
    update public.agendamentos
    set profissional_id = '00000000-0000-4000-8000-0000000000c2'
    where id = '00000000-0000-4000-8000-0000000000e1';
    raise exception using errcode = 'P0002', message = 'U-07 deveria ter sido bloqueado pelo WITH CHECK.';
  exception when others then
    get stacked diagnostics v_code = returned_sqlstate;
    if v_code <> '42501' then
      raise;
    end if;
  end;
end;
$$;

reset role;

\echo '[U-12] usuário sem vínculo não consegue atualizar seu próprio perfil'
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a7', true);
do $$
declare v_rows integer;
begin
  update public.usuarios
  set nome_completo = 'Usuária sem vínculo - mutação indevida'
  where id = '00000000-0000-4000-8000-0000000000a7';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'U-12 permitiu atualização sem vínculo ativo.';
  end if;
end;
$$;

\echo '[R-12/R-13] funções CPF sem segredo local devem falhar em 22023'
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
do $$
declare v_code text;
begin
  begin
    perform public.cpf_encrypt('111.111.111-11');
    raise exception using errcode = 'P0002', message = 'R-12 deveria falhar sem cpf_key.';
  exception when others then
    get stacked diagnostics v_code = returned_sqlstate;
    if v_code <> '22023' then
      raise;
    end if;
  end;

  begin
    perform public.cpf_hash('111.111.111-11');
    raise exception using errcode = 'P0002', message = 'R-13 deveria falhar sem cpf_pepper.';
  exception when others then
    get stacked diagnostics v_code = returned_sqlstate;
    if v_code <> '22023' then
      raise;
    end if;
  end;
end;
$$;

\echo '[S-17] profissional multi-clínica sem vínculo ativo em B não lê prontuário B'
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a5', true);
do $$
declare v_code text;
begin
  begin
    perform public.listar_atendimentos_prontuario('00000000-0000-4000-8000-0000000000b2');
    raise exception using errcode = 'P0002', message = 'S-17 deveria negar a clínica sem vínculo ativo.';
  exception when others then
    get stacked diagnostics v_code = returned_sqlstate;
    if v_code <> '42501' then
      raise;
    end if;
  end;
end;
$$;

\echo '[Prontuário] exercitando as oito RPCs por médica A autenticada'
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a3', true);
do $$
declare
  v_avulso uuid;
  v_agendado uuid;
  v_abrir jsonb;
  v_documento jsonb;
  v_adendo jsonb;
  v_count integer;
  v_code text;
begin
  -- Acesso direto permanece fechado; a fronteira é a RPC.
  begin
    perform 1 from public.atendimentos;
    raise exception using errcode = 'P0002', message = 'Tabela clínica não deveria estar acessível diretamente.';
  exception when others then
    get stacked diagnostics v_code = returned_sqlstate;
    if v_code <> '42501' then
      raise;
    end if;
  end;

  select public.iniciar_atendimento_avulso(
    '00000000-0000-4000-8000-0000000000b1',
    '00000000-0000-4000-8000-0000000000d1'
  ) into v_avulso;

  if v_avulso is null then
    raise exception 'iniciar_atendimento_avulso não retornou atendimento.';
  end if;

  perform public.salvar_rascunho_atendimento(
    v_avulso, 'Queixa', 'Anamnese', 'Exame', 'Hipótese', 'Z00',
    'Conduta', 'Prescrição'
  );
  perform public.finalizar_atendimento_seguro(
    v_avulso, 'Queixa final', 'Anamnese final', 'Exame final',
    'Hipótese final', 'Z00', 'Conduta final', 'Prescrição final'
  );

  select public.adicionar_adendo_prontuario(v_avulso, 'Adendo sintético')
  into v_adendo;
  if coalesce(v_adendo ->> 'texto', '') <> 'Adendo sintético' then
    raise exception 'adicionar_adendo_prontuario não persistiu o texto esperado.';
  end if;

  select public.criar_documento_prontuario(v_avulso, 'receita', 'Conteúdo sintético')
  into v_documento;
  if coalesce(v_documento ->> 'conteudo', '') <> 'Conteúdo sintético' then
    raise exception 'criar_documento_prontuario não persistiu o conteúdo esperado.';
  end if;

  select public.iniciar_atendimento_agendado(
    '00000000-0000-4000-8000-0000000000b1',
    '00000000-0000-4000-8000-0000000000e1'
  ) into v_agendado;
  if v_agendado is null then
    raise exception 'iniciar_atendimento_agendado não retornou atendimento.';
  end if;

  select count(*) into v_count
  from public.listar_atendimentos_prontuario('00000000-0000-4000-8000-0000000000b1');
  if v_count < 2 then
    raise exception 'listar_atendimentos_prontuario não retornou os dois atendimentos esperados.';
  end if;

  select public.abrir_prontuario(v_avulso) into v_abrir;
  if coalesce(v_abrir #>> '{atendimento,id}', '') <> v_avulso::text
     or coalesce(v_abrir #>> '{documentos,0,conteudo}', '') <> 'Conteúdo sintético' then
    raise exception 'abrir_prontuario não retornou o atendimento/documento esperado.';
  end if;
end;
$$;

reset role;
\echo '[PASS] segurança, grants, CPF, isolamento e oito RPCs validados; fixtures serão descartadas'
rollback;
