import { useId, useRef, useState } from 'react'
import { apenasDigitos, cpfValido, formatarCpf } from '../../lib/cpf'
import { definirCpfPaciente, mensagemErroDefinirCpf } from '../../lib/pacienteCpf'
import { FeedbackAlert } from '../feedback/FeedbackAlert'

interface AvisoCpfPendenteProps {
  pacienteId: string
  pacienteNome: string
  clinicaId: string
  onAdicionado: () => void
  onLembrar: () => void
  contexto?: 'operacional' | 'cadastro'
}

export function AvisoCpfPendente({
  pacienteId,
  pacienteNome,
  clinicaId,
  onAdicionado,
  onLembrar,
  contexto = 'operacional',
}: AvisoCpfPendenteProps) {
  const campoId = useId()
  const enviando = useRef(false)
  const [editando, setEditando] = useState(false)
  const [cpf, setCpf] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (enviando.current) return
    setErro(null)
    const digitos = apenasDigitos(cpf)
    if (!cpfValido(digitos)) {
      setErro('Confira o CPF informado. Ele deve ter 11 dígitos válidos.')
      return
    }

    enviando.current = true
    setSalvando(true)
    try {
      await definirCpfPaciente(pacienteId, clinicaId, digitos)
      onAdicionado()
    } catch (falha) {
      setErro(mensagemErroDefinirCpf(falha))
    } finally {
      enviando.current = false
      setSalvando(false)
    }
  }

  return (
    <section aria-label={`CPF pendente de ${pacienteNome}`}>
      <FeedbackAlert variant="warning" title="CPF não informado" description={contexto === 'cadastro'
        ? 'Você pode continuar o cadastro e o atendimento e completar essa informação depois.'
        : 'Você pode continuar o agendamento ou a chegada e completar essa informação depois.'} />

      {!editando ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="min-h-11 rounded-lg bg-[var(--cor-primaria)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--cor-primaria-hover)]"
          >
            Adicionar CPF
          </button>
          <button
            type="button"
            onClick={onLembrar}
            className="min-h-11 rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3.5 py-2 text-sm font-medium text-[var(--texto-principal)] transition hover:bg-[var(--fundo-pagina)]"
          >
            Informar depois
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3" onChange={() => setErro(null)}>
          <div>
            <label htmlFor={campoId} className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
              CPF de {pacienteNome}
            </label>
            <input
              id={campoId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(event) => setCpf(formatarCpf(event.target.value))}
              maxLength={14}
              disabled={salvando}
              aria-invalid={erro ? true : undefined}
              className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
            />
          </div>
          <FeedbackAlert variant="warning" title="Confira o CPF com atenção" description="Confira os 11 dígitos com o documento do paciente antes de salvar. Essa informação é importante para identificar corretamente o paciente em notas fiscais e relatórios." />
          {erro && <FeedbackAlert variant="destructive" title="CPF não salvo" description={erro} urgent />}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando}
              className="min-h-11 rounded-lg bg-[var(--cor-primaria)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--cor-primaria-hover)] disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar CPF'}
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={onLembrar}
              className="min-h-11 rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3.5 py-2 text-sm font-medium text-[var(--texto-principal)] disabled:opacity-60"
            >
              Informar depois
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
