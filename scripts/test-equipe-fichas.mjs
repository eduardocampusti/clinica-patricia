import {existsSync,mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {spawnSync} from 'node:child_process'
// Test-only pinned PDF parser, matching the Edge runtime import. No product dependency.
const base=resolve('scratch/equipe-fichas-completas');mkdirSync(base,{recursive:true})
function run(command,args,options={}){const r=spawnSync(command,args,{stdio:'inherit',...options});if(r.status!==0)throw new Error('Preparação ou teste local falhou; nenhum serviço remoto foi modificado.')}
if(!existsSync(resolve(base,'pdf-lib/package/dist/pdf-lib.js'))){
 run('npm',['pack','pdf-lib@1.17.1','--pack-destination',base,'--cache',resolve(base,'npm-cache'),'--silent'],{shell:process.platform==='win32'})
 mkdirSync(resolve(base,'pdf-lib'),{recursive:true});run('tar',['-xf',resolve(base,'pdf-lib-1.17.1.tgz'),'-C',resolve(base,'pdf-lib')])
}
run(process.execPath,[resolve('server/node_modules/tsx/dist/cli.mjs'),'--test','supabase/functions/_shared/equipeFicha.test.ts'])
