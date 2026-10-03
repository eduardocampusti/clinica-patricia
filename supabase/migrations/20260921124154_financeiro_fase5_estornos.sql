-- FASE 5: estornos parciais e totais do Financeiro.
-- Migration criada para revisao; NAO aplicada.
-- Preserva recebimentos e componentes originais, caixa legado, fiscal e repasses.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- Permite FKs compostas que garantem o mesmo recebimento e a mesma clinica.
alter table public.recebimentos
  add constraint recebimentos_id_clinica_unique unique (id, clinica_id);

create table public.estornos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null
    references public.clinicas(id) on delete restrict,
  recebimento_id uuid not null,
  valor_total numeric(12,2) not null,
  valor_clinica numeric(12,2) not null,
  valor_profissional numeric(12,2) not null,
  motivo text not null,
  status text not null default 'solicitado',
  idempotency_key text not null unique,
  solicitado_por uuid not null
    references public.usuarios(id) on delete restrict,
  solicitado_em timestamptz not null default now(),
  revisado_por uuid
    references public.usuarios(id) on delete restrict,
  revisado_em timestamptz,
  observacao_revisao text,
  efetivado_por uuid
    references public.usuarios(id) on delete restrict,
  efetivado_em timestamptz,
  constraint estornos_valores_check check (
    valor_total > 0
    and valor_clinica >= 0
    and valor_profissional >= 0
    and valor_total < 'NaN'::numeric
    and valor_clinica < 'NaN'::numeric
    and valor_profissional < 'NaN'::numeric
    and valor_clinica + valor_profissional = valor_total
  ),
  constraint estornos_motivo_check check (btrim(motivo) <> ''),
  constraint estornos_status_check check (
    status in ('solicitado', 'aprovado', 'rejeitado', 'efetivado')
  ),
  constraint estornos_idempotency_key_formato_check check (
    idempotency_key = btrim(idempotency_key)
    and char_length(idempotency_key) between 1 and 200
  ),
  constraint estornos_estado_campos_check check (
    (
      status = 'solicitado'
      and revisado_por is null and revisado_em is null
      and efetivado_por is null and efetivado_em is null
    )
    or (
      status in ('aprovado', 'rejeitado')
      and revisado_por is not null and revisado_em is not null
      and efetivado_por is null and efetivado_em is null
    )
    or (
      status = 'efetivado'
      and revisado_por is not null and revisado_em is not null
      and efetivado_por is not null and efetivado_em is not null
    )
  ),
  constraint estornos_id_clinica_recebimento_unique
    unique (id, clinica_id, recebimento_id),
  constraint estornos_recebimento_clinica_fk
    foreign key (recebimento_id, clinica_id)
    references public.recebimentos(id, clinica_id)
    on delete restrict
);

create index estornos_clinica_status_data_idx
  on public.estornos (clinica_id, status, solicitado_em desc);
create index estornos_recebimento_status_idx
  on public.estornos (recebimento_id, status);
create index estornos_solicitado_por_idx
  on public.estornos (solicitado_por);
create index estornos_revisado_por_idx
  on public.estornos (revisado_por)
  where revisado_por is not null;

create table public.estornos_pagamentos (
  id uuid primary key default gen_random_uuid(),
  estorno_id uuid not null
    references public.estornos(id) on delete restrict,
  forma_pagamento text not null
    check (forma_pagamento in ('dinheiro', 'pix', 'cartao_credito')),
  valor numeric(12,2) not null
    check (
      valor > 0
      and valor < 'NaN'::numeric
      and valor = round(valor, 2)
    ),
  created_at timestamptz not null default now(),
  constraint estornos_pagamentos_estorno_forma_unique
    unique (estorno_id, forma_pagamento)
);

create index estornos_pagamentos_estorno_idx
  on public.estornos_pagamentos (estorno_id);

-- A soma dos componentes e validada no fim da transacao, depois que a RPC
-- inserir o pai e todos os componentes.
create function private.financeiro_validar_soma_estorno_pagamentos()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_estorno_id uuid;
  v_estorno_ids uuid[];
  v_valor_total numeric(12,2);
  v_total_componentes numeric;
begin
  if tg_table_schema = 'public' and tg_table_name = 'estornos' then
    v_estorno_ids := array[new.id];
  elsif tg_table_schema = 'public' and tg_table_name = 'estornos_pagamentos' then
    if tg_op = 'INSERT' then
      v_estorno_ids := array[new.estorno_id];
    elsif tg_op = 'DELETE' then
      v_estorno_ids := array[old.estorno_id];
    else
      v_estorno_ids := array[old.estorno_id, new.estorno_id];
    end if;
  else
    raise exception 'Trigger financeiro associado a tabela inesperada.';
  end if;

  foreach v_estorno_id in array v_estorno_ids loop
    select e.valor_total into v_valor_total
    from public.estornos e where e.id = v_estorno_id;
    if not found then
      continue;
    end if;

    select coalesce(sum(ep.valor), 0::numeric) into v_total_componentes
    from public.estornos_pagamentos ep
    where ep.estorno_id = v_estorno_id;

    if v_total_componentes <> v_valor_total then
      raise exception using
        errcode = '23514',
        message = 'A soma dos componentes do estorno deve ser igual ao valor total.';
    end if;
  end loop;
  return null;
