// PROPOSTA NÃO PUBLICADA. Roteiro de cópia/imports no README deste diretório.
import { createClient } from 'npm:@supabase/supabase-js@2.111.0'
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'
import { processarFotoEquipe } from '../../../supabase/functions/_shared/equipeFoto.ts'
import { ErroRecursoEquipe } from '../../../supabase/functions/_shared/equipeRecebimento.ts'
import { ORIGENS_LOCAIS_PERMITIDAS, ORIGENS_PUBLICAS_PERMITIDAS } from '../../../supabase/functions/equipe-acessos/conviteAuth.ts'
import { ErroPerfil, gravarPerfilProprio, type PerfilServidor } from './servico.ts'

const url=Deno.env.get('SUPABASE_URL') ?? ''
const anon=Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? ''
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
function headers(req:Request) {
  const h=new Headers({'Content-Type':'application/json','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store',Vary:'Origin'})
  const origem=req.headers.get('origin') ?? ''
  if(ORIGENS_LOCAIS_PERMITIDAS.has(origem)||ORIGENS_PUBLICAS_PERMITIDAS.has(origem))h.set('Access-Control-Allow-Origin',origem)
  return h
}
const responder=(req:Request,dados:unknown,status=200)=>new Response(JSON.stringify(dados),{status,headers:headers(req)})
async function limitarCorpo(req:Request) {
  const reader=req.body?.getReader();const chunks:Uint8Array[]=[];let total=0
  if(reader)try{for(;;){const r=await reader.read();if(r.done)break;total+=r.value.length;if(total>5*1024*1024+65536){await reader.cancel();throw new ErroPerfil(422,'Foto excede o limite.')}chunks.push(r.value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(total);let p=0;for(const chunk of chunks){bytes.set(chunk,p);p+=chunk.length}
  return new Request(req.url,{method:'POST',headers:req.headers,body:bytes})
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)})
  if(req.method!=='POST')return responder(req,{erro:'Método não permitido.'},405)
  try{
    if(url!=='https://xftnkusbyqzyvzrovroj.supabase.co'||!anon||!service)throw new ErroPerfil(503,'Serviço indisponível.')
    const origem=req.headers.get('origin')
    if(origem&&!ORIGENS_LOCAIS_PERMITIDAS.has(origem)&&!ORIGENS_PUBLICAS_PERMITIDAS.has(origem))throw new ErroPerfil(403,'Origem não autorizada.')
    const authorization=req.headers.get('authorization') ?? ''
    if(!authorization.startsWith('Bearer '))throw new ErroPerfil(401,'Entre novamente.')
    const cliente=createClient(url,anon,{...options,global:{headers:{Authorization:authorization}}})
    const {data,error}=await cliente.auth.getUser(authorization.slice(7))
    if(error||!data.user)throw new ErroPerfil(401,'Entre novamente.')
    // The trusted identity is always the verified JWT. Body never chooses actor.
    const atorId=data.user.id
    const limitado=await limitarCorpo(req)
    let campos:Record<string,unknown>;let foto:File|null=null
    if(req.headers.get('content-type')?.includes('multipart/form-data')){
      const form=await limitado.formData()
      if([...form.keys()].some(k=>!['acao','nome','revisao','fotoAcao','foto'].includes(k))||[...new Set(form.keys())].some(k=>form.getAll(k).length!==1))throw new ErroPerfil(422,'Campos não permitidos.')
      const f=form.get('foto');if(f!==null&&!(f instanceof File))throw new ErroPerfil(422,'Foto inválida.');foto=f as File|null
      campos=Object.fromEntries(['acao','nome','revisao','fotoAcao'].map(k=>[k,form.get(k)]))
    }else{
      try{campos=await limitado.json()}catch{throw new ErroPerfil(422,'Formulário inválido.')}
    }
    if(!campos||typeof campos!=='object'||Array.isArray(campos))throw new ErroPerfil(422,'Formulário inválido.')
    async function consultar():Promise<PerfilServidor>{
      const r=await cliente.rpc('meu_perfil_consultar')
      if(r.error)throw new ErroPerfil(r.error.code==='42501'?403:503,'Perfil indisponível.')
      if(r.data?.usuario_id!==atorId)throw new ErroPerfil(403,'Conta não autorizada.')
      return r.data
    }
    if(campos.acao==='consultar'){
      if(Object.keys(campos).length!==1||foto)throw new ErroPerfil(422,'Campos não permitidos.')
      return responder(req,await consultar())
    }
    const admin=createClient(url,service,options)
    const resultado=await gravarPerfilProprio(atorId,campos,foto,{
      consultar,
      async processar(bytes,mime){
        try{return await processarFotoEquipe(bytes,async b=>await Image.decode(b),mime,(w,h)=>new Image(w,h))}
        catch(e){if(e instanceof ErroRecursoEquipe&&e.codigo==='FOTO_INVALIDA')throw new ErroPerfil(422,e.message);throw e}
      },
      async enviar(path,bytes){const r=await admin.storage.from('contas-fotos').upload(path,bytes,{contentType:'image/jpeg',cacheControl:'0',upsert:false});if(r.error)throw new ErroPerfil(503,'Envio da foto indisponível.')},
      async confirmar(nome,path,revisao){
        const r=await admin.rpc('meu_perfil_salvar_interno',{p_ator_id:atorId,p_nome:nome,p_foto_caminho:path,p_revisao:revisao})
        if(r.error)throw new ErroPerfil(r.error.code==='40001'?409:r.error.code==='42501'?403:r.error.code==='22023'?422:502,'Salvamento não confirmado. Reabra o perfil para conferir.', !['40001','42501','22023'].includes(r.error.code))
        return r.data
      },
    },()=>crypto.randomUUID())
    return responder(req,resultado)
  }catch(e){
    // No logs with personal data, request payloads, images or secrets.
    return responder(req,{erro:e instanceof ErroPerfil?e.message:'Serviço indisponível. Nenhuma alteração foi confirmada.',erro_tipo:e instanceof ErroPerfil&&!e.exigeConferencia?'sem_gravacao':'conferir'},e instanceof ErroPerfil?e.status:503)
  }
})
