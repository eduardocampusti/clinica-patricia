import { supabase } from './supabase'
import type { FotoEquipeDisponivel } from '../components/cadastros/EquipeAvatar'
import { CAMPOS_PROTEGIDOS, ErroRecursoEquipe, validarRecebimento, type DadosRecebimento } from '../../supabase/functions/_shared/equipeRecebimento'

export { CAMPOS_PROTEGIDOS, ErroRecursoEquipe, validarRecebimento } from '../../supabase/functions/_shared/equipeRecebimento'
export type { DadosRecebimento, TipoPix } from '../../supabase/functions/_shared/equipeRecebimento'
export interface FotoEquipeMeta { membro_id:string; clinica_id:string; caminho:string|null; revisao:number; pode_editar:boolean }
export interface RecebimentoEquipe { membro_id:string; profissional_id:string; clinica_id:string; revisao:number; dados:DadosRecebimento|null }
export interface FotosEquipe { metas:Record<string,FotoEquipeMeta>; fotos:Record<string,FotoEquipeDisponivel>; falhaImagem:boolean }
const obj=(v:unknown):Record<string,unknown>=>v && typeof v==='object' && !Array.isArray(v)?v as Record<string,unknown>:{}
const mensagens:Record<string,string>={NAO_AUTORIZADO:'Você não tem autorização para esses dados nesta clínica.',CONFLITO:'Os dados mudaram em outra sessão. Consulte novamente antes de salvar.',RESULTADO_INCERTO:'A confirmação não chegou. Consulte novamente antes de tentar outra operação.',CONSULTA_INDISPONIVEL:'Os dados autorizados não estão disponíveis neste ambiente.',DADOS_INVALIDOS:'Revise os dados informados.',FOTO_INVALIDA:'Use uma foto JPEG ou PNG válida, até 5 MB, de 32 a 4096 px e até 8 megapixels.'}
export function erroRecursosSeguro(e:unknown,escrita=false):ErroRecursoEquipe {
  if(e instanceof ErroRecursoEquipe)return e
  const code=obj(e).code;const codigo=code==='42501'?'NAO_AUTORIZADO':code==='40001'||code==='PT409'?'CONFLITO':escrita?'RESULTADO_INCERTO':'CONSULTA_INDISPONIVEL'
  return new ErroRecursoEquipe(codigo,mensagens[codigo])
}
function metaFoto(v:unknown,clinica:string):FotoEquipeMeta {
  const d=obj(v)
  if(typeof d.membro_id!=='string'||d.clinica_id!==clinica||!Number.isSafeInteger(d.revisao)||Number(d.revisao)<0||typeof d.pode_editar!=='boolean'||(d.caminho!==null && (typeof d.caminho!=='string'||!d.caminho.startsWith(d.membro_id+'/')||!/^[-a-f0-9/]+\.jpg$/i.test(d.caminho)))) throw erroRecursosSeguro(null)
  return d as unknown as FotoEquipeMeta
}
export function liberarFotosEquipe(fotos:Record<string,FotoEquipeDisponivel>):void {for(const f of Object.values(fotos))if(f.url.startsWith('blob:'))URL.revokeObjectURL(f.url)}
async function lerFotoPrivada(meta:FotoEquipeMeta,signal?:AbortSignal,usuarioId?:string,autorizacao?:{token:string;chave:string}):Promise<FotoEquipeDisponivel|null> {
  if(!meta.caminho)return null
  const sessao=autorizacao?null:(await supabase.auth.getSession()).data.session
  if(!autorizacao && (!sessao || (usuarioId && sessao.user.id!==usuarioId)))throw erroRecursosSeguro({code:'42501'})
  const chave=autorizacao?.chave||import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY
  if(!chave)throw erroRecursosSeguro(null)
  const caminho=meta.caminho.split('/').map(encodeURIComponent).join('/')
  const r=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/equipe-fotos/${caminho}`,{headers:{Authorization:`Bearer ${autorizacao?.token ?? sessao!.access_token}`,apikey:chave,'x-clinica-id':meta.clinica_id},cache:'no-store',credentials:'omit',signal})
  if(!r.ok)throw erroRecursosSeguro(null)
  const imagem=await r.blob()
  if(imagem.size>5*1024*1024||imagem.type!=='image/jpeg')throw erroRecursosSeguro(null)
  signal?.throwIfAborted()
  return {membroId:meta.membro_id,clinicaId:meta.clinica_id,url:URL.createObjectURL(imagem)}
}
export async function buscarFotoEquipeDoMembro(membroId:string,clinicaId:string,usuarioId:string,signal:AbortSignal):Promise<FotoEquipeDisponivel|null> {
  const {data,error}=await supabase.rpc('equipe_foto_autorizar',{p_membro_id:membroId,p_clinica_id:clinicaId,p_escrita:false}).abortSignal(signal)
  if(error)throw erroRecursosSeguro(error)
  const meta=metaFoto(data,clinicaId)
  if(meta.membro_id!==membroId)throw erroRecursosSeguro(null)
  return lerFotoPrivada(meta,signal,usuarioId)
}
export async function buscarFotosEquipe(clinicaId:string):Promise<FotosEquipe> {
  const {data,error}=await supabase.rpc('equipe_fotos_listar',{p_clinica_id:clinicaId})
  if(error)throw erroRecursosSeguro(error)
  if(!Array.isArray(data))throw erroRecursosSeguro(null)
  const metas=Object.fromEntries(data.map(v=>{const m=metaFoto(v,clinicaId);return [m.membro_id,m]}))
  const {data:session}=await supabase.auth.getSession()
  if(!session.session)throw erroRecursosSeguro({code:'42501'})
  // No public/signed URLs: authenticated Storage reads include the clinic context.
  const chave=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY
  if(!chave)throw erroRecursosSeguro(null)
  const fotos:Record<string,FotoEquipeDisponivel>={};let falhaImagem=false
  await Promise.all(Object.values(metas).filter(m=>m.caminho).map(async m=>{
    try {
      const foto=await lerFotoPrivada(m,undefined,undefined,{token:session.session!.access_token,chave})
      if(foto)fotos[m.membro_id]=foto
    }catch {falhaImagem=true}
  }))
  return {metas,fotos,falhaImagem}
}
function confirmarRecebimento(v:unknown,membroId:string,clinicaId:string):RecebimentoEquipe {
  const d=obj(v)
  if(d.membro_id!==membroId||d.clinica_id!==clinicaId||typeof d.profissional_id!=='string'||!Number.isSafeInteger(d.revisao)||Number(d.revisao)<0||!('dados' in d))throw erroRecursosSeguro(null)
  if(d.dados!==null) {
    const dados=obj(d.dados)
    if(!['pix','transferencia'].includes(String(dados.preferencia))||!['pf','pj'].includes(String(obj(dados.favorecido).tipo)))throw erroRecursosSeguro(null)
    for(const p of CAMPOS_PROTEGIDOS){const [g,c]=p.split('.');const valor=obj(dados[g])[c];if(valor!==undefined && (typeof valor!=='string'||(valor && !/^••••.{1,2}$/u.test(valor))))throw erroRecursosSeguro(null)}
    // Validate the non-sensitive shape too; malformed wire data must not reach JSX.
    const copia=structuredClone(dados);const preservar:string[]=[]
    for(const p of CAMPOS_PROTEGIDOS){const [g,c]=p.split('.');const grupo=obj(copia[g]);if(grupo[c]){preservar.push(p);grupo[c]=''}}
    try{validarRecebimento(copia,preservar)}catch{throw erroRecursosSeguro(null)}
  }
  return d as unknown as RecebimentoEquipe
}
export async function buscarRecebimentoEquipe(membroId:string,clinicaId:string):Promise<RecebimentoEquipe> {
  const {data,error}=await supabase.rpc('equipe_recebimento_obter',{p_membro_id:membroId,p_clinica_id:clinicaId})
  if(error)throw erroRecursosSeguro(error)
  return confirmarRecebimento(data,membroId,clinicaId)
}
async function escrever(body:Record<string,unknown>|FormData):Promise<unknown> {
  try {
    const {data,error}=await supabase.functions.invoke('equipe-recursos',{body})
    if(error) {
      let detalhe:Record<string,unknown>={}
      if(error.context instanceof Response)try{detalhe=obj(await error.context.json())}catch{/* Generic safe error. */}
      const codigo=typeof detalhe.codigo==='string' && detalhe.codigo in mensagens?detalhe.codigo:'RESULTADO_INCERTO'
      throw new ErroRecursoEquipe(codigo,mensagens[codigo],typeof detalhe.campo==='string'?detalhe.campo:undefined)
    }
    return data
  } catch(e) {throw erroRecursosSeguro(e,true)}
}
export async function salvarFotoEquipe(meta:FotoEquipeMeta,arquivo:File|null):Promise<{limpezaPendente:boolean}> {
  let body:Record<string,unknown>|FormData
  if(arquivo){const f=new FormData();f.set('acao','foto_salvar');f.set('membroId',meta.membro_id);f.set('clinicaId',meta.clinica_id);f.set('revisao',String(meta.revisao));f.set('foto',arquivo);body=f}
  else body={acao:'foto_remover',membroId:meta.membro_id,clinicaId:meta.clinica_id,revisao:meta.revisao}
  const d=obj(await escrever(body))
  if(d.membro_id!==meta.membro_id||d.clinica_id!==meta.clinica_id||d.revisao!==meta.revisao+1||(arquivo?typeof d.caminho!=='string':d.caminho!==null))throw erroRecursosSeguro(null,true)
  return {limpezaPendente:d.limpeza_pendente===true}
}
export async function salvarRecebimentoEquipe(atual:RecebimentoEquipe,dados:DadosRecebimento,preservar:string[]):Promise<RecebimentoEquipe> {
  const resultado=await escrever({acao:'recebimento_salvar',membroId:atual.membro_id,clinicaId:atual.clinica_id,revisao:atual.revisao,dados,preservar})
  try {const confirmado=confirmarRecebimento(resultado,atual.membro_id,atual.clinica_id);if(confirmado.profissional_id!==atual.profissional_id||![atual.revisao,atual.revisao+1].includes(confirmado.revisao))throw erroRecursosSeguro(null,true);return confirmado} catch {throw erroRecursosSeguro(null,true)}
}
