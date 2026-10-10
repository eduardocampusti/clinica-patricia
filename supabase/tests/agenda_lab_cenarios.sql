-- SOMENTE laboratório local sintético. Papel SQL authenticated; auth.uid() simula claim.
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000101'),('00000000-0000-4000-8000-000000000102'),
 ('00000000-0000-4000-8000-000000000103'),('00000000-0000-4000-8000-000000000104');
insert into public.usuarios(id,nome_completo) select id,'Usuário sintético' from auth.users;
insert into public.clinicas(id,nome,cidade,subdomain) values
 ('00000000-0000-4000-8000-000000000201','Brotas sintética','Sintética','brotas-lab'),
 ('00000000-0000-4000-8000-000000000202','Ipupiara sintética','Sintética','ipupiara-lab');
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel) values
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201','recepcao'),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000201','proprietaria'),
 ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000202','recepcao'),
 ('00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000201','medico');
insert into public.pacientes(id,clinica_id,nome_completo) values
 ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201','Paciente sintético');
insert into public.profissionais(id,nome_completo,duracao_consulta_minutos) values
 ('00000000-0000-4000-8000-000000000401','Profissional sintético',30);
insert into public.profissionais_clinicas(profissional_id,clinica_id) values
 ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000201');
insert into public.disponibilidade_padrao(profissional_id,clinica_id,dia_semana,hora_inicio,hora_fim)
 select '00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000201',d,'08:00','18:00' from generate_series(0,6) d;
insert into public.agendamentos(id,clinica_id,paciente_id,profissional_id,data,hora_inicio,hora_fim,observacoes)
 values ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000201',
 '00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401','2030-01-07','10:00','10:30','Preservar observação sintética'),
 ('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000201',
 '00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401','2030-01-07','12:00','12:30','Concorrente');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',false);
do $$ declare a public.agendamentos; r jsonb; rev timestamptz; begin
 select * into a from public.agendamentos where id='00000000-0000-4000-8000-000000000501';
 rev:=a.updated_at;
 r:=public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,'2030-01-07','11:00','Correção sintética');
 select * into a from public.agendamentos where id=a.id;
 if a.hora_inicio<>'11:00' or a.observacoes<>'Preservar observação sintética' or a.status::text<>'agendado' then raise exception 'Falha preservação'; end if;
 begin perform public.agenda_corrigir_horario(a.clinica_id,a.id,rev,a.status::text,a.data,'10:00',a.data,'11:30','Revisão sintética'); raise exception 'Revisão antiga aceita'; exception when serialization_failure then null; end;
 begin perform public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,a.data,'12:00','Conflito sintético'); raise exception 'Conflito aceito'; exception when exclusion_violation then null; end;
 begin update public.agendamentos set hora_inicio='13:00' where id=a.id; raise exception 'UPDATE direto aceito'; exception when raise_exception then if SQLERRM='UPDATE direto aceito' then raise; end if; end;
 begin perform public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,a.data,'07:00','Fora expediente'); raise exception 'Fora expediente aceito'; exception when raise_exception then if SQLERRM='Fora expediente aceito' then raise; end if; end;
 update public.agendamentos set status='aguardando' where id=a.id;
 select * into a from public.agendamentos where id=a.id;
 begin perform public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,'2030-01-08','11:00','Data após chegada'); raise exception 'Data após chegada aceita'; exception when raise_exception then if SQLERRM='Data após chegada aceita' then raise; end if; end;
 perform public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,a.data,'11:30','Horário após chegada');
 select * into a from public.agendamentos where id=a.id;
 if a.status::text<>'aguardando' or a.data<>'2030-01-07' then raise exception 'Chegada alterada'; end if;
end $$;
select 'PASS recepcao: sucesso, preservação, revisão, conflito, UPDATE direto, expediente, chegada' as resultado;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000103',false);
do $$ begin
 begin perform public.agenda_corrigir_horario('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000501',now(),'aguardando','2030-01-07','11:30','2030-01-07','13:00','Outra clínica'); raise exception 'Outra clínica aceita'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000104',false);
do $$ begin
 begin perform public.agenda_corrigir_horario('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000501',now(),'aguardando','2030-01-07','11:30','2030-01-07','13:00','Médico sem papel'); raise exception 'Médico aceito'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000102',false);
do $$ declare a public.agendamentos; begin
 select * into a from public.agendamentos where id='00000000-0000-4000-8000-000000000501';
 perform public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,a.data,'13:00','Correção proprietária');
 update public.agendamentos set status='concluido' where id=a.id;
 select * into a from public.agendamentos where id=a.id;
 begin perform public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,a.data,'14:00','Concluído recusado'); raise exception 'Concluído aceito'; exception when raise_exception then if SQLERRM='Concluído aceito' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.auditoria where entidade='agendamentos' and dados_depois ? 'motivo')<>3 then raise exception 'Histórico ausente/duplicado'; end if;
 if has_function_privilege('anon','public.agenda_corrigir_horario(uuid,uuid,timestamptz,text,date,time,date,time,text)','EXECUTE') then raise exception 'Anon possui acesso'; end if;
end $$;
select 'PASS proprietária, isolamento, médico recusado, concluído, auditoria atômica e grant anon' as resultado;
