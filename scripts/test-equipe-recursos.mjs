import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
// Codec used only by deterministic synthetic tests; no frontend/runtime install.
const base=resolve('scratch/equipe-fotos-recebimento')
mkdirSync(base,{recursive:true})
const engine=resolve(base,'imagescript/package/ImageScript.js')
function run(command,args,options={}){const r=spawnSync(command,args,{stdio:'inherit',...options});if(r.status!==0)throw new Error('Preparação/teste local falhou. Nenhum ambiente remoto foi modificado.')}
if(!existsSync(engine)){
  run('npm',['pack','imagescript@1.3.0','--pack-destination','scratch/equipe-fotos-recebimento','--cache','scratch/equipe-fotos-recebimento/npm-cache','--silent'],{shell:process.platform==='win32'})
  mkdirSync(resolve(base,'imagescript'),{recursive:true})
  run('tar',['-xf',resolve(base,'imagescript-1.3.0.tgz'),'-C',resolve(base,'imagescript')])
}
const {Image}=createRequire(import.meta.url)(engine)
const imagem=new Image(96,64);imagem.fill(0x16a34aff)
writeFileSync(resolve(base,'foto-sintetica.jpg'),await imagem.encodeJPEG(85))
run(process.execPath,[resolve('server/node_modules/tsx/dist/cli.mjs'),'--test','supabase/functions/_shared/equipeRecursos.test.ts'])
