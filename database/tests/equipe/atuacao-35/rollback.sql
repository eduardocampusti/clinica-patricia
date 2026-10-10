-- Complemento fictício no cluster local. Verifica rollback depois da primeira inserção.
create function public.falha_horario_ficticia() returns trigger language plpgsql as $$ begin if new.hora_inicio='13:00'::time then raise exception 'Falha fictícia de inserção';end if;return new;end $$;
create trigger falha_horario_ficticia before insert on public.disponibilidade_padrao for each row execute function public.falha_horario_ficticia();
select set_config('test.actor','10000000-0000-4000-8000-000000000001',false);
do $$ declare antes jsonb; begin
 select jsonb_agg(jsonb_build_object('id',id,'dia_semana',dia_semana,'hora_inicio',hora_inicio,'hora_fim',hora_fim) order by id) into antes from public.disponibilidade_padrao where ativo;
 begin
  perform public.equipe_atuacao_horarios_salvar('20000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',antes,'[{"dia_semana":1,"hora_inicio":"08:00","hora_fim":"12:00"},{"dia_semana":2,"hora_inicio":"13:00","hora_fim":"17:00"}]');
  raise exception 'Falha não foi reproduzida';
 exception when raise_exception then if sqlerrm<>'Falha fictícia de inserção' then raise;end if;end;
 if (select jsonb_agg(jsonb_build_object('id',id,'dia_semana',dia_semana,'hora_inicio',hora_inicio,'hora_fim',hora_fim) order by id) from public.disponibilidade_padrao where ativo) is distinct from antes then raise exception 'Rollback não preservou anterior';end if;
 raise notice 'PASS: rollback após falha parcial preservou IDs e horários anteriores';
end $$;
