import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { iniciarAtendimentoAgendado } from '../lib/prontuarioRpc'
import type { ClinicaAtiva } from '../hooks/useClinicaAtiva'
import { usePapelNaClinica } from '../hooks/usePapelNaClinica'
import { ModalBase } from '../components/ModalBase'
import { ReceberPagamento, type ConsultaParaReceber } from '../components/financeiro/ReceberPagamento'
import { consultarRecebimentosAgenda, podeReceberNaAgenda } from '../lib/financeiro/financeiro.agenda'
import { assinarInvalidacaoFinanceira } from '../lib/financeiro/financeiro.cache'
import { mensagemErroFinanceiro } from '../lib/financeiro/financeiro.errors'
import { consultarCpfPendentePaciente } from '../lib/pacienteCpf'
import { AvisoCpfPendente } from '../components/pacientes/AvisoCpfPendente'
import { FeedbackAlert } from '../components/feedback/FeedbackAlert'
import { EditarAgendamento, type AgendamentoEditavel } from '../components/agenda/EditarAgendamento'
import { useDisponibilidadeAgenda } from '../hooks/useDisponibilidadeAgenda'
import { PainelAgenda, ResumoHorario, campoAgenda, acaoAgenda } from '../components/agenda/PainelAgenda'
import { SelecionarPaciente } from '../components/agenda/SelecionarPaciente'
import { GradeTemporalAgenda } from '../components/agenda/GradeTemporalAgenda'
import { useDescarteAgenda } from '../components/agenda/useDescarteAgenda'
import { DisponibilidadeFormulario } from '../components/agenda/DisponibilidadeFormulario'
import { FaixaDiasAgenda } from '../components/agenda/FaixaDiasAgenda'

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
  data: string
  updated_at: string
}

interface PacienteOpcao {
  id: string
  nome_completo: string
}

export interface PacienteCriadoAgenda extends PacienteOpcao {
  clinica_id: string
  revisao: number
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


function badgeStatus(status: StatusAgendamento): { fundo: string; texto: string } {
  if (status === 'agendado') {
    return { fundo: 'var(--fundo-pagina)', texto: 'var(--texto-secundario)' }
  }
  const chave = status.replace(/_/g, '-')
  return { fundo: `var(--status-${chave}-badge-fundo)`, texto: `var(--status-${chave}-badge-texto)` }
}


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


interface AgendaProps {
  clinicaAtiva: ClinicaAtiva | null
  carregandoClinica: boolean
  usuarioId: string
  onAtendimentoIniciado: (atendimentoId: string) => void
  onNovoPaciente?: () => void
  pacienteCriadoExternamente?: PacienteCriadoAgenda | null
  cadastroPacienteAberto?: boolean
}

function Agenda({
  clinicaAtiva,
  carregandoClinica,
  usuarioId,
  onAtendimentoIniciado,
  onNovoPaciente,
  pacienteCriadoExternamente,
  cadastroPacienteAberto = false,
}: AgendaProps) {
  const clinicaAtivaId = clinicaAtiva?.id ?? null
  const { papel, carregando: carregandoPapel } = usePapelNaClinica(usuarioId, clinicaAtivaId)
  const podeEscrever = !carregandoPapel && (papel === 'proprietaria' || papel === 'recepcao')
  const souMedico = papel === 'medico'

  const [dataSelecionada, setDataSelecionada] = useState(() => new Date())
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [visao, setVisao] = useState<'lista' | 'grade'>('lista')
  const [filtroProfissional, setFiltroProfissional] = useState('')

  const [profissionais, setProfissionais] = useState<ProfissionalAgenda[]>([])
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([])
  const [excecoes, setExcecoes] = useState<Excecao[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientes, setPacientes] = useState<PacienteOpcao[]>([])
  const [listaEspera, setListaEspera] = useState<EntradaListaEspera[]>([])
  const [carregandoGrade, setCarregandoGrade] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const [erroDisponibilidadeDia, setErroDisponibilidadeDia] = useState(false)
  const clinicaAtivaIdRef = useRef(clinicaAtivaId)
  const requisicaoGradeAtual = useRef(0)
  const chaveContextoAtual = clinicaAtivaId ? `${clinicaAtivaId}:${paraISODate(dataSelecionada)}` : null
  const [chaveContextoCarregado, setChaveContextoCarregado] = useState<string | null>(null)
  clinicaAtivaIdRef.current = clinicaAtivaId

  const [menuStatusId, setMenuStatusId] = useState<string | null>(null)
  const [editandoAgendamento, setEditandoAgendamento] = useState<AgendamentoEditavel | null>(null)
  const [correcaoSalva, setCorrecaoSalva] = useState<{ clinicaId: string; data: string } | null>(null)
  useEffect(() => { setEditandoAgendamento(null) }, [chaveContextoAtual])
  useEffect(() => { setCorrecaoSalva(null) }, [clinicaAtivaId])
  const [atualizandoStatus, setAtualizandoStatus] = useState(false)
  const atualizacaoStatusEmCurso = useRef(false)
  const contextoStatusAtual = useRef(chaveContextoAtual)
  const revisaoContextoStatus = useRef(0)
  if (contextoStatusAtual.current !== chaveContextoAtual) revisaoContextoStatus.current++
  contextoStatusAtual.current = chaveContextoAtual
  const [feedbackStatus, setFeedbackStatus] = useState<{
    contexto: string
    sucesso: boolean
    titulo: string
    descricao: string
  } | null>(null)
  useEffect(() => { setFeedbackStatus(null) }, [chaveContextoAtual])
  const [modalAberto, setModalAberto] = useState<'agendamento' | 'excecao' | 'espera' | null>(null)
  const [prefillAgendamento, setPrefillAgendamento] = useState<{ pacienteId: string; profissionalId: string; inicio?: string } | null>(
    null,
  )
  const [profissionalParaExcecao, setProfissionalParaExcecao] = useState<string | null>(null)
  const [consultaReceber, setConsultaReceber] = useState<ConsultaParaReceber | null>(null)
  const [recebidos, setRecebidos] = useState<Set<string>>(new Set())
  const [erroRecebimentos, setErroRecebimentos] = useState<string | null>(null)
  const [revisaoRecebimentos, setRevisaoRecebimentos] = useState(0)
  const focoRecebimento = useRef<string | null>(null)
  const botoesAgendamento = useRef(new Map<string, HTMLButtonElement>())
  const lembretesChegadaExibidos = useRef(new Set<string>())
  const [lembreteCpfChegada, setLembreteCpfChegada] = useState<{
    agendamentoId: string
    pacienteId: string
    pacienteNome: string
  } | null>(null)

  const [meuProfissionalId, setMeuProfissionalId] = useState<string | null>(null)
  const [iniciandoAtendimentoId, setIniciandoAtendimentoId] = useState<string | null>(null)
  const [erroIniciarAtendimento, setErroIniciarAtendimento] = useState<string | null>(null)

  const carregarProfissionais = useCallback(async (clinicaId: string) => {
    const { data, error } = await supabase
      .from('profissionais_clinicas')
      .select('profissionais(id, nome_completo, duracao_consulta_minutos, valor_consulta, especialidades(nome))')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)

    if (clinicaAtivaIdRef.current !== clinicaId) return
    if (error) {
      setProfissionais([])
      setErroCarregamento('Não foi possível carregar os profissionais da Agenda.')
      return
    }

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
    const { data, error } = await supabase
      .from('pacientes')
      .select('id, nome_completo')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .order('nome_completo', { ascending: true })
    if (clinicaAtivaIdRef.current !== clinicaId) return
    if (error) {
      setPacientes([])
      setErroCarregamento('Não foi possível carregar os pacientes da Agenda.')
      return
    }
    setPacientes(data ?? [])
  }, [])

