export type ValorCanonico = null | boolean | number | string | ValorCanonico[] | { [chave: string]: ValorCanonico }

function validarNumero(valor: number): number {
  if (!Number.isFinite(valor)) throw new TypeError('A canonicalização não aceita NaN ou Infinity.')
  return Object.is(valor, -0) ? 0 : valor
}

export function canonicalizar(valor: ValorCanonico): string {
  if (valor === null || typeof valor === 'boolean' || typeof valor === 'string') return JSON.stringify(valor)
  if (typeof valor === 'number') return JSON.stringify(validarNumero(valor))
  if (Array.isArray(valor)) return `[${valor.map(canonicalizar).join(',')}]`

  const pares = Object.keys(valor)
    .sort()
    .map((chave) => `${JSON.stringify(chave)}:${canonicalizar(valor[chave]!)}`)
  return `{${pares.join(',')}}`
}

export function ehValorCanonico(valor: unknown): valor is ValorCanonico {
  if (valor === null || typeof valor === 'boolean' || typeof valor === 'string') return true
  if (typeof valor === 'number') return Number.isFinite(valor)
  if (Array.isArray(valor)) return valor.every(ehValorCanonico)
  if (typeof valor !== 'object') return false
  return Object.values(valor as Record<string, unknown>).every(ehValorCanonico)
}
