-- Etapa35: integração aditiva. Aplicação remota deve ser comprovada no catálogo.
-- Não cria vínculo serviço/profissional nem altera Agenda ou snapshots financeiros.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '5min';

create function public.equipe_atuacao_obter(p_membro_id uuid,p_clinica_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m public.equipe_membros%rowtype; p public.profissionais%rowtype;
 pc public.profissionais_clinicas%rowtype; cf public.configuracoes_financeiras_clinica%rowtype;
begin
 if not public.equipe_recurso_pode(p_membro_id,p_clinica_id,auth.uid(),false) then
  raise exception 'Acesso negado' using errcode='42501'; end if;
 select * into m from public.equipe_membros where id=p_membro_id;
 if m.tipo::text<>'profissional_saude' or m.profissional_id is null then
  raise exception 'Identidade profissional indisponível' using errcode='22023'; end if;
 select * into p from public.profissionais where id=m.profissional_id and ativo;
 select * into pc from public.profissionais_clinicas where profissional_id=m.profissional_id and clinica_id=p_clinica_id and ativo;
 if p.id is null or pc.profissional_id is null then raise exception 'Vínculo profissional indisponível' using errcode='22023'; end if;
 select * into cf from public.configuracoes_financeiras_clinica where clinica_id=p_clinica_id
  and vigente_desde<=now() and (vigente_ate is null or now()<vigente_ate);
 return jsonb_build_object('membro_id',m.id,'profissional_id',p.id,'clinica_id',p_clinica_id,
  'duracao_minutos',p.duracao_consulta_minutos,'profissional_atualizado_em',p.updated_at,
  'pode_editar_duracao',public.equipe_recurso_pode(m.id,p_clinica_id,auth.uid(),true)
    and public.equipe_pode_editar_profissional_global(p.id),
  'valor_consulta',pc.valor_consulta,'vinculo_atualizado_em',pc.updated_at,
  'percentual_clinica',cf.percentual_clinica,'vigente_desde',cf.vigente_desde,'vigente_ate',cf.vigente_ate,
  'servicos_vinculados',null,
  'catalogo',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'nome',s.nome,'duracao_minutos',s.duracao_minutos,'preco',s.preco) order by s.nome)
    from public.servicos s where s.clinica_id=p_clinica_id and s.ativo),'[]'::jsonb),
  'horarios',coalesce((select jsonb_agg(jsonb_build_object('dia_semana',d.dia_semana,'hora_inicio',d.hora_inicio,'hora_fim',d.hora_fim) order by d.dia_semana,d.hora_inicio)
    from public.disponibilidade_padrao d where d.profissional_id=p.id and d.clinica_id=p_clinica_id and d.ativo),'[]'::jsonb),
  'excecoes',coalesce((select jsonb_agg(jsonb_build_object('data',e.data,'tipo',e.tipo,'hora_inicio',e.hora_inicio,'hora_fim',e.hora_fim) order by e.data)
    from public.agenda_excecoes e where e.profissional_id=p.id and e.clinica_id=p_clinica_id and e.data>=(now() at time zone 'America/Bahia')::date),'[]'::jsonb));
end $$;

