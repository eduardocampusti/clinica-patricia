// Política de atualização dos painéis, isolada do React para ser verificável.
// Nunca autoriza consulta sobreposta: enquanto uma leitura está em andamento,
// timer, foco, visibilidade e botão são recusados em vez de formarem fila.

export type MotivoAtualizacao = 'periodico' | 'retomada' | 'manual'

export interface SituacaoAtualizacao {
  agora: number
  /** Instante em que a última leitura foi iniciada, não o relógio da tela. */
  ultimaTentativa: number
  carregando: boolean
  oculto: boolean
  intervaloMs: number
  vencimentoMs: number
}

/** Margem para o timer disparar sem depender de precisão exata do navegador. */
export const TOLERANCIA_TIMER_MS = 250

export function deveAtualizar(motivo: MotivoAtualizacao, s: SituacaoAtualizacao): boolean {
  if (s.carregando) return false
  if (motivo === 'manual') return true
  if (s.oculto) return false
  const decorrido = s.agora - s.ultimaTentativa
  return motivo === 'periodico'
    ? decorrido >= s.intervaloMs - TOLERANCIA_TIMER_MS
    : decorrido >= s.vencimentoMs
}
