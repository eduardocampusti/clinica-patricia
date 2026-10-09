-- PROPOSTA NÃO EXECUTADA REMOTAMENTE. Exige autorização adicional para DOIS contextos.
-- Executar seletivamente SOMENTE xftnkusbyqzyvzrovroj, após as cinco etapas do roteiro13.
-- Não é migration estrutural; são fixtures institucionais limitadas e encerráveis.
begin;
do $$ begin
 if to_regclass('public.configuracoes_homologacao_contextos') is null
 or not exists(select 1 from pg_policies where schemaname='public' and tablename='configuracoes_homologacao_contextos' and policyname='acesso_direto_bloqueio')
 then raise exception 'Isolamento/proteções não instalados';end if;
 if exists(select 1 from public.clinicas where id in ('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701','7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702')
 or subdomain in ('homologacao-configuracoes-a','homologacao-configuracoes-b'))
 then raise exception 'Fixture já existe: consultar e encerrar, não recriar/reativar';end if;
end $$;
insert into public.clinicas(id,nome,cidade,subdomain,ativo,cnpj,logo_url,cor_primaria,cor_secundaria,cor_menu)
values
 ('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701','DEMONSTRAÇÃO Configurações A','Cidade fictícia A','homologacao-configuracoes-a',true,null,null,'#006194','#006194','#006194'),
 ('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702','DEMONSTRAÇÃO Configurações B','Cidade fictícia B','homologacao-configuracoes-b',true,null,null,'#006194','#006194','#006194');
insert into public.configuracoes_homologacao_contextos(clinica_id,slug,ativo,expira_em)
values
 ('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701','homologacao-configuracoes-a',true,now()+interval '24 hours'),
 ('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702','homologacao-configuracoes-b',true,now()+interval '24 hours');
-- Sem vínculos/empresa/pacientes/menu/domínio. Nome/cidade fictícios são sua fonte oficial.
-- CNPJ/endereço/logo entram depois SOMENTE pelo serviço real de Configurações.
commit;
