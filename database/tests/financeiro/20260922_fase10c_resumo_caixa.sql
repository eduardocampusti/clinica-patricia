-- FASE 10C: roteiro executado apos aplicacao autorizada da migration, com ROLLBACK.
-- Executar integralmente como postgres, abortando ao primeiro erro.
-- Fixtures exclusivamente sinteticas. Em erro, emitir ROLLBACK na conexao.
begin;
set local statement_timeout = '120s';

create temporary table f10c_ids(nome text primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into f10c_ids(nome) select unnest(array[
  'owner','recepcao','medico','outra','inativo','sem_vinculo','vinculo_inativo',
  'ca','cb','sessao','sessao_b','legado','prof','pac','ag','recebimento','sangria','estorno'
]);
create function pg_temp.f10c_id(p_nome text) returns uuid language sql stable as
  'select id from pg_temp.f10c_ids where nome=p_nome';
create function pg_temp.f10c_assert(p_ok boolean,p_msg text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FASE10C: %',p_msg; end if;
end;
$$;
create function pg_temp.f10c_login(p_nome text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',coalesce(pg_temp.f10c_id(p_nome)::text,''),true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.f10c_id(p_nome),'role','authenticated')::text,true);
end;
$$;
create function pg_temp.f10c_erro(p_sql text,p_code text) returns void language plpgsql as $$
declare v_code text;
begin
  begin execute p_sql;
  exception when others then get stacked diagnostics v_code=returned_sqlstate; end;
  if v_code is distinct from p_code then
    raise exception 'FASE10C: esperado %, encontrado %',p_code,v_code;
  end if;
end;
$$;
grant select,update on f10c_ids to authenticated;
grant select on f10c_ids to anon;

-- Catalogo: assinatura, STABLE, DEFINER, search_path e grants minimos.
do $$
declare v_oid oid := 'public.financeiro_resumo_caixa(uuid)'::regprocedure;
begin
  perform pg_temp.f10c_assert((select provolatile='s' and prosecdef and prorettype='jsonb'::regtype
    and proconfig @> array['search_path=pg_catalog'] from pg_proc where oid=v_oid),'seguranca e retorno');
  perform pg_temp.f10c_assert(has_function_privilege('authenticated',v_oid,'EXECUTE'),'authenticated pode executar RPC');
  perform pg_temp.f10c_assert(not has_function_privilege('anon',v_oid,'EXECUTE'),'anon sem EXECUTE');
  perform pg_temp.f10c_assert(not exists(select 1 from pg_proc p,
    lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where p.oid=v_oid and a.grantee=0 and a.privilege_type='EXECUTE'),'PUBLIC sem EXECUTE');
  perform pg_temp.f10c_assert(not has_function_privilege('authenticated','private.financeiro_calcular_caixa(uuid)','EXECUTE')
    and not has_function_privilege('anon','private.financeiro_calcular_caixa(uuid)','EXECUTE'),'helper fechado a clientes');
  perform pg_temp.f10c_assert(not exists(select 1 from pg_proc p,
    lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where p.oid='private.financeiro_calcular_caixa(uuid)'::regprocedure and a.grantee=0
    and a.privilege_type='EXECUTE'),'helper fechado a PUBLIC');
end;
$$;

insert into auth.users(id) select id from f10c_ids
where nome in ('owner','recepcao','medico','outra','inativo','sem_vinculo','vinculo_inativo');
insert into public.usuarios(id,nome_completo)
select id,'FASE10C TESTE '||nome from f10c_ids
where nome in ('owner','recepcao','medico','outra','inativo','sem_vinculo','vinculo_inativo')
on conflict(id) do nothing;
update public.usuarios set ativo=false where id=pg_temp.f10c_id('inativo');
insert into public.clinicas(id,nome,cidade,subdomain)
select id,'FASE10C CLINICA '||nome,'SINTETICA','f10c-'||id::text from f10c_ids where nome in ('ca','cb');
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo)
select pg_temp.f10c_id(x.u),pg_temp.f10c_id(x.c),x.p::public.papel_usuario,x.ativo
from (values ('owner','ca','proprietaria',true),('recepcao','ca','recepcao',true),
  ('medico','ca','medico',true),('outra','cb','recepcao',true),('inativo','ca','recepcao',true),
  ('vinculo_inativo','ca','recepcao',false)) x(u,c,p,ativo);
insert into public.profissionais(id,nome_completo,usuario_id,valor_consulta,taxa_repasse_clinica)
values(pg_temp.f10c_id('prof'),'FASE10C PROFISSIONAL',pg_temp.f10c_id('medico'),1000,20);
insert into public.profissionais_clinicas(profissional_id,clinica_id,valor_consulta)
values(pg_temp.f10c_id('prof'),pg_temp.f10c_id('ca'),1000);
insert into public.pacientes(id,clinica_id,nome_completo)
values(pg_temp.f10c_id('pac'),pg_temp.f10c_id('ca'),'FASE10C PACIENTE SINTETICO');
insert into public.configuracoes_financeiras_clinica(clinica_id,percentual_clinica,vigente_desde)
values(pg_temp.f10c_id('ca'),20,now()-interval '1 day');
insert into public.sessoes_caixa(id,clinica_id,aberto_por,valor_abertura,status,idempotency_key)
values(pg_temp.f10c_id('sessao'),pg_temp.f10c_id('ca'),pg_temp.f10c_id('owner'),150,'aberto','f10c-'||pg_temp.f10c_id('sessao')),
  (pg_temp.f10c_id('sessao_b'),pg_temp.f10c_id('cb'),pg_temp.f10c_id('outra'),999,'aberto','f10c-'||pg_temp.f10c_id('sessao_b')),
  (pg_temp.f10c_id('legado'),pg_temp.f10c_id('ca'),pg_temp.f10c_id('owner'),0,'aprovado',null);
insert into public.entradas_caixa(sessao_caixa_id,clinica_id,forma_pagamento,valor,descricao,registrado_por,paciente_id,profissional_id)
values(pg_temp.f10c_id('legado'),pg_temp.f10c_id('ca'),'dinheiro',17,'FASE10C LEGADO SINTETICO',
  pg_temp.f10c_id('owner'),pg_temp.f10c_id('pac'),pg_temp.f10c_id('prof'));
insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,created_by)
values(pg_temp.f10c_id('ag'),pg_temp.f10c_id('ca'),pg_temp.f10c_id('pac'),pg_temp.f10c_id('prof'),
  current_date,'08:00','08:30','confirmado',pg_temp.f10c_id('owner'));

set local role authenticated;
select pg_temp.f10c_login('owner');
do $$
declare j jsonb; k text;
begin
  j:=public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'));
  perform pg_temp.f10c_assert(j->>'clinica_nome'='FASE10C CLINICA ca' and j->>'aberto_por_nome'='FASE10C TESTE owner','metadados amigaveis');
  perform pg_temp.f10c_assert(j#>>'{resumo,valor_abertura}'='150.00' or (j#>>'{resumo,valor_abertura}')::numeric=150,'abertura');
  perform pg_temp.f10c_assert((j#>>'{resumo,valor_esperado}')::numeric=150,'vazio preserva troco');
  foreach k in array array['total_dinheiro','total_pix','total_cartao_credito','total_recebimentos_brutos',
    'total_suprimentos','total_sangrias','total_estornos_dinheiro','total_clinica','total_profissionais'] loop
    perform pg_temp.f10c_assert((j->'resumo'->>k)::numeric=0,'vazio zero: '||k);
  end loop;
  perform pg_temp.f10c_assert((select count(*)=7 from jsonb_object_keys(j))
    and (select count(*)=11 from jsonb_object_keys(j->'resumo')),'allowlist de campos');
  perform pg_temp.f10c_erro('select public.financeiro_resumo_caixa(null)','22023');
  perform pg_temp.f10c_erro('select public.financeiro_resumo_caixa(gen_random_uuid())','P0002');
  perform pg_temp.f10c_erro('select public.financeiro_resumo_caixa(pg_temp.f10c_id(''legado''))','22023');
  perform pg_temp.f10c_erro('select public.financeiro_resumo_caixa(pg_temp.f10c_id(''sessao_b''))','42501');
  foreach k in array array['medico','outra','inativo','sem_vinculo','vinculo_inativo'] loop
    perform pg_temp.f10c_login(k);
    perform pg_temp.f10c_erro('select public.financeiro_resumo_caixa(pg_temp.f10c_id(''sessao''))','42501');
  end loop;
  perform pg_temp.f10c_login('outra');
  perform pg_temp.f10c_erro('select public.financeiro_resumo_caixa(pg_temp.f10c_id(''legado''))','42501');
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  perform pg_temp.f10c_erro('select public.financeiro_resumo_caixa(pg_temp.f10c_id(''sessao''))','42501');
  perform pg_temp.f10c_login(null);
  perform pg_temp.f10c_erro('select public.financeiro_resumo_caixa(pg_temp.f10c_id(''sessao''))','28000');
end;
$$;
reset role;
update public.clinicas set ativo=false where id=pg_temp.f10c_id('ca');
set local role authenticated;
select pg_temp.f10c_login('owner');
select pg_temp.f10c_erro('select public.financeiro_resumo_caixa(pg_temp.f10c_id(''sessao''))','42501');
reset role;
update public.clinicas set ativo=true where id=pg_temp.f10c_id('ca');
update public.sessoes_caixa set valor_abertura=0 where id=pg_temp.f10c_id('sessao');
set local role authenticated;
select pg_temp.f10c_login('owner');
select pg_temp.f10c_assert(public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'))->'resumo'
  @> '{"valor_abertura":0,"valor_esperado":0}', 'sessao vazia com abertura zero');
reset role;
update public.sessoes_caixa set valor_abertura=150 where id=pg_temp.f10c_id('sessao');
set local role anon;
select pg_temp.f10c_erro('select public.financeiro_resumo_caixa(pg_temp.f10c_id(''sessao''))','42501');
reset role;

-- Operacoes homologadas criam as fixtures financeiras; tudo sera revertido.
set local role authenticated;
select pg_temp.f10c_login('recepcao');
do $$
declare j jsonb; r jsonb;
begin
  perform pg_temp.f10c_assert((public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'))#>>'{resumo,valor_esperado}')::numeric=150,'recepcao autorizada');
  r:=public.financeiro_registrar_recebimento(pg_temp.f10c_id('ag'),
    '[{"forma_pagamento":"dinheiro","valor":500},{"forma_pagamento":"pix","valor":300},{"forma_pagamento":"cartao_credito","valor":200}]',
    'f10c-'||pg_temp.f10c_id('ag'));
  update pg_temp.f10c_ids set id=(r->>'recebimento_id')::uuid where nome='recebimento';
  j:=public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'));
  perform pg_temp.f10c_assert(j->'resumo' @> '{"total_dinheiro":500,"total_pix":300,"total_cartao_credito":200,"total_recebimentos_brutos":1000,"total_clinica":200,"total_profissionais":800,"valor_esperado":650}',
    'split sem duplicar bruto; PIX/cartao nao entram em dinheiro fisico');
  perform public.financeiro_registrar_suprimento(pg_temp.f10c_id('sessao'),50,'FASE10C TROCO','f10c-sup-'||pg_temp.f10c_id('sessao'));
  j:=public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'));
  perform pg_temp.f10c_assert(j->'resumo' @> '{"total_suprimentos":50,"valor_esperado":700}','suprimento');
  r:=public.financeiro_solicitar_sangria(pg_temp.f10c_id('sessao'),100,'FASE10C SANGRIA','f10c-san-'||pg_temp.f10c_id('sessao'));
  update pg_temp.f10c_ids set id=(r->>'sangria_id')::uuid where nome='sangria';
  perform pg_temp.f10c_assert((public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'))#>>'{resumo,valor_esperado}')::numeric=700,'solicitar nao retira dinheiro');
end;
$$;
select pg_temp.f10c_login('owner');
select public.financeiro_revisar_sangria(pg_temp.f10c_id('sangria'),'aprovar',null);
select pg_temp.f10c_assert((public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'))#>>'{resumo,valor_esperado}')::numeric=700,'aprovar nao efetiva sangria');
select pg_temp.f10c_login('recepcao');
select public.financeiro_efetivar_sangria(pg_temp.f10c_id('sangria'));
select pg_temp.f10c_assert(public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'))->'resumo' @> '{"total_sangrias":100,"valor_esperado":600}','sangria efetivada');
do $$
declare r jsonb;
begin
  r:=public.financeiro_solicitar_estorno(pg_temp.f10c_id('recebimento'),
    '[{"forma_pagamento":"dinheiro","valor":50},{"forma_pagamento":"pix","valor":25}]',
    'FASE10C ESTORNO','f10c-est-'||pg_temp.f10c_id('sessao'));
  update pg_temp.f10c_ids set id=(r->>'estorno_id')::uuid where nome='estorno';
  perform pg_temp.f10c_assert((public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'))#>>'{resumo,total_estornos_dinheiro}')::numeric=0,'solicitado nao descontado');
end;
$$;
select pg_temp.f10c_login('owner');
select public.financeiro_revisar_estorno(pg_temp.f10c_id('estorno'),'aprovar',null);
select pg_temp.f10c_assert(public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'))->'resumo' @>
  '{"valor_abertura":150,"total_dinheiro":500,"total_pix":300,"total_cartao_credito":200,"total_recebimentos_brutos":1000,"total_suprimentos":50,"total_sangrias":100,"total_estornos_dinheiro":50,"valor_esperado":550,"total_clinica":200,"total_profissionais":800}',
  'estorno dinheiro descontado uma vez; estorno PIX nao diminui caixa fisico');
select public.financeiro_iniciar_fechamento(pg_temp.f10c_id('sessao'));
do $$
declare r jsonb;
begin
  r:=public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'))->'resumo';
  perform pg_temp.f10c_assert((r->>'valor_esperado')::numeric =
    (r->>'valor_abertura')::numeric + (r->>'total_dinheiro')::numeric
    + (r->>'total_suprimentos')::numeric - (r->>'total_sangrias')::numeric
    - (r->>'total_estornos_dinheiro')::numeric, 'formula de coerencia do resumo oficial');
end;
$$;
select pg_temp.f10c_assert(public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'))->>'status'='em_fechamento','consulta durante fechamento');
reset role;

-- Prova futura de leitura pura: estado e contagens nao mudam apos consultar.
create temporary table f10c_antes on commit drop as
select (select jsonb_agg(to_jsonb(s) order by s.id) from public.sessoes_caixa s where s.clinica_id in (pg_temp.f10c_id('ca'),pg_temp.f10c_id('cb'))) sessoes,
  (select count(*) from public.movimentos_caixa) movimentos,
  (select count(*) from public.fechamentos_caixa) fechamentos,
  (select count(*) from public.eventos_auditoria_financeira) auditorias;
set local role authenticated;
select pg_temp.f10c_login('recepcao');
select public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'));
select public.financeiro_resumo_caixa(pg_temp.f10c_id('sessao'));
reset role;
select pg_temp.f10c_assert(
  sessoes=(select jsonb_agg(to_jsonb(s) order by s.id) from public.sessoes_caixa s where s.clinica_id in (pg_temp.f10c_id('ca'),pg_temp.f10c_id('cb')))
  and movimentos=(select count(*) from public.movimentos_caixa)
  and fechamentos=(select count(*) from public.fechamentos_caixa)
  and auditorias=(select count(*) from public.eventos_auditoria_financeira),'leitura sem efeitos persistentes') from f10c_antes;
set constraints all immediate;
rollback;
