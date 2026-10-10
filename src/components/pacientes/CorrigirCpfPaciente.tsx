import { useEffect, useRef, useState, type FormEvent } from 'react'
import { apenasDigitos, cpfValido, formatarCpf } from '../../lib/cpf'
import { corrigirCpfPaciente, mensagemErroCorrigirCpf } from '../../lib/pacienteCpf'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { ConfirmacaoDialog } from '../feedback/ConfirmacaoDialog'

interface Props {
  pacienteId: string
  clinicaId: string
  cpfAtual: string | null
  revisao: string
  onCancelar: () => void
  onSalvo: (cpf: string, revisao: string) => void
}

export default function CorrigirCpfPaciente({ pacienteId, clinicaId, cpfAtual, revisao, onCancelar, onSalvo }: Props) {
  const [novo, setNovo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const enviando = useRef(false)
  const vigente = useRef(true)
  const erroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    vigente.current = true
    const anterior = document.activeElement as HTMLElement | null
    const el = dialog.current!
    el.showModal()
    return () => { vigente.current = false; el.close(); if (anterior?.isConnected) anterior.focus() }
  }, [])
  useEffect(() => { if (erro) erroRef.current?.focus() }, [erro])

  function validar(e: FormEvent) {
    e.preventDefault()
    if (enviando.current) return
    const digitos = apenasDigitos(novo)
    const justificativa = motivo.trim()
    if (!cpfValido(digitos)) { setErro('Confira o novo CPF. Ele deve ter 11 dígitos válidos.'); return }
    if (cpfAtual && digitos === apenasDigitos(cpfAtual)) { setErro('Informe um CPF diferente do atual.'); return }
    if (justificativa.length < 10 || justificativa.length > 500 || /[0-9](?:[\s./-]*[0-9]){10}/.test(justificativa)) {
      setErro('Informe um motivo entre 10 e 500 caracteres, sem CPF ou sequência numérica longa.'); return
    }
    setErro(null)
    setConfirmando(true)
  }

  async function salvar() {
    if (enviando.current) return
    const digitos = apenasDigitos(novo)
    const justificativa = motivo.trim()
    enviando.current = true
    setSalvando(true)
    setErro(null)
    try {
      const novaRevisao = await corrigirCpfPaciente(pacienteId, clinicaId, revisao, digitos, justificativa)
      if (vigente.current) onSalvo(digitos, novaRevisao)
    } catch (falha) {
      if (vigente.current) setErro(mensagemErroCorrigirCpf(falha))
    } finally {
      enviando.current = false
      if (vigente.current) setSalvando(false)
    }
  }

  return <><dialog ref={dialog} className="paciente-modal paciente-correcao-cpf" aria-labelledby="correcao-cpf-titulo" aria-busy={salvando} onCancel={(e) => { e.preventDefault(); if (!salvando) onCancelar() }}>
    <header className="paciente-modal-cabecalho"><div><h2 id="correcao-cpf-titulo" className="paciente-modal-titulo">Corrigir CPF</h2><p className="paciente-modal-subtitulo">A correção será registrada com o motivo informado.</p></div><button type="button" className="paciente-modal-fechar" aria-label="Fechar correção de CPF" disabled={salvando} onClick={onCancelar}>×</button></header>
    <form id="corrigir-cpf-form" className="paciente-correcao-cpf-conteudo" onSubmit={validar} noValidate>
      {erro && <div ref={erroRef} tabIndex={-1}><FeedbackAlert variant="destructive" title="CPF não corrigido" description={erro} urgent /></div>}
      <FeedbackAlert variant="warning" title="Confira o CPF com atenção" description="Confira os 11 dígitos com o documento do paciente antes de salvar. Essa informação é importante para identificar corretamente o paciente em notas fiscais e relatórios." />
      {cpfAtual ? <label>CPF atual<input readOnly value={formatarCpf(cpfAtual)} autoComplete="off" /></label> : <p className="edicao-ajuda">O CPF anterior não pode ser exibido. Confira o novo número diretamente no documento do paciente.</p>}
      <label>Novo CPF<input inputMode="numeric" autoComplete="off" value={novo} onChange={(e) => { setNovo(formatarCpf(e.target.value)); setErro(null) }} placeholder="000.000.000-00" /></label>
      <label>Motivo da correção<textarea value={motivo} maxLength={500} rows={3} onChange={(e) => { setMotivo(e.target.value); setErro(null) }} /></label>
    </form>
    <footer className="paciente-modal-rodape"><button type="button" className="paciente-botao-secundario" disabled={salvando} onClick={onCancelar}>Cancelar</button><button type="submit" form="corrigir-cpf-form" className="paciente-botao-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar correção'}</button></footer>
  </dialog><ConfirmacaoDialog open={confirmando} onOpenChange={setConfirmando} title="Confirmar correção do CPF?" description="O documento deste paciente será substituído. A identidade e os vínculos serão preservados, e a auditoria registrará autor, data e motivo sem gravar o CPF completo." confirmLabel="Confirmar correção" onConfirm={() => void salvar()} disabled={salvando} /></>
}