end;
$$;

revoke all privileges on function
  private.financeiro_validar_soma_estorno_pagamentos()
from public, anon, authenticated;

create constraint trigger estornos_soma_pagamentos_ct
after insert or update of valor_total on public.estornos
deferrable initially deferred
for each row execute function private.financeiro_validar_soma_estorno_pagamentos();

create constraint trigger estornos_pagamentos_soma_ct
after insert or update or delete on public.estornos_pagamentos
deferrable initially deferred
for each row execute function private.financeiro_validar_soma_estorno_pagamentos();

-- Componentes confirmados sao imutaveis. Correcao exige rejeicao e nova
-- solicitacao, preservando integralmente o historico.
create function private.financeiro_bloquear_mutacao_estorno_pagamento()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'Componentes de estorno nao podem ser alterados ou excluidos.';
end;
$$;

revoke all privileges on function
  private.financeiro_bloquear_mutacao_estorno_pagamento()
from public, anon, authenticated;

create trigger estornos_pagamentos_bloquear_update_delete
before update or delete on public.estornos_pagamentos
for each row execute function private.financeiro_bloquear_mutacao_estorno_pagamento();

create trigger estornos_bloquear_delete
before delete on public.estornos
for each row execute function private.financeiro_bloquear_exclusao_historico();

-- RLS: leitura direta somente para proprietaria e recepcao ativas da clinica.
alter table public.estornos enable row level security;
alter table public.estornos_pagamentos enable row level security;

