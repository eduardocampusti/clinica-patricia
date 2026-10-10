-- SOMENTE laboratório portátil 127.0.0.1:55442. Nunca executar no principal.
-- RLS/papéis SQL reais do baseline; identidade Auth simulada via claim.
begin;
do $$ begin
 if inet_server_addr() <> '127.0.0.1'::inet or inet_server_port() <> 55442 then raise exception 'Alvo não é laboratório'; end if;
end $$;
insert into public.profissionais(id,nome_completo,duracao_consulta_minutos) values
 ('00000000-0000-4000-8000-000000000451','Profissional sintético manual',30);
insert into public.profissionais_clinicas(profissional_id,clinica_id) values
 ('00000000-0000-4000-8000-000000000451','00000000-0000-4000-8000-000000000201'),
 ('00000000-0000-4000-8000-000000000451','00000000-0000-4000-8000-000000000202');
insert into public.pacientes(id,clinica_id,nome_completo) values
 ('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000202','Paciente sintético manual B');
insert into public.disponibilidade_padrao(profissional_id,clinica_id,dia_semana,hora_inicio,hora_fim) values
 ('00000000-0000-4000-8000-000000000451','00000000-0000-4000-8000-000000000201',1,'08:00','12:00');
insert into public.agenda_excecoes(profissional_id,clinica_id,data,tipo,hora_inicio,hora_fim) values
 ('00000000-0000-4000-8000-000000000451','00000000-0000-4000-8000-000000000201','2031-01-08','folga',null,null),
 ('00000000-0000-4000-8000-000000000451','00000000-0000-4000-8000-000000000201','2031-01-09','horario_especial','14:00','17:00');
create function pg_temp.recusa(comando text,codigo text) returns void language plpgsql as $$
begin
 begin execute comando;
 exception when others then
   if SQLSTATE=codigo then return; end if;
   raise;
 end;
 raise exception 'Operação indevida foi aceita: %',comando;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
do $$ declare c uuid:='00000000-0000-4000-8000-000000000201'; p uuid:='00000000-0000-4000-8000-000000000301';
 pro uuid:='00000000-0000-4000-8000-000000000451'; r jsonb; a public.agendamentos; rev timestamptz; total integer; begin
 -- Ausência e fora da faixa têm a mesma política e exigem confirmação no servidor.
 perform pg_temp.recusa(format('select public.agenda_manual_criar(%L,%L,%L,%L,%L,null,false)',c,p,pro,'2031-01-07','10:00'),'P0001');
 r:=public.agenda_manual_criar(c,p,pro,'2031-01-07','10:00','Preservar campos sintéticos',true);
 select * into a from public.agendamentos where id=(r->>'id')::uuid;
 rev:=a.updated_at;
 perform pg_temp.recusa(format('select public.agenda_manual_corrigir_horario(%L,%L,%L,%L,%L,%L,%L,%L,%L,false)',c,a.id,a.updated_at,a.status,a.data,a.hora_inicio,a.data,'11:00','Correção sintética'),'P0001');
 perform public.agenda_manual_corrigir_horario(c,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,a.data,'11:00','Correção sintética',true);
 select * into a from public.agendamentos where id=a.id;
 if a.hora_inicio<>'11:00' or a.hora_fim<>'11:30' or a.observacoes<>'Preservar campos sintéticos' or a.paciente_id<>p or a.profissional_id<>pro or a.status::text<>'agendado' then raise exception 'Preservação falhou'; end if;
 perform pg_temp.recusa(format('select public.agenda_manual_corrigir_horario(%L,%L,%L,%L,%L,%L,%L,%L,%L,true)',c,a.id,rev,a.status,a.data,'10:00',a.data,'12:00','Revisão sintética'),'40001');
 select count(*) into total from public.agendamentos where profissional_id=pro;
 -- Duração completa conflita; o próprio registro foi excluído pela correção anterior.
 perform pg_temp.recusa(format('select public.agenda_manual_criar(%L,%L,%L,%L,%L,null,true)',c,p,pro,a.data,'10:40'),'23P01');
 if (select count(*) from public.agendamentos where profissional_id=pro)<>total then raise exception 'Criação parcial'; end if;
 perform pg_temp.recusa(format('select public.agenda_manual_criar(%L,%L,%L,%L,%L,null,true)',c,p,pro,'2031-01-07','23:40'),'P0001');
 -- Fim exato, fora do habitual e folga/limite explícitos.
 perform public.agenda_manual_criar(c,p,pro,'2031-01-06','11:30',null,false);
 perform pg_temp.recusa(format('select public.agenda_manual_criar(%L,%L,%L,%L,%L,null,false)',c,p,pro,'2031-01-06','12:10'),'P0001');
 perform public.agenda_manual_criar(c,p,pro,'2031-01-06','12:10',null,true);
 perform pg_temp.recusa(format('select public.agenda_manual_criar(%L,%L,%L,%L,%L,null,true)',c,p,pro,'2031-01-08','10:00'),'P0001');
 perform pg_temp.recusa(format('select public.agenda_manual_criar(%L,%L,%L,%L,%L,null,true)',c,p,pro,'2031-01-09','16:40'),'P0001');
 perform public.agenda_manual_criar(c,p,pro,'2031-01-09','16:30',null,false);
 -- Edição também respeita folga/limite; recusa não altera horário original.
 perform pg_temp.recusa(format('select public.agenda_manual_corrigir_horario(%L,%L,%L,%L,%L,%L,%L,%L,%L,true)',c,a.id,a.updated_at,a.status,a.data,a.hora_inicio,'2031-01-08','10:00','Folga sintética'),'P0001');
 update public.agendamentos set status='aguardando' where id=a.id;
 select * into a from public.agendamentos where id=a.id;
 perform pg_temp.recusa(format('select public.agenda_manual_corrigir_horario(%L,%L,%L,%L,%L,%L,%L,%L,%L,true)',c,a.id,a.updated_at,a.status,a.data,a.hora_inicio,'2031-01-10','10:00','Data após chegada'),'P0001');
 perform public.agenda_manual_corrigir_horario(c,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,a.data,'12:00','Horário após chegada',true);
 select * into a from public.agendamentos where id=a.id;
 if a.status::text<>'aguardando' or a.data<>'2031-01-07' then raise exception 'Chegada perdida'; end if;
 perform set_config('lab.agenda_manual_id',a.id::text,true);
 -- Caminhos antigos/diretos não podem ignorar confirmação nem motivo.
 perform pg_temp.recusa(format('select public.agenda_corrigir_horario(%L,%L,%L,%L,%L,%L,%L,%L,%L)',c,a.id,a.updated_at,a.status,a.data,a.hora_inicio,a.data,'13:00','Atalho antigo'),'P0001');
 perform pg_temp.recusa(format('update public.agendamentos set hora_inicio=%L where id=%L','13:00',a.id),'P0001');
 perform pg_temp.recusa(format('insert into public.agendamentos(clinica_id,paciente_id,profissional_id,data,hora_inicio) values(%L,%L,%L,%L,%L)',c,p,pro,'2031-01-10','10:00'),'P0001');
 update public.agendamentos set status='concluido' where id=a.id;
 select * into a from public.agendamentos where id=a.id;
 perform pg_temp.recusa(format('select public.agenda_manual_corrigir_horario(%L,%L,%L,%L,%L,%L,%L,%L,%L,true)',c,a.id,a.updated_at,a.status,a.data,a.hora_inicio,a.data,'13:00','Concluído sintético'),'P0001');
