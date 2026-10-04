// Recuperação e limites de privilégio, apenas no mesmo cluster sintético verificado.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { conectar, root } from './banco.mjs';
import { gerarProtecao, protecaoIsolada } from './protecao.mjs';
const db=conectar(process.argv[2]);const info=await db.identidade(db.r.database);const dir=dirname(process.argv[2]);
const S='22222222-2222-4222-8222-222222222222',C='11111111-1111-4111-8111-111111111111';
if(process.argv.includes('--revisao-recuperacao')){
 await revisarRecuperacao();
 process.exit(0);
}
await db.sql('revoke execute on function private.financeiro_proteger_entrada_legado_administrativo() from public,anon,authenticated,service_role;');
writeFileSync(join(root,'database/operations/caixa-legado-brotas/10-protecao-escritor-legado.sql.disabled'),gerarProtecao());
const fonte=readFileSync(join(root,'supabase/migrations/20260927100000_pacientes_cpf_leitura_correcao.sql'),'utf8');
const expected=fonte.match(/create or replace function public\.fn_auditoria\(\)[\s\S]*?end \$\$;/)[0].match(/as \$\$([\s\S]*?)\$\$;/)[1];
const audit=await db.json("select jsonb_build_object('body',prosrc,'definer',prosecdef,'config',proconfig) from pg_proc where oid='public.fn_auditoria()'::regprocedure;");
assert.equal(audit.body,expected);assert.equal(audit.definer,true);assert.deepEqual(audit.config,['search_path=pg_catalog']);
const structure=JSON.parse(readFileSync(join(dir,'estrutura.json'),'utf8'));structure.catalogo.auditoria_real=true;structure.catalogo.auditoria_comparacao='prosrc exato + SECURITY DEFINER + search_path; pg_get_functiondef normaliza cabeçalho';writeFileSync(join(dir,'estrutura.json'),JSON.stringify(structure,null,2)+'\n');
const status=await db.sql(`select status from public.sessoes_caixa where id='${S}';`);assert.equal(status,'fechado');
const insert=`insert into public.entradas_caixa(id,sessao_caixa_id,clinica_id,forma_pagamento,valor,paciente_id,profissional_id) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','${S}','${C}','dinheiro',10,'77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666');`;
const withoutGuard=await db.query(`begin;alter table public.entradas_caixa disable trigger entradas_caixa_legado_administrativo;set role service_role;${insert}select count(*) from public.entradas_caixa where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';rollback;`,{fail:true}).done;
assert.equal(withoutGuard.code,0);assert.equal(withoutGuard.stdout,'1');
assert.equal(await db.sql("select tgenabled from pg_trigger where tgname='entradas_caixa_legado_administrativo';"),'O');
writeFileSync(join(dir,'limite-sem-protecao.json'),JSON.stringify({ensaio:'Baseline sem a trigger proposta, somente transação isolada revertida',service_role_insert_apos_fechamento:1,efeitos_persistidos:0},null,2)+'\n');
// Ensaio não persistente na instância sintética, nunca no principal. Demonstra bypass,
// não remove dados históricos nem modifica permissões para tornar o candidato "verde".
const privilege=await db.query(`begin;set role service_role;${insert}select count(*) from public.entradas_caixa where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';rollback;`,{fail:true}).done;
assert.notEqual(privilege.code,0);assert.match(privilege.stderr,/Histórico legado encerrado/);
async function hashes(database=db.r.database){return db.json(`select jsonb_build_object(
 'sessao',(select md5(to_jsonb(s)::text) from public.sessoes_caixa s where id='${S}'),
 'entradas',(select md5(coalesce(jsonb_agg(to_jsonb(e) order by e.id)::text,'[]')) from public.entradas_caixa e where sessao_caixa_id='${S}'),
 'auditoria',(select md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'[]')) from public.auditoria a),
 'eventos',(select md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'[]')) from public.eventos_auditoria_financeira a));`,{database});}