create policy estornos_select_administrativo
on public.estornos for select to authenticated
using (
  private.financeiro_tem_papel_clinica(
    clinica_id,
    array['proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario]
  )
);

create policy estornos_pagamentos_select_administrativo
on public.estornos_pagamentos for select to authenticated
using (
  exists (
    select 1 from public.estornos e
    where e.id = estornos_pagamentos.estorno_id
      and private.financeiro_tem_papel_clinica(
        e.clinica_id,
        array['proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario]
      )
  )
);

revoke all privileges on table public.estornos from public, anon, authenticated;
revoke all privileges on table public.estornos_pagamentos from public, anon, authenticated;
grant select on table public.estornos to authenticated;
grant select on table public.estornos_pagamentos to authenticated;

-- O movimento registra o evento total; os componentes preservam a distribuicao.
alter table public.movimentos_caixa
  add column estorno_id uuid
    references public.estornos(id) on delete restrict;

create index movimentos_caixa_estorno_idx
  on public.movimentos_caixa (estorno_id);
create unique index movimentos_caixa_estorno_unique
  on public.movimentos_caixa (estorno_id)
  where estorno_id is not null;

alter table public.movimentos_caixa
  drop constraint movimentos_caixa_origem_vinculo_check,
  add constraint movimentos_caixa_origem_vinculo_check check (
    (
      tipo = 'recebimento'
      and recebimento_id is not null and sangria_id is null and estorno_id is null
    )
    or (
      tipo = 'suprimento'
      and recebimento_id is null and sangria_id is null and estorno_id is null
    )
    or (
      tipo = 'sangria'
      and recebimento_id is null and sangria_id is not null and estorno_id is null
    )
    or (
      tipo = 'estorno'
      and recebimento_id is not null and sangria_id is null and estorno_id is not null
    )
    or (
      tipo = 'ajuste'
      and sangria_id is null and estorno_id is null
    )
  ),
  add constraint movimentos_caixa_estorno_contexto_fk
    foreign key (estorno_id, clinica_id, recebimento_id)
    references public.estornos(id, clinica_id, recebimento_id)
    on delete restrict;

alter table public.fechamentos_caixa
  add column total_estornos numeric(12,2) not null default 0,
  add column total_estornos_dinheiro numeric(12,2) not null default 0,
  add column total_estornos_pix numeric(12,2) not null default 0,
  add column total_estornos_cartao_credito numeric(12,2) not null default 0,
  add column estornos_valor_clinica numeric(12,2) not null default 0,
  add column estornos_valor_profissionais numeric(12,2) not null default 0,
  add constraint fechamentos_caixa_estornos_totais_check check (
    total_estornos >= 0
    and total_estornos_dinheiro >= 0
    and total_estornos_pix >= 0
    and total_estornos_cartao_credito >= 0
    and estornos_valor_clinica >= 0
    and estornos_valor_profissionais >= 0
    and total_estornos = total_estornos_dinheiro
      + total_estornos_pix + total_estornos_cartao_credito
  ),
  add constraint fechamentos_caixa_estornos_finitos_check check (
    total_estornos < 'NaN'::numeric
    and total_estornos_dinheiro < 'NaN'::numeric
    and total_estornos_pix < 'NaN'::numeric
    and total_estornos_cartao_credito < 'NaN'::numeric
    and estornos_valor_clinica < 'NaN'::numeric
    and estornos_valor_profissionais < 'NaN'::numeric
  );

-- Mantem a assinatura e os totais brutos; apenas o dinheiro esperado passa
-- a descontar componentes em dinheiro de estornos efetivados nesta sessao.
create or replace function private.financeiro_calcular_caixa(
  p_sessao_caixa_id uuid
)
returns table (
  valor_abertura numeric,
  total_dinheiro numeric,
  total_pix numeric,
  total_cartao_credito numeric,
  total_recebimentos_brutos numeric,
  total_suprimentos numeric,
  total_sangrias numeric,
  valor_esperado numeric,
  total_clinica numeric,
  total_profissionais numeric
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_valor_abertura numeric(12,2);
  v_total_dinheiro numeric(12,2);
  v_total_pix numeric(12,2);
  v_total_cartao numeric(12,2);
  v_total_bruto numeric(12,2);
  v_total_suprimentos numeric(12,2);
  v_total_sangrias numeric(12,2);
  v_total_estornos_dinheiro numeric(12,2);
  v_total_clinica numeric(12,2);
  v_total_profissionais numeric(12,2);
begin
  if exists (
    select 1 from public.entradas_caixa ec
    where ec.sessao_caixa_id = p_sessao_caixa_id
  ) then
    raise exception using errcode = '22023',
      message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
  end if;

  select sc.valor_abertura::numeric(12,2) into v_valor_abertura
  from public.sessoes_caixa sc where sc.id = p_sessao_caixa_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sessao de caixa inexistente.';
  end if;

  select
    coalesce(sum(rp.valor) filter (where rp.forma_pagamento = 'dinheiro'), 0),
    coalesce(sum(rp.valor) filter (where rp.forma_pagamento = 'pix'), 0),
    coalesce(sum(rp.valor) filter (where rp.forma_pagamento = 'cartao_credito'), 0)
  into v_total_dinheiro, v_total_pix, v_total_cartao
  from public.recebimentos r
  join public.recebimentos_pagamentos rp on rp.recebimento_id = r.id
  where r.sessao_caixa_id = p_sessao_caixa_id;

  select coalesce(sum(r.valor_bruto), 0), coalesce(sum(r.valor_clinica), 0),
    coalesce(sum(r.valor_profissional), 0)
  into v_total_bruto, v_total_clinica, v_total_profissionais
  from public.recebimentos r where r.sessao_caixa_id = p_sessao_caixa_id;

  select
    coalesce(sum(mc.valor) filter (where mc.tipo = 'suprimento'), 0),
    coalesce(sum(mc.valor) filter (where mc.tipo = 'sangria'), 0)
  into v_total_suprimentos, v_total_sangrias
  from public.movimentos_caixa mc where mc.sessao_caixa_id = p_sessao_caixa_id;

  select coalesce(sum(ep.valor), 0) into v_total_estornos_dinheiro
  from public.movimentos_caixa mc
  join public.estornos e on e.id = mc.estorno_id and e.status = 'efetivado'
  join public.estornos_pagamentos ep
    on ep.estorno_id = e.id and ep.forma_pagamento = 'dinheiro'
  where mc.sessao_caixa_id = p_sessao_caixa_id and mc.tipo = 'estorno';

  return query select v_valor_abertura, v_total_dinheiro, v_total_pix,
    v_total_cartao, v_total_bruto, v_total_suprimentos, v_total_sangrias,
    (v_valor_abertura + v_total_dinheiro + v_total_suprimentos
      - v_total_sangrias - v_total_estornos_dinheiro)::numeric(12,2),
    v_total_clinica, v_total_profissionais;
end;
$$;

revoke all privileges on function private.financeiro_calcular_caixa(uuid)
from public, anon, authenticated;

create function public.financeiro_solicitar_estorno(
  p_recebimento_id uuid,
  p_pagamentos jsonb,
  p_motivo text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_chave text := btrim(coalesce(p_idempotency_key, ''));
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_recebimento public.recebimentos%rowtype;
  v_existente public.estornos%rowtype;
  v_total numeric(12,2);
  v_reservado_total numeric(12,2);
  v_reservado_clinica numeric(12,2);
  v_reservado_profissional numeric(12,2);
  v_restante_total numeric(12,2);
  v_restante_clinica numeric(12,2);
  v_restante_profissional numeric(12,2);
  v_valor_clinica numeric(12,2);
  v_valor_profissional numeric(12,2);
  v_limite_inferior_clinica numeric(12,2);
  v_limite_superior_clinica numeric(12,2);
  v_pagamentos_normalizados jsonb;
  v_pagamentos_existentes jsonb;
  v_estorno_id uuid;
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;
  if p_recebimento_id is null then
    raise exception using errcode = '22023', message = 'Recebimento obrigatorio.';
  end if;
  if v_motivo is null then
    raise exception using errcode = '22023', message = 'Motivo do estorno obrigatorio.';
  end if;
  if v_chave = '' or char_length(v_chave) > 200 then
    raise exception using errcode = '22023', message = 'Chave de idempotencia invalida.';
  end if;
  if p_pagamentos is null or jsonb_typeof(p_pagamentos) <> 'array'
    or jsonb_array_length(p_pagamentos) = 0 then
    raise exception using errcode = '22023', message = 'Pagamentos devem ser um array nao vazio.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('financeiro_estorno:' || v_chave, 0)
  );

  select e.* into v_existente
  from public.estornos e where e.idempotency_key = v_chave;
  if found then
    if not private.financeiro_tem_papel_clinica(
      v_existente.clinica_id, array['recepcao'::public.papel_usuario]
    ) then
      raise exception using errcode = '42501',
        message = 'Somente recepcao ativa pode solicitar estorno.';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object(
      'forma_pagamento', ep.forma_pagamento, 'valor', ep.valor
    ) order by ep.forma_pagamento), '[]'::jsonb)
    into v_pagamentos_existentes
    from public.estornos_pagamentos ep where ep.estorno_id = v_existente.id;

    select coalesce(jsonb_agg(jsonb_build_object(
      'forma_pagamento', x.forma_pagamento, 'valor', x.valor::numeric(12,2)
    ) order by x.forma_pagamento), '[]'::jsonb)
    into v_pagamentos_normalizados
    from jsonb_to_recordset(p_pagamentos) as x(forma_pagamento text, valor numeric);

    if v_existente.recebimento_id <> p_recebimento_id
      or v_existente.solicitado_por <> v_usuario_id
      or v_existente.motivo <> v_motivo
      or v_pagamentos_existentes <> v_pagamentos_normalizados then
      raise exception using errcode = '23505',
        message = 'Chave de idempotencia ja utilizada em outra operacao.';
    end if;
    return jsonb_build_object('estorno_id', v_existente.id,
      'recebimento_id', v_existente.recebimento_id, 'status', v_existente.status,
      'valor_total', v_existente.valor_total, 'valor_clinica', v_existente.valor_clinica,
      'valor_profissional', v_existente.valor_profissional,
      'pagamentos', v_pagamentos_existentes, 'nova_operacao', false);
  end if;

  if exists (select 1 from public.recebimentos r where r.idempotency_key = v_chave)
    or exists (select 1 from public.sessoes_caixa sc where sc.idempotency_key = v_chave)
    or exists (select 1 from public.movimentos_caixa mc where mc.idempotency_key = v_chave)
    or exists (select 1 from public.sangrias_caixa s where s.idempotency_key = v_chave)
    or exists (select 1 from public.fechamentos_caixa f where f.idempotency_key = v_chave) then
    raise exception using errcode = '23505',
      message = 'Chave de idempotencia ja utilizada em outra operacao.';
  end if;

  select r.* into v_recebimento
  from public.recebimentos r where r.id = p_recebimento_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Recebimento inexistente.';
  end if;
  if not private.financeiro_tem_papel_clinica(
    v_recebimento.clinica_id, array['recepcao'::public.papel_usuario]
  ) then
    raise exception using errcode = '42501',
      message = 'Somente recepcao ativa pode solicitar estorno.';
  end if;
  if v_recebimento.status not in ('confirmado', 'parcialmente_estornado') then
    raise exception using errcode = '22023',
      message = 'Recebimento nao esta disponivel para estorno.';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_pagamentos) as x(forma_pagamento text, valor numeric)
    where x.forma_pagamento is null
      or x.forma_pagamento not in ('dinheiro', 'pix', 'cartao_credito')
      or x.valor is null or x.valor <= 0 or x.valor >= 'NaN'::numeric
      or x.valor <> round(x.valor, 2)
  ) or (
    select count(*) <> count(distinct x.forma_pagamento)
    from jsonb_to_recordset(p_pagamentos) as x(forma_pagamento text, valor numeric)
  ) then
    raise exception using errcode = '22023', message = 'Componentes do estorno invalidos.';
  end if;

  select sum(x.valor)::numeric(12,2),
    jsonb_agg(jsonb_build_object('forma_pagamento', x.forma_pagamento,
      'valor', x.valor::numeric(12,2)) order by x.forma_pagamento)
  into v_total, v_pagamentos_normalizados
  from jsonb_to_recordset(p_pagamentos) as x(forma_pagamento text, valor numeric);

  select coalesce(sum(e.valor_total), 0), coalesce(sum(e.valor_clinica), 0),
    coalesce(sum(e.valor_profissional), 0)
  into v_reservado_total, v_reservado_clinica, v_reservado_profissional
  from public.estornos e
  where e.recebimento_id = v_recebimento.id
    and e.status in ('solicitado', 'aprovado', 'efetivado');

  v_restante_total := v_recebimento.valor_bruto - v_reservado_total;
  v_restante_clinica := v_recebimento.valor_clinica - v_reservado_clinica;
  v_restante_profissional := v_recebimento.valor_profissional - v_reservado_profissional;
  if v_total > v_restante_total then
    raise exception using errcode = '22023',
      message = 'Estorno excede o saldo total disponivel do recebimento.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_pagamentos) as x(forma_pagamento text, valor numeric)
    left join public.recebimentos_pagamentos rp
      on rp.recebimento_id = v_recebimento.id and rp.forma_pagamento = x.forma_pagamento
    where x.valor > coalesce(rp.valor, 0) - coalesce((
      select sum(ep.valor) from public.estornos_pagamentos ep
      join public.estornos e on e.id = ep.estorno_id
      where e.recebimento_id = v_recebimento.id
        and e.status in ('solicitado', 'aprovado', 'efetivado')
        and ep.forma_pagamento = x.forma_pagamento
    ), 0)
  ) then
    raise exception using errcode = '22023',
      message = 'Estorno excede o saldo disponivel de uma forma de pagamento.';
  end if;

  if v_total = v_restante_total then
    v_valor_clinica := v_restante_clinica;
    v_valor_profissional := v_restante_profissional;
  else
    v_limite_inferior_clinica := greatest(0::numeric, v_total - v_restante_profissional);
    v_limite_superior_clinica := least(v_total, v_restante_clinica);
    v_valor_clinica := least(v_limite_superior_clinica,
      greatest(v_limite_inferior_clinica,
        round(v_total * v_recebimento.percentual_clinica / 100, 2)))::numeric(12,2);
    v_valor_profissional := (v_total - v_valor_clinica)::numeric(12,2);
  end if;
  if v_valor_clinica > v_restante_clinica
    or v_valor_profissional > v_restante_profissional then
    raise exception using errcode = '23514',
      message = 'Impacto do estorno excede o snapshot financeiro restante.';
  end if;

  insert into public.estornos (
    clinica_id, recebimento_id, valor_total, valor_clinica, valor_profissional,
    motivo, status, idempotency_key, solicitado_por
  ) values (
    v_recebimento.clinica_id, v_recebimento.id, v_total, v_valor_clinica,
    v_valor_profissional, v_motivo, 'solicitado', v_chave, v_usuario_id
  ) returning id into v_estorno_id;

  insert into public.estornos_pagamentos (estorno_id, forma_pagamento, valor)
  select v_estorno_id, x.forma_pagamento, x.valor::numeric(12,2)
  from jsonb_to_recordset(p_pagamentos) as x(forma_pagamento text, valor numeric);

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id, valor,
    estado_anterior, estado_novo, dados, motivo
  ) values (
    v_recebimento.clinica_id, v_usuario_id, 'recepcao'::public.papel_usuario,
    'solicitar_estorno', 'estorno', v_estorno_id, v_total, null,
    jsonb_build_object('status', 'solicitado'),
    jsonb_build_object('recebimento_id', v_recebimento.id,
      'valor_clinica', v_valor_clinica, 'valor_profissional', v_valor_profissional,
      'pagamentos', v_pagamentos_normalizados), v_motivo
  );

  return jsonb_build_object('estorno_id', v_estorno_id,
    'recebimento_id', v_recebimento.id, 'status', 'solicitado',
    'valor_total', v_total, 'valor_clinica', v_valor_clinica,
    'valor_profissional', v_valor_profissional,
    'pagamentos', v_pagamentos_normalizados, 'nova_operacao', true);
