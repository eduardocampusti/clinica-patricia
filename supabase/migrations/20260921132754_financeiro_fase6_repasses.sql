-- FASE 6: repasses por fechamento aprovado e ajustes negativos futuros.
-- Migration criada para revisao; NAO aplicada.
-- Nao movimenta caixa, nao altera entradas_caixa e nao executa pagamento externo.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

create table public.repasses (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  fechamento_id uuid not null references public.fechamentos_caixa(id) on delete restrict,
  sessao_caixa_id uuid not null references public.sessoes_caixa(id) on delete restrict,
  status text not null,
  valor_bruto_profissional numeric(12,2) not null,
  valor_estornos_antes_pagamento numeric(12,2) not null default 0,
  valor_ajustes_aplicados numeric(12,2) not null default 0,
  valor_liquido numeric(12,2) not null,
  gerado_por uuid not null references public.usuarios(id) on delete restrict,
  gerado_em timestamptz not null default now(),
  confirmado_por uuid references public.usuarios(id) on delete restrict,
  confirmado_em timestamptz,
  meio_pagamento text,
  referencia_pagamento text,
  observacao text,
  confirmacao_idempotency_key text,
  constraint repasses_fechamento_profissional_unique unique (fechamento_id, profissional_id),
  constraint repasses_id_clinica_profissional_unique unique (id, clinica_id, profissional_id),
  constraint repasses_valores_check check (
    valor_bruto_profissional >= 0
    and valor_estornos_antes_pagamento >= 0
    and valor_ajustes_aplicados >= 0
    and valor_liquido >= 0
    and valor_bruto_profissional < 'NaN'::numeric
    and valor_estornos_antes_pagamento < 'NaN'::numeric
    and valor_ajustes_aplicados < 'NaN'::numeric
    and valor_liquido < 'NaN'::numeric
    and valor_liquido = valor_bruto_profissional
      - valor_estornos_antes_pagamento - valor_ajustes_aplicados
  ),
  constraint repasses_status_check check (status in ('pendente', 'pago', 'ajustado')),
  constraint repasses_estado_check check (
    (status = 'pendente' and valor_liquido > 0
      and confirmado_por is null and confirmado_em is null
      and meio_pagamento is null and confirmacao_idempotency_key is null)
    or (status = 'pago' and valor_liquido > 0
      and confirmado_por is not null and confirmado_em is not null
      and meio_pagamento in ('pix', 'transferencia')
      and confirmacao_idempotency_key is not null)
    or (status = 'ajustado' and valor_liquido = 0
      and confirmado_por is null and confirmado_em is null
      and meio_pagamento is null and confirmacao_idempotency_key is null)
  ),
  constraint repasses_confirmacao_chave_check check (
    confirmacao_idempotency_key is null
    or (confirmacao_idempotency_key = btrim(confirmacao_idempotency_key)
      and char_length(confirmacao_idempotency_key) between 1 and 200)
  ),
  constraint repasses_contexto_fechamento_fk
    foreign key (fechamento_id, clinica_id)
    references public.fechamentos_caixa(id, clinica_id) on delete restrict,
  constraint repasses_contexto_profissional_fk
    foreign key (profissional_id, clinica_id)
    references public.profissionais_clinicas(profissional_id, clinica_id) on delete restrict,
  constraint repasses_contexto_sessao_fk
    foreign key (sessao_caixa_id, clinica_id)
    references public.sessoes_caixa(id, clinica_id) on delete restrict
);

create unique index repasses_confirmacao_idempotency_unique
  on public.repasses(confirmacao_idempotency_key)
  where confirmacao_idempotency_key is not null;
create index repasses_clinica_status_data_idx
  on public.repasses(clinica_id, status, gerado_em desc);
create index repasses_profissional_clinica_status_idx
  on public.repasses(profissional_id, clinica_id, status, gerado_em);
create index repasses_sessao_idx on public.repasses(sessao_caixa_id);

create table public.repasses_itens (
  id uuid primary key default gen_random_uuid(),
  repasse_id uuid not null references public.repasses(id) on delete restrict,
  recebimento_id uuid not null unique references public.recebimentos(id) on delete restrict,
  valor_profissional_original numeric(12,2) not null,
  valor_estornos_antes_pagamento numeric(12,2) not null default 0,
  valor_liquido numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint repasses_itens_valores_check check (
    valor_profissional_original >= 0
    and valor_estornos_antes_pagamento >= 0
    and valor_liquido >= 0
    and valor_profissional_original < 'NaN'::numeric
    and valor_estornos_antes_pagamento < 'NaN'::numeric
    and valor_liquido < 'NaN'::numeric
    and valor_liquido = valor_profissional_original - valor_estornos_antes_pagamento
  )
);

create index repasses_itens_repasse_idx on public.repasses_itens(repasse_id);

create table public.ajustes_repasse (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete restrict,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  estorno_id uuid not null unique references public.estornos(id) on delete restrict,
  repasse_origem_id uuid not null references public.repasses(id) on delete restrict,
  valor numeric(12,2) not null,
  valor_aplicado numeric(12,2) not null default 0,
  status text not null default 'pendente',
  criado_por uuid not null references public.usuarios(id) on delete restrict,
  criado_em timestamptz not null default now(),
  constraint ajustes_repasse_valores_check check (
    valor < 0 and valor > '-Infinity'::numeric
    and valor_aplicado >= 0 and valor_aplicado < 'NaN'::numeric
    and valor_aplicado <= abs(valor)
  ),
  constraint ajustes_repasse_status_check check (
    (status = 'pendente' and valor_aplicado = 0)
    or (status = 'parcialmente_aplicado' and valor_aplicado > 0 and valor_aplicado < abs(valor))
    or (status = 'aplicado' and valor_aplicado = abs(valor))
  ),
  constraint ajustes_repasse_contexto_profissional_fk
    foreign key (profissional_id, clinica_id)
    references public.profissionais_clinicas(profissional_id, clinica_id) on delete restrict,
  constraint ajustes_repasse_contexto_origem_fk
    foreign key (repasse_origem_id, clinica_id, profissional_id)
    references public.repasses(id, clinica_id, profissional_id) on delete restrict
);

