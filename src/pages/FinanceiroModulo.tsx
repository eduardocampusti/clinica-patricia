import { useState } from 'react'
import type { Papel } from '../hooks/usePapelNaClinica'
import FinanceiroCaixa from './FinanceiroCaixa'
import FinanceiroEstornos from './FinanceiroEstornos'
import FinanceiroFiscal from './FinanceiroFiscal'
import FinanceiroPainel from './FinanceiroPainel'
import FinanceiroRepasses from './FinanceiroRepasses'

export default function FinanceiroModulo({ clinicaAtivaId, carregandoClinica, usuarioId, papel, carregandoPapel }: {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
  usuarioId: string
  papel: Papel | null
  carregandoPapel: boolean
}) {
  const [aba, setAba] = useState<'caixa' | 'estornos' | 'repasses' | 'fiscal' | 'painel'>('caixa')
  const administrativo = papel === 'proprietaria' || papel === 'recepcao'
  if (papel === 'medico' && clinicaAtivaId && !carregandoClinica && !carregandoPapel) {
    return <FinanceiroPainel clinicaId={clinicaAtivaId} papel="medico" />
  }
  if (!administrativo || !clinicaAtivaId || carregandoClinica || carregandoPapel) {
    return <FinanceiroCaixa clinicaAtivaId={clinicaAtivaId} carregandoClinica={carregandoClinica}
      usuarioId={usuarioId} papel={papel} carregandoPapel={carregandoPapel} />
  }
  return <div className="space-y-6">
    <nav aria-label="Áreas do Financeiro" className="flex flex-wrap gap-2 border-b border-[var(--borda)] pb-3">
      {(['caixa', 'estornos', ...(papel === 'proprietaria' ? ['repasses'] as const : []), 'fiscal', ...(papel === 'proprietaria' ? ['painel'] as const : [])] as const).map((opcao) => <button key={opcao} type="button"
        aria-current={aba === opcao ? 'page' : undefined} onClick={() => setAba(opcao)}
        className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 ${aba === opcao
          ? 'bg-[var(--texto-principal)] text-white'
          : 'border border-[var(--borda)] text-[var(--texto-principal)]'}`}>
        {opcao === 'caixa' ? 'Caixa' : opcao === 'estornos' ? 'Estornos' : opcao === 'repasses' ? 'Repasses' : opcao === 'fiscal' ? 'Fiscal' : 'Painel'}
      </button>)}
    </nav>
    {aba === 'caixa' ? <FinanceiroCaixa clinicaAtivaId={clinicaAtivaId} carregandoClinica={false}
      usuarioId={usuarioId} papel={papel} carregandoPapel={false} />
      : aba === 'estornos' ? <FinanceiroEstornos clinicaId={clinicaAtivaId} usuarioId={usuarioId} papel={papel} />
        : aba === 'repasses' ? <FinanceiroRepasses clinicaId={clinicaAtivaId} usuarioId={usuarioId} />
        : aba === 'fiscal' ? <FinanceiroFiscal clinicaId={clinicaAtivaId} usuarioId={usuarioId} />
        : <FinanceiroPainel clinicaId={clinicaAtivaId} papel="proprietaria" />}
  </div>
}
