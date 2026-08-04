import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { EntradaCaixa } from '../lib/api'

// Lê as entradas da sessão de caixa atual, mais recente primeiro. Leitura
// direta no Supabase — não é escrita, protegida pela mesma RLS de SELECT
// de entradas_caixa.
export function useEntradasCaixa(sessaoCaixaId: string | null) {
  const [entradas, setEntradas] = useState<EntradaCaixa[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!sessaoCaixaId) {
      setEntradas([])
      setCarregando(false)
      return
    }

    setCarregando(true)
    const { data } = await supabase
      .from('entradas_caixa')
      .select('id, sessao_caixa_id, clinica_id, forma_pagamento, valor, descricao, registrado_por, registrado_em')
      .eq('sessao_caixa_id', sessaoCaixaId)
      .order('registrado_em', { ascending: false })

    setEntradas(data ?? [])
    setCarregando(false)
  }, [sessaoCaixaId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { entradas, carregando, recarregar }
}
