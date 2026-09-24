import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Papel } from '../hooks/usePapelNaClinica'
import FinanceiroCaixa from './FinanceiroCaixa'
import FinanceiroEstornos from './FinanceiroEstornos'
import FinanceiroFiscal from './FinanceiroFiscal'
import FinanceiroPainel from './FinanceiroPainel'
import FinanceiroRepasses from './FinanceiroRepasses'
import { FinanceIcon, type FinanceIconName } from '../components/financeiro/FinanceVisual'

const FinanceiroRelatorios = lazy(() => import('./FinanceiroRelatorios'))
type Aba = 'painel' | 'caixa' | 'estornos' | 'repasses' | 'fiscal' | 'relatorios'
const rotulos: Record<Aba, string> = {
  painel: 'Visão geral', caixa: 'Caixa', estornos: 'Estornos', repasses: 'Repasses', fiscal: 'Fiscal', relatorios: 'Relatórios',
}
const icones: Record<Aba, FinanceIconName> = { painel: 'document', caixa: 'cash', estornos: 'refund', repasses: 'people', fiscal: 'wallet', relatorios: 'chart' }

export default function FinanceiroModulo({ clinicaAtivaId, carregandoClinica, usuarioId, papel, carregandoPapel }: {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
  usuarioId: string
  papel: Papel | null
  carregandoPapel: boolean
}) {
  const [aba, setAba] = useState<Aba>('painel')
  const [periodHost, setPeriodHost] = useState<HTMLDivElement | null>(null)
  const navegacao = useRef<HTMLElement>(null)
  const focarAba = useRef(false)
  const administrativo = papel === 'proprietaria' || papel === 'recepcao'
  const abasPermitidas: readonly Aba[] = papel === 'proprietaria'
    ? ['painel', 'caixa', 'estornos', 'repasses', 'fiscal', 'relatorios']
    : papel === 'recepcao' ? ['caixa', 'estornos', 'fiscal']
      : papel === 'medico' ? ['painel', 'relatorios'] : ['caixa']
  const abaAtiva = abasPermitidas.includes(aba) ? aba : abasPermitidas[0]
  useEffect(() => { if (aba !== abaAtiva) setAba(abaAtiva) }, [aba, abaAtiva])
  useEffect(() => {
    if (!focarAba.current) return
    navegacao.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus()
    focarAba.current = false
  }, [abaAtiva])

  if ((!administrativo && papel !== 'medico') || !clinicaAtivaId || carregandoClinica || carregandoPapel) {
    return <div className="financeiro-ui"><FinanceiroCaixa clinicaAtivaId={clinicaAtivaId} carregandoClinica={carregandoClinica}
      usuarioId={usuarioId} papel={papel} carregandoPapel={carregandoPapel} /></div>
  }

  return <div className="financeiro-ui space-y-5">
    <div className="finance-page-intro">
      <div><h1 className="texto-titulo-tela">Financeiro</h1>
        <p>{papel === 'medico' ? 'Sua produção e seus repasses, em um só lugar.' : 'Acompanhe a operação e os resultados da clínica.'}</p></div>
      <div className="finance-period-host" ref={setPeriodHost} />
    </div>
    <nav ref={navegacao} aria-label="Áreas do Financeiro" className="finance-nav">
      {abasPermitidas.map((opcao) => <button key={opcao} type="button" aria-current={abaAtiva === opcao ? 'page' : undefined}
        onClick={() => setAba(opcao)}><FinanceIcon name={icones[opcao]} />{rotulos[opcao]}</button>)}
    </nav>
    {abaAtiva === 'caixa' ? <FinanceiroCaixa clinicaAtivaId={clinicaAtivaId} carregandoClinica={false}
      usuarioId={usuarioId} papel={papel} carregandoPapel={false} />
      : abaAtiva === 'estornos' ? <FinanceiroEstornos clinicaId={clinicaAtivaId} usuarioId={usuarioId} papel={papel} />
        : abaAtiva === 'repasses' ? <FinanceiroRepasses clinicaId={clinicaAtivaId} usuarioId={usuarioId} />
        : abaAtiva === 'fiscal' ? <FinanceiroFiscal clinicaId={clinicaAtivaId} usuarioId={usuarioId} />
        : abaAtiva === 'painel' ? <FinanceiroPainel key={`${clinicaAtivaId}:${papel}`} clinicaId={clinicaAtivaId} papel={papel === 'medico' ? 'medico' : 'proprietaria'} periodHost={periodHost} onNavegar={(destino) => { if (abasPermitidas.includes(destino)) { focarAba.current = true; setAba(destino) } }} />
          : <Suspense fallback={<div role="status" aria-label="Carregando relatórios" className="finance-skeleton" />}>
            <FinanceiroRelatorios clinicaId={clinicaAtivaId} papel={papel === 'medico' ? 'medico' : 'proprietaria'} />
          </Suspense>}
  </div>
}
