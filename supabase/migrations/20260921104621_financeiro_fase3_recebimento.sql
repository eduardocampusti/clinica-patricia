-- FASE 3: recebimento transacional do Financeiro.
-- Migration criada para revisao; NAO aplicada.
-- Fluxo: Agenda -> Recebimento -> Snapshot -> Pagamentos -> Caixa
--        -> Pendencia fiscal -> Auditoria.
-- Nao altera Agenda, entradas_caixa, frontend, backend ou funcoes legadas.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- Um agendamento possui no maximo um recebimento principal. A substituicao
-- do indice ocorre na mesma transacao: se houver duplicidade, tudo reverte.
drop index public.recebimentos_agendamento_idx;

create unique index recebimentos_agendamento_unique
  on public.recebimentos (agendamento_id);

-- A chave armazenada ja fica normalizada, nao vazia e com tamanho limitado.
alter table public.recebimentos
  add constraint recebimentos_idempotency_key_formato_check
  check (
    idempotency_key = btrim(idempotency_key)
    and char_length(idempotency_key) between 1 and 200
  );

-- Fundacao fiscal minima. Emissao, cancelamento operacional e integracao
-- externa pertencem a fases futuras.
create table public.documentos_fiscais (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null
    references public.clinicas(id) on delete restrict,
  recebimento_id uuid not null unique
    references public.recebimentos(id) on delete restrict,
  status text not null default 'pendente'
    check (status in ('pendente', 'emitida', 'cancelada', 'erro')),
  criado_por uuid not null
    references public.usuarios(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index documentos_fiscais_clinica_status_data_idx
  on public.documentos_fiscais (clinica_id, status, created_at desc);

create index documentos_fiscais_criado_por_idx
  on public.documentos_fiscais (criado_por);

alter table public.documentos_fiscais enable row level security;

revoke all privileges on table public.documentos_fiscais
from public, anon, authenticated;

grant select on table public.documentos_fiscais to authenticated;

create policy documentos_fiscais_select_proprietaria_recepcao
on public.documentos_fiscais
for select
to authenticated
using (
  private.financeiro_tem_papel_clinica(
    clinica_id,
    array[
      'proprietaria'::public.papel_usuario,
      'recepcao'::public.papel_usuario
    ]
  )
);

-- Valida no fim da transacao que cada recebimento continua integralmente
-- quitado. UPDATE de um componente valida tanto o pai antigo quanto o novo.
create function private.financeiro_validar_soma_pagamentos()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_recebimento_id uuid;
  v_recebimento_ids uuid[];
  v_valor_bruto numeric(12,2);
  v_total_pagamentos numeric;
begin
  if tg_table_schema = 'public' and tg_table_name = 'recebimentos' then
    v_recebimento_ids := array[new.id];
  elsif tg_table_schema = 'public'
    and tg_table_name = 'recebimentos_pagamentos' then
    if tg_op = 'INSERT' then
      v_recebimento_ids := array[new.recebimento_id];
    elsif tg_op = 'DELETE' then
      v_recebimento_ids := array[old.recebimento_id];
    else
      v_recebimento_ids := array[old.recebimento_id, new.recebimento_id];
    end if;
  else
    raise exception 'Trigger financeiro associado a tabela inesperada.';
  end if;

  foreach v_recebimento_id in array v_recebimento_ids loop
    select r.valor_bruto
      into v_valor_bruto
    from public.recebimentos r
    where r.id = v_recebimento_id;

    -- Se o pai deixou de existir em uma operacao privilegiada futura, a FK
    -- continua sendo a responsavel pela integridade referencial.
    if not found then
      continue;
    end if;

    select coalesce(sum(rp.valor), 0::numeric)
      into v_total_pagamentos
    from public.recebimentos_pagamentos rp
    where rp.recebimento_id = v_recebimento_id;

    if v_total_pagamentos <> v_valor_bruto then
      raise exception using
        errcode = '23514',
        message = 'A soma dos componentes de pagamento deve ser igual ao valor bruto do recebimento.';
    end if;
  end loop;

  return null;
end;
$$;

revoke all privileges on function
  private.financeiro_validar_soma_pagamentos()
from public, anon, authenticated;

create constraint trigger recebimentos_soma_pagamentos_ct
after insert or update of valor_bruto
on public.recebimentos
deferrable initially deferred
for each row
execute function private.financeiro_validar_soma_pagamentos();

create constraint trigger recebimentos_pagamentos_soma_ct
after insert or update or delete
on public.recebimentos_pagamentos
deferrable initially deferred
for each row
execute function private.financeiro_validar_soma_pagamentos();

-- Um recebimento gera exatamente um movimento principal do tipo recebimento.
create unique index movimentos_caixa_recebimento_unico
  on public.movimentos_caixa (recebimento_id)
  where tipo = 'recebimento';

-- SECURITY DEFINER e intencional: esta RPC e a fronteira controlada de
-- escrita. Um eventual advisor warning por EXECUTE de authenticated deve ser
-- revisado como excecao consciente, nao removido sem substituir a operacao.
create function public.financeiro_registrar_recebimento(
  p_agendamento_id uuid,
  p_pagamentos jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid;
  v_idempotency_key text;
  v_existente public.recebimentos%rowtype;
  v_agendamento_clinica_id uuid;
  v_paciente_id uuid;
  v_profissional_id uuid;
  v_agendamento_status public.status_agendamento;
  v_papel public.papel_usuario;
  v_valor_bruto numeric(12,2);
  v_percentual_clinica numeric(5,2);
  v_valor_clinica numeric(12,2);
  v_valor_profissional numeric(12,2);
  v_configuracoes_validas bigint;
  v_sessao_caixa_id uuid;
  v_instante_pagamento timestamptz;
  v_total_pagamentos numeric;
  v_recebimento_id uuid;
  v_status_fiscal text;
  v_registrado_em timestamptz;
  v_pagamentos_persistidos jsonb;
begin
  v_usuario_id := (select auth.uid());

  if v_usuario_id is null then
    raise exception using
      errcode = '28000',
      message = 'Usuario nao autenticado.';
  end if;

  if p_agendamento_id is null then
    raise exception using
      errcode = '22023',
      message = 'Agendamento obrigatorio.';
  end if;

  v_idempotency_key := btrim(coalesce(p_idempotency_key, ''));

  if v_idempotency_key = '' then
    raise exception using
      errcode = '22023',
      message = 'Chave de idempotencia obrigatoria.';
  end if;

  if char_length(v_idempotency_key) > 200 then
    raise exception using
      errcode = '22023',
      message = 'Chave de idempotencia excede 200 caracteres.';
  end if;

  -- Serializa chamadas concorrentes com a mesma chave antes da consulta.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_idempotency_key, 0)
  );

  select r.*
    into v_existente
  from public.recebimentos r
  where r.idempotency_key = v_idempotency_key;

  if found then
    if v_existente.agendamento_id <> p_agendamento_id
      or v_existente.registrado_por <> v_usuario_id then
      raise exception using
        errcode = '23505',
        message = 'Chave de idempotencia ja utilizada em outra operacao.';
    end if;

    select uc.papel
      into v_papel
    from public.usuarios_clinicas uc
    where uc.usuario_id = v_usuario_id
      and uc.clinica_id = v_existente.clinica_id
      and uc.ativo
      and uc.papel in (
        'proprietaria'::public.papel_usuario,
        'recepcao'::public.papel_usuario
      );

    if not found then
      raise exception using
        errcode = '42501',
        message = 'Usuario sem permissao para registrar recebimento nesta clinica.';
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'forma_pagamento', rp.forma_pagamento,
          'valor', rp.valor
        )
        order by rp.forma_pagamento, rp.id
      ),
      '[]'::jsonb
    )
      into v_pagamentos_persistidos
    from public.recebimentos_pagamentos rp
    where rp.recebimento_id = v_existente.id;

    select df.status
      into v_status_fiscal
    from public.documentos_fiscais df
    where df.recebimento_id = v_existente.id;

    return jsonb_build_object(
      'recebimento_id', v_existente.id,
      'agendamento_id', v_existente.agendamento_id,
      'clinica_id', v_existente.clinica_id,
      'paciente_id', v_existente.paciente_id,
      'profissional_id', v_existente.profissional_id,
      'sessao_caixa_id', v_existente.sessao_caixa_id,
      'valor_bruto', v_existente.valor_bruto,
      'percentual_clinica', v_existente.percentual_clinica,
      'valor_clinica', v_existente.valor_clinica,
      'valor_profissional', v_existente.valor_profissional,
      'status', v_existente.status,
      'pagamentos', v_pagamentos_persistidos,
      'status_fiscal', v_status_fiscal,
      'registrado_em', v_existente.registrado_em,
      'nova_operacao', false
    );
  end if;

  select
    a.clinica_id,
    a.paciente_id,
    a.profissional_id,
    a.status
    into
      v_agendamento_clinica_id,
      v_paciente_id,
      v_profissional_id,
      v_agendamento_status
  from public.agendamentos a
  where a.id = p_agendamento_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Agendamento inexistente.';
  end if;

  if v_agendamento_status not in (
    'agendado'::public.status_agendamento,
    'confirmado'::public.status_agendamento,
    'aguardando'::public.status_agendamento
  ) then
    raise exception using
      errcode = '22023',
      message = 'Agendamento em estado incompativel com o recebimento.';
  end if;

  -- Evita que outra chave crie novo recebimento para o mesmo agendamento.
  if exists (
    select 1
    from public.recebimentos r
    where r.agendamento_id = p_agendamento_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'Agendamento ja possui recebimento principal.';
  end if;

  select uc.papel
    into v_papel
  from public.usuarios_clinicas uc
  where uc.usuario_id = v_usuario_id
    and uc.clinica_id = v_agendamento_clinica_id
    and uc.ativo
    and uc.papel in (
      'proprietaria'::public.papel_usuario,
      'recepcao'::public.papel_usuario
    );

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Usuario sem permissao para registrar recebimento nesta clinica.';
  end if;

  perform 1
  from public.pacientes p
  where p.id = v_paciente_id
    and p.clinica_id = v_agendamento_clinica_id
    and p.ativo;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Paciente inexistente, inativo ou inconsistente com a clinica.';
  end if;

  select pc.valor_consulta
    into v_valor_bruto
  from public.profissionais p
  join public.profissionais_clinicas pc
    on pc.profissional_id = p.id
   and pc.clinica_id = v_agendamento_clinica_id
  where p.id = v_profissional_id
    and p.ativo
    and pc.ativo
  for share of p, pc;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Profissional inativo ou sem vinculo ativo com a clinica.';
  end if;

  if v_valor_bruto is null or v_valor_bruto <= 0 then
    raise exception using
      errcode = '22023',
      message = 'Preco da consulta nao configurado para o profissional nesta clinica.';
  end if;

  v_instante_pagamento := pg_catalog.clock_timestamp();

  select count(*), min(cf.percentual_clinica)
    into v_configuracoes_validas, v_percentual_clinica
  from public.configuracoes_financeiras_clinica cf
  where cf.clinica_id = v_agendamento_clinica_id
    and cf.vigente_desde <= v_instante_pagamento
    and (
      cf.vigente_ate is null
      or v_instante_pagamento < cf.vigente_ate
    );

  if v_configuracoes_validas <> 1 then
    raise exception using
      errcode = '22023',
      message = 'Configuracao financeira vigente nao encontrada para a clinica.';
  end if;

  select sc.id
    into v_sessao_caixa_id
  from public.sessoes_caixa sc
  where sc.clinica_id = v_agendamento_clinica_id
    and sc.status = 'aberto'::public.status_sessao_caixa
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Nao existe caixa aberto para a clinica.';
  end if;

  if p_pagamentos is null
    or pg_catalog.jsonb_typeof(p_pagamentos) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'Pagamentos devem ser enviados como array JSON.';
  end if;

  if pg_catalog.jsonb_array_length(p_pagamentos) = 0 then
    raise exception using
      errcode = '22023',
      message = 'Informe ao menos um componente de pagamento.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_pagamentos) as item(value)
    where pg_catalog.jsonb_typeof(item.value) <> 'object'
      or not (item.value ? 'forma_pagamento')
      or not (item.value ? 'valor')
      or pg_catalog.jsonb_typeof(item.value -> 'forma_pagamento') <> 'string'
      or pg_catalog.jsonb_typeof(item.value -> 'valor') <> 'number'
  ) then
    raise exception using
      errcode = '22023',
      message = 'Cada pagamento deve conter forma_pagamento e valor numerico.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_pagamentos) as item(value)
    where item.value ->> 'forma_pagamento' not in (
      'dinheiro',
      'pix',
      'cartao_credito'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'Forma de pagamento nao permitida.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_pagamentos) as item(value)
    where (item.value ->> 'valor')::numeric <= 0
      or (item.value ->> 'valor')::numeric > 9999999999.99
      or (item.value ->> 'valor')::numeric
        <> round((item.value ->> 'valor')::numeric, 2)
  ) then
    raise exception using
      errcode = '22023',
      message = 'Valores de pagamento devem ser positivos e possuir no maximo duas casas decimais.';
  end if;

  select sum((item.value ->> 'valor')::numeric)
    into v_total_pagamentos
  from pg_catalog.jsonb_array_elements(p_pagamentos) as item(value);

  if v_total_pagamentos <> v_valor_bruto then
    raise exception using
      errcode = '22023',
      message = 'A soma dos pagamentos deve ser igual ao valor da consulta.';
  end if;

  v_valor_clinica := round(
    v_valor_bruto * v_percentual_clinica / 100,
    2
  );
  v_valor_profissional := v_valor_bruto - v_valor_clinica;

  insert into public.recebimentos (
    clinica_id,
    agendamento_id,
    paciente_id,
    profissional_id,
    sessao_caixa_id,
    valor_bruto,
    percentual_clinica,
    valor_clinica,
    valor_profissional,
    status,
    idempotency_key,
    registrado_por,
    registrado_em
  )
  values (
    v_agendamento_clinica_id,
    p_agendamento_id,
    v_paciente_id,
    v_profissional_id,
    v_sessao_caixa_id,
    v_valor_bruto,
    v_percentual_clinica,
    v_valor_clinica,
    v_valor_profissional,
    'confirmado',
    v_idempotency_key,
    v_usuario_id,
    v_instante_pagamento
  )
  returning id, registrado_em
    into v_recebimento_id, v_registrado_em;

  insert into public.recebimentos_pagamentos (
    recebimento_id,
    forma_pagamento,
    valor
  )
  select
    v_recebimento_id,
    item.value ->> 'forma_pagamento',
    (item.value ->> 'valor')::numeric(12,2)
  from pg_catalog.jsonb_array_elements(p_pagamentos) as item(value);

  insert into public.movimentos_caixa (
    clinica_id,
    sessao_caixa_id,
    tipo,
    recebimento_id,
    valor,
    motivo,
    registrado_por,
    registrado_em
  )
  values (
    v_agendamento_clinica_id,
    v_sessao_caixa_id,
    'recebimento',
    v_recebimento_id,
    v_valor_bruto,
    null,
    v_usuario_id,
    v_instante_pagamento
  );

  insert into public.documentos_fiscais (
    clinica_id,
    recebimento_id,
    status,
    criado_por,
    created_at
  )
  values (
    v_agendamento_clinica_id,
    v_recebimento_id,
    'pendente',
    v_usuario_id,
    v_instante_pagamento
  )
  returning status into v_status_fiscal;

  select jsonb_agg(
    jsonb_build_object(
      'forma_pagamento', rp.forma_pagamento,
      'valor', rp.valor
    )
    order by rp.forma_pagamento, rp.id
  )
    into v_pagamentos_persistidos
  from public.recebimentos_pagamentos rp
  where rp.recebimento_id = v_recebimento_id;

  insert into public.eventos_auditoria_financeira (
    clinica_id,
    usuario_id,
    papel,
    acao,
    entidade,
    entidade_id,
    valor,
    estado_anterior,
    estado_novo,
    dados,
    motivo,
    created_at
  )
  values (
    v_agendamento_clinica_id,
    v_usuario_id,
    v_papel,
    'registrar_recebimento',
    'recebimento',
    v_recebimento_id,
    v_valor_bruto,
    null,
    jsonb_build_object('status', 'confirmado'),
    jsonb_build_object(
      'agendamento_id', p_agendamento_id,
      'paciente_id', v_paciente_id,
      'profissional_id', v_profissional_id,
      'sessao_caixa_id', v_sessao_caixa_id,
      'percentual_clinica', v_percentual_clinica,
      'valor_clinica', v_valor_clinica,
      'valor_profissional', v_valor_profissional,
      'formas_pagamento', v_pagamentos_persistidos,
      'status_fiscal', v_status_fiscal
    ),
    null,
    v_instante_pagamento
  );

  return jsonb_build_object(
    'recebimento_id', v_recebimento_id,
    'agendamento_id', p_agendamento_id,
    'clinica_id', v_agendamento_clinica_id,
    'paciente_id', v_paciente_id,
    'profissional_id', v_profissional_id,
    'sessao_caixa_id', v_sessao_caixa_id,
    'valor_bruto', v_valor_bruto,
    'percentual_clinica', v_percentual_clinica,
    'valor_clinica', v_valor_clinica,
    'valor_profissional', v_valor_profissional,
    'status', 'confirmado',
    'pagamentos', v_pagamentos_persistidos,
    'status_fiscal', v_status_fiscal,
    'registrado_em', v_registrado_em,
    'nova_operacao', true
  );
end;
$$;

revoke all privileges on function
  public.financeiro_registrar_recebimento(uuid, jsonb, text)
from public, anon;

grant execute on function
  public.financeiro_registrar_recebimento(uuid, jsonb, text)
to authenticated;

commit;
