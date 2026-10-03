-- PREPARADA PARA REVISÃO. Não aplicada ao principal nesta etapa.
-- Dependências: baseline Agenda, Auth/RLS, auditoria, Financeiro fase 1 e
-- constraint agendamentos_sem_sobreposicao (garantia concorrente de conflitos).
begin;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.agendamentos'::regclass
    and conname='agendamentos_sem_sobreposicao' and contype='x') then
    raise exception 'Dependência ausente: exclusão de sobreposição da Agenda.';
  end if;
  if to_regclass('public.recebimentos') is null then
    raise exception 'Dependência ausente: recebimentos.';
  end if;
end $$;

-- Guarda também UPDATE direto: não basta esconder botões no navegador.
create function public.agenda_validar_correcao_horario() returns trigger
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
  select * into v_excecao from public.agenda_excecoes where
    clinica_id=old.clinica_id and profissional_id=old.profissional_id and data=new.data;
  if found then
    if v_excecao.tipo::text<>'horario_especial' or v_excecao.hora_inicio is null
       or v_excecao.hora_fim is null or new.hora_inicio<v_excecao.hora_inicio
       or new.hora_fim>v_excecao.hora_fim then
      raise exception using errcode='P0001', message='Horário fora do expediente ou em folga. Revise a disponibilidade.';
    end if;
  elsif not exists (select 1 from public.disponibilidade_padrao where
    clinica_id=old.clinica_id and profissional_id=old.profissional_id and ativo
    and dia_semana=extract(dow from new.data) and
    hora_inicio<=new.hora_inicio and hora_fim>=new.hora_fim) then
    raise exception 'Horário sem disponibilidade cadastrada. Não há autorização de encaixe neste fluxo.';
  end if;
  new.updated_at:=clock_timestamp();
  return new;
end $$;
revoke all on function public.agenda_validar_correcao_horario() from public, anon, authenticated;
create trigger zz_agenda_validar_correcao_horario before update on public.agendamentos
for each row execute function public.agenda_validar_correcao_horario();

create function public.agenda_corrigir_horario(p_clinica_id uuid, p_agendamento_id uuid,
  p_revisao timestamptz, p_status text, p_data_anterior date, p_inicio_anterior time,
  p_nova_data date, p_novo_inicio time, p_motivo text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog, public
as $$
declare v_anterior public.agendamentos%rowtype; v_novo public.agendamentos%rowtype;
begin
  if auth.uid() is null or not public.eh_proprietaria_ou_recepcao(p_clinica_id) then
    raise exception using errcode='42501', message='Operação não autorizada nesta clínica.';
  end if;
  select * into v_anterior from public.agendamentos where id=p_agendamento_id
    and clinica_id=p_clinica_id for update;
  if not found then raise exception using errcode='42501', message='Agendamento indisponível nesta clínica.'; end if;
  if (v_anterior.updated_at,v_anterior.status::text,v_anterior.data,v_anterior.hora_inicio)
      is distinct from (p_revisao,p_status,p_data_anterior,p_inicio_anterior) then
    raise exception using errcode='40001', message='O agendamento mudou. Feche e reabra para revisar antes de salvar.';
  end if;
  if p_nova_data is null or p_novo_inicio is null or length(btrim(coalesce(p_motivo,''))) not between 5 and 500 then
    raise exception 'Informe data, horário e motivo entre 5 e 500 caracteres.';
  end if;
  if (p_nova_data,p_novo_inicio)=(v_anterior.data,v_anterior.hora_inicio) then
    raise exception 'Nenhuma alteração para salvar.';
  end if;
  perform set_config('app.agenda_correcao_motivo',btrim(p_motivo),true);
  perform set_config('app.agenda_correcao_alvo',p_agendamento_id::text,true);
  update public.agendamentos set data=p_nova_data,hora_inicio=p_novo_inicio
    where id=p_agendamento_id and clinica_id=p_clinica_id returning * into v_novo;
  perform set_config('app.agenda_correcao_alvo','',true);
  return jsonb_build_object('id',v_novo.id,'data',v_novo.data,'hora_inicio',v_novo.hora_inicio,
    'hora_fim',v_novo.hora_fim,'status',v_novo.status,'updated_at',v_novo.updated_at);
end $$;
revoke all on function public.agenda_corrigir_horario(uuid,uuid,timestamptz,text,date,time,date,time,text) from public,anon;
grant execute on function public.agenda_corrigir_horario(uuid,uuid,timestamptz,text,date,time,date,time,text) to authenticated;

-- Histórico mínimo na auditoria append-only existente, na mesma transação.
create function public.agenda_auditar_correcao_horario() returns trigger
language plpgsql security definer set search_path=pg_catalog, public as $$
begin
  if (new.data,new.hora_inicio,new.hora_fim) is distinct from (old.data,old.hora_inicio,old.hora_fim) then
    insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_antes,dados_depois)
    values (new.clinica_id,auth.uid(),'UPDATE','agendamentos',new.id::text,
      jsonb_build_object('data',old.data,'hora_inicio',old.hora_inicio,'hora_fim',old.hora_fim),
      jsonb_build_object('data',new.data,'hora_inicio',new.hora_inicio,'hora_fim',new.hora_fim,
        'motivo',current_setting('app.agenda_correcao_motivo',true)));
  end if;
  return new;
end $$;
revoke all on function public.agenda_auditar_correcao_horario() from public,anon,authenticated;
create trigger agenda_auditar_correcao_horario after update on public.agendamentos
for each row execute function public.agenda_auditar_correcao_horario();

create function public.agenda_correcao_disponivel(p_clinica_id uuid) returns boolean
language sql stable security invoker set search_path=pg_catalog, public as $$
  select auth.uid() is not null and public.eh_proprietaria_ou_recepcao(p_clinica_id)
$$;
revoke all on function public.agenda_correcao_disponivel(uuid) from public,anon;
grant execute on function public.agenda_correcao_disponivel(uuid) to authenticated;
commit;
