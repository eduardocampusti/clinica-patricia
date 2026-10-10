-- R4 AUTORIZADA pelo usuário em 09/10/2026, máximo16 contas/8 contextos; uso único.
-- Somente executar após decisão explícita sobre máximo16/8.
-- PROPOSTA NÃO EXECUTADA REMOTAMENTE. Exige autorização adicional para DOIS contextos.
-- Executar seletivamente SOMENTE xftnkusbyqzyvzrovroj, após as cinco etapas do roteiro13.
-- Não é migration estrutural; são fixtures institucionais limitadas e encerráveis.
begin;
do $$ begin
 if to_regclass('public.configuracoes_homologacao_contextos') is null
 or not exists(select 1 from pg_policies where schemaname='public' and tablename='configuracoes_homologacao_contextos' and policyname='acesso_direto_bloqueio')
 then raise exception 'Isolamento/proteções não instalados';end if;
 if exists(select 1 from public.clinicas where id in ('ed002c24-5c6c-4e8c-b90c-aa4751280001','ed002c24-5c6c-4e8c-b90c-aa4751280002')
 or subdomain in ('homologacao-configuracoes-r4-a','homologacao-configuracoes-r4-b'))
 then raise exception 'Fixture já existe: consultar e encerrar, não recriar/reativar';end if;
end $$;
insert into public.clinicas(id,nome,cidade,subdomain,ativo,cnpj,logo_url,cor_primaria,cor_secundaria,cor_menu)
values
 ('ed002c24-5c6c-4e8c-b90c-aa4751280001','DEMONSTRAÇÃO Configurações A','Cidade fictícia A','homologacao-configuracoes-r4-a',true,null,null,'#006194','#006194','#006194'),
 ('ed002c24-5c6c-4e8c-b90c-aa4751280002','DEMONSTRAÇÃO Configurações B','Cidade fictícia B','homologacao-configuracoes-r4-b',true,null,null,'#006194','#006194','#006194');
insert into public.configuracoes_homologacao_contextos(clinica_id,slug,ativo,expira_em)
values
 ('ed002c24-5c6c-4e8c-b90c-aa4751280001','homologacao-configuracoes-r4-a',true,now()+interval '24 hours'),
 ('ed002c24-5c6c-4e8c-b90c-aa4751280002','homologacao-configuracoes-r4-b',true,now()+interval '24 hours');
-- Sem vínculos/empresa/pacientes/menu/domínio. Nome/cidade fictícios são sua fonte oficial.
-- CNPJ/endereço/logo entram depois SOMENTE pelo serviço real de Configurações.
commit;
