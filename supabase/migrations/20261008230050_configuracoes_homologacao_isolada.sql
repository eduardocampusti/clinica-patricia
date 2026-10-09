-- PROPOSTA LOCAL. Sem seeds/contextos/contas. Alvo exclusivo xftnkusbyqzyvzrovroj.
-- Ordem seletiva: acesso direto230000 -> proteções230100 -> Configurações213000
-- -> este isolamento -> supabase/tools/acesso-direto-proteger-configuracoes.sql.
begin;
create table public.configuracoes_homologacao_contextos (
 clinica_id uuid primary key references public.clinicas(id) on delete restrict,
 slug text not null unique,
 ativo boolean not null default false,
 expira_em timestamptz not null,
 criado_em timestamptz not null default now(),
 check((clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701' and slug='homologacao-configuracoes-a')
    or (clinica_id='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702' and slug='homologacao-configuracoes-b')),
 check(expira_em>criado_em and expira_em<=criado_em+interval '48 hours')
);
alter table public.configuracoes_homologacao_contextos enable row level security;
revoke all on public.configuracoes_homologacao_contextos from public,anon,authenticated;
grant select,insert,update on public.configuracoes_homologacao_contextos to service_role;
-- Só os dois aliases fixos; nenhum slug/UUID arbitrário pode tornar-se público.
alter table public.configuracoes_publicas drop constraint configuracoes_publicas_slug_check;
alter table public.configuracoes_publicas add constraint configuracoes_publicas_slug_check
 check(slug in ('brotas','ipupiara','homologacao-configuracoes-a','homologacao-configuracoes-b'));

create or replace function public.configuracoes_unidade_permitida(p_clinica uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.clinicas c where c.id=p_clinica and c.ativo
 and (c.subdomain in ('brotas','ipupiara') or exists(select 1 from public.configuracoes_homologacao_contextos h
 where h.clinica_id=c.id and h.slug=c.subdomain and h.ativo and h.expira_em>statement_timestamp())));
$$;
create or replace function public.configuracoes_slug_permitido(p_slug text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.clinicas c where c.subdomain=p_slug and public.configuracoes_unidade_permitida(c.id));
$$;
create or replace function public.configuracoes_padrao_consultar(p_escopo text) returns jsonb
language sql stable security definer set search_path='' as $$
 -- O teste herda um padrão SINTÉTICO, nunca dados/ativos da apresentação geral real.
 select case when p_escopo in ('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701','7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702')
 then jsonb_build_object('escopo','geral','revisao',0,'aplicado',0,
 'campos_aplicados',jsonb_build_object('cor','#006194','loginMensagem','Demonstração — padrão fictício','paginas',true),
 'variacoes_aplicadas','{}'::jsonb)
 else coalesce((select to_jsonb(g) from public.configuracoes_escopos g where escopo='geral'),'{}'::jsonb) end;
$$;
-- ACLs dos helpers permanecem as da migração base: somente service_role.
-- Nenhum dado de clínica/conta/contexto é criado nem concedido nesta migração.
notify pgrst,'reload schema';
commit;
