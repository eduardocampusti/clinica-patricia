import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { iniciais } from '../lib/texto'
import { FeedbackAlert } from '../components/feedback/FeedbackAlert'
import type { Papel } from '../hooks/usePapelNaClinica'
import PainelRecepcao, { type AcoesPainelRecepcao } from '../components/dashboard/PainelRecepcao'
import type { ClinicBrandSlug } from '../config/clinicBrands'
import { caminhoInterno } from '../lib/routePaths'

function paraISODate(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function agoraHHMMSS(): string {
  const agora = new Date()
  return `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:${String(agora.getSeconds()).padStart(2, '0')}`
}

interface ProximoPaciente {
  nome: string
  horario: string
}

interface DashboardProps {
  clinicaAtivaId: string | null
}

function DashboardBasico({ clinicaAtivaId, administracao }: DashboardProps & { administracao?: ReactNode }) {
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

    supabase
      .from('agendamentos')
      .select('hora_inicio, pacientes(nome_completo)')
      .eq('clinica_id', clinicaAtivaId)
      .eq('data', paraISODate(new Date()))
      .in('status', ['agendado', 'confirmado'])
      .gte('hora_inicio', agoraHHMMSS())
      .order('hora_inicio', { ascending: true })
      .limit(1)
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

    return () => { cancelado = true }
  }, [clinicaAtivaId])

  const hoje = new Date()
  const dataFormatadaBruta = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
  const dataFormatada = dataFormatadaBruta.charAt(0).toUpperCase() + dataFormatadaBruta.slice(1)

  return <div className="flex flex-col gap-6">
    <header>
      <h1 className="texto-titulo-tela text-[var(--texto-principal)]">Olá!</h1>
      <p className="mt-1.5 text-sm text-[var(--texto-secundario)]">{dataFormatada} · Painel do dia</p>
    </header>
    {administracao}
    <section className="rounded-[18px] bg-[var(--fundo-card)] px-5 py-4 shadow-[var(--sombra-neutra)]">
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
    <section className="rounded-[18px] border border-[var(--borda)] bg-[var(--fundo-card)] p-5">
      <h2 className="texto-titulo-secao">Indicadores financeiros</h2>
      <p className="mt-2 text-sm text-[var(--texto-secundario)]">Consulte o módulo Financeiro para ver valores oficiais conforme suas permissões. Este painel inicial não exibe saldos nem repasses estimados.</p>
    </section>
  </div>
}

export default function Dashboard(props: DashboardProps & AcoesPainelRecepcao & {
  papel: Papel | null; clinicaNome: string; unidade?: ClinicBrandSlug; onCadastros?: () => void
}) {
  const administracao = props.papel === 'proprietaria' && props.clinicaAtivaId && props.unidade
    ? <section aria-labelledby="administracao-titulo" className="rounded-[18px] border border-[var(--borda)] bg-[var(--fundo-card)] p-5">
      <h2 id="administracao-titulo" className="texto-titulo-secao">Administração da clínica</h2>
      <p className="mt-2 text-sm text-[var(--texto-secundario)]">Cadastros e gestão de {props.clinicaNome}.</p>
      <p className="mt-2 text-sm text-[var(--texto-secundario)]">Equipe e acessos, especialidades, profissionais, horários e serviços ficam no menu Equipe. Os valores oficiais ficam no Financeiro.</p>
      <nav aria-label="Acessos administrativos" className="mt-4 flex flex-wrap gap-3">
        {([
          ['equipe', 'Abrir cadastros', props.onCadastros],
          ['financeiro', 'Abrir Financeiro', props.onFinanceiro],
        ] as const).map(([tela, titulo, navegar]) => <a key={tela} href={caminhoInterno(props.unidade!, tela)}
          onClick={evento => {
            if (!navegar || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey || evento.button !== 0) return
            evento.preventDefault(); navegar()
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--borda)] px-4 py-2 text-sm font-semibold text-[var(--cor-primaria)] hover:bg-[var(--cor-primaria-suave)] focus-visible:outline-2 focus-visible:outline-[var(--cor-primaria)]">{titulo}</a>)}
      </nav>
    </section>
    : undefined
  return props.papel === 'recepcao' && props.clinicaAtivaId
    ? <PainelRecepcao key={props.clinicaAtivaId} clinicaId={props.clinicaAtivaId} {...props}/>
    : <DashboardBasico clinicaAtivaId={props.clinicaAtivaId} administracao={administracao}/>
}
