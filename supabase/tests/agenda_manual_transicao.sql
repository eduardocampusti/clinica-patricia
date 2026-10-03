-- SOMENTE laboratório portátil; Auth simulado, RLS SQL real.
\set ON_ERROR_STOP on
do $$ begin
 if inet_server_addr()<>'127.0.0.1'::inet or inet_server_port()<>55442 then raise exception 'Alvo não é laboratório'; end if;
end $$;
-- Remover somente objetos da proposta já ensaiada no laboratório, sem dados.
drop trigger if exists zz_agenda_validar_criacao_manual on public.agendamentos;
drop trigger if exists agenda_auditar_criacao_manual on public.agendamentos;
drop function if exists public.agenda_validar_criacao_manual();
drop function if exists public.agenda_auditar_criacao_manual();
drop function if exists public.agenda_manual_criar(uuid,uuid,uuid,date,time,text,boolean);
drop function if exists public.agenda_manual_corrigir_horario(uuid,uuid,timestamptz,text,date,time,date,time,text,boolean);
drop function if exists public.agenda_manual_disponivel(uuid);
drop function if exists public.agenda_validar_manual(uuid,uuid,date,time,time);
\i supabase/migrations/20261001193000_agenda_manual_compatibilidade.sql
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000101';
do $$ declare n uuid; begin
 insert into public.agendamentos(clinica_id,paciente_id,profissional_id,data,hora_inicio,status,observacoes)
 values('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401','2033-01-04','07:00','agendado','Legado transição sintética') returning id into n;
 begin
 perform public.agenda_manual_criar('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401','2033-01-04','07:10',null,true);
 raise exception 'Conflito não recusado'; exception when exclusion_violation then null; end;
 begin
 perform public.agenda_manual_criar('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401','2033-01-04','06:00',null,false);
 raise exception using errcode='XX000',message='Ausência de confirmação aceita'; exception when sqlstate 'P0001' then null; end;
 perform public.agenda_manual_criar('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000401','2033-01-04','06:00',null,true);
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.auditoria where dados_depois->>'caminho'='legado_transitorio' and dados_depois->'confirmacao_manual'='null'::jsonb) then raise exception 'Confirmação legado fabricada'; end if;
end $$;
rollback;
-- Falha parcial de deploy: fase 1 permanece, mesmo com apenas um cliente novo.
-- A ativação é uma operação separada e não decorre de push ou um build isolado.
\echo PASS fase aditiva: legado + RPC, conflito, confirmação e auditoria sem confirmação fictícia
