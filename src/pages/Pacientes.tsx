import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { apenasDigitos, cpfValido, formatarCpf } from '../lib/cpf'
import { criptografarCpf, gerarHashCpf } from '../lib/cpfCripto'
import { buscarPacientePorCpf, consultarCpfPendentePaciente } from '../lib/pacienteCpf'
import { carregarFotoPaciente, obterCaminhoFotoPaciente, persistirFotoPaciente, removerFotoPaciente } from '../lib/pacienteFoto'
import {
  comporEnderecoPaciente,
  consultarCep,
  formatarCep,
  formatarTelefoneBrasil,
  formatarTextoPortuguesAoDigitar,
  normalizarEspacos,
} from '../lib/pacienteFormulario'
import EditorFotoPaciente from '../components/pacientes/EditorFotoPaciente'
import { AvisoCpfPendente } from '../components/pacientes/AvisoCpfPendente'
import PacienteAvatar from '../components/pacientes/PacienteAvatar'
import PreenchimentoCadastro from '../components/pacientes/PreenchimentoCadastro'
import IndicadoresPacientes from '../components/pacientes/IndicadoresPacientes'
import PreviaIdentificacaoPaciente from '../components/pacientes/PreviaIdentificacaoPaciente'
import FotoPacienteCompacta from '../components/pacientes/FotoPacienteCompacta'
import { avaliarPreenchimento } from '../lib/pacientePreenchimento'
import { IconeCalendario, IconeChevron, IconeLupa, IconeMais, IconePessoas } from '../components/shell/icons'
import { calcularIdade } from '../lib/pacienteIdade'
import { FILTROS_PACIENTES_INICIAIS, LIMITE_CONSULTA_PACIENTES, correspondeAosFiltros, hojeNaBahia, ordenarPacientes, padraoBuscaNome, respostaCompletaPacientes, restricoesPacientes, resumoFiltrosPacientes, type OrdemPacientes } from '../lib/pacienteLista'
import ControlesListaPacientes from '../components/pacientes/ControlesListaPacientes'
import EditarPaciente from '../components/pacientes/EditarPaciente'
import type { PacienteEdicao } from '../lib/pacienteEdicao'
import type { Papel } from '../hooks/usePapelNaClinica'
import { FeedbackAlert } from '../components/feedback/FeedbackAlert'
import { ConfirmacaoDialog } from '../components/feedback/ConfirmacaoDialog'
import { CamposEnderecoContatosPaciente, NavegacaoFormularioPaciente } from '../components/pacientes/FormularioPacienteCompartilhado'
import './pacientes-cadastro.css'
import './pacientes-lista.css'

interface PacienteListado {
  id: string
  nome_completo: string
  data_nascimento: string | null
  telefone: string | null
  endereco: string | null
  ativo: boolean
  sexo?: string | null
  foto_path?: string | null
  created_at?: string | null
}

interface PacienteRow {
  id: string
  nome_completo: string
  data_nascimento: string | null
  telefone: string | null
  endereco: string | null
  foto_path: string | null
  created_at: string | null
  sexo?: string | null
}

interface ResponsavelResumo {
  id: string
  nome_completo: string
  vinculo: string
  telefone: string
  email: string | null
}

interface PacienteCriado {
  id: string
  nome_completo: string
  clinica_id: string
}

interface FeedbackPagina {
  variant: 'success' | 'warning'
  title: string
  description: string
  atualizarLista?: boolean
}

const OPCOES_SEXO = [
  { value: 'nao_informado', label: 'Não informado' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'outro', label: 'Outro' },
]

interface FormPaciente {
  nomeCompleto: string
  cpf: string
  dataNascimento: string
  sexo: string
  telefone: string
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  observacoes: string
  responsavelNome: string
  responsavelVinculo: string
  responsavelTelefone: string
  responsavelCpf: string
  responsavelEmail: string
}

type CampoErroFormulario = 'nomeCompleto' | 'cpf' | 'dataNascimento' | 'responsavelNome' | 'responsavelVinculo' | 'responsavelTelefone' | 'responsavelCpf' | 'telefone' | 'cep' | 'email'

function campoParaErroFormulario(mensagem: string, form: FormPaciente): CampoErroFormulario | null {
  const texto = mensagem.toLocaleLowerCase('pt-BR')
  if (texto.includes('cpf opcional do responsável')) return 'responsavelCpf'
  if (texto.includes('cpf informado')) return 'cpf'
  if (texto.includes('nome completo do paciente')) return 'nomeCompleto'
  if (texto.includes('data de nascimento')) return 'dataNascimento'
  if (texto.includes('telefone com ddd')) return 'telefone'
  if (texto.includes('cep com 8')) return 'cep'
  if (texto.includes('responsável legal')) {
    if (!form.responsavelNome.trim()) return 'responsavelNome'
    if (!form.responsavelVinculo.trim()) return 'responsavelVinculo'
    return 'responsavelTelefone'
  }
  return null
}

type CampoTextoFormatado = 'nomeCompleto' | 'responsavelNome' | 'responsavelVinculo' | 'logradouro' | 'bairro' | 'cidade'
type CampoEnderecoViaCep = 'logradouro' | 'bairro' | 'cidade' | 'uf'
type EstadoCep = 'inicial' | 'consultando' | 'encontrado' | 'nao_encontrado' | 'erro'

const FORM_INICIAL: FormPaciente = {
  nomeCompleto: '',
  cpf: '',
  dataNascimento: '',
  sexo: 'nao_informado',
  telefone: '',
  email: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  observacoes: '',
  responsavelNome: '',
  responsavelVinculo: '',
  responsavelTelefone: '',
  responsavelCpf: '',
  responsavelEmail: '',
}

const CAMPOS_TEXTO_FORMATADOS: CampoTextoFormatado[] = [
  'nomeCompleto',
  'responsavelNome',
  'responsavelVinculo',
  'logradouro',
  'bairro',
  'cidade',
]

function posicaoAposDigitos(valor: string, quantidade: number): number {
  if (quantidade <= 0) return 0
  let encontrados = 0
  for (let indice = 0; indice < valor.length; indice += 1) {
    if (/\d/.test(valor[indice])) encontrados += 1
    if (encontrados === quantidade) return indice + 1
  }
  return valor.length
}

interface SelecaoAntesDaEdicao {
  inicio: number
  fim: number
  valor: string
}

function indicePalavraNaPosicao(valor: string, posicao: number): number | null {
  let indice = 0
  for (const correspondencia of valor.matchAll(/\S+/gu)) {
    const inicio = correspondencia.index
    const fim = inicio + correspondencia[0].length
    if (posicao >= inicio && posicao <= fim) return indice
    indice += 1
  }
  return null
}

function formatarData(data: string | null): string {
  if (!data) return '—'
  const [ano, mes, dia] = data.split('-')
  if (!ano || !mes || !dia) return data
  return `${dia}/${mes}/${ano}`
}

function IconeLapis() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" /></svg>
}

interface PacientesProps {
  clinicaAtivaId: string | null
  clinicaNome?: string | null
  carregandoClinica: boolean
  papel: Papel | null
  carregandoPapel: boolean
  usuarioId: string
  iniciarComCadastroAberto?: boolean
  pacienteInicialId?: string
  onCancelarCadastro?: () => void
  onPacienteCriado?: (paciente: { id: string; nome_completo: string; clinica_id: string }) => void
  onIrParaAgenda?: () => void
}

