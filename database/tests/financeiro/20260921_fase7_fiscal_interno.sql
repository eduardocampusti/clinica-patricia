-- FASE 7 — testes transacionais da fundacao e workflow fiscal interno.
-- NAO EXECUTADO nesta tarefa. Executar somente em ambiente descartavel/staging.
-- O bloco usa a RPC real da FASE 3 quando encontra um agendamento elegivel e
-- termina sempre com ROLLBACK. Nenhum provedor externo e utilizado.

begin;

do $$
declare
  v_usuario_id uuid;
  v_agendamento_id uuid;
  v_clinica_id uuid;
  v_valor numeric(12,2);
  v_result jsonb;
  v_recebimento_id uuid;
  v_documento_id uuid;
  v_tentativa_a uuid;
  v_tentativa_b uuid;
  v_cancelamento_a uuid;
  v_cancelamento_b uuid;
  v_status text;
  v_auditoria_antes bigint;
  v_auditoria_depois bigint;
  v_tentativas_ativas bigint;
  v_erro_esperado boolean;
begin
  -- Compatibilidade FASE 3: a chamada abaixo e a mesma RPC de producao.
  select a.id, a.clinica_id, pc.valor_consulta, uc.usuario_id
    into v_agendamento_id, v_clinica_id, v_valor, v_usuario_id
  from public.agendamentos a
  join public.usuarios_clinicas uc
    on uc.clinica_id = a.clinica_id
   and uc.ativo
   and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario)
  join public.profissionais_clinicas pc
    on pc.clinica_id = a.clinica_id
   and pc.profissional_id = a.profissional_id
   and pc.ativo
  join public.sessoes_caixa sc
    on sc.clinica_id = a.clinica_id
   and sc.status = 'aberto'::public.status_sessao_caixa
  where a.status in (
    'agendado'::public.status_agendamento,
    'confirmado'::public.status_agendamento,
    'aguardando'::public.status_agendamento
  )
    and not exists (
      select 1 from public.recebimentos r where r.agendamento_id = a.id
    )
  limit 1;

  if v_agendamento_id is null then
    raise notice 'FASE 7: teste de integracao pulado; nao ha fixture elegivel.';
  else
    perform pg_catalog.set_config('request.jwt.claim.sub', v_usuario_id::text, true);

    v_result := public.financeiro_registrar_recebimento(
      v_agendamento_id,
      pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('forma_pagamento', 'dinheiro', 'valor', v_valor)
      ),
      'fase7-compat-' || pg_catalog.gen_random_uuid()::text
    );

    if v_result->>'status' <> 'confirmado' or v_result->>'status_fiscal' <> 'pendente' then
      raise exception 'Compatibilidade FASE 3 falhou: retorno inesperado %', v_result;
    end if;

    v_recebimento_id := (v_result->>'recebimento_id')::uuid;
    select df.id, df.status into v_documento_id, v_status
    from public.documentos_fiscais df
    where df.recebimento_id = v_recebimento_id;
    if v_documento_id is null or v_status <> 'pendente' then
      raise exception 'Compatibilidade FASE 3 falhou: documento fiscal nao ficou pendente.';
    end if;

    perform 1 from public.documentos_fiscais
    where id = v_documento_id
      and metadata_provider = '{}'::jsonb
      and updated_at is not null;
    if not found then
      raise exception 'Compatibilidade FASE 3 falhou: defaults da FASE 7 ausentes.';
    end if;

    -- Emissao: primeira solicitacao e idempotencia/concorrencia logica.
    v_result := public.financeiro_solicitar_emissao_fiscal(v_documento_id, 'fase7-emissao-a');
    v_tentativa_a := (v_result->>'tentativa_id')::uuid;
    if v_result->>'status' <> 'emissao_solicitada' or v_tentativa_a is null then
      raise exception 'Solicitacao de emissao A falhou: %', v_result;
    end if;

    v_erro_esperado := false;
    begin
      perform public.financeiro_solicitar_emissao_fiscal(v_documento_id, 'fase7-emissao-outra-chave');
    exception when sqlstate '22023' then
      v_erro_esperado := true;
    end;
    if not v_erro_esperado then
      raise exception 'Duas tentativas de emissao ativas foram aceitas.';
    end if;
    select count(*) into v_tentativas_ativas
    from public.tentativas_documento_fiscal
    where documento_fiscal_id = v_documento_id
      and tipo = 'emissao'
      and status in ('solicitada', 'processando');
    if v_tentativas_ativas <> 1 then
      raise exception 'Esperada uma unica tentativa de emissao ativa, obtido %', v_tentativas_ativas;
    end if;

    -- Tentativa A falha e o retry B nasce em nova linha.
    perform private.financeiro_registrar_resultado_emissao_fiscal(
      v_documento_id, v_tentativa_a, false, 'teste-interno', null, null, null, null,
      null, 'id-a', 'timeout', '{}'::jsonb, '{"codigo":"timeout"}'::jsonb
    );
    select status into v_status from public.documentos_fiscais where id = v_documento_id;
    if v_status <> 'erro_emissao' then
      raise exception 'Tentativa A deveria deixar documento em erro_emissao, obtido %', v_status;
    end if;

    v_result := public.financeiro_solicitar_emissao_fiscal(v_documento_id, 'fase7-emissao-b');
    v_tentativa_b := (v_result->>'tentativa_id')::uuid;
    if v_tentativa_b is null or v_tentativa_b = v_tentativa_a then
      raise exception 'Retry de emissao nao criou nova tentativa.';
    end if;

    -- Callback stale de A nao pode emitir o documento enquanto B esta ativa.
    v_erro_esperado := false;
    begin
      perform private.financeiro_registrar_resultado_emissao_fiscal(
        v_documento_id, v_tentativa_a, true, 'teste-interno', 'NF-A', '1', null, null,
        null, 'id-a', null, '{}'::jsonb, '{"codigo":"late-a"}'::jsonb
      );
    exception when sqlstate '40001' then
      v_erro_esperado := true;
    end;
    if not v_erro_esperado then
      raise exception 'Callback stale da tentativa A foi aceito.';
    end if;
    select status into v_status from public.documentos_fiscais where id = v_documento_id;
    if v_status <> 'emissao_solicitada' then
      raise exception 'Callback stale alterou o documento para %', v_status;
    end if;

    -- Callback B bem-sucedido e repeticao identica sem nova auditoria.
    perform private.financeiro_registrar_resultado_emissao_fiscal(
      v_documento_id, v_tentativa_b, true, 'teste-interno', 'NF-B', '1', 'COD-B', 'CH-B',
      'https://invalid.local/nf-b', 'id-b', null, '{}'::jsonb, '{"codigo":"ok-b"}'::jsonb
    );
    select count(*) into v_auditoria_antes
    from public.eventos_auditoria_financeira
    where entidade = 'documento_fiscal'
      and entidade_id = v_documento_id
      and acao = 'emitir_documento_fiscal';
    perform private.financeiro_registrar_resultado_emissao_fiscal(
      v_documento_id, v_tentativa_b, true, 'teste-interno', 'NF-B', '1', 'COD-B', 'CH-B',
      'https://invalid.local/nf-b', 'id-b', null, '{}'::jsonb, '{"codigo":"ok-b"}'::jsonb
    );
    select count(*) into v_auditoria_depois
    from public.eventos_auditoria_financeira
    where entidade = 'documento_fiscal'
      and entidade_id = v_documento_id
      and acao = 'emitir_documento_fiscal';
    if v_auditoria_depois <> v_auditoria_antes then
      raise exception 'Callback duplicado criou auditoria adicional.';
    end if;

    -- Resultado conflitante para tentativa finalizada deve falhar.
    v_erro_esperado := false;
    begin
      perform private.financeiro_registrar_resultado_emissao_fiscal(
        v_documento_id, v_tentativa_b, false, 'teste-interno', null, null, null, null,
        null, 'erro-conflitante', null, '{}'::jsonb, '{"codigo":"conflito"}'::jsonb
      );
    exception when sqlstate '40001' then
      v_erro_esperado := true;
    end;
    if not v_erro_esperado then
      raise exception 'Resultado conflitante de emissao foi aceito.';
    end if;

    -- Cancelamento: mesma protecao para erro, retry, stale e duplicidade.
    v_result := public.financeiro_solicitar_cancelamento_fiscal(
      v_documento_id, 'teste de cancelamento', 'fase7-cancelamento-a'
    );
    v_cancelamento_a := (v_result->>'tentativa_id')::uuid;
    if v_cancelamento_a is null or v_result->>'status' <> 'cancelamento_solicitado' then
      raise exception 'Solicitacao de cancelamento A falhou: %', v_result;
    end if;
    v_erro_esperado := false;
    begin
      perform public.financeiro_solicitar_cancelamento_fiscal(
        v_documento_id, 'segunda solicitacao ativa', 'fase7-cancelamento-outra-chave'
      );
    exception when sqlstate '22023' then
      v_erro_esperado := true;
    end;
    if not v_erro_esperado then
      raise exception 'Duas tentativas de cancelamento ativas foram aceitas.';
    end if;

    perform private.financeiro_registrar_resultado_cancelamento_fiscal(
      v_documento_id, v_cancelamento_a, false, 'teste-interno', 'cancel-a',
      'timeout', '{}'::jsonb, '{"codigo":"timeout-cancel"}'::jsonb
    );
    v_result := public.financeiro_solicitar_cancelamento_fiscal(
      v_documento_id, 'retry de cancelamento', 'fase7-cancelamento-b'
    );
    v_cancelamento_b := (v_result->>'tentativa_id')::uuid;
    if v_cancelamento_b is null or v_cancelamento_b = v_cancelamento_a then
      raise exception 'Retry de cancelamento nao criou nova tentativa.';
    end if;

    v_erro_esperado := false;
    begin
      perform private.financeiro_registrar_resultado_cancelamento_fiscal(
        v_documento_id, v_cancelamento_a, true, 'teste-interno', 'cancel-a-ok', null,
        '{}'::jsonb, '{"codigo":"late-cancel-a"}'::jsonb
      );
    exception when sqlstate '40001' then
      v_erro_esperado := true;
    end;
    if not v_erro_esperado then
      raise exception 'Callback stale de cancelamento A foi aceito.';
    end if;

    perform private.financeiro_registrar_resultado_cancelamento_fiscal(
      v_documento_id, v_cancelamento_b, true, 'teste-interno', 'cancel-b', null,
      '{}'::jsonb, '{"codigo":"ok-cancel-b"}'::jsonb
    );
    select status into v_status from public.documentos_fiscais where id = v_documento_id;
    if v_status <> 'cancelada' then
      raise exception 'Cancelamento B deveria deixar documento cancelada, obtido %', v_status;
    end if;
    perform private.financeiro_registrar_resultado_cancelamento_fiscal(
      v_documento_id, v_cancelamento_b, true, 'teste-interno', 'cancel-b', null,
      '{}'::jsonb, '{"codigo":"ok-cancel-b"}'::jsonb
    );
  end if;
end;
$$;

rollback;