  const carregarListaEspera = useCallback(async (clinicaId: string) => {
    const { data, error } = await supabase
      .from('lista_espera')
      .select('id, paciente_id, profissional_id, observacoes, created_at, pacientes(nome_completo), profissionais(nome_completo)')
      .eq('clinica_id', clinicaId)
      .eq('status', 'aguardando')
      .order('created_at', { ascending: true })

    if (clinicaAtivaIdRef.current !== clinicaId) return
    if (error) {
      setListaEspera([])
      setErroCarregamento('Não foi possível carregar a lista de espera.')
      return
    }

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
    const requisicao = ++requisicaoGradeAtual.current
    setCarregandoGrade(true)
    setErroDisponibilidadeDia(false)
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
        .select('id, profissional_id, paciente_id, data, updated_at, hora_inicio, hora_fim, status, observacoes, pacientes(nome_completo)')
        .eq('clinica_id', clinicaId)
        .eq('data', dataISO),
    ])

    if (clinicaAtivaIdRef.current !== clinicaId || requisicao !== requisicaoGradeAtual.current) return
    if (respAgendamentos.error) {
      setDisponibilidades([])
      setExcecoes([])
      setAgendamentos([])
      setErroCarregamento('Não foi possível carregar a Agenda. Tente novamente.')
      setCarregandoGrade(false)
      return
    }

    const falhaDisponibilidade = !!(respDisponibilidade.error || respExcecoes.error)
    setErroDisponibilidadeDia(falhaDisponibilidade)
    setDisponibilidades(falhaDisponibilidade ? [] : respDisponibilidade.data ?? [])
    setExcecoes(falhaDisponibilidade ? [] : (respExcecoes.data ?? []) as Excecao[])

