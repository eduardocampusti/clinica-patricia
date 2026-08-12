import { useState, type FormEvent } from 'react'
import {
  estornarLancamento,
  fecharCaixa,
  pagarRepasseIntegral,
  registrarDespesa,
  registrarMovimentoCaixa,
  type CategoriaDespesa,
  type FormaPagamento,
} from '../../lib/api'

const CAMPO = 'w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 py-2.5 text-[var(--texto-principal)] outline-none focus:border-[var(--cor-primaria)] focus:ring-2 focus:ring-[var(--cor-primaria-suave)]'
const BOTAO = 'rounded-lg bg-[var(--cor-primaria)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--cor-primaria-hover)] disabled:opacity-60'
const FORMAS: Exclude<FormaPagamento, 'cortesia'>[] = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'convenio']

function numero(texto: string): number {
  return Number(texto.replace(',', '.'))
}

function Mensagem({ valor }: { valor: string | null }) {
  if (!valor) return null
  return <p role="status" className="text-sm text-[var(--texto-secundario)]">{valor}</p>
}

interface Props { clinicaId: string; onCaixaFechado: () => void | Promise<void> }

export function AcoesFinanceiras({ clinicaId, onCaixaFechado }: Props) {
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setProcessando(true); setMensagem(null)
    try { await acao(); setMensagem(sucesso) }
    catch (erro) { setMensagem(erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.') }
    finally { setProcessando(false) }
  }

  async function movimento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formulario = event.currentTarget; const dados = new FormData(formulario)
    const tipo = dados.get('tipo') as 'sangria' | 'suprimento'; const valor = numero(String(dados.get('valor')))
    const motivo = String(dados.get('motivo') ?? '').trim()
    await executar(() => registrarMovimentoCaixa(clinicaId, tipo, valor, motivo), `${tipo === 'sangria' ? 'Sangria' : 'Suprimento'} registrado.`)
    formulario.reset()
  }

  async function despesa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formulario = event.currentTarget; const dados = new FormData(formulario)
    const status = dados.get('status') as 'pendente' | 'paga'
    await executar(() => registrarDespesa(clinicaId, {
      categoria: dados.get('categoria') as CategoriaDespesa,
      descricao: String(dados.get('descricao') ?? '').trim(),
      valor: numero(String(dados.get('valor'))), status,
      forma_pagamento: status === 'paga' ? dados.get('forma') as Exclude<FormaPagamento, 'cortesia'> : undefined,
    }), 'Despesa registrada.')
    formulario.reset()
  }

  async function fechar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const dados = new FormData(event.currentTarget)
    await executar(async () => {
      await fecharCaixa(clinicaId, numero(String(dados.get('contado'))), String(dados.get('justificativa') ?? '').trim() || null)
      await onCaixaFechado()
    }, 'Caixa fechado e repasses gerados.')
  }

  async function estornar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formulario = event.currentTarget; const dados = new FormData(formulario)
    await executar(() => estornarLancamento(clinicaId, dados.get('origem_tipo') as 'entrada' | 'despesa' | 'pagamento_repasse',
      String(dados.get('origem_id')), String(dados.get('motivo'))), 'Estorno compensatório registrado.')
    formulario.reset()
  }

  async function pagarRepasse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formulario = event.currentTarget; const dados = new FormData(formulario)
    await executar(() => pagarRepasseIntegral(clinicaId, String(dados.get('repasse_id')),
      dados.get('forma') as Exclude<FormaPagamento, 'cortesia'>), 'Repasse pago integralmente.')
    formulario.reset()
  }

  return (
    <div className="space-y-6">
      <Mensagem valor={mensagem} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={movimento} className="space-y-4 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-5">
          <h3 className="font-semibold text-[var(--texto-principal)]">Movimento de caixa</h3>
          <select name="tipo" className={CAMPO}><option value="sangria">Sangria</option><option value="suprimento">Suprimento</option></select>
          <input name="valor" inputMode="decimal" required placeholder="Valor" className={CAMPO} />
          <input name="motivo" required placeholder="Motivo" className={CAMPO} />
          <button disabled={processando} className={BOTAO}>Registrar movimento</button>
        </form>

        <form onSubmit={despesa} className="space-y-4 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-5">
          <h3 className="font-semibold text-[var(--texto-principal)]">Despesa</h3>
          <select name="categoria" className={CAMPO}>
            {['aluguel','energia','agua','internet','material_limpeza','material_clinico','manutencao','honorarios','impostos','outras'].map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}
          </select>
          <input name="descricao" required placeholder="Descrição" className={CAMPO} />
          <input name="valor" inputMode="decimal" required placeholder="Valor" className={CAMPO} />
          <div className="grid grid-cols-2 gap-3"><select name="status" className={CAMPO}><option value="paga">Paga</option><option value="pendente">Pendente</option></select><select name="forma" className={CAMPO}>{FORMAS.map((item) => <option key={item}>{item}</option>)}</select></div>
          <button disabled={processando} className={BOTAO}>Registrar despesa</button>
        </form>

        <form onSubmit={fechar} className="space-y-4 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-5">
          <h3 className="font-semibold text-[var(--texto-principal)]">Fechar caixa</h3>
          <input name="contado" inputMode="decimal" required placeholder="Dinheiro físico contado" className={CAMPO} />
          <textarea name="justificativa" placeholder="Justificativa se houver diferença" className={CAMPO} />
          <button disabled={processando} className={BOTAO}>Fechar caixa</button>
        </form>

        <form onSubmit={estornar} className="space-y-4 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-5">
          <h3 className="font-semibold text-[var(--texto-principal)]">Estorno</h3>
          <select name="origem_tipo" className={CAMPO}><option value="entrada">Entrada</option><option value="despesa">Despesa</option><option value="pagamento_repasse">Pagamento de repasse</option></select>
          <input name="origem_id" required placeholder="ID do lançamento original" className={CAMPO} />
          <input name="motivo" required placeholder="Motivo do estorno" className={CAMPO} />
          <button disabled={processando} className={BOTAO}>Registrar estorno</button>
        </form>

        <form onSubmit={pagarRepasse} className="space-y-4 rounded-2xl border border-[var(--borda)] bg-[var(--fundo-card)] p-5 lg:col-span-2">
          <h3 className="font-semibold text-[var(--texto-principal)]">Pagamento integral de repasse</h3>
          <div className="grid gap-3 sm:grid-cols-2"><input name="repasse_id" required placeholder="ID do repasse" className={CAMPO} /><select name="forma" className={CAMPO}>{FORMAS.map((item) => <option key={item}>{item}</option>)}</select></div>
          <p className="text-xs text-[var(--texto-terciario)]">O valor é determinado pelo banco; pagamento parcial não é aceito.</p>
          <button disabled={processando} className={BOTAO}>Pagar repasse</button>
        </form>
      </div>
    </div>
  )
}
