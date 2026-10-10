-- VALIDADO NO REMOTO APOS APLICACAO DA FASE 8. Requer executor postgres autorizado.
-- Sem psql metacomandos; abortar ao erro e sempre finalizar com ROLLBACK.
-- Fixtures diretas verificam leitura de snapshots, nao substituem E2E das RPCs 3-7.
-- Nenhum trigger/RLS e desativado. Todo dado sintetico e revertido ao final.
begin;
set local statement_timeout='120s';
set local timezone='UTC';

create temporary table f8_ids(nome text primary key,id uuid not null default gen_random_uuid()) on commit drop;
insert into f8_ids(nome) select unnest(array['owner','med_a','med_b','recepcao','estranho',
  'c1','c2','c3','pa','pb','pa_dup','pa1','pa2','pb1','pb2','px',
  's0','s1','s2','s3','sb','sx','se','sd','sa','sl',
  'f0','f1','f2','f3','fb','fx','fd0','fd',
  'r0','r1','r2','r3','r4','r5','r6','r7','rx','re',
  'e0','e1','e3','e5','q0','q1','q2','q3','qb','a0','a1']);
create function pg_temp.f8_id(p_nome text) returns uuid language sql stable as
  'select id from pg_temp.f8_ids where nome=p_nome';
create function pg_temp.f8_assert(p_ok boolean,p_label text) returns void language plpgsql as $$
begin if p_ok is distinct from true then raise exception 'FASE8: %',p_label; end if; end;
$$;
create function pg_temp.f8_erro(p_sql text,p_code text) returns void language plpgsql as $$
declare v_code text;
begin
  begin execute p_sql;
  exception when others then get stacked diagnostics v_code=returned_sqlstate; end;
  if v_code is distinct from p_code then raise exception 'FASE8: esperado %, encontrado %: %',p_code,v_code,p_sql; end if;
end;
$$;
create function pg_temp.f8_login(p_nome text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',coalesce(pg_temp.f8_id(p_nome)::text,''),true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.f8_id(p_nome),'role','authenticated')::text,true);
end;
$$;
grant select on f8_ids to authenticated,anon;

-- Fotografia integral da sessao/entradas legadas, se presentes, sem altera-las.
create temporary table f8_legado on commit drop as
select (select to_jsonb(s) from public.sessoes_caixa s where s.id='a4a18e49-6634-4058-9fd8-07f3b065fd63') sessao,
  (select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]') from public.entradas_caixa e
    where e.sessao_caixa_id='a4a18e49-6634-4058-9fd8-07f3b065fd63') entradas;

insert into auth.users(id) select id from f8_ids where nome in ('owner','med_a','med_b','recepcao','estranho');
insert into public.usuarios(id,nome_completo) select id,'FASE8 TESTE '||nome from f8_ids
  where nome in ('owner','med_a','med_b','recepcao','estranho') on conflict(id) do nothing;
insert into public.clinicas(id,nome,cidade,subdomain)
select id,'FASE8 TESTE '||nome,'SINTETICA','f8-'||id::text from f8_ids where nome in ('c1','c2','c3');
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel)
select pg_temp.f8_id(x.usuario),pg_temp.f8_id(x.clinica),x.papel::public.papel_usuario
from (values ('owner','c1','proprietaria'),('owner','c2','proprietaria'),
  ('med_a','c1','medico'),('med_a','c2','medico'),('med_b','c1','medico'),('med_b','c2','medico'),
  ('recepcao','c1','recepcao')) x(usuario,clinica,papel);
insert into public.profissionais(id,nome_completo,usuario_id,valor_consulta,taxa_repasse_clinica)
values(pg_temp.f8_id('pa'),'FASE8 MEDICO A',pg_temp.f8_id('med_a'),999,99),
  (pg_temp.f8_id('pb'),'FASE8 MEDICO B',pg_temp.f8_id('med_b'),888,88);
insert into public.profissionais_clinicas(profissional_id,clinica_id,valor_consulta)
select p.id,c.id,777 from f8_ids p cross join f8_ids c where p.nome in ('pa','pb') and c.nome in ('c1','c2','c3');
insert into public.pacientes(id,clinica_id,nome_completo)
select pg_temp.f8_id(x.p),pg_temp.f8_id(x.c),'FASE8 PACIENTE '||x.p
from (values('pa1','c1'),('pa2','c1'),('pb1','c2'),('pb2','c2'),('px','c3')) x(p,c);

create temporary table f8_sessoes(s text,c text,data timestamptz,status text) on commit drop;
insert into f8_sessoes values
 ('s0','c1','2000-01-01 03:00Z','aprovado'),('s1','c1','2000-02-01 03:00Z','aprovado'),
 ('s2','c1','2000-02-03 03:00Z','aprovado'),('s3','c1','2000-02-05 03:00Z','aprovado'),
 ('sb','c2','2000-02-10 03:00Z','aprovado'),('sx','c3','2000-02-10 03:00Z','aprovado'),
 ('se','c1','2000-03-01 03:00Z','aprovado'),('sd','c2','2000-02-25 03:00Z','aprovado'),
 ('sa','c1','2000-02-26 03:00Z','aberto'),('sl','c1','2000-02-26 04:00Z','aprovado');
insert into public.sessoes_caixa(id,clinica_id,aberto_por,valor_abertura,aberto_em,status,idempotency_key)
select pg_temp.f8_id(s),pg_temp.f8_id(c),pg_temp.f8_id('owner'),case when s='sd' then 5 else 0 end,data,status::public.status_sessao_caixa,
  'f8-'||pg_temp.f8_id(s) from f8_sessoes;
update public.sessoes_caixa s set fechado_em=s.aberto_em+interval '12 hours'
where s.id in (select pg_temp.f8_id(x.s) from f8_sessoes x where x.status='aprovado');

