import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
import { IconeCalendario, IconeChevron, IconeLupa, IconeMais, IconePessoas } from '../components/shell/icons'
import { calcularIdade } from '../lib/pacienteIdade'
import type { Papel } from '../hooks/usePapelNaClinica'
import './pacientes-cadastro.css'
import './pacientes-lista.css'

interface PacienteListado {
  id: string
  nome_completo: string
  data_nascimento: string | null
  telefone: string | null
  endereco: string | null
  ativo: boolean
  foto_path?: string | null
}

interface PacienteRow {
  id: string
  nome_completo: string
  data_nascimento: string | null
  telefone: string | null
  endereco: string | null
  foto_path: string | null
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

interface PacientesProps {
  clinicaAtivaId: string | null
  clinicaNome?: string | null
  carregandoClinica: boolean
  papel: Papel | null
  carregandoPapel: boolean
  usuarioId: string
  iniciarComCadastroAberto?: boolean
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
  onCancelarCadastro,
  onPacienteCriado,
  onIrParaAgenda,
}: PacientesProps) {
  const podeAdministrar = papel === 'proprietaria' || papel === 'recepcao'
  const [pacientes, setPacientes] = useState<PacienteListado[]>([])
  const [busca, setBusca] = useState('')
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
  const [resumo, setResumo] = useState<{ chave: string; responsaveis: ResponsavelResumo[]; cpfPendente: boolean | null; erro: boolean } | null>(null)
  const [carregandoResumo, setCarregandoResumo] = useState(false)
  const [mostrarAdicionarCpf, setMostrarAdicionarCpf] = useState(false)
  const [revisaoResumo, setRevisaoResumo] = useState(0)
  const [resumoMovel, setResumoMovel] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1100px)').matches)
  const requisicaoResumoAtual = useRef(0)
  const resumoRef = useRef<HTMLElement>(null)
  const fecharResumoRef = useRef<HTMLButtonElement>(null)
  const gatilhoResumoRef = useRef<HTMLButtonElement>(null)

  const [mostrarFormulario, setMostrarFormulario] = useState(iniciarComCadastroAberto)
  const [etapaCadastro, setEtapaCadastro] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState(FORM_INICIAL)
  const idade = calcularIdade(form.dataNascimento)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)
  const [estadoCep, setEstadoCep] = useState<EstadoCep>('inicial')
  const [fotoCadastro, setFotoCadastro] = useState<File | null>(null)
  const [fotoCadastroUrl, setFotoCadastroUrl] = useState<string | null>(null)
  const [pacienteCriadoPendente, setPacienteCriadoPendente] = useState<PacienteCriado | null>(null)
  const [pacienteFoto, setPacienteFoto] = useState<PacienteListado | null>(null)
  const [fotoAtualUrl, setFotoAtualUrl] = useState<string | null>(null)
  const [carregandoFoto, setCarregandoFoto] = useState(false)
  const [erroFotoAdministrativa, setErroFotoAdministrativa] = useState<string | null>(null)
  const requisicaoFotoAtual = useRef(0)
  const modalCadastroRef = useRef<HTMLFormElement>(null)
  const gatilhoNovoPacienteRef = useRef<HTMLButtonElement>(null)
  const palavrasComGrafiaManual = useRef<Partial<Record<CampoTextoFormatado, Set<string>>>>({})
  const selecaoAntesDaEdicao = useRef<Partial<Record<CampoTextoFormatado, SelecaoAntesDaEdicao>>>({})
  const camposEmComposicao = useRef<Partial<Record<CampoTextoFormatado, boolean>>>({})
  const camposEnderecoManuais = useRef<Partial<Record<CampoEnderecoViaCep, boolean>>>({})
  const valoresViaCep = useRef<Partial<Record<CampoEnderecoViaCep, string>>>({})
  const requisicaoCepAtual = useRef(0)
  const clinicaFormularioAnterior = useRef(clinicaAtivaId)

  const fecharFormulario = useCallback(() => {
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

  const carregarPacientes = useCallback(async (clinicaId: string) => {
    const requisicao = ++requisicaoAtual.current
    setCarregandoLista(true)
    setErroLista(null)

    const { data, error } = await supabase
      .from('pacientes')
      .select('id, nome_completo, data_nascimento, telefone, endereco, foto_path')
      .eq('clinica_id', clinicaId)
      .eq('ativo', true)
      .order('nome_completo', { ascending: true })

    if (error) {
      if (requisicao !== requisicaoAtual.current) return
      setPacientes([])
      setErroLista('Não foi possível carregar os pacientes.')
      setClinicaListaId(clinicaId)
      setCarregandoLista(false)
      return
    }

    if (requisicao !== requisicaoAtual.current) return
    setPacientes(((data ?? []) as PacienteRow[]).map((linha) => ({ ...linha, ativo: true })))
    setClinicaListaId(clinicaId)
    setCarregandoLista(false)
  }, [])

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

    carregarPacientes(clinicaAtivaId)
  }, [carregandoClinica, carregandoPapel, podeAdministrar, clinicaAtivaId, carregarPacientes])

  useEffect(() => {
    if (clinicaFormularioAnterior.current === clinicaAtivaId) return
    clinicaFormularioAnterior.current = clinicaAtivaId
    setMostrarFormulario(false)
    setEtapaCadastro(1)
    setForm(FORM_INICIAL)
    setErroFormulario(null)
    setMensagemSucesso(null)
    setBuscaCpf('')
    setBusca('')
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
    if (!mensagemSucesso) return
    const timeout = setTimeout(() => setMensagemSucesso(null), 5000)
    return () => clearTimeout(timeout)
  }, [mensagemSucesso])

  useEffect(() => {
    if (!mostrarFormulario) return
    const modal = modalCadastroRef.current
    const gatilho = gatilhoNovoPacienteRef.current
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modal?.querySelector<HTMLElement>('[aria-label="Fechar cadastro de paciente"]')?.focus()

    function aoTeclar(evento: KeyboardEvent) {
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

  const pacientesExibidos = modoBusca === 'cpf' ? (resultadoCpf ?? []) : pacientesFiltrados
  const pacienteSelecionado = selecao?.clinicaId === clinicaAtivaId && clinicaListaId === clinicaAtivaId
    ? pacientesExibidos.find((paciente) => paciente.id === selecao.paciente.id) ?? null
    : null
  const chaveResumo = pacienteSelecionado && clinicaAtivaId ? `${clinicaAtivaId}:${pacienteSelecionado.id}` : null

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1100px)')
    const atualizar = () => setResumoMovel(media.matches)
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [])

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
    void Promise.all([
      supabase.rpc('paciente_responsavel_legal_resumo', {
        p_paciente_id: pacienteId,
        p_clinica_id: clinicaDaConsulta,
      }),
      consultarCpfPendentePaciente(pacienteId, clinicaDaConsulta),
    ]).then(([responsaveis, cpfPendente]) => {
      if (requisicao !== requisicaoResumoAtual.current) return
      if (responsaveis.error) throw responsaveis.error
      setResumo({ chave: chaveResumo, responsaveis: (responsaveis.data ?? []) as ResponsavelResumo[], cpfPendente, erro: false })
    }).catch(() => {
      if (requisicao !== requisicaoResumoAtual.current) return
      setResumo({ chave: chaveResumo, responsaveis: [], cpfPendente: null, erro: true })
    }).finally(() => {
      if (requisicao === requisicaoResumoAtual.current) setCarregandoResumo(false)
    })
  }, [chaveResumo, clinicaAtivaId, pacienteSelecionado, revisaoResumo])

  useEffect(() => {
    if (!pacienteSelecionado || !resumoMovel) return
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    fecharResumoRef.current?.focus()
    function aoTeclar(evento: KeyboardEvent) {
      if (document.querySelector('.paciente-foto-modal-backdrop')) return
      if (evento.key === 'Escape') {
        evento.preventDefault()
        setSelecao(null)
        setMostrarAdicionarCpf(false)
        return
      }
      if (evento.key !== 'Tab' || !resumoRef.current) return
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
  }, [pacienteSelecionado, resumoMovel])

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

  function selecionarPaciente(paciente: PacienteListado, gatilho: HTMLButtonElement) {
    if (!clinicaAtivaId) return
    gatilhoResumoRef.current = gatilho
    setSelecao({ clinicaId: clinicaAtivaId, paciente })
    setResumo(null)
    setMostrarAdicionarCpf(false)
  }

  function fecharResumo() {
    if (pacienteFoto) fecharGerenciadorFoto()
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
      setResultadoCpf(encontrados)
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
    setResultadoCpf(null)
    setErroBuscaCpf(null)
    fecharResumo()
  }

  function atualizarComMascara(
    campo: 'cpf' | 'telefone' | 'cep' | 'responsavelTelefone' | 'responsavelCpf',
    input: HTMLInputElement,
    formatador: (valor: string) => string,
  ) {
    const cursor = input.selectionStart ?? input.value.length
    const digitosAntesDoCursor = apenasDigitos(input.value.slice(0, cursor)).length
    const valorFormatado = formatador(input.value)
    setForm((atual) => ({ ...atual, [campo]: valorFormatado }))

    requestAnimationFrame(() => {
      if (document.activeElement !== input || input.value !== valorFormatado) return
      const posicao = posicaoAposDigitos(valorFormatado, digitosAntesDoCursor)
      input.setSelectionRange(posicao, posicao)
    })
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
    setForm((atual) => ({ ...atual, [campo]: valorFormatado }))
    requestAnimationFrame(() => {
      if (document.activeElement !== input || input.value !== valorFormatado) return
      input.setSelectionRange(selecaoDepois.inicio, selecaoDepois.fim)
    })
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
    setForm({ ...FORM_INICIAL })
    setErroFormulario(null)
    setMensagemSucesso(null)
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
    setMensagemSucesso('Paciente cadastrado com sucesso.')
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
      setMensagemSucesso('Foto vinculada; há uma limpeza técnica pendente no armazenamento.')
    }
    await concluirCadastro(paciente)
  }

  async function abrirGerenciadorFoto(paciente: PacienteListado) {
    if (!clinicaAtivaId) return
    const requisicao = ++requisicaoFotoAtual.current
    const clinicaDaFoto = clinicaAtivaId
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
    if (pacienteCriadoPendente) {
      setSalvando(true)
      setErroFormulario(null)
      try {
        await enviarFotoDoCadastro(pacienteCriadoPendente)
      } catch (causa) {
        setErroFormulario(causa instanceof Error ? causa.message : 'O paciente foi salvo, mas a foto não foi enviada.')
        setSalvando(false)
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

    setSalvando(true)

    try {
      if (idadeInformada < 18) {
        const { data, error } = await supabase.rpc('paciente_menor_criar_com_responsavel', {
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
        })
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
    }
  }

  if (!carregandoPapel && !podeAdministrar) {
    return (
      <p role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-4 py-3 text-sm text-[var(--cor-erro)]">
        Você não tem permissão para acessar o cadastro administrativo de pacientes.
      </p>
    )
  }

  if (carregandoClinica || carregandoPapel || clinicaListaId !== clinicaAtivaId) {
    return (
      <div role="status" className="rounded-[18px] bg-[var(--fundo-card)] p-8 text-center text-sm text-[var(--texto-secundario)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
        Carregando contexto da clínica...
      </div>
    )
  }

  return (
    <div className="pacientes-pagina">
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

      {mensagemSucesso && (
        <p role="status" aria-live="polite" className="rounded-lg border border-[var(--cor-sucesso-borda)] bg-[var(--cor-sucesso-suave)] px-4 py-2.5 text-sm font-medium text-[var(--cor-sucesso)]">
          {mensagemSucesso}
        </p>
      )}

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

          <nav className={`paciente-etapas ${idade !== null && idade < 18 ? 'com-responsavel' : ''}`} aria-label="Etapas do cadastro">
            <button type="button" className={etapaCadastro === 1 ? 'ativa' : 'concluida'} onClick={() => setEtapaCadastro(1)}>
              <span className="paciente-etapa-numero">{etapaCadastro === 1 ? '1' : '✓'}</span>
              <span><strong>1. Identificação</strong><small>Dados do paciente</small></span>
            </button>
            <span className="paciente-etapa-planejada" role="note" aria-label="Convênios — Em planejamento">
              <span className="paciente-etapa-planejada-icone" aria-hidden="true">◇</span>
              <span><strong>Convênios</strong><small>Em planejamento</small></span>
            </span>
            {idade !== null && idade < 18 && (
              <button type="button" className={etapaCadastro === 2 ? 'ativa' : etapaCadastro === 3 ? 'concluida' : ''} onClick={() => etapaCadastro === 1 ? avancarCadastro() : setEtapaCadastro(2)}>
                <span className="paciente-etapa-numero">{etapaCadastro === 3 ? '✓' : '2'}</span>
                <span><strong>2. Responsável legal</strong><small>Vínculo do menor</small></span>
              </button>
            )}
            <button type="button" className={etapaCadastro === 3 ? 'ativa' : ''} onClick={avancarCadastro}>
              <span className="paciente-etapa-numero">{idade !== null && idade < 18 ? '3' : '2'}</span><span><strong>{idade !== null && idade < 18 ? '3' : '2'}. Endereço &amp; Contatos</strong><small>Dados de contato</small></span>
            </button>
          </nav>

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
              <EditorFotoPaciente
                ativo={etapaCadastro === 1}
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

            {etapaCadastro === 3 && (
              <div className="paciente-subsecao-titulo">
                <span aria-hidden="true">▣</span>
                <strong>Canais de contato</strong>
              </div>
            )}

            <div className={etapaCadastro === 3 ? 'paciente-contato-card' : 'paciente-oculto'}>
              <label htmlFor="paciente-telefone" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Telefone / WhatsApp
              </label>
              <input
                id="paciente-telefone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(e) => atualizarComMascara('telefone', e.currentTarget, formatarTelefoneBrasil)}
                disabled={salvando}
                maxLength={15}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <div className={etapaCadastro === 3 ? 'paciente-contato-card' : 'paciente-oculto'}>
              <label htmlFor="paciente-email" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                E-mail
              </label>
              <input
                id="paciente-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={salvando}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>

            <fieldset className={etapaCadastro === 3 ? 'paciente-endereco-grid' : 'paciente-oculto'}>
              <legend className="paciente-legenda-visualmente-oculta">Endereço e contatos</legend>

              <div>
                <label htmlFor="paciente-cep" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                  CEP
                </label>
                <input
                  id="paciente-cep"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={(e) => atualizarComMascara('cep', e.currentTarget, formatarCep)}
                  disabled={salvando}
                  maxLength={9}
                  aria-describedby="paciente-cep-status"
                  aria-invalid={estadoCep === 'nao_encontrado' || estadoCep === 'erro'}
                  className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
                />
                <p
                  id="paciente-cep-status"
                  role={estadoCep === 'nao_encontrado' || estadoCep === 'erro' ? 'alert' : 'status'}
                  aria-live="polite"
                  className={`mt-1 text-xs ${estadoCep === 'nao_encontrado' || estadoCep === 'erro' ? 'text-[var(--cor-erro)]' : 'text-[var(--texto-secundario)]'}`}
                >
                  {estadoCep === 'consultando' && 'Consultando CEP...'}
                  {estadoCep === 'encontrado' && 'Dados sugeridos pela consulta do CEP. Confira e corrija, se necessário.'}
                  {estadoCep === 'nao_encontrado' && 'CEP não encontrado. Preencha o endereço manualmente.'}
                  {estadoCep === 'erro' && 'Não foi possível consultar o CEP. Preencha manualmente.'}
                  {estadoCep === 'inicial' && 'Ao completar o CEP, cidade e UF serão consultadas.'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="paciente-logradouro" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                  Rua / logradouro
                </label>
                <input
                  id="paciente-logradouro"
                  type="text"
                  autoComplete="address-line1"
                  value={form.logradouro}
                  onBeforeInput={(e) => registrarSelecaoAntesDaEdicao('logradouro', e.currentTarget)}
                  onCompositionStart={() => { camposEmComposicao.current.logradouro = true }}
                  onCompositionEnd={(e) => {
                    camposEmComposicao.current.logradouro = false
                    atualizarCampoTexto('logradouro', e.currentTarget, true)
                  }}
                  onChange={(e) => atualizarCampoTexto('logradouro', e.currentTarget, true)}
                  onBlur={() => aplicarFormatacaoCampo('logradouro')}
                  disabled={salvando}
                  className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="paciente-numero" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                  Número
                </label>
                <input
                  id="paciente-numero"
                  type="text"
                  inputMode="text"
                  autoComplete="address-line2"
                  value={form.numero}
                  onChange={(e) => setForm((atual) => ({ ...atual, numero: e.target.value }))}
                  disabled={salvando}
                  className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="paciente-complemento" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                  Complemento
                </label>
                <input
                  id="paciente-complemento"
                  type="text"
                  value={form.complemento}
                  onChange={(e) => setForm((atual) => ({ ...atual, complemento: e.target.value }))}
                  disabled={salvando}
                  className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="paciente-bairro" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                  Bairro
                </label>
                <input
                  id="paciente-bairro"
                  type="text"
                  value={form.bairro}
                  onBeforeInput={(e) => registrarSelecaoAntesDaEdicao('bairro', e.currentTarget)}
                  onCompositionStart={() => { camposEmComposicao.current.bairro = true }}
                  onCompositionEnd={(e) => {
                    camposEmComposicao.current.bairro = false
                    atualizarCampoTexto('bairro', e.currentTarget, true)
                  }}
                  onChange={(e) => atualizarCampoTexto('bairro', e.currentTarget, true)}
                  onBlur={() => aplicarFormatacaoCampo('bairro')}
                  disabled={salvando}
                  className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
                />
              </div>

              <div className="paciente-cidade-uf">
                <div>
                  <label htmlFor="paciente-cidade" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                    Cidade
                  </label>
                  <input
                    id="paciente-cidade"
                    type="text"
                    autoComplete="address-level2"
                    value={form.cidade}
                    onBeforeInput={(e) => registrarSelecaoAntesDaEdicao('cidade', e.currentTarget)}
                    onCompositionStart={() => { camposEmComposicao.current.cidade = true }}
                    onCompositionEnd={(e) => {
                      camposEmComposicao.current.cidade = false
                      atualizarCampoTexto('cidade', e.currentTarget, true)
                    }}
                    onChange={(e) => atualizarCampoTexto('cidade', e.currentTarget, true)}
                    onBlur={() => aplicarFormatacaoCampo('cidade')}
                    disabled={salvando}
                    className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
                  />
                </div>
                <div>
                  <label htmlFor="paciente-uf" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                    UF
                  </label>
                  <input
                    id="paciente-uf"
                    type="text"
                    autoComplete="address-level1"
                    value={form.uf}
                    onChange={(e) => {
                      camposEnderecoManuais.current.uf = true
                      delete valoresViaCep.current.uf
                      setForm((atual) => ({ ...atual, uf: e.target.value.replace(/[^a-z]/gi, '').slice(0, 2).toLocaleUpperCase('pt-BR') }))
                    }}
                    disabled={salvando}
                    maxLength={2}
                    className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-center uppercase text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
                  />
                </div>
              </div>
            </fieldset>

            <div className={etapaCadastro === 3 ? 'paciente-observacoes' : 'paciente-oculto'}>
              <label htmlFor="paciente-observacoes" className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Observações
              </label>
              <textarea
                id="paciente-observacoes"
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                disabled={salvando}
                rows={2}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>
            {etapaCadastro === 3 && (
              <p className="paciente-privacidade-pendente">
                O cadastro não registra autorização genérica de uso dos dados. Texto, finalidade e forma de consentimento dependem de aprovação específica.
              </p>
            )}
          </div>
          </section>

          {erroFormulario && (
            <p
              role="alert"
              className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]"
            >
              {erroFormulario}
            </p>
          )}
          </fieldset>

          <footer className="paciente-modal-rodape">
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
                Avançar para {etapaCadastro === 1 && idade !== null && idade < 18 ? 'Responsável legal' : 'Endereço & Contatos'} →
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
        <div className="paciente-modal-backdrop paciente-foto-modal-backdrop">
          <section className="paciente-foto-modal" role="dialog" aria-modal="true" aria-labelledby="paciente-foto-modal-titulo">
            <header>
              <div>
                <h2 id="paciente-foto-modal-titulo">Foto do paciente</h2>
                <p>{pacienteFoto.nome_completo}</p>
              </div>
              <button type="button" onClick={fecharGerenciadorFoto} aria-label="Fechar gerenciamento de foto">×</button>
            </header>
            {carregandoFoto ? (
              <p role="status" className="paciente-foto-carregando">Carregando foto protegida...</p>
            ) : (
              <EditorFotoPaciente
                nome={pacienteFoto.nome_completo}
                imagemAtualUrl={fotoAtualUrl}
                onConfirmar={async (arquivo) => {
                  const resultado = await persistirFotoPaciente({
                    pacienteId: pacienteFoto.id,
                    clinicaId: clinicaAtivaId,
                    arquivo,
                  })
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
                  const resultado = await removerFotoPaciente({
                    pacienteId: pacienteFoto.id,
                    clinicaId: clinicaAtivaId,
                  })
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
            {erroFotoAdministrativa && <p role="alert" className="paciente-foto-alerta">{erroFotoAdministrativa}</p>}
          </section>
        </div>
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
                  <input type="search" value={busca} onChange={(event) => { setBusca(event.target.value); fecharResumo() }} placeholder="Buscar paciente por nome" />
                </label>
              ) : (
                <form onSubmit={pesquisarCpf} className="pacientes-busca-cpf">
                  <label className="pacientes-busca-campo">
                    <span className="sr-only">Buscar por CPF exato</span>
                    <IconeLupa className="pacientes-busca-campo-icone" />
                    <input type="text" inputMode="numeric" autoComplete="off" value={buscaCpf}
                      onChange={(event) => { setBuscaCpf(formatarCpf(event.target.value)); setErroBuscaCpf(null); setResultadoCpf(null); fecharResumo() }}
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
            {erroBuscaCpf && <p role="alert" className="pacientes-busca-erro">{erroBuscaCpf}</p>}
          </section>

          <div className={`pacientes-conteudo${pacienteSelecionado ? ' pacientes-conteudo--com-resumo' : ''}`}>
            <section className="pacientes-lista-area" aria-labelledby="pacientes-lista-titulo">
              <div className="pacientes-lista-card">
                <div className="pacientes-lista-cabecalho">
                  <div>
                    <h2 id="pacientes-lista-titulo">Pacientes cadastrados</h2>
                    <p>{modoBusca === 'nome' ? 'Pacientes ativos da clínica atual' : 'Resultado da busca exata por CPF'}</p>
                  </div>
                  <span className="pacientes-lista-contexto" aria-hidden="true"><IconePessoas /></span>
                </div>
                {carregandoLista ? (
                  <div className="pacientes-estado pacientes-estado--carregando" role="status"><span className="pacientes-estado-icone" aria-hidden="true"><IconePessoas /></span><strong>Carregando pacientes…</strong><span>Aguarde a consulta da clínica atual.</span><div className="pacientes-esqueleto" aria-hidden="true"><i /><i /><i /></div></div>
                ) : !clinicaAtivaId ? (
                  <div className="pacientes-estado"><span className="pacientes-estado-icone" aria-hidden="true"><IconePessoas /></span><strong>Nenhuma clínica selecionada</strong><span>Selecione uma clínica autorizada para consultar pacientes.</span></div>
                ) : modoBusca === 'nome' && erroLista ? (
                  <div className="pacientes-estado" role="alert"><span className="pacientes-estado-icone" aria-hidden="true"><IconePessoas /></span><strong>Não foi possível carregar os pacientes</strong><span>{erroLista}</span><button type="button" className="pacientes-botao-secundario" onClick={() => void carregarPacientes(clinicaAtivaId)}>Tentar novamente</button></div>
                ) : modoBusca === 'cpf' && resultadoCpf === null ? (
                  <div className="pacientes-estado"><span className="pacientes-estado-icone" aria-hidden="true"><IconeLupa /></span><strong>Busca exata por CPF</strong><span>Informe um CPF válido e selecione “Buscar CPF”.</span></div>
                ) : modoBusca === 'nome' && pacientes.length === 0 ? (
                  <div className="pacientes-estado"><span className="pacientes-estado-icone" aria-hidden="true"><IconePessoas /></span><strong>Nenhum paciente ativo cadastrado</strong><span>Use “Novo paciente” para iniciar um cadastro nesta clínica.</span></div>
                ) : pacientesExibidos.length === 0 ? (
                  <div className="pacientes-estado"><span className="pacientes-estado-icone" aria-hidden="true"><IconeLupa /></span><strong>Nenhum resultado nesta clínica</strong><span>{modoBusca === 'nome' ? 'Tente outro nome.' : 'Nenhum cadastro corresponde a esta busca exata na clínica atual.'}</span></div>
                ) : (
                  <>
                    <div className="pacientes-lista-colunas" aria-hidden="true"><span>Paciente</span><span>Nascimento / idade</span><span>Telefone / WhatsApp</span><span>Status</span><span>Ação</span></div>
                    <ul className="pacientes-lista-itens">
                      {pacientesExibidos.map((paciente) => {
                        const idadePaciente = paciente.data_nascimento ? calcularIdade(paciente.data_nascimento) : null
                        const selecionado = pacienteSelecionado?.id === paciente.id
                        return (
                          <li key={paciente.id}>
                            <button type="button" className={`pacientes-lista-linha${selecionado ? ' pacientes-lista-linha--selecionada' : ''}`}
                              aria-label={`Ver resumo de ${paciente.nome_completo}`} aria-pressed={selecionado}
                              onClick={(evento) => selecionarPaciente(paciente, evento.currentTarget)}>
                              <span className="pacientes-lista-identidade"><PacienteAvatar pacienteId={paciente.id} clinicaId={clinicaAtivaId} nome={paciente.nome_completo} caminho={paciente.foto_path} /><strong>{paciente.nome_completo}</strong></span>
                              <span className="pacientes-lista-dado"><span className="pacientes-lista-dado-rotulo">Nascimento</span><span>{formatarData(paciente.data_nascimento)}</span><small>{idadePaciente === null ? 'Idade não informada' : `${idadePaciente} anos`}</small></span>
                              <span className="pacientes-lista-dado pacientes-lista-telefone"><span className="pacientes-lista-dado-rotulo">Telefone / WhatsApp</span>{paciente.telefone ? formatarTelefoneBrasil(paciente.telefone) : 'Não informado'}</span>
                              <span><span className={`pacientes-status pacientes-status--${paciente.ativo ? 'ativo' : 'inativo'}`}>{paciente.ativo ? 'Ativo' : 'Inativo'}</span></span>
                              <span className="pacientes-lista-acao" aria-hidden="true"><span>Ver resumo</span><IconeChevron /></span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </div>
            </section>

            {pacienteSelecionado && clinicaAtivaId && (
              <>
                {resumoMovel && <button type="button" className="pacientes-resumo-fundo" aria-label="Fechar resumo do paciente" onClick={fecharResumo} />}
                <aside ref={resumoRef} className="pacientes-resumo" role={resumoMovel ? 'dialog' : 'complementary'} aria-modal={resumoMovel ? true : undefined} aria-label={`Resumo do cadastro de ${pacienteSelecionado.nome_completo}`}>
                  <div className="pacientes-resumo-cabecalho"><h2>Resumo do cadastro</h2><button ref={fecharResumoRef} type="button" aria-label="Fechar resumo" onClick={fecharResumo}>×</button></div>
                  <div className="pacientes-resumo-identidade">
                    <PacienteAvatar pacienteId={pacienteSelecionado.id} clinicaId={clinicaAtivaId} nome={pacienteSelecionado.nome_completo} caminho={pacienteSelecionado.foto_path} tamanho="resumo" />
                    <div><h3>{pacienteSelecionado.nome_completo}</h3><p>{pacienteSelecionado.data_nascimento && calcularIdade(pacienteSelecionado.data_nascimento) !== null ? `${calcularIdade(pacienteSelecionado.data_nascimento)} anos` : 'Idade não informada'}</p><span className={`pacientes-status pacientes-status--${pacienteSelecionado.ativo ? 'ativo' : 'inativo'}`}>{pacienteSelecionado.ativo ? 'Ativo' : 'Inativo'}</span></div>
                  </div>
                  <div className="pacientes-resumo-bloco"><h4>Dados do paciente</h4><dl><dt>Nascimento</dt><dd>{formatarData(pacienteSelecionado.data_nascimento)}</dd><dt>CPF</dt><dd>{carregandoResumo || resumo?.chave !== chaveResumo ? 'Consultando…' : resumo.erro ? 'Consulta indisponível' : resumo.cpfPendente ? 'Não informado' : 'Informado'}</dd><dt>Telefone / WhatsApp</dt><dd>{pacienteSelecionado.telefone ? formatarTelefoneBrasil(pacienteSelecionado.telefone) : 'Não informado'}</dd></dl>
                    {resumo?.chave === chaveResumo && resumo.cpfPendente === true && !mostrarAdicionarCpf && <button type="button" className="pacientes-link" onClick={() => setMostrarAdicionarCpf(true)}>Adicionar CPF</button>}
                    {mostrarAdicionarCpf && <AvisoCpfPendente key={chaveResumo} pacienteId={pacienteSelecionado.id} pacienteNome={pacienteSelecionado.nome_completo} clinicaId={clinicaAtivaId} contexto="cadastro" onAdicionado={() => { setResumo((atual) => atual?.chave === chaveResumo ? { ...atual, cpfPendente: false } : atual); setMostrarAdicionarCpf(false) }} onLembrar={() => setMostrarAdicionarCpf(false)} />}
                  </div>
                  <div className="pacientes-resumo-bloco"><h4>Responsável legal</h4>{carregandoResumo || resumo?.chave !== chaveResumo ? <p>Consultando…</p> : resumo.erro ? <p>Não foi possível consultar este vínculo.</p> : resumo.responsaveis.length ? <ul className="pacientes-responsaveis">{resumo.responsaveis.map((responsavel) => <li key={responsavel.id}><strong>{responsavel.nome_completo}</strong><span>{responsavel.vinculo} · {formatarTelefoneBrasil(responsavel.telefone)}</span>{responsavel.email && <span>{responsavel.email}</span>}</li>)}</ul> : <p>Nenhum responsável vinculado neste cadastro.</p>}{resumo?.erro && <button type="button" className="pacientes-link" onClick={() => setRevisaoResumo((atual) => atual + 1)}>Tentar novamente</button>}</div>
                  <div className="pacientes-resumo-bloco"><h4>Endereço</h4><p className="pacientes-endereco-literal">{pacienteSelecionado.endereco || 'Não informado'}</p></div>
                  <div className="pacientes-resumo-acoes"><button type="button" className="pacientes-botao-secundario" onClick={() => void abrirGerenciadorFoto(pacienteSelecionado)}>Gerenciar foto</button>{onIrParaAgenda && <button type="button" className="pacientes-botao-primario" onClick={onIrParaAgenda}><IconeCalendario /> Ir para Agenda</button>}</div>
                </aside>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Pacientes
