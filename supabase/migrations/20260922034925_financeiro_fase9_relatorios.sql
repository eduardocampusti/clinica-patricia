-- FASE 9: datasets paginados para relatorios financeiros PDF/Excel.
-- Migration criada pelo Supabase CLI para revisao; NAO APLICADA.
-- Resumos permanecem nas RPCs homologadas da FASE 8. Esta fase adiciona
-- somente detalhes completos, paginacao por cursor e auditoria da solicitacao.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

create function private.financeiro_relatorio_validar_pagina(
  p_limite integer,
  p_cursor_data timestamptz,
  p_cursor_id uuid,
  p_cursor_contexto text,
  p_contexto_esperado text
)
returns void
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
begin
  if p_limite is null or p_limite < 1 or p_limite > 500 then
    raise exception using errcode = '22023',
      message = 'Limite de pagina deve estar entre 1 e 500.';
  end if;

  if (p_cursor_data is null) <> (p_cursor_id is null) then
    raise exception using errcode = '22023',
      message = 'Cursor exige data e identificador em conjunto.';
  end if;

  if (p_cursor_data is null) <> (p_cursor_contexto is null) then
    raise exception using errcode = '22023',
      message = 'Cursor exige contexto, data e identificador em conjunto.';
  end if;

  if p_cursor_contexto is not null and p_cursor_contexto <> p_contexto_esperado then
    raise exception using errcode = '22023',
      message = 'Cursor nao pertence ao contexto desta consulta.';
  end if;
end;
$$;

revoke all on function private.financeiro_relatorio_validar_pagina(integer,timestamptz,uuid,text,text)
from public, anon, authenticated;

