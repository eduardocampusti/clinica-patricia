-- Correção exclusiva do contrato de edição instalado nesta tarefa.
-- 40001 provoca retry pelo PostgREST; conflito de versão é HTTP 409, não transitório.
begin;
do $fix$
declare definicao text;
begin
 select pg_get_functiondef('public.paciente_editar_administrativo(uuid,uuid,timestamptz,jsonb,jsonb)'::regprocedure) into definicao;
 if position('errcode = ''40001''' in definicao)=0 then
   raise exception 'Contrato de origem divergente; interromper correção.';
 end if;
 execute replace(definicao, 'errcode = ''40001''', 'errcode = ''PT409''');
end $fix$;
notify pgrst, 'reload schema';
commit;
