import {createServer} from 'vite'
import {resolve} from 'node:path'
// Separate synthetic harness: no credentials or production requests.
const server=await createServer({configFile:resolve('tests/operacional/vite.config.ts'),server:{host:'127.0.0.1',port:4193,strictPort:true}})
await server.listen()
console.log('Demonstração fictícia da etapa33: http://127.0.0.1:4193/tests/operacional/equipe-fichas-demo.html')
console.log('Somente dados fictícios; IndexedDB simulado, sem Supabase/RLS/Storage real. Ctrl+C encerra.')
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0)})
