import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { apenasDigitos, cpfValido, formatarCpf } from '../lib/cpf'
import { criptografarCpf, gerarHashCpf } from '../lib/cpfCripto'
import { buscarPacientePorCpf } from '../lib/pacienteCpf'
import {
  comporEnderecoPaciente,
  consultarCep,
  formatarCep,
  formatarTelefoneBrasil,
  formatarTextoPortugues,
  normalizarEspacos,
  obterIniciaisPaciente,
} from '../lib/pacienteFormulario'
import type { Papel } from '../hooks/usePapelNaClinica'
import './pacientes-cadastro.css'

interface PacienteListado {
  id: string
  nome_completo: string
  data_nascimento: string | null
  telefone: string | null
  endereco: string | null
  ativo: boolean
}

interface PacienteRow {
  id: string
  nome_completo: string
  data_nascimento: string | null
  telefone: string | null
  endereco: string | null
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
}

type CampoTextoFormatado = 'nomeCompleto' | 'logradouro' | 'bairro' | 'cidade'
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
}

const CAMPOS_TEXTO_FORMATADOS: CampoTextoFormatado[] = [
  'nomeCompleto',
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

function formatarData(data: string | null): string {
  if (!data) return '—'
  const [ano, mes, dia] = data.split('-')
  if (!ano || !mes || !dia) return data
  return `${dia}/${mes}/${ano}`
}

function calcularIdade(data: string): number | null {
  if (!data) return null
  const nascimento = new Date(`${data}T12:00:00`)
  if (Number.isNaN(nascimento.getTime()) || nascimento > new Date()) return null
  const hoje = new Date()
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const antesDoAniversario = hoje.getMonth() < nascimento.getMonth()
    || (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())
  if (antesDoAniversario) idade -= 1
  return idade
}

interface PacientesProps {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
  papel: Papel | null
  carregandoPapel: boolean
  usuarioId: string
  iniciarComCadastroAberto?: boolean
  onCancelarCadastro?: () => void
  onPacienteCriado?: (paciente: { id: string; nome_completo: string; clinica_id: string }) => void
}

function Pacientes({
  clinicaAtivaId,
  carregandoClinica,
  papel,
  carregandoPapel,
  usuarioId,
  iniciarComCadastroAberto = false,
  onCancelarCadastro,
  onPacienteCriado,
}: PacientesProps) {
  const podeAdministrar = papel === 'proprietaria' || papel === 'recepcao'
  const [pacientes, setPacientes] = useState<PacienteListado[]>([])
  const [busca, setBusca] = useState('')
  const [buscaCpf, setBuscaCpf] = useState('')
  const [resultadoCpf, setResultadoCpf] = useState<PacienteListado[] | null>(null)
  const [buscandoCpf, setBuscandoCpf] = useState(false)
  const [erroBuscaCpf, setErroBuscaCpf] = useState<string | null>(null)
  const requisicaoCpfAtual = useRef(0)
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [erroLista, setErroLista] = useState<string | null>(null)
  const requisicaoAtual = useRef(0)
  const [clinicaListaId, setClinicaListaId] = useState<string | null>(null)

  const [mostrarFormulario, setMostrarFormulario] = useState(iniciarComCadastroAberto)
  const [etapaCadastro, setEtapaCadastro] = useState<1 | 3>(1)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)
  const [estadoCep, setEstadoCep] = useState<EstadoCep>('inicial')
  const modalCadastroRef = useRef<HTMLFormElement>(null)
  const gatilhoNovoPacienteRef = useRef<HTMLButtonElement>(null)
  const camposJaFormatados = useRef<Partial<Record<CampoTextoFormatado, boolean>>>({})
  const camposCorrigidosManualmente = useRef<Partial<Record<CampoTextoFormatado, boolean>>>({})
  const camposEnderecoManuais = useRef<Partial<Record<CampoEnderecoViaCep, boolean>>>({})
  const valoresViaCep = useRef<Partial<Record<CampoEnderecoViaCep, string>>>({})
  const requisicaoCepAtual = useRef(0)
  const clinicaFormularioAnterior = useRef(clinicaAtivaId)

  const fecharFormulario = useCallback(() => {
    requisicaoCepAtual.current += 1
    setMostrarFormulario(false)
    setErroFormulario(null)
    setEstadoCep('inicial')
    onCancelarCadastro?.()
  }, [onCancelarCadastro])

  const carregarPacientes = useCallback(async (clinicaId: string) => {
    const requisicao = ++requisicaoAtual.current
    setCarregandoLista(true)
    setErroLista(null)

    const { data, error } = await supabase
      .from('pacientes')
      .select('id, nome_completo, data_nascimento, telefone, endereco')
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
    setForm(FORM_INICIAL)
    setErroFormulario(null)
    setMensagemSucesso(null)
    setBuscaCpf('')
    setResultadoCpf(null)
    setErroBuscaCpf(null)
    setBuscandoCpf(false)
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

  const pacientesExibidos = resultadoCpf ?? pacientesFiltrados
  const iniciaisPaciente = obterIniciaisPaciente(form.nomeCompleto)

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
  }

  function atualizarComMascara(
    campo: 'cpf' | 'telefone' | 'cep',
    input: HTMLInputElement,
    formatador: (valor: string) => string,
  ) {
    const cursor = input.selectionStart ?? input.value.length
    const digitosAntesDoCursor = apenasDigitos(input.value.slice(0, cursor)).length
    const valorFormatado = formatador(input.value)
    setForm((atual) => ({ ...atual, [campo]: valorFormatado }))

    requestAnimationFrame(() => {
      if (document.activeElement !== input) return
      const posicao = posicaoAposDigitos(valorFormatado, digitosAntesDoCursor)
      input.setSelectionRange(posicao, posicao)
    })
  }

  function atualizarCampoTexto(campo: CampoTextoFormatado, valor: string, endereco = false) {
    if (camposJaFormatados.current[campo]) {
      camposCorrigidosManualmente.current[campo] = true
    }
    if (endereco && campo !== 'nomeCompleto') {
      camposEnderecoManuais.current[campo] = true
      delete valoresViaCep.current[campo]
    }
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  function valorTextoParaSalvar(campo: CampoTextoFormatado, valor: string): string {
    const valorDoViaCep = campo === 'nomeCompleto' ? undefined : valoresViaCep.current[campo]
    if (valorDoViaCep !== undefined && valor === valorDoViaCep) return normalizarEspacos(valor)
    return camposCorrigidosManualmente.current[campo]
      ? normalizarEspacos(valor)
      : formatarTextoPortugues(valor)
  }

  function aplicarFormatacaoCampo(campo: CampoTextoFormatado) {
    setForm((atual) => {
      const valor = valorTextoParaSalvar(campo, atual[campo])
      camposJaFormatados.current[campo] = true
      return { ...atual, [campo]: valor }
    })
  }

  function normalizarFormulario(atual: FormPaciente): FormPaciente {
    const proximo = { ...atual }
    for (const campo of CAMPOS_TEXTO_FORMATADOS) {
      proximo[campo] = valorTextoParaSalvar(campo, atual[campo])
      if (atual[campo].trim()) camposJaFormatados.current[campo] = true
    }
    proximo.email = atual.email.trim()
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
    camposJaFormatados.current = {}
    camposCorrigidosManualmente.current = {}
    camposEnderecoManuais.current = {}
    valoresViaCep.current = {}
    setEtapaCadastro(1)
    setMostrarFormulario(true)
  }

  function avancarParaEndereco() {
    setErroFormulario(null)
    const dados = normalizarFormulario(form)
    setForm(dados)
    if (!dados.nomeCompleto) {
      setErroFormulario('Informe o nome completo do paciente.')
      return
    }
    const cpfDigitos = apenasDigitos(dados.cpf)
    if (cpfDigitos && !cpfValido(cpfDigitos)) {
      setErroFormulario('Confira o CPF informado. Ele deve ter 11 dígitos válidos.')
      return
    }
    setEtapaCadastro(3)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

    const cpfDigitos = apenasDigitos(dados.cpf)
    if (cpfDigitos && !cpfValido(cpfDigitos)) {
      setErroFormulario('Confira o CPF informado. Ele deve ter 11 dígitos válidos.')
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

      setSalvando(false)
      setMostrarFormulario(false)
      setMensagemSucesso('Paciente cadastrado com sucesso.')
      if (onPacienteCriado && pacienteCriado) {
        onPacienteCriado({ ...pacienteCriado, clinica_id: clinicaAtivaId })
        return
      }
      await carregarPacientes(clinicaAtivaId)
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

  if (carregandoClinica || carregandoPapel || (!!clinicaAtivaId && clinicaListaId !== clinicaAtivaId)) {
    return (
      <div role="status" className="rounded-[18px] bg-[var(--fundo-card)] p-8 text-center text-sm text-[var(--texto-secundario)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
        Carregando contexto da clínica...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="texto-titulo-tela text-[var(--texto-principal)]">Pacientes</h1>
            <p className="text-sm text-[var(--texto-secundario)]">
              Pacientes cadastrados na clínica.
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: 'var(--categoria-pessoas-fundo)' }}
          >
            <span
              className="numero-tabular text-sm font-semibold"
              style={{ color: 'var(--categoria-pessoas-valor)' }}
            >
              {pacientes.length}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--categoria-pessoas-label)' }}>
              {pacientes.length === 1 ? 'paciente' : 'pacientes'}
            </span>
          </div>
        </div>

        {!mostrarFormulario && (
          <button
            ref={gatilhoNovoPacienteRef}
            type="button"
            onClick={abrirFormulario}
            disabled={!clinicaAtivaId}
            className="rounded-xl bg-[var(--cor-primaria)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Novo paciente
          </button>
        )}
      </div>

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

          <nav className="paciente-etapas" aria-label="Etapas do cadastro">
            <button type="button" className={etapaCadastro === 1 ? 'ativa' : 'concluida'} onClick={() => setEtapaCadastro(1)}>
              <span className="paciente-etapa-numero">{etapaCadastro === 3 ? '✓' : '1'}</span>
              <span><strong>1. Identificação</strong><small>Dados do paciente</small></span>
            </button>
            <span className="indisponivel" aria-disabled="true"><span className="paciente-etapa-numero">2</span><span><strong>2. Convênio</strong><small>Não disponível</small></span></span>
            <button type="button" className={etapaCadastro === 3 ? 'ativa' : ''} onClick={avancarParaEndereco}>
              <span className="paciente-etapa-numero">3</span><span><strong>3. Endereço &amp; Contatos</strong><small>Cadastro disponível</small></span>
            </button>
            <span className="indisponivel" aria-disabled="true"><span className="paciente-etapa-numero">4</span><span><strong>4. Revisão</strong><small>Não disponível</small></span></span>
          </nav>

          <div className="paciente-modal-scroll">
            {etapaCadastro === 1 && (
              <div className="paciente-aviso-real">
                <span aria-hidden="true">ⓘ</span>
                <p><strong>Cadastro protegido por clínica.</strong> O CPF é opcional e, quando informado, é validado e verificado somente na clínica selecionada.</p>
              </div>
            )}

          <section className="paciente-secao" aria-labelledby="paciente-secao-titulo">
            <div className="paciente-secao-titulo-linha">
              <h3 id="paciente-secao-titulo">{etapaCadastro === 1 ? 'Identificação do Paciente' : 'Endereço Residencial e Contatos'}</h3>
              <span>* Campo obrigatório</span>
            </div>
          <div className="paciente-form-grid">
            {etapaCadastro === 1 && <div className="paciente-foto-reserva">
              <div className="paciente-avatar" aria-hidden="true">
                {iniciaisPaciente || (
                  <svg className="paciente-avatar-neutro" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4.5 20c.8-4.1 3.3-6.2 7.5-6.2s6.7 2.1 7.5 6.2" />
                  </svg>
                )}
              </div>
              <strong>Foto do paciente</strong>
              <p>Recurso não disponível neste cadastro.</p>
              <button type="button" disabled>Captura não disponível</button>
            </div>}
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
                onChange={(e) => atualizarCampoTexto('nomeCompleto', e.target.value)}
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
              {calcularIdade(form.dataNascimento) !== null && (
                <p className="mt-1 text-xs text-[var(--texto-secundario)]">
                  Idade calculada: {calcularIdade(form.dataNascimento)} anos
                </p>
              )}
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
                  onChange={(e) => atualizarCampoTexto('logradouro', e.target.value, true)}
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
                  onChange={(e) => atualizarCampoTexto('bairro', e.target.value, true)}
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
                    onChange={(e) => atualizarCampoTexto('cidade', e.target.value, true)}
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
                rows={3}
                className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
            </div>
          </div>
          </section>

          {etapaCadastro === 1 && (
            <section className="paciente-secao paciente-secao-reservada">
              <div><h3>Convênio e plano</h3><p>Área reservada. O cadastro atual não grava dados de convênio ou elegibilidade.</p></div>
              <span>Não disponível</span>
            </section>
          )}

          {etapaCadastro === 3 && (
            <p className="paciente-privacidade-pendente">
              O cadastro não registra autorização genérica de uso dos dados. Texto, finalidade e forma de consentimento dependem de aprovação específica.
            </p>
          )}

          {erroFormulario && (
            <p
              role="alert"
              className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]"
            >
              {erroFormulario}
            </p>
          )}
          </div>

          <footer className="paciente-modal-rodape">
            <button
              type="button"
              onClick={fecharFormulario}
              disabled={salvando}
              className="paciente-botao-secundario paciente-cancelar"
            >
              Cancelar
            </button>
            {etapaCadastro === 3 && <button type="button" onClick={() => setEtapaCadastro(1)} disabled={salvando} className="paciente-botao-secundario">
              ← Voltar para Identificação
            </button>}
            {etapaCadastro === 1 ? (
              <button type="button" onClick={avancarParaEndereco} disabled={salvando} className="paciente-botao-primario">
                Avançar para Endereço &amp; Contatos →
              </button>
            ) : (
              <button type="button" onClick={() => modalCadastroRef.current?.requestSubmit()} disabled={salvando} className="paciente-botao-primario">
                {salvando ? 'Salvando...' : 'Salvar paciente'}
              </button>
            )}
          </footer>
        </form>
        </div>
      )}

      {!mostrarFormulario && (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--texto-principal)]">
              Buscar paciente por nome
              <input
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Digite o nome"
                className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition placeholder:text-[var(--texto-terciario)] focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)]"
              />
            </label>
            <form onSubmit={pesquisarCpf} className="space-y-1.5">
              <label htmlFor="busca-paciente-cpf" className="block text-sm font-medium text-[var(--texto-principal)]">
                Buscar por CPF exato
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="busca-paciente-cpf"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={buscaCpf}
                  onChange={(event) => {
                    setBuscaCpf(formatarCpf(event.target.value))
                    setErroBuscaCpf(null)
                    if (resultadoCpf !== null) setResultadoCpf(null)
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  aria-describedby="busca-paciente-cpf-ajuda"
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition placeholder:text-[var(--texto-terciario)] focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)]"
                />
                <button
                  type="submit"
                  disabled={buscandoCpf || !apenasDigitos(buscaCpf)}
                  className="min-h-11 rounded-lg bg-[var(--cor-primaria)] px-4 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {buscandoCpf ? 'Buscando...' : 'Buscar CPF'}
                </button>
                {(buscaCpf || resultadoCpf !== null) && (
                  <button
                    type="button"
                    onClick={limparBuscaCpf}
                    className="min-h-11 rounded-lg border border-[var(--borda)] px-4 font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)]"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p id="busca-paciente-cpf-ajuda" className="text-xs text-[var(--texto-secundario)]">
                A busca exige o CPF completo e consulta somente a clínica selecionada.
              </p>
              {erroBuscaCpf && <p role="alert" className="text-sm text-[var(--cor-erro)]">{erroBuscaCpf}</p>}
            </form>
          </div>
          <div className="rounded-[18px] bg-[var(--fundo-card)]" style={{ boxShadow: 'var(--sombra-neutra)' }}>
          {carregandoClinica || carregandoPapel || carregandoLista ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">Carregando...</p>
          ) : !clinicaAtivaId ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">
              Nenhuma clínica vinculada ao seu usuário.
            </p>
          ) : erroLista ? (
            <p className="p-8 text-center text-sm text-[var(--cor-erro)]">{erroLista}</p>
          ) : resultadoCpf === null && pacientes.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">
              Nenhum paciente cadastrado ainda.
            </p>
          ) : pacientesExibidos.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">
              {resultadoCpf === null ? 'Nenhum paciente corresponde à busca.' : 'Nenhum paciente encontrado nesta clínica.'}
            </p>
          ) : (
            <>
              {/* Tabela — telas médias em diante */}
              <table className="hidden w-full text-left text-sm sm:table">
                <thead>
                  <tr className="border-b border-[var(--borda)] text-[var(--texto-secundario)]">
                    <th className="px-5 py-3 font-medium">Nome</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Nascimento</th>
                    <th className="px-5 py-3 font-medium">Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesExibidos.map((paciente) => (
                    <tr
                      key={paciente.id}
                      className="border-b border-[var(--borda)] text-[var(--texto-principal)] last:border-0"
                    >
                      <td className="px-5 py-3 font-medium">
                        {paciente.nome_completo}
                        {paciente.endereco && (
                          <details className="mt-1 font-normal text-[var(--texto-secundario)]">
                            <summary className="cursor-pointer text-xs font-medium text-[var(--cor-primaria)]">Ver endereço</summary>
                            <p className="mt-1 max-w-xl whitespace-normal text-xs">{paciente.endereco}</p>
                          </details>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">{paciente.ativo ? 'Ativo' : 'Inativo'}</td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">
                        {formatarData(paciente.data_nascimento)}
                      </td>
                      <td className="px-5 py-3 text-[var(--texto-secundario)]">
                        {paciente.telefone || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Cards — mobile */}
              <ul className="divide-y divide-[var(--borda)] sm:hidden">
                {pacientesExibidos.map((paciente) => (
                  <li key={paciente.id} className="space-y-1 p-4">
                    <p className="font-medium text-[var(--texto-principal)]">
                      {paciente.nome_completo}
                    </p>
                    {paciente.endereco && (
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-[var(--cor-primaria)]">Ver endereço</summary>
                        <p className="mt-1 text-sm text-[var(--texto-secundario)]">{paciente.endereco}</p>
                      </details>
                    )}
                    <p className="text-sm text-[var(--texto-secundario)]">Status: {paciente.ativo ? 'Ativo' : 'Inativo'}</p>
                    <p className="text-sm text-[var(--texto-secundario)]">
                      Nascimento: {formatarData(paciente.data_nascimento)}
                    </p>
                    <p className="text-sm text-[var(--texto-secundario)]">
                      Telefone: {paciente.telefone || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Pacientes
