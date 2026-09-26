import notas from './notasEvolucao.json'

export interface CategoriasNotas {
  novidades: readonly string[]
  melhorias: readonly string[]
  correcoes: readonly string[]
}

export interface VersaoLancada {
  versao: string
  lancadaEm?: string
  resumo: string
  notas: CategoriasNotas
}

// Incorporadas pelo Vite ao bundle; não são obtidas do GitHub em tempo de execução.
export const NOTAS_NAO_LANCADAS: CategoriasNotas = notas.naoLancadas
export const VERSAO_EM_DESENVOLVIMENTO: string = notas.versaoEmDesenvolvimento
export const VERSOES_LANCADAS: readonly VersaoLancada[] = notas.versoesLancadas
