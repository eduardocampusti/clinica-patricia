import type { IntervaloFinanceiro } from './financeiro.types'

export const TIMEZONE_FINANCEIRO_PADRAO = 'America/Bahia'
const INSTANTE_COM_FUSO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/
const MAXIMO_INTERVALO_MS = 366 * 24 * 60 * 60 * 1000

function instante(valor: string, campo: string): number {
  if (!INSTANTE_COM_FUSO.test(valor)) throw new Error(`${campo} deve incluir timezone explícita.`)
  const timestamp = Date.parse(valor)
  if (!Number.isFinite(timestamp)) throw new Error(`${campo} é inválido.`)
  return timestamp
}

export function validarIntervaloFinanceiro(intervalo: IntervaloFinanceiro): IntervaloFinanceiro {
  const inicio = instante(intervalo.inicio, 'Início')
  const fim = instante(intervalo.fim, 'Fim')
  if (inicio >= fim) throw new Error('O início deve ser anterior ao fim.')
  if (fim - inicio > MAXIMO_INTERVALO_MS) throw new Error('O período financeiro não pode exceder 366 dias.')
  if (!intervalo.timezone.trim()) throw new Error('Timezone financeira obrigatória.')
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: intervalo.timezone }).format(new Date(inicio))
  } catch {
    throw new Error('Timezone financeira inválida.')
  }
  return intervalo
}

export function pertenceAoIntervalo(instanteIso: string, intervalo: IntervaloFinanceiro): boolean {
  const valor = instante(instanteIso, 'Instante')
  const inicio = instante(intervalo.inicio, 'Início')
  const fim = instante(intervalo.fim, 'Fim')
  return valor >= inicio && valor < fim
}

export function formatarDataFinanceira(
  valor: string | Date,
  timezone = TIMEZONE_FINANCEIRO_PADRAO,
): string {
  const data = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(data.getTime())) throw new Error('Data financeira inválida.')
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

function partesLocais(data: Date, timezone: string): number[] {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(data)
  const valor = (tipo: string) => Number(partes.find((parte) => parte.type === tipo)?.value)
  return [valor('year'), valor('month'), valor('day'), valor('hour'), valor('minute'), valor('second')]
}

export function inicioDiaFinanceiro(dia: string, timezone = TIMEZONE_FINANCEIRO_PADRAO): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error('Data financeira inválida.')
  const [ano, mes, data] = dia.split('-').map(Number)
  const alvo = Date.UTC(ano, mes - 1, data)
  if (new Date(alvo).toISOString().slice(0, 10) !== dia) throw new Error('Data financeira inválida.')
  let instante = alvo + 3 * 60 * 60 * 1000
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const [a, m, d, h, min, seg] = partesLocais(new Date(instante), timezone)
    const local = Date.UTC(a, m - 1, d, h, min, seg)
    const diferenca = local - alvo
    if (diferenca === 0) return new Date(instante).toISOString()
    instante -= diferenca
  }
  throw new Error('Não foi possível resolver o início do dia neste fuso horário.')
}

export function intervaloPorDias(inicio: string, ultimoDia: string, timezone = TIMEZONE_FINANCEIRO_PADRAO): IntervaloFinanceiro {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ultimoDia)) throw new Error('Data final inválida.')
  const [ano, mes, dia] = ultimoDia.split('-').map(Number)
  const proximo = new Date(Date.UTC(ano, mes - 1, dia + 1)).toISOString().slice(0, 10)
  return validarIntervaloFinanceiro({ inicio: inicioDiaFinanceiro(inicio, timezone), fim: inicioDiaFinanceiro(proximo, timezone), timezone })
}
