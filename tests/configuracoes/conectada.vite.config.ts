// Nunca publicar esta configuração/bancada. Só aponta para o projeto autorizado.
import {defineConfig,loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'VITE_')
 if(env.VITE_SUPABASE_URL!=='https://xftnkusbyqzyvzrovroj.supabase.co')throw new Error('Alvo da bancada não autorizado')
 return {plugins:[react(),tailwindcss(),{name:'configuracoes-conectada-local',enforce:'pre',configurePreviewServer(server){
  server.middlewares.use((req,_res,next)=>{if(['/acesso/brotas','/acesso/ipupiara'].includes((req.url??'').split('?')[0]))req.url='/tests/configuracoes/conectada.html';next()})
 },transform(code,id){
  if(id.replaceAll('\\','/').endsWith('/src/lib/configuracoes.ts')){
   if(!code.includes('BACKEND_CONFIGURACOES_HABILITADO = false'))throw new Error('Flag mudou: revisar bancada')
   return code.replace('BACKEND_CONFIGURACOES_HABILITADO = false','BACKEND_CONFIGURACOES_HABILITADO = true')
  }
 }}],define:{
 'import.meta.env.VITE_BROTAS_HOSTNAME':JSON.stringify('configuracoes-homologacao-a.invalid'),
 'import.meta.env.VITE_IPUPIARA_HOSTNAME':JSON.stringify('configuracoes-homologacao-b.invalid'),
 'import.meta.env.VITE_BROTAS_CLINIC_ID':JSON.stringify('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701'),
 'import.meta.env.VITE_IPUPIARA_CLINIC_ID':JSON.stringify('7fc7ca34-e9a4-4af8-8bcb-0d7e3c922702'),
 },cacheDir:'scratch/configuracoes-sequencia/vite-cache',build:{outDir:'scratch/configuracoes-sequencia/frontend-conectado',emptyOutDir:false,rollupOptions:{input:'tests/configuracoes/conectada.html'}},
 preview:{host:'127.0.0.1',port:3000,strictPort:true}}
})
