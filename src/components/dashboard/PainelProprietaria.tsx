import { useEffect, useState } from 'react'
import { ArrowUpRight, Banknote, CalendarDays, Clock, HandCoins, Landmark, RefreshCw, TriangleAlert } from 'lucide-react'
import CabecalhoDashboard from './CabecalhoDashboard'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { consultarMovimentoRecepcao, erroLeituraPainel, horaNaBahia, situacaoRecepcao, type MovimentoRecepcao } from '../../lib/dashboardRecepcao'
import { consultarFinanceiroDoDia, type FinanceiroDoDia } from '../../lib/dashboardProprietaria'
import { hojeNaBahia } from '../../lib/pacienteLista'
import { useAtualizacaoPainel } from '../../hooks/useAtualizacaoPainel'
import { concluirLeitura, falharLeitura, iniciarLeitura, instanteConservador, leituraDoContexto, type ErroLeitura, type Leitura } from '../../lib/leituraPainel'
import './painelProprietaria.css'

const rotuloSituacao = { agendado: 'Agendado', confirmado: 'Confirmado', aguardando: 'Aguardando', em_atendimento: 'Em atendimento', concluido: 'Concluído' }
const instante = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso))

/**
 * Cada bloco identifica a própria leitura: quando uma das duas fontes falha, a
 * outra continua datada e o usuário sabe de quando é o número que está vendo.
 */
function HoraConsulta({ em, servidor = false }: { em: string; servidor?: boolean }) {
  return <p className="prop-nota">{servidor ? 'Dados consultados no servidor' : 'Leitura concluída'} em {instante(em)} · Bahia</p>
}

function Falha({ nome, erro }: { nome: string; erro: ErroLeitura }) {
  return <FeedbackAlert variant="warning"
    title={erro === 'permissao' ? `${nome}: acesso não autorizado` : `${nome} indisponível`}
    description={erro === 'permissao'
      ? 'A consulta foi recusada. Confira seu acesso à clínica selecionada.'
      : 'Não foi possível confirmar os dados. Use Atualizar para tentar novamente.'} />
}

function Esqueleto({ rotulo, linhas = 3 }: { rotulo: string; linhas?: number }) {
  return <div role="status">
    <span className="sr-only">{rotulo}</span>
    <div className="prop-esqueleto" aria-hidden="true">{Array.from({ length: linhas }, (_, i) => <i key={i} />)}</div>
  </div>
}