create temporary table f8_receitas(r text,c text,p text,pac text,s text,data timestamptz,bruto numeric,forma text,status text,fiscal text) on commit drop;
insert into f8_receitas values
 ('r0','c1','pa','pa1','s0','2000-01-01 03:00Z',1000,'pix','parcialmente_estornado','emitida'),
 ('r1','c1','pa','pa1','s1','2000-02-01 03:00Z',500,'misto','parcialmente_estornado','pendente'),
 ('r2','c1','pa','pa1','s2','2000-02-03 03:00Z',100,'dinheiro','confirmado','emissao_solicitada'),
 ('r3','c1','pa','pa2','s3','2000-02-05 03:00Z',500,'cartao_credito','parcialmente_estornado','emitida'),
 ('r4','c2','pb','pb1','sb','2000-02-10 03:00Z',200,'pix','confirmado','erro_emissao'),
 ('r5','c2','pb','pb1','sb','2000-02-11 03:00Z',300,'cartao_credito','parcialmente_estornado','cancelamento_solicitado'),
 ('r6','c2','pb','pb2','sb','2000-02-12 03:00Z',400,'dinheiro','confirmado','cancelada'),
 ('r7','c2','pb','pb2','sb','2000-02-13 03:00Z',100,'pix','confirmado','erro_cancelamento'),
 ('rx','c3','pb','px','sx','2000-02-10 03:00Z',9000,'dinheiro','confirmado','pendente'),
 ('re','c1','pa','pa2','se','2000-03-01 03:00Z',700,'pix','confirmado','pendente');
insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,created_by)
select pg_temp.f8_id(r),pg_temp.f8_id(c),pg_temp.f8_id(pac),pg_temp.f8_id(p),
  (data at time zone 'America/Bahia')::date,'09:00','09:30','confirmado',pg_temp.f8_id('owner') from f8_receitas;
insert into public.recebimentos(id,clinica_id,agendamento_id,paciente_id,profissional_id,sessao_caixa_id,
  valor_bruto,percentual_clinica,valor_clinica,valor_profissional,status,idempotency_key,registrado_por,registrado_em)
select pg_temp.f8_id(r),pg_temp.f8_id(c),pg_temp.f8_id(r),pg_temp.f8_id(pac),pg_temp.f8_id(p),pg_temp.f8_id(s),
  bruto,20,bruto/5,bruto*4/5,status,'f8-'||pg_temp.f8_id(r),pg_temp.f8_id('owner'),data from f8_receitas;
insert into public.recebimentos_pagamentos(recebimento_id,forma_pagamento,valor)
select pg_temp.f8_id(r),forma,bruto from f8_receitas where forma<>'misto';
insert into public.recebimentos_pagamentos(recebimento_id,forma_pagamento,valor)
values(pg_temp.f8_id('r1'),'dinheiro',200),(pg_temp.f8_id('r1'),'pix',300);
insert into public.documentos_fiscais(id,clinica_id,recebimento_id,status,criado_por,created_at,updated_at)
select pg_temp.f8_id(r),pg_temp.f8_id(c),pg_temp.f8_id(r),fiscal,pg_temp.f8_id('owner'),data,data from f8_receitas;
-- Erro relevante + erro antigo resolvido (nao pode gerar alerta).
insert into public.tentativas_documento_fiscal(clinica_id,documento_fiscal_id,tipo,status,idempotency_key,created_at,finalizado_em)
values(pg_temp.f8_id('c2'),pg_temp.f8_id('r4'),'emissao','erro','f8-'||gen_random_uuid(),'2000-02-10 04:00Z','2000-02-10 05:00Z'),
 (pg_temp.f8_id('c1'),pg_temp.f8_id('r3'),'emissao','erro','f8-'||gen_random_uuid(),'2000-02-05 04:00Z','2000-02-05 05:00Z'),
 (pg_temp.f8_id('c1'),pg_temp.f8_id('r3'),'emissao','sucesso','f8-'||gen_random_uuid(),'2000-02-05 06:00Z','2000-02-05 07:00Z');

insert into public.estornos(id,clinica_id,recebimento_id,valor_total,valor_clinica,valor_profissional,motivo,status,
  idempotency_key,solicitado_por,solicitado_em,revisado_por,revisado_em,efetivado_por,efetivado_em)
select pg_temp.f8_id(x.e),pg_temp.f8_id(x.c),pg_temp.f8_id(x.r),x.valor,x.valor/5,x.valor*4/5,
 'FASE8 TESTE','efetivado','f8-'||pg_temp.f8_id(x.e),pg_temp.f8_id('owner'),x.data::timestamptz,
 pg_temp.f8_id('owner'),x.data::timestamptz,pg_temp.f8_id('owner'),x.data::timestamptz
from (values('e0','c1','r0',300,'2000-02-02 03:00Z'),('e1','c1','r1',125,'2000-03-02 03:00Z'),
 ('e3','c1','r3',50,'2000-02-05 10:00Z'),('e5','c2','r5',100,'2000-02-15 03:00Z')) x(e,c,r,valor,data);
insert into public.estornos_pagamentos(estorno_id,forma_pagamento,valor)
values(pg_temp.f8_id('e0'),'pix',300),(pg_temp.f8_id('e1'),'pix',125),
 (pg_temp.f8_id('e3'),'cartao_credito',50),(pg_temp.f8_id('e5'),'cartao_credito',100);

-- Segunda sessao legada temporaria: a regra do dashboard deve exclui-la pela
-- existencia de entradas_caixa, sem conhecer este UUID e sem regra especial.
insert into public.entradas_caixa(sessao_caixa_id,clinica_id,forma_pagamento,valor,descricao,registrado_por,paciente_id,profissional_id)
values(pg_temp.f8_id('sl'),pg_temp.f8_id('c1'),'dinheiro'::public.forma_pagamento_caixa,17,
  'FASE8 legado sintetico',pg_temp.f8_id('owner'),pg_temp.f8_id('pa1'),pg_temp.f8_id('pa'));

