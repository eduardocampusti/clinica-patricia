import { useCallback, useState, type FormEvent } from 'react'
import { useFinanceiroConsulta } from '../hooks/useFinanceiroConsulta'
import type { Papel } from '../hooks/usePapelNaClinica'
import { carregarDashboardProfissional, carregarDashboardProprietaria } from '../lib/financeiro/financeiro.dashboard'
import { formatarDataFinanceira, intervaloPorDias, TIMEZONE_FINANCEIRO_PADRAO } from '../lib/financeiro/financeiro.date'
import { decimalBancoParaCentavos, formatarCentavos } from '../lib/financeiro/financeiro.money'
import type { DashboardProfissional, DashboardProprietaria, DecimalBanco, ResumoDashboardComum, ResumoDashboardProprietaria } from '../lib/financeiro/financeiro.types'

const card = 'rounded-[18px] border border-[var(--borda)] bg-[var(--fundo-card)] p-5 shadow-[var(--sombra-baixa)] sm:p-6'
const campo = 'min-h-11 rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 text-[var(--texto-principal)] focus-visible:outline-2'
const botao = 'min-h-11 rounded-lg border border-[var(--borda)] px-4 py-2 text-sm font-semibold focus-visible:outline-2 disabled:opacity-50'
const moeda = (valor: DecimalBanco) => formatarCentavos(decimalBancoParaCentavos(valor))
const nuncaVazio = () => false

function hojeBahia(): string {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE_FINANCEIRO_PADRAO,
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const campo = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? ''
  return `${campo('year')}-${campo('month')}-${campo('day')}`
}

function haTrintaDias(): string {
  const hoje = hojeBahia()
  const [ano, mes, dia] = hoje.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia - 29)).toISOString().slice(0, 10)
}

