-- FASE 10: cenário integrado final. Fixtures exclusivamente transacionais.
begin;
set local statement_timeout = '120s';

create temporary table f10_ids(nome text primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into f10_ids(nome) select unnest(array[
  'owner','recepcao','medico','outra','ca','cb','prof','pac','agendamento','sessao',
  'recebimento','documento','estorno','fechamento','repasse'
]);
create function pg_temp.f10_id(p_nome text) returns uuid language sql stable as
  'select id from pg_temp.f10_ids where nome=p_nome';
create function pg_temp.f10_assert(p_ok boolean,p_msg text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FASE10-INTEGRADO: %',p_msg; end if;
end;
$$;
create function pg_temp.f10_login(p_nome text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',pg_temp.f10_id(p_nome)::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.f10_id(p_nome),'role','authenticated')::text,true);
end;
$$;
create function pg_temp.f10_erro(p_sql text,p_code text) returns void language plpgsql as $$
declare v_code text;
begin
  begin execute p_sql;
  exception when others then get stacked diagnostics v_code=returned_sqlstate; end;
  if v_code is distinct from p_code then
    raise exception 'FASE10-INTEGRADO: esperado %, encontrado % em %',p_code,v_code,p_sql;
  end if;
end;
$$;
grant select,update on f10_ids to authenticated;

insert into auth.users(id) select id from f10_ids where nome in ('owner','recepcao','medico','outra');
insert into public.usuarios(id,nome_completo) select id,'F10 FINAL '||nome from f10_ids
  where nome in ('owner','recepcao','medico','outra');
insert into public.clinicas(id,nome,cidade,subdomain) select id,'F10 FINAL '||nome,'SINTETICA','f10-final-'||id::text
  from f10_ids where nome in ('ca','cb');
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo)
select pg_temp.f10_id(x.u),pg_temp.f10_id(x.c),x.p::public.papel_usuario,true
from (values ('owner','ca','proprietaria'),('recepcao','ca','recepcao'),('medico','ca','medico'),('outra','cb','recepcao')) x(u,c,p);
insert into public.profissionais(id,nome_completo,usuario_id,valor_consulta,taxa_repasse_clinica)
values(pg_temp.f10_id('prof'),'F10 FINAL PROFISSIONAL',pg_temp.f10_id('medico'),500,20);
insert into public.profissionais_clinicas(profissional_id,clinica_id,valor_consulta)
values(pg_temp.f10_id('prof'),pg_temp.f10_id('ca'),500);
insert into public.pacientes(id,clinica_id,nome_completo)
values(pg_temp.f10_id('pac'),pg_temp.f10_id('ca'),'F10 FINAL PACIENTE');
insert into public.configuracoes_financeiras_clinica(clinica_id,percentual_clinica,vigente_desde)
values(pg_temp.f10_id('ca'),20,now()-interval '1 day');
insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,created_by)
values(pg_temp.f10_id('agendamento'),pg_temp.f10_id('ca'),pg_temp.f10_id('pac'),pg_temp.f10_id('prof'),
  current_date,'08:00','08:30','confirmado',pg_temp.f10_id('owner'));

-- Agenda -> recebimento split -> fiscal interno -> estorno.
set local role authenticated;
select pg_temp.f10_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_abrir_caixa(pg_temp.f10_id('ca'),100,'f10-final-open');
  update pg_temp.f10_ids set id=(r->>'sessao_caixa_id')::uuid where nome='sessao';
  r:=public.financeiro_registrar_recebimento(pg_temp.f10_id('agendamento'),
    '[{"forma_pagamento":"dinheiro","valor":200},{"forma_pagamento":"pix","valor":200},{"forma_pagamento":"cartao_credito","valor":100}]',
    'f10-final-recebimento');
  update pg_temp.f10_ids set id=(r->>'recebimento_id')::uuid where nome='recebimento';
  perform pg_temp.f10_assert(r->>'nova_operacao'='true','recebimento criado pela Agenda');
  r:=public.financeiro_registrar_recebimento(pg_temp.f10_id('agendamento'),
    '[{"forma_pagamento":"dinheiro","valor":200},{"forma_pagamento":"pix","valor":200},{"forma_pagamento":"cartao_credito","valor":100}]',
    'f10-final-recebimento');
  perform pg_temp.f10_assert(r->>'nova_operacao'='false','recebimento idempotente');
end;
$$;
reset role;
update pg_temp.f10_ids set id=(select id from public.documentos_fiscais where recebimento_id=pg_temp.f10_id('recebimento')) where nome='documento';

set local role authenticated;
select pg_temp.f10_login('recepcao');
select pg_temp.f10_assert(public.financeiro_solicitar_emissao_fiscal(pg_temp.f10_id('documento'),'f10-final-fiscal')->>'nova_operacao'='true','solicitacao fiscal interna');
select pg_temp.f10_erro($s$select public.financeiro_solicitar_emissao_fiscal(pg_temp.f10_id('documento'),'f10-final-fiscal-2')$s$,'22023');
do $$
declare r jsonb;
begin
  r:=public.financeiro_solicitar_estorno(pg_temp.f10_id('recebimento'),
    '[{"forma_pagamento":"dinheiro","valor":50}]','Estorno integrado final','f10-final-estorno');
  update pg_temp.f10_ids set id=(r->>'estorno_id')::uuid where nome='estorno';
end;
$$;
select pg_temp.f10_login('owner');
select pg_temp.f10_erro($s$select public.financeiro_solicitar_estorno(pg_temp.f10_id('recebimento'),'[{"forma_pagamento":"pix","valor":10}]','Separacao de funcoes','f10-final-owner-estorno')$s$,'42501');
select pg_temp.f10_assert(public.financeiro_revisar_estorno(pg_temp.f10_id('estorno'),'aprovar',null)->>'status'='efetivado','proprietaria efetiva estorno');
reset role;

select pg_temp.f10_assert((select agendamento_id=pg_temp.f10_id('agendamento') and valor_bruto=500 and status='parcialmente_estornado'
  from public.recebimentos where id=pg_temp.f10_id('recebimento')),'recebimento preserva Agenda e snapshot');
select pg_temp.f10_assert((select count(*)=3 and sum(valor)=500 from public.recebimentos_pagamentos where recebimento_id=pg_temp.f10_id('recebimento')),'split integral preservado');
select pg_temp.f10_assert((select status='emissao_solicitada' from public.documentos_fiscais where id=pg_temp.f10_id('documento')),'fiscal nao alega emissao externa');

-- Fechamento -> repasse -> confirmação externa.
set local role authenticated;
select pg_temp.f10_login('recepcao');
select pg_temp.f10_assert((public.financeiro_resumo_caixa(pg_temp.f10_id('sessao'))#>>'{resumo,valor_esperado}')::numeric=250,'caixa oficial considera estorno em dinheiro');
select public.financeiro_iniciar_fechamento(pg_temp.f10_id('sessao'));
do $$
declare r jsonb;
begin
  r:=public.financeiro_enviar_fechamento(pg_temp.f10_id('sessao'),250,null,'f10-final-fechamento');
  update pg_temp.f10_ids set id=(r->>'fechamento_id')::uuid where nome='fechamento';
end;
$$;
select pg_temp.f10_erro($s$select public.financeiro_revisar_fechamento(pg_temp.f10_id('fechamento'),'aprovar',null)$s$,'42501');
select pg_temp.f10_login('owner');
select pg_temp.f10_assert(public.financeiro_revisar_fechamento(pg_temp.f10_id('fechamento'),'aprovar',null)->>'status'='aprovado','fechamento aprovado');
reset role;
update pg_temp.f10_ids set id=(select id from public.repasses where fechamento_id=pg_temp.f10_id('fechamento')) where nome='repasse';
select pg_temp.f10_assert((select status='pendente' and valor_bruto_profissional=400 and valor_estornos_antes_pagamento=40 and valor_liquido=360
  from public.repasses where id=pg_temp.f10_id('repasse')),'repasse usa snapshots e estorno');

set local role authenticated;
select pg_temp.f10_login('recepcao');
select pg_temp.f10_erro($s$select public.financeiro_confirmar_repasse(pg_temp.f10_id('repasse'),'pix','F10-EXT',null,'f10-final-repasse')$s$,'42501');
select pg_temp.f10_login('owner');
select pg_temp.f10_assert(public.financeiro_confirmar_repasse(pg_temp.f10_id('repasse'),'pix','F10-EXT',null,'f10-final-repasse')->>'nova_operacao'='true','repasse externo confirmado');
select pg_temp.f10_assert(public.financeiro_confirmar_repasse(pg_temp.f10_id('repasse'),'pix','F10-EXT',null,'f10-final-repasse')->>'nova_operacao'='false','repasse idempotente');

-- Dashboard e relatórios oficiais da proprietária.
select pg_temp.f10_assert((public.financeiro_dashboard_proprietaria(now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'))#>>'{resumo,producao,bruto}')::numeric=500,'dashboard bruto');
select pg_temp.f10_assert((public.financeiro_dashboard_proprietaria(now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'))#>>'{resumo,producao,liquido_atual_coorte}')::numeric=450,'dashboard liquido');
select pg_temp.f10_assert((public.financeiro_relatorio_recebimentos_proprietaria(now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'))#>>'{totais,liquido_atual}')::numeric=450,'relatorio recebimentos reconciliavel');
select pg_temp.f10_assert((public.financeiro_relatorio_repasses_proprietaria(now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'),p_evento=>'pagos_periodo')#>>'{totais,valor_liquido}')::numeric=360,'relatorio repasse pago');
select pg_temp.f10_assert((public.financeiro_relatorio_fiscal_proprietaria(now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'))#>>'{totais,por_status,emissao_solicitada}')::integer=1,'relatorio fiscal interno');
select pg_temp.f10_assert(public.financeiro_registrar_solicitacao_exportacao('proprietaria','financeiro_consolidado','pdf',
  now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'),'{}'::jsonb)->>'solicitacao_id' is not null,'auditoria da solicitacao');

-- Médico vê somente o próprio universo; clínica alheia, anon e estados inválidos são negados.
select pg_temp.f10_login('medico');
select pg_temp.f10_assert((public.financeiro_dashboard_profissional(now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'))#>>'{resumo,producao,liquido_atual_coorte}')::numeric=450,'medico ve proprio liquido');
select pg_temp.f10_assert((public.financeiro_relatorio_recebimentos_profissional(now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'))#>>'{totais,quantidade}')::integer=1,'medico ve proprio recebimento');
select pg_temp.f10_assert((public.financeiro_relatorio_repasses_profissional(now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'),p_evento=>'pagos_periodo')#>>'{totais,valor_liquido}')::numeric=360,'medico ve proprio repasse');
select pg_temp.f10_login('outra');
select pg_temp.f10_erro($s$select public.financeiro_dashboard_proprietaria(now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'))$s$,'42501');
select pg_temp.f10_erro($s$select public.financeiro_relatorio_recebimentos_proprietaria(now()-interval '1 day',now()+interval '1 day',pg_temp.f10_id('ca'))$s$,'42501');
reset role;
set local role anon;
select pg_temp.f10_assert(not has_function_privilege('anon','public.financeiro_registrar_recebimento(uuid,jsonb,text)','EXECUTE'),'anon sem recebimento');
select pg_temp.f10_assert(not has_function_privilege('anon','public.financeiro_dashboard_proprietaria(timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,text)','EXECUTE'),'anon sem dashboard');
reset role;

select pg_temp.f10_assert((select count(*)=0 from public.repasses where valor_liquido<0),'nenhum repasse negativo');
select pg_temp.f10_assert((select count(*)=1 from public.movimentos_caixa where recebimento_id=pg_temp.f10_id('recebimento') and tipo='recebimento'),'movimento principal unico');
select pg_temp.f10_assert((select count(*)=1 from public.movimentos_caixa where estorno_id=pg_temp.f10_id('estorno')),'movimento de estorno unico');
set constraints all immediate;
rollback;
