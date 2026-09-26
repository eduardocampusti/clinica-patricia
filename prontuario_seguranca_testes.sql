-- ============================================================
-- PRONTUÁRIO — testes de segurança do hardening
--
-- Executar SOMENTE em banco local/staging descartável, depois de aplicar
-- prontuario_hardening.sql. O script cria fixtures dentro de uma única
-- transação e termina sempre com ROLLBACK.
--
-- Não usa service_role. As chamadas da aplicação são simuladas com o papel
-- authenticated e claims JWT diferentes. O runner SQL precisa ser o dono
-- do banco apenas para criar as fixtures e alternar SET ROLE.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Fixtures isoladas e determinísticas.
-- ------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'hardening-medico-a@teste.local',
    '{"provider":"email","providers":["email"]}', '{"nome_completo":"Médico A"}', now(), now()
  ),
  (
    'b1000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'hardening-medico-b@teste.local',
    '{"provider":"email","providers":["email"]}', '{"nome_completo":"Médico B"}', now(), now()
  ),
  (
    'c1000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'hardening-proprietaria@teste.local',
    '{"provider":"email","providers":["email"]}', '{"nome_completo":"Proprietária A"}', now(), now()
  ),
  (
    'd1000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'hardening-recepcao@teste.local',
    '{"provider":"email","providers":["email"]}', '{"nome_completo":"Recepção A"}', now(), now()
  );

-- Caso o projeto tenha trigger auth.users -> public.usuarios, o conflito é
-- intencionalmente ignorado; caso não tenha, as linhas são criadas aqui.
insert into public.usuarios (id, nome_completo, ativo)
values
  ('a1000000-0000-4000-8000-000000000001', 'Médico A', true),
  ('b1000000-0000-4000-8000-000000000002', 'Médico B', true),
  ('c1000000-0000-4000-8000-000000000003', 'Proprietária A', true),
  ('d1000000-0000-4000-8000-000000000004', 'Recepção A', true)
on conflict (id) do update set ativo = excluded.ativo;

insert into public.clinicas (id, nome, cidade, subdomain)
values
  ('a2000000-0000-4000-8000-000000000001', 'Clínica Hardening A', 'Salvador', 'hardening-a-teste'),
  ('b2000000-0000-4000-8000-000000000002', 'Clínica Hardening B', 'Salvador', 'hardening-b-teste');

insert into public.usuarios_clinicas (usuario_id, clinica_id, papel, ativo)
values
  ('a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'medico', true),
  ('b1000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000002', 'medico', true),
  ('c1000000-0000-4000-8000-000000000003', 'a2000000-0000-4000-8000-000000000001', 'proprietaria', true),
  ('d1000000-0000-4000-8000-000000000004', 'a2000000-0000-4000-8000-000000000001', 'recepcao', true);

insert into public.pacientes (
  id, clinica_id, nome_completo, consentimento_lgpd, consentimento_data, ativo, created_by
)
values
  (
    'a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
    'Paciente A', true, now(), true, 'c1000000-0000-4000-8000-000000000003'
  ),
  (
    'b3000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000002',
    'Paciente B', true, now(), true, 'b1000000-0000-4000-8000-000000000002'
  );

insert into public.profissionais (
  id, nome_completo, usuario_id, ativo, duracao_consulta_minutos, created_by
)
values
  (
    'a4000000-0000-4000-8000-000000000001', 'Médico A',
    'a1000000-0000-4000-8000-000000000001', true, 30,
    'c1000000-0000-4000-8000-000000000003'
  ),
  (
    'b4000000-0000-4000-8000-000000000002', 'Médico B',
    'b1000000-0000-4000-8000-000000000002', true, 30,
    'b1000000-0000-4000-8000-000000000002'
  );

insert into public.profissionais_clinicas (profissional_id, clinica_id, ativo, created_by)
values
  (
    'a4000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', true,
    'c1000000-0000-4000-8000-000000000003'
  ),
  (
    'b4000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000002', true,
    'b1000000-0000-4000-8000-000000000002'
  );

insert into public.agendamentos (
  id, clinica_id, paciente_id, profissional_id, data, hora_inicio, hora_fim, status, created_by
)
values
  (
    'a5000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    'a4000000-0000-4000-8000-000000000001',
    (clock_timestamp() at time zone 'America/Bahia')::date,
    '10:00', '10:30', 'confirmado', 'c1000000-0000-4000-8000-000000000003'
  ),
  (
    'a5000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    'a4000000-0000-4000-8000-000000000001',
    (clock_timestamp() at time zone 'America/Bahia')::date,
    '11:00', '11:30', 'cancelado', 'c1000000-0000-4000-8000-000000000003'
  );

-- ------------------------------------------------------------
-- 2) Funções auxiliares dos testes, restritas ao pg_temp.
-- ------------------------------------------------------------
create function pg_temp.assumir_usuario(p_usuario_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_usuario_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_usuario_id, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create function pg_temp.falhar(p_mensagem text)
returns void
language plpgsql
as $$
begin
  raise exception 'TESTE FALHOU: %', p_mensagem;
end;
$$;

-- ------------------------------------------------------------
-- 3) Grants mínimos: anon não chama RPC nem lê tabelas clínicas.
-- ------------------------------------------------------------
set local role anon;

