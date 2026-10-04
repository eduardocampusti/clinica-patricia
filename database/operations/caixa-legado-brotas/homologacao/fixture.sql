-- EXCLUSIVAMENTE no cluster temporário marcado; chamada pelo harness validado.
-- Auth abaixo é só tabela auxiliar de FK local, sem GoTrue/login/identidades reais.
begin;
set local client_min_messages='warning';
do $$ declare r record; begin
 if current_database() not like 'homolog_legado_%' or nullif(current_setting('homologacao.caixa_legado',true),'') is null then raise exception 'Banco não isolado'; end if;
 for r in select c.oid::regclass nome from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.oid loop
  execute format('truncate table %s restart identity cascade',r.nome);
 end loop;
 truncate auth.users cascade;
end $$;
insert into auth.users(id) values ('33333333-3333-4333-8333-333333333333'),('88888888-8888-4888-8888-888888888888');
insert into public.clinicas(id,nome,cidade,subdomain) values
 ('11111111-1111-4111-8111-111111111111','Clínica Sintética A','Cidade de Teste','brotas'),
 ('55555555-5555-4555-8555-555555555555','Clínica Sintética B','Cidade de Teste','ipupiara');
insert into public.usuarios(id,nome_completo) values
 ('33333333-3333-4333-8333-333333333333','Responsável Sintético'),('88888888-8888-4888-8888-888888888888','Operador Sintético');
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel) values
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','proprietaria'),
 ('88888888-8888-4888-8888-888888888888','11111111-1111-4111-8111-111111111111','recepcao');
insert into public.pacientes(id,clinica_id,nome_completo) values ('77777777-7777-4777-8777-777777777777','11111111-1111-4111-8111-111111111111','Pessoa Sintética');
insert into public.profissionais(id,nome_completo) values ('66666666-6666-4666-8666-666666666666','Profissional Sintético');
insert into public.profissionais_clinicas(profissional_id,clinica_id) values ('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111');
set local request.jwt.claim.sub='88888888-8888-4888-8888-888888888888';
insert into public.sessoes_caixa(id,clinica_id,aberto_por,valor_abertura,aberto_em) values
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','88888888-8888-4888-8888-888888888888',150.50,'2026-08-03T17:55:38.40657Z');
insert into public.entradas_caixa(id,sessao_caixa_id,clinica_id,forma_pagamento,valor,paciente_id,profissional_id) values
 ('99999999-9999-4999-8999-999999999999','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','pix',85.90,'77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666');
set local request.jwt.claim.sub='';
delete from public.entradas_caixa where id='99999999-9999-4999-8999-999999999999';
set local request.jwt.claim.sub='88888888-8888-4888-8888-888888888888';
insert into public.entradas_caixa(id,sessao_caixa_id,clinica_id,forma_pagamento,valor,paciente_id,profissional_id,registrado_em) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','dinheiro',500,'77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666','2026-08-04T10:56:26Z'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','dinheiro',500,'77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666','2026-08-05T11:08:27Z');
set local request.jwt.claim.sub='';
update public.sessoes_caixa set status='fechado',fechado_em='2026-08-05T11:19:24Z',fechado_por='88888888-8888-4888-8888-888888888888' where id='22222222-2222-4222-8222-222222222222';
update public.sessoes_caixa set status='aberto',fechado_em=null,fechado_por=null where id='22222222-2222-4222-8222-222222222222';
commit;