create function private.financeiro_relatorio_recebimentos_nucleo(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_clinicas uuid[],
  p_profissional_id uuid,
  p_paciente_id uuid,
  p_forma_pagamento text,
  p_status_recebimento text,
  p_status_fiscal text,
  p_limite integer,
  p_cursor_data timestamptz,
  p_cursor_id uuid,
  p_contexto text,
  p_incluir_fiscal boolean
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
with base as materialized (
  select
    r.id,
    r.paciente_id,
    r.registrado_em,
    c.nome as clinica,
    p.nome_completo as profissional,
    pa.nome_completo as paciente,
    r.status,
    r.valor_bruto,
    r.percentual_clinica,
    r.valor_clinica,
    r.valor_profissional,
    coalesce(ep.valor_total, 0::numeric) as valor_estornado,
    coalesce(ep.valor_clinica, 0::numeric) as valor_estornado_clinica,
    coalesce(ep.valor_profissional, 0::numeric) as valor_estornado_profissional,
    r.valor_bruto - coalesce(ep.valor_total, 0::numeric) as valor_liquido_atual,
    r.valor_clinica - coalesce(ep.valor_clinica, 0::numeric) as valor_clinica_liquida,
    r.valor_profissional - coalesce(ep.valor_profissional, 0::numeric) as valor_profissional_liquido,
    coalesce(rp.formas, '[]'::jsonb) as formas_pagamento,
    coalesce(rp.dinheiro, 0::numeric) as dinheiro,
    coalesce(rp.pix, 0::numeric) as pix,
    coalesce(rp.cartao_credito, 0::numeric) as cartao_credito,
    df.status as status_fiscal
  from public.recebimentos r
  join public.clinicas c on c.id = r.clinica_id
  join public.profissionais p on p.id = r.profissional_id
  join public.pacientes pa on pa.id = r.paciente_id
  left join public.documentos_fiscais df
    on df.recebimento_id = r.id and df.clinica_id = r.clinica_id
  left join lateral (
    select
      jsonb_agg(
        jsonb_build_object('forma', x.forma_pagamento, 'valor', x.valor)
        order by x.forma_pagamento
      ) as formas,
      coalesce(sum(x.valor) filter (where x.forma_pagamento = 'dinheiro'), 0) as dinheiro,
      coalesce(sum(x.valor) filter (where x.forma_pagamento = 'pix'), 0) as pix,
      coalesce(sum(x.valor) filter (where x.forma_pagamento = 'cartao_credito'), 0) as cartao_credito
    from public.recebimentos_pagamentos x
    where x.recebimento_id = r.id
  ) rp on true
  left join lateral (
    select
      coalesce(sum(e.valor_total), 0) as valor_total,
      coalesce(sum(e.valor_clinica), 0) as valor_clinica,
      coalesce(sum(e.valor_profissional), 0) as valor_profissional
    from public.estornos e
    where e.recebimento_id = r.id and e.status = 'efetivado'
  ) ep on true
  where r.clinica_id = any(p_clinicas)
    and r.registrado_em >= p_inicio and r.registrado_em < p_fim
    and (p_profissional_id is null or r.profissional_id = p_profissional_id)
    and (p_paciente_id is null or r.paciente_id = p_paciente_id)
    and (p_status_recebimento is null or r.status = p_status_recebimento)
    and (p_status_fiscal is null or df.status = p_status_fiscal)
    and (
      p_forma_pagamento is null
      or exists (
        select 1
        from public.recebimentos_pagamentos fp
        where fp.recebimento_id = r.id
          and fp.forma_pagamento = p_forma_pagamento
      )
    )
), candidatos as materialized (
  select b.*
  from base b
  where p_cursor_data is null
    or (b.registrado_em, b.id) < (p_cursor_data, p_cursor_id)
  order by b.registrado_em desc, b.id desc
  limit p_limite + 1
), pagina as materialized (
  select * from candidatos
  order by registrado_em desc, id desc
  limit p_limite
), ultimo as (
  select registrado_em, id
  from pagina
  order by registrado_em, id
  limit 1
), itens as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'data', q.registrado_em,
        'clinica', q.clinica,
        'profissional', q.profissional,
        'paciente', q.paciente,
        'status', q.status,
        'valor_bruto', q.valor_bruto,
        'percentual_clinica', q.percentual_clinica,
        'valor_clinica', q.valor_clinica,
        'valor_profissional', q.valor_profissional,
        'valor_estornado', q.valor_estornado,
        'valor_estornado_clinica', q.valor_estornado_clinica,
        'valor_estornado_profissional', q.valor_estornado_profissional,
        'valor_liquido_atual', q.valor_liquido_atual,
        'valor_clinica_liquida', q.valor_clinica_liquida,
        'valor_profissional_liquido', q.valor_profissional_liquido,
        'formas_pagamento', q.formas_pagamento,
        'dinheiro', q.dinheiro,
        'pix', q.pix,
        'cartao_credito', q.cartao_credito
      ) || case when p_incluir_fiscal
        then jsonb_build_object('status_fiscal', q.status_fiscal)
        else '{}'::jsonb end
      order by q.registrado_em desc, q.id desc
    ),
    '[]'::jsonb
  ) as valor
  from pagina q
), totais as (
  select jsonb_build_object(
    'quantidade', count(*),
    'pacientes_distintos', count(distinct paciente_id),
    'bruto', coalesce(sum(valor_bruto), 0),
    'clinica_bruta', coalesce(sum(valor_clinica), 0),
    'profissional_bruta', coalesce(sum(valor_profissional), 0),
    'estornado', coalesce(sum(valor_estornado), 0),
    'clinica_liquida', coalesce(sum(valor_clinica_liquida), 0),
    'profissional_liquida', coalesce(sum(valor_profissional_liquido), 0),
    'liquido_atual', coalesce(sum(valor_liquido_atual), 0),
    'dinheiro', coalesce(sum(dinheiro), 0),
    'pix', coalesce(sum(pix), 0),
    'cartao_credito', coalesce(sum(cartao_credito), 0)
  ) as valor
  from base
), marcador as (
  select md5(coalesce(string_agg(concat_ws('|',
    id::text,
    registrado_em::text,
    clinica,
    profissional,
    paciente,
    status::text,
    valor_bruto::text,
    valor_clinica::text,
    valor_profissional::text,
    valor_estornado::text,
    valor_estornado_clinica::text,
    valor_estornado_profissional::text,
    dinheiro::text,
    pix::text,
    cartao_credito::text,
    formas_pagamento::text,
    coalesce(status_fiscal::text, '')
  ), ';' order by registrado_em, id), 'vazio')) as valor
  from base
)
select jsonb_build_object(
  'versao', 2,
  'dataset', 'recebimentos',
  'contexto', p_contexto,
  'marcador', (select valor from marcador),
  'inicio', p_inicio,
  'fim', p_fim,
  'ordenacao', 'data_desc_id_desc',
  'itens', (select valor from itens),
  'totais', (select valor from totais),
  'pagina', jsonb_build_object(
    'limite', p_limite,
    'quantidade', (select count(*) from pagina),
    'tem_mais', (select count(*) > p_limite from candidatos),
    'proximo_cursor', case when (select count(*) > p_limite from candidatos)
      then (select jsonb_build_object('data', registrado_em, 'id', id, 'contexto', p_contexto) from ultimo)
      else null end
  )
);
$$;

