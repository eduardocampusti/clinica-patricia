// Shared deterministic contract. No banking integration, logs or ambient credentials.
export type TipoPix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
export interface DadosRecebimento {
  preferencia: 'pix' | 'transferencia'
  pix: { tipo: TipoPix; chave: string } | null
  conta: { instituicao: string; codigo: string; agencia: string; digitoAgencia: string; numero: string; digitoConta: string; tipo: 'corrente' | 'poupanca' | 'pagamento' } | null
  favorecido: { tipo: 'pf' | 'pj'; nome: string; documento: string; diferente: boolean }
}
export const CAMPOS_PROTEGIDOS = ['pix.chave','conta.agencia','conta.digitoAgencia','conta.numero','conta.digitoConta','favorecido.documento'] as const
export class ErroRecursoEquipe extends Error {
  codigo: string
  campo?: string
  constructor(codigo: string, mensagem: string, campo?: string) { super(mensagem); this.name = 'ErroRecursoEquipe'; this.codigo=codigo; this.campo=campo }
}
function invalido(campo: string, mensagem: string): never { throw new ErroRecursoEquipe('DADOS_INVALIDOS',mensagem,campo) }
const objeto = (v: unknown): Record<string,unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string,unknown> : {}
function texto(v: unknown, campo: string, max = 120): string {
  if (typeof v !== 'string' || v.length > max || [...v].some(c=>c.charCodeAt(0)<32)) return invalido(campo,'Revise o preenchimento deste campo.')
  return v.trim()
}
export function cpfRecebimentoValido(v: string): boolean {
  if (!/^\d{11}$/.test(v) || /^(\d)\1+$/.test(v)) return false
  for (const n of [9,10]) {
    const soma = [...v.slice(0,n)].reduce((s,c,i) => s + Number(c) * (n+1-i),0)
    const resto = soma * 10 % 11
    if ((resto === 10 ? 0 : resto) !== Number(v[n])) return false
  }
  return true
}
export function cnpjRecebimentoValido(v: string): boolean {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(v) || /^(\d)\1+$/.test(v)) return false
  const dv = (s: string) => {
    const soma = [...s].reverse().reduce((total,c,i) => total + (c.charCodeAt(0)-48) * (2+i%8),0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11-resto
  }
  return Number(v[12]) === dv(v.slice(0,12)) && Number(v[13]) === dv(v.slice(0,13))
}
// The optional list is used only for blank fields preserved by the editing UI.
// The server composes with its authorized full snapshot and validates with no skips.
export function validarRecebimento(valor: unknown, preservados:readonly string[]=[]): DadosRecebimento {
  const v = objeto(valor)
  if (v.preferencia !== 'pix' && v.preferencia !== 'transferencia') invalido('preferencia','Escolha PIX ou transferência.')
  let pix: DadosRecebimento['pix'] = null
  if (v.pix != null) {
    const p = objeto(v.pix); let chave = texto(p.chave,'pix.chave',254)
    if (!['cpf','cnpj','email','telefone','aleatoria'].includes(String(p.tipo))) invalido('pix.tipo','Escolha o tipo de chave PIX.')
    const manter=!chave && preservados.includes('pix.chave')
    if (p.tipo === 'cpf') { chave = chave.replace(/[.\s-]/g,''); if (!manter && !cpfRecebimentoValido(chave)) invalido('pix.chave','Informe uma chave CPF válida.') }
    if (p.tipo === 'cnpj') { chave = chave.replace(/[./\s-]/g,'').toUpperCase(); if (!manter && !cnpjRecebimentoValido(chave)) invalido('pix.chave','Informe uma chave CNPJ válida.') }
    if (!manter && p.tipo === 'email' && (chave.length>77 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave))) invalido('pix.chave','Informe uma chave de e-mail válida.')
    if (p.tipo === 'telefone') { chave = chave.replace(/[()\s-]/g,''); if (!manter && !/^\+[1-9]\d{7,14}$/.test(chave)) invalido('pix.chave','Use o código do país, por exemplo +55, e o número com DDD.') }
    if (!manter && p.tipo === 'aleatoria' && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chave)) invalido('pix.chave','Informe a chave aleatória completa no formato UUID.')
    if (!chave && !manter) invalido('pix.chave','Informe a chave PIX.')
    pix = {tipo:p.tipo as TipoPix,chave}
  }
  let conta: DadosRecebimento['conta'] = null
  if (v.conta != null) {
    const c = objeto(v.conta)
    const instituicao = texto(c.instituicao,'conta.instituicao')
    if (instituicao.length < 2) invalido('conta.instituicao','Informe o banco ou instituição.')
    if (!['corrente','poupanca','pagamento'].includes(String(c.tipo))) invalido('conta.tipo','Escolha o tipo de conta.')
    const campos = {} as Record<'codigo' | 'agencia' | 'digitoAgencia' | 'numero' | 'digitoConta',string>
    for (const nome of ['codigo','agencia','digitoAgencia','numero','digitoConta'] as const) {
      campos[nome] = texto(c[nome],`conta.${nome}`,40)
      if (campos[nome] && !/^[A-Za-z0-9 ./-]+$/.test(campos[nome])) invalido(`conta.${nome}`,'Revise o formato informado, mantendo zeros e dígitos.')
    }
    if (!campos.numero && !preservados.includes('conta.numero')) invalido('conta.numero','Informe o número da conta.')
    conta = {...campos,instituicao,tipo:c.tipo as NonNullable<DadosRecebimento['conta']>['tipo']}
  }
  if (v.preferencia === 'pix' && !pix) invalido('preferencia','Cadastre a chave PIX para escolher essa preferência.')
  if (v.preferencia === 'transferencia' && !conta) invalido('preferencia','Cadastre a conta para escolher transferência.')
  const f = objeto(v.favorecido)
  const nome = texto(f.nome,'favorecido.nome',160)
  if (nome.length < 3) invalido('favorecido.nome','Informe o nome completo ou razão social do favorecido.')
  if (f.tipo !== 'pf' && f.tipo !== 'pj') invalido('favorecido.tipo','Escolha pessoa física ou jurídica.')
  if (typeof f.diferente !== 'boolean') invalido('favorecido.diferente','Informe se o favorecido é diferente do profissional.')
  const documento = texto(f.documento,'favorecido.documento',30).replace(/[./\s-]/g,'').toUpperCase()
  if ((conta && !documento && !preservados.includes('favorecido.documento')) || (documento && !(f.tipo === 'pf' ? cpfRecebimentoValido(documento) : cnpjRecebimentoValido(documento)))) invalido('favorecido.documento',conta ? 'Informe o CPF/CNPJ válido do favorecido para transferência.' : 'Revise o CPF/CNPJ do favorecido.')
  return {preferencia:v.preferencia as DadosRecebimento['preferencia'],pix,conta,favorecido:{tipo:f.tipo as 'pf'|'pj',nome,documento,diferente:f.diferente as boolean}}
}
export function comporRecebimento(entrada: unknown, confirmado: DadosRecebimento | null): DadosRecebimento {
  const e = objeto(entrada); const dados = structuredClone(objeto(e.dados))
  if (!Array.isArray(e.preservar) || e.preservar.some(p => !(CAMPOS_PROTEGIDOS as readonly unknown[]).includes(p))) invalido('preferencia','Revise a configuração antes de salvar.')
  for (const caminho of e.preservar as string[]) {
    const [grupo,campo] = caminho.split('.')
    const anterior = objeto(objeto(confirmado)[grupo]); const novo = objeto(dados[grupo])
    if (!confirmado || !dados[grupo] || novo[campo] !== '' || ((grupo === 'pix' || grupo === 'favorecido') && novo.tipo !== anterior.tipo) || (grupo === 'conta' && (novo.instituicao!==anterior.instituicao || novo.tipo!==anterior.tipo || novo.codigo!==anterior.codigo))) invalido(caminho,'Reinforme este dado após mudar seu tipo ou instituição.')
    novo[campo] = anterior[campo]
  }
  return validarRecebimento(dados)
}
export function mascararRecebimento(d: DadosRecebimento | null): DadosRecebimento | null {
  if (!d) return null
  const copia = structuredClone(d)
  for (const caminho of CAMPOS_PROTEGIDOS) {
    const [g,c] = caminho.split('.'); const grupo = objeto(objeto(copia)[g]); const v = grupo[c]
    if (typeof v === 'string' && v) grupo[c] = '••••'+v.slice(-2)
  }
  return copia
}
