// Autorização específica de 06/10/2026. Não reutiliza ou remove travas do kit LOCAL.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const REF='xftnkusbyqzyvzrovroj';
export const API='https://'+REF+'.supabase.co';
export const pacote=dirname(fileURLToPath(import.meta.url));
export const raiz=resolve(pacote,'../../../..');
export const destino=resolve(raiz,'scratch/equipe-principal-3133');
export function alvo(){
  const env=readFileSync(resolve(raiz,'.env'),'utf8');
  const u=env.match(/^VITE_SUPABASE_URL\s*=\s*(.+)$/m)?.[1].trim().replace(/^['"]|['"]$/g,'');
  if(u!==API||readFileSync(resolve(raiz,'supabase/.temp/project-ref'),'utf8').trim()!==REF)throw new Error('Alvo divergente: execução recusada.');
  if(execFileSync('git',['check-ignore','scratch/equipe-principal-3133/credenciais.json'],{cwd:raiz,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()==='')throw new Error('Pasta privada não ignorada.');
}
export function cli(args,cwd=raiz){
  alvo();
  const r=spawnSync(process.execPath,[resolve(raiz,'node_modules/supabase/dist/supabase.js'),...args],{cwd,encoding:'utf8',timeout:240000,maxBuffer:30*1024*1024,env:{...process.env,DO_NOT_TRACK:'1'}});
  if(r.error||r.status!==0){const e=new Error('CLI falhou; saída privada suprimida.');e.codigo=r.status??'processo';e.saida=args.includes('api-keys')?'':r.stdout+'\n'+r.stderr;throw e;}
  return r.stdout;
}
export function sql(texto){
  alvo();mkdirSync(destino,{recursive:true});
  const path=resolve(destino,'consulta.sql');writeFileSync(path,texto,{mode:0o600});
  return cli(['db','query','--linked','--file',path,'--output','json']);
}
export function dados(raw){const r=typeof raw==='string'?JSON.parse(raw):raw;return Array.isArray(r)?r:r.rows??r.data??r.result??r;}
export function salvar(nome,d){mkdirSync(destino,{recursive:true});writeFileSync(resolve(destino,nome),typeof d==='string'?d:JSON.stringify(d,null,2),{mode:0o600});}
export const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
export function baseline(){
  alvo();const list=execFileSync('git',['status','--porcelain=v1','-z','--untracked-files=all'],{cwd:raiz,encoding:'utf8',stdio:['ignore','pipe','pipe']}).split('\0').filter(Boolean).map(s=>s.slice(3));
  salvar('baseline.json',list.filter(p=>existsSync(resolve(raiz,p))).map(arquivo=>({arquivo,sha256:hash(resolve(raiz,arquivo))})));
  console.log('Baseline local registrada sem conteúdo dos arquivos.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const op=process.argv[2];
    if(op==='baseline')baseline();
    else if(op==='inventario'){
      const r=dados(sql(readFileSync(resolve(pacote,'inventario.sql'),'utf8')));salvar('inventario-antes.json',r);
      const fs=dados(cli(['functions','list','--project-ref',REF,'--output','json']));salvar('funcoes-antes.json',fs);
      const i=r[0].inventario;
      console.log(JSON.stringify({projeto:REF,inventarioSalvo:true,funcoes:fs.map(f=>({slug:f.slug,version:f.version,status:f.status,verify_jwt:f.verify_jwt})),migrations:i.migrations,buckets:i.buckets,tabelasEquipe:i.tabelas.filter(t=>t.nome.startsWith('equipe_')||t.nome==='profissionais_recebimento').map(t=>t.nome),vaultConfigurado:i.vault_configurado},null,2));
    }else throw new Error('Operação não permitida.');
  }catch(e){if(e.saida)salvar('erro-cli-protegido.txt',e.saida);console.error('Operação interrompida; nenhuma saída privada exposta. Código: '+(e.codigo??'pre-condição'));process.exitCode=1;}
}
