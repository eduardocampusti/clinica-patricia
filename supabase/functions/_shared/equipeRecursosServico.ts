import { comporRecebimento, ErroRecursoEquipe, mascararRecebimento, type DadosRecebimento } from './equipeRecebimento.ts'

export interface ContextoRecurso { membroId:string; clinicaId:string; atorId:string; revisao:number }
export interface ConfirmacaoFoto { membro_id:string; clinica_id:string; caminho:string|null; anterior?:string|null; revisao:number }
export interface ConfiguracaoRecebimento { membro_id:string; profissional_id:string; clinica_id:string; revisao:number; dados:DadosRecebimento|null }
export interface PortasRecursosEquipe {
  autorizarFoto(c:ContextoRecurso):Promise<void>
  limparTemporarias?(c:ContextoRecurso):Promise<boolean>
  upload(caminho:string,bytes:Uint8Array):Promise<void>
  confirmarFoto(c:ContextoRecurso,caminho:string|null):Promise<ConfirmacaoFoto>
  podeDescartar(c:ContextoRecurso,caminho:string):Promise<boolean>
  descartar(caminho:string):Promise<void>
  consultarRecebimento(c:ContextoRecurso):Promise<ConfiguracaoRecebimento>
  salvarRecebimento(c:ContextoRecurso,dados:DadosRecebimento):Promise<ConfiguracaoRecebimento>
}
// An unknown transport outcome is not proof of failure. Never auto-repeat a write.
export function erroServidorRecurso(e:unknown, escrita=false):ErroRecursoEquipe {
  if(e instanceof ErroRecursoEquipe) return e
  const code=e && typeof e==='object' && 'code' in e ? e.code : undefined
  if(code==='42501') return new ErroRecursoEquipe('NAO_AUTORIZADO','Você não tem autorização nesta clínica.')
  if(code==='PT409'||code==='40001') return new ErroRecursoEquipe('CONFLITO','Os dados mudaram em outra sessão. Consulte novamente antes de salvar.')
  if(code==='22023') return new ErroRecursoEquipe('DADOS_INVALIDOS','Revise os dados informados.')
  return new ErroRecursoEquipe(escrita?'RESULTADO_INCERTO':'CONSULTA_INDISPONIVEL',escrita?'A confirmação não chegou. Consulte novamente antes de tentar outra operação.':'Não foi possível consultar os dados autorizados.')
}
async function limpezaSegura(p:PortasRecursosEquipe,c:ContextoRecurso,caminho:string):Promise<boolean> {
  try { if(await p.podeDescartar(c,caminho)) {await p.descartar(caminho);return true} } catch { /* Keep uncertain objects, never delete a possibly confirmed photo. */ }
  return false
}
export async function gravarFotoEquipe(p:PortasRecursosEquipe,c:ContextoRecurso,entrada:{bytes:Uint8Array;mime:string}|null,processar:(b:Uint8Array,mime:string)=>Promise<Uint8Array>,novoId:()=>string):Promise<ConfirmacaoFoto & {limpeza_pendente:boolean}> {
  await p.autorizarFoto(c) // Authorization precedes parsing/processing, upload and service-role use.
  let limpezaInicial=true
  const caminho=entrada ? `${c.membroId}/${novoId()}.jpg` : null
  if(entrada && caminho) {
    const bytes=await processar(entrada.bytes,entrada.mime)
    if(p.limparTemporarias)try{limpezaInicial=await p.limparTemporarias(c)}catch{limpezaInicial=false}
    try {await p.upload(caminho,bytes)} catch(e) {
      // A timed-out upload may still complete. Keep this unique unconfirmed path.
      throw erroServidorRecurso(e,true)
    }
  }
  let confirmado:ConfirmacaoFoto
  if(!entrada && p.limparTemporarias)try{limpezaInicial=await p.limparTemporarias(c)}catch{limpezaInicial=false}
  try {confirmado=await p.confirmarFoto(c,caminho)} catch(e) {
    const erro=erroServidorRecurso(e,true)
    // Only an explicit transactional rejection proves no delayed commit exists.
    if(caminho && ['CONFLITO','NAO_AUTORIZADO','DADOS_INVALIDOS'].includes(erro.codigo)) await limpezaSegura(p,c,caminho)
    throw erro
  }
  if(confirmado.membro_id!==c.membroId || confirmado.clinica_id!==c.clinicaId || confirmado.caminho!==caminho || confirmado.revisao!==c.revisao+1) throw erroServidorRecurso(null,true)
  const limpeza_pendente=!limpezaInicial||Boolean(confirmado.anterior && confirmado.anterior!==caminho && !await limpezaSegura(p,c,confirmado.anterior))
  // Do not expose the prior object path in the browser response.
  return {membro_id:confirmado.membro_id,clinica_id:confirmado.clinica_id,caminho:confirmado.caminho,revisao:confirmado.revisao,limpeza_pendente}
}
export async function gravarRecebimentoEquipe(p:PortasRecursosEquipe,c:ContextoRecurso,entrada:unknown):Promise<ConfiguracaoRecebimento> {
  const atual=await p.consultarRecebimento(c) // Full values stay in trusted server memory only.
  if(atual.membro_id!==c.membroId || atual.clinica_id!==c.clinicaId) throw new ErroRecursoEquipe('NAO_AUTORIZADO','Contexto não autorizado.')
  if(atual.revisao!==c.revisao) throw new ErroRecursoEquipe('CONFLITO','Os dados mudaram em outra sessão. Consulte novamente antes de salvar.')
  const dados=comporRecebimento(entrada,atual.dados)
  let confirmado:ConfiguracaoRecebimento
  try {confirmado=await p.salvarRecebimento(c,dados)} catch(e) {throw erroServidorRecurso(e,true)}
  if(confirmado.membro_id!==c.membroId || confirmado.clinica_id!==c.clinicaId || confirmado.profissional_id!==atual.profissional_id || ![c.revisao,c.revisao+1].includes(confirmado.revisao)) throw erroServidorRecurso(null,true)
  // Mask again in trusted code before serialization, even if the DB reader changes.
  return {membro_id:confirmado.membro_id,profissional_id:confirmado.profissional_id,clinica_id:confirmado.clinica_id,revisao:confirmado.revisao,dados:mascararRecebimento(confirmado.dados)}
}
