-- FASE 10D: homologacao de estornos. Executar integralmente; nada persiste.
begin;
set local statement_timeout = '120s';

create temporary table f10d_ids(nome text primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into f10d_ids(nome) select unnest(array[
  'owner','recepcao','medico','outra','ca','cb','prof','pac','ag','ag2',
  'sessao','recebimento','recebimento2','estorno1','estorno2','estorno3','estorno_pendente','legado'
]);
create function pg_temp.f10d_id(p_nome text) returns uuid language sql stable as
  'select id from pg_temp.f10d_ids where nome=p_nome';
create function pg_temp.f10d_assert(p_ok boolean,p_msg text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FASE10D: %',p_msg; end if;
end;
$$;
create function pg_temp.f10d_login(p_nome text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',pg_temp.f10d_id(p_nome)::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.f10d_id(p_nome),'role','authenticated')::text,true);
end;
$$;
create function pg_temp.f10d_erro(p_sql text,p_code text) returns void language plpgsql as $$
declare v_code text;
begin
  begin execute p_sql;
  exception when others then get stacked diagnostics v_code=returned_sqlstate; end;
  if v_code is distinct from p_code then raise exception 'FASE10D: esperado %, encontrado %',p_code,v_code; end if;
end;
$$;
grant select,update on f10d_ids to authenticated;

insert into auth.users(id) select id from f10d_ids where nome in ('owner','recepcao','medico','outra');
insert into public.usuarios(id,nome_completo) select id,'FASE10D '||nome from f10d_ids
  where nome in ('owner','recepcao','medico','outra');
insert into public.clinicas(id,nome,cidade,subdomain) select id,'FASE10D '||nome,'SINTETICA','f10d-'||id::text
  from f10d_ids where nome in ('ca','cb');
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo)
select pg_temp.f10d_id(x.u),pg_temp.f10d_id(x.c),x.p::public.papel_usuario,true
from (values ('owner','ca','proprietaria'),('recepcao','ca','recepcao'),('medico','ca','medico'),('outra','cb','recepcao')) x(u,c,p);
insert into public.profissionais(id,nome_completo,usuario_id,valor_consulta,taxa_repasse_clinica)
values(pg_temp.f10d_id('prof'),'FASE10D PROFISSIONAL',pg_temp.f10d_id('medico'),500,20);
insert into public.profissionais_clinicas(profissional_id,clinica_id,valor_consulta)
values(pg_temp.f10d_id('prof'),pg_temp.f10d_id('ca'),500);
insert into public.pacientes(id,clinica_id,nome_completo)
values(pg_temp.f10d_id('pac'),pg_temp.f10d_id('ca'),'FASE10D PACIENTE');
insert into public.configuracoes_financeiras_clinica(clinica_id,percentual_clinica,vigente_desde)
values(pg_temp.f10d_id('ca'),20,now()-interval '1 day');
insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,created_by)
values(pg_temp.f10d_id('ag'),pg_temp.f10d_id('ca'),pg_temp.f10d_id('pac'),pg_temp.f10d_id('prof'),current_date,'08:00','08:30','confirmado',pg_temp.f10d_id('owner')),
  (pg_temp.f10d_id('ag2'),pg_temp.f10d_id('ca'),pg_temp.f10d_id('pac'),pg_temp.f10d_id('prof'),current_date,'09:00','09:30','confirmado',pg_temp.f10d_id('owner'));

set local role authenticated;
select pg_temp.f10d_login('medico');
select pg_temp.f10d_erro('select public.financeiro_solicitar_estorno(gen_random_uuid(),''[{"forma_pagamento":"dinheiro","valor":1}]'',''teste'',''f10d-med'')','P0002');
select pg_temp.f10d_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_abrir_caixa(pg_temp.f10d_id('ca'),100,'f10d-abertura');
  update pg_temp.f10d_ids set id=(r->>'sessao_caixa_id')::uuid where nome='sessao';
  r:=public.financeiro_registrar_recebimento(pg_temp.f10d_id('ag'),
    '[{"forma_pagamento":"dinheiro","valor":200},{"forma_pagamento":"pix","valor":200},{"forma_pagamento":"cartao_credito","valor":100}]','f10d-recebimento');
  update pg_temp.f10d_ids set id=(r->>'recebimento_id')::uuid where nome='recebimento';
  r:=public.financeiro_registrar_recebimento(pg_temp.f10d_id('ag2'),
    '[{"forma_pagamento":"dinheiro","valor":500}]','f10d-recebimento2');
  update pg_temp.f10d_ids set id=(r->>'recebimento_id')::uuid where nome='recebimento2';
  perform pg_temp.f10d_assert((select count(*)=3 from public.recebimentos_pagamentos where recebimento_id=pg_temp.f10d_id('recebimento')),'split original');
end;
$$;
select pg_temp.f10d_login('medico');
select pg_temp.f10d_erro('select public.financeiro_solicitar_estorno(pg_temp.f10d_id(''recebimento''),''[{"forma_pagamento":"dinheiro","valor":1}]'',''teste'',''f10d-med'')','42501');
select pg_temp.f10d_login('outra');
select pg_temp.f10d_erro('select public.financeiro_solicitar_estorno(pg_temp.f10d_id(''recebimento''),''[{"forma_pagamento":"dinheiro","valor":1}]'',''teste'',''f10d-outra'')','42501');
select pg_temp.f10d_login('owner');
select pg_temp.f10d_erro('select public.financeiro_solicitar_estorno(pg_temp.f10d_id(''recebimento''),''[{"forma_pagamento":"dinheiro","valor":1}]'',''teste'',''f10d-owner'')','42501');
select pg_temp.f10d_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_solicitar_estorno(pg_temp.f10d_id('recebimento'),
    '[{"forma_pagamento":"dinheiro","valor":50},{"forma_pagamento":"pix","valor":25}]','Parcial sintético','f10d-estorno1');
  update pg_temp.f10d_ids set id=(r->>'estorno_id')::uuid where nome='estorno1';
  perform pg_temp.f10d_assert(r @> '{"status":"solicitado","valor_total":75,"valor_clinica":15,"valor_profissional":60,"nova_operacao":true}','parcial banco calcula participacoes');
  perform pg_temp.f10d_assert(public.financeiro_solicitar_estorno(pg_temp.f10d_id('recebimento'),
    '[{"forma_pagamento":"pix","valor":25},{"forma_pagamento":"dinheiro","valor":50}]','Parcial sintético','f10d-estorno1')->>'nova_operacao'='false','solicitacao idempotente');
  perform pg_temp.f10d_erro('select public.financeiro_solicitar_estorno(pg_temp.f10d_id(''recebimento''),''[{"forma_pagamento":"dinheiro","valor":51},{"forma_pagamento":"pix","valor":25}]'',''Parcial sintético'',''f10d-estorno1'')','23505');
  perform pg_temp.f10d_erro('select public.financeiro_solicitar_estorno(pg_temp.f10d_id(''recebimento''),''[{"forma_pagamento":"dinheiro","valor":151}]'',''Excedente'',''f10d-excede'')','22023');
  perform pg_temp.f10d_erro('select public.financeiro_solicitar_estorno(pg_temp.f10d_id(''recebimento''),''[{"forma_pagamento":"cartao_credito","valor":101}]'',''Excedente cartão'',''f10d-excede-card'')','22023');
  perform pg_temp.f10d_erro('select public.financeiro_solicitar_estorno(pg_temp.f10d_id(''recebimento''),''[{"forma_pagamento":"boleto","valor":1}]'',''Forma inválida'',''f10d-forma'')','22023');
  perform pg_temp.f10d_erro('select public.financeiro_revisar_estorno(pg_temp.f10d_id(''estorno1''),''aprovar'',null)','42501');
end;
$$;
select pg_temp.f10d_login('medico');
select pg_temp.f10d_erro('select public.financeiro_revisar_estorno(pg_temp.f10d_id(''estorno1''),''aprovar'',null)','42501');
select pg_temp.f10d_login('outra');
select pg_temp.f10d_erro('select public.financeiro_revisar_estorno(pg_temp.f10d_id(''estorno1''),''aprovar'',null)','42501');
select pg_temp.f10d_login('owner');
select pg_temp.f10d_assert(public.financeiro_revisar_estorno(pg_temp.f10d_id('estorno1'),'aprovar','Aprovado')->>'status'='efetivado','proprietaria efetiva parcial');
select pg_temp.f10d_assert(public.financeiro_revisar_estorno(pg_temp.f10d_id('estorno1'),'aprovar','Aprovado')->>'nova_operacao'='false','revisao idempotente');
select pg_temp.f10d_erro('select public.financeiro_revisar_estorno(pg_temp.f10d_id(''estorno1''),''rejeitar'',null)','22023');
select pg_temp.f10d_assert((select status='parcialmente_estornado' from public.recebimentos where id=pg_temp.f10d_id('recebimento')),'recebimento parcial');
select pg_temp.f10d_assert((public.financeiro_resumo_caixa(pg_temp.f10d_id('sessao'))#>>'{resumo,total_estornos_dinheiro}')::numeric=50,'somente dinheiro diminui caixa');

select pg_temp.f10d_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_solicitar_estorno(pg_temp.f10d_id('recebimento'),
    '[{"forma_pagamento":"cartao_credito","valor":100}]','Cartão completo','f10d-estorno2');
  update pg_temp.f10d_ids set id=(r->>'estorno_id')::uuid where nome='estorno2';
  perform pg_temp.f10d_assert((r->>'valor_total')::numeric=100,'segundo estorno cartão');
end;
$$;
select pg_temp.f10d_login('owner');
select pg_temp.f10d_assert(public.financeiro_revisar_estorno(pg_temp.f10d_id('estorno2'),'aprovar',null)->>'status'='efetivado','cartao efetivado');
select pg_temp.f10d_assert((public.financeiro_resumo_caixa(pg_temp.f10d_id('sessao'))#>>'{resumo,total_estornos_dinheiro}')::numeric=50,'cartao nao diminui fisico');
select pg_temp.f10d_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_solicitar_estorno(pg_temp.f10d_id('recebimento'),
    '[{"forma_pagamento":"dinheiro","valor":150},{"forma_pagamento":"pix","valor":175}]','Saldo restante total','f10d-estorno3');
  update pg_temp.f10d_ids set id=(r->>'estorno_id')::uuid where nome='estorno3';
  perform pg_temp.f10d_assert(r @> '{"valor_total":325,"valor_clinica":65,"valor_profissional":260}','saldo e snapshots restantes');
  perform pg_temp.f10d_erro('select public.financeiro_solicitar_estorno(pg_temp.f10d_id(''recebimento''),''[{"forma_pagamento":"pix","valor":1}]'',''Excedente total'',''f10d-excede-total'')','22023');
end;
$$;
select pg_temp.f10d_login('owner');
select pg_temp.f10d_assert(public.financeiro_revisar_estorno(pg_temp.f10d_id('estorno3'),'aprovar',null)->>'recebimento_status'='estornado','total efetivado');
select pg_temp.f10d_assert((select status='estornado' and (select sum(valor_total) from public.estornos where recebimento_id=pg_temp.f10d_id('recebimento') and status='efetivado')=500 from public.recebimentos where id=pg_temp.f10d_id('recebimento')),'total exato sem duplicar');
select pg_temp.f10d_assert((public.financeiro_resumo_caixa(pg_temp.f10d_id('sessao'))#>>'{resumo,total_estornos_dinheiro}')::numeric=200,'estorno dinheiro total uma vez');

-- Rejeicao libera reserva; fechado e legado impedem efetivacao, sem corromper o original.
select pg_temp.f10d_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_solicitar_estorno(pg_temp.f10d_id('recebimento2'),
    '[{"forma_pagamento":"dinheiro","valor":30}]','Rejeitar sintético','f10d-rejeitar');
  update pg_temp.f10d_ids set id=(r->>'estorno_id')::uuid where nome='estorno_pendente';
end;
$$;
select pg_temp.f10d_login('owner');
select pg_temp.f10d_assert(public.financeiro_revisar_estorno(pg_temp.f10d_id('estorno_pendente'),'rejeitar','Motivo insuficiente')->>'status'='rejeitado','rejeicao');
select pg_temp.f10d_login('recepcao');
do $$
declare r jsonb;
begin
  r:=public.financeiro_solicitar_estorno(pg_temp.f10d_id('recebimento2'),
    '[{"forma_pagamento":"dinheiro","valor":500}]','Total após rejeição','f10d-fechado');
  update pg_temp.f10d_ids set id=(r->>'estorno_id')::uuid where nome='estorno_pendente';
  perform public.financeiro_iniciar_fechamento(pg_temp.f10d_id('sessao'));
end;
$$;
select pg_temp.f10d_login('owner');
select pg_temp.f10d_erro('select public.financeiro_revisar_estorno(pg_temp.f10d_id(''estorno_pendente''),''aprovar'',null)','22023');
reset role;
update public.sessoes_caixa set status='aprovado' where id=pg_temp.f10d_id('sessao');
insert into public.sessoes_caixa(id,clinica_id,aberto_por,valor_abertura,status,idempotency_key)
values(pg_temp.f10d_id('legado'),pg_temp.f10d_id('ca'),pg_temp.f10d_id('owner'),0,'aberto',null);
insert into public.entradas_caixa(sessao_caixa_id,clinica_id,forma_pagamento,valor,descricao,registrado_por,paciente_id,profissional_id)
values(pg_temp.f10d_id('legado'),pg_temp.f10d_id('ca'),'dinheiro',10,'FASE10D LEGADO SINTETICO',
  pg_temp.f10d_id('owner'),pg_temp.f10d_id('pac'),pg_temp.f10d_id('prof'));
set local role authenticated;
select pg_temp.f10d_login('owner');
select pg_temp.f10d_erro('select public.financeiro_revisar_estorno(pg_temp.f10d_id(''estorno_pendente''),''aprovar'',null)','22023');
reset role;
select pg_temp.f10d_assert((select status='confirmado' from public.recebimentos where id=pg_temp.f10d_id('recebimento2')),'negações não alteram recebimento');
set constraints all immediate;
rollback;
