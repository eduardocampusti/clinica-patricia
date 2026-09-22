-- FASE 4 / 2 de 2: operacoes transacionais de caixa.
-- Migration criada para revisao; NAO aplicada.
-- Depende de 20260921115106_financeiro_fase4_caixa_estados.sql.
-- Preserva sessoes, entradas_caixa, movimentos e auditoria legados.
-- A FASE 5 ampliara os calculos de caixa para considerar estornos.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- Uma sessao permanece financeiramente ativa ate aprovacao definitiva.
drop index public.sessoes_caixa_aberta_unica;

create unique index sessoes_caixa_ativa_unica
  on public.sessoes_caixa (clinica_id)
  where status in (
    'aberto'::public.status_sessao_caixa,
    'em_fechamento'::public.status_sessao_caixa,
    'aguardando_aprovacao'::public.status_sessao_caixa,
    'devolvido_para_correcao'::public.status_sessao_caixa
  );

-- Chave nullable preserva sessoes legadas; toda nova abertura via RPC exige-a.
alter table public.sessoes_caixa
  alter column valor_abertura type numeric(12,2),
  alter column valor_esperado type numeric(12,2),
  alter column valor_contado type numeric(12,2),
  alter column diferenca type numeric(12,2),
  add column idempotency_key text,
  add constraint sessoes_caixa_idempotency_key_formato_check
    check (
      idempotency_key is null
      or (
        idempotency_key = btrim(idempotency_key)
        and char_length(idempotency_key) between 1 and 200
      )
    );

alter table public.sessoes_caixa
  add constraint sessoes_caixa_id_clinica_unique
    unique (id, clinica_id);

create unique index sessoes_caixa_idempotency_key_unique
  on public.sessoes_caixa (idempotency_key)
  where idempotency_key is not null;

drop policy if exists sessoes_caixa_insert on public.sessoes_caixa;
drop policy if exists sessoes_caixa_select on public.sessoes_caixa;

alter table public.sessoes_caixa enable row level security;

revoke all privileges on table public.sessoes_caixa
from public, anon, authenticated;

grant select on table public.sessoes_caixa to authenticated;

create policy sessoes_caixa_select_financeiro
on public.sessoes_caixa
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

create table public.sangrias_caixa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null
    references public.clinicas(id) on delete restrict,
  sessao_caixa_id uuid not null
    references public.sessoes_caixa(id) on delete restrict,
  valor numeric(12,2) not null,
  motivo text not null,
  status text not null default 'solicitada',
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
  constraint sangrias_caixa_valor_check
    check (valor > 0 and valor < 'NaN'::numeric),
  constraint sangrias_caixa_motivo_check
    check (btrim(motivo) <> ''),
  constraint sangrias_caixa_status_check
    check (status in ('solicitada', 'aprovada', 'rejeitada', 'efetivada')),
  constraint sangrias_caixa_idempotency_key_formato_check
    check (
      idempotency_key = btrim(idempotency_key)
      and char_length(idempotency_key) between 1 and 200
    ),
  constraint sangrias_caixa_estado_coerente_check
    check (
      (
        status = 'solicitada'
        and revisado_por is null
        and revisado_em is null
        and efetivado_por is null
        and efetivado_em is null
      )
      or (
        status in ('aprovada', 'rejeitada')
        and revisado_por is not null
        and revisado_em is not null
        and efetivado_por is null
        and efetivado_em is null
      )
      or (
        status = 'efetivada'
        and revisado_por is not null
        and revisado_em is not null
        and efetivado_por is not null
        and efetivado_em is not null
      )
    ),
  constraint sangrias_caixa_sessao_clinica_fk
    foreign key (sessao_caixa_id, clinica_id)
    references public.sessoes_caixa (id, clinica_id)
    on delete restrict,
  constraint sangrias_caixa_id_clinica_sessao_unique
    unique (id, clinica_id, sessao_caixa_id)
);

create index sangrias_caixa_clinica_status_data_idx
  on public.sangrias_caixa (clinica_id, status, solicitado_em desc);
create index sangrias_caixa_sessao_status_data_idx
  on public.sangrias_caixa (sessao_caixa_id, status, solicitado_em desc);
create index sangrias_caixa_solicitado_por_idx
  on public.sangrias_caixa (solicitado_por);
create index sangrias_caixa_revisado_por_idx
  on public.sangrias_caixa (revisado_por);
create index sangrias_caixa_efetivado_por_idx
  on public.sangrias_caixa (efetivado_por);

alter table public.movimentos_caixa
  add column sangria_id uuid
    references public.sangrias_caixa(id) on delete restrict,
  add column idempotency_key text;

create index movimentos_caixa_sangria_idx
  on public.movimentos_caixa (sangria_id);

create unique index movimentos_caixa_sangria_unique
  on public.movimentos_caixa (sangria_id)
  where sangria_id is not null;

create unique index movimentos_caixa_idempotency_key_unique
  on public.movimentos_caixa (idempotency_key)
  where idempotency_key is not null;

alter table public.movimentos_caixa
  add constraint movimentos_caixa_idempotency_key_formato_check
    check (
      idempotency_key is null
      or (
        idempotency_key = btrim(idempotency_key)
        and char_length(idempotency_key) between 1 and 200
      )
    ),
  drop constraint movimentos_caixa_recebimento_vinculo_check,
  add constraint movimentos_caixa_origem_vinculo_check
    check (
      (
        tipo in ('recebimento', 'estorno')
        and recebimento_id is not null
        and sangria_id is null
      )
      or (
        tipo = 'suprimento'
        and recebimento_id is null
        and sangria_id is null
      )
      or (
        tipo = 'sangria'
        and recebimento_id is null
        and sangria_id is not null
      )
      or (
        tipo = 'ajuste'
        and sangria_id is null
      )
    ),
  add constraint movimentos_caixa_sangria_contexto_fk
    foreign key (sangria_id, clinica_id, sessao_caixa_id)
    references public.sangrias_caixa (id, clinica_id, sessao_caixa_id)
    on delete restrict;