create function public.equipe_atuacao_salvar(p_membro_id uuid,p_clinica_id uuid,p_campo text,p_valor numeric,p_atualizado_em timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_prof uuid; v_data timestamptz;
begin
 if not public.equipe_recurso_pode(p_membro_id,p_clinica_id,auth.uid(),false) then
  raise exception 'Acesso negado' using errcode='42501'; end if;
 select profissional_id into v_prof from public.equipe_membros where id=p_membro_id and tipo::text='profissional_saude';
 perform 1 from public.profissionais where id=v_prof and ativo for update;
 if not found then raise exception 'Identidade profissional indisponível' using errcode='22023'; end if;
 perform 1 from public.profissionais_clinicas where profissional_id=v_prof and clinica_id=p_clinica_id and ativo for update;
 if not found then raise exception 'Vínculo profissional indisponível' using errcode='22023'; end if;
 if p_campo='duracao' then
  if not public.equipe_recurso_pode(p_membro_id,p_clinica_id,auth.uid(),true)
   or not public.equipe_pode_editar_profissional_global(v_prof) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_valor is null or p_valor<1 or p_valor>2147483647 or trunc(p_valor)<>p_valor then raise exception 'Duração inválida' using errcode='22023'; end if;
  select updated_at into v_data from public.profissionais where id=v_prof;
 elsif p_campo='preco' then
  if p_valor is not null and (p_valor<0 or p_valor>=10000000000 or round(p_valor,2)<>p_valor) then raise exception 'Preço inválido' using errcode='22023'; end if;
  select updated_at into v_data from public.profissionais_clinicas where profissional_id=v_prof and clinica_id=p_clinica_id;
 else raise exception 'Campo inválido' using errcode='22023'; end if;
 if p_atualizado_em is null or v_data is distinct from p_atualizado_em then
  raise exception 'Consulte novamente' using errcode='PT409'; end if;
 if p_campo='duracao' then
  update public.profissionais set duracao_consulta_minutos=p_valor::integer,updated_at=clock_timestamp() where id=v_prof;
 else
  update public.profissionais_clinicas set valor_consulta=p_valor,updated_at=clock_timestamp() where profissional_id=v_prof and clinica_id=p_clinica_id;
 end if;
 -- Auditoria e sincronização existentes permanecem ativas. Não toca agendamentos/recebimentos.
 return public.equipe_atuacao_obter(p_membro_id,p_clinica_id);
end $$;
create function public.equipe_atuacao_horarios_salvar(p_profissional_id uuid,p_clinica_id uuid,p_anteriores jsonb,p_horarios jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_membro uuid; v_atual jsonb; h jsonb;
begin
 select id into v_membro from public.equipe_membros where profissional_id=p_profissional_id and tipo::text='profissional_saude';
 if not public.equipe_recurso_pode(v_membro,p_clinica_id,auth.uid(),false) then raise exception 'Acesso negado' using errcode='42501'; end if;
 perform 1 from public.profissionais where id=p_profissional_id and ativo for update;
 if not found then raise exception 'Identidade profissional indisponível' using errcode='22023'; end if;
 perform 1 from public.profissionais_clinicas where profissional_id=p_profissional_id and clinica_id=p_clinica_id and ativo for update;
 if not found then raise exception 'Vínculo indisponível' using errcode='22023'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'dia_semana',d.dia_semana,'hora_inicio',d.hora_inicio,'hora_fim',d.hora_fim) order by d.id),'[]'::jsonb)
 into v_atual from public.disponibilidade_padrao d where d.profissional_id=p_profissional_id and d.clinica_id=p_clinica_id and d.ativo;
 if p_anteriores is null or v_atual is distinct from (select coalesce(jsonb_agg(v order by v->>'id'),'[]'::jsonb) from jsonb_array_elements(p_anteriores) v) then
  raise exception 'Consulte novamente' using errcode='PT409'; end if;
 if p_horarios is null or jsonb_typeof(p_horarios)<>'array' then raise exception 'Horários inválidos' using errcode='22023'; end if;
 for h in select value from jsonb_array_elements(p_horarios) loop
  if (h->>'dia_semana') is null or (h->>'hora_inicio') is null or (h->>'hora_fim') is null
   or (h->>'dia_semana')::integer not between 0 and 6 or (h->>'hora_fim')::time<=(h->>'hora_inicio')::time then
    raise exception 'Horários inválidos' using errcode='22023'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_horarios) with ordinality a(h,n)
  join jsonb_array_elements(p_horarios) with ordinality b(h,n) on a.n<b.n
  where a.h->>'dia_semana'=b.h->>'dia_semana' and (a.h->>'hora_inicio')::time<(b.h->>'hora_fim')::time and (b.h->>'hora_inicio')::time<(a.h->>'hora_fim')::time) then
  raise exception 'Horários sobrepostos' using errcode='22023'; end if;
 -- Uma transação: falha de qualquer inserção recupera o padrão anterior.
 update public.disponibilidade_padrao set ativo=false where profissional_id=p_profissional_id and clinica_id=p_clinica_id and ativo;
 insert into public.disponibilidade_padrao(profissional_id,clinica_id,dia_semana,hora_inicio,hora_fim,created_by)
 select p_profissional_id,p_clinica_id,(value->>'dia_semana')::smallint,(value->>'hora_inicio')::time,(value->>'hora_fim')::time,auth.uid() from jsonb_array_elements(p_horarios);
 insert into public.auditoria(clinica_id,usuario_id,acao,entidade,entidade_id,dados_depois)
 values(p_clinica_id,auth.uid(),'UPDATE'::public.acao_auditoria,'disponibilidade_padrao',p_profissional_id::text,jsonb_build_object('campos_alterados',jsonb_build_array('horarios'),'origem','equipe_atuacao'));
 return true;
end $$;
revoke all on function public.equipe_atuacao_horarios_salvar(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.equipe_atuacao_horarios_salvar(uuid,uuid,jsonb,jsonb) to authenticated;
revoke all on function public.equipe_atuacao_obter(uuid,uuid),public.equipe_atuacao_salvar(uuid,uuid,text,numeric,timestamptz) from public,anon,authenticated;
grant execute on function public.equipe_atuacao_obter(uuid,uuid),public.equipe_atuacao_salvar(uuid,uuid,text,numeric,timestamptz) to authenticated;
commit;
