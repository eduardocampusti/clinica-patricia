import { useCallback, useEffect, useRef, useState } from 'react'
import { mapearErroFinanceiro } from '../lib/financeiro/financeiro.errors'
import type { EstadoCarregamento } from '../lib/financeiro/financeiro.types'
import { assinarInvalidacaoFinanceira, type LeituraFinanceira } from '../lib/financeiro/financeiro.cache'

const nuncaVazio = () => false

export function useFinanceiroConsulta<T>(
  chave: string | null,
  carregar: () => Promise<T>,
  estaVazio: (dados: T) => boolean = nuncaVazio,
  invalidacao?: { clinicaId: string; leitura: LeituraFinanceira },
) {
  const [resultado, setResultado] = useState<EstadoCarregamento<T>>({ estado: 'ocioso' })
  const requisicaoAtual = useRef(0)

  const recarregar = useCallback(async () => {
    if (!chave) {
      requisicaoAtual.current += 1
      setResultado({ estado: 'ocioso' })
      return
    }
    const requisicao = ++requisicaoAtual.current
    setResultado((anterior) => ({
      estado: 'carregando',
      dadosAnteriores: anterior.estado === 'sucesso'
        ? anterior.dados
        : anterior.estado === 'carregando' || anterior.estado === 'erro'
          ? anterior.dadosAnteriores
          : undefined,
    }))
    try {
      const dados = await carregar()
      if (requisicao !== requisicaoAtual.current) return
      setResultado({ estado: 'sucesso', dados, vazio: estaVazio(dados) })
    } catch (erro) {
      if (requisicao !== requisicaoAtual.current) return
      setResultado((anterior) => ({
        estado: 'erro',
        erro: mapearErroFinanceiro(erro),
        dadosAnteriores: anterior.estado === 'carregando' ? anterior.dadosAnteriores : undefined,
      }))
    }
  }, [carregar, chave, estaVazio])

  useEffect(() => {
    void recarregar()
    return () => { requisicaoAtual.current += 1 }
  }, [recarregar])

  const clinicaId = invalidacao?.clinicaId
  const leitura = invalidacao?.leitura
  useEffect(() => assinarInvalidacaoFinanceira((evento) => {
    if (evento.clinicaId === clinicaId && leitura && evento.leituras.includes(leitura)) void recarregar()
  }), [clinicaId, leitura, recarregar])

  return { resultado, recarregar }
}
