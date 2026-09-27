import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Papel } from './hooks/usePapelNaClinica'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Pacientes from './pages/Pacientes'
import Cadastros from './pages/cadastros/Cadastros'
import FinanceiroModulo from './pages/FinanceiroModulo'
import Dashboard from './pages/Dashboard'
import Agenda, { type PacienteCriadoAgenda } from './pages/Agenda'
import Prontuario from './pages/Prontuario'
import SobreSistema from './pages/SobreSistema'
import { useTheme } from './theme/ThemeProvider'
import { useClinicaAtiva } from './hooks/useClinicaAtiva'
import { useClinicasDoUsuario } from './hooks/useClinicasDoUsuario'
import { usePapelNaClinica } from './hooks/usePapelNaClinica'
import AppShell from './components/shell/AppShell'
import PlaceholderScreen from './components/shell/PlaceholderScreen'
import { TITULOS_TELA, type Tela } from './components/shell/types'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [escolhaAcesso, setEscolhaAcesso] = useState<{ clinicaId: string; papel: Papel; lembrar: boolean } | null>(null)
  const [escolhaAplicada, setEscolhaAplicada] = useState(false)
  const [acessoValidado, setAcessoValidado] = useState(false)
  const [erroAcesso, setErroAcesso] = useState<string | null>(null)
  const [tela, setTela] = useState<Tela>('dashboard')
  // Atendimento criado a partir da Agenda ("Iniciar atendimento"): navega
  // para o Prontuário, que sempre o abre pela RPC auditada de leitura.
  const [atendimentoParaAbrir, setAtendimentoParaAbrir] = useState<string | null>(null)
  const [cadastroPacienteAgendaAberto, setCadastroPacienteAgendaAberto] = useState(false)
  const [pacienteCriadoAgenda, setPacienteCriadoAgenda] = useState<PacienteCriadoAgenda | null>(null)
  const { aplicarCoresClinica } = useTheme()
  const { clinicas: clinicasDoUsuario, carregando: carregandoClinicas } = useClinicasDoUsuario(!!session)
  const {
    clinicaAtiva,
    clinicaAtivaId,
    selecionarClinica,
    carregando: carregandoClinica,
  } = useClinicaAtiva(clinicasDoUsuario, carregandoClinicas)
  const { papel, carregando: carregandoPapel } = usePapelNaClinica(session?.user.id ?? '', clinicaAtivaId)

  useEffect(() => {
    if (!escolhaAcesso || !session || carregandoClinicas) return
    if (!clinicasDoUsuario.some(clinica => clinica.id === escolhaAcesso.clinicaId)) {
      setErroAcesso('Não foi possível confirmar o vínculo com a unidade selecionada. Entre em contato com a administração.')
      setEscolhaAcesso(null)
      void supabase.auth.signOut()
      return
    }
    if (!escolhaAplicada) {
      selecionarClinica(escolhaAcesso.clinicaId, escolhaAcesso.lembrar)
      setEscolhaAplicada(true)
      return
    }
    if (clinicaAtivaId !== escolhaAcesso.clinicaId) return
    if (carregandoPapel) return
    if (papel !== escolhaAcesso.papel) {
      setErroAcesso('O perfil escolhido não está autorizado para esta unidade. Entre em contato com a administração.')
      setEscolhaAcesso(null)
      void supabase.auth.signOut()
      return
    }
    setTela('dashboard')
    setEscolhaAcesso(null)
    setAcessoValidado(true)
    setErroAcesso(null)
  }, [escolhaAcesso, escolhaAplicada, session, carregandoClinicas, clinicasDoUsuario, clinicaAtivaId, selecionarClinica, carregandoPapel, papel])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setAcessoValidado(false)
        setEscolhaAcesso(null)
        setEscolhaAplicada(false)
      }
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

  useEffect(() => {
    setCadastroPacienteAgendaAberto(false)
    setPacienteCriadoAgenda(null)
  }, [clinicaAtivaId])

  useEffect(() => {
    if (tela !== 'agenda') setCadastroPacienteAgendaAberto(false)
  }, [tela])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setTela('dashboard')
    setEscolhaAcesso(null)
    setEscolhaAplicada(false)
    setAcessoValidado(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--fundo-pagina)]">
        <p className="text-sm text-[var(--texto-secundario)]">Carregando...</p>
      </div>
    )
  }

  if (!session || !acessoValidado) {
    return <Login authenticatedUserId={session?.user.id} onBeginAuth={() => setErroAcesso(null)} onAccessGranted={escolha => { setEscolhaAplicada(false); setEscolhaAcesso(escolha) }} accessError={erroAcesso} />
  }

  return (
    <AppShell
      tela={tela}
      onNavegar={setTela}
      clinicaAtiva={clinicaAtiva}
      clinicasDoUsuario={clinicasDoUsuario}
      onSelecionarClinica={selecionarClinica}
      emailUsuario={session.user.email ?? ''}
      papel={papel}
      onSair={handleSignOut}
    >
      {tela === 'dashboard' && <Dashboard clinicaAtivaId={clinicaAtivaId} />}
      {tela === 'agenda' && (
        <>
          <Agenda
            clinicaAtiva={clinicaAtiva}
            carregandoClinica={carregandoClinica}
            usuarioId={session.user.id}
            pacienteCriadoExternamente={pacienteCriadoAgenda}
            cadastroPacienteAberto={cadastroPacienteAgendaAberto}
            onNovoPaciente={() => setCadastroPacienteAgendaAberto(true)}
            onAtendimentoIniciado={(atendimentoId) => {
              setAtendimentoParaAbrir(atendimentoId)
              setTela('prontuario')
            }}
          />
          {cadastroPacienteAgendaAberto && (
            <Pacientes
              clinicaAtivaId={clinicaAtivaId}
              carregandoClinica={carregandoClinica}
              papel={papel}
              carregandoPapel={carregandoPapel}
              usuarioId={session.user.id}
              iniciarComCadastroAberto
              onCancelarCadastro={() => setCadastroPacienteAgendaAberto(false)}
              onPacienteCriado={(paciente) => {
                setPacienteCriadoAgenda({ ...paciente, revisao: Date.now() })
                setCadastroPacienteAgendaAberto(false)
              }}
            />
          )}
        </>
      )}
      {tela === 'pacientes' && (
        <Pacientes
          clinicaAtivaId={clinicaAtivaId}
          clinicaNome={clinicaAtiva?.nome}
          carregandoClinica={carregandoClinica}
          papel={papel}
          carregandoPapel={carregandoPapel}
          usuarioId={session.user.id}
          onIrParaAgenda={() => setTela('agenda')}
        />
      )}
      {tela === 'equipe' && (
        <Cadastros
          clinicaAtivaId={clinicaAtivaId}
          carregandoClinica={carregandoClinica}
          usuarioId={session.user.id}
        />
      )}
      {tela === 'prontuario' && (
        <Prontuario
          clinicaAtivaId={clinicaAtivaId}
          carregandoClinica={carregandoClinica}
          usuarioId={session.user.id}
          atendimentoParaAbrirId={atendimentoParaAbrir}
          onAtendimentoParaAbrirConsumido={() => setAtendimentoParaAbrir(null)}
        />
      )}
      {tela === 'financeiro' && (
        <FinanceiroModulo clinicaAtivaId={clinicaAtivaId} carregandoClinica={carregandoClinica}
          usuarioId={session.user.id} papel={papel} carregandoPapel={carregandoPapel} />
      )}
      {tela === 'sobre' && <SobreSistema clinicaAtiva={clinicaAtiva} />}
      {tela !== 'dashboard' &&
        tela !== 'agenda' &&
        tela !== 'pacientes' &&
        tela !== 'equipe' &&
        tela !== 'prontuario' &&
        tela !== 'financeiro' &&
        tela !== 'sobre' && <PlaceholderScreen titulo={TITULOS_TELA[tela]} />}
    </AppShell>
  )
}

export default App
