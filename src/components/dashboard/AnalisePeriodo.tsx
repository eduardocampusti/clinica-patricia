import { useCallback, useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react'
import { RefreshCw, ChartNoAxesCombined, CalendarDays } from 'lucide-react'
import { carregarAcessosClinicas } from '../../lib/clinicAccess'
import { hojeNaBahia } from '../../lib/pacienteLista'
import { erroLeituraPainel } from '../../lib/dashboardRecepcao'
import { formatarCentavos } from '../../lib/financeiro/financeiro.money'
import { formatarDataFinanceira } from '../../lib/financeiro/financeiro.date'
import { consultarAnaliseFinanceira, falharFonteAnalise, iniciarFonteAnalise, periodoRapido, unidadesDaAnalise, validarPeriodoAnalise, type EscopoAnalise, type FonteAnalise, type MetricaAnalise, type PeriodoAnalise, type UnidadeAnalise } from '../../lib/analiseFinanceira'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { Skeleton } from '../ui/skeleton'
import GraficoAnalise from './GraficoAnalise'
import {ToggleGroup} from '@base-ui/react/toggle-group'
import {Toggle} from '@base-ui/react/toggle'
import {Card,CardHeader,CardContent} from '../ui/card'
import ComparacaoPeriodo from './ComparacaoPeriodo'
import { CLINIC_BRANDS } from '../../config/clinicBrands'
import './analisePeriodo.css'

// Mapeamento visual por slug estável já existente; não participa da autorização.
const coresDasClinicasDashboard = Object.fromEntries(Object.values(CLINIC_BRANDS).flatMap(b => [
  [`--dashboard-${b.slug}-claro`, b.coresDashboard.claro],
  [`--dashboard-${b.slug}-escuro`, b.coresDashboard.escuro],
])) as CSSProperties

const dataCurta = (d: string) => d.split('-').reverse().join('/')
const definicoes = [
  { chave: 'bruto', titulo: 'Recebido bruto', nota: 'Recebimentos registrados no período, antes dos estornos.' },
  { chave: 'parcela', titulo: 'Parcela da clínica', nota: 'Participação líquida nos recebimentos; considera estornos vinculados, inclusive posteriores. Não é lucro.' },
  { chave: 'repasses', titulo: 'Repasses pagos', nota: 'Pagamentos confirmados no período, mesmo quando gerados antes.' },
] as const
function estado(f?: FonteAnalise) {
  if (f?.erro === 'permissao') return 'Acesso recusado'
  if (f?.erro) return f.dado ? 'Falha · dados desatualizados' : 'Leitura indisponível'
  if (f?.carregando) return f.dado ? 'Atualizando · dados anteriores' : 'Carregando'
  return f?.dado ? 'Leitura concluída' : 'Aguardando leitura'
}

export default function AnalisePeriodo({ usuarioId, clinicaAtivaId }: { usuarioId: string; clinicaAtivaId: string }) {
  const [periodo, setPeriodo] = useState<PeriodoAnalise>(() => periodoRapido('mes', hojeNaBahia()))
  const [selecaoPeriodo,setSelecaoPeriodo] = useState<'mes'|'7'|'30'|'personalizado'>('mes')
  const [aplicado, setAplicado] = useState(periodo)
  const [unidades, setUnidades] = useState<UnidadeAnalise[]>([])
  const [escopo, setEscopo] = useState<EscopoAnalise>('comparar')
  const [metrica, setMetrica] = useState<MetricaAnalise>('bruto')
  const [fontes, setFontes] = useState<Record<string, FonteAnalise>>({})
  const [carregandoAcesso, setCarregandoAcesso] = useState(true)
  const [erroAcesso, setErroAcesso] = useState(false)
  const [erroFiltro, setErroFiltro] = useState<string | null>(null)
  const [tentativaAcesso, setTentativaAcesso] = useState(0)
  const geracao = useRef(0)
  const ultimaChave = useRef('')
  const inicializado = useRef(false)
  const invalidar = useCallback(() => { geracao.current++ }, [])
  const ids = unidades.filter(u => escopo === 'comparar' || u.slug === escopo).map(u => u.id).join('|')
  const chave = JSON.stringify([usuarioId, ids, aplicado.inicio, aplicado.fim])
  const visiveis = unidades.filter(u => escopo === 'comparar' || u.slug === escopo)
  const ocupada = carregandoAcesso || visiveis.some(u => fontes[u.id]?.carregando)

  useEffect(() => {
    let cancelado = false
    setCarregandoAcesso(true); setErroAcesso(false)
    void carregarAcessosClinicas(usuarioId).then(acessos => {
      if (cancelado) return
      const permitidas = unidadesDaAnalise(acessos)
      setUnidades(permitidas)
      setFontes(anteriores => Object.fromEntries(permitidas.flatMap(u => anteriores[u.id] ? [[u.id, anteriores[u.id]]] : [])))
      if (!inicializado.current) {
        setEscopo(permitidas.find(u => u.id === clinicaAtivaId)?.slug ?? permitidas[0]?.slug ?? 'comparar')
        inicializado.current = true
      } else setEscopo(atual => atual === 'comparar' && permitidas.length === 2 ? atual : permitidas.some(u => u.slug === atual) ? atual : permitidas[0]?.slug ?? 'comparar')
    }).catch(() => {
      if (!cancelado) { setErroAcesso(true); setUnidades([]); setFontes({}) }
    }).finally(() => { if (!cancelado) setCarregandoAcesso(false) })
    return () => { cancelado = true; invalidar() }
  }, [usuarioId, clinicaAtivaId, tentativaAcesso, invalidar])

  useEffect(() => {
    if (carregandoAcesso || erroAcesso || !ids) return
    const numero = ++geracao.current
    const anterioresPermitidos = ultimaChave.current === chave
    ultimaChave.current = chave
    const clinicas = ids.split('|')
    setFontes(anteriores => Object.fromEntries(clinicas.map(id => [id, iniciarFonteAnalise(anterioresPermitidos ? anteriores[id] : undefined)])))
    for (const id of clinicas) void consultarAnaliseFinanceira(usuarioId, id, aplicado).then(dado => {
      if (geracao.current === numero) setFontes(f => ({ ...f, [id]: { carregando: false, dado } }))
    }).catch(erro => {
      if (geracao.current === numero) setFontes(f => ({ ...f, [id]: falharFonteAnalise(f[id], erroLeituraPainel(erro)) }))
    })
    return invalidar
  }, [usuarioId, ids, chave, aplicado, carregandoAcesso, erroAcesso, invalidar])

  const atualizar = useCallback(() => {
    setFontes(f => Object.fromEntries(Object.entries(f).map(([id, fonte]) => [id, iniciarFonteAnalise(fonte)])))
    setCarregandoAcesso(true); setTentativaAcesso(n => n + 1)
  }, [])
  function aplicar(e: FormEvent) {
    e.preventDefault()
    try { validarPeriodoAnalise(periodo); setErroFiltro(null); if (periodo.inicio === aplicado.inicio && periodo.fim === aplicado.fim) atualizar(); else setAplicado({ ...periodo }) }
    catch (erro) { setErroFiltro(erro instanceof Error ? erro.message : 'Período inválido.') }
  }
  function rapido(tipo: 'mes' | '7' | '30') { const p = periodoRapido(tipo, hojeNaBahia()); setPeriodo(p); setAplicado(p); setErroFiltro(null) }
  // Nenhum resultado de outro filtro/contexto é exibido no render anterior ao efeito.
  const resultados = ultimaChave.current === chave ? fontes : {}
  const incompleta = visiveis.length > 1 && visiveis.some(u => !resultados[u.id]?.dado || resultados[u.id]?.erro || resultados[u.id]?.carregando)
  const vazia = visiveis.length > 0 && visiveis.every(u => resultados[u.id]?.dado && !resultados[u.id]?.erro && !resultados[u.id]?.carregando && !resultados[u.id].dado!.pontos.length)

  return <section style={coresDasClinicasDashboard} className="analise-periodo" aria-labelledby="analise-titulo">
    <header className="analise-cabecalho">
      <div><h2 id="analise-titulo">Análise do período</h2><p>Veja a evolução dos recebimentos e compare suas clínicas.</p></div>
      <button type="button" className="analise-botao" onClick={atualizar} disabled={ocupada} aria-label="Atualizar análise do período"><RefreshCw size={16} aria-hidden="true" />Atualizar análise</button>
    </header>
    <div className="analise-controles">
      <ToggleGroup className="analise-segmentos" aria-label="Escopo da análise" value={[escopo]} onValueChange={v => { if(v.length) setEscopo(v[0] as EscopoAnalise) }} disabled={carregandoAcesso || !unidades.length}>
        {unidades.length === 2 && <Toggle value="comparar">Comparar clínicas</Toggle>}
        {unidades.map(u => <Toggle key={u.id} value={u.slug}><i data-clinica={u.slug} aria-hidden="true" />{u.nome.replace('Clínica ', '')}</Toggle>)}
      </ToggleGroup>
      <div className="analise-periodo-controle"><CalendarDays size={16} aria-hidden="true" /><select aria-label="Período da análise" value={selecaoPeriodo} onChange={e=>{const v=e.target.value as typeof selecaoPeriodo;setSelecaoPeriodo(v);if(v !== 'personalizado')rapido(v)}}><option value="mes">Mês atual</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="personalizado">Personalizado</option></select></div>
      <span className="analise-intervalo">{dataCurta(aplicado.inicio)} a {dataCurta(aplicado.fim)} · Bahia</span>
    </div>
    {selecaoPeriodo === 'personalizado' && <form className="analise-filtros" onSubmit={aplicar} aria-label="Filtros da análise do período">
      <label>De<input type="date" value={periodo.inicio} onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))} required /></label>
      <label>Até<input type="date" value={periodo.fim} onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))} required /></label>
      <button type="submit" className="analise-botao analise-aplicar">Aplicar período</button><p>As datas em edição só alteram a análise ao aplicar.</p>
    </form>}
    {erroFiltro && <FeedbackAlert variant="destructive" title="Período inválido" description={erroFiltro} />}
    {carregandoAcesso && <p role="status">Confirmando clínicas autorizadas…</p>}
    {erroAcesso && <FeedbackAlert variant="warning" title="Acesso à análise indisponível" description="Não foi possível confirmar seus vínculos. Isso não significa ausência de dados." action={<button className="analise-botao" onClick={atualizar}>Tentar novamente</button>} />}
    {!carregandoAcesso && !erroAcesso && !unidades.length && <FeedbackAlert variant="info" title="Análise sem clínica autorizada" description="Este recurso requer um vínculo administrativo ativo confirmado em Brotas ou Ipupiara." />}
    {incompleta && <FeedbackAlert variant="warning" title="Comparação incompleta" description="Confira o estado de cada clínica no resumo. Dados anteriores estão identificados; o total das duas clínicas fica indisponível." />}
    {visiveis.map(u => resultados[u.id]?.erro && <FeedbackAlert key={u.id} variant="warning" title={`${u.nome}: ${resultados[u.id].erro === 'permissao' ? 'acesso recusado' : 'leitura indisponível'}`} description={resultados[u.id].erro === 'permissao' ? 'O serviço recusou a consulta. Os valores anteriores desta clínica foram retirados.' : 'A consulta falhou. Os valores anteriores, quando disponíveis, estão desatualizados; a falha não representa R$ 0,00.'} />)}
    {visiveis.length > 0 && <>
      <div className="analise-resumos">
        {definicoes.map(m => <Card className="analise-resumo" key={m.chave}><CardHeader><h3>{m.titulo}</h3></CardHeader><CardContent>
          <span className="analise-abrangencia">{visiveis.length === 2 ? 'Duas clínicas' : visiveis[0].nome}</span>
          <div className="analise-principal numero-tabular">{visiveis.length === 2 ? incompleta ? <span className="analise-indisponivel">Total indisponível</span> : formatarCentavos(visiveis.reduce((s,u)=>s+resultados[u.id].dado![m.chave],0n)) : resultados[visiveis[0].id]?.dado ? formatarCentavos(resultados[visiveis[0].id].dado![m.chave]) : resultados[visiveis[0].id]?.carregando ? <Skeleton className="h-8 w-36" /> : <span className="analise-indisponivel">Indisponível</span>}</div>
          {visiveis.length === 2 && <div className="analise-distribuicao">{visiveis.map(u => <div className="analise-valor" key={u.id}><span><i data-clinica={u.slug} aria-hidden="true" />{u.nome.replace('Clínica ', '')}</span><strong className="numero-tabular">{resultados[u.id]?.dado ? formatarCentavos(resultados[u.id].dado![m.chave]) : resultados[u.id]?.carregando ? 'Carregando…' : 'Indisponível'}</strong></div>)}</div>}
          <p className="analise-definicao">{m.chave === 'bruto' ? 'Recebimentos antes dos estornos.' : m.chave === 'parcela' ? 'Participação líquida da clínica. Não é lucro.' : 'Pagamentos confirmados no período.'}</p>
        </CardContent></Card>)}
      </div>
      <div className="analise-graficos">
        <Card className="analise-evolucao"><CardHeader className="analise-grafico-cabecalho"><div><h3>Evolução dos recebimentos</h3><p>{metrica === 'bruto' ? 'Recebido bruto diário' : 'Parcela líquida diária da clínica'}</p></div><select aria-label="Evolução de" value={metrica} onChange={e => setMetrica(e.target.value as MetricaAnalise)}><option value="bruto">Recebido bruto</option><option value="parcela">Parcela da clínica</option></select></CardHeader><CardContent>
          {vazia ? <div className="analise-vazio"><ChartNoAxesCombined size={28} aria-hidden="true" /><h4>Sem recebimentos neste período</h4><p>As consultas foram concluídas. Escolha outro período para consultar a evolução.</p><button type="button" className="analise-botao" onClick={()=>{setSelecaoPeriodo('personalizado');setTimeout(()=>document.querySelector<HTMLInputElement>('.analise-filtros input')?.focus(),0)}}>Alterar período</button><small>Repasses pagos seguem a data de confirmação e permanecem no resumo.</small></div> : <GraficoAnalise unidades={visiveis} fontes={resultados} periodo={aplicado} metrica={metrica} />}
        </CardContent></Card>
        <ComparacaoPeriodo unidades={visiveis} fontes={resultados} completa={!incompleta} />
      </div>
      <Card className="analise-resumo-tabela"><CardHeader><h3>Resumo por clínica</h3><p>Valores exatos e última leitura de cada fonte · Bahia</p></CardHeader><CardContent>
        <div className="analise-tabela-container" tabIndex={0} role="region" aria-label="Tabela de resumo financeiro por clínica">
          <table className="analise-tabela"><thead><tr><th scope="col">Clínica</th>{definicoes.map(m => <th scope="col" key={m.chave}>{m.titulo}</th>)}<th scope="col">Atualização</th></tr></thead>
            <tbody className="analise-fontes">{visiveis.map(u => <tr key={u.id}><th scope="row"><span className="analise-unidade"><i data-clinica={u.slug} aria-hidden="true" />{u.nome}</span></th>{definicoes.map(m => <td className="numero-tabular" key={m.chave}>{resultados[u.id]?.dado ? formatarCentavos(resultados[u.id].dado![m.chave]) : 'Indisponível'}</td>)}<td className="analise-atualizacao"><span>{estado(resultados[u.id])}</span><small>{resultados[u.id]?.dado ? formatarDataFinanceira(resultados[u.id].dado!.consultadoEm) : 'Último sucesso não confirmado'}</small></td></tr>)}</tbody>
          </table>
        </div>
      </CardContent></Card>
      <details className="analise-metodologia"><summary>Entenda os valores e as fontes</summary><div>{definicoes.map(m=><p key={m.chave}><strong>{m.titulo}: </strong>{m.nota}</p>)}<p>Fonte: Financeiro de cada clínica autorizada. As leituras são independentes; os horários de sucesso estão no resumo. “Duas clínicas” soma somente os totais válidos e atualizados retornados para Brotas e Ipupiara. Erro ou atualização em andamento impede esse total.</p><p>Somente pontos retornados pelo Financeiro. Dias sem ponto ficam sem valor; lacunas não são preenchidas com zero. A análise não altera a clínica em operação nem os indicadores de hoje.</p></div></details>
    </>}
  </section>
}
