-- FASE 8: somente camada de dados. Criada pelo CLI; NAO APLICADA.
-- Contrato e dominios dos filtros: docs/modulos/financeiro/09-CONTRATO-DASHBOARDS.md.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '5min';

-- Configuracao nao e saldo. Ausencia da linha equivale a oito NULLs.
create table public.configuracoes_alertas_financeiros (
  clinica_id uuid primary key references public.clinicas(id) on delete restrict,
  caixa_atencao numeric default null,
  caixa_critico numeric default null,
  repasse_dias_atencao integer default null,
  repasse_dias_critico integer default null,
  fiscal_dias_atencao integer default null,
  fiscal_dias_critico integer default null,
  estornos_percentual_atencao numeric default null,
  estornos_percentual_critico numeric default null,
  atualizado_por uuid not null references public.usuarios(id) on delete restrict,
  atualizado_em timestamptz not null default now(),
  constraint alertas_caixa_check check (
    (caixa_atencao is null or (caixa_atencao >= 0 and caixa_atencao < 'Infinity'::numeric and caixa_atencao=round(caixa_atencao,2))) and
    (caixa_critico is null or (caixa_critico >= 0 and caixa_critico < 'Infinity'::numeric and caixa_critico=round(caixa_critico,2))) and
    (caixa_atencao is null or caixa_critico is null or caixa_atencao<=caixa_critico)),
  constraint alertas_repasse_check check (
    (repasse_dias_atencao is null or repasse_dias_atencao>=0) and
    (repasse_dias_critico is null or repasse_dias_critico>=0) and
    (repasse_dias_atencao is null or repasse_dias_critico is null or repasse_dias_atencao<=repasse_dias_critico)),
  constraint alertas_fiscal_check check (
    (fiscal_dias_atencao is null or fiscal_dias_atencao>=0) and
    (fiscal_dias_critico is null or fiscal_dias_critico>=0) and
    (fiscal_dias_atencao is null or fiscal_dias_critico is null or fiscal_dias_atencao<=fiscal_dias_critico)),
  constraint alertas_estornos_check check (
    (estornos_percentual_atencao is null or estornos_percentual_atencao between 0 and 100) and
    (estornos_percentual_critico is null or estornos_percentual_critico between 0 and 100) and
    (estornos_percentual_atencao is null or estornos_percentual_critico is null or estornos_percentual_atencao<=estornos_percentual_critico))
);
alter table public.configuracoes_alertas_financeiros enable row level security;
revoke all on public.configuracoes_alertas_financeiros from public, anon, authenticated;
grant select on public.configuracoes_alertas_financeiros to authenticated;

-- Identidade/vinculos verificados dentro da fronteira privilegiada. Tambem
-- evita depender de policies legadas para enumerar clinicas autorizadas.
create function private.financeiro_dashboard_escopo(p_clinica_id uuid, p_medico boolean)
returns table(clinicas uuid[], profissional_id uuid)
language plpgsql stable security definer set search_path=pg_catalog as $$
declare v_uid uuid := auth.uid(); v_prof uuid; v_ids uuid[]; v_n integer;
begin
  if v_uid is null or not exists(select 1 from public.usuarios u where u.id=v_uid and u.ativo) then
    raise exception using errcode='42501', message='Usuario financeiro nao autorizado.';
  end if;
  if p_medico then
    select count(*), (array_agg(p.id))[1] into v_n,v_prof
    from public.profissionais p where p.usuario_id=v_uid and p.ativo;
    if v_n<>1 then raise exception using errcode='42501', message='Identidade profissional ausente ou ambigua.'; end if;
  end if;
  select array_agg(c.id order by c.id) into v_ids
  from public.clinicas c join public.usuarios_clinicas uc on uc.clinica_id=c.id
  where c.ativo and uc.ativo and uc.usuario_id=v_uid
    and uc.papel=case when p_medico then 'medico'::public.papel_usuario else 'proprietaria'::public.papel_usuario end
    and (p_clinica_id is null or c.id=p_clinica_id)
    and (not p_medico or exists(select 1 from public.profissionais_clinicas pc
      where pc.clinica_id=c.id and pc.profissional_id=v_prof and pc.ativo));
  if coalesce(cardinality(v_ids),0)=0 then
    raise exception using errcode='42501', message='Nenhuma clinica autorizada no escopo solicitado.';
  end if;
  return query select v_ids,v_prof;
end;
$$;
revoke all on function private.financeiro_dashboard_escopo(uuid,boolean) from public,anon,authenticated;

