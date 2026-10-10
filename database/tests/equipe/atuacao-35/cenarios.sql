-- PostgreSQL local isolado, esquema mínimo fictício. Nunca executar no principal.
insert into usuarios values('10000000-0000-4000-8000-000000000001',true),('10000000-0000-4000-8000-000000000002',true),('10000000-0000-4000-8000-000000000003',true);
insert into clinicas values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true,'brotas'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true,'ipupiara');
insert into usuarios_clinicas values('10000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true,'proprietaria'),('10000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true,'proprietaria'),('10000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true,'proprietaria'),('10000000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true,'recepcao');
insert into profissionais values('20000000-0000-4000-8000-000000000001',true,30,'2026-10-06 10:00Z');
insert into equipe_membros values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','profissional_saude',true);
insert into equipe_membros_clinicas values('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true),('30000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
insert into profissionais_clinicas values('20000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true,180,'2026-10-06 10:00Z'),('20000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true,240,'2026-10-06 10:00Z');
insert into configuracoes_financeiras_clinica values(gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',20,'2026-09-20',null),(gen_random_uuid(),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',25,'2026-09-20',null);
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
set role authenticated;
select set_config('test.actor','10000000-0000-4000-8000-000000000001',false);
do $$ declare a jsonb;b jsonb; begin
 a:=equipe_atuacao_obter('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 b:=equipe_atuacao_obter('30000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 if a->>'valor_consulta'<>'180' or b->>'valor_consulta'<>'240' or a->>'percentual_clinica'<>'20' or b->>'percentual_clinica'<>'25' then raise exception 'isolamento falhou';end if;
 if a->'servicos_vinculados'<>'null'::jsonb or a->'horarios'<>'[]'::jsonb then raise exception 'ausência incorreta';end if;
 a:=equipe_atuacao_salvar('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','preco',199.90,(a->>'vinculo_atualizado_em')::timestamptz);
 if a->>'valor_consulta'<>'199.90' then raise exception 'preço não persistiu';end if;
 b:=equipe_atuacao_obter('30000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 if b->>'valor_consulta'<>'240' then raise exception 'outra clínica alterada';end if;
 begin perform equipe_atuacao_salvar('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','preco',210,'2026-10-06 10:00Z');raise exception 'conflito aceito';exception when sqlstate 'PT409' then null;end;
 a:=equipe_atuacao_salvar('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','duracao',40,(a->>'profissional_atualizado_em')::timestamptz);
 b:=equipe_atuacao_obter('30000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 if b->>'duracao_minutos'<>'40' then raise exception 'duração global não persistiu';end if;
 raise notice 'PASS: fontes, isolamento, ausência, preço persistido, conflito e duração global';
end $$;
select set_config('test.actor','10000000-0000-4000-8000-000000000002',false);
do $$ declare a jsonb; begin
 a:=equipe_atuacao_obter('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 if (a->>'pode_editar_duracao')::boolean then raise exception 'admin parcial editou global';end if;
 begin perform equipe_atuacao_obter('30000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');raise exception 'clínica indevida aceita';exception when insufficient_privilege then null;end;
 begin perform equipe_atuacao_salvar('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','duracao',35,(a->>'profissional_atualizado_em')::timestamptz);raise exception 'global indevido aceito';exception when insufficient_privilege then null;end;
 raise notice 'PASS: clínica e duração global negadas ao admin parcial';
end $$;
select set_config('test.actor','10000000-0000-4000-8000-000000000003',false);
do $$ begin
 begin perform equipe_atuacao_obter('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');raise exception 'recepção aceita';exception when insufficient_privilege then null;end;
 begin perform equipe_atuacao_horarios_salvar('20000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','[]','[]');raise exception 'recepção escreveu';exception when insufficient_privilege then null;end;
 raise notice 'PASS: recepção negada no servidor';
end $$;
select set_config('test.actor','10000000-0000-4000-8000-000000000001',false);
do $$ declare a jsonb; begin
 perform equipe_atuacao_horarios_salvar('20000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','[]','[{"dia_semana":1,"hora_inicio":"08:00","hora_fim":"12:00"}]');
 a:=equipe_atuacao_obter('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 if jsonb_array_length(a->'horarios')<>1 then raise exception 'horário não persistiu';end if;
 begin perform equipe_atuacao_horarios_salvar('20000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','[]','[]');raise exception 'horário antigo aceito';exception when sqlstate 'PT409' then null;end;
 a:=equipe_atuacao_obter('30000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 if jsonb_array_length(a->'horarios')<>0 then raise exception 'horário vazou';end if;
 raise notice 'PASS: horários persistidos, conflito e isolamento';
end $$;
reset role;
do $$ declare antes jsonb; begin
 select jsonb_agg(jsonb_build_object('id',id,'dia_semana',dia_semana,'hora_inicio',hora_inicio,'hora_fim',hora_fim) order by id) into antes from disponibilidade_padrao where ativo;
 begin perform equipe_atuacao_horarios_salvar('20000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',antes,'[{"dia_semana":1,"hora_inicio":"08:00","hora_fim":"12:00"},{"dia_semana":1,"hora_inicio":"11:00","hora_fim":"13:00"}]');raise exception 'sobreposição aceita';exception when invalid_parameter_value then null;end;
 if (select count(*) from disponibilidade_padrao where ativo)<>1 then raise exception 'falha perdeu horário';end if;
 update profissionais set ativo=false where id='20000000-0000-4000-8000-000000000001';
 begin perform equipe_atuacao_horarios_salvar('20000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',antes,'[]');raise exception 'profissional inativo escreveu horários';exception when invalid_parameter_value then null;end;
 update profissionais set ativo=true where id='20000000-0000-4000-8000-000000000001';
 if (select count(*) from disponibilidade_padrao where ativo)<>1 then raise exception 'inativo perdeu horário';end if;
 raise notice 'PASS: sobreposição e profissional inativo recusados; horário anterior preservado';
end $$;