function Pacientes({
  clinicaAtivaId,
  clinicaNome,
  carregandoClinica,
  papel,
  carregandoPapel,
  usuarioId,
  iniciarComCadastroAberto = false,
  pacienteInicialId,
  onCancelarCadastro,
  onPacienteCriado,
  onIrParaAgenda,
}: PacientesProps) {
  const podeAdministrar = papel === 'proprietaria' || papel === 'recepcao'
  const [pacientes, setPacientes] = useState<PacienteListado[]>([])
  const [pacienteEncaminhadoId, setPacienteEncaminhadoId] = useState(pacienteInicialId)
  const encaminhamentoAplicado = useRef(false)
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<OrdemPacientes>('nome_asc')
  const [filtros, setFiltros] = useState(FILTROS_PACIENTES_INICIAIS)
  const [totalConsulta, setTotalConsulta] = useState<number | null>(null)
  const [consultaCompleta, setConsultaCompleta] = useState(false)
  const [chaveListaCarregada, setChaveListaCarregada] = useState('')
  const hoje = hojeNaBahia()
  const dataReferenciaLista = new Date(`${hoje}T12:00:00`)
  const regrasFiltros = useMemo(() => restricoesPacientes(filtros, hoje), [filtros, hoje])
  const filtrosAtivos = resumoFiltrosPacientes(filtros)
  const chaveLista = JSON.stringify([clinicaAtivaId, busca.trim(), filtros, hoje, pacienteEncaminhadoId])
  const consultaListaPendente = chaveListaCarregada !== chaveLista
  const abortarLista = useRef<AbortController | null>(null)
  const [modoBusca, setModoBusca] = useState<'nome' | 'cpf'>('nome')
  const [buscaCpf, setBuscaCpf] = useState('')
  const [resultadoCpf, setResultadoCpf] = useState<PacienteListado[] | null>(null)
  const [buscandoCpf, setBuscandoCpf] = useState(false)
  const [erroBuscaCpf, setErroBuscaCpf] = useState<string | null>(null)
  const requisicaoCpfAtual = useRef(0)
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [erroLista, setErroLista] = useState<string | null>(null)
  const requisicaoAtual = useRef(0)
  const [clinicaListaId, setClinicaListaId] = useState<string | null>(null)
  const [selecao, setSelecao] = useState<{ clinicaId: string; paciente: PacienteListado } | null>(null)
  const [resumo, setResumo] = useState<{ chave: string; responsaveis: ResponsavelResumo[]; cpfPendente: boolean | null; erro: boolean; erroCpf: boolean } | null>(null)
  const [edicao, setEdicao] = useState<{ pacienteId: string; clinicaId: string; paciente: PacienteListado } | null>(null)
  const edicaoIniciadaNoResumo = useRef(false)
  useEffect(() => { setEdicao(null) }, [clinicaAtivaId, papel, carregandoClinica, carregandoPapel])
  const [carregandoResumo, setCarregandoResumo] = useState(false)
  const [mostrarAdicionarCpf, setMostrarAdicionarCpf] = useState(false)
  const lembreteResumoAdiado = useRef<string | null>(null)
  const [revisaoResumo, setRevisaoResumo] = useState(0)
  const requisicaoResumoAtual = useRef(0)
  const resumoRef = useRef<HTMLDialogElement>(null)
  const [resumoDesktop, setResumoDesktop] = useState(() => window.matchMedia('(min-width: 1280px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)')
    const atualizar = () => setResumoDesktop(media.matches)
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [])
  const fotoModalRef = useRef<HTMLDialogElement>(null)
  const [processandoFoto, setProcessandoFoto] = useState(false)
  const fecharResumoRef = useRef<HTMLButtonElement>(null)
  const gatilhoResumoRef = useRef<HTMLButtonElement>(null)

  const [mostrarFormulario, setMostrarFormulario] = useState(iniciarComCadastroAberto)
  const [etapaCadastro, setEtapaCadastro] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState(FORM_INICIAL)
  const [confirmarDescarteCadastro, setConfirmarDescarteCadastro] = useState(false)
  const cadastroAlterado = useRef(false)
  const selecaoFormatada = useRef<{ input: HTMLInputElement; valor: string; inicio: number; fim: number } | null>(null)
  useLayoutEffect(() => {
    const selecao = selecaoFormatada.current
    selecaoFormatada.current = null
    if (selecao && document.activeElement === selecao.input && selecao.input.value === selecao.valor) {
      selecao.input.setSelectionRange(selecao.inicio, selecao.fim)
    }
  }, [form])
  const idade = calcularIdade(form.dataNascimento)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [feedbackPagina, setFeedbackPagina] = useState<FeedbackPagina | null>(null)
  const [atualizandoAposSalvar, setAtualizandoAposSalvar] = useState(false)
  const [estadoCep, setEstadoCep] = useState<EstadoCep>('inicial')
  const [fotoCadastro, setFotoCadastro] = useState<File | null>(null)
  const [fotoCadastroUrl, setFotoCadastroUrl] = useState<string | null>(null)
  const [pacienteCriadoPendente, setPacienteCriadoPendente] = useState<PacienteCriado | null>(null)
  const enviandoCadastro = useRef(false)
  const [pacienteFoto, setPacienteFoto] = useState<PacienteListado | null>(null)
  const [fotoAtualUrl, setFotoAtualUrl] = useState<string | null>(null)
  const [carregandoFoto, setCarregandoFoto] = useState(false)
  const [erroFotoAdministrativa, setErroFotoAdministrativa] = useState<string | null>(null)
  const requisicaoFotoAtual = useRef(0)
  const modalCadastroRef = useRef<HTMLFormElement>(null)
  const buscaPacienteRef = useRef<HTMLInputElement>(null)
  const erroFormularioRef = useRef<HTMLDivElement>(null)
  const gatilhoNovoPacienteRef = useRef<HTMLButtonElement>(null)
  const palavrasComGrafiaManual = useRef<Partial<Record<CampoTextoFormatado, Set<string>>>>({})
  const selecaoAntesDaEdicao = useRef<Partial<Record<CampoTextoFormatado, SelecaoAntesDaEdicao>>>({})
  const camposEmComposicao = useRef<Partial<Record<CampoTextoFormatado, boolean>>>({})
  const camposEnderecoManuais = useRef<Partial<Record<CampoEnderecoViaCep, boolean>>>({})
  const valoresViaCep = useRef<Partial<Record<CampoEnderecoViaCep, string>>>({})
  const requisicaoCepAtual = useRef(0)
  const clinicaFormularioAnterior = useRef(clinicaAtivaId)
  const clinicaAtivaRef = useRef(clinicaAtivaId)
  clinicaAtivaRef.current = clinicaAtivaId

  cadastroAlterado.current = JSON.stringify(form) !== JSON.stringify(FORM_INICIAL) || Boolean(fotoCadastro)
  const fecharFormularioSemDescarte = useCallback(() => {
    requisicaoCepAtual.current += 1
    setMostrarFormulario(false)
    setErroFormulario(null)
    setEstadoCep('inicial')
    setFotoCadastro(null)
    setFotoCadastroUrl((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      return null
    })
    setPacienteCriadoPendente(null)
    onCancelarCadastro?.()
  }, [onCancelarCadastro])
  const fecharFormulario = useCallback(() => {
    if (enviandoCadastro.current) return
    if (cadastroAlterado.current) setConfirmarDescarteCadastro(true)
    else fecharFormularioSemDescarte()
  }, [fecharFormularioSemDescarte])

  const carregarPacientes = useCallback(async (clinicaId: string) => {
    const requisicao = ++requisicaoAtual.current
    abortarLista.current?.abort()
    const controlador = new AbortController()
    abortarLista.current = controlador
    setCarregandoLista(true)
    setErroLista(null)
    setTotalConsulta(null)
    setConsultaCompleta(false)
    let consulta = supabase
      .from('pacientes')
      .select('id, nome_completo, data_nascimento, sexo, telefone, endereco, foto_path, created_at', { count: 'exact' })
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
    if (pacienteEncaminhadoId) consulta = consulta.eq('id', pacienteEncaminhadoId)
    // Escape curingas: a busca por nome continua sendo substring literal, não expressão.
    if (busca.trim()) consulta = consulta.filter('nome_completo', 'imatch', padraoBuscaNome(busca))
    for (const regra of regrasFiltros) consulta = consulta.filter(regra.campo, regra.operador, regra.valor)
    const { data, error, count } = await consulta.order('id', { ascending: true })
      .limit(LIMITE_CONSULTA_PACIENTES).abortSignal(controlador.signal)

    if (controlador.signal.aborted || requisicao !== requisicaoAtual.current) return null
    setChaveListaCarregada(chaveLista)
    setTotalConsulta(count)
    if (error || count === null) {
      if (requisicao !== requisicaoAtual.current) return
      setErroLista('Não foi possível carregar os pacientes e confirmar a contagem completa.')
      setClinicaListaId(clinicaId)
      setCarregandoLista(false)
      return false
    }

    if (requisicao !== requisicaoAtual.current) return
    const completa = respostaCompletaPacientes(data?.length ?? 0, count)
    setConsultaCompleta(completa)
    // Nunca apresentar uma ordenação local de uma resposta cortada como global.
    setPacientes(completa ? ((data ?? []) as PacienteRow[]).map((linha) => ({ ...linha, ativo: true })) : [])
    setClinicaListaId(clinicaId)
    setCarregandoLista(false)
    return true
  }, [busca, regrasFiltros, chaveLista, pacienteEncaminhadoId])

  useEffect(() => {
    if (carregandoClinica || carregandoPapel) return
    if (!podeAdministrar) {
      requisicaoAtual.current += 1
      setPacientes([])
      setClinicaListaId(null)
      setCarregandoLista(false)
      return
    }
    if (!clinicaAtivaId) {
      requisicaoAtual.current += 1
      setPacientes([])
      setClinicaListaId(null)
      setBusca('')
      setBuscaCpf('')
      setResultadoCpf(null)
      setErroBuscaCpf(null)
      setCarregandoLista(false)
      return
    }

    if (modoBusca !== 'nome') return
    const temporizador = setTimeout(() => void carregarPacientes(clinicaAtivaId), busca ? 250 : 0)
    return () => {
      clearTimeout(temporizador)
      requisicaoAtual.current += 1
      abortarLista.current?.abort()
    }
  }, [carregandoClinica, carregandoPapel, podeAdministrar, clinicaAtivaId, carregarPacientes, modoBusca, busca])

  useEffect(() => {
    if (clinicaFormularioAnterior.current === clinicaAtivaId) return
    clinicaFormularioAnterior.current = clinicaAtivaId
    setMostrarFormulario(false)
    setEtapaCadastro(1)
    setForm(FORM_INICIAL)
    setErroFormulario(null)
    setFeedbackPagina(null)
    setAtualizandoAposSalvar(false)
    setBuscaCpf('')
    setBusca('')
    setFiltros(FILTROS_PACIENTES_INICIAIS)
    setModoBusca('nome')
    setResultadoCpf(null)
    setErroBuscaCpf(null)
    setBuscandoCpf(false)
    setFotoCadastro(null)
    setFotoCadastroUrl((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      return null
    })
    setPacienteCriadoPendente(null)
    setPacienteFoto(null)
    requisicaoFotoAtual.current += 1
    setSelecao(null)
    setResumo(null)
    setMostrarAdicionarCpf(false)
    requisicaoResumoAtual.current += 1
    setFotoAtualUrl((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      return null
    })
    requisicaoCpfAtual.current += 1
  }, [clinicaAtivaId])

  useEffect(() => {
    if (!mostrarFormulario) return
    const modal = modalCadastroRef.current
    const gatilho = gatilhoNovoPacienteRef.current
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modal?.querySelector<HTMLElement>('[aria-label="Fechar cadastro de paciente"]')?.focus()

    function aoTeclar(evento: KeyboardEvent) {
      if (document.querySelector('[data-slot="alert-dialog-content"]')) return
      if (evento.key === 'Escape' && !salvando) fecharFormulario()
      if (evento.key !== 'Tab' || !modal) return
      const focaveis = Array.from(modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter((item) => item.offsetParent !== null)
      if (!focaveis.length) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
      gatilho?.focus()
    }
  }, [mostrarFormulario, salvando, fecharFormulario])

  useLayoutEffect(() => {
    if (!mostrarFormulario || !erroFormulario) return
    const campo = campoParaErroFormulario(erroFormulario, form)
    const ids: Record<CampoErroFormulario, string> = {
      nomeCompleto: 'paciente-nome',
      cpf: 'paciente-cpf',
      dataNascimento: 'paciente-data-nascimento',
      responsavelNome: 'responsavel-nome',
      responsavelVinculo: 'responsavel-vinculo',
      responsavelTelefone: 'responsavel-telefone',
      responsavelCpf: 'responsavel-cpf',
      telefone: 'paciente-telefone',
      cep: 'paciente-cep',
      email: 'paciente-email',
    }
    const input = campo ? document.getElementById(ids[campo]) : null
    if (input instanceof HTMLElement && !input.hasAttribute('disabled')) {
      const timer = window.setTimeout(() => {
        if (!input.isConnected) return
        input.focus()
        input.scrollIntoView({ block: 'nearest' })
      }, 0)
      return () => window.clearTimeout(timer)
    }
    erroFormularioRef.current?.focus()
  }, [erroFormulario, form, mostrarFormulario])

  useEffect(() => {
    const cep = apenasDigitos(form.cep)
    const requisicao = ++requisicaoCepAtual.current
    const controlador = new AbortController()

    if (cep.length !== 8) {
      setEstadoCep('inicial')
      return () => controlador.abort()
    }

    setEstadoCep('consultando')
    void consultarCep(cep, controlador.signal)
      .then((endereco) => {
        if (requisicao !== requisicaoCepAtual.current) return
        if (!endereco) {
          setEstadoCep('nao_encontrado')
          return
        }

        setForm((atual) => {
          const proximo = { ...atual }
          const retornados: Record<CampoEnderecoViaCep, string> = {
            logradouro: endereco.logradouro,
            bairro: endereco.bairro,
            cidade: endereco.cidade,
            uf: endereco.uf,
          }

          for (const campo of Object.keys(retornados) as CampoEnderecoViaCep[]) {
            if (camposEnderecoManuais.current[campo]) continue
            proximo[campo] = retornados[campo]
            if (retornados[campo]) valoresViaCep.current[campo] = retornados[campo]
            else delete valoresViaCep.current[campo]
          }
          return proximo
        })
        setEstadoCep('encontrado')
      })
      .catch((erro: unknown) => {
        if (controlador.signal.aborted || requisicao !== requisicaoCepAtual.current) return
        if (erro instanceof DOMException && erro.name === 'AbortError') return
        setEstadoCep('erro')
      })

    return () => controlador.abort()
  }, [form.cep])

  const pacientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    if (!termo) return pacientes
    return pacientes.filter((paciente) => paciente.nome_completo.toLocaleLowerCase('pt-BR').includes(termo))
  }, [busca, pacientes])

  const pacientesExibidos = useMemo(() => ordenarPacientes(
    (modoBusca === 'cpf' ? (resultadoCpf ?? []) : pacientesFiltrados).filter((paciente) => correspondeAosFiltros(paciente, regrasFiltros)), ordem,
  ), [modoBusca, resultadoCpf, pacientesFiltrados, regrasFiltros, ordem])
  const listaPendente = modoBusca === 'nome' ? carregandoLista || consultaListaPendente : buscandoCpf
  const totalEncontrado = listaPendente || (modoBusca === 'nome' ? Boolean(erroLista) : resultadoCpf === null)
    ? null : modoBusca === 'nome' && !consultaCompleta ? totalConsulta : pacientesExibidos.length
  const pacienteSelecionado = selecao?.clinicaId === clinicaAtivaId && clinicaListaId === clinicaAtivaId
    && !listaPendente
    ? pacientesExibidos.find((paciente) => paciente.id === selecao.paciente.id) ?? null
    : null
  const chaveResumo = pacienteSelecionado && clinicaAtivaId ? `${clinicaAtivaId}:${pacienteSelecionado.id}` : null
  useEffect(() => {
    if (encaminhamentoAplicado.current || !pacienteEncaminhadoId || listaPendente || erroLista || clinicaListaId !== clinicaAtivaId || !clinicaAtivaId) return
    const paciente = pacientesExibidos.find(item => item.id === pacienteEncaminhadoId)
    encaminhamentoAplicado.current = true
    if (paciente) setSelecao({ clinicaId: clinicaAtivaId, paciente })
  }, [pacienteEncaminhadoId, listaPendente, erroLista, clinicaListaId, clinicaAtivaId, pacientesExibidos])
  const idadeSelecionada = pacienteSelecionado?.data_nascimento ? calcularIdade(pacienteSelecionado.data_nascimento, dataReferenciaLista) : null

  useEffect(() => {
    if (!listaPendente && selecao && !pacientesExibidos.some((paciente) => paciente.id === selecao.paciente.id)) {
      setSelecao(null)
      setMostrarAdicionarCpf(false)
    }
  }, [listaPendente, pacientesExibidos, selecao])

  useEffect(() => {
    const requisicao = ++requisicaoResumoAtual.current
    if (!pacienteSelecionado || !clinicaAtivaId || !chaveResumo) {
      setResumo(null)
      setCarregandoResumo(false)
      return
    }
    const clinicaDaConsulta = clinicaAtivaId
    const pacienteId = pacienteSelecionado.id
    setResumo(null)
    setCarregandoResumo(true)
    void Promise.allSettled([
      supabase.rpc('paciente_responsavel_legal_resumo', {
        p_paciente_id: pacienteId,
        p_clinica_id: clinicaDaConsulta,
      }),
      consultarCpfPendentePaciente(pacienteId, clinicaDaConsulta),
    ]).then(([responsaveis, cpf]) => {
      if (requisicao !== requisicaoResumoAtual.current) return
      const cpfPendente = cpf.status === 'fulfilled' ? cpf.value : null
      const respostaResponsaveis = responsaveis.status === 'fulfilled' ? responsaveis.value : null
      setResumo({ chave: chaveResumo, responsaveis: (respostaResponsaveis?.data ?? []) as ResponsavelResumo[], cpfPendente, erro: !respostaResponsaveis || Boolean(respostaResponsaveis.error), erroCpf: cpf.status === 'rejected' })
      setMostrarAdicionarCpf(cpfPendente === true && lembreteResumoAdiado.current !== chaveResumo)
    }).finally(() => {
      if (requisicao === requisicaoResumoAtual.current) setCarregandoResumo(false)
    })
  }, [chaveResumo, clinicaAtivaId, pacienteSelecionado, revisaoResumo])

  useEffect(() => {
    if (!chaveResumo) return
    resumoRef.current?.close()
    if (resumoDesktop) resumoRef.current?.show()
    else resumoRef.current?.showModal()
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflowAnterior = document.body.style.overflow
    if (!resumoDesktop) document.body.style.overflow = 'hidden'
    fecharResumoRef.current?.focus()
    function aoTeclar(evento: KeyboardEvent) {
      if (document.querySelector('.paciente-foto-modal[open], .paciente-edicao[open]')) return
      if (evento.key === 'Escape') {
        evento.preventDefault()
        setSelecao(null)
        setMostrarAdicionarCpf(false)
        return
      }
      if (resumoDesktop || evento.key !== 'Tab' || !resumoRef.current) return
      const focaveis = Array.from(resumoRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'))
      if (!focaveis.length) return
      if (evento.shiftKey && document.activeElement === focaveis[0]) {
        evento.preventDefault()
        focaveis[focaveis.length - 1].focus()
      } else if (!evento.shiftKey && document.activeElement === focaveis[focaveis.length - 1]) {
        evento.preventDefault()
        focaveis[0].focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
      if (gatilhoResumoRef.current?.isConnected) gatilhoResumoRef.current.focus()
      else anterior?.focus()
    }
  }, [chaveResumo, resumoDesktop])

  useEffect(() => {
    if (!pacienteFoto) return
    fotoModalRef.current?.showModal()
  }, [pacienteFoto])

  function mudarModoBusca(modo: 'nome' | 'cpf') {
    if (modo === modoBusca) return
    requisicaoCpfAtual.current += 1
    setBuscandoCpf(false)
    setModoBusca(modo)
    setResultadoCpf(null)
    setErroBuscaCpf(null)
    setSelecao(null)
    setResumo(null)
    setMostrarAdicionarCpf(false)
  }

  async function aplicarEdicaoConfirmada(atualizado: PacienteEdicao) {
    if (!edicao || atualizado.clinica_id !== clinicaAtivaId || atualizado.id !== edicao.pacienteId) return
    const clinicaDaEdicao = atualizado.clinica_id
    const manterResumo = edicaoIniciadaNoResumo.current
    edicaoIniciadaNoResumo.current = false
    const linha: PacienteListado = {
      id: atualizado.id, nome_completo: atualizado.nome_completo ?? '', data_nascimento: atualizado.data_nascimento,
      telefone: atualizado.telefone, sexo: atualizado.sexo, endereco: atualizado.endereco, ativo: atualizado.ativo,
      foto_path: atualizado.foto_path, created_at: atualizado.created_at,
    }
    setPacientes((atuais) => atuais.map((p) => p.id === linha.id ? linha : p))
    setResultadoCpf((atuais) => atuais?.map((p) => p.id === linha.id ? linha : p) ?? null)
    if (manterResumo) {
      setSelecao({ clinicaId: atualizado.clinica_id, paciente: linha })
      setRevisaoResumo((v) => v + 1)
    } else {
      setSelecao(null)
      setResumo(null)
      setMostrarAdicionarCpf(false)
    }
    const corresponde = correspondeAosFiltros(linha, regrasFiltros)
      && (modoBusca !== 'nome' || linha.nome_completo.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')))
    const descricaoSucesso = 'O cadastro do paciente foi atualizado com sucesso.'
    setFeedbackPagina({
      variant: 'success',
      title: 'Alterações salvas',
      description: corresponde
        ? descricaoSucesso
        : `${descricaoSucesso} O paciente saiu dos critérios atuais de busca ou filtro.`,
    })
    setEdicao(null)
    if (modoBusca !== 'nome') return
    setAtualizandoAposSalvar(true)
    const atualizada = await carregarPacientes(clinicaDaEdicao)
    if (clinicaAtivaRef.current !== clinicaDaEdicao || atualizada === null) return
    setAtualizandoAposSalvar(false)
    if (!atualizada) {
      setFeedbackPagina({
        variant: 'warning',
        title: 'Alterações salvas, mas não foi possível atualizar a lista.',
        description: 'O cadastro foi salvo. Atualize a lista para conferir os dados sem gravar novamente.',
        atualizarLista: true,
      })
    }
  }

  async function tentarAtualizarListaAposSalvar() {
    const clinicaDaTentativa = clinicaAtivaRef.current
    if (!clinicaDaTentativa || atualizandoAposSalvar) return
    setAtualizandoAposSalvar(true)
    const atualizada = await carregarPacientes(clinicaDaTentativa)
    if (clinicaAtivaRef.current !== clinicaDaTentativa || atualizada === null) return
    setAtualizandoAposSalvar(false)
    if (atualizada) {
      setFeedbackPagina({
        variant: 'success',
        title: 'Alterações salvas',
        description: 'O cadastro do paciente foi atualizado com sucesso.',
      })
    }
  }

  function selecionarPaciente(paciente: PacienteListado, gatilho: HTMLButtonElement) {
    if (!clinicaAtivaId) return
    gatilhoResumoRef.current = gatilho
    setFeedbackPagina(null)
    setSelecao({ clinicaId: clinicaAtivaId, paciente })
    setResumo(null)
    setMostrarAdicionarCpf(false)
  }

  function abrirEdicao(paciente: PacienteListado) {
    if (!podeAdministrar || !clinicaAtivaId || carregandoClinica || carregandoPapel || clinicaListaId !== clinicaAtivaId) return
    edicaoIniciadaNoResumo.current = pacienteSelecionado?.id === paciente.id
    setFeedbackPagina(null)
    setEdicao({ pacienteId: paciente.id, clinicaId: clinicaAtivaId, paciente })
  }

  function abrirAcaoDaEdicao(acao: 'foto' | 'cpf') {
    if (!edicao || !podeAdministrar || !clinicaAtivaId || edicao.clinicaId !== clinicaAtivaId || clinicaListaId !== clinicaAtivaId) return
    const paciente = edicao.paciente
    setSelecao({ clinicaId: clinicaAtivaId, paciente })
    setResumo(null)
    setMostrarAdicionarCpf(acao === 'cpf')
    setEdicao(null)
    if (acao === 'foto') void abrirGerenciadorFoto(paciente)
  }

  function fecharResumo() {
    if (pacienteFoto) fecharGerenciadorFoto()
    lembreteResumoAdiado.current = null
    setSelecao(null)
    setResumo(null)
    setMostrarAdicionarCpf(false)
  }

  async function pesquisarCpf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clinicaDaBusca = clinicaAtivaId
    const cpf = apenasDigitos(buscaCpf)
    setErroBuscaCpf(null)

    if (!clinicaDaBusca) return
    if (!cpf) {
      setResultadoCpf(null)
      return
    }
    if (!cpfValido(cpf)) {
      setResultadoCpf(null)
      setErroBuscaCpf('Confira o CPF informado. A busca exige os 11 dígitos válidos.')
      return
    }

    const requisicao = ++requisicaoCpfAtual.current
    setBuscandoCpf(true)
    try {
      const encontrados = await buscarPacientePorCpf(clinicaDaBusca, cpf)
      if (requisicao !== requisicaoCpfAtual.current) return
      // A RPC de CPF permanece intacta. Metadados não sensíveis somente dos IDs autorizados.
      if (encontrados.length) {
        const { data, error } = await supabase.from('pacientes').select('id, created_at, foto_path')
          .eq('clinica_id', clinicaDaBusca).in('id', encontrados.map((p) => p.id))
        if (requisicao !== requisicaoCpfAtual.current) return
        if (error || encontrados.some((p) => !data?.some((linha) => linha.id === p.id))) throw new Error('Metadados indisponíveis')
        setResultadoCpf(encontrados.map((p) => {
          const metadados = data!.find((linha) => linha.id === p.id)!
          return { ...p, created_at: metadados.created_at, foto_path: metadados.foto_path }
        }))
      } else setResultadoCpf([])
    } catch {
      if (requisicao !== requisicaoCpfAtual.current) return
      setResultadoCpf(null)
      setErroBuscaCpf('Não foi possível buscar o paciente por CPF nesta clínica.')
    } finally {
      if (requisicao === requisicaoCpfAtual.current) setBuscandoCpf(false)
    }
  }

  function limparBuscaCpf() {
    requisicaoCpfAtual.current += 1
    setBuscaCpf('')
    setBuscandoCpf(false)
    setResultadoCpf(null)
    setErroBuscaCpf(null)
    fecharResumo()
  }

  function removerBuscaLista() {
    setBusca('')
    limparBuscaCpf()
    mudarModoBusca('nome')
    requestAnimationFrame(() => buscaPacienteRef.current?.focus())
  }
  function limparFiltrosLista() {
    setFiltros(FILTROS_PACIENTES_INICIAIS)
    removerBuscaLista()
  }

  function atualizarComMascara(
    campo: 'cpf' | 'telefone' | 'cep' | 'responsavelTelefone' | 'responsavelCpf',
    input: HTMLInputElement,
    formatador: (valor: string) => string,
  ) {
    const cursor = input.selectionStart ?? input.value.length
    const digitosAntesDoCursor = apenasDigitos(input.value.slice(0, cursor)).length
    const valorFormatado = formatador(input.value)
    const posicao = posicaoAposDigitos(valorFormatado, digitosAntesDoCursor)
    selecaoFormatada.current = { input, valor: valorFormatado, inicio: posicao, fim: posicao }
    setForm((atual) => ({ ...atual, [campo]: valorFormatado }))
  }

  function registrarSelecaoAntesDaEdicao(campo: CampoTextoFormatado, input: HTMLInputElement) {
    selecaoAntesDaEdicao.current[campo] = {
      inicio: input.selectionStart ?? input.value.length,
      fim: input.selectionEnd ?? input.value.length,
      valor: input.value,
    }
  }

  function atualizarCampoTexto(campo: CampoTextoFormatado, input: HTMLInputElement, endereco = false) {
    const valor = input.value
    if (endereco && (campo === 'logradouro' || campo === 'bairro' || campo === 'cidade')) {
      camposEnderecoManuais.current[campo] = true
      delete valoresViaCep.current[campo]
    }

    if (camposEmComposicao.current[campo]) {
      setForm((atual) => ({ ...atual, [campo]: valor }))
      return
    }

    const selecaoDepois = {
      inicio: input.selectionStart ?? valor.length,
      fim: input.selectionEnd ?? valor.length,
    }
    const antes = selecaoAntesDaEdicao.current[campo]
    const preservadas = new Set(palavrasComGrafiaManual.current[campo] ?? [])

    if (!valor.trim() || (antes && antes.inicio === 0 && antes.fim === antes.valor.length)) {
      preservadas.clear()
    } else if (antes) {
      const indiceAnterior = indicePalavraNaPosicao(antes.valor, antes.inicio)
      if (indiceAnterior !== null) {
        const palavras = [...antes.valor.matchAll(/\S+/gu)]
        const palavra = palavras[indiceAnterior]
        const grafiaAnterior = palavra?.[0].toLocaleLowerCase('pt-BR')
        const inicioPalavra = palavra?.index ?? 0
        const fimPalavra = inicioPalavra + (palavra?.[0].length ?? 0)
        const cobrePalavra = antes.inicio <= inicioPalavra && antes.fim >= fimPalavra
        const edicaoInterna = antes.inicio > inicioPalavra && antes.inicio < fimPalavra
          || (antes.inicio === inicioPalavra && antes.fim > inicioPalavra && antes.fim < fimPalavra)
        if (grafiaAnterior) preservadas.delete(grafiaAnterior)
        if (!cobrePalavra && edicaoInterna) {
          const indiceAtual = indicePalavraNaPosicao(valor, selecaoDepois.inicio)
          const palavraAtual = indiceAtual === null ? undefined : [...valor.matchAll(/\S+/gu)][indiceAtual]?.[0]
          if (palavraAtual) preservadas.add(palavraAtual.toLocaleLowerCase('pt-BR'))
        }
      }
    }

    palavrasComGrafiaManual.current[campo] = preservadas
    const valorFormatado = formatarTextoPortuguesAoDigitar(valor, preservadas)
    // Restaura na propria atualizacao do React, antes da proxima interacao.
    // Um RAF atrasado podia desfazer a selecao de uma substituicao/colagem.
    selecaoFormatada.current = { input, valor: valorFormatado, ...selecaoDepois }
    setForm((atual) => ({ ...atual, [campo]: valorFormatado }))
  }

  function valorTextoParaSalvar(campo: CampoTextoFormatado, valor: string): string {
    const valorDoViaCep = campo === 'logradouro' || campo === 'bairro' || campo === 'cidade'
      ? valoresViaCep.current[campo] : undefined
    if (valorDoViaCep !== undefined && valor === valorDoViaCep) return normalizarEspacos(valor)
    return normalizarEspacos(formatarTextoPortuguesAoDigitar(
      valor,
      palavrasComGrafiaManual.current[campo],
    ))
  }

  function aplicarFormatacaoCampo(campo: CampoTextoFormatado) {
    setForm((atual) => {
      const valor = valorTextoParaSalvar(campo, atual[campo])
      return { ...atual, [campo]: valor }
    })
  }

  function normalizarFormulario(atual: FormPaciente): FormPaciente {
    const proximo = { ...atual }
    for (const campo of CAMPOS_TEXTO_FORMATADOS) {
      proximo[campo] = valorTextoParaSalvar(campo, atual[campo])
    }
    proximo.email = atual.email.trim()
    proximo.responsavelEmail = atual.responsavelEmail.trim()
    proximo.numero = atual.numero.trim()
    proximo.complemento = normalizarEspacos(atual.complemento)
    proximo.uf = atual.uf.trim().slice(0, 2).toLocaleUpperCase('pt-BR')
    proximo.observacoes = atual.observacoes.trim()
    return proximo
  }

  function abrirFormulario() {
    enviandoCadastro.current = false
    setForm({ ...FORM_INICIAL })
    setErroFormulario(null)
    setFeedbackPagina(null)
    setEstadoCep('inicial')
    setFotoCadastro(null)
    setFotoCadastroUrl((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      return null
    })
    setPacienteCriadoPendente(null)
    palavrasComGrafiaManual.current = {}
    selecaoAntesDaEdicao.current = {}
    camposEmComposicao.current = {}
    camposEnderecoManuais.current = {}
    valoresViaCep.current = {}
    setEtapaCadastro(1)
    setMostrarFormulario(true)
  }

  async function concluirCadastro(paciente: PacienteCriado) {
    setSalvando(false)
    setPacienteCriadoPendente(null)
    setFotoCadastro(null)
    setFotoCadastroUrl((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      return null
    })
    setMostrarFormulario(false)
    setRevisaoResumo(v => v + 1)
    setFeedbackPagina({ variant: 'success', title: 'Paciente cadastrado', description: 'Paciente cadastrado com sucesso.' })
    if (onPacienteCriado) {
      onPacienteCriado(paciente)
      return
    }
    await carregarPacientes(paciente.clinica_id)
  }

  async function enviarFotoDoCadastro(paciente: PacienteCriado) {
    if (!fotoCadastro) {
      await concluirCadastro(paciente)
      return
    }
    const resultado = await persistirFotoPaciente({
      pacienteId: paciente.id,
      clinicaId: paciente.clinica_id,
      arquivo: fotoCadastro,
    })
    if (resultado.limpezaPendente) {
      setFeedbackPagina({ variant: 'warning', title: 'Foto salva com pendência', description: 'Foto vinculada; há uma limpeza técnica pendente no armazenamento.' })
    }
    await concluirCadastro(paciente)
  }

  async function abrirGerenciadorFoto(paciente: PacienteListado) {
    if (!clinicaAtivaId) return
    const requisicao = ++requisicaoFotoAtual.current
    const clinicaDaFoto = clinicaAtivaId
    setProcessandoFoto(false)
    setPacienteFoto(paciente)
    setErroFotoAdministrativa(null)
    setFotoAtualUrl((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      return null
    })
    setCarregandoFoto(true)
    try {
      const objectPath = paciente.foto_path || await obterCaminhoFotoPaciente({
        clinicaId: clinicaDaFoto,
        pacienteId: paciente.id,
      })
      if (requisicao !== requisicaoFotoAtual.current || !objectPath) return
      setPacienteFoto((atual) => atual ? { ...atual, foto_path: objectPath } : atual)
      const blob = await carregarFotoPaciente({ clinicaId: clinicaDaFoto, objectPath })
      if (requisicao !== requisicaoFotoAtual.current) return
      setFotoAtualUrl(URL.createObjectURL(blob))
    } catch (causa) {
      if (requisicao !== requisicaoFotoAtual.current) return
      setErroFotoAdministrativa(causa instanceof Error ? causa.message : 'Não foi possível carregar a foto.')
    } finally {
      if (requisicao === requisicaoFotoAtual.current) setCarregandoFoto(false)
    }
  }

  function fecharGerenciadorFoto() {
    requisicaoFotoAtual.current += 1
    setPacienteFoto(null)
    setErroFotoAdministrativa(null)
    setFotoAtualUrl((url) => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
      return null
    })
  }

  function avancarCadastro() {
    setErroFormulario(null)
    const dados = normalizarFormulario(form)
    setForm(dados)
    if (!dados.nomeCompleto) {
      setErroFormulario('Informe o nome completo do paciente.')
      return
    }
    const idadeInformada = calcularIdade(dados.dataNascimento)
    if (idadeInformada === null) {
      setErroFormulario('Informe uma data de nascimento válida para definir o fluxo de cadastro. A regra para data ainda não informada permanece pendente.')
      return
    }
    const cpfDigitos = apenasDigitos(dados.cpf)
    if (cpfDigitos && !cpfValido(cpfDigitos)) {
      setErroFormulario('Confira o CPF informado. Ele deve ter 11 dígitos válidos.')
      return
    }
    if (idadeInformada < 18 && etapaCadastro === 1) {
      setEtapaCadastro(2)
      return
    }
    if (idadeInformada < 18 && (!dados.responsavelNome || !dados.responsavelVinculo || ![10, 11].includes(apenasDigitos(dados.responsavelTelefone).length))) {
      setErroFormulario('Para concluir o cadastro de um menor, informe nome completo, vínculo e Telefone / WhatsApp do responsável legal.')
      return
    }
    if (idadeInformada < 18 && apenasDigitos(dados.responsavelCpf) && !cpfValido(apenasDigitos(dados.responsavelCpf))) {
      setErroFormulario('Confira o CPF opcional do responsável legal.')
      return
    }
    setEtapaCadastro(3)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (enviandoCadastro.current) return
    if (pacienteCriadoPendente) {
      enviandoCadastro.current = true
      setSalvando(true)
      setErroFormulario(null)
      try {
        await enviarFotoDoCadastro(pacienteCriadoPendente)
      } catch (causa) {
        setErroFormulario(causa instanceof Error ? causa.message : 'O paciente foi salvo, mas a foto não foi enviada.')
        setSalvando(false)
      } finally {
        enviandoCadastro.current = false
      }
      return
    }
    const formulario = event.currentTarget
    if (!formulario.checkValidity()) {
      formulario.reportValidity()
      return
    }

    setErroFormulario(null)
    const dados = normalizarFormulario(form)
    setForm(dados)

    if (!clinicaAtivaId) {
      setErroFormulario('Nenhuma clínica ativa encontrada para o seu usuário.')
      return
    }

    if (!dados.nomeCompleto) {
      setErroFormulario('Informe o nome completo do paciente.')
      return
    }
    const idadeInformada = calcularIdade(dados.dataNascimento)
    if (idadeInformada === null) {
      setErroFormulario('Informe uma data de nascimento válida para definir o fluxo de cadastro.')
      return
    }

    const cpfDigitos = apenasDigitos(dados.cpf)
    if (cpfDigitos && !cpfValido(cpfDigitos)) {
      setErroFormulario('Confira o CPF informado. Ele deve ter 11 dígitos válidos.')
      return
    }
    if (idadeInformada < 18 && (!dados.responsavelNome || !dados.responsavelVinculo || ![10, 11].includes(apenasDigitos(dados.responsavelTelefone).length))) {
      setErroFormulario('Para concluir o cadastro de um menor, informe nome completo, vínculo e Telefone / WhatsApp do responsável legal.')
      return
    }
    if (idadeInformada < 18 && apenasDigitos(dados.responsavelCpf) && !cpfValido(apenasDigitos(dados.responsavelCpf))) {
      setErroFormulario('Confira o CPF opcional do responsável legal.')
      return
    }

    const telefoneDigitos = apenasDigitos(dados.telefone)
    if (telefoneDigitos && ![10, 11].includes(telefoneDigitos.length)) {
      setErroFormulario('Informe um telefone com DDD e 10 ou 11 dígitos.')
      return
    }

    const cepDigitos = apenasDigitos(dados.cep)
    if (cepDigitos && cepDigitos.length !== 8) {
      setErroFormulario('Informe um CEP com 8 dígitos ou deixe o campo vazio.')
      return
    }

    enviandoCadastro.current = true
    setSalvando(true)

    try {
      if (idadeInformada < 18) {
        const parametrosMenor = {
          p_clinica_id: clinicaAtivaId,
          p_nome_completo: dados.nomeCompleto,
          p_data_nascimento: dados.dataNascimento,
          p_responsavel_nome: dados.responsavelNome,
          p_responsavel_vinculo: dados.responsavelVinculo,
          p_responsavel_telefone: dados.responsavelTelefone,
          p_cpf: cpfDigitos || null,
          p_sexo: dados.sexo,
          p_telefone: dados.telefone || null,
          p_email: dados.email || null,
          p_endereco: comporEnderecoPaciente(dados),
          p_observacoes: dados.observacoes || null,
          p_responsavel_cpf: apenasDigitos(dados.responsavelCpf) || null,
          p_responsavel_email: dados.responsavelEmail || null,
          p_endereco_componentes: {
            cep: dados.cep || null,
            logradouro: dados.logradouro || null,
            numero: dados.numero || null,
            complemento: dados.complemento || null,
            bairro: dados.bairro || null,
            cidade: dados.cidade || null,
            uf: dados.uf || null,
          },
        }
        const { data, error } = await supabase.rpc('paciente_menor_criar_com_responsavel', parametrosMenor)
        if (error) {
          setErroFormulario(error.code === '23505' ? 'Já existe um paciente com este CPF cadastrado nesta clínica.' : 'Não foi possível salvar paciente e responsável. Nenhum cadastro foi concluído.')
          setSalvando(false)
          return
        }
        const linha = Array.isArray(data) ? data[0] : data
        if (!linha?.id || linha.clinica_id !== clinicaAtivaId) throw new Error('Retorno inesperado do cadastro do menor.')
        const criado = { id: linha.id as string, nome_completo: linha.nome_completo as string, clinica_id: linha.clinica_id as string }
        if (fotoCadastro) {
          try { await enviarFotoDoCadastro(criado) }
          catch (causa) {
            setPacienteCriadoPendente(criado)
            setErroFormulario(causa instanceof Error ? causa.message : 'Paciente e responsável foram salvos, mas a foto não foi enviada.')
            setSalvando(false)
          }
        } else await concluirCadastro(criado)
        return
      }
      let cpfEncrypted: string | null = null
      let cpfHash: string | null = null
      if (cpfDigitos) {
        [cpfEncrypted, cpfHash] = await Promise.all([
          criptografarCpf(cpfDigitos),
          gerarHashCpf(cpfDigitos),
        ])
      }

      const { data: pacienteCriado, error } = await supabase.from('pacientes').insert({
        clinica_id: clinicaAtivaId,
        nome_completo: dados.nomeCompleto,
        cpf_encrypted: cpfEncrypted,
        cpf_hash: cpfHash,
        data_nascimento: dados.dataNascimento || null,
        sexo: dados.sexo,
        telefone: dados.telefone || null,
        email: dados.email || null,
        endereco: comporEnderecoPaciente(dados),
        observacoes: dados.observacoes || null,
        created_by: usuarioId,
        cep: dados.cep || null,
        logradouro: dados.logradouro || null,
        numero: dados.numero || null,
        complemento: dados.complemento || null,
        bairro: dados.bairro || null,
        cidade: dados.cidade || null,
        uf: dados.uf || null,
      }).select('id, nome_completo').single()

      if (error) {
        if (error.code === '23505') {
          setErroFormulario('Já existe um paciente com este CPF cadastrado nesta clínica.')
        } else {
          setErroFormulario('Não foi possível salvar o paciente. Tente novamente.')
        }
        setSalvando(false)
        return
      }

      if (!pacienteCriado) throw new Error('Paciente criado sem retorno de identificação.')
      const criado = { ...pacienteCriado, clinica_id: clinicaAtivaId }
      if (fotoCadastro) {
        try {
          await enviarFotoDoCadastro(criado)
        } catch (causa) {
          setPacienteCriadoPendente(criado)
          setErroFormulario(causa instanceof Error ? causa.message : 'O paciente foi salvo, mas a foto não foi enviada.')
          setSalvando(false)
        }
        return
      }
      await concluirCadastro(criado)
    } catch {
      setErroFormulario('Não foi possível salvar o paciente. Tente novamente.')
      setSalvando(false)
    } finally {
      enviandoCadastro.current = false
    }
  }

  if (!carregandoPapel && !podeAdministrar) {
    return (
      <FeedbackAlert variant="destructive" title="Acesso não autorizado" description="Você não tem permissão para acessar o cadastro administrativo de pacientes." urgent />
    )
  }

  if (carregandoClinica || carregandoPapel || clinicaListaId !== clinicaAtivaId) {
    return (
      <div role="status" className="rounded-[18px] bg-[var(--fundo-card)] p-8 text-center text-sm text-[var(--texto-secundario)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
        Carregando contexto da clínica...
      </div>
    )
  }

  const alertaResultado = feedbackPagina && (
    <div className="pacientes-feedback-resultado">
      <FeedbackAlert
        variant={feedbackPagina.variant}
        title={feedbackPagina.title}
        description={feedbackPagina.description}
        action={feedbackPagina.atualizarLista ? (
          <button type="button" disabled={atualizandoAposSalvar} onClick={() => void tentarAtualizarListaAposSalvar()}>
            {atualizandoAposSalvar ? 'Atualizando…' : 'Atualizar lista'}
          </button>
        ) : undefined}
        onClose={() => setFeedbackPagina(null)}
        autoDismissMs={feedbackPagina.variant === 'success' ? 6000 : undefined}
      />
    </div>
  )

  return (
    <div className="pacientes-pagina">
      <ConfirmacaoDialog open={confirmarDescarteCadastro} onOpenChange={setConfirmarDescarteCadastro}
        title={pacienteCriadoPendente ? 'Fechar cadastro salvo com pendência?' : 'Descartar cadastro não salvo?'}
        description={pacienteCriadoPendente ? 'O cadastro já salvo será preservado. A foto ainda não enviada será descartada ao fechar.' : 'Os dados digitados e a foto selecionada serão descartados. Nenhum paciente será cadastrado.'}
        confirmLabel="Descartar cadastro" cancelLabel="Continuar preenchendo" tone="warning" disabled={salvando}
        onConfirm={fecharFormularioSemDescarte} />
      {edicao && edicao.clinicaId === clinicaAtivaId && podeAdministrar && !carregandoClinica && !carregandoPapel && <EditarPaciente key={`${edicao.clinicaId}:${edicao.pacienteId}`} pacienteId={edicao.pacienteId} clinicaId={edicao.clinicaId} clinicaNome={clinicaNome || 'Clínica selecionada'} podeCorrigirCpf={papel === 'proprietaria'} onFechar={() => setEdicao(null)} onSalvo={aplicarEdicaoConfirmada} onGerenciarFoto={() => abrirAcaoDaEdicao('foto')} onAdicionarCpf={() => abrirAcaoDaEdicao('cpf')} />}
      <header className="pacientes-pagina-cabecalho">
        <div className="pacientes-pagina-identidade">
          <span className="pacientes-pagina-icone" aria-hidden="true"><IconePessoas /></span>
          <div>
            <h1 className="texto-titulo-tela text-[var(--texto-principal)]">Pacientes</h1>
            <p className="pacientes-pagina-clinica">Cadastros de <strong>{clinicaNome || 'clínica selecionada'}</strong></p>
          </div>
        </div>

        {!mostrarFormulario && (
          <button
            ref={gatilhoNovoPacienteRef}
            type="button"
            onClick={abrirFormulario}
            disabled={!clinicaAtivaId}
            className="pacientes-botao-primario"
          >
            <IconeMais /> Novo paciente
          </button>
        )}
      </header>

      {!mostrarFormulario && <IndicadoresPacientes clinicaId={clinicaAtivaId} revisao={revisaoResumo} />}
      {pacienteEncaminhadoId && <FeedbackAlert variant="warning" title="Cadastro encaminhado pelo painel"
        description={!listaPendente && !erroLista && !pacientesExibidos.length ? 'Cadastro não encontrado entre os pacientes ativos autorizados desta clínica.' : 'Exibindo somente o cadastro selecionado no Dashboard.'}
        action={<button className="pacientes-botao-secundario" onClick={() => { setPacienteEncaminhadoId(undefined); setSelecao(null) }}>Ver todos os pacientes</button>} />}

      {!pacienteSelecionado && alertaResultado}

      {mostrarFormulario && (
        <div className="paciente-modal-backdrop">
        <form
          ref={modalCadastroRef}
          onSubmit={handleSubmit}
          onChange={() => setErroFormulario(null)}
          className="paciente-modal"
          aria-label="Cadastrar novo paciente"
        >
          <header className="paciente-modal-cabecalho">
            <div className="paciente-modal-icone" aria-hidden="true">♙+</div>
            <div className="min-w-0 flex-1">
              <h2 className="paciente-modal-titulo">Cadastrar Novo Paciente</h2>
              <p className="paciente-modal-subtitulo">Cadastro administrativo na clínica selecionada</p>
            </div>
            <span className="paciente-rascunho">Dados ainda não salvos</span>
            <button
              type="button"
              onClick={fecharFormulario}
              className="paciente-modal-fechar"
              aria-label="Fechar cadastro de paciente"
            >
              ×
            </button>
          </header>

          <NavegacaoFormularioPaciente
            etapaAtual={idade !== null && idade >= 18 && etapaCadastro === 3 ? 2 : etapaCadastro}
            menor={idade !== null && idade < 18}
            onIrParaEtapa={(destino) => {
              if (destino === 1) setEtapaCadastro(1)
              else if (idade !== null && idade >= 18 && destino === 2) avancarCadastro()
              else if (destino < etapaCadastro) setEtapaCadastro(destino as 1 | 2 | 3)
              else avancarCadastro()
            }}
          />

          <fieldset className={`paciente-modal-scroll ${etapaCadastro === 3 ? 'paciente-modal-scroll-endereco' : ''}`} disabled={Boolean(pacienteCriadoPendente)}>
            {etapaCadastro === 1 && (
              <div className="paciente-aviso-real">
                <span aria-hidden="true">ⓘ</span>
                <p><strong>Cadastro protegido por clínica.</strong> O CPF é opcional e, quando informado, é validado e verificado somente na clínica selecionada.</p>
              </div>
            )}

          <section className="paciente-secao" aria-labelledby="paciente-secao-titulo">
            <div className="paciente-secao-titulo-linha">
              <h3 id="paciente-secao-titulo">{etapaCadastro === 1 ? 'Identificação do Paciente' : etapaCadastro === 2 ? 'Responsável legal' : 'Endereço Residencial e Contatos'}</h3>
              <span>* Campo obrigatório</span>
            </div>
          <div className="paciente-form-grid">
            <div className={etapaCadastro === 1 ? 'paciente-foto-area' : 'paciente-oculto'}>
              <FotoPacienteCompacta avatar={fotoCadastroUrl ? <img src={fotoCadastroUrl} alt="" /> : <IconePessoas />}>
              {(visivel) => <>
              <EditorFotoPaciente
                ativo={etapaCadastro === 1 && visivel}
                nome={form.nomeCompleto}
                imagemAtualUrl={fotoCadastroUrl}
                disabled={salvando || Boolean(pacienteCriadoPendente)}
                onConfirmar={(arquivo) => {
                  setFotoCadastro(arquivo)
                  setFotoCadastroUrl((url) => {
                    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
                    return URL.createObjectURL(arquivo)
                  })
                }}
                onRemover={() => {
                  setFotoCadastro(null)
                  setFotoCadastroUrl((url) => {
                    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
                    return null
                  })
                }}
              />
              </>}
              </FotoPacienteCompacta>
              <PreviaIdentificacaoPaciente nome={form.nomeCompleto} nascimento={form.dataNascimento} sexo={form.sexo} />
            </div>
            <div className={etapaCadastro === 1 ? 'paciente-campo-nome' : 'paciente-oculto'}>
              <label htmlFor="paciente-nome" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Nome completo <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <input
                id="paciente-nome"
                type="text"
                required
                autoComplete="name"
                value={form.nomeCompleto}
                onBeforeInput={(e) => registrarSelecaoAntesDaEdicao('nomeCompleto', e.currentTarget)}
                onCompositionStart={() => { camposEmComposicao.current.nomeCompleto = true }}
                onCompositionEnd={(e) => {
                  camposEmComposicao.current.nomeCompleto = false
                  atualizarCampoTexto('nomeCompleto', e.currentTarget)
                }}
                onChange={(e) => atualizarCampoTexto('nomeCompleto', e.currentTarget)}
                onBlur={() => aplicarFormatacaoCampo('nomeCompleto')}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div className={etapaCadastro === 1 ? 'paciente-campo-cpf' : 'paciente-oculto'}>
              <label htmlFor="paciente-cpf" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                CPF <span className="font-normal text-[var(--texto-secundario)]">(opcional)</span>
              </label>
              <input
                id="paciente-cpf"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => atualizarComMascara('cpf', e.currentTarget, formatarCpf)}
                disabled={salvando}
                maxLength={14}
                aria-describedby="paciente-cpf-ajuda"
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
              <p id="paciente-cpf-ajuda" className="mt-1 text-xs text-[var(--texto-secundario)]">
                Pode ser informado depois. Não use um número fictício.
              </p>
            </div>

            <div className={etapaCadastro === 1 ? 'paciente-campo-data' : 'paciente-oculto'}>
              <div>
              <label htmlFor="paciente-data-nascimento" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Data de nascimento
              </label>
              <input
                id="paciente-data-nascimento"
                type="date"
                value={form.dataNascimento}
                onChange={(e) => setForm((f) => ({ ...f, dataNascimento: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
              </div>
              <div>
                <label htmlFor="paciente-idade" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">Idade</label>
                <input id="paciente-idade" type="text" readOnly value={idade === null ? '' : `${idade} anos`} placeholder="—" aria-label="Idade calculada pela data de nascimento" />
              </div>
            </div>

            <div className={etapaCadastro === 1 ? 'paciente-campo-sexo' : 'paciente-oculto'}>
              <label htmlFor="paciente-sexo" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Sexo
              </label>
              <select
                id="paciente-sexo"
                value={form.sexo}
                onChange={(e) => setForm((f) => ({ ...f, sexo: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              >
                {OPCOES_SEXO.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </div>

            {idade !== null && idade < 18 && (
              <fieldset className={etapaCadastro === 2 ? 'paciente-responsavel-grid' : 'paciente-oculto'}>
                <legend className="paciente-legenda-visualmente-oculta">Responsável legal</legend>
                <p>O menor mantém cadastro próprio nesta clínica. O contato não ativa mensagens nem concede acesso ao prontuário.</p>
                <div>
                  <label htmlFor="responsavel-nome">Nome completo *</label>
                  <input id="responsavel-nome" required={etapaCadastro === 2} value={form.responsavelNome}
                    onBeforeInput={(e) => registrarSelecaoAntesDaEdicao('responsavelNome', e.currentTarget)}
                    onCompositionStart={() => { camposEmComposicao.current.responsavelNome = true }}
                    onCompositionEnd={(e) => { camposEmComposicao.current.responsavelNome = false; atualizarCampoTexto('responsavelNome', e.currentTarget) }}
                    onChange={(e) => atualizarCampoTexto('responsavelNome', e.currentTarget)}
                    onBlur={() => aplicarFormatacaoCampo('responsavelNome')} />
                </div>
                <div>
                  <label htmlFor="responsavel-vinculo">Vínculo com o paciente *</label>
                  <input id="responsavel-vinculo" required={etapaCadastro === 2} value={form.responsavelVinculo}
                    onBeforeInput={(e) => registrarSelecaoAntesDaEdicao('responsavelVinculo', e.currentTarget)}
                    onCompositionStart={() => { camposEmComposicao.current.responsavelVinculo = true }}
                    onCompositionEnd={(e) => { camposEmComposicao.current.responsavelVinculo = false; atualizarCampoTexto('responsavelVinculo', e.currentTarget) }}
                    onChange={(e) => atualizarCampoTexto('responsavelVinculo', e.currentTarget)}
                    onBlur={() => aplicarFormatacaoCampo('responsavelVinculo')} />
                </div>
                <div>
                  <label htmlFor="responsavel-telefone">Telefone / WhatsApp *</label>
                  <input id="responsavel-telefone" type="tel" inputMode="tel" required={etapaCadastro === 2} value={form.responsavelTelefone}
                    onChange={(e) => atualizarComMascara('responsavelTelefone', e.currentTarget, formatarTelefoneBrasil)} maxLength={15} />
                </div>
                <div>
                  <label htmlFor="responsavel-cpf">CPF (opcional)</label>
                  <input id="responsavel-cpf" inputMode="numeric" value={form.responsavelCpf}
                    onChange={(e) => atualizarComMascara('responsavelCpf', e.currentTarget, formatarCpf)} maxLength={14} />
                </div>
                <div>
                  <label htmlFor="responsavel-email">E-mail (opcional)</label>
                  <input id="responsavel-email" type="email" value={form.responsavelEmail}
                    onChange={(e) => setForm((atual) => ({ ...atual, responsavelEmail: e.target.value }))} />
                </div>
              </fieldset>
            )}

            {etapaCadastro === 3 && <CamposEnderecoContatosPaciente
              idPrefixo="paciente"
              valor={form}
              estadoCep={estadoCep}
              disabled={salvando}
              onChange={(campo, valor, input) => {
                if (campo === 'cep' && input) atualizarComMascara('cep', input, formatarCep)
                else if ((campo === 'logradouro' || campo === 'bairro' || campo === 'cidade') && input) atualizarCampoTexto(campo, input, true)
                else if (campo === 'uf') {
                  camposEnderecoManuais.current.uf = true
                  delete valoresViaCep.current.uf
                  setForm((atual) => ({ ...atual, uf: valor.replace(/[^a-z]/gi, '').slice(0, 2).toLocaleUpperCase('pt-BR') }))
                } else setForm((atual) => ({ ...atual, [campo]: valor }))
              }}
              onBeforeInputTexto={(campo, input) => registrarSelecaoAntesDaEdicao(campo, input)}
              onCompositionStartTexto={(campo) => { camposEmComposicao.current[campo] = true }}
              onCompositionEndTexto={(campo, input) => { camposEmComposicao.current[campo] = false; atualizarCampoTexto(campo, input, true) }}
              onBlurTexto={aplicarFormatacaoCampo}
              telefone={form.telefone}
              email={form.email}
              observacoes={form.observacoes}
              onTelefoneChange={(input) => atualizarComMascara('telefone', input, formatarTelefoneBrasil)}
              onEmailChange={(valor) => setForm((atual) => ({ ...atual, email: valor }))}
              onObservacoesChange={(valor) => setForm((atual) => ({ ...atual, observacoes: valor }))}
            />}
          </div>
          </section>

          {erroFormulario && <div ref={erroFormularioRef} tabIndex={-1}><FeedbackAlert variant={pacienteCriadoPendente ? 'warning' : 'destructive'} title={pacienteCriadoPendente ? 'Cadastro salvo com pendência' : 'Não foi possível concluir'} description={erroFormulario} urgent={!pacienteCriadoPendente} /></div>}
          </fieldset>

          <footer className="paciente-modal-rodape">
            <p className="paciente-etapa-rodape">Etapa {etapaCadastro === 3 && !(idade !== null && idade < 18) ? 2 : etapaCadastro} de {idade !== null && idade < 18 ? 3 : 2} · {etapaCadastro === 1 ? 'Identificação' : etapaCadastro === 2 ? 'Responsável legal' : 'Endereço e contatos'}</p>
            <button
              type="button"
              onClick={fecharFormulario}
              disabled={salvando}
              className="paciente-botao-secundario paciente-cancelar"
            >
              Cancelar
            </button>
            {etapaCadastro !== 1 && <button type="button" onClick={() => setEtapaCadastro(etapaCadastro === 3 && idade !== null && idade < 18 ? 2 : 1)} disabled={salvando || Boolean(pacienteCriadoPendente)} className="paciente-botao-secundario">
              ← Voltar para {etapaCadastro === 3 && idade !== null && idade < 18 ? 'Responsável legal' : 'Identificação'}
            </button>}
            {pacienteCriadoPendente && (
              <button
                type="button"
                onClick={() => void concluirCadastro(pacienteCriadoPendente)}
                disabled={salvando}
                className="paciente-botao-secundario"
              >
                Concluir sem foto
              </button>
            )}
            {etapaCadastro !== 3 ? (
              <button type="button" onClick={avancarCadastro} disabled={salvando} className="paciente-botao-primario">
                Avançar para {etapaCadastro === 1 && idade !== null && idade < 18 ? 'Responsável legal' : 'Endereço e contatos'} →
              </button>
            ) : (
              <button type="button" onClick={() => modalCadastroRef.current?.requestSubmit()} disabled={salvando} className="paciente-botao-primario">
                {salvando ? 'Salvando...' : pacienteCriadoPendente ? 'Tentar enviar foto novamente' : 'Salvar paciente'}
              </button>
            )}
          </footer>
        </form>
        </div>
      )}

      {pacienteFoto && clinicaAtivaId && selecao?.clinicaId === clinicaAtivaId && (
          <dialog ref={fotoModalRef} className="paciente-foto-modal" aria-labelledby="paciente-foto-modal-titulo" onCancel={(evento) => { evento.preventDefault(); if (!processandoFoto) fecharGerenciadorFoto() }}>
            <header>
              <div>
                <h2 id="paciente-foto-modal-titulo">Foto do paciente</h2>
                <p>{pacienteFoto.nome_completo}</p>
              </div>
              <button type="button" onClick={fecharGerenciadorFoto} disabled={processandoFoto} aria-label="Fechar gerenciamento de foto">×</button>
            </header>
            {carregandoFoto ? (
              <p role="status" className="paciente-foto-carregando">Carregando foto protegida...</p>
            ) : (
              <EditorFotoPaciente
                nome={pacienteFoto.nome_completo}
                imagemAtualUrl={fotoAtualUrl}
                onCancelar={fecharGerenciadorFoto}
                onProcessando={setProcessandoFoto}
                onConfirmar={async (arquivo) => {
                  const requisicao = requisicaoFotoAtual.current
                  setErroFotoAdministrativa(null)
                  const resultado = await persistirFotoPaciente({
                    pacienteId: pacienteFoto.id,
                    clinicaId: clinicaAtivaId,
                    arquivo,
                  })
                  if (requisicao !== requisicaoFotoAtual.current) return
                  setPacientes((atuais) => atuais.map((item) => item.id === pacienteFoto.id
                    ? { ...item, foto_path: resultado.objectPath }
                    : item))
                  setResultadoCpf((atuais) => atuais?.map((item) => item.id === pacienteFoto.id ? { ...item, foto_path: resultado.objectPath } : item) ?? null)
                  setPacienteFoto((atual) => atual ? { ...atual, foto_path: resultado.objectPath } : atual)
                  if (resultado.limpezaPendente) {
                    setErroFotoAdministrativa('A nova foto foi salva, mas a limpeza do arquivo anterior precisa ser verificada.')
                  }
                }}
                onRemover={async () => {
                  if (!pacienteFoto.foto_path) return
                  const requisicao = requisicaoFotoAtual.current
                  setErroFotoAdministrativa(null)
                  const resultado = await removerFotoPaciente({
                    pacienteId: pacienteFoto.id,
                    clinicaId: clinicaAtivaId,
                  })
                  if (requisicao !== requisicaoFotoAtual.current) return
                  setPacientes((atuais) => atuais.map((item) => item.id === pacienteFoto.id
                    ? { ...item, foto_path: null }
                    : item))
                  setResultadoCpf((atuais) => atuais?.map((item) => item.id === pacienteFoto.id ? { ...item, foto_path: null } : item) ?? null)
                  setPacienteFoto((atual) => atual ? { ...atual, foto_path: null } : atual)
                  setFotoAtualUrl((url) => {
                    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
                    return null
                  })
                  if (resultado.limpezaPendente) {
                    setErroFotoAdministrativa('A foto foi desvinculada, mas a limpeza do arquivo precisa ser verificada.')
                  }
                }}
              />
            )}
            {erroFotoAdministrativa && <FeedbackAlert variant="warning" title="Foto salva com pendência" description={erroFotoAdministrativa} />}
          </dialog>
      )}

      {!mostrarFormulario && (
        <>
          <section className="pacientes-busca" aria-label="Busca de pacientes">
            <div className="pacientes-busca-cabecalho">
              <div className="pacientes-busca-titulo"><span className="pacientes-busca-icone" aria-hidden="true"><IconeLupa /></span><div><h2>Localizar paciente</h2><p>Pesquise os cadastros da clínica selecionada</p></div></div>
              <span className="pacientes-busca-status">{modoBusca === 'nome' ? 'Pacientes ativos' : 'Consulta exata na clínica'}</span>
            </div>
            <div className="pacientes-busca-controles">
              <div className="pacientes-busca-modos" aria-label="Buscar por" role="group">
                <button type="button" aria-pressed={modoBusca === 'nome'} onClick={() => mudarModoBusca('nome')}>Nome</button>
                <button type="button" aria-pressed={modoBusca === 'cpf'} onClick={() => mudarModoBusca('cpf')}>CPF exato</button>
              </div>
              {modoBusca === 'nome' ? (
                <label className="pacientes-busca-campo">
                  <span className="sr-only">Buscar paciente por nome</span>
                  <IconeLupa className="pacientes-busca-campo-icone" />
                  <input ref={buscaPacienteRef} type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar paciente por nome" />
                </label>
              ) : (
                <form onSubmit={pesquisarCpf} className="pacientes-busca-cpf">
                  <label className="pacientes-busca-campo">
                    <span className="sr-only">Buscar por CPF exato</span>
                    <IconeLupa className="pacientes-busca-campo-icone" />
                    <input ref={buscaPacienteRef} type="text" inputMode="numeric" autoComplete="off" value={buscaCpf}
                      onChange={(event) => { requisicaoCpfAtual.current += 1; setBuscandoCpf(false); setBuscaCpf(formatarCpf(event.target.value)); setErroBuscaCpf(null); setResultadoCpf(null); fecharResumo() }}
                      placeholder="000.000.000-00" maxLength={14} aria-describedby="busca-paciente-cpf-ajuda" />
                  </label>
                  <button type="submit" disabled={buscandoCpf || !apenasDigitos(buscaCpf)} className="pacientes-botao-primario">
                    {buscandoCpf ? 'Buscando...' : 'Buscar CPF'}
                  </button>
                  {(buscaCpf || resultadoCpf !== null) && <button type="button" onClick={limparBuscaCpf} className="pacientes-botao-secundario">Limpar</button>}
                </form>
              )}
            </div>
            {modoBusca === 'cpf' && <p id="busca-paciente-cpf-ajuda" className="pacientes-busca-ajuda">Informe os 11 dígitos. A busca consulta somente a clínica atual.</p>}
            {((modoBusca === 'nome' && busca.trim()) || (modoBusca === 'cpf' && (buscaCpf || resultadoCpf !== null))) && <div className="pacientes-busca-aplicada" role="group" aria-label="Busca aplicada"><button type="button" className="pacientes-filtro-removivel" aria-label={modoBusca === 'cpf' ? 'Remover busca por CPF' : 'Remover busca por nome'} onClick={removerBuscaLista}>{modoBusca === 'cpf' ? 'Busca por CPF exato' : 'Busca por nome'}<span aria-hidden="true">×</span></button></div>}
            {erroBuscaCpf && <p role="alert" className="pacientes-busca-erro">{erroBuscaCpf}</p>}
          </section>

          <div className={`pacientes-conteudo${pacienteSelecionado ? ' pacientes-conteudo--com-resumo' : ''}`}>
            <section className="pacientes-lista-area" aria-labelledby="pacientes-lista-titulo">
              <div className="pacientes-lista-card">
                <ControlesListaPacientes key={clinicaAtivaId} ordem={ordem} onOrdem={setOrdem}
                  filtros={filtros} onFiltros={setFiltros} total={totalEncontrado} />
                {listaPendente ? (
                  <div className="pacientes-estado pacientes-estado--carregando" role="status"><span className="pacientes-estado-icone" aria-hidden="true"><IconePessoas /></span><strong>Carregando pacientes…</strong><span>Aguarde a consulta da clínica atual.</span><div className="pacientes-esqueleto" aria-hidden="true"><i /><i /><i /></div></div>
                ) : !clinicaAtivaId ? (
                  <div className="pacientes-estado"><span className="pacientes-estado-icone" aria-hidden="true"><IconePessoas /></span><strong>Nenhuma clínica selecionada</strong><span>Selecione uma clínica autorizada para consultar pacientes.</span></div>
                ) : modoBusca === 'nome' && erroLista ? (
                  <div className="pacientes-estado" role="alert"><span className="pacientes-estado-icone" aria-hidden="true"><IconePessoas /></span><strong>Não foi possível carregar os pacientes</strong><span>{erroLista}</span><button type="button" className="pacientes-botao-secundario" onClick={() => void carregarPacientes(clinicaAtivaId)}>Tentar novamente</button></div>
                ) : modoBusca === 'cpf' && resultadoCpf === null ? (
                  <div className="pacientes-estado"><span className="pacientes-estado-icone" aria-hidden="true"><IconeLupa /></span><strong>Busca exata por CPF</strong><span>Informe um CPF válido e selecione “Buscar CPF”.</span></div>
                ) : modoBusca === 'nome' && !consultaCompleta ? (
                  <div className="pacientes-estado" role="status"><strong>Refine a busca ou os filtros</strong><span>Foram encontrados {totalConsulta} pacientes, acima da quantidade que pode ser exibida nesta consulta. Use um nome ou filtros mais específicos para ver todos os resultados, sem uma lista incompleta.</span></div>
                ) : modoBusca === 'nome' && pacientes.length === 0 && !busca.trim() && filtrosAtivos.length === 0 ? (
                  <div className="pacientes-estado"><span className="pacientes-estado-icone" aria-hidden="true"><IconePessoas /></span><strong>Nenhum paciente ativo cadastrado</strong><span>Use “Novo paciente” para iniciar um cadastro nesta clínica.</span><button type="button" className="pacientes-botao-primario" onClick={abrirFormulario}>Cadastrar paciente</button></div>
                ) : pacientesExibidos.length === 0 ? (
                  <div className="pacientes-estado"><span className="pacientes-estado-icone" aria-hidden="true"><IconeLupa /></span><strong>Nenhum resultado nesta clínica</strong><span>Tente outra busca ou ajuste os filtros aplicados.</span>{(filtrosAtivos.length > 0 || busca.trim() || modoBusca === 'cpf') && <button type="button" className="pacientes-botao-secundario" onClick={limparFiltrosLista}>Limpar busca e filtros</button>}</div>
                ) : (
                  <div role="table" aria-label="Pacientes encontrados">
                    <div className="pacientes-lista-colunas" role="row">
                      <span role="columnheader" aria-sort={ordem === 'nome_asc' ? 'ascending' : ordem === 'nome_desc' ? 'descending' : undefined}><button type="button" onClick={() => setOrdem(ordem === 'nome_asc' ? 'nome_desc' : 'nome_asc')}>Paciente <span aria-hidden="true">{ordem.startsWith('nome') ? ordem === 'nome_asc' ? '↑' : '↓' : ''}</span></button></span>
                      <span role="columnheader">Telefone / WhatsApp</span><span role="columnheader">Status</span><span role="columnheader">Ações</span>
                    </div>
                    <div className="pacientes-lista-itens" role="rowgroup">
                      {pacientesExibidos.map((paciente) => {
                        const idadePaciente = paciente.data_nascimento ? calcularIdade(paciente.data_nascimento, dataReferenciaLista) : null
                        const selecionado = pacienteSelecionado?.id === paciente.id
                        // Somente campos já recebidos na listagem; CPF desconhecido não oculta outras pendências.
                        const pendencias = avaliarPreenchimento(paciente, null).pendencias
                        return (
                          <div key={paciente.id} role="row" className={`pacientes-lista-linha${selecionado ? ' pacientes-lista-linha--selecionada' : ''}`}
                            onClick={(evento) => {
                              // Preserva o clique na linha; o botão continua sendo o alvo de teclado.
                              if ((evento.target as Element).closest('button')) return
                              const botao = evento.currentTarget.querySelector('button')
                              if (botao) selecionarPaciente(paciente, botao)
                            }}>
                              <span role="cell" className="pacientes-lista-identidade"><PacienteAvatar pacienteId={paciente.id} clinicaId={clinicaAtivaId} nome={paciente.nome_completo} caminho={paciente.foto_path} /><span><strong>{paciente.nome_completo}</strong><small>{idadePaciente === null ? 'Idade não informada' : `${idadePaciente} anos`}{OPCOES_SEXO.find(s => s.value === paciente.sexo)?.label ? ` · ${OPCOES_SEXO.find(s => s.value === paciente.sexo)?.label}` : ''}</small></span></span>
                              <span role="cell" className="pacientes-lista-dado pacientes-lista-telefone"><span className="pacientes-lista-dado-rotulo">Telefone / WhatsApp</span>{paciente.telefone ? formatarTelefoneBrasil(paciente.telefone) : 'Não informado'}</span>
                              <span role="cell" className="pacientes-lista-situacao"><span className={`pacientes-status pacientes-status--${paciente.ativo ? 'ativo' : 'inativo'}`}>{paciente.ativo ? 'Ativo' : 'Inativo'}</span>{pendencias.length > 0 && <small className="pacientes-lista-pendencia" title={`Informações ausentes: ${pendencias.join(', ')}`}>Dados a completar</small>}</span>
                              <span role="cell" className="pacientes-lista-acao">
                                <button type="button" aria-label={`Ver resumo de ${paciente.nome_completo}`} aria-pressed={selecionado} onClick={(evento) => { evento.stopPropagation(); selecionarPaciente(paciente, evento.currentTarget) }}>Ver resumo<IconeChevron /></button>
                                <button type="button" className="pacientes-lista-editar" aria-label={`Editar ${paciente.nome_completo}`} onClick={(evento) => { evento.stopPropagation(); abrirEdicao(paciente) }}><IconeLapis />Editar</button>
                              </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {pacienteSelecionado && clinicaAtivaId && (
              <>
                <dialog ref={resumoRef} className={`pacientes-resumo${resumoDesktop ? ' pacientes-resumo--lateral' : ''}`} onCancel={(evento) => { evento.preventDefault(); fecharResumo() }} aria-label={`Resumo do cadastro de ${pacienteSelecionado.nome_completo}`}>
                  <div className="pacientes-resumo-cabecalho"><h2>Resumo do cadastro</h2><button ref={fecharResumoRef} type="button" aria-label="Fechar resumo" onClick={fecharResumo}>×</button></div>
                  {alertaResultado}
                  <div className="pacientes-resumo-identidade">
                    <PacienteAvatar pacienteId={pacienteSelecionado.id} clinicaId={clinicaAtivaId} nome={pacienteSelecionado.nome_completo} caminho={pacienteSelecionado.foto_path} tamanho="resumo" />
                    <div><h3>{pacienteSelecionado.nome_completo}</h3><p>{idadeSelecionada !== null ? `${idadeSelecionada} anos` : 'Idade não informada'}</p><span className={`pacientes-status pacientes-status--${pacienteSelecionado.ativo ? 'ativo' : 'inativo'}`}>{pacienteSelecionado.ativo ? 'Ativo' : 'Inativo'}</span></div>
                  </div>
                  <div className="pacientes-resumo-editar">{onIrParaAgenda && <button type="button" className="pacientes-botao-primario" onClick={onIrParaAgenda}><IconeCalendario />Abrir agenda</button>}<button type="button" className="pacientes-botao-secundario" onClick={() => abrirEdicao(pacienteSelecionado)}><IconeLapis />Editar cadastro</button></div>
                  <div className="pacientes-resumo-bloco"><h4>Identificação</h4><dl><dt>Nascimento</dt><dd>{formatarData(pacienteSelecionado.data_nascimento)}</dd><dt>CPF</dt><dd>{carregandoResumo || resumo?.chave !== chaveResumo ? 'Consultando…' : resumo.erroCpf ? 'Consulta indisponível' : resumo.cpfPendente ? 'Não informado' : 'Informado'}</dd></dl>
                    {resumo?.chave === chaveResumo && resumo.cpfPendente === true && !mostrarAdicionarCpf && <button type="button" className="pacientes-link" onClick={() => setMostrarAdicionarCpf(true)}>Adicionar CPF</button>}
                    {mostrarAdicionarCpf && resumo?.chave === chaveResumo && resumo.cpfPendente === true && <AvisoCpfPendente key={chaveResumo} pacienteId={pacienteSelecionado.id} pacienteNome={pacienteSelecionado.nome_completo} clinicaId={clinicaAtivaId} contexto="cadastro" onAdicionado={() => { lembreteResumoAdiado.current = chaveResumo; setResumo((atual) => atual?.chave === chaveResumo ? { ...atual, cpfPendente: false } : atual); setMostrarAdicionarCpf(false) }} onLembrar={() => { lembreteResumoAdiado.current = chaveResumo; setMostrarAdicionarCpf(false) }} />}
                  </div>
                  <div className="pacientes-resumo-bloco"><h4>Contato</h4><dl><dt>Telefone / WhatsApp</dt><dd>{pacienteSelecionado.telefone ? formatarTelefoneBrasil(pacienteSelecionado.telefone) : 'Não informado'}</dd></dl></div>
                  <PreenchimentoCadastro key={`${chaveResumo}:${revisaoResumo}`} pacienteId={pacienteSelecionado.id} clinicaId={clinicaAtivaId}
                    dadosBasicos={pacienteSelecionado} cpfPendente={carregandoResumo || resumo?.chave !== chaveResumo ? null : resumo.cpfPendente}
                    cpfErro={resumo?.chave === chaveResumo && resumo.erroCpf} onVerificar={() => setRevisaoResumo(v => v + 1)} />
                  <div className="pacientes-resumo-bloco"><h4>Responsável legal</h4>{carregandoResumo || resumo?.chave !== chaveResumo ? <p>Consultando…</p> : resumo.erro ? <p>Não foi possível consultar este vínculo.</p> : resumo.responsaveis.length ? <ul className="pacientes-responsaveis">{resumo.responsaveis.map((responsavel) => <li key={responsavel.id}><strong>{responsavel.nome_completo}</strong><span>{responsavel.vinculo} · {formatarTelefoneBrasil(responsavel.telefone)}</span>{responsavel.email && <span>{responsavel.email}</span>}</li>)}</ul> : <p>Nenhum responsável vinculado neste cadastro.</p>}{resumo?.erro && <button type="button" className="pacientes-link" onClick={() => setRevisaoResumo((atual) => atual + 1)}>Tentar novamente</button>}</div>
                  <div className="pacientes-resumo-bloco"><h4>Endereço</h4><p className="pacientes-endereco-literal">{pacienteSelecionado.endereco || 'Não informado'}</p></div>
                  <div className="pacientes-resumo-acoes"><button type="button" className="pacientes-botao-secundario" onClick={() => void abrirGerenciadorFoto(pacienteSelecionado)}>Gerenciar foto</button></div>
                </dialog>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Pacientes