create policy configuracoes_alertas_select_proprietaria
on public.configuracoes_alertas_financeiros for select to authenticated using (
  private.financeiro_tem_papel_clinica(clinica_id,array['proprietaria'::public.papel_usuario])
  and exists(select 1 from public.usuarios u where u.id=(select auth.uid()) and u.ativo)
  and exists(select 1 from public.clinicas c where c.id=clinica_id and c.ativo)
);

create function private.financeiro_auditar_configuracao_alertas()
returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  perform 1 from private.financeiro_dashboard_escopo(new.clinica_id,false);
  if tg_op='UPDATE' and new.clinica_id<>old.clinica_id then
    raise exception using errcode='22023', message='Clinica da configuracao e imutavel.';
  end if;
  insert into public.eventos_auditoria_financeira
    (clinica_id,usuario_id,papel,acao,entidade,entidade_id,estado_anterior,estado_novo)
  values(new.clinica_id,auth.uid(),'proprietaria','configurar_alertas_financeiros',
    'configuracoes_alertas_financeiros',new.clinica_id,
    case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
  return new;
end;
$$;
revoke all on function private.financeiro_auditar_configuracao_alertas() from public,anon,authenticated;
create trigger configuracoes_alertas_auditar after insert or update on public.configuracoes_alertas_financeiros
for each row execute function private.financeiro_auditar_configuracao_alertas();
create trigger configuracoes_alertas_bloquear_delete before delete on public.configuracoes_alertas_financeiros
for each row execute function private.financeiro_bloquear_exclusao_historico();

-- PATCH tipado; null desativa, chave ausente preserva; retry identico e no-op.
create function public.financeiro_configurar_alertas(p_clinica_id uuid,p_limites jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare v_old public.configuracoes_alertas_financeiros%rowtype;
  v_new public.configuracoes_alertas_financeiros%rowtype; v_key text; v_value jsonb;
begin
  if p_clinica_id is null then raise exception using errcode='22023',message='Clinica obrigatoria.'; end if;
  perform 1 from private.financeiro_dashboard_escopo(p_clinica_id,false);
  if p_limites is null or jsonb_typeof(p_limites)<>'object' then
    raise exception using errcode='22023',message='Limites devem ser objeto JSON.';
  end if;
  for v_key,v_value in select key,value from jsonb_each(p_limites) loop
    if not (v_key=any(array['caixa_atencao','caixa_critico','repasse_dias_atencao','repasse_dias_critico',
      'fiscal_dias_atencao','fiscal_dias_critico','estornos_percentual_atencao','estornos_percentual_critico']))
      or jsonb_typeof(v_value) not in ('number','null') then
      raise exception using errcode='22023',message='Campo ou tipo de limite invalido.';
    end if;
    if v_key in ('repasse_dias_atencao','repasse_dias_critico','fiscal_dias_atencao','fiscal_dias_critico')
      and jsonb_typeof(v_value)='number'
      and ((v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric)) then
      raise exception using errcode='22023',message='Idade de alerta deve ser quantidade inteira de dias.';
    end if;
  end loop;
  perform 1 from public.clinicas c where c.id=p_clinica_id for update;
  select * into v_old from public.configuracoes_alertas_financeiros where clinica_id=p_clinica_id;
  select * into v_new from jsonb_populate_record(null::public.configuracoes_alertas_financeiros,
    coalesce(to_jsonb(v_old),'{}'::jsonb)||p_limites||jsonb_build_object('clinica_id',p_clinica_id));
  if (to_jsonb(v_new)-'atualizado_em'-'atualizado_por') is not distinct from
     (to_jsonb(v_old)-'atualizado_em'-'atualizado_por') then
    return jsonb_build_object('alterado',false,'configuracao',to_jsonb(v_old));
  end if;
  insert into public.configuracoes_alertas_financeiros values
    (p_clinica_id,v_new.caixa_atencao,v_new.caixa_critico,v_new.repasse_dias_atencao,v_new.repasse_dias_critico,
    v_new.fiscal_dias_atencao,v_new.fiscal_dias_critico,v_new.estornos_percentual_atencao,
    v_new.estornos_percentual_critico,auth.uid(),now())
  on conflict(clinica_id) do update set
    caixa_atencao=excluded.caixa_atencao,caixa_critico=excluded.caixa_critico,
    repasse_dias_atencao=excluded.repasse_dias_atencao,repasse_dias_critico=excluded.repasse_dias_critico,
    fiscal_dias_atencao=excluded.fiscal_dias_atencao,fiscal_dias_critico=excluded.fiscal_dias_critico,
    estornos_percentual_atencao=excluded.estornos_percentual_atencao,
    estornos_percentual_critico=excluded.estornos_percentual_critico,
    atualizado_por=excluded.atualizado_por,atualizado_em=excluded.atualizado_em
  returning * into v_new;
  return jsonb_build_object('alterado',true,'configuracao',to_jsonb(v_new));
end;
$$;

create function private.financeiro_dashboard_validar(p_inicio timestamptz,p_fim timestamptz,
  p_forma text,p_recebimento text,p_repasse text,p_fiscal text,p_timezone text)
returns void language plpgsql stable security invoker set search_path=pg_catalog as $$
begin
  -- Limite tecnico de payload: ate 366 dias exatos; nao e threshold financeiro.
  if p_inicio is null or p_fim is null or not isfinite(p_inicio) or not isfinite(p_fim)
    or p_inicio>=p_fim or extract(epoch from p_fim-p_inicio)>31622400 then
    raise exception using errcode='22023',message='Periodo finito [inicio,fim), maior que zero e ate 366 dias, obrigatorio.';
  end if;
  if p_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=p_timezone) then
    raise exception using errcode='22023',message='Timezone de series invalido.';
  end if;
  if (p_forma is not null and p_forma not in ('dinheiro','pix','cartao_credito'))
    or (p_recebimento is not null and p_recebimento not in ('confirmado','parcialmente_estornado','estornado'))
    or (p_repasse is not null and p_repasse not in ('pendente','pago','ajustado'))
    or (p_fiscal is not null and p_fiscal not in ('pendente','emissao_solicitada','emitida','erro_emissao',
      'cancelamento_solicitado','cancelada','erro_cancelamento')) then
    raise exception using errcode='22023',message='Filtro de estado ou pagamento invalido.';
  end if;
end;
$$;

-- INVOKER interno, sem EXECUTE para usuarios. Executa exclusivamente sob a
-- identidade da RPC autorizada. Nao projeta caixa/fiscal/auditoria para medico;
-- o EXISTS fiscal somente e usado pelo filtro administrativo (NULL no medico).
create function private.financeiro_dashboard_nucleo(p_inicio timestamptz,p_fim timestamptz,
  p_clinicas uuid[],p_prof uuid,p_paciente uuid,p_forma text,p_recebimento text,p_repasse text,p_fiscal text,
  p_timezone text,p_detalhes boolean)
returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
-- "base" preserva exatamente uma linha por recebimento. Componentes entram
-- somente depois da coorte, e filtro por forma e EXISTS, para nao multiplicar
-- bruto, snapshots, paciente ou estorno em pagamento dividido.
with base as materialized (
  select r.* from public.recebimentos r
  where r.clinica_id=any(p_clinicas) and (p_prof is null or r.profissional_id=p_prof)
    and (p_paciente is null or r.paciente_id=p_paciente)
    and (p_recebimento is null or r.status=p_recebimento)
    and (p_forma is null or exists(select 1 from public.recebimentos_pagamentos x where x.recebimento_id=r.id and x.forma_pagamento=p_forma))
    and (p_fiscal is null or exists(select 1 from public.documentos_fiscais d where d.recebimento_id=r.id and d.clinica_id=r.clinica_id and d.status=p_fiscal))
), coorte as materialized (
  select r.*, coalesce(e.total,0) estornos,coalesce(e.clinica,0) estornos_clinica,
    coalesce(e.profissional,0) estornos_profissional
  from base r left join lateral (
    select sum(e.valor_total) total,sum(e.valor_clinica) clinica,sum(e.valor_profissional) profissional
    from public.estornos e where e.recebimento_id=r.id and e.clinica_id=r.clinica_id and e.status='efetivado'
  ) e on true where r.registrado_em>=p_inicio and r.registrado_em<p_fim
), eventos as materialized (
  select e.* from public.estornos e join base r on r.id=e.recebimento_id and r.clinica_id=e.clinica_id
  where e.status='efetivado' and e.efetivado_em>=p_inicio and e.efetivado_em<p_fim
), repasses_base as materialized (
  select r.*,coalesce(a.total,0) aplicacoes_total from public.repasses r
  left join lateral (select sum(a.valor_aplicado) total from public.aplicacoes_ajuste_repasse a where a.repasse_id=r.id) a on true
  where r.clinica_id=any(p_clinicas)
    and (p_prof is null or r.profissional_id=p_prof)
), repasses_gerados as materialized (
  select * from repasses_base r where r.gerado_em>=p_inicio and r.gerado_em<p_fim
    and (p_repasse is null or r.status=p_repasse)
), repasses_pagos_periodo as materialized (
  select * from repasses_base r where r.status='pago'
    and r.confirmado_em>=p_inicio and r.confirmado_em<p_fim
), repasses_pendentes_atuais as materialized (
  select * from repasses_base r where r.status='pendente'
), aplicacoes_periodo as materialized (
  select a.* from public.aplicacoes_ajuste_repasse a join repasses_base r on r.id=a.repasse_id
  where a.created_at>=p_inicio and a.created_at<p_fim
), dias as (
  select (r.registrado_em at time zone p_timezone)::date dia,
    sum(r.valor_bruto) bruto,sum(r.valor_bruto-r.estornos) liquido,
    sum(r.valor_clinica) clinica_bruta,sum(r.valor_profissional) profissional_bruta,
    sum(r.valor_clinica-r.estornos_clinica) clinica_liquida,
    sum(r.valor_profissional-r.estornos_profissional) profissional_liquida,
    0::numeric estornos_eventos,0::numeric estornos_eventos_clinica,0::numeric estornos_eventos_profissional
  from coorte r where p_detalhes group by 1
  union all
  select (e.efetivado_em at time zone p_timezone)::date,0,0,0,0,0,0,
    sum(e.valor_total),sum(e.valor_clinica),sum(e.valor_profissional)
  from eventos e where p_detalhes group by 1
), serie as (
  select dia,sum(bruto) bruto,sum(liquido) liquido_atual_coorte,
    sum(clinica_bruta) clinica_bruta,sum(profissional_bruta) profissional_bruta,
    sum(clinica_liquida) clinica_liquida,sum(profissional_liquida) profissional_liquida,
    sum(estornos_eventos) estornos_eventos,sum(estornos_eventos_clinica) estornos_eventos_clinica,
    sum(estornos_eventos_profissional) estornos_eventos_profissional
  from dias group by dia
)
select jsonb_build_object(
  'producao',(select jsonb_build_object('quantidade',count(*),'pacientes_distintos',count(distinct paciente_id),
    'bruto',coalesce(sum(valor_bruto),0),'clinica_bruta',coalesce(sum(valor_clinica),0),
    'profissional_bruta',coalesce(sum(valor_profissional),0),'estornos_coorte',coalesce(sum(estornos),0),
    'estornos_clinica',coalesce(sum(estornos_clinica),0),'estornos_profissional',coalesce(sum(estornos_profissional),0),
    'liquido_atual_coorte',coalesce(sum(valor_bruto-estornos),0),
    'clinica_liquida',coalesce(sum(valor_clinica-estornos_clinica),0),
    'profissional_liquida',coalesce(sum(valor_profissional-estornos_profissional),0)) from coorte),
  'estornos_periodo',(select jsonb_build_object('quantidade',count(*),'total',coalesce(sum(valor_total),0),
    'clinica',coalesce(sum(valor_clinica),0),'profissional',coalesce(sum(valor_profissional),0)) from eventos),
  'pagamentos',(select jsonb_build_object(
    'dinheiro',coalesce(sum(p.valor) filter(where p.forma_pagamento='dinheiro'),0),
    'pix',coalesce(sum(p.valor) filter(where p.forma_pagamento='pix'),0),
    'cartao_credito',coalesce(sum(p.valor) filter(where p.forma_pagamento='cartao_credito'),0))
    from public.recebimentos_pagamentos p join coorte r on r.id=p.recebimento_id),
  'repasses',jsonb_build_object(
    'repasses_gerados_periodo',(select count(*) from repasses_gerados),
    'valor_liquido_repasses_gerados_periodo',(select coalesce(sum(valor_liquido),0) from repasses_gerados),
    'repasses_ajustados_gerados_periodo',(select count(*) from repasses_gerados where status='ajustado'),
    'repasses_pagos_periodo',(select count(*) from repasses_pagos_periodo),
    'valor_repasses_pagos_periodo',(select coalesce(sum(valor_liquido),0) from repasses_pagos_periodo),
    'repasses_pendentes_atual',(select count(*) from repasses_pendentes_atuais),
    'valor_repasses_pendentes_atual',(select coalesce(sum(valor_liquido),0) from repasses_pendentes_atuais),
    'aplicacoes_ajustes_periodo',(select coalesce(sum(valor_aplicado),0) from aplicacoes_periodo),
    'aplicacoes_provisorias_repasses_gerados_periodo',(select coalesce(sum(aplicacoes_total) filter(where status='pendente'),0) from repasses_gerados),
    'aplicacoes_compensadas_repasses_gerados_periodo',(select coalesce(sum(aplicacoes_total) filter(where status in ('pago','ajustado')),0) from repasses_gerados)),
  'ajustes',(select jsonb_build_object('quantidade_pendente',count(*),
    'valor_pendente_atual',coalesce(sum(abs(a.valor)-a.valor_aplicado),0),
    'saldo_contabil_negativo_pendente',-coalesce(sum(abs(a.valor)-a.valor_aplicado),0))
    from public.ajustes_repasse a where a.clinica_id=any(p_clinicas)
      and (p_prof is null or a.profissional_id=p_prof) and a.status in ('pendente','parcialmente_aplicado')),
  'series',coalesce((select jsonb_agg(to_jsonb(s) order by s.dia) from serie s),'[]'::jsonb),
  'lista_repasses',coalesce((select jsonb_agg(to_jsonb(t) order by t.data desc,t.id desc) from (
    select r.id,r.gerado_em data,r.clinica_id,c.nome clinica,r.valor_bruto_profissional,
      r.valor_estornos_antes_pagamento,r.valor_ajustes_aplicados,r.valor_liquido,r.status,r.confirmado_em,r.meio_pagamento
    from repasses_gerados r join public.clinicas c on c.id=r.clinica_id where p_detalhes
    order by r.gerado_em desc,r.id desc limit 100) t),'[]'::jsonb),
  'lista_repasses_total',(select count(*) from repasses_gerados),
  'lista_repasses_limite',100);
$$;

-- Extensao administrativa nunca chamada pelo dashboard medico.
create function private.financeiro_dashboard_administrativo(p_inicio timestamptz,p_fim timestamptz,
  p_clinicas uuid[],p_prof uuid,p_paciente uuid,p_forma text,p_recebimento text,p_repasse text,p_fiscal text)
returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
with docs as materialized (
  select d.* from public.documentos_fiscais d join public.recebimentos r on r.id=d.recebimento_id and r.clinica_id=d.clinica_id
  where r.clinica_id=any(p_clinicas) and r.registrado_em>=p_inicio and r.registrado_em<p_fim
    and (p_prof is null or r.profissional_id=p_prof) and (p_paciente is null or r.paciente_id=p_paciente)
    and (p_recebimento is null or r.status=p_recebimento) and (p_fiscal is null or d.status=p_fiscal)
    and (p_forma is null or exists(select 1 from public.recebimentos_pagamentos x where x.recebimento_id=r.id and x.forma_pagamento=p_forma))
), caixas_base as materialized (
  select s.id,s.clinica_id,s.status,s.fechado_em,f.id fechamento_id,f.enviado_em,f.diferenca
  from public.sessoes_caixa s left join lateral (
    select f.id,f.enviado_em,f.diferenca from public.fechamentos_caixa f
    where f.sessao_caixa_id=s.id and f.clinica_id=s.clinica_id order by f.tentativa desc limit 1
  ) f on true
  where s.clinica_id=any(p_clinicas)
    and not exists(select 1 from public.entradas_caixa e where e.sessao_caixa_id=s.id)
), caixas as materialized (
  select * from caixas_base where status in ('aberto','em_fechamento','aguardando_aprovacao','devolvido_para_correcao')
), caixas_aprovados_periodo as materialized (
  select * from caixas_base where status='aprovado' and fechado_em>=p_inicio and fechado_em<p_fim
), docs_alertas as materialized (
  -- Alertas operacionais ignoram o intervalo de graficos; somente clinica e,
  -- quando escolhido, profissional restringem o contexto atual da proprietaria.
  select d.* from public.documentos_fiscais d join public.recebimentos r
    on r.id=d.recebimento_id and r.clinica_id=d.clinica_id
  where d.clinica_id=any(p_clinicas) and (p_prof is null or r.profissional_id=p_prof)
), candidatos as (
  select d.clinica_id,'erro_fiscal'::text tipo,'atencao'::text prioridade,'documentos_fiscais'::text entidade,
    d.id entidade_id,d.updated_at data,jsonb_build_object('codigo',d.status) mensagem
  from docs_alertas d where d.status in ('erro_emissao','erro_cancelamento')
  union all
  select c.clinica_id,'fechamento_devolvido','atencao','fechamentos_caixa',c.fechamento_id,c.enviado_em,
    jsonb_build_object('codigo','fechamento_devolvido_para_correcao')
  from caixas c where c.status='devolvido_para_correcao' and c.fechamento_id is not null
  union all
  select c.clinica_id,'diferenca_caixa',
    case when abs(c.diferenca)>=a.caixa_critico then 'critico' else 'atencao' end,
    'fechamentos_caixa',c.fechamento_id,c.enviado_em,
    jsonb_build_object('codigo','diferenca_caixa','diferenca',c.diferenca)
  from caixas c join public.configuracoes_alertas_financeiros a on a.clinica_id=c.clinica_id
  where c.fechamento_id is not null and (abs(c.diferenca)>=a.caixa_atencao or abs(c.diferenca)>=a.caixa_critico)
  union all
  select r.clinica_id,'idade_repasse',
    case when extract(epoch from now()-r.gerado_em)/86400>=a.repasse_dias_critico then 'critico' else 'atencao' end,
    'repasses',r.id,r.gerado_em,jsonb_build_object('codigo','repasse_pendente','idade_dias',floor(extract(epoch from now()-r.gerado_em)/86400))
  from public.repasses r join public.configuracoes_alertas_financeiros a on a.clinica_id=r.clinica_id
  where r.clinica_id=any(p_clinicas) and (p_prof is null or r.profissional_id=p_prof)
    and r.status='pendente'
    and (extract(epoch from now()-r.gerado_em)/86400>=a.repasse_dias_atencao
      or extract(epoch from now()-r.gerado_em)/86400>=a.repasse_dias_critico)
  union all
  select d.clinica_id,'idade_fiscal',
    case when extract(epoch from now()-d.updated_at)/86400>=a.fiscal_dias_critico then 'critico' else 'atencao' end,
    'documentos_fiscais',d.id,d.updated_at,
    jsonb_build_object('codigo','pendencia_fiscal','status',d.status,'idade_dias',floor(extract(epoch from now()-d.updated_at)/86400))
  from docs_alertas d join public.configuracoes_alertas_financeiros a on a.clinica_id=d.clinica_id
  where d.status not in ('emitida','cancelada','erro_emissao','erro_cancelamento') and
    (extract(epoch from now()-d.updated_at)/86400>=a.fiscal_dias_atencao or extract(epoch from now()-d.updated_at)/86400>=a.fiscal_dias_critico)
), alertas as (
  select * from candidatos order by case prioridade when 'critico' then 0 when 'atencao' then 1 else 2 end,
    data desc nulls last,entidade_id,tipo limit 100
)
select jsonb_build_object(
  'fiscal',(select jsonb_object_agg(s.status,coalesce(n.quantidade,0))
    from unnest(array['pendente','emissao_solicitada','emitida','erro_emissao','cancelamento_solicitado','cancelada','erro_cancelamento']) s(status)
    left join (select status,count(*) quantidade from docs group by status) n using(status)),
  'caixa',jsonb_build_object(
    'situacao_operacional_atual',(select jsonb_build_object('aberto',count(*) filter(where status='aberto'),
    'em_fechamento',count(*) filter(where status='em_fechamento'),
    'aguardando_aprovacao',count(*) filter(where status='aguardando_aprovacao'),
    'devolvido_para_correcao',count(*) filter(where status='devolvido_para_correcao')) from caixas),
    'aprovados_periodo',(select jsonb_build_object('quantidade',count(*),
    'fechamentos_com_diferenca',count(*) filter(where diferenca<>0),
    'diferenca_total',coalesce(sum(diferenca),0),
    'diferencas_positivas',coalesce(sum(diferenca) filter(where diferenca>0),0),
    'diferencas_negativas',coalesce(sum(diferenca) filter(where diferenca<0),0)) from caixas_aprovados_periodo)),
  'alertas',coalesce((select jsonb_agg(to_jsonb(a)) from alertas a),'[]'::jsonb),
  'alertas_total',(select count(*) from candidatos));
$$;

create function public.financeiro_dashboard_profissional(p_inicio timestamptz,p_fim timestamptz,
  p_clinica_id uuid default null,p_timezone text default 'America/Bahia')
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare v_ids uuid[]; v_prof uuid; v_result jsonb;
begin
  select e.clinicas,e.profissional_id into v_ids,v_prof from private.financeiro_dashboard_escopo(p_clinica_id,true) e;
  perform private.financeiro_dashboard_validar(p_inicio,p_fim,null,null,null,null,p_timezone);
  v_result:=private.financeiro_dashboard_nucleo(p_inicio,p_fim,v_ids,v_prof,null,null,null,null,null,p_timezone,true);
  return jsonb_build_object('versao',1,'inicio',p_inicio,'fim',p_fim,'timezone_series',p_timezone,
    'clinicas_autorizadas',v_ids,'consultado_em',now(),
    'escopos',jsonb_build_object('producao','coorte_registrado_em','estornos_periodo','efetivado_em',
      'repasses','gerados_e_pagos_por_timestamps_distintos_mais_estoque_atual','ajustes','estoque_atual_sem_recorte_temporal'),'resumo',v_result);
end;
$$;

-- DEFINER nas duas RPCs: medico nao possui SELECT de estornos; proprietaria
-- precisa enumeracao uniforme dos vinculos e helpers privados nao expostos.
-- Nenhuma lista de clinicas ou identidade medica e aceita do frontend.
create function public.financeiro_dashboard_proprietaria(p_inicio timestamptz,p_fim timestamptz,
  p_clinica_id uuid default null,p_profissional_id uuid default null,p_paciente_id uuid default null,
  p_forma_pagamento text default null,p_status_recebimento text default null,
  p_status_repasse text default null,p_status_fiscal text default null,p_timezone text default 'America/Bahia')
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare v_ids uuid[]; v_total jsonb; v_admin jsonb; v_c record; v_p record; v_item jsonb;
  v_clinicas jsonb:='[]'; v_profissionais jsonb:='[]'; v_alertas jsonb; v_nprof integer;
  v_pct numeric; v_nalertas bigint; v_prioridade text; v_ratio_alertas jsonb:='[]';
begin
  select e.clinicas into v_ids from private.financeiro_dashboard_escopo(p_clinica_id,false) e;
  perform private.financeiro_dashboard_validar(p_inicio,p_fim,p_forma_pagamento,p_status_recebimento,p_status_repasse,p_status_fiscal,p_timezone);
  v_total:=private.financeiro_dashboard_nucleo(p_inicio,p_fim,v_ids,p_profissional_id,p_paciente_id,
    p_forma_pagamento,p_status_recebimento,p_status_repasse,p_status_fiscal,p_timezone,true)-'lista_repasses'-'lista_repasses_total'-'lista_repasses_limite';
  v_admin:=private.financeiro_dashboard_administrativo(p_inicio,p_fim,v_ids,p_profissional_id,p_paciente_id,
    p_forma_pagamento,p_status_recebimento,p_status_repasse,p_status_fiscal);
  -- Percorre todas as clinicas para avaliar ratios, mas limita o breakdown.
  for v_c in select c.id,c.nome,a.estornos_percentual_atencao,a.estornos_percentual_critico
    from public.clinicas c left join public.configuracoes_alertas_financeiros a on a.clinica_id=c.id
    where c.id=any(v_ids) order by c.nome,c.id loop
    v_item:=private.financeiro_dashboard_nucleo(p_inicio,p_fim,array[v_c.id],p_profissional_id,p_paciente_id,
      p_forma_pagamento,p_status_recebimento,p_status_repasse,p_status_fiscal,p_timezone,false)-'series'-'lista_repasses'-'lista_repasses_total'-'lista_repasses_limite';
    v_pct:=100*(v_item#>>'{producao,estornos_coorte}')::numeric/nullif((v_item#>>'{producao,bruto}')::numeric,0);
    v_prioridade:=case when v_pct>=v_c.estornos_percentual_critico then 'critico'
      when v_pct>=v_c.estornos_percentual_atencao then 'atencao' end;
    if v_prioridade is not null then
      v_ratio_alertas:=v_ratio_alertas||jsonb_build_array(jsonb_build_object('clinica_id',v_c.id,'tipo','percentual_estornos',
        'prioridade',v_prioridade,'entidade','clinicas','entidade_id',v_c.id,'data',p_fim,
        'mensagem',jsonb_build_object('codigo','estornos_coorte','percentual',v_pct,'inicio',p_inicio,'fim',p_fim)));
    end if;
    if jsonb_array_length(v_clinicas)<100 then
      v_item:=v_item||(private.financeiro_dashboard_administrativo(p_inicio,p_fim,array[v_c.id],p_profissional_id,p_paciente_id,
        p_forma_pagamento,p_status_recebimento,p_status_repasse,p_status_fiscal)-'alertas'-'alertas_total');
      v_clinicas:=v_clinicas||jsonb_build_array(jsonb_build_object('clinica_id',v_c.id,'nome',v_c.nome,'resumo',v_item));
    end if;
  end loop;
  v_nprof:=0;
  for v_p in select p.id,p.nome_completo from public.profissionais p where
    (p_profissional_id is null or p.id=p_profissional_id) and (
      exists(select 1 from public.recebimentos r where r.profissional_id=p.id and r.clinica_id=any(v_ids)
        and ((r.registrado_em>=p_inicio and r.registrado_em<p_fim) or exists(select 1 from public.estornos e
          where e.recebimento_id=r.id and e.status='efetivado' and e.efetivado_em>=p_inicio and e.efetivado_em<p_fim)))
      or exists(select 1 from public.repasses r where r.profissional_id=p.id and r.clinica_id=any(v_ids) and r.gerado_em>=p_inicio and r.gerado_em<p_fim)
      or exists(select 1 from public.ajustes_repasse a where a.profissional_id=p.id and a.clinica_id=any(v_ids) and a.status in ('pendente','parcialmente_aplicado')))
    order by p.nome_completo,p.id loop
    v_nprof:=v_nprof+1;
    if v_nprof<=100 then
      v_item:=private.financeiro_dashboard_nucleo(p_inicio,p_fim,v_ids,v_p.id,p_paciente_id,
        p_forma_pagamento,p_status_recebimento,p_status_repasse,p_status_fiscal,p_timezone,false)-'series'-'lista_repasses'-'lista_repasses_total'-'lista_repasses_limite';
      v_profissionais:=v_profissionais||jsonb_build_array(jsonb_build_object('profissional_id',v_p.id,'nome',v_p.nome_completo,'resumo',v_item));
    end if;
  end loop;
  v_nalertas:=(v_admin->>'alertas_total')::bigint+jsonb_array_length(v_ratio_alertas);
  select coalesce(jsonb_agg(t.a order by t.ord,t.data desc,t.a->>'entidade_id',t.a->>'tipo'),'[]'::jsonb) into v_alertas
  from (select a,case a->>'prioridade' when 'critico' then 0 when 'atencao' then 1 else 2 end ord,
    (a->>'data')::timestamptz data from jsonb_array_elements((v_admin->'alertas')||v_ratio_alertas) a
    order by ord,data desc nulls last,a->>'entidade_id',a->>'tipo' limit 100) t;
  return jsonb_build_object('versao',1,'inicio',p_inicio,'fim',p_fim,'timezone_series',p_timezone,'consultado_em',now(),
    'clinicas_autorizadas',v_ids,
    'escopos',jsonb_build_object('producao','coorte_registrado_em_todos_filtros',
      'estornos_periodo','efetivado_em_filtros_do_recebimento','fiscal','estado_atual_da_coorte',
      'repasses','gerados_por_gerado_em_e_pagos_por_confirmado_em_estoques_atuais_sem_data',
      'ajustes','estoque_atual_clinica_profissional','caixa','situacao_atual_e_aprovados_por_fechado_em'),
    'resumo',v_total||(v_admin-'alertas'-'alertas_total'),
    'por_clinica',v_clinicas,'clinicas_total',cardinality(v_ids),'por_profissional',v_profissionais,'profissionais_total',v_nprof,
    'breakdown_limite',100,'alertas',v_alertas,'alertas_total',v_nalertas,'alertas_limite',100);
end;
$$;

revoke all on function private.financeiro_dashboard_validar(timestamptz,timestamptz,text,text,text,text,text),
  private.financeiro_dashboard_nucleo(timestamptz,timestamptz,uuid[],uuid,uuid,text,text,text,text,text,boolean),
  private.financeiro_dashboard_administrativo(timestamptz,timestamptz,uuid[],uuid,uuid,text,text,text,text)
from public,anon,authenticated;
revoke all on function public.financeiro_configurar_alertas(uuid,jsonb),
  public.financeiro_dashboard_profissional(timestamptz,timestamptz,uuid,text),
  public.financeiro_dashboard_proprietaria(timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.financeiro_configurar_alertas(uuid,jsonb),
  public.financeiro_dashboard_profissional(timestamptz,timestamptz,uuid,text),
  public.financeiro_dashboard_proprietaria(timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,text)
to authenticated;

-- Nenhum indice adicional nesta entrega: reutiliza clinica/data de recebimentos,
-- recebimento/status de estornos, clinica/status/data de repasses, indice parcial
-- de ajustes pendentes e sessao/tentativa de fechamentos. EXPLAIN pendente.
commit;
