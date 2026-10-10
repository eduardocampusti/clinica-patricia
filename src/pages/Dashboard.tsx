import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { iniciais } from '../lib/texto'
import { FeedbackAlert } from '../components/feedback/FeedbackAlert'
import type { Papel } from '../hooks/usePapelNaClinica'
import PainelRecepcao, { type AcoesPainelRecepcao } from '../components/dashboard/PainelRecepcao'
import CabecalhoDashboard from '../components/dashboard/CabecalhoDashboard'
import { hojeNaBahia } from '../lib/pacienteLista'
import { horaNaBahia } from '../lib/dashboardRecepcao'
import PainelProprietaria from '../components/dashboard/PainelProprietaria'
import AnalisePeriodoBoundary from '../components/dashboard/AnalisePeriodoBoundary'

const AnalisePeriodo = lazy(() => import('../components/dashboard/AnalisePeriodo'))

interface ProximoPaciente {
  nome: string
  horario: string
}

interface DashboardProps {
  usuarioId?: string
  clinicaAtivaId: string | null
  clinicaNome: string
  nomeUsuario: string | null
}

function DashboardBasico({ clinicaAtivaId, clinicaNome, nomeUsuario }: DashboardProps) {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setAgora(new Date()), 30000); return () => window.clearInterval(timer) }, [])
  const data = hojeNaBahia(agora), hora = horaNaBahia(agora)
  const [proximoPaciente, setProximoPaciente] = useState<ProximoPaciente | null>(null)
  const [carregandoProximo, setCarregandoProximo] = useState(true)
  const [erroProximo, setErroProximo] = useState(false)

  useEffect(() => {
    if (!clinicaAtivaId) {
      setProximoPaciente(null)
      setCarregandoProximo(false)
      setErroProximo(false)
      return
    }

    let cancelado = false
    setCarregandoProximo(true)
    setErroProximo(false)
    const segundo = String(new Date().getUTCSeconds()).padStart(2, '0')

    Promise.resolve(supabase
      .from('agendamentos')
      .select('hora_inicio, pacientes(nome_completo)')
      .eq('clinica_id', clinicaAtivaId)
      .eq('data', data)
      .in('status', ['agendado', 'confirmado'])
      .gte('hora_inicio', `${hora}:${segundo}`)
      .order('hora_inicio', { ascending: true })
      .limit(1))
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) {
          setErroProximo(true)
          setProximoPaciente(null)
        } else {
          type Linha = { hora_inicio: string; pacientes: { nome_completo: string } | { nome_completo: string }[] | null }
          const linha = (data as Linha[] | null)?.[0]
          const paciente = Array.isArray(linha?.pacientes) ? linha.pacientes[0] : linha?.pacientes
          setProximoPaciente(linha ? { nome: paciente?.nome_completo ?? '—', horario: linha.hora_inicio.slice(0, 5) } : null)
        }
        setCarregandoProximo(false)
      })
      .catch(() => {
        if (cancelado) return
        setErroProximo(true)
        setProximoPaciente(null)
        setCarregandoProximo(false)
      })

    return () => { cancelado = true }
  }, [clinicaAtivaId, data, hora])

  return <div className="flex flex-col gap-6">
    <header><CabecalhoDashboard nome={nomeUsuario} clinicaNome={clinicaNome} agora={agora} /></header>
    <section aria-labelledby="proximo-atendimento-titulo" className="rounded-[18px] border border-[var(--borda)] bg-[var(--fundo-card)] px-5 py-4 shadow-[var(--sombra-neutra)]">
      <h2 id="proximo-atendimento-titulo" className="mb-3 text-sm font-semibold text-[var(--texto-principal)]">Próximo atendimento</h2>
      {carregandoProximo ? <p role="status" className="text-sm text-[var(--texto-secundario)]">Carregando próximo paciente…</p>
        : erroProximo ? <FeedbackAlert variant="warning" title="Próximo paciente indisponível" description="Não foi possível consultar o próximo paciente." />
          : proximoPaciente ? <div className="flex items-center gap-3.5">
            <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-[var(--cor-primaria-suave)] text-sm font-semibold text-[var(--cor-primaria)]">
              {iniciais(proximoPaciente.nome)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-[var(--texto-secundario)]">Próximo paciente</div>
              <div className="truncate text-sm font-semibold text-[var(--texto-principal)]">{proximoPaciente.nome}</div>
            </div>
            <div className="numero-tabular flex-none text-sm font-medium text-[var(--texto-principal)]">{proximoPaciente.horario}</div>
          </div> : <p className="text-sm text-[var(--texto-secundario)]">Nenhum agendamento restante hoje.</p>}
    </section>
  </div>
}

export default function Dashboard(props: DashboardProps & AcoesPainelRecepcao & {
  papel: Papel | null
}) {
  return props.papel === 'recepcao' && props.clinicaAtivaId
    ? <PainelRecepcao key={props.clinicaAtivaId} clinicaId={props.clinicaAtivaId} {...props}/>
    : props.papel === 'proprietaria' && props.clinicaAtivaId
      ? <div className="dashboard-proprietaria"><PainelProprietaria key={props.clinicaAtivaId} clinicaId={props.clinicaAtivaId} {...props}/>{props.usuarioId && <AnalisePeriodoBoundary key={`${props.usuarioId}:${props.clinicaAtivaId}`}><Suspense fallback={<p role="status">Carregando análise do período…</p>}><AnalisePeriodo key={`${props.usuarioId}:${props.clinicaAtivaId}`} usuarioId={props.usuarioId} clinicaAtivaId={props.clinicaAtivaId} /></Suspense></AnalisePeriodoBoundary>}</div>
    : <DashboardBasico key={props.clinicaAtivaId} {...props}/>
}