do $$
begin
  begin
    perform public.abrir_prontuario('a5000000-0000-4000-8000-000000000001');
    perform pg_temp.falhar('anon executou abrir_prontuario');
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform queixa_principal from public.atendimentos limit 1;
    perform pg_temp.falhar('anon leu atendimentos diretamente');
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

-- ------------------------------------------------------------
-- 4) Médico A: início idempotente, leitura auditada e escrita segura.
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.assumir_usuario('a1000000-0000-4000-8000-000000000001');

do $$
declare
  v_primeiro uuid;
  v_segundo uuid;
  v_quantidade integer;
begin
  begin
    perform queixa_principal from public.atendimentos limit 1;
    perform pg_temp.falhar('authenticated leu conteúdo clínico diretamente');
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.atendimentos (
      clinica_id, paciente_id, profissional_id, created_by
    ) values (
      'a2000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001'
    );
    perform pg_temp.falhar('authenticated inseriu atendimento diretamente');
  exception when insufficient_privilege then
    null;
  end;

  v_primeiro := public.iniciar_atendimento_agendado(
    'a2000000-0000-4000-8000-000000000001',
    'a5000000-0000-4000-8000-000000000001'
  );
  v_segundo := public.iniciar_atendimento_agendado(
    'a2000000-0000-4000-8000-000000000001',
    'a5000000-0000-4000-8000-000000000001'
  );

  if v_primeiro <> v_segundo then
    perform pg_temp.falhar('início por agendamento não foi idempotente');
  end if;

  perform set_config('test.atendimento_id', v_primeiro::text, true);

  select count(*) into v_quantidade
  from public.listar_atendimentos_prontuario('a2000000-0000-4000-8000-000000000001') l
  where l.id = v_primeiro;

  if v_quantidade <> 1 then
    perform pg_temp.falhar('lista segura não retornou o atendimento do médico');
  end if;

  begin
    perform public.listar_atendimentos_prontuario('b2000000-0000-4000-8000-000000000002');
    perform pg_temp.falhar('médico listou prontuário de outra clínica');
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.iniciar_atendimento_agendado(
      'a2000000-0000-4000-8000-000000000001',
      'a5000000-0000-4000-8000-000000000002'
    );
    perform pg_temp.falhar('agendamento cancelado iniciou atendimento');
  exception when check_violation then
    null;
  end;

  begin
    perform public.iniciar_atendimento_avulso(
      'a2000000-0000-4000-8000-000000000001',
      'b3000000-0000-4000-8000-000000000002'
    );
    perform pg_temp.falhar('paciente de outra clínica iniciou atendimento avulso');
  exception when check_violation then
    null;
  end;
