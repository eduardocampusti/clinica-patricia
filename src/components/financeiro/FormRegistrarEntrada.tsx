import { useState, type FormEvent } from 'react'
import { registrarEntradaCaixa, type FormaPagamento } from '../../lib/api'

const FORMAS_PAGAMENTO: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao_debito', rotulo: 'Cartão de débito' },
  { valor: 'cartao_credito', rotulo: 'Cartão de crédito' },
  { valor: 'transferencia', rotulo: 'Transferência' },
  { valor: 'convenio', rotulo: 'Convênio' },
  { valor: 'cortesia', rotulo: 'Cortesia' },
]

export interface PacienteOpcaoEntrada {
  id: string
  nome_completo: string
}

export interface ProfissionalOpcaoEntrada {
  id: string
  nome_completo: string
  valor_consulta: number | null
}

interface FormRegistrarEntradaProps {
  clinicaAtivaId: string
  pacientes: PacienteOpcaoEntrada[]
  profissionais: ProfissionalOpcaoEntrada[]
  pacienteIdInicial?: string
  profissionalIdInicial?: string
  agendamentoIdInicial?: string
  onRegistrado: () => void | Promise<void>
  /** Card próprio (sombra + raio + fundo). Desliga quando o formulário já
   * está dentro de outro contêiner com esse chrome (ex.: um modal). */
  comCard?: boolean
}

// Formulário de "Registrar entrada" — usado no Financeiro (fluxo normal, sessão
// já sabida pelo servidor) e na Agenda (ao concluir um agendamento, com
// paciente/profissional pré-preenchidos). Mesma lógica nos dois lugares,
// nunca duplicada.
export function FormRegistrarEntrada({
  clinicaAtivaId,
  pacientes,
  profissionais,
  pacienteIdInicial,
  profissionalIdInicial,
  agendamentoIdInicial,
  onRegistrado,
  comCard = true,
}: FormRegistrarEntradaProps) {
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro')
  const [pacienteId, setPacienteId] = useState(pacienteIdInicial ?? '')
  const [profissionalId, setProfissionalId] = useState(profissionalIdInicial ?? '')
  const [valor, setValor] = useState(() => {
    const profissional = profissionais.find((p) => p.id === profissionalIdInicial)
    return profissional?.valor_consulta != null ? String(profissional.valor_consulta).replace('.', ',') : ''
  })
  const [descricao, setDescricao] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function handleProfissionalChange(id: string) {
    setProfissionalId(id)
    const profissional = profissionais.find((p) => p.id === id)
    if (profissional?.valor_consulta != null) {
      setValor(String(profissional.valor_consulta).replace('.', ','))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    const valorNumerico = Number(valor.replace(',', '.'))
    if (Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      setErro('Informe um valor válido, maior que zero.')
      return
    }

    if (!pacienteId) {
      setErro('Selecione o paciente.')
      return
    }

    if (!profissionalId) {
      setErro('Selecione o profissional.')
      return
    }

    if (formaPagamento === 'cortesia' && !descricao.trim()) {
      setErro('Informe o motivo da cortesia.')
      return
    }

    setRegistrando(true)
    try {
      await registrarEntradaCaixa(
        clinicaAtivaId,
        formaPagamento,
        valorNumerico,
        descricao.trim() || null,
        pacienteId,
        profissionalId,
        agendamentoIdInicial,
      )
      setValor('')
      setDescricao('')
      setPacienteId('')
      setProfissionalId('')
      await onRegistrado()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível registrar a entrada.')
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={comCard ? 'space-y-5 rounded-[18px] bg-[var(--fundo-card)] p-6 sm:p-8' : 'space-y-5'}
      style={comCard ? { boxShadow: 'var(--sombra-neutra)' } : undefined}
    >
      {comCard && <h2 className="texto-titulo-secao text-[var(--texto-principal)]">Registrar entrada</h2>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Paciente <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <select
            required
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            disabled={registrando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          >
            <option value="">Selecione...</option>
            {pacientes.map((paciente) => (
              <option key={paciente.id} value={paciente.id}>
                {paciente.nome_completo}
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
            onChange={(e) => handleProfissionalChange(e.target.value)}
            disabled={registrando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          >
            <option value="">Selecione...</option>
            {profissionais.map((profissional) => (
              <option key={profissional.id} value={profissional.id}>
                {profissional.nome_completo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Forma de pagamento <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <select
            required
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
            disabled={registrando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          >
            {FORMAS_PAGAMENTO.map((forma) => (
              <option key={forma.valor} value={forma.valor}>
                {forma.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            Valor (R$) <span className="text-[var(--cor-erro)]">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            disabled={registrando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
            {formaPagamento === 'cortesia' ? 'Motivo da cortesia' : 'Descrição (opcional)'}
          </label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            disabled={registrando}
            className="w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
          />
        </div>
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] px-3 py-2 text-sm text-[var(--cor-erro)]"
        >
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={registrando}
        className="rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {registrando ? 'Registrando...' : 'Registrar entrada'}
      </button>
    </form>
  )
}
