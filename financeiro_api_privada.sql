-- ============================================================================
-- Financeiro — fronteira privada Fastify -> PostgreSQL (NÃO EXECUTADO)
--
-- Pré-requisito: financeiro_fundacao.sql aplicado em LOCAL/STAGING.
-- O valor da chave HMAC NÃO aparece neste arquivo. Ele deve existir no Vault
-- com o nome financeiro_assertion_hmac_v1 e no Fastify somente por variável
-- de ambiente. A senha de financeiro_api também é configurada fora da migration.
-- ============================================================================

begin;

do $preflight$
begin
  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'FINANCEIRO_PREFLIGHT: Supabase Vault/vault.decrypted_secrets indisponível';
  end if;
  if to_regprocedure('extensions.hmac(bytea,bytea,text)') is null then
    raise exception 'FINANCEIRO_PREFLIGHT: extensions.hmac(bytea,bytea,text) não encontrado; confirmar schema do pgcrypto';
  end if;
  if to_regclass('public.financeiro_idempotencia') is null
     or to_regclass('public.cobrancas') is null
     or to_regclass('public.repasses') is null then
    raise exception 'FINANCEIRO_PREFLIGHT: financeiro_fundacao.sql não aplicado';
  end if;
  if to_regprocedure('auth.uid()') is null then
    raise exception 'FINANCEIRO_PREFLIGHT: auth.uid() ausente';
  end if;
end
$preflight$;

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'financeiro_api') then
    create role financeiro_api login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password null;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'financeiro_executor') then
    create role financeiro_executor nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'financeiro_vault_guard') then
    create role financeiro_vault_guard nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end
$roles$;

do $grant_connect$
begin
  execute format('revoke all on database %I from financeiro_api', current_database());
  execute format('grant connect on database %I to financeiro_api', current_database());
end
$grant_connect$;

create schema if not exists financeiro_privado authorization financeiro_executor;
revoke all on schema financeiro_privado from public, anon, authenticated, service_role;
grant usage on schema financeiro_privado to financeiro_api;