end;
$$;

do $$
declare
  v_id uuid := current_setting('test.atendimento_id')::uuid;
  v_resultado jsonb;
begin
  v_resultado := public.abrir_prontuario(v_id);
  if v_resultado #>> '{atendimento,paciente_nome}' <> 'Paciente A' then
    perform pg_temp.falhar('abertura segura retornou paciente incorreto');
  end if;

  perform public.salvar_rascunho_atendimento(
    v_id, 'Queixa teste', 'Anamnese teste', 'Exame teste',
    'Hipótese teste', 'Z00.0', 'Conduta teste', 'Prescrição teste'
  );
end;
$$;

reset role;

-- O dono do banco verifica o efeito da RPC sem depender de uma leitura que
-- o aplicativo não possui.
do $$
declare
  v_id uuid := current_setting('test.atendimento_id')::uuid;
  v_auditorias integer;
begin
  select count(*) into v_auditorias
  from public.auditoria_leitura_clinica
  where atendimento_id = v_id
    and usuario_id = 'a1000000-0000-4000-8000-000000000001';

  if v_auditorias <> 1 then
    perform pg_temp.falhar('abertura não gerou exatamente uma auditoria');
  end if;

  if not exists (
    select 1 from public.atendimentos
    where id = v_id
      and queixa_principal = 'Queixa teste'
      and status = 'em_andamento'
      and finalizado_em is null
      and finalizado_por is null
  ) then
    perform pg_temp.falhar('salvamento seguro não persistiu somente o rascunho');
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 5) Isolamento: médico B, proprietária e recepção não abrem o conteúdo.
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.assumir_usuario('b1000000-0000-4000-8000-000000000002');

do $$
begin
  begin
    perform public.abrir_prontuario(current_setting('test.atendimento_id')::uuid);
    perform pg_temp.falhar('médico de outra clínica abriu o prontuário');
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.salvar_rascunho_atendimento(
      current_setting('test.atendimento_id')::uuid,
      'Ataque', null, null, null, null, null, null
    );
    perform pg_temp.falhar('médico de outra clínica escreveu no prontuário');
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select pg_temp.assumir_usuario('c1000000-0000-4000-8000-000000000003');

do $$
begin
  begin
    perform public.abrir_prontuario(current_setting('test.atendimento_id')::uuid);
    perform pg_temp.falhar('proprietária abriu conteúdo clínico');
  exception when insufficient_privilege then
    null;
  end;

  if (select count(*) from public.auditoria_leitura_clinica
      where atendimento_id = current_setting('test.atendimento_id')::uuid) <> 1 then
    perform pg_temp.falhar('proprietária não leu o log de auditoria permitido');
  end if;
end;
$$;

select pg_temp.assumir_usuario('d1000000-0000-4000-8000-000000000004');

do $$
begin
  begin
    perform public.abrir_prontuario(current_setting('test.atendimento_id')::uuid);
    perform pg_temp.falhar('recepção abriu conteúdo clínico');
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- ------------------------------------------------------------
-- 6) Finalização atômica, imutabilidade, adendo e documento.
-- ------------------------------------------------------------
select pg_temp.assumir_usuario('a1000000-0000-4000-8000-000000000001');

do $$
declare
  v_id uuid := current_setting('test.atendimento_id')::uuid;
  v_adendo jsonb;
  v_documento jsonb;
