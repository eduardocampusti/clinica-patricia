-- R2 autorizada uma única vez; NÃO EXECUTADA. Condição: sessão legítima do criador comprovada antes de consumir recursos.
-- TEMPLATE NÃO EXECUTADO. Gerar UUIDs concretos após criar C-A/C-B pelo Admin Auth,
-- sem e-mail, com app_metadata.homologacao_configuracoes=20261009-r2-a ou 20261009-r2-b.
-- __CFG_A_UUID__ / __CFG_B_UUID__ são UUIDs, não tokens/credenciais.
begin;
set local request.jwt.claims='{"role":"service_role"}';
do $$ declare a uuid:='__CFG_A_UUID__';b uuid:='__CFG_B_UUID__';begin
 if a=b or not exists(select 1 from auth.users where id=a and email='cfg-a.20261009.r2@configuracoes.example.invalid' and raw_app_meta_data->>'homologacao_configuracoes'='20261009-r2-a' and created_at>statement_timestamp()-interval '1 hour' and banned_until is null)
 or not exists(select 1 from auth.users where id=b and email='cfg-b.20261009.r2@configuracoes.example.invalid' and raw_app_meta_data->>'homologacao_configuracoes'='20261009-r2-b' and created_at>statement_timestamp()-interval '1 hour' and banned_until is null)
 then raise exception 'Usar somente as DUAS contas novas exclusivas desta homologação';end if;
 if exists(select 1 from public.usuarios_clinicas where usuario_id in(a,b))
 or exists(select 1 from acesso_direto.operacoes where auth_user_id in(a,b))
 then raise exception 'Conta já vinculada/operada: não sobrescrever nem reativar';end if;
 if exists(select 1 from public.usuarios where id in(a,b) and ativo is distinct from true)
 then raise exception 'Perfil encerrado: não reativar';end if;
 if not public.configuracoes_unidade_permitida('ed60a2c6-59c8-45bc-80b7-e53aa005da01')
 or not public.configuracoes_unidade_permitida('ed60a2c6-59c8-45bc-80b7-e53aa005da02')
 then raise exception 'Contextos não disponíveis';end if;
 insert into public.usuarios(id,nome_completo,ativo) values(a,'DEMONSTRAÇÃO Configurações A',true),(b,'DEMONSTRAÇÃO Configurações B',true)
 on conflict(id) do nothing;
 insert into public.usuarios_clinicas(usuario_id,clinica_id,papel,ativo) values
 (a,'ed60a2c6-59c8-45bc-80b7-e53aa005da01','proprietaria',true),
 (b,'ed60a2c6-59c8-45bc-80b7-e53aa005da02','proprietaria',true);
end $$;
commit;
