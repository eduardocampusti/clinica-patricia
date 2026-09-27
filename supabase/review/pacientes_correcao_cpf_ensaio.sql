-- ENSAIO SINTÉTICO. Executar em transação e rolar (ROLLBACK) ao final.
-- Pressupõe que pacientes_correcao_cpf_com_motivo.sql já foi aplicado NA MESMA
-- transação de ensaio (ou instalado antes em ambiente descartável).
-- Cobre os 18 critérios de aceite listados em
-- docs/modulos/pacientes/07-PLANO-IMPLEMENTACAO.md §6.

begin;

-- Usuários e clínicas sintéticas.
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000009501'),
 ('00000000-0000-4000-8000-000000009502'),
 ('00000000-0000-4000-8000-000000009503');
insert into public.usuarios(id,nome_completo) values
 ('00000000-0000-4000-8000-000000009501','Proprietária Ensaio CPF'),
 ('00000000-0000-4000-8000-000000009502','Recepção Ensaio CPF'),
 ('00000000-0000-4000-8000-000000009503','Médica Ensaio CPF')
 on conflict(id) do nothing;
insert into public.clinicas(id,nome,cidade,subdomain) values
 ('00000000-0000-4000-8000-000000009601','Ensaio CPF A','Sintética','ensaio-cpf-9601'),
 ('00000000-0000-4000-8000-000000009602','Ensaio CPF B','Sintética','ensaio-cpf-9602');
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel) values
 ('00000000-0000-4000-8000-000000009501','00000000-0000-4000-8000-000000009601','proprietaria'),
 ('00000000-0000-4000-8000-000000009501','00000000-0000-4000-8000-000000009602','proprietaria'),
 ('00000000-0000-4000-8000-000000009502','00000000-0000-4000-8000-000000009601','recepcao'),
 ('00000000-0000-4000-8000-000000009503','00000000-0000-4000-8000-000000009601','medico');

-- Pacientes com CPF já preenchido. Usa CPFs sintéticos válidos.
-- CPFs de teste: 39053344705 (A), 11144477735 (B), 62289365003 (livre para correção).
insert into public.pacientes(id,clinica_id,nome_completo,
                             cpf_encrypted,cpf_hash) values
 ('00000000-0000-4000-8000-000000009701',
  '00000000-0000-4000-8000-000000009601',
  'Paciente Ensaio A',
  public.cpf_encrypt('39053344705'),
  public.cpf_hash('39053344705')),
 ('00000000-0000-4000-8000-000000009702',
  '00000000-0000-4000-8000-000000009601',
  'Paciente Ensaio B',
  public.cpf_encrypt('11144477735'),
  public.cpf_hash('11144477735')),
 ('00000000-0000-4000-8000-000000009703',
  '00000000-0000-4000-8000-000000009602',
  'Paciente Ensaio Ipupiara',
  public.cpf_encrypt('39053344705'),
  public.cpf_hash('39053344705')),
 ('00000000-0000-4000-8000-000000009704',
  '00000000-0000-4000-8000-000000009601',
  'Paciente sem CPF',
  null, null);

set local role authenticated;

-- Núcleo do ensaio.
do $$
declare
  p_a uuid := '00000000-0000-4000-8000-000000009701';
  p_b uuid := '00000000-0000-4000-8000-000000009702';
  p_ipu uuid := '00000000-0000-4000-8000-000000009703';
  p_sem uuid := '00000000-0000-4000-8000-000000009704';
  c_a uuid := '00000000-0000-4000-8000-000000009601';
  c_b uuid := '00000000-0000-4000-8000-000000009602';
  rev timestamptz;
  hash_antes text;
  hash_depois text;
  motivo_ok text := 'Paciente solicitou correção; documento apresentado hoje.';
