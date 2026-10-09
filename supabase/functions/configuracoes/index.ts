import { createClient } from 'npm:@supabase/supabase-js@2.111.0'
import { exigirAtivacaoServico } from '../_shared/guardaAtivacao.ts'
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'
import { verificarCabecalhoFoto } from '../_shared/equipeFoto.ts'
import { ErroRecursoEquipe } from '../_shared/equipeRecebimento.ts'
import { ErroConfiguracao, validarDocumento, validarPersonalizacao, resolverApresentacao, type DocumentoConfiguracao } from '../_shared/configuracoes.ts'
import { ORIGENS_LOCAIS_PERMITIDAS, ORIGENS_PUBLICAS_PERMITIDAS } from '../equipe-acessos/conviteAuth.ts'
const url=Deno.env.get('SUPABASE_URL')??'',anon=Deno.env.get('SUPABASE_ANON_KEY')??'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??''
const opcoes={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
const admin=createClient(url,key,opcoes)
function headers(req:Request){const h=new Headers({'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST,OPTIONS',Vary:'Origin'});const o=req.headers.get('origin')??'';if(ORIGENS_LOCAIS_PERMITIDAS.has(o)||ORIGENS_PUBLICAS_PERMITIDAS.has(o))h.set('Access-Control-Allow-Origin',o);return h}
const resposta=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:headers(req)})
function conferirRpc(error:{code?:string}|null){if(error)throw new ErroConfiguracao(error.code==='42501'?403:error.code==='40001'?409:error.code==='22023'?422:503,error.code==='40001'?'Outra edição alterou a configuração ou seus dados oficiais. Reconsulte.':error.code==='42501'?'Operação não autorizada neste alcance.':'Operação não confirmada. Reconsulte antes de repetir.',!['42501','40001','22023'].includes(error.code??''))}
async function corpoLimitado(req:Request){const reader=req.body?.getReader(),chunks:Uint8Array[]=[];let size=0;if(reader)try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>5*1024*1024+32768)throw new ErroConfiguracao(413,'Arquivo excede o limite permitido.');chunks.push(r.value)}}finally{await reader.cancel().catch(()=>{})}const b=new Uint8Array(size);let pos=0;for(const c of chunks){b.set(c,pos);pos+=c.length}return new Request(req.url,{method:'POST',headers:req.headers,body:b})}
async function estado(escopo:string,ator:string){const r=await admin.rpc('configuracoes_estado_interno',{p_escopo:escopo,p_ator:ator});conferirRpc(r.error);return r.data}
async function assinar(c:Record<string,unknown>){
  const refs=new Set<string>();function visitar(v:unknown){if(typeof v==='string'&&/^(geral|[a-f\d-]{36})\/[a-f\d-]{36}\.(png|jpg)$/.test(v))refs.add(v);else if(v&&typeof v==='object')Object.values(v).forEach(visitar)}visitar(c)
  const paths=[...refs].filter(p=>p.startsWith('geral/')||p.startsWith(`${c.escopo}/`));const ativos:Record<string,string>={}
  if(paths.length){const r=await admin.storage.from('institucionais').createSignedUrls(paths,3600);if(r.error)throw new ErroConfiguracao(503,'Imagens indisponíveis. Configuração não pode ser confirmada.',true);for(const d of r.data??[])if(d.path&&d.signedUrl)ativos[d.path]=d.signedUrl}
  return {...c,ativos}
}
async function publicarAtivo(path:string,escopo:string){
  if(!path)return ''
  const {data:a,error}=await admin.from('configuracoes_ativos').select('caminho,escopo,mime').eq('caminho',path).single()
  if(error||!a)throw new ErroConfiguracao(403,'Imagem pública não autorizada.')
  const permitido=await admin.rpc('configuracoes_ativo_escopo_permitido',{p_ativo_escopo:a.escopo,p_escopo:escopo});conferirRpc(permitido.error)
  if(permitido.data!==true)throw new ErroConfiguracao(403,'Imagem pública não autorizada.')
  return path
}
async function projecoes(escopo:string,documento:DocumentoConfiguracao,atual:Record<string,unknown>){
  // Unidade é resolvida pela consulta autorizada; geral só afeta as duas reais.
  const consulta=admin.from('clinicas').select('id,subdomain').eq('ativo',true)
  const clinicas=await (escopo==='geral'?consulta.in('subdomain',['brotas','ipupiara']):consulta.eq('id',escopo));conferirRpc(clinicas.error)
  const resultado:Record<string,unknown>={},revisoes:Record<string,number>={}
  for(const cl of clinicas.data??[]){if(escopo!=='geral'&&escopo!==cl.id)continue
    const local=await admin.from('configuracoes_escopos').select('campos_aplicados,revisao').eq('escopo',cl.id).maybeSingle();conferirRpc(local.error)
    revisoes[cl.id]=local.data?.revisao??0
    const a=resolverApresentacao(escopo==='geral'?documento.campos:validarPersonalizacao(atual.geral??{}),escopo===cl.id?documento.campos:local.data?.campos_aplicados??{})
    resultado[cl.subdomain]={logo:await publicarAtivo(a.loginLogo,cl.id),imagem:await publicarAtivo(a.loginImagem,cl.id),favicon:await publicarAtivo(a.favicon,cl.id),cor:a.cor,mensagem:a.loginMensagem,focoX:a.loginFocoX,focoY:a.loginFocoY,desktop:a.loginDesktop,mobile:a.loginMobile}
  }
  return {publicacoes:resultado,revisoes}
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)})
  try {
    if(url!=='https://xftnkusbyqzyvzrovroj.supabase.co')throw new ErroConfiguracao(503,'Ambiente não autorizado.')
    if(req.method!=='POST')throw new ErroConfiguracao(405,'Método não permitido.')
    const origem=req.headers.get('origin');if(origem&&!ORIGENS_LOCAIS_PERMITIDAS.has(origem)&&!ORIGENS_PUBLICAS_PERMITIDAS.has(origem))throw new ErroConfiguracao(403,'Origem não autorizada.')
    const jwt=req.headers.get('authorization')?.replace(/^Bearer /,'')??''
    const cliente=createClient(url,anon,{...opcoes,global:{headers:{Authorization:`Bearer ${jwt}`}}});const auth=await cliente.auth.getUser(jwt)
    if(auth.error||!auth.data.user)throw new ErroConfiguracao(401,'Entre novamente para continuar.')
    try { await exigirAtivacaoServico(cliente) } catch { throw new ErroConfiguracao(403,'Ativação ou sessão não autorizada.') }
    const ator=auth.data.user.id,limitado=await corpoLimitado(req)
    if(req.headers.get('content-type')?.includes('multipart/form-data')){
      const form=await limitado.formData();if([...form.keys()].some(k=>!['acao','escopo','arquivo'].includes(k))||[...form.keys()].some(k=>form.getAll(k).length!==1)||form.get('acao')!=='enviar')throw new ErroConfiguracao(422,'Envio inválido.')
      const escopo=String(form.get('escopo')),file=form.get('arquivo');if(!(file instanceof File))throw new ErroConfiguracao(422,'Arquivo ausente.')
      await estado(escopo,ator)
      const bytes=new Uint8Array(await file.arrayBuffer()),h=verificarCabecalhoFoto(bytes,file.type)
      let image:Image;try{image=await Image.decode(bytes)}catch{throw new ErroConfiguracao(422,'Imagem inválida. Exporte novamente como PNG ou JPEG.')}
      if(image.width!==h.largura||image.height!==h.altura||h.orientacao!==1)throw new ErroConfiguracao(422,'Imagem inválida ou com orientação EXIF. Exporte novamente como PNG.')
      // PNG reencodado preserva transparência e remove metadados/executáveis do original.
      const png=await image.encode(),validado=verificarCabecalhoFoto(png,'image/png')
      const path=`${escopo}/${crypto.randomUUID()}.png`,digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(png).buffer))).map(x=>x.toString(16).padStart(2,'0')).join('')
      const envio=await admin.storage.from('institucionais').upload(path,png,{contentType:'image/png',upsert:false,cacheControl:'31536000'});if(envio.error)throw new ErroConfiguracao(503,'Upload não confirmado. Nenhuma configuração foi salva.')
      const registro=await admin.rpc('configuracoes_ativo_registrar',{p_escopo:escopo,p_ator:ator,p_caminho:path,p_mime:'image/png',p_largura:validado.largura,p_altura:validado.altura,p_tamanho:png.length,p_sha256:digest});conferirRpc(registro.error)
      const link=await admin.storage.from('institucionais').createSignedUrl(path,3600);if(link.error)throw new ErroConfiguracao(503,'Upload registrado, mas a prévia falhou. Reconsulte.',true)
      return resposta(req,{caminho:path,url:link.data?.signedUrl})
    }
    const b=await limitado.json();if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['acao','escopo','documento','revisao','geralRevisao','fonteRevisao','versao'].includes(k)))throw new ErroConfiguracao(422,'Campos não permitidos.')
    const escopo=String(b.escopo);const atual=await estado(escopo,ator)
    if(b.acao==='consultar')return resposta(req,await assinar(atual))
    if(!['rascunho','aplicar','restaurar'].includes(b.acao)||!Number.isInteger(b.revisao)||!Number.isInteger(b.geralRevisao))throw new ErroConfiguracao(422,'Operação inválida.')
    let documento=b.documento
    if(b.acao==='restaurar'){
      if(!Number.isInteger(b.versao))throw new ErroConfiguracao(422,'Versão inválida.')
      const v=await admin.from('configuracoes_versoes').select('documento').eq('escopo',escopo).eq('revisao',b.versao).single();conferirRpc(v.error);documento=v.data?.documento
    }
    documento=validarDocumento(documento,escopo==='geral')
    const pubs=b.acao==='aplicar'?await projecoes(escopo,documento,atual):{publicacoes:{},revisoes:{}}
    const r=await admin.rpc('configuracoes_salvar_interno',{p_escopo:escopo,p_ator:ator,p_revisao:b.revisao,p_geral_revisao:b.geralRevisao,p_fonte_revisao:b.fonteRevisao??'',p_documento:documento,p_acao:b.acao,p_publicacoes:pubs.publicacoes,p_revisoes_publicacoes:pubs.revisoes,p_origem:b.acao==='restaurar'?b.versao:null})
    conferirRpc(r.error);return resposta(req,await assinar(r.data))
  }catch(e){if(e instanceof ErroRecursoEquipe)return resposta(req,{erro:'Use uma imagem PNG ou JPEG válida, até 5 MB, de 32 a 4096 px e até 8 megapixels.',conferir:false},422);return resposta(req,{erro:e instanceof ErroConfiguracao?e.message:'Serviço indisponível. Reconsulte antes de repetir.',conferir:e instanceof ErroConfiguracao?e.conferir:true},e instanceof ErroConfiguracao?e.status:503)}
})
