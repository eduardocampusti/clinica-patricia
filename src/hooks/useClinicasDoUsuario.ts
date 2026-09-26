import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ClinicaAtiva } from './useClinicaAtiva'

// Lista TODAS as clínicas vinculadas ao usuário logado (RLS: clinicas_do_usuario()).
// Fonte única de dados para o useClinicaAtiva (seleção) e para o dropdown da
// sidebar.
export function useClinicasDoUsuario(habilitado: boolean) {
  const [clinicas, setClinicas] = useState<ClinicaAtiva[]>([])
  const [carregando, setCarregando] = useState(true)
  const [versaoSessao, setVersaoSessao] = useState(0)

  useEffect(() => {
    if (!habilitado) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT' || evento === 'USER_UPDATED') {
        setVersaoSessao((versao) => versao + 1)
      }
    })
    return () => subscription.unsubscribe()
  }, [habilitado])

  useEffect(() => {
    if (!habilitado) {
      setClinicas([])
      // NÃO marca carregando=false aqui: "não habilitado" costuma ser um
      // estado transitório (ex.: sessão ainda sendo restaurada no mount),
      // não uma resposta definitiva de "usuário sem clínicas". Se marcasse,
      // useClinicaAtiva interpretaria isso como lista vazia confirmada e
      // zeraria prematuramente a seleção salva no localStorage antes da
      // sessão real carregar.
      return
    }

    let cancelado = false
    setCarregando(true)

    supabase
      .from('clinicas')
      .select('id, nome, cor_primaria, cor_secundaria, cor_menu')
      .order('nome', { ascending: true })
      .then(({ data }) => {
        if (cancelado) return
        setClinicas(data ?? [])
        setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [habilitado, versaoSessao])

  return { clinicas, carregando }
}
