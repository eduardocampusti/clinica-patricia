import {createClient} from 'npm:@supabase/supabase-js@2.111.0'
import {resolverHostnamePublico} from '../_shared/configuracoesPublicas.ts'
const url=Deno.env.get('SUPABASE_URL')??'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??''
const baseHeaders={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,x-client-info,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}
Deno.serve(async req=>{
 const h=baseHeaders
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:h})
 try{
  if(url!=='https://xftnkusbyqzyvzrovroj.supabase.co')throw new Error('alvo')
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  if(req.method==='GET'){
    const path=new URL(req.url).searchParams.get('ativo')??''
    if(!/^(geral|[a-f\d-]{36})\/[a-f\d-]{36}\.(png|jpg)$/.test(path))return new Response(null,{status:404,headers:h})
    const autorizado=await client.rpc('configuracoes_publicas_ativo',{p_caminho:path})
    if(autorizado.error||!autorizado.data)return new Response(null,{status:404,headers:h})
    const image=await client.storage.from('institucionais').download(path)
    if(image.error||!image.data)throw new Error('arquivo')
    return new Response(image.data,{headers:{...h,'Content-Type':autorizado.data.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=300'}})
  }
  if(req.method!=='POST'||Number(req.headers.get('content-length')??0)>512)return new Response('{}',{status:400,headers:h})
  const reader=req.body?.getReader();let size=0;const chunks:Uint8Array[]=[];if(reader)try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>512)throw new Error('limite');chunks.push(r.value)}}finally{await reader.cancel().catch(()=>{})}
  const bytes=new Uint8Array(size);let n=0;for(const c of chunks){bytes.set(c,n);n+=c.length}const b=JSON.parse(new TextDecoder().decode(bytes))
  const slug=resolverHostnamePublico(b);if(!slug)return new Response('{}',{status:404,headers:h})
  const r=await client.rpc('configuracoes_publicas_consultar',{p_slug:slug});if(r.error)throw new Error('indisponível')
  const resultado=r.data??{}
  if(resultado.marca)for(const campo of ['logo','imagem','favicon']){const path=resultado.marca[campo];resultado.marca[campo]=path?`${url}/functions/v1/configuracoes-publicas?ativo=${encodeURIComponent(path)}`:''}
  return new Response(JSON.stringify(resultado),{headers:h})
 }catch{return new Response('{}',{status:503,headers:h})}
})
