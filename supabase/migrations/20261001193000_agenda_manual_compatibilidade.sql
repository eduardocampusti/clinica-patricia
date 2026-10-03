-- FASE 1: funções novas com compatibilidade temporária do cliente anterior.
-- Substitui a proposta 20261001173000, nunca aplicada. Não instalar a fase 3
-- antes de confirmar o cliente RPC publicado em AMBAS as clínicas.
-- Incremental sobre 20261001120000; política manual aprovada em 01/10/2026.
begin;
do $$ begin
 if to_regprocedure('public.agenda_corrigir_horario(uuid,uuid,timestamptz,text,date,time without time zone,date,time without time zone,text)') is null then raise exception 'Dependência: correção auditada anterior'; end if;
 if not exists(select 1 from pg_constraint where conrelid='public.agendamentos'::regclass and conname='agendamentos_sem_sobreposicao' and contype='x') then raise exception 'Dependência: exclusão de sobreposição'; end if;
end $$;

-- Compartilhada por INSERT e correção. Sem alteração em RLS/grants de tabelas.
create function public.agenda_validar_manual(c uuid,p uuid,d date,i time,f time) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare ex public.agenda_excecoes%rowtype; dur integer; habitual boolean;
begin
 if auth.uid() is null or not exists(select 1 from public.usuarios_clinicas where usuario_id=auth.uid() and clinica_id=c and ativo and papel::text in ('recepcao','proprietaria'))
 or not public.eh_proprietaria_ou_recepcao(c) then raise exception using errcode='42501',message='Operação não autorizada nesta clínica.'; end if;
 if not exists(select 1 from public.profissionais_clinicas where profissional_id=p and clinica_id=c and ativo) then raise exception 'Profissional sem vínculo ativo.'; end if;
 select duracao_consulta_minutos into dur from public.profissionais where id=p and ativo;
 if d is null or i is null or dur is null or dur<=0 or extract(hour from i)*60+extract(minute from i)+dur>=1440 or f is null or f<>i+make_interval(mins=>dur) then raise exception 'Duração ou horário inválido.'; end if;
 -- Serializa envios da mesma clínica/profissional/data; exclusão protege todas as conexões.
 perform pg_advisory_xact_lock(hashtextextended(c::text||p::text||d::text,0));
 select * into ex from public.agenda_excecoes where clinica_id=c and profissional_id=p and data=d;
 if found then
   if ex.tipo::text<>'horario_especial' or ex.hora_inicio is null or ex.hora_fim is null or i<ex.hora_inicio or f>ex.hora_fim then
     raise exception 'Folga, bloqueio ou limite de horário especial impede esta marcação.';
   end if;
   habitual:=true;
 else
   select exists(select 1 from public.disponibilidade_padrao where clinica_id=c and profissional_id=p and ativo and dia_semana=extract(dow from d) and hora_inicio<=i and hora_fim>=f) into habitual;
 end if;
 if not habitual and current_setting('app.agenda_manual_confirmada',true) is distinct from 'true' then
   raise exception 'Confirme explicitamente a marcação manual sem expediente ou fora da faixa habitual.';
 end if;
end $$;
revoke all on function public.agenda_validar_manual(uuid,uuid,date,time,time) from public,anon,authenticated;

create or replace function public.agenda_validar_correcao_horario() returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_motivo text := current_setting('app.agenda_correcao_motivo', true);
  v_duracao integer;
  v_excecao public.agenda_excecoes%rowtype;
begin
  if (new.data,new.hora_inicio,new.hora_fim) is not distinct from
     (old.data,old.hora_inicio,old.hora_fim) then
    if new is distinct from old then new.updated_at:=clock_timestamp(); end if;
    return new;
  end if;
  if auth.uid() is null or not public.eh_proprietaria_ou_recepcao(old.clinica_id)
     or not exists (select 1 from public.usuarios_clinicas where usuario_id=auth.uid()
       and clinica_id=old.clinica_id and ativo and papel::text in ('proprietaria','recepcao')) then
    raise exception using errcode='42501', message='Operação não autorizada nesta clínica.';
  end if;
  if (new.id,new.paciente_id,new.profissional_id,new.clinica_id,new.status) is distinct from
     (old.id,old.paciente_id,old.profissional_id,old.clinica_id,old.status) then
    raise exception 'A correção não pode trocar vínculos ou situação.';
  end if;
  if old.status::text not in ('agendado','confirmado','aguardando') or
     exists (select 1 from public.atendimentos where agendamento_id=old.id) then
    raise exception using errcode='P0001', message='Atendimento iniciado, concluído ou cancelado não permite esta correção.';
  end if;
  if old.status::text='aguardando' and new.data<>old.data then
    raise exception 'Paciente já chegou. Corrija somente o horário na mesma data; para outra data, utilize o reagendamento específico, preservando a chegada.';
  end if;
  if length(btrim(coalesce(v_motivo,''))) not between 5 and 500 or
     current_setting('app.agenda_correcao_alvo',true) is distinct from old.id::text then
    raise exception 'Use a correção autorizada com motivo e revisão do agendamento.';
  end if;
  if not exists (select 1 from public.profissionais_clinicas
     where profissional_id=old.profissional_id and clinica_id=old.clinica_id and ativo) then
    raise exception 'Profissional sem vínculo ativo nesta clínica.';
  end if;
  -- Mantém todos os recebimentos e seus vínculos; não recalcula preço/repasse.
  if exists (select 1 from public.recebimentos where agendamento_id=old.id and
    (clinica_id,paciente_id,profissional_id) is distinct from
    (old.clinica_id,old.paciente_id,old.profissional_id)) then
    raise exception 'Vínculo financeiro inconsistente. Solicite revisão administrativa.';
  end if;
  select duracao_consulta_minutos into v_duracao from public.profissionais where id=old.profissional_id;
  if v_duracao is null or v_duracao<=0 or
     extract(hour from new.hora_inicio)*60+extract(minute from new.hora_inicio)+v_duracao>=1440
     or new.hora_fim<=new.hora_inicio then
    raise exception 'Duração ou horário inválido.';
  end if;
  -- Trigger de cálculo existente define hora_fim antes desta guarda.
  if new.hora_fim<>new.hora_inicio+make_interval(mins=>v_duracao) then
    raise exception 'Duração incompatível com o profissional.';
  end if;
  perform public.agenda_validar_manual(new.clinica_id,new.profissional_id,new.data,new.hora_inicio,new.hora_fim);
  new.updated_at:=clock_timestamp();
  return new;
