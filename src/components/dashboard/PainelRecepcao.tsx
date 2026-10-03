import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AbasPainelRecepcao, IconePainel as Icone } from './PainelRecepcaoUI'
import { consultarMovimentoRecepcao, erroLeituraPainel, horaNaBahia, situacaoRecepcao, SITUACOES_RECEPCAO, type MovimentoRecepcao } from '../../lib/dashboardRecepcao'
import { consultarCaixaAtual, type EstadoCaixaAtual } from '../../lib/financeiro/financeiro.caixa-leitura'
import { decimalBancoParaCentavos, formatarCentavos } from '../../lib/financeiro/financeiro.money'
import { STATUS_CAIXA } from '../../lib/financeiro/financeiro.types'
import { hojeNaBahia, FUSO_PACIENTES } from '../../lib/pacienteLista'
import { buscarPacientePorCpf } from '../../lib/pacienteCpf'
import { apenasDigitos, cpfValido, formatarCpf } from '../../lib/cpf'
import { iniciais } from '../../lib/texto'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import './painelRecepcao.css'

export interface AcoesPainelRecepcao {
  onNovoPaciente: () => void; onNovoAgendamento: () => void
  onAbrirPaciente: (id: string) => void; onAgenda: () => void
  onPacientes: () => void; onFinanceiro: () => void
}
interface Props extends AcoesPainelRecepcao { clinicaId: string; clinicaNome: string }
type Leitura<T> = { chave: string; dado?: T; em?: string; erro?: 'permissao' | 'leitura'; carregando: boolean }
const nomes = ['Aguardando', 'Previstos', 'Em atendimento', 'Concluídos']
const rotuloStatus = { agendado: 'Agendado', confirmado: 'Agendamento confirmado', aguardando: 'Aguardando', em_atendimento: 'Em atendimento', concluido: 'Concluído' }
const rotuloCaixa = { aberto: 'Aberto', em_fechamento: 'Em fechamento', aguardando_aprovacao: 'Aguardando aprovação', devolvido_para_correcao: 'Devolvido para correção', aprovado: 'Aprovado' }
const formatarInstante = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: FUSO_PACIENTES, dateStyle: 'short', timeStyle: 'short' })
const dinheiro = (valor: Parameters<typeof decimalBancoParaCentavos>[0]) => formatarCentavos(decimalBancoParaCentavos(valor))

