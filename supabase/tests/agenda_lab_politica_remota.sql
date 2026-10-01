-- SOMENTE laboratório sintético: policy observada em produção por leitura em 01/10.
alter policy agendamentos_update on public.agendamentos with check (
 clinica_id in (select public.clinicas_do_usuario())
 and public.eh_proprietaria_ou_recepcao(clinica_id)
 and exists(select 1 from public.pacientes p where p.id=agendamentos.paciente_id and p.clinica_id=agendamentos.clinica_id)
 and exists(select 1 from public.profissionais_clinicas pc where pc.profissional_id=agendamentos.profissional_id and pc.clinica_id=agendamentos.clinica_id and pc.ativo)
);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',false);
do $$ declare a public.agendamentos; begin
 select * into a from public.agendamentos where id='00000000-0000-4000-8000-000000000511';
 perform public.agenda_corrigir_horario(a.clinica_id,a.id,a.updated_at,a.status::text,a.data,a.hora_inicio,a.data,'16:00','Política real ensaiada');
 if (select hora_inicio from public.agendamentos where id=a.id)<>'16:00' then raise exception 'Falha com WITH CHECK remoto'; end if;
end $$;
reset role;
select 'PASS correção como authenticated com WITH CHECK remoto e RLS ativos' as resultado;
