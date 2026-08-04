import { useState, type FormEvent } from 'react'
import { useSessaoCaixaAberta } from '../hooks/useSessaoCaixaAberta'
import { useEntradasCaixa } from '../hooks/useEntradasCaixa'
import { abrirCaixa, registrarEntradaCaixa, type FormaPagamento } from '../lib/api'

const FORMAS_PAGAMENTO: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao_debito', rotulo: 'Cartão de débito' },
  { valor: 'cartao_credito', rotulo: 'Cartão de crédito' },
  { valor: 'transferencia', rotulo: 'Transferência' },
  { valor: 'convenio', rotulo: 'Convênio' },
  { valor: 'cortesia', rotulo: 'Cortesia' },
]

const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = Object.fromEntries(
  FORMAS_PAGAMENTO.map((f) => [f.valor, f.rotulo]),
) as Record<FormaPagamento, string>

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

      {sessao && <EntradasCaixa sessaoCaixaId={sessao.id} clinicaAtivaId={clinicaAtivaId} />}
    </div>
  )
}

interface EntradasCaixaProps {
  sessaoCaixaId: string
  clinicaAtivaId: string | null
}

function EntradasCaixa({ sessaoCaixaId, clinicaAtivaId }: EntradasCaixaProps) {
  const { entradas, carregando, recarregar } = useEntradasCaixa(sessaoCaixaId)
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const total = entradas.reduce((soma, entrada) => soma + entrada.valor, 0)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (!clinicaAtivaId) return

    const valorNumerico = Number(valor.replace(',', '.'))
    if (Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      setErro('Informe um valor válido, maior que zero.')
      return
    }

    setRegistrando(true)
    try {
      await registrarEntradaCaixa(clinicaAtivaId, formaPagamento, valorNumerico, descricao.trim() || null)
      setValor('')
      setDescricao('')
      await recarregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível registrar a entrada.')
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-6 shadow-[0px_1px_8px_rgba(0,0,0,0.1)] sm:p-8"
      >
        <h2 className="text-lg font-normal text-[var(--texto-titulo)]">Registrar entrada</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
              Descrição (opcional)
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

      <div className="rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] shadow-[0px_1px_8px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between border-b border-[var(--borda)] px-5 py-4">
          <h2 className="text-lg font-normal text-[var(--texto-titulo)]">Entradas da sessão</h2>
          <p className="text-sm text-[var(--texto-secundario)]">
            Total{' '}
            <span className="text-base font-medium text-[var(--texto-principal)]">{formatarPreco(total)}</span>
          </p>
        </div>

        {carregando ? (
          <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">Carregando...</p>
        ) : entradas.length === 0 ? (
          <p className="p-8 text-center text-sm text-[var(--texto-secundario)]">
            Nenhuma entrada registrada nesta sessão ainda.
          </p>
        ) : (
          <>
            <table className="hidden w-full text-left text-sm sm:table">
              <thead>
                <tr className="border-b border-[var(--borda)] text-[var(--texto-secundario)]">
                  <th className="px-5 py-3 font-medium">Horário</th>
                  <th className="px-5 py-3 font-medium">Forma</th>
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {entradas.map((entrada) => (
                  <tr
                    key={entrada.id}
                    className="border-b border-[var(--borda)] text-[var(--texto-principal)] last:border-0"
                  >
                    <td className="px-5 py-3 text-[var(--texto-secundario)]">
                      {formatarHora(entrada.registrado_em)}
                    </td>
                    <td className="px-5 py-3 font-medium">{ROTULO_FORMA_PAGAMENTO[entrada.forma_pagamento]}</td>
                    <td className="px-5 py-3 text-[var(--texto-secundario)]">{entrada.descricao ?? '—'}</td>
                    <td className="px-5 py-3 font-medium">{formatarPreco(entrada.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-[var(--borda)] sm:hidden">
              {entradas.map((entrada) => (
                <li key={entrada.id} className="space-y-1 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[var(--texto-principal)]">
                      {ROTULO_FORMA_PAGAMENTO[entrada.forma_pagamento]}
                    </p>
                    <p className="font-medium text-[var(--texto-principal)]">{formatarPreco(entrada.valor)}</p>
                  </div>
                  <p className="text-sm text-[var(--texto-secundario)]">
                    {formatarHora(entrada.registrado_em)}
                    {entrada.descricao ? ` · ${entrada.descricao}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default Financeiro
