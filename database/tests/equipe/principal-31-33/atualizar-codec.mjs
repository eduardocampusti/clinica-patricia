import {mkdirSync,writeFileSync,readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {alvo,cli,dados,REF,raiz,destino,salvar,hash} from './controle.mjs';
const nomes=['equipe-recursos','equipe-fichas'];
alvo();
const modo=process.argv[2];
if(process.argv[3]!==REF||process.argv.length!==4||!['preservar','publicar'].includes(modo))throw new Error('Operação/destino não autorizado.');
const dir=resolve(destino,'recuperacao-v1');
const anteriores=dados(cli(['functions','list','--project-ref',REF,'--output','json']));
if(modo==='preservar'){
 if(existsSync(resolve(dir,'manifesto.json')))throw new Error('Recuperação já preservada.');
 mkdirSync(resolve(dir,'supabase'),{recursive:true});
 writeFileSync(resolve(dir,'supabase/config.toml'),'project_id = '+JSON.stringify(REF)+'\n');
 for(const nome of nomes){
  if(anteriores.find(f=>f.slug===nome)?.version!==1)throw new Error('Versão anterior divergente.');
  cli(['functions','download',nome,'--project-ref',REF,'--use-api','--workdir',dir]);
 }
 const arquivos={};function coletar(p){for(const n of readdirSync(p)){const f=resolve(p,n);if(statSync(f).isDirectory())coletar(f);else arquivos[f.slice(dir.length+1)]=hash(f);}}
 coletar(resolve(dir,'supabase'));
 writeFileSync(resolve(dir,'manifesto.json'),JSON.stringify({project:REF,funcoes:anteriores,arquivos,instante:new Date().toISOString()},null,2));
 console.log('Fontes/configurações v1 das duas funções preservadas via API.');
}else{
 const anterior=JSON.parse(readFileSync(resolve(dir,'manifesto.json'),'utf8'));
 if(anterior.project!==REF)throw new Error('Snapshot divergente.');
 for(const [f,h] of Object.entries(anterior.arquivos))if(hash(resolve(dir,f))!==h)throw new Error('Snapshot alterado.');
 for(const nome of nomes){
  const fonte=readFileSync(resolve(raiz,'supabase/functions',nome,'index.ts'),'utf8');
  if(!fonte.includes('https://deno.land/x/imagescript@1.3.0/mod.ts')||!fonte.includes('auth.getUser('))throw new Error('Fonte não revisada.');
  cli(['functions','deploy',nome,'--project-ref',REF,'--use-api','--no-verify-jwt']);
  console.log(nome+': atualização específica publicada pela API.');
 }
 const atuais=dados(cli(['functions','list','--project-ref',REF,'--output','json']));
 for(const antiga of anteriores.filter(f=>!nomes.includes(f.slug))){const f=atuais.find(a=>a.slug===antiga.slug);if(!f||f.version!==antiga.version||f.verify_jwt!==antiga.verify_jwt)throw new Error('Função fora do escopo mudou.');}
 for(const n of nomes){const f=atuais.find(a=>a.slug===n);if(f?.status!=='ACTIVE'||f.verify_jwt!==false)throw new Error('Configuração divergente.');}
 salvar('funcoes-codec-depois.json',atuais);console.log(JSON.stringify(atuais.map(f=>({slug:f.slug,version:f.version,status:f.status,verify_jwt:f.verify_jwt}))));
}
