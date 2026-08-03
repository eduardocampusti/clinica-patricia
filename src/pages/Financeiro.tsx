import { useState, type FormEvent } from 'react'
import { useSessaoCaixaAberta } from '../hooks/useSessaoCaixaAberta'
import { abrirCaixa } from '../lib/api'

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface FinanceiroProps {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
}

function Financeiro({ clinicaAtivaId, carregandoClinica }: FinanceiroProps) {
  const { sessao, carregando: carregandoSessao, recarregar } = useSessaoCaixaAberta(clinicaAtivaId)
  const [valorAbertura, setValorAbertura] = useState('')
  const [abrindo, setAbrindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (!clinicaAtivaId) return

    const valor = Number(valorAbertura.replace(',', '.'))
    if (Number.isNaN(valor) || valor < 0) {
      setErro('Informe um valor inicial válido.')
      return
    }

    setAbrindo(true)
    try {
      await abrirCaixa(clinicaAtivaId, valor)
      setValorAbertura('')
      await recarregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível abrir o caixa.')
    } finally {
      setAbrindo(false)
    }
  }

  const carregando = carregandoClinica || carregandoSessao

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-normal text-[var(--texto-titulo)]">Financeiro</h1>
        <p className="text-sm text-[var(--texto-secundario)]">Fluxo de caixa da clínica.</p>
      </div>

      <div className="rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-6 shadow-[0px_1px_8px_rgba(0,0,0,0.1)] sm:p-8">
        {carregando ? (
          <p className="text-center text-sm text-[var(--texto-secundario)]">Carregando...</p>
        ) : !clinicaAtivaId ? (
          <p className="text-center text-sm text-[var(--texto-secundario)]">
            Nenhuma clínica vinculada ao seu usuário.
          </p>
        ) : sessao ? (
          <div className="space-y-1.5">
            <h2 className="text-lg font-normal text-[var(--texto-titulo)]">Caixa aberto</h2>
            <p className="text-sm text-[var(--texto-secundario)]">
              Desde {formatarHora(sessao.aberto_em)} · Valor inicial{' '}
              <span className="font-medium text-[var(--texto-principal)]">
                {formatarPreco(sessao.valor_abertura)}
              </span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="mb-4 text-lg font-normal text-[var(--texto-titulo)]">Abrir caixa</h2>
              <label className="mb-1.5 block text-sm font-medium text-[var(--texto-principal)]">
                Valor inicial em dinheiro <span className="text-[var(--cor-erro)]">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                required
                value={valorAbertura}
                onChange={(e) => setValorAbertura(e.target.value)}
                disabled={abrindo}
                className="w-full max-w-xs rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none transition focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)] disabled:opacity-60"
              />
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
              disabled={abrindo}
              className="rounded-xl bg-[var(--cor-primaria)] px-5 py-2.5 font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--cor-primaria)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {abrindo ? 'Abrindo...' : 'Abrir caixa'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Financeiro