create table public.fechamentos_caixa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null
    references public.clinicas(id) on delete restrict,
  sessao_caixa_id uuid not null
    references public.sessoes_caixa(id) on delete restrict,
  tentativa integer not null,
  substitui_fechamento_id uuid
    references public.fechamentos_caixa(id) on delete restrict,
  idempotency_key text not null unique,
  valor_abertura numeric(12,2) not null,
  total_dinheiro numeric(12,2) not null,
  total_pix numeric(12,2) not null,
  total_cartao_credito numeric(12,2) not null,
  total_recebimentos_brutos numeric(12,2) not null,
  total_suprimentos numeric(12,2) not null,
  total_sangrias numeric(12,2) not null,
  valor_esperado numeric(12,2) not null,
  valor_contado numeric(12,2) not null,
  diferenca numeric(12,2) not null,
  total_clinica numeric(12,2) not null,
  total_profissionais numeric(12,2) not null,
  justificativa_diferenca text,
  status text not null default 'aguardando_aprovacao',
  enviado_por uuid not null
    references public.usuarios(id) on delete restrict,
  enviado_em timestamptz not null default now(),
  constraint fechamentos_caixa_tentativa_check
    check (tentativa > 0),
  constraint fechamentos_caixa_substituicao_check
    check (substitui_fechamento_id is null or substitui_fechamento_id <> id),
  constraint fechamentos_caixa_idempotency_key_formato_check
    check (
      idempotency_key = btrim(idempotency_key)
      and char_length(idempotency_key) between 1 and 200
    ),
  constraint fechamentos_caixa_totais_check
    check (
      valor_abertura >= 0
      and total_dinheiro >= 0
      and total_pix >= 0
      and total_cartao_credito >= 0
      and total_recebimentos_brutos >= 0
      and total_suprimentos >= 0
      and total_sangrias >= 0
      and valor_contado >= 0
      and total_clinica >= 0
      and total_profissionais >= 0
    ),
  constraint fechamentos_caixa_numericos_finitos_check
    check (
      valor_abertura < 'NaN'::numeric
      and total_dinheiro < 'NaN'::numeric
      and total_pix < 'NaN'::numeric
      and total_cartao_credito < 'NaN'::numeric
      and total_recebimentos_brutos < 'NaN'::numeric
      and total_suprimentos < 'NaN'::numeric
      and total_sangrias < 'NaN'::numeric
      and valor_esperado < 'NaN'::numeric
      and valor_contado < 'NaN'::numeric
      and diferenca < 'NaN'::numeric
      and total_clinica < 'NaN'::numeric
      and total_profissionais < 'NaN'::numeric
    ),
  constraint fechamentos_caixa_diferenca_check
    check (diferenca = valor_contado - valor_esperado),
  constraint fechamentos_caixa_justificativa_check
    check (
      diferenca = 0
      or (
        justificativa_diferenca is not null
        and btrim(justificativa_diferenca) <> ''
      )
    ),
  constraint fechamentos_caixa_status_check
    check (status in ('aguardando_aprovacao', 'aprovado', 'devolvido')),
  constraint fechamentos_caixa_sessao_tentativa_unique
    unique (sessao_caixa_id, tentativa),
  constraint fechamentos_caixa_sessao_clinica_fk
    foreign key (sessao_caixa_id, clinica_id)
    references public.sessoes_caixa (id, clinica_id)
    on delete restrict,
  constraint fechamentos_caixa_id_clinica_unique
    unique (id, clinica_id)
);

create unique index fechamentos_caixa_substituido_unique
  on public.fechamentos_caixa (substitui_fechamento_id)
  where substitui_fechamento_id is not null;
create index fechamentos_caixa_clinica_status_data_idx
  on public.fechamentos_caixa (clinica_id, status, enviado_em desc);
create index fechamentos_caixa_sessao_data_idx
  on public.fechamentos_caixa (sessao_caixa_id, enviado_em desc);
create index fechamentos_caixa_enviado_por_idx
  on public.fechamentos_caixa (enviado_por);

create table public.revisoes_fechamento_caixa (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null
    references public.clinicas(id) on delete restrict,
  fechamento_id uuid not null unique
    references public.fechamentos_caixa(id) on delete restrict,
  acao text not null,
  observacao text,
  revisado_por uuid not null
    references public.usuarios(id) on delete restrict,
  revisado_em timestamptz not null default now(),
  constraint revisoes_fechamento_caixa_acao_check
    check (acao in ('aprovar', 'devolver')),
  constraint revisoes_fechamento_caixa_fechamento_clinica_fk
    foreign key (fechamento_id, clinica_id)
    references public.fechamentos_caixa (id, clinica_id)
    on delete restrict
);

create index revisoes_fechamento_caixa_clinica_data_idx
  on public.revisoes_fechamento_caixa (clinica_id, revisado_em desc);
create index revisoes_fechamento_caixa_revisado_por_idx
  on public.revisoes_fechamento_caixa (revisado_por);

alter table public.sangrias_caixa enable row level security;
alter table public.fechamentos_caixa enable row level security;
alter table public.revisoes_fechamento_caixa enable row level security;

revoke all privileges on table
  public.sangrias_caixa,
  public.fechamentos_caixa,
  public.revisoes_fechamento_caixa
from public, anon, authenticated;

grant select on table
  public.sangrias_caixa,
  public.fechamentos_caixa,
  public.revisoes_fechamento_caixa
to authenticated;

create policy sangrias_caixa_select_proprietaria_recepcao
on public.sangrias_caixa
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