export default function PainelProprietaria({ clinicaId, clinicaNome, nomeUsuario, onAgenda, onFinanceiro }: {
  clinicaId: string; clinicaNome: string; nomeUsuario: string | null; onAgenda: () => void; onFinanceiro: () => void
}) {
  const [agora, setAgora] = useState(() => new Date())
  // Relógio da tela: sustenta os próximos horários, o aviso de atraso e a virada de dia.
  useEffect(() => { const timer = window.setInterval(() => setAgora(new Date()), 30000); return () => window.clearInterval(timer) }, [])
  const dia = hojeNaBahia(agora), chave = `${clinicaId}:${dia}`
  const [agenda, setAgenda] = useState<Leitura<MovimentoRecepcao>>({ chave: '', carregando: true })
  const [financeiro, setFinanceiro] = useState<Leitura<FinanceiroDoDia>>({ chave: '', carregando: true })
  const carregando = agenda.carregando || financeiro.carregando
  // Sem consulta periódica nesta etapa: o botão usa a mesma política, que recusa leitura sobreposta.
  const { revisao, atualizar } = useAtualizacaoPainel({ contexto: chave, carregando, ativo: false })
  // Atualizar também avança o relógio da tela: próximos horários, aviso de atraso
  // e virada de dia precisam acompanhar a releitura, sem datar a consulta.
  const atualizarPainel = () => { setAgora(new Date()); atualizar() }

  useEffect(() => {
    let cancelado = false
    const controlador = new AbortController()
    // Atualização é sempre deliberada aqui: os valores saem da tela enquanto a
    // consulta corre, para não serem lidos como resposta do clique.
    setAgenda(anterior => iniciarLeitura(anterior, chave, false))
    setFinanceiro(anterior => iniciarLeitura(anterior, chave, false))
    void consultarMovimentoRecepcao(clinicaId, dia, controlador.signal)
      .then(dado => { if (!cancelado) setAgenda(concluirLeitura(chave, dado, dado.consultadoEm)) })
      .catch(erro => { if (!cancelado) setAgenda(anterior => falharLeitura(anterior, chave, erroLeituraPainel(erro))) })
    // O serviço financeiro compartilhado não aceita AbortSignal. A chave e o marcador
    // impedem que uma resposta tardia de outra clínica ou de outro dia seja publicada.
    void consultarFinanceiroDoDia(clinicaId, dia)
      .then(dado => { if (!cancelado) setFinanceiro(concluirLeitura(chave, dado, dado.consultadoEm)) })
      .catch(erro => { if (!cancelado) setFinanceiro(anterior => falharLeitura(anterior, chave, erroLeituraPainel(erro))) })
    return () => { cancelado = true; controlador.abort() }
  }, [clinicaId, dia, chave, revisao])

  const a: Leitura<MovimentoRecepcao> = leituraDoContexto(agenda, chave)
  const f: Leitura<FinanceiroDoDia> = leituraDoContexto(financeiro, chave)
  const registros = a.dado?.registros
  const horaAgora = horaNaBahia(agora)
  const previstos = registros?.filter(r => situacaoRecepcao(r) === 'previstos') ?? []
  const proximos = registros && previstos.filter(r => r.hora_inicio.slice(0, 5) >= horaAgora).slice(0, 5)
  const atrasados = previstos.filter(r => r.hora_inicio.slice(0, 5) < horaAgora).length
  const contar = (situacao: string) => registros?.filter(r => situacaoRecepcao(r) === situacao).length ?? 0
  const aguardando = contar('aguardando'), emAtendimento = contar('em_atendimento')

  // A última consulta vem sempre de leitura bem-sucedida; o relógio da tela não a avança.
  const referencia = instanteConservador(a.em, f.em)
  const situacaoLeitura = carregando ? 'Atualizando dados…'
    : a.erro || f.erro ? `Atualização malsucedida${referencia ? ` · última leitura confirmada ${instante(referencia)}` : ' · dados indisponíveis'}`
      : referencia && a.em && f.em ? `Dados confirmados ${instante(referencia)} · America/Bahia`
        : 'Atualização indisponível'

  const pendencias = f.dado ? [
    { quantidade: f.dado.caixasParaRevisar, titulo: 'Caixas aguardando aprovação', escopo: 'Posição atual' },
    { quantidade: f.dado.caixasParaCorrigir, titulo: 'Caixas devolvidos para correção', escopo: 'Posição atual' },
    { quantidade: f.dado.repassesPendentes, titulo: 'Repasses pendentes', escopo: 'Posição atual, sem recorte de data' },
    { quantidade: f.dado.fiscaisPendentes, titulo: 'Documentos fiscais pendentes', escopo: 'Dos recebimentos de hoje' },
  ] : null
  const pendentes = pendencias?.filter(item => item.quantidade > 0)

  return <div className="prop">
    <header className="prop-topo">
      <CabecalhoDashboard nome={nomeUsuario} clinicaNome={clinicaNome} agora={agora} contexto="Visão geral" />
      <div className="prop-topo-acao">
        <p className="prop-nota" role="status">{situacaoLeitura}</p>
        <button type="button" className="prop-botao" onClick={atualizarPainel} disabled={carregando}>
          <RefreshCw size={16} aria-hidden="true" />Atualizar painel
        </button>
      </div>
    </header>

    <section className="prop-card" aria-labelledby="prop-financeiro">
      <div className="prop-head">
        <h2 id="prop-financeiro">Financeiro de hoje</h2>
        <button type="button" className="prop-link" onClick={onFinanceiro}>Abrir Financeiro<ArrowUpRight size={15} aria-hidden="true" /></button>
      </div>
      <p className="prop-nota">{dia.split('-').reverse().join('/')} · 00h às 24h · America/Bahia</p>
      {!f.dado ? (f.erro ? <Falha nome="Resumo financeiro" erro={f.erro} /> : <Esqueleto rotulo="Consultando valores oficiais…" />) : <>
        <dl className="prop-moedas">
          {([
            ['Recebido bruto hoje', f.dado.recebido, `${f.dado.quantidadeRecebimentos} ${f.dado.quantidadeRecebimentos === 1 ? 'recebimento' : 'recebimentos'} · antes de estornos`, Banknote, 1],
            ['Parcela da clínica', f.dado.parcelaClinica, 'Após estornos', Landmark, 4],
            ['Repasses pagos hoje', f.dado.repassesPagos, 'Confirmados hoje', HandCoins, 5],
          ] as const).map(([rotulo, valor, nota, Icone, cor]) => <div key={rotulo} className="prop-moeda" data-cor={cor}>
            <dt><span className="prop-moeda-icone" aria-hidden="true"><Icone size={18} /></span>{rotulo}</dt>
            <dd><strong>{valor}</strong><small>{nota}</small></dd>
          </div>)}
        </dl>
        <details className="prop-entenda">
          <summary>Entenda estes valores</summary>
          <dl>
            <dt>Recebido bruto hoje</dt>
            <dd>Pagamentos registrados hoje, somados antes de qualquer estorno.</dd>
            <dt>Parcela da clínica</dt>
            <dd>A parcela da clínica nos recebimentos de hoje, já descontados os estornos vinculados a eles, inclusive estornos efetivados depois.</dd>
            <dt>Repasses pagos hoje</dt>
            <dd>Repasses cujo pagamento foi confirmado hoje, mesmo que tenham sido gerados em dias anteriores.</dd>
          </dl>
          <p>Nenhum destes valores é lucro, resultado do mês ou saldo de caixa. A conferência por sessão de caixa fica no módulo Financeiro.</p>
        </details>
        {f.em && <HoraConsulta em={f.em} servidor />}
      </>}
    </section>

    <section className="prop-card" aria-labelledby="prop-atencao">
      <div className="prop-head">
        <h2 id="prop-atencao">Precisa de atenção</h2>
        <button type="button" className="prop-link" onClick={onFinanceiro}>Abrir Financeiro<ArrowUpRight size={15} aria-hidden="true" /></button>
      </div>
      {!pendencias ? (f.erro ? <Falha nome="Pendências financeiras" erro={f.erro} /> : <Esqueleto rotulo="Consultando pendências financeiras…" linhas={2} />) : <>
        {pendentes?.length ? <ul className="prop-pendencias">
          {pendentes.map(item => <li key={item.titulo}>
            <span className="prop-pendencia-numero" aria-hidden="true">{item.quantidade}</span>
            <span className="prop-pendencia-texto">
              <strong>{item.titulo}</strong>
              <small>{item.quantidade} {item.quantidade === 1 ? 'item' : 'itens'} · {item.escopo}</small>
            </span>
          </li>)}
        </ul> : <p className="prop-vazio-linha">
          <Clock size={16} aria-hidden="true" />
          Sem caixas aguardando aprovação ou devolvidos para correção, repasses pendentes ou documentos fiscais pendentes nos escopos consultados.
        </p>}
        <p className="prop-nota">O botão acima abre o módulo Financeiro; ele não aplica filtro por pendência. Outras solicitações, como estornos, também são conferidas lá.</p>
        {f.em && <HoraConsulta em={f.em} servidor />}
      </>}
    </section>

    <section className="prop-card" aria-labelledby="prop-operacao">
      <div className="prop-head">
        <h2 id="prop-operacao">Operação de hoje</h2>
      </div>
      {!registros ? (a.erro ? <Falha nome="Movimento do dia" erro={a.erro} /> : <Esqueleto rotulo="Consultando movimento do dia…" linhas={2} />) : <>
        <dl className="prop-contagens">
          <div className="prop-contagem" data-destaque="true">
            <dt>Agendamentos do dia</dt><dd><strong>{registros.length}</strong><small>Não cancelados</small></dd>
          </div>
          {([
            ['Previstos', contar('previstos'), 'Agendado ou confirmado'],
            ['Aguardando', aguardando, 'Na recepção'],
            ['Em atendimento', emAtendimento, 'Atendimentos iniciados'],
            ['Concluídos', contar('concluido'), 'Atendimentos finalizados'],
          ] as const).map(([rotulo, valor, nota]) => <div className="prop-contagem" key={rotulo} data-testid={`resumo-${rotulo}`}>
            <dt>{rotulo}</dt><dd><strong>{valor}</strong><small>{nota}</small></dd>
          </div>)}
        </dl>
        <p className="prop-nota">Os quatro grupos refletem a situação registrada de cada agendamento, sem dedução pelo horário.</p>
        {a.em && <HoraConsulta em={a.em} />}
      </>}
    </section>

    <section className="prop-card" aria-labelledby="prop-agenda">
      <div className="prop-head">
        <h2 id="prop-agenda"><CalendarDays size={17} aria-hidden="true" />Agenda resumida</h2>
        <button type="button" className="prop-link" onClick={onAgenda}>Abrir Agenda<ArrowUpRight size={15} aria-hidden="true" /></button>
      </div>
      {!registros ? (a.erro ? <Falha nome="Agenda" erro={a.erro} /> : <Esqueleto rotulo="Consultando agenda…" />)
        : !registros.length ? <div className="prop-vazio">
          <CalendarDays size={24} aria-hidden="true" />
          <h3>Nenhum agendamento hoje</h3>
          <p>A agenda desta clínica está sem movimento nesta data.</p>
          <button type="button" className="prop-botao" onClick={onAgenda}>Consultar Agenda</button>
          {a.em && <HoraConsulta em={a.em} />}
        </div> : <>
          {atrasados > 0 && <p className="prop-alerta">
            <TriangleAlert size={16} aria-hidden="true" />
            <span><strong>{atrasados} {atrasados === 1 ? 'horário já passou e segue previsto' : 'horários já passaram e seguem previstos'}</strong>
              <span>Confira a situação na Agenda. Isso não significa falta.</span></span>
          </p>}
          {proximos?.length ? <ul className="prop-proximos" aria-label="Próximos horários previstos de hoje">
            {proximos.map(r => <li key={r.id}>
              <time>{r.hora_inicio.slice(0, 5)}</time>
              <span className="prop-proximo-quem">
                {r.profissionais?.nome_completo ?? 'Profissional não disponível'}
                <small>{r.profissionais?.especialidades?.nome ?? 'Especialidade não informada'}</small>
              </span>
              <span className="prop-situacao" data-situacao={r.status}>{rotuloSituacao[r.status]}</span>
            </li>)}
          </ul> : <p className="prop-vazio-linha">
            <Clock size={16} aria-hidden="true" />
            Nenhum horário futuro previsto hoje.
            {(aguardando > 0 || emAtendimento > 0) && ` ${aguardando} aguardando e ${emAtendimento} em atendimento neste momento.`}
          </p>}
          <p className="prop-nota">{proximos?.length ? 'Somente os próximos horários previstos de hoje. A agenda completa está no módulo Agenda.' : 'Apenas horários previstos de hoje aparecem aqui.'}</p>
          {a.em && <HoraConsulta em={a.em} />}
        </>}
    </section>
  </div>
}
