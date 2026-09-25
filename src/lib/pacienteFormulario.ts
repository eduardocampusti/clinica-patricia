import { apenasDigitos } from './cpf.ts'

const PARTICULAS = new Set(['de', 'da', 'do', 'dos', 'das', 'e'])
const SEPARADOR_PALAVRA = /([-’'])/u

export interface EnderecoPacienteFormulario {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

export interface EnderecoViaCep {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
}

type FetchCep = (input: string, init?: RequestInit) => Promise<Response>

export function normalizarEspacos(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ')
}

export function obterIniciaisPaciente(nome: string): string {
  const partes = normalizarEspacos(nome).split(' ').filter(Boolean)
  if (!partes.length) return ''

  const inicialPrimeiroNome = Array.from(partes[0])[0] ?? ''
  const inicialUltimoNome = partes.length > 1 ? Array.from(partes.at(-1) ?? '')[0] ?? '' : ''
  return `${inicialPrimeiroNome}${inicialUltimoNome}`.toLocaleUpperCase('pt-BR')
}

function capitalizar(parte: string): string {
  const caracteres = Array.from(parte.toLocaleLowerCase('pt-BR'))
  const primeiro = caracteres.shift()
  return primeiro ? primeiro.toLocaleUpperCase('pt-BR') + caracteres.join('') : ''
}

export function formatarTextoPortugues(valor: string): string {
  const limpo = normalizarEspacos(valor)
  if (!limpo) return ''

  return limpo.split(' ').map((palavra, indicePalavra) => {
    let primeiraParteTextual = true
    return palavra.split(SEPARADOR_PALAVRA).map((parte) => {
      if (!parte || SEPARADOR_PALAVRA.test(parte)) return parte
      const minuscula = parte.toLocaleLowerCase('pt-BR')
      const primeiraDoCampo = indicePalavra === 0 && primeiraParteTextual
      primeiraParteTextual = false
      return !primeiraDoCampo && PARTICULAS.has(minuscula) ? minuscula : capitalizar(parte)
    }).join('')
  }).join(' ')
}

export function formatarTelefoneBrasil(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 11)
  if (!digitos) return ''
  if (digitos.length <= 2) return `(${digitos}`

  const ddd = digitos.slice(0, 2)
  const numero = digitos.slice(2)
  if (numero.length <= 4) return `(${ddd}) ${numero}`

  const tamanhoPrefixo = digitos.length === 11 ? 5 : 4
  return `(${ddd}) ${numero.slice(0, tamanhoPrefixo)}-${numero.slice(tamanhoPrefixo)}`
}

export function formatarCep(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 8)
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos
}

export function comporEnderecoPaciente(endereco: EnderecoPacienteFormulario): string | null {
  const logradouro = normalizarEspacos(endereco.logradouro)
  const numero = normalizarEspacos(endereco.numero)
  const complemento = normalizarEspacos(endereco.complemento)
  const bairro = normalizarEspacos(endereco.bairro)
  const cidade = normalizarEspacos(endereco.cidade)
  const uf = normalizarEspacos(endereco.uf).toLocaleUpperCase('pt-BR')
  const cep = formatarCep(endereco.cep)
  const partes: string[] = []

  if (logradouro && numero) partes.push(`${logradouro}, ${numero}`)
  else if (logradouro) partes.push(logradouro)
  else if (numero) partes.push(`Nº ${numero}`)

  if (complemento) partes.push(complemento)
  if (bairro) partes.push(bairro)
  if (cidade && uf) partes.push(`${cidade} - ${uf}`)
  else if (cidade || uf) partes.push(cidade || uf)
  if (cep) partes.push(`CEP ${cep}`)

  return partes.length ? partes.join(', ') : null
}

function lerTexto(objeto: Record<string, unknown>, campo: string): string {
  return typeof objeto[campo] === 'string' ? objeto[campo].trim() : ''
}

export async function consultarCep(
  valor: string,
  signal?: AbortSignal,
  fetchCep: FetchCep = fetch,
): Promise<EnderecoViaCep | null> {
  const cep = apenasDigitos(valor)
  if (cep.length !== 8) throw new Error('CEP inválido.')

  const resposta = await fetchCep(`https://viacep.com.br/ws/${cep}/json/`, { signal })
  if (!resposta.ok) throw new Error('Falha ao consultar o CEP.')

  const recebido: unknown = await resposta.json()
  if (!recebido || typeof recebido !== 'object') throw new Error('Resposta inválida do serviço de CEP.')
  const dados = recebido as Record<string, unknown>
  if (dados.erro === true) return null

  return {
    cep: formatarCep(lerTexto(dados, 'cep') || cep),
    logradouro: lerTexto(dados, 'logradouro'),
    bairro: lerTexto(dados, 'bairro'),
    cidade: lerTexto(dados, 'localidade'),
    uf: lerTexto(dados, 'uf').slice(0, 2).toLocaleUpperCase('pt-BR'),
  }
}
