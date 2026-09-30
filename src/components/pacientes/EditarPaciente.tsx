import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { apenasDigitos, formatarCpf } from '../../lib/cpf'
import { comporEnderecoPaciente, consultarCep, formatarCep, formatarTelefoneBrasil, formatarTextoPortuguesAoDigitar, normalizarEspacos, type EnderecoPacienteFormulario } from '../../lib/pacienteFormulario'
import { calcularIdade } from '../../lib/pacienteIdade'
import { hojeNaBahia } from '../../lib/pacienteLista'
import { alteracoesAdministrativas, alteracoesEnderecoEstruturado, CAMPOS_EDICAO, CAMPOS_ENDERECO_EDICAO, mensagemErroEdicao, RESPONSAVEL_VAZIO, validarEdicao, type DadosEdicao, type PacienteEdicao, type ResponsavelEdicao } from '../../lib/pacienteEdicao'
import PacienteAvatar from './PacienteAvatar'
import { consultarCpfPendentePaciente, lerCpfPaciente } from '../../lib/pacienteCpf'
import { cpfLegadoInvalidoConfirmado } from '../../lib/pacienteCpfEstado'
import CorrigirCpfPaciente from './CorrigirCpfPaciente'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog'
import { CamposEnderecoContatosPaciente, NavegacaoFormularioPaciente, type EstadoConsultaCep } from './FormularioPacienteCompartilhado'
import './editar-paciente.css'

type Responsavel = { id: string; nome_completo: string; vinculo: string; telefone: string; email?: string | null }
const ENDERECO_VAZIO: EnderecoPacienteFormulario = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' }
interface Props {
  pacienteId: string
  clinicaId: string
  clinicaNome: string
  podeCorrigirCpf?: boolean
  onFechar: () => void
  onSalvo: (paciente: PacienteEdicao) => void
  onGerenciarFoto: () => void
  onAdicionarCpf: () => void
}

