type Unidade = 'brotas' | 'ipupiara'
const dominios = { brotas: 'clinicabrotas.com.br', ipupiara: 'clinicaipupiara.com.br' }

// Unidade deriva do convite persistido/autorizado, nunca da origem HTTP.
export function redirectUnidade(unidade: Unidade, baseLocal: string, basePublica?: string): string {
  const url = new URL(basePublica || baseLocal)
  const local = ['127.0.0.1', 'localhost'].includes(url.hostname)
  if (url.username || url.password || url.search || url.hash) throw new Error('Base de retorno inválida.')
  if (local) {
    if (!['http:', 'https:'].includes(url.protocol) || !['3000', '5173'].includes(url.port)) throw new Error('Retorno local inválido.')
  } else if (url.protocol !== 'https:' || url.hostname !== dominios[unidade]) {
    throw new Error('O domínio de retorno não corresponde à unidade do convite.')
  }
  url.pathname = `/acesso/${unidade}`
  return url.toString()
}
