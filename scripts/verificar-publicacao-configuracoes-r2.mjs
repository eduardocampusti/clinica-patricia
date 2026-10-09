// Leitura CONECTADA futura. Não executar antes da aplicação autorizada.
// Sem usuário/JWT administrativo. Só campos públicos, hashes e URLs das fixtures.
import fs from 'node:fs'
import {createHash} from 'node:crypto'
const etapa=process.argv[2]
if(!['--antes','--publicado','--encerrado'].includes(etapa))throw Error('Escolher --antes, --publicado ou --encerrado')
const env=fs.readFileSync('.env','utf8')
const valor=k=>process.env[k]??env.match(new RegExp(`^${k}\\s*=\\s*(.*?)\\s*$`,'m'))?.[1]?.replace(/^(['"])(.*)\1$/,'$2')
const url=valor('VITE_SUPABASE_URL'),key=valor('VITE_SUPABASE_PUBLISHABLE_KEY')||valor('VITE_SUPABASE_ANON_KEY')
if(url!=='https://xftnkusbyqzyvzrovroj.supabase.co'||!key)throw Error('Alvo/chave pública da bancada não configurados')
const base=`${url}/functions/v1/configuracoes-publicas`,headers={'Content-Type':'application/json',apikey:key}
const pasta='scratch/configuracoes-sequencia/publico-conectado-r2'
fs.mkdirSync(pasta,{recursive:true})
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex')
const consulta=async body=>{const r=await fetch(base,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});return {status:r.status,data:await r.json()}}
const exigir=(ok,msg)=>{if(!ok)throw Error(msg)}
const reais={}
for(const h of ['clinicabrotas.com.br','clinicaipupiara.com.br']){const r=await consulta({hostname:h});exigir(r.status===200,'Serviço público não disponível');reais[h]=hash(r.data)}
const antes=`${pasta}/antes.json`
if(etapa==='--antes'){
 exigir(!fs.existsSync(antes),'Baseline já registrada: preservar, não sobrescrever')
 fs.writeFileSync(antes,JSON.stringify({projeto:'xftnkusbyqzyvzrovroj',em:new Date().toISOString(),reais},null,2))
 console.log('Baseline pública B/I registrada por hashes; nenhuma escrita remota.');process.exit(0)
}
const baseline=JSON.parse(fs.readFileSync(antes,'utf8'))
exigir(hash(reais)===hash(baseline.reais),'Identidade pública B/I mudou: investigar concorrência, não atribuir isolamento')
const campos=['logo','imagem','favicon','cor','mensagem','focoX','focoY','desktop','mobile'],ativos=[]
for(const n of ['a','b']){
 const r=await consulta({hostname:`configuracoes-homologacao-r2-${n}.invalid`})
 exigir(r.status===200,'Alias fixo indisponível')
 if(etapa==='--encerrado'){exigir(!r.data.marca,'Contexto ainda público');continue}
 exigir(r.data.marca&&Number.isInteger(r.data.versao)&&r.data.versao>0,'Não existe versão APLICADA pública')
 exigir(Object.keys(r.data).every(k=>['marca','versao','aplicadoEm'].includes(k))&&Object.keys(r.data.marca).every(k=>campos.includes(k)),'Campo privado/inesperado exposto')
 const logo=r.data.marca.logo;exigir(typeof logo==='string'&&logo.startsWith(`${base}?ativo=`),'Aplicar logo fictícia antes deste teste')
 const p=new URL(logo).searchParams.get('ativo');exigir(p?.startsWith(`ed60a2c6-59c8-45bc-80b7-e53aa005da0${n==='a'?'1':'2'}/`),'Imagem fora do contexto')
 const image=await fetch(logo,{headers:{apikey:key},signal:AbortSignal.timeout(15000)})
 exigir(image.ok&&image.headers.get('content-type')?.includes('image/png'),'Imagem aplicada não é pública/legível')
 const bytes=new Uint8Array(await image.arrayBuffer());exigir(bytes.length>8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,'Arquivo público não PNG')
 ativos.push({contexto:n,url:logo,sha256:createHash('sha256').update(bytes).digest('hex'),versao:r.data.versao})
}
for(const body of [{hostname:'arbitrario.invalid'},{hostname:'ed60a2c6-59c8-45bc-80b7-e53aa005da01'},{hostname:'configuracoes-homologacao-r2-a.invalid',escopo:'geral'},{hostname:'configuracoes-homologacao-r2-a.invalid',rascunho:true}]){
 const r=await consulta(body);exigir(r.status===404,'Seletor público indevido aceito')
}
if(etapa==='--encerrado')for(const a of JSON.parse(fs.readFileSync(`${pasta}/publicado.json`,'utf8')).ativos){const r=await fetch(a.url,{headers:{apikey:key,'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});exigir(r.status===404,'Nova leitura de imagem encerrada ainda disponível')}
fs.writeFileSync(`${pasta}/${etapa.slice(2)}.json`,JSON.stringify({projeto:'xftnkusbyqzyvzrovroj',em:new Date().toISOString(),anonimo:true,reais_preservadas:true,payloads_indevidos_recusados:true,ativos},null,2))
console.log('PASS leitura anônima real, lista pública, isolamento dos domínios e estado das imagens/contextos. Não comprova Login/Auth privados.')
