import {spawn} from 'node:child_process'
console.log('Demonstração isolada: http://127.0.0.1:4193/tests/configuracoes/preview.html\nSomente dados fictícios; operações na memória, sem backend real. Feche com Ctrl+C.')
const processo=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','tests/configuracoes/vite.config.ts','--host','127.0.0.1','--port','4193','--strictPort'],{stdio:'inherit'})
processo.on('exit',codigo=>{process.exitCode=codigo??1})
