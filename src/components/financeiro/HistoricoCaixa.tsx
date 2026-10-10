import { useCallback, useState } from 'react'
import { useFinanceiroConsulta } from '../../hooks/useFinanceiroConsulta'
import { consultarResumoCaixa, consultarDetalhesCaixa } from '../../lib/financeiro/financeiro.caixa-leitura'
import { listarHistoricoCaixa, type CursorCaixa, type SessaoHistorica } from '../../lib/financeiro/financeiro.movimentos-leitura'
import { formatarDataFinanceira } from '../../lib/financeiro/financeiro.date'
import { ModalBase } from '../ModalBase'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { ComposicaoCaixa, IndicadoresCaixa } from './CaixaRecepcaoVisual'
import { ExtratoCaixa } from './ExtratoCaixa'
import { TentativasFechamento } from './TentativasFechamento'

const botao = 'finance-button'
const ROTULOS: Record<string, string> = { aberto: 'Aberto', em_fechamento: 'Em fechamento', aguardando_aprovacao: 'Aguardando aprovação', devolvido_para_correcao: 'Devolvido para correção', aprovado: 'Fechamento aprovado', fechado: 'Fechado' }
function DetalhesHistoricos({ sessao, clinicaId }: { sessao: SessaoHistorica; clinicaId: string }) {
  const carregar = useCallback(async () => {
    const [caixa, detalhes] = await Promise.all([consultarResumoCaixa(sessao.id), consultarDetalhesCaixa(sessao.id)])
    if (caixa.clinica_id !== clinicaId || caixa.sessao_caixa_id !== sessao.id) throw new Error('Contexto do histórico divergente.')
    return { caixa, detalhes }
  }, [sessao.id, clinicaId])
  const consulta = useFinanceiroConsulta(sessao.legado ? null : `${clinicaId}:${sessao.id}`, carregar)
  const dados = consulta.resultado.estado === 'sucesso' ? consulta.resultado.dados : null
  return <div className="cr-caixa"><p>Aberto em {formatarDataFinanceira(sessao.aberto_em)} · {ROTULOS[sessao.status] ?? 'Situação histórica'}</p>
    {sessao.legado ? <p>Caixa legado preservado. Não há conversão automática nem reutilização de seu fundo em uma nova abertura.</p> : <>
      {consulta.resultado.estado === 'carregando' && <p role="status">Consultando sessão…</p>}
      {consulta.resultado.estado === 'erro' && <FeedbackAlert variant="destructive" title="Sessão indisponível" description={consulta.resultado.erro.message} action={<button className={botao} onClick={() => void consulta.recarregar()}>Tentar novamente</button>} />}
      {dados && <><IndicadoresCaixa resumo={dados.caixa.resumo} /><ComposicaoCaixa resumo={dados.caixa.resumo} /><ExtratoCaixa clinicaId={clinicaId} sessaoId={sessao.id} />
        <TentativasFechamento clinicaId={clinicaId} sessaoId={sessao.id} />
        {dados.detalhes.ultimoFechamento && <p>Última tentativa de fechamento: {dados.detalhes.ultimoFechamento.tentativa} · {ROTULOS[dados.detalhes.ultimoFechamento.status] ?? dados.detalhes.ultimoFechamento.status}.</p>}</>}
    </>}
  </div>
}
export function HistoricoCaixa({ clinicaId, onFechar }: { clinicaId: string; onFechar: () => void }) {
  const [cursores, setCursores] = useState<(CursorCaixa | null)[]>([null])
  const [selecionada, setSelecionada] = useState<SessaoHistorica | null>(null)
  const cursor = cursores.at(-1)!
  const carregar = useCallback(() => listarHistoricoCaixa(clinicaId, cursor), [clinicaId, cursor])
  const consulta = useFinanceiroConsulta(`${clinicaId}:${cursor?.id ?? 'inicio'}`, carregar)
  const dados = consulta.resultado.estado === 'sucesso' ? consulta.resultado.dados : null
  return <ModalBase titulo="Histórico de caixas" largura="lg" onFechar={onFechar}>
    {selecionada ? <><button className={`${botao} mb-4`} onClick={() => setSelecionada(null)}>Voltar ao histórico</button><DetalhesHistoricos sessao={selecionada} clinicaId={clinicaId} /></> : <>
      {consulta.resultado.estado === 'carregando' && <p role="status">Consultando histórico…</p>}
      {consulta.resultado.estado === 'erro' && <FeedbackAlert variant="destructive" title="Histórico indisponível" description={consulta.resultado.erro.message} action={<button className={botao} onClick={() => void consulta.recarregar()}>Tentar novamente</button>} />}
      {dados && (!dados.itens.length ? <p>Nenhum caixa registrado nesta clínica.</p> : <ul>{dados.itens.map(sessao => <li key={sessao.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--borda)] py-4">
        <div><strong>Abertura {formatarDataFinanceira(sessao.aberto_em)}</strong><p className="cr-nota">{ROTULOS[sessao.status] ?? 'Situação histórica'}{sessao.legado ? ' · legado' : ''}</p></div>
        <button className={botao} aria-label={`Detalhes do caixa aberto em ${formatarDataFinanceira(sessao.aberto_em)}`} onClick={() => setSelecionada(sessao)}>Detalhes</button>
      </li>)}</ul>)}
      <div className="cr-paginacao"><span>Página {cursores.length}</span><button className={botao} disabled={cursores.length === 1} onClick={() => setCursores(c => c.slice(0, -1))}>Anterior</button>
        <button className={botao} disabled={!dados?.proximo} onClick={() => dados?.proximo && setCursores(c => [...c, dados.proximo!])}>Próxima</button></div>
      <p className="cr-nota mt-4">Valores anteriores são referência. Conte novamente o fundo antes de abrir outro caixa.</p>
    </>}
  </ModalBase>
}