-- Snapshots de fechamento; duas tentativas da mesma sessao nao duplicam diferencas.
insert into public.fechamentos_caixa(id,clinica_id,sessao_caixa_id,tentativa,substitui_fechamento_id,idempotency_key,
 valor_abertura,total_dinheiro,total_pix,total_cartao_credito,total_recebimentos_brutos,total_suprimentos,total_sangrias,
 valor_esperado,valor_contado,diferenca,total_clinica,total_profissionais,justificativa_diferenca,status,enviado_por,enviado_em,
 total_estornos,total_estornos_dinheiro,total_estornos_pix,total_estornos_cartao_credito,estornos_valor_clinica,estornos_valor_profissionais)
select pg_temp.f8_id(x.f),pg_temp.f8_id(s.c),pg_temp.f8_id(x.s),x.tentativa,pg_temp.f8_id(x.substitui),'f8-'||pg_temp.f8_id(x.f),
 case when x.s='sd' then 5 else 0 end,x.dinheiro,x.pix,x.cartao,x.dinheiro+x.pix+x.cartao,0,0,
 x.dinheiro+case when x.s='sd' then 5 else 0 end,
 x.dinheiro+case when x.s='sd' then 5 else 0 end+x.diferenca,x.diferenca,
 (x.dinheiro+x.pix+x.cartao)/5,(x.dinheiro+x.pix+x.cartao)*4/5,
 case when x.diferenca<>0 then 'FASE8 TESTE' end,x.status,pg_temp.f8_id('owner'),
 case when x.f='fb' then '2000-02-20 15:00Z'::timestamptz else s.data+interval '12 hours' end,
 x.estorno,0,0,x.estorno,x.estorno/5,x.estorno*4/5
from (values('f0','s0',1,null::text,0,1000,0,0,0,'aprovado'),('f1','s1',1,null,200,300,0,0,0,'aprovado'),
 ('f2','s2',1,null,100,0,0,0,0,'aprovado'),('f3','s3',1,null,0,0,500,0,50,'aprovado'),
 ('fb','sb',1,null,400,300,300,10,100,'aprovado'),('fx','sx',1,null,9000,0,0,0,0,'aprovado'),
 ('fd0','sd',1,null,0,0,0,99,0,'devolvido'),('fd','sd',2,'fd0',0,0,0,-5,0,'aprovado'))
 x(f,s,tentativa,substitui,dinheiro,pix,cartao,diferenca,estorno,status) join f8_sessoes s on s.s=x.s;
-- Ultima tentativa negativa: abertura/esperado 5, contado 0, diferenca -5.

insert into public.repasses(id,clinica_id,profissional_id,fechamento_id,sessao_caixa_id,status,
 valor_bruto_profissional,valor_estornos_antes_pagamento,valor_ajustes_aplicados,valor_liquido,
 gerado_por,gerado_em,confirmado_por,confirmado_em,meio_pagamento,confirmacao_idempotency_key)
select pg_temp.f8_id(x.q),pg_temp.f8_id(x.c),pg_temp.f8_id(x.p),pg_temp.f8_id(x.f),pg_temp.f8_id(x.s),x.status,
 x.bruto,x.estorno,x.ajuste,x.bruto-x.estorno-x.ajuste,pg_temp.f8_id('owner'),x.data::timestamptz,
 case when x.status='pago' then pg_temp.f8_id('owner') end,
 case when x.status='pago' then x.data::timestamptz+interval '1 hour' end,
 case when x.status='pago' then 'pix' end,case when x.status='pago' then 'f8-'||pg_temp.f8_id(x.q) end
from (values('q0','c1','pa','f0','s0','pago',800,0,0,'2000-01-01 16:00Z'),
 ('q1','c1','pa','f1','s1','pago',400,0,0,'2000-02-01 16:00Z'),
 ('q2','c1','pa','f2','s2','ajustado',80,0,80,'2000-02-03 16:00Z'),
 ('q3','c1','pa','f3','s3','pendente',400,40,100,'2000-02-05 16:00Z'),
 ('qb','c2','pb','fb','sb','pago',800,80,0,'2000-02-20 16:00Z')) x(q,c,p,f,s,status,bruto,estorno,ajuste,data);
insert into public.repasses_itens(repasse_id,recebimento_id,valor_profissional_original,valor_estornos_antes_pagamento,valor_liquido)
select pg_temp.f8_id(x.q),pg_temp.f8_id(x.r),r.bruto*4/5,x.e,r.bruto*4/5-x.e
from (values('q0','r0',0),('q1','r1',0),('q2','r2',0),('q3','r3',40),
 ('qb','r4',0),('qb','r5',80),('qb','r6',0),('qb','r7',0)) x(q,r,e) join f8_receitas r on r.r=x.r;
insert into public.ajustes_repasse(id,clinica_id,profissional_id,estorno_id,repasse_origem_id,valor,valor_aplicado,status,criado_por,criado_em)
values(pg_temp.f8_id('a0'),pg_temp.f8_id('c1'),pg_temp.f8_id('pa'),pg_temp.f8_id('e0'),pg_temp.f8_id('q0'),-240,180,'parcialmente_aplicado',pg_temp.f8_id('owner'),'2000-02-02 03:00Z'),
 (pg_temp.f8_id('a1'),pg_temp.f8_id('c1'),pg_temp.f8_id('pa'),pg_temp.f8_id('e1'),pg_temp.f8_id('q1'),-100,0,'pendente',pg_temp.f8_id('owner'),'2000-03-02 03:00Z');
