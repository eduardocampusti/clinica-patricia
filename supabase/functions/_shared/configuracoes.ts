// Contrato determinístico compartilhado por navegador e serviço. Sem HTML executável.
import { cnpjRecebimentoValido } from './equipeRecebimento.ts'
export const CAMPOS_INSTITUICAO = ['nome','nomeFantasia','nomeExibicao','razaoSocial','cnpj','cep','logradouro','numero','complemento','bairro','cidade','uf','telefone','whatsapp','email','site','empresaId'] as const
export type CampoInstituicao = typeof CAMPOS_INSTITUICAO[number]
export type Instituicao = Record<CampoInstituicao, string>
export const VARIAVEIS = { nome: 'Nome da unidade', razaoSocial: 'Razão social', cnpj: 'CNPJ', endereco: 'Endereço completo', telefone: 'Telefone', whatsapp: 'WhatsApp', email: 'E-mail', site: 'Site' } as const
export type Variavel = keyof typeof VARIAVEIS
export const TIPOS_DOCUMENTO = ['padrao','relatorio_financeiro','receita','declaracao','atestado','solicitacao_exames'] as const
export type TipoDocumento = typeof TIPOS_DOCUMENTO[number]
export type ParteLinha = { campo: Variavel } | { texto: string }
export type Linha = ParteLinha[]
export interface Apresentacao {
  logoPrincipal: string; logoImpressao: string; logoCompacta: string; favicon: string; cor: string
  loginLogo: string; loginImagem: string; loginMensagem: string; loginFocoX: number; loginFocoY: number
  loginDesktop: 'lateral' | 'compacto'; loginMobile: 'compacto' | 'semImagem'
  logoPosicao: 'left' | 'center' | 'right'; logoLargura: number; nomeInstitucional: boolean
  cabecalho: Linha[]; rodape: Linha[]; alinhamento: 'left' | 'center' | 'right'
  margem: number; espaco: number; paginas: boolean; marcaDagua: string
}
export type Personalizacao = Partial<Apresentacao>
export interface DocumentoConfiguracao { instituicao: Instituicao | null; campos: Personalizacao; variacoes: Partial<Record<TipoDocumento, Personalizacao>> }
export const instituicaoVazia = (): Instituicao => Object.fromEntries(CAMPOS_INSTITUICAO.map(k => [k, ''])) as Instituicao
export const PADRAO: Apresentacao = {
  logoPrincipal: '', logoImpressao: '', logoCompacta: '', favicon: '', cor: '#006194',
  loginLogo: '', loginImagem: '', loginMensagem: '', loginFocoX: 50, loginFocoY: 50,
  loginDesktop: 'lateral', loginMobile: 'compacto', logoPosicao: 'left', logoLargura: 32,
  nomeInstitucional: true, cabecalho: [],
  rodape: [[{campo:'endereco'},{campo:'telefone'}],[{campo:'razaoSocial'},{campo:'cnpj'}]],
  alinhamento: 'center', margem: 18, espaco: 4, paginas: true, marcaDagua: '',
}
// Ausência = herança. ''/false/[] = escolha explícita, inclusive vazio.
export function resolverApresentacao(geral: Personalizacao, unidade: Personalizacao, variacao: Personalizacao = {}): Apresentacao {
  const a={ ...structuredClone(PADRAO), ...structuredClone(geral), ...structuredClone(unidade), ...structuredClone(variacao) }
  for(const k of ['logoImpressao','logoCompacta','loginLogo'] as const) {
    if(![geral,unidade,variacao].some(c=>Object.hasOwn(c,k)))a[k]=a.logoPrincipal
  }
  return a
}
export function resolverTipoDocumento(geral: Personalizacao, gerais: DocumentoConfiguracao['variacoes'], unidade: Personalizacao, locais: DocumentoConfiguracao['variacoes'], tipo: TipoDocumento): Apresentacao {
  // A personalização da unidade tem prioridade sobre o padrão geral do tipo.
  return resolverApresentacao({...geral,...(tipo==='padrao'?{}:gerais[tipo])},unidade,tipo==='padrao'?{}:locais[tipo])
}
export function voltarAoPadrao(campos: Personalizacao, campo: keyof Apresentacao): Personalizacao { const novo = {...campos}; delete novo[campo]; return novo }
export function enderecoCompleto(i: Instituicao) {
  return [[i.logradouro,i.numero,i.complemento].filter(Boolean).join(', '),i.bairro,[i.cidade,i.uf].filter(Boolean).join(' - '),i.cep && `CEP ${i.cep}`].filter(Boolean).join(' · ')
}
export function comporLinhas(linhas: Linha[], i: Instituicao): string[] {
  return linhas.map(l => l.map(p => 'texto' in p ? p.texto : p.campo === 'endereco' ? enderecoCompleto(i) : p.campo === 'nome' ? i.nomeExibicao || i.nomeFantasia || i.nome : i[p.campo]).filter(Boolean).join(' · ')).filter(Boolean)
}
export function contrasteBranco(hex: string): number {
  if(!/^#[\da-f]{6}$/i.test(hex)) return 0
  const c = [1,3,5].map(n => parseInt(hex.slice(n,n+2),16)/255).map(n=> n<=.04045 ? n/12.92 : ((n+.055)/1.055)**2.4)
  return 1.05/(.2126*c[0]+.7152*c[1]+.0722*c[2]+.05)
}
export class ErroConfiguracao extends Error { status: number; conferir: boolean; constructor(status: number, mensagem: string, conferir = false) { super(mensagem); this.status=status;this.conferir=conferir } }
const invalido = (m: string): never => { throw new ErroConfiguracao(422,m) }
function objeto(v: unknown): Record<string,unknown> { if(!v || typeof v!=='object' || Array.isArray(v)) return invalido('Configuração inválida.'); return v as Record<string,unknown> }
function texto(v: unknown, limite=240): string {
  const controles=typeof v==='string'&&Array.from(v).some(c=>{const n=c.charCodeAt(0);return n<32&&![9,10,13].includes(n)})
  if(typeof v!=='string' || v.length>limite || /[<>]/u.test(v) || controles) return invalido('Use somente texto simples, dentro do limite indicado.'); return v.trim()
}
function chaves(o: Record<string,unknown>, permitidas: readonly string[]) { if(Object.keys(o).some(k=>!permitidas.includes(k))) invalido('Campo não permitido.') }
export function validarInstituicao(v: unknown): Instituicao {
  const o=objeto(v); chaves(o,CAMPOS_INSTITUICAO)
  const i=Object.fromEntries(CAMPOS_INSTITUICAO.map(k=>[k,texto(o[k] ?? '')])) as Instituicao
  if(!i.nome || !i.cidade) invalido('Informe nome da unidade e cidade, conforme o cadastro atual.')
  if(i.cnpj && !cnpjRecebimentoValido(i.cnpj.replace(/[./\s-]/g,'').toUpperCase())) invalido('Confira os dígitos do CNPJ.')
  if(i.cep && i.cep.replace(/\D/g,'').length!==8) invalido('CEP deve conter oito dígitos.')
  if(i.uf && !['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(i.uf)) invalido('Selecione uma UF válida.')
  for(const k of ['telefone','whatsapp'] as const) if(i[k] && !/^\d{10,11}$/.test(i[k].replace(/\D/g,''))) invalido('Telefone e WhatsApp devem incluir DDD.')
  if(i.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email)) invalido('Confira o e-mail institucional.')
  if(i.site) { try { const u=new URL(i.site); if(u.protocol!=='https:' || u.username || u.password) throw 0 } catch { invalido('Informe o site completo começando com https://.') } }
  if(i.empresaId && !/^[a-f\d-]{36}$/i.test(i.empresaId)) invalido('Empresa inválida.')
  return i
}
const ATIVOS = ['logoPrincipal','logoImpressao','logoCompacta','favicon','loginLogo','loginImagem'] as const
export { ATIVOS }
export function validarPersonalizacao(v: unknown): Personalizacao {
  const o=objeto(v);chaves(o,Object.keys(PADRAO)); const r: Record<string,unknown>={}
  for(const [k,vv] of Object.entries(o)) {
    if(ATIVOS.includes(k as typeof ATIVOS[number])) { const s=texto(vv,180); if(s && !/^(geral|[a-f\d-]{36})\/[a-f\d-]{36}\.(png|jpg)$/.test(s)) invalido('Selecione um arquivo institucional validado.');r[k]=s }
    else if(k==='cor') { const s=texto(vv,7); if(contrasteBranco(s)<4.5) invalido('Escolha uma cor mais escura: contraste mínimo 4,5 com branco.');r[k]=s }
    else if(k==='cabecalho'||k==='rodape') {
      if(!Array.isArray(vv)||vv.length>3) invalido('Use até três linhas institucionais.')
      r[k]=(vv as unknown[]).map(l=> {if(!Array.isArray(l)||l.length>8) return invalido('Use até oito campos por linha.');return l.map(p=>{const a=objeto(p);if(Object.keys(a).length!==1) return invalido('Campo de linha inválido.'); if('campo' in a && typeof a.campo==='string' && Object.hasOwn(VARIAVEIS,a.campo)) return {campo:a.campo}; if('texto' in a) return {texto:texto(a.texto,120)};return invalido('Variável não autorizada.')})})
    } else if(['nomeInstitucional','paginas'].includes(k)) { if(typeof vv!=='boolean') invalido('Escolha inválida.');r[k]=vv }
    else if(['logoPosicao','alinhamento'].includes(k)) {if(!['left','center','right'].includes(String(vv))) invalido('Alinhamento inválido.');r[k]=vv}
    else if(k==='loginDesktop'||k==='loginMobile') { if(!(k==='loginDesktop'?['lateral','compacto']:['compacto','semImagem']).includes(String(vv))) invalido('Composição inválida.');r[k]=vv }
    else if(['loginFocoX','loginFocoY','logoLargura','margem','espaco'].includes(k)) {
      const [min,max]=k==='logoLargura'?[12,50]:k==='margem'?[12,28]:k==='espaco'?[2,8]:[0,100]
      if(typeof vv!=='number'||!Number.isFinite(vv)||vv<min||vv>max) invalido('Medida fora do limite permitido.');r[k]=vv
    } else r[k]=texto(vv,k==='loginMensagem'?180:60)
  }
  return r as Personalizacao
}
export function validarDocumento(v: unknown, geral=false): DocumentoConfiguracao {
  const o=objeto(v);chaves(o,['instituicao','campos','variacoes'])
  const variacoes=objeto(o.variacoes);chaves(variacoes,TIPOS_DOCUMENTO.filter(t=>t!=='padrao'))
  if(geral && o.instituicao!==null) invalido('Padrão geral compartilha apresentação, nunca identidade jurídica.')
  return {instituicao:geral?null:validarInstituicao(o.instituicao),campos:validarPersonalizacao(o.campos),variacoes:Object.fromEntries(Object.entries(variacoes).map(([k,v])=>[k,validarPersonalizacao(v)]))}
}
export interface SnapshotTimbrado { versao: number; versaoGeral?:number; fonteRevisao?:string; escopo: string; tipo: TipoDocumento; instituicao: Instituicao; apresentacao: Apresentacao; ativos: Record<string,string> }
// Um emissor futuro entrega sua identidade oficial explicitamente (clínica/empresa/laboratório).
// O emissor que arquivar documentos deve persistir esta cópia COM o PDF emitido.
// A exportação financeira atual gera/downloada o Blob, sem arquivo histórico no servidor.
export function criarSnapshot(escopo: string, versao: number, tipo: TipoDocumento, instituicao: Instituicao, apresentacao: Apresentacao, ativos: Record<string,string> = {}): SnapshotTimbrado {
  return structuredClone({escopo,versao,tipo,instituicao,apresentacao,ativos})
}