begin
  begin
    perform public.adicionar_adendo_prontuario(v_id, 'Adendo antes da finalização');
    perform pg_temp.falhar('atendimento em andamento aceitou adendo');
  exception when insufficient_privilege then
    null;
  end;

  perform public.finalizar_atendimento_seguro(
    v_id, 'Queixa final', 'Anamnese final', 'Exame final',
    'Hipótese final', 'Z00.0', 'Conduta final', 'Prescrição final'
  );

  begin
    perform public.salvar_rascunho_atendimento(
      v_id, 'Rasura', null, null, null, null, null, null
    );
    perform pg_temp.falhar('atendimento finalizado aceitou novo rascunho');
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.finalizar_atendimento_seguro(
      v_id, 'Segunda finalização', null, null, null, null, null, null
    );
    perform pg_temp.falhar('atendimento aceitou segunda finalização');
  exception when insufficient_privilege then
    null;
  end;

  v_adendo := public.adicionar_adendo_prontuario(v_id, 'Correção por adendo');
  if v_adendo ->> 'texto' <> 'Correção por adendo' then
    perform pg_temp.falhar('RPC de adendo retornou conteúdo incorreto');
  end if;

  v_documento := public.criar_documento_prontuario(
    v_id, 'receita', 'Documento clínico de teste'
  );
  if v_documento ->> 'conteudo' <> 'Documento clínico de teste' then
    perform pg_temp.falhar('RPC de documento retornou conteúdo incorreto');
  end if;

  begin
    perform texto from public.atendimentos_adendos where atendimento_id = v_id;
    perform pg_temp.falhar('adendos foram lidos diretamente');
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform conteudo from public.documentos_clinicos where atendimento_id = v_id;
    perform pg_temp.falhar('documentos foram lidos diretamente');
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.atendimentos set queixa_principal = 'Rasura direta' where id = v_id;
    perform pg_temp.falhar('authenticated atualizou atendimento diretamente');
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;

do $$
declare
  v_id uuid := current_setting('test.atendimento_id')::uuid;
begin
  if not exists (
    select 1 from public.atendimentos
    where id = v_id
      and status = 'finalizado'
      and queixa_principal = 'Queixa final'
      and finalizado_em is not null
      and finalizado_por = 'a1000000-0000-4000-8000-000000000001'
  ) then
    perform pg_temp.falhar('finalização não persistiu conteúdo e assinatura atomicamente');
  end if;

  begin
    update public.atendimentos set queixa_principal = 'Rasura do dono' where id = v_id;
    perform pg_temp.falhar('trigger permitiu alteração de atendimento finalizado');
  exception when raise_exception then
    if sqlerrm like 'TESTE FALHOU:%' then
      raise;
    end if;
  end;

  begin
    insert into public.atendimentos (
      clinica_id, paciente_id, profissional_id, created_by
    ) values (
      'a2000000-0000-4000-8000-000000000001',
      'b3000000-0000-4000-8000-000000000002',
      'a4000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001'
    );
    perform pg_temp.falhar('trigger aceitou paciente de outra clínica');
  exception when check_violation then
    null;
  end;
end;
$$;

set local role authenticated;
select pg_temp.assumir_usuario('a1000000-0000-4000-8000-000000000001');

do $$
begin
  perform set_config('search_path', 'pg_temp, public', true);
  if (select count(*) from public.listar_atendimentos_prontuario(
        'a2000000-0000-4000-8000-000000000001'
      )) <> 1 then
    perform pg_temp.falhar('search_path da sessão alterou o resultado da RPC');
  end if;
end;
$$;

reset role;

-- ------------------------------------------------------------
-- 7) Configuração SECURITY DEFINER e search_path.
-- ------------------------------------------------------------
do $$
declare
  v_inseguras integer;
begin
  select count(*) into v_inseguras
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'listar_atendimentos_prontuario',
      'abrir_prontuario',
      'iniciar_atendimento_avulso',
      'iniciar_atendimento_agendado',
      'salvar_rascunho_atendimento',
      'finalizar_atendimento_seguro',
      'adicionar_adendo_prontuario',
      'criar_documento_prontuario',
      'pode_ler_auditoria_atendimento'
    )
    and (
      not p.prosecdef
      or p.proconfig is null
      or not ('search_path=pg_catalog' = any (p.proconfig))
    );

  if v_inseguras <> 0 then
    perform pg_temp.falhar('há função SECURITY DEFINER sem search_path fixo');
  end if;
end;
$$;

-- Nenhuma fixture ou escrita de teste sobrevive.
rollback;