create policy fechamentos_caixa_select_proprietaria_recepcao
on public.fechamentos_caixa
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

create policy revisoes_fechamento_caixa_select_proprietaria_recepcao
on public.revisoes_fechamento_caixa
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

-- Uma sessao com entradas_caixa pertence ao fluxo legado e nao pode ser hibridizada.
create function private.financeiro_bloquear_recebimento_sessao_legada()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if exists (
    select 1
    from public.entradas_caixa ec
    where ec.sessao_caixa_id = new.sessao_caixa_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'Sessao de caixa legada nao pode receber operacoes do novo Financeiro.';
  end if;

  return new;
end;
$$;

create trigger recebimentos_bloquear_sessao_legada
before insert on public.recebimentos
for each row execute function private.financeiro_bloquear_recebimento_sessao_legada();

revoke all privileges on function
  private.financeiro_bloquear_recebimento_sessao_legada()
from public, anon, authenticated;

-- Historico financeiro nao pode ser apagado nem por uma RPC futura defeituosa.
create function private.financeiro_bloquear_exclusao_historico()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'Registros historicos financeiros nao podem ser excluidos.';
end;
$$;

create trigger sangrias_caixa_bloquear_delete
before delete on public.sangrias_caixa
for each row execute function private.financeiro_bloquear_exclusao_historico();

create trigger fechamentos_caixa_bloquear_delete
before delete on public.fechamentos_caixa
for each row execute function private.financeiro_bloquear_exclusao_historico();

create trigger revisoes_fechamento_caixa_bloquear_delete
before delete on public.revisoes_fechamento_caixa
for each row execute function private.financeiro_bloquear_exclusao_historico();

revoke all privileges on function
  private.financeiro_bloquear_exclusao_historico()
from public, anon, authenticated;

-- Calcula somente a fotografia da FASE 4. Estornos serao incorporados na FASE 5.
create function private.financeiro_calcular_caixa(
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
  v_total_clinica numeric(12,2);
  v_total_profissionais numeric(12,2);
begin
  if exists (
    select 1
    from public.entradas_caixa ec
    where ec.sessao_caixa_id = p_sessao_caixa_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
  end if;

  select sc.valor_abertura::numeric(12,2)
    into v_valor_abertura
  from public.sessoes_caixa sc
  where sc.id = p_sessao_caixa_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Sessao de caixa inexistente.';
  end if;

  select
    coalesce(sum(rp.valor) filter (where rp.forma_pagamento = 'dinheiro'), 0),
    coalesce(sum(rp.valor) filter (where rp.forma_pagamento = 'pix'), 0),
    coalesce(sum(rp.valor) filter (where rp.forma_pagamento = 'cartao_credito'), 0)
    into v_total_dinheiro, v_total_pix, v_total_cartao
  from public.recebimentos r
  join public.recebimentos_pagamentos rp
    on rp.recebimento_id = r.id
  where r.sessao_caixa_id = p_sessao_caixa_id;

  select
    coalesce(sum(r.valor_bruto), 0),
    coalesce(sum(r.valor_clinica), 0),
    coalesce(sum(r.valor_profissional), 0)
    into v_total_bruto, v_total_clinica, v_total_profissionais
  from public.recebimentos r
  where r.sessao_caixa_id = p_sessao_caixa_id;

  select
    coalesce(sum(mc.valor) filter (where mc.tipo = 'suprimento'), 0),
    coalesce(sum(mc.valor) filter (where mc.tipo = 'sangria'), 0)
    into v_total_suprimentos, v_total_sangrias
  from public.movimentos_caixa mc
  where mc.sessao_caixa_id = p_sessao_caixa_id;

  return query select
    v_valor_abertura,
    v_total_dinheiro,
    v_total_pix,
    v_total_cartao,
    v_total_bruto,
    v_total_suprimentos,
    v_total_sangrias,
    (v_valor_abertura + v_total_dinheiro + v_total_suprimentos - v_total_sangrias)::numeric(12,2),
    v_total_clinica,
    v_total_profissionais;
end;
$$;

revoke all privileges on function
  private.financeiro_calcular_caixa(uuid)
from public, anon, authenticated;

-- Abertura: lock consultivo por clinica cobre o caso em que ainda nao ha linha.
create function public.financeiro_abrir_caixa(
  p_clinica_id uuid,
  p_valor_abertura numeric,
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
  v_papel public.papel_usuario;
  v_existente public.sessoes_caixa%rowtype;
  v_sessao public.sessoes_caixa%rowtype;
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;
  if p_clinica_id is null then
    raise exception using errcode = '22023', message = 'Clinica obrigatoria.';
  end if;
  if p_valor_abertura is null or p_valor_abertura < 0
    or p_valor_abertura > 99999999.99
    or p_valor_abertura <> round(p_valor_abertura, 2) then
    raise exception using errcode = '22023', message = 'Valor de abertura invalido.';
  end if;
  if v_chave = '' or char_length(v_chave) > 200 then
    raise exception using errcode = '22023', message = 'Chave de idempotencia invalida.';
  end if;

  select uc.papel into v_papel
  from public.usuarios_clinicas uc
  where uc.usuario_id = v_usuario_id
    and uc.clinica_id = p_clinica_id
    and uc.ativo
    and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario);
  if not found then
    raise exception using errcode = '42501', message = 'Usuario sem permissao para abrir caixa nesta clinica.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('financeiro_abrir_caixa:' || p_clinica_id::text, 0)
  );

  select sc.* into v_existente
  from public.sessoes_caixa sc
  where sc.idempotency_key = v_chave;

  if found then
    if v_existente.clinica_id <> p_clinica_id
      or v_existente.aberto_por <> v_usuario_id
      or v_existente.valor_abertura <> p_valor_abertura then
      raise exception using errcode = '23505', message = 'Chave de idempotencia ja utilizada em outra operacao.';
    end if;
    return jsonb_build_object(
      'sessao_caixa_id', v_existente.id,
      'clinica_id', v_existente.clinica_id,
      'valor_abertura', v_existente.valor_abertura,
      'status', v_existente.status,
      'aberto_em', v_existente.aberto_em,
      'nova_operacao', false
    );
  end if;

  if exists (
    select 1 from public.sessoes_caixa sc
    where sc.clinica_id = p_clinica_id
      and sc.status in (
        'aberto'::public.status_sessao_caixa,
        'em_fechamento'::public.status_sessao_caixa,
        'aguardando_aprovacao'::public.status_sessao_caixa,
        'devolvido_para_correcao'::public.status_sessao_caixa
      )
  ) then
    raise exception using errcode = '23505', message = 'A clinica ja possui sessao de caixa financeiramente ativa.';
  end if;

  insert into public.sessoes_caixa (
    clinica_id, aberto_por, valor_abertura, aberto_em, status, idempotency_key
  ) values (
    p_clinica_id, v_usuario_id, p_valor_abertura::numeric(12,2), now(),
    'aberto'::public.status_sessao_caixa, v_chave
  ) returning * into v_sessao;

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id,
    valor, estado_anterior, estado_novo, dados
  ) values (
    p_clinica_id, v_usuario_id, v_papel, 'abrir_caixa', 'sessao_caixa', v_sessao.id,
    p_valor_abertura, null, jsonb_build_object('status', 'aberto'),
    jsonb_build_object('valor_abertura', p_valor_abertura)
  );

  return jsonb_build_object(
    'sessao_caixa_id', v_sessao.id,
    'clinica_id', v_sessao.clinica_id,
    'valor_abertura', v_sessao.valor_abertura,
    'status', v_sessao.status,
    'aberto_em', v_sessao.aberto_em,
    'nova_operacao', true
  );
end;
$$;

-- Suprimento: movimento operacional, nunca receita.
create function public.financeiro_registrar_suprimento(
  p_sessao_caixa_id uuid,
  p_valor numeric,
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
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_clinica_id uuid;
  v_status public.status_sessao_caixa;
  v_papel public.papel_usuario;
  v_existente public.movimentos_caixa%rowtype;
  v_movimento public.movimentos_caixa%rowtype;
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;
  if p_valor is null or p_valor <= 0 or p_valor > 9999999999.99
    or p_valor <> round(p_valor, 2) then
    raise exception using errcode = '22023', message = 'Valor de suprimento invalido.';
  end if;
  if v_motivo = '' then
    raise exception using errcode = '22023', message = 'Motivo do suprimento obrigatorio.';
  end if;
  if v_chave = '' or char_length(v_chave) > 200 then
    raise exception using errcode = '22023', message = 'Chave de idempotencia invalida.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('financeiro_suprimento:' || v_chave, 0));

  select mc.* into v_existente
  from public.movimentos_caixa mc
  where mc.idempotency_key = v_chave;
  if found then
    if v_existente.tipo <> 'suprimento'
      or v_existente.sessao_caixa_id <> p_sessao_caixa_id
      or v_existente.registrado_por <> v_usuario_id
      or v_existente.valor <> p_valor
      or v_existente.motivo <> v_motivo then
      raise exception using errcode = '23505', message = 'Chave de idempotencia ja utilizada em outra operacao.';
    end if;
    select uc.papel into v_papel
    from public.usuarios_clinicas uc
    where uc.usuario_id = v_usuario_id and uc.clinica_id = v_existente.clinica_id and uc.ativo
      and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario);
    if not found then
      raise exception using errcode = '42501', message = 'Usuario sem permissao para consultar este suprimento.';
    end if;
    if exists (
      select 1 from public.entradas_caixa ec
      where ec.sessao_caixa_id = v_existente.sessao_caixa_id
    ) then
      raise exception using errcode = '22023', message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
    end if;
    return jsonb_build_object('movimento_id', v_existente.id, 'sessao_caixa_id', v_existente.sessao_caixa_id, 'valor', v_existente.valor, 'tipo', v_existente.tipo, 'nova_operacao', false);
  end if;

  select sc.clinica_id, sc.status into v_clinica_id, v_status
  from public.sessoes_caixa sc
  where sc.id = p_sessao_caixa_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sessao de caixa inexistente.';
  end if;

  select uc.papel into v_papel
  from public.usuarios_clinicas uc
  where uc.usuario_id = v_usuario_id and uc.clinica_id = v_clinica_id and uc.ativo
    and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario);
  if not found then
    raise exception using errcode = '42501', message = 'Usuario sem permissao para registrar suprimento nesta clinica.';
  end if;
  if exists (
    select 1 from public.entradas_caixa ec
    where ec.sessao_caixa_id = p_sessao_caixa_id
  ) then
    raise exception using errcode = '22023', message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
  end if;
  if v_status <> 'aberto'::public.status_sessao_caixa then
    raise exception using errcode = '22023', message = 'Suprimento exige caixa aberto.';
  end if;

  insert into public.movimentos_caixa (
    clinica_id, sessao_caixa_id, tipo, recebimento_id, sangria_id,
    valor, motivo, idempotency_key, registrado_por, registrado_em
  ) values (
    v_clinica_id, p_sessao_caixa_id, 'suprimento', null, null,
    p_valor, v_motivo, v_chave, v_usuario_id, now()
  ) returning * into v_movimento;

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id, valor,
    estado_anterior, estado_novo, dados, motivo
  ) values (
    v_clinica_id, v_usuario_id, v_papel, 'registrar_suprimento', 'movimento_caixa', v_movimento.id,
    p_valor, null, jsonb_build_object('tipo', 'suprimento'),
    jsonb_build_object('sessao_caixa_id', p_sessao_caixa_id), v_motivo
  );

  return jsonb_build_object('movimento_id', v_movimento.id, 'sessao_caixa_id', p_sessao_caixa_id, 'valor', p_valor, 'tipo', 'suprimento', 'nova_operacao', true);
