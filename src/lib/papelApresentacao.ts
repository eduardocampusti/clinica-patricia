import type { Papel } from '../hooks/usePapelNaClinica'

const ROTULOS: Record<Papel, { nome: string; visao: string }> = {
  proprietaria: { nome: 'Proprietário(a)', visao: 'Visão de proprietário(a)' },
  recepcao: { nome: 'Recepção', visao: 'Visão da recepção' },
  medico: { nome: 'Médico', visao: 'Visão do profissional' },
}

export function rotuloPapel(papel: Papel | null): string {
  return papel ? ROTULOS[papel].nome : 'Usuário'
}

export function rotuloVisao(papel: Papel | null): string {
  return papel ? ROTULOS[papel].visao : 'Validando acesso'
}
