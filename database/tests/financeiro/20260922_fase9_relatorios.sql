-- FASE 9: roteiro transacional para executar somente apos aplicacao autorizada.
-- Requer executor postgres autorizado. Aborta ao primeiro erro e termina em ROLLBACK.
-- Todos os nomes e valores sao sinteticos; nenhum dado real e exportado.

begin;
set local statement_timeout = '120s';
set local timezone = 'UTC';

create temporary table f9_ids(nome text primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into f9_ids(nome) select unnest(array[
  'owner','med_a','med_b','recepcao','estranho',
  'ca','cb','cc','pa','pb','pac_a1','pac_a2','pac_b1','pac_c1',
  'sa','sb','sc','fa','fb','fc','r0','r1','r2','r3','r4','r5','e1','qold','qnew','qb'
]);

create function pg_temp.f9_id(p_nome text) returns uuid language sql stable as
  'select id from pg_temp.f9_ids where nome = p_nome';
create function pg_temp.f9_assert(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FASE9: %', p_label; end if;
end;
$$;
create function pg_temp.f9_login(p_nome text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(pg_temp.f9_id(p_nome)::text, ''), true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', pg_temp.f9_id(p_nome), 'role', 'authenticated')::text, true);
end;
$$;
create function pg_temp.f9_erro(p_sql text, p_code text) returns void language plpgsql as $$
declare v_code text;
begin
  begin execute p_sql;
  exception when others then get stacked diagnostics v_code = returned_sqlstate; end;
  if v_code is distinct from p_code then
    raise exception 'FASE9: esperado %, encontrado % em %', p_code, v_code, p_sql;
  end if;
end;
$$;
grant select on f9_ids to authenticated, anon;

insert into auth.users(id) select id from f9_ids where nome in ('owner','med_a','med_b','recepcao','estranho');
insert into public.usuarios(id,nome_completo)
select id, 'FASE9 TESTE ' || nome from f9_ids
where nome in ('owner','med_a','med_b','recepcao','estranho') on conflict(id) do nothing;

insert into public.clinicas(id,nome,cidade,subdomain)
select id, 'FASE9 CLINICA ' || upper(nome), 'SINTETICA', 'f9-' || id::text
from f9_ids where nome in ('ca','cb','cc');

insert into public.usuarios_clinicas(usuario_id,clinica_id,papel)
select pg_temp.f9_id(x.usuario), pg_temp.f9_id(x.clinica), x.papel::public.papel_usuario
from (values
  ('owner','ca','proprietaria'),('owner','cb','proprietaria'),
  ('med_a','ca','medico'),('med_a','cb','medico'),('med_b','ca','medico'),
  ('recepcao','ca','recepcao')
) x(usuario,clinica,papel);

insert into public.profissionais(id,nome_completo,usuario_id,valor_consulta,taxa_repasse_clinica)
values
  (pg_temp.f9_id('pa'),'FASE9 MEDICO A',pg_temp.f9_id('med_a'),500,20),
  (pg_temp.f9_id('pb'),'FASE9 MEDICO B',pg_temp.f9_id('med_b'),300,20);
insert into public.profissionais_clinicas(profissional_id,clinica_id,valor_consulta)
values
  (pg_temp.f9_id('pa'),pg_temp.f9_id('ca'),500),
  (pg_temp.f9_id('pa'),pg_temp.f9_id('cb'),400),
  (pg_temp.f9_id('pa'),pg_temp.f9_id('cc'),900),
  (pg_temp.f9_id('pb'),pg_temp.f9_id('ca'),300);

-- Banco financeiro vazio: payloads estaveis antes das fixtures de producao.
set local role authenticated;
select pg_temp.f9_login('owner');
do $$
declare j jsonb;
begin
  j:=public.financeiro_relatorio_recebimentos_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z');
  perform pg_temp.f9_assert(j->'itens'='[]'::jsonb,'proprietaria vazia retorna array vazio');
  perform pg_temp.f9_assert(j#>'{totais}' @> '{"quantidade":0,"bruto":0,"estornado":0,"liquido_atual":0}'::jsonb,'proprietaria vazia retorna totais zero');
  perform pg_temp.f9_assert(length(j->>'contexto')=32 and length(j->>'marcador')=32,'proprietaria vazia retorna contexto e marcador');

  perform pg_temp.f9_login('med_a');
  j:=public.financeiro_relatorio_recebimentos_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z');
  perform pg_temp.f9_assert(j->'itens'='[]'::jsonb and j#>>'{totais,quantidade}'='0','medico vazio retorna estrutura estavel');
  j:=public.financeiro_relatorio_repasses_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z',p_evento=>'pendentes_atuais');
  perform pg_temp.f9_assert(j->'itens'='[]'::jsonb and j#>>'{totais,quantidade}'='0','repasses do medico vazios retornam estrutura estavel');
end;
$$;
reset role;

insert into public.pacientes(id,clinica_id,nome_completo)
values
  (pg_temp.f9_id('pac_a1'),pg_temp.f9_id('ca'),'FASE9 PACIENTE A1'),
  (pg_temp.f9_id('pac_a2'),pg_temp.f9_id('ca'),'FASE9 PACIENTE A2'),
  (pg_temp.f9_id('pac_b1'),pg_temp.f9_id('cb'),'FASE9 PACIENTE B1'),
  (pg_temp.f9_id('pac_c1'),pg_temp.f9_id('cc'),'FASE9 PACIENTE C1');

insert into public.sessoes_caixa(id,clinica_id,aberto_por,valor_abertura,aberto_em,status,idempotency_key)
values
  (pg_temp.f9_id('sa'),pg_temp.f9_id('ca'),pg_temp.f9_id('owner'),0,'2000-01-01 00:00Z','aprovado','f9-sa'),
  (pg_temp.f9_id('sb'),pg_temp.f9_id('cb'),pg_temp.f9_id('owner'),0,'2000-01-01 00:00Z','aprovado','f9-sb'),
  (pg_temp.f9_id('sc'),pg_temp.f9_id('cc'),pg_temp.f9_id('owner'),0,'2000-01-01 00:00Z','aprovado','f9-sc');

insert into public.fechamentos_caixa(
  id,clinica_id,sessao_caixa_id,tentativa,idempotency_key,valor_abertura,total_dinheiro,total_pix,
  total_cartao_credito,total_recebimentos_brutos,total_suprimentos,total_sangrias,valor_esperado,
  valor_contado,diferenca,total_clinica,total_profissionais,status,enviado_por,enviado_em,
  total_estornos,total_estornos_dinheiro,total_estornos_pix,total_estornos_cartao_credito,
  estornos_valor_clinica,estornos_valor_profissionais
)
select pg_temp.f9_id(x.f),pg_temp.f9_id(x.c),pg_temp.f9_id(x.s),1,'f9-'||x.f,
  0,0,0,0,0,0,0,0,0,0,0,0,'aprovado',pg_temp.f9_id('owner'),'2000-01-31 00:00Z',0,0,0,0,0,0
from (values ('fa','ca','sa'),('fb','cb','sb'),('fc','cc','sc')) x(f,c,s);

create temporary table f9_receitas(
  r text,c text,p text,pac text,s text,data timestamptz,bruto numeric,status text,fiscal text
) on commit drop;
insert into f9_receitas values
  ('r0','ca','pa','pac_a1','sa','2000-01-30 03:00Z',500,'confirmado','emitida'),
  ('r1','ca','pa','pac_a1','sa','2000-02-01 03:00Z',500,'parcialmente_estornado','emitida'),
  ('r2','cb','pa','pac_b1','sb','2000-02-02 03:00Z',400,'confirmado','pendente'),
  ('r3','ca','pb','pac_a2','sa','2000-02-03 03:00Z',300,'confirmado','erro_emissao'),
  ('r4','cc','pa','pac_c1','sc','2000-02-04 03:00Z',900,'confirmado','pendente'),
  ('r5','ca','pa','pac_a1','sa','2000-03-01 03:00Z',700,'confirmado','pendente');

insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim,status,created_by)
select pg_temp.f9_id(r),pg_temp.f9_id(c),pg_temp.f9_id(pac),pg_temp.f9_id(p),
  (data at time zone 'America/Bahia')::date,
  ('08:00'::time + row_number() over(order by data) * interval '1 hour')::time,
  ('08:30'::time + row_number() over(order by data) * interval '1 hour')::time,
  'confirmado',pg_temp.f9_id('owner')
from f9_receitas;

insert into public.recebimentos(
  id,clinica_id,agendamento_id,paciente_id,profissional_id,sessao_caixa_id,
  valor_bruto,percentual_clinica,valor_clinica,valor_profissional,status,
  idempotency_key,registrado_por,registrado_em
)
select pg_temp.f9_id(r),pg_temp.f9_id(c),pg_temp.f9_id(r),pg_temp.f9_id(pac),pg_temp.f9_id(p),pg_temp.f9_id(s),
  bruto,20,bruto/5,bruto*4/5,status,'f9-'||r,pg_temp.f9_id('owner'),data
from f9_receitas;

insert into public.recebimentos_pagamentos(recebimento_id,forma_pagamento,valor)
select pg_temp.f9_id(r),case when r in ('r2','r4') then 'pix' else 'cartao_credito' end,bruto
from f9_receitas where r <> 'r1';
insert into public.recebimentos_pagamentos(recebimento_id,forma_pagamento,valor)
values
  (pg_temp.f9_id('r1'),'dinheiro',200),
  (pg_temp.f9_id('r1'),'pix',300);

insert into public.documentos_fiscais(id,clinica_id,recebimento_id,status,criado_por,created_at,updated_at)
select pg_temp.f9_id(r),pg_temp.f9_id(c),pg_temp.f9_id(r),fiscal,pg_temp.f9_id('owner'),data,data
from f9_receitas;

insert into public.estornos(
  id,clinica_id,recebimento_id,valor_total,valor_clinica,valor_profissional,motivo,status,idempotency_key,
  solicitado_por,solicitado_em,revisado_por,revisado_em,efetivado_por,efetivado_em
)
values(
  pg_temp.f9_id('e1'),pg_temp.f9_id('ca'),pg_temp.f9_id('r1'),100,20,80,'FASE9 TESTE','efetivado','f9-e1',
  pg_temp.f9_id('owner'),'2000-02-05 03:00Z',pg_temp.f9_id('owner'),'2000-02-05 03:00Z',
  pg_temp.f9_id('owner'),'2000-02-05 03:00Z'
);
insert into public.estornos_pagamentos(estorno_id,forma_pagamento,valor)
values(pg_temp.f9_id('e1'),'pix',100);

insert into public.repasses(
  id,clinica_id,profissional_id,fechamento_id,sessao_caixa_id,status,
  valor_bruto_profissional,valor_estornos_antes_pagamento,valor_ajustes_aplicados,valor_liquido,
  gerado_por,gerado_em,confirmado_por,confirmado_em,meio_pagamento,confirmacao_idempotency_key
)
values
  (pg_temp.f9_id('qold'),pg_temp.f9_id('ca'),pg_temp.f9_id('pa'),pg_temp.f9_id('fa'),pg_temp.f9_id('sa'),
    'pago',400,0,0,400,pg_temp.f9_id('owner'),'2000-01-31 12:00Z',pg_temp.f9_id('owner'),
    '2000-02-05 12:00Z','pix','f9-qold'),
  (pg_temp.f9_id('qnew'),pg_temp.f9_id('cb'),pg_temp.f9_id('pa'),pg_temp.f9_id('fb'),pg_temp.f9_id('sb'),
    'pendente',320,0,0,320,pg_temp.f9_id('owner'),'2000-02-03 12:00Z',null,null,null,null),
  (pg_temp.f9_id('qb'),pg_temp.f9_id('ca'),pg_temp.f9_id('pb'),pg_temp.f9_id('fa'),pg_temp.f9_id('sa'),
    'pendente',240,0,0,240,pg_temp.f9_id('owner'),'2000-02-04 12:00Z',null,null,null,null);

insert into public.repasses_itens(repasse_id,recebimento_id,valor_profissional_original,valor_estornos_antes_pagamento,valor_liquido)
values
  (pg_temp.f9_id('qold'),pg_temp.f9_id('r0'),400,0,400),
  (pg_temp.f9_id('qnew'),pg_temp.f9_id('r2'),320,0,320),
  (pg_temp.f9_id('qb'),pg_temp.f9_id('r3'),240,0,240);

set constraints all immediate;

-- Grants: somente authenticated executa RPCs publicas; helpers privados ficam fechados.
select pg_temp.f9_assert(
  has_function_privilege('authenticated','public.financeiro_relatorio_recebimentos_proprietaria(timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,integer,timestamptz,uuid,text)','EXECUTE'),
  'authenticated executa relatorio proprietaria'
);
select pg_temp.f9_assert(not has_function_privilege('anon','public.financeiro_relatorio_recebimentos_proprietaria(timestamptz,timestamptz,uuid,uuid,uuid,text,text,text,text,integer,timestamptz,uuid,text)','EXECUTE'), 'anon sem execute');
select pg_temp.f9_assert(not has_function_privilege('authenticated','private.financeiro_relatorio_recebimentos_nucleo(timestamptz,timestamptz,uuid[],uuid,uuid,text,text,text,integer,timestamptz,uuid,text,boolean)','EXECUTE'), 'helper privado sem execute');

create temporary table f9_resultados(nome text primary key, resultado jsonb) on commit drop;
grant select,insert,update on f9_resultados to authenticated;

set local role authenticated;
select pg_temp.f9_login('owner');

insert into f9_resultados values
  ('recebimentos_1',public.financeiro_relatorio_recebimentos_proprietaria(
    '2000-02-01 03:00Z','2000-03-01 03:00Z',p_limite=>1)),
  ('recebimentos_split',public.financeiro_relatorio_recebimentos_proprietaria(
    '2000-02-01 03:00Z','2000-02-02 03:00Z',pg_temp.f9_id('ca'),
    p_forma_pagamento=>'dinheiro')),
  ('repasses_gerados',public.financeiro_relatorio_repasses_proprietaria(
    '2000-02-01 03:00Z','2000-03-01 03:00Z',p_evento=>'gerados_periodo')),
  ('repasses_pagos',public.financeiro_relatorio_repasses_proprietaria(
    '2000-02-01 03:00Z','2000-03-01 03:00Z',p_evento=>'pagos_periodo')),
  ('repasses_pendentes',public.financeiro_relatorio_repasses_proprietaria(
    '2000-02-01 03:00Z','2000-03-01 03:00Z',p_evento=>'pendentes_atuais')),
  ('fiscal',public.financeiro_relatorio_fiscal_proprietaria(
    '2000-02-01 03:00Z','2000-03-01 03:00Z'));

do $$
declare j jsonb; j2 jsonb; c jsonb;
begin
  select resultado into j from f9_resultados where nome='recebimentos_1';
  perform pg_temp.f9_assert(j#>>'{totais,quantidade}'='3','total consolidado exclui clinica C e fim exclusivo');
  perform pg_temp.f9_assert((j#>>'{totais,bruto}')::numeric=1200,'bruto sem duplicar split');
  perform pg_temp.f9_assert((j#>>'{totais,estornado}')::numeric=100 and (j#>>'{totais,liquido_atual}')::numeric=1100,'estorno e liquido atuais');
  perform pg_temp.f9_assert(jsonb_array_length(j->'itens')=1 and (j#>>'{pagina,tem_mais}')::boolean,'primeira pagina limitada');
  c:=j#>'{pagina,proximo_cursor}';
  j2:=public.financeiro_relatorio_recebimentos_proprietaria(
    '2000-02-01 03:00Z','2000-03-01 03:00Z',p_limite=>1,
    p_cursor_data=>(c->>'data')::timestamptz,p_cursor_id=>(c->>'id')::uuid,
    p_cursor_contexto=>c->>'contexto');
  perform pg_temp.f9_assert(jsonb_array_length(j2->'itens')=1 and j2->'itens'<>j->'itens','cursor estavel sem repeticao');
  perform pg_temp.f9_assert(j2->>'contexto'=j->>'contexto' and j2->>'marcador'=j->>'marcador' and j2->'totais'=j->'totais','paginas mantem contexto, marcador e totais');

  select resultado into j from f9_resultados where nome='recebimentos_split';
  perform pg_temp.f9_assert(j#>'{totais}' @> '{"quantidade":1,"bruto":500,"clinica_bruta":100,"profissional_bruta":400,"estornado":100,"liquido_atual":400,"dinheiro":200,"pix":300}'::jsonb,'split preserva snapshots e componentes');
  perform pg_temp.f9_assert(not ((j->'itens'->0)::text ~* 'uuid|cpf'),'payload visivel sem identificador tecnico ou CPF');

  select resultado into j from f9_resultados where nome='repasses_gerados';
  perform pg_temp.f9_assert(j#>>'{totais,quantidade}'='2' and (j#>>'{totais,valor_liquido}')::numeric=560,'repasses gerados por gerado_em');
  select resultado into j from f9_resultados where nome='repasses_pagos';
  perform pg_temp.f9_assert(j#>>'{totais,quantidade}'='1' and (j#>>'{totais,valor_liquido}')::numeric=400,'repasse antigo pago no periodo');
  select resultado into j from f9_resultados where nome='repasses_pendentes';
  perform pg_temp.f9_assert(j#>>'{totais,quantidade}'='2' and (j#>>'{totais,valor_liquido}')::numeric=560,'pendencias atuais independem do periodo');

  select resultado into j from f9_resultados where nome='fiscal';
  perform pg_temp.f9_assert(j#>>'{totais,quantidade}'='3','fiscal segue coorte autorizada');
  perform pg_temp.f9_assert((j#>>'{totais,por_status,emitida}')::integer=1 and (j#>>'{totais,por_status,pendente}')::integer=1 and (j#>>'{totais,por_status,erro_emissao}')::integer=1,'estados fiscais exatos');
end;
$$;

-- Auditoria registra pedido, nao sucesso, uma linha por clinica autorizada.
do $$
declare antes bigint; depois bigint; resposta jsonb;
begin
  select count(*) into antes from public.eventos_auditoria_financeira where acao='solicitar_exportacao_financeira';
  resposta:=public.financeiro_registrar_solicitacao_exportacao(
    'proprietaria','financeiro_consolidado','pdf','2000-02-01 03:00Z','2000-03-01 03:00Z',null,
    '{"timezone":"America/Bahia","clinica_filtrada":false}'::jsonb
  );
  select count(*) into depois from public.eventos_auditoria_financeira
  where acao='solicitar_exportacao_financeira' and entidade_id=(resposta->>'solicitacao_id')::uuid;
  perform pg_temp.f9_assert(depois=2,'solicitacao consolidada auditada nas duas clinicas');
  perform pg_temp.f9_assert(not exists(
    select 1 from public.eventos_auditoria_financeira
    where entidade_id=(resposta->>'solicitacao_id')::uuid and dados->>'resultado'<>'nao_registrado'
  ),'auditoria nao afirma sucesso da geracao');
  perform pg_temp.f9_assert(antes+2=(select count(*) from public.eventos_auditoria_financeira where acao='solicitar_exportacao_financeira'),'sem auditoria duplicada');
end;
$$;

select pg_temp.f9_erro($s$select public.financeiro_registrar_solicitacao_exportacao(
  'proprietaria','recebimentos','xlsx','2000-02-01 03:00Z','2000-03-01 03:00Z',null,
  '{"forma_pagamento":"=1+1"}'::jsonb
)$s$,'22023');

-- Medico: identidade interna, somente proprio universo e sem fiscal.
select pg_temp.f9_login('med_a');
do $$
declare j jsonb;
begin
  j:=public.financeiro_relatorio_recebimentos_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z');
  perform pg_temp.f9_assert(j#>>'{totais,quantidade}'='2' and (j#>>'{totais,bruto}')::numeric=900,'medico A ve somente A');
  perform pg_temp.f9_assert(not ((j->'itens')::text ~* 'status_fiscal|FASE9 MEDICO B'),'medico sem fiscal ou outro profissional');
  j:=public.financeiro_relatorio_repasses_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z',p_evento=>'pagos_periodo');
  perform pg_temp.f9_assert(j#>>'{totais,quantidade}'='1','medico ve proprio repasse pago no periodo');
  j:=public.financeiro_relatorio_repasses_profissional('1990-01-01 03:00Z','1990-02-01 03:00Z',p_evento=>'pendentes_atuais');
  perform pg_temp.f9_assert(j#>>'{totais,quantidade}'='1' and (j#>>'{totais,valor_liquido}')::numeric=320,'medico distingue pendencia atual do evento no periodo');
end;
$$;

select pg_temp.f9_login('recepcao');
select pg_temp.f9_erro($s$select public.financeiro_relatorio_recebimentos_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z')$s$,'42501');
select pg_temp.f9_erro($s$select public.financeiro_relatorio_recebimentos_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z')$s$,'42501');
select pg_temp.f9_login('owner');
select pg_temp.f9_erro($s$select public.financeiro_relatorio_recebimentos_profissional('2000-02-01 03:00Z','2000-03-01 03:00Z')$s$,'42501');
select pg_temp.f9_erro(format($s$select public.financeiro_relatorio_recebimentos_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',%L)$s$,pg_temp.f9_id('cc')),'42501');
select pg_temp.f9_erro($s$select public.financeiro_relatorio_recebimentos_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',p_limite=>0)$s$,'22023');
select pg_temp.f9_erro($s$select public.financeiro_relatorio_recebimentos_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',p_timezone=>'Timezone/Invalida')$s$,'22023');
select pg_temp.f9_erro($s$select public.financeiro_relatorio_recebimentos_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',p_limite=>1,p_cursor_data=>'2000-02-02 03:00Z',p_cursor_id=>'00000000-0000-0000-0000-000000000001',p_cursor_contexto=>'contexto-adulterado')$s$,'22023');
select pg_temp.f9_erro($s$select public.financeiro_relatorio_repasses_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z',p_evento=>'invalido')$s$,'22023');

reset role;
set local role anon;
select pg_temp.f9_erro($s$select public.financeiro_relatorio_recebimentos_proprietaria('2000-02-01 03:00Z','2000-03-01 03:00Z')$s$,'42501');
reset role;

-- O ROLLBACK remove todas as fixtures, inclusive auditorias de solicitacao.
rollback;
