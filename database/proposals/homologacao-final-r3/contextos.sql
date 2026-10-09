-- R3 autorizada em 09/10/2026: ampliação única, máximo acumulado14 contas/6 contextos.
-- PROPOSTA NÃO EXECUTADA REMOTAMENTE. Exige autorização adicional para DOIS contextos.
-- Executar seletivamente SOMENTE xftnkusbyqzyvzrovroj, após as cinco etapas do roteiro13.
-- Não é migration estrutural; são fixtures institucionais limitadas e encerráveis.
begin;
do $$ begin
 if to_regclass('public.configuracoes_homologacao_contextos') is null
 or not exists(select 1 from pg_policies where schemaname='public' and tablename='configuracoes_homologacao_contextos' and policyname='acesso_direto_bloqueio')
 then raise exception 'Isolamento/proteções não instalados';end if;
 if exists(select 1 from public.clinicas where id in ('cb620078-44a1-48c7-b5f7-3509f3dd0001','cb620078-44a1-48c7-b5f7-3509f3dd0002')
 or subdomain in ('homologacao-configuracoes-r3-a','homologacao-configuracoes-r3-b'))
 then raise exception 'Fixture já existe: consultar e encerrar, não recriar/reativar';end if;
end $$;
insert into public.clinicas(id,nome,cidade,subdomain,ativo,cnpj,logo_url,cor_primaria,cor_secundaria,cor_menu)
values
 ('cb620078-44a1-48c7-b5f7-3509f3dd0001','DEMONSTRAÇÃO Configurações A','Cidade fictícia A','homologacao-configuracoes-r3-a',true,null,null,'#006194','#006194','#006194'),
 ('cb620078-44a1-48c7-b5f7-3509f3dd0002','DEMONSTRAÇÃO Configurações B','Cidade fictícia B','homologacao-configuracoes-r3-b',true,null,null,'#006194','#006194','#006194');
insert into public.configuracoes_homologacao_contextos(clinica_id,slug,ativo,expira_em)
values
 ('cb620078-44a1-48c7-b5f7-3509f3dd0001','homologacao-configuracoes-r3-a',true,now()+interval '24 hours'),
 ('cb620078-44a1-48c7-b5f7-3509f3dd0002','homologacao-configuracoes-r3-b',true,now()+interval '24 hours');
-- Sem vínculos/empresa/pacientes/menu/domínio. Nome/cidade fictícios são sua fonte oficial.
-- CNPJ/endereço/logo entram depois SOMENTE pelo serviço real de Configurações.
commit;
