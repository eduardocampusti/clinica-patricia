-- FASE 10G: fluxo fiscal interno. Provedor abaixo e somente simulador sintetico transacional.
-- Nenhuma emissao/cancelamento externo e executada. Todas as fixtures sao revertidas.
begin;
set local statement_timeout='120s';

create temporary table f10g_ids(nome text primary key,id uuid not null default gen_random_uuid()) on commit drop;
insert into f10g_ids(nome) select unnest(array['owner','recepcao','medico','outra','ca','cb','prof','pac','ag','sessao','recebimento','documento','tentativa1','tentativa2','tentativa3','tentativa4']);
create function pg_temp.f10g_id(p_nome text) returns uuid language sql stable as 'select id from pg_temp.f10g_ids where nome=p_nome';
create function pg_temp.f10g_assert(p_ok boolean,p_msg text) returns void language plpgsql as $$
begin if p_ok is distinct from true then raise exception 'FASE10G: %',p_msg; end if; end;
$$;
create function pg_temp.f10g_login(p_nome text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',pg_temp.f10g_id(p_nome)::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.f10g_id(p_nome),'role','authenticated')::text,true);
end;
$$;
create function pg_temp.f10g_erro(p_sql text,p_code text) returns void language plpgsql as $$
declare v_code text;
begin
  begin execute p_sql;
  exception when others then get stacked diagnostics v_code=returned_sqlstate; end;
  if v_code is distinct from p_code then raise exception 'FASE10G: esperado %, obtido %',p_code,v_code; end if;
end;
$$;
grant select,update on f10g_ids to authenticated;

insert into auth.users(id) select id from f10g_ids where nome in ('owner','recepcao','medico','outra');
insert into public.usuarios(id,nome_completo) select id,'FASE10G '||nome from f10g_ids where nome in ('owner','recepcao','medico','outra');
insert into public.clinicas(id,nome,cidade,subdomain) select id,'FASE10G '||nome,'SINTETICA','f10g-'||id::text from f10g_ids where nome in ('ca','cb');
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo)
select pg_temp.f10g_id(x.u),pg_temp.f10g_id(x.c),x.p::public.papel_usuario,true
from (values ('owner','ca','proprietaria'),('recepcao','ca','recepcao'),('medico','ca','medico'),('outra','cb','recepcao')) x(u,c,p);
insert into public.profissionais(id,nome_completo,usuario_id,valor_consulta,taxa_repasse_clinica)
values(pg_temp.f10g_id('prof'),'FASE10G PROFISSIONAL',pg_temp.f10g_id('medico'),500,20);
insert into public.profissionais_clinicas(profissional_id,clinica_id,valor_consulta)
values(pg_temp.f10g_id('prof'),pg_temp.f10g_id('ca'),500);
insert into public.pacientes(id,clinica_id,nome_completo)
values(pg_temp.f10g_id('pac'),pg_temp.f10g_id('ca'),'FASE10G PACIENTE');
insert into public.configuracoes_financeiras_clinica(clinica_id,percentual_clinica,vigente_desde)
values(pg_temp.f10g_id('ca'),20,now()-interval '1 day');
insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,created_by)
values(pg_temp.f10g_id('ag'),pg_temp.f10g_id('ca'),pg_temp.f10g_id('pac'),pg_temp.f10g_id('prof'),current_date,'08:00','08:30','confirmado',pg_temp.f10g_id('owner'));

set local role authenticated;
select pg_temp.f10g_login('recepcao');
do $$ declare r jsonb;
begin
  r:=public.financeiro_abrir_caixa(pg_temp.f10g_id('ca'),100,'f10g-open');
  update pg_temp.f10g_ids set id=(r->>'sessao_caixa_id')::uuid where nome='sessao';
  r:=public.financeiro_registrar_recebimento(pg_temp.f10g_id('ag'),'[{"forma_pagamento":"pix","valor":500}]','f10g-rec');
  update pg_temp.f10g_ids set id=(r->>'recebimento_id')::uuid where nome='recebimento';
end; $$;
reset role;
update pg_temp.f10g_ids set id=(select id from public.documentos_fiscais where recebimento_id=pg_temp.f10g_id('recebimento')) where nome='documento';
select pg_temp.f10g_assert((select status='pendente' from public.documentos_fiscais where id=pg_temp.f10g_id('documento')),'documento nasce pendente');
create temporary table f10g_estados(status text primary key) on commit drop;
insert into f10g_estados values('pendente');