begin
  -- Sessão: recepção da clínica A.
  perform set_config('request.jwt.claim.sub',
                     '00000000-0000-4000-8000-000000009502', true);

  select updated_at, cpf_hash into rev, hash_antes
    from public.pacientes where id = p_a;

  -- 1. Recepção corrige CPF de paciente A com motivo válido.
  perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                       '62289365003', motivo_ok);
  select cpf_hash into hash_depois from public.pacientes where id = p_a;
  if hash_depois is not distinct from hash_antes then
    raise exception '1: hash não mudou'; end if;
  -- Auditoria: última linha do paciente com motivo preenchido e antes<>depois.
  if not exists (
    select 1 from public.auditoria a
    where a.entidade = 'pacientes' and a.entidade_id::uuid = p_a
      and a.acao::text = 'UPDATE'
      and a.motivo = motivo_ok
      and (a.dados_antes->>'cpf_hash')
          is distinct from (a.dados_depois->>'cpf_hash')
  ) then raise exception '1: auditoria sem motivo ou sem diff de cpf_hash'; end if;

  -- Após a correção, atualiza rev.
  select updated_at into rev from public.pacientes where id = p_a;

  -- 8a. Motivo curto → 22023.
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                         '52998224725', 'curto');
    raise exception '8a: motivo curto aceito';
  exception when invalid_parameter_value then null; end;

  -- 8b. Motivo só whitespace → 22023.
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                         '52998224725', repeat(' ', 40));
    raise exception '8b: motivo whitespace aceito';
  exception when invalid_parameter_value then null; end;

  -- 8c. Motivo maior que 500 → 22023.
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                         '52998224725', repeat('a', 501));
    raise exception '8c: motivo longo aceito';
  exception when invalid_parameter_value then null; end;

  -- 9. CPF inválido → 22023.
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                         '11111111111', motivo_ok);
    raise exception '9: CPF inválido aceito';
  exception when invalid_parameter_value then null; end;

  -- 10. Mesmo CPF (idempotente) → 22023 "nenhuma alteração solicitada".
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                         '62289365003', motivo_ok);
    raise exception '10: noop aceito';
  exception when invalid_parameter_value then null; end;

  -- 11. updated_at divergente → PT409.
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a,
                                         rev - interval '1 second',
                                         '52998224725', motivo_ok);
    raise exception '11: conflito otimista aceito';
  exception when sqlstate 'PT409' then null; end;

  -- 12. CPF em uso por outro paciente ativo da mesma clínica → 23505.
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                         '11144477735', motivo_ok);
    raise exception '12: unicidade da clínica ignorada';
  exception when unique_violation then null; end;

  -- 13. Mesmo CPF em clínica diferente continua aceito. Não escreve nada
  -- porque quem faria a colisão está em outra clínica.
  perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                       '39053344705', motivo_ok);

  -- 14. Cadastro sem CPF → P0001 (usar paciente_definir_cpf).
  select updated_at into rev from public.pacientes where id = p_sem;
  begin
    perform public.paciente_corrigir_cpf(p_sem, c_a, rev,
                                         '52998224725', motivo_ok);
    raise exception '14: cadastro sem CPF aceito na correção';
  exception when raise_exception then null; end;

  -- 15. Retorno é void. Uma seleção contra qualquer campo de CPF neste
  -- ensaio nunca partiu da RPC, apenas do banco local, portanto está OK.

  -- 5. Recepção de A tenta corrigir paciente da clínica B → 42501.
  select updated_at into rev from public.pacientes where id = p_ipu;
  begin
    perform public.paciente_corrigir_cpf(p_ipu, c_b, rev,
                                         '52998224725', motivo_ok);
    raise exception '5: cruzamento entre clínicas aceito';
  exception when insufficient_privilege then null; end;

  -- 3. Médico → 42501.
  perform set_config('request.jwt.claim.sub',
                     '00000000-0000-4000-8000-000000009503', true);
  select updated_at into rev from public.pacientes where id = p_a;
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                         '52998224725', motivo_ok);
    raise exception '3: médico autorizado';
  exception when insufficient_privilege then null; end;

  -- 2. Proprietária corrige com sucesso.
  perform set_config('request.jwt.claim.sub',
                     '00000000-0000-4000-8000-000000009501', true);
  perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                       '52998224725', motivo_ok);

  -- 6. clinica_ativa() distinta de p_clinica_id → 42501.
  select updated_at into rev from public.pacientes where id = p_a;
  perform set_config('app.clinica_ativa',
                     '00000000-0000-4000-8000-000000009602', true);
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                         '39053344705', motivo_ok);
    raise exception '6: contexto divergente aceito';
  exception when insufficient_privilege then null; end;
  perform set_config('app.clinica_ativa', '', true);

  -- 7. Clínica inativa → 42501.
  update public.clinicas set ativo = false where id = c_a;
  select updated_at into rev from public.pacientes where id = p_a;
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                         '39053344705', motivo_ok);
    raise exception '7: clínica inativa aceita';
  exception when insufficient_privilege then null; end;
  update public.clinicas set ativo = true where id = c_a;

  -- 18. paciente_cpf_disponivel:
  --  - disponível para CPF novo válido;
  --  - indisponível para CPF já em uso por outro paciente (Paciente B);
  --  - "livre" para o mesmo paciente conservando o próprio CPF (excluir_id);
  --  - médico → 42501.
  perform set_config('request.jwt.claim.sub',
                     '00000000-0000-4000-8000-000000009502', true);
  if not public.paciente_cpf_disponivel(c_a, p_a, '80403602004') then
    raise exception '18a: CPF novo válido marcado indisponível'; end if;
  if public.paciente_cpf_disponivel(c_a, p_a, '11144477735') then
    raise exception '18b: CPF em uso marcado disponível'; end if;
  -- Próprio CPF do paciente é considerado disponível (excluir_id o filtra).
  if not public.paciente_cpf_disponivel(c_a, p_a, '52998224725') then
    raise exception '18b2: próprio CPF marcado indisponível'; end if;
  -- Formato inválido → false, sem raise.
  if public.paciente_cpf_disponivel(c_a, p_a, '11111111111') then
    raise exception '18b3: CPF inválido aceito como disponível'; end if;
  perform set_config('request.jwt.claim.sub',
                     '00000000-0000-4000-8000-000000009503', true);
  begin
    perform public.paciente_cpf_disponivel(c_a, p_a, '80403602004');
    raise exception '18c: médico autorizado';
  exception when insufficient_privilege then null; end;

  -- 4. Anon → 42501.
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.paciente_corrigir_cpf(p_a, c_a, rev,
                                         '39053344705', motivo_ok);
    raise exception '4: anônimo autorizado';
  exception when insufficient_privilege then null; end;