create index ajustes_repasse_profissional_pendentes_idx
  on public.ajustes_repasse(clinica_id, profissional_id, criado_em, id)
  where status in ('pendente', 'parcialmente_aplicado');

create table public.aplicacoes_ajuste_repasse (
  id uuid primary key default gen_random_uuid(),
  ajuste_id uuid not null references public.ajustes_repasse(id) on delete restrict,
  repasse_id uuid not null references public.repasses(id) on delete restrict,
  valor_aplicado numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint aplicacoes_ajuste_valor_check check (
    valor_aplicado > 0 and valor_aplicado < 'NaN'::numeric
  ),
  constraint aplicacoes_ajuste_repasse_unique unique (ajuste_id, repasse_id)
);

create index aplicacoes_ajuste_repasse_repasse_idx
  on public.aplicacoes_ajuste_repasse(repasse_id);

-- RLS: somente proprietaria da clinica ou o proprio profissional leem repasses.
alter table public.repasses enable row level security;
alter table public.repasses_itens enable row level security;
alter table public.ajustes_repasse enable row level security;
alter table public.aplicacoes_ajuste_repasse enable row level security;

revoke all privileges on table public.repasses, public.repasses_itens,
  public.ajustes_repasse, public.aplicacoes_ajuste_repasse
from public, anon, authenticated;
grant select on table public.repasses, public.repasses_itens,
  public.ajustes_repasse, public.aplicacoes_ajuste_repasse to authenticated;

create policy repasses_select_proprietaria_ou_proprio
on public.repasses for select to authenticated using (
  private.financeiro_tem_papel_clinica(clinica_id, array['proprietaria'::public.papel_usuario])
  or private.financeiro_eh_profissional(clinica_id, profissional_id)
);

create policy repasses_itens_select_pelo_repasse
on public.repasses_itens for select to authenticated using (
  exists (select 1 from public.repasses r where r.id = repasses_itens.repasse_id
    and (private.financeiro_tem_papel_clinica(r.clinica_id, array['proprietaria'::public.papel_usuario])
      or private.financeiro_eh_profissional(r.clinica_id, r.profissional_id)))
);

create policy ajustes_repasse_select_pelo_profissional
on public.ajustes_repasse for select to authenticated using (
  private.financeiro_tem_papel_clinica(clinica_id, array['proprietaria'::public.papel_usuario])
  or private.financeiro_eh_profissional(clinica_id, profissional_id)
);

create policy aplicacoes_ajuste_select_pelo_repasse
on public.aplicacoes_ajuste_repasse for select to authenticated using (
  exists (select 1 from public.repasses r where r.id = aplicacoes_ajuste_repasse.repasse_id
    and (private.financeiro_tem_papel_clinica(r.clinica_id, array['proprietaria'::public.papel_usuario])
      or private.financeiro_eh_profissional(r.clinica_id, r.profissional_id)))
);

-- Historico: exclusao sempre bloqueada; linhas terminais e itens terminais
-- tambem nao podem ser reescritos por rotinas futuras defeituosas.
create trigger repasses_bloquear_delete before delete on public.repasses
for each row execute function private.financeiro_bloquear_exclusao_historico();
create trigger repasses_itens_bloquear_delete before delete on public.repasses_itens
for each row execute function private.financeiro_bloquear_exclusao_historico();
create trigger ajustes_repasse_bloquear_delete before delete on public.ajustes_repasse
for each row execute function private.financeiro_bloquear_exclusao_historico();
create function private.financeiro_proteger_delete_aplicacao_ajuste()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  if coalesce(current_setting('financeiro.internal_write', true),'')<>'1'
    or not exists (select 1 from public.repasses r where r.id=old.repasse_id and r.status='pendente') then
    raise exception using errcode='42501', message='Aplicacao de repasse terminal ou externa nao pode ser removida.';
  end if;
  return old;
end;
$$;

create trigger aplicacoes_ajuste_bloquear_delete before delete on public.aplicacoes_ajuste_repasse
for each row execute function private.financeiro_proteger_delete_aplicacao_ajuste();

create function private.financeiro_proteger_repasse_terminal()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  if old.status in ('pago', 'ajustado') then
    raise exception using errcode='42501', message='Repasse terminal nao pode ser alterado.';
  end if;
  if new.clinica_id<>old.clinica_id or new.profissional_id<>old.profissional_id
    or new.fechamento_id<>old.fechamento_id or new.sessao_caixa_id<>old.sessao_caixa_id
    or new.valor_bruto_profissional<>old.valor_bruto_profissional
    or new.gerado_por<>old.gerado_por or new.gerado_em<>old.gerado_em then
    raise exception using errcode='42501', message='Estrutura historica do repasse nao pode ser alterada.';
  end if;
  return new;
end;
$$;

create function private.financeiro_validar_item_repasse()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_repasse public.repasses%rowtype;
  v_recebimento public.recebimentos%rowtype;
begin
  select r.* into v_repasse from public.repasses r where r.id=new.repasse_id;
  select rc.* into v_recebimento from public.recebimentos rc where rc.id=new.recebimento_id;
  if v_repasse.id is null or v_recebimento.id is null
    or v_recebimento.clinica_id<>v_repasse.clinica_id
    or v_recebimento.profissional_id<>v_repasse.profissional_id
    or v_recebimento.sessao_caixa_id<>v_repasse.sessao_caixa_id then
    raise exception using errcode='23514', message='Item nao pertence ao contexto do repasse.';
  end if;
  if tg_op='UPDATE' then
    if v_repasse.status in ('pago','ajustado')
      or new.repasse_id<>old.repasse_id or new.recebimento_id<>old.recebimento_id
      or new.valor_profissional_original<>old.valor_profissional_original
      or new.created_at<>old.created_at then
      raise exception using errcode='42501', message='Item de repasse terminal ou estrutural nao pode ser alterado.';
    end if;
  end if;
  return new;
