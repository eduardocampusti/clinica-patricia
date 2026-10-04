// H01–H12 em PostgreSQL real; nenhum arquivo de principal é habilitado.
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { conectar, root } from './banco.mjs';
import { gerar, fragmentosCandidato } from '../preparar.mjs';
import { ALVO, gerarCandidato } from '../candidato.mjs';
import { protecaoIsolada, gerarProtecao } from './protecao.mjs';
const db=conectar(process.argv[2]);
const identidade=await db.identidade(db.r.database);
const dir=dirname(process.argv[2]);
if(existsSync(join(dir,'resultados.json')))copyFileSync(join(dir,'resultados.json'),join(dir,'rodada-'+Date.now()+'.json'));
const path=join(root,'database/operations/caixa-legado-brotas');
const h=JSON.parse(readFileSync(join(path,'homologacao-casos.json'),'utf8'));
// O laboratório usa o modelo sintético versionado, sem depender do inventário privado.
const original=JSON.parse(readFileSync(join(path,'manifesto-revisao.exemplo.json'),'utf8'));
const f=h.fixture;
if(process.argv.includes('--protecao')){
 if(await db.sql("select to_regprocedure('private.financeiro_proteger_entrada_legado_administrativo()') is null;" )==='t')await db.sql(protecaoIsolada(f.clinica_id,f.sessao_id,db.r));
 writeFileSync(join(path,'10-protecao-escritor-legado.sql.disabled'),gerarProtecao());
}
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const sessao=q(f.sessao_id),clinica=q(f.clinica_id);
const results=[];
const selecionar=process.argv[3]?.split(',');
if(selecionar&&existsSync(join(dir,'resultados.json'))){
 const previous=JSON.parse(readFileSync(join(dir,'resultados.json'),'utf8'));
 results.push(...previous.casos.filter(c=>!selecionar.includes(c.id)));
}
const fixtures=readFileSync(join(path,'homologacao/fixture.sql'),'utf8');
async function reset(){await db.sql(fixtures);}
async function manifesto(){
 const m=structuredClone(original);
 Object.assign(m,{project_ref:'HOMOLOGACAO_ISOLADA',clinica_id:f.clinica_id,sessao_id:f.sessao_id,responsavel_id:f.responsavel_id,execucao_id:f.execucao_id,estado:'EM_REVISAO_CONCLUIDA',motivo:'SOMENTE HOMOLOGAÇÃO: encerramento administrativo sintético',autorizacao_execucao:'AUTORIZAÇÃO SINTÉTICA DO ENSAIO; NÃO AUTORIZA PRINCIPAL'});
 for(const key of fragmentosCandidato(m).flags)m[key]=true;
 m.decisoes_humanas={origem_natureza_entradas:'SINTÉTICAS',dinheiro_sob_responsabilidade:'nao_comprovado',pendencias_conhecidas:'SINTÉTICAS: nenhuma obrigação real neste banco de teste',limitacoes_historicas:'SINTÉTICAS: contagem histórica não comprovada'};
 m.avaliacao_pendencias={estado:'concluida',plano_responsabilidade:'Somente ambiente sintético descartável',tratamento_custodia_definido:true};
 const out=await db.sql(gerar(m).leitura);
 const sec=Object.fromEntries(out.split('\n').map(l=>{const i=l.indexOf('|');return[l.slice(0,i),JSON.parse(l.slice(i+1))];}));
 assert.equal(sec.contexto.valido,true);assert.equal(sec.auditoria.length,7);
 Object.assign(m,{sessao_original:sec.sessao_original,snapshot:sec.snapshot,catalogo_md5:sec.catalogo_md5,auditoria_fingerprints:sec.auditoria_fingerprints});
 assert.equal(m.snapshot.entradas_caixa.quantidade,2);
 return m;
}
function candidato(m,{inject='',when='before_update'}={}){
 let s=gerarCandidato(m);
 // Trocas limitadas à CÓPIA em memória.05.disabled e manifesto principal intocados.
 s=s.replaceAll(ALVO.clinica_id,f.clinica_id).replaceAll(ALVO.sessao_id,f.sessao_id).replaceAll(ALVO.project_ref,'HOMOLOGACAO_ISOLADA');
 s=s.replace('v_permitir_execucao constant boolean := false','v_permitir_execucao constant boolean := true');
 const mark=`if current_database() is distinct from '${db.r.database}' or current_setting('homologacao.caixa_legado',true) is distinct from '${db.r.run}' or inet_server_addr() is distinct from '127.0.0.1'::inet then raise exception 'ISOLAMENTO NÃO COMPROVADO'; end if;`;
 s=s.replace("  if not v_permitir_execucao then",'  '+mark+'\n  if not v_permitir_execucao then');
 if(inject){
  if(when==='before_update')s=s.replace('  update public.sessoes_caixa','  '+inject+'\n  update public.sessoes_caixa');
  if(when==='after_update')s=s.replace('  get diagnostics v_linhas=row_count;','  get diagnostics v_linhas=row_count;\n  '+inject);
  if(when==='after_evento')s=s.replace("'manifesto',v_manifesto),v_manifesto->>'motivo');","'manifesto',v_manifesto),v_manifesto->>'motivo');\n  "+inject);
 }
 s=s.replace(/rollback;\s*$/,'commit;\n');
 assert.ok(s.includes(mark));assert.ok(!s.includes(ALVO.clinica_id));assert.ok(!s.includes(ALVO.sessao_id));
 return '\\set VERBOSITY verbose\n'+s;
}
async function estado(){return db.json(`select jsonb_build_object('sessao',(select to_jsonb(s) from public.sessoes_caixa s where id=${sessao}),'entradas',(select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]') from public.entradas_caixa e where sessao_caixa_id=${sessao}), 'auditoria',(select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]') from public.auditoria a where a.entidade_id=${sessao} or a.dados_antes->>'sessao_caixa_id'=${sessao} or a.dados_depois->>'sessao_caixa_id'=${sessao}), 'eventos',(select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]') from public.eventos_auditoria_financeira a where a.entidade_id=${sessao}));`);}
async function rejeitar(sql,pattern){const before=await estado();const r=await db.query(sql,{fail:true}).done;assert.notEqual(r.code,0);assert.match(r.stderr,pattern);assert.deepEqual(await estado(),before);return r.stderr.match(/ERROR:\s+(\w{5})/)?.[1]??'RECUSADO';}
function ctx(role='authenticated',user='88888888-8888-4888-8888-888888888888'){return `set role ${role};set request.jwt.claim.sub=${q(user)};set app.clinica_id=${clinica};`;}
const entrada=`insert into public.entradas_caixa(id,sessao_caixa_id,clinica_id,forma_pagamento,valor,paciente_id,profissional_id) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',${sessao},${clinica},'dinheiro',10,'77777777-7777-4777-8777-777777777777','66666666-6666-4666-8666-666666666666');`;
const abertura=()=>ctx('authenticated',f.responsavel_id)+`select public.financeiro_abrir_caixa(${clinica},123.45,'fundo-independente-sintetico');`;
async function espera(app,event){
 for(let i=0;i<80;i++){
  const count=Number(await db.sql(`select count(*) from pg_stat_activity where application_name=${q(app)} and wait_event=${q(event)};`));
  if(count)return;await new Promise(r=>setTimeout(r,40));
 }throw new Error('Barreira concorrente não observada: '+app+'/'+event);
}
async function caso(id,run){
 if(selecionar&&!selecionar.includes(id))return;
 const start=Date.now();try{const detail=await run();results.push({id,resultado:'APROVADO',detalhe:detail,ms:Date.now()-start});console.log(id+' APROVADO '+JSON.stringify(detail));}
 catch(e){results.push({id,resultado:'FALHOU',erro:e.message,ms:Date.now()-start});console.log(id+' FALHOU '+e.message);throw e;}
 finally{writeFileSync(join(dir,'resultados.json'),JSON.stringify({identidade,casos:results,principal_alterado:false},null,2)+'\n');}
}

