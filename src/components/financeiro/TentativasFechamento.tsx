import { useCallback, useState } from 'react'
import { useFinanceiroConsulta } from '../../hooks/useFinanceiroConsulta'
import { mapearErroFinanceiro } from '../../lib/financeiro/financeiro.errors'
import { formatarDataFinanceira } from '../../lib/financeiro/financeiro.date'
import { decimalBancoParaCentavos, formatarCentavos } from '../../lib/financeiro/financeiro.money'
import type { FechamentoCaixa } from '../../lib/financeiro/financeiro.caixa-leitura'
import { FeedbackAlert } from '../feedback/FeedbackAlert'

type Revisao = { fechamento_id: string; observacao: string | null; revisado_em: string; acao: string }
type Linha = FechamentoCaixa & { revisoes_fechamento_caixa: Revisao[] }
const moeda = (v: string | number) => formatarCentavos(decimalBancoParaCentavos(v))
export function TentativasFechamento({ clinicaId, sessaoId }: { clinicaId: string; sessaoId: string }) {
  const [limites, setLimites] = useState<(number | null)[]>([null])
  const limite = limites.at(-1)!
  const carregar = useCallback(async () => {
    try {
      const { supabase } = await import('../../lib/supabase')
      let query = supabase.from('fechamentos_caixa').select('id, tentativa, status, valor_esperado, valor_contado, diferenca, justificativa_diferenca, enviado_em')
        .eq('clinica_id', clinicaId).eq('sessao_caixa_id', sessaoId).order('tentativa', { ascending: false }).limit(21)
      if (limite !== null) query = query.lt('tentativa', limite)
      const { data, error } = await query
      if (error) throw error
      const linhas = (data ?? []) as unknown as FechamentoCaixa[]
      const exibidas = linhas.slice(0, 20)
      // Duas FKs históricas apontam ao fechamento. Evita join ambíguo e formato objeto/array.
      const revisoes = exibidas.length ? await supabase.from('revisoes_fechamento_caixa').select('fechamento_id, observacao, revisado_em, acao')
        .eq('clinica_id', clinicaId).in('fechamento_id', exibidas.map(f => f.id)) : { data: [], error: null }
      if (revisoes.error) throw revisoes.error
      const itens: Linha[] = exibidas.map(f => ({ ...f, revisoes_fechamento_caixa: ((revisoes.data ?? []) as Revisao[]).filter(r => r.fechamento_id === f.id) }))
      return { itens, proximo: linhas.length > 20 ? linhas[19].tentativa : null }
    } catch (erro) { throw mapearErroFinanceiro(erro) }
  }, [clinicaId, sessaoId, limite])
  const consulta = useFinanceiroConsulta(`${clinicaId}:${sessaoId}:${limite}`, carregar, undefined, { clinicaId, leitura: 'caixa' })
  const dados = consulta.resultado.estado === 'sucesso' ? consulta.resultado.dados : null
  return <details className="finance-surface"><summary className="min-h-11 font-semibold">Histórico das tentativas de fechamento</summary>
    {consulta.resultado.estado === 'carregando' && <p role="status">Consultando tentativas…</p>}
    {consulta.resultado.estado === 'erro' && <FeedbackAlert variant="destructive" title="Tentativas indisponíveis" description={consulta.resultado.erro.message} action={<button className="finance-button" onClick={() => void consulta.recarregar()}>Tentar novamente</button>} />}
    {dados && (!dados.itens.length ? <p className="cr-nota">Nenhuma contagem enviada nesta seleção.</p> : <ul>{dados.itens.map(f => <li className="border-b border-[var(--borda)] py-4" key={f.id}>
      <strong>Tentativa {f.tentativa} · {f.status === 'aprovado' ? 'Aprovada' : f.status === 'devolvido' ? 'Devolvida' : 'Aguardando aprovação'}</strong><p className="cr-nota">{formatarDataFinanceira(f.enviado_em)}</p>
      <dl className="cr-valores"><div><dt>Esperado</dt><dd>{moeda(f.valor_esperado)}</dd></div><div><dt>Contado</dt><dd>{moeda(f.valor_contado)}</dd></div><div><dt>Diferença</dt><dd>{moeda(f.diferenca)}</dd></div></dl>
      {f.justificativa_diferenca && <p>Justificativa: {f.justificativa_diferenca}</p>}
      {f.revisoes_fechamento_caixa?.map(r => <p key={r.revisado_em}>Revisão {formatarDataFinanceira(r.revisado_em)} · {r.acao === 'aprovar' ? 'Aprovada' : 'Devolvida'}{r.observacao ? `: ${r.observacao}` : ''}</p>)}
    </li>)}</ul>)}
    <div className="cr-paginacao"><button className="finance-button" disabled={limites.length === 1} onClick={() => setLimites(l => l.slice(0, -1))}>Tentativas anteriores da seleção</button><span>Página {limites.length}</span><button className="finance-button" disabled={dados?.proximo == null} onClick={() => dados?.proximo != null && setLimites(l => [...l, dados.proximo])}>Tentativas mais antigas</button></div>
  </details>
}