set local role authenticated;
select pg_temp.f10g_login('medico');
select pg_temp.f10g_assert((select count(*)=0 from public.documentos_fiscais),'medico nao ve documentos');
select pg_temp.f10g_assert((select count(*)=0 from public.tentativas_documento_fiscal),'medico nao ve tentativas');
select pg_temp.f10g_erro('select public.financeiro_solicitar_emissao_fiscal(pg_temp.f10g_id(''documento''),''f10g-emit-1'')','42501');
select pg_temp.f10g_login('outra');
select pg_temp.f10g_assert((select count(*)=0 from public.documentos_fiscais),'outra clinica nao ve documentos');
select pg_temp.f10g_erro('select public.financeiro_solicitar_emissao_fiscal(pg_temp.f10g_id(''documento''),''f10g-emit-1'')','42501');
select pg_temp.f10g_login('recepcao');
select pg_temp.f10g_assert((select count(*)=1 from public.documentos_fiscais),'recepcao ve documento da propria clinica');
select pg_temp.f10g_assert(public.financeiro_solicitar_emissao_fiscal(pg_temp.f10g_id('documento'),'f10g-emit-1')->>'nova_operacao'='true','recepcao solicita emissao');
select pg_temp.f10g_assert(public.financeiro_solicitar_emissao_fiscal(pg_temp.f10g_id('documento'),'f10g-emit-1')->>'nova_operacao'='false','emissao idempotente');
select pg_temp.f10g_erro('select public.financeiro_solicitar_emissao_fiscal(pg_temp.f10g_id(''documento''),''f10g-emit-2'')','22023');
reset role;
update pg_temp.f10g_ids set id=(select id from public.tentativas_documento_fiscal where idempotency_key='f10g-emit-1') where nome='tentativa1';
select pg_temp.f10g_assert((select status='emissao_solicitada' from public.documentos_fiscais where id=pg_temp.f10g_id('documento')),'solicitacao nao e emissao externa');
insert into f10g_estados values('emissao_solicitada');
select pg_temp.f10g_assert((select count(*)=1 and min(status)='solicitada' from public.tentativas_documento_fiscal where documento_fiscal_id=pg_temp.f10g_id('documento')),'tentativa interna unica');
select pg_temp.f10g_assert(private.financeiro_registrar_resultado_emissao_fiscal(pg_temp.f10g_id('documento'),pg_temp.f10g_id('tentativa1'),false,null,null,null,null,null,null,null,'Falha sintetica', '{}'::jsonb,'{}'::jsonb)->>'nova_operacao'='true','falha sintetica de emissao');
select pg_temp.f10g_assert(private.financeiro_registrar_resultado_emissao_fiscal(pg_temp.f10g_id('documento'),pg_temp.f10g_id('tentativa1'),false,null,null,null,null,null,null,null,'Falha sintetica', '{}'::jsonb,'{}'::jsonb)->>'nova_operacao'='false','resultado de erro idempotente');
select pg_temp.f10g_erro('select private.financeiro_registrar_resultado_emissao_fiscal(pg_temp.f10g_id(''documento''),pg_temp.f10g_id(''tentativa1''),true,''f10g-simulador'')','40001');
select pg_temp.f10g_assert((select status='erro_emissao' from public.documentos_fiscais where id=pg_temp.f10g_id('documento')),'erro de emissao visivel');
insert into f10g_estados values('erro_emissao');

set local role authenticated;
select pg_temp.f10g_login('owner');
select pg_temp.f10g_assert(public.financeiro_solicitar_emissao_fiscal(pg_temp.f10g_id('documento'),'f10g-emit-2')->>'nova_operacao'='true','proprietaria repete apos erro');
reset role;
update pg_temp.f10g_ids set id=(select id from public.tentativas_documento_fiscal where idempotency_key='f10g-emit-2') where nome='tentativa2';
select pg_temp.f10g_assert(private.financeiro_registrar_resultado_emissao_fiscal(pg_temp.f10g_id('documento'),pg_temp.f10g_id('tentativa2'),true,'f10g-simulador','SYN-10G',null,null,null,null,null,null,'{}'::jsonb,'{}'::jsonb)->>'status'='emitida','sucesso simulado sem provedor real');
select pg_temp.f10g_assert((select status='emitida' from public.documentos_fiscais where id=pg_temp.f10g_id('documento')),'estado emitida apenas apos resultado interno simulado');
insert into f10g_estados values('emitida');