end;
$$;

-- A recepcao solicita; nenhum movimento e criado antes da efetivacao.
create function public.financeiro_solicitar_sangria(
  p_sessao_caixa_id uuid,
  p_valor numeric,
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
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_clinica_id uuid;
  v_status public.status_sessao_caixa;
  v_existente public.sangrias_caixa%rowtype;
  v_sangria public.sangrias_caixa%rowtype;
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;
  if p_valor is null or p_valor <= 0 or p_valor > 9999999999.99
    or p_valor <> round(p_valor, 2) then
    raise exception using errcode = '22023', message = 'Valor de sangria invalido.';
  end if;
  if v_motivo = '' then
    raise exception using errcode = '22023', message = 'Motivo da sangria obrigatorio.';
  end if;
  if v_chave = '' or char_length(v_chave) > 200 then
    raise exception using errcode = '22023', message = 'Chave de idempotencia invalida.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('financeiro_sangria:' || v_chave, 0));
  select s.* into v_existente from public.sangrias_caixa s where s.idempotency_key = v_chave;
  if found then
    if v_existente.sessao_caixa_id <> p_sessao_caixa_id
      or v_existente.solicitado_por <> v_usuario_id
      or v_existente.valor <> p_valor
      or v_existente.motivo <> v_motivo then
      raise exception using errcode = '23505', message = 'Chave de idempotencia ja utilizada em outra operacao.';
    end if;
    if not private.financeiro_tem_papel_clinica(v_existente.clinica_id, array['recepcao'::public.papel_usuario]) then
      raise exception using errcode = '42501', message = 'Usuario sem permissao para consultar esta sangria.';
    end if;
    if exists (
      select 1 from public.entradas_caixa ec
      where ec.sessao_caixa_id = v_existente.sessao_caixa_id
    ) then
      raise exception using errcode = '22023', message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
    end if;
    return jsonb_build_object('sangria_id', v_existente.id, 'status', v_existente.status, 'valor', v_existente.valor, 'nova_operacao', false);
  end if;

  select sc.clinica_id, sc.status into v_clinica_id, v_status
  from public.sessoes_caixa sc
  where sc.id = p_sessao_caixa_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sessao de caixa inexistente.';
  end if;
  if not private.financeiro_tem_papel_clinica(v_clinica_id, array['recepcao'::public.papel_usuario]) then
    raise exception using errcode = '42501', message = 'Somente recepcao ativa pode solicitar sangria.';
  end if;
  if exists (
    select 1 from public.entradas_caixa ec
    where ec.sessao_caixa_id = p_sessao_caixa_id
  ) then
    raise exception using errcode = '22023', message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
  end if;
  if v_status <> 'aberto'::public.status_sessao_caixa then
    raise exception using errcode = '22023', message = 'Sangria exige caixa aberto.';
  end if;

  insert into public.sangrias_caixa (
    clinica_id, sessao_caixa_id, valor, motivo, status,
    idempotency_key, solicitado_por, solicitado_em
  ) values (
    v_clinica_id, p_sessao_caixa_id, p_valor, v_motivo, 'solicitada',
    v_chave, v_usuario_id, now()
  ) returning * into v_sangria;

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id, valor,
    estado_anterior, estado_novo, dados, motivo
  ) values (
    v_clinica_id, v_usuario_id, 'recepcao'::public.papel_usuario,
    'solicitar_sangria', 'sangria_caixa', v_sangria.id, p_valor,
    null, jsonb_build_object('status', 'solicitada'),
    jsonb_build_object('sessao_caixa_id', p_sessao_caixa_id), v_motivo
  );

  return jsonb_build_object('sangria_id', v_sangria.id, 'status', v_sangria.status, 'valor', v_sangria.valor, 'nova_operacao', true);