const before=await hashes();
function tool(name,args){return new Promise((ok,no)=>{const p=spawn(join(db.r.bin,name+'.exe'),args,{env:db.env,windowsHide:true,stdio:['ignore','pipe','pipe']});let err='';p.stderr.on('data',b=>err+=b);p.on('error',no);p.on('close',code=>code===0?ok():no(new Error(err)));});}
const dump=join(dir,'sintetico.dump');const base=['-w','-h',db.r.host,'-p',String(db.r.port),'-U','postgres'];
await tool('pg_dump',[...base,'-d',db.r.database,'-Fc','-f',dump]);
// Segundo banco pertence à MESMA instância exclusiva e só foi criado por este ensaio.
// Repetição não reutiliza outro ambiente: restaura em nome novo, sem limpar o anterior.
const restore=db.r.database+'_restore';
if(await db.sql(`select exists(select 1 from pg_database where datname='${restore}');`,{database:'postgres'})==='t'){
 await db.sql(`drop database ${restore};`,{database:'postgres'});
}
await db.sql(`create database ${restore};`,{database:'postgres'});await db.identidade(restore);
await tool('pg_restore',[...base,'-d',db.r.database+'_restore','--exit-on-error',dump]);
const after=await hashes(db.r.database+'_restore');assert.deepEqual(after,before);
const full=readFileSync(join(root,'supabase/tools/verificar-integridade.sql'),'utf8');
const integrity=await db.query(full,{fail:true}).done;
// Esse script verifica também Auth/Storage/migrations/Pacientes fora deste recorte.
// Rodar por blocos evita tratar ausência dos serviços Supabase como integridade financeira falsa.
const sections=full.split(/-- \d\. /).slice(1);
const checks=[];
for(const part of sections){
 const i=part.indexOf('\n');const title=part.slice(0,i);const query=part.slice(i+1);
 const result=await db.query(query,{fail:true}).done;
 checks.push({secao:title,resultado:result.code===0?'CONSULTADO':'DEPENDENCIA_AUSENTE',erro:result.code===0?null:result.stderr.split('\n')[0]});
}
const out={registro_em:new Date().toISOString(),identidade:info,
 auditoria:{corpo_real_exato:true,security_definer:true,search_path:'pg_catalog',corpo_sha256:createHash('sha256').update(expected).digest('hex')},
 limite_privilegio:{service_role_bypassrls:true,sem_protecao_permitiu:true,com_protecao_permitiu:false,persistiu:false,correcao:'Trigger nova para sessão sintética exata; INSERT/UPDATE/DELETE bloqueados por status/evento administrativo. Só o novo objeto tem EXECUTE direto revogado; permissões existentes e principal intactos.',limite:'Não protege contra DBA que desative/remova triggers, reescreva eventos ou use TRUNCATE; exige controle e recuperação autorizados.'},
 recuperacao:{pg_dump_pg_restore:true,database_restore:db.r.database+'_restore',hashes_antes:before,hashes_depois:after,iguais:true,dump_sha256:createHash('sha256').update(readFileSync(dump)).digest('hex'),limite:'Cópia sintética restaurada; não comprova backup, PITR ou restauração seletiva do principal'},
 integridade:{execucao_integral:integrity.code===0?'OK':'DEPENDENCIA_SUPABASE_AUSENTE',blocos:checks,limite:'Migrations/Storage/Pacientes não reproduzidos integralmente. Resultado do catálogo financeiro confirmado separadamente; script não é prova completa de integridade.'}};
