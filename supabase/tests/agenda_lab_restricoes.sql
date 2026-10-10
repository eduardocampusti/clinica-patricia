-- SOMENTE PostgreSQL local sintético, após agenda_lab_cenarios.sql.
insert into public.sessoes_caixa(id,clinica_id,aberto_por,valor_abertura) values
 ('00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101',0);
insert into public.recebimentos(clinica_id,agendamento_id,paciente_id,profissional_id,sessao_caixa_id,
 valor_bruto,percentual_clinica,valor_clinica,valor_profissional,idempotency_key,registrado_por)
 values ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000502',
 '00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401',
 '00000000-0000-4000-8000-000000000601',100,20,20,80,'agenda-lab-pago','00000000-0000-4000-8000-000000000101');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',false);
do $$ declare a public.agendamentos; antes jsonb; begin
 select to_jsonb(t) into antes from public.agendamentos t where id='00000000-0000-4000-8000-000000000502';
 select * into a from public.agendamentos where id='00000000-0000-4000-8000-000000000502';
 perform public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,'2030-01-08','12:00','Data antes chegada');
 if (select to_jsonb(t)-array['data','hora_inicio','hora_fim','updated_at'] from public.agendamentos t where id=a.id)
    is distinct from (antes-array['data','hora_inicio','hora_fim','updated_at']) then raise exception 'Campo não envolvido alterado'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.recebimentos where idempotency_key='agenda-lab-pago' and valor_bruto=100 and status='confirmado' and agendamento_id='00000000-0000-4000-8000-000000000502')<>1 then raise exception 'Pagamento alterado'; end if;
end $$;
insert into public.atendimentos(clinica_id,paciente_id,profissional_id,agendamento_id) values
 ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000502');
set role authenticated;
do $$ declare a public.agendamentos; begin
 select * into a from public.agendamentos where id='00000000-0000-4000-8000-000000000502';
 begin perform public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,a.data,'14:00','Atendimento existe'); raise exception 'Atendimento existente aceito'; exception when raise_exception then if SQLERRM='Atendimento existente aceito' then raise; end if; end;
 update public.agendamentos set status='cancelado' where id=a.id;
 select * into a from public.agendamentos where id=a.id;
 begin perform public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,a.data,'14:00','Cancelado recusado'); raise exception 'Cancelado aceito'; exception when raise_exception then if SQLERRM='Cancelado aceito' then raise; end if; end;
end $$;
reset role;
select 'PASS mudança de data antes da chegada, campos preservados, pagamento, atendimento existente, cancelado' as resultado;
