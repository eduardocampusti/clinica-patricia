-- R5 NÃO AUTORIZADA/NÃO EXECUTADA; máximo proposto18 contas/10 contextos.
-- Somente executar após decisão explícita sobre máximo18/10.
-- PROPOSTA NÃO EXECUTADA REMOTAMENTE. Exige autorização adicional para DOIS contextos.
-- Executar seletivamente SOMENTE xftnkusbyqzyvzrovroj, após as cinco etapas do roteiro13.
-- Não é migration estrutural; são fixtures institucionais limitadas e encerráveis.
begin;
do $$ begin
 if to_regclass('public.configuracoes_homologacao_contextos') is null
 or not exists(select 1 from pg_policies where schemaname='public' and tablename='configuracoes_homologacao_contextos' and policyname='acesso_direto_bloqueio')
 then raise exception 'Isolamento/proteções não instalados';end if;
 if exists(select 1 from public.clinicas where id in ('dcf5302b-1a4e-4eb7-b2cc-a88a77150001','dcf5302b-1a4e-4eb7-b2cc-a88a77150002')
 or subdomain in ('homologacao-configuracoes-r5-a','homologacao-configuracoes-r5-b'))
 then raise exception 'Fixture já existe: consultar e encerrar, não recriar/reativar';end if;
end $$;
insert into public.clinicas(id,nome,cidade,subdomain,ativo,cnpj,logo_url,cor_primaria,cor_secundaria,cor_menu)
values
 ('dcf5302b-1a4e-4eb7-b2cc-a88a77150001','DEMONSTRAÇÃO Configurações A','Cidade fictícia A','homologacao-configuracoes-r5-a',true,null,null,'#006194','#006194','#006194'),
 ('dcf5302b-1a4e-4eb7-b2cc-a88a77150002','DEMONSTRAÇÃO Configurações B','Cidade fictícia B','homologacao-configuracoes-r5-b',true,null,null,'#006194','#006194','#006194');
insert into public.configuracoes_homologacao_contextos(clinica_id,slug,ativo,expira_em)
values
 ('dcf5302b-1a4e-4eb7-b2cc-a88a77150001','homologacao-configuracoes-r5-a',true,now()+interval '24 hours'),
 ('dcf5302b-1a4e-4eb7-b2cc-a88a77150002','homologacao-configuracoes-r5-b',true,now()+interval '24 hours');
-- Sem vínculos/empresa/pacientes/menu/domínio. Nome/cidade fictícios são sua fonte oficial.
-- CNPJ/endereço/logo entram depois SOMENTE pelo serviço real de Configurações.
commit;