await caso('H01',async()=>{
 await reset();const m=await manifesto();const before=await estado();await db.sql(candidato(m));const after=await estado();
 assert.equal(after.sessao.status,'fechado');for(const k of Object.keys(before.sessao).filter(k=>!['status','fechado_em','fechado_por'].includes(k)))assert.deepEqual(after.sessao[k],before.sessao[k]);
 assert.deepEqual(after.entradas,before.entradas);assert.deepEqual(after.auditoria.slice(0,7),before.auditoria);assert.equal(after.auditoria.length,8);assert.equal(after.eventos.length,1);assert.equal(after.eventos[0].valor,null);assert.equal(after.sessao.valor_contado,null);
 writeFileSync(join(dir,'candidato-sintetico.sql'),candidato(m));writeFileSync(join(dir,'manifesto-sintetico.json'),JSON.stringify(m,null,2));
 return{campos_alterados:3,entradas_preservadas:2,auditorias_anteriores:7,nova_auditoria:1,novo_evento:1};
});
await caso('H02',async()=>{await reset();const m=await manifesto();const clinic=await rejeitar(candidato({...m,clinica_id:f.outra_clinica_id}),/Alvo\/estado/);const session=await rejeitar(candidato({...m,sessao_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}),/Alvo\/estado/);return{clinic,session};});
await caso('H03',async()=>{await reset();const m=await manifesto();await db.sql(`update public.sessoes_caixa set idempotency_key='moderna' where id=${sessao};`);await rejeitar(candidato(m),/Sessao moderna/);await reset();const n=await manifesto();await db.sql(`update public.sessoes_caixa set status='fechado' where id=${sessao};`);await rejeitar(candidato(n),/Inventário|Auditoria histórica|Sessão\/contagem/);return{moderna:'recusada',fechada_sem_evento:'recusada'};});
await caso('H04',async()=>{
 const variants=[];
 for(const [name,alter] of [
 ['entrada',`update public.entradas_caixa set valor=501 where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';`],
 ['auditoria',`insert into public.auditoria(clinica_id,acao,entidade,entidade_id) values (${clinica},'UPDATE','sessoes_caixa',${sessao});`],
 ['vinculo_moderno',`insert into public.movimentos_caixa(clinica_id,sessao_caixa_id,tipo,valor,motivo,registrado_por) values (${clinica},${sessao},'suprimento',1,'SINTÉTICO',${q(f.responsavel_id)});`]
 ]){await reset();const m=await manifesto();await db.sql(alter);await rejeitar(candidato(m),/Inventário|Auditoria histórica|Novo vínculo/);variants.push(name);}
 await reset();const m=await manifesto();await db.sql('alter table public.entradas_caixa add constraint homolog_drift check(valor>0);');
 try{await rejeitar(candidato(m),/Inventário\/catálogo/);variants.push('catalogo');}finally{await db.sql('alter table public.entradas_caixa drop constraint homolog_drift;');}
 return{variantes:variants};
});
await caso('H05',async()=>{await reset();const m=await manifesto();await db.sql(candidato(m));const before=await estado();await db.sql(candidato(m));assert.deepEqual(await estado(),before);await db.sql(abertura());await db.sql(candidato(m));assert.deepEqual(await estado(),before);return{repeticoes_sem_efeito:2,inclui_nova_sessao_posterior:true};});
await caso('H06',async()=>{const variants=[];for(const when of ['after_update','after_evento']){await reset();const m=await manifesto();await rejeitar(candidato(m,{inject:"raise exception 'FALHA_INJETADA';",when}),/FALHA_INJETADA/);variants.push(when);}return{rollback_integral:variants};});
await caso('H07',async()=>{
 await reset();const m=await manifesto();const worker=db.query(candidato(m,{inject:'perform pg_sleep(3);'}),{app:'H07_candidato'});
 await espera('H07_candidato','PgSleep');const open=db.query(abertura(),{app:'H07_abertura'});await espera('H07_abertura','advisory');
 await worker.done;await open.done;assert.equal(Number(await db.sql(`select count(*) from public.sessoes_caixa where clinica_id=${clinica} and status='aberto';`)),1);
 await reset();const n=await manifesto();const opener=db.query('begin;'+abertura(),{fail:true});const blocked=await opener.done;assert.notEqual(blocked.code,0);await db.sql(candidato(n));
 return{duas_conexoes:true,abertura_esperou_commit:true,abertura_antes_recusada:true};
});
await caso('H08',async()=>{
 const observations={};
 await reset();const m=await manifesto();await db.sql(ctx()+entrada);await rejeitar(candidato(m),/Inventário\/catálogo/);observations.antes='drift detectado';
 await reset();const n=await manifesto();const worker=db.query(candidato(n,{inject:'perform pg_sleep(3);'}),{app:'H08_candidato'});await espera('H08_candidato','PgSleep');
 const during=await db.query('\\set VERBOSITY verbose\n'+ctx()+"set lock_timeout='700ms';"+entrada,{fail:true}).done;assert.notEqual(during.code,0);assert.match(during.stderr,/55P03/);await worker.done;observations.durante='55P03: lock timeout, sem entrada';
 const after=await db.query('\\set VERBOSITY verbose\n'+ctx()+entrada,{fail:true}).done;assert.notEqual(after.code,0);assert.match(after.stderr,/42501|55000/);observations.depois='55000: proteção de banco bloqueou';
 await reset();const p=await manifesto();const old=db.query('\\set VERBOSITY verbose\nbegin isolation level repeatable read;'+ctx()+`select status from public.sessoes_caixa where id=${sessao};select pg_sleep(3);`+entrada+'commit;',{app:'H08_antiga',fail:true});
 await espera('H08_antiga','PgSleep');await db.sql(candidato(p));const stale=await old.done;observations.snapshot_antigo={codigo:stale.code,sqlstate:stale.stderr.match(/ERROR:\s+(\w{5})/)?.[1]??null,entrada_tardia:Number(await db.sql(`select count(*) from public.entradas_caixa where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';`))};
 if(stale.code===0)observations.defeito='RLS com snapshot antigo permitiu entrada após fechamento; janela deve drenar essas transações.';
 assert.notEqual(stale.code,0);assert.equal(observations.snapshot_antigo.entrada_tardia,0);
 for(const role of ['service_role','postgres']){
  for(const [action,sql] of [['INSERT',entrada],['UPDATE',`update public.entradas_caixa set valor=501 where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';`],['DELETE',`delete from public.entradas_caixa where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';`]]){
   const r=await db.query('\\set VERBOSITY verbose\n'+ctx(role)+sql,{fail:true}).done;assert.notEqual(r.code,0);assert.match(r.stderr,/55000/);observations[role+'_'+action]='55000: recusado';
  }
 }
 await db.sql(`update public.sessoes_caixa set status='aberto' where id=${sessao};`);
 const reopen=await db.query('\\set VERBOSITY verbose\n'+ctx('service_role')+entrada,{fail:true}).done;
 assert.match(reopen.stderr,/55000/);observations.reabertura_manual_nao_remove_protecao='55000: evento administrativo continua bloqueando';
 await db.sql(`insert into public.usuarios_clinicas(usuario_id,clinica_id,papel) values (${q(f.responsavel_id)},${q(f.outra_clinica_id)},'proprietaria');
 insert into public.pacientes(id,clinica_id,nome_completo) values ('ffffffff-ffff-4fff-8fff-ffffffffffff',${q(f.outra_clinica_id)},'Pessoa Sintética B');
 insert into public.profissionais_clinicas(profissional_id,clinica_id) values ('66666666-6666-4666-8666-666666666666',${q(f.outra_clinica_id)});
 insert into public.sessoes_caixa(id,clinica_id,aberto_por,valor_abertura) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',${q(f.outra_clinica_id)},${q(f.responsavel_id)},1);`);
 await db.sql(ctx('authenticated',f.responsavel_id)+`set app.clinica_id=${q(f.outra_clinica_id)};insert into public.entradas_caixa(sessao_caixa_id,clinica_id,forma_pagamento,valor,paciente_id,profissional_id) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',${q(f.outra_clinica_id)},'dinheiro',1,'ffffffff-ffff-4fff-8fff-ffffffffffff','66666666-6666-4666-8666-666666666666');`);
 observations.outra_clinica='Entrada sintética válida permitida; proteção restrita ao alvo';
 return observations;
});
await caso('H09',async()=>{
 await reset();const m=await manifesto();const worker=db.query(candidato(m,{inject:'perform pg_sleep(3);'}),{app:'H09_candidato'});await espera('H09_candidato','PgSleep');
 const truncate=await db.query("\\set VERBOSITY verbose\nset lock_timeout='700ms';truncate public.auditoria;",{fail:true}).done;assert.match(truncate.stderr,/55P03/);await worker.done;
 const mutation=await db.query(`update public.auditoria set motivo='modificado' where id=(select min(id) from public.auditoria);`,{fail:true}).done;assert.match(mutation.stderr,/append-only/);
 const state=await estado();assert.equal(state.auditoria.length,8);assert.equal(state.entradas.length,2);assert.equal(Number(await db.sql("select count(*) from public.entradas_caixa where id='99999999-9999-4999-8999-999999999999';")),0);
 return{truncate_concorrente:'55P03',update_auditoria:'recusado',pix_excluido:true};
});
await caso('H10',async()=>{await reset();const m=await manifesto();const r=await db.query(abertura(),{fail:true}).done;assert.notEqual(r.code,0);await db.sql(candidato(m));const opened=JSON.parse(await db.sql(abertura()));assert.equal(opened.valor_abertura,123.45);assert.notEqual(opened.sessao_caixa_id,f.sessao_id);return{fundo_novo_centavos:12345,automaticamente_transportado:false};});
await caso('H11',async()=>{
 await reset();const m=await manifesto();const worker=db.query(candidato(m,{inject:'perform pg_sleep(10);',when:'after_update'}),{app:'H11_interrompida',fail:true});await espera('H11_interrompida','PgSleep');
 const beforeIds=await db.json("select jsonb_agg(pid) from pg_stat_activity where application_name='H11_interrompida';");assert.equal(beforeIds.length,1);
 await db.sql(`select pg_terminate_backend(${beforeIds[0]});`);const interrupted=await worker.done;assert.notEqual(interrupted.code,0);const s=await estado();assert.equal(s.sessao.status,'aberto');assert.equal(s.eventos.length,0);assert.equal(s.auditoria.length,7);
 await db.sql(candidato(m));const after=await estado();await db.sql(candidato(m));assert.deepEqual(await estado(),after);
 return{conexao_interrompida_antes_commit:'rollback comprovado por conexão nova',resposta_descartada_apos_commit:'evento único verificado e repetição sem efeitos'};
});
await caso('H12',async()=>{
 await reset();const m=await manifesto();await rejeitar(candidato({...m,autorizacao_execucao:null}),/Motivo, autorização/);await rejeitar(candidato({...m,avaliacao_pendencias:{...m.avaliacao_pendencias,estado:null}}),/Decisões\/avaliação/);
 const partial=await db.query(ctx()+candidato(m),{fail:true}).done;assert.match(partial.stderr,/Abrangência insuficiente/);
 await db.sql("update public.usuarios_clinicas set ativo=false where usuario_id='33333333-3333-4333-8333-333333333333';");await rejeitar(candidato(m),/Responsável sem vínculo/);
 await reset();const n=await manifesto();await db.sql(candidato(n));await rejeitar(candidato({...n,motivo:'Divergente'}),/Evento\/estado conflitante/);
 return{sem_aprovacao:'recusado',pendencias:'recusado',role_parcial:'recusado',vinculo_inativo:'recusado',evento_conflitante:'recusado'};
});
console.log(JSON.stringify({executados:results.length,aprovados:results.filter(c=>c.resultado==='APROVADO').length,h08:results.find(c=>c.id==='H08')}));
