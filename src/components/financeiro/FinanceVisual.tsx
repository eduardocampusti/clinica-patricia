import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { decimalBancoParaCentavos, formatarCentavos } from '../../lib/financeiro/financeiro.money'
import type { DecimalBanco, ResumoDashboardComum } from '../../lib/financeiro/financeiro.types'

export type FinanceIconName = 'money' | 'clinic' | 'people' | 'cash' | 'refund' | 'wallet' | 'clock' | 'document' | 'chart' | 'arrow' | 'down' | 'refresh'
export function FinanceIcon({ name }: { name: FinanceIconName }) {
  const paths: Record<FinanceIconName, ReactNode> = {
    money: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5h-4.5a2 2 0 0 0 0 4H13a2 2 0 0 1 0 4H8.5M12 6v12" /></>,
    clinic: <><path d="M4 21V3h11v18M15 10h5v11M2 21h20M8 7h3M8 11h3M8 15h3M8 21v-3h3v3" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2ZM17 5a3 3 0 0 1 0 6M18 15a4 4 0 0 1 3 4v2" /></>,
    cash: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M7 8V3h10v5M7 15h.01M17 15h.01" /><circle cx="12" cy="15" r="2" /></>,
    refund: <><path d="M9 4 4 9l5 5M4 9h10a6 6 0 0 1 0 12H7M4 16v5" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18M8 9v4h8V9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 3" /></>,
    document: <><path d="M5 3h9l5 5v13H5ZM14 3v6h5M9 13h6M9 17h6" /></>,
    chart: <><path d="M4 3v18h17M8 15l4-5 4 2 4-7" /></>,
    arrow: <path d="M4 12h16M14 6l6 6-6 6" />,
    down: <path d="M12 3v18M5 14l7 7 7-7" />,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M18 18a8 8 0 0 1-13-3" /></>,
  }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
export type FinanceTone = 'green' | 'blue' | 'purple' | 'orange' | 'rose'
export function MoneyValue({ value }: { value: DecimalBanco }) {
  return <span className="numero-tabular">{formatarCentavos(decimalBancoParaCentavos(value))}</span>
}
export function FinanceMetric({ label, value, note, icon, tone = 'blue' }: { label: string; value: ReactNode; note?: ReactNode; icon: FinanceIconName; tone?: FinanceTone }) {
  return <div className="finance-stat"><span className="finance-icon-tile" data-tone={tone}><FinanceIcon name={icon} /></span>
    <div className="finance-stat-body"><p className="finance-stat-label">{label}</p><p className="finance-stat-value">{value}</p>{note && <div className="finance-stat-note">{note}</div>}</div>
  </div>
}
export function FinanceCard({ title, children, action, className = '' }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`finance-surface finance-card ${className}`}><div className="finance-card-heading"><h2>{title}</h2>{action}</div>{children}</section>
}
export function FinanceEmptyState({ title, children, icon = 'chart' }: { title: string; children: ReactNode; icon?: FinanceIconName }) {
  return <div className="finance-empty-state"><span className="finance-empty-icon"><FinanceIcon name={icon} /></span><strong>{title}</strong><p>{children}</p></div>
}
export function FinancePendingItem({ title, note, icon, tone, onClick }: { title: string; note: string; icon: FinanceIconName; tone: FinanceTone; onClick?: () => void }) {
  const body = <><span className="finance-icon-tile finance-icon-small" data-tone={tone}><FinanceIcon name={icon} /></span><span className="finance-list-copy"><strong>{title}</strong><small>{note}</small></span>{onClick && <FinanceIcon name="arrow" />}</>
  return onClick ? <button type="button" className="finance-pending-item" onClick={onClick}>{body}</button> : <div className="finance-pending-item">{body}</div>
}