end;
$$;

create function public.financeiro_revisar_sangria(
  p_sangria_id uuid,
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
  v_sangria public.sangrias_caixa%rowtype;
  v_novo_status text;
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;
  if v_acao not in ('aprovar', 'rejeitar') then
    raise exception using errcode = '22023', message = 'Acao de revisao de sangria invalida.';
  end if;

  select s.* into v_sangria from public.sangrias_caixa s where s.id = p_sangria_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sangria inexistente.';
  end if;
  if not private.financeiro_tem_papel_clinica(v_sangria.clinica_id, array['proprietaria'::public.papel_usuario]) then
    raise exception using errcode = '42501', message = 'Somente proprietaria ativa pode revisar sangria.';
  end if;

  v_novo_status := case v_acao when 'aprovar' then 'aprovada' else 'rejeitada' end;
  if (v_acao = 'aprovar' and v_sangria.status in ('aprovada', 'efetivada'))
    or (v_acao = 'rejeitar' and v_sangria.status = 'rejeitada') then
    return jsonb_build_object('sangria_id', v_sangria.id, 'status', v_sangria.status, 'nova_operacao', false);
  end if;
  if v_sangria.status <> 'solicitada' then
    raise exception using errcode = '22023', message = 'Sangria nao esta aguardando revisao.';
  end if;

  update public.sangrias_caixa
  set status = v_novo_status,
      revisado_por = v_usuario_id,
      revisado_em = now(),
      observacao_revisao = v_observacao
  where id = v_sangria.id;

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id, valor,
    estado_anterior, estado_novo, dados, motivo
  ) values (
    v_sangria.clinica_id, v_usuario_id, 'proprietaria'::public.papel_usuario,
    case v_acao when 'aprovar' then 'aprovar_sangria' else 'rejeitar_sangria' end,
    'sangria_caixa', v_sangria.id, v_sangria.valor,
    jsonb_build_object('status', v_sangria.status),
    jsonb_build_object('status', v_novo_status), '{}', v_observacao
  );

  return jsonb_build_object('sangria_id', v_sangria.id, 'status', v_novo_status, 'nova_operacao', true);
