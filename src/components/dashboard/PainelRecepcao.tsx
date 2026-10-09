import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AbasPainelRecepcao, IconePainel as Icone } from './PainelRecepcaoUI'
import { consultarMovimentoRecepcao, erroLeituraPainel, horaNaBahia, situacaoRecepcao, SITUACOES_RECEPCAO, type MovimentoRecepcao, type RegistroRecepcao } from '../../lib/dashboardRecepcao'
import { consultarCaixaAtual, type EstadoCaixaAtual } from '../../lib/financeiro/financeiro.caixa-leitura'
import { decimalBancoParaCentavos, formatarCentavos } from '../../lib/financeiro/financeiro.money'
import { STATUS_CAIXA } from '../../lib/financeiro/financeiro.types'
import { hojeNaBahia, FUSO_PACIENTES } from '../../lib/pacienteLista'
import { buscarPacientePorCpf } from '../../lib/pacienteCpf'
import { apenasDigitos, cpfValido, formatarCpf } from '../../lib/cpf'
import { iniciais } from '../../lib/texto'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { concluirLeitura, falharLeitura, iniciarLeitura, instanteConservador, leituraDoContexto, type Leitura } from '../../lib/leituraPainel'
import { useAtualizacaoPainel } from '../../hooks/useAtualizacaoPainel'
import './painelRecepcao.css'
import CabecalhoDashboard from './CabecalhoDashboard'

export interface AcoesPainelRecepcao {
  onNovoPaciente: () => void; onNovoAgendamento: () => void
  onAbrirPaciente: (id: string) => void; onAgenda: () => void
  onPacientes: () => void; onFinanceiro: () => void
}
interface Props extends AcoesPainelRecepcao { clinicaId: string; clinicaNome: string; nomeUsuario?: string | null }

const nomes = ['Aguardando', 'Previstos', 'Em atendimento', 'Concluídos']
const rotuloStatus = { agendado: 'Agendado', confirmado: 'Confirmado', aguardando: 'Aguardando', em_atendimento: 'Em atendimento', concluido: 'Concluído' }
const tomStatus = { agendado: 'rp-neutro', confirmado: 'rp-sucesso', aguardando: 'rp-aviso', em_atendimento: 'rp-ativo', concluido: 'rp-neutro' }
const rotuloCaixa = { aberto: 'Aberto', em_fechamento: 'Em fechamento', aguardando_aprovacao: 'Aguardando aprovação', devolvido_para_correcao: 'Devolvido para correção', aprovado: 'Aprovado' }
const formatarInstante = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: FUSO_PACIENTES, dateStyle: 'short', timeStyle: 'short' })
const dinheiro = (valor: Parameters<typeof decimalBancoParaCentavos>[0]) => formatarCentavos(decimalBancoParaCentavos(valor))