writeFileSync(join(dir,'complementos.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));

// Lacunas de recuperação de objetos. Não reexecuta H01–H12 nem restaura registros.
// Exige laboratório novo e H01/H05 concluídos, com sessão posterior legítima.
async function revisarRecuperacao(){
 const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
 const original=await db.json(`select jsonb_build_object('funcao',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'definer',p.prosecdef,'config',p.proconfig,'trigger',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) from pg_proc p join pg_trigger t on t.tgfoid=p.oid where p.oid='private.financeiro_proteger_entrada_legado_administrativo()'::regprocedure and t.tgname='entradas_caixa_legado_administrativo';`);
 assert.equal(original.owner,'postgres');assert.equal(original.enabled,'O');assert.equal(original.definer,true);
 assert.deepEqual(original.config,['search_path=pg_catalog']);
 const snap=()=>db.json(`select jsonb_build_object('sessoes',(select jsonb_agg(to_jsonb(s) order by id) from public.sessoes_caixa s),'entradas',(select jsonb_agg(to_jsonb(e) order by id) from public.entradas_caixa e),'auditoria',(select jsonb_agg(to_jsonb(a) order by id) from public.auditoria a),'eventos',(select jsonb_agg(to_jsonb(e) order by id) from public.eventos_auditoria_financeira e));`);
 const before=await snap();
 assert.equal(before.sessoes.find(s=>s.id===S).status,'fechado');
 assert.ok(before.sessoes.some(s=>s.id!==S&&s.clinica_id===C&&s.status==='aberto'&&s.valor_abertura===123.45));
 // Cópia isolada da instalação. Falha após CREATE FUNCTION deve reverter tudo.
 const fresh=protecaoIsolada(C,S,db.r);
 const failure=`begin;lock table public.entradas_caixa in share row exclusive mode;drop trigger entradas_caixa_legado_administrativo on public.entradas_caixa;drop function private.financeiro_proteger_entrada_legado_administrativo();${fresh.replace(/^([\s\S]*?)begin;/,'').replace('create trigger entradas_caixa_legado_administrativo',"do $$ begin raise exception 'FALHA_INSTALACAO_SINTETICA'; end $$;\ncreate trigger entradas_caixa_legado_administrativo")}`;
 const failed=await db.query(failure,{fail:true}).done;
 assert.notEqual(failed.code,0);assert.match(failed.stderr,/FALHA_INSTALACAO_SINTETICA/);
 assert.deepEqual(await snap(),before);
 const metadata=()=>db.json(`select jsonb_build_object('funcao',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'definer',p.prosecdef,'config',p.proconfig,'trigger',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) from pg_proc p join pg_trigger t on t.tgfoid=p.oid where p.oid='private.financeiro_proteger_entrada_legado_administrativo()'::regprocedure and t.tgname='entradas_caixa_legado_administrativo';`);
 assert.deepEqual(await metadata(),original);
 // Arquivo é evidência de origem. Recuperabilidade é comprovada pela execução abaixo.
 const archive=join(dir,'protecao-arquivada.json');writeFileSync(archive,JSON.stringify(original,null,2)+'\n');
 const saved=JSON.parse(readFileSync(archive,'utf8'));
 // Reinstalação pontual em transação, sem tocar sessão, dinheiro, evento ou auditoria.
 // A remoção abaixo é exclusiva do ensaio sintético, nunca receita automática principal.
 await db.sql(`begin;set local lock_timeout='5s';lock table public.entradas_caixa in share row exclusive mode;drop trigger entradas_caixa_legado_administrativo on public.entradas_caixa;drop function private.financeiro_proteger_entrada_legado_administrativo();${saved.funcao};revoke execute on function private.financeiro_proteger_entrada_legado_administrativo() from public,anon,authenticated,service_role;${saved.trigger};commit;`);
 // Conexão independente lê o resultado, inclusive quando o chamador perde a resposta.
 assert.deepEqual(await metadata(),original);assert.deepEqual(await snap(),before);
 const rejected=await db.query(`begin;set role service_role;insert into public.entradas_caixa(id,sessao_caixa_id,clinica_id,forma_pagamento,valor,paciente_id,profissional_id) values('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','${S}','${C}','dinheiro',10,'77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666');rollback;`,{fail:true}).done;
 assert.notEqual(rejected.code,0);assert.match(rejected.stderr,/Histórico legado encerrado/);assert.deepEqual(await snap(),before);
 const expected=createHash('sha256').update(JSON.stringify(original)).digest('hex');
 const result={registro_em:new Date().toISOString(),identidade:info,casos:[
  {id:'REC-A-ATOMICA',resultado:'APROVADO',falha_apos_create_function:true,objetos_e_registros_preservados:true},
  {id:'REC-A-PONTUAL',resultado:'APROVADO',arquivo_arquivado_restaurado:true,funcao_owner_acl_trigger_iguais:true,sessao_posterior_preservada:true,nenhum_registro_reescrito:true,service_role_continua_bloqueado:true,verificacao_por_conexao_nova:true}
 ],metadados_sha256:expected,backup_principal_comprovado:false,limite:'Reinstalação dos dois novos objetos em banco sintético. Não autoriza DROP no principal, não restaura dinheiro ou auditoria, não prova backup/PITR principal. Resultado incerto B e interrupção B reutilizam H11, correção após nova sessão reutiliza H05.'};
 // Usa literal somente para confirmar marcador, sem chamadas de escrita externa.
 assert.equal(await db.sql(`select current_setting('homologacao.caixa_legado')=${quote(db.r.run)};`),'t');
 writeFileSync(join(dir,'revisao-recuperacao.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