    type LinhaAgendamento = {
      id: string
      profissional_id: string
      paciente_id: string
      hora_inicio: string
      hora_fim: string
      status: StatusAgendamento
      observacoes: string | null
      data: string
      updated_at: string
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
          data: l.data ?? dataISO,
          updated_at: l.updated_at,
        }
      }),
    )
    setCarregandoGrade(false)
  }, [])

  useEffect(() => {
    const clinicaId = clinicaAtivaId
    const chaveContexto = chaveContextoAtual
    let cancelado = false

    setChaveContextoCarregado(null)
    setProfissionais([])
    setPacientes([])
    setListaEspera([])
    setDisponibilidades([])
    setExcecoes([])
    setAgendamentos([])

    if (!clinicaId || !chaveContexto) {
      requisicaoGradeAtual.current += 1
      setCarregandoGrade(false)
      return
    }

    setErroCarregamento(null)
    setCarregandoGrade(true)
    void Promise.all([
      carregarProfissionais(clinicaId),
      carregarPacientes(clinicaId),
      carregarListaEspera(clinicaId),
      carregarGradeDoDia(clinicaId, dataSelecionada),
    ]).then(() => {
      if (!cancelado && clinicaAtivaIdRef.current === clinicaId) {
        setChaveContextoCarregado(chaveContexto)
      }
    })

    return () => {
      cancelado = true
    }
  }, [clinicaAtivaId, chaveContextoAtual, dataSelecionada, carregarProfissionais, carregarPacientes, carregarListaEspera, carregarGradeDoDia])

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

  useEffect(() => {
    setMenuStatusId(null)
    setFiltroProfissional('')
    setBuscaPaciente('')
    setModalAberto(null)
    setConsultaReceber(null)
    setPrefillAgendamento(null)
    setProfissionalParaExcecao(null)
    setErroIniciarAtendimento(null)
  }, [clinicaAtivaId])

  useEffect(() => {
    if (!pacienteCriadoExternamente || pacienteCriadoExternamente.clinica_id !== clinicaAtivaId) return
    setPacientes((atuais) => {
      const semDuplicata = atuais.filter((paciente) => paciente.id !== pacienteCriadoExternamente.id)
      return [...semDuplicata, pacienteCriadoExternamente].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo))
    })
  }, [clinicaAtivaId, pacienteCriadoExternamente])

  async function iniciarAtendimento(ag: Agendamento) {
    if (!clinicaAtivaId || !meuProfissionalId) return
    setMenuStatusId(null)
    setErroIniciarAtendimento(null)
    setIniciandoAtendimentoId(ag.id)

    const { data, error } = await iniciarAtendimentoAgendado(clinicaAtivaId, ag.id)

    setIniciandoAtendimentoId(null)

    if (error || !data) {
      setErroIniciarAtendimento('Não foi possível iniciar o atendimento. Tente novamente.')
      return
    }

    onAtendimentoIniciado(data)
  }

  async function recarregarTudo() {
    if (!clinicaAtivaId) return
    setErroCarregamento(null)
    await Promise.all([
      carregarProfissionais(clinicaAtivaId),
      carregarPacientes(clinicaAtivaId),
      carregarGradeDoDia(clinicaAtivaId, dataSelecionada),
      carregarListaEspera(clinicaAtivaId),
    ])
  }

  useEffect(() => {
    let atual = true
    setRecebidos(new Set())
    setErroRecebimentos(null)
    if (clinicaAtivaId && podeEscrever) {
      consultarRecebimentosAgenda(clinicaAtivaId, agendamentos.map((ag) => ag.id))
        .then((ids) => { if (atual) setRecebidos(ids) })
        .catch((erro) => { if (atual) setErroRecebimentos(mensagemErroFinanceiro(erro)) })
    }
    return () => { atual = false }
  }, [clinicaAtivaId, podeEscrever, agendamentos, revisaoRecebimentos])

  useEffect(() => assinarInvalidacaoFinanceira((evento) => {
    if (evento.clinicaId !== clinicaAtivaId || !evento.leituras.includes('agenda')) return
    setRevisaoRecebimentos((valor) => valor + 1)
    void carregarGradeDoDia(clinicaAtivaId, dataSelecionada)
  }), [clinicaAtivaId, dataSelecionada, carregarGradeDoDia])

  function abrirRecebimento(ag: Agendamento) {
    if (!clinicaAtiva || !podeEscrever || !podeReceberNaAgenda(papel, ag.status) || recebidos.has(ag.id)) return
    const profissional = profissionais.find((p) => p.id === ag.profissional_id)
    if (!profissional) return
    setConsultaReceber({ agendamentoId: ag.id, clinicaId: clinicaAtiva.id, profissionalId: ag.profissional_id,
      paciente: ag.paciente_nome, profissional: profissional.nome_completo, clinica: clinicaAtiva.nome,
      data: paraISODate(dataSelecionada), horario: ag.hora_inicio })
    setMenuStatusId(null)
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


  function abrirNovoAgendamento(prefill?: { pacienteId: string; profissionalId: string; inicio?: string }) {
    setPrefillAgendamento(prefill ?? null)
    setModalAberto('agendamento')
  }

  useEffect(() => {
    lembretesChegadaExibidos.current.clear()
    setLembreteCpfChegada(null)
  }, [clinicaAtivaId])

  async function mudarStatus(agendamento: Agendamento, novoStatus: StatusAgendamento) {
    if (!clinicaAtivaId || !chaveContextoAtual || !podeEscrever || atualizacaoStatusEmCurso.current) return
    setMenuStatusId(null)
    const contexto = chaveContextoAtual
    const revisao = revisaoContextoStatus.current
    const contextoVigente = () => contextoStatusAtual.current === contexto && revisaoContextoStatus.current === revisao
    atualizacaoStatusEmCurso.current = true
    setAtualizandoStatus(true)
    setFeedbackStatus(null)
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', agendamento.id)
        .eq('clinica_id', clinicaAtivaId)
        .select('id, status')
        .maybeSingle()
      if (!contextoVigente()) return
      if (error || data?.id !== agendamento.id || data?.status !== novoStatus) {
        throw new Error('Atualização não confirmada')
      }
      setFeedbackStatus({ contexto, sucesso: true,
        titulo: novoStatus === 'aguardando' ? 'Chegada registrada' : 'Situação atualizada',
        descricao: novoStatus === 'aguardando' ? 'O paciente está aguardando atendimento na Agenda.' : 'A situação do agendamento foi atualizada.' })
      await recarregarTudo()
      if (!contextoVigente()) return
      if (novoStatus === 'aguardando' && !lembretesChegadaExibidos.current.has(agendamento.id)) {
        lembretesChegadaExibidos.current.add(agendamento.id)
        void consultarCpfPendentePaciente(agendamento.paciente_id, clinicaAtivaId)
          .then((cpfPendente) => {
            if (cpfPendente && contextoVigente()) {
              setLembreteCpfChegada({
                agendamentoId: agendamento.id,
                pacienteId: agendamento.paciente_id,
                pacienteNome: agendamento.paciente_nome,
              })
            }
          })
          .catch(() => {
            // A falha do lembrete não pode impedir o registro de chegada.
          })
      }
    } catch {
      if (contextoVigente()) setFeedbackStatus({ contexto, sucesso: false,
        titulo: 'Não foi possível atualizar a situação',
        descricao: 'A atualização não foi confirmada. Confira a Agenda e tente novamente.' })
    } finally {
      atualizacaoStatusEmCurso.current = false
      setAtualizandoStatus(false)
    }
  }

  // Uma atualização da grade na mesma clínica não desmonta diálogos já abertos.
  // A superfície inteira continua bloqueada na carga inicial e em toda troca de contexto.
  const carregando = carregandoClinica || carregandoPapel || chaveContextoCarregado !== chaveContextoAtual

  if (carregando) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="texto-titulo-tela text-[var(--texto-principal)]">Agenda</h1>
          <p className="text-sm text-[var(--texto-secundario)]">
            {clinicaAtiva?.nome ?? 'Nenhuma clínica vinculada ao seu usuário.'}
          </p>
        </div>
        <div role="status" className="rounded-[18px] bg-[var(--fundo-card)] p-8 text-center text-sm text-[var(--texto-secundario)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
          Carregando contexto da clínica...
        </div>
      </div>
    )
  }

  const registros = agendamentos
    .filter(a => (!buscaPaciente.trim() || a.paciente_nome.toLocaleLowerCase().includes(buscaPaciente.trim().toLocaleLowerCase())) && (!filtroProfissional || a.profissional_id === filtroProfissional))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio) || a.paciente_nome.localeCompare(b.paciente_nome))
  const idsProfissionais = [...new Set([...profissionais.map(p => p.id), ...registros.map(a => a.profissional_id)])].filter(id => !filtroProfissional || id === filtroProfissional)
  const selecionado = agendamentos.find(a => a.id === menuStatusId)
  const nomeProfissional = (id: string) => profissionais.find(p => p.id === id)?.nome_completo ?? 'Profissional fora do cadastro ativo'
  function textoDisponibilidade(ag: Agendamento) {
    const faixas = janelasPorProfissional.get(ag.profissional_id) ?? []
    const habitual = faixas.some(j => minutosDesdeMeiaNoite(ag.hora_inicio) >= j.inicioMin && minutosDesdeMeiaNoite(ag.hora_fim) <= j.fimMin)
    const excecao = excecoes.find(e => e.profissional_id === ag.profissional_id)
    return erroDisponibilidadeDia ? 'Disponibilidade não confirmada' : excecao?.tipo === 'folga' ? 'Folga cadastrada' : !profissionais.some(p => p.id === ag.profissional_id) ? 'Expediente não confirmado' : !habitual ? (faixas.length ? 'Fora da faixa habitual' : 'Sem expediente') : null
  }
  function item(ag: Agendamento, temporal = false) {
    const badge = badgeStatus(ag.status)
    const duracaoRegistro = minutosDesdeMeiaNoite(ag.hora_fim) - minutosDesdeMeiaNoite(ag.hora_inicio)
    const curto = temporal && duracaoRegistro <= 20
    const disponibilidadeTexto = textoDisponibilidade(ag)
    const elegivel = ['agendado', 'confirmado', 'aguardando'].includes(ag.status)
    return <article key={ag.id} data-testid="registro-agenda" data-registro-id={ag.id} className={temporal ? `agenda-temporal-registro${curto ? ' agenda-temporal-curto' : ''}` : 'agenda-lista-linha'}>
      <button type="button" onClick={() => { focoRecebimento.current = ag.id; setMenuStatusId(ag.id) }}
        ref={node => { if (node) botoesAgendamento.current.set(ag.id, node); else botoesAgendamento.current.delete(ag.id) }}
        aria-label={`${formatarHoraCurta(ag.hora_inicio)} ${ag.paciente_nome} — ${STATUS_LABEL[ag.status]}${recebidos.has(ag.id) ? ' — Recebimento registrado' : ''}${curto ? ` — até ${formatarHoraCurta(ag.hora_fim)}, ${duracaoRegistro} minutos${disponibilidadeTexto ? ` — ${disponibilidadeTexto}` : ''}. Abrir detalhes` : ''}`}
        className="agenda-lista-consulta focus-visible:outline-2">
        <span className="numero-tabular text-sm font-semibold">{formatarHoraCurta(ag.hora_inicio)}–{formatarHoraCurta(ag.hora_fim)}{!curto && <span className="block text-xs font-normal text-[var(--texto-secundario)]">{duracaoRegistro} min</span>}</span>
        <span className="min-w-0 break-words font-semibold">{ag.paciente_nome}{!curto && recebidos.has(ag.id) && <span className="block text-xs font-medium">Recebimento registrado</span>}</span>
        {!temporal && <span className="min-w-0 break-words text-sm text-[var(--texto-secundario)]">{nomeProfissional(ag.profissional_id)}</span>}
        {!curto && <span><span className="inline-block rounded-md px-2 py-1 text-xs font-semibold" style={{ background: badge.fundo, color: badge.texto }}>{STATUS_LABEL[ag.status]}</span>{disponibilidadeTexto && <span className="mt-1 block text-xs text-[var(--texto-secundario)]">{disponibilidadeTexto}</span>}</span>}
      </button>
      {podeEscrever && !temporal && <div className="agenda-lista-acoes">
        {['agendado', 'confirmado'].includes(ag.status) && <button type="button" className="agenda-acao-compacta" disabled={atualizandoStatus} onClick={() => void mudarStatus(ag, 'aguardando')}>Registrar chegada</button>}
        {elegivel && <button type="button" className="agenda-acao-compacta" aria-label="Editar agendamento" onClick={() => { setMenuStatusId(null); setEditandoAgendamento(ag) }}>Editar</button>}
      </div>}
    </article>
  }
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="texto-titulo-tela">Agenda</h1><p className="text-sm text-[var(--texto-secundario)]"><span>{clinicaAtiva?.nome}</span><span> · agendamentos e atendimentos</span></p></div>
      {podeEscrever && <button type="button" onClick={() => abrirNovoAgendamento()} disabled={!clinicaAtivaId}
        className={`${acaoAgenda} bg-[var(--cor-primaria)] text-[var(--texto-sobre-primaria)]`}>+ Novo agendamento</button>}
    </header>
    <section aria-label="Controles da Agenda" className="space-y-3 rounded-xl border border-[var(--borda)] bg-[var(--fundo-card)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Dia anterior" className={acaoAgenda} onClick={() => setDataSelecionada(d => adicionarDias(d, -1))}>‹</button>
        <label className="sr-only" htmlFor="agenda-data">Data da Agenda</label>
        <input id="agenda-data" className={`${campoAgenda} !w-auto max-w-full`} type="date" value={paraISODate(dataSelecionada)}
          onChange={e => { if (e.target.value) setDataSelecionada(new Date(`${e.target.value}T12:00:00`)) }} />
        <button type="button" aria-label="Próximo dia" className={acaoAgenda} onClick={() => setDataSelecionada(d => adicionarDias(d, 1))}>›</button>
        <button type="button" className={acaoAgenda} onClick={() => setDataSelecionada(new Date())}>Hoje</button>
        <p className="text-sm font-medium sm:ml-2">{formatarDataExtenso(dataSelecionada)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm">Busca na Agenda<input className={campoAgenda} placeholder="Buscar paciente..." value={buscaPaciente} onChange={e => setBuscaPaciente(e.target.value)} /></label>
        <label className="text-sm">Filtrar profissional<select className={campoAgenda} value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)}>
          <option value="">Todos os profissionais</option>{[...new Set([...profissionais.map(p => p.id), ...agendamentos.map(a => a.profissional_id)])].map(id => <option key={id} value={id}>{nomeProfissional(id)}</option>)}</select></label>
        <div role="group" aria-label="Visualização da Agenda" className="flex items-end gap-1">
          <button type="button" aria-pressed={visao === 'lista'} className={`${acaoAgenda} ${visao === 'lista' ? 'bg-[var(--cor-primaria-suave)] text-[var(--cor-primaria)]' : ''}`} onClick={() => setVisao('lista')}>Lista</button>
          <button type="button" aria-pressed={visao === 'grade'} className={`${acaoAgenda} ${visao === 'grade' ? 'bg-[var(--cor-primaria-suave)] text-[var(--cor-primaria)]' : ''}`} onClick={() => setVisao('grade')}>Grade por profissional</button>
        </div>
      </div>
    </section>
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--texto-secundario)]" aria-label="Resumo do dia">
      <span><strong className="text-[var(--texto-principal)]">{agendamentos.length}</strong> agendamentos na data</span>
      <span><strong className="text-[var(--texto-principal)]">{agendamentos.filter(a => a.status === 'aguardando').length}</strong> aguardando atendimento</span>
      <span><strong className="text-[var(--texto-principal)]">{listaEspera.length}</strong> aguardando vaga</span>
    </div>
    {correcaoSalva?.clinicaId === clinicaAtivaId && <FeedbackAlert variant="success" title="Agendamento atualizado" description="Data e horário corrigidos. Os demais dados e vínculos foram preservados." onClose={() => setCorrecaoSalva(null)} autoDismissMs={6000}
      action={correcaoSalva.data !== paraISODate(dataSelecionada) ? <button type="button" onClick={() => setDataSelecionada(new Date(`${correcaoSalva.data}T12:00:00`))}>Ver na nova data</button> : undefined} />}
    {feedbackStatus?.contexto === chaveContextoAtual && <FeedbackAlert variant={feedbackStatus.sucesso ? 'success' : 'destructive'} title={feedbackStatus.titulo} description={feedbackStatus.descricao} urgent={!feedbackStatus.sucesso} onClose={() => setFeedbackStatus(null)} autoDismissMs={feedbackStatus.sucesso ? 6000 : undefined} />}
    {atualizandoStatus && <p role="status">Atualizando situação...</p>}
    {erroIniciarAtendimento && <FeedbackAlert variant="destructive" title="Atendimento não iniciado" description={erroIniciarAtendimento} />}
    {erroRecebimentos && <FeedbackAlert variant="warning" title="Recebimentos indisponíveis" description={mensagemErroFinanceiro(erroRecebimentos)} action={<button type="button" onClick={() => setRevisaoRecebimentos(v => v + 1)}>Tentar novamente</button>} />}
    {erroDisponibilidadeDia && <FeedbackAlert variant="destructive" title="Falha ao consultar disponibilidade" description="Os agendamentos foram carregados, mas o expediente e os bloqueios não puderam ser confirmados. Isso não significa ausência de expediente. Criar e editar exigem uma consulta válida." action={<button type="button" onClick={() => void recarregarTudo()}>Tentar novamente</button>} />}
    {erroCarregamento ? <FeedbackAlert variant="destructive" title="Não foi possível carregar a Agenda" description={erroCarregamento} action={<button type="button" onClick={() => void recarregarTudo()}>Tentar novamente</button>} />
      : carregandoGrade ? <p role="status">Carregando agendamentos...</p>
      : <section aria-label="Agendamentos do dia" className="overflow-hidden rounded-xl border border-[var(--borda)] bg-[var(--fundo-card)]">
        <div className="flex flex-wrap justify-between gap-2 border-b border-[var(--borda)] px-4 py-3"><h2 className="text-base font-semibold">{visao === 'lista' ? 'Agendamentos do dia' : 'Agenda por profissional'}</h2><p className="text-sm text-[var(--texto-secundario)]">{registros.length} registro(s)</p></div>
        {visao === 'lista' ? registros.length ? <><div className="agenda-lista-cabecalho" aria-hidden="true"><div className="agenda-lista-titulos"><span>Horário</span><span>Paciente</span><span>Profissional</span><span>Situação</span></div><span className="text-right">Ações</span></div>{registros.map(ag => item(ag))}</> : <p className="p-6 text-sm">Nenhum agendamento corresponde à data e aos filtros. Altere os filtros ou crie uma marcação.</p>
          : <GradeTemporalAgenda registros={registros} profissionais={idsProfissionais.map(id => ({ id, nome: nomeProfissional(id) }))} contexto={chaveContextoAtual ?? ''} renderRegistro={ag => item(ag, true)}
            onNovo={podeEscrever ? (id, inicio) => abrirNovoAgendamento({ pacienteId: '', profissionalId: id, inicio }) : undefined}
            renderAcao={id => podeEscrever && profissionais.some(p => p.id === id) ? <button type="button" className="min-h-9 text-xs underline" title="Marcar folga / horário especial" onClick={() => { setProfissionalParaExcecao(id); setModalAberto('excecao') }}>Expediente</button> : null} />}
      </section>}
    <section aria-label="Aguardando vaga" className="rounded-xl border border-[var(--borda)] bg-[var(--fundo-card)] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3"><div><h2 className="texto-titulo-secao">Aguardando vaga</h2><p className="text-sm text-[var(--texto-secundario)]">Lista de espera · ainda não são agendamentos nem chegadas.</p></div>
        {podeEscrever && <button type="button" className={acaoAgenda} onClick={() => setModalAberto('espera')}>+ Adicionar à lista de espera</button>}</div>
      {!listaEspera.length ? <p className="py-3 text-sm">Ninguém aguardando vaga no momento.</p> : <ul className="divide-y divide-[var(--borda)]">{listaEspera.map(e => <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><p className="font-medium">{e.paciente_nome}</p><p className="text-sm text-[var(--texto-secundario)]">{e.profissional_nome} · aguardando vaga desde {new Date(e.created_at).toLocaleDateString('pt-BR')}</p></div>
        {podeEscrever && <button type="button" className={acaoAgenda} onClick={() => abrirNovoAgendamento({ pacienteId: e.paciente_id, profissionalId: e.profissional_id })}>Agendar</button>}
      </li>)}</ul>}
    </section>
    {selecionado && <PainelAgenda titulo="Consultar agendamento" onFechar={() => setMenuStatusId(null)} ocupado={atualizandoStatus}>
      <div className="agenda-formulario"><div className="agenda-formulario-conteudo space-y-5">
        <p className="text-sm text-[var(--texto-secundario)]">{clinicaAtiva?.nome} · {selecionado.data.split('-').reverse().join('/')}</p>
        <h3 className="text-xl font-semibold">{selecionado.paciente_nome}</h3>
        <p>{nomeProfissional(selecionado.profissional_id)}</p>
        <ResumoHorario inicio={selecionado.hora_inicio.slice(0, 5)} duracao={minutosDesdeMeiaNoite(selecionado.hora_fim) - minutosDesdeMeiaNoite(selecionado.hora_inicio)} />
        <p>Situação: <strong>{STATUS_LABEL[selecionado.status]}</strong></p>
        {textoDisponibilidade(selecionado) && <p className="text-sm text-[var(--texto-secundario)]">Disponibilidade: {textoDisponibilidade(selecionado)}.</p>}
        <p className="whitespace-pre-wrap text-sm">Observações: {selecionado.observacoes || 'Não cadastradas.'}</p>
        {recebidos.has(selecionado.id) && <p>Recebimento registrado</p>}
        {podeEscrever && <section className="space-y-3"><h3 className="font-semibold">Ações da recepção</h3>
          <div className="flex flex-wrap gap-2">{selecionado.status === 'agendado' && <button type="button" disabled={atualizandoStatus} className={acaoAgenda} onClick={() => void mudarStatus(selecionado, 'confirmado')}>Confirmar agendamento</button>}
            {['agendado', 'confirmado'].includes(selecionado.status) && <button type="button" disabled={atualizandoStatus} className={acaoAgenda} onClick={() => void mudarStatus(selecionado, 'aguardando')}>Registrar chegada</button>}
            {['agendado', 'confirmado'].includes(selecionado.status) && <button type="button" disabled={atualizandoStatus} className={acaoAgenda} onClick={() => void mudarStatus(selecionado, 'cancelado')}>Cancelar agendamento</button>}</div>
          {podeReceberNaAgenda(papel, selecionado.status) && !recebidos.has(selecionado.id) && <button type="button" className={acaoAgenda} onClick={() => abrirRecebimento(selecionado)}>Receber pagamento</button>}
        </section>}
        {souMedico && selecionado.profissional_id === meuProfissionalId && selecionado.status !== 'cancelado' && paraISODate(dataSelecionada) === paraISODate(new Date()) && <button type="button" className={acaoAgenda} disabled={iniciandoAtendimentoId === selecionado.id} onClick={() => void iniciarAtendimento(selecionado)}>Iniciar atendimento</button>}
      </div><div className="agenda-formulario-rodape flex flex-wrap justify-end gap-2"><button type="button" className={acaoAgenda} disabled={atualizandoStatus} onClick={() => setMenuStatusId(null)}>Fechar consulta</button>
        {podeEscrever && ['agendado', 'confirmado', 'aguardando'].includes(selecionado.status) && <button type="button" className={acaoAgenda} onClick={() => { setMenuStatusId(null); setEditandoAgendamento(selecionado) }}>Editar agendamento</button>}
      </div></div>
    </PainelAgenda>}
    {editandoAgendamento && clinicaAtivaId && podeEscrever && <EditarAgendamento key={`${chaveContextoAtual}:${editandoAgendamento.id}`} agendamento={editandoAgendamento} clinicaId={clinicaAtivaId} clinicaNome={clinicaAtiva?.nome ?? 'Clínica'}
      profissionalNome={nomeProfissional(editandoAgendamento.profissional_id)} duracao={profissionais.find(p => p.id === editandoAgendamento.profissional_id)?.duracao_consulta_minutos ?? null}
      onFechar={() => setEditandoAgendamento(null)} onSalvo={data => { setEditandoAgendamento(null); setCorrecaoSalva({ clinicaId: clinicaAtivaId, data }); void recarregarTudo() }} />}
    {modalAberto === 'agendamento' && clinicaAtivaId && <ModalNovoAgendamento clinicaAtivaId={clinicaAtivaId} pacientes={pacientes} profissionais={profissionais} prefill={prefillAgendamento} dataInicial={dataSelecionada}
      onNovoPaciente={onNovoPaciente} pacienteCriadoExternamente={pacienteCriadoExternamente} suspenso={cadastroPacienteAberto} onFechar={() => setModalAberto(null)}
      onSalvo={async () => { setModalAberto(null); if (chaveContextoAtual) setFeedbackStatus({ contexto: chaveContextoAtual, sucesso: true, titulo: 'Agendamento criado', descricao: 'A marcação foi confirmada pelo servidor.' }); await recarregarTudo() }} />}
    {modalAberto === 'excecao' && clinicaAtivaId && profissionalParaExcecao && <ModalExcecao clinicaAtivaId={clinicaAtivaId} profissionalId={profissionalParaExcecao} dataInicial={dataSelecionada} onFechar={() => setModalAberto(null)} onSalvo={async () => { setModalAberto(null); await recarregarTudo() }} />}
    {modalAberto === 'espera' && clinicaAtivaId && <ModalListaEspera clinicaAtivaId={clinicaAtivaId} pacientes={pacientes} profissionais={profissionais} onFechar={() => setModalAberto(null)} onSalvo={async () => { setModalAberto(null); await recarregarTudo() }} />}
    {consultaReceber && <ReceberPagamento key={consultaReceber.agendamentoId} consulta={consultaReceber} usuarioId={usuarioId} onFechar={() => { setConsultaReceber(null); requestAnimationFrame(() => { if (focoRecebimento.current) botoesAgendamento.current.get(focoRecebimento.current)?.focus() }) }} onRecebido={r => setRecebidos(ids => new Set([...ids, r.agendamento_id]))} />}
    {lembreteCpfChegada && clinicaAtivaId && <aside className="fixed bottom-4 right-4 z-30 w-[calc(100%-2rem)] max-w-md" aria-label="Lembrete de CPF na chegada"><AvisoCpfPendente pacienteId={lembreteCpfChegada.pacienteId} pacienteNome={lembreteCpfChegada.pacienteNome} clinicaId={clinicaAtivaId} onAdicionado={() => setLembreteCpfChegada(null)} onLembrar={() => setLembreteCpfChegada(null)} /></aside>}
  </div>
}