insert into public.aplicacoes_ajuste_repasse(ajuste_id,repasse_id,valor_aplicado,created_at)
values(pg_temp.f8_id('a0'),pg_temp.f8_id('q2'),80,'2000-02-03 16:01Z'),
  (pg_temp.f8_id('a0'),pg_temp.f8_id('q3'),100,'2000-02-05 16:01Z');
set constraints all immediate;

-- Conservacao das fontes da FASE 6 antes de consultar o dashboard.
select pg_temp.f8_assert(not exists(
 select 1 from public.repasses q where q.id in (select id from f8_ids where nome like 'q%') and
 (q.valor_bruto_profissional<>(select sum(i.valor_profissional_original) from public.repasses_itens i where i.repasse_id=q.id)
 or q.valor_estornos_antes_pagamento<>(select sum(i.valor_estornos_antes_pagamento) from public.repasses_itens i where i.repasse_id=q.id)
 or q.valor_ajustes_aplicados<>coalesce((select sum(a.valor_aplicado) from public.aplicacoes_ajuste_repasse a where a.repasse_id=q.id),0)
 or q.valor_liquido<>q.valor_bruto_profissional-q.valor_estornos_antes_pagamento-q.valor_ajustes_aplicados)), 'conservacao repasse/item/aplicacoes');

