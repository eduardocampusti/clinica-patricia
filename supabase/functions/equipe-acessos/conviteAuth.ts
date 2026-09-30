export const ORIGENS_LOCAIS_PERMITIDAS = new Set([
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
])

export const ORIGENS_PUBLICAS_PERMITIDAS = new Set([
  'https://clinicabrotas.com.br',
  'https://clinicaipupiara.com.br',
  'https://www.clinicabrotas.com.br',
  'https://www.clinicaipupiara.com.br',
])

export type ContaConvite = {
  id: string
  email: string
  confirmado: boolean
}

export type OrigemContaConvite = 'vinculada' | 'recuperada' | 'criada'

export type DependenciasContaConvite = {
  buscarPorId: (id: string) => Promise<ContaConvite | null>
  localizarPorEmailExato: (email: string) => Promise<ContaConvite | null>
  criarConvite: (email: string) => Promise<ContaConvite>
  registrarNoConvite: (conta: ContaConvite) => Promise<void>
}

export class ErroContaConvite extends Error {
  constructor(public readonly codigo: 'CONTA_NAO_ENCONTRADA' | 'CONTA_AUTH_INDISPONIVEL' | 'CONTA_AUTH_DIVERGENTE') {
    super(codigo)
  }
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function garantirContaDoConvite(
  entrada: { email: string; authUserId?: string | null; permitirCriar: boolean },
  deps: DependenciasContaConvite,
): Promise<{ conta: ContaConvite; origem: OrigemContaConvite }> {
  const emailEsperado = normalizarEmail(entrada.email)
  let conta: ContaConvite | null = null
  let origem: OrigemContaConvite = 'recuperada'

  if (entrada.authUserId) {
    conta = await deps.buscarPorId(entrada.authUserId)
    origem = 'vinculada'
    if (!conta) throw new ErroContaConvite('CONTA_AUTH_INDISPONIVEL')
  } else {
    // Esta busca interna por igualdade exata recupera a conta criada pelo Auth
    // quando a gravação seguinte falhou. Ela nunca é exposta ao navegador.
    conta = await deps.localizarPorEmailExato(emailEsperado)
    if (!conta) {
      if (!entrada.permitirCriar) throw new ErroContaConvite('CONTA_NAO_ENCONTRADA')
      conta = await deps.criarConvite(emailEsperado)
      origem = 'criada'
    }
  }

  if (normalizarEmail(conta.email) !== emailEsperado) throw new ErroContaConvite('CONTA_AUTH_DIVERGENTE')

  // Registra o ID retornado pelo Auth antes da finalização. Se esta etapa
  // falhar, a repetição localizará a mesma conta e não criará uma duplicata.
  await deps.registrarNoConvite(conta)
  return { conta, origem }
}
