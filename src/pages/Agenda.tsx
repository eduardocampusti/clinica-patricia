import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
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
import { GradeTemporalAgenda, type ColunaAgenda, type PedidoRolagemAgenda } from '../components/agenda/GradeTemporalAgenda'
import { janelaVisivelAgenda } from '../lib/agendaTemporal'
import { IconeCalendario, IconeSino, IconePessoas, IconeCheck, IconeEquipe } from '../components/shell/icons'
import { MiniCalendarioAgenda } from '../components/agenda/MiniCalendarioAgenda'
import { useDescarteAgenda } from '../components/agenda/useDescarteAgenda'
import { DisponibilidadeFormulario } from '../components/agenda/DisponibilidadeFormulario'
import { FaixaDiasAgenda } from '../components/agenda/FaixaDiasAgenda'
import { DiasAgendaCelular } from '../components/agenda/DiasAgendaCelular'
import '../components/agenda/agendaCelular.css'
import '../components/agenda/agendaAcabamento.css'
import { blocosApresentacaoAgenda } from '../lib/agendaBlocosApresentacao'
import { useAgoraAgenda } from '../hooks/useAgoraAgenda'
import { EscolhaProfissional } from '../components/agenda/EscolhaProfissional'
import { horaAgenda, janelasAgenda, minutosAgenda, type JanelaAgenda } from '../lib/agendaDisponibilidade'

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
  const bruto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return bruto.charAt(0).toUpperCase() + bruto.slice(1)
}