end;
$$;

create function public.financeiro_revisar_estorno(
  p_estorno_id uuid,
  p_acao text,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_acao text := btrim(coalesce(p_acao, ''));
  v_observacao text := nullif(btrim(coalesce(p_observacao, '')), '');
  v_estorno public.estornos%rowtype;
  v_recebimento public.recebimentos%rowtype;
  v_sessao_id uuid;
  v_movimento_id uuid;
  v_dinheiro numeric(12,2);
  v_total_efetivado numeric(12,2);
  v_caixa record;
  v_pagamentos jsonb;
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;
  if v_acao not in ('aprovar', 'rejeitar') then
    raise exception using errcode = '22023', message = 'Acao de revisao de estorno invalida.';
  end if;

  select e.* into v_estorno from public.estornos e
  where e.id = p_estorno_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Estorno inexistente.';
  end if;
  if not private.financeiro_tem_papel_clinica(
    v_estorno.clinica_id, array['proprietaria'::public.papel_usuario]
  ) then
    raise exception using errcode = '42501',
      message = 'Somente proprietaria ativa pode revisar estorno.';
  end if;

  if (v_acao = 'aprovar' and v_estorno.status = 'efetivado')
    or (v_acao = 'rejeitar' and v_estorno.status = 'rejeitado') then
    select mc.id into v_movimento_id from public.movimentos_caixa mc
    where mc.estorno_id = v_estorno.id;
    return jsonb_build_object('estorno_id', v_estorno.id,
      'recebimento_id', v_estorno.recebimento_id, 'status', v_estorno.status,
      'movimento_id', v_movimento_id, 'nova_operacao', false);
  end if;
  if v_estorno.status <> 'solicitado' then
    raise exception using errcode = '22023',
      message = 'Decisao conflitante com o estado atual do estorno.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'forma_pagamento', ep.forma_pagamento, 'valor', ep.valor
  ) order by ep.forma_pagamento), '[]'::jsonb),
    coalesce(sum(ep.valor) filter (where ep.forma_pagamento = 'dinheiro'), 0)
  into v_pagamentos, v_dinheiro
  from public.estornos_pagamentos ep where ep.estorno_id = v_estorno.id;

  if v_acao = 'rejeitar' then
    update public.estornos set status = 'rejeitado', revisado_por = v_usuario_id,
      revisado_em = now(), observacao_revisao = v_observacao
    where id = v_estorno.id;

    insert into public.eventos_auditoria_financeira (
      clinica_id, usuario_id, papel, acao, entidade, entidade_id, valor,
      estado_anterior, estado_novo, dados, motivo
    ) values (
      v_estorno.clinica_id, v_usuario_id, 'proprietaria'::public.papel_usuario,
      'rejeitar_estorno', 'estorno', v_estorno.id, v_estorno.valor_total,
      jsonb_build_object('status', 'solicitado'),
      jsonb_build_object('status', 'rejeitado'),
      jsonb_build_object('recebimento_id', v_estorno.recebimento_id,
        'valor_clinica', v_estorno.valor_clinica,
        'valor_profissional', v_estorno.valor_profissional,
        'pagamentos', v_pagamentos,
        'observacao_revisao', v_observacao), v_estorno.motivo
    );
    return jsonb_build_object('estorno_id', v_estorno.id,
      'recebimento_id', v_estorno.recebimento_id, 'status', 'rejeitado',
      'movimento_id', null, 'nova_operacao', true);
  end if;

  select r.* into v_recebimento from public.recebimentos r
  where r.id = v_estorno.recebimento_id and r.clinica_id = v_estorno.clinica_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Recebimento do estorno inexistente.';
  end if;

  if (select coalesce(sum(e.valor_total), 0) from public.estornos e
      where e.recebimento_id = v_recebimento.id
        and e.status in ('solicitado', 'aprovado', 'efetivado')) > v_recebimento.valor_bruto
    or (select coalesce(sum(e.valor_clinica), 0) from public.estornos e
      where e.recebimento_id = v_recebimento.id
        and e.status in ('solicitado', 'aprovado', 'efetivado')) > v_recebimento.valor_clinica
    or (select coalesce(sum(e.valor_profissional), 0) from public.estornos e
      where e.recebimento_id = v_recebimento.id
        and e.status in ('solicitado', 'aprovado', 'efetivado')) > v_recebimento.valor_profissional then
    raise exception using errcode = '23514', message = 'Reservas de estorno excedem o snapshot do recebimento.';
  end if;
  if exists (
    select 1 from public.estornos_pagamentos atual
    join public.recebimentos_pagamentos rp
      on rp.recebimento_id = v_recebimento.id
      and rp.forma_pagamento = atual.forma_pagamento
    where atual.estorno_id = v_estorno.id
      and (select coalesce(sum(ep.valor), 0)
        from public.estornos_pagamentos ep
        join public.estornos e on e.id = ep.estorno_id
        where e.recebimento_id = v_recebimento.id
          and e.status in ('solicitado', 'aprovado', 'efetivado')
          and ep.forma_pagamento = atual.forma_pagamento) > rp.valor
  ) then
    raise exception using errcode = '23514', message = 'Reservas excedem uma forma de pagamento original.';
  end if;

  select sc.id into v_sessao_id from public.sessoes_caixa sc
  where sc.clinica_id = v_estorno.clinica_id
    and sc.status = 'aberto'::public.status_sessao_caixa
  for update;
  if not found then
    raise exception using errcode = '22023',
      message = 'Efetivacao de estorno exige caixa operacional aberto.';
  end if;
  if exists (select 1 from public.entradas_caixa ec where ec.sessao_caixa_id = v_sessao_id) then
    raise exception using errcode = '22023',
      message = 'Sessao de caixa legada exige transicao controlada e nao aceita estorno.';
  end if;
  select * into v_caixa from private.financeiro_calcular_caixa(v_sessao_id);
  if v_dinheiro > v_caixa.valor_esperado then
    raise exception using errcode = '22023',
      message = 'Estorno em dinheiro excede o dinheiro fisico esperado do caixa.';
  end if;

  update public.estornos set status = 'efetivado', revisado_por = v_usuario_id,
    revisado_em = now(), observacao_revisao = v_observacao,
    efetivado_por = v_usuario_id, efetivado_em = now()
  where id = v_estorno.id;

  insert into public.movimentos_caixa (
    clinica_id, sessao_caixa_id, tipo, recebimento_id, sangria_id, estorno_id,
    valor, motivo, idempotency_key, registrado_por, registrado_em
  ) values (
    v_estorno.clinica_id, v_sessao_id, 'estorno', v_estorno.recebimento_id,
    null, v_estorno.id, v_estorno.valor_total, v_estorno.motivo, null,
    v_usuario_id, now()
  ) returning id into v_movimento_id;

  select coalesce(sum(e.valor_total), 0) into v_total_efetivado
  from public.estornos e
  where e.recebimento_id = v_recebimento.id and e.status = 'efetivado';

  update public.recebimentos set status = case
    when v_total_efetivado = valor_bruto then 'estornado'
    when v_total_efetivado > 0 then 'parcialmente_estornado'
    else 'confirmado' end
  where id = v_recebimento.id;

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id, valor,
    estado_anterior, estado_novo, dados, motivo
  ) values (
    v_estorno.clinica_id, v_usuario_id, 'proprietaria'::public.papel_usuario,
    'efetivar_estorno', 'estorno', v_estorno.id, v_estorno.valor_total,
    jsonb_build_object('status', 'solicitado', 'recebimento_status', v_recebimento.status),
    jsonb_build_object('status', 'efetivado', 'recebimento_status',
      case when v_total_efetivado = v_recebimento.valor_bruto then 'estornado'
        else 'parcialmente_estornado' end),
    jsonb_build_object('recebimento_id', v_estorno.recebimento_id,
      'sessao_caixa_id', v_sessao_id, 'movimento_id', v_movimento_id,
      'valor_clinica', v_estorno.valor_clinica,
      'valor_profissional', v_estorno.valor_profissional,
      'pagamentos', v_pagamentos,
      'observacao_revisao', v_observacao), v_estorno.motivo
  );

  return jsonb_build_object('estorno_id', v_estorno.id,
    'recebimento_id', v_estorno.recebimento_id, 'status', 'efetivado',
    'movimento_id', v_movimento_id, 'sessao_caixa_id', v_sessao_id,
    'recebimento_status', case
      when v_total_efetivado = v_recebimento.valor_bruto then 'estornado'
      else 'parcialmente_estornado' end,
    'nova_operacao', true);