end $$;
revoke all on function public.agenda_validar_correcao_horario() from public, anon, authenticated;

create function public.agenda_validar_criacao_manual() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 -- O caminho anterior conserva RLS, cálculo de duração e exclusão GLOBAL.
 -- Não afirma confirmação manual: política nova ainda não integralmente ativa.
 if current_setting('app.agenda_manual_clinica',true) is distinct from new.clinica_id::text then return new; end if;
 perform public.agenda_validar_manual(new.clinica_id,new.profissional_id,new.data,new.hora_inicio,new.hora_fim);
 return new;
end $$;
revoke all on function public.agenda_validar_criacao_manual() from public,anon,authenticated;
create trigger zz_agenda_validar_criacao_manual before insert on public.agendamentos for each row execute function public.agenda_validar_criacao_manual();

create function public.agenda_manual_criar(p_clinica_id uuid,p_paciente_id uuid,p_profissional_id uuid,p_data date,p_inicio time,p_observacoes text,p_confirmacao_manual boolean) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare n public.agendamentos%rowtype;
begin
 if auth.uid() is null or not public.eh_proprietaria_ou_recepcao(p_clinica_id) then raise exception using errcode='42501',message='Operação não autorizada.'; end if;
 perform set_config('app.agenda_manual_confirmada',coalesce(p_confirmacao_manual,false)::text,true);
 perform set_config('app.agenda_manual_clinica',p_clinica_id::text,true);
 insert into public.agendamentos(clinica_id,paciente_id,profissional_id,data,hora_inicio,status,observacoes)
 values(p_clinica_id,p_paciente_id,p_profissional_id,p_data,p_inicio,'agendado',p_observacoes) returning * into n;
 perform set_config('app.agenda_manual_confirmada','',true);
 perform set_config('app.agenda_manual_clinica','',true);
 return jsonb_build_object('id',n.id,'clinica_id',n.clinica_id,'paciente_id',n.paciente_id,'profissional_id',n.profissional_id,'data',n.data,'hora_inicio',n.hora_inicio,'hora_fim',n.hora_fim,'status',n.status,'updated_at',n.updated_at);
end $$;
revoke all on function public.agenda_manual_criar(uuid,uuid,uuid,date,time,text,boolean) from public,anon;
grant execute on function public.agenda_manual_criar(uuid,uuid,uuid,date,time,text,boolean) to authenticated;

create function public.agenda_manual_corrigir_horario(p_clinica_id uuid,p_agendamento_id uuid,p_revisao timestamptz,p_status text,p_data_anterior date,p_inicio_anterior time,p_nova_data date,p_novo_inicio time,p_motivo text,p_confirmacao_manual boolean) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r jsonb;
begin
 perform set_config('app.agenda_manual_confirmada',coalesce(p_confirmacao_manual,false)::text,true);
 r:=public.agenda_corrigir_horario(p_clinica_id,p_agendamento_id,p_revisao,p_status,p_data_anterior,p_inicio_anterior,p_nova_data,p_novo_inicio,p_motivo);
 perform set_config('app.agenda_manual_confirmada','',true);
 return r;
end $$;
revoke all on function public.agenda_manual_corrigir_horario(uuid,uuid,timestamptz,text,date,time,date,time,text,boolean) from public,anon;
grant execute on function public.agenda_manual_corrigir_horario(uuid,uuid,timestamptz,text,date,time,date,time,text,boolean) to authenticated;

create function public.agenda_auditar_criacao_manual() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois)
 values(new.clinica_id,auth.uid(),'INSERT','agendamentos',new.id::text,jsonb_build_object('data',new.data,'hora_inicio',new.hora_inicio,'hora_fim',new.hora_fim,'caminho',case when current_setting('app.agenda_manual_clinica',true)=new.clinica_id::text then 'rpc_manual' else 'legado_transitorio' end,'confirmacao_manual',case when current_setting('app.agenda_manual_clinica',true)=new.clinica_id::text then current_setting('app.agenda_manual_confirmada',true)='true' else null end));
 return new;
end $$;
revoke all on function public.agenda_auditar_criacao_manual() from public,anon,authenticated;
create trigger agenda_auditar_criacao_manual after insert on public.agendamentos for each row execute function public.agenda_auditar_criacao_manual();

create function public.agenda_manual_disponivel(p_clinica_id uuid) returns boolean
language sql stable security invoker set search_path=pg_catalog,public as $$
 select auth.uid() is not null and public.eh_proprietaria_ou_recepcao(p_clinica_id)
 and exists(select 1 from public.usuarios_clinicas where usuario_id=auth.uid() and clinica_id=p_clinica_id and ativo and papel::text in ('recepcao','proprietaria'))
$$;
revoke all on function public.agenda_manual_disponivel(uuid) from public,anon;
grant execute on function public.agenda_manual_disponivel(uuid) to authenticated;
commit;

