import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Papel = 'proprietaria' | 'medico' | 'recepcao'

// Lê o papel do usuário logado NA clínica ativa (usuarios_clinicas.papel).
// RLS já limita a leitura a vínculos do próprio usuário (uc_self).
// Usado para decidir se a tela mostra os controles de escrita (só
// proprietária cadastra/edita especialidades, profissionais e serviços).
export function usePapelNaClinica(usuarioId: string, clinicaId: string | null) {
  const [papel, setPapel] = useState<Papel | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [clinicaConsultadaId, setClinicaConsultadaId] = useState<string | null>(null)
  const [usuarioConsultadoId, setUsuarioConsultadoId] = useState<string | null>(null)

  useEffect(() => {
    if (!clinicaId) {
      setPapel(null)
      setClinicaConsultadaId(null)
      setUsuarioConsultadoId(null)
      setCarregando(false)
      return
    }

    let cancelado = false
    setCarregando(true)
    setErro(false)

    supabase
      .from('usuarios_clinicas')
      .select('papel')
      .eq('usuario_id', usuarioId)
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelado) return
        setErro(!!error)
        setPapel((data?.papel as Papel) ?? null)
        setClinicaConsultadaId(clinicaId)
        setUsuarioConsultadoId(usuarioId)
        setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [usuarioId, clinicaId])

  const contextoAtual = clinicaConsultadaId === clinicaId && usuarioConsultadoId === usuarioId
  const papelAtual = contextoAtual ? papel : null
  return { papel: papelAtual, souProprietaria: papelAtual === 'proprietaria', erro: contextoAtual && erro, carregando: carregando || (!!clinicaId && !contextoAtual) }
}
