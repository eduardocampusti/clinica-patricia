import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { apenasDigitos, formatarCpf } from '../../lib/cpf'
import { formatarTelefoneBrasil, formatarTextoPortuguesAoDigitar, normalizarEspacos } from '../../lib/pacienteFormulario'
import { calcularIdade } from '../../lib/pacienteIdade'
import { hojeNaBahia } from '../../lib/pacienteLista'
import { alteracoesAdministrativas, CAMPOS_EDICAO, mensagemErroEdicao, RESPONSAVEL_VAZIO, validarEdicao, type DadosEdicao, type PacienteEdicao, type ResponsavelEdicao } from '../../lib/pacienteEdicao'
import PacienteAvatar from './PacienteAvatar'
import './editar-paciente.css'

type Responsavel = { id: string; nome_completo: string; vinculo: string; telefone: string }
interface Props { pacienteId: string; clinicaId: string; clinicaNome: string; onFechar: () => void; onSalvo: (paciente: PacienteEdicao) => void }

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

export default function EditarPaciente({ pacienteId, clinicaId, clinicaNome, onFechar, onSalvo }: Props) {
  const [original, setOriginal] = useState<PacienteEdicao | null>(null)
  const [dados, setDados] = useState<DadosEdicao | null>(null)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const [responsavel, setResponsavel] = useState<ResponsavelEdicao>({ ...RESPONSAVEL_VAZIO })
  const [etapa, setEtapa] = useState(1)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [descarte, setDescarte] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const erroRef = useRef<HTMLParagraphElement>(null)
  const descarteRef = useRef<HTMLDivElement>(null)
  const vigente = useRef(true)
  const controller = useRef<AbortController | null>(null)
  const enviando = useRef(false)
  const hoje = new Date(`${hojeNaBahia()}T12:00:00`)
  const idade = calcularIdade(dados?.data_nascimento ?? '', hoje)
  const precisaResponsavel = idade !== null && idade < 18 && responsaveis.length === 0
  const sujo = original && dados && (Object.keys(alteracoesAdministrativas(original, dados)).length > 0 || Object.values(responsavel).some(Boolean))
  function fechar() { if (salvando) return; if (sujo) setDescarte(true); else onFechar() }
  useEffect(() => { if (erro) erroRef.current?.focus() }, [erro])
  useEffect(() => { if (descarte) descarteRef.current?.focus() }, [descarte])
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
    setErro(null)
    void Promise.all([
      supabase.from('pacientes').select('id, clinica_id, nome_completo, data_nascimento, sexo, telefone, email, endereco, observacoes, foto_path, ativo, created_at, updated_at').eq('id', pacienteId).eq('clinica_id', clinicaId).abortSignal(abort.signal).single(),
      supabase.rpc('paciente_responsavel_legal_resumo', { p_paciente_id: pacienteId, p_clinica_id: clinicaId }).abortSignal(abort.signal),
    ]).then(([p, r]) => {
      if (abort.signal.aborted || !vigente.current) return
      if (p.error || r.error || !Array.isArray(r.data) || !p.data || p.data.id !== pacienteId || p.data.clinica_id !== clinicaId || !p.data.updated_at || [...CAMPOS_EDICAO, 'foto_path', 'ativo', 'created_at'].some((k) => !(k in p.data))) { setErro('Não foi possível carregar o cadastro completo e seus vínculos. Nenhuma edição foi iniciada.'); return }
      setOriginal(p.data as PacienteEdicao); setDados(p.data as PacienteEdicao); setResponsaveis(r.data ?? [])
    }).catch(() => { if (!abort.signal.aborted && vigente.current) setErro('Não foi possível carregar o cadastro. Tente novamente.') })
    return () => abort.abort()
  }, [pacienteId, clinicaId, tentativa])
  function campo(c: keyof DadosEdicao, valor: string) { setDados((d) => d && ({ ...d, [c]: valor || null })); setErro(null) }
  function campoResponsavel(c: keyof ResponsavelEdicao, valor: string) { setResponsavel((r) => ({ ...r, [c]: valor })); setErro(null) }
  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!dados || !original || enviando.current || !vigente.current) return
    const validacao = validarEdicao(original, dados, precisaResponsavel ? responsavel : null, hoje)
    if (validacao) {
      setErro(validacao)
      // Inclusive campos de uma etapa oculta: revelar antes de levar o foco.
      const doResponsavel = /responsável/.test(validacao)
      const contato = !doResponsavel && /e-mail|Telefone/.test(validacao)
      setEtapa(contato ? 2 : 1)
      requestAnimationFrame(() => {
        const labels = [...(dialog.current?.querySelectorAll('section:not([hidden]) label') ?? [])]
        const termo = /e-mail/.test(validacao) ? 'E-mail' : /CPF/.test(validacao) ? 'CPF' : contato ? 'Telefone / WhatsApp' : /nascimento/.test(validacao) ? 'Data de nascimento' : doResponsavel ? (!responsavel.nome_completo.trim() ? 'Nome completo do responsável' : !responsavel.vinculo.trim() ? 'Vínculo com o paciente' : 'Telefone / WhatsApp do responsável') : 'Nome completo'
        const label = labels.find((el) => el.firstChild?.textContent === termo || el.firstChild?.textContent?.startsWith(termo))
        const input = label?.querySelector<HTMLInputElement>('input, select, textarea')
        input?.focus(); input?.scrollIntoView({ block: 'nearest' })
      })
      return
    }
    const patch = alteracoesAdministrativas(original, dados)
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
  return <dialog ref={dialog} className="paciente-modal paciente-edicao" aria-labelledby="edicao-titulo" aria-busy={salvando} onCancel={(e) => { e.preventDefault(); fechar() }}>
    <header className="paciente-modal-cabecalho"><div className="min-w-0 flex-1"><h2 id="edicao-titulo" className="paciente-modal-titulo">Editar paciente</h2><p className="paciente-modal-subtitulo">{clinicaNome} · {original?.nome_completo ?? 'Carregando cadastro…'}</p></div><button type="button" className="paciente-modal-fechar" aria-label="Fechar edição" disabled={salvando} onClick={fechar}>×</button></header>
    <nav className="paciente-etapas" aria-label="Etapas da edição">{['Identificação', 'Endereço & Contatos'].map((nome, i) => <button key={nome} type="button" className={etapa === i + 1 ? 'ativa' : ''} aria-current={etapa === i + 1 ? 'step' : undefined} onClick={() => setEtapa(i + 1)}><span className="paciente-etapa-numero">{i + 1}</span><strong>{nome}</strong></button>)}</nav>
    <form id="editar-paciente-form" className="paciente-modal-scroll" onSubmit={salvar} noValidate>
      {erro && <p ref={erroRef} tabIndex={-1} role="alert" className="edicao-erro">{erro}</p>}
      {!dados && <p role="status">{erro ? <button type="button" onClick={() => setTentativa((v) => v + 1)}>Tentar novamente</button> : 'Carregando dados e responsável legal…'}</p>}
      {dados && original && <fieldset disabled={salvando}>
        <section hidden={etapa !== 1} className="paciente-secao">
          <div className="edicao-identidade"><PacienteAvatar pacienteId={pacienteId} clinicaId={clinicaId} nome={dados.nome_completo ?? ''} caminho={original.foto_path} tamanho="resumo" /><p>Foto e CPF são preservados. Para alterá-los, use as ações específicas no resumo.</p></div>
          <div className="edicao-grid">
            <TextoNome label="Nome completo" value={dados.nome_completo ?? ''} onChange={(v) => campo('nome_completo', v)} />
            <label>Data de nascimento<input type="date" value={dados.data_nascimento ?? ''} max={hojeNaBahia()} onChange={(e) => campo('data_nascimento', e.target.value)} /></label>
            <label>Idade<input readOnly value={idade === null ? 'Não determinada' : `${idade} anos`} /></label>
            <label>Sexo<select value={dados.sexo ?? ''} onChange={(e) => campo('sexo', e.target.value)}><option value="">Não informado</option>{['nao_informado','feminino','masculino','outro'].map((v) => <option key={v} value={v}>{v === 'nao_informado' ? 'Não informado (cadastro)' : v[0].toUpperCase() + v.slice(1)}</option>)}{dados.sexo && !['nao_informado','feminino','masculino','outro'].includes(dados.sexo) && <option value={dados.sexo}>{dados.sexo}</option>}</select></label>
          </div>
          {!dados.data_nascimento && <p className="edicao-ajuda">Nascimento não informado: a idade permanece desconhecida. É possível corrigir outros dados sem inventar uma data.</p>}
          <h3>Responsável legal</h3>
          {responsaveis.map((r) => <p key={r.id}>{r.nome_completo} · {r.vinculo} · {formatarTelefoneBrasil(r.telefone)}</p>)}
          {!responsaveis.length && !precisaResponsavel && <p>Nenhum vínculo registrado. Isso não presume maioridade.</p>}
          {precisaResponsavel && <><p className="edicao-ajuda">O nascimento identifica um menor. O primeiro responsável será vinculado na mesma atualização, sem criar outro paciente.</p><div className="edicao-grid">
            <TextoNome label="Nome completo do responsável" value={responsavel.nome_completo} onChange={(v) => campoResponsavel('nome_completo', v)} />
            <TextoNome label="Vínculo com o paciente" value={responsavel.vinculo} onChange={(v) => campoResponsavel('vinculo', v)} />
            <CampoTelefone label="Telefone / WhatsApp do responsável" value={responsavel.telefone} onChange={(v) => campoResponsavel('telefone', v)} />
            <CampoTelefone label="CPF do responsável (opcional)" value={responsavel.cpf} cpf onChange={(v) => campoResponsavel('cpf', v)} />
            <label>E-mail do responsável (opcional)<input type="email" value={responsavel.email} onChange={(e) => campoResponsavel('email', e.target.value)} /></label>
          </div></>}
          <p className="edicao-ajuda">Vínculos existentes não são alterados. O contato não concede acesso ao prontuário nem ativa mensagens.</p>
        </section>
        <section hidden={etapa !== 2} className="paciente-secao"><div className="edicao-grid">
          <CampoTelefone label="Telefone / WhatsApp" value={formatarTelefoneBrasil(dados.telefone ?? '')} onChange={(v) => campo('telefone', v)} />
          <label>E-mail<input type="email" value={dados.email ?? ''} onChange={(e) => campo('email', e.target.value)} /></label>
          <label className="edicao-largura">Endereço completo<textarea rows={3} value={dados.endereco ?? ''} onChange={(e) => campo('endereco', e.target.value)} /><small>Texto integral salvo. Não separamos rua, número ou CEP automaticamente.</small></label>
          <label className="edicao-largura">Observações administrativas<textarea rows={3} value={dados.observacoes ?? ''} onChange={(e) => campo('observacoes', e.target.value)} /><small>Não utilize este campo como prontuário.</small></label>
        </div></section>
      </fieldset>}
      {descarte && <div ref={descarteRef} tabIndex={-1} role="alert" className="edicao-descarte"><p>Descartar as alterações não salvas?</p><button type="button" className="paciente-botao-secundario" onClick={() => setDescarte(false)}>Continuar editando</button><button type="button" className="paciente-botao-secundario" onClick={onFechar}>Descartar alterações</button></div>}
    </form>
    <footer className="paciente-modal-rodape"><button type="button" disabled={salvando} className="paciente-botao-secundario paciente-cancelar" onClick={fechar}>Cancelar</button><button type="button" disabled={salvando || !dados} className="paciente-botao-secundario" onClick={() => setEtapa(etapa === 1 ? 2 : 1)}>{etapa === 1 ? 'Endereço & Contatos' : 'Voltar à Identificação'}</button><button type="submit" form="editar-paciente-form" disabled={!dados || salvando || descarte} className="paciente-botao-primario">{salvando ? 'Salvando…' : 'Salvar alterações'}</button></footer>
  </dialog>
}
