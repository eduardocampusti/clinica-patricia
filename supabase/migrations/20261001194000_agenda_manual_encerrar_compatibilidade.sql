-- FASE 3: executar SOMENTE depois de confirmar builds RPC nos dois domínios.
-- Falha de publicação em qualquer unidade: manter fase 1, NÃO executar esta.
begin;
do $$ begin
 if to_regprocedure('public.agenda_manual_criar(uuid,uuid,uuid,date,time without time zone,text,boolean)') is null then raise exception 'Dependência: fase aditiva'; end if;
end $$;
create or replace function public.agenda_validar_criacao_manual() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if current_setting('app.agenda_manual_clinica',true) is distinct from new.clinica_id::text then
   raise exception using errcode='P0001', message='Atualize a página da Agenda antes de salvar. Este cliente não é mais compatível; nenhum agendamento foi criado.';
 end if;
 perform public.agenda_validar_manual(new.clinica_id,new.profissional_id,new.data,new.hora_inicio,new.hora_fim);
 return new;
end $$;
revoke all on function public.agenda_validar_criacao_manual() from public,anon,authenticated;
commit;