create temporary table f8_resultados(nome text primary key,resultado jsonb) on commit drop;
grant select,insert,update on f8_resultados to authenticated;
set local role authenticated;
select pg_temp.f8_login('owner');
insert into f8_resultados values
 ('owner',public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z')),
 ('c1',public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',pg_temp.f8_id('c1'))),
 ('c2',public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',pg_temp.f8_id('c2'))),
 ('vazio',public.financeiro_dashboard_proprietaria('2050-01-01 00:00:00Z','2050-02-01 00:00:00Z'));
do $$
declare j jsonb; a jsonb; b jsonb; k text; d jsonb; bloco text;
begin
 select resultado into j from f8_resultados where nome='owner';
 select resultado into a from f8_resultados where nome='c1';
 select resultado into b from f8_resultados where nome='c2';
 perform pg_temp.f8_assert(j#>'{resumo,producao}'='{"quantidade":7,"pacientes_distintos":4,"bruto":2100,"clinica_bruta":420,"profissional_bruta":1680,"estornos_coorte":275,"estornos_clinica":55,"estornos_profissional":220,"liquido_atual_coorte":1825,"clinica_liquida":365,"profissional_liquida":1460}'::jsonb,'producao exata; inclui inicio e exclui fim');
 perform pg_temp.f8_assert(j#>'{resumo,estornos_periodo}'='{"quantidade":3,"total":450,"clinica":90,"profissional":360}'::jsonb,'estorno posterior fora; anterior com evento dentro');
 perform pg_temp.f8_assert(j#>'{resumo,pagamentos}'='{"dinheiro":700,"pix":600,"cartao_credito":800}'::jsonb,'componentes sem multiplicacao');
 perform pg_temp.f8_assert(j#>'{resumo,repasses}'='{"repasses_gerados_periodo":4,"valor_liquido_repasses_gerados_periodo":1380,"repasses_ajustados_gerados_periodo":1,"repasses_pagos_periodo":2,"valor_repasses_pagos_periodo":1120,"repasses_pendentes_atual":1,"valor_repasses_pendentes_atual":260,"aplicacoes_ajustes_periodo":180,"aplicacoes_provisorias_repasses_gerados_periodo":100,"aplicacoes_compensadas_repasses_gerados_periodo":80}'::jsonb,'geracao, pagamento, estoque e aplicacoes separados');
 perform pg_temp.f8_assert(j#>'{resumo,ajustes}'='{"quantidade_pendente":2,"valor_pendente_atual":160,"saldo_contabil_negativo_pendente":-160}'::jsonb,'saldo atual normalizado nao duplica ajuste nem desconta estorno duas vezes');
 for k in select jsonb_object_keys(j#>'{resumo,producao}') loop
   perform pg_temp.f8_assert((j#>>array['resumo','producao',k])::numeric=(a#>>array['resumo','producao',k])::numeric+(b#>>array['resumo','producao',k])::numeric,'consolidado '||k);
 end loop;
 foreach bloco in array array['estornos_periodo','pagamentos','repasses','ajustes','fiscal'] loop
   for k in select jsonb_object_keys(j#>array['resumo',bloco]) loop
     perform pg_temp.f8_assert((j#>>array['resumo',bloco,k])::numeric=
       (a#>>array['resumo',bloco,k])::numeric+(b#>>array['resumo',bloco,k])::numeric,'consolidado '||bloco||'.'||k);
   end loop;
 end loop;
 foreach k in array array['pendente','emissao_solicitada','emitida','erro_emissao','cancelamento_solicitado','cancelada','erro_cancelamento'] loop
   perform pg_temp.f8_assert((j#>>array['resumo','fiscal',k])::integer=1,'fiscal '||k);
 end loop;
 perform pg_temp.f8_assert(j#>'{resumo,caixa}'='{"situacao_operacional_atual":{"aberto":1,"em_fechamento":0,"aguardando_aprovacao":0,"devolvido_para_correcao":0},"aprovados_periodo":{"quantidade":5,"fechamentos_com_diferenca":2,"diferenca_total":5,"diferencas_positivas":10,"diferencas_negativas":-5}}'::jsonb,'caixa atual, legado estrutural e tentativa vigente separados');
 perform pg_temp.f8_assert(jsonb_array_length(j->'por_clinica')=2 and not ((j->'clinicas_autorizadas') ? pg_temp.f8_id('c3')::text),'terceira clinica excluida');
 perform pg_temp.f8_assert((j->>'alertas_total')::integer=2,'um alerta por documento fiscal em erro; tentativa nao duplica incidente');
 perform pg_temp.f8_assert(not exists(select 1 from jsonb_array_elements(j->'alertas') alerta where alerta->>'tipo'='fechamento_devolvido'),
   'tentativa devolvida anterior nao alerta depois da tentativa aprovada');
 select s into d from jsonb_array_elements(j#>'{resumo,series}') s where s->>'dia'='2000-02-01';
 perform pg_temp.f8_assert((d->>'bruto')::numeric=500 and (d->>'liquido_atual_coorte')::numeric=375 and (d->>'estornos_eventos')::numeric=0,'serie da coorte inclui estorno posterior');
 select resultado into j from f8_resultados where nome='vazio';
 perform pg_temp.f8_assert((j#>>'{resumo,producao,bruto}')::numeric=0 and j#>'{resumo,series}'='[]'::jsonb,'periodo vazio');
 -- Estoque atual de ajustes nao e zerado artificialmente por um periodo vazio.
 perform pg_temp.f8_assert((j#>>'{resumo,ajustes,valor_pendente_atual}')::numeric=160,'estoque global atual explicitamente separado');
end;
$$;

-- Filtros: EXISTS evita duplicacao e pagamento misto preserva todos componentes.
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',
 p_forma_pagamento=>'pix')#>>'{resumo,producao,bruto}')::numeric=800,'filtro PIX seleciona recebimentos inteiros');
select pg_temp.f8_assert(
  public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-02-02 03:00Z',pg_temp.f8_id('c1'),
    p_paciente_id=>pg_temp.f8_id('pa1'),p_forma_pagamento=>'dinheiro')#>'{resumo,producao}' =
  '{"quantidade":1,"pacientes_distintos":1,"bruto":500,"clinica_bruta":100,"profissional_bruta":400,"estornos_coorte":125,"estornos_clinica":25,"estornos_profissional":100,"liquido_atual_coorte":375,"clinica_liquida":75,"profissional_liquida":300}'::jsonb,
  'split dinheiro preserva uma linha e snapshots completos');
select pg_temp.f8_assert(
  public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-02-02 03:00Z',pg_temp.f8_id('c1'),
    p_paciente_id=>pg_temp.f8_id('pa1'),p_forma_pagamento=>'pix')#>'{resumo,pagamentos}' =
  '{"dinheiro":200,"pix":300,"cartao_credito":0}'::jsonb,
  'split PIX soma somente componentes sem duplicar producao');
select pg_temp.f8_assert(
  public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-02-02 03:00Z',pg_temp.f8_id('c1'),
    p_paciente_id=>pg_temp.f8_id('pa1'))#>'{resumo,producao}' =
  '{"quantidade":1,"pacientes_distintos":1,"bruto":500,"clinica_bruta":100,"profissional_bruta":400,"estornos_coorte":125,"estornos_clinica":25,"estornos_profissional":100,"liquido_atual_coorte":375,"clinica_liquida":75,"profissional_liquida":300}'::jsonb
  and public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-02-02 03:00Z',pg_temp.f8_id('c1'),
    p_paciente_id=>pg_temp.f8_id('pa1'))#>'{resumo,pagamentos}' =
  '{"dinheiro":200,"pix":300,"cartao_credito":0}'::jsonb,
  'split sem filtro de forma preserva uma linha, snapshots e componentes');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',
 p_paciente_id=>pg_temp.f8_id('pa1'))#>>'{resumo,producao,bruto}')::numeric=600,'filtro paciente');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',
 p_status_recebimento=>'confirmado')#>>'{resumo,producao,bruto}')::numeric=800,'filtro recebimento');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',
 p_status_repasse=>'pendente')#>>'{resumo,producao,bruto}')::numeric=2100,'status de repasse nao altera coorte de producao');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',
 p_status_repasse=>'pendente')#>>'{resumo,repasses,repasses_gerados_periodo}')::integer=1,'status filtra somente repasses gerados no periodo');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',
 p_status_fiscal=>'emissao_solicitada')#>>'{resumo,producao,bruto}')::numeric=100,'solicitacao nao e emissao');
set local timezone='Pacific/Auckland';
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z')->'resumo')=
 (select resultado->'resumo' from f8_resultados where nome='owner'),'metricas e series default independem timezone sessao');
set local timezone='UTC';

select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z',pg_temp.f8_id('c3'))$s$,'42501');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria(null,'2000-03-01 00:00:00Z')$s$,'22023');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-03-01 00:00:00Z','2000-02-01 00:00:00Z')$s$,'22023');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-01-01 00:00:00Z','infinity')$s$,'22023');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-01-01 00:00:00Z','2002-01-01 00:00:00Z')$s$,'22023');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z',p_status_fiscal=>'erro')$s$,'22023');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z',p_timezone=>'Etc/Inexistente')$s$,'22023');

-- Bordas [inicio,fim) e timezone explicitamente controlado, sem depender da
-- timezone da sessao. A mesma paciente deixa os filtros isolados das fixtures.
reset role;
set constraints all deferred;
savepoint f8_bordas_timezone;
create temporary table f8_bordas(nome text primary key,agendamento_id uuid default gen_random_uuid(),
  recebimento_id uuid default gen_random_uuid(),paciente_id uuid default gen_random_uuid(),registrado_em timestamptz,valor numeric) on commit drop;
grant select on f8_bordas to authenticated;
insert into f8_bordas(nome,registrado_em,valor) values
 ('antes_inicio','2000-02-01 02:59:59Z',10),('inicio','2000-02-01 03:00:00Z',20),
 ('antes_fim','2000-03-01 02:59:59Z',30),('fim','2000-03-01 03:00:00Z',40),
 ('timezone','2000-02-02 01:30:00Z',50);
insert into public.pacientes(id,clinica_id,nome_completo)
select paciente_id,pg_temp.f8_id('c1'),'FASE8 BORDA '||nome from f8_bordas;
insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,created_by)
select agendamento_id,pg_temp.f8_id('c1'),paciente_id,pg_temp.f8_id('pa'),
  (registrado_em at time zone 'America/Bahia')::date,('10:00'::time + (row_number() over(order by nome)*31||' minutes')::interval)::time,
  ('10:30'::time + (row_number() over(order by nome)*31||' minutes')::interval)::time,'confirmado',pg_temp.f8_id('owner') from f8_bordas;
insert into public.recebimentos(id,clinica_id,agendamento_id,paciente_id,profissional_id,sessao_caixa_id,
 valor_bruto,percentual_clinica,valor_clinica,valor_profissional,idempotency_key,registrado_por,registrado_em)
select recebimento_id,pg_temp.f8_id('c1'),agendamento_id,paciente_id,pg_temp.f8_id('pa'),pg_temp.f8_id('sa'),
 valor,20,valor/5,valor*4/5,'f8-borda-'||recebimento_id,pg_temp.f8_id('owner'),registrado_em from f8_bordas;
insert into public.recebimentos_pagamentos(recebimento_id,forma_pagamento,valor)
select recebimento_id,'pix',valor from f8_bordas;
set constraints all immediate;
set local role authenticated;
select pg_temp.f8_login('owner');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00:00Z','2000-03-01 03:00:00Z',
 p_clinica_id=>pg_temp.f8_id('c1'),p_paciente_id=>(select paciente_id from f8_bordas where nome='inicio'))#>>'{resumo,producao,bruto}')::numeric=20,
 'inicio exato entra');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-03-01 03:00:00Z','2000-03-01 03:01:00Z',
 p_clinica_id=>pg_temp.f8_id('c1'),p_paciente_id=>(select paciente_id from f8_bordas where nome='fim'))#>>'{resumo,producao,bruto}')::numeric=40,
 'fim exato pertence ao proximo intervalo');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00:00Z','2000-03-01 03:00:00Z',
 p_clinica_id=>pg_temp.f8_id('c1'),p_paciente_id=>(select paciente_id from f8_bordas where nome='antes_inicio'))#>>'{resumo,producao,bruto}')::numeric=0,
 'instante imediatamente antes do inicio excluido');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-02 00:00:00Z','2000-02-03 00:00:00Z',
 p_clinica_id=>pg_temp.f8_id('c1'),p_paciente_id=>(select paciente_id from f8_bordas where nome='timezone'),p_timezone=>'America/Bahia')#>>'{resumo,series,0,dia}')='2000-02-01',
 'serie America Bahia converte meia noite explicitamente');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-02 00:00:00Z','2000-02-03 00:00:00Z',
 p_clinica_id=>pg_temp.f8_id('c1'),p_paciente_id=>(select paciente_id from f8_bordas where nome='timezone'),p_timezone=>'UTC')#>>'{resumo,series,0,dia}')='2000-02-02',
 'serie UTC difere apenas por timezone solicitado');