end;
$$;

create function private.financeiro_proteger_ajuste_repasse()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  if (old.status='aplicado' and coalesce(current_setting('financeiro.internal_write', true),'')<>'1')
    or new.clinica_id<>old.clinica_id
    or new.profissional_id<>old.profissional_id or new.estorno_id<>old.estorno_id
    or new.repasse_origem_id<>old.repasse_origem_id or new.valor<>old.valor
    or new.criado_por<>old.criado_por or new.criado_em<>old.criado_em then
    raise exception using errcode='42501', message='Ajuste aplicado ou estrutural nao pode ser alterado.';
  end if;
  return new;
end;
$$;

create function private.financeiro_validar_aplicacao_ajuste()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_ajuste public.ajustes_repasse%rowtype;
  v_repasse public.repasses%rowtype;
begin
  if tg_op='UPDATE' then
    if coalesce(current_setting('financeiro.internal_write', true),'')<>'1'
      or not exists (select 1 from public.repasses r where r.id=new.repasse_id and r.status='pendente') then
      raise exception using errcode='42501', message='Aplicacao de ajuste so pode ser rebalanceada internamente em repasse pendente.';
    end if;
  elsif tg_op='DELETE' then
    if coalesce(current_setting('financeiro.internal_write', true),'')<>'1'
      or not exists (select 1 from public.repasses r where r.id=old.repasse_id and r.status='pendente') then
      raise exception using errcode='42501', message='Aplicacao de ajuste terminal ou externa nao pode ser removida.';
    end if;
    return old;
  end if;
  select a.* into v_ajuste from public.ajustes_repasse a where a.id=new.ajuste_id;
  select r.* into v_repasse from public.repasses r where r.id=new.repasse_id;
  if v_ajuste.id is null or v_repasse.id is null
    or v_ajuste.clinica_id<>v_repasse.clinica_id
    or v_ajuste.profissional_id<>v_repasse.profissional_id then
    raise exception using errcode='23514', message='Aplicacao nao pertence ao contexto do ajuste e do repasse.';
  end if;
  return new;
end;
$$;

create trigger repasses_proteger_terminal before update on public.repasses
for each row execute function private.financeiro_proteger_repasse_terminal();
create trigger repasses_itens_validar before insert or update on public.repasses_itens
for each row execute function private.financeiro_validar_item_repasse();
create trigger ajustes_repasse_proteger before update on public.ajustes_repasse
for each row execute function private.financeiro_proteger_ajuste_repasse();
create trigger aplicacoes_ajuste_validar before insert or update on public.aplicacoes_ajuste_repasse
for each row execute function private.financeiro_validar_aplicacao_ajuste();

revoke all privileges on function private.financeiro_proteger_repasse_terminal(),
  private.financeiro_validar_item_repasse(),
  private.financeiro_proteger_ajuste_repasse(),
  private.financeiro_validar_aplicacao_ajuste(),
  private.financeiro_proteger_delete_aplicacao_ajuste()
from public, anon, authenticated;

-- Escritas internas das RPCs financeiras usam este marcador transacional.
-- Grants de tabelas continuam sem escrita para usuarios comuns.

create function private.financeiro_rebalancear_ajustes_repasse(
  p_repasse_id uuid, p_usuario_id uuid, p_estorno_id uuid
)
returns void language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_repasse public.repasses%rowtype;
  v_item public.repasses_itens%rowtype;
  v_aplicacao public.aplicacoes_ajuste_repasse%rowtype;
  v_ajuste public.ajustes_repasse%rowtype;
  v_credito numeric(12,2);
  v_excesso numeric(12,2);
  v_devolver numeric(12,2);
  v_novo_aplicado numeric(12,2);
  v_valor_anterior numeric(12,2);
begin
  perform pg_catalog.set_config('financeiro.internal_write','1',true);
  select r.* into v_repasse from public.repasses r where r.id=p_repasse_id for update;
  if not found or v_repasse.status<>'pendente' then return; end if;
  select ri.* into v_item from public.repasses_itens ri where ri.repasse_id=p_repasse_id for update;
  if not found then return; end if;

  v_credito := coalesce((select sum(greatest(0,ri.valor_profissional_original-ri.valor_estornos_antes_pagamento))
    from public.repasses_itens ri where ri.repasse_id=p_repasse_id),0);
  v_excesso := greatest(0, v_repasse.valor_ajustes_aplicados - v_credito);

  -- Desfaz a alocacao mais recente primeiro, preservando os ajustes antigos.
  for v_aplicacao in
    select aa.* from public.aplicacoes_ajuste_repasse aa
    where aa.repasse_id=p_repasse_id
    order by aa.created_at desc, aa.id desc for update
  loop
    exit when v_excesso<=0;
    v_devolver := least(v_aplicacao.valor_aplicado,v_excesso);
    select a.* into v_ajuste from public.ajustes_repasse a where a.id=v_aplicacao.ajuste_id for update;
    v_valor_anterior := v_aplicacao.valor_aplicado;
    if v_devolver=v_aplicacao.valor_aplicado then
      delete from public.aplicacoes_ajuste_repasse where id=v_aplicacao.id;
    else
      update public.aplicacoes_ajuste_repasse
      set valor_aplicado=valor_aplicado-v_devolver
      where id=v_aplicacao.id;
    end if;
    v_novo_aplicado := v_ajuste.valor_aplicado-v_devolver;
    update public.ajustes_repasse set valor_aplicado=v_novo_aplicado,
      status=case when v_novo_aplicado=abs(valor) then 'aplicado'
        when v_novo_aplicado>0 then 'parcialmente_aplicado' else 'pendente' end
    where id=v_ajuste.id;
    insert into public.eventos_auditoria_financeira(
      clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,
      estado_anterior,estado_novo,dados,motivo
    ) values (
      v_repasse.clinica_id,p_usuario_id,'proprietaria'::public.papel_usuario,
      'rebalancear_ajuste_repasse','ajuste_repasse',v_ajuste.id,v_devolver,
      jsonb_build_object('valor_aplicado',v_valor_anterior,'repasse_status',v_repasse.status),
      jsonb_build_object('valor_aplicado',v_novo_aplicado,'repasse_status','pendente'),
      jsonb_build_object('repasse_id',p_repasse_id,'profissional_id',v_repasse.profissional_id,
        'ajuste_id',v_ajuste.id,'valor_anterior_aplicado',v_valor_anterior,
        'novo_valor_aplicado',v_novo_aplicado,'valor_devolvido_saldo',v_devolver,
        'estorno_id',p_estorno_id), null
    );
    v_excesso := v_excesso-v_devolver;
  end loop;

  update public.repasses set
    valor_estornos_antes_pagamento=v_item.valor_estornos_antes_pagamento,
    valor_liquido=greatest(0,valor_bruto_profissional-v_item.valor_estornos_antes_pagamento-valor_ajustes_aplicados),
    status=case when greatest(0,valor_bruto_profissional-v_item.valor_estornos_antes_pagamento-valor_ajustes_aplicados)=0
      then 'ajustado' else 'pendente' end
  where id=p_repasse_id;