interface ModalNovoAgendamentoProps {
  clinicaAtivaId: string
  pacientes: PacienteOpcao[]
  profissionais: ProfissionalAgenda[]
  prefill: { pacienteId: string; profissionalId: string; inicio?: string } | null
  dataInicial: Date
  onFechar: () => void
  onSalvo: () => void
  onNovoPaciente?: () => void
  pacienteCriadoExternamente?: PacienteCriadoAgenda | null
  suspenso?: boolean
}

function ModalNovoAgendamento({
  clinicaAtivaId,
  pacientes,
  profissionais,
  prefill,
  dataInicial,
  onFechar,
  onSalvo,
  onNovoPaciente,
  pacienteCriadoExternamente,
  suspenso = false,
}: ModalNovoAgendamentoProps) {
  const [pacienteId, setPacienteId] = useState(prefill?.pacienteId ?? '')
  const [profissionalId, setProfissionalId] = useState(prefill?.profissionalId ?? '')
  const [data, setData] = useState(paraISODate(dataInicial))
  const [horaInicio, setHoraInicio] = useState(prefill?.inicio ?? '')
  const [observacoes, setObservacoes] = useState('')
  const [confirmadoManual, setConfirmadoManual] = useState(false)
  const [capacidadeManual, setCapacidadeManual] = useState<'carregando' | 'pronta' | 'indisponivel'>('carregando')
  const envioManual = useRef(false)
  const vigenteManual = useRef(true)
  const [resultadoIncerto, setResultadoIncerto] = useState(false)
  const duracao = profissionais.find(p => p.id === profissionalId)?.duracao_consulta_minutos ?? null
  const disponibilidade = useDisponibilidadeAgenda(clinicaAtivaId, profissionalId, data, horaInicio, duracao)
  useEffect(() => { vigenteManual.current = true; return () => { vigenteManual.current = false } }, [])
  useEffect(() => {
    let atual = true
    setCapacidadeManual('carregando')
    void Promise.resolve(supabase.rpc('agenda_manual_disponivel', { p_clinica_id: clinicaAtivaId }))
      .then(({ data: pronta, error }) => { if (atual) setCapacidadeManual(!error && pronta === true ? 'pronta' : 'indisponivel') })
      .catch(() => { if (atual) setCapacidadeManual('indisponivel') })
    return () => { atual = false }
  }, [clinicaAtivaId])
  useEffect(() => { setConfirmadoManual(false) }, [clinicaAtivaId, profissionalId, data, horaInicio])
  const [salvando, setSalvando] = useState(false)
  const inicial = useRef({ pacienteId: prefill?.pacienteId ?? '', profissionalId: prefill?.profissionalId ?? '', data: paraISODate(dataInicial), inicio: prefill?.inicio ?? '' })
  const descarte = useDescarteAgenda(pacienteId !== inicial.current.pacienteId || profissionalId !== inicial.current.profissionalId || data !== inicial.current.data || horaInicio !== inicial.current.inicio || !!observacoes || confirmadoManual, salvando, onFechar)
  const [erro, setErro] = useState<string | null>(null)
  const [cpfPendente, setCpfPendente] = useState(false)
  const [consultandoCpf, setConsultandoCpf] = useState(false)
  const lembretesCpfIgnorados = useRef(new Set<string>())

  useEffect(() => {
    if (!pacienteCriadoExternamente || pacienteCriadoExternamente.clinica_id !== clinicaAtivaId) return
    setPacienteId(pacienteCriadoExternamente.id)
  }, [clinicaAtivaId, pacienteCriadoExternamente])

  useEffect(() => {
    let consultaAtual = true

    if (!pacienteId || lembretesCpfIgnorados.current.has(pacienteId)) {
      setCpfPendente(false)
      setConsultandoCpf(false)
      return () => {
        consultaAtual = false
      }
    }

    setConsultandoCpf(true)
    setCpfPendente(false)
    void consultarCpfPendentePaciente(pacienteId, clinicaAtivaId)
      .then((pendente) => {
        if (consultaAtual) setCpfPendente(pendente)
      })
      .catch(() => {
        // O lembrete é complementar e não pode bloquear o agendamento.
      })
      .finally(() => {
        if (consultaAtual) setConsultandoCpf(false)
      })

    return () => {
      consultaAtual = false
    }
  }, [clinicaAtivaId, pacienteId])

  const pendenciasCriacao = [
    salvando ? 'Aguarde o salvamento.' : null,
    resultadoIncerto ? 'Confira a Agenda por leitura antes de outro envio.' : null,
    capacidadeManual !== 'pronta' ? capacidadeManual === 'carregando' ? 'Aguarde a confirmação do serviço e da autorização.' : 'Serviço não confirmado: preserve os dados e atualize a página.' : null,
    !pacienteId ? 'Selecione um paciente nos resultados da pesquisa.' : null,
    !profissionalId ? 'Selecione o profissional.' : null,
    !data || !horaInicio ? 'Informe data e início.' : null,
    disponibilidade.bloqueio,
    disponibilidade.aviso && !confirmadoManual ? 'Confirme a marcação manual após conferir o aviso.' : null,
  ].filter((p): p is string => !!p)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (envioManual.current || resultadoIncerto || capacidadeManual !== 'pronta' || disponibilidade.bloqueio || (disponibilidade.aviso && !confirmadoManual)) return
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

    envioManual.current = true
    setSalvando(true)
    try {
      const { data: retorno, error } = await supabase.rpc('agenda_manual_criar', {
        p_clinica_id: clinicaAtivaId, p_paciente_id: pacienteId, p_profissional_id: profissionalId,
        p_data: data, p_inicio: horaInicio, p_observacoes: observacoes.trim() || null,
        p_confirmacao_manual: confirmadoManual,
      })
      if (!vigenteManual.current) return
      if (error) {
        if (!error.code) setResultadoIncerto(true)
        setErro(error.code === 'PGRST202' ? 'Serviço incompatível ou em atualização. Preserve seu preenchimento e atualize a página antes de tentar novamente. Nenhuma gravação alternativa será realizada.' : error.code === '23P01' ? 'Esse profissional já tem um agendamento nesse horário.' : error.code === '42501' ? 'Você não tem autorização para agendar nesta clínica.' : error.code === 'P0001' ? 'O servidor recusou a marcação. Confira bloqueios, duração e confirmação manual.' : 'Não foi possível criar o agendamento. Os dados foram mantidos. Confira a Agenda antes de tentar novamente.')
        return
      }
      if (!retorno?.id || retorno?.data !== data || retorno?.hora_inicio?.slice(0, 5) !== horaInicio || retorno?.profissional_id !== profissionalId || retorno?.paciente_id !== pacienteId || retorno?.clinica_id !== clinicaAtivaId) {
        setResultadoIncerto(true); setErro('Resultado não confirmado. Não repita o envio; confira a Agenda por leitura.'); return
      }
      onSalvo()
    } catch {
      if (vigenteManual.current) { setResultadoIncerto(true); setErro('Resultado indisponível. Não repita o envio; confira a Agenda por leitura.') }
    } finally { envioManual.current = false; if (vigenteManual.current) setSalvando(false) }
  }

  return (
    <PainelAgenda titulo="Novo agendamento" onFechar={descarte.solicitarFechar} suspenso={suspenso} ocupado={salvando}>
      <form onSubmit={handleSubmit} className="agenda-formulario">
        <div className="agenda-formulario-conteudo space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Quem será atendido?</p>
            {onNovoPaciente && (
              <button type="button" onClick={onNovoPaciente} disabled={salvando} className="text-sm font-semibold text-[var(--cor-primaria)] underline-offset-4 hover:underline disabled:opacity-60">
                + Novo paciente
              </button>
            )}
          </div>
          <SelecionarPaciente pacientes={pacientes} value={pacienteId} onChange={setPacienteId} disabled={salvando} />
        </div>

        {consultandoCpf && <p role="status" className="text-xs text-[var(--texto-secundario)]">Verificando cadastro do paciente...</p>}
        {cpfPendente && pacienteId && (
          <AvisoCpfPendente
            pacienteId={pacienteId}
            pacienteNome={pacientes.find((paciente) => paciente.id === pacienteId)?.nome_completo ?? 'Paciente'}
            clinicaId={clinicaAtivaId}
            onAdicionado={() => setCpfPendente(false)}
            onLembrar={() => {
              lembretesCpfIgnorados.current.add(pacienteId)
              setCpfPendente(false)
            }}
          />
        )}

        <div>
          <label htmlFor="novo-agendamento-profissional" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Profissional <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <select
            id="novo-agendamento-profissional"
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
          <label htmlFor="novo-agendamento-data" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Data <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <input
            id="novo-agendamento-data"
            type="date"
            required
            value={data}
            onChange={(e) => setData(e.target.value)}
            disabled={salvando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          />
        </div>

        <section aria-label="Escolha do horário" className="space-y-3">
          {profissionalId ? <>
            <FaixaDiasAgenda clinicaId={clinicaAtivaId} profissionalId={profissionalId} data={data} duracao={duracao} onData={setData} ocupado={salvando} />
            <DisponibilidadeFormulario consulta={disponibilidade} inicio={horaInicio} duracao={duracao} onInicio={setHoraInicio} ocupado={salvando} />
            {disponibilidade.aviso && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmadoManual} disabled={salvando} onChange={e => setConfirmadoManual(e.target.checked)} />Conferi os avisos e confirmo a marcação manual.</label>}
          </> : <p className="rounded-lg border border-dashed border-[var(--borda)] bg-[var(--fundo-pagina)] px-3 py-4 text-center text-sm text-[var(--texto-secundario)]">Selecione o profissional para ver os horários.</p>}
        </section>

        <ResumoHorario inicio={horaInicio} duracao={duracao} />

        <div>
          <label htmlFor="novo-agendamento-observacoes" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Observações
          </label>
          <textarea
            id="novo-agendamento-observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            disabled={salvando}
            rows={3}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          />
        </div>

        <section aria-label="Avisos" className="space-y-3 border-t border-[var(--borda)] pt-3 empty:hidden">
        {capacidadeManual === 'carregando' && <p role="status">Verificando serviço e autorização...</p>}
        {capacidadeManual === 'indisponivel' && <FeedbackAlert variant="warning" title="Agenda manual ainda indisponível" description="Não foi possível confirmar o serviço e a autorização nesta sessão. Em caso de atualização, preserve seu preenchimento e atualize a página. Não será utilizada a operação antiga como alternativa." />}
        {erro && <FeedbackAlert variant="destructive" title="Não foi possível criar o agendamento" description={erro} urgent />}
        </section>
        </div>
        <div className="agenda-formulario-rodape space-y-2">
          <div id="pendencias-criacao" role="status" className="text-sm">
            {pendenciasCriacao.length ? <><p>Para agendar:</p><ul className="list-inside list-disc">{pendenciasCriacao.map(p => <li key={p}>{p}</li>)}</ul></> : 'Pronto para agendar. O servidor verificará novamente as regras.'}
          </div>
          <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={descarte.solicitarFechar}
            disabled={salvando}
            className="rounded-xl border border-[var(--borda)] px-4 py-2.5 font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            aria-describedby="pendencias-criacao"
            disabled={pendenciasCriacao.length > 0}
            className="rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {salvando ? 'Salvando...' : 'Agendar'}
          </button>
          </div>
        </div>
      </form>
      {descarte.confirmacao}
    </PainelAgenda>
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

        {erro && <FeedbackAlert variant="destructive" title="Não foi possível salvar a exceção" description={erro} urgent />}

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

        {erro && <FeedbackAlert variant="destructive" title="Não foi possível atualizar a lista de espera" description={erro} urgent />}

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

export default Agenda
