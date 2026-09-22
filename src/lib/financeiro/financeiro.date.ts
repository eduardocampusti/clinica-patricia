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
