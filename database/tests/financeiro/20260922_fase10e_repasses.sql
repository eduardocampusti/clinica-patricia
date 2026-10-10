-- FASE 10E: geracao, confirmacao e ajustes de repasses; fixtures somente transacionais.
begin;
set local statement_timeout = '120s';

create temporary table f10e_ids(nome text primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into f10e_ids(nome) select unnest(array[
  'owner','recepcao','medico','outra','ca','cb','prof','pac','ag1','ag2','ag3',
  'sessao1','sessao2','sessao3','recebimento1','recebimento2','recebimento3',
  'fechamento1','fechamento2','fechamento3','repasse1','repasse2','repasse3','estorno1','estorno2','estorno3'
]);
create function pg_temp.f10e_id(p_nome text) returns uuid language sql stable as
  'select id from pg_temp.f10e_ids where nome=p_nome';
create function pg_temp.f10e_assert(p_ok boolean,p_msg text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FASE10E: %',p_msg; end if;
end;
$$;
create function pg_temp.f10e_login(p_nome text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',pg_temp.f10e_id(p_nome)::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.f10e_id(p_nome),'role','authenticated')::text,true);
end;
$$;
create function pg_temp.f10e_erro(p_sql text,p_code text) returns void language plpgsql as $$
declare v_code text;
begin
  begin execute p_sql;
  exception when others then get stacked diagnostics v_code=returned_sqlstate; end;
  if v_code is distinct from p_code then raise exception 'FASE10E: esperado %, encontrado %',p_code,v_code; end if;
end;
$$;
grant select,update on f10e_ids to authenticated;

insert into auth.users(id) select id from f10e_ids where nome in ('owner','recepcao','medico','outra');
insert into public.usuarios(id,nome_completo) select id,'FASE10E '||nome from f10e_ids
  where nome in ('owner','recepcao','medico','outra');
insert into public.clinicas(id,nome,cidade,subdomain) select id,'FASE10E '||nome,'SINTETICA','f10e-'||id::text
  from f10e_ids where nome in ('ca','cb');
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo)
select pg_temp.f10e_id(x.u),pg_temp.f10e_id(x.c),x.p::public.papel_usuario,true
from (values ('owner','ca','proprietaria'),('recepcao','ca','recepcao'),('medico','ca','medico'),('outra','cb','recepcao')) x(u,c,p);
insert into public.profissionais(id,nome_completo,usuario_id,valor_consulta,taxa_repasse_clinica)
values(pg_temp.f10e_id('prof'),'FASE10E PROFISSIONAL',pg_temp.f10e_id('medico'),500,20);
insert into public.profissionais_clinicas(profissional_id,clinica_id,valor_consulta)
values(pg_temp.f10e_id('prof'),pg_temp.f10e_id('ca'),500);
insert into public.pacientes(id,clinica_id,nome_completo)
values(pg_temp.f10e_id('pac'),pg_temp.f10e_id('ca'),'FASE10E PACIENTE');
insert into public.configuracoes_financeiras_clinica(clinica_id,percentual_clinica,vigente_desde)
values(pg_temp.f10e_id('ca'),20,now()-interval '1 day');
insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,created_by)
values(pg_temp.f10e_id('ag1'),pg_temp.f10e_id('ca'),pg_temp.f10e_id('pac'),pg_temp.f10e_id('prof'),current_date,'08:00','08:30','confirmado',pg_temp.f10e_id('owner')),
  (pg_temp.f10e_id('ag2'),pg_temp.f10e_id('ca'),pg_temp.f10e_id('pac'),pg_temp.f10e_id('prof'),current_date,'09:00','09:30','confirmado',pg_temp.f10e_id('owner')),
  (pg_temp.f10e_id('ag3'),pg_temp.f10e_id('ca'),pg_temp.f10e_id('pac'),pg_temp.f10e_id('prof'),current_date,'10:00','10:30','confirmado',pg_temp.f10e_id('owner'));

set local role authenticated;
select pg_temp.f10e_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_abrir_caixa(pg_temp.f10e_id('ca'),100,'f10e-open-1');
  update pg_temp.f10e_ids set id=(r->>'sessao_caixa_id')::uuid where nome='sessao1';
  r:=public.financeiro_registrar_recebimento(pg_temp.f10e_id('ag1'),
    '[{"forma_pagamento":"dinheiro","valor":500}]','f10e-rec-1');
  update pg_temp.f10e_ids set id=(r->>'recebimento_id')::uuid where nome='recebimento1';
  perform public.financeiro_iniciar_fechamento(pg_temp.f10e_id('sessao1'));
  r:=public.financeiro_enviar_fechamento(pg_temp.f10e_id('sessao1'),600,null,'f10e-close-1');
  update pg_temp.f10e_ids set id=(r->>'fechamento_id')::uuid where nome='fechamento1';
end;
$$;
select pg_temp.f10e_login('owner');
select pg_temp.f10e_assert(public.financeiro_revisar_fechamento(pg_temp.f10e_id('fechamento1'),'aprovar',null)->>'status'='aprovado','geracao atomica apos fechamento');
reset role;
update pg_temp.f10e_ids set id=(select id from public.repasses where fechamento_id=pg_temp.f10e_id('fechamento1')) where nome='repasse1';
select pg_temp.f10e_assert((select status='pendente' and valor_bruto_profissional=400 and valor_liquido=400 from public.repasses where id=pg_temp.f10e_id('repasse1')),'repasse gerado bruto 400');
select pg_temp.f10e_assert((select count(*)=1 from public.repasses_itens where repasse_id=pg_temp.f10e_id('repasse1')),'item gerado uma vez');
create temporary table f10e_movimentos_antes on commit drop as select count(*) quantidade from public.movimentos_caixa;
set local role authenticated;
select pg_temp.f10e_login('medico');
select pg_temp.f10e_assert((select count(*)=1 from public.repasses),'medico ve somente proprio repasse');
select pg_temp.f10e_assert((select valor_liquido=400 from public.repasses where id=pg_temp.f10e_id('repasse1')),'medico ve valor oficial');
select pg_temp.f10e_erro('select public.financeiro_confirmar_repasse(pg_temp.f10e_id(''repasse1''),''pix'',''EXT-1'',null,''f10e-pay-1'')','42501');
select pg_temp.f10e_login('recepcao');
select pg_temp.f10e_assert((select count(*)=0 from public.repasses),'recepcao nao ve repasses');
select pg_temp.f10e_erro('select public.financeiro_confirmar_repasse(pg_temp.f10e_id(''repasse1''),''pix'',''EXT-1'',null,''f10e-pay-1'')','42501');
select pg_temp.f10e_login('outra');
select pg_temp.f10e_assert((select count(*)=0 from public.repasses),'outra clinica nao ve repasse');
select pg_temp.f10e_erro('select public.financeiro_confirmar_repasse(pg_temp.f10e_id(''repasse1''),''pix'',''EXT-1'',null,''f10e-pay-1'')','42501');
select pg_temp.f10e_login('owner');
select pg_temp.f10e_assert(public.financeiro_confirmar_repasse(pg_temp.f10e_id('repasse1'),'pix','EXT-1',null,'f10e-pay-1')->>'nova_operacao'='true','proprietaria confirma pagamento externo');
select pg_temp.f10e_assert(public.financeiro_confirmar_repasse(pg_temp.f10e_id('repasse1'),'pix','EXT-1',null,'f10e-pay-1')->>'nova_operacao'='false','confirmacao idempotente');
select pg_temp.f10e_erro('select public.financeiro_confirmar_repasse(pg_temp.f10e_id(''repasse1''),''pix'',''EXT-2'',null,''f10e-pay-1'')','23505');
reset role;
select pg_temp.f10e_assert((select status='pago' and valor_liquido=400 from public.repasses where id=pg_temp.f10e_id('repasse1')),'repasse pago imutavel');
select pg_temp.f10e_assert((select count(*) from public.movimentos_caixa)=(select quantidade from pg_temp.f10e_movimentos_antes),'confirmacao sem movimento de caixa');

-- Estorno apos pagamento: ajuste negativo de 80; proxima geracao aplica sem pagar negativo.
set local role authenticated;
select pg_temp.f10e_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_abrir_caixa(pg_temp.f10e_id('ca'),100,'f10e-open-2');
  update pg_temp.f10e_ids set id=(r->>'sessao_caixa_id')::uuid where nome='sessao2';
  r:=public.financeiro_solicitar_estorno(pg_temp.f10e_id('recebimento1'),
    '[{"forma_pagamento":"dinheiro","valor":100}]','Pós-pagamento sintético','f10e-refund-1');
  update pg_temp.f10e_ids set id=(r->>'estorno_id')::uuid where nome='estorno1';
end;
$$;
select pg_temp.f10e_login('owner');
select pg_temp.f10e_assert(public.financeiro_revisar_estorno(pg_temp.f10e_id('estorno1'),'aprovar',null)->>'status'='efetivado','estorno pos pagamento');
reset role;
select pg_temp.f10e_assert((select count(*)=1 and min(valor)=-80 and min(valor_aplicado)=0 from public.ajustes_repasse where estorno_id=pg_temp.f10e_id('estorno1')),'ajuste negativo 80 pendente');
select pg_temp.f10e_assert((select status='pago' and valor_liquido=400 from public.repasses where id=pg_temp.f10e_id('repasse1')),'repasse pago nao reescrito');
set local role authenticated;
select pg_temp.f10e_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_registrar_recebimento(pg_temp.f10e_id('ag2'),
    '[{"forma_pagamento":"dinheiro","valor":500}]','f10e-rec-2');
  update pg_temp.f10e_ids set id=(r->>'recebimento_id')::uuid where nome='recebimento2';
  perform public.financeiro_iniciar_fechamento(pg_temp.f10e_id('sessao2'));
  r:=public.financeiro_enviar_fechamento(pg_temp.f10e_id('sessao2'),500,null,'f10e-close-2');
  update pg_temp.f10e_ids set id=(r->>'fechamento_id')::uuid where nome='fechamento2';
end;
$$;
select pg_temp.f10e_login('owner');
select pg_temp.f10e_assert(public.financeiro_revisar_fechamento(pg_temp.f10e_id('fechamento2'),'aprovar',null)->>'status'='aprovado','segundo fechamento');
reset role;
update pg_temp.f10e_ids set id=(select id from public.repasses where fechamento_id=pg_temp.f10e_id('fechamento2')) where nome='repasse2';
select pg_temp.f10e_assert((select status='pendente' and valor_bruto_profissional=400 and valor_ajustes_aplicados=80 and valor_liquido=320 from public.repasses where id=pg_temp.f10e_id('repasse2')),'ajuste antigo aplicado ao repasse futuro');

-- Estorno antes do pagamento reduz o mesmo item e preserva liquido nao negativo.
set local role authenticated;
select pg_temp.f10e_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_abrir_caixa(pg_temp.f10e_id('ca'),100,'f10e-open-3');
  update pg_temp.f10e_ids set id=(r->>'sessao_caixa_id')::uuid where nome='sessao3';
  r:=public.financeiro_solicitar_estorno(pg_temp.f10e_id('recebimento2'),
    '[{"forma_pagamento":"dinheiro","valor":100}]','Antes do pagamento','f10e-refund-2');
  update pg_temp.f10e_ids set id=(r->>'estorno_id')::uuid where nome='estorno2';
end;
$$;
select pg_temp.f10e_login('owner');
select pg_temp.f10e_assert(public.financeiro_revisar_estorno(pg_temp.f10e_id('estorno2'),'aprovar',null)->>'status'='efetivado','estorno antes pagamento');
reset role;
select pg_temp.f10e_assert((select status='pendente' and valor_estornos_antes_pagamento=80 and valor_ajustes_aplicados=80 and valor_liquido=240 from public.repasses where id=pg_temp.f10e_id('repasse2')),'credito liquido 240');
select pg_temp.f10e_assert((select valor_estornos_antes_pagamento=80 and valor_liquido=320 from public.repasses_itens where repasse_id=pg_temp.f10e_id('repasse2')),'item acompanha estorno');

-- Mais um estorno pos-pagamento consome 240 do segundo repasse e carrega 80.
set local role authenticated;
select pg_temp.f10e_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_registrar_recebimento(pg_temp.f10e_id('ag3'),
    '[{"forma_pagamento":"dinheiro","valor":500}]','f10e-rec-3');
  update pg_temp.f10e_ids set id=(r->>'recebimento_id')::uuid where nome='recebimento3';
  r:=public.financeiro_solicitar_estorno(pg_temp.f10e_id('recebimento1'),
    '[{"forma_pagamento":"dinheiro","valor":400}]','Ajuste maior','f10e-refund-3');
  update pg_temp.f10e_ids set id=(r->>'estorno_id')::uuid where nome='estorno3';
end;
$$;
select pg_temp.f10e_login('owner');
select pg_temp.f10e_assert(public.financeiro_revisar_estorno(pg_temp.f10e_id('estorno3'),'aprovar',null)->>'status'='efetivado','novo ajuste negativo');
reset role;
select pg_temp.f10e_assert((select status='ajustado' and valor_liquido=0 and valor_ajustes_aplicados=320 from public.repasses where id=pg_temp.f10e_id('repasse2')),'repasse nunca negativo');
select pg_temp.f10e_assert((select valor=-320 and valor_aplicado=240 from public.ajustes_repasse where estorno_id=pg_temp.f10e_id('estorno3')),'saldo negativo 80 carregado');
set local role authenticated;
select pg_temp.f10e_login('owner');
select pg_temp.f10e_erro('select public.financeiro_confirmar_repasse(pg_temp.f10e_id(''repasse2''),''pix'',''NAO-PAGAR'',null,''f10e-no-pay'')','22023');
select pg_temp.f10e_login('recepcao');
do $$
declare r jsonb;
begin
  perform public.financeiro_iniciar_fechamento(pg_temp.f10e_id('sessao3'));
  r:=public.financeiro_enviar_fechamento(pg_temp.f10e_id('sessao3'),100,null,'f10e-close-3');
  update pg_temp.f10e_ids set id=(r->>'fechamento_id')::uuid where nome='fechamento3';
end;
$$;
select pg_temp.f10e_login('owner');
select pg_temp.f10e_assert(public.financeiro_revisar_fechamento(pg_temp.f10e_id('fechamento3'),'aprovar',null)->>'status'='aprovado','terceiro fechamento');
reset role;
update pg_temp.f10e_ids set id=(select id from public.repasses where fechamento_id=pg_temp.f10e_id('fechamento3')) where nome='repasse3';
select pg_temp.f10e_assert((select status='pendente' and valor_bruto_profissional=400 and valor_ajustes_aplicados=80 and valor_liquido=320 from public.repasses where id=pg_temp.f10e_id('repasse3')),'saldo de ajuste aplicado ao proximo');
select pg_temp.f10e_assert((select status='aplicado' and valor_aplicado=320 from public.ajustes_repasse where estorno_id=pg_temp.f10e_id('estorno3')),'ajuste integralmente carregado');
select pg_temp.f10e_assert((select count(*)=3 from public.repasses where clinica_id=pg_temp.f10e_id('ca')),'tres repasses sem duplicacao');
select pg_temp.f10e_assert((select count(*)=0 from public.repasses where valor_liquido<0),'nenhum pagamento negativo');
set constraints all immediate;
rollback;