set local role authenticated;
select pg_temp.f10g_login('owner');
select pg_temp.f10g_erro('select public.financeiro_solicitar_cancelamento_fiscal(pg_temp.f10g_id(''documento''),'' '', ''f10g-cancel-1'')','22023');
select pg_temp.f10g_erro('select public.financeiro_solicitar_cancelamento_fiscal(pg_temp.f10g_id(''documento''),''Motivo'', ''f10g-emit-2'')','23505');
select pg_temp.f10g_assert(public.financeiro_solicitar_cancelamento_fiscal(pg_temp.f10g_id('documento'),'Motivo sintetico','f10g-cancel-1')->>'nova_operacao'='true','proprietaria solicita cancelamento');
select pg_temp.f10g_assert(public.financeiro_solicitar_cancelamento_fiscal(pg_temp.f10g_id('documento'),'Motivo sintetico','f10g-cancel-1')->>'nova_operacao'='false','cancelamento idempotente');
reset role;
update pg_temp.f10g_ids set id=(select id from public.tentativas_documento_fiscal where idempotency_key='f10g-cancel-1') where nome='tentativa3';
select pg_temp.f10g_assert((select status='cancelamento_solicitado' from public.documentos_fiscais where id=pg_temp.f10g_id('documento')),'solicitacao nao e cancelamento externo');
insert into f10g_estados values('cancelamento_solicitado');
select pg_temp.f10g_assert(private.financeiro_registrar_resultado_cancelamento_fiscal(pg_temp.f10g_id('documento'),pg_temp.f10g_id('tentativa3'),false,null,null,'Falha sintetica','{}'::jsonb,'{}'::jsonb)->>'status'='erro_cancelamento','erro sintetico cancelamento');
select pg_temp.f10g_assert((select status='erro_cancelamento' from public.documentos_fiscais where id=pg_temp.f10g_id('documento')),'erro cancelamento visivel');
insert into f10g_estados values('erro_cancelamento');

set local role authenticated;
select pg_temp.f10g_login('recepcao');
select pg_temp.f10g_assert(public.financeiro_solicitar_cancelamento_fiscal(pg_temp.f10g_id('documento'),'Nova tentativa sintetica','f10g-cancel-2')->>'nova_operacao'='true','recepcao repete cancelamento');
reset role;
update pg_temp.f10g_ids set id=(select id from public.tentativas_documento_fiscal where idempotency_key='f10g-cancel-2') where nome='tentativa4';
select pg_temp.f10g_assert(private.financeiro_registrar_resultado_cancelamento_fiscal(pg_temp.f10g_id('documento'),pg_temp.f10g_id('tentativa4'),true,'f10g-simulador',null,null,'{}'::jsonb,'{}'::jsonb)->>'status'='cancelada','cancelamento sintetico concluido');
select pg_temp.f10g_assert(private.financeiro_registrar_resultado_cancelamento_fiscal(pg_temp.f10g_id('documento'),pg_temp.f10g_id('tentativa4'),true,'f10g-simulador',null,null,'{}'::jsonb,'{}'::jsonb)->>'nova_operacao'='false','resultado cancelamento idempotente');
select pg_temp.f10g_assert((select status='cancelada' from public.documentos_fiscais where id=pg_temp.f10g_id('documento')),'estado final cancelada');
insert into f10g_estados values('cancelada');
select pg_temp.f10g_assert((select count(*)=7 from f10g_estados),'sete estados fiscais percorridos');
select pg_temp.f10g_assert((select count(*)=4 from public.tentativas_documento_fiscal where documento_fiscal_id=pg_temp.f10g_id('documento')),'quatro tentativas historicas');
set local role authenticated;
select pg_temp.f10g_login('owner');
select pg_temp.f10g_erro('select public.financeiro_solicitar_emissao_fiscal(pg_temp.f10g_id(''documento''),''f10g-late'')','22023');
select pg_temp.f10g_erro('select public.financeiro_solicitar_cancelamento_fiscal(pg_temp.f10g_id(''documento''),''Tarde'',''f10g-late-cancel'')','22023');
reset role;
select pg_temp.f10g_assert((select count(*)=0 from public.documentos_fiscais where clinica_id=pg_temp.f10g_id('cb')),'isolamento de clinica');
set constraints all immediate;
rollback;