end;
$$;

create function public.financeiro_efetivar_sangria(
  p_sangria_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_sangria public.sangrias_caixa%rowtype;
  v_status_sessao public.status_sessao_caixa;
  v_papel public.papel_usuario;
  v_caixa record;
  v_movimento public.movimentos_caixa%rowtype;
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;

  select s.* into v_sangria from public.sangrias_caixa s where s.id = p_sangria_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sangria inexistente.';
  end if;

  select uc.papel into v_papel
  from public.usuarios_clinicas uc
  where uc.usuario_id = v_usuario_id and uc.clinica_id = v_sangria.clinica_id and uc.ativo
    and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario);
  if not found then
    raise exception using errcode = '42501', message = 'Usuario sem permissao para efetivar sangria nesta clinica.';
  end if;

  if exists (
    select 1 from public.entradas_caixa ec
    where ec.sessao_caixa_id = v_sangria.sessao_caixa_id
  ) then
    raise exception using errcode = '22023', message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
  end if;

  if v_sangria.status = 'efetivada' then
    select mc.* into v_movimento from public.movimentos_caixa mc where mc.sangria_id = v_sangria.id;
    return jsonb_build_object('sangria_id', v_sangria.id, 'movimento_id', v_movimento.id, 'status', v_sangria.status, 'nova_operacao', false);
  end if;
  if v_sangria.status <> 'aprovada' then
    raise exception using errcode = '22023', message = 'Somente sangria aprovada pode ser efetivada.';
  end if;

  select sc.status into v_status_sessao
  from public.sessoes_caixa sc
  where sc.id = v_sangria.sessao_caixa_id and sc.clinica_id = v_sangria.clinica_id
  for update;
  if not found or v_status_sessao <> 'aberto'::public.status_sessao_caixa then
    raise exception using errcode = '22023', message = 'Efetivacao de sangria exige caixa aberto.';
  end if;

  select * into v_caixa from private.financeiro_calcular_caixa(v_sangria.sessao_caixa_id);
  if v_sangria.valor > v_caixa.valor_esperado then
    raise exception using errcode = '22023', message = 'Sangria excede o dinheiro esperado disponivel.';
  end if;

  update public.sangrias_caixa
  set status = 'efetivada', efetivado_por = v_usuario_id, efetivado_em = now()
  where id = v_sangria.id;

  insert into public.movimentos_caixa (
    clinica_id, sessao_caixa_id, tipo, recebimento_id, sangria_id,
    valor, motivo, idempotency_key, registrado_por, registrado_em
  ) values (
    v_sangria.clinica_id, v_sangria.sessao_caixa_id, 'sangria', null, v_sangria.id,
    v_sangria.valor, v_sangria.motivo, null, v_usuario_id, now()
  ) returning * into v_movimento;

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id, valor,
    estado_anterior, estado_novo, dados, motivo
  ) values (
    v_sangria.clinica_id, v_usuario_id, v_papel, 'efetivar_sangria',
    'sangria_caixa', v_sangria.id, v_sangria.valor,
    jsonb_build_object('status', 'aprovada'), jsonb_build_object('status', 'efetivada'),
    jsonb_build_object('movimento_id', v_movimento.id, 'sessao_caixa_id', v_sangria.sessao_caixa_id),
    v_sangria.motivo
  );

  return jsonb_build_object('sangria_id', v_sangria.id, 'movimento_id', v_movimento.id, 'status', 'efetivada', 'nova_operacao', true);
end;
$$;

create function public.financeiro_iniciar_fechamento(
  p_sessao_caixa_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_clinica_id uuid;
  v_status public.status_sessao_caixa;
  v_papel public.papel_usuario;
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;

  select sc.clinica_id, sc.status into v_clinica_id, v_status
  from public.sessoes_caixa sc where sc.id = p_sessao_caixa_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sessao de caixa inexistente.';
  end if;

  select uc.papel into v_papel
  from public.usuarios_clinicas uc
  where uc.usuario_id = v_usuario_id and uc.clinica_id = v_clinica_id and uc.ativo
    and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario);
  if not found then
    raise exception using errcode = '42501', message = 'Usuario sem permissao para iniciar fechamento.';
  end if;

  if exists (
    select 1 from public.entradas_caixa ec
    where ec.sessao_caixa_id = p_sessao_caixa_id
  ) then
    raise exception using errcode = '22023', message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
  end if;

  if v_status = 'em_fechamento'::public.status_sessao_caixa then
    return jsonb_build_object('sessao_caixa_id', p_sessao_caixa_id, 'status', v_status, 'nova_operacao', false);
  end if;
  if v_status <> 'aberto'::public.status_sessao_caixa then
    raise exception using errcode = '22023', message = 'Somente caixa aberto pode iniciar fechamento.';
  end if;
  if exists (
    select 1 from public.sangrias_caixa s
    where s.sessao_caixa_id = p_sessao_caixa_id
      and s.status in ('solicitada', 'aprovada')
  ) then
    raise exception using errcode = '22023', message = 'Existem sangrias pendentes antes do fechamento.';
  end if;

  update public.sessoes_caixa
  set status = 'em_fechamento'::public.status_sessao_caixa
  where id = p_sessao_caixa_id;

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id,
    estado_anterior, estado_novo, dados
  ) values (
    v_clinica_id, v_usuario_id, v_papel, 'iniciar_fechamento',
    'sessao_caixa', p_sessao_caixa_id,
    jsonb_build_object('status', v_status),
    jsonb_build_object('status', 'em_fechamento'), '{}'
  );

  return jsonb_build_object('sessao_caixa_id', p_sessao_caixa_id, 'status', 'em_fechamento', 'nova_operacao', true);
