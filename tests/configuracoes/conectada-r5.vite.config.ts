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
  server.middlewares.use((req,_res,next)=>{if(['/acesso/brotas','/acesso/ipupiara'].includes((req.url??'').split('?')[0]))req.url='/tests/configuracoes/conectada-r5.html';next()})
 },transform(code,id){
  if(id.replaceAll('\\','/').endsWith('/src/lib/configuracoes.ts')){
   if(!code.includes('BACKEND_CONFIGURACOES_HABILITADO = false'))throw new Error('Flag mudou: revisar bancada')
   return code.replace('BACKEND_CONFIGURACOES_HABILITADO = false','BACKEND_CONFIGURACOES_HABILITADO = true')
  }
 }}],define:{
 'import.meta.env.VITE_CLINICA_BROTAS_HOSTNAME':JSON.stringify('configuracoes-homologacao-r5-a.invalid'),
 'import.meta.env.VITE_CLINICA_IPUPIARA_HOSTNAME':JSON.stringify('configuracoes-homologacao-r5-b.invalid'),
 'import.meta.env.VITE_CLINICA_BROTAS_ID':JSON.stringify('dcf5302b-1a4e-4eb7-b2cc-a88a77150001'),
 'import.meta.env.VITE_CLINICA_IPUPIARA_ID':JSON.stringify('dcf5302b-1a4e-4eb7-b2cc-a88a77150002'),
 },cacheDir:join(tmpdir(),'clinica-patricia-configuracoes-r5','vite-cache'),build:{outDir:join(tmpdir(),'clinica-patricia-configuracoes-r5','build'),emptyOutDir:false,rollupOptions:{input:'tests/configuracoes/conectada-r5.html'}},
 preview:{host:'127.0.0.1',port:3000,strictPort:true}}
})
