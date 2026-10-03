import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import './recepcao-preview.css'
import AppShell from '../../src/components/shell/AppShell'
import { ThemeProvider, useTheme } from '../../src/theme/ThemeProvider'
import { FeedbackAlert } from '../../src/components/feedback/FeedbackAlert'
import { AbasPainelRecepcao, IconePainel as Icone } from '../../src/components/dashboard/PainelRecepcaoUI'
import { iniciais } from '../../src/lib/texto'
import { cpfValido, apenasDigitos, formatarCpf } from '../../src/lib/cpf'
import { caminhoInterno, lerRotaInterna, navegarPara, useCaminhoAtual } from '../../src/lib/appRoute'

// Somente esta entrada de desenvolvimento importa a proposta. Nenhum serviço real.
const clinicas = [
  { id: 'previa-brotas', nome: 'Clínica Brotas', cor_primaria: '#2563eb', cor_secundaria: '#1d4ed8', cor_menu: '#1e305d' },
  { id: 'previa-ipupiara', nome: 'Clínica Ipupiara', cor_primaria: '#16a34a', cor_secundaria: '#15803d', cor_menu: '#183b33' },
]
const profissionais = [
  { nome: 'Dra. Helena Prado', especialidade: 'Clínica geral' },
  { nome: 'Dr. Rafael Nunes', especialidade: 'Cardiologia' },
  { nome: 'Dra. Lívia Castro', especialidade: 'Psicologia' },
]
const situacoes = ['Aguardando', 'Previstos', 'Em atendimento', 'Concluídos'] as const
type Situacao = typeof situacoes[number]
type Pagamento = 'Recebimento confirmado' | 'Sem recebimento registrado' | 'Parcialmente estornado' | 'Estornado' | 'Informação indisponível' | 'Parcial informado • conferir'
type Registro = { id: string; pacienteId: string; nome: string; profissional: number; horario: string; situacao: Situacao; chegada: string | null; pagamento: Pagamento }
const cenarios = { normal: 'Movimento normal', vazio: 'Dia vazio', falha: 'Falha de leitura', financeiro: 'Falha financeira', parcial: 'Pagamento parcial', passado: 'Horário passado sem chegada', desatualizado: 'Dados desatualizados' }
type Cenario = keyof typeof cenarios
const parametros = new URLSearchParams(location.search)
const cenarioInicial = parametros.get('cenario') as Cenario
const DATA_LOCAL = '2026-10-03'
const HORA_LOCAL = '10:20'
const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))
if (!lerRotaInterna()) {
  parametros.set('previa', 'recepcao')
  navegarPara(`${caminhoInterno(parametros.get('clinica') === 'ipupiara' ? 'ipupiara' : 'brotas', 'dashboard')}?${parametros}`, true)
}

function dadosSimulados(cenario: Cenario, clinica: string): Registro[] {
  if (cenario === 'vazio' || cenario === 'falha') return []
  const base: Registro[] = [
    { id: 'a1', pacienteId: 'p1', nome: 'Ana Moura', profissional: 0, horario: '09:30', situacao: 'Aguardando', chegada: '09:55', pagamento: 'Recebimento confirmado' },
    { id: 'a2', pacienteId: 'p2', nome: 'Bruno Tavares', profissional: 1, horario: '10:00', situacao: 'Aguardando', chegada: '10:00', pagamento: cenario === 'parcial' ? 'Parcial informado • conferir' : 'Sem recebimento registrado' },
    { id: 'a3', pacienteId: 'p3', nome: 'Carla Dantas', profissional: 2, horario: '10:00', situacao: 'Aguardando', chegada: '10:08', pagamento: 'Parcialmente estornado' },
    { id: 'a4', pacienteId: 'p4', nome: 'Fernanda Leal', profissional: 0, horario: '10:30', situacao: 'Previstos', chegada: null, pagamento: 'Recebimento confirmado' },
    { id: 'a5', pacienteId: 'p5', nome: 'José Lima', profissional: 1, horario: '10:45', situacao: 'Previstos', chegada: null, pagamento: 'Sem recebimento registrado' },
    { id: 'a6', pacienteId: 'p6', nome: 'Marina Alves', profissional: 2, horario: '11:00', situacao: 'Previstos', chegada: null, pagamento: 'Recebimento confirmado' },
    { id: 'a7', pacienteId: 'p7', nome: 'Pedro Santos', profissional: 0, horario: '09:00', situacao: 'Previstos', chegada: null, pagamento: 'Estornado' },
    { id: 'a8', pacienteId: 'p8', nome: 'Rosa Melo', profissional: 1, horario: '09:45', situacao: 'Previstos', chegada: null, pagamento: 'Informação indisponível' },
    { id: 'a9', pacienteId: 'p9', nome: 'Daniel Costa', profissional: 0, horario: '10:00', situacao: 'Em atendimento', chegada: '09:50', pagamento: 'Recebimento confirmado' },
    { id: 'a10', pacienteId: 'p10', nome: 'Beatriz Reis', profissional: 2, horario: '10:00', situacao: 'Em atendimento', chegada: '09:52', pagamento: 'Recebimento confirmado' },
    ...['Luiza Rocha', 'Caio Brito', 'Paula Dias', 'Vera Luz', 'Leo Ramos', 'Nina Gomes', 'Otávio Reis', 'Ana Moura'].map((nome, i): Registro => ({ id: `c${i}`, pacienteId: i === 7 ? 'p1' : `pc${i}`, nome, profissional: i % 3, horario: `08:${String(i * 5).padStart(2, '0')}`, situacao: 'Concluídos', chegada: '08:00', pagamento: 'Recebimento confirmado' })),
  ]
  return base.map(r => ({ ...r, id: `${clinica}-${r.id}`, nome: clinica === 'previa-ipupiara' ? `${r.nome} (I)` : r.nome, pagamento: cenario === 'financeiro' ? 'Informação indisponível' : r.pagamento }))
}

