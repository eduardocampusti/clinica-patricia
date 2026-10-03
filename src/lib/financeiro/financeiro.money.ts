import type { DecimalBanco, PagamentoCentavos } from './financeiro.types'

const MOEDA_BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function separarDecimal(valor: string): { negativo: boolean; inteiro: string; decimal: string } {
  const normalizado = valor.trim().replace(/^R\$\s?/, '').replaceAll('\u00a0', '').replaceAll(' ', '')
  const negativo = normalizado.startsWith('-')
  const absoluto = negativo ? normalizado.slice(1) : normalizado
  const formatoBrasileiro = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(absoluto)
  const formatoBanco = /^\d+(?:\.\d{1,2})?$/.test(absoluto)
  if (!formatoBrasileiro && !formatoBanco) throw new Error('Valor monetário inválido.')

  const separador = absoluto.includes(',') ? ',' : absoluto.includes('.') && !formatoBrasileiro ? '.' : null
  const semMilhar = formatoBrasileiro ? absoluto.replaceAll('.', '') : absoluto
  const [inteiro, decimal = ''] = separador ? semMilhar.split(separador) : [semMilhar, '']
  return { negativo, inteiro, decimal }
}

export function textoMonetarioParaCentavos(valor: string, permitirNegativo = false): bigint {
  const partes = separarDecimal(valor)
  if (partes.negativo && !permitirNegativo) throw new Error('Valor monetário não pode ser negativo.')
  const centavos = BigInt(partes.inteiro) * 100n + BigInt(partes.decimal.padEnd(2, '0'))
  return partes.negativo ? -centavos : centavos
}

export function decimalBancoParaCentavos(valor: DecimalBanco): bigint {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) throw new Error('Valor monetário retornado pelo banco é inválido.')
    return textoMonetarioParaCentavos(String(valor), true)
  }
  return textoMonetarioParaCentavos(valor, true)
}

export function centavosParaDecimal(valor: bigint): string {
  const negativo = valor < 0n
  const absoluto = negativo ? -valor : valor
  const inteiro = absoluto / 100n
  const decimal = String(absoluto % 100n).padStart(2, '0')
  return `${negativo ? '-' : ''}${inteiro}.${decimal}`
}

export function centavosParaNumeroRpc(valor: bigint): number {
  const limite = BigInt(Number.MAX_SAFE_INTEGER)
  if (valor > limite || valor < -limite) throw new Error('Valor monetário fora do intervalo seguro para envio.')
  return Number(valor) / 100
}

export function formatarCentavos(valor: bigint): string {
  return MOEDA_BRL.format(centavosParaNumeroRpc(valor))
}

export function somarPagamentosCentavos(pagamentos: readonly PagamentoCentavos[]): bigint {
  return pagamentos.reduce((total, pagamento) => total + pagamento.valorCentavos, 0n)
}

export function pagamentosFechamValor(
  pagamentos: readonly PagamentoCentavos[],
  valorEsperadoCentavos: bigint,
): boolean {
  return somarPagamentosCentavos(pagamentos) === valorEsperadoCentavos
}
