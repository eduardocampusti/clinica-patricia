import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SessaoCaixa } from '../lib/api'

// Lê a sessão de caixa 'aberto' da clínica ativa (0 ou 1 linha). Leitura
// direta no Supabase — não é escrita nem cálculo, protegida pela mesma RLS
// de SELECT de sessoes_caixa.
export function useSessaoCaixaAberta(clinicaId: string | null) {
  const [sessao, setSessao] = useState<SessaoCaixa | null>(null)
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!clinicaId) {
      setSessao(null)
      setCarregando(false)
      return
    }

    setCarregando(true)
    const { data } = await supabase
      .from('sessoes_caixa')
      .select('id, clinica_id, aberto_por, valor_abertura, aberto_em, status')
      .eq('clinica_id', clinicaId)
      .eq('status', 'aberto')
      .maybeSingle()

    setSessao(data)
    setCarregando(false)
  }, [clinicaId])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { sessao, carregando, recarregar }
}