create function private.financeiro_relatorio_repasses_nucleo(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_clinicas uuid[],
  p_profissional_id uuid,
  p_status_repasse text,
  p_evento text,
  p_limite integer,
  p_cursor_data timestamptz,
  p_cursor_id uuid,
  p_contexto text
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
with base as materialized (
  select
    r.id,
    case when p_evento = 'pagos_periodo' then r.confirmado_em else r.gerado_em end as data_evento,
    r.gerado_em,
    r.confirmado_em,
    c.nome as clinica,
    p.nome_completo as profissional,
    r.status,
    r.valor_bruto_profissional,
    r.valor_estornos_antes_pagamento,
    r.valor_ajustes_aplicados,
    r.valor_liquido,
    r.meio_pagamento
  from public.repasses r
  join public.clinicas c on c.id = r.clinica_id
  join public.profissionais p on p.id = r.profissional_id
  where r.clinica_id = any(p_clinicas)
    and (p_profissional_id is null or r.profissional_id = p_profissional_id)
    and (p_status_repasse is null or r.status = p_status_repasse)
    and (
      (p_evento = 'gerados_periodo' and r.gerado_em >= p_inicio and r.gerado_em < p_fim)
      or
      (p_evento = 'pagos_periodo' and r.status = 'pago'
        and r.confirmado_em >= p_inicio and r.confirmado_em < p_fim)
      or
      (p_evento = 'pendentes_atuais' and r.status = 'pendente')
    )
), candidatos as materialized (
  select b.*
  from base b
  where p_cursor_data is null
    or (b.data_evento, b.id) < (p_cursor_data, p_cursor_id)
  order by b.data_evento desc, b.id desc
  limit p_limite + 1
), pagina as materialized (
  select * from candidatos
  order by data_evento desc, id desc
  limit p_limite
), ultimo as (
  select data_evento, id
  from pagina
  order by data_evento, id
  limit 1
), totais as (
  select jsonb_build_object(
    'quantidade', count(*),
    'valor_bruto_profissional', coalesce(sum(valor_bruto_profissional), 0),
    'valor_estornos_antes_pagamento', coalesce(sum(valor_estornos_antes_pagamento), 0),
    'valor_ajustes_aplicados', coalesce(sum(valor_ajustes_aplicados), 0),
    'valor_liquido', coalesce(sum(valor_liquido), 0)
  ) as valor
  from base
), marcador as (
  select md5(coalesce(string_agg(concat_ws('|',
    id::text,
    data_evento::text,
    gerado_em::text,
    coalesce(confirmado_em::text, ''),
    clinica,
    profissional,
    status::text,
    valor_bruto_profissional::text,
    valor_estornos_antes_pagamento::text,
    valor_ajustes_aplicados::text,
    valor_liquido::text,
    coalesce(meio_pagamento::text, '')
  ), ';' order by data_evento, id), 'vazio')) as valor
  from base
)
select jsonb_build_object(
  'versao', 2,
  'dataset', 'repasses',
  'modo', p_evento,
  'contexto', p_contexto,
  'marcador', (select valor from marcador),
  'inicio', p_inicio,
  'fim', p_fim,
  'ordenacao', 'data_evento_desc_id_desc',
  'itens', coalesce((
    select jsonb_agg(jsonb_build_object(
      'data_evento', q.data_evento,
      'gerado_em', q.gerado_em,
      'confirmado_em', q.confirmado_em,
      'clinica', q.clinica,
      'profissional', q.profissional,
      'status', q.status,
      'valor_bruto_profissional', q.valor_bruto_profissional,
      'valor_estornos_antes_pagamento', q.valor_estornos_antes_pagamento,
      'valor_ajustes_aplicados', q.valor_ajustes_aplicados,
      'valor_liquido', q.valor_liquido,
      'meio_pagamento', q.meio_pagamento
    ) order by q.data_evento desc, q.id desc)
    from pagina q
  ), '[]'::jsonb),
  'totais', (select valor from totais),
  'pagina', jsonb_build_object(
    'limite', p_limite,
    'quantidade', (select count(*) from pagina),
    'tem_mais', (select count(*) > p_limite from candidatos),
    'proximo_cursor', case when (select count(*) > p_limite from candidatos)
      then (select jsonb_build_object('data', data_evento, 'id', id, 'contexto', p_contexto) from ultimo)
      else null end
  )
);
$$;

create function public.financeiro_relatorio_recebimentos_proprietaria(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_clinica_id uuid default null,
  p_profissional_id uuid default null,
  p_paciente_id uuid default null,
  p_forma_pagamento text default null,
  p_status_recebimento text default null,
  p_status_fiscal text default null,
  p_timezone text default 'America/Bahia',
  p_limite integer default 200,
  p_cursor_data timestamptz default null,
  p_cursor_id uuid default null,
  p_cursor_contexto text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare v_clinicas uuid[]; v_contexto text;
begin
  select e.clinicas into v_clinicas
  from private.financeiro_dashboard_escopo(p_clinica_id, false) e;
  perform private.financeiro_dashboard_validar(
    p_inicio, p_fim, p_forma_pagamento, p_status_recebimento, null, p_status_fiscal, p_timezone
  );
  select array_agg(x order by x) into v_clinicas from unnest(v_clinicas) x;
  v_contexto := md5(jsonb_build_object(
    'versao', 2, 'rpc', 'recebimentos_proprietaria', 'usuario', auth.uid(),
    'inicio', p_inicio, 'fim', p_fim, 'clinicas', v_clinicas,
    'profissional', p_profissional_id, 'paciente', p_paciente_id,
    'forma', p_forma_pagamento, 'status_recebimento', p_status_recebimento,
    'status_fiscal', p_status_fiscal, 'timezone', p_timezone
  )::text);
  perform private.financeiro_relatorio_validar_pagina(
    p_limite, p_cursor_data, p_cursor_id, p_cursor_contexto, v_contexto
  );
  return private.financeiro_relatorio_recebimentos_nucleo(
    p_inicio, p_fim, v_clinicas, p_profissional_id, p_paciente_id,
    p_forma_pagamento, p_status_recebimento, p_status_fiscal,
    p_limite, p_cursor_data, p_cursor_id, v_contexto, true
  ) || jsonb_build_object('publico', 'proprietaria', 'timezone', p_timezone);
end;
$$;

create function public.financeiro_relatorio_recebimentos_profissional(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_clinica_id uuid default null,
  p_forma_pagamento text default null,
  p_status_recebimento text default null,
  p_timezone text default 'America/Bahia',
  p_limite integer default 200,
  p_cursor_data timestamptz default null,
  p_cursor_id uuid default null,
  p_cursor_contexto text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare v_clinicas uuid[]; v_profissional uuid; v_contexto text;
begin
  select e.clinicas, e.profissional_id into v_clinicas, v_profissional
  from private.financeiro_dashboard_escopo(p_clinica_id, true) e;
  perform private.financeiro_dashboard_validar(
    p_inicio, p_fim, p_forma_pagamento, p_status_recebimento, null, null, p_timezone
  );
  select array_agg(x order by x) into v_clinicas from unnest(v_clinicas) x;
  v_contexto := md5(jsonb_build_object(
    'versao', 2, 'rpc', 'recebimentos_profissional', 'usuario', auth.uid(),
    'inicio', p_inicio, 'fim', p_fim, 'clinicas', v_clinicas,
    'profissional', v_profissional, 'forma', p_forma_pagamento,
    'status_recebimento', p_status_recebimento, 'timezone', p_timezone
  )::text);
  perform private.financeiro_relatorio_validar_pagina(
    p_limite, p_cursor_data, p_cursor_id, p_cursor_contexto, v_contexto
  );
  return private.financeiro_relatorio_recebimentos_nucleo(
    p_inicio, p_fim, v_clinicas, v_profissional, null,
    p_forma_pagamento, p_status_recebimento, null,
    p_limite, p_cursor_data, p_cursor_id, v_contexto, false
  ) || jsonb_build_object('publico', 'profissional', 'timezone', p_timezone);
end;
$$;

create function public.financeiro_relatorio_repasses_proprietaria(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_clinica_id uuid default null,
  p_profissional_id uuid default null,
  p_status_repasse text default null,
  p_evento text default 'gerados_periodo',
  p_timezone text default 'America/Bahia',
  p_limite integer default 200,
  p_cursor_data timestamptz default null,
  p_cursor_id uuid default null,
  p_cursor_contexto text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare v_clinicas uuid[]; v_contexto text;
begin
  select e.clinicas into v_clinicas
  from private.financeiro_dashboard_escopo(p_clinica_id, false) e;
  perform private.financeiro_dashboard_validar(
    p_inicio, p_fim, null, null, p_status_repasse, null, p_timezone
  );
  if p_evento is null or p_evento not in ('gerados_periodo', 'pagos_periodo', 'pendentes_atuais') then
    raise exception using errcode = '22023', message = 'Modo de repasse invalido.';
  end if;
  if p_evento = 'pagos_periodo' and p_status_repasse is not null and p_status_repasse <> 'pago' then
    raise exception using errcode = '22023', message = 'Modo pagos_periodo aceita somente status pago.';
  end if;
  if p_evento = 'pendentes_atuais' and p_status_repasse is not null and p_status_repasse <> 'pendente' then
    raise exception using errcode = '22023', message = 'Modo pendentes_atuais aceita somente status pendente.';
  end if;
  select array_agg(x order by x) into v_clinicas from unnest(v_clinicas) x;
  v_contexto := md5(jsonb_build_object(
    'versao', 2, 'rpc', 'repasses_proprietaria', 'usuario', auth.uid(),
    'inicio', p_inicio, 'fim', p_fim, 'clinicas', v_clinicas,
    'profissional', p_profissional_id, 'status_repasse', p_status_repasse,
    'modo', p_evento, 'timezone', p_timezone
  )::text);
  perform private.financeiro_relatorio_validar_pagina(
    p_limite, p_cursor_data, p_cursor_id, p_cursor_contexto, v_contexto
  );
  return private.financeiro_relatorio_repasses_nucleo(
    p_inicio, p_fim, v_clinicas, p_profissional_id, p_status_repasse,
    p_evento, p_limite, p_cursor_data, p_cursor_id, v_contexto
  ) || jsonb_build_object('publico', 'proprietaria', 'timezone', p_timezone);
end;
$$;

create function public.financeiro_relatorio_repasses_profissional(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_clinica_id uuid default null,
  p_status_repasse text default null,
  p_evento text default 'gerados_periodo',
  p_timezone text default 'America/Bahia',
  p_limite integer default 200,
  p_cursor_data timestamptz default null,
  p_cursor_id uuid default null,
  p_cursor_contexto text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare v_clinicas uuid[]; v_profissional uuid; v_contexto text;
begin
  select e.clinicas, e.profissional_id into v_clinicas, v_profissional
  from private.financeiro_dashboard_escopo(p_clinica_id, true) e;
  perform private.financeiro_dashboard_validar(
    p_inicio, p_fim, null, null, p_status_repasse, null, p_timezone
  );
  if p_evento is null or p_evento not in ('gerados_periodo', 'pagos_periodo', 'pendentes_atuais') then
    raise exception using errcode = '22023', message = 'Modo de repasse invalido.';
  end if;
  if p_evento = 'pagos_periodo' and p_status_repasse is not null and p_status_repasse <> 'pago' then
    raise exception using errcode = '22023', message = 'Modo pagos_periodo aceita somente status pago.';
  end if;
  if p_evento = 'pendentes_atuais' and p_status_repasse is not null and p_status_repasse <> 'pendente' then
    raise exception using errcode = '22023', message = 'Modo pendentes_atuais aceita somente status pendente.';
  end if;
  select array_agg(x order by x) into v_clinicas from unnest(v_clinicas) x;
  v_contexto := md5(jsonb_build_object(
    'versao', 2, 'rpc', 'repasses_profissional', 'usuario', auth.uid(),
    'inicio', p_inicio, 'fim', p_fim, 'clinicas', v_clinicas,
    'profissional', v_profissional, 'status_repasse', p_status_repasse,
    'modo', p_evento, 'timezone', p_timezone
  )::text);
  perform private.financeiro_relatorio_validar_pagina(
    p_limite, p_cursor_data, p_cursor_id, p_cursor_contexto, v_contexto
  );
  return private.financeiro_relatorio_repasses_nucleo(
    p_inicio, p_fim, v_clinicas, v_profissional, p_status_repasse,
    p_evento, p_limite, p_cursor_data, p_cursor_id, v_contexto
  ) || jsonb_build_object('publico', 'profissional', 'timezone', p_timezone);
end;
$$;

create function public.financeiro_relatorio_fiscal_proprietaria(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_clinica_id uuid default null,
  p_profissional_id uuid default null,
  p_paciente_id uuid default null,
  p_forma_pagamento text default null,
  p_status_recebimento text default null,
  p_status_fiscal text default null,
  p_timezone text default 'America/Bahia',
  p_limite integer default 200,
  p_cursor_data timestamptz default null,
  p_cursor_id uuid default null,
  p_cursor_contexto text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare v_clinicas uuid[]; v_result jsonb; v_contexto text;
begin
  select e.clinicas into v_clinicas
  from private.financeiro_dashboard_escopo(p_clinica_id, false) e;
  perform private.financeiro_dashboard_validar(
    p_inicio, p_fim, p_forma_pagamento, p_status_recebimento, null, p_status_fiscal, p_timezone
  );
  select array_agg(x order by x) into v_clinicas from unnest(v_clinicas) x;
  v_contexto := md5(jsonb_build_object(
    'versao', 2, 'rpc', 'fiscal_proprietaria', 'usuario', auth.uid(),
    'inicio', p_inicio, 'fim', p_fim, 'clinicas', v_clinicas,
    'profissional', p_profissional_id, 'paciente', p_paciente_id,
    'forma', p_forma_pagamento, 'status_recebimento', p_status_recebimento,
    'status_fiscal', p_status_fiscal, 'timezone', p_timezone
  )::text);
  perform private.financeiro_relatorio_validar_pagina(
    p_limite, p_cursor_data, p_cursor_id, p_cursor_contexto, v_contexto
  );

  with base as materialized (
    select
      d.id,
      r.registrado_em,
      c.nome as clinica,
      pr.nome_completo as profissional,
      pa.nome_completo as paciente,
      r.valor_bruto,
      d.status,
      d.numero_documento,
      d.serie,
      d.emitido_em,
      d.cancelado_em,
      d.updated_at
    from public.documentos_fiscais d
    join public.recebimentos r
      on r.id = d.recebimento_id and r.clinica_id = d.clinica_id
    join public.clinicas c on c.id = d.clinica_id
    join public.profissionais pr on pr.id = r.profissional_id
    join public.pacientes pa on pa.id = r.paciente_id
    where d.clinica_id = any(v_clinicas)
      and r.registrado_em >= p_inicio and r.registrado_em < p_fim
      and (p_profissional_id is null or r.profissional_id = p_profissional_id)
      and (p_paciente_id is null or r.paciente_id = p_paciente_id)
      and (p_status_recebimento is null or r.status = p_status_recebimento)
      and (p_status_fiscal is null or d.status = p_status_fiscal)
      and (p_forma_pagamento is null or exists (
        select 1 from public.recebimentos_pagamentos fp
        where fp.recebimento_id = r.id and fp.forma_pagamento = p_forma_pagamento
      ))
  ), candidatos as materialized (
    select b.* from base b
    where p_cursor_data is null or (b.registrado_em, b.id) < (p_cursor_data, p_cursor_id)
    order by b.registrado_em desc, b.id desc
    limit p_limite + 1
  ), pagina as materialized (
    select * from candidatos order by registrado_em desc, id desc limit p_limite
  ), ultimo as (
    select registrado_em, id from pagina order by registrado_em, id limit 1
  ), totais as (
    select jsonb_build_object(
      'quantidade', count(*),
      'valor_bruto', coalesce(sum(valor_bruto), 0),
      'por_status', jsonb_build_object(
        'pendente', count(*) filter (where status = 'pendente'),
        'emissao_solicitada', count(*) filter (where status = 'emissao_solicitada'),
        'emitida', count(*) filter (where status = 'emitida'),
        'erro_emissao', count(*) filter (where status = 'erro_emissao'),
        'cancelamento_solicitado', count(*) filter (where status = 'cancelamento_solicitado'),
        'cancelada', count(*) filter (where status = 'cancelada'),
        'erro_cancelamento', count(*) filter (where status = 'erro_cancelamento')
      )
    ) as valor
    from base
  ), marcador as (
    select md5(coalesce(string_agg(concat_ws('|',
      id::text,
      registrado_em::text,
      clinica,
      profissional,
      paciente,
      status::text,
      valor_bruto::text,
      coalesce(numero_documento, ''),
      coalesce(serie, ''),
      coalesce(emitido_em::text, ''),
      coalesce(cancelado_em::text, ''),
      updated_at::text
    ), ';' order by registrado_em, id), 'vazio')) as valor
    from base
  )
  select jsonb_build_object(
    'versao', 2,
    'dataset', 'fiscal',
    'publico', 'proprietaria',
    'contexto', v_contexto,
    'marcador', (select valor from marcador),
    'inicio', p_inicio,
    'fim', p_fim,
    'timezone', p_timezone,
    'ordenacao', 'data_recebimento_desc_id_desc',
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
      'data_recebimento', q.registrado_em,
      'clinica', q.clinica,
      'profissional', q.profissional,
      'paciente', q.paciente,
      'valor_bruto', q.valor_bruto,
      'status_fiscal', q.status,
      'numero_documento', q.numero_documento,
      'serie', q.serie,
      'emitido_em', q.emitido_em,
      'cancelado_em', q.cancelado_em,
      'atualizado_em', q.updated_at
    ) order by q.registrado_em desc, q.id desc) from pagina q), '[]'::jsonb),
    'totais', (select valor from totais),
    'pagina', jsonb_build_object(
      'limite', p_limite,
      'quantidade', (select count(*) from pagina),
      'tem_mais', (select count(*) > p_limite from candidatos),
      'proximo_cursor', case when (select count(*) > p_limite from candidatos)
        then (select jsonb_build_object('data', registrado_em, 'id', id, 'contexto', v_contexto) from ultimo)
        else null end
    )
  ) into v_result;

  return v_result;
end;
$$;

create function public.financeiro_registrar_solicitacao_exportacao(
  p_publico text,
  p_dataset text,
  p_formato text,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_clinica_id uuid default null,
  p_filtros jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  v_clinicas uuid[];
  v_profissional uuid;
  v_solicitacao_id uuid := gen_random_uuid();
  v_clinica uuid;
  v_timezone text := coalesce(nullif(p_filtros ->> 'timezone', ''), 'America/Bahia');
  v_chave text;
  v_tipo text;
begin
  if p_publico is null or p_publico not in ('proprietaria', 'profissional')
    or p_formato is null or p_formato not in ('pdf', 'xlsx') then
    raise exception using errcode = '22023', message = 'Publico ou formato de exportacao invalido.';
  end if;
  if p_dataset is null
    or (p_publico = 'proprietaria' and p_dataset not in ('recebimentos', 'repasses', 'fiscal', 'financeiro_consolidado'))
    or (p_publico = 'profissional' and p_dataset <> 'financeiro_profissional') then
    raise exception using errcode = '22023', message = 'Dataset de exportacao invalido para o publico.';
  end if;
  if p_filtros is null or jsonb_typeof(p_filtros) <> 'object' then
    raise exception using errcode = '22023', message = 'Filtros de exportacao devem ser objeto JSON.';
  end if;
  for v_chave in select jsonb_object_keys(p_filtros) loop
    if v_chave not in (
      'timezone', 'clinica_filtrada', 'profissional_filtrado', 'paciente_filtrado',
      'forma_pagamento', 'status_recebimento', 'status_repasse', 'status_fiscal', 'modo_repasse'
    ) then
      raise exception using errcode = '22023', message = 'Filtro de auditoria de exportacao invalido.';
    end if;
    v_tipo := jsonb_typeof(p_filtros -> v_chave);
    if (v_chave in ('clinica_filtrada', 'profissional_filtrado', 'paciente_filtrado') and v_tipo not in ('boolean', 'null'))
      or (v_chave not in ('clinica_filtrada', 'profissional_filtrado', 'paciente_filtrado') and v_tipo not in ('string', 'null')) then
      raise exception using errcode = '22023', message = 'Tipo de filtro de auditoria de exportacao invalido.';
    end if;
  end loop;

  if nullif(p_filtros ->> 'forma_pagamento', '') is not null
    and not ((p_filtros ->> 'forma_pagamento') = any(array['dinheiro','pix','cartao_credito'])) then
    raise exception using errcode = '22023', message = 'Forma de pagamento invalida na auditoria.';
  end if;
  if nullif(p_filtros ->> 'status_recebimento', '') is not null
    and not ((p_filtros ->> 'status_recebimento') = any(array['confirmado','parcialmente_estornado','estornado'])) then
    raise exception using errcode = '22023', message = 'Status de recebimento invalido na auditoria.';
  end if;
  if nullif(p_filtros ->> 'status_repasse', '') is not null
    and not ((p_filtros ->> 'status_repasse') = any(array['em_formacao','pendente','pago','ajustado'])) then
    raise exception using errcode = '22023', message = 'Status de repasse invalido na auditoria.';
  end if;
  if nullif(p_filtros ->> 'status_fiscal', '') is not null
    and not ((p_filtros ->> 'status_fiscal') = any(array[
      'pendente','emissao_solicitada','emitida','erro_emissao',
      'cancelamento_solicitado','cancelada','erro_cancelamento'
    ])) then
    raise exception using errcode = '22023', message = 'Status fiscal invalido na auditoria.';
  end if;
  if nullif(p_filtros ->> 'modo_repasse', '') is not null
    and not ((p_filtros ->> 'modo_repasse') = any(array['gerados_periodo','pagos_periodo','pendentes_atuais'])) then
    raise exception using errcode = '22023', message = 'Modo de repasse invalido na auditoria.';
  end if;

  perform private.financeiro_dashboard_validar(p_inicio, p_fim, null, null, null, null, v_timezone);
  select e.clinicas, e.profissional_id into v_clinicas, v_profissional
  from private.financeiro_dashboard_escopo(p_clinica_id, p_publico = 'profissional') e;

  foreach v_clinica in array v_clinicas loop
    insert into public.eventos_auditoria_financeira(
      clinica_id, usuario_id, papel, acao, entidade, entidade_id, dados
    ) values (
      v_clinica,
      auth.uid(),
      case when p_publico = 'profissional'
        then 'medico'::public.papel_usuario
        else 'proprietaria'::public.papel_usuario end,
      'solicitar_exportacao_financeira',
      'solicitacao_exportacao',
      v_solicitacao_id,
      jsonb_build_object(
        'publico', p_publico,
        'dataset', p_dataset,
        'formato', p_formato,
        'inicio', p_inicio,
        'fim', p_fim,
        'filtros', p_filtros,
        'resultado', 'nao_registrado'
      )
    );
  end loop;

  return jsonb_build_object(
    'solicitacao_id', v_solicitacao_id,
    'registrado_em', now(),
    'clinicas_registradas', cardinality(v_clinicas),
    'observacao', 'A auditoria registra somente a solicitacao, nao o sucesso da geracao.'
  );
end;
$$;

revoke all on function
  private.financeiro_relatorio_recebimentos_nucleo(timestamptz,timestamptz,uuid[],uuid,uuid,text,text,text,integer,timestamptz,uuid,text,boolean),
  private.financeiro_relatorio_repasses_nucleo(timestamptz,timestamptz,uuid[],uuid,text,text,integer,timestamptz,uuid,text)
from public, anon, authenticated;

revoke all on function
  public.financeiro_relatorio_recebimentos_proprietaria(timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,integer,timestamptz,uuid,text),
  public.financeiro_relatorio_recebimentos_profissional(timestamptz,timestamptz,uuid,text,text,text,integer,timestamptz,uuid,text),
  public.financeiro_relatorio_repasses_proprietaria(timestamptz,timestamptz,uuid,uuid,text,text,text,integer,timestamptz,uuid,text),
  public.financeiro_relatorio_repasses_profissional(timestamptz,timestamptz,uuid,text,text,text,integer,timestamptz,uuid,text),
  public.financeiro_relatorio_fiscal_proprietaria(timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,integer,timestamptz,uuid,text),
  public.financeiro_registrar_solicitacao_exportacao(text,text,text,timestamptz,timestamptz,uuid,jsonb)
from public, anon, authenticated;

grant execute on function
  public.financeiro_relatorio_recebimentos_proprietaria(timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,integer,timestamptz,uuid,text),
  public.financeiro_relatorio_recebimentos_profissional(timestamptz,timestamptz,uuid,text,text,text,integer,timestamptz,uuid,text),
  public.financeiro_relatorio_repasses_proprietaria(timestamptz,timestamptz,uuid,uuid,text,text,text,integer,timestamptz,uuid,text),
  public.financeiro_relatorio_repasses_profissional(timestamptz,timestamptz,uuid,text,text,text,integer,timestamptz,uuid,text),
  public.financeiro_relatorio_fiscal_proprietaria(timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,integer,timestamptz,uuid,text),
  public.financeiro_registrar_solicitacao_exportacao(text,text,text,timestamptz,timestamptz,uuid,jsonb)
to authenticated;

commit;
