import { defineConfig, mergeConfig, loadEnv } from 'vite'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import base from '../../vite.config.ts'

export default defineConfig(({mode})=>{
  const ambiente={...loadEnv(mode,process.cwd(),'VITE_'),...process.env}
  if(ambiente.VITE_SUPABASE_URL!=='https://xftnkusbyqzyvzrovroj.supabase.co')throw Error('Bancada: alvo diferente do projeto autorizado')
  return mergeConfig(base,{
    plugins:[{name:'acesso-direto-conectado-local',enforce:'pre',resolveId(id){
      if(id.endsWith('/config/acessoDireto'))return resolve('tests/operacional/acesso-direto-conectado-flag.ts')
    },configureServer(server){server.middlewares.use((req,_res,next)=>{
      if((req.url??'').split('?')[0]==='/'||(req.url??'').startsWith('/acesso/')||(req.url??'').startsWith('/sistema/'))req.url='/tests/operacional/acesso-direto-conectado.html'
      next()
    })}}],
    cacheDir:join(tmpdir(),'clinica-patricia-acesso-direto-conectado','vite-cache'),
    server:{host:'127.0.0.1',port:5189,strictPort:true},
    build:{outDir:join(tmpdir(),'clinica-patricia-acesso-direto-conectado','build'),emptyOutDir:false,rollupOptions:{input:'tests/operacional/acesso-direto-conectado.html'}},
  })
})