rollback to savepoint f8_bordas_timezone;
release savepoint f8_bordas_timezone;

-- Configuracao: erro atomico, no-op idempotente e auditoria por mudanca.
set local role authenticated;
select pg_temp.f8_login('owner');
select pg_temp.f8_erro($s$select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{"caixa_atencao":-0.001}')$s$,'23514');
select pg_temp.f8_erro($s$select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{"caixa_atencao":0.001}')$s$,'23514');
select pg_temp.f8_erro($s$select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{"caixa_atencao":10,"caixa_critico":5}')$s$,'23514');
select pg_temp.f8_erro($s$select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{"caixa_atencao":"NaN"}')$s$,'22023');
select pg_temp.f8_erro($s$select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{"intruso":5}')$s$,'22023');
select pg_temp.f8_erro($s$select public.financeiro_configurar_alertas(pg_temp.f8_id('c3'),'{}')$s$,'42501');
select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{"caixa_atencao":5,"caixa_critico":10,"repasse_dias_atencao":1,"repasse_dias_critico":2,"fiscal_dias_atencao":1,"fiscal_dias_critico":2,"estornos_percentual_atencao":5,"estornos_percentual_critico":10}');
select public.financeiro_configurar_alertas(pg_temp.f8_id('c2'),'{"caixa_atencao":5,"caixa_critico":10,"repasse_dias_atencao":1,"repasse_dias_critico":2,"fiscal_dias_atencao":1,"fiscal_dias_critico":2,"estornos_percentual_atencao":10,"estornos_percentual_critico":20}');
select pg_temp.f8_assert(public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{"caixa_atencao":5}')->>'alterado'='false','retry sem nova auditoria');
select pg_temp.f8_assert((select count(*) from public.eventos_auditoria_financeira where clinica_id in(pg_temp.f8_id('c1'),pg_temp.f8_id('c2')) and acao='configurar_alertas_financeiros')=2,'duas alteracoes duas auditorias');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z')->>'alertas_total')::integer>2,'thresholds adicionam alertas sem duplicar erro fiscal');
select pg_temp.f8_erro($s$update public.configuracoes_alertas_financeiros set caixa_atencao=0$s$,'42501');

-- Medico A: producao, pacientes e repasses exclusivos; nao aceita outro ID.
select pg_temp.f8_login('med_a');
insert into f8_resultados values('med_a',public.financeiro_dashboard_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z'));
do $$ declare j jsonb; begin
 select resultado into j from f8_resultados where nome='med_a';
 perform pg_temp.f8_assert((j#>>'{resumo,producao,bruto}')::numeric=1100 and (j#>>'{resumo,producao,pacientes_distintos}')::integer=2 and
   (j#>>'{resumo,producao,profissional_liquida}')::numeric=740,'medico A somente A');
 perform pg_temp.f8_assert(jsonb_array_length(j#>'{resumo,lista_repasses}')=3 and
   (j#>>'{resumo,repasses,valor_repasses_pagos_periodo}')::numeric=400,'lista repasses A');
 perform pg_temp.f8_assert(not ((j->'resumo') ?| array['caixa','fiscal','alertas','auditoria','por_profissional']),'sem dominio administrativo');
end; $$;
select pg_temp.f8_erro($s$select public.financeiro_dashboard_profissional('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z',pg_temp.f8_id('c3'))$s$,'42501');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z')$s$,'42501');
select pg_temp.f8_erro($s$select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{}')$s$,'42501');
select pg_temp.f8_assert((select count(*) from public.configuracoes_alertas_financeiros)=0,'RLS config medico');
select pg_temp.f8_login('med_b');
select pg_temp.f8_assert((public.financeiro_dashboard_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z')#>>'{resumo,producao,bruto}')::numeric=1000,'B nao ve A nem terceira clinica');
select pg_temp.f8_assert((public.financeiro_dashboard_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z')#>>'{resumo,repasses,valor_repasses_pagos_periodo}')::numeric=720,'B somente proprio repasse');
select pg_temp.f8_assert((public.financeiro_dashboard_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z')#>>'{resumo,producao,pacientes_distintos}')::integer=2,'B somente pacientes proprios');
select pg_temp.f8_assert((public.financeiro_dashboard_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z',pg_temp.f8_id('c1'))#>>'{resumo,producao,bruto}')::numeric=0,'clinica vinculada sem producao propria');
select pg_temp.f8_login('recepcao');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z')$s$,'42501');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_profissional('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z')$s$,'42501');
select pg_temp.f8_erro($s$select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{}')$s$,'42501');
select pg_temp.f8_assert((select count(*) from public.configuracoes_alertas_financeiros)=0,'RLS config recepcao');
select pg_temp.f8_login('estranho');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z')$s$,'42501');
select pg_temp.f8_login(null);
select pg_temp.f8_erro($s$select public.financeiro_dashboard_profissional('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z')$s$,'42501');
reset role;
set local role anon;
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z')$s$,'42501');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_profissional('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z')$s$,'42501');
select pg_temp.f8_erro($s$select * from public.configuracoes_alertas_financeiros$s$,'42501');
reset role;

-- Um mesmo paciente em dois profissionais: distintos no total nao e soma.
savepoint paciente_compartilhado;
set constraints all deferred;
insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,created_by)
values(pg_temp.f8_id('a0'),pg_temp.f8_id('c1'),pg_temp.f8_id('pa1'),pg_temp.f8_id('pb'),
 '2000-02-27','09:00','09:30','confirmado',pg_temp.f8_id('owner'));
insert into public.recebimentos(id,clinica_id,agendamento_id,paciente_id,profissional_id,sessao_caixa_id,
 valor_bruto,percentual_clinica,valor_clinica,valor_profissional,idempotency_key,registrado_por,registrado_em)
values(pg_temp.f8_id('a0'),pg_temp.f8_id('c1'),pg_temp.f8_id('a0'),pg_temp.f8_id('pa1'),pg_temp.f8_id('pb'),pg_temp.f8_id('sa'),
 100,20,20,80,'f8-compartilhado-'||gen_random_uuid(),pg_temp.f8_id('owner'),'2000-02-27 12:00Z');
insert into public.recebimentos_pagamentos(recebimento_id,forma_pagamento,valor) values(pg_temp.f8_id('a0'),'dinheiro',100);
set constraints all immediate;
set local role authenticated;
select pg_temp.f8_login('owner');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z')#>>'{resumo,producao,pacientes_distintos}')::integer=4,'paciente comum contado uma vez no total');
select pg_temp.f8_login('med_b');
select pg_temp.f8_assert((public.financeiro_dashboard_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z')#>>'{resumo,producao,pacientes_distintos}')::integer=3,'medico B ve pacientes da propria producao inclusive comum');
reset role;
rollback to savepoint paciente_compartilhado;
release savepoint paciente_compartilhado;

-- Escopo interno tambem nao pode ser chamado diretamente pelo cliente.
set local role authenticated;
select pg_temp.f8_login('owner');
select pg_temp.f8_erro($s$select * from private.financeiro_dashboard_escopo(null,false)$s$,'42501');
select pg_temp.f8_assert((select count(*) from public.configuracoes_alertas_financeiros)=2,'proprietaria le somente duas configuracoes');
select pg_temp.f8_erro($s$select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{"repasse_dias_atencao":1.5}')$s$,'22023');
select pg_temp.f8_erro($s$select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{"estornos_percentual_critico":101}')$s$,'23514');
select public.financeiro_configurar_alertas(pg_temp.f8_id('c1'),'{"estornos_percentual_atencao":null,"estornos_percentual_critico":null}');
select pg_temp.f8_assert(not exists(select 1 from jsonb_array_elements(public.financeiro_dashboard_proprietaria(
 '2000-02-01 03:00Z','2000-03-01 03:00Z',pg_temp.f8_id('c1'))->'alertas') a where a->>'tipo'='percentual_estornos'),'NULL desativa ratio');
reset role;

-- Usuario e vinculos inativos sao verificados mesmo sob SECURITY DEFINER.
update public.usuarios set ativo=false where id=pg_temp.f8_id('med_a');
set local role authenticated;
select pg_temp.f8_login('med_a');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_profissional('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z')$s$,'42501');
reset role;
update public.usuarios set ativo=true where id=pg_temp.f8_id('med_a');
update public.profissionais_clinicas set ativo=false where profissional_id=pg_temp.f8_id('pa') and clinica_id=pg_temp.f8_id('c1');
set local role authenticated;
select pg_temp.f8_erro($s$select public.financeiro_dashboard_profissional('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z',pg_temp.f8_id('c1'))$s$,'42501');
reset role;
update public.profissionais_clinicas set ativo=true where profissional_id=pg_temp.f8_id('pa') and clinica_id=pg_temp.f8_id('c1');
update public.usuarios_clinicas set ativo=false where usuario_id=pg_temp.f8_id('med_a') and clinica_id=pg_temp.f8_id('c1');
set local role authenticated;
select pg_temp.f8_erro($s$select public.financeiro_dashboard_profissional('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z',pg_temp.f8_id('c1'))$s$,'42501');
reset role;
update public.usuarios_clinicas set ativo=false where usuario_id=pg_temp.f8_id('owner') and clinica_id=pg_temp.f8_id('c2');
set local role authenticated;
select pg_temp.f8_login('owner');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_proprietaria('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z',pg_temp.f8_id('c2'))$s$,'42501');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z')->>'clinicas_total')::integer=1,'consolidado exclui vinculo inativo');
reset role;

-- Ausencia e ambiguidade de profissional ativo nunca escolhem LIMIT 1.
update public.profissionais set ativo=false where id=pg_temp.f8_id('pa');
set local role authenticated;
select pg_temp.f8_login('med_a');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_profissional('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z')$s$,'42501');
reset role;
update public.profissionais set ativo=true where id=pg_temp.f8_id('pa');
insert into public.profissionais(id,nome_completo,usuario_id,valor_consulta,taxa_repasse_clinica)
values(pg_temp.f8_id('pa_dup'),'FASE8 MEDICO A DUPLICADO',pg_temp.f8_id('med_a'),1,1);
set local role authenticated;
select pg_temp.f8_login('med_a');
select pg_temp.f8_erro($s$select public.financeiro_dashboard_profissional('2000-02-01 00:00:00Z','2000-03-01 00:00:00Z')$s$,'42501');
reset role;

-- Exclusao legada real por estrutura: UUID conhecido e fixture temporaria usam
-- somente entradas_caixa; a RPC nao possui UUID hardcoded.
do $$
declare s public.sessoes_caixa%rowtype; j jsonb; v_count bigint; v_sum bigint;
begin
 select * into s from public.sessoes_caixa where id='a4a18e49-6634-4058-9fd8-07f3b065fd63';
 if found then
   j:=private.financeiro_dashboard_administrativo(s.aberto_em-interval '1 hour',s.aberto_em+interval '1 hour',
     array[s.clinica_id],null,null,null,null,null,null);
   select count(*) into v_count from public.sessoes_caixa c where c.clinica_id=s.clinica_id
     and c.status in ('aberto','em_fechamento','aguardando_aprovacao','devolvido_para_correcao')
     and not exists(select 1 from public.entradas_caixa e where e.sessao_caixa_id=c.id);
   select sum((j#>>array['caixa','situacao_operacional_atual',k])::bigint) into v_sum from unnest(array[
     'aberto','em_fechamento','aguardando_aprovacao','devolvido_para_correcao']) k;
   perform pg_temp.f8_assert(v_count=v_sum,'sessao legada nao contada em sua propria janela');
 else
   raise notice 'Sessao legada nao existe neste ambiente: teste real da exclusao pendente; demais fixtures nao dependem dela.';
 end if;
end;
$$;
set local role authenticated;
select pg_temp.f8_login('owner');
select pg_temp.f8_assert((public.financeiro_dashboard_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',pg_temp.f8_id('c1'))
  #>>'{resumo,caixa,situacao_operacional_atual,aberto}')::integer=1,'segunda sessao com entradas tambem excluida estruturalmente');
reset role;

-- EXPLAIN da RPC isolada nao mostra os planos internos; estes representam seus agregados.
create temporary table f8_explain(nome text primary key,plano jsonb) on commit drop;
do $$ declare v_plano jsonb; begin
 execute $q$explain (analyze,buffers,format json)
  select r.clinica_id,sum(r.valor_bruto),sum(r.valor_bruto-coalesce(e.total,0))
  from public.recebimentos r left join lateral (select sum(e.valor_total) total from public.estornos e
    where e.recebimento_id=r.id and e.status='efetivado') e on true
  where r.clinica_id in(pg_temp.f8_id('c1'),pg_temp.f8_id('c2')) and r.registrado_em>='2000-02-01 03:00Z' and r.registrado_em<'2000-03-01 03:00Z'
  group by r.clinica_id$q$ into v_plano;
 insert into f8_explain values('producao_estornos',v_plano);
 execute $q$explain (analyze,buffers,format json)
  select r.clinica_id,r.profissional_id,r.status,sum(r.valor_liquido) from public.repasses r
  where r.clinica_id in(pg_temp.f8_id('c1'),pg_temp.f8_id('c2')) and r.gerado_em>='2000-02-01 03:00Z' and r.gerado_em<'2000-03-01 03:00Z'
  group by r.clinica_id,r.profissional_id,r.status$q$ into v_plano;
 insert into f8_explain values('repasses',v_plano);
end $$;
select pg_temp.f8_assert((select sessao from f8_legado) is not distinct from
 (select to_jsonb(s) from public.sessoes_caixa s where s.id='a4a18e49-6634-4058-9fd8-07f3b065fd63'),'sessao legada integralmente preservada');
select pg_temp.f8_assert((select entradas from f8_legado)=(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]') from public.entradas_caixa e
 where e.sessao_caixa_id='a4a18e49-6634-4058-9fd8-07f3b065fd63'),'entradas legadas integralmente preservadas');
select nome,plano from f8_explain order by nome;
rollback;