export default function PainelRecepcao(p: Props) {
  const [agora, setAgora] = useState(() => new Date())
  // Relógio da tela: sustenta próximos horários, aviso de atraso e virada de dia na Bahia.
  useEffect(() => { const timer = window.setInterval(() => setAgora(new Date()), 30000); return () => window.clearInterval(timer) }, [])
  const data = hojeNaBahia(agora), chave = `${p.clinicaId}:${data}`
  const [movimento, setMovimento] = useState<Leitura<MovimentoRecepcao>>({ chave: '', carregando: true })
  const [caixa, setCaixa] = useState<Leitura<EstadoCaixaAtual>>({ chave: '', carregando: true })
  const [aba, setAba] = useState(0)
  const [busca, setBusca] = useState(''), [modo, setModo] = useState('nome'), [profissional, setProfissional] = useState('todos')
  const [cpf, setCpf] = useState<{ chave: string; requisicao: number; ids?: string[]; erro?: string; carregando: boolean } | null>(null)
  const cpfRequisicao = useRef(0)
  const carregando = movimento.carregando || caixa.carregando
  // Consulta periódica enquanto a aba está visível; retomada só relê leitura vencida.
  const { revisao, atualizar } = useAtualizacaoPainel({ contexto: chave, carregando })
  // Atualizar manualmente também avança o relógio da tela, sem datar a consulta.
  const atualizarPainel = () => { setAgora(new Date()); atualizar() }
  const chaveCpf = JSON.stringify([chave, modo, busca])
  const contextoCpf = useRef(chaveCpf)
  if (contextoCpf.current !== chaveCpf) { cpfRequisicao.current++; contextoCpf.current = chaveCpf }
  const [caixaAberto, setCaixaAberto] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [ocultar, setOcultar] = useState(false)
  const buscaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelado = false
    const controlador = new AbortController()
    setMovimento(anterior => iniciarLeitura(anterior, chave))
    setCaixa(anterior => iniciarLeitura(anterior, chave))
    void consultarMovimentoRecepcao(p.clinicaId, data, controlador.signal).then(dado => {
      if (!cancelado) setMovimento(concluirLeitura(chave, dado, dado.consultadoEm))
    }).catch(erro => { if (!cancelado) setMovimento(anterior => falharLeitura(anterior, chave, erroLeituraPainel(erro))) })
    void consultarCaixaAtual(p.clinicaId).then(dado => {
      // Validar os valores oficiais antes de renderizar; informação inválida não vira zero.
      if (dado.tipo === 'operacional') {
        if (!STATUS_CAIXA.includes(dado.caixa.status)) throw new Error('Estado do caixa inválido.')
        const r = dado.caixa.resumo
        for (const valor of [r.total_recebimentos_brutos, r.total_dinheiro, r.total_pix, r.total_cartao_credito, r.valor_esperado]) dinheiro(valor)
        if (!Number.isFinite(Date.parse(dado.caixa.aberto_em))) throw new Error('Período do caixa inválido.')
      }
      if (!cancelado) setCaixa(concluirLeitura(chave, dado, new Date().toISOString()))
    }).catch(erro => { if (!cancelado) setCaixa(anterior => falharLeitura(anterior, chave, erroLeituraPainel(erro))) })
    return () => { cancelado = true; controlador.abort() }
  }, [chave, p.clinicaId, data, revisao])

  const m = leituraDoContexto(movimento, chave)
  const c = leituraDoContexto(caixa, chave)
  const registros = m.dado?.registros ?? []
  const contagens = SITUACOES_RECEPCAO.map(s => m.dado ? registros.filter(r => situacaoRecepcao(r) === s).length : null)
  const profissionais = [...registros.reduce((mapa, r) => {
    const atual = mapa.get(r.profissional_id)
    if (atual) atual.total += 1
    else mapa.set(r.profissional_id, { prof: r.profissionais, total: 1 })
    return mapa
  }, new Map<string, { prof: RegistroRecepcao['profissionais']; total: number }>())]
    .sort(([, x], [, y]) => (x.prof?.nome_completo ?? '').localeCompare(y.prof?.nome_completo ?? '', 'pt-BR'))
  // Um profissional filtrado pode desaparecer dos dados numa releitura: tratar o filtro
  // de forma explícita, sem valor invisível no campo nem troca silenciosa da seleção.
  const profissionalAusente = profissional !== 'todos' && Boolean(m.dado) && !profissionais.some(([id]) => id === profissional)
  const resultadoCpf = cpf?.chave === chaveCpf && cpf.requisicao === cpfRequisicao.current ? cpf : null
  const visiveis = registros.filter(r => situacaoRecepcao(r) === SITUACOES_RECEPCAO[aba] && (profissional === 'todos' || r.profissional_id === profissional)
    && (modo === 'cpf' ? resultadoCpf?.ids?.includes(r.paciente_id) : (r.pacientes?.nome_completo ?? '').toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR'))))
  const proximos = registros.filter(r => situacaoRecepcao(r) === 'previstos' && r.hora_inicio.slice(0, 5) >= horaNaBahia(agora)).slice(0, 3)
  const passados = registros.filter(r => situacaoRecepcao(r) === 'previstos' && r.hora_inicio.slice(0, 5) < horaNaBahia(agora)).length
  const kpis = [
    ['Agendamentos do dia', m.dado ? registros.length : null, 'Não cancelados', 'calendario', 1],
    ['Aguardando', contagens[0], 'Situação registrada', 'relogio', 3],
    ['Em atendimento', contagens[2], 'Situação registrada', 'pessoa', 2],
    ['Concluídos', contagens[3], 'Situação registrada', 'check', 4],
  ] as const

  // A última consulta vem sempre de leitura bem-sucedida; o relógio da tela não a avança.
  const referencia = instanteConservador(m.em, c.em)
  const situacaoLeitura = carregando ? 'Atualizando…'
    : m.erro || c.erro ? `Atualização malsucedida${referencia ? ` · última leitura ${formatarInstante(referencia)}` : ' · dados indisponíveis'}`
      : referencia && m.em && c.em ? `Atualizado ${formatarInstante(referencia)}` : 'Atualização indisponível'

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
  function limparBusca() {
    setBusca(''); setModo('nome'); setCpf(null); cpfRequisicao.current++
    buscaRef.current?.focus()
  }
  function limparFiltros() { setAba(0); setProfissional('todos'); limparBusca() }
  function verPrevistos() { setAba(1); setProfissional('todos'); limparBusca() }
  const filtrosAplicados = Boolean(busca.trim()) || profissional !== 'todos' || aba !== 0
  const falhaMovimento = m.erro === 'permissao' ? 'Sem permissão para consultar o movimento desta clínica.' : 'Não foi possível confirmar o movimento completo. Atualize para tentar novamente.'
  const operacional = c.dado?.tipo === 'operacional' ? c.dado.caixa : null

  return <div className="rp rp-integrado">
    <header className="rp-heading">
      <CabecalhoDashboard nome={p.nomeUsuario ?? null} clinicaNome={p.clinicaNome} agora={agora} contexto="Seu dia na recepção" />
      <div className="rp-heading-acoes">
        <div className="rp-quick">
          <button className="rp-button" onClick={p.onNovoPaciente}>+ Novo paciente</button>
          <button className="rp-button rp-primary" onClick={p.onNovoAgendamento}>+ Novo agendamento</button>
        </div>
        <p className="rp-estado">
          <span>{situacaoLeitura}</span>
          <button type="button" className="rp-link" disabled={carregando} onClick={atualizarPainel}><Icone tipo="atualizar"/>Atualizar</button>
        </p>
      </div>
    </header>

    <section className="rp-metrics" aria-label="Indicadores do dia" aria-busy={m.carregando}>{kpis.map(([nome, valor, detalhe, icone, cor]) => <div className="rp-metric" key={nome} style={{ '--rp-acento': `var(--kpi-${cor}-texto)`, '--rp-icone-fundo': `var(--kpi-${cor}-icone-fundo)` } as CSSProperties}><span className="rp-metric-icon" aria-hidden="true"><Icone tipo={icone}/></span><div><p>{nome}</p><strong>{valor ?? '—'}</strong><small>{detalhe}</small></div></div>)}</section>
    {m.dado && <p className="rp-criteria">{registros.length} agendamentos / {new Set(registros.map(r => r.paciente_id)).size} pacientes distintos · {data} · America/Bahia</p>}
    {!!passados && <div className="rp-warning"><Icone tipo="relogio"/><span><strong>{passados} {passados === 1 ? 'agendamento com horário passado ainda previsto' : 'agendamentos com horário passado ainda previstos'}</strong><span>Conferir a situação na Agenda. Isso não significa falta.</span></span><button className="rp-link" onClick={verPrevistos}>Conferir <Icone tipo="seta"/></button></div>}

    <div className="rp-layout"><div className="rp-main">
      <section className="rp-panel" aria-labelledby="movimento-titulo" aria-busy={m.carregando}>
        <div className="rp-section-heading"><h2 id="movimento-titulo">Movimento de hoje</h2><button className="rp-link" onClick={p.onAgenda}>Ver agenda <Icone tipo="seta"/></button></div>
        <div className="rp-filters"><label>Buscar por<select aria-label="Modalidade da busca" value={modo} onChange={e => { setModo(e.target.value); setBusca(''); setCpf(null); cpfRequisicao.current++ }}><option value="nome">Nome</option><option value="cpf">CPF exato</option></select></label><label className="rp-search-label">{modo === 'cpf' ? 'CPF exato' : 'Paciente'}<div className="rp-search"><Icone tipo="busca"/><input ref={buscaRef} aria-label={modo === 'cpf' ? 'CPF exato' : 'Buscar paciente'} value={busca} placeholder={modo === 'cpf' ? '11 dígitos válidos' : 'Buscar paciente'} inputMode={modo === 'cpf' ? 'numeric' : 'text'} maxLength={modo === 'cpf' ? 14 : 100} onChange={e => { setBusca(modo === 'cpf' ? formatarCpf(e.target.value) : e.target.value); cpfRequisicao.current++ }} onKeyDown={e => { if (modo === 'cpf' && e.key === 'Enter') void buscarCpf() }}/></div></label><label>Profissional<select aria-label="Filtrar por profissional" value={profissional} onChange={e => setProfissional(e.target.value)}><option value="todos">Todos os profissionais</option>{profissionais.map(([id, { prof }]) => <option key={id} value={id}>{prof?.nome_completo ?? 'Nome indisponível'}</option>)}{profissionalAusente && <option value={profissional}>Profissional sem agendamentos nesta leitura</option>}</select></label></div>
        {modo === 'cpf' && <div className="rp-cpf"><span>Consulta exata, restrita à clínica selecionada.</span><button className="rp-button" disabled={!cpfValido(apenasDigitos(busca)) || resultadoCpf?.carregando} onClick={() => void buscarCpf()}>Buscar CPF</button></div>}
        {profissionalAusente && <p className="rp-aviso-filtro" role="status"><Icone tipo="relogio"/><span>O profissional filtrado não aparece na leitura atual deste dia. O filtro continua aplicado.</span><button type="button" className="rp-link" onClick={() => { setProfissional('todos'); buscaRef.current?.focus() }}>Remover filtro</button></p>}
        {filtrosAplicados && <div className="rp-filtros-aplicados" role="group" aria-label="Filtros do movimento">
          {busca.trim() && <button type="button" className="rp-filtro-removivel" onClick={limparBusca} aria-label={modo === 'cpf' ? 'Remover busca por CPF' : 'Remover busca por nome'}>{modo === 'cpf' ? 'Busca por CPF exato' : 'Busca por nome'}<span aria-hidden="true">×</span></button>}
          {profissional !== 'todos' && <button type="button" className="rp-filtro-removivel" onClick={() => { setProfissional('todos'); buscaRef.current?.focus() }} aria-label="Remover filtro de profissional">Profissional selecionado<span aria-hidden="true">×</span></button>}
          {aba !== 0 && <button type="button" className="rp-filtro-removivel" onClick={() => { setAba(0); buscaRef.current?.focus() }} aria-label="Remover filtro de situação e voltar a Aguardando">Situação: {nomes[aba]}<span aria-hidden="true">×</span></button>}
          <button type="button" className="rp-link" onClick={limparFiltros}>Limpar filtros</button>
        </div>}
        <AbasPainelRecepcao nomes={nomes} contagens={contagens} selecionada={aba} onSelecionar={setAba} idPainel="rp-movimento"/>
        <div id="rp-movimento" role="tabpanel" aria-labelledby={`rp-movimento-tab-${aba}`} tabIndex={0}>
          {m.erro ? <div className="rp-empty"><FeedbackAlert variant="destructive" title={m.erro === 'permissao' ? 'Movimento sem permissão' : 'Movimento indisponível'} description={falhaMovimento}/><div className="rp-empty-acoes"><button type="button" className="rp-button" disabled={carregando} onClick={atualizarPainel}>Tentar novamente</button></div></div>
            : m.carregando && !m.dado ? <div className="rp-empty" role="status"><span>Carregando movimento…</span><div className="rp-esqueleto" aria-hidden="true"><i/><i/><i/></div></div>
              : modo === 'cpf' && (!resultadoCpf?.ids || resultadoCpf.erro) ? <div className="rp-empty" role={resultadoCpf?.erro ? 'alert' : 'status'}>{resultadoCpf?.erro ?? (resultadoCpf?.carregando ? 'Buscando CPF…' : 'Informe o CPF válido e selecione Buscar CPF.')}</div>
                : !visiveis.length ? <div className="rp-empty"><Icone tipo="calendario"/><strong>{registros.length ? 'Nenhum agendamento neste filtro' : 'Nenhum agendamento nesta data'}</strong><p>{registros.length ? 'Ajuste a busca, a situação ou o profissional.' : 'Crie um novo agendamento quando necessário.'}</p><div className="rp-empty-acoes">{filtrosAplicados && <button type="button" className="rp-button" onClick={limparFiltros}>Limpar filtros</button>}{aba !== 1 && (contagens[1] ?? 0) > 0 && <button type="button" className="rp-button" onClick={verPrevistos}>Ver previstos</button>}{!registros.length && <button type="button" className="rp-button" onClick={p.onNovoAgendamento}>Novo agendamento</button>}</div></div>
                  : <><div className="rp-table-head"><span>Paciente</span><span>Horário · situação</span><span>Ações</span></div><ul className="rp-records">{visiveis.map(r => <li className="rp-record" key={r.id} data-testid="registro"><div className="rp-identity"><span className="rp-avatar">{iniciais(r.pacientes?.nome_completo ?? 'Paciente')}</span><div><strong>{r.pacientes?.nome_completo ?? 'Nome do paciente indisponível'}</strong><p>{r.profissionais?.nome_completo ?? 'Nome do profissional indisponível'}</p></div></div><div className="rp-arrival"><strong>Previsto às {r.hora_inicio.slice(0, 5)}</strong><span className={`rp-badge ${tomStatus[r.status]}`}>{rotuloStatus[r.status]}</span>{situacaoRecepcao(r) === 'previstos' && r.hora_inicio.slice(0, 5) < horaNaBahia(agora) && <span className="rp-warning-text">Horário já passou</span>}</div><div className="rp-record-action"><button className="rp-button" onClick={() => p.onAbrirPaciente(r.paciente_id)}>Ver cadastro</button><button className="rp-link" onClick={p.onAgenda}>Abrir Agenda</button></div></li>)}</ul></>}
        </div><p className="rp-footnote">Ordem pelo horário agendado.</p>
      </section>

      <section className="rp-panel rp-next" aria-label="Próximos horários de hoje"><div className="rp-section-heading"><h2>Próximos horários de hoje</h2><button className="rp-link" onClick={verPrevistos}>Ver previstos <Icone tipo="seta"/></button></div>{m.erro ? <p className="rp-muted">Próximos horários indisponíveis.</p> : m.carregando && !m.dado ? <p className="rp-muted">Carregando…</p> : !proximos.length ? <p className="rp-muted">Nenhum horário futuro previsto hoje.</p> : <ul>{proximos.map(r => <li key={r.id}><time>{r.hora_inicio.slice(0, 5)}</time><div><strong>{r.pacientes?.nome_completo ?? 'Nome indisponível'}</strong><p>{r.profissionais?.nome_completo ?? 'Profissional indisponível'}</p></div><button className="rp-button" onClick={p.onAgenda}>Abrir Agenda</button></li>)}</ul>}</section>
    </div><aside className="rp-side" aria-label="Apoio ao turno">

      <section className="rp-panel rp-support" aria-label="Caixa do turno"><button className="rp-disclosure" aria-expanded={caixaAberto} aria-controls="rp-caixa" onClick={() => setCaixaAberto(!caixaAberto)}><span className="rp-support-icon"><Icone tipo="caixa"/></span><span><strong>Caixa do turno</strong><small>{c.carregando && !c.dado ? 'Consultando…' : c.erro ? c.erro === 'permissao' ? 'Sem permissão' : 'Informação indisponível' : operacional ? rotuloCaixa[operacional.status] : c.dado?.tipo === 'legado' ? 'Caixa legado · conferir no Financeiro' : 'Nenhuma sessão aberta acessível'}</small></span><span aria-hidden="true">{caixaAberto ? '⌃' : '⌄'}</span></button><div id="rp-caixa" hidden={!caixaAberto}>{c.erro ? <><FeedbackAlert variant="destructive" title={c.erro === 'permissao' ? 'Caixa sem permissão' : 'Caixa indisponível'} description={c.erro === 'permissao' ? 'A consulta foi recusada. Confira seu acesso à clínica selecionada.' : 'Os valores não foram confirmados e por isso não são exibidos. Atualize para tentar novamente.'}/><button className="rp-button rp-finance" onClick={p.onFinanceiro}>Abrir Financeiro <Icone tipo="seta"/></button></> : c.carregando && !c.dado ? <p className="rp-muted">Consultando resumo oficial…</p> : operacional ? <><p className="rp-muted">Caixa de {formatarInstante(operacional.aberto_em)} · {p.clinicaNome}{operacional.aberto_por_nome ? ` · aberto por ${operacional.aberto_por_nome}` : ''}</p><div className="rp-money-heading"><p>Recebido no turno <small>(bruto)</small></p><button className="rp-link" onClick={() => setOcultar(!ocultar)}>{ocultar ? 'Mostrar valores' : 'Ocultar valores'}</button></div><strong className="rp-money">{ocultar ? '••••' : dinheiro(operacional.resumo.total_recebimentos_brutos)}</strong><div className="rp-methods">{[['Dinheiro', operacional.resumo.total_dinheiro], ['Pix', operacional.resumo.total_pix], ['Crédito', operacional.resumo.total_cartao_credito]].map(([nome, valor]) => <div key={nome}><span>{nome}</span><strong>{ocultar ? '••••' : dinheiro(valor)}</strong></div>)}</div><div className="rp-balance"><span>Saldo esperado em dinheiro</span><strong>{ocultar ? '••••' : dinheiro(operacional.resumo.valor_esperado)}</strong></div><p className="rp-muted">Período: abertura até a consulta em {formatarInstante(c.em!)} · America/Bahia</p><button className="rp-button rp-finance" onClick={p.onFinanceiro}>Abrir Financeiro <Icone tipo="seta"/></button></> : <><p className="rp-muted">{c.dado?.tipo === 'legado' ? 'Este caixa é anterior ao resumo oficial por sessão, por isso os valores não aparecem aqui. Faça a conferência no Financeiro.' : 'Nenhuma sessão de caixa aberta está acessível para você nesta clínica agora. Isso não confirma que o caixa do dia esteja fechado nem autoriza abrir outro.'}</p><button className="rp-button rp-finance" onClick={p.onFinanceiro}>Abrir Financeiro <Icone tipo="seta"/></button></>}</div></section>

      <section className="rp-panel rp-atalho" aria-label="Cadastros de pacientes"><button type="button" onClick={p.onPacientes}><span className="rp-support-icon"><Icone tipo="pessoa"/></span><span><strong>Cadastros de pacientes</strong><small>Consultar ou atualizar cadastro</small></span><Icone tipo="seta"/></button></section>

      <section className="rp-panel rp-professionals" aria-label="Profissionais com agendamentos hoje"><h2>Profissionais de hoje</h2>{m.erro ? <p className="rp-muted">Informação indisponível.</p> : m.carregando && !m.dado ? <p className="rp-muted">Carregando…</p> : !profissionais.length ? <p className="rp-muted">Nenhum profissional com agendamento nesta data.</p> : <><ul>{profissionais.map(([id, { prof, total }]) => <li key={id}><button onClick={() => { setProfissional(id); buscaRef.current?.focus() }} aria-pressed={profissional === id}><span className="rp-avatar">{iniciais(prof?.nome_completo ?? 'Profissional')}</span><span><strong>{prof?.nome_completo ?? 'Nome indisponível'}</strong><small>{total} {total === 1 ? 'agendamento' : 'agendamentos'} · {prof?.especialidades?.nome ?? 'Especialidade indisponível'}</small></span><Icone tipo="seta"/></button></li>)}</ul><p className="rp-muted">A contagem é de agendamentos não cancelados do dia, não de pacientes distintos. Selecionar um profissional filtra a lista do movimento.</p></>}</section>
    </aside></div>

    <details className="rp-criteria"><summary>Como interpretar este painel</summary><p>As contagens consideram todos os agendamentos não cancelados, autorizados para esta clínica, na data local acima. Os filtros alteram apenas a lista. Aguardando, Em atendimento e Concluídos refletem a situação registrada, sem dedução pelo horário. Agendado e Confirmado são situações distintas: confirmado indica que o agendamento foi confirmado, não que o paciente chegou. Sem horário de chegada registrado, a lista usa o horário agendado e não calcula espera nem prioridade clínica. Horários passados ainda previstos precisam de conferência na Agenda; não significam falta. Consultas não confirmam presença ou disponibilidade profissional. O recebido bruto e o saldo esperado em dinheiro são os valores oficiais distintos do Financeiro. Pagamentos individuais não são exibidos nesta versão. O painel relê os dados periodicamente enquanto esta aba está visível; o horário de atualização é sempre o da última leitura confirmada.</p></details>
    <footer className="rp-footer"><span role="status">{m.carregando ? 'Atualizando movimento…' : m.erro ? `Leitura atual falhou${m.em ? ` · última leitura válida: ${formatarInstante(m.em)}` : ' · dados indisponíveis'}` : m.em ? `Movimento atualizado: ${formatarInstante(m.em)} · America/Bahia` : 'Atualização indisponível'}</span></footer>
  </div>
}
