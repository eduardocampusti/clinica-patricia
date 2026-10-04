// Só restaura no cluster novo marcado. Recebe o recorte privado pelo stdin;
// nunca imprime registros, diferenças privadas, SQL de falha ou credenciais.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import { conectar, root } from './banco.mjs';
const db=conectar(process.argv[2]);
const q=v=>"'"+String(v).replaceAll("'","''")+"'";
const ident=v=>{assert.match(v,/^[a-z_][a-z0-9_]*$/);return '"'+v+'"';};
let stage='IDENTIDADE';
async function safeSql(sql){
 const result=await db.query("set timezone='UTC'; set log_min_error_statement='panic'; set log_error_verbosity='terse'; set log_parameter_max_length_on_error=0;\n"+sql,{fail:true}).done;
 if(result.code!==0)throw new Error('Falha SQL isolada no estágio '+stage+' (detalhes privados omitidos)');
 return result.stdout;
}
async function json(sql){return JSON.parse(await safeSql(sql));}
try{
 await db.identidade(db.r.database);
 const originalJson=readFileSync(0,'utf8').replace(/^\uFEFF/,'');
 const a=JSON.parse(originalJson);
 const m=JSON.parse(readFileSync(join(root,'database/operations/caixa-legado-brotas/manifesto-revisao.json'),'utf8'));
 assert.equal(a.formato,'RECUPERACAO_RECORTE_V1'); assert.equal(a.project_ref,m.project_ref);
 assert.equal(a.clinica_id,m.clinica_id); assert.equal(a.sessao_id,m.sessao_id); assert.equal(a.read_only,'on');
 assert.equal(a.inventario.contexto.valido,true); assert.deepEqual(a.inventario.snapshot,m.snapshot);
 assert.deepEqual(a.inventario.sessao_original,m.sessao_original); assert.equal(a.inventario.catalogo_md5,m.catalogo_md5);
 assert.deepEqual(a.inventario.auditoria_fingerprints,m.auditoria_fingerprints);
 const tables=['sessoes_caixa','entradas_caixa','auditoria','eventos_auditoria_financeira'];
 assert.deepEqual(Object.keys(a.registros).sort(),[...tables].sort());
 assert.deepEqual(tables.map(t=>a.registros[t].length),[1,2,7,0]);
 assert.equal(a.definicoes.protecao_funcao,null); assert.equal(a.definicoes.protecao_trigger,0);
 stage='CATALOGO';
 for(const t of a.definicoes.tabelas){
  const cols=await json(`select jsonb_agg(jsonb_build_object('nome',c.attname,'tipo',format_type(c.atttypid,c.atttypmod),'notnull',c.attnotnull,'identity',c.attidentity,'generated',c.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) order by c.attnum) from pg_attribute c left join pg_attrdef d on d.adrelid=c.attrelid and d.adnum=c.attnum where c.attrelid=${q('public.'+t.nome)}::regclass and c.attnum>0 and not c.attisdropped`);
  assert.deepEqual(cols,t.colunas,'Estrutura incompatível; conteúdo privado omitido');
 }
 const constraints=await json(`select jsonb_agg(jsonb_build_object('tabela',c.conrelid::regclass::text,'nome',c.conname,'tipo',c.contype,'validada',c.convalidated,'definicao',pg_get_constraintdef(c.oid)) order by c.conrelid::regclass::text,c.conname) from pg_constraint c where c.conrelid in (select unnest(array['public.sessoes_caixa','public.entradas_caixa','public.auditoria','public.eventos_auditoria_financeira'])::regclass) or c.confrelid in(select unnest(array['public.sessoes_caixa','public.entradas_caixa','public.auditoria','public.eventos_auditoria_financeira'])::regclass)`);
 assert.deepEqual(constraints,a.definicoes.constraints,'Constraints incompatíveis; conteúdo omitido');
 const fresh=await json(`select jsonb_build_object('sessoes',(select count(*) from public.sessoes_caixa),'entradas',(select count(*) from public.entradas_caixa),'auditoria',(select count(*) from public.auditoria),'eventos',(select count(*) from public.eventos_auditoria_financeira),'clinicas',(select count(*) from public.clinicas))`);
 const resumeObjects=process.argv.includes('--resume-objects');
 if(!resumeObjects)assert.ok(Object.values(fresh).every(n=>n===0),'Restauração inicial exige laboratório vazio');
 const records=a.registros; const S=q(a.sessao_id), C=q(a.clinica_id);
 const uuid=v=>{assert.match(v,/^[a-f0-9-]{36}$/);return q(v)+'::uuid';};
 const users=[...new Set([...records.sessoes_caixa.flatMap(r=>[r.aberto_por,r.fechado_por]),...records.entradas_caixa.map(r=>r.registrado_por),...records.auditoria.map(r=>r.usuario_id)].filter(Boolean))];
 const patients=[...new Set(records.entradas_caixa.map(r=>r.paciente_id).filter(Boolean))];
 const professionals=[...new Set(records.entradas_caixa.map(r=>r.profissional_id).filter(Boolean))];
 let scaffold=`insert into public.clinicas(id,nome,cidade,subdomain) values(${C},'Clínica auxiliar de recuperação','Cidade sintética','brotas');\n`;
 for(const id of users)scaffold+=`insert into auth.users(id) values(${uuid(id)}); insert into public.usuarios(id,nome_completo) values(${uuid(id)},'Vínculo auxiliar sintético');\n`;
 for(const id of patients)scaffold+=`insert into public.pacientes(id,clinica_id,nome_completo) values(${uuid(id)},${C},'Pessoa auxiliar sintética');\n`;
 for(const id of professionals)scaffold+=`insert into public.profissionais(id,nome_completo) values(${uuid(id)},'Profissional auxiliar sintético'); insert into public.profissionais_clinicas(profissional_id,clinica_id) values(${uuid(id)},${C});\n`;
 function insertRows(t,rows){
  if(!rows.length)return '';
  const cols=a.definicoes.tabelas.find(x=>x.nome===t).colunas.map(c=>ident(c.nome)).join(',');
  // Não reserializar números por JavaScript: jsonb da auditoria preserva
  // escala decimal (500.00), que integra o fingerprint original.
  return `insert into public.${ident(t)}(${cols}) overriding system value select ${cols} from jsonb_populate_recordset(null::public.${ident(t)},${q(originalJson)}::jsonb->'registros'->${q(t)});\n`;
 }
 // Não remove constraints/FKs nem usa replication_role. Desabilita somente
 // os triggers de auditoria das inserções iniciais deste laboratório vazio,
 // preservando e restaurando as sete auditorias originais com seus IDs.
 const parentTables=['clinicas','usuarios','pacientes','profissionais','profissionais_clinicas'];
 const audited=[...parentTables,'sessoes_caixa','entradas_caixa'];
 const auditTriggers=await json(`select coalesce(jsonb_agg(jsonb_build_object('tabela',c.relname,'nome',t.tgname)),'[]') from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relnamespace='public'::regnamespace and c.relname in(${audited.map(q).join(',')}) and t.tgfoid='public.fn_auditoria()'::regprocedure and not t.tgisinternal`);
 const off=auditTriggers.map(t=>`alter table public.${ident(t.tabela)} disable trigger ${ident(t.nome)};`).join('\n');
 const on=auditTriggers.map(t=>`alter table public.${ident(t.tabela)} enable trigger ${ident(t.nome)};`).join('\n');
 stage='RESTAURACAO_REC_R1';
 if(!resumeObjects)await safeSql('begin;\n'+off+'\n'+scaffold+tables.map(t=>insertRows(t,records[t])).join('')+on+"\nselect setval(pg_get_serial_sequence('public.auditoria','id'),(select max(id) from public.auditoria),true); commit;");
 async function verify(){
  for(const t of tables){
   const where=t==='sessoes_caixa'?`id=${S}::uuid`:t==='entradas_caixa'?`sessao_caixa_id=${S}::uuid`:t==='auditoria'?`id in(${records.auditoria.map(r=>r.id).join(',')})`:`entidade_id=${S}::uuid or dados->>'sessao_caixa_id'=${S}`;
   const rows=await json(`select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]') from public.${ident(t)} r where ${where}`);
   assert.deepEqual(rows,records[t],'Registro restaurado divergente; conteúdo omitido');
  }
  const fingerprints=await json(`select jsonb_build_object('entradas', (select md5(jsonb_agg(to_jsonb(r) order by r.id)::text) from public.entradas_caixa r where sessao_caixa_id=${S}::uuid),'auditoria',(select md5(jsonb_agg(to_jsonb(r) order by r.id)::text) from public.auditoria r where id in(${records.auditoria.map(r=>r.id).join(',')})))`);
  assert.equal(fingerprints.entradas,m.snapshot.entradas_caixa.md5); assert.equal(fingerprints.auditoria,m.auditoria_fingerprints.auditoria.md5);
 }
 await verify();
 const results=[{caso:'REC-R1',resultado:'APROVADO',evidencia:'10 registros restaurados, JSON e fingerprints iguais; FKs/constraints mantidos; Pix excluído só na auditoria'}];
 stage='OBJETOS_REC_R2';
 async function restoreObjects(){
  let sql='begin; set local search_path=public,pg_catalog;\n';
  for(const fn of a.definicoes.funcoes){
   sql+=fn.definicao+';\n'+`alter function ${fn.assinatura} owner to postgres; revoke all on function ${fn.assinatura} from public,anon,authenticated,service_role;\n`;
   for(const grant of fn.acl.slice(1,-1).split(',')){
    const [role,permission]=grant.split('='); assert.match(permission,/^X\/postgres$/);
    sql+=`grant execute on function ${fn.assinatura} to ${role?ident(role):'public'};\n`;
   }
  }
  for(const tr of a.definicoes.triggers){assert.equal(tr.enabled,'O'); sql+=`drop trigger if exists ${ident(tr.nome)} on public.${ident(tr.tabela)}; ${tr.definicao};\n`;}
  await safeSql(sql+'commit;');
 }
 const objects=()=>json(`select jsonb_build_object('funcoes',(select jsonb_agg(jsonb_build_object('assinatura',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'definicao',pg_get_functiondef(p.oid)) order by p.oid::regprocedure::text) from pg_proc p where p.oid in('public.fn_auditoria()'::regprocedure,'public.fn_bloqueia_mutacao()'::regprocedure)),'triggers',(select jsonb_agg(jsonb_build_object('tabela',t.tgrelid::regclass::text,'nome',t.tgname,'enabled',t.tgenabled,'definicao',pg_get_triggerdef(t.oid)) order by t.tgrelid::regclass::text,t.tgname) from pg_trigger t where t.tgrelid in('public.sessoes_caixa'::regclass,'public.entradas_caixa'::regclass,'public.auditoria'::regclass) and not t.tgisinternal))`);
 await safeSql("create or replace function public.fn_bloqueia_mutacao() returns trigger language plpgsql as $$ begin raise exception 'Definição sintética divergente para testar recuperação'; end $$;");
 await restoreObjects(); const restored=await objects();
 const normalizeFns=fs=>fs.map(f=>({...f,acl:f.acl.slice(1,-1).split(',').sort()}));
 stage='OBJETOS_REC_R2_FUNCOES';
 assert.deepEqual(normalizeFns(restored.funcoes),normalizeFns(a.definicoes.funcoes),'Função/owner/ACL não restaurados');
 stage='OBJETOS_REC_R2_TRIGGERS'; assert.deepEqual(restored.triggers,a.definicoes.triggers,'Trigger não restaurado'); await verify();
 results.push({caso:'REC-R2',resultado:'APROVADO',evidencia:'Definições reais exportadas recuperadas: 2 funções com owner/ACL e 3 triggers habilitados; registros preservados'});
 stage='REPETICAO_REC_R3';
 const unrelated='00000000-0000-4000-8000-000000000123';
 await safeSql(`insert into public.eventos_auditoria_financeira(id,clinica_id,usuario_id,papel,acao,entidade,entidade_id,dados) values(${q(unrelated)},${C},${uuid(users[0])},'recepcao','EVIDENCIA_SINTETICA_POSTERIOR','teste_recuperacao',${q(unrelated)},'{"sintetico":true}');`);
 // A repetição é comparação somente por leitura; não faz UPSERT/UPDATE.
 await verify(); await verify(); assert.equal(await safeSql(`select count(*) from public.eventos_auditoria_financeira where id=${q(unrelated)}::uuid`),'1');
 results.push({caso:'REC-R3',resultado:'APROVADO',evidencia:'Repetição por conferência sem escrita/duplicação; evento posterior sintético preservado'});
 stage='DIVERGENCIA_REC_R4';
 const changed=structuredClone(records.sessoes_caixa[0]); changed.valor_esperado=1;
 const current=await json(`select to_jsonb(s) from public.sessoes_caixa s where id=${S}::uuid`);
 // Precondição executada no PostgreSQL real: before-image divergente recusa
 // a transação antes de DML; a mensagem não inclui qualquer registro privado.
 assert.notDeepEqual(current,changed);
 const refusal=await db.query(`\\set VERBOSITY verbose\nbegin; set local timezone='UTC'; set local log_min_error_statement='panic'; set local log_error_verbosity='terse'; do $guard$ begin if (select to_jsonb(s) from public.sessoes_caixa s where id=${S}::uuid) is distinct from ${q(JSON.stringify(changed))}::jsonb then raise exception 'Before-image divergente: recuperação recusada' using errcode='55000'; end if; end $guard$; rollback;`,{fail:true}).done;
 assert.notEqual(refusal.code,0); assert.match(refusal.stderr,/55000/); await verify();
 results.push({caso:'REC-R4',resultado:'APROVADO',evidencia:'Conflito de before-image detectado sem overwrite; não reabre legado nem sobrescreve operação posterior'});
 const output={data:new Date().toISOString(),ambiente:{run:db.r.run,database:db.r.database,server:'17.11',host:db.r.host,port:db.r.port},recorte:{sessao:1,entradas:2,auditorias:7,eventos:0,tabelas:4,funcoes:2,triggers:3},resultados:results,limites:['Recuperação pontual da intervenção; não recuperação integral/PITR','FKs satisfeitas por cadastros auxiliares sintéticos, somente UUIDs pertinentes; sem prontuários/cadastros/Auth reais exportados','Auth/Vault auxiliares e diferenças PostgreSQL17.11/17.6','Restauração não executada no principal; correção posterior requer análise e autorização separadas','DPAPI exige a mesma conta Windows; cópia offline adicional não comprovada']};
 writeFileSync(join(dirname(process.argv[2]),'recuperacao-resultados.json'),JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify(output));
}catch(error){console.error('FALHA: '+stage+'; '+(error.message?.startsWith('Falha SQL')?error.message:'verificação de compatibilidade/integridade recusada; conteúdo privado omitido'));process.exitCode=1;}