end;
$$;

revoke all privileges on function private.financeiro_rebalancear_ajustes_repasse(uuid,uuid,uuid)
from public, anon, authenticated;

-- Consome ajustes mais antigos contra repasses pendentes mais antigos.
create function private.financeiro_aplicar_ajustes_repasse(
  p_clinica_id uuid, p_profissional_id uuid, p_usuario_id uuid
)
returns void language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_ajuste public.ajustes_repasse%rowtype;
  v_repasse public.repasses%rowtype;
  v_disponivel numeric(12,2);
  v_aplicar numeric(12,2);
  v_aplicacao_id uuid;
  v_novo_aplicado numeric(12,2);
begin
  perform pg_catalog.set_config('financeiro.internal_write','1',true);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'financeiro_ajustes:'||p_clinica_id::text||':'||p_profissional_id::text,0));

  for v_ajuste in
    select a.* from public.ajustes_repasse a
    where a.clinica_id=p_clinica_id and a.profissional_id=p_profissional_id
      and a.status in ('pendente','parcialmente_aplicado')
    order by a.criado_em,a.id for update
  loop
    v_disponivel := abs(v_ajuste.valor)-v_ajuste.valor_aplicado;
    for v_repasse in
      select r.* from public.repasses r
      where r.clinica_id=p_clinica_id and r.profissional_id=p_profissional_id
        and r.status='pendente' and r.valor_liquido>0
      order by r.gerado_em,r.id for update
    loop
      exit when v_disponivel<=0;
      v_aplicar := least(v_disponivel,v_repasse.valor_liquido);
      insert into public.aplicacoes_ajuste_repasse(ajuste_id,repasse_id,valor_aplicado)
      values(v_ajuste.id,v_repasse.id,v_aplicar) returning id into v_aplicacao_id;

      update public.repasses set
        valor_ajustes_aplicados=valor_ajustes_aplicados+v_aplicar,
        valor_liquido=valor_liquido-v_aplicar,
        status=case when valor_liquido-v_aplicar=0 then 'ajustado' else 'pendente' end
      where id=v_repasse.id;

      v_novo_aplicado := v_ajuste.valor_aplicado+v_aplicar;
      update public.ajustes_repasse set valor_aplicado=v_novo_aplicado,
        status=case when v_novo_aplicado=abs(valor) then 'aplicado'
          when v_novo_aplicado>0 then 'parcialmente_aplicado' else 'pendente' end
      where id=v_ajuste.id;

      insert into public.eventos_auditoria_financeira(
        clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,
        estado_anterior,estado_novo,dados
      ) values (
        p_clinica_id,p_usuario_id,'proprietaria'::public.papel_usuario,
        'aplicar_ajuste_repasse','aplicacao_ajuste_repasse',v_aplicacao_id,v_aplicar,
        jsonb_build_object('ajuste_status',v_ajuste.status,'repasse_status',v_repasse.status),
        jsonb_build_object('ajuste_status',case when v_novo_aplicado=abs(v_ajuste.valor) then 'aplicado' else 'parcialmente_aplicado' end,
          'repasse_status',case when v_repasse.valor_liquido-v_aplicar=0 then 'ajustado' else 'pendente' end),
        jsonb_build_object('ajuste_id',v_ajuste.id,'repasse_id',v_repasse.id,
          'profissional_id',p_profissional_id,'valor_aplicado',v_aplicar)
      );
      v_disponivel := v_disponivel-v_aplicar;
      v_ajuste.valor_aplicado := v_novo_aplicado;
      v_ajuste.status := case when v_novo_aplicado=abs(v_ajuste.valor) then 'aplicado' else 'parcialmente_aplicado' end;
    end loop;
  end loop;
end;
$$;

revoke all privileges on function private.financeiro_aplicar_ajustes_repasse(uuid,uuid,uuid)
from public, anon, authenticated;

-- Gera uma obrigacao por profissional e um item por recebimento do fechamento.
create function private.financeiro_gerar_repasses_fechamento(
  p_fechamento_id uuid, p_usuario_id uuid
)
returns void language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_fechamento public.fechamentos_caixa%rowtype;
  v_prof record;
  v_repasse_id uuid;
  v_status text;
