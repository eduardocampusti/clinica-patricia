-- Verificação dirigida da migration 20260929190000.
-- Executar somente depois da aplicação autorizada, em conexão de homologação
-- protegida. Este arquivo não cria dados nem altera o banco.
do $$
declare
  v_def text;
begin
  if to_regclass('public.equipe_acesso_convites') is null then raise exception 'tabela de convites ausente'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='equipe_acesso_convites' and column_name='expira_em') then raise exception 'expira_em ausente'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='equipe_acesso_convites' and column_name='envio_reserva_id') then raise exception 'envio_reserva_id ausente'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='equipe_acesso_convites' and column_name='envio_reservado_em') then raise exception 'envio_reservado_em ausente'; end if;
  v_def:=pg_get_functiondef('public.equipe_acesso_listar(uuid,uuid,uuid)'::regprocedure);
  if position('equipe_acesso_aplicar' in v_def)>0 or position('equipe_acesso_confirmar_titular' in v_def)>0 then raise exception 'listar contém operação de gravação'; end if;
  if not has_function_privilege('service_role','public.equipe_acesso_reservar_envio(uuid,uuid)','execute') then raise exception 'reserva sem grant de service_role'; end if;
  if not has_function_privilege('service_role','public.equipe_acesso_finalizar_envio(uuid,uuid,uuid,boolean,text)','execute') then raise exception 'finalização sem grant de service_role'; end if;
  if not has_function_privilege('service_role','public.equipe_acesso_localizar_conta(text)','execute') then raise exception 'lookup interno sem grant de service_role'; end if;
  if has_function_privilege('service_role','public.equipe_acesso_registrar_envio(uuid,uuid,boolean,text)','execute') then raise exception 'função antiga de envio ainda executável'; end if;
  if has_function_privilege('anon','public.equipe_acesso_reservar_envio(uuid,uuid)','execute') or has_function_privilege('authenticated','public.equipe_acesso_reservar_envio(uuid,uuid)','execute') then raise exception 'usuário comum executa reserva'; end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and indexname='equipe_membros_usuario_unico') then raise exception 'índice de conta única em equipe ausente'; end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and indexname='profissionais_usuario_unico') then raise exception 'índice de conta única em profissionais ausente'; end if;
  if exists(select 1 from public.equipe_membros m join public.profissionais p on p.id=m.profissional_id where m.usuario_id is distinct from p.usuario_id) then raise exception 'vínculo Equipe/Profissionais divergente'; end if;
end $$;

select jsonb_build_object(
  'membros', (select count(*)::int from public.equipe_membros),
  'vinculos_ativos', (select count(*)::int from public.equipe_membros_clinicas where ativo),
  'profissionais_com_usuario', (select count(*)::int from public.profissionais where usuario_id is not null),
  'convites', (select count(*)::int from public.equipe_acesso_convites),
  'idempotencias', (select count(*)::int from public.equipe_idempotencia)
) as invariantes_agregadas;

-- Sessões autenticadas separadas devem complementar este script:
-- 1) proprietária consulta a ficha e compara contagens/auditoria antes/depois;
-- 2) administradora envia convite, confirma que não há usuarios_clinicas antes do aceite;
-- 3) titular aceita com e-mail confirmado e repete o aceite;
-- 4) usuário não proprietário chama a função e recebe 403;
-- 5) duas chamadas de reenvio simultâneas obtêm uma única reserva;
-- 6) suspensão, outra clínica autorizada e última administradora são testadas
--    com contas temporárias, sem e-mail real não autorizado.