end $$;

reset role;

-- 16 e 17. Trigger continua funcionando sem GUC.
--   - INSERT/UPDATE em outra entidade sem set_config → motivo NULL, sem erro.
do $$
declare v_id uuid;
begin
  insert into public.clinicas(id, nome, cidade, subdomain) values
    ('00000000-0000-4000-8000-000000009605',
     'Ensaio CPF C', 'Sintética', 'ensaio-cpf-9605')
    returning id into v_id;
  update public.clinicas set nome = 'Ensaio CPF C (renomeada)' where id = v_id;
  delete from public.clinicas where id = v_id;
  if not exists (
    select 1 from public.auditoria a
    where a.entidade = 'clinicas' and a.entidade_id::uuid = v_id
      and a.motivo is null
  ) then
    raise exception '16/17: auditoria de clínica quebrou sem GUC';
  end if;
end $$;

-- Anon não pode invocar as RPCs novas.
do $$ begin
 if has_function_privilege(
     'anon',
     'public.paciente_corrigir_cpf(uuid,uuid,timestamptz,text,text)',
     'execute') then
   raise exception 'anon autorizado em paciente_corrigir_cpf'; end if;
 if has_function_privilege(
     'anon',
     'public.paciente_cpf_disponivel(uuid,uuid,text)',
     'execute') then
   raise exception 'anon autorizado em paciente_cpf_disponivel'; end if;
end $$;

rollback;

-- Confirmação de limpeza: nenhum ID sintético permanece.
select
  not exists (select 1 from public.pacientes where id in (
    '00000000-0000-4000-8000-000000009701',
    '00000000-0000-4000-8000-000000009702',
    '00000000-0000-4000-8000-000000009703',
    '00000000-0000-4000-8000-000000009704'))
  and not exists (select 1 from auth.users where id in (
    '00000000-0000-4000-8000-000000009501',
    '00000000-0000-4000-8000-000000009502',
    '00000000-0000-4000-8000-000000009503'))
  and not exists (select 1 from public.clinicas where id in (
    '00000000-0000-4000-8000-000000009601',
    '00000000-0000-4000-8000-000000009602',
    '00000000-0000-4000-8000-000000009605'))
  as rollback_limpo;