export function Proposta() {
  const caminho = useCaminhoAtual()
  const tela = lerRotaInterna(caminho)?.tela ?? 'dashboard'
  const { aplicarCoresClinica } = useTheme()
  const [clinicaId, setClinicaId] = useState(parametros.get('clinica') === 'ipupiara' ? clinicas[1].id : clinicas[0].id)
  const clinica = clinicas.find(c => c.id === clinicaId)!
  const [cenario, setCenario] = useState<Cenario>(cenarioInicial in cenarios ? cenarioInicial : 'normal')
  const [revisao, setRevisao] = useState(0)
  const chave = `${clinicaId}/${cenario}/${revisao}`
  const [leitura, setLeitura] = useState<{ chave: string; registros: Registro[]; hora: string } | null>(null)
  const requisicao = useRef(0)
  const [aba, setAba] = useState<Situacao>('Aguardando')
  const [profissional, setProfissional] = useState('todos')
  const [busca, setBusca] = useState('')
  const [modoBusca, setModoBusca] = useState('nome')
  const [feedback, setFeedback] = useState('')
  const [ocultarValores, setOcultarValores] = useState(false)
  const [caixaAberto, setCaixaAberto] = useState(() => matchMedia('(min-width: 1024px)').matches)
  const [pendenciasAbertas, setPendenciasAbertas] = useState(() => matchMedia('(min-width: 1024px)').matches)
  const controlesRef = useRef<HTMLDetailsElement>(null)
  const buscaRef = useRef<HTMLInputElement>(null)

  useEffect(() => { aplicarCoresClinica(clinica) }, [clinica, aplicarCoresClinica])
  useEffect(() => {
    setAba('Aguardando'); setProfissional('todos'); setBusca(''); setFeedback('')
  }, [clinicaId, cenario])
  useEffect(() => {
    const numero = ++requisicao.current
    const timer = setTimeout(() => {
      if (numero !== requisicao.current) return
      setLeitura({ chave, registros: dadosSimulados(cenario, clinicaId), hora: revisao ? '10:21' : HORA_LOCAL })
    }, parametros.has('atraso') ? 1200 : 180)
    return () => { clearTimeout(timer) }
  }, [chave, cenario, clinicaId, revisao])

  const carregando = leitura?.chave !== chave
  const falha = cenario === 'falha'
  const registros = carregando ? [] : leitura?.registros ?? []
  const horaReferencia = leitura?.chave === chave ? leitura.hora : HORA_LOCAL
  const contador = (s: Situacao) => registros.filter(r => r.situacao === s).length
  const passados = registros.filter(r => r.situacao === 'Previstos' && !r.chegada && r.horario < horaReferencia)
  const proximos = registros.filter(r => r.situacao === 'Previstos' && r.horario >= horaReferencia).sort((a, b) => a.horario.localeCompare(b.horario))
  const visiveis = registros.filter(r => r.situacao === aba && (profissional === 'todos' || r.profissional === Number(profissional)) && (modoBusca === 'cpf' || r.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')))).sort((a, b) => (aba === 'Aguardando' ? (a.chegada ?? '') : a.horario).localeCompare(aba === 'Aguardando' ? (b.chegada ?? '') : b.horario))
  const distintos = new Set(registros.map(r => r.pacienteId)).size
  const simulacao = (acao: string) => setFeedback(`Ação simulada: ${acao}. Nenhum dado foi consultado ou gravado. Na integração, será aberto o fluxo existente.`)
  function conferirPassados() { setAba('Previstos'); setBusca(''); setProfissional('todos'); buscaRef.current?.focus() }
  function pagamento(r: Registro) {
    const cor = r.pagamento === 'Recebimento confirmado' ? 'sucesso' : r.pagamento === 'Informação indisponível' || r.pagamento === 'Estornado' ? 'neutro' : 'aviso'
    return <span className={`rp-badge rp-${cor}`}>{r.pagamento}</span>
  }
  function acaoRegistro(r: Registro) {
    const receber = r.pagamento === 'Sem recebimento registrado' && ['Aguardando', 'Previstos'].includes(r.situacao)
    return <button className={`rp-button ${receber ? 'rp-primary' : ''}`} onClick={() => simulacao(receber ? `Receber pagamento de ${r.nome} pela Agenda` : r.pagamento.includes('Parcial') || r.pagamento === 'Estornado' || r.pagamento === 'Informação indisponível' ? `Conferir ${r.nome} no Financeiro` : `Ver cadastro de ${r.nome}`)}>{receber ? 'Receber' : r.pagamento.includes('Parcial') || r.pagamento === 'Estornado' || r.pagamento === 'Informação indisponível' ? 'Conferir' : 'Ver cadastro'}</button>
  }

  const ir = (destino: typeof tela) => { const query = new URLSearchParams(location.search); query.set('previa', 'recepcao'); navegarPara(`${caminhoInterno(clinicaId === clinicas[0].id ? 'brotas' : 'ipupiara', destino)}?${query}`); simulacao(`Abrir ${destino}`) }
  return <AppShell tela={tela} clinicaAtiva={clinica} clinicasDoUsuario={[clinica]} papel="recepcao" emailUsuario="recepcao@exemplo.invalid" onSelecionarClinica={() => undefined} onSair={() => simulacao('Sair')} onNavegar={ir}>
    {tela !== 'dashboard' ? <div className="rp"><h1>Destino simulado</h1><FeedbackAlert variant="info" title="Prévia isolada" description={`O menu abriu o destino ${tela} apenas na demonstração. Na integração, esta ação usará a tela existente.`}/><button className="rp-button" onClick={() => ir('dashboard')}>Voltar ao painel da recepção</button></div> : <div className="rp">
      <div className="rp-preview"><span><strong>Prévia isolada</strong> · Dados e ações simulados</span><details ref={controlesRef}><summary>Cenários de demonstração</summary><div className="rp-demo-controls"><label>Cenário<select aria-label="Cenário da prévia" value={cenario} onChange={e => setCenario(e.target.value as Cenario)}>{Object.entries(cenarios).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Unidade simulada<select aria-label="Unidade simulada" value={clinicaId} onChange={e => setClinicaId(e.target.value)}>{clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label></div></details></div>
      <header className="rp-heading"><div><h1>Bom dia, recepção</h1><p>Sábado, 03 de outubro de 2026 · {clinica.nome}</p></div><div className="rp-quick"><button className="rp-button" onClick={() => simulacao('Novo paciente')}>+ Novo paciente</button><button className="rp-button rp-primary" onClick={() => simulacao('Novo agendamento')}>+ Novo agendamento</button></div></header>
      {feedback && <FeedbackAlert variant="info" title="Demonstração" description={feedback} onClose={() => setFeedback('')} />}
      <section className="rp-metrics" aria-label="Indicadores do dia">
        {([
          ['Consultas do dia', registros.length, 'Agendamentos não cancelados', 'calendario', 1],
          ['Aguardando', contador('Aguardando'), 'Chegada registrada', 'relogio', 3],
          ['Em atendimento', contador('Em atendimento'), 'Situação registrada', 'pessoa', 5],
          ['Concluídos', contador('Concluídos'), 'Conclusão registrada', 'check', 4],
        ] as const).map(([label, valor, apoio, icone, cor]) => <div key={label} className="rp-metric" style={{ '--rp-acento': `var(--kpi-${cor}-texto)`, '--rp-icone-fundo': `var(--kpi-${cor}-icone-fundo)` } as CSSProperties}><span className="rp-metric-icon"><Icone tipo={icone}/></span><div><p>{label}</p><strong>{carregando || falha ? '—' : valor}</strong><small>{apoio}</small></div></div>)}
      </section>
      <details className="rp-criteria"><summary>Como as contagens são feitas{!carregando && !falha ? ` · ${registros.length} agendamentos / ${distintos} pacientes distintos` : ''}</summary><p>Data local {DATA_LOCAL}, America/Bahia (UTC−03), na unidade simulada. Consultas contam agendamentos não cancelados; as situações também contam agendamentos, sem duplicar IDs. Pacientes distintos usam a identificação cadastral na mesma clínica. Busca e filtro não alteram os totais do dia. A fila usa chegada registrada, sem prioridade clínica. Consultas previstas não confirmam presença, atraso ou disponibilidade profissional. Recebimento confirmado não comprova quitação integral; saldo esperado em dinheiro inclui a abertura e os movimentos oficiais do caixa. Pendências confirmadas não impedem atendimento; CPF é opcional.</p></details>
      {cenario === 'desatualizado' && <FeedbackAlert variant="warning" title="Dados desatualizados" description="Última leitura simulada às 09:50. Atualize para conferir o movimento. Os tempos de espera estão indisponíveis." />}
      {!!passados.length && <div className="rp-warning"><Icone tipo="relogio"/><span><strong>{passados.length} horários passaram sem chegada registrada</strong><span>Confira com o paciente. A situação continua prevista.</span></span><button className="rp-link" onClick={conferirPassados}>Conferir <Icone tipo="seta"/></button></div>}
      <div className="rp-layout">
        <div className="rp-main">
          <section className="rp-panel" aria-labelledby="movimento-titulo" aria-busy={carregando}>
            <div className="rp-section-heading"><h2 id="movimento-titulo">Movimento de hoje</h2><button className="rp-link" onClick={() => simulacao('Ver Agenda')}>Ver agenda <Icone tipo="seta"/></button></div>
            <div className="rp-filters"><label>Buscar por<select aria-label="Modalidade da busca" value={modoBusca} onChange={e => { setModoBusca(e.target.value); setBusca('') }}><option value="nome">Nome</option><option value="cpf">CPF exato</option></select></label><label className="rp-search-label">{modoBusca === 'cpf' ? 'CPF exato' : 'Paciente'}<div className="rp-search"><Icone tipo="busca"/><input ref={buscaRef} aria-label={modoBusca === 'cpf' ? 'CPF exato' : 'Buscar paciente'} value={busca} placeholder={modoBusca === 'cpf' ? '11 dígitos • demonstração' : 'Buscar paciente'} inputMode={modoBusca === 'cpf' ? 'numeric' : 'text'} maxLength={modoBusca === 'cpf' ? 14 : 100} onChange={e => setBusca(modoBusca === 'cpf' ? formatarCpf(e.target.value) : e.target.value)}/></div></label><label>Profissional<select aria-label="Filtrar por profissional" value={profissional} onChange={e => setProfissional(e.target.value)}><option value="todos">Todos os profissionais</option>{profissionais.map((p, i) => <option key={p.nome} value={i}>{p.nome}</option>)}</select></label></div>
            {modoBusca === 'cpf' && <div className="rp-cpf"><p>A busca real é exata, com 11 dígitos válidos e restrita à clínica. Use apenas valores fictícios nesta prévia.</p><button className="rp-button" disabled={apenasDigitos(busca).length !== 11 || !cpfValido(apenasDigitos(busca))} onClick={() => simulacao('Busca exata por CPF em Pacientes')}>Buscar CPF</button></div>}
            <AbasPainelRecepcao nomes={situacoes} contagens={situacoes.map(s => carregando || falha ? null : contador(s))} selecionada={situacoes.indexOf(aba)} onSelecionar={i => setAba(situacoes[i])} idPainel="rp-registros"/>
            <div id="rp-registros" role="tabpanel" aria-labelledby={`rp-registros-tab-${situacoes.indexOf(aba)}`} tabIndex={0}>
              {carregando ? <div className="rp-empty" role="status">Carregando demonstração da {clinica.nome}…</div> : falha ? <div className="rp-empty"><FeedbackAlert variant="destructive" title="Movimento indisponível" description="A leitura simulada falhou. Nenhuma contagem ou pagamento foi confirmado." action={<button className="rp-button" onClick={() => setRevisao(r => r + 1)}>Tentar novamente</button>}/></div> : modoBusca === 'cpf' ? <div className="rp-empty">Busca por CPF simulada. O painel não armazena nem compara CPF de pacientes.</div> : !visiveis.length ? <div className="rp-empty"><Icone tipo="calendario"/><strong>{registros.length ? 'Nenhum agendamento neste filtro' : 'O dia está livre por aqui'}</strong><p>{registros.length ? 'Escolha outra situação ou ajuste a busca e o profissional.' : 'Não há agendamentos nesta data. Você pode criar um novo agendamento.'}</p></div> : <><div className="rp-table-head"><span>Paciente</span><span>Chegada · espera</span><span>Pagamento</span><span>Ação</span></div><ul className="rp-records">{visiveis.map(r => <li key={r.id} className="rp-record" data-testid="registro"><div className="rp-identity"><span className="rp-avatar" style={{ '--rp-avatar-fundo': `var(--prof-${r.profissional + 1}-avatar)`, '--rp-avatar-texto': `var(--prof-${r.profissional + 1}-texto)` } as CSSProperties}>{iniciais(r.nome)}</span><div><strong>{r.nome}</strong><p>{profissionais[r.profissional].nome}</p></div></div><div className="rp-arrival">{r.chegada ? <><strong>Chegou às {r.chegada}</strong><span>{r.situacao === 'Aguardando' ? cenario === 'desatualizado' ? 'Espera indisponível' : `${minutos(horaReferencia) - minutos(r.chegada)} min de espera` : `Consulta às ${r.horario}`}</span></> : <><strong>Previsto às {r.horario}</strong><span className={r.horario < horaReferencia ? 'rp-warning-text' : ''}>{r.horario < horaReferencia ? 'Sem chegada • conferir' : 'Chegada não registrada'}</span></>}</div><div className="rp-payment">{pagamento(r)}</div><div className="rp-record-action">{acaoRegistro(r)}</div></li>)}</ul></>}
            </div><p className="rp-footnote">Ordem de chegada registrada · sem classificação de prioridade clínica.</p>
          </section>
          <section className="rp-panel rp-next" aria-label="Próximas chegadas"><div className="rp-section-heading"><h2>Próximas chegadas</h2><button className="rp-link" onClick={() => { setAba('Previstos'); buscaRef.current?.focus() }}>Ver previstas <Icone tipo="seta"/></button></div>{carregando || falha ? <p className="rp-muted">{carregando ? 'Carregando…' : 'Próximas chegadas indisponíveis.'}</p> : !proximos.length ? <p className="rp-muted">Nenhuma chegada futura prevista nesta data.</p> : <ul>{proximos.map(r => <li key={r.id}><time>{r.horario}</time><div><strong>{r.nome}</strong><p>{profissionais[r.profissional].nome}</p></div><button className="rp-button" onClick={() => simulacao(`Registrar chegada de ${r.nome} pela Agenda`)}>Registrar chegada</button></li>)}</ul>}</section>
        </div>
        <aside className="rp-side" aria-label="Apoio ao turno">
          <section className="rp-panel rp-support" aria-label="Caixa do turno"><button className="rp-disclosure" aria-expanded={caixaAberto} aria-controls="rp-caixa" onClick={() => setCaixaAberto(!caixaAberto)}><span className="rp-support-icon"><Icone tipo="caixa"/></span><span><strong>Caixa do turno</strong><small>{carregando ? 'Carregando…' : falha || cenario === 'financeiro' ? 'Informação indisponível' : cenario === 'vazio' ? 'Sem caixa aberto' : 'Aberto às 07:45 · simulado'}</small></span><span aria-hidden="true">{caixaAberto ? '⌃' : '⌄'}</span></button>
            <div id="rp-caixa" hidden={!caixaAberto}>{carregando ? <p className="rp-muted">Consultando demonstração…</p> : falha || cenario === 'financeiro' ? <FeedbackAlert variant="destructive" title="Caixa indisponível" description="Falha de leitura financeira simulada. Os valores e os estados de pagamento não foram confirmados."/> : cenario === 'vazio' ? <p className="rp-muted">Nenhuma sessão de caixa aberta na simulação. Valores indisponíveis.</p> : <><div className="rp-money-heading"><p>Recebido no turno <small>(bruto)</small></p><button className="rp-link" aria-label={ocultarValores ? 'Mostrar valores simulados' : 'Ocultar valores simulados'} onClick={() => setOcultarValores(!ocultarValores)}>{ocultarValores ? 'Mostrar' : 'Ocultar'}</button></div><strong className="rp-money">{ocultarValores ? '••••' : 'R$ 1.450,00'}</strong><div className="rp-methods">{[['Dinheiro', 'R$ 420,00'], ['Pix', 'R$ 680,00'], ['Crédito', 'R$ 350,00']].map(([nome, valor]) => <div key={nome}><span>{nome}</span><strong>{ocultarValores ? '••••' : valor}</strong></div>)}</div><div className="rp-balance"><span>Saldo esperado em dinheiro</span><strong>{ocultarValores ? '••••' : 'R$ 570,00'}</strong></div></>}
              <button className="rp-button rp-finance" onClick={() => simulacao('Abrir Financeiro para conferência e fechamento')}>Abrir Financeiro <Icone tipo="seta"/></button>
            </div></section>
          <section className="rp-panel rp-support" aria-label="Pendências cadastrais"><button className="rp-disclosure" aria-expanded={pendenciasAbertas} aria-controls="rp-pendencias" onClick={() => setPendenciasAbertas(!pendenciasAbertas)}><span className="rp-support-icon rp-warning-text"><Icone tipo="pessoa"/></span><span><strong>Pendências cadastrais</strong><small>Pacientes com consulta hoje</small></span><span className="rp-badge rp-aviso">{carregando || falha ? '—' : cenario === 'vazio' ? 0 : 3}</span><span aria-hidden="true">{pendenciasAbertas ? '⌃' : '⌄'}</span></button><div id="rp-pendencias" hidden={!pendenciasAbertas}>{carregando || falha ? <p className="rp-muted">Pendências não confirmadas.</p> : cenario === 'vazio' ? <p className="rp-muted">Nenhuma pendência na simulação deste dia.</p> : <><button className="rp-pending-item" onClick={() => simulacao('Conferir dois pacientes com CPF ausente em Pacientes')}>2 pacientes sem CPF <Icone tipo="seta"/></button><button className="rp-pending-item" onClick={() => simulacao('Conferir um paciente sem telefone em Pacientes')}>1 paciente sem telefone <Icone tipo="seta"/></button><p className="rp-muted">3 pacientes distintos na simulação. Avisos não bloqueantes.</p></>}</div></section>
          <section className="rp-panel rp-professionals" aria-label="Profissionais com consultas hoje"><h2>Profissionais com consultas hoje</h2>{carregando || falha ? <p className="rp-muted">Informação indisponível.</p> : cenario === 'vazio' ? <p className="rp-muted">Nenhum profissional com consulta nesta data.</p> : <ul>{profissionais.map((p, i) => <li key={p.nome}><button onClick={() => { setProfissional(String(i)); buscaRef.current?.focus() }}><span className="rp-avatar" style={{ '--rp-avatar-fundo': `var(--prof-${i + 1}-avatar)`, '--rp-avatar-texto': `var(--prof-${i + 1}-texto)` } as CSSProperties}>{iniciais(p.nome.replace(/Dra?\./, ''))}</span><span><strong>{p.nome.replace(/Dra?\. /, '')}</strong><small>{p.especialidade}</small></span><Icone tipo="seta"/></button></li>)}</ul>}</section>
        </aside>
      </div>
      <footer className="rp-footer"><span role="status">{carregando ? 'Atualizando demonstração…' : falha ? 'Última leitura falhou · dados indisponíveis' : `Última atualização: ${cenario === 'desatualizado' ? '09:50 · desatualizado' : leitura?.hora} · America/Bahia`}</span><button className="rp-link" disabled={carregando} onClick={() => { if (cenario === 'desatualizado') setCenario('normal'); setRevisao(r => r + 1) }}><Icone tipo="atualizar"/>Atualizar</button><small>Proposta visual · sem conexão com dados reais</small></footer>
    </div>}
  </AppShell>
}

createRoot(document.getElementById('root')!).render(<ThemeProvider><Proposta/></ThemeProvider>)
