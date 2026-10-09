-- R3 autorizada pelo usuário em 09/10/2026: ampliação única, máximo 14 contas/6 contextos.
-- TEMPLATE NÃO EXECUTADO. Gerar UUIDs concretos após criar C-A/C-B pelo Admin Auth,
-- sem e-mail, com app_metadata.homologacao_configuracoes=20261009-r3-a ou 20261009-r3-b.
-- __CFG_A_UUID__ / __CFG_B_UUID__ são UUIDs, não tokens/credenciais.
begin;
set local request.jwt.claims='{"role":"service_role"}';
do $$ declare a uuid:='__CFG_A_UUID__';b uuid:='__CFG_B_UUID__';begin
 if a=b or not exists(select 1 from auth.users where id=a and email='cfg-a.20261009.r3@configuracoes.example.invalid' and raw_app_meta_data->>'homologacao_configuracoes'='20261009-r3-a' and created_at>statement_timestamp()-interval '1 hour' and banned_until is null)
 or not exists(select 1 from auth.users where id=b and email='cfg-b.20261009.r3@configuracoes.example.invalid' and raw_app_meta_data->>'homologacao_configuracoes'='20261009-r3-b' and created_at>statement_timestamp()-interval '1 hour' and banned_until is null)
 then raise exception 'Usar somente as DUAS contas novas exclusivas desta homologação';end if;
 if exists(select 1 from public.usuarios_clinicas where usuario_id in(a,b))
 or exists(select 1 from acesso_direto.operacoes where auth_user_id in(a,b))
 then raise exception 'Conta já vinculada/operada: não sobrescrever nem reativar';end if;
 if exists(select 1 from public.usuarios where id in(a,b) and ativo is distinct from true)
 then raise exception 'Perfil encerrado: não reativar';end if;
 if not public.configuracoes_unidade_permitida('cb620078-44a1-48c7-b5f7-3509f3dd0001')
 or not public.configuracoes_unidade_permitida('cb620078-44a1-48c7-b5f7-3509f3dd0002')
 then raise exception 'Contextos não disponíveis';end if;
 insert into public.usuarios(id,nome_completo,ativo) values(a,'DEMONSTRAÇÃO Configurações A',true),(b,'DEMONSTRAÇÃO Configurações B',true)
 on conflict(id) do nothing;
 insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo) values
 (a,'cb620078-44a1-48c7-b5f7-3509f3dd0001','proprietaria',true),
 (b,'cb620078-44a1-48c7-b5f7-3509f3dd0002','proprietaria',true);
end $$;
commit;