export default function PainelRecepcao(p: Props) {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => { const timer = window.setInterval(() => setAgora(new Date()), 30000); return () => window.clearInterval(timer) }, [])
  const data = hojeNaBahia(agora), chave = `${p.clinicaId}:${data}`
  const [revisao, setRevisao] = useState(0)
  const [movimento, setMovimento] = useState<Leitura<MovimentoRecepcao>>({ chave: '', carregando: true })
  const [caixa, setCaixa] = useState<Leitura<EstadoCaixaAtual>>({ chave: '', carregando: true })
  const [aba, setAba] = useState(0)
  const [busca, setBusca] = useState(''), [modo, setModo] = useState('nome'), [profissional, setProfissional] = useState('todos')
  const [cpf, setCpf] = useState<{ chave: string; requisicao: number; ids?: string[]; erro?: string; carregando: boolean } | null>(null)
  const cpfRequisicao = useRef(0)
  const chaveCpf = JSON.stringify([chave, modo, busca, profissional, aba, revisao])
  const contextoCpf = useRef(chaveCpf)
  if (contextoCpf.current !== chaveCpf) { cpfRequisicao.current++; contextoCpf.current = chaveCpf }
  const [caixaAberto, setCaixaAberto] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [pendenciasAbertas, setPendenciasAbertas] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [ocultar, setOcultar] = useState(false)
  const buscaRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let cancelado = false
    const controlador = new AbortController()
    setMovimento(anterior => ({ chave, em: anterior.chave === chave ? anterior.em : undefined, carregando: true }))
    setCaixa(anterior => ({ chave, em: anterior.chave === chave ? anterior.em : undefined, carregando: true }))
    void consultarMovimentoRecepcao(p.clinicaId, data, controlador.signal).then(dado => {
      if (!cancelado) setMovimento({ chave, dado, em: dado.consultadoEm, carregando: false })
    }).catch(erro => { if (!cancelado) setMovimento(anterior => ({ chave, em: anterior.em, erro: erroLeituraPainel(erro), carregando: false })) })
    void consultarCaixaAtual(p.clinicaId).then(dado => {
      // Validar os valores oficiais antes de renderizar; informação inválida não vira zero.
      if (dado.tipo === 'operacional') {
        if (!STATUS_CAIXA.includes(dado.caixa.status)) throw new Error('Estado do caixa inválido.')
        const r = dado.caixa.resumo
        for (const valor of [r.total_recebimentos_brutos, r.total_dinheiro, r.total_pix, r.total_cartao_credito, r.valor_esperado]) dinheiro(valor)
        if (!Number.isFinite(Date.parse(dado.caixa.aberto_em))) throw new Error('Período do caixa inválido.')
      }
      if (!cancelado) setCaixa({ chave, dado, em: new Date().toISOString(), carregando: false })
    }).catch(erro => { if (!cancelado) setCaixa(anterior => ({ chave, em: anterior.em, erro: erroLeituraPainel(erro), carregando: false })) })
    return () => { cancelado = true; controlador.abort() }
  }, [chave, p.clinicaId, data, revisao])

  const m = movimento.chave === chave ? movimento : { chave, carregando: true }
  const c = caixa.chave === chave ? caixa : { chave, carregando: true }
  const registros = m.dado?.registros ?? []
  const contagens = SITUACOES_RECEPCAO.map(s => m.dado ? registros.filter(r => situacaoRecepcao(r) === s).length : null)
  const profissionais = [...new Map(registros.map(r => [r.profissional_id, r.profissionais])).entries()]
  const resultadoCpf = cpf?.chave === chaveCpf && cpf.requisicao === cpfRequisicao.current ? cpf : null
  const visiveis = registros.filter(r => situacaoRecepcao(r) === SITUACOES_RECEPCAO[aba] && (profissional === 'todos' || r.profissional_id === profissional)
    && (modo === 'cpf' ? resultadoCpf?.ids?.includes(r.paciente_id) : (r.pacientes?.nome_completo ?? '').toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR'))))
  const proximos = registros.filter(r => situacaoRecepcao(r) === 'previstos' && r.hora_inicio.slice(0, 5) >= horaNaBahia(agora)).slice(0, 3)
  const passados = registros.filter(r => situacaoRecepcao(r) === 'previstos' && r.hora_inicio.slice(0, 5) < horaNaBahia(agora)).length
  const kpis = [
    ['Consultas do dia', m.dado ? registros.length : null, 'Agendamentos não cancelados', 'calendario', 1],
    ['Aguardando', contagens[0], 'Situação registrada', 'relogio', 3],
    ['Em atendimento', contagens[2], 'Situação registrada', 'pessoa', 2],
    ['Concluídos', contagens[3], 'Situação registrada', 'check', 4],
  ] as const
  async function buscarCpf() {
    const digitos = apenasDigitos(busca)
    if (!cpfValido(digitos)) return
    const requisicao = ++cpfRequisicao.current, contexto = chaveCpf
    setCpf({ chave: contexto, requisicao, carregando: true })
    try {
      const encontrados = await buscarPacientePorCpf(p.clinicaId, digitos)
      if (requisicao !== cpfRequisicao.current || contextoCpf.current !== contexto) return
      setCpf({ chave: contexto, requisicao, ids: encontrados.map(r => r.id), carregando: false })
    } catch (erro) {
      if (requisicao !== cpfRequisicao.current || contextoCpf.current !== contexto) return
      setCpf({ chave: contexto, requisicao, erro: erroLeituraPainel(erro) === 'permissao' ? 'Busca por CPF sem permissão.' : 'Não foi possível consultar o CPF. Tente novamente.', carregando: false })
    }
  }
  const falhaMovimento = m.erro === 'permissao' ? 'Sem permissão para consultar o movimento desta clínica.' : 'Não foi possível confirmar o movimento completo. Atualize para tentar novamente.'
  const operacional = c.dado?.tipo === 'operacional' ? c.dado.caixa : null
  return <div className="rp rp-integrado">
    <header className="rp-heading"><div><h1>Bom dia, recepção</h1><p>{agora.toLocaleDateString('pt-BR', { timeZone: FUSO_PACIENTES, weekday: 'long', day: '2-digit', month: 'long' })} · {p.clinicaNome}</p></div><div className="rp-quick"><button className="rp-button" onClick={p.onNovoPaciente}>+ Novo paciente</button><button className="rp-button rp-primary" onClick={p.onNovoAgendamento}>+ Novo agendamento</button></div></header>
    <section className="rp-metrics" aria-label="Indicadores do dia" aria-busy={m.carregando}>{kpis.map(([nome, valor, detalhe, icone, cor]) => <div className="rp-metric" key={nome} style={{ '--rp-acento': `var(--kpi-${cor}-texto)`, '--rp-icone-fundo': `var(--kpi-${cor}-icone-fundo)` } as CSSProperties}><span className="rp-metric-icon"><Icone tipo={icone}/></span><div><p>{nome}</p><strong>{valor ?? '—'}</strong><small>{detalhe}</small></div></div>)}</section>
    {m.dado && <p className="rp-criteria">{registros.length} agendamentos / {new Set(registros.map(r => r.paciente_id)).size} pacientes distintos · {data} · America/Bahia</p>}
    {!!passados && <div className="rp-warning"><Icone tipo="relogio"/><span><strong>{passados} horários passados ainda previstos</strong><span>Conferir a situação na Agenda.</span></span><button className="rp-link" onClick={() => { setAba(1); setBusca(''); setModo('nome'); setProfissional('todos') }}>Conferir <Icone tipo="seta"/></button></div>}
    <div className="rp-layout"><div className="rp-main">
      <section className="rp-panel" aria-labelledby="movimento-titulo" aria-busy={m.carregando}>
        <div className="rp-section-heading"><h2 id="movimento-titulo">Movimento de hoje</h2><button className="rp-link" onClick={p.onAgenda}>Ver agenda <Icone tipo="seta"/></button></div>
        <div className="rp-filters"><label>Buscar por<select aria-label="Modalidade da busca" value={modo} onChange={e => { setModo(e.target.value); setBusca(''); setCpf(null); cpfRequisicao.current++ }}><option value="nome">Nome</option><option value="cpf">CPF exato</option></select></label><label className="rp-search-label">{modo === 'cpf' ? 'CPF exato' : 'Paciente'}<div className="rp-search"><Icone tipo="busca"/><input ref={buscaRef} aria-label={modo === 'cpf' ? 'CPF exato' : 'Buscar paciente'} value={busca} placeholder={modo === 'cpf' ? '11 dígitos válidos' : 'Buscar paciente'} inputMode={modo === 'cpf' ? 'numeric' : 'text'} maxLength={modo === 'cpf' ? 14 : 100} onChange={e => { setBusca(modo === 'cpf' ? formatarCpf(e.target.value) : e.target.value); cpfRequisicao.current++ }} onKeyDown={e => { if (modo === 'cpf' && e.key === 'Enter') void buscarCpf() }}/></div></label><label>Profissional<select aria-label="Filtrar por profissional" value={profissional} onChange={e => setProfissional(e.target.value)}><option value="todos">Todos os profissionais</option>{profissionais.map(([id, prof]) => <option key={id} value={id}>{prof?.nome_completo ?? 'Nome indisponível'}</option>)}</select></label></div>
        {modo === 'cpf' && <div className="rp-cpf"><span>Consulta exata, restrita à clínica selecionada.</span><button className="rp-button" disabled={!cpfValido(apenasDigitos(busca)) || resultadoCpf?.carregando} onClick={() => void buscarCpf()}>Buscar CPF</button></div>}
        <AbasPainelRecepcao nomes={nomes} contagens={contagens} selecionada={aba} onSelecionar={setAba} idPainel="rp-movimento"/>
        <div id="rp-movimento" role="tabpanel" aria-labelledby={`rp-movimento-tab-${aba}`} tabIndex={0}>
          {m.carregando ? <div className="rp-empty" role="status">Carregando movimento…</div> : m.erro ? <div className="rp-empty"><FeedbackAlert variant="destructive" title={m.erro === 'permissao' ? 'Movimento sem permissão' : 'Movimento indisponível'} description={falhaMovimento}/></div> : modo === 'cpf' && (!resultadoCpf?.ids || resultadoCpf.erro) ? <div className="rp-empty" role={resultadoCpf?.erro ? 'alert' : 'status'}>{resultadoCpf?.erro ?? (resultadoCpf?.carregando ? 'Buscando CPF…' : 'Informe o CPF válido e selecione Buscar CPF.')}</div> : !visiveis.length ? <div className="rp-empty"><Icone tipo="calendario"/><strong>{registros.length ? 'Nenhum agendamento neste filtro' : 'Nenhum agendamento nesta data'}</strong><p>{registros.length ? 'Ajuste a busca, a situação ou o profissional.' : 'Crie um novo agendamento quando necessário.'}</p></div> : <><div className="rp-table-head"><span>Paciente</span><span>Horário · situação</span><span>Ações</span></div><ul className="rp-records">{visiveis.map(r => <li className="rp-record" key={r.id} data-testid="registro"><div className="rp-identity"><span className="rp-avatar">{iniciais(r.pacientes?.nome_completo ?? 'Paciente')}</span><div><strong>{r.pacientes?.nome_completo ?? 'Nome do paciente indisponível'}</strong><p>{r.profissionais?.nome_completo ?? 'Nome do profissional indisponível'}</p></div></div><div className="rp-arrival"><strong>Previsto às {r.hora_inicio.slice(0, 5)}</strong><span className={situacaoRecepcao(r) === 'previstos' && r.hora_inicio.slice(0, 5) < horaNaBahia(agora) ? 'rp-warning-text' : ''}>{rotuloStatus[r.status]}</span></div><div className="rp-record-action"><button className="rp-button" onClick={() => p.onAbrirPaciente(r.paciente_id)}>Ver cadastro</button><button className="rp-link" onClick={p.onAgenda}>Abrir Agenda</button></div></li>)}</ul></>}
        </div><p className="rp-footnote">Ordem pelo horário agendado.</p>
      </section>
      <section className="rp-panel rp-next" aria-label="Próximos agendamentos"><div className="rp-section-heading"><h2>Próximos agendamentos</h2><button className="rp-link" onClick={() => { setAba(1); setBusca(''); setModo('nome'); setProfissional('todos'); buscaRef.current?.focus() }}>Ver previstos <Icone tipo="seta"/></button></div>{m.carregando || m.erro ? <p className="rp-muted">{m.carregando ? 'Carregando…' : 'Próximos agendamentos indisponíveis.'}</p> : !proximos.length ? <p className="rp-muted">Nenhum agendamento futuro previsto hoje.</p> : <ul>{proximos.map(r => <li key={r.id}><time>{r.hora_inicio.slice(0, 5)}</time><div><strong>{r.pacientes?.nome_completo ?? 'Nome indisponível'}</strong><p>{r.profissionais?.nome_completo ?? 'Profissional indisponível'}</p></div><button className="rp-button" onClick={p.onAgenda}>Abrir Agenda</button></li>)}</ul>}</section>
    </div><aside className="rp-side" aria-label="Apoio ao turno">
      <section className="rp-panel rp-support" aria-label="Caixa do turno"><button className="rp-disclosure" aria-expanded={caixaAberto} aria-controls="rp-caixa" onClick={() => setCaixaAberto(!caixaAberto)}><span className="rp-support-icon"><Icone tipo="caixa"/></span><span><strong>Caixa do turno</strong><small>{c.carregando ? 'Consultando…' : c.erro ? c.erro === 'permissao' ? 'Sem permissão' : 'Informação indisponível' : operacional ? rotuloCaixa[operacional.status] : c.dado?.tipo === 'legado' ? 'Caixa legado · conferir no Financeiro' : 'Nenhum caixa aberto acessível'}</small></span><span aria-hidden="true">{caixaAberto ? '⌃' : '⌄'}</span></button><div id="rp-caixa" hidden={!caixaAberto}>{c.carregando ? <p className="rp-muted">Consultando resumo oficial…</p> : c.erro ? <FeedbackAlert variant="destructive" title={c.erro === 'permissao' ? 'Caixa sem permissão' : 'Caixa indisponível'} description="Os valores não foram confirmados. Confira seu acesso e tente atualizar."/> : operacional ? <><p className="rp-muted">Caixa de {formatarInstante(operacional.aberto_em)} · {p.clinicaNome}{operacional.aberto_por_nome ? ` · aberto por ${operacional.aberto_por_nome}` : ''}</p><div className="rp-money-heading"><p>Recebido no turno <small>(bruto)</small></p><button className="rp-link" onClick={() => setOcultar(!ocultar)}>{ocultar ? 'Mostrar valores' : 'Ocultar valores'}</button></div><strong className="rp-money">{ocultar ? '••••' : dinheiro(operacional.resumo.total_recebimentos_brutos)}</strong><div className="rp-methods">{[['Dinheiro', operacional.resumo.total_dinheiro], ['Pix', operacional.resumo.total_pix], ['Crédito', operacional.resumo.total_cartao_credito]].map(([nome, valor]) => <div key={nome}><span>{nome}</span><strong>{ocultar ? '••••' : dinheiro(valor)}</strong></div>)}</div><div className="rp-balance"><span>Saldo esperado em dinheiro</span><strong>{ocultar ? '••••' : dinheiro(operacional.resumo.valor_esperado)}</strong></div><p className="rp-muted">Período: abertura até a consulta em {formatarInstante(c.em!)} · America/Bahia</p></> : <p className="rp-muted">{c.dado?.tipo === 'legado' ? 'O resumo homologado não está disponível para este caixa. Consulte o Financeiro.' : 'Nenhuma sessão de caixa aberta está acessível nesta clínica. Valores indisponíveis.'}</p>}<button className="rp-button rp-finance" onClick={p.onFinanceiro}>Abrir Financeiro <Icone tipo="seta"/></button>{c.em && <p className="rp-muted">{c.erro ? 'Última leitura válida: ' : 'Consultado em: '}{formatarInstante(c.em)}{c.erro ? ' · leitura atual falhou' : ''}</p>}</div></section>
      <section className="rp-panel rp-support" aria-label="Pendências cadastrais"><button className="rp-disclosure" aria-expanded={pendenciasAbertas} aria-controls="rp-pendencias" onClick={() => setPendenciasAbertas(!pendenciasAbertas)}><span className="rp-support-icon rp-warning-text"><Icone tipo="pessoa"/></span><span><strong>Pendências cadastrais</strong><small>Conferência em Pacientes</small></span><span aria-hidden="true">{pendenciasAbertas ? '⌃' : '⌄'}</span></button><div id="rp-pendencias" hidden={!pendenciasAbertas}><p className="rp-muted">Contagem consolidada indisponível. Confira cada cadastro no módulo Pacientes.</p><button className="rp-link" onClick={p.onPacientes}>Abrir Pacientes <Icone tipo="seta"/></button></div></section>
      <section className="rp-panel rp-professionals" aria-label="Profissionais com consultas hoje"><h2>Profissionais com consultas hoje</h2>{m.carregando || m.erro ? <p className="rp-muted">{m.carregando ? 'Carregando…' : 'Informação indisponível.'}</p> : !profissionais.length ? <p className="rp-muted">Nenhum profissional com agendamento nesta data.</p> : <ul>{profissionais.map(([id, prof]) => <li key={id}><button onClick={() => { setProfissional(id); buscaRef.current?.focus() }}><span className="rp-avatar">{iniciais(prof?.nome_completo ?? 'Profissional')}</span><span><strong>{prof?.nome_completo ?? 'Nome indisponível'}</strong><small>{prof?.especialidades?.nome ?? 'Especialidade indisponível'}</small></span><Icone tipo="seta"/></button></li>)}</ul>}</section>
    </aside></div>
    <details className="rp-criteria"><summary>Como interpretar este painel</summary><p>As contagens consideram todos os agendamentos não cancelados, autorizados para esta clínica, na data local acima. Os filtros alteram apenas a lista. Aguardando, Em atendimento e Concluídos refletem a situação registrada, sem dedução pelo horário. Sem horário de chegada registrado, a lista usa o horário agendado e não calcula espera nem prioridade clínica. Horários passados ainda previstos precisam de conferência na Agenda; não significam falta. Consultas não confirmam presença ou disponibilidade profissional. O recebido bruto e o saldo esperado em dinheiro são os valores oficiais distintos do Financeiro. Pagamentos individuais não são exibidos nesta versão. Pendências cadastrais confirmadas não impedem atendimento.</p></details>
    <footer className="rp-footer"><span role="status">{m.carregando ? 'Atualizando movimento…' : m.erro ? `Leitura atual falhou${m.em ? ` · última leitura válida: ${formatarInstante(m.em)}` : ' · dados indisponíveis'}` : m.em ? `Movimento atualizado: ${formatarInstante(m.em)} · America/Bahia` : 'Atualização indisponível'}</span><button className="rp-link" disabled={m.carregando || c.carregando} onClick={() => setRevisao(r => r + 1)}><Icone tipo="atualizar"/>Atualizar</button></footer>
  </div>
}
