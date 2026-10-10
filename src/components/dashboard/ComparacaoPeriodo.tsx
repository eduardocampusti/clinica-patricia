import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, CardContent } from '../ui/card'
import { ChartContainer } from '../ui/chart'
import type { FonteAnalise, UnidadeAnalise } from '../../lib/analiseFinanceira'
import { formatarCentavos } from '../../lib/financeiro/financeiro.money'

// Composição adaptada do ReUI c-chart-2. Cada grupo mantém nome, valor exato
// e barra juntos; o domínio compartilhado preserva a proporção entre clínicas.
export default function ComparacaoPeriodo({ unidades, fontes, completa }: {
  unidades: UnidadeAnalise[]; fontes: Record<string, FonteAnalise>; completa: boolean
}) {
  const atual = (u: UnidadeAnalise) => Boolean(fontes[u.id]?.dado && !fontes[u.id]?.erro && !fontes[u.id]?.carregando)
  const dados = unidades.flatMap(u => fontes[u.id]?.dado ? [{ ...u, valor: Number(fontes[u.id].dado!.bruto) / 100 }] : [])
  const negativos = dados.some(d => d.valor < 0)
  const todasAtuais = unidades.length > 0 && unidades.every(atual)
  const zero = todasAtuais && dados.every(d => d.valor === 0)
  // Número aproximado somente para coordenadas; os rótulos continuam em centavos exatos.
  const maximo = Math.max(0, ...dados.filter(atual).map(d => d.valor)) || 1

  return <Card className="analise-comparacao">
    <CardHeader><h3>Comparação no período</h3><p>Recebido bruto por clínica</p></CardHeader>
    <CardContent>
      <ul className="analise-comparacao-valores">{unidades.map(u => {
        const fonte = fontes[u.id]
        const dado = dados.find(d => d.id === u.id)
        const exibirBarra = atual(u) && !negativos && dado && dado.valor > 0
        return <li key={u.id} data-clinica={u.slug}>
          <div className="analise-comparacao-rotulo">
            <span className="analise-unidade"><i data-clinica={u.slug} aria-hidden="true" />{u.nome.replace('Clínica ', '')}</span>
            <strong className="numero-tabular">{fonte?.dado ? formatarCentavos(fonte.dado.bruto) : fonte?.carregando ? 'Carregando…' : 'Indisponível'}</strong>
          </div>
          {exibirBarra ? <ChartContainer className="analise-barras" aria-label={`${u.nome}: ${formatarCentavos(fonte!.dado!.bruto)}. Escala comum a partir de zero.`}>
            <BarChart data={[dado]} layout="vertical" accessibilityLayer margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis type="number" domain={[0, maximo]} hide />
              <YAxis type="category" dataKey="nome" hide />
              <Bar dataKey="valor" barSize={26} radius={[0, 4, 4, 0]} fill={`var(--analise-${u.slug})`} isAnimationActive={false} />
            </BarChart>
          </ChartContainer> : <div className="analise-barra-ausente" aria-hidden="true" />}
          {(fonte?.erro || fonte?.carregando || !fonte?.dado) && <small>
            {fonte?.erro === 'permissao' ? 'Acesso recusado' : fonte?.erro ? fonte.dado ? 'Falha · dados anteriores, sem barra' : 'Leitura indisponível' : fonte?.carregando ? fonte.dado ? 'Atualizando · dados anteriores, sem barra' : 'Carregando' : 'Aguardando leitura'}
          </small>}
        </li>
      })}</ul>
      {negativos && <p role="status" className="analise-nota">Valor bruto negativo retornado. Confira os valores exatos no resumo; a comparação por barras está indisponível.</p>}
      <p className="analise-nota">{!completa || !todasAtuais ? 'Comparação incompleta. Confira a atualização de cada clínica.' : zero ? 'Nenhum valor bruto recebido no período.' : 'Mesma escala para as clínicas selecionadas.'}</p>
    </CardContent>
  </Card>
}