function Metrica({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return <div className="rounded-xl bg-[var(--fundo-pagina)] p-4">
    <p className="text-xs text-[var(--texto-secundario)]">{rotulo}</p>
    <p className="numero-tabular mt-1 text-xl font-semibold text-[var(--texto-principal)]">{valor}</p>
    {nota && <p className="mt-1 text-xs text-[var(--texto-terciario)]">{nota}</p>}
  </div>
}

function ResumoPrincipal({ resumo, proprietaria }: { resumo: ResumoDashboardComum; proprietaria: boolean }) {
  return <section className={card}>
    <h2 className="texto-titulo-secao">Produção e posição atual</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metrica rotulo="Recebimentos no período" valor={String(resumo.producao.quantidade)} />
      <Metrica rotulo="Bruto da coorte" valor={moeda(resumo.producao.bruto)} />
      <Metrica rotulo="Líquido atual da coorte" valor={moeda(resumo.producao.liquido_atual_coorte)} nota="Inclui estornos posteriores do mesmo recebimento" />
      <Metrica rotulo="Estornos efetivados no período" valor={moeda(resumo.estornos_periodo.total)} nota="Eventos por data de efetivação; não subtrair do bruto acima" />
      <Metrica rotulo={proprietaria ? 'Parcela líquida da clínica' : 'Parcela da clínica nos seus atendimentos'} valor={moeda(resumo.producao.clinica_liquida)} />
      <Metrica rotulo="Parcela líquida dos profissionais" valor={moeda(resumo.producao.profissional_liquida)} />
      <Metrica rotulo="Repasses pagos no período" valor={moeda(resumo.repasses.valor_repasses_pagos_periodo)} nota="Confirmados por data de pagamento" />
      <Metrica rotulo="Repasses pendentes agora" valor={moeda(resumo.repasses.valor_repasses_pendentes_atual)} nota="Estoque atual, sem filtro de data" />
    </div>
  </section>
}

function PagamentosERepasses({ resumo }: { resumo: ResumoDashboardComum }) {
  return <section className={card}>
    <h2 className="texto-titulo-secao">Formas de pagamento e ajustes</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metrica rotulo="Dinheiro bruto" valor={moeda(resumo.pagamentos.dinheiro)} />
      <Metrica rotulo="PIX bruto" valor={moeda(resumo.pagamentos.pix)} />
      <Metrica rotulo="Cartão bruto" valor={moeda(resumo.pagamentos.cartao_credito)} />
      <Metrica rotulo="Ajustes pendentes" valor={moeda(resumo.ajustes.valor_pendente_atual)} nota="Estoque a compensar; não descontar novamente da produção" />
    </div>
    <p className="mt-4 text-xs text-[var(--texto-terciario)]">Os componentes de pagamento são brutos. Estornos preservam o pagamento original e aparecem separadamente.</p>
  </section>
}

function Serie({ resumo }: { resumo: ResumoDashboardComum }) {
  return <section className={card}>
    <h2 className="texto-titulo-secao">Série diária</h2>
    {!resumo.series.length ? <p className="mt-3 text-sm text-[var(--texto-secundario)]">Nenhuma produção ou evento de estorno neste período.</p> :
      <div className="mt-4 overflow-x-auto"><table className="min-w-[620px] w-full text-left text-sm">
        <thead><tr className="border-b border-[var(--borda)] text-[var(--texto-secundario)]">
          <th className="py-2 font-medium">Dia</th><th className="py-2 font-medium">Bruto</th>
          <th className="py-2 font-medium">Líquido atual da coorte</th><th className="py-2 font-medium">Estornos efetivados no dia</th>
        </tr></thead><tbody>{resumo.series.map((item) => <tr key={item.dia} className="border-b border-[var(--borda-sutil)]">
          <td className="py-2">{item.dia}</td><td className="numero-tabular py-2">{moeda(item.bruto)}</td>
          <td className="numero-tabular py-2">{moeda(item.liquido_atual_coorte)}</td>
          <td className="numero-tabular py-2">{moeda(item.estornos_eventos)}</td>
        </tr>)}</tbody></table></div>}
  </section>
}

function ResumoProprietaria({ resumo }: { resumo: ResumoDashboardProprietaria }) {
  const caixa = resumo.caixa.situacao_operacional_atual
  return <section className={card}>
    <h2 className="texto-titulo-secao">Fiscal e caixa</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metrica rotulo="Notas pendentes" valor={String(resumo.fiscal.pendente)} />
      <Metrica rotulo="Emissão solicitada" valor={String(resumo.fiscal.emissao_solicitada)} nota="Solicitação não significa nota emitida" />
      <Metrica rotulo="Erros fiscais" valor={String(resumo.fiscal.erro_emissao + resumo.fiscal.erro_cancelamento)} />
      <Metrica rotulo="Caixas aguardando aprovação" valor={String(caixa.aguardando_aprovacao)} />
      <Metrica rotulo="Caixas devolvidos" valor={String(caixa.devolvido_para_correcao)} />
      <Metrica rotulo="Diferenças em caixas aprovados" valor={moeda(resumo.caixa.aprovados_periodo.diferenca_total)} />
    </div>
  </section>
}

function DetalhesProprietaria({ dados }: { dados: DashboardProprietaria }) {
  return <>
    <ResumoProprietaria resumo={dados.resumo} />
    <section className={card}><h2 className="texto-titulo-secao">Alertas operacionais</h2>
      {!dados.alertas.length ? <p className="mt-3 text-sm text-[var(--texto-secundario)]">Nenhum alerta calculado para o escopo atual.</p> :
        <ul className="mt-3 divide-y divide-[var(--borda)]">{dados.alertas.map((alerta) => <li key={`${alerta.tipo}:${alerta.entidade_id}`} className="py-3">
          <p className="font-medium">{alerta.tipo.replaceAll('_', ' ')} · {alerta.prioridade}</p>
          <p className="text-xs text-[var(--texto-secundario)]">{formatarDataFinanceira(alerta.data)}</p>
        </li>)}</ul>}
      {dados.alertas_total > dados.alertas.length && <p className="mt-2 text-xs text-[var(--cor-alerta)]">Exibindo {dados.alertas.length} de {dados.alertas_total} alertas. Consulte o detalhe completo em relatório apropriado.</p>}
    </section>
    <section className={card}><h2 className="texto-titulo-secao">Por clínica</h2>
      {!dados.por_clinica.length ? <p className="mt-3 text-sm text-[var(--texto-secundario)]">Nenhuma clínica no escopo atual.</p> :
        <ul className="mt-3 divide-y divide-[var(--borda)]">{dados.por_clinica.map((item) => <li key={item.clinica_id} className="flex flex-wrap justify-between gap-2 py-3">
          <span className="font-medium">{item.nome}</span><span className="numero-tabular">{moeda(item.resumo.producao.liquido_atual_coorte)}</span>
        </li>)}</ul>}
      {dados.clinicas_total > dados.por_clinica.length && <p className="mt-2 text-xs text-[var(--cor-alerta)]">Exibindo {dados.por_clinica.length} de {dados.clinicas_total} clínicas.</p>}
    </section>
    <section className={card}><h2 className="texto-titulo-secao">Por profissional</h2>
      {!dados.por_profissional.length ? <p className="mt-3 text-sm text-[var(--texto-secundario)]">Nenhum profissional com movimento no escopo atual.</p> :
        <ul className="mt-3 divide-y divide-[var(--borda)]">{dados.por_profissional.map((item) => <li key={item.profissional_id} className="flex flex-wrap justify-between gap-2 py-3">
          <span className="font-medium">{item.nome}</span><span className="numero-tabular">Produção líquida {moeda(item.resumo.producao.liquido_atual_coorte)}</span>
        </li>)}</ul>}
      {dados.profissionais_total > dados.por_profissional.length && <p className="mt-2 text-xs text-[var(--cor-alerta)]">Exibindo {dados.por_profissional.length} de {dados.profissionais_total} profissionais.</p>}
    </section>
  </>
}

function DetalhesProfissional({ dados }: { dados: DashboardProfissional }) {
  return <section className={card}><h2 className="texto-titulo-secao">Meus repasses</h2>
    {!dados.resumo.lista_repasses?.length ? <p className="mt-3 text-sm text-[var(--texto-secundario)]">Nenhum repasse listado neste período.</p> :
      <ul className="mt-3 divide-y divide-[var(--borda)]">{dados.resumo.lista_repasses.map((item) => <li key={item.id} className="py-3">
        <div className="flex flex-wrap justify-between gap-2"><div><p className="font-medium">{item.clinica_nome} · {item.status}</p>
          <p className="text-xs text-[var(--texto-secundario)]">{formatarDataFinanceira(item.data)}</p></div>
          <span className="numero-tabular font-semibold">Líquido {moeda(item.valor_liquido)}</span></div>
        <p className="mt-1 text-xs text-[var(--texto-secundario)]">Bruto {moeda(item.valor_bruto_profissional)} · Estornos antes do pagamento {moeda(item.valor_estornos_antes_pagamento)} · Ajustes {moeda(item.valor_ajustes_aplicados)}</p>
      </li>)}</ul>}
    {(dados.resumo.lista_repasses_total ?? 0) > (dados.resumo.lista_repasses?.length ?? 0) &&
      <p className="mt-2 text-xs text-[var(--cor-alerta)]">Lista limitada: exibindo {dados.resumo.lista_repasses?.length ?? 0} de {dados.resumo.lista_repasses_total} repasses.</p>}
  </section>
}

export default function FinanceiroPainel({ clinicaId, papel }: { clinicaId: string; papel: Extract<Papel, 'proprietaria' | 'medico'> }) {
  const [inicio, setInicio] = useState(haTrintaDias)
  const [fim, setFim] = useState(hojeBahia)
  const [todos, setTodos] = useState(false)
  const [aplicado, setAplicado] = useState(() => ({ inicio: haTrintaDias(), fim: hojeBahia(), todos: false }))
  const [erroFiltro, setErroFiltro] = useState<string | null>(null)
  const carregar = useCallback(async (): Promise<DashboardProprietaria | DashboardProfissional> => {
    const periodo = intervaloPorDias(aplicado.inicio, aplicado.fim)
    return papel === 'proprietaria'
      ? carregarDashboardProprietaria(periodo, { clinicaId: aplicado.todos ? null : clinicaId })
      : carregarDashboardProfissional(periodo, aplicado.todos ? null : clinicaId)
  }, [aplicado, clinicaId, papel])
  const consulta = useFinanceiroConsulta(`${papel}:${clinicaId}:${aplicado.inicio}:${aplicado.fim}:${aplicado.todos}`, carregar,
    nuncaVazio, { clinicaId, leitura: papel === 'proprietaria' ? 'dashboard_proprietaria' : 'dashboard_profissional' })
  function aplicar(evento: FormEvent) {
    evento.preventDefault()
    try { intervaloPorDias(inicio, fim); setErroFiltro(null); setAplicado({ inicio, fim, todos }) }
    catch (erro) { setErroFiltro(erro instanceof Error ? erro.message : 'Período inválido.') }
  }
  const dados = consulta.resultado.estado === 'sucesso' ? consulta.resultado.dados : null
  return <div className="space-y-6">
    <header><h1 className="texto-titulo-tela">{papel === 'medico' ? 'Meu financeiro' : 'Painel financeiro'}</h1>
      <p className="mt-1 text-sm text-[var(--texto-secundario)]">Dados oficiais do banco para o período selecionado.</p></header>
    <form onSubmit={aplicar} className={`${card} flex flex-wrap items-end gap-3`}>
      <label className="text-sm font-medium">De <input type="date" className={`${campo} mt-1 block`} value={inicio} onChange={(e) => setInicio(e.target.value)} required /></label>
      <label className="text-sm font-medium">Até <input type="date" className={`${campo} mt-1 block`} value={fim} onChange={(e) => setFim(e.target.value)} required /></label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} />Todas as minhas clínicas</label>
      <button type="submit" className={`${botao} bg-[var(--texto-principal)] text-white`}>Aplicar</button>
      <button type="button" className={botao} onClick={() => void consulta.recarregar()}>Atualizar</button>
      {erroFiltro && <p role="alert" className="w-full text-sm text-[var(--cor-erro)]">{erroFiltro}</p>}
    </form>
    {consulta.resultado.estado === 'carregando' && <p role="status" className={card}>Carregando indicadores…</p>}
    {consulta.resultado.estado === 'erro' && <div role="alert" className={card}><p>{consulta.resultado.erro.message}</p>
      <button type="button" className={`${botao} mt-3`} onClick={() => void consulta.recarregar()}>Tentar novamente</button></div>}
    {dados && <>
      <p className="text-xs text-[var(--texto-secundario)]">Período de {aplicado.inicio} a {aplicado.fim}, incluindo ambos os dias; a consulta usa o início do dia seguinte como limite exclusivo. Atualizado em {formatarDataFinanceira(dados.consultado_em)}. Estoques indicados são posições atuais.</p>
      <ResumoPrincipal resumo={dados.resumo} proprietaria={papel === 'proprietaria'} />
      <PagamentosERepasses resumo={dados.resumo} />
      {papel === 'proprietaria' ? <DetalhesProprietaria dados={dados as DashboardProprietaria} /> : <DetalhesProfissional dados={dados as DashboardProfissional} />}
      <Serie resumo={dados.resumo} />
    </>}
  </div>
}
