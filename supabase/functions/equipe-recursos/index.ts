import { createClient } from 'npm:@supabase/supabase-js@2.111.0'
// Distribuição Deno/WASM: a variante npm requer addon nativo na inicialização.
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'
import { ORIGENS_LOCAIS_PERMITIDAS, ORIGENS_PUBLICAS_PERMITIDAS } from '../equipe-acessos/conviteAuth.ts'
import { FOTO_MAX_BYTES, processarFotoEquipe } from '../_shared/equipeFoto.ts'
import { ErroRecursoEquipe } from '../_shared/equipeRecebimento.ts'
import { erroServidorRecurso, gravarFotoEquipe, gravarRecebimentoEquipe, type ConfiguracaoRecebimento, type ConfirmacaoFoto, type PortasRecursosEquipe } from '../_shared/equipeRecursosServico.ts'

const url=Deno.env.get('SUPABASE_URL') ?? ''
const anon=Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? ''
const uuid=(v:unknown):v is string=>typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
function headers(req:Request) {
  const h=new Headers({'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store',Vary:'Origin'})
  const origin=req.headers.get('origin') ?? ''
  if(ORIGENS_LOCAIS_PERMITIDAS.has(origin)||ORIGENS_PUBLICAS_PERMITIDAS.has(origin)) h.set('Access-Control-Allow-Origin',origin)
  return h
}
const responder=(r:Request,d:unknown,status=200)=>new Response(JSON.stringify(d),{status,headers:headers(r)})
// Limit streaming before parsing multipart/JSON, including chunked requests.
async function corpoLimitado(req:Request):Promise<Request> {
  const reader=req.body?.getReader();const chunks:Uint8Array[]=[];let total=0
  if(reader) try {for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>FOTO_MAX_BYTES+65536){await reader.cancel();throw new ErroRecursoEquipe('DADOS_INVALIDOS','Arquivo ou formulário excede o limite permitido.')}chunks.push(value)}} finally {reader.releaseLock()}
  const bytes=new Uint8Array(total);let n=0;for(const c of chunks){bytes.set(c,n);n+=c.length}
  return new Request(req.url,{method:'POST',headers:req.headers,body:bytes})
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:headers(req)})
  if(req.method!=='POST') return responder(req,{codigo:'DADOS_INVALIDOS',erro:'Método não permitido.'},405)
  const origin=req.headers.get('origin')
  if(origin && !ORIGENS_LOCAIS_PERMITIDAS.has(origin)&&!ORIGENS_PUBLICAS_PERMITIDAS.has(origin)) return responder(req,{codigo:'NAO_AUTORIZADO',erro:'Origem não autorizada.'},403)
  try {
    if(!url||!anon||!service) throw new ErroRecursoEquipe('CONSULTA_INDISPONIVEL','O serviço de fotos e recebimento não está disponível neste ambiente.')
    const authorization=req.headers.get('authorization') ?? ''
    if(!authorization.startsWith('Bearer ')) throw new ErroRecursoEquipe('NAO_AUTORIZADO','Entre novamente no sistema.')
    const usuario=createClient(url,anon,{...options,global:{headers:{Authorization:authorization}}})
    const {data,error}=await usuario.auth.getUser(authorization.slice(7))
    if(error||!data.user) throw new ErroRecursoEquipe('NAO_AUTORIZADO','Entre novamente no sistema.')
    const limitado=await corpoLimitado(req)
    let body:Record<string,unknown>;let file:File|null=null
    if(req.headers.get('content-type')?.includes('multipart/form-data')) {
      const form=await limitado.formData();body=Object.fromEntries(['acao','membroId','clinicaId','revisao'].map(k=>[k,form.get(k)]));body.revisao=Number(body.revisao)
      const candidato=form.get('foto');if(candidato instanceof File)file=candidato
    } else {try {body=await limitado.json()} catch {throw new ErroRecursoEquipe('DADOS_INVALIDOS','Formulário inválido.')}}
    if(!body||typeof body!=='object'||Array.isArray(body)||!uuid(body.membroId)||!uuid(body.clinicaId)||!Number.isSafeInteger(body.revisao)||Number(body.revisao)<0||!['foto_salvar','foto_remover','recebimento_salvar'].includes(String(body.acao))) throw new ErroRecursoEquipe('DADOS_INVALIDOS','Contexto inválido.')
    const c={membroId:body.membroId,clinicaId:body.clinicaId,atorId:data.user.id,revisao:Number(body.revisao)}
    if(body.acao==='foto_remover'&&file)throw new ErroRecursoEquipe('DADOS_INVALIDOS','Operação inválida.')
    const admin=createClient(url,service,options)
    async function rpc<T>(nome:string,args:Record<string,unknown>):Promise<T>{const {data,error}=await admin.rpc(nome,args);if(error)throw {code:error.code};return data as T}
    const parametros={p_membro_id:c.membroId,p_clinica_id:c.clinicaId,p_ator_id:c.atorId}
    const portas:PortasRecursosEquipe={
      async autorizarFoto(){const {error}=await usuario.rpc('equipe_foto_autorizar',{p_membro_id:c.membroId,p_clinica_id:c.clinicaId,p_escrita:true});if(error)throw {code:error.code}},
      async limparTemporarias(){const paths=await rpc<string[]>('equipe_foto_temporarias_expiradas',parametros);if(!Array.isArray(paths)||paths.some(path=>typeof path!=='string'||!path.startsWith(c.membroId+'/')))return false;if(!paths.length)return true;const {error}=await admin.storage.from('equipe-fotos').remove(paths);return !error},
      async upload(caminho,bytes){const {error}=await admin.storage.from('equipe-fotos').upload(caminho,bytes,{contentType:'image/jpeg',upsert:false});if(error)throw new Error('Upload indisponível')},
      confirmarFoto:(_,caminho)=>rpc<ConfirmacaoFoto>('equipe_foto_confirmar',{...parametros,p_revisao:c.revisao,p_caminho:caminho}),
      podeDescartar:(_,caminho)=>rpc<boolean>('equipe_foto_pode_descartar',{...parametros,p_caminho:caminho}),
      async descartar(caminho){const {error}=await admin.storage.from('equipe-fotos').remove([caminho]);if(error)throw new Error('Limpeza pendente')},
      consultarRecebimento:()=>rpc<ConfiguracaoRecebimento>('equipe_recebimento_interno',parametros),
      salvarRecebimento:(_,dados)=>rpc<ConfiguracaoRecebimento>('equipe_recebimento_salvar',{...parametros,p_revisao:c.revisao,p_dados:dados}),
    }
    if(body.acao==='recebimento_salvar') return responder(req,await gravarRecebimentoEquipe(portas,c,{dados:body.dados,preservar:body.preservar}))
    if(body.acao==='foto_salvar' && (!file||file.size>FOTO_MAX_BYTES||!['image/jpeg','image/png'].includes(file.type))) throw new ErroRecursoEquipe('FOTO_INVALIDA','Escolha uma foto JPEG ou PNG de até 5 MB.')
    return responder(req,await gravarFotoEquipe(portas,c,file?{bytes:new Uint8Array(await file.arrayBuffer()),mime:file.type}:null,(bytes,mime)=>processarFotoEquipe(bytes,async b=>await Image.decode(b),mime,(w,h)=>new Image(w,h)),()=>crypto.randomUUID()))
  } catch(e) {
    const erro=erroServidorRecurso(e)
    const status=erro.codigo==='NAO_AUTORIZADO'?403:erro.codigo==='CONFLITO'?409:['DADOS_INVALIDOS','FOTO_INVALIDA'].includes(erro.codigo)?422:erro.codigo==='RESULTADO_INCERTO'?502:503
    // Never log payloads, images, documents, banking values or credentials.
    return responder(req,{codigo:erro.codigo,erro:erro.message,campo:erro.campo},status)
  }
})