end;
$$;

create function public.financeiro_enviar_fechamento(
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
    select uc.papel into v_papel
    from public.usuarios_clinicas uc
    where uc.usuario_id = v_usuario_id and uc.clinica_id = v_existente.clinica_id and uc.ativo
      and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario);
    if not found then
      raise exception using errcode = '42501', message = 'Usuario sem permissao para consultar este fechamento.';
    end if;
    if exists (
      select 1 from public.entradas_caixa ec
      where ec.sessao_caixa_id = v_existente.sessao_caixa_id
    ) then
      raise exception using errcode = '22023', message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
    end if;
    return jsonb_build_object('fechamento_id', v_existente.id, 'sessao_caixa_id', v_existente.sessao_caixa_id, 'tentativa', v_existente.tentativa, 'status', v_existente.status, 'valor_esperado', v_existente.valor_esperado, 'valor_contado', v_existente.valor_contado, 'diferenca', v_existente.diferenca, 'nova_operacao', false);
  end if;

  select sc.clinica_id, sc.status into v_clinica_id, v_status
  from public.sessoes_caixa sc where sc.id = p_sessao_caixa_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sessao de caixa inexistente.';
  end if;

  select uc.papel into v_papel
  from public.usuarios_clinicas uc
  where uc.usuario_id = v_usuario_id and uc.clinica_id = v_clinica_id and uc.ativo
    and uc.papel in ('proprietaria'::public.papel_usuario, 'recepcao'::public.papel_usuario);
  if not found then
    raise exception using errcode = '42501', message = 'Usuario sem permissao para enviar fechamento.';
  end if;
  if exists (
    select 1 from public.entradas_caixa ec
    where ec.sessao_caixa_id = p_sessao_caixa_id
  ) then
    raise exception using errcode = '22023', message = 'Sessao de caixa legada exige transicao controlada e nao aceita operacoes do novo Financeiro.';
  end if;
  if v_status not in (
    'em_fechamento'::public.status_sessao_caixa,
    'devolvido_para_correcao'::public.status_sessao_caixa
  ) then
    raise exception using errcode = '22023', message = 'Sessao nao esta pronta para envio de fechamento.';
  end if;
  if exists (
    select 1 from public.sangrias_caixa s
    where s.sessao_caixa_id = p_sessao_caixa_id
      and s.status in ('solicitada', 'aprovada')
  ) then
    raise exception using errcode = '22023', message = 'Existem sangrias pendentes antes do fechamento.';
  end if;

  select * into v_caixa from private.financeiro_calcular_caixa(p_sessao_caixa_id);
  v_diferenca := (p_valor_contado - v_caixa.valor_esperado)::numeric(12,2);
  if v_diferenca <> 0 and v_justificativa is null then
    raise exception using errcode = '22023', message = 'Justificativa obrigatoria quando existe diferenca de caixa.';
  end if;

  select coalesce(max(f.tentativa), 0) + 1 into v_tentativa
  from public.fechamentos_caixa f where f.sessao_caixa_id = p_sessao_caixa_id;

  if v_status = 'devolvido_para_correcao'::public.status_sessao_caixa then
    select f.id into v_substitui
    from public.fechamentos_caixa f
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
    justificativa_diferenca, status, enviado_por, enviado_em
  ) values (
    v_clinica_id, p_sessao_caixa_id, v_tentativa, v_substitui, v_chave,
    v_caixa.valor_abertura, v_caixa.total_dinheiro, v_caixa.total_pix, v_caixa.total_cartao_credito,
    v_caixa.total_recebimentos_brutos, v_caixa.total_suprimentos, v_caixa.total_sangrias,
    v_caixa.valor_esperado, p_valor_contado, v_diferenca, v_caixa.total_clinica, v_caixa.total_profissionais,
    v_justificativa, 'aguardando_aprovacao', v_usuario_id, now()
  ) returning * into v_fechamento;

  update public.sessoes_caixa
  set status = 'aguardando_aprovacao'::public.status_sessao_caixa
  where id = p_sessao_caixa_id;

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id, valor,
    estado_anterior, estado_novo, dados, motivo
  ) values (
    v_clinica_id, v_usuario_id, v_papel, 'enviar_fechamento', 'fechamento_caixa', v_fechamento.id,
    p_valor_contado, jsonb_build_object('sessao_status', v_status),
    jsonb_build_object('sessao_status', 'aguardando_aprovacao', 'fechamento_status', 'aguardando_aprovacao'),
    jsonb_build_object('sessao_caixa_id', p_sessao_caixa_id, 'tentativa', v_tentativa, 'valor_esperado', v_caixa.valor_esperado, 'diferenca', v_diferenca),
    v_justificativa
  );

  return jsonb_build_object('fechamento_id', v_fechamento.id, 'sessao_caixa_id', p_sessao_caixa_id, 'tentativa', v_tentativa, 'status', v_fechamento.status, 'valor_esperado', v_caixa.valor_esperado, 'valor_contado', p_valor_contado, 'diferenca', v_diferenca, 'nova_operacao', true);
end;
$$;

