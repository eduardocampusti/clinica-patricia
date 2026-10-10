import { useCallback, useEffect, useRef, useState } from 'react'
import { deveAtualizar, type MotivoAtualizacao } from '../lib/atualizacaoPainel'

export interface OpcoesAtualizacaoPainel {
  /** Clínica, papel e dia da leitura: mudar o contexto reinicia o ciclo. */
  contexto: string
  /** Verdadeiro enquanto qualquer consulta do painel estiver em andamento. */
  carregando: boolean
  intervaloMs?: number
  vencimentoMs?: number
  ativo?: boolean
}

/**
 * Agenda releituras periódicas enquanto a aba está visível e, ao retomar foco
 * ou visibilidade, somente quando a leitura anterior venceu. O contador devolvido
 * entra nas dependências do efeito de consulta do painel.
 */
export function useAtualizacaoPainel({ contexto, carregando, intervaloMs = 60000, vencimentoMs = 60000, ativo = true }: OpcoesAtualizacaoPainel) {
  const [revisao, setRevisao] = useState(0)
  const ultimaTentativa = useRef(Date.now())
  const carregandoRef = useRef(carregando)
  carregandoRef.current = carregando

  // Troca de clínica, papel ou dia: o efeito de consulta já refaz a leitura pelo
  // contexto; aqui apenas o prazo de vencimento volta a contar do zero.
  useEffect(() => { ultimaTentativa.current = Date.now() }, [contexto])

  const tentar = useCallback((motivo: MotivoAtualizacao) => {
    const permitido = deveAtualizar(motivo, {
      agora: Date.now(), ultimaTentativa: ultimaTentativa.current,
      carregando: carregandoRef.current, oculto: document.hidden, intervaloMs, vencimentoMs,
    })
    if (!permitido) return
    ultimaTentativa.current = Date.now()
    setRevisao(r => r + 1)
  }, [intervaloMs, vencimentoMs])

  useEffect(() => {
    if (!ativo) return
    let timer = 0
    const parar = () => { if (timer) { window.clearInterval(timer); timer = 0 } }
    const iniciar = () => { if (!timer && !document.hidden) timer = window.setInterval(() => tentar('periodico'), intervaloMs) }
    const retomar = () => {
      if (document.hidden) { parar(); return }
      iniciar()
      tentar('retomada')
    }
    iniciar()
    document.addEventListener('visibilitychange', retomar)
    window.addEventListener('focus', retomar)
    return () => { parar(); document.removeEventListener('visibilitychange', retomar); window.removeEventListener('focus', retomar) }
  }, [ativo, intervaloMs, tentar])

  const atualizar = useCallback(() => tentar('manual'), [tentar])
  return { revisao, atualizar }
}
