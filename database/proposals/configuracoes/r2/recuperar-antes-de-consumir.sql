-- Não executado. Recuperação somente ANTES de existirem fixtures R2. Não remove histórico.
begin;
do $$ begin
 if exists(select 1 from public.clinicas where id in ('ed60a2c6-59c8-45bc-80b7-e53aa005da01','ed60a2c6-59c8-45bc-80b7-e53aa005da02')) or exists(select 1 from auth.users where email in ('cfg-a.20261009.r2@configuracoes.example.invalid','cfg-b.20261009.r2@configuracoes.example.invalid')) then raise exception 'R2 já consumida: encerrar e preservar histórico; não estreitar CHECK'; end if;
 if exists(select 1 from public.configuracoes_publicas where slug in ('homologacao-configuracoes-r2-a','homologacao-configuracoes-r2-b')) then raise exception 'Projeção R2 existente: investigar sem apagar'; end if;
end $$;
alter table public.configuracoes_homologacao_contextos drop constraint configuracoes_homologacao_contextos_check;
alter table public.configuracoes_homologacao_contextos add constraint configuracoes_homologacao_contextos_check check((clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701' and slug='homologacao-configuracoes-a') or (clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702' and slug='homologacao-configuracoes-b'));
alter table public.configuracoes_publicas drop constraint configuracoes_publicas_slug_check;
alter table public.configuracoes_publicas add constraint configuracoes_publicas_slug_check check(slug in ('brotas','ipupiara','homologacao-configuracoes-a','homologacao-configuracoes-b'));
create or replace function public.configuracoes_padrao_consultar(p_escopo text) returns jsonb
language sql stable security definer set search_path='' as $$
 -- O teste herda um padrão SINTÉTICO, nunca dados/ativos da apresentação geral real.
 select case when p_escopo in ('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701','7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702')
 then jsonb_build_object('escopo','geral','revisao',0,'aplicado',0,
 'campos_aplicados',jsonb_build_object('cor','#006194','loginMensagem','Demonstração — padrão fictício','paginas',true),
 'variacoes_aplicadas','{}'::jsonb)
 else coalesce((select to_jsonb(g) from public.configuracoes_escopos g where escopo='geral'),'{}'::jsonb) end;
$$;

notify pgrst,'reload schema';
commit;
