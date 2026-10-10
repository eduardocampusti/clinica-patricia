// Nunca publicar esta configuração/bancada. Só aponta para o projeto autorizado.
import {defineConfig,loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
export default defineConfig(({mode})=>{
 const env={...loadEnv(mode,process.cwd(),'VITE_'),...process.env}
 if(env.VITE_SUPABASE_URL!=='https://xftnkusbyqzyvzrovroj.supabase.co')throw new Error('Alvo da bancada não autorizado')
 return {plugins:[react(),tailwindcss(),{name:'configuracoes-conectada-local',enforce:'pre',configurePreviewServer(server){
  server.middlewares.use((req,_res,next)=>{if(['/acesso/brotas','/acesso/ipupiara'].includes((req.url??'').split('?')[0]))req.url='/tests/configuracoes/conectada-r2.html';next()})
 },transform(code,id){
  if(id.replaceAll('\\','/').endsWith('/src/lib/configuracoes.ts')){
   if(!code.includes('BACKEND_CONFIGURACOES_HABILITADO = false'))throw new Error('Flag mudou: revisar bancada')
   return code.replace('BACKEND_CONFIGURACOES_HABILITADO = false','BACKEND_CONFIGURACOES_HABILITADO = true')
  }
 }}],define:{
 'import.meta.env.VITE_CLINICA_BROTAS_HOSTNAME':JSON.stringify('configuracoes-homologacao-r2-a.invalid'),
 'import.meta.env.VITE_CLINICA_IPUPIARA_HOSTNAME':JSON.stringify('configuracoes-homologacao-r2-b.invalid'),
 'import.meta.env.VITE_CLINICA_BROTAS_ID':JSON.stringify('ed60a2c6-59c8-45bc-80b7-e53aa005da01'),
 'import.meta.env.VITE_CLINICA_IPUPIARA_ID':JSON.stringify('ed60a2c6-59c8-45bc-80b7-e53aa005da02'),
 },cacheDir:join(tmpdir(),'clinica-patricia-configuracoes-r2','vite-cache'),build:{outDir:join(tmpdir(),'clinica-patricia-configuracoes-r2','build'),emptyOutDir:false,rollupOptions:{input:'tests/configuracoes/conectada-r2.html'}},
 preview:{host:'127.0.0.1',port:3000,strictPort:true}}
})
