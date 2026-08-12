import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { iniciais } from '../lib/texto'
import type { ClinicaAtiva } from '../hooks/useClinicaAtiva'
import { usePapelNaClinica } from '../hooks/usePapelNaClinica'
import { FormRegistrarEntrada } from '../components/financeiro/FormRegistrarEntrada'

type StatusAgendamento = 'agendado' | 'confirmado' | 'aguardando' | 'em_atendimento' | 'concluido' | 'cancelado'
type TipoExcecao = 'folga' | 'horario_especial'

interface ProfissionalAgenda {
  id: string
  nome_completo: string
  especialidade_nome: string
  duracao_consulta_minutos: number
  valor_consulta: number | null
}

interface Disponibilidade {
  id: string
  profissional_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

interface Excecao {
  id: string
  profissional_id: string
  tipo: TipoExcecao
  hora_inicio: string | null
  hora_fim: string | null
  motivo: string | null
}

interface Agendamento {
  id: string
  profissional_id: string
  paciente_id: string
  paciente_nome: string
  hora_inicio: string
  hora_fim: string
  status: StatusAgendamento
  observacoes: string | null
}

interface PacienteOpcao {
  id: string
  nome_completo: string
}

interface EntradaListaEspera {
  id: string
  paciente_id: string
  paciente_nome: string
  profissional_id: string
  profissional_nome: string
  observacoes: string | null
  created_at: string
}

const STATUS_LABEL: Record<StatusAgendamento, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  aguardando: 'Aguardando',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const STATUS_ORDEM: StatusAgendamento[] = [
  'agendado',
  'confirmado',
  'aguardando',
  'em_atendimento',
  'concluido',
  'cancelado',
]

function estiloStatus(status: StatusAgendamento): { fundo: string; borda: string; texto: string } {
  if (status === 'agendado') {
    return { fundo: 'var(--fundo-card)', borda: 'var(--texto-terciario)', texto: 'var(--texto-principal)' }
  }
  const chave = status.replace(/_/g, '-')
  return {
    fundo: `var(--status-${chave}-fundo)`,
    borda: `var(--status-${chave}-borda)`,
    texto: `var(--status-${chave}-texto)`,
  }
}

function badgeStatus(status: StatusAgendamento): { fundo: string; texto: string } {
  if (status === 'agendado') {
    return { fundo: 'var(--fundo-pagina)', texto: 'var(--texto-secundario)' }
  }
  const chave = status.replace(/_/g, '-')
  return { fundo: `var(--status-${chave}-badge-fundo)`, texto: `var(--status-${chave}-badge-texto)` }
}

const GRID_INICIO_MIN = 7 * 60
const GRID_FIM_MIN = 19 * 60
const PX_POR_MINUTO = 2
const ALTURA_GRID = (GRID_FIM_MIN - GRID_INICIO_MIN) * PX_POR_MINUTO

function minutosDesdeMeiaNoite(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function formatarHoraCurta(hora: string): string {
  const [h, m] = hora.split(':')
  return `${h}:${m}`
}

function paraISODate(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function formatarDataExtenso(data: Date): string {
  const bruto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  return bruto.charAt(0).toUpperCase() + bruto.slice(1)
}

function adicionarDias(data: Date, dias: number): Date {
  const nova = new Date(data)
  nova.setDate(nova.getDate() + dias)
  return nova
}

interface Janela {
  inicioMin: number
  fimMin: number
}

// Segmentos "fora do expediente" dentro do grid (07:00–19:00), a partir das
// janelas de trabalho do profissional naquele dia (já resolvidas: exceção
// prevalece sobre disponibilidade_padrao).
function segmentosForaExpediente(janelas: Janela[]): Janela[] {
  const recortadas = janelas
    .map((j) => ({ inicioMin: Math.max(j.inicioMin, GRID_INICIO_MIN), fimMin: Math.min(j.fimMin, GRID_FIM_MIN) }))
    .filter((j) => j.fimMin > j.inicioMin)
    .sort((a, b) => a.inicioMin - b.inicioMin)

  const livres: Janela[] = []
  let cursor = GRID_INICIO_MIN
  for (const j of recortadas) {
    if (j.inicioMin > cursor) livres.push({ inicioMin: cursor, fimMin: j.inicioMin })
    cursor = Math.max(cursor, j.fimMin)
  }
  if (cursor < GRID_FIM_MIN) livres.push({ inicioMin: cursor, fimMin: GRID_FIM_MIN })
  return livres
}

interface AgendaProps {
  clinicaAtiva: ClinicaAtiva | null
  carregandoClinica: boolean
  usuarioId: string
  onAtendimentoIniciado: (atendimentoId: string) => void
}

function Agenda({ clinicaAtiva, carregandoClinica, usuarioId, onAtendimentoIniciado }: AgendaProps) {
  const clinicaAtivaId = clinicaAtiva?.id ?? null
  const { papel } = usePapelNaClinica(usuarioId, clinicaAtivaId)
  const podeEscrever = papel === 'proprietaria' || papel === 'recepcao'
  const souMedico = papel === 'medico'

  const [dataSelecionada, setDataSelecionada] = useState(() => new Date())
  const [buscaPaciente, setBuscaPaciente] = useState('')

  const [profissionais, setProfissionais] = useState<ProfissionalAgenda[]>([])
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([])
  const [excecoes, setExcecoes] = useState<Excecao[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientes, setPacientes] = useState<PacienteOpcao[]>([])
  const [listaEspera, setListaEspera] = useState<EntradaListaEspera[]>([])
  const [carregandoGrade, setCarregandoGrade] = useState(true)

  const [menuStatusId, setMenuStatusId] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState<'agendamento' | 'excecao' | 'espera' | 'entrada' | null>(null)
  const [prefillAgendamento, setPrefillAgendamento] = useState<{ pacienteId: string; profissionalId: string } | null>(
    null,
  )
  const [profissionalParaExcecao, setProfissionalParaExcecao] = useState<string | null>(null)
  const [prefillEntrada, setPrefillEntrada] = useState<{ pacienteId: string; profissionalId: string; agendamentoId: string } | null>(null)
  const [avisoSemCaixa, setAvisoSemCaixa] = useState<string | null>(null)

  const [meuProfissionalId, setMeuProfissionalId] = useState<string | null>(null)
  const [iniciandoAtendimentoId, setIniciandoAtendimentoId] = useState<string | null>(null)
  const [erroIniciarAtendimento, setErroIniciarAtendimento] = useState<string | null>(null)

  const carregarProfissionais = useCallback(async (clinicaId: string) => {
    const { data } = await supabase
      .from('profissionais_clinicas')
      .select('profissionais(id, nome_completo, duracao_consulta_minutos, valor_consulta, especialidades(nome))')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)

    type Linha = {
      profissionais:
        | {
            id: string
            nome_completo: string
            duracao_consulta_minutos: number
            valor_consulta: number | null
            especialidades: { nome: string } | { nome: string }[] | null
          }
        | {
            id: string
            nome_completo: string
            duracao_consulta_minutos: number
            valor_consulta: number | null
            especialidades: { nome: string } | { nome: string }[] | null
          }[]
        | null
    }

    const linhas = (data ?? []) as unknown as Linha[]
    const lista = linhas
      .map((linha) => (Array.isArray(linha.profissionais) ? linha.profissionais[0] : linha.profissionais))
      .filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined)
      .map((p) => {
        const esp = Array.isArray(p.especialidades) ? p.especialidades[0] : p.especialidades
        return {
          id: p.id,
          nome_completo: p.nome_completo,
          duracao_consulta_minutos: p.duracao_consulta_minutos,
          valor_consulta: p.valor_consulta,
          especialidade_nome: esp?.nome ?? '—',
        }
      })
      .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo))

    setProfissionais(lista)
  }, [])

  const carregarPacientes = useCallback(async (clinicaId: string) => {
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome_completo')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .order('nome_completo', { ascending: true })
    setPacientes(data ?? [])
  }, [])

  const carregarListaEspera = useCallback(async (clinicaId: string) => {
    const { data } = await supabase
      .from('lista_espera')
      .select('id, paciente_id, profissional_id, observacoes, created_at, pacientes(nome_completo), profissionais(nome_completo)')
      .eq('clinica_id', clinicaId)
      .eq('status', 'aguardando')
      .order('created_at', { ascending: true })

    type Linha = {
      id: string
      paciente_id: string
      profissional_id: string
      observacoes: string | null
      created_at: string
      pacientes: { nome_completo: string } | { nome_completo: string }[] | null
      profissionais: { nome_completo: string } | { nome_completo: string }[] | null
    }
    const linhas = (data ?? []) as unknown as Linha[]
    setListaEspera(
      linhas.map((l) => {
        const p = Array.isArray(l.pacientes) ? l.pacientes[0] : l.pacientes
        const prof = Array.isArray(l.profissionais) ? l.profissionais[0] : l.profissionais
        return {
          id: l.id,
          paciente_id: l.paciente_id,
          paciente_nome: p?.nome_completo ?? '—',
          profissional_id: l.profissional_id,
          profissional_nome: prof?.nome_completo ?? '—',
          observacoes: l.observacoes,
          created_at: l.created_at,
        }
      }),
    )
  }, [])

  const carregarGradeDoDia = useCallback(async (clinicaId: string, data: Date) => {
    setCarregandoGrade(true)
    const diaSemana = data.getDay()
    const dataISO = paraISODate(data)

    const [respDisponibilidade, respExcecoes, respAgendamentos] = await Promise.all([
      supabase
        .from('disponibilidade_padrao')
        .select('id, profissional_id, dia_semana, hora_inicio, hora_fim')
        .eq('clinica_id', clinicaId)
        .eq('dia_semana', diaSemana)
        .eq('ativo', true),
      supabase
        .from('agenda_excecoes')
        .select('id, profissional_id, tipo, hora_inicio, hora_fim, motivo')
        .eq('clinica_id', clinicaId)
        .eq('data', dataISO),
      supabase
        .from('agendamentos')
        .select('id, profissional_id, paciente_id, hora_inicio, hora_fim, status, observacoes, pacientes(nome_completo)')
        .eq('clinica_id', clinicaId)
        .eq('data', dataISO),
    ])

    setDisponibilidades(respDisponibilidade.data ?? [])
    setExcecoes((respExcecoes.data ?? []) as Excecao[])

    type LinhaAgendamento = {
      id: string
      profissional_id: string
      paciente_id: string
      hora_inicio: string
      hora_fim: string
      status: StatusAgendamento
      observacoes: string | null
      pacientes: { nome_completo: string } | { nome_completo: string }[] | null
    }
    const linhas = (respAgendamentos.data ?? []) as unknown as LinhaAgendamento[]
    setAgendamentos(
      linhas.map((l) => {
        const p = Array.isArray(l.pacientes) ? l.pacientes[0] : l.pacientes
        return {
          id: l.id,
          profissional_id: l.profissional_id,
          paciente_id: l.paciente_id,
          paciente_nome: p?.nome_completo ?? '—',
          hora_inicio: l.hora_inicio,
          hora_fim: l.hora_fim,
          status: l.status,
          observacoes: l.observacoes,
        }
      }),
    )
    setCarregandoGrade(false)
  }, [])

  useEffect(() => {
    if (!clinicaAtivaId) {
      setProfissionais([])
      setPacientes([])
      setListaEspera([])
      return
    }
    carregarProfissionais(clinicaAtivaId)
    carregarPacientes(clinicaAtivaId)
    carregarListaEspera(clinicaAtivaId)
  }, [clinicaAtivaId, carregarProfissionais, carregarPacientes, carregarListaEspera])

  useEffect(() => {
    if (!clinicaAtivaId) {
      setDisponibilidades([])
      setExcecoes([])
      setAgendamentos([])
      setCarregandoGrade(false)
      return
    }
    carregarGradeDoDia(clinicaAtivaId, dataSelecionada)
  }, [clinicaAtivaId, dataSelecionada, carregarGradeDoDia])

  useEffect(() => {
    if (!souMedico) {
      setMeuProfissionalId(null)
      return
    }
    let cancelado = false
    supabase
      .from('profissionais')
      .select('id')
      .eq('usuario_id', usuarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) setMeuProfissionalId(data?.id ?? null)
      })
    return () => {
      cancelado = true
    }
  }, [souMedico, usuarioId])

  async function iniciarAtendimento(ag: Agendamento) {
    if (!clinicaAtivaId || !meuProfissionalId) return
    setMenuStatusId(null)
    setErroIniciarAtendimento(null)
    setIniciandoAtendimentoId(ag.id)

    const { data, error } = await supabase.rpc('iniciar_atendimento_agendado', {
      p_clinica_id: clinicaAtivaId,
      p_agendamento_id: ag.id,
    })

    setIniciandoAtendimentoId(null)

    if (error || typeof data !== 'string') {
      setErroIniciarAtendimento('Não foi possível iniciar o atendimento. Tente novamente.')
      return
    }

    onAtendimentoIniciado(data)
  }

  async function recarregarTudo() {
    if (!clinicaAtivaId) return
    await Promise.all([carregarGradeDoDia(clinicaAtivaId, dataSelecionada), carregarListaEspera(clinicaAtivaId)])
  }

  const janelasPorProfissional = useMemo(() => {
    const mapa = new Map<string, Janela[]>()
    for (const prof of profissionais) {
      const excecao = excecoes.find((e) => e.profissional_id === prof.id)
      if (excecao) {
        if (excecao.tipo === 'folga') {
          mapa.set(prof.id, [])
        } else if (excecao.hora_inicio && excecao.hora_fim) {
          mapa.set(prof.id, [
            { inicioMin: minutosDesdeMeiaNoite(excecao.hora_inicio), fimMin: minutosDesdeMeiaNoite(excecao.hora_fim) },
          ])
        }
        continue
      }
      const janelas = disponibilidades
        .filter((d) => d.profissional_id === prof.id)
        .map((d) => ({ inicioMin: minutosDesdeMeiaNoite(d.hora_inicio), fimMin: minutosDesdeMeiaNoite(d.hora_fim) }))
      mapa.set(prof.id, janelas)
    }
    return mapa
  }, [profissionais, disponibilidades, excecoes])

  const profissionaisVisiveis = useMemo(
    () =>
      profissionais.filter((p) => {
        const temDisponibilidade = disponibilidades.some((d) => d.profissional_id === p.id)
        const temExcecao = excecoes.some((e) => e.profissional_id === p.id)
        return temDisponibilidade || temExcecao
      }),
    [profissionais, disponibilidades, excecoes],
  )

  function abrirNovoAgendamento(prefill?: { pacienteId: string; profissionalId: string }) {
    setPrefillAgendamento(prefill ?? null)
    setModalAberto('agendamento')
  }

  async function mudarStatus(agendamentoId: string, novoStatus: StatusAgendamento) {
    setMenuStatusId(null)
    setAvisoSemCaixa(null)

    await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', agendamentoId)

    // Integração Agenda -> Financeiro: ao concluir, abre "Registrar entrada"
    // já preenchida (mesmo componente do Financeiro.tsx) se houver caixa
    // aberto na clínica agora; senão, muda o status normalmente e só avisa
    // (a mudança de status nunca fica bloqueada por causa do caixa).
    if (novoStatus === 'concluido' && clinicaAtivaId) {
      const agendamento = agendamentos.find((a) => a.id === agendamentoId)
      if (agendamento) {
        const { data: sessaoAberta } = await supabase
          .from('sessoes_caixa')
          .select('id')
          .eq('clinica_id', clinicaAtivaId)
          .eq('status', 'aberto')
          .maybeSingle()

        if (sessaoAberta) {
          setPrefillEntrada({ pacienteId: agendamento.paciente_id, profissionalId: agendamento.profissional_id, agendamentoId: agendamento.id })
          setModalAberto('entrada')
        } else {
          setAvisoSemCaixa('Sem caixa aberto — lance essa entrada manualmente quando abrir.')
        }
      }
    }

    await recarregarTudo()
  }

  const carregando = carregandoClinica || carregandoGrade

  const contagem = {
    hoje: agendamentos.length,
    confirmados: agendamentos.filter((a) => a.status === 'confirmado').length,
    emAtendimento: agendamentos.filter((a) => a.status === 'em_atendimento').length,
    cancelados: agendamentos.filter((a) => a.status === 'cancelado').length,
    listaEspera: listaEspera.length,
  }

  const horas = Array.from({ length: (GRID_FIM_MIN - GRID_INICIO_MIN) / 60 + 1 }, (_, i) => 7 + i)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="texto-titulo-tela text-[var(--texto-principal)]">Agenda</h1>
          <p className="text-sm text-[var(--texto-secundario)]">
            {clinicaAtiva?.nome ?? 'Nenhuma clínica vinculada ao seu usuário.'}
          </p>
        </div>

        {podeEscrever && (
          <button
            type="button"
            onClick={() => abrirNovoAgendamento()}
            disabled={!clinicaAtivaId}
            className="rounded-xl bg-[var(--cor-primaria)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Novo agendamento
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={buscaPaciente}
          onChange={(e) => setBuscaPaciente(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-sm text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)]"
        />

        <div className="flex items-center gap-2 rounded-xl bg-[var(--fundo-card)] px-2 py-1.5" style={{ boxShadow: 'var(--sombra-neutra)' }}>
          <button
            type="button"
            onClick={() => setDataSelecionada((d) => adicionarDias(d, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--texto-secundario)] transition hover:bg-[var(--fundo-pagina)] hover:text-[var(--texto-principal)]"
            aria-label="Dia anterior"
          >
            ‹
          </button>
          <span className="min-w-[220px] text-center text-sm font-medium text-[var(--texto-principal)]">
            {formatarDataExtenso(dataSelecionada)}
          </span>
          <button
            type="button"
            onClick={() => setDataSelecionada((d) => adicionarDias(d, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--texto-secundario)] transition hover:bg-[var(--fundo-pagina)] hover:text-[var(--texto-principal)]"
            aria-label="Próximo dia"
          >
            ›
          </button>
        </div>
      </div>

      {erroIniciarAtendimento && (
        <p role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3.5 py-2.5 text-sm text-[var(--cor-erro)]">
          {erroIniciarAtendimento}
        </p>
      )}

      {avisoSemCaixa && (
        <p
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cor-alerta-borda)] bg-[var(--cor-alerta-suave)] px-3.5 py-2.5 text-sm text-[var(--cor-alerta)]"
        >
          {avisoSemCaixa}
          <button
            type="button"
            onClick={() => setAvisoSemCaixa(null)}
            className="flex-none font-medium transition hover:opacity-70"
          >
            ✕
          </button>
        </p>
      )}

      {carregando ? (
        <div className="rounded-[18px] bg-[var(--fundo-card)] p-8 text-center text-sm text-[var(--texto-secundario)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
          Carregando...
        </div>
      ) : !clinicaAtivaId ? (
        <div className="rounded-[18px] bg-[var(--fundo-card)] p-8 text-center text-sm text-[var(--texto-secundario)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
          Nenhuma clínica vinculada ao seu usuário.
        </div>
      ) : profissionaisVisiveis.length === 0 ? (
        <div className="rounded-[18px] bg-[var(--fundo-card)] p-8 text-center text-sm text-[var(--texto-secundario)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
          Nenhum profissional com expediente cadastrado para este dia.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[18px] bg-[var(--fundo-card)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
          <div
            className="grid"
            style={{ gridTemplateColumns: `64px repeat(${profissionaisVisiveis.length}, minmax(180px, 1fr))`, minWidth: 64 + profissionaisVisiveis.length * 180 }}
          >
            <div className="border-b border-[var(--borda)] px-2 py-3" />
            {profissionaisVisiveis.map((prof) => (
              <div key={prof.id} className="flex items-center gap-2.5 border-b border-l border-[var(--borda)] px-3 py-3">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--cor-primaria-suave)] text-sm font-semibold text-[var(--cor-primaria)]">
                  {iniciais(prof.nome_completo)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--texto-principal)]">{prof.nome_completo}</div>
                  <div className="truncate text-xs text-[var(--texto-secundario)]">{prof.especialidade_nome}</div>
                </div>
                {podeEscrever && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfissionalParaExcecao(prof.id)
                      setModalAberto('excecao')
                    }}
                    className="flex-none text-xs text-[var(--texto-secundario)] transition hover:text-[var(--texto-principal)]"
                    title="Marcar folga / horário especial"
                  >
                    ⋯
                  </button>
                )}
              </div>
            ))}

            <div className="relative px-2" style={{ height: ALTURA_GRID }}>
              {horas.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-xs text-[var(--texto-secundario)]"
                  style={{ top: (h * 60 - GRID_INICIO_MIN) * PX_POR_MINUTO }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {profissionaisVisiveis.map((prof) => {
              const janelas = janelasPorProfissional.get(prof.id) ?? []
              const foraExpediente = segmentosForaExpediente(janelas)
              const agendamentosDoProfissional = agendamentos.filter((a) => a.profissional_id === prof.id)

              return (
                <div key={prof.id} className="relative border-l border-[var(--borda)]" style={{ height: ALTURA_GRID }}>
                  {horas.slice(1, -1).map((h) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-[var(--borda)]"
                      style={{ top: (h * 60 - GRID_INICIO_MIN) * PX_POR_MINUTO }}
                    />
                  ))}

                  {foraExpediente.map((seg, i) => (
                    <div
                      key={i}
                      className="agenda-fora-expediente absolute inset-x-0 flex items-center justify-center"
                      style={{
                        top: (seg.inicioMin - GRID_INICIO_MIN) * PX_POR_MINUTO,
                        height: (seg.fimMin - seg.inicioMin) * PX_POR_MINUTO,
                      }}
                    >
                      {seg.fimMin - seg.inicioMin >= 60 && (
                        <span className="rotate-0 text-[11px] font-medium text-[var(--texto-terciario)]">
                          Fora do expediente
                        </span>
                      )}
                    </div>
                  ))}

                  {agendamentosDoProfissional.map((ag) => {
                    const top = (minutosDesdeMeiaNoite(ag.hora_inicio) - GRID_INICIO_MIN) * PX_POR_MINUTO
                    const altura = Math.max(
                      (minutosDesdeMeiaNoite(ag.hora_fim) - minutosDesdeMeiaNoite(ag.hora_inicio)) * PX_POR_MINUTO,
                      28,
                    )
                    const estilo = estiloStatus(ag.status)
                    return (
                      <div key={ag.id} className="absolute inset-x-1" style={{ top, height: altura }}>
                        <button
                          type="button"
                          onClick={() =>
                            (podeEscrever || souMedico) && setMenuStatusId((atual) => (atual === ag.id ? null : ag.id))
                          }
                          className="h-full w-full overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left transition"
                          style={{ backgroundColor: estilo.fundo, borderColor: estilo.borda }}
                        >
                          <div className="numero-tabular truncate text-[11px] font-medium" style={{ color: estilo.texto }}>
                            {formatarHoraCurta(ag.hora_inicio)}
                          </div>
                          <div className="truncate text-xs font-semibold" style={{ color: estilo.texto }}>
                            {ag.paciente_nome}
                          </div>
                        </button>

                        {menuStatusId === ag.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuStatusId(null)} />
                            <div
                              className="absolute left-0 top-full z-20 mt-1 w-48 rounded-xl bg-[var(--fundo-card)] p-1.5"
                              style={{ boxShadow: 'var(--sombra-neutra)' }}
                            >
                              {souMedico &&
                                ag.profissional_id === meuProfissionalId &&
                                ag.status !== 'cancelado' &&
                                paraISODate(dataSelecionada) === paraISODate(new Date()) && (
                                  <button
                                    type="button"
                                    onClick={() => iniciarAtendimento(ag)}
                                    disabled={iniciandoAtendimentoId === ag.id}
                                    className="mb-1 flex w-full items-center gap-2 rounded-lg bg-[var(--cor-primaria-suave)] px-2.5 py-1.5 text-left text-xs font-semibold text-[var(--cor-primaria)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {iniciandoAtendimentoId === ag.id ? 'Iniciando...' : 'Iniciar atendimento'}
                                  </button>
                                )}
                              {podeEscrever &&
                                STATUS_ORDEM.map((status) => {
                                  const badge = badgeStatus(status)
                                  return (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => mudarStatus(ag.id, status)}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition hover:bg-[var(--fundo-pagina)]"
                                    >
                                      <span
                                        className="rounded-full px-2 py-0.5"
                                        style={{ backgroundColor: badge.fundo, color: badge.texto }}
                                      >
                                        {STATUS_LABEL[status]}
                                      </span>
                                    </button>
                                  )
                                })}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <CardResumo titulo="Hoje" valor={contagem.hoje} />
        <CardResumo titulo="Confirmados" valor={contagem.confirmados} status="confirmado" />
        <CardResumo titulo="Em atendimento" valor={contagem.emAtendimento} status="em_atendimento" />
        <CardResumo titulo="Cancelados" valor={contagem.cancelados} status="cancelado" />
        <CardResumo titulo="Lista de espera" valor={contagem.listaEspera} status="aguardando" />
      </div>

      <div className="rounded-2xl bg-[var(--fundo-card)] p-6" style={{ boxShadow: 'var(--sombra-neutra)' }}>
        <h2 className="texto-titulo-secao mb-4 text-[var(--texto-principal)]">Lista de espera</h2>

        {listaEspera.length === 0 ? (
          <p className="text-sm text-[var(--texto-secundario)]">Ninguém na lista de espera no momento.</p>
        ) : (
          <ul className="divide-y divide-[var(--borda)]">
            {listaEspera.map((entrada) => (
              <li key={entrada.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--texto-principal)]">{entrada.paciente_nome}</p>
                  <p className="text-sm text-[var(--texto-secundario)]">
                    {entrada.profissional_nome} · desde{' '}
                    {new Date(entrada.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {podeEscrever && (
                  <button
                    type="button"
                    onClick={() => abrirNovoAgendamento({ pacienteId: entrada.paciente_id, profissionalId: entrada.profissional_id })}
                    className="flex-none rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:opacity-80"
                    style={{ backgroundColor: 'var(--categoria-pessoas-fundo)', color: 'var(--categoria-pessoas-label)' }}
                  >
                    Agendar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalAberto === 'agendamento' && clinicaAtivaId && (
        <ModalNovoAgendamento
          clinicaAtivaId={clinicaAtivaId}
          pacientes={pacientes}
          profissionais={profissionais}
          prefill={prefillAgendamento}
          dataInicial={dataSelecionada}
          onFechar={() => setModalAberto(null)}
          onSalvo={async () => {
            setModalAberto(null)
            await recarregarTudo()
          }}
        />
      )}

      {modalAberto === 'excecao' && clinicaAtivaId && profissionalParaExcecao && (
        <ModalExcecao
          clinicaAtivaId={clinicaAtivaId}
          profissionalId={profissionalParaExcecao}
          dataInicial={dataSelecionada}
          onFechar={() => setModalAberto(null)}
          onSalvo={async () => {
            setModalAberto(null)
            await recarregarTudo()
          }}
        />
      )}

      {modalAberto === 'espera' && clinicaAtivaId && (
        <ModalListaEspera
          clinicaAtivaId={clinicaAtivaId}
          pacientes={pacientes}
          profissionais={profissionais}
          onFechar={() => setModalAberto(null)}
          onSalvo={async () => {
            setModalAberto(null)
            await recarregarTudo()
          }}
        />
      )}

      {modalAberto === 'entrada' && clinicaAtivaId && prefillEntrada && (
        <ModalBase titulo="Registrar entrada" onFechar={() => setModalAberto(null)} largura="lg">
          <FormRegistrarEntrada
            clinicaAtivaId={clinicaAtivaId}
            pacientes={pacientes}
            profissionais={profissionais}
            pacienteIdInicial={prefillEntrada.pacienteId}
            profissionalIdInicial={prefillEntrada.profissionalId}
            agendamentoIdInicial={prefillEntrada.agendamentoId}
            onRegistrado={() => setModalAberto(null)}
            comCard={false}
          />
        </ModalBase>
      )}

      {podeEscrever && clinicaAtivaId && (
        <button
          type="button"
          onClick={() => setModalAberto('espera')}
          className="rounded-xl border border-[var(--borda)] px-4 py-2.5 text-sm font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)]"
        >
          + Adicionar à lista de espera
        </button>
      )}
    </div>
  )
}

interface CardResumoProps {
  titulo: string
  valor: number
  status?: 'confirmado' | 'em_atendimento' | 'cancelado' | 'aguardando'
}

function CardResumo({ titulo, valor, status }: CardResumoProps) {
  const cores = status
    ? (() => {
        const chave = status.replace(/_/g, '-')
        return { fundo: `var(--status-${chave}-fundo)`, texto: `var(--status-${chave}-texto)` }
      })()
    : { fundo: 'var(--fundo-card)', texto: 'var(--texto-principal)' }

  return (
    <div
      className="min-w-[140px] flex-1 rounded-[14px] border border-[var(--borda)] px-4 py-3"
      style={{ backgroundColor: cores.fundo }}
    >
      <div className="text-xs font-medium" style={{ color: cores.texto, opacity: 0.85 }}>
        {titulo}
      </div>
      <div className="numero-tabular text-xl font-semibold" style={{ color: cores.texto }}>
        {valor}
      </div>
    </div>
  )
}

interface ModalNovoAgendamentoProps {
  clinicaAtivaId: string
  pacientes: PacienteOpcao[]
  profissionais: ProfissionalAgenda[]
  prefill: { pacienteId: string; profissionalId: string } | null
  dataInicial: Date
  onFechar: () => void
  onSalvo: () => void
}

function ModalNovoAgendamento({
  clinicaAtivaId,
  pacientes,
  profissionais,
  prefill,
  dataInicial,
  onFechar,
  onSalvo,
}: ModalNovoAgendamentoProps) {
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [pacienteId, setPacienteId] = useState(prefill?.pacienteId ?? '')
  const [profissionalId, setProfissionalId] = useState(prefill?.profissionalId ?? '')
  const [data, setData] = useState(paraISODate(dataInicial))
  const [horaInicio, setHoraInicio] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const pacientesFiltrados = buscaPaciente.trim()
    ? pacientes.filter((p) => p.nome_completo.toLowerCase().includes(buscaPaciente.trim().toLowerCase()))
    : pacientes

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (!pacienteId) {
      setErro('Selecione o paciente.')
      return
    }
    if (!profissionalId) {
      setErro('Selecione o profissional.')
      return
    }
    if (!data || !horaInicio) {
      setErro('Informe data e horário de início.')
      return
    }

    setSalvando(true)
    const { error } = await supabase.from('agendamentos').insert({
      clinica_id: clinicaAtivaId,
      paciente_id: pacienteId,
      profissional_id: profissionalId,
      data,
      hora_inicio: horaInicio,
      status: 'agendado',
    })

    if (error) {
      if (error.code === '23P01') {
        setErro('Esse profissional já tem um agendamento nesse horário.')
      } else {
        setErro('Não foi possível criar o agendamento. Tente novamente.')
      }
      setSalvando(false)
      return
    }

    setSalvando(false)
    onSalvo()
  }

  return (
    <ModalBase titulo="Novo agendamento" onFechar={onFechar}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Paciente <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <input
            type="text"
            placeholder="Buscar..."
            value={buscaPaciente}
            onChange={(e) => setBuscaPaciente(e.target.value)}
            disabled={salvando}
            className="mb-2 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2 text-sm text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          />
          <select
            required
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            disabled={salvando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          >
            <option value="">Selecione...</option>
            {pacientesFiltrados.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome_completo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Profissional <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <select
            required
            value={profissionalId}
            onChange={(e) => setProfissionalId(e.target.value)}
            disabled={salvando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          >
            <option value="">Selecione...</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome_completo}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
              Data <span className="text-[var(--cor-erro)]">*</span>
            </label>
            <input
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
              disabled={salvando}
              className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
              Início <span className="text-[var(--cor-erro)]">*</span>
            </label>
            <input
              type="time"
              required
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              disabled={salvando}
              className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
            />
          </div>
        </div>

        {erro && (
          <p role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="rounded-xl border border-[var(--borda)] px-4 py-2.5 font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {salvando ? 'Salvando...' : 'Agendar'}
          </button>
        </div>
      </form>
    </ModalBase>
  )
}

interface ModalExcecaoProps {
  clinicaAtivaId: string
  profissionalId: string
  dataInicial: Date
  onFechar: () => void
  onSalvo: () => void
}

function ModalExcecao({ clinicaAtivaId, profissionalId, dataInicial, onFechar, onSalvo }: ModalExcecaoProps) {
  const [data, setData] = useState(paraISODate(dataInicial))
  const [tipo, setTipo] = useState<TipoExcecao>('folga')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (tipo === 'horario_especial') {
      if (!horaInicio || !horaFim) {
        setErro('Informe o horário especial (início e fim).')
        return
      }
      if (horaFim <= horaInicio) {
        setErro('O horário de fim precisa ser depois do início.')
        return
      }
    }

    setSalvando(true)
    const { error } = await supabase.from('agenda_excecoes').insert({
      clinica_id: clinicaAtivaId,
      profissional_id: profissionalId,
      data,
      tipo,
      hora_inicio: tipo === 'horario_especial' ? horaInicio : null,
      hora_fim: tipo === 'horario_especial' ? horaFim : null,
      motivo: motivo.trim() || null,
    })

    if (error) {
      if (error.code === '23505') {
        setErro('Já existe uma exceção cadastrada para este profissional nesta data.')
      } else {
        setErro('Não foi possível salvar. Tente novamente.')
      }
      setSalvando(false)
      return
    }

    setSalvando(false)
    onSalvo()
  }

  return (
    <ModalBase titulo="Marcar folga / horário especial" onFechar={onFechar}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Data <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <input
            type="date"
            required
            value={data}
            onChange={(e) => setData(e.target.value)}
            disabled={salvando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoExcecao)}
            disabled={salvando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          >
            <option value="folga">Folga (dia inteiro)</option>
            <option value="horario_especial">Horário especial</option>
          </select>
        </div>

        {tipo === 'horario_especial' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Início <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <input
                type="time"
                required
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Fim <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <input
                type="time"
                required
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">Motivo (opcional)</label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={salvando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          />
        </div>

        {erro && (
          <p role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="rounded-xl border border-[var(--borda)] px-4 py-2.5 font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </ModalBase>
  )
}

interface ModalListaEsperaProps {
  clinicaAtivaId: string
  pacientes: PacienteOpcao[]
  profissionais: ProfissionalAgenda[]
  onFechar: () => void
  onSalvo: () => void
}

function ModalListaEspera({ clinicaAtivaId, pacientes, profissionais, onFechar, onSalvo }: ModalListaEsperaProps) {
  const [pacienteId, setPacienteId] = useState('')
  const [profissionalId, setProfissionalId] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (!pacienteId || !profissionalId) {
      setErro('Selecione o paciente e o profissional.')
      return
    }

    setSalvando(true)
    const { error } = await supabase.from('lista_espera').insert({
      clinica_id: clinicaAtivaId,
      paciente_id: pacienteId,
      profissional_id: profissionalId,
      observacoes: observacoes.trim() || null,
    })

    if (error) {
      if (error.code === '23505') {
        setErro('Esse paciente já está na lista de espera deste profissional.')
      } else {
        setErro('Não foi possível salvar. Tente novamente.')
      }
      setSalvando(false)
      return
    }

    setSalvando(false)
    onSalvo()
  }

  return (
    <ModalBase titulo="Adicionar à lista de espera" onFechar={onFechar}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Paciente <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <select
            required
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            disabled={salvando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          >
            <option value="">Selecione...</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome_completo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Profissional <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <select
            required
            value={profissionalId}
            onChange={(e) => setProfissionalId(e.target.value)}
            disabled={salvando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          >
            <option value="">Selecione...</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome_completo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">Observações (opcional)</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            disabled={salvando}
            rows={3}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          />
        </div>

        {erro && (
          <p role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="rounded-xl border border-[var(--borda)] px-4 py-2.5 font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {salvando ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </form>
    </ModalBase>
  )
}

interface ModalBaseProps {
  titulo: string
  onFechar: () => void
  children: ReactNode
  largura?: 'md' | 'lg'
}

function ModalBase({ titulo, onFechar, children, largura = 'md' }: ModalBaseProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="fixed inset-0 bg-[var(--sobreposicao)]" />
      <div
        className={`relative w-full rounded-[18px] bg-[var(--fundo-card)] p-6 ${largura === 'lg' ? 'max-w-lg' : 'max-w-md'}`}
        style={{ boxShadow: 'var(--sombra-neutra)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="texto-titulo-secao text-[var(--texto-principal)]">{titulo}</h2>
          <button type="button" onClick={onFechar} className="text-sm text-[var(--texto-secundario)] transition hover:text-[var(--texto-principal)]">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Agenda
