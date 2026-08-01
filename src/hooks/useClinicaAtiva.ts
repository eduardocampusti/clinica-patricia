import { useCallback, useEffect, useState } from 'react'

export interface ClinicaAtiva {
  id: string
  nome: string
  cor_primaria: string
  cor_secundaria: string
  cor_menu: string
}

const CHAVE_STORAGE = 'clinica-patricia:clinica-ativa-id'

function obterIdSalvo(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(CHAVE_STORAGE)
}

// Administra QUAL das clínicas do usuário está ativa. Recebe a lista já
// carregada por useClinicasDoUsuario (o RLS já limitou essa lista às
// clínicas vinculadas ao usuário) — nunca busca no banco por conta própria.
// Persiste a escolha em localStorage e SEMPRE valida o id salvo contra a
// lista recebida antes de aceitá-lo (ex.: outro usuário logou no mesmo
// navegador, ou o id salvo não existe mais na lista) — se não for válido,
// cai para a primeira clínica da lista.
export function useClinicaAtiva(clinicas: ClinicaAtiva[], carregandoLista: boolean) {
  const [clinicaAtivaId, setClinicaAtivaId] = useState<string | null>(obterIdSalvo)

  useEffect(() => {
    if (carregandoLista) return

    if (clinicas.length === 0) {
      setClinicaAtivaId(null)
      return
    }

    const aindaValida = clinicas.some((c) => c.id === clinicaAtivaId)
    if (!aindaValida) {
      setClinicaAtivaId(clinicas[0].id)
    }
  }, [clinicas, carregandoLista, clinicaAtivaId])

  const selecionarClinica = useCallback(
    (id: string) => {
      // Só aceita um id que já esteja na lista recebida (RLS-limitada) —
      // nunca um id arbitrário.
      if (!clinicas.some((c) => c.id === id)) return
      setClinicaAtivaId(id)
      window.localStorage.setItem(CHAVE_STORAGE, id)
    },
    [clinicas],
  )

  const clinicaAtiva = clinicas.find((c) => c.id === clinicaAtivaId) ?? null

  return { clinicaAtiva, clinicaAtivaId, selecionarClinica, carregando: carregandoLista }
}