// A mesma normalização de criação, com opção explícita de grafia excepcional.
function TextoNome({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [manual, setManual] = useState(false)
  const compondo = useRef(false)
  function atualizar(input: HTMLInputElement) {
    const inicio = input.selectionStart, fim = input.selectionEnd
    if (!input.value) setManual(false)
    const texto = compondo.current || manual ? input.value : formatarTextoPortuguesAoDigitar(input.value)
    onChange(texto)
    requestAnimationFrame(() => { if (document.activeElement === input && input.value === texto) input.setSelectionRange(inicio, fim) })
  }
  return <div><label>{label}<input value={value} onChange={(e) => atualizar(e.currentTarget)} onCompositionStart={() => { compondo.current = true }} onCompositionEnd={(e) => { compondo.current = false; atualizar(e.currentTarget) }} onBlur={() => { if (value !== normalizarEspacos(value)) onChange(normalizarEspacos(value)) }} /></label><label className="edicao-grafia"><input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />Preservar grafia excepcional</label></div>
}

function CampoTelefone({ label, value, onChange, cpf = false }: { label: string; value: string; onChange: (v: string) => void; cpf?: boolean }) {
  const formatar = cpf ? formatarCpf : formatarTelefoneBrasil
  return <label>{label}<input inputMode="tel" value={value} onChange={(e) => {
    const input = e.currentTarget
    const contar = (pos: number | null) => apenasDigitos(input.value.slice(0, pos ?? input.value.length)).length
    const inicio = contar(input.selectionStart), fim = contar(input.selectionEnd)
    const texto = formatar(input.value)
    onChange(texto)
    const posicao = (q: number) => { if (!q) return 0; let n = 0; for (let i = 0; i < texto.length; i++) if (/\d/.test(texto[i]) && ++n === q) return i + 1; return texto.length }
    requestAnimationFrame(() => { if (document.activeElement === input && input.value === texto) input.setSelectionRange(posicao(inicio), posicao(fim)) })
  }} /></label>
}

export default function EditarPaciente({ pacienteId, clinicaId, clinicaNome, podeCorrigirCpf = false, onFechar, onSalvo, onGerenciarFoto, onAdicionarCpf }: Props) {
  const [original, setOriginal] = useState<PacienteEdicao | null>(null)
  const [dados, setDados] = useState<DadosEdicao | null>(null)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [responsavel, setResponsavel] = useState<ResponsavelEdicao>({ ...RESPONSAVEL_VAZIO })
  const [endereco, setEndereco] = useState<EnderecoPacienteFormulario>({ ...ENDERECO_VAZIO })
  const [enderecoOriginal, setEnderecoOriginal] = useState<EnderecoPacienteFormulario>({ ...ENDERECO_VAZIO })
  const [estadoEndereco, setEstadoEndereco] = useState<'carregando' | 'pronto' | 'erro'>('carregando')
  const [enderecoHistoricoReferencia, setEnderecoHistoricoReferencia] = useState<string | null>(null)
  const [estadoCep, setEstadoCep] = useState<EstadoConsultaCep>('inicial')
  const [etapa, setEtapa] = useState(1)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [descarte, setDescarte] = useState(false)
  const [acaoAposDescarte, setAcaoAposDescarte] = useState<'foto' | 'cpf' | null>(null)
  const [situacaoCpf, setSituacaoCpf] = useState<'carregando' | 'ausente' | 'informado' | 'legado_invalido' | 'erro'>('carregando')
  const [cpfAtual, setCpfAtual] = useState<string | null>(null)
  const [corrigindoCpf, setCorrigindoCpf] = useState(false)
  const [sucessoCpf, setSucessoCpf] = useState(false)
  const [tentativaCpf, setTentativaCpf] = useState(0)
  const [lembreteAdiado, setLembreteAdiado] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const erroRef = useRef<HTMLDivElement>(null)
  const focoValidacao = useRef<string | null>(null)
  const vigente = useRef(true)
  const controller = useRef<AbortController | null>(null)
  const consultaCepAtual = useRef<AbortController | null>(null)
  const cepConsultado = useRef('')
  const camposEnderecoManuais = useRef<Partial<Record<keyof EnderecoPacienteFormulario, boolean>>>({})
  const cadastroCarregado = useRef<string | null>(null)
  const enviando = useRef(false)
  const hoje = new Date(`${hojeNaBahia()}T12:00:00`)
  const idade = calcularIdade(dados?.data_nascimento ?? '', hoje)
  const menor = idade !== null && idade < 18
  const precisaResponsavel = menor && responsaveis.length === 0
  const enderecoAlterado = estadoEndereco === 'pronto' && CAMPOS_ENDERECO_EDICAO.some((campo) => endereco[campo] !== enderecoOriginal[campo])
  const sujo = original && dados && (Object.keys(alteracoesAdministrativas(original, dados)).length > 0 || enderecoAlterado || Object.values(responsavel).some(Boolean))
  function fechar() { if (salvando) return; setAcaoAposDescarte(null); if (sujo) setDescarte(true); else onFechar() }
  function abrirAcao(acao: 'foto' | 'cpf') {
    if (salvando) return
    if (sujo) { setAcaoAposDescarte(acao); setDescarte(true); return }
    if (acao === 'foto') onGerenciarFoto()
    else onAdicionarCpf()
  }
  function descartar() {
    if (acaoAposDescarte === 'foto') onGerenciarFoto()
    else if (acaoAposDescarte === 'cpf') onAdicionarCpf()
    else onFechar()
  }
  useLayoutEffect(() => {
    if (!erro) return
    if (focoValidacao.current) {
      const termo = focoValidacao.current
      focoValidacao.current = null
      const labels = [...(dialog.current?.querySelectorAll('section:not([hidden]) label') ?? [])]
      const label = labels.find((el) => el.firstChild?.textContent === termo || el.firstChild?.textContent?.startsWith(termo))
      const idConhecido = termo === 'E-mail' ? 'edicao-paciente-email' : termo === 'Telefone / WhatsApp' ? 'edicao-paciente-telefone' : null
      const input = (idConhecido ? document.getElementById(idConhecido) : null) as HTMLInputElement | null
        ?? label?.querySelector<HTMLInputElement>('input, select, textarea')
      if (input) {
        const timer = window.setTimeout(() => {
          if (!input.isConnected) return
          input.focus()
          input.scrollIntoView({ block: 'nearest' })
        }, 0)
        return () => window.clearTimeout(timer)
      }
    }
    erroRef.current?.focus()
  }, [erro, etapa])
  useEffect(() => {
    vigente.current = true
    const anterior = document.activeElement as HTMLElement | null
    const el = dialog.current!
    el.showModal()
    return () => { vigente.current = false; controller.current?.abort(); el.close(); if (anterior?.isConnected) anterior.focus() }
  }, [])
  useEffect(() => {
    if (!sujo) return
    const proteger = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', proteger)
    return () => window.removeEventListener('beforeunload', proteger)
  }, [sujo])
  useEffect(() => {
    const abort = new AbortController()
    const chaveCadastro = `${clinicaId}:${pacienteId}`
    const mesmoCadastro = cadastroCarregado.current === chaveCadastro
    cadastroCarregado.current = chaveCadastro
    if (!mesmoCadastro) {
      setOriginal(null)
      setDados(null)
      setResponsaveis([])
      setResponsavel({ ...RESPONSAVEL_VAZIO })
    }
    setErro(null)
    setEstadoEndereco('carregando')
    setEnderecoHistoricoReferencia(null)
    setEndereco({ ...ENDERECO_VAZIO })
    setEnderecoOriginal({ ...ENDERECO_VAZIO })
    setEstadoCep('inicial')
    camposEnderecoManuais.current = {}
    void Promise.all([
      supabase.from('pacientes').select('id, clinica_id, nome_completo, data_nascimento, sexo, telefone, email, endereco, observacoes, foto_path, ativo, created_at, updated_at').eq('id', pacienteId).eq('clinica_id', clinicaId).abortSignal(abort.signal).single(),
      supabase.rpc('paciente_responsavel_legal_resumo', { p_paciente_id: pacienteId, p_clinica_id: clinicaId }).abortSignal(abort.signal),
      supabase.from('pacientes').select('id, clinica_id, cep, logradouro, numero, complemento, bairro, cidade, uf, endereco_historico').eq('id', pacienteId).eq('clinica_id', clinicaId).abortSignal(abort.signal).single(),
    ]).then(([p, r, e]) => {
      if (abort.signal.aborted || !vigente.current) return
      if (p.error || r.error || !Array.isArray(r.data) || !p.data || p.data.id !== pacienteId || p.data.clinica_id !== clinicaId || !p.data.updated_at || [...CAMPOS_EDICAO, 'foto_path', 'ativo', 'created_at'].some((k) => !(k in p.data))) { setErro('Não foi possível carregar o cadastro completo e seus vínculos. Nenhuma edição foi iniciada.'); return }
      const pacienteCarregado = p.data as PacienteEdicao
      setOriginal((atual) => mesmoCadastro && atual ? atual : pacienteCarregado)
      setDados((atual) => mesmoCadastro && atual ? atual : pacienteCarregado)
      setResponsaveis(r.data ?? [])
      if (e.error || e.data?.id !== pacienteId || e.data.clinica_id !== clinicaId) {
        setEstadoEndereco('erro')
        return
      }
      const recebido = Object.fromEntries(CAMPOS_ENDERECO_EDICAO.map((campo) => [campo, typeof e.data[campo] === 'string' ? e.data[campo] : ''])) as unknown as EnderecoPacienteFormulario
      setEndereco(recebido)
      setEnderecoOriginal(recebido)
      const possuiEstruturado = CAMPOS_ENDERECO_EDICAO.some((campo) => Boolean(recebido[campo]))
      // Um endereço já persistido foi confirmado pelo operador. Não consulte o
      // mesmo CEP ao reabrir a ficha, pois uma resposta atual do ViaCEP não pode
      // substituir cidade/UF/logradouro corrigidos manualmente em outra sessão.
      // Se o operador alterar o CEP, o valor deixa de coincidir e a consulta
      // normal volta a ocorrer.
      cepConsultado.current = possuiEstruturado ? apenasDigitos(recebido.cep) : ''
      const historicoPersistido = typeof e.data.endereco_historico === 'string' && e.data.endereco_historico.trim() ? e.data.endereco_historico : null
      setEnderecoHistoricoReferencia(historicoPersistido ?? (!possuiEstruturado && typeof p.data.endereco === 'string' && p.data.endereco.trim() ? p.data.endereco : null))
      setEstadoEndereco('pronto')
    }).catch(() => { if (!abort.signal.aborted && vigente.current) setErro('Não foi possível carregar o cadastro. Tente novamente.') })
    return () => abort.abort()
  }, [pacienteId, clinicaId, tentativa])
  useEffect(() => {
    const abort = new AbortController()
    setSituacaoCpf('carregando')
    setCpfAtual(null)
    if (podeCorrigirCpf) {
      void lerCpfPaciente(pacienteId, clinicaId, abort.signal)
        .then((cpf) => { if (!abort.signal.aborted) { setCpfAtual(cpf); setSituacaoCpf(cpf === null ? 'ausente' : 'informado') } })
        .catch((falha) => { if (!abort.signal.aborted) setSituacaoCpf(cpfLegadoInvalidoConfirmado(falha) ? 'legado_invalido' : 'erro') })
    } else {
      void consultarCpfPendentePaciente(pacienteId, clinicaId, abort.signal)
        .then((pendente) => { if (!abort.signal.aborted) setSituacaoCpf(pendente ? 'ausente' : 'informado') })
        .catch(() => { if (!abort.signal.aborted) setSituacaoCpf('erro') })
    }
    return () => abort.abort()
  }, [pacienteId, clinicaId, podeCorrigirCpf, tentativaCpf])
  function campo(c: keyof DadosEdicao, valor: string) { setDados((d) => d && ({ ...d, [c]: valor || null })); setErro(null) }
  function campoResponsavel(c: keyof ResponsavelEdicao, valor: string) { setResponsavel((r) => ({ ...r, [c]: valor })); setErro(null) }
  function campoEndereco(campoAtual: keyof EnderecoPacienteFormulario, valor: string) {
    camposEnderecoManuais.current[campoAtual] = true
    const normalizado = campoAtual === 'cep' ? formatarCep(valor) : campoAtual === 'uf' ? valor.replace(/[^a-z]/gi, '').slice(0, 2).toLocaleUpperCase('pt-BR') : valor
    setEndereco((atual) => {
      const proximo = { ...atual, [campoAtual]: normalizado }
      setDados((dadosAtuais) => dadosAtuais && ({ ...dadosAtuais, endereco: comporEnderecoPaciente(proximo) }))
      return proximo
    })
    setErro(null)
  }
  useEffect(() => {
    if (estadoEndereco !== 'pronto') return
    const cep = apenasDigitos(endereco.cep)
    if (cep.length !== 8) {
      consultaCepAtual.current?.abort()
      cepConsultado.current = ''
      setEstadoCep('inicial')
      return
    }
    if (cepConsultado.current === cep) return
    cepConsultado.current = cep
    const abort = new AbortController()
    consultaCepAtual.current?.abort()
    consultaCepAtual.current = abort
    setEstadoCep('consultando')
    void consultarCep(cep, abort.signal).then((resultado) => {
      if (abort.signal.aborted || !resultado) { if (!abort.signal.aborted) setEstadoCep('nao_encontrado'); return }
      setEndereco((atual) => {
        if (apenasDigitos(atual.cep) !== cep) return atual
        const proximo = { ...atual }
        for (const campoAtual of ['logradouro', 'bairro', 'cidade', 'uf'] as const) {
          if (!camposEnderecoManuais.current[campoAtual] && resultado[campoAtual]) proximo[campoAtual] = resultado[campoAtual]
        }
        setDados((dadosAtuais) => dadosAtuais && ({ ...dadosAtuais, endereco: comporEnderecoPaciente(proximo) }))
        return proximo
      })
      setEstadoCep('encontrado')
    }).catch(() => { if (!abort.signal.aborted) setEstadoCep('erro') })
    return () => abort.abort()
  }, [endereco.cep, estadoEndereco])
  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!dados || !original || enviando.current || !vigente.current) return
    if (estadoEndereco !== 'pronto') {
      setErro('Os dados de endereço ainda não foram carregados por completo. Tente novamente antes de salvar.')
      return
    }
    const validacao = validarEdicao(original, dados, precisaResponsavel ? responsavel : null, hoje)
    if (validacao) {
      setErro(validacao)
      // Inclusive campos de uma etapa oculta: revelar antes de levar o foco.
      const doResponsavel = /responsável/.test(validacao)
      const contato = !doResponsavel && /e-mail|Telefone/.test(validacao)
      focoValidacao.current = /e-mail/.test(validacao) ? 'E-mail' : /CPF/.test(validacao) ? 'CPF' : contato ? 'Telefone / WhatsApp' : /nascimento/.test(validacao) ? 'Data de nascimento' : doResponsavel ? (!responsavel.nome_completo.trim() ? 'Nome completo do responsável' : !responsavel.vinculo.trim() ? 'Vínculo com o paciente' : 'Telefone / WhatsApp do responsável') : 'Nome completo'
      setEtapa(contato ? (menor ? 3 : 2) : doResponsavel && menor ? 2 : 1)
      return
    }
    const patch: Record<string, string | null> = { ...alteracoesAdministrativas(original, dados) }
    if (enderecoAlterado) Object.assign(patch, alteracoesEnderecoEstruturado(enderecoOriginal, endereco))
    if (!Object.keys(patch).length && !precisaResponsavel) { onFechar(); return }
    enviando.current = true
    setSalvando(true); setErro(null)
    controller.current = new AbortController()
    try {
      const { data, error } = await supabase.rpc('paciente_editar_administrativo', {
        p_paciente_id: pacienteId, p_clinica_id: clinicaId, p_updated_at: original.updated_at,
        p_alteracoes: patch, p_responsavel: precisaResponsavel ? responsavel : null,
      }).abortSignal(controller.current.signal)
      if (!vigente.current) return
      if (error) { setErro(mensagemErroEdicao(error.code)); return }
      const salvo = Array.isArray(data) ? data[0] : data
      if (!salvo || salvo.id !== pacienteId || salvo.clinica_id !== clinicaId || !salvo.updated_at || salvo.updated_at === original.updated_at || [...CAMPOS_EDICAO, 'foto_path', 'ativo', 'created_at'].some((k) => !(k in salvo))) { setErro(mensagemErroEdicao()); return }
      onSalvo(salvo as PacienteEdicao)
    } catch { if (vigente.current) setErro(mensagemErroEdicao()) }
    finally { enviando.current = false; if (vigente.current) setSalvando(false) }
  }
  return <><dialog ref={dialog} className="paciente-modal paciente-edicao" aria-labelledby="edicao-titulo" aria-busy={salvando} onCancel={(e) => { e.preventDefault(); fechar() }}>
    <header className="paciente-modal-cabecalho"><div className="min-w-0 flex-1"><h2 id="edicao-titulo" className="paciente-modal-titulo">Editar paciente</h2><p className="paciente-modal-subtitulo">{clinicaNome} · {original?.nome_completo ?? 'Carregando cadastro…'}</p></div><button type="button" className="paciente-modal-fechar" aria-label="Fechar edição" disabled={salvando} onClick={fechar}>×</button></header>
    <NavegacaoFormularioPaciente etapaAtual={etapa} menor={menor} onIrParaEtapa={setEtapa} />
    <form id="editar-paciente-form" className={`paciente-modal-scroll ${etapa === (menor ? 3 : 2) ? 'paciente-modal-scroll-endereco' : ''}`} onSubmit={salvar} noValidate>
      {erro && <div ref={erroRef} tabIndex={-1}><FeedbackAlert variant="destructive" title="Não foi possível salvar" description={erro} urgent /></div>}
      {!dados && <p role="status">{erro ? <button type="button" onClick={() => setTentativa((v) => v + 1)}>Tentar novamente</button> : 'Carregando dados e responsável legal…'}</p>}
      {dados && original && <fieldset disabled={salvando}>
        <section hidden={etapa !== 1} className="paciente-secao">
          <div className="edicao-identidade">
            <PacienteAvatar pacienteId={pacienteId} clinicaId={clinicaId} nome={dados.nome_completo ?? ''} caminho={original.foto_path} tamanho="resumo" />
            <div className="edicao-identidade-acoes">
              <button type="button" className="paciente-botao-secundario" onClick={() => abrirAcao('foto')}>{original.foto_path ? 'Trocar ou remover foto' : 'Adicionar foto'}</button>
              <p>A foto é confirmada separadamente em armazenamento privado. Cancelar esta edição não desfaz uma foto já confirmada.</p>
            </div>
          </div>
          <section className="edicao-cpf" aria-label="CPF do paciente" aria-busy={situacaoCpf === 'carregando'}>
            <h3>CPF <small>(opcional)</small></h3>
            {sucessoCpf && <FeedbackAlert variant="success" title="CPF atualizado" description="A correção foi confirmada e registrada." onClose={() => setSucessoCpf(false)} autoDismissMs={6000} />}
            {situacaoCpf === 'carregando' && <p role="status">Consultando situação do CPF…</p>}
            {situacaoCpf === 'erro' && <FeedbackAlert variant="warning" title="Situação do CPF indisponível" description="Não foi possível confirmar a situação do CPF. Isso não significa ausência nem existência." action={<button type="button" onClick={() => setTentativaCpf((v) => v + 1)}>Tentar novamente</button>} />}
            {situacaoCpf === 'legado_invalido' && podeCorrigirCpf && <FeedbackAlert variant="warning" title="CPF cadastrado precisa de revisão" description="O CPF cadastrado precisa de revisão. Confira o documento antes de corrigir. O valor anterior não será exibido." action={<button type="button" disabled={!original} onClick={() => setCorrigindoCpf(true)}>Corrigir CPF</button>} />}
            {situacaoCpf === 'ausente' && <>
              <p>{lembreteAdiado ? 'CPF não informado' : 'CPF não informado. Deseja completar o cadastro?'}</p>
              <div className="edicao-cpf-acoes"><button type="button" className="paciente-botao-secundario" onClick={() => abrirAcao('cpf')}>Adicionar CPF</button>{!lembreteAdiado && <button type="button" className="paciente-botao-secundario" onClick={() => setLembreteAdiado(true)}>Informar depois</button>}</div>
            </>}
            {situacaoCpf === 'informado' && <>
              {podeCorrigirCpf && cpfAtual ? <>
                <label>CPF atual<input readOnly autoComplete="off" value={formatarCpf(cpfAtual)} /></label>
                <div className="edicao-cpf-acoes"><button type="button" className="paciente-botao-secundario" onClick={() => setCorrigindoCpf(true)}>Corrigir CPF</button></div>
                <p className="edicao-ajuda">Para alterar este documento, use Corrigir CPF.</p>
              </> : <p><span aria-label="CPF informado, todos os dígitos ocultos">***.***.***-**</span> · CPF informado</p>}
            </>}
            {(situacaoCpf === 'ausente' || (situacaoCpf === 'informado' && podeCorrigirCpf)) && <FeedbackAlert variant="warning" title="Confira o CPF com atenção" description="Confira os 11 dígitos com o documento do paciente antes de salvar. Essa informação é importante para identificar corretamente o paciente em notas fiscais e relatórios." />}
            <p className="edicao-ajuda">Você pode salvar os demais dados e seguir com o atendimento sem CPF. Esta edição não apaga nem reenvia o documento.</p>
          </section>
          <div className="edicao-grid">
            <TextoNome label="Nome completo" value={dados.nome_completo ?? ''} onChange={(v) => campo('nome_completo', v)} />
            <label>Data de nascimento<input type="date" value={dados.data_nascimento ?? ''} max={hojeNaBahia()} onChange={(e) => campo('data_nascimento', e.target.value)} /></label>
            <label>Idade<input readOnly value={idade === null ? 'Não determinada' : `${idade} anos`} /></label>
            <label>Sexo<select value={dados.sexo ?? ''} onChange={(e) => campo('sexo', e.target.value)}><option value="">Não informado</option>{['nao_informado','feminino','masculino','outro'].map((v) => <option key={v} value={v}>{v === 'nao_informado' ? 'Não informado (cadastro)' : v[0].toUpperCase() + v.slice(1)}</option>)}{dados.sexo && !['nao_informado','feminino','masculino','outro'].includes(dados.sexo) && <option value={dados.sexo}>{dados.sexo}</option>}</select></label>
          </div>
          {!dados.data_nascimento && <p className="edicao-ajuda">Nascimento não informado: a idade permanece desconhecida. É possível corrigir outros dados sem inventar uma data.</p>}
        </section>
        <section hidden={!menor || etapa !== 2} className="paciente-secao">
          <div className="paciente-secao-titulo-linha"><h3>Responsável legal</h3><span>Vínculo na mesma clínica</span></div>
          {responsaveis.map((r) => <p key={r.id}>{r.nome_completo} · {r.vinculo} · {formatarTelefoneBrasil(r.telefone)}{r.email ? ` · ${r.email}` : ''}</p>)}
          {!responsaveis.length && !precisaResponsavel && <p>Nenhum vínculo registrado. Isso não presume maioridade.</p>}
          {precisaResponsavel && <><p className="edicao-ajuda">O nascimento identifica um menor. O primeiro responsável será vinculado na mesma atualização, sem criar outro paciente.</p><div className="edicao-grid">
            <TextoNome label="Nome completo do responsável" value={responsavel.nome_completo} onChange={(v) => campoResponsavel('nome_completo', v)} />
            <TextoNome label="Vínculo com o paciente" value={responsavel.vinculo} onChange={(v) => campoResponsavel('vinculo', v)} />
            <CampoTelefone label="Telefone / WhatsApp do responsável" value={responsavel.telefone} onChange={(v) => campoResponsavel('telefone', v)} />
            <CampoTelefone label="CPF do responsável (opcional)" value={responsavel.cpf} cpf onChange={(v) => campoResponsavel('cpf', v)} />
            <label>E-mail do responsável (opcional)<input type="email" value={responsavel.email} onChange={(e) => campoResponsavel('email', e.target.value)} /></label>
          </div></>}
          <p className="edicao-ajuda">O primeiro responsável pode ser incluído acima quando necessário. A alteração de vínculos existentes ainda não está disponível. Nenhum contato concede acesso ao prontuário nem ativa mensagens.</p>
        </section>
        <section hidden={etapa !== (menor ? 3 : 2)} className="paciente-secao">
          <div className="paciente-secao-titulo-linha"><h3>Endereço Residencial e Contatos</h3><span>Revise somente o que mudou</span></div>
          {estadoEndereco === 'carregando' && <p role="status">Carregando os campos de endereço…</p>}
          {estadoEndereco === 'erro' && <FeedbackAlert variant="destructive" title="Não foi possível carregar o endereço" description="Os campos de endereço não foram liberados para evitar uma gravação incompleta." action={<button type="button" onClick={() => setTentativa((v) => v + 1)}>Tentar novamente</button>} urgent />}
          <div className="paciente-form-grid">
            {estadoEndereco === 'pronto' && <CamposEnderecoContatosPaciente
              idPrefixo="edicao-paciente"
              valor={endereco}
              estadoCep={estadoCep}
              disabled={salvando}
              enderecoHistoricoReferencia={enderecoHistoricoReferencia}
              onChange={(campoAtual, valor) => campoEndereco(campoAtual, valor)}
              onBlurTexto={(campoAtual) => campoEndereco(campoAtual, normalizarEspacos(formatarTextoPortuguesAoDigitar(endereco[campoAtual])))}
              telefone={formatarTelefoneBrasil(dados.telefone ?? '')}
              email={dados.email ?? ''}
              observacoes={dados.observacoes ?? ''}
              onTelefoneChange={(input) => campo('telefone', formatarTelefoneBrasil(input.value))}
              onEmailChange={(valor) => campo('email', valor)}
              onObservacoesChange={(valor) => campo('observacoes', valor)}
            />}
          </div>
        </section>
      </fieldset>}
    </form>
    <footer className="paciente-modal-rodape">
      <button type="button" disabled={salvando} className="paciente-botao-secundario paciente-cancelar" onClick={fechar}>Cancelar</button>
      {etapa > 1 && <button type="button" disabled={salvando || !dados} className="paciente-botao-secundario" aria-label={etapa === 2 ? 'Voltar à Identificação' : 'Voltar ao Responsável legal'} onClick={() => setEtapa(etapa - 1)}><span aria-hidden="true">← </span>{etapa === 2 ? 'Voltar à Identificação' : 'Voltar ao Responsável legal'}</button>}
      {etapa < (menor ? 3 : 2) && <button type="button" disabled={salvando || !dados} className="paciente-botao-secundario" onClick={() => setEtapa(etapa + 1)}>Avançar →</button>}
      <button type="submit" form="editar-paciente-form" disabled={!dados || estadoEndereco !== 'pronto' || salvando || descarte} className="paciente-botao-primario">{salvando ? 'Salvando…' : 'Salvar alterações'}</button>
    </footer>
  </dialog>
  <ConfirmacaoDialog open={descarte} onOpenChange={(open) => { setDescarte(open); if (!open) setAcaoAposDescarte(null) }} tone="warning" title="Descartar alterações não salvas?" description={acaoAposDescarte === 'foto' ? 'As alterações cadastrais serão descartadas antes de abrir a gestão da foto.' : acaoAposDescarte === 'cpf' ? 'As alterações cadastrais serão descartadas antes de abrir a inclusão do CPF.' : 'As alterações desta ficha não serão salvas.'} cancelLabel="Continuar editando" confirmLabel={acaoAposDescarte === 'foto' ? 'Descartar e gerenciar foto' : acaoAposDescarte === 'cpf' ? 'Descartar e adicionar CPF' : 'Descartar alterações'} onConfirm={descartar} />
   {corrigindoCpf && original && (cpfAtual || situacaoCpf === 'legado_invalido') && <CorrigirCpfPaciente pacienteId={pacienteId} clinicaId={clinicaId} cpfAtual={cpfAtual} revisao={original.updated_at} onCancelar={() => setCorrigindoCpf(false)} onSalvo={(cpf, revisao) => { setCpfAtual(cpf); setSituacaoCpf('informado'); setOriginal((atual) => atual && ({ ...atual, updated_at: revisao })); setSucessoCpf(true); setCorrigindoCpf(false) }} />}</>
}