function formatarDataCurta(data: Date): string {
  const semana = data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  const mes = data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${String(data.getDate()).padStart(2, '0')} ${mes}`
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
  const [baseDiasCelular, setBaseDiasCelular] = useState(() => paraISODate(new Date()))
  const agoraAgenda = useAgoraAgenda()
  const [buscaPaciente, setBuscaPaciente] = useState('')
  // Computador (lg em diante) abre no modo Dia; tablet e celular, na Lista. Escolha posterior é do usuário.
  const telaAmpla = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1024px)').matches
  const [visao, setVisao] = useState<'lista' | 'grade'>(() => telaAmpla() ? 'grade' : 'lista')
  const [calendarioAberto, setCalendarioAberto] = useState(false)
  const [diaInteiro, setDiaInteiro] = useState(false)
  const [pedidoRolagem, setPedidoRolagem] = useState<PedidoRolagemAgenda>(null)
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
  // Expediente do dia por profissional, com as funções comuns da política; somente dados já carregados.
  // Falha de disponibilidade nunca vira "sem expediente": fica explícita como não confirmada.
  function expedienteDoDia(id: string): { janelas: JanelaAgenda[]; rotulo: string; confirmado: boolean } {
    if (erroDisponibilidadeDia) return { janelas: [], rotulo: 'Disponibilidade não confirmada', confirmado: false }
    if (!profissionais.some(p => p.id === id)) return { janelas: [], rotulo: 'Fora do cadastro ativo', confirmado: false }
    const excecoesProf = excecoes.filter(e => e.profissional_id === id)
    try {
      const janelas = janelasAgenda(disponibilidades.filter(d => d.profissional_id === id), excecoesProf)
      return { janelas, rotulo: excecoesProf.some(e => (e.tipo as string) === 'bloqueio') ? 'Bloqueio' : excecoesProf.some(e => e.tipo === 'folga') ? 'Folga' : 'Sem expediente', confirmado: true }
    } catch { return { janelas: [], rotulo: 'Exceção inconsistente nesta data', confirmado: false } }
  }
  const blocosDoDia = (id: string, janelas: JanelaAgenda[]) => blocosApresentacaoAgenda(paraISODate(dataSelecionada), profissionais.find(p => p.id === id)?.duracao_consulta_minutos ?? null, janelas,
    agendamentos.filter(a => a.profissional_id === id), '', agoraAgenda)
  const livresDoDia = (id: string, janelas: JanelaAgenda[]) => blocosDoDia(id, janelas).filter(b => !b.ocupado && !b.passado).map(b => b.hora)
  const colunas: ColunaAgenda[] = idsProfissionais.map(id => {
    const { janelas, rotulo } = expedienteDoDia(id)
    const livres = livresDoDia(id, janelas)
    const faixas = janelas.filter(j => j.hora_inicio && j.hora_fim).map(j => [minutosAgenda(j.hora_inicio!), minutosAgenda(j.hora_fim!)]).sort((a, b) => a[0] - b[0])
    const neutros = !faixas.length ? [{ inicio: 0, fim: 1440, rotulo }] : [...faixas.map(([, fim], i) => ({ inicio: fim, fim: faixas[i + 1]?.[0] ?? 1440, rotulo: 'Fora do expediente' })),
      { inicio: 0, fim: faixas[0][0], rotulo: 'Fora do expediente' }].filter(n => n.fim > n.inicio)
    const especialidade = profissionais.find(p => p.id === id)?.especialidade_nome
    return { id, nome: nomeProfissional(id), detalhe: [especialidade && especialidade !== '—' ? especialidade : null, faixas.length ? `${livres.length} ${livres.length === 1 ? 'livre' : 'livres'}` : rotulo.toLocaleLowerCase('pt-BR')].filter(Boolean).join(' · '),
      // Cor da lista completa ordenada, independente do dia e das colunas filtradas.
      cor: Math.max(0, profissionais.findIndex(p => p.id === id)) % 6 + 1,
      livres, passados: blocosDoDia(id, janelas).filter(b => !b.ocupado && b.passado).map(b => b.hora), duracao: profissionais.find(p => p.id === id)?.duracao_consulta_minutos ?? null, neutros }
  })
  // Janela compacta: do primeiro ao último horário relevante (expediente ou agendamento) das colunas visíveis.
  const relevantes = [...colunas.flatMap(c => expedienteDoDia(c.id).janelas.flatMap(j => j.hora_inicio && j.hora_fim ? [minutosAgenda(j.hora_inicio), minutosAgenda(j.hora_fim)] : [])),
    ...registros.flatMap(a => [minutosAgenda(a.hora_inicio), minutosAgenda(a.hora_fim)])]
  const janelaGrade = relevantes.length ? { inicio: Math.floor(Math.min(...relevantes) / 60) * 60, fim: Math.min(1440, Math.ceil(Math.max(...relevantes) / 60) * 60) } : { inicio: 480, fim: 1080 }
  // Indicadores do dia, sempre sobre todos os registros da data (sem filtros de tela).
  const expedientes = profissionais.map(p => ({ id: p.id, ...expedienteDoDia(p.id) }))
  const comExpediente = expedientes.filter(e => e.janelas.length)
  const totalLivres = comExpediente.reduce((soma, e) => soma + livresDoDia(e.id, e.janelas).length, 0)
  const profissionaisDoDia = new Set(agendamentos.map(a => a.profissional_id)).size
  const indicadores = [
    { rotulo: 'Agendamentos do dia', curto: 'Total', valor: String(agendamentos.length), apoio: `${profissionaisDoDia} ${profissionaisDoDia === 1 ? 'profissional' : 'profissionais'}` },
    { rotulo: 'A confirmar', curto: 'A confirmar', valor: String(agendamentos.filter(a => a.status === 'agendado').length), apoio: 'ainda sem confirmação' },
    { rotulo: 'Aguardando atendimento', curto: 'Aguardando', valor: String(agendamentos.filter(a => a.status === 'aguardando').length), apoio: 'chegada registrada' },
    erroDisponibilidadeDia ? { rotulo: 'Horários livres', curto: 'Livres', valor: '—', apoio: 'disponibilidade não confirmada' }
      : comExpediente.length ? { rotulo: 'Horários livres', curto: 'Livres', valor: String(totalLivres), apoio: `${comExpediente.length} ${comExpediente.length === 1 ? 'profissional com expediente' : 'profissionais com expediente'}` }
        : { rotulo: 'Horários livres', curto: 'Livres', valor: '—', apoio: 'sem expediente cadastrado' },
    { rotulo: 'Lista de espera', curto: 'Espera', valor: String(listaEspera.length), apoio: 'aguardando vaga' },
  ]
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
    const abrirConsulta = { type: 'button' as const, onClick: () => { focoRecebimento.current = ag.id; setMenuStatusId(ag.id) },
      ref: (node: HTMLButtonElement | null) => { if (node) botoesAgendamento.current.set(ag.id, node); else botoesAgendamento.current.delete(ag.id) },
      'aria-label': `${formatarHoraCurta(ag.hora_inicio)} ${ag.paciente_nome} — ${STATUS_LABEL[ag.status]}${recebidos.has(ag.id) ? ' — Recebimento registrado' : ''}${curto ? ` — até ${formatarHoraCurta(ag.hora_fim)}, ${duracaoRegistro} minutos${disponibilidadeTexto ? ` — ${disponibilidadeTexto}` : ''}. Abrir detalhes` : temporal && disponibilidadeTexto ? ` — ${disponibilidadeTexto}` : ''}`,
      className: 'agenda-lista-consulta focus-visible:outline-2' }
    // Grade: duas linhas fixas (nome e horário); textos completos no title e no nome acessível.
    if (temporal) return <article key={ag.id} data-testid="registro-agenda" data-registro-id={ag.id} data-situacao={ag.status.replace(/_/g, '-')} className={`agenda-temporal-registro${curto ? ' agenda-temporal-curto' : ''}`}>
      <button {...abrirConsulta} title={[ag.paciente_nome, STATUS_LABEL[ag.status], disponibilidadeTexto, recebidos.has(ag.id) ? 'Recebimento registrado' : null].filter(Boolean).join(' · ')}>
        {curto ? <>
          <span className="agenda-fonte-tecnica font-semibold">{formatarHoraCurta(ag.hora_inicio)}–{formatarHoraCurta(ag.hora_fim)}</span>
          <span className="agenda-registro-nome font-semibold">{ag.paciente_nome}</span>
        </> : <>
          <span className="flex min-w-0 items-center justify-between gap-2"><span className="agenda-registro-nome text-[13px] font-semibold">{ag.paciente_nome}</span>
            <span className="agenda-situacao"><span aria-hidden="true" className="agenda-situacao-ponto" /><span className="agenda-situacao-texto">{STATUS_LABEL[ag.status]}</span></span></span>
          <span className="agenda-registro-nome agenda-fonte-tecnica">{formatarHoraCurta(ag.hora_inicio)}–{formatarHoraCurta(ag.hora_fim)} · {duracaoRegistro} min{recebidos.has(ag.id) ? ' · recebido' : ''}</span>
        </>}
      </button>
    </article>
    return <article key={ag.id} data-testid="registro-agenda" data-registro-id={ag.id} data-situacao={ag.status.replace(/_/g, '-')} className="agenda-lista-linha">
      <time className="agenda-celular-hora agenda-fonte-tecnica" dateTime={`${ag.data}T${ag.hora_inicio}`}>{formatarHoraCurta(ag.hora_inicio)}</time>
      <div className="agenda-lista-cartao">
      <button {...abrirConsulta}>
        <span className="numero-tabular text-sm font-semibold">{formatarHoraCurta(ag.hora_inicio)}–{formatarHoraCurta(ag.hora_fim)}<span className="block text-xs font-normal text-[var(--texto-secundario)]">{duracaoRegistro} min</span></span>
        <span className="min-w-0 break-words font-semibold">{ag.paciente_nome}{recebidos.has(ag.id) && <span className="block text-xs font-medium">Recebimento registrado</span>}</span>
        <span className="min-w-0 break-words text-sm text-[var(--texto-secundario)]">{nomeProfissional(ag.profissional_id)}<span className="md:hidden"> · {duracaoRegistro} min</span></span>
        <span><span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold" style={{ background: badge.fundo, color: badge.texto }}><span aria-hidden="true" className="size-1.5 rounded-full md:hidden" style={{ background: badge.texto }} />{STATUS_LABEL[ag.status]}</span>{disponibilidadeTexto && <span className="mt-1 block text-xs text-[var(--texto-secundario)]">{disponibilidadeTexto}</span>}</span>
      </button>
      {podeEscrever && <div className="agenda-lista-acoes">
        {['agendado', 'confirmado'].includes(ag.status) && <button type="button" className="agenda-acao-compacta" disabled={atualizandoStatus} onClick={() => void mudarStatus(ag, 'aguardando')}>Registrar chegada</button>}
        {elegivel && <button type="button" className="agenda-acao-compacta" aria-label="Editar agendamento" onClick={() => { setMenuStatusId(null); setEditandoAgendamento(ag) }}>Editar</button>}
      </div>}
      </div>
    </article>
  }
  const segmento = (ativo: boolean) => `min-h-11 rounded-md px-3 text-sm sm:px-4 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)] ${ativo ? 'bg-[var(--fundo-card)] text-[var(--texto-principal)] shadow-[var(--sombra-baixa)] ring-1 ring-inset ring-[var(--borda)]' : 'text-[var(--texto-secundario)] hover:text-[var(--texto-principal)]'}`
  const cartao = 'agenda-superficie rounded-xl border border-[var(--borda)] bg-[var(--fundo-card)]'
  const janelaExibida = janelaVisivelAgenda(janelaGrade, registros, diaInteiro)
  const profissionaisFiltro = [...new Set([...profissionais.map(p => p.id), ...agendamentos.map(a => a.profissional_id)])]
  const livresCelular = filtroProfissional && !buscaPaciente.trim() && podeEscrever && expedienteDoDia(filtroProfissional).confirmado
    ? livresDoDia(filtroProfissional, expedienteDoDia(filtroProfissional).janelas) : []
  const linhaDoTempo = [...registros.map(ag => ({ hora: ag.hora_inicio.slice(0, 5), id: ag.id, ag })), ...livresCelular.map(hora => ({ hora, id: `livre-${hora}`, ag: null }))].sort((a, b) => a.hora.localeCompare(b.hora))
  return <div className="agenda-pagina space-y-4">
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0"><h1 className="texto-titulo-tela">Agenda</h1><p className="text-sm text-[var(--texto-secundario)] sm:text-base">{formatarDataExtenso(dataSelecionada)}</p></div>
      {podeEscrever && <button type="button" onClick={() => abrirNovoAgendamento()} disabled={!clinicaAtivaId}
        className={`${acaoAgenda} hidden md:inline-flex shrink-0 border-transparent bg-[var(--cor-primaria)] text-[var(--texto-sobre-primaria)] hover:bg-[var(--cor-primaria-hover)]`}>
        <span aria-hidden="true" className="sm:hidden">+ Novo</span><span className="sr-only sm:not-sr-only">+ Novo agendamento</span>
      </button>}
    </header>
    <DiasAgendaCelular data={paraISODate(dataSelecionada)} base={baseDiasCelular} onBase={setBaseDiasCelular} onData={data => setDataSelecionada(new Date(`${data}T12:00:00`))} />
    {profissionaisFiltro.length <= 8 && <div role="group" aria-label="Profissionais no celular" className="agenda-celular-chips md:hidden">
      {[{ id: '', nome: 'Todos' }, ...profissionaisFiltro.map(id => ({ id, nome: nomeProfissional(id) }))].map(p => <button key={p.id} type="button" aria-pressed={filtroProfissional === p.id} onClick={() => setFiltroProfissional(p.id)}>{p.nome}</button>)}
    </div>}
    {/* Celular: faixa compacta (número e rótulo curto); demais telas: cartões com rótulo e apoio. */}
    <section aria-label="Resumo do dia" className="agenda-resumo-dia grid grid-cols-5 gap-1 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
      {indicadores.map((i, indice) => <div key={i.rotulo} data-kpi={indice + 1} className={`${cartao} agenda-indicador min-w-0 px-0.5 py-2 text-center sm:px-3 sm:py-2.5 sm:text-left`} style={{ ['--agenda-kpi-acento' as string]: `var(--kpi-${indice + 1}-acento)`, ['--agenda-kpi-inicio' as string]: `var(--kpi-${indice + 1}-inicio)`, ['--agenda-kpi-fim' as string]: `var(--kpi-${indice + 1}-fim)`, ['--agenda-kpi-icone' as string]: `var(--kpi-${indice + 1}-icone-fundo)` }}>
        <span aria-hidden="true" className="agenda-indicador-icone">{indice === 0 ? <IconeCalendario /> : indice === 1 ? <IconeSino /> : indice === 2 ? <IconePessoas /> : indice === 3 ? <IconeCheck /> : <IconeEquipe />}</span>
        <p className="sr-only text-[13px] leading-snug text-[var(--texto-secundario)] sm:not-sr-only">{i.rotulo}</p>
        <p className="numero-tabular text-lg font-semibold leading-tight text-[var(--texto-principal)] sm:mt-0.5 sm:text-2xl">{i.valor}</p>
        <p aria-hidden="true" className="truncate text-[11px] leading-tight text-[var(--texto-secundario)] sm:hidden">{i.curto}</p>
        <p className="sr-only text-xs leading-tight text-[var(--texto-secundario)] sm:not-sr-only">{i.apoio}</p>
      </div>)}
    </section>
    {correcaoSalva?.clinicaId === clinicaAtivaId && <FeedbackAlert variant="success" title="Agendamento atualizado" description="Data e horário corrigidos. Os demais dados e vínculos foram preservados." onClose={() => setCorrecaoSalva(null)} autoDismissMs={6000}
      action={correcaoSalva.data !== paraISODate(dataSelecionada) ? <button type="button" onClick={() => setDataSelecionada(new Date(`${correcaoSalva.data}T12:00:00`))}>Ver na nova data</button> : undefined} />}
    {feedbackStatus?.contexto === chaveContextoAtual && <FeedbackAlert variant={feedbackStatus.sucesso ? 'success' : 'destructive'} title={feedbackStatus.titulo} description={feedbackStatus.descricao} urgent={!feedbackStatus.sucesso} onClose={() => setFeedbackStatus(null)} autoDismissMs={feedbackStatus.sucesso ? 6000 : undefined} />}
    {atualizandoStatus && <p role="status">Atualizando situação...</p>}
    {erroIniciarAtendimento && <FeedbackAlert variant="destructive" title="Atendimento não iniciado" description={erroIniciarAtendimento} />}
    {erroRecebimentos && <FeedbackAlert variant="warning" title="Recebimentos indisponíveis" description={mensagemErroFinanceiro(erroRecebimentos)} action={<button type="button" onClick={() => setRevisaoRecebimentos(v => v + 1)}>Tentar novamente</button>} />}
    {erroDisponibilidadeDia && <FeedbackAlert variant="destructive" title="Falha ao consultar disponibilidade" description="Os agendamentos foram carregados, mas o expediente e os bloqueios não puderam ser confirmados. Isso não significa ausência de expediente. Criar e editar exigem uma consulta válida." action={<button type="button" onClick={() => void recarregarTudo()}>Tentar novamente</button>} />}
    <div className="agenda-celular-layout grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <section aria-label="Agendamentos do dia" className={`${cartao} ${visao === 'lista' ? 'agenda-celular-lista' : ''} min-w-0 overflow-hidden`}>
        <h2 className="sr-only">Agendamentos do dia</h2>
        <div aria-label="Controles da Agenda" role="group" className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-[var(--borda)] px-3 py-2">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Dia anterior" className={`${acaoAgenda} min-w-11 px-0`} onClick={() => setDataSelecionada(d => adicionarDias(d, -1))}>‹</button>
            <button type="button" className={acaoAgenda} onClick={() => setDataSelecionada(new Date())}>Hoje</button>
            <button type="button" aria-label="Próximo dia" className={`${acaoAgenda} min-w-11 px-0`} onClick={() => setDataSelecionada(d => adicionarDias(d, 1))}>›</button>
            <p className="sr-only whitespace-nowrap text-sm font-semibold sm:not-sr-only sm:ml-1">{formatarDataCurta(dataSelecionada)}</p>
          </div>
          <div role="group" aria-label="Visualização da Agenda" className="ml-auto inline-flex rounded-lg bg-[var(--fundo-pagina)] sm:ml-0">
            <button type="button" aria-pressed={visao === 'grade'} className={segmento(visao === 'grade')} onClick={() => setVisao('grade')}>Dia</button>
            <button type="button" aria-pressed={visao === 'lista'} className={segmento(visao === 'lista')} onClick={() => setVisao('lista')}>Lista</button>
          </div>
          {visao === 'grade' && !erroCarregamento && <div className="flex flex-wrap items-center gap-x-2 text-xs text-[var(--texto-secundario)]">
            <span>{diaInteiro ? 'Dia inteiro' : `Horários relevantes · ${horaAgenda(janelaExibida.inicio)}–${horaAgenda(Math.min(janelaExibida.fim, 1440))}`}</span>
            {diaInteiro && <>
              <button type="button" className="min-h-11 underline" onClick={() => setPedidoRolagem(p => ({ alvo: 'inicio', vez: (p?.vez ?? 0) + 1 }))}>Início do dia</button>
              <button type="button" className="min-h-11 underline" onClick={() => setPedidoRolagem(p => ({ alvo: 'primeiro', vez: (p?.vez ?? 0) + 1 }))}>{registros.length ? 'Primeiro agendamento' : 'Ir para 08h'}</button>
            </>}
            <button type="button" aria-pressed={diaInteiro} className="agenda-link min-h-11 font-semibold underline-offset-4 hover:underline" onClick={() => setDiaInteiro(v => !v)}>
              {diaInteiro ? 'Ver horários relevantes' : 'Ver dia inteiro'}
            </button>
          </div>}
          <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 lg:ml-auto lg:w-auto lg:grid-cols-[13rem_13rem]">
            <label className={`min-w-0 ${profissionaisFiltro.length <= 8 ? 'hidden md:block' : ''}`}><span className="sr-only">Filtrar profissional</span><select className={campoAgenda} value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)}>
              <option value="">Todos os profissionais</option>{[...new Set([...profissionais.map(p => p.id), ...agendamentos.map(a => a.profissional_id)])].map(id => <option key={id} value={id}>{nomeProfissional(id)}</option>)}</select></label>
            <label className="min-w-0"><span className="sr-only">Busca na Agenda</span><input className={campoAgenda} placeholder="Buscar paciente" value={buscaPaciente} onChange={e => setBuscaPaciente(e.target.value)} /></label>
          </div>
        </div>
        {erroCarregamento ? <div className="p-4"><FeedbackAlert variant="destructive" title="Não foi possível carregar a Agenda" description={erroCarregamento} action={<button type="button" onClick={() => void recarregarTudo()}>Tentar novamente</button>} /></div>
          : carregandoGrade ? <p role="status" className="p-5 text-sm">Carregando agendamentos...</p>
          : visao === 'lista' ? <>
            <p className="border-b border-[var(--borda)] px-4 py-2 text-xs text-[var(--texto-secundario)]">{registros.length} registro(s) com os filtros atuais</p>
            {!registros.length && livresCelular.length > 0 && <p className="hidden p-6 text-sm md:block">Nenhum agendamento corresponde à data e aos filtros. Altere os filtros ou crie uma marcação.</p>}
            {linhaDoTempo.length ? <><div className="agenda-lista-cabecalho" aria-hidden="true"><div className="agenda-lista-titulos"><span>Horário</span><span>Paciente</span><span>Profissional</span><span>Situação</span></div><span className="text-right">Ações</span></div>{linhaDoTempo.map(linha => linha.ag ? item(linha.ag) : <div key={linha.id} className="agenda-celular-livre md:hidden"><time className="agenda-celular-hora agenda-fonte-tecnica">{linha.hora}</time><button type="button" aria-label={`Horário livre às ${linha.hora} — agendar`} onClick={() => abrirNovoAgendamento({ pacienteId: '', profissionalId: filtroProfissional, inicio: linha.hora })}>+ Horário livre · agendar</button></div>)}</> : <p className="p-6 text-sm">Nenhum agendamento corresponde à data e aos filtros. Altere os filtros ou crie uma marcação.</p>}
          </>
          : <GradeTemporalAgenda registros={registros} colunas={colunas} janela={janelaGrade} diaInteiro={diaInteiro} pedidoRolagem={pedidoRolagem} contexto={chaveContextoAtual ?? ''} renderRegistro={ag => item(ag, true)}
            onNovo={podeEscrever ? (id, inicio) => abrirNovoAgendamento({ pacienteId: '', profissionalId: id, inicio }) : undefined}
            renderAcao={id => podeEscrever && profissionais.some(p => p.id === id) ? <button type="button" aria-label={`Expediente de ${nomeProfissional(id)}: marcar folga ou horário especial`} title="Marcar folga / horário especial"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--texto-secundario)] transition hover:bg-[var(--fundo-pagina)] hover:text-[var(--texto-principal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)]"
              onClick={() => { setProfissionalParaExcecao(id); setModalAberto('excecao') }}><IconeCalendario /></button> : null} />}
      </section>
      <aside aria-label="Calendário, lista de espera e situações" className="space-y-5">
        <section aria-label="Calendário do mês" className={`${cartao} p-3`}>
          <button type="button" aria-expanded={calendarioAberto} aria-controls="agenda-mini-calendario" onClick={() => setCalendarioAberto(v => !v)}
            className="flex min-h-11 w-full items-center justify-between gap-2 text-sm font-semibold lg:hidden">
            {calendarioAberto ? 'Ocultar calendário do mês' : 'Mostrar calendário do mês'}<span aria-hidden="true">{calendarioAberto ? '▴' : '▾'}</span>
          </button>
          <div id="agenda-mini-calendario" className={calendarioAberto ? 'mt-2 lg:mt-0' : 'hidden lg:block'}>
            <MiniCalendarioAgenda data={dataSelecionada} onData={dia => setDataSelecionada(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 12))} />
          </div>
        </section>
        <section aria-label="Lista de espera" className={`${cartao} p-4`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-semibold">Lista de espera</h2><p className="text-sm text-[var(--texto-secundario)]">{listaEspera.length} {listaEspera.length === 1 ? 'paciente' : 'pacientes'}</p></div>
          <p className="text-xs text-[var(--texto-secundario)]">Ainda não são agendamentos nem chegadas.</p>
          {!listaEspera.length ? <p className="py-3 text-sm">Ninguém aguardando vaga no momento.</p> : <ul className="mt-2 divide-y divide-[var(--borda)]">{listaEspera.map(e => <li key={e.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="break-words font-medium">{e.paciente_nome}</p><p className="text-sm text-[var(--texto-secundario)]">{e.profissional_nome} · desde {new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p></div>
            {podeEscrever && <button type="button" className={`${acaoAgenda} shrink-0`} aria-label={`Encaixar ${e.paciente_nome}`} onClick={() => abrirNovoAgendamento({ pacienteId: e.paciente_id, profissionalId: e.profissional_id })}>Encaixar</button>}
          </li>)}</ul>}
          {podeEscrever && <button type="button" className="agenda-link mt-2 min-h-11 text-sm font-semibold underline-offset-4 hover:underline" onClick={() => setModalAberto('espera')}>+ Adicionar à lista de espera</button>}
        </section>
        <section aria-label="Situação dos atendimentos" className={`${cartao} p-4`}>
          <h2 className="mb-2 text-base font-semibold">Situação dos atendimentos</h2>
          <ul className="space-y-1.5">{(Object.keys(STATUS_LABEL) as StatusAgendamento[]).map(s => <li key={s} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2"><span aria-hidden="true" className="agenda-situacao-ponto" style={{ ['--situacao-ponto' as string]: `var(--status-${s.replace(/_/g, '-')}-ponto)` }} />{STATUS_LABEL[s]}</span>
            <span className="numero-tabular font-medium">{agendamentos.filter(a => a.status === s).length}</span>
          </li>)}</ul>
        </section>
      </aside>
    </div>
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
    {podeEscrever && !modalAberto && !editandoAgendamento && !menuStatusId && !consultaReceber && <div className="agenda-celular-novo md:hidden"><button type="button" onClick={() => abrirNovoAgendamento()} disabled={!clinicaAtivaId} className={`${acaoAgenda} border-transparent bg-[var(--cor-primaria)] text-[var(--texto-sobre-primaria)] hover:bg-[var(--cor-primaria-hover)]`}>+ Novo agendamento</button></div>}
    {editandoAgendamento && clinicaAtivaId && podeEscrever && <EditarAgendamento key={`${chaveContextoAtual}:${editandoAgendamento.id}`} agendamento={editandoAgendamento} clinicaId={clinicaAtivaId} clinicaNome={clinicaAtiva?.nome ?? 'Clínica'}
      profissionalNome={nomeProfissional(editandoAgendamento.profissional_id)} duracao={profissionais.find(p => p.id === editandoAgendamento.profissional_id)?.duracao_consulta_minutos ?? null}
      onFechar={() => setEditandoAgendamento(null)} onSalvo={data => { setEditandoAgendamento(null); setCorrecaoSalva({ clinicaId: clinicaAtivaId, data }); void recarregarTudo() }} />}
    {modalAberto === 'agendamento' && clinicaAtivaId && <ModalNovoAgendamento clinicaAtivaId={clinicaAtivaId} clinicaNome={clinicaAtiva?.nome ?? 'Clínica'} pacientes={pacientes} profissionais={profissionais} prefill={prefillAgendamento} dataInicial={dataSelecionada}
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
  clinicaNome: string
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
  clinicaNome,
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

  // Rodapé: resumo quando profissional, data e início existem; o que falta em uma linha curta.
  // A lista completa (pendenciasCriacao) segue para leitor de tela e descreve o botão.
  const profissionalEscolhido = profissionais.find(p => p.id === profissionalId)
  const faltas = [
    resultadoIncerto ? 'conferir a Agenda' : null,
    capacidadeManual !== 'pronta' ? 'confirmação do serviço' : null,
    !pacienteId ? 'paciente' : null,
    !profissionalId ? 'profissional' : null,
    !data ? 'data' : null,
    !horaInicio ? 'horário' : null,
    profissionalId && data && horaInicio && disponibilidade.bloqueio ? disponibilidade.estado === 'pronta' ? 'ajuste do horário' : disponibilidade.estado === 'erro' ? 'consulta da disponibilidade' : 'verificação da disponibilidade' : null,
    disponibilidade.aviso && !confirmadoManual ? 'confirmação manual' : null,
  ].filter((f): f is string => !!f)
  const textoFalta = faltas.length ? `Falta: ${faltas.length > 1 ? `${faltas.slice(0, -1).join(', ')} e ${faltas.at(-1)}` : faltas[0]}` : ''
  const fimMinutos = /^\d{2}:\d{2}$/.test(horaInicio) && duracao ? minutosAgenda(horaInicio) + duracao : null
  const resumoPronto = !!profissionalEscolhido && !!data && fimMinutos !== null && fimMinutos < 1440

  return (
    <PainelAgenda titulo="Novo agendamento" subtitulo={clinicaNome} onFechar={descarte.solicitarFechar} suspenso={suspenso} ocupado={salvando}>
      <form onSubmit={handleSubmit} className="agenda-formulario">
        <div className="agenda-formulario-conteudo space-y-8">
        <SecaoAgendamento id="novo-agendamento-secao-paciente" titulo="1. Paciente" acao={onNovoPaciente && (
          <button type="button" onClick={onNovoPaciente} disabled={salvando} className="min-h-11 rounded-lg border border-[var(--borda)] px-4 text-sm font-semibold text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)] disabled:opacity-60">
            + Novo paciente
          </button>
        )}>
          <SelecionarPaciente pacientes={pacientes} value={pacienteId} onChange={setPacienteId} disabled={salvando} detalhe={`Paciente da ${clinicaNome}`} />
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
        </SecaoAgendamento>

        <SecaoAgendamento id="novo-agendamento-secao-profissional" titulo="2. Profissional">
          <EscolhaProfissional profissionais={profissionais} value={profissionalId} onChange={setProfissionalId} disabled={salvando} rotuloId="novo-agendamento-secao-profissional" />
        </SecaoAgendamento>

        <SecaoAgendamento id="novo-agendamento-secao-horario" titulo="3. Data e horário">
          {profissionalId
            ? <FaixaDiasAgenda clinicaId={clinicaAtivaId} profissionalId={profissionalId} data={data} duracao={duracao} onData={setData} ocupado={salvando} />
            : <p className="rounded-xl bg-[var(--fundo-pagina)] px-4 py-3 text-sm text-[var(--texto-secundario)]">Escolha o profissional para ver os dias e horários livres.</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--texto-secundario)]">{data ? <>Data escolhida: <span className="font-medium text-[var(--texto-principal)]">{rotuloDataAgendamento(data)}</span></> : 'Nenhuma data escolhida.'}</p>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--texto-principal)]">
              Outra data
              <input
                id="novo-agendamento-data"
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                disabled={salvando}
                className="min-h-11 rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-2 text-sm text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </label>
          </div>
          {profissionalId && <>
            <DisponibilidadeFormulario consulta={disponibilidade} data={data} inicio={horaInicio} duracao={duracao} onInicio={setHoraInicio} ocupado={salvando} />
            {disponibilidade.aviso && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmadoManual} disabled={salvando} onChange={e => setConfirmadoManual(e.target.checked)} />Conferi os avisos e confirmo a marcação manual.</label>}
          </>}
        </SecaoAgendamento>

        <SecaoAgendamento id="novo-agendamento-secao-observacoes" titulo="4. Observações" rotuloDoCampo="novo-agendamento-observacoes">
          <textarea
            id="novo-agendamento-observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            disabled={salvando}
            rows={3}
            placeholder="Ex.: trazer exames anteriores"
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition placeholder:text-[var(--texto-terciario)] focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          />
        </SecaoAgendamento>

        <section aria-label="Avisos" className="space-y-3 empty:hidden">
        {capacidadeManual === 'carregando' && <p role="status" className="text-sm text-[var(--texto-secundario)]">Verificando serviço e autorização...</p>}
        {capacidadeManual === 'indisponivel' && <FeedbackAlert variant="warning" title="Agenda manual ainda indisponível" description="Não foi possível confirmar o serviço e a autorização nesta sessão. Em caso de atualização, preserve seu preenchimento e atualize a página. Não será utilizada a operação antiga como alternativa." />}
        {erro && <FeedbackAlert variant="destructive" title="Não foi possível criar o agendamento" description={erro} urgent />}
        </section>
        </div>
        <div className="agenda-formulario-rodape">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
              {salvando ? <p className="text-sm text-[var(--texto-secundario)]">Salvando agendamento...</p>
                : resumoPronto ? <div role="group" aria-label="Resumo do horário">
                  <p className="break-words text-sm font-semibold text-[var(--texto-principal)]"><span className="agenda-fonte-tecnica">{rotuloDataAgendamento(data)} · {horaInicio}–{horaAgenda(fimMinutos!)}</span> · {profissionalEscolhido!.nome_completo}</p>
                  <p className="text-sm text-[var(--texto-secundario)]">{duracao} min{textoFalta ? ` · ${textoFalta}` : ''}</p>
                </div>
                : <p className="text-sm text-[var(--texto-secundario)]">{textoFalta}</p>}
            </div>
            <div className="ml-auto flex shrink-0 gap-3">
              <button
                type="button"
                onClick={descarte.solicitarFechar}
                disabled={salvando}
                className="min-h-11 rounded-lg border border-[var(--borda)] px-4 font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                aria-describedby="pendencias-criacao"
                disabled={pendenciasCriacao.length > 0}
                className="min-h-11 rounded-lg bg-[var(--cor-primaria)] px-5 font-semibold text-[var(--texto-sobre-primaria)] transition hover:bg-[var(--cor-primaria-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Agendar'}
              </button>
            </div>
          </div>
          <div id="pendencias-criacao" role="status" className="sr-only">
            {pendenciasCriacao.length ? `Para agendar: ${pendenciasCriacao.join(' ')}` : 'Pronto para agendar. O servidor verificará novamente as regras.'}
          </div>
        </div>
      </form>
      {descarte.confirmacao}
    </PainelAgenda>
  )
}

const rotuloDataAgendamento = (data: string) => {
  const d = new Date(`${data}T12:00:00`)
  const semana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return `${semana.charAt(0).toLocaleUpperCase('pt-BR')}${semana.slice(1)}, ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
}

// Seção numerada; com um único campo, o título é o próprio rótulo dele (sem região de mesmo nome).
function SecaoAgendamento({ id, titulo, acao, rotuloDoCampo, children }: { id: string; titulo: string; acao?: ReactNode; rotuloDoCampo?: string; children: ReactNode }) {
  const cabecalho = <div className="flex min-h-11 items-center justify-between gap-3">
    {rotuloDoCampo
      ? <label id={id} htmlFor={rotuloDoCampo} className="text-base font-medium text-[var(--texto-principal)]">{titulo}</label>
      : <h3 id={id} className="text-base font-medium text-[var(--texto-principal)]">{titulo}</h3>}
    {acao}
  </div>
  if (rotuloDoCampo) return <div className="space-y-3">{cabecalho}{children}</div>
  return <section aria-labelledby={id} className="space-y-3">{cabecalho}{children}</section>
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
