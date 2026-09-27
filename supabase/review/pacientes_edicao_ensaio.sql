-- Somente sintéticos. Executar após instalar o contrato NA MESMA transação de ensaio.
insert into auth.users(id) values ('00000000-0000-4000-8000-000000009101'),('00000000-0000-4000-8000-000000009102'),('00000000-0000-4000-8000-000000009103');
insert into public.usuarios(id,nome_completo) values
 ('00000000-0000-4000-8000-000000009101','Proprietária Ensaio Edição'),
 ('00000000-0000-4000-8000-000000009102','Recepção Ensaio Edição'),
 ('00000000-0000-4000-8000-000000009103','Médico Ensaio Edição') on conflict(id) do nothing;
insert into public.clinicas(id,nome,cidade,subdomain) values
 ('00000000-0000-4000-8000-000000009201','Ensaio Edição A','Sintética','ensaio-edicao-9201'),
 ('00000000-0000-4000-8000-000000009202','Ensaio Edição B','Sintética','ensaio-edicao-9202');
insert into public.usuarios_clinicas(usuario_id,clinica_id,papel) values
 ('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009201','proprietaria'),
 ('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009202','proprietaria'),
 ('00000000-0000-4000-8000-000000009102','00000000-0000-4000-8000-000000009201','recepcao'),
 ('00000000-0000-4000-8000-000000009103','00000000-0000-4000-8000-000000009201','medico');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009102',true);
insert into public.pacientes(id,clinica_id,nome_completo,endereco) values
 ('00000000-0000-4000-8000-000000009301','00000000-0000-4000-8000-000000009201','Paciente Ensaio Edição','Texto literal  A'),
 ('00000000-0000-4000-8000-000000009302','00000000-0000-4000-8000-000000009202','Paciente Ensaio Edição B','Texto literal B');
set local role authenticated;
do $$
declare p uuid:='00000000-0000-4000-8000-000000009301'; c uuid:='00000000-0000-4000-8000-000000009201'; rev timestamptz; antigo jsonb; novo jsonb;
begin
 select updated_at,to_jsonb(x) into rev,antigo from public.pacientes x where id=p;
 perform * from public.paciente_editar_administrativo(p,c,rev,'{"telefone":"77900000011"}');
 select to_jsonb(x) into novo from public.pacientes x where id=p;
 if (antigo - 'telefone' - 'updated_at') is distinct from (novo - 'telefone' - 'updated_at') then raise exception 'Campo não editado mudou'; end if;
 begin perform * from public.paciente_editar_administrativo(p,c,rev,'{"email":"teste@example.invalid"}'); raise exception 'Conflito aceito'; exception when serialization_failure then null; end;
 rev := (novo->>'updated_at')::timestamptz;
 begin perform * from public.paciente_editar_administrativo(p,c,rev,'{}'); raise exception 'Noop aceito'; exception when invalid_parameter_value then null; end;
 begin perform * from public.paciente_editar_administrativo(p,c,rev,'{"foto_path":null}'); raise exception 'Campo protegido aceito'; exception when invalid_parameter_value then null; end;
 begin perform * from public.paciente_editar_administrativo(p,c,rev,'{"email":"invalido"}'); raise exception 'Email aceito'; exception when invalid_parameter_value then null; end;
 begin perform * from public.paciente_editar_administrativo(p,c,rev,'{"data_nascimento":"2015-01-01"}'); raise exception 'Menor sem responsável aceito'; exception when check_violation then null; end;
 perform * from public.paciente_editar_administrativo(p,c,rev,'{"data_nascimento":"2015-01-01"}','{"nome_completo":"Responsável Ensaio","vinculo":"Mãe","telefone":"77900000011"}');
 if (select count(*) from public.paciente_responsavel_legal_resumo(p,c))<>1 then raise exception 'Vínculo ausente'; end if;
 select updated_at into rev from public.pacientes where id=p;
 begin perform * from public.paciente_editar_administrativo(p,c,rev,'{"data_nascimento":null}'); raise exception 'Nascimento apagado'; exception when check_violation then null; end;
 begin perform * from public.paciente_editar_administrativo('00000000-0000-4000-8000-000000009302','00000000-0000-4000-8000-000000009202',rev,'{"telefone":"77900000012"}'); raise exception 'Cruzamento autorizado'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
 begin perform * from public.paciente_editar_administrativo(p,c,rev,'{"telefone":"77900000012"}'); raise exception 'Médico autorizado'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009101',true);
 perform * from public.paciente_editar_administrativo(p,c,rev,'{"email":"proprietaria@example.invalid"}');
 perform set_config('app.clinica_ativa','00000000-0000-4000-8000-000000009202',true);
 begin perform * from public.paciente_editar_administrativo(p,c,rev,'{"telefone":"77900000012"}'); raise exception 'Contexto divergente aceito'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.paciente_editar_administrativo(uuid,uuid,timestamptz,jsonb,jsonb)','execute') then raise exception 'Anon autorizado'; end if;
 if not exists(select 1 from public.auditoria where entidade='pacientes' and entidade_id='00000000-0000-4000-8000-000000009301' and acao::text='UPDATE') then raise exception 'Auditoria ausente'; end if;
end $$;
rollback;
select not exists(select 1 from public.pacientes where id in ('00000000-0000-4000-8000-000000009301','00000000-0000-4000-8000-000000009302'))
 and not exists(select 1 from auth.users where id in ('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009102','00000000-0000-4000-8000-000000009103')) as rollback_limpo;
