-- LOCAL SINTÉTICO: não executar em produção. Claims simuladas, não sessões Auth reais.
begin;
do $$
declare a uuid:='11111111-1111-4111-8111-111111111111';b uuid:='22222222-2222-4222-8222-222222222222';
 ca uuid:='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701';cb uuid:='7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702';
 prod uuid:='7c2a450d-7b9a-4701-8d5a-982eda331c58';
 estado jsonb;documento jsonb;r jsonb;fonte text;antes text;negado boolean;imagem text;imagem2 text;
begin
 if has_table_privilege('anon','public.configuracoes_homologacao_contextos','SELECT')
 or has_table_privilege('authenticated','public.configuracoes_homologacao_contextos','INSERT')
 or has_function_privilege('anon','public.configuracoes_publicas_consultar(text)','EXECUTE')
 or has_function_privilege('authenticated','public.configuracoes_padrao_consultar(text)','EXECUTE')
 or not has_function_privilege('authenticated','public.acesso_direto_exigir_sessao()','EXECUTE')
 or not has_function_privilege('authenticated','public.configuracoes_timbrado_consultar(uuid)','EXECUTE')
 then raise exception 'ACL expõe contexto/helper interno ou remove guarda autenticada';end if;
 if (select count(*) from pg_policies where schemaname='public' and tablename like 'configuracoes_%' and policyname='acesso_direto_bloqueio' and permissive='RESTRICTIVE')<>6
 then raise exception 'Cobertura restritiva incompleta';end if;
 raise notice 'PASS ACL internas, guarda autenticada e seis políticas restritivas';
 insert into public.clinicas(id,ativo,nome,cidade,subdomain,cnpj) values
 (prod,true,'OFICIAL SINTÉTICA','Cidade oficial','brotas','11111111111111'),
 ('80543c56-328d-400d-89a0-bd6d9352d9c5',true,'OFICIAL B SINTÉTICA','Cidade oficial B','ipupiara',null),
 (ca,true,'DEMONSTRAÇÃO A','Cidade fictícia','homologacao-configuracoes-a',null),
 (cb,true,'DEMONSTRAÇÃO B','Cidade fictícia','homologacao-configuracoes-b',null);
 insert into public.configuracoes_homologacao_contextos(clinica_id,slug,ativo,expira_em) values
 (ca,'homologacao-configuracoes-a',true,now()+interval '24 hours'),
 (cb,'homologacao-configuracoes-b',true,now()+interval '24 hours');
 insert into public.usuarios values(a,'Homologação A',true),(b,'Homologação B',true);
 insert into public.usuarios_clinicas values(a,ca,'proprietaria',true),(b,cb,'proprietaria',true);
 select md5(string_agg(to_jsonb(c)::text,'' order by id)) into antes from public.clinicas c where subdomain in ('brotas','ipupiara');
 -- Padrão real com texto/ativo proibidos aos contextos de teste.
 insert into public.configuracoes_escopos(escopo,campos_aplicados) values('geral','{"loginMensagem":"PADRÃO OFICIAL PRIVADO","logoPrincipal":"geral/99999999-9999-4999-8999-999999999999.png"}');
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 if public.configuracoes_pode(prod::text,a) or public.configuracoes_pode(cb::text,a) or public.configuracoes_pode('geral',a) then raise exception 'Contexto concedeu autorização alheia/global';end if;
 raise notice 'PASS nenhuma autorização Brotas/Ipupiara/outra unidade/global';
 estado:=public.configuracoes_estado_interno(ca::text,a);
 if estado->'geral'->>'loginMensagem'<>'Demonstração — padrão fictício' or (estado->'geral') ? 'logoPrincipal' then raise exception 'Padrão oficial vazou';end if;
 fonte:=estado->>'fonteRevisao';documento:=estado->'documento';
 documento:=jsonb_set(documento,'{campos}','{"loginMensagem":"","paginas":false,"rodape":[]}'::jsonb);
 r:=public.configuracoes_salvar_interno(ca::text,a,0,0,fonte,documento,'rascunho');
 if r->>'revisao'<>'1' or public.configuracoes_estado_interno(ca::text,a)->'documento' is distinct from documento then raise exception 'Rascunho não persistiu';end if;
 if public.configuracoes_publicas_consultar('homologacao-configuracoes-a') is not null then raise exception 'Rascunho publicado';end if;
 raise notice 'PASS persistência/releitura, vazio/false/lista e rascunho não público';
 negado:=false;begin perform public.configuracoes_salvar_interno(ca::text,a,0,0,fonte,documento,'rascunho');exception when sqlstate '40001' then negado:=true;end;
 if not negado then raise exception 'Conflito aceito';end if;
 raise notice 'PASS edição concorrente recusada';
 imagem:=ca::text||'/99999999-9999-4999-8999-999999999991.png';
 imagem2:=ca::text||'/99999999-9999-4999-8999-999999999992.png';
 perform public.configuracoes_ativo_registrar(ca::text,a,imagem,'image/png',96,96,100,repeat('a',64));
 perform public.configuracoes_ativo_registrar(ca::text,a,imagem2,'image/png',96,96,101,repeat('b',64));
 documento:=jsonb_set(documento,'{campos,loginLogo}',to_jsonb(imagem));
 r:=public.configuracoes_salvar_interno(ca::text,a,1,0,fonte,documento,'aplicar',jsonb_build_object('homologacao-configuracoes-a',jsonb_build_object('mensagem','','logo',imagem)));
 if r->>'revisao'<>'2' or public.configuracoes_publicas_consultar('homologacao-configuracoes-a')->'marca'->>'logo'<>imagem or public.configuracoes_publicas_ativo(imagem) is null then raise exception 'Publicação aplicada ausente';end if;
 if public.configuracoes_publicas_consultar('homologacao-configuracoes-b') is not null then raise exception 'Outra projeção mudou';end if;
 if public.configuracoes_publicas_consultar('homologacao-configuracoes-a')->'marca' ? 'instituicao' then raise exception 'Instituição exposta';end if;
 raise notice 'PASS caminho aplicado/público, ativo e isolamento bilateral da projeção';
 fonte:=r->>'fonteRevisao';documento:=jsonb_set(documento,'{campos,loginLogo}',to_jsonb(imagem2));
 r:=public.configuracoes_salvar_interno(ca::text,a,2,0,fonte,documento,'aplicar',jsonb_build_object('homologacao-configuracoes-a',jsonb_build_object('logo',imagem2)));
 if public.configuracoes_publicas_ativo(imagem) is not null or public.configuracoes_publicas_ativo(imagem2) is null or not exists(select 1 from public.configuracoes_ativos where caminho=imagem) then raise exception 'Histórico/remoção pública incorretos';end if;
 raise notice 'PASS substituição preserva ativo anterior privado';
 fonte:=r->>'fonteRevisao';select v.documento into documento from public.configuracoes_versoes v where escopo=ca::text and revisao=2;
 r:=public.configuracoes_salvar_interno(ca::text,a,3,0,fonte,documento,'restaurar','{}',2);
 if r->>'revisao'<>'4' or public.configuracoes_publicas_ativo(imagem2) is null or public.configuracoes_publicas_ativo(imagem) is not null then raise exception 'Restauração aplicou automaticamente';end if;
 raise notice 'PASS restauração cria versão/rascunho sem aplicar';
 negado:=false;begin update public.configuracoes_versoes set origem_versao=7 where escopo=ca::text;exception when others then negado:=true;end;
 if not negado then raise exception 'Histórico mutável';end if;
 if public.configuracoes_ativo_escopo_permitido('geral',ca::text) then raise exception 'Ativo geral real permitido no teste';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 if public.configuracoes_ativo_leitura_autorizada('geral') or public.configuracoes_ativo_leitura_autorizada(cb::text) or not public.configuracoes_ativo_leitura_autorizada(ca::text) then raise exception 'Leitura privada cruzada';end if;
 if public.configuracoes_timbrado_consultar(ca)->'geral'->>'loginMensagem'<>'Demonstração — padrão fictício' then raise exception 'Timbrado herda dado real';end if;
 raise notice 'PASS leitura/assinatura não herda ativos/dados reais';
 negado:=false;begin update public.clinicas set logradouro='Tentativa direta' where id=ca;exception when sqlstate '42501' then negado:=true;end;
 if not negado then raise exception 'Campo novo alterado sem serviço/versionamento';end if;
 update public.usuarios_clinicas set papel='recepcao' where usuario_id=a;
 if public.configuracoes_pode(ca::text,a) then raise exception 'Recepção edita';end if;
 negado:=false;begin update public.clinicas set nome='Tentativa recepção' where id=ca;exception when sqlstate '42501' then negado:=true;end;
 if not negado then raise exception 'Recepção alterou fonte oficial diretamente';end if;
 raise notice 'PASS escrita direta não contorna serviço/papel na fonte oficial';
 raise notice 'PASS papel não administrativo sem edição';
 update public.usuarios_clinicas set papel='proprietaria' where usuario_id=a;
 -- Operaçao pendente bloqueia as RPCs autenticadas recém-inventariadas.
 insert into public.equipe_membros values('33333333-3333-4333-8333-333333333333',null,'Pessoa local',true);
 insert into acesso_direto.operacoes(membro_id,ator_id,contexto_id,email,escopos,chave,payload_hash,auth_user_id,estado)
 values('33333333-3333-4333-8333-333333333333',b,cb,'pendente@acesso-direto.example.invalid','[]',gen_random_uuid(),'sintetico',a,'pendente');
 negado:=false;begin perform public.configuracoes_timbrado_consultar(ca);exception when sqlstate '42501' then negado:=true;end;
 if not negado or public.acesso_direto_sessao_permitida() then raise exception 'Pendente acessou';end if;
 raise notice 'PASS proteção comum cobre as novas RPCs';
 update acesso_direto.operacoes set estado='ativa',liberado_em=now() where auth_user_id=a;
 insert into auth.sessions values('44444444-4444-4444-8444-444444444444',a,now()-interval '1 hour');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','session_id','44444444-4444-4444-8444-444444444444')::text,true);
 if public.acesso_direto_sessao_permitida() then raise exception 'Sessão antiga liberada';end if;
 raise notice 'PASS sessão temporária antiga continua bloqueada';
 update public.configuracoes_homologacao_contextos set ativo=false where clinica_id=ca;
 if public.configuracoes_slug_permitido('homologacao-configuracoes-a') or public.configuracoes_publicas_consultar('homologacao-configuracoes-a') is not null or public.configuracoes_publicas_ativo(imagem2) is not null then raise exception 'Encerramento não bloqueou público';end if;
 if antes is distinct from (select md5(string_agg(to_jsonb(c)::text,'' order by id)) from public.clinicas c where subdomain in ('brotas','ipupiara')) then raise exception 'Clínicas reais alteradas';end if;
 if exists(select 1 from public.configuracoes_publicas where slug in ('brotas','ipupiara')) then raise exception 'Projeção real criada';end if;
 raise notice 'PASS encerramento nega público; fontes/projeções reais intactas';
 update public.configuracoes_homologacao_contextos set ativo=true,criado_em=now()-interval '2 hours',expira_em=now()-interval '1 hour' where clinica_id=ca;
 if public.configuracoes_unidade_permitida(ca) or public.configuracoes_publicas_consultar('homologacao-configuracoes-a') is not null or public.configuracoes_publicas_ativo(imagem2) is not null then raise exception 'Prazo vencido não encerrou leitura pública';end if;
 raise notice 'PASS prazo vencido bloqueia configuração e imagem mesmo com ativo=true';
end $$;
rollback;
