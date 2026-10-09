import { supabase } from './supabase'
import { instituicaoVazia, PADRAO, validarDocumento, ErroConfiguracao, type DocumentoConfiguracao, type Instituicao, type Personalizacao } from '../../supabase/functions/_shared/configuracoes'
import { verificarCabecalhoFoto } from '../../supabase/functions/_shared/equipeFoto'
export * from '../../supabase/functions/_shared/configuracoes'
// Habilitar somente após aplicação e homologação do backend proposto.
export const BACKEND_CONFIGURACOES_HABILITADO = true
export interface VersaoConfiguracao { revisao: number; acao: string; autor: string; instante: string; documento: DocumentoConfiguracao }
export interface ConsultaConfiguracao {
  escopo: string; disponivel: boolean; podeGeral: boolean; revisao: number; geralRevisao: number
  documento: DocumentoConfiguracao; geral: Personalizacao; geralVariacoes?: DocumentoConfiguracao['variacoes']; historico: VersaoConfiguracao[]
  empresas: {id:string;nome:string;cnpj:string;unidades:number}[]; ativos: Record<string,string>; fonteRevisao?: string
  fonteConflitante?:boolean; instituicaoAtual?:Instituicao|null
}
export interface ServicoConfiguracoes {
  consultar(escopo:string):Promise<ConsultaConfiguracao>
  salvar(escopo:string,documento:DocumentoConfiguracao,revisao:number,geralRevisao:number,aplicar:boolean,fonteRevisao?:string):Promise<ConsultaConfiguracao>
  restaurar(escopo:string,versao:number,revisao:number,geralRevisao:number,fonteRevisao?:string):Promise<ConsultaConfiguracao>
  enviar(escopo:string,file:File):Promise<{caminho:string;url:string}>
}
async function invocar(body: Record<string,unknown> | FormData) {
  const {data,error}=await supabase.functions.invoke('configuracoes',{body})
  if(error) {
    let detalhe: {erro?:string;conferir?:boolean}={};try{detalhe=await error.context?.json()}catch { /* sem corpo */ }
    throw new ErroConfiguracao(error.context?.status ?? 503,detalhe.erro ?? 'Serviço indisponível. Nenhum salvamento foi confirmado.',detalhe.conferir ?? true)
  }
  if(!data || data.erro) throw new ErroConfiguracao(503,data?.erro ?? 'Resposta inválida. Reconsulte antes de repetir.',true)
  return data
}
function conferirConsulta(data: ConsultaConfiguracao,escopo:string,revisao?:number):ConsultaConfiguracao {
  try {
    if(!data||data.escopo!==escopo||typeof data.disponivel!=='boolean'||typeof data.podeGeral!=='boolean'||!Number.isInteger(data.revisao)||data.revisao<0||!Number.isInteger(data.geralRevisao)||data.geralRevisao<0||!Array.isArray(data.historico)||!Array.isArray(data.empresas)||!data.ativos||typeof data.ativos!=='object'||!data.geral||typeof data.geral!=='object'||(revisao!==undefined&&(!data.disponivel||data.revisao!==revisao+1)))throw new Error()
    validarDocumento(data.documento,escopo==='geral')
    if(data.fonteConflitante){if(!data.instituicaoAtual)throw new Error();validarDocumento({...data.documento,instituicao:data.instituicaoAtual})}
    validarDocumento({instituicao:null,campos:data.geral,variacoes:data.geralVariacoes??{}},true)
    for(const [path,link] of Object.entries(data.ativos)) {
      const u=new URL(link)
      if(!path.startsWith('geral/')&&!path.startsWith(`${escopo}/`))throw new Error()
      if(u.origin!=='https://xftnkusbyqzyvzrovroj.supabase.co'||!u.pathname.startsWith('/storage/v1/object/sign/institucionais/'))throw new Error()
    }
    return data
  }catch {throw new ErroConfiguracao(503,'Resposta do servidor incompleta. Nenhum salvamento pode ser confirmado. Reconsulte antes de repetir.',true)}
}
export const servicoConfiguracoes: ServicoConfiguracoes = {
  async consultar(escopo) {
    if(BACKEND_CONFIGURACOES_HABILITADO) return conferirConsulta(await invocar({acao:'consultar',escopo}),escopo)
    if(escopo==='geral') throw new ErroConfiguracao(503,'A edição do padrão geral depende de autorização global própria e ativação do serviço.')
    const {data,error}=await supabase.from('clinicas').select('id,nome,cidade,cnpj,cor_primaria,logo_url').eq('id',escopo).eq('ativo',true).single()
    if(error || !data) throw new ErroConfiguracao(503,'Não foi possível consultar os dados oficiais da unidade. Tente novamente.')
    const i: Instituicao={...instituicaoVazia(),nome:data.nome,cidade:data.cidade,cnpj:data.cnpj ?? ''}
    return {escopo,disponivel:false,podeGeral:false,revisao:0,geralRevisao:0,documento:{instituicao:i,campos:{cor:data.cor_primaria??PADRAO.cor},variacoes:{}},geral:{},historico:[],empresas:[],ativos:{}}
  },
  async salvar(escopo,documento,revisao,geralRevisao,aplicar,fonteRevisao) {
    if(!BACKEND_CONFIGURACOES_HABILITADO) throw new ErroConfiguracao(503,'Backend de Configurações ainda não ativado. Nada foi salvo.')
    return conferirConsulta(await invocar({acao:aplicar?'aplicar':'rascunho',escopo,documento:validarDocumento(documento,escopo==='geral'),revisao,geralRevisao,fonteRevisao}),escopo,revisao)
  },
  async restaurar(escopo,versao,revisao,geralRevisao,fonteRevisao) {if(!BACKEND_CONFIGURACOES_HABILITADO)throw new ErroConfiguracao(503,'Backend ainda não ativado.');return conferirConsulta(await invocar({acao:'restaurar',escopo,versao,revisao,geralRevisao,fonteRevisao}),escopo,revisao)},
  async enviar(escopo,file) {
    await validarImagemInstitucional(file)
    if(!BACKEND_CONFIGURACOES_HABILITADO) throw new ErroConfiguracao(503,'Envio indisponível até ativar o backend. A prévia não é um upload.')
    const f=new FormData();f.set('acao','enviar');f.set('escopo',escopo);f.set('arquivo',file);return invocar(f)
  },
}
export async function validarImagemInstitucional(file: File) {
  const h=verificarCabecalhoFoto(new Uint8Array(await file.arrayBuffer()),file.type)
  const bitmap=await createImageBitmap(file)
  try {if(bitmap.width!==h.largura || bitmap.height!==h.altura)throw new Error('Imagem inválida.')}finally{bitmap.close()}
  return h
}
export interface MarcaPublica {logo:string;imagem:string;favicon:string;cor:string;mensagem:string;focoX:number;focoY:number;desktop:'lateral'|'compacto';mobile:'compacto'|'semImagem'}
export async function consultarMarcaPublica(hostname:string):Promise<MarcaPublica|null> {
  if(!BACKEND_CONFIGURACOES_HABILITADO) return null
  const {data,error}=await supabase.functions.invoke('configuracoes-publicas',{body:{hostname}})
  if(error || !data?.marca) return null
  const m=data.marca as MarcaPublica
  const urlSegura=(s:string)=>!s || /^https:\/\/xftnkusbyqzyvzrovroj\.supabase\.co\/functions\/v1\/configuracoes-publicas\?ativo=/.test(s)
  if(![m.logo,m.imagem,m.favicon].every(s=>typeof s==='string'&&urlSegura(s)))return null
  return m
}