end;
$$;

-- Preserva assinatura, autorizacao, historico e idempotencia da FASE 4,
-- acrescentando apenas os snapshots dos estornos efetivados nesta sessao.
create or replace function public.financeiro_enviar_fechamento(
  p_sessao_caixa_id uuid,
  p_valor_contado numeric,
  p_justificativa_diferenca text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_chave text := btrim(coalesce(p_idempotency_key, ''));
  v_justificativa text := nullif(btrim(coalesce(p_justificativa_diferenca, '')), '');
  v_clinica_id uuid;
  v_status public.status_sessao_caixa;
  v_papel public.papel_usuario;
  v_caixa record;
  v_diferenca numeric(12,2);
  v_tentativa integer;
  v_substitui uuid;
  v_existente public.fechamentos_caixa%rowtype;
  v_fechamento public.fechamentos_caixa%rowtype;
  v_estornos_total numeric(12,2);
  v_estornos_dinheiro numeric(12,2);
  v_estornos_pix numeric(12,2);
  v_estornos_cartao numeric(12,2);
  v_estornos_clinica numeric(12,2);
  v_estornos_profissionais numeric(12,2);
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;
  if p_valor_contado is null or p_valor_contado < 0 or p_valor_contado > 9999999999.99
    or p_valor_contado <> round(p_valor_contado, 2) then
    raise exception using errcode = '22023', message = 'Valor contado invalido.';
  end if;
  if v_chave = '' or char_length(v_chave) > 200 then
    raise exception using errcode = '22023', message = 'Chave de idempotencia invalida.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('financeiro_fechamento:' || v_chave, 0));
  select f.* into v_existente from public.fechamentos_caixa f where f.idempotency_key = v_chave;
  if found then
    if v_existente.sessao_caixa_id <> p_sessao_caixa_id
      or v_existente.enviado_por <> v_usuario_id
      or v_existente.valor_contado <> p_valor_contado
      or v_existente.justificativa_diferenca is distinct from v_justificativa then
      raise exception using errcode = '23505', message = 'Chave de idempotencia ja utilizada em outra operacao.';
    end if;
    select uc.papel into v_papel from public.usuarios_clinicas uc
    where uc.usuario_id = v_usuario_id and uc.clinica_id = v_existente.clinica_id
      and uc.ativo and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario);
    if not found then
      raise exception using errcode = '42501', message = 'Usuario sem permissao para consultar este fechamento.';
    end if;
    if exists (select 1 from public.entradas_caixa ec where ec.sessao_caixa_id = v_existente.sessao_caixa_id) then
      raise exception using errcode = '22023', message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
    end if;
    return jsonb_build_object('fechamento_id', v_existente.id,
      'sessao_caixa_id', v_existente.sessao_caixa_id, 'tentativa', v_existente.tentativa,
      'status', v_existente.status, 'valor_esperado', v_existente.valor_esperado,
      'valor_contado', v_existente.valor_contado, 'diferenca', v_existente.diferenca,
      'total_estornos', v_existente.total_estornos, 'nova_operacao', false);
  end if;

  select sc.clinica_id, sc.status into v_clinica_id, v_status
  from public.sessoes_caixa sc where sc.id = p_sessao_caixa_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sessao de caixa inexistente.';
  end if;
  select uc.papel into v_papel from public.usuarios_clinicas uc
  where uc.usuario_id = v_usuario_id and uc.clinica_id = v_clinica_id and uc.ativo
    and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario);
  if not found then
    raise exception using errcode = '42501', message = 'Usuario sem permissao para enviar fechamento.';
  end if;
  if exists (select 1 from public.entradas_caixa ec where ec.sessao_caixa_id = p_sessao_caixa_id) then
    raise exception using errcode = '22023', message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
  end if;
  if v_status not in ('em_fechamento'::public.status_sessao_caixa,
    'devolvido_para_correcao'::public.status_sessao_caixa) then
    raise exception using errcode = '22023', message = 'Sessao nao esta pronta para envio de fechamento.';
  end if;
  if exists (select 1 from public.sangrias_caixa s
    where s.sessao_caixa_id = p_sessao_caixa_id and s.status in ('solicitada', 'aprovada')) then
    raise exception using errcode = '22023', message = 'Existem sangrias pendentes antes do fechamento.';
  end if;

  select * into v_caixa from private.financeiro_calcular_caixa(p_sessao_caixa_id);
  v_diferenca := (p_valor_contado - v_caixa.valor_esperado)::numeric(12,2);
  if v_diferenca <> 0 and v_justificativa is null then
    raise exception using errcode = '22023', message = 'Justificativa obrigatoria quando existe diferenca de caixa.';
  end if;

  select coalesce(sum(ep.valor) filter (where ep.forma_pagamento = 'dinheiro'), 0),
    coalesce(sum(ep.valor) filter (where ep.forma_pagamento = 'pix'), 0),
    coalesce(sum(ep.valor) filter (where ep.forma_pagamento = 'cartao_credito'), 0)
  into v_estornos_dinheiro, v_estornos_pix, v_estornos_cartao
  from public.movimentos_caixa mc
  join public.estornos e on e.id = mc.estorno_id and e.status = 'efetivado'
  join public.estornos_pagamentos ep on ep.estorno_id = e.id
  where mc.sessao_caixa_id = p_sessao_caixa_id and mc.tipo = 'estorno';

  -- A agregacao de snapshots nao pode multiplicar o pai pelos componentes.
  select coalesce(sum(e.valor_total), 0), coalesce(sum(e.valor_clinica), 0),
    coalesce(sum(e.valor_profissional), 0)
  into v_estornos_total, v_estornos_clinica, v_estornos_profissionais
  from public.movimentos_caixa mc
  join public.estornos e on e.id = mc.estorno_id and e.status = 'efetivado'
  where mc.sessao_caixa_id = p_sessao_caixa_id and mc.tipo = 'estorno';

  select coalesce(max(f.tentativa), 0) + 1 into v_tentativa
  from public.fechamentos_caixa f where f.sessao_caixa_id = p_sessao_caixa_id;
  if v_status = 'devolvido_para_correcao'::public.status_sessao_caixa then
    select f.id into v_substitui from public.fechamentos_caixa f
    where f.sessao_caixa_id = p_sessao_caixa_id and f.status = 'devolvido'
    order by f.tentativa desc limit 1;
    if not found then
      raise exception using errcode = '22023', message = 'Fechamento devolvido anterior nao encontrado.';
    end if;
  end if;

  insert into public.fechamentos_caixa (
    clinica_id, sessao_caixa_id, tentativa, substitui_fechamento_id, idempotency_key,
    valor_abertura, total_dinheiro, total_pix, total_cartao_credito,
    total_recebimentos_brutos, total_suprimentos, total_sangrias,
    valor_esperado, valor_contado, diferenca, total_clinica, total_profissionais,
    total_estornos, total_estornos_dinheiro, total_estornos_pix,
    total_estornos_cartao_credito, estornos_valor_clinica,
    estornos_valor_profissionais, justificativa_diferenca, status, enviado_por, enviado_em
  ) values (
    v_clinica_id, p_sessao_caixa_id, v_tentativa, v_substitui, v_chave,
    v_caixa.valor_abertura, v_caixa.total_dinheiro, v_caixa.total_pix,
    v_caixa.total_cartao_credito, v_caixa.total_recebimentos_brutos,
    v_caixa.total_suprimentos, v_caixa.total_sangrias, v_caixa.valor_esperado,
    p_valor_contado, v_diferenca, v_caixa.total_clinica, v_caixa.total_profissionais,
    v_estornos_total, v_estornos_dinheiro, v_estornos_pix, v_estornos_cartao,
    v_estornos_clinica, v_estornos_profissionais, v_justificativa,
    'aguardando_aprovacao', v_usuario_id, now()
  ) returning * into v_fechamento;

  update public.sessoes_caixa set status = 'aguardando_aprovacao'::public.status_sessao_caixa
  where id = p_sessao_caixa_id;

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id, valor,
    estado_anterior, estado_novo, dados, motivo
  ) values (
    v_clinica_id, v_usuario_id, v_papel, 'enviar_fechamento',
    'fechamento_caixa', v_fechamento.id, p_valor_contado,
    jsonb_build_object('sessao_status', v_status),
    jsonb_build_object('sessao_status', 'aguardando_aprovacao',
      'fechamento_status', 'aguardando_aprovacao'),
    jsonb_build_object('sessao_caixa_id', p_sessao_caixa_id,
      'tentativa', v_tentativa, 'valor_esperado', v_caixa.valor_esperado,
      'diferenca', v_diferenca, 'total_estornos', v_estornos_total,
      'estornos_dinheiro', v_estornos_dinheiro,
      'estornos_pix', v_estornos_pix,
      'estornos_cartao_credito', v_estornos_cartao,
      'estornos_valor_clinica', v_estornos_clinica,
      'estornos_valor_profissionais', v_estornos_profissionais), v_justificativa
  );

  return jsonb_build_object('fechamento_id', v_fechamento.id,
    'sessao_caixa_id', p_sessao_caixa_id, 'tentativa', v_tentativa,
    'status', v_fechamento.status, 'valor_esperado', v_caixa.valor_esperado,
    'valor_contado', p_valor_contado, 'diferenca', v_diferenca,
    'total_estornos', v_estornos_total, 'nova_operacao', true);
end;
$$;

revoke all privileges on function
  public.financeiro_solicitar_estorno(uuid, jsonb, text, text)
from public, anon;
revoke all privileges on function
  public.financeiro_revisar_estorno(uuid, text, text)
from public, anon;
grant execute on function
  public.financeiro_solicitar_estorno(uuid, jsonb, text, text)
to authenticated;
grant execute on function
  public.financeiro_revisar_estorno(uuid, text, text)
to authenticated;

commit;
