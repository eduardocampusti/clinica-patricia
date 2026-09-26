import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { iniciais } from '../lib/texto'

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

function Dashboard({ clinicaAtivaId }: DashboardProps) {
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
    <section className="rounded-[18px] bg-[var(--fundo-card)] px-5 py-4 shadow-[var(--sombra-neutra)]">
      {carregandoProximo ? <p role="status" className="text-sm text-[var(--texto-secundario)]">Carregando próximo paciente…</p>
        : erroProximo ? <p role="alert" className="text-sm text-[var(--cor-erro)]">Não foi possível consultar o próximo paciente.</p>
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

export default Dashboard
