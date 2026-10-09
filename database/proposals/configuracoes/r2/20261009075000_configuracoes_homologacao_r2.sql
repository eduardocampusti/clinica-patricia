-- APROVADA EXCLUSIVAMENTE PARA xftnkusbyqzyvzrovroj; AINDA NÃO APLICADA.
-- Condição do titular: comprovar primeiro a sessão legítima do criador.
-- Não cria contas/contextos; não reaplica migrations anteriores.
begin;
do $$ begin
 if md5(pg_get_functiondef('public.configuracoes_padrao_consultar(text)'::regprocedure)) <> '4d05a17853b7fc3212a7f77c2da611a2'
 then raise exception 'Padrão vigente diverge da leitura revisada: não substituir'; end if;
 if not exists(select 1 from acesso_direto.controle where protecoes_instaladas and not habilitado and not homologacao_habilitada)
 then raise exception 'Preservar gates gerais desligados e proteções instaladas'; end if;
 if exists(select 1 from public.configuracoes_homologacao_contextos where ativo)
 then raise exception 'Reconciliação dos contextos anteriores obrigatória'; end if;
 if exists(select 1 from public.clinicas where id in ('ed60a2c6-59c8-45bc-80b7-e53aa005da01','ed60a2c6-59c8-45bc-80b7-e53aa005da02') or subdomain in ('homologacao-configuracoes-r2-a','homologacao-configuracoes-r2-b'))
 then raise exception 'Fixtures R2 já existem: não recriar ou reativar'; end if;
 if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.configuracoes_homologacao_contextos'::regclass and conname='configuracoes_homologacao_contextos_check') is distinct from
 'CHECK ((((clinica_id = ''7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701''::uuid) AND (slug = ''homologacao-configuracoes-a''::text)) OR ((clinica_id = ''7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702''::uuid) AND (slug = ''homologacao-configuracoes-b''::text))))'
 then raise exception 'Restrição vigente dos contextos diverge'; end if;
 if (select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.configuracoes_publicas'::regclass and conname='configuracoes_publicas_slug_check') is distinct from
 'CHECK ((slug = ANY (ARRAY[''brotas''::text, ''ipupiara''::text, ''homologacao-configuracoes-a''::text, ''homologacao-configuracoes-b''::text])))'
 then raise exception 'Restrição pública vigente diverge'; end if;
end $$;
alter table public.configuracoes_homologacao_contextos drop constraint configuracoes_homologacao_contextos_check;
alter table public.configuracoes_homologacao_contextos add constraint configuracoes_homologacao_contextos_check check (
 (clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701' and slug='homologacao-configuracoes-a') or
 (clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702' and slug='homologacao-configuracoes-b') or
 (clinica_id='ed60a2c6-59c8-45bc-80b7-e53aa005da01' and slug='homologacao-configuracoes-r2-a') or
 (clinica_id='ed60a2c6-59c8-45bc-80b7-e53aa005da02' and slug='homologacao-configuracoes-r2-b'));
alter table public.configuracoes_publicas drop constraint configuracoes_publicas_slug_check;
alter table public.configuracoes_publicas add constraint configuracoes_publicas_slug_check check (
 slug in ('brotas','ipupiara','homologacao-configuracoes-a','homologacao-configuracoes-b','homologacao-configuracoes-r2-a','homologacao-configuracoes-r2-b'));
create or replace function public.configuracoes_padrao_consultar(p_escopo text) returns jsonb
language sql stable security definer set search_path='' as $$
 -- O teste herda um padrão SINTÉTICO, nunca dados/ativos da apresentação geral real.
 select case when p_escopo in ('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701','7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702','ed60a2c6-59c8-45bc-80b7-e53aa005da01','ed60a2c6-59c8-45bc-80b7-e53aa005da02')
 then jsonb_build_object('escopo','geral','revisao',0,'aplicado',0,
 'campos_aplicados',jsonb_build_object('cor','#006194','loginMensagem','Demonstração — padrão fictício','paginas',true),
 'variacoes_aplicadas','{}'::jsonb)
 else coalesce((select to_jsonb(g) from public.configuracoes_escopos g where escopo='geral'),'{}'::jsonb) end;
$$;
do $$ begin
 if has_function_privilege('anon','public.configuracoes_padrao_consultar(text)','EXECUTE')
 or has_function_privilege('authenticated','public.configuracoes_padrao_consultar(text)','EXECUTE')
 or not has_function_privilege('service_role','public.configuracoes_padrao_consultar(text)','EXECUTE')
 then raise exception 'ACL do padrão sintético diverge: rollback'; end if;
end $$;
notify pgrst,'reload schema';
commit;
