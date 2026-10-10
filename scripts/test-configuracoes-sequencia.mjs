// Somente PostgreSQL LOCAL descartável em 127.0.0.1:55449. Sem credenciais Supabase.
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
const root=process.cwd(),psql=path.join(root,'scratch/tools/postgresql-17.11/pgsql/bin/psql.exe')
if(!fs.existsSync(path.join(root,'scratch/configuracoes-sequencia/pg-data/postmaster.pid')))throw Error('Bancada local separada não iniciada')
const db=`configuracoes_seq_${Date.now()}`
const run=args=>execFileSync(psql,['-X','-h','127.0.0.1','-p','55449','-U','postgres','-v','ON_ERROR_STOP=1',...args],{encoding:'utf8',env:{...process.env,PGCLIENTENCODING:'UTF8'},timeout:30000,stdio:['ignore','pipe','pipe']})
run(['-d','postgres','-c',`create database ${db}`])
const arquivos=['supabase/tests/acesso-direto_fixture.sql','supabase/tests/configuracoes_fixture.sql',
 'supabase/migrations/20261008230000_equipe_acesso_direto.sql',
 'supabase/migrations/20261008230100_equipe_acesso_direto_protecoes.sql',
 'supabase/migrations/20261008213000_configuracoes_institucionais.sql',
 'supabase/migrations/20261008230050_configuracoes_homologacao_isolada.sql',
 'supabase/tools/acesso-direto-proteger-configuracoes.sql',
 'supabase/tests/configuracoes_isolamento_contratos.sql']
const evidencias=[]
for(const arquivo of arquivos){
 try{
  let executar=arquivo
  if(arquivo.endsWith('acesso-direto_fixture.sql')){
   // Os papéis pertencem apenas ao cluster descartável, não ao Supabase Auth.
   run(['-d',db,'-c',`do $$ declare r text; begin foreach r in array array['anon','authenticated','service_role','supabase_auth_admin','authenticator'] loop if not exists(select 1 from pg_roles where rolname=r) then execute format('create role %I',r); end if; end loop; end $$;`])
   executar='scratch/configuracoes-sequencia/fixture-runner.sql'
   fs.writeFileSync(executar,fs.readFileSync(arquivo,'utf8').replace(/^create role .*;\r?\n/gm,''))
  }
  if(arquivo.endsWith('equipe_acesso_direto_protecoes.sql')){
   let recusou=false
   try{run(['-d',db,'-f',arquivo])}catch(e){recusou=String(e.stderr).includes('Catálogo diverge do pacote revisado');if(!recusou)throw e}
   if(!recusou||run(['-d',db,'-At','-c',`select to_regclass('acesso_direto.rpc_inventario') is null`]).trim()!=='t')throw Error('Catálogo divergente deve abortar antes de escrever')
   const hashsql=`select md5(string_agg(n.nspname||'.'||c.relname,E'\n' order by (n.nspname||'.'||c.relname) collate "C")) from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname='public' or n.nspname='storage' and c.relname in ('objects','buckets')) and c.relkind in ('r','p');
select md5(string_agg(p.oid::regprocedure::text||':'||md5(pg_get_functiondef(p.oid)),E'\n' order by (p.oid::regprocedure::text||':'||md5(pg_get_functiondef(p.oid))) collate "C")) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','graphql_public') and p.prokind='f' and p.prorettype not in ('trigger'::regtype,'event_trigger'::regtype) and p.proname not like 'acesso_direto_%' and (p.prosecdef or n.nspname='graphql_public') and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE'));`
   const hashes=run(['-d',db,'-At','-c',hashsql]).trim().split(/\r?\n/)
   const inventario=JSON.parse(fs.readFileSync('database/proposals/acesso-direto/inventario-revisado.json','utf8'))
   const original=fs.readFileSync(arquivo,'utf8')
   for(const h of [inventario.hash_tabelas,inventario.hash_funcoes])if(original.split(h).length!==2)throw Error('Impressão do catálogo não reconhecida')
   executar='scratch/configuracoes-sequencia/protecoes-fixture.sql'
   fs.writeFileSync(executar,original.replace(inventario.hash_tabelas,hashes[0]).replace(inventario.hash_funcoes,hashes[1]).replace('alter role authenticator set pgrst.db_pre_request',`alter role authenticator in database ${db} set pgrst.db_pre_request`))
   evidencias.push({resultado:'catálogo divergente recusado; nenhuma escrita',arquivo,sha256_original:createHash('sha256').update(original).digest('hex'),adaptacao:'Somente hashes da fixture sintética; controles preservados. Artefato ignorado não aplicável ao remoto.'})
  }
  const output=run(['-d',db,'-f',executar]);evidencias.push({arquivo,resultado:'aprovado',output})
  console.log(JSON.stringify({arquivo,resultado:'aprovado'}))
 }catch(e){
  const stderr=String(e.stderr??'Erro local');evidencias.push({arquivo,resultado:'falhou',stderr})
  fs.writeFileSync('scratch/configuracoes-sequencia/sql-local.json',JSON.stringify({bancada:'LOCAL SINTÉTICA; claims não são sessões reais',db,evidencias},null,2))
  console.error(stderr);process.exit(1)
 }
}
// Compilar as operações concretas propostas somente neste banco sintético.
// Auth abaixo é tabela fake: não cria sessões/contas no Supabase.
run(['-d',db,'-f','database/proposals/configuracoes/20261008_contextos_homologacao.sql'])
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222'
run(['-d',db,'-c',`insert into auth.users(id,email,raw_app_meta_data) values('${a}','cfg-a.20261008@configuracoes.example.invalid','{"homologacao_configuracoes":"20261008-a"}'),('${b}','cfg-b.20261008@configuracoes.example.invalid','{"homologacao_configuracoes":"20261008-b"}');`])
const vinculos='scratch/configuracoes-sequencia/vinculos-fixture.sql'
fs.writeFileSync(vinculos,fs.readFileSync('database/proposals/configuracoes/20261008_vinculos_homologacao.sql','utf8').replaceAll('__CFG_A_UUID__',a).replaceAll('__CFG_B_UUID__',b))
run(['-d',db,'-f',vinculos])
let recusou=false
try{run(['-d',db,'-f',vinculos])}catch(e){recusou=String(e.stderr).includes('Conta já vinculada/operada');if(!recusou)throw e}
if(!recusou)throw Error('Não pode reaplicar vínculos/reativar fixtures')
run(['-d',db,'-f','database/proposals/configuracoes/20261008_encerrar_contextos.sql'])
evidencias.push({arquivo:'database/proposals/configuracoes/*',resultado:'seeds/vínculos/encerramento compilados na fixture; repetição de vínculos recusada; nenhuma conta Auth real criada'})
fs.writeFileSync('scratch/configuracoes-sequencia/sql-local.json',JSON.stringify({bancada:'LOCAL SINTÉTICA; claims não são sessões reais',db,evidencias},null,2))
run(['-d','postgres','-c',`drop database ${db}`]) // Só este banco criado pelo runner; evidências conservadas.
console.log('Sequência e contratos locais aprovados. Não comprovam Auth/Edge/Storage conectados.')
