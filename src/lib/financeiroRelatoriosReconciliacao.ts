function objeto(valor: unknown, campo: string): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new Error(`Objeto inválido em ${campo}.`)
  }
  return valor as Record<string, unknown>
}

function inteiro(valor: unknown, campo: string): bigint {
  if (typeof valor === 'number' && Number.isSafeInteger(valor)) return BigInt(valor)
  if (typeof valor === 'string' && /^-?\d+$/.test(valor)) return BigInt(valor)
  throw new Error(`Valor inteiro inválido em ${campo}.`)
}

function centavos(valor: unknown, campo: string): bigint {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor) || !Number.isSafeInteger(Math.round(valor * 100))) {
      throw new Error(`Valor monetário inválido em ${campo}.`)
    }
    return BigInt(Math.round(valor * 100))
  }
  if (typeof valor !== 'string' || !/^-?\d+(\.\d{1,2})?$/.test(valor)) {
    throw new Error(`Valor monetário inválido em ${campo}.`)
  }
  const negativo = valor.startsWith('-')
  const [parteInteira, parteDecimal = ''] = valor.replace('-', '').split('.')
  const resultado = BigInt(parteInteira) * 100n + BigInt(parteDecimal.padEnd(2, '0'))
  return negativo ? -resultado : resultado
}

function somarCentavos(itens: Array<Record<string, unknown>>, campo: string): bigint {
  return itens.reduce((soma, item) => soma + centavos(item[campo], campo), 0n)
}

function exigirIgual(atual: bigint, esperado: bigint, campo: string): void {
  if (atual !== esperado) {
    throw new Error(`Reconciliação do relatório falhou em ${campo}. A exportação foi cancelada.`)
  }
}

export function reconciliarRelatorioDetalhado(
  dataset: string,
  itens: Array<Record<string, unknown>>,
  totais: Record<string, unknown>,
): void {
  exigirIgual(BigInt(itens.length), inteiro(totais.quantidade, 'quantidade'), 'quantidade')

  if (dataset === 'recebimentos') {
    for (const campo of [
      'valor_bruto',
      'valor_clinica',
      'valor_profissional',
      'valor_estornado',
      'valor_clinica_liquida',
      'valor_profissional_liquido',
      'valor_liquido_atual',
      'dinheiro',
      'pix',
      'cartao_credito',
    ]) {
      const totalCampo = ({
        valor_bruto: 'bruto',
        valor_clinica: 'clinica_bruta',
        valor_profissional: 'profissional_bruta',
        valor_estornado: 'estornado',
        valor_clinica_liquida: 'clinica_liquida',
        valor_profissional_liquido: 'profissional_liquida',
        valor_liquido_atual: 'liquido_atual',
      } as Record<string, string>)[campo] ?? campo
      exigirIgual(somarCentavos(itens, campo), centavos(totais[totalCampo], totalCampo), totalCampo)
    }
    return
  }

  if (dataset === 'repasses') {
    for (const campo of [
      'valor_bruto_profissional',
      'valor_estornos_antes_pagamento',
      'valor_ajustes_aplicados',
      'valor_liquido',
    ]) {
      exigirIgual(somarCentavos(itens, campo), centavos(totais[campo], campo), campo)
    }
    return
  }

  if (dataset === 'fiscal') {
    exigirIgual(somarCentavos(itens, 'valor_bruto'), centavos(totais.valor_bruto, 'valor_bruto'), 'valor_bruto')
    const porStatus = objeto(totais.por_status, 'por_status')
    const contagens = new Map<string, bigint>()
    for (const item of itens) {
      const status = item.status_fiscal
      if (typeof status !== 'string') throw new Error('Status fiscal inválido na reconciliação.')
      contagens.set(status, (contagens.get(status) ?? 0n) + 1n)
    }
    for (const [status, quantidade] of Object.entries(porStatus)) {
      exigirIgual(contagens.get(status) ?? 0n, inteiro(quantidade, `por_status.${status}`), `por_status.${status}`)
    }
  }
}
