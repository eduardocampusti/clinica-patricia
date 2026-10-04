import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

export const root=resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
export function conectar(runtimeFile){
  const file=resolve(runtimeFile);
  assert.ok(file.toLowerCase().startsWith(join(root,'scratch','homologacao-caixa-legado-').toLowerCase()));
  const r=JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''));
  assert.equal(r.host,'127.0.0.1');
  assert.match(r.run,/^[a-f0-9]{32}$/);
  assert.equal(r.database,'homolog_legado_'+r.run);
  assert.equal(resolve(r.data),join(dirname(file),'data'));
  assert.equal(resolve(r.passfile),join(dirname(file),'pgpass.conf'));
  assert.equal(r.stopped_at,null);
  const env={};
  for(const key of ['SystemRoot','WINDIR','COMSPEC','PATH','PATHEXT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA']){
    if(process.env[key])env[key]=process.env[key];
  }
  Object.assign(env,{PGPASSFILE:r.passfile,PGCLIENTENCODING:'UTF8'});
  function query(sql,{database=r.database,app='homolog_legado',fail=false}={}){
    assert.ok(database===r.database||database==='postgres'||database===r.database+'_restore');
    const args=['-X','-w','-h',r.host,'-p',String(r.port),'-U','postgres','-d',database,'-v','ON_ERROR_STOP=1','-q','-t','-A'];
    const child=spawn(join(r.bin,'psql.exe'),args,{env:{...env,PGAPPNAME:app},windowsHide:true,stdio:['pipe','pipe','pipe']});
    let stdout='',stderr=''; child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
    const done=new Promise((res,rej)=>{child.on('error',rej);child.on('close',code=>{
      const result={code,stdout:stdout.trim(),stderr:stderr.trim()};
      if(code!==0&&!fail)rej(new Error(result.stderr));else res(result);
    });});
    child.stdin.end(sql);
    return {done,child};
  }
  const sql=async(text,opts)=>(await query(text,opts).done).stdout;
  const json=async(text,opts)=>JSON.parse(await sql(text,opts));
  async function identidade(database='postgres'){
    const info=await json("select jsonb_build_object('server',current_setting('server_version'),'data',current_setting('data_directory'),'marker',current_setting('homologacao.caixa_legado',true),'host',inet_server_addr(),'port',inet_server_port(),'database',current_database(),'pid',pg_backend_pid());",{database});
    assert.equal(resolve(info.data),resolve(r.data));assert.equal(info.marker,r.run);assert.equal(info.host,'127.0.0.1');assert.equal(info.port,r.port);assert.equal(info.database,database);
    return info;
  }
  return {r,query,sql,json,identidade,env};
}
