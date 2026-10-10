import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '../ui/chart'
import { linhasDoGrafico, type FonteAnalise, type MetricaAnalise, type PeriodoAnalise, type UnidadeAnalise } from '../../lib/analiseFinanceira'
import { formatarCentavos } from '../../lib/financeiro/financeiro.money'

const data = (instante: number) => new Date(instante).toISOString().slice(0, 10)
const dia = (valor: string) => valor.split('-').reverse().join('/')
const eixo = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })

export default function GraficoAnalise({ unidades, fontes, periodo, metrica }: {
  unidades: UnidadeAnalise[]; fontes: Record<string, FonteAnalise>; periodo: PeriodoAnalise; metrica: MetricaAnalise
}) {
  const linhas = linhasDoGrafico(unidades, fontes, periodo, metrica)
  const datas = [...new Set(unidades.flatMap(u => fontes[u.id]?.dado?.pontos.map(p => p.dia) ?? []))].sort()
  const valor = (u: UnidadeAnalise, d: string) => fontes[u.id]?.dado?.pontos.find(p => p.dia === d)?.[metrica]
  const apresentar = (u: UnidadeAnalise, d: string) => {
    const fonte = fontes[u.id]
    if (!fonte?.dado) return fonte?.erro === 'permissao' ? 'Acesso recusado' : fonte?.erro ? 'Leitura indisponível' : fonte?.carregando ? 'Carregando' : 'Aguardando leitura'
    const v = valor(u, d)
    return v === undefined ? 'Sem ponto retornado' : formatarCentavos(v)
  }
  const rotulo = metrica === 'bruto' ? 'Recebido bruto diário' : 'Parcela líquida diária da clínica'
  return <div className="analise-grafico">
    <ul className="analise-legenda" aria-label="Legenda do gráfico">{unidades.map(u => <li data-clinica={u.slug} key={u.id}><span aria-hidden="true" />{u.nome}{fontes[u.id]?.dado && (fontes[u.id]?.erro || fontes[u.id]?.carregando) ? ' · desatualizado' : ''}</li>)}</ul>
    {datas.length ? <ChartContainer aria-label={`${rotulo}. Use as setas no gráfico ou consulte os valores diários abaixo.`}>
      <LineChart data={linhas} accessibilityLayer margin={{ top: 16, right: 18, bottom: 12, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--borda)" strokeDasharray="3 3" />
        <XAxis dataKey="instante" type="number" scale="time" domain={[Date.parse(`${periodo.inicio}T12:00:00Z`), Date.parse(`${periodo.fim}T12:00:00Z`)]} tickFormatter={n => dia(data(n)).slice(0, 5)} tickLine={false} axisLine={false} minTickGap={40} stroke="var(--texto-secundario)" />
        <YAxis width={76} tickFormatter={n => eixo.format(n)} tickLine={false} axisLine={false} stroke="var(--texto-secundario)" />
        <ChartTooltip filterNull={false} isAnimationActive={false} content={({ active, label }) => {
          if (!active || typeof label !== 'number') return null
          const d = data(label)
          return <div className="analise-tooltip"><strong>{dia(d)}</strong>{unidades.map(u => <p data-clinica={u.slug} key={u.id}><span>{u.nome.replace('Clínica ', '')}</span><strong className="numero-tabular">{apresentar(u, d)}</strong></p>)}</div>
        }} />
        {unidades.map(u => <Line key={u.id} dataKey={u.slug} name={u.nome} type="linear" stroke={`var(--analise-${u.slug})`} strokeWidth={2.5} strokeDasharray={u.slug === 'ipupiara' ? '6 3' : undefined} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>
    </ChartContainer> : <div className="analise-chart-container analise-sem-grafico" role="status">O gráfico depende de uma leitura válida. Confira o estado de cada clínica.</div>}

    {datas.length > 0 && <details className="analise-dados-diarios"><summary>Ver valores diários exatos</summary>
      <div className="analise-tabela-container" tabIndex={0} role="region" aria-label="Valores diários do gráfico"><table className="analise-tabela analise-diaria"><caption>{rotulo} — valores retornados pelo serviço</caption><thead><tr><th scope="col">Data</th>{unidades.map(u => <th scope="col" key={u.id}>{u.nome}</th>)}</tr></thead><tbody>{datas.map(d => <tr key={d}><th scope="row">{dia(d)}</th>{unidades.map(u => <td data-label={u.nome} key={u.id}>{apresentar(u, d)}</td>)}</tr>)}</tbody></table></div>
    </details>}
  </div>
}