begin
  select f.* into v_fechamento from public.fechamentos_caixa f
  where f.id=p_fechamento_id and f.status='aprovado' for update;
  if not found then raise exception using errcode='22023', message='Geracao exige fechamento aprovado.'; end if;
  if exists(select 1 from public.entradas_caixa ec where ec.sessao_caixa_id=v_fechamento.sessao_caixa_id) then
    raise exception using errcode='22023', message='Sessao legada nao gera repasses do novo Financeiro.';
  end if;

  for v_prof in
    select r.profissional_id,
      sum(r.valor_profissional)::numeric(12,2) as bruto,
      coalesce(sum((select coalesce(sum(e.valor_profissional),0) from public.estornos e
        where e.recebimento_id=r.id and e.status='efetivado')),0)::numeric(12,2) as estornos
    from public.recebimentos r
    where r.sessao_caixa_id=v_fechamento.sessao_caixa_id
    group by r.profissional_id order by r.profissional_id
  loop
    v_status := case when v_prof.bruto-v_prof.estornos=0 then 'ajustado' else 'pendente' end;
    insert into public.repasses(clinica_id,profissional_id,fechamento_id,sessao_caixa_id,
      status,valor_bruto_profissional,valor_estornos_antes_pagamento,
      valor_ajustes_aplicados,valor_liquido,gerado_por)
    values(v_fechamento.clinica_id,v_prof.profissional_id,v_fechamento.id,
      v_fechamento.sessao_caixa_id,v_status,v_prof.bruto,v_prof.estornos,0,
      v_prof.bruto-v_prof.estornos,p_usuario_id)
    on conflict(fechamento_id,profissional_id) do nothing
    returning id into v_repasse_id;
    if v_repasse_id is null then
      select r.id into v_repasse_id from public.repasses r
      where r.fechamento_id=v_fechamento.id
        and r.profissional_id=v_prof.profissional_id;
    end if;

    insert into public.repasses_itens(repasse_id,recebimento_id,
      valor_profissional_original,valor_estornos_antes_pagamento,valor_liquido)
    select v_repasse_id,r.id,r.valor_profissional,
      coalesce((select sum(e.valor_profissional) from public.estornos e
        where e.recebimento_id=r.id and e.status='efetivado'),0),
      r.valor_profissional-coalesce((select sum(e.valor_profissional) from public.estornos e
        where e.recebimento_id=r.id and e.status='efetivado'),0)
    from public.recebimentos r
    where r.sessao_caixa_id=v_fechamento.sessao_caixa_id
      and r.profissional_id=v_prof.profissional_id
    on conflict(recebimento_id) do nothing;

    if not exists(select 1 from public.eventos_auditoria_financeira ea
      where ea.acao='gerar_repasse' and ea.entidade='repasse' and ea.entidade_id=v_repasse_id) then
      insert into public.eventos_auditoria_financeira(
        clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,estado_novo,dados
      ) values(v_fechamento.clinica_id,p_usuario_id,'proprietaria'::public.papel_usuario,
        'gerar_repasse','repasse',v_repasse_id,v_prof.bruto-v_prof.estornos,
        jsonb_build_object('status',v_status),jsonb_build_object(
          'profissional_id',v_prof.profissional_id,'fechamento_id',v_fechamento.id,
          'valor_bruto_profissional',v_prof.bruto,
          'valor_estornos_antes_pagamento',v_prof.estornos));
    end if;
    if v_status='pendente' then
      perform private.financeiro_aplicar_ajustes_repasse(
        v_fechamento.clinica_id,v_prof.profissional_id,p_usuario_id);
    end if;
  end loop;
end;
$$;

revoke all privileges on function private.financeiro_gerar_repasses_fechamento(uuid,uuid)
from public, anon, authenticated;

-- Aprovacao do fechamento e geracao de repasses permanecem atomicas.
create or replace function public.financeiro_revisar_fechamento(
  p_fechamento_id uuid,p_acao text,p_observacao text default null
)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_acao text := btrim(coalesce(p_acao,''));
  v_observacao text := nullif(btrim(coalesce(p_observacao,'')),'');
  v_fechamento public.fechamentos_caixa%rowtype;
  v_status_sessao public.status_sessao_caixa;
  v_revisao public.revisoes_fechamento_caixa%rowtype;
begin
  if v_usuario_id is null then raise exception using errcode='28000',message='Usuario nao autenticado.'; end if;
  if v_acao not in ('aprovar','devolver') then raise exception using errcode='22023',message='Acao de revisao de fechamento invalida.'; end if;
  select f.* into v_fechamento from public.fechamentos_caixa f where f.id=p_fechamento_id for update;
  if not found then raise exception using errcode='P0002',message='Fechamento inexistente.'; end if;
  if not private.financeiro_tem_papel_clinica(v_fechamento.clinica_id,array['proprietaria'::public.papel_usuario]) then
    raise exception using errcode='42501',message='Somente proprietaria ativa pode revisar fechamento.'; end if;
  select r.* into v_revisao from public.revisoes_fechamento_caixa r where r.fechamento_id=v_fechamento.id;
  if found then
    if v_revisao.acao=v_acao then return jsonb_build_object('fechamento_id',v_fechamento.id,'revisao_id',v_revisao.id,'acao',v_revisao.acao,'status',v_fechamento.status,'nova_operacao',false); end if;
    raise exception using errcode='23505',message='Tentativa de fechamento ja possui revisao definitiva.';
  end if;
  select sc.status into v_status_sessao from public.sessoes_caixa sc
  where sc.id=v_fechamento.sessao_caixa_id and sc.clinica_id=v_fechamento.clinica_id for update;
  if not found then raise exception using errcode='P0002',message='Sessao de caixa do fechamento inexistente.'; end if;
  if v_fechamento.status<>'aguardando_aprovacao' or v_status_sessao<>'aguardando_aprovacao'::public.status_sessao_caixa
    or exists(select 1 from public.fechamentos_caixa posterior where posterior.sessao_caixa_id=v_fechamento.sessao_caixa_id and posterior.tentativa>v_fechamento.tentativa) then
    raise exception using errcode='22023',message='Fechamento nao e a tentativa ativa aguardando aprovacao.'; end if;
  insert into public.revisoes_fechamento_caixa(clinica_id,fechamento_id,acao,observacao,revisado_por,revisado_em)
  values(v_fechamento.clinica_id,v_fechamento.id,v_acao,v_observacao,v_usuario_id,now()) returning * into v_revisao;
  if v_acao='aprovar' then
    update public.fechamentos_caixa set status='aprovado' where id=v_fechamento.id;
    update public.sessoes_caixa set status='aprovado'::public.status_sessao_caixa,
      valor_esperado=v_fechamento.valor_esperado,valor_contado=v_fechamento.valor_contado,
      diferenca=v_fechamento.diferenca,fechado_por=v_usuario_id,fechado_em=now()
    where id=v_fechamento.sessao_caixa_id;
    perform private.financeiro_gerar_repasses_fechamento(v_fechamento.id,v_usuario_id);
  else
    update public.fechamentos_caixa set status='devolvido' where id=v_fechamento.id;
    update public.sessoes_caixa set status='devolvido_para_correcao'::public.status_sessao_caixa where id=v_fechamento.sessao_caixa_id;
  end if;
  insert into public.eventos_auditoria_financeira(clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,estado_anterior,estado_novo,dados,motivo)
  values(v_fechamento.clinica_id,v_usuario_id,'proprietaria'::public.papel_usuario,
    case v_acao when 'aprovar' then 'aprovar_fechamento' else 'devolver_fechamento' end,
    'fechamento_caixa',v_fechamento.id,v_fechamento.valor_contado,
    jsonb_build_object('fechamento_status',v_fechamento.status,'sessao_status',v_status_sessao),
    jsonb_build_object('fechamento_status',case v_acao when 'aprovar' then 'aprovado' else 'devolvido' end,
      'sessao_status',case v_acao when 'aprovar' then 'aprovado' else 'devolvido_para_correcao' end),
    jsonb_build_object('sessao_caixa_id',v_fechamento.sessao_caixa_id,'tentativa',v_fechamento.tentativa,'revisao_id',v_revisao.id),v_observacao);
  return jsonb_build_object('fechamento_id',v_fechamento.id,'revisao_id',v_revisao.id,'acao',v_acao,
    'status',case v_acao when 'aprovar' then 'aprovado' else 'devolvido' end,'nova_operacao',true);