create function public.financeiro_revisar_fechamento(
  p_fechamento_id uuid,
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
  v_fechamento public.fechamentos_caixa%rowtype;
  v_status_sessao public.status_sessao_caixa;
  v_revisao public.revisoes_fechamento_caixa%rowtype;
begin
  if v_usuario_id is null then
    raise exception using errcode = '28000', message = 'Usuario nao autenticado.';
  end if;
  if v_acao not in ('aprovar', 'devolver') then
    raise exception using errcode = '22023', message = 'Acao de revisao de fechamento invalida.';
  end if;

  select f.* into v_fechamento
  from public.fechamentos_caixa f where f.id = p_fechamento_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Fechamento inexistente.';
  end if;
  if not private.financeiro_tem_papel_clinica(v_fechamento.clinica_id, array['proprietaria'::public.papel_usuario]) then
    raise exception using errcode = '42501', message = 'Somente proprietaria ativa pode revisar fechamento.';
  end if;

  select r.* into v_revisao
  from public.revisoes_fechamento_caixa r where r.fechamento_id = v_fechamento.id;
  if found then
    if v_revisao.acao = v_acao then
      return jsonb_build_object('fechamento_id', v_fechamento.id, 'revisao_id', v_revisao.id, 'acao', v_revisao.acao, 'status', v_fechamento.status, 'nova_operacao', false);
    end if;
    raise exception using errcode = '23505', message = 'Tentativa de fechamento ja possui revisao definitiva.';
  end if;

  select sc.status into v_status_sessao
  from public.sessoes_caixa sc
  where sc.id = v_fechamento.sessao_caixa_id and sc.clinica_id = v_fechamento.clinica_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Sessao de caixa do fechamento inexistente.';
  end if;
  if v_fechamento.status <> 'aguardando_aprovacao'
    or v_status_sessao <> 'aguardando_aprovacao'::public.status_sessao_caixa
    or exists (
      select 1 from public.fechamentos_caixa posterior
      where posterior.sessao_caixa_id = v_fechamento.sessao_caixa_id
        and posterior.tentativa > v_fechamento.tentativa
    ) then
    raise exception using errcode = '22023', message = 'Fechamento nao e a tentativa ativa aguardando aprovacao.';
  end if;

  insert into public.revisoes_fechamento_caixa (
    clinica_id, fechamento_id, acao, observacao, revisado_por, revisado_em
  ) values (
    v_fechamento.clinica_id, v_fechamento.id, v_acao, v_observacao, v_usuario_id, now()
  ) returning * into v_revisao;

  if v_acao = 'aprovar' then
    update public.fechamentos_caixa set status = 'aprovado' where id = v_fechamento.id;
    update public.sessoes_caixa
    set status = 'aprovado'::public.status_sessao_caixa,
        valor_esperado = v_fechamento.valor_esperado,
        valor_contado = v_fechamento.valor_contado,
        diferenca = v_fechamento.diferenca,
        fechado_por = v_usuario_id,
        fechado_em = now()
    where id = v_fechamento.sessao_caixa_id;
  else
    update public.fechamentos_caixa set status = 'devolvido' where id = v_fechamento.id;
    update public.sessoes_caixa
    set status = 'devolvido_para_correcao'::public.status_sessao_caixa
    where id = v_fechamento.sessao_caixa_id;
  end if;

  insert into public.eventos_auditoria_financeira (
    clinica_id, usuario_id, papel, acao, entidade, entidade_id, valor,
    estado_anterior, estado_novo, dados, motivo
  ) values (
    v_fechamento.clinica_id, v_usuario_id, 'proprietaria'::public.papel_usuario,
    case v_acao when 'aprovar' then 'aprovar_fechamento' else 'devolver_fechamento' end,
    'fechamento_caixa', v_fechamento.id, v_fechamento.valor_contado,
    jsonb_build_object('fechamento_status', v_fechamento.status, 'sessao_status', v_status_sessao),
    jsonb_build_object('fechamento_status', case v_acao when 'aprovar' then 'aprovado' else 'devolvido' end, 'sessao_status', case v_acao when 'aprovar' then 'aprovado' else 'devolvido_para_correcao' end),
    jsonb_build_object('sessao_caixa_id', v_fechamento.sessao_caixa_id, 'tentativa', v_fechamento.tentativa, 'revisao_id', v_revisao.id),
    v_observacao
  );

  return jsonb_build_object('fechamento_id', v_fechamento.id, 'revisao_id', v_revisao.id, 'acao', v_acao, 'status', case v_acao when 'aprovar' then 'aprovado' else 'devolvido' end, 'nova_operacao', true);
end;
$$;

-- Superficie publica: nenhuma funcao operacional e executavel sem login.
revoke all privileges on function public.financeiro_abrir_caixa(uuid, numeric, text) from public, anon;
revoke all privileges on function public.financeiro_registrar_suprimento(uuid, numeric, text, text) from public, anon;
revoke all privileges on function public.financeiro_solicitar_sangria(uuid, numeric, text, text) from public, anon;
revoke all privileges on function public.financeiro_revisar_sangria(uuid, text, text) from public, anon;
revoke all privileges on function public.financeiro_efetivar_sangria(uuid) from public, anon;
revoke all privileges on function public.financeiro_iniciar_fechamento(uuid) from public, anon;
revoke all privileges on function public.financeiro_enviar_fechamento(uuid, numeric, text, text) from public, anon;
revoke all privileges on function public.financeiro_revisar_fechamento(uuid, text, text) from public, anon;

grant execute on function public.financeiro_abrir_caixa(uuid, numeric, text) to authenticated;
grant execute on function public.financeiro_registrar_suprimento(uuid, numeric, text, text) to authenticated;
grant execute on function public.financeiro_solicitar_sangria(uuid, numeric, text, text) to authenticated;
grant execute on function public.financeiro_revisar_sangria(uuid, text, text) to authenticated;
grant execute on function public.financeiro_efetivar_sangria(uuid) to authenticated;
grant execute on function public.financeiro_iniciar_fechamento(uuid) to authenticated;
grant execute on function public.financeiro_enviar_fechamento(uuid, numeric, text, text) to authenticated;
grant execute on function public.financeiro_revisar_fechamento(uuid, text, text) to authenticated;

commit;
