import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Pacientes from './pages/Pacientes'
import Dashboard from './pages/Dashboard'
import { useTheme } from './theme/ThemeProvider'
import { useClinicaAtiva } from './hooks/useClinicaAtiva'
import { useClinicasDoUsuario } from './hooks/useClinicasDoUsuario'
import AppShell from './components/shell/AppShell'
import PlaceholderScreen from './components/shell/PlaceholderScreen'
import { TITULOS_TELA, type Tela } from './components/shell/types'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [tela, setTela] = useState<Tela>('dashboard')
  const { aplicarCoresClinica } = useTheme()
  const { clinicas: clinicasDoUsuario, carregando: carregandoClinicas } = useClinicasDoUsuario(!!session)
  const {
    clinicaAtiva,
    clinicaAtivaId,
    selecionarClinica,
    carregando: carregandoClinica,
  } = useClinicaAtiva(clinicasDoUsuario, carregandoClinicas)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!clinicaAtiva) return
    aplicarCoresClinica({
      cor_primaria: clinicaAtiva.cor_primaria,
      cor_secundaria: clinicaAtiva.cor_secundaria,
      cor_menu: clinicaAtiva.cor_menu,
    })
  }, [clinicaAtiva, aplicarCoresClinica])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setTela('dashboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--fundo-pagina)]">
        <p className="text-sm text-[var(--texto-secundario)]">Carregando...</p>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <AppShell
      tela={tela}
      onNavegar={setTela}
      clinicaAtiva={clinicaAtiva}
      clinicasDoUsuario={clinicasDoUsuario}
      onSelecionarClinica={selecionarClinica}
      emailUsuario={session.user.email ?? ''}
      onSair={handleSignOut}
    >
      {tela === 'dashboard' && <Dashboard />}
      {tela === 'pacientes' && (
        <Pacientes
          clinicaAtivaId={clinicaAtivaId}
          carregandoClinica={carregandoClinica}
          usuarioId={session.user.id}
        />
      )}
      {tela !== 'dashboard' && tela !== 'pacientes' && <PlaceholderScreen titulo={TITULOS_TELA[tela]} />}
    </AppShell>
  )
}

export default App