end;
$$;

-- Confirma pagamento externo; nao cria movimento de caixa.
create function public.financeiro_confirmar_repasse(
  p_repasse_id uuid,p_meio_pagamento text,p_referencia_pagamento text default null,
  p_observacao text default null,p_idempotency_key text default null
)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_meio text := btrim(coalesce(p_meio_pagamento,''));
  v_referencia text := nullif(btrim(coalesce(p_referencia_pagamento,'')),'');
  v_observacao text := nullif(btrim(coalesce(p_observacao,'')),'');
  v_chave text := btrim(coalesce(p_idempotency_key,''));
  v_repasse public.repasses%rowtype;
begin
  if v_usuario_id is null then raise exception using errcode='28000',message='Usuario nao autenticado.'; end if;
  if v_meio not in ('pix','transferencia') then raise exception using errcode='22023',message='Meio de pagamento do repasse invalido.'; end if;
  if v_chave='' or char_length(v_chave)>200 then raise exception using errcode='22023',message='Chave de idempotencia invalida.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('financeiro_confirmar_repasse:'||v_chave,0));
  select r.* into v_repasse from public.repasses r where r.id=p_repasse_id for update;
  if not found then raise exception using errcode='P0002',message='Repasse inexistente.'; end if;
  if not private.financeiro_tem_papel_clinica(v_repasse.clinica_id,array['proprietaria'::public.papel_usuario]) then
    raise exception using errcode='42501',message='Somente proprietaria ativa pode confirmar repasse.'; end if;
  if v_repasse.status='pago' then
    if v_repasse.confirmacao_idempotency_key=v_chave and v_repasse.meio_pagamento=v_meio
      and v_repasse.referencia_pagamento is not distinct from v_referencia
      and v_repasse.observacao is not distinct from v_observacao then
      return jsonb_build_object('repasse_id',v_repasse.id,'status','pago','valor_liquido',v_repasse.valor_liquido,'nova_operacao',false);
    end if;
    raise exception using errcode='23505',message='Repasse ja confirmado por outra operacao.';
  end if;
  if v_repasse.status='ajustado' then raise exception using errcode='22023',message='Repasse ajustado nao possui valor externo a pagar.'; end if;
  if v_repasse.status<>'pendente' or v_repasse.valor_liquido<=0 then raise exception using errcode='22023',message='Repasse nao esta disponivel para confirmacao.'; end if;
  if exists(select 1 from public.repasses r where r.confirmacao_idempotency_key=v_chave and r.id<>v_repasse.id)
    or exists(select 1 from public.recebimentos r where r.idempotency_key=v_chave)
    or exists(select 1 from public.estornos e where e.idempotency_key=v_chave)
    or exists(select 1 from public.sessoes_caixa sc where sc.idempotency_key=v_chave)
    or exists(select 1 from public.movimentos_caixa mc where mc.idempotency_key=v_chave)
    or exists(select 1 from public.sangrias_caixa s where s.idempotency_key=v_chave)
    or exists(select 1 from public.fechamentos_caixa f where f.idempotency_key=v_chave) then
    raise exception using errcode='23505',message='Chave de idempotencia ja utilizada em outra operacao.'; end if;
  update public.repasses set status='pago',confirmado_por=v_usuario_id,confirmado_em=now(),
    meio_pagamento=v_meio,referencia_pagamento=v_referencia,observacao=v_observacao,
    confirmacao_idempotency_key=v_chave where id=v_repasse.id;
  insert into public.eventos_auditoria_financeira(clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,estado_anterior,estado_novo,dados,motivo)
  values(v_repasse.clinica_id,v_usuario_id,'proprietaria'::public.papel_usuario,'confirmar_repasse','repasse',v_repasse.id,
    v_repasse.valor_liquido,jsonb_build_object('status','pendente'),jsonb_build_object('status','pago'),
    jsonb_build_object('profissional_id',v_repasse.profissional_id,'fechamento_id',v_repasse.fechamento_id,
      'meio_pagamento',v_meio,'referencia_pagamento',v_referencia),v_observacao);
  return jsonb_build_object('repasse_id',v_repasse.id,'status','pago','valor_liquido',v_repasse.valor_liquido,'nova_operacao',true);