create or replace function financeiro_privado.validar_assercao(
  p_assercao_texto text,
  p_assinatura_hex text,
  p_operacao_esperada text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_assercao jsonb;
  v_segredo text;
  v_assinatura bytea;
  v_agora bigint := extract(epoch from clock_timestamp())::bigint;
begin
  if session_user <> 'financeiro_api' then
    raise exception 'FINANCEIRO_SEM_PERMISSAO: chamador técnico inválido' using errcode = '42501';
  end if;
  if p_assinatura_hex !~ '^[a-f0-9]{64}$' then
    raise exception 'FINANCEIRO_VALIDACAO: assinatura inválida';
  end if;

  begin
    v_assercao := p_assercao_texto::jsonb;
  exception when others then
    raise exception 'FINANCEIRO_VALIDACAO: asserção não é JSON válido';
  end;

  if v_assercao->>'kid' <> 'financeiro-hmac-v1' then
    raise exception 'FINANCEIRO_VALIDACAO: identificador de chave não aceito';
  end if;

  select ds.decrypted_secret into v_segredo
  from vault.decrypted_secrets ds
  where ds.name = 'financeiro_assertion_hmac_v1';

  if v_segredo is null then
    raise exception 'FINANCEIRO_CONFIGURACAO: chave HMAC ausente no Vault';
  end if;

  v_assinatura := extensions.hmac(
    convert_to(p_assercao_texto, 'UTF8'),
    convert_to(v_segredo, 'UTF8'),
    'sha256'
  );
  if v_assinatura <> decode(lower(p_assinatura_hex), 'hex') then
    raise exception 'FINANCEIRO_SEM_PERMISSAO: assinatura HMAC inválida' using errcode = '42501';
  end if;

  if (v_assercao->>'v')::int <> 1
     or v_assercao->>'operacao' <> p_operacao_esperada
     or (v_assercao->>'iat')::bigint > v_agora + 5
     or (v_assercao->>'exp')::bigint < v_agora
     or (v_assercao->>'exp')::bigint - (v_assercao->>'iat')::bigint > 35
     or coalesce(v_assercao->>'request_hash', '') !~ '^[a-f0-9]{64}$'
     or length(coalesce(v_assercao->>'idempotency_key', '')) not between 16 and 128
     or jsonb_typeof(v_assercao->'payload') <> 'object' then
    raise exception 'FINANCEIRO_VALIDACAO: conteúdo ou validade da asserção inválidos';
  end if;

  perform (v_assercao->>'sub')::uuid;
  perform (v_assercao->>'clinica_id')::uuid;
  perform (v_assercao->>'jti')::uuid;
  return v_assercao;
exception
  when invalid_text_representation then
    raise exception 'FINANCEIRO_VALIDACAO: identificador inválido na asserção';
end
$function$;

alter function financeiro_privado.validar_assercao(text, text, text) owner to financeiro_vault_guard;
revoke all on function financeiro_privado.validar_assercao(text, text, text) from public, anon, authenticated, service_role, financeiro_api;
grant execute on function financeiro_privado.validar_assercao(text, text, text) to financeiro_executor;
revoke all on vault.decrypted_secrets from public, anon, authenticated, financeiro_api, financeiro_executor;
grant select on vault.decrypted_secrets to financeiro_vault_guard;
grant usage on schema financeiro_privado, vault, extensions to financeiro_vault_guard;
grant execute on function extensions.hmac(bytea,bytea,text) to financeiro_vault_guard;

create or replace function financeiro_privado.preparar_comando(
  p_assercao_texto text,
  p_assinatura_hex text,
  p_operacao text,
  p_somente_proprietaria boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_a jsonb;
  v_usuario uuid;
  v_clinica uuid;
begin
  v_a := financeiro_privado.validar_assercao(p_assercao_texto, p_assinatura_hex, p_operacao);
  v_usuario := (v_a->>'sub')::uuid;
  v_clinica := (v_a->>'clinica_id')::uuid;

  if not exists (select 1 from public.usuarios u where u.id = v_usuario and u.ativo) then
    raise exception 'FINANCEIRO_SEM_PERMISSAO: usuário inativo' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.usuarios_clinicas uc
    where uc.usuario_id = v_usuario and uc.clinica_id = v_clinica and uc.ativo
      and ((p_somente_proprietaria and uc.papel = 'proprietaria')
        or (not p_somente_proprietaria and uc.papel in ('proprietaria', 'recepcao')))
  ) then
    raise exception 'FINANCEIRO_SEM_PERMISSAO: papel sem autorização' using errcode = '42501';
  end if;

  -- O contexto é definido somente depois da assinatura e autorização. O
  -- comportamento exato de fn_auditoria/auth.uid deve ser comprovado no preflight.
  perform set_config('request.jwt.claim.sub', v_usuario::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  perform set_config('app.clinica_ativa', v_clinica::text, true);
  return v_a;
end
$function$;

create or replace function financeiro_privado.iniciar_idempotencia(p_a jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_id uuid;
  v_existente public.financeiro_idempotencia%rowtype;
begin
  insert into public.financeiro_idempotencia (
    clinica_id, usuario_id, operacao, chave, request_hash, jti
  ) values (
    (p_a->>'clinica_id')::uuid, (p_a->>'sub')::uuid, p_a->>'operacao',
    p_a->>'idempotency_key', p_a->>'request_hash', (p_a->>'jti')::uuid
  ) on conflict (clinica_id, operacao, chave) do nothing
  returning id into v_id;

  if v_id is not null then
    return jsonb_build_object('id', v_id, 'reutilizada', false);
  end if;

  select * into v_existente from public.financeiro_idempotencia
  where clinica_id = (p_a->>'clinica_id')::uuid
    and operacao = p_a->>'operacao'
    and chave = p_a->>'idempotency_key'
  for update;

  if v_existente.request_hash <> p_a->>'request_hash' then
    raise exception 'FINANCEIRO_CONFLITO: Idempotency-Key reutilizada com payload diferente' using errcode = '23505';
  end if;
  if v_existente.resposta is null then
    raise exception 'FINANCEIRO_CONFLITO: comando idempotente ainda em processamento';
  end if;
  return jsonb_build_object('id', v_existente.id, 'reutilizada', true, 'resposta', v_existente.resposta);
end
$function$;

create or replace function financeiro_privado.concluir_idempotencia(p_id uuid, p_resposta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  update public.financeiro_idempotencia
  set resposta = p_resposta, concluido_em = clock_timestamp()
  where id = p_id and resposta is null;
  if not found then raise exception 'FINANCEIRO_CONFLITO: idempotência não pôde ser concluída'; end if;
  return p_resposta;
end
$function$;

create or replace function financeiro_privado.validar_referencias_cobranca(
  p_clinica uuid, p_paciente uuid, p_profissional uuid, p_agendamento uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if not exists (select 1 from public.pacientes p where p.id = p_paciente and p.clinica_id = p_clinica and p.ativo) then
    raise exception 'FINANCEIRO_VALIDACAO: paciente não pertence à clínica';
  end if;
  if not exists (select 1 from public.profissionais_clinicas pc
    where pc.profissional_id = p_profissional and pc.clinica_id = p_clinica and pc.ativo) then
    raise exception 'FINANCEIRO_VALIDACAO: profissional não pertence à clínica';
  end if;
  if p_agendamento is not null and not exists (
    select 1 from public.agendamentos a where a.id = p_agendamento
      and a.clinica_id = p_clinica and a.paciente_id = p_paciente and a.profissional_id = p_profissional
  ) then
    raise exception 'FINANCEIRO_VALIDACAO: agendamento não corresponde à clínica/paciente/profissional';
  end if;
end
$function$;

create or replace function financeiro_privado.sessao_aberta(p_clinica uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare v_id uuid;
begin
  select sc.id into v_id from public.sessoes_caixa sc
  where sc.clinica_id = p_clinica and sc.status = 'aberto'
  for update;
  if v_id is null then raise exception 'FINANCEIRO_CONFLITO: nenhum caixa aberto para a clínica'; end if;
  return v_id;
end
$function$;

create or replace function financeiro_privado.abrir_caixa(p_assercao_texto text, p_assinatura_hex text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $function$
declare v_a jsonb; v_i jsonb; v_id uuid; v_p jsonb; v_resposta jsonb;
begin
  v_a := financeiro_privado.preparar_comando(p_assercao_texto, p_assinatura_hex, 'abrir_caixa');
  v_i := financeiro_privado.iniciar_idempotencia(v_a); if (v_i->>'reutilizada')::boolean then return v_i->'resposta'; end if;
  v_p := v_a->'payload';
  insert into public.sessoes_caixa (clinica_id, aberto_por, valor_abertura)
  values ((v_a->>'clinica_id')::uuid, (v_a->>'sub')::uuid, (v_p->>'valor_abertura')::numeric)
  returning id into v_id;
  v_resposta := jsonb_build_object('id', v_id, 'clinica_id', v_a->>'clinica_id', 'status', 'aberto');
  return financeiro_privado.concluir_idempotencia((v_i->>'id')::uuid, v_resposta);
end $function$;

create or replace function financeiro_privado.registrar_cobranca(p_assercao_texto text, p_assinatura_hex text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $function$
declare
  v_a jsonb; v_i jsonb; v_p jsonb; v_clinica uuid; v_usuario uuid; v_cobranca uuid;
  v_sessao uuid; v_pag jsonb; v_soma numeric(12,2) := 0; v_status public.status_cobranca_financeira;
  v_resposta jsonb;
begin
  v_a := financeiro_privado.preparar_comando(p_assercao_texto, p_assinatura_hex, 'registrar_cobranca');
  v_i := financeiro_privado.iniciar_idempotencia(v_a); if (v_i->>'reutilizada')::boolean then return v_i->'resposta'; end if;
  v_p := v_a->'payload'; v_clinica := (v_a->>'clinica_id')::uuid; v_usuario := (v_a->>'sub')::uuid;
  v_status := (v_p->>'status')::public.status_cobranca_financeira;
  perform financeiro_privado.validar_referencias_cobranca(v_clinica, (v_p->>'paciente_id')::uuid,
    (v_p->>'profissional_id')::uuid, nullif(v_p->>'agendamento_id', '')::uuid);

  if v_status = 'paga' then
    v_sessao := financeiro_privado.sessao_aberta(v_clinica);
    select coalesce(sum((item->>'valor')::numeric), 0) into v_soma from jsonb_array_elements(v_p->'pagamentos') item;
    if v_soma <> (v_p->>'valor_total')::numeric then raise exception 'FINANCEIRO_VALIDACAO: soma dos pagamentos difere do total'; end if;
  elsif jsonb_array_length(v_p->'pagamentos') <> 0 then
    raise exception 'FINANCEIRO_VALIDACAO: cobrança pendente/cortesia não aceita pagamento';
  end if;

  insert into public.cobrancas (clinica_id, paciente_id, profissional_id, agendamento_id,
    valor_total, status, origem, motivo_cortesia, numero_nota_fiscal, descricao, criada_por, paga_em)
  values (v_clinica, (v_p->>'paciente_id')::uuid, (v_p->>'profissional_id')::uuid,
    nullif(v_p->>'agendamento_id','')::uuid, (v_p->>'valor_total')::numeric, v_status,
    case when v_p->>'agendamento_id' is null then 'manual' else 'agenda' end,
    nullif(v_p->>'motivo_cortesia',''), nullif(v_p->>'numero_nota_fiscal',''), nullif(v_p->>'descricao',''),
    v_usuario, case when v_status = 'paga' then clock_timestamp() else null end)
  returning id into v_cobranca;

  if v_status = 'paga' then
    for v_pag in select value from jsonb_array_elements(v_p->'pagamentos') loop
      insert into public.entradas_caixa (sessao_caixa_id, clinica_id, forma_pagamento, valor,
        descricao, paciente_id, profissional_id, registrado_por, cobranca_id)
      values (v_sessao, v_clinica, (v_pag->>'forma_pagamento')::public.forma_pagamento_caixa,
        (v_pag->>'valor')::numeric, nullif(v_p->>'descricao',''), (v_p->>'paciente_id')::uuid,
        (v_p->>'profissional_id')::uuid, v_usuario, v_cobranca);
    end loop;
  end if;
  v_resposta := jsonb_build_object('id', v_cobranca, 'status', v_status, 'gera_receita', v_status = 'paga', 'gera_repasse', v_status = 'paga');
  return financeiro_privado.concluir_idempotencia((v_i->>'id')::uuid, v_resposta);
end $function$;

create or replace function financeiro_privado.receber_cobranca(p_assercao_texto text, p_assinatura_hex text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $function$
declare
  v_a jsonb; v_i jsonb; v_p jsonb; v_c public.cobrancas%rowtype; v_sessao uuid;
  v_pag jsonb; v_soma numeric(12,2); v_resposta jsonb;
begin
  v_a := financeiro_privado.preparar_comando(p_assercao_texto, p_assinatura_hex, 'receber_cobranca');
  v_i := financeiro_privado.iniciar_idempotencia(v_a); if (v_i->>'reutilizada')::boolean then return v_i->'resposta'; end if;
  v_p := v_a->'payload';
  select * into v_c from public.cobrancas where id = (v_p->>'cobranca_id')::uuid and clinica_id = (v_a->>'clinica_id')::uuid for update;
  if not found or v_c.status not in ('pendente','atrasada') then raise exception 'FINANCEIRO_CONFLITO: cobrança não está pendente'; end if;
  select coalesce(sum((item->>'valor')::numeric), 0) into v_soma from jsonb_array_elements(v_p->'pagamentos') item;
  if v_soma <> v_c.valor_total then raise exception 'FINANCEIRO_VALIDACAO: recebimento deve quitar integralmente a cobrança nesta fase'; end if;
  v_sessao := financeiro_privado.sessao_aberta(v_c.clinica_id);
  for v_pag in select value from jsonb_array_elements(v_p->'pagamentos') loop
    insert into public.entradas_caixa (sessao_caixa_id, clinica_id, forma_pagamento, valor, paciente_id,
      profissional_id, registrado_por, cobranca_id)
    values (v_sessao, v_c.clinica_id, (v_pag->>'forma_pagamento')::public.forma_pagamento_caixa,
      (v_pag->>'valor')::numeric, v_c.paciente_id, v_c.profissional_id, (v_a->>'sub')::uuid, v_c.id);
  end loop;
  update public.cobrancas set status = 'paga', paga_em = clock_timestamp() where id = v_c.id;
  v_resposta := jsonb_build_object('id', v_c.id, 'status', 'paga');
  return financeiro_privado.concluir_idempotencia((v_i->>'id')::uuid, v_resposta);
end $function$;

create or replace function financeiro_privado.registrar_despesa(p_assercao_texto text, p_assinatura_hex text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $function$
declare v_a jsonb; v_i jsonb; v_p jsonb; v_id uuid; v_status public.status_despesa_financeira; v_sessao uuid; v_resposta jsonb;
begin
  v_a := financeiro_privado.preparar_comando(p_assercao_texto, p_assinatura_hex, 'registrar_despesa');
  v_i := financeiro_privado.iniciar_idempotencia(v_a); if (v_i->>'reutilizada')::boolean then return v_i->'resposta'; end if;
  v_p := v_a->'payload'; v_status := (v_p->>'status')::public.status_despesa_financeira;
  if v_status = 'paga' and v_p->>'forma_pagamento' = 'dinheiro' then v_sessao := financeiro_privado.sessao_aberta((v_a->>'clinica_id')::uuid); end if;
  insert into public.despesas (clinica_id, categoria, descricao, valor, status, forma_pagamento,
    vencimento_em, pago_em, criada_por, paga_por)
  values ((v_a->>'clinica_id')::uuid, (v_p->>'categoria')::public.categoria_despesa_financeira,
    v_p->>'descricao', (v_p->>'valor')::numeric, v_status,
    nullif(v_p->>'forma_pagamento','')::public.forma_pagamento_caixa,
    nullif(v_p->>'vencimento_em','')::date,
    case when v_status = 'paga' then coalesce(nullif(v_p->>'pago_em','')::timestamptz, clock_timestamp()) end,
    (v_a->>'sub')::uuid, case when v_status = 'paga' then (v_a->>'sub')::uuid end)
  returning id into v_id;
  if v_sessao is not null then
    insert into public.movimentos_caixa (sessao_caixa_id, clinica_id, tipo, valor, motivo, despesa_id, registrado_por)
    values (v_sessao, (v_a->>'clinica_id')::uuid, 'despesa_dinheiro', (v_p->>'valor')::numeric, v_p->>'descricao', v_id, (v_a->>'sub')::uuid);
  end if;
  v_resposta := jsonb_build_object('id', v_id, 'status', v_status);
  return financeiro_privado.concluir_idempotencia((v_i->>'id')::uuid, v_resposta);
end $function$;

create or replace function financeiro_privado.pagar_despesa(p_assercao_texto text, p_assinatura_hex text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $function$
declare v_a jsonb; v_i jsonb; v_p jsonb; v_d public.despesas%rowtype; v_sessao uuid; v_resposta jsonb;
begin
  v_a := financeiro_privado.preparar_comando(p_assercao_texto, p_assinatura_hex, 'pagar_despesa');
  v_i := financeiro_privado.iniciar_idempotencia(v_a); if (v_i->>'reutilizada')::boolean then return v_i->'resposta'; end if;
  v_p := v_a->'payload';
  select * into v_d from public.despesas where id = (v_p->>'despesa_id')::uuid and clinica_id = (v_a->>'clinica_id')::uuid for update;
  if not found or v_d.status <> 'pendente' then raise exception 'FINANCEIRO_CONFLITO: despesa não está pendente'; end if;
  if v_p->>'forma_pagamento' = 'dinheiro' then v_sessao := financeiro_privado.sessao_aberta(v_d.clinica_id); end if;
  update public.despesas set status = 'paga', forma_pagamento = (v_p->>'forma_pagamento')::public.forma_pagamento_caixa,
    pago_em = coalesce(nullif(v_p->>'pago_em','')::timestamptz, clock_timestamp()), paga_por = (v_a->>'sub')::uuid where id = v_d.id;
  if v_sessao is not null then insert into public.movimentos_caixa (sessao_caixa_id, clinica_id, tipo, valor, motivo, despesa_id, registrado_por)
    values (v_sessao, v_d.clinica_id, 'despesa_dinheiro', v_d.valor, v_d.descricao, v_d.id, (v_a->>'sub')::uuid); end if;
  v_resposta := jsonb_build_object('id', v_d.id, 'status', 'paga');
  return financeiro_privado.concluir_idempotencia((v_i->>'id')::uuid, v_resposta);
end $function$;

create or replace function financeiro_privado.registrar_movimento_simples(p_assercao_texto text, p_assinatura_hex text, p_operacao text, p_tipo public.tipo_movimento_caixa)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $function$
declare v_a jsonb; v_i jsonb; v_p jsonb; v_id uuid; v_resposta jsonb;
begin
  v_a := financeiro_privado.preparar_comando(p_assercao_texto, p_assinatura_hex, p_operacao);
  v_i := financeiro_privado.iniciar_idempotencia(v_a); if (v_i->>'reutilizada')::boolean then return v_i->'resposta'; end if; v_p := v_a->'payload';
  insert into public.movimentos_caixa (sessao_caixa_id, clinica_id, tipo, valor, motivo, registrado_por)
  values (financeiro_privado.sessao_aberta((v_a->>'clinica_id')::uuid), (v_a->>'clinica_id')::uuid,
    p_tipo, (v_p->>'valor')::numeric, v_p->>'motivo', (v_a->>'sub')::uuid) returning id into v_id;
  v_resposta := jsonb_build_object('id', v_id, 'tipo', p_tipo);
  return financeiro_privado.concluir_idempotencia((v_i->>'id')::uuid, v_resposta);
end $function$;
create or replace function financeiro_privado.registrar_sangria(text,text) returns jsonb language sql security definer set search_path = pg_catalog
  as $$ select financeiro_privado.registrar_movimento_simples($1,$2,'registrar_sangria','sangria') $$;
create or replace function financeiro_privado.registrar_suprimento(text,text) returns jsonb language sql security definer set search_path = pg_catalog
  as $$ select financeiro_privado.registrar_movimento_simples($1,$2,'registrar_suprimento','suprimento') $$;

create or replace function financeiro_privado.estornar_lancamento(p_assercao_texto text, p_assinatura_hex text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $function$
declare
  v_a jsonb; v_i jsonb; v_p jsonb; v_clinica uuid; v_origem uuid; v_tipo public.origem_estorno_financeiro;
  v_valor numeric(12,2); v_estorno uuid; v_fechamento uuid; v_profissional uuid; v_sessao uuid; v_resposta jsonb;
begin
  v_a := financeiro_privado.preparar_comando(p_assercao_texto, p_assinatura_hex, 'estornar_lancamento', true);
  v_i := financeiro_privado.iniciar_idempotencia(v_a); if (v_i->>'reutilizada')::boolean then return v_i->'resposta'; end if;
  v_p := v_a->'payload'; v_clinica := (v_a->>'clinica_id')::uuid; v_origem := (v_p->>'origem_id')::uuid;
  v_tipo := (v_p->>'origem_tipo')::public.origem_estorno_financeiro;
  if v_tipo = 'entrada' then
    select e.valor, e.profissional_id, f.id into v_valor, v_profissional, v_fechamento
    from public.entradas_caixa e left join public.fechamentos_caixa f on f.sessao_caixa_id = e.sessao_caixa_id
    where e.id = v_origem and e.clinica_id = v_clinica for update of e;
  elsif v_tipo = 'despesa' then
    select d.valor into v_valor from public.despesas d where d.id = v_origem and d.clinica_id = v_clinica and d.status = 'paga' for update;
  else
    select p.valor_pago into v_valor from public.pagamentos_repasse p where p.id = v_origem and p.clinica_id = v_clinica for update;
  end if;
  if v_valor is null then raise exception 'FINANCEIRO_VALIDACAO: origem de estorno inválida'; end if;
  insert into public.estornos_financeiros (clinica_id, origem_tipo, origem_id, valor, motivo, fechamento_origem_id, estornado_por)
  values (v_clinica, v_tipo, v_origem, v_valor, v_p->>'motivo', v_fechamento, (v_a->>'sub')::uuid) returning id into v_estorno;

  if v_tipo = 'entrada' and v_fechamento is not null then
    insert into public.ajustes_financeiros_profissional (clinica_id, profissional_id, estorno_id, fechamento_origem_id, valor)
    select v_clinica, v_profissional, v_estorno, v_fechamento, -ri.valor_repasse
    from public.repasse_itens ri where ri.entrada_caixa_id = v_origem;
  end if;
  select sc.id into v_sessao from public.sessoes_caixa sc where sc.clinica_id = v_clinica and sc.status = 'aberto' for update;
  if v_sessao is not null and v_tipo in ('entrada','despesa') then
    insert into public.movimentos_caixa (sessao_caixa_id, clinica_id, tipo, valor, motivo, estorno_id, registrado_por)
    values (v_sessao, v_clinica, case when v_tipo = 'entrada' then 'estorno_saida' else 'estorno_entrada' end,
      v_valor, 'Estorno: ' || (v_p->>'motivo'), v_estorno, (v_a->>'sub')::uuid);
  end if;
  v_resposta := jsonb_build_object('id', v_estorno, 'fechamento_preservado', v_fechamento is not null, 'ajuste_futuro', v_fechamento is not null and v_tipo = 'entrada');
  return financeiro_privado.concluir_idempotencia((v_i->>'id')::uuid, v_resposta);
end $function$;

create or replace function financeiro_privado.fechar_caixa(p_assercao_texto text, p_assinatura_hex text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $function$
declare
  v_a jsonb; v_i jsonb; v_p jsonb; v_clinica uuid; v_sessao public.sessoes_caixa%rowtype;
  v_fechamento uuid; v_dinheiro numeric(12,2); v_contado numeric(12,2); v_diferenca numeric(12,2);
  v_prof record; v_repasse uuid; v_ajustes numeric(12,2); v_aplicado numeric(12,2);
  v_ajuste record; v_saldo_ajuste numeric(12,2); v_parcela_ajuste numeric(12,2);
  v_restante_aplicar numeric(12,2); v_resposta jsonb;
begin
  v_a := financeiro_privado.preparar_comando(p_assercao_texto, p_assinatura_hex, 'fechar_caixa');
  v_i := financeiro_privado.iniciar_idempotencia(v_a); if (v_i->>'reutilizada')::boolean then return v_i->'resposta'; end if;
  v_p := v_a->'payload'; v_clinica := (v_a->>'clinica_id')::uuid;
  select * into v_sessao from public.sessoes_caixa where clinica_id = v_clinica and status = 'aberto' for update;
  if not found then raise exception 'FINANCEIRO_CONFLITO: nenhum caixa aberto'; end if;

  select v_sessao.valor_abertura
    + coalesce(sum(case when e.forma_pagamento::text = 'dinheiro' and ef.id is null then e.valor else 0 end),0)
    + coalesce((select sum(case when m.tipo in ('suprimento','estorno_entrada') then m.valor
      when m.tipo in ('sangria','despesa_dinheiro','repasse_dinheiro','estorno_saida') then -m.valor else 0 end)
      from public.movimentos_caixa m where m.sessao_caixa_id = v_sessao.id),0)
  into v_dinheiro
  from public.entradas_caixa e
  left join public.estornos_financeiros ef on ef.origem_tipo = 'entrada' and ef.origem_id = e.id
  where e.sessao_caixa_id = v_sessao.id;

  v_contado := (v_p->>'valor_contado')::numeric; v_diferenca := v_contado - v_dinheiro;
  if v_diferenca <> 0 and nullif(btrim(v_p->>'justificativa_diferenca'),'') is null then
    raise exception 'FINANCEIRO_VALIDACAO: diferença de caixa exige justificativa';
  end if;
  insert into public.fechamentos_caixa (sessao_caixa_id, clinica_id, valor_abertura, dinheiro_esperado,
    dinheiro_contado, diferenca, justificativa_diferenca, fechado_por)
  values (v_sessao.id, v_clinica, v_sessao.valor_abertura, v_dinheiro, v_contado, v_diferenca,
    nullif(v_p->>'justificativa_diferenca',''), (v_a->>'sub')::uuid) returning id into v_fechamento;

  insert into public.fechamentos_caixa_totais (fechamento_id, forma_pagamento, valor_esperado)
  select v_fechamento, e.forma_pagamento, sum(e.valor)
  from public.entradas_caixa e left join public.estornos_financeiros ef on ef.origem_tipo='entrada' and ef.origem_id=e.id
  where e.sessao_caixa_id = v_sessao.id and e.forma_pagamento::text <> 'cortesia' and ef.id is null
  group by e.forma_pagamento;

  for v_prof in
    select e.profissional_id, sum(e.valor)::numeric(12,2) total,
      p.taxa_repasse_clinica, (100 - p.taxa_repasse_clinica) taxa_profissional
    from public.entradas_caixa e join public.profissionais p on p.id=e.profissional_id
    left join public.estornos_financeiros ef on ef.origem_tipo='entrada' and ef.origem_id=e.id
    where e.sessao_caixa_id=v_sessao.id and e.forma_pagamento::text <> 'cortesia' and ef.id is null
    group by e.profissional_id,p.taxa_repasse_clinica
  loop
    select coalesce(sum(a.valor - coalesce((select sum(ap.valor_aplicado) from public.ajustes_financeiros_aplicacoes ap where ap.ajuste_id=a.id),0)),0)
      into v_ajustes from public.ajustes_financeiros_profissional a
      where a.clinica_id=v_clinica and a.profissional_id=v_prof.profissional_id and a.status <> 'aplicado';
    v_aplicado := greatest(-(v_prof.total * v_prof.taxa_profissional / 100), v_ajustes);
    insert into public.repasses (fechamento_id,clinica_id,profissional_id,total_elegivel,taxa_clinica_percentual,
      taxa_profissional_percentual,valor_base_profissional,valor_ajustes,valor_a_pagar)
    values (v_fechamento,v_clinica,v_prof.profissional_id,v_prof.total,v_prof.taxa_repasse_clinica,
      v_prof.taxa_profissional,round(v_prof.total*v_prof.taxa_profissional/100,2),v_aplicado,
      greatest(0,round(v_prof.total*v_prof.taxa_profissional/100,2)+v_aplicado)) returning id into v_repasse;
    insert into public.repasse_itens (repasse_id,entrada_caixa_id,valor_entrada,taxa_profissional_percentual,valor_repasse)
    select v_repasse,e.id,e.valor,v_prof.taxa_profissional,round(e.valor*v_prof.taxa_profissional/100,2)
    from public.entradas_caixa e left join public.estornos_financeiros ef on ef.origem_tipo='entrada' and ef.origem_id=e.id
    where e.sessao_caixa_id=v_sessao.id and e.profissional_id=v_prof.profissional_id and e.forma_pagamento::text<>'cortesia' and ef.id is null;
    -- Consome ajustes negativos em FIFO, sem tornar o repasse negativo. Se o
    -- ajuste for maior que o repasse atual, o saldo permanece para o próximo.
    v_restante_aplicar := abs(v_aplicado);
    for v_ajuste in
      select a.id, a.valor from public.ajustes_financeiros_profissional a
      where a.clinica_id=v_clinica and a.profissional_id=v_prof.profissional_id
        and a.status<>'aplicado' and a.valor<0
      order by a.criado_em, a.id
      for update
    loop
      exit when v_restante_aplicar <= 0;
      select v_ajuste.valor - coalesce(sum(ap.valor_aplicado),0) into v_saldo_ajuste
      from public.ajustes_financeiros_aplicacoes ap where ap.ajuste_id=v_ajuste.id;
      v_parcela_ajuste := greatest(v_saldo_ajuste, -v_restante_aplicar);
      if v_parcela_ajuste < 0 then
        insert into public.ajustes_financeiros_aplicacoes(ajuste_id,repasse_id,valor_aplicado)
        values(v_ajuste.id,v_repasse,v_parcela_ajuste);
        v_restante_aplicar := v_restante_aplicar - abs(v_parcela_ajuste);
        update public.ajustes_financeiros_profissional a set status = case
          when a.valor = (select coalesce(sum(ap.valor_aplicado),0) from public.ajustes_financeiros_aplicacoes ap where ap.ajuste_id=a.id)
            then 'aplicado'::public.status_ajuste_financeiro
          else 'aplicado_parcial'::public.status_ajuste_financeiro end
        where a.id=v_ajuste.id;
      end if;
    end loop;
  end loop;

  update public.sessoes_caixa set status='fechado', fechado_por=(v_a->>'sub')::uuid, fechado_em=clock_timestamp(),
    valor_esperado=v_dinheiro, valor_contado=v_contado, diferenca=v_diferenca,
    justificativa_diferenca=nullif(v_p->>'justificativa_diferenca','') where id=v_sessao.id;
  v_resposta := jsonb_build_object('id',v_fechamento,'sessao_caixa_id',v_sessao.id,'dinheiro_esperado',v_dinheiro,
    'dinheiro_contado',v_contado,'diferenca',v_diferenca,'status','fechado');
  return financeiro_privado.concluir_idempotencia((v_i->>'id')::uuid,v_resposta);
end $function$;

create or replace function financeiro_privado.pagar_repasse_integral(p_assercao_texto text,p_assinatura_hex text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $function$
declare v_a jsonb;v_i jsonb;v_p jsonb;v_r public.repasses%rowtype;v_pag uuid;v_sessao uuid;v_resposta jsonb;
begin
  v_a:=financeiro_privado.preparar_comando(p_assercao_texto,p_assinatura_hex,'pagar_repasse_integral',true);
  v_i:=financeiro_privado.iniciar_idempotencia(v_a);if (v_i->>'reutilizada')::boolean then return v_i->'resposta';end if;v_p:=v_a->'payload';
  select * into v_r from public.repasses where id=(v_p->>'repasse_id')::uuid and clinica_id=(v_a->>'clinica_id')::uuid for update;
  if not found or v_r.status<>'a_pagar' then raise exception 'FINANCEIRO_CONFLITO: repasse não está a pagar';end if;
  if v_p->>'forma_pagamento'='dinheiro' then v_sessao:=financeiro_privado.sessao_aberta(v_r.clinica_id);end if;
  insert into public.pagamentos_repasse(repasse_id,clinica_id,valor_pago,forma_pagamento,pago_por,pago_em)
  values(v_r.id,v_r.clinica_id,v_r.valor_a_pagar,(v_p->>'forma_pagamento')::public.forma_pagamento_caixa,
    (v_a->>'sub')::uuid,coalesce(nullif(v_p->>'pago_em','')::timestamptz,clock_timestamp())) returning id into v_pag;
  update public.repasses set status='pago' where id=v_r.id;
  if v_sessao is not null and v_r.valor_a_pagar>0 then insert into public.movimentos_caixa(sessao_caixa_id,clinica_id,tipo,valor,motivo,pagamento_repasse_id,registrado_por)
    values(v_sessao,v_r.clinica_id,'repasse_dinheiro',v_r.valor_a_pagar,'Pagamento integral de repasse',v_pag,(v_a->>'sub')::uuid);end if;
  v_resposta:=jsonb_build_object('id',v_pag,'repasse_id',v_r.id,'valor_pago',v_r.valor_a_pagar,'status','pago');
  return financeiro_privado.concluir_idempotencia((v_i->>'id')::uuid,v_resposta);
end $function$;

alter function financeiro_privado.preparar_comando(text,text,text,boolean) owner to financeiro_executor;
alter function financeiro_privado.iniciar_idempotencia(jsonb) owner to financeiro_executor;
alter function financeiro_privado.concluir_idempotencia(uuid,jsonb) owner to financeiro_executor;
alter function financeiro_privado.validar_referencias_cobranca(uuid,uuid,uuid,uuid) owner to financeiro_executor;
alter function financeiro_privado.sessao_aberta(uuid) owner to financeiro_executor;
alter function financeiro_privado.abrir_caixa(text,text) owner to financeiro_executor;
alter function financeiro_privado.registrar_cobranca(text,text) owner to financeiro_executor;
alter function financeiro_privado.receber_cobranca(text,text) owner to financeiro_executor;
alter function financeiro_privado.registrar_despesa(text,text) owner to financeiro_executor;
alter function financeiro_privado.pagar_despesa(text,text) owner to financeiro_executor;
alter function financeiro_privado.registrar_movimento_simples(text,text,text,public.tipo_movimento_caixa) owner to financeiro_executor;
alter function financeiro_privado.registrar_sangria(text,text) owner to financeiro_executor;
alter function financeiro_privado.registrar_suprimento(text,text) owner to financeiro_executor;
alter function financeiro_privado.estornar_lancamento(text,text) owner to financeiro_executor;
alter function financeiro_privado.fechar_caixa(text,text) owner to financeiro_executor;
alter function financeiro_privado.pagar_repasse_integral(text,text) owner to financeiro_executor;

-- O executor não é dono das tabelas e só atravessa RLS por policies explícitas.
grant select,insert,update on public.sessoes_caixa,public.cobrancas,
  public.financeiro_idempotencia,public.despesas,public.repasses,
  public.ajustes_financeiros_profissional to financeiro_executor;
grant select,insert on public.entradas_caixa,public.movimentos_caixa,
  public.fechamentos_caixa,public.fechamentos_caixa_totais,public.repasse_itens,
  public.pagamentos_repasse,public.estornos_financeiros,
  public.ajustes_financeiros_aplicacoes to financeiro_executor;

do $policies$
declare v_table text;
begin
  foreach v_table in array array['sessoes_caixa','entradas_caixa','cobrancas','financeiro_idempotencia','despesas',
    'movimentos_caixa','fechamentos_caixa','fechamentos_caixa_totais','repasses','repasse_itens','pagamentos_repasse',
    'estornos_financeiros','ajustes_financeiros_profissional','ajustes_financeiros_aplicacoes'] loop
    execute format('drop policy if exists financeiro_executor_interno on public.%I',v_table);
    execute format('create policy financeiro_executor_interno on public.%I for all to financeiro_executor using (true) with check (true)',v_table);
  end loop;
end $policies$;

revoke all on all functions in schema financeiro_privado from public,anon,authenticated,service_role;
grant execute on function financeiro_privado.abrir_caixa(text,text),
  financeiro_privado.registrar_cobranca(text,text),financeiro_privado.receber_cobranca(text,text),
  financeiro_privado.registrar_despesa(text,text),financeiro_privado.pagar_despesa(text,text),
  financeiro_privado.registrar_sangria(text,text),financeiro_privado.registrar_suprimento(text,text),
  financeiro_privado.estornar_lancamento(text,text),financeiro_privado.fechar_caixa(text,text),
  financeiro_privado.pagar_repasse_integral(text,text) to financeiro_api;

alter default privileges for role financeiro_executor in schema financeiro_privado revoke execute on functions from public;

commit;
