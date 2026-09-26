import { useCallback, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useFinanceiroConsulta } from '../hooks/useFinanceiroConsulta'
import type { Papel } from '../hooks/usePapelNaClinica'
import { carregarDashboardProfissional, carregarDashboardProprietaria } from '../lib/financeiro/financeiro.dashboard'
import { consultarCaixaAtual, type EstadoCaixaAtual } from '../lib/financeiro/financeiro.caixa-leitura'
import { listarEstornosPendentes, listarRecebimentosParaEstorno } from '../lib/financeiro/financeiro.estornos-leitura'
import { formatarDataFinanceira, intervaloPorDias, TIMEZONE_FINANCEIRO_PADRAO } from '../lib/financeiro/financeiro.date'
import type { DashboardProfissional, DashboardProprietaria, EstadoCarregamento, ResumoDashboardProprietaria } from '../lib/financeiro/financeiro.types'
import { FinanceCard, FinanceEmptyState, FinanceIcon, FinanceMetric, FinancePaymentsChart, FinancePendingItem, FinanceReceiptsChart, MoneyValue } from '../components/financeiro/FinanceVisual'

type Destino = 'caixa' | 'estornos' | 'repasses' | 'fiscal' | 'relatorios'
const nuncaVazio = () => false
const rotulosCaixa = { aberto: 'Aberto', em_fechamento: 'Em fechamento', aguardando_aprovacao: 'Aguardando revisão', devolvido_para_correcao: 'Correção solicitada', aprovado: 'Fechado' }
function hojeBahia(): string {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE_FINANCEIRO_PADRAO, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const campo = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? ''
  return `${campo('year')}-${campo('month')}-${campo('day')}`
}
function haTrintaDias(): string {
  const [ano, mes, dia] = hojeBahia().split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia - 29)).toISOString().slice(0, 10)
}
function CaixaValor({ resultado }: { resultado: EstadoCarregamento<EstadoCaixaAtual> }) {
  if (resultado.estado === 'erro') return <>Indisponível</>
  if (resultado.estado !== 'sucesso') return <>Consultando…</>
  if (resultado.dados.tipo === 'operacional') return <MoneyValue value={resultado.dados.caixa.resumo.valor_esperado} />
  return <>{resultado.dados.tipo === 'legado' ? 'Em transição' : 'Fechado'}</>
}
function CaixaCard({ resultado, onNavegar, recarregar }: { resultado: EstadoCarregamento<EstadoCaixaAtual>; onNavegar?: (destino: Destino) => void; recarregar: () => void }) {
  const atual = resultado.estado === 'sucesso' ? resultado.dados : null
  const caixa = atual?.tipo === 'operacional' ? atual.caixa : null
  const status = caixa ? rotulosCaixa[caixa.status] : atual?.tipo === 'legado' ? 'Em transição' : atual?.tipo === 'sem_caixa' ? 'Fechado' : 'Consultando'
  const acao = atual?.tipo === 'sem_caixa' ? 'Abrir caixa' : caixa?.status === 'aberto' ? 'Iniciar fechamento' : caixa?.status === 'em_fechamento' || caixa?.status === 'devolvido_para_correcao' ? 'Conferir fechamento' : caixa?.status === 'aguardando_aprovacao' ? 'Revisar fechamento' : 'Ver caixa'
  return <FinanceCard title="Caixa" action={resultado.estado !== 'erro' && <span className="finance-status" data-tone={caixa?.status === 'aberto' ? 'success' : 'info'}>{status}</span>}>
    {resultado.estado === 'erro' ? <div role="alert" className="finance-empty"><strong>Não foi possível consultar o caixa</strong><p>{resultado.erro.message}</p><button type="button" className="finance-link" onClick={recarregar}>Tentar novamente</button></div> : <>
      <div className="finance-cash-balance"><span className="finance-icon-tile" data-tone="blue"><FinanceIcon name="cash" /></span><div><strong><CaixaValor resultado={resultado} /></strong><p>{caixa ? 'Dinheiro esperado na clínica ativa' : atual?.tipo === 'legado' ? 'Caixa anterior aguardando transição' : 'Operação da clínica ativa'}</p></div></div>
      <p className="finance-caption">{caixa ? `Aberto em ${formatarDataFinanceira(caixa.aberto_em)}` : atual?.tipo === 'legado' ? 'A transição deste caixa precisa ser acompanhada.' : 'Consulte os detalhes para iniciar ou acompanhar a operação.'}</p>
      {onNavegar && <button type="button" className="finance-button finance-button-primary finance-full-button" disabled={!atual} onClick={() => onNavegar('caixa')}><FinanceIcon name="cash" />{acao}<FinanceIcon name="arrow" /></button>}
    </>}
  </FinanceCard>
}
function OperacaoAtual({ clinicaId, resumo, caixa, recarregarCaixa, onNavegar }: { clinicaId: string; resumo: ResumoDashboardProprietaria; caixa: EstadoCarregamento<EstadoCaixaAtual>; recarregarCaixa: () => void; onNavegar?: (destino: Destino) => void }) {
  const carregarPendentes = useCallback(() => listarEstornosPendentes(clinicaId), [clinicaId])
  const carregarRecentes = useCallback(() => listarRecebimentosParaEstorno(clinicaId), [clinicaId])
  const pendentes = useFinanceiroConsulta(clinicaId, carregarPendentes, nuncaVazio, { clinicaId, leitura: 'estornos' })
  const recentes = useFinanceiroConsulta(clinicaId, carregarRecentes, nuncaVazio, { clinicaId, leitura: 'recebimentos' })
  const lista = recentes.resultado.estado === 'sucesso' ? recentes.resultado.dados.itens.slice(0, 4) : null
  const quantidade = pendentes.resultado.estado === 'sucesso' ? pendentes.resultado.dados.length : null
  return <div className="finance-operation-grid">
    <CaixaCard resultado={caixa} recarregar={recarregarCaixa} onNavegar={onNavegar} />
    <FinanceCard title="Pendências">
      <p className="finance-caption">Estornos e repasses atuais · Fiscal do período.</p>
      {quantidade === null ? <p role={pendentes.resultado.estado === 'erro' ? 'alert' : 'status'} className="finance-caption">{pendentes.resultado.estado === 'erro' ? 'Estornos indisponíveis no momento.' : 'Consultando estornos…'}</p> : quantidade > 0 && <FinancePendingItem title="Estornos aguardando revisão" note={`${quantidade} ${quantidade === 1 ? 'solicitação' : 'solicitações'}`} icon="refund" tone="rose" onClick={onNavegar && (() => onNavegar('estornos'))} />}
      {resumo.repasses.repasses_pendentes_atual > 0 && <FinancePendingItem title="Repasses pendentes" note={`${resumo.repasses.repasses_pendentes_atual} repasses`} icon="people" tone="purple" onClick={onNavegar && (() => onNavegar('repasses'))} />}
      {resumo.fiscal.pendente > 0 && <FinancePendingItem title="Documentos fiscais pendentes" note={`${resumo.fiscal.pendente} ${resumo.fiscal.pendente === 1 ? 'documento' : 'documentos'} no período`} icon="document" tone="orange" onClick={onNavegar && (() => onNavegar('fiscal'))} />}
      {quantidade === 0 && resumo.repasses.repasses_pendentes_atual === 0 && resumo.fiscal.pendente === 0 && <FinanceEmptyState title="Tudo em dia" icon="document">Nenhuma pendência nesta seleção.</FinanceEmptyState>}
      {pendentes.resultado.estado === 'erro' && <button type="button" className="finance-link" onClick={() => void pendentes.recarregar()}>Tentar novamente</button>}
    </FinanceCard>
    <FinanceCard title="Últimas movimentações" action={onNavegar && <button type="button" className="finance-link" onClick={() => onNavegar('relatorios')}>Relatórios <FinanceIcon name="arrow" /></button>}>
      <p className="finance-caption">Recebimentos confirmados ou parcialmente estornados da clínica ativa, sem filtro de período.</p>
      {recentes.resultado.estado === 'erro' ? <div role="alert" className="finance-empty"><strong>Movimentações indisponíveis</strong><button type="button" className="finance-link" onClick={() => void recentes.recarregar()}>Tentar novamente</button></div> : !lista ? <div role="status" aria-label="Carregando movimentações" className="finance-skeleton mt-3" /> : !lista.length ? <FinanceEmptyState title="Nenhum recebimento disponível" icon="down">Os recebimentos elegíveis aparecerão aqui.</FinanceEmptyState> : <ul className="finance-activity-list">{lista.map((item) => <li key={item.id}><span className="finance-icon-tile finance-icon-small" data-tone="green"><FinanceIcon name="down" /></span><div className="finance-list-copy"><strong>Recebimento</strong><small>{item.paciente}</small></div><div className="finance-activity-value"><strong><MoneyValue value={item.valor_bruto} /></strong><small>{formatarDataFinanceira(item.registrado_em)}</small></div></li>)}</ul>}
    </FinanceCard>
  </div>
}
function DetalhesProprietaria({ dados }: { dados: DashboardProprietaria }) {
  const resumo = dados.resumo
  return <details className="finance-detail-disclosure"><summary>Detalhamento por clínica, profissional e situação operacional</summary><div className="finance-detail-grid">
    <FinanceCard title="Fiscal e caixa"><dl className="finance-detail-list">
      <div><dt>Emissão solicitada</dt><dd>{resumo.fiscal.emissao_solicitada}</dd></div><div><dt>Erros na emissão</dt><dd>{resumo.fiscal.erro_emissao}</dd></div><div><dt>Erros no cancelamento</dt><dd>{resumo.fiscal.erro_cancelamento}</dd></div>
      <div><dt>Caixas aguardando aprovação</dt><dd>{resumo.caixa.situacao_operacional_atual.aguardando_aprovacao}</dd></div><div><dt>Caixas devolvidos</dt><dd>{resumo.caixa.situacao_operacional_atual.devolvido_para_correcao}</dd></div>
      <div><dt>Diferenças em caixas aprovados</dt><dd><MoneyValue value={resumo.caixa.aprovados_periodo.diferenca_total} /></dd></div><div><dt>Parcela líquida dos profissionais</dt><dd><MoneyValue value={resumo.producao.profissional_liquida} /></dd></div><div><dt>Ajustes pendentes agora</dt><dd><MoneyValue value={resumo.ajustes.valor_pendente_atual} /></dd></div>
    </dl><p className="finance-caption">Solicitação fiscal não significa nota emitida. Ajustes pendentes não são descontados novamente da produção.</p></FinanceCard>
    <FinanceCard title="Por clínica">{!dados.por_clinica.length ? <FinanceEmptyState title="Sem movimento por clínica">Os resultados aparecerão após os recebimentos.</FinanceEmptyState> : <ul className="finance-detail-list">{dados.por_clinica.map((item) => <li key={item.clinica_id}><span>{item.nome}</span><strong><MoneyValue value={item.resumo.producao.liquido_atual_coorte} /></strong></li>)}</ul>}{dados.clinicas_total > dados.por_clinica.length && <p className="finance-caption">Exibindo {dados.por_clinica.length} de {dados.clinicas_total} clínicas.</p>}</FinanceCard>
    <FinanceCard title="Por profissional">{!dados.por_profissional.length ? <FinanceEmptyState title="Sem produção profissional">Os resultados aparecerão após os recebimentos.</FinanceEmptyState> : <ul className="finance-detail-list">{dados.por_profissional.map((item) => <li key={item.profissional_id}><span>{item.nome}</span><strong>Produção líquida <MoneyValue value={item.resumo.producao.liquido_atual_coorte} /></strong></li>)}</ul>}{dados.profissionais_total > dados.por_profissional.length && <p className="finance-caption">Exibindo {dados.por_profissional.length} de {dados.profissionais_total} profissionais.</p>}</FinanceCard>
    <FinanceCard title="Alertas operacionais">{!dados.alertas.length ? <FinanceEmptyState title="Nenhum alerta no momento">Situações que precisam de atenção aparecerão aqui.</FinanceEmptyState> : <ul className="finance-detail-list">{dados.alertas.map((item) => <li key={`${item.tipo}:${item.entidade_id}`}><span>{item.tipo.replaceAll('_', ' ')} · {item.prioridade}</span><small>{formatarDataFinanceira(item.data)}</small></li>)}</ul>}{dados.alertas_total > dados.alertas.length && <p className="finance-caption">Exibindo {dados.alertas.length} de {dados.alertas_total} alertas.</p>}</FinanceCard>
  </div></details>
}
function DetalhesProfissional({ dados }: { dados: DashboardProfissional }) {
  return <FinanceCard title="Meus repasses">{!dados.resumo.lista_repasses?.length ? <FinanceEmptyState title="Nenhum repasse no período" icon="wallet">Seu histórico de repasses aparecerá aqui.</FinanceEmptyState> :
    <ul className="finance-doctor-payouts">{dados.resumo.lista_repasses.map((item) => <li key={item.id}><div><strong>{item.clinica_nome}</strong><p className="finance-caption">{formatarDataFinanceira(item.data)} · {item.status === 'pago' ? 'Pago' : item.status === 'ajustado' ? 'Ajustado' : 'Pendente'}</p><p className="finance-caption">Bruto <MoneyValue value={item.valor_bruto_profissional} /> · Estornos antes do pagamento <MoneyValue value={item.valor_estornos_antes_pagamento} /> · Ajustes <MoneyValue value={item.valor_ajustes_aplicados} /></p></div><strong>Líquido <MoneyValue value={item.valor_liquido} /></strong></li>)}</ul>}
    {(dados.resumo.lista_repasses_total ?? 0) > (dados.resumo.lista_repasses?.length ?? 0) && <p className="finance-caption">Exibindo {dados.resumo.lista_repasses?.length ?? 0} de {dados.resumo.lista_repasses_total} repasses.</p>}
  </FinanceCard>
}
export default function FinanceiroPainel({ clinicaId, papel, onNavegar, periodHost }: { clinicaId: string; papel: Extract<Papel, 'proprietaria' | 'medico'>; onNavegar?: (destino: Destino) => void; periodHost?: HTMLDivElement | null }) {
  const [inicio, setInicio] = useState(haTrintaDias)
  const [fim, setFim] = useState(hojeBahia)
  const [todos, setTodos] = useState(false)
  const [aplicado, setAplicado] = useState(() => ({ inicio: haTrintaDias(), fim: hojeBahia(), todos: false }))
  const [erroFiltro, setErroFiltro] = useState<string | null>(null)
  const proprietaria = papel === 'proprietaria'
  const carregar = useCallback(async (): Promise<DashboardProprietaria | DashboardProfissional> => {
    const periodo = intervaloPorDias(aplicado.inicio, aplicado.fim)
    return papel === 'proprietaria' ? carregarDashboardProprietaria(periodo, { clinicaId: aplicado.todos ? null : clinicaId }) : carregarDashboardProfissional(periodo, aplicado.todos ? null : clinicaId)
  }, [aplicado, clinicaId, papel])
  const consulta = useFinanceiroConsulta(`${papel}:${clinicaId}:${aplicado.inicio}:${aplicado.fim}:${aplicado.todos}`, carregar, nuncaVazio, { clinicaId, leitura: proprietaria ? 'dashboard_proprietaria' : 'dashboard_profissional' })
  const carregarCaixa = useCallback(() => consultarCaixaAtual(clinicaId), [clinicaId])
  const caixa = useFinanceiroConsulta(proprietaria && !aplicado.todos ? clinicaId : null, carregarCaixa, nuncaVazio, { clinicaId, leitura: 'caixa' })
  function aplicar(evento: FormEvent) {
    evento.preventDefault()
    try { intervaloPorDias(inicio, fim); setErroFiltro(null); setAplicado({ inicio, fim, todos }) }
    catch (erro) { setErroFiltro(erro instanceof Error ? erro.message : 'Período inválido.') }
  }
  const dados = consulta.resultado.estado === 'sucesso' ? consulta.resultado.dados : null
  const resumo = dados?.resumo
  const periodo = <form onSubmit={aplicar} className="finance-period-form" aria-label="Período dos indicadores">
      <label>De<input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required /></label><label>Até<input type="date" value={fim} onChange={(e) => setFim(e.target.value)} required /></label>
      <label className="finance-scope-check"><input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} />Todas as minhas clínicas</label>
      <button type="submit" className="finance-button finance-button-primary">Aplicar</button><button type="button" className="finance-button finance-icon-button" aria-label="Atualizar indicadores" onClick={() => { void consulta.recarregar(); void caixa.recarregar() }}><FinanceIcon name="refresh" /></button>
    </form>
  return <div className="finance-overview">
    {periodHost ? <>{createPortal(periodo, periodHost)}{!proprietaria && <h2 className="finance-overview-title">Meu financeiro</h2>}</> : <div className="finance-overview-toolbar"><h2>{proprietaria ? 'Visão geral' : 'Meu financeiro'}</h2>{periodo}</div>}
    {erroFiltro && <p role="alert" className="text-sm text-[var(--cor-erro)]">{erroFiltro}</p>}
    {consulta.resultado.estado === 'carregando' && <div role="status" aria-label="Carregando indicadores" className="finance-stat-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="finance-skeleton" />)}</div>}
    {consulta.resultado.estado === 'erro' && <div role="alert" className="finance-surface"><p>{consulta.resultado.erro.message}</p><button type="button" className="finance-button mt-3" onClick={() => void consulta.recarregar()}>Tentar novamente</button></div>}
    {dados && resumo && <>
      <div className="finance-stat-grid">
        <FinanceMetric label="Recebido no período" value={<MoneyValue value={resumo.producao.bruto} />} note={`${resumo.producao.quantidade} recebimentos`} icon="money" tone="green" />
        <FinanceMetric label={proprietaria ? 'Parcela líquida da clínica' : 'Sua parcela líquida'} value={<MoneyValue value={proprietaria ? resumo.producao.clinica_liquida : resumo.producao.profissional_liquida} />} note={proprietaria ? 'Participação nos recebimentos' : 'Referente à sua produção'} icon={proprietaria ? 'clinic' : 'people'} tone="blue" />
        <FinanceMetric label="Repasses pendentes" value={<MoneyValue value={resumo.repasses.valor_repasses_pendentes_atual} />} note={`${resumo.repasses.repasses_pendentes_atual} repasses · posição atual`} icon="people" tone="purple" />
        {proprietaria ? <FinanceMetric label="Caixa" value={aplicado.todos ? 'Por clínica' : <CaixaValor resultado={caixa.resultado} />} note={aplicado.todos ? 'Selecione uma clínica para operar' : caixa.resultado.estado === 'sucesso' && caixa.resultado.dados.tipo === 'operacional' ? rotulosCaixa[caixa.resultado.dados.caixa.status] : 'Operação da clínica ativa'} icon="cash" tone="orange" /> : <FinanceMetric label="Parcela da clínica" value={<MoneyValue value={resumo.producao.clinica_liquida} />} note="Nos seus atendimentos" icon="clinic" tone="orange" />}
      </div>
      <div className="finance-chart-grid"><FinanceReceiptsChart resumo={resumo} /><FinancePaymentsChart resumo={resumo} /></div>
      <div className="finance-stat-grid finance-secondary-stats">
        <FinanceMetric label="Recebimentos (líquido atual)" value={<MoneyValue value={resumo.producao.liquido_atual_coorte} />} note="Considera estornos dos recebimentos, inclusive posteriores" icon="down" tone="green" />
        <FinanceMetric label="Estornos" value={<MoneyValue value={resumo.estornos_periodo.total} />} note={`${resumo.estornos_periodo.quantidade} efetivados no período`} icon="refund" tone="rose" />
        <FinanceMetric label="Repasses pagos" value={<MoneyValue value={resumo.repasses.valor_repasses_pagos_periodo} />} note={`${resumo.repasses.repasses_pagos_periodo} pagamentos no período`} icon="wallet" tone="purple" />
        <FinanceMetric label="Repasses pendentes" value={<MoneyValue value={resumo.repasses.valor_repasses_pendentes_atual} />} note="Posição atual, independente do período" icon="clock" tone="orange" />
      </div>
      {proprietaria ? <>{!aplicado.todos && <OperacaoAtual key={clinicaId} clinicaId={clinicaId} resumo={(dados as DashboardProprietaria).resumo} caixa={caixa.resultado} recarregarCaixa={() => void caixa.recarregar()} onNavegar={onNavegar} />}<DetalhesProprietaria dados={dados as DashboardProprietaria} /></> : <DetalhesProfissional dados={dados as DashboardProfissional} />}
      <p className="finance-updated">{aplicado.todos ? 'Todas as clínicas autorizadas' : 'Clínica selecionada'} · {aplicado.inicio.split('-').reverse().join('/')} a {aplicado.fim.split('-').reverse().join('/')} · Atualizado em {formatarDataFinanceira(dados.consultado_em)}</p>
    </>}
  </div>
}
