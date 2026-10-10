export function recoveryReturnUrl(origin: string, slug: 'brotas' | 'ipupiara') {
  const url = new URL(origin)
  const host = slug === 'brotas' ? 'clinicabrotas.com.br' : 'clinicaipupiara.com.br'
  const local = ['localhost', '127.0.0.1'].includes(url.hostname) && ['3000', '5173', '4182'].includes(url.port)
  if (!(url.protocol === 'https:' && url.hostname === host && !url.port) && !(url.protocol === 'http:' && local)) throw new Error('Destino não autorizado')
  return `${url.origin}/acesso/${slug}?recuperar=1`
}

export function passwordProblem(password: string, confirmation: string) {
  if (password.length < 8) return 'Use pelo menos 8 caracteres.'
  if (password !== confirmation) return 'As senhas não coincidem.'
  return null
}