const diaCurto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
export function FinanceReceiptsChart({ resumo }: { resumo: ResumoDashboardComum }) {
  const id = useId()
  const grafico = useRef<SVGSVGElement>(null)
  const [largura, setLargura] = useState(630)
  const serie = resumo.series
  useEffect(() => {
    const elemento = grafico.current
    if (!elemento) return
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.max(280, entrada.contentRect.width)))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [serie.length])
  // Conversão usada exclusivamente para coordenadas do gráfico; os valores vêm do banco.
  const valores = serie.map((item) => Number(decimalBancoParaCentavos(item.bruto)))
  const max = Math.max(1, ...valores)
  const x = (index: number) => 70 + (serie.length === 1 ? (largura - 90) / 2 : index * (largura - 90) / (serie.length - 1))
  const y = (valor: number) => 180 - valor / max * 155
  const linha = valores.map((valor, index) => `${index ? 'L' : 'M'}${x(index)},${y(valor)}`).join(' ')
  return <FinanceCard title="Evolução de recebimentos" action={<span className="finance-chart-period">Diário</span>} className="finance-chart-card">
    {!serie.length ? <FinanceEmptyState title="Seu movimento começa aqui">Os recebimentos do período aparecerão neste gráfico.</FinanceEmptyState> : <>
      <svg ref={grafico} className="finance-line-chart" viewBox={`0 0 ${largura} 210`} role="img" aria-label="Recebimentos brutos por dia. Valores disponíveis em Ver dados diários.">
        <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--finance-accent)" stopOpacity=".22" /><stop offset="100%" stopColor="var(--finance-accent)" stopOpacity=".025" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((i) => <g key={i}><line x1="70" x2={largura - 20} y1={25 + i * 38.75} y2={25 + i * 38.75} stroke="var(--finance-line)" strokeWidth=".7" />
          <text x="60" y={29 + i * 38.75} textAnchor="end">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(max * (1 - i / 4) / 100)}</text></g>)}
        <path d={`${linha} L${x(serie.length - 1)},180 L${x(0)},180 Z`} fill={`url(#${id})`} />
        <path d={linha} fill="none" stroke="var(--finance-accent)" strokeWidth="2" />
        {serie.map((item, i) => <g key={item.dia}>{serie.length <= 35 && <circle cx={x(i)} cy={y(valores[i])} r="3" fill="var(--finance-accent)"><title>{diaCurto(item.dia)}: {formatarCentavos(decimalBancoParaCentavos(item.bruto))}</title></circle>}
          {(i === 0 || i === serie.length - 1 || (i % Math.ceil(serie.length / (largura < 450 ? 3 : 6)) === 0 && i < serie.length - 2)) && <text x={x(i)} y="203" textAnchor="middle">{diaCurto(item.dia)}</text>}</g>)}
      </svg>
      <details className="finance-chart-data"><summary>Ver dados diários</summary><ul>{serie.map((item) => <li key={item.dia}><span>{diaCurto(item.dia)}</span><span>Bruto <MoneyValue value={item.bruto} /></span><span>Líquido atual <MoneyValue value={item.liquido_atual_coorte} /></span><span>Estornos do dia <MoneyValue value={item.estornos_eventos} /></span></li>)}</ul></details>
    </>}
  </FinanceCard>
}
export function FinancePaymentsChart({ resumo }: { resumo: ResumoDashboardComum }) {
  const metodos = [{ nome: 'PIX', valor: resumo.pagamentos.pix, cor: '#428ff0' }, { nome: 'Cartão de crédito', valor: resumo.pagamentos.cartao_credito, cor: '#e95686' }, { nome: 'Dinheiro', valor: resumo.pagamentos.dinheiro, cor: '#9662df' }]
  const bruto = Number(decimalBancoParaCentavos(resumo.producao.bruto))
  let offset = 0
  return <FinanceCard title="Formas de pagamento" className="finance-payments-card">
    {bruto <= 0 ? <FinanceEmptyState title="Nenhum pagamento no período" icon="wallet">PIX, cartão de crédito e dinheiro aparecerão aqui.</FinanceEmptyState> : <div className="finance-payments-content">
      <div className="finance-donut"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="65" fill="none" stroke="var(--finance-line)" strokeWidth="24" />
        {metodos.map((metodo) => { const tamanho = Number(decimalBancoParaCentavos(metodo.valor)) / bruto * 100; const inicio = offset; offset += tamanho
          return <circle key={metodo.nome} cx="80" cy="80" r="65" fill="none" stroke={metodo.cor} strokeWidth="24" pathLength="100" strokeDasharray={`${tamanho} ${100 - tamanho}`} strokeDashoffset={-inicio} transform="rotate(-90 80 80)" /> })}</svg>
        <div><strong><MoneyValue value={resumo.producao.bruto} /></strong><span>Total recebido</span></div>
      </div><ul className="finance-payment-legend">{metodos.map((metodo) => <li key={metodo.nome}><i style={{ background: metodo.cor }} /><span>{metodo.nome}</span><strong><MoneyValue value={metodo.valor} /></strong></li>)}</ul>
    </div>}
    <p className="finance-caption">Valores brutos; estornos apresentados separadamente.</p>
  </FinanceCard>
}