end;
$$;

-- Acrescenta o impacto em repasse ao fluxo de estorno da FASE 5.
create or replace function public.financeiro_revisar_estorno(
  p_estorno_id uuid,p_acao text,p_observacao text default null
)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_acao text := btrim(coalesce(p_acao,''));
  v_observacao text := nullif(btrim(coalesce(p_observacao,'')),'');
  v_estorno public.estornos%rowtype; v_recebimento public.recebimentos%rowtype;
  v_sessao_id uuid; v_movimento_id uuid; v_dinheiro numeric(12,2);
  v_total_efetivado numeric(12,2); v_caixa record; v_pagamentos jsonb;
  v_item public.repasses_itens%rowtype; v_repasse public.repasses%rowtype;
  v_ajuste_id uuid;
begin
  if v_usuario_id is null then raise exception using errcode='28000',message='Usuario nao autenticado.'; end if;
  if v_acao not in ('aprovar','rejeitar') then raise exception using errcode='22023',message='Acao de revisao de estorno invalida.'; end if;
  select e.* into v_estorno from public.estornos e where e.id=p_estorno_id for update;
  if not found then raise exception using errcode='P0002',message='Estorno inexistente.'; end if;
  if not private.financeiro_tem_papel_clinica(v_estorno.clinica_id,array['proprietaria'::public.papel_usuario]) then
    raise exception using errcode='42501',message='Somente proprietaria ativa pode revisar estorno.'; end if;
  if (v_acao='aprovar' and v_estorno.status='efetivado') or (v_acao='rejeitar' and v_estorno.status='rejeitado') then
    select mc.id into v_movimento_id from public.movimentos_caixa mc where mc.estorno_id=v_estorno.id;
    return jsonb_build_object('estorno_id',v_estorno.id,'recebimento_id',v_estorno.recebimento_id,'status',v_estorno.status,'movimento_id',v_movimento_id,'nova_operacao',false);
  end if;
  if v_estorno.status<>'solicitado' then raise exception using errcode='22023',message='Decisao conflitante com o estado atual do estorno.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('forma_pagamento',ep.forma_pagamento,'valor',ep.valor) order by ep.forma_pagamento),'[]'::jsonb),
    coalesce(sum(ep.valor) filter(where ep.forma_pagamento='dinheiro'),0)
  into v_pagamentos,v_dinheiro from public.estornos_pagamentos ep where ep.estorno_id=v_estorno.id;
  if v_acao='rejeitar' then
    update public.estornos set status='rejeitado',revisado_por=v_usuario_id,revisado_em=now(),observacao_revisao=v_observacao where id=v_estorno.id;
    insert into public.eventos_auditoria_financeira(clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,estado_anterior,estado_novo,dados,motivo)
    values(v_estorno.clinica_id,v_usuario_id,'proprietaria'::public.papel_usuario,'rejeitar_estorno','estorno',v_estorno.id,v_estorno.valor_total,
      jsonb_build_object('status','solicitado'),jsonb_build_object('status','rejeitado'),jsonb_build_object('recebimento_id',v_estorno.recebimento_id,
      'valor_clinica',v_estorno.valor_clinica,'valor_profissional',v_estorno.valor_profissional,'pagamentos',v_pagamentos,'observacao_revisao',v_observacao),v_estorno.motivo);
    return jsonb_build_object('estorno_id',v_estorno.id,'recebimento_id',v_estorno.recebimento_id,'status','rejeitado','movimento_id',null,'nova_operacao',true);
  end if;
  select r.* into v_recebimento from public.recebimentos r where r.id=v_estorno.recebimento_id and r.clinica_id=v_estorno.clinica_id for update;
  if not found then raise exception using errcode='P0002',message='Recebimento do estorno inexistente.'; end if;
  if (select coalesce(sum(e.valor_total),0) from public.estornos e where e.recebimento_id=v_recebimento.id and e.status in('solicitado','aprovado','efetivado'))>v_recebimento.valor_bruto
    or (select coalesce(sum(e.valor_clinica),0) from public.estornos e where e.recebimento_id=v_recebimento.id and e.status in('solicitado','aprovado','efetivado'))>v_recebimento.valor_clinica
    or (select coalesce(sum(e.valor_profissional),0) from public.estornos e where e.recebimento_id=v_recebimento.id and e.status in('solicitado','aprovado','efetivado'))>v_recebimento.valor_profissional then
    raise exception using errcode='23514',message='Reservas de estorno excedem o snapshot do recebimento.'; end if;
  if exists(select 1 from public.estornos_pagamentos atual join public.recebimentos_pagamentos rp on rp.recebimento_id=v_recebimento.id and rp.forma_pagamento=atual.forma_pagamento
    where atual.estorno_id=v_estorno.id and (select coalesce(sum(ep.valor),0) from public.estornos_pagamentos ep join public.estornos e on e.id=ep.estorno_id
      where e.recebimento_id=v_recebimento.id and e.status in('solicitado','aprovado','efetivado') and ep.forma_pagamento=atual.forma_pagamento)>rp.valor) then
    raise exception using errcode='23514',message='Reservas excedem uma forma de pagamento original.'; end if;
  select sc.id into v_sessao_id from public.sessoes_caixa sc where sc.clinica_id=v_estorno.clinica_id and sc.status='aberto'::public.status_sessao_caixa for update;
  if not found then raise exception using errcode='22023',message='Efetivacao de estorno exige caixa operacional aberto.'; end if;
  if exists(select 1 from public.entradas_caixa ec where ec.sessao_caixa_id=v_sessao_id) then raise exception using errcode='22023',message='Sessao de caixa legada exige transicao controlada e nao aceita estorno.'; end if;
  select * into v_caixa from private.financeiro_calcular_caixa(v_sessao_id);
  if v_dinheiro>v_caixa.valor_esperado then raise exception using errcode='22023',message='Estorno em dinheiro excede o dinheiro fisico esperado do caixa.'; end if;
  update public.estornos set status='efetivado',revisado_por=v_usuario_id,revisado_em=now(),observacao_revisao=v_observacao,efetivado_por=v_usuario_id,efetivado_em=now() where id=v_estorno.id;
  insert into public.movimentos_caixa(clinica_id,sessao_caixa_id,tipo,recebimento_id,sangria_id,estorno_id,valor,motivo,idempotency_key,registrado_por,registrado_em)
  values(v_estorno.clinica_id,v_sessao_id,'estorno',v_estorno.recebimento_id,null,v_estorno.id,v_estorno.valor_total,v_estorno.motivo,null,v_usuario_id,now()) returning id into v_movimento_id;
  select coalesce(sum(e.valor_total),0) into v_total_efetivado from public.estornos e where e.recebimento_id=v_recebimento.id and e.status='efetivado';
  update public.recebimentos set status=case when v_total_efetivado=valor_bruto then 'estornado' when v_total_efetivado>0 then 'parcialmente_estornado' else 'confirmado' end where id=v_recebimento.id;

    -- Ordem de locks: repasse, depois item. A confirmacao usa o mesmo lock do repasse.
    select rp.* into v_repasse from public.repasses rp
      where exists (select 1 from public.repasses_itens ri
        where ri.repasse_id=rp.id and ri.recebimento_id=v_recebimento.id)
      for update;
    if found then
      select ri.* into v_item from public.repasses_itens ri where ri.recebimento_id=v_recebimento.id for update;
    end if;
    if found then
      if v_repasse.status='pendente' then
      if v_estorno.valor_profissional > v_item.valor_profissional_original-v_item.valor_estornos_antes_pagamento then
        raise exception using errcode='23514',message='Estorno excede o credito restante da producao.'; end if;
      update public.repasses_itens set valor_estornos_antes_pagamento=valor_estornos_antes_pagamento+v_estorno.valor_profissional,
        valor_liquido=valor_liquido-v_estorno.valor_profissional where id=v_item.id;
      perform private.financeiro_rebalancear_ajustes_repasse(v_repasse.id,v_usuario_id,v_estorno.id);
      select r.* into v_repasse from public.repasses r where r.id=v_repasse.id;
      insert into public.eventos_auditoria_financeira(clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,estado_anterior,estado_novo,dados,motivo)
      values(v_estorno.clinica_id,v_usuario_id,'proprietaria'::public.papel_usuario,'ajustar_repasse_estorno_antes_pagamento','repasse',v_repasse.id,
        v_estorno.valor_profissional,jsonb_build_object('status',v_repasse.status,'valor_liquido',v_repasse.valor_liquido),
        jsonb_build_object('status',case when v_repasse.valor_liquido-v_estorno.valor_profissional=0 then 'ajustado' else 'pendente' end,
          'valor_liquido',greatest(0,v_repasse.valor_liquido-v_estorno.valor_profissional)),jsonb_build_object('recebimento_id',v_recebimento.id,'estorno_id',v_estorno.id,'profissional_id',v_repasse.profissional_id),v_estorno.motivo);
    elsif v_repasse.status in('pago','ajustado') and v_estorno.valor_profissional>0 then
      insert into public.ajustes_repasse(clinica_id,profissional_id,estorno_id,repasse_origem_id,valor,criado_por)
      values(v_estorno.clinica_id,v_recebimento.profissional_id,v_estorno.id,v_repasse.id,-v_estorno.valor_profissional,v_usuario_id)
      returning id into v_ajuste_id;
      insert into public.eventos_auditoria_financeira(clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,estado_novo,dados,motivo)
      values(v_estorno.clinica_id,v_usuario_id,'proprietaria'::public.papel_usuario,'criar_ajuste_repasse_estorno_pos_pagamento','ajuste_repasse',v_ajuste_id,
        -v_estorno.valor_profissional,jsonb_build_object('status','pendente'),jsonb_build_object('estorno_id',v_estorno.id,'repasse_origem_id',v_repasse.id,'profissional_id',v_recebimento.profissional_id),v_estorno.motivo);
      perform private.financeiro_aplicar_ajustes_repasse(v_estorno.clinica_id,v_recebimento.profissional_id,v_usuario_id);
    end if;
  end if;
  insert into public.eventos_auditoria_financeira(clinica_id,usuario_id,papel,acao,entidade,entidade_id,valor,estado_anterior,estado_novo,dados,motivo)
  values(v_estorno.clinica_id,v_usuario_id,'proprietaria'::public.papel_usuario,'efetivar_estorno','estorno',v_estorno.id,v_estorno.valor_total,
    jsonb_build_object('status','solicitado','recebimento_status',v_recebimento.status),jsonb_build_object('status','efetivado','recebimento_status',case when v_total_efetivado=v_recebimento.valor_bruto then 'estornado' else 'parcialmente_estornado' end),
    jsonb_build_object('recebimento_id',v_estorno.recebimento_id,'sessao_caixa_id',v_sessao_id,'movimento_id',v_movimento_id,'valor_clinica',v_estorno.valor_clinica,'valor_profissional',v_estorno.valor_profissional,'pagamentos',v_pagamentos,'observacao_revisao',v_observacao),v_estorno.motivo);
  return jsonb_build_object('estorno_id',v_estorno.id,'recebimento_id',v_estorno.recebimento_id,'status','efetivado','movimento_id',v_movimento_id,'sessao_caixa_id',v_sessao_id,
    'recebimento_status',case when v_total_efetivado=v_recebimento.valor_bruto then 'estornado' else 'parcialmente_estornado' end,'nova_operacao',true);
end;
$$;

revoke all privileges on function public.financeiro_confirmar_repasse(uuid,text,text,text,text)
from public, anon;
grant execute on function public.financeiro_confirmar_repasse(uuid,text,text,text,text)
to authenticated;

commit;