end $$;
select 'PASS A/Recepção: manual, habitual, confirmação, duração, conflito, revisão, folga, horário especial, chegada, situação e atalhos' as resultado;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000103',true);
select pg_temp.recusa(format('select public.agenda_manual_corrigir_horario(%L,%L,now(),%L,%L,%L,%L,%L,%L,true)','00000000-0000-4000-8000-000000000201',current_setting('lab.agenda_manual_id'),'agendado','2031-01-07','12:00','2031-01-07','13:00','Outra clínica sintética'),'42501');
select pg_temp.recusa($s$select public.agenda_manual_criar('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000451','2031-01-10','10:00',null,true)$s$,'42501');
select public.agenda_manual_criar('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000451','2031-01-07','12:00',null,true)->>'status' as resultado_b;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000104',true);
select pg_temp.recusa(format('select public.agenda_manual_corrigir_horario(%L,%L,now(),%L,%L,%L,%L,%L,%L,true)','00000000-0000-4000-8000-000000000201',current_setting('lab.agenda_manual_id'),'agendado','2031-01-07','12:00','2031-01-07','13:00','Médico sintético'),'42501');
select pg_temp.recusa($s$select public.agenda_manual_criar('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000451','2031-01-10','10:00',null,true)$s$,'42501');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000102',true);
select public.agenda_manual_criar('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000451','2031-01-10','10:00',null,true)->>'status' as resultado_proprietaria;
reset role;
do $$ begin
 if (select count(*) from public.auditoria where entidade_id in(select id::text from public.agendamentos where profissional_id='00000000-0000-4000-8000-000000000451') and acao='INSERT')<>6 then raise exception 'Auditoria criação incorreta'; end if;
 if has_function_privilege('anon','public.agenda_manual_criar(uuid,uuid,uuid,date,time,text,boolean)','EXECUTE') or has_function_privilege('authenticated','public.agenda_validar_manual(uuid,uuid,date,time,time)','EXECUTE') then raise exception 'Grant indevido'; end if;
end $$;
select 'PASS B/Recepção, A/Proprietária, médico e outra clínica recusados, auditoria/grants. Nenhum Auth real.' as resultado;
rollback;
