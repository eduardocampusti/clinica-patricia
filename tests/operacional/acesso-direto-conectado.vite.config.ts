import { defineConfig, mergeConfig, loadEnv } from 'vite'
import { resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import base from '../../vite.config.ts'
export default defineConfig(({mode})=>{
  const ambiente={...loadEnv(mode,process.cwd(),'VITE_'),...process.env}
  if(ambiente.VITE_SUPABASE_URL!=='https://xftnkusbyqzyvzrovroj.supabase.co')throw Error('Bancada: alvo diferente do projeto autorizado')
  const porta=Number(process.env.BANCADA_PORTA??'5189')
  if(![3000,5189].includes(porta))throw Error('Porta da bancada não autorizada')
  const nonce=randomUUID(),pasta=join(tmpdir(),'clinica-patricia-acesso-direto-conectado')
  let diagnostico:Record<string,unknown>|null=null
  return mergeConfig(base,{
    define:{__BANCADA_RECEIPT_NONCE__:JSON.stringify(nonce)},
    plugins:[{name:'acesso-direto-conectado-local',enforce:'pre',resolveId(id){
      if(id.endsWith('/config/acessoDireto'))return resolve('tests/operacional/acesso-direto-conectado-flag.ts')
    },transform(code,id){
      if(porta!==3000||!id.replace(/\\/g,'/').endsWith('/src/lib/acessoDireto.ts'))return
      const alvo="const data = await invocar({ acao: 'provisionar', ...input })"
      if(!code.includes(alvo))throw Error('Contrato da instrumentação divergente')
      return {code:"import {antes as antesFixture,depois as depoisFixture,conferirRpcFinanceiraPendente} from '/tests/operacional/acesso-direto-executor-hook.ts'\n"+code.replace(alvo,"await antesFixture(input); const data = await invocar({ acao: 'provisionar', ...input })").replace('return data as unknown as CredencialTemporaria','return await depoisFixture(input,data as unknown as CredencialTemporaria)').replace('export async function concluirAtivacao(senha: string): Promise<void> {','export async function concluirAtivacao(senha: string): Promise<void> { await conferirRpcFinanceiraPendente();'),map:null}
    },configureServer(server){server.middlewares.use(async(req,res,next)=>{
      // executor-fixture: proxy local estritamente restrito; nenhuma sessão real sai do SDK.
      if(porta===3000&&(req.url??'').startsWith('/__bancada/ad/')){
        if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:3000'){res.statusCode=403;res.end('{}');return}
        const acao=(req.url??'').slice('/__bancada/ad/'.length)
        if(acao==='prova'){
          try{let body='';for await(const chunk of req){body+=chunk.toString();if(body.length>512)throw Error('limite')}
            const b=JSON.parse(body);if(!['H4','H5'].includes(b.rotulo)||b.rpc!=='financeiro_resumo_caixa'||typeof b.aprovado!=='boolean')throw Error('formato')
            mkdirSync(pasta,{recursive:true});writeFileSync(join(pasta,'financeiro-pendente-'+b.rotulo+'.json'),JSON.stringify({recebidoEm:new Date().toISOString(),origem:'SDK normal da sessão fictícia antes da ativação',...b})+'\n')
            res.setHeader('Content-Type','application/json');res.end('{"registrado":true}')
          }catch{res.statusCode=400;res.end('{}')}return
        }
        if(!['preparar','registrar'].includes(acao)){res.statusCode=404;res.end('{}');return}
        try{let body='';for await(const chunk of req){body+=chunk.toString();if(body.length>4096)throw Error('limite')}
          const r=await fetch('http://127.0.0.1:5270/'+acao,{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:3000'},body})
          res.statusCode=r.status;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end(await r.text())
        }catch{res.statusCode=503;res.end('{}')}return
      }
      // Origem distinta para as contas fictícias. Nenhuma sessão do titular é copiada.
      if(porta===3000&&req.headers.host==='localhost:3000'){
        const root=resolve(tmpdir(),'clinica-patricia-configuracoes-r3','build')
        const url=(req.url??'').split('?')[0]
        const file=resolve(root,'.'+(url.startsWith('/assets/')?url:'/tests/configuracoes/conectada-r3.html'))
        if(!file.startsWith(root+'/')&&!file.startsWith(root+'\\')){res.statusCode=403;res.end();return}
        if(req.method!=='GET'||!existsSync(file)){res.statusCode=404;res.end();return}
        res.setHeader('Cache-Control','no-store')
        res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream')
        res.end(readFileSync(file));return
      }
      if((req.url??'').split('?')[0]==='/__bancada/sessao'){
        res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json')
        if(req.method==='GET'){res.end(JSON.stringify(diagnostico??{estado:'aguardando_browser'}));return}
        if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:'+porta){res.statusCode=403;res.end('{}');return}
        try {
          let corpo='';for await(const chunk of req){corpo+=chunk.toString();if(corpo.length>4096)throw Error('limite')}
          const d=JSON.parse(corpo)
          if(d.nonce!==nonce||!['confirmada','ausente','recusada','falha'].includes(d.estado)||typeof d.mensagem!=='string'||d.mensagem.length>350||!(d.atorId===null||/^[0-9a-f-]{36}$/i.test(d.atorId))||['guarda','pendenciaNormal','proprietariaAmbas'].some(k=>typeof d[k]!=='boolean'))throw Error('formato')
          diagnostico={recebidoEm:new Date().toISOString(),origem:'SDK normal na sessão existente da bancada, sem mocks',estado:d.estado,mensagem:d.mensagem,atorId:d.atorId,guarda:d.guarda,pendenciaNormal:d.pendenciaNormal,proprietariaAmbas:d.proprietariaAmbas}
          mkdirSync(pasta,{recursive:true});writeFileSync(join(pasta,'sessao-diagnostico.json'),JSON.stringify(diagnostico,null,2)+'\n')
          res.end('{"registrado":true}')
        }catch{res.statusCode=400;res.end('{}')}
        return
      }
      if((req.url??'').split('?')[0]==='/'||(req.url??'').startsWith('/acesso/')||(req.url??'').startsWith('/sistema/'))req.url='/tests/operacional/acesso-direto-conectado.html'
      next()
    })}}],
    cacheDir:join(pasta,'vite-cache'),server:{host:'127.0.0.1',port:porta,strictPort:true},
    build:{outDir:join(pasta,'build'),emptyOutDir:false,rollupOptions:{input:'tests/operacional/acesso-direto-conectado.html'}},
  })
})
