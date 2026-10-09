-- R2 autorizada uma única vez; NÃO EXECUTADA. Condição: sessão legítima do criador comprovada antes de consumir recursos.
-- PROPOSTA NÃO EXECUTADA REMOTAMENTE. Exige autorização adicional para DOIS contextos.
-- Executar seletivamente SOMENTE xftnkusbyqzyvzrovroj, após as cinco etapas do roteiro13.
-- Não é migration estrutural; são fixtures institucionais limitadas e encerráveis.
begin;
do $$ begin
 if to_regclass('public.configuracoes_homologacao_contextos') is null
 or not exists(select 1 from pg_policies where schemaname='public' and tablename='configuracoes_homologacao_contextos' and policyname='acesso_direto_bloqueio')
 then raise exception 'Isolamento/proteções não instalados';end if;
 if exists(select 1 from public.clinicas where id in ('ed60a2c6-59c8-45bc-80b7-e53aa005da01','ed60a2c6-59c8-45bc-80b7-e53aa005da02')
 or subdomain in ('homologacao-configuracoes-r2-a','homologacao-configuracoes-r2-b'))
 then raise exception 'Fixture já existe: consultar e encerrar, não recriar/reativar';end if;
end $$;
insert into public.clinicas(id,nome,cidade,subdomain,ativo,cnpj,logo_url,cor_primaria,cor_secundaria,cor_menu)
values
 ('ed60a2c6-59c8-45bc-80b7-e53aa005da01','DEMONSTRAÇÃO Configurações A','Cidade fictícia A','homologacao-configuracoes-r2-a',true,null,null,'#006194','#006194','#006194'),
 ('ed60a2c6-59c8-45bc-80b7-e53aa005da02','DEMONSTRAÇÃO Configurações B','Cidade fictícia B','homologacao-configuracoes-r2-b',true,null,null,'#006194','#006194','#006194');
insert into public.configuracoes_homologacao_contextos(clinica_id,slug,ativo,expira_em)
values
 ('ed60a2c6-59c8-45bc-80b7-e53aa005da01','homologacao-configuracoes-r2-a',true,now()+interval '24 hours'),
 ('ed60a2c6-59c8-45bc-80b7-e53aa005da02','homologacao-configuracoes-r2-b',true,now()+interval '24 hours');
-- Sem vínculos/empresa/pacientes/menu/domínio. Nome/cidade fictícios são sua fonte oficial.
-- CNPJ/endereço/logo entram depois SOMENTE pelo serviço real de Configurações.
commit;
