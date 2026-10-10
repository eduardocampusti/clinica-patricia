import { createServer } from 'vite'
import { resolve } from 'node:path'
// Existing synthetic test configuration: never uses project credentials.
const server=await createServer({configFile:resolve('tests/operacional/vite.config.ts'),server:{host:'127.0.0.1',port:4192,strictPort:true}})
await server.listen()
console.log('Demonstração isolada da etapa32: http://127.0.0.1:4192/tests/operacional/equipe-recursos-demo.html')
console.log('Dados fictícios em memória; sem banco/Storage real. Feche com Ctrl+C.')
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0)})
