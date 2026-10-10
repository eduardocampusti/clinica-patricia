// PostgreSQL LOCAL: somente banco descartável próprio em 127.0.0.1:55449.
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
const exe=path.resolve('scratch/tools/postgresql-17.11/pgsql/bin/psql.exe'),db=`cfg_r2_${Date.now()}`,base='database/proposals/configuracoes/r2/',dir='scratch/configuracoes-r2'
fs.mkdirSync(dir,{recursive:true})
const run=(database,args)=>execFileSync(exe,['-X','-h','127.0.0.1','-p','55449','-U','postgres','-d',database,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,PGCLIENTENCODING:'UTF8'},timeout:30000})
const query=s=>run(db,['-At','-c',s]).trim()
const file=f=>run(db,['-f',f])
const checks=[]
function check(nome,ok){checks.push({nome,aprovado:ok});if(!ok)throw Error(nome)}
let created=false
try {
 run('postgres',['-c',`create database ${db}`]);created=true
 const original=fs.readFileSync('supabase/migrations/20261008230050_configuracoes_homologacao_isolada.sql','utf8').replaceAll('\r\n','\n')
 const table=original.slice(original.indexOf('create table public.configuracoes_homologacao_contextos'),original.indexOf('alter table public.configuracoes_homologacao_contextos'))
 const func=original.slice(original.indexOf('create or replace function public.configuracoes_padrao_consultar'),original.indexOf('-- ACLs dos helpers'))
 const fixture=`create schema acesso_direto;create schema auth;create table auth.users(email text);create table acesso_direto.controle(protecoes_instaladas boolean,habilitado boolean,homologacao_habilitada boolean);insert into acesso_direto.controle values(true,false,false);
 create table public.clinicas(id uuid primary key,subdomain text unique,ativo boolean);${table}
 create table public.configuracoes_publicas(slug text constraint configuracoes_publicas_slug_check check(slug in ('brotas','ipupiara','homologacao-configuracoes-a','homologacao-configuracoes-b')));
 create table public.configuracoes_escopos(escopo text,revisao int,campos_aplicados jsonb);insert into public.configuracoes_escopos values('geral',7,'{"loginMensagem":"FONTE GERAL SINTÉTICA DA FIXTURE"}');${func}
 revoke all on function public.configuracoes_padrao_consultar(text) from public,anon,authenticated;grant execute on function public.configuracoes_padrao_consultar(text) to service_role;`
 fs.writeFileSync(dir+'/fixture.sql',fixture);file(dir+'/fixture.sql')
 check('Impressão da função local idêntica à leitura oficial revisada',query("select md5(pg_get_functiondef('public.configuracoes_padrao_consultar(text)'::regprocedure))") === '4d05a17853b7fc3212a7f77c2da611a2')
 file(base+'20261009075000_configuracoes_homologacao_r2.sql')
 check('Migration adicional executa e conserva ACL restrita',query("select has_function_privilege('service_role','public.configuracoes_padrao_consultar(text)','EXECUTE') and not has_function_privilege('anon','public.configuracoes_padrao_consultar(text)','EXECUTE') and not has_function_privilege('authenticated','public.configuracoes_padrao_consultar(text)','EXECUTE')")==='t')
 check('Novos contextos recebem apenas padrão fictício; geral anterior preservado',query("select public.configuracoes_padrao_consultar('ed60a2c6-59c8-45bc-80b7-e53aa005da01')->>'revisao'='0' and public.configuracoes_padrao_consultar('ed60a2c6-59c8-45bc-80b7-e53aa005da02')->>'revisao'='0' and public.configuracoes_padrao_consultar('geral')->>'revisao'='7'")==='t')
 file(base+'recuperar-antes-de-consumir.sql')
 check('Recuperação antes de consumo restaura função exata',query("select md5(pg_get_functiondef('public.configuracoes_padrao_consultar(text)'::regprocedure))")==='4d05a17853b7fc3212a7f77c2da611a2')
 file(base+'20261009075000_configuracoes_homologacao_r2.sql')
 query("insert into public.clinicas values('ed60a2c6-59c8-45bc-80b7-e53aa005da01','homologacao-configuracoes-r2-a',false),('ed60a2c6-59c8-45bc-80b7-e53aa005da02','homologacao-configuracoes-r2-b',false);insert into public.configuracoes_homologacao_contextos(clinica_id,slug,ativo,expira_em) values('ed60a2c6-59c8-45bc-80b7-e53aa005da01','homologacao-configuracoes-r2-a',false,now()+interval '24 hours'),('ed60a2c6-59c8-45bc-80b7-e53aa005da02','homologacao-configuracoes-r2-b',false,now()+interval '24 hours');insert into public.configuracoes_publicas values('brotas'),('ipupiara'),('homologacao-configuracoes-a'),('homologacao-configuracoes-b'),('homologacao-configuracoes-r2-a'),('homologacao-configuracoes-r2-b')")
 check('Pares e slugs aprovados aceitos sem alterar TTL',query("select (select count(*) from public.configuracoes_homologacao_contextos)=2 and (select count(*) from public.configuracoes_publicas)=6 and exists(select 1 from pg_constraint where conrelid='public.configuracoes_homologacao_contextos'::regclass and conname='configuracoes_homologacao_contextos_check1')")==='t')
 for(const [nome,statement] of [['Par trocado recusado',"update public.configuracoes_homologacao_contextos set slug='homologacao-configuracoes-a' where slug='homologacao-configuracoes-r2-a'"],['Alias arbitrário recusado',"insert into public.configuracoes_publicas values('homologacao-configuracoes-r2-c')"],['TTL superior a 48h recusado',"update public.configuracoes_homologacao_contextos set expira_em=criado_em+interval '49 hours'"],['Recuperação após consumo não apaga nem estreita histórico',null]]){
  let refused=false;try{statement?query(statement):file(base+'recuperar-antes-de-consumir.sql')}catch(e){refused=String(e.stderr).includes(statement?'23514':'R2 já consumida')};check(nome,refused)
 }
 check('Histórico fictício preservado após recusas',query('select count(*)=2 from public.configuracoes_homologacao_contextos')==='t')
} catch(e) { checks.push({erro:String(e.stderr??e.message)});process.exitCode=1 }
finally { if(created)run('postgres',['-c',`drop database ${db}`]);fs.writeFileSync(dir+'/sql-local.json',JSON.stringify({ambiente:'PostgreSQL local 127.0.0.1:55449; fixture sintética, não sessão Auth/RLS conectada',em:new Date().toISOString(),checks,banco_descartavel_encerrado:created},null,2));console.log(JSON.stringify({grupos:checks.filter(c=>c.nome).length,aprovados:checks.filter(c=>c.aprovado).length,erro:checks.find(c=>c.erro)?.erro,banco_descartavel_encerrado:created})) }
