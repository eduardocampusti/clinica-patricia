-- Autorizada em 09/10/2026; aplicação seletiva somente xftnkusbyqzyvzrovroj.
begin;
do $$ begin
 if md5(pg_get_functiondef('public.configuracoes_padrao_consultar(text)'::regprocedure)) <> 'ad8fe4e81ac543b66e7146d2a1205dcd' then raise exception 'Função mudou; não substituir';end if;
 if (select md5(pg_get_constraintdef(oid)) from pg_constraint where conrelid='public.configuracoes_homologacao_contextos'::regclass and conname='configuracoes_homologacao_contextos_check') is distinct from '0aabc82a687ab43904dd6a11c3247048' then raise exception 'CHECK dos contextos mudou';end if;
 if (select md5(pg_get_constraintdef(oid)) from pg_constraint where conrelid='public.configuracoes_publicas'::regclass and conname='configuracoes_publicas_slug_check') is distinct from '73eb9e8bc2a59df82a4327cfe25fc980' then raise exception 'CHECK público mudou';end if;
 if exists(select 1 from public.configuracoes_homologacao_contextos where ativo) then raise exception 'Encerrar contextos anteriores';end if;
 if not exists(select 1 from acesso_direto.controle where protecoes_instaladas and not habilitado and not homologacao_habilitada) then raise exception 'Preservar proteções e gates desligados';end if;
 if exists(select 1 from public.clinicas where id in ('cb620078-44a1-48c7-b5f7-3509f3dd0001','cb620078-44a1-48c7-b5f7-3509f3dd0002') or subdomain in ('homologacao-configuracoes-r3-a','homologacao-configuracoes-r3-b')) then raise exception 'R3 já existe; não recriar ou reativar';end if;
 if exists(select 1 from auth.users where email in ('cfg-a.20261009.r3@configuracoes.example.invalid','cfg-b.20261009.r3@configuracoes.example.invalid')) then raise exception 'Emails R3 já utilizados';end if;
end $$;
alter table public.configuracoes_homologacao_contextos drop constraint configuracoes_homologacao_contextos_check;
alter table public.configuracoes_homologacao_contextos add constraint configuracoes_homologacao_contextos_check check (
 (clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701' and slug='homologacao-configuracoes-a') or
 (clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702' and slug='homologacao-configuracoes-b') or
 (clinica_id='ed60a2c6-59c8-45bc-80b7-e53aa005da01' and slug='homologacao-configuracoes-r2-a') or
 (clinica_id='ed60a2c6-59c8-45bc-80b7-e53aa005da02' and slug='homologacao-configuracoes-r2-b') or
 (clinica_id='cb620078-44a1-48c7-b5f7-3509f3dd0001' and slug='homologacao-configuracoes-r3-a') or
 (clinica_id='cb620078-44a1-48c7-b5f7-3509f3dd0002' and slug='homologacao-configuracoes-r3-b'));
alter table public.configuracoes_publicas drop constraint configuracoes_publicas_slug_check;
alter table public.configuracoes_publicas add constraint configuracoes_publicas_slug_check check (
 slug in ('brotas','ipupiara','homologacao-configuracoes-a','homologacao-configuracoes-b','homologacao-configuracoes-r2-a','homologacao-configuracoes-r2-b','homologacao-configuracoes-r3-a','homologacao-configuracoes-r3-b'));
create or replace function public.configuracoes_padrao_consultar(p_escopo text) returns jsonb
language sql stable security definer set search_path='' as $$
 -- O teste herda um padrão SINTÉTICO, nunca dados/ativos da apresentação geral real.
 select case when p_escopo in ('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701','7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702','ed60a2c6-59c8-45bc-80b7-e53aa005da01','ed60a2c6-59c8-45bc-80b7-e53aa005da02','cb620078-44a1-48c7-b5f7-3509f3dd0001','cb620078-44a1-48c7-b5f7-3509f3dd0002')
 then jsonb_build_object('escopo','geral','revisao',0,'aplicado',0,
 'campos_aplicados',jsonb_build_object('cor','#006194','loginMensagem','Demonstração — padrão fictício','paginas',true),
 'variacoes_aplicadas','{}'::jsonb)
 else coalesce((select to_jsonb(g) from public.configuracoes_escopos g where escopo='geral'),'{}'::jsonb) end;
$$;
do $$ begin
 if has_function_privilege('anon','public.configuracoes_padrao_consultar(text)','EXECUTE') or has_function_privilege('authenticated','public.configuracoes_padrao_consultar(text)','EXECUTE') or not has_function_privilege('service_role','public.configuracoes_padrao_consultar(text)','EXECUTE') then raise exception 'ACL divergente; rollback';end if;
end $$;
notify pgrst,'reload schema';
commit;
