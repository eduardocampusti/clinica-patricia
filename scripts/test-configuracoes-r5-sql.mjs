// PostgreSQL LOCAL descartável. Não conecta ao Supabase nem cria fixtures Auth reais.
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
const root=process.cwd(),exe=path.join(root,'scratch/tools/postgresql-17.11/pgsql/bin/psql.exe')
const nome='cfg_r5_'+Date.now(),pasta=path.join(root,'scratch/configuracoes-r5-sql');fs.mkdirSync(pasta,{recursive:true})
const run=(db,args)=>execFileSync(exe,['-X','-h','127.0.0.1','-p','55449','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,PGCLIENTENCODING:'UTF8'},timeout:30000})
const q=s=>run(nome,['-At','-c',s]).trim(),file=f=>run(nome,['-f',f])
const resultados=[];let criado=false
const check=(requisito,ok)=>{resultados.push({requisito,aprovado:ok});if(!ok)throw Error(requisito)}
try{
 run('postgres',['-c',`create database ${nome}`]);criado=true
 const r4=fs.readFileSync('database/proposals/configuracoes/homologacao-r4/20261009210000_configuracoes_homologacao_r4.sql','utf8').replaceAll('\r\n','\n')
 const inicio=r4.indexOf('create or replace function public.configuracoes_padrao_consultar'),fim=r4.indexOf('$$;',inicio)+3
 const checkCtx=r4.split('\n').find(x=>x.startsWith('alter table public.configuracoes_homologacao_contextos add'))
 const checkPub=r4.split('\n').find(x=>x.startsWith('alter table public.configuracoes_publicas add'))
 const fixture=`create schema auth;create schema acesso_direto;create table auth.users(email text);create table acesso_direto.controle(protecoes_instaladas boolean,habilitado boolean,homologacao_habilitada boolean);insert into acesso_direto.controle values(true,true,false);
 create table public.clinicas(id uuid primary key,subdomain text unique,ativo boolean);create table public.configuracoes_homologacao_contextos(clinica_id uuid,slug text,ativo boolean);${checkCtx}
 create table public.configuracoes_publicas(slug text);${checkPub}
 create table public.configuracoes_escopos(escopo text,revisao int,campos_aplicados jsonb);insert into public.configuracoes_escopos values('geral',7,'{"loginMensagem":"PADRÃO SINTÉTICO"}');${r4.slice(inicio,fim)}
 revoke all on function public.configuracoes_padrao_consultar(text) from public,anon,authenticated;grant execute on function public.configuracoes_padrao_consultar(text) to service_role;`
 fs.writeFileSync(path.join(pasta,'fixture.sql'),fixture);file(path.join(pasta,'fixture.sql'))
 check('Fonte local reproduz fingerprint oficial R4',q("select md5(pg_get_functiondef('public.configuracoes_padrao_consultar(text)'::regprocedure))")==='bd673752bb868b3893027d121d5e215d')
 file('database/proposals/configuracoes/homologacao-r5/20261009220000_configuracoes_homologacao_r5.sql')
 check('Migration R5 compila e preserva ACL restrita',q("select has_function_privilege('service_role','public.configuracoes_padrao_consultar(text)','EXECUTE') and not has_function_privilege('authenticated','public.configuracoes_padrao_consultar(text)','EXECUTE') and not has_function_privilege('anon','public.configuracoes_padrao_consultar(text)','EXECUTE')")==='t')
 check('Fonte geral canônica permanece inalterada',q("select public.configuracoes_padrao_consultar('geral')->>'revisao'")==='7')
 for(const id of ['ed002c24-5c6c-4e8c-b90c-aa4751280001','dcf5302b-1a4e-4eb7-b2cc-a88a77150001','dcf5302b-1a4e-4eb7-b2cc-a88a77150002'])check('Contexto histórico/novo conserva padrão sintético '+id,q(`select public.configuracoes_padrao_consultar('${id}')->>'revisao'`)==='0')
 q("insert into public.clinicas values('dcf5302b-1a4e-4eb7-b2cc-a88a77150001','homologacao-configuracoes-r5-a',false)")
 let recusada=false;try{file('database/proposals/configuracoes/homologacao-r5/20261009220000_configuracoes_homologacao_r5.sql')}catch{recusada=true}check('Reaplicação não passa após consumo/alteração de fingerprint',recusada)
 check('Histórico fictício preservado após recusa',q('select count(*) from public.clinicas')==='1')
}catch(e){resultados.push({erro:String(e.stderr??e.message).slice(0,600)});process.exitCode=1}
finally{if(criado)run('postgres',['-c',`drop database ${nome}`]);fs.writeFileSync(path.join(pasta,'resultado.json'),JSON.stringify({ambiente:'PostgreSQL LOCAL55449; sintético, sem Supabase/Auth real',data:new Date().toISOString(),resultados,bancoDescartavelEncerrado:criado},null,2));console.log(JSON.stringify({testes:resultados.filter(x=>x.requisito).length,aprovados:resultados.filter(x=>x.aprovado).length,erro:resultados.find(x=>x.erro)?.erro,bancoDescartavelEncerrado:criado}))}
