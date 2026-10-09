import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, RefreshCw } from 'lucide-react'
import CabecalhoDashboard from './CabecalhoDashboard'
import { FeedbackAlert } from '../feedback/FeedbackAlert'
import { consultarMovimentoRecepcao, erroLeituraPainel, horaNaBahia, type MovimentoRecepcao } from '../../lib/dashboardRecepcao'
import { consultarFinanceiroDoDia, type FinanceiroDoDia } from '../../lib/dashboardProprietaria'
import { hojeNaBahia } from '../../lib/pacienteLista'
import './painelProprietaria.css'

type Leitura<T> = { chave: string; estado: 'carregando' } | { chave: string; estado: 'erro'; erro: 'permissao' | 'leitura' } | { chave: string; estado: 'sucesso'; dados: T }
const situacoes = { agendado: 'Agendado', confirmado: 'Confirmado', aguardando: 'Aguardando', em_atendimento: 'Em atendimento', concluido: 'Concluído' }
function Falha({ nome, erro }: { nome: string; erro: 'permissao' | 'leitura' }) {
  return <FeedbackAlert variant="warning" title={erro === 'permissao' ? `${nome}: acesso não autorizado` : `${nome} indisponível`} description={erro === 'permissao' ? 'A consulta foi recusada. Confira seu acesso à clínica selecionada.' : 'Não foi possível confirmar os dados. Tente atualizar o painel.'} />
}
function HoraConsulta({ em, servidor = false }: { em: string; servidor?: boolean }) {
  const data = new Date(em)
  const instante = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'medium' }).format(data)
  return <p className="proprietaria-caption">{servidor ? 'Dados consultados no servidor' : 'Leitura concluída'} em {instante} · Bahia</p>
}

export default function PainelProprietaria({ clinicaId, clinicaNome, nomeUsuario, onAgenda, onFinanceiro }: {
  clinicaId: string; clinicaNome: string; nomeUsuario: string | null; onAgenda: () => void; onFinanceiro: () => void
}) {
  const [agora, setAgora] = useState(() => new Date())
  const [revisao, setRevisao] = useState(0)
  // Cada atualização invalida imediatamente o resultado anterior, antes do efeito.
  const dia = hojeNaBahia(agora), chave = `${clinicaId}:${dia}:${revisao}`
  const [agenda, setAgenda] = useState<Leitura<MovimentoRecepcao>>({ chave, estado: 'carregando' })
  const [financeiro, setFinanceiro] = useState<Leitura<FinanceiroDoDia>>({ chave, estado: 'carregando' })
  useEffect(() => { const timer = window.setInterval(() => setAgora(new Date()), 30000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    let cancelado = false
    const controller = new AbortController()
    setAgenda({ chave, estado: 'carregando' })
    setFinanceiro({ chave, estado: 'carregando' })
    consultarMovimentoRecepcao(clinicaId, dia, controller.signal)
      .then(dados => { if (!cancelado) setAgenda({ chave, estado: 'sucesso', dados }) })
      .catch(erro => { if (!cancelado) setAgenda({ chave, estado: 'erro', erro: erroLeituraPainel(erro) }) })
    // O serviço financeiro compartilhado não aceita AbortSignal. O marcador e
    // a chave impedem publicação de respostas tardias de outra clínica/dia.
    consultarFinanceiroDoDia(clinicaId, dia)
      .then(dados => { if (!cancelado) setFinanceiro({ chave, estado: 'sucesso', dados }) })
      .catch(erro => { if (!cancelado) setFinanceiro({ chave, estado: 'erro', erro: erroLeituraPainel(erro) }) })
    return () => { cancelado = true; controller.abort() }
  }, [clinicaId, dia, chave, revisao])
  const a: Leitura<MovimentoRecepcao> = agenda.chave === chave ? agenda : { chave, estado: 'carregando' }
  const f: Leitura<FinanceiroDoDia> = financeiro.chave === chave ? financeiro : { chave, estado: 'carregando' }
  const registros = a.estado === 'sucesso' ? a.dados.registros : null
  const horaAtual = `${horaNaBahia(agora)}:${String(agora.getUTCSeconds()).padStart(2, '0')}`
  const proximo = registros?.find(r => ['agendado', 'confirmado'].includes(r.status) && r.hora_inicio >= horaAtual)
  const aguardando = registros?.filter(r => r.status === 'aguardando').length ?? 0
  const emAtendimento = registros?.filter(r => r.status === 'em_atendimento').length ?? 0
  const horariosAnteriores = registros?.filter(r => ['agendado', 'confirmado'].includes(r.status) && r.hora_inicio < horaAtual).length ?? 0
  const resumo = f.estado === 'sucesso' ? f.dados : null
  const pendencias = resumo ? [
    [resumo.caixasParaRevisar, 'Caixas aguardando aprovação', 'Posição atual'],
    [resumo.caixasParaCorrigir, 'Caixas devolvidos para correção', 'Posição atual'],
    [resumo.repassesPendentes, 'Repasses pendentes', 'Posição atual, sem recorte de data'],
    [resumo.fiscaisPendentes, 'Documentos fiscais pendentes', 'Recebimentos de hoje'],
  ] as const : null
  return <div className="proprietaria-dashboard">
    <header className="proprietaria-toolbar"><CabecalhoDashboard nome={nomeUsuario} clinicaNome={clinicaNome} agora={agora} /><button type="button" className="proprietaria-action" onClick={() => { setAgora(new Date()); setRevisao(r => r + 1) }}><RefreshCw size={16} aria-hidden="true" />Atualizar painel</button></header>
    <section className="proprietaria-card" aria-labelledby="proprietaria-dia">
      <div className="proprietaria-section-header"><h2 id="proprietaria-dia">Resumo do dia</h2><span className="proprietaria-caption">Agendamentos não cancelados</span></div>
      {a.estado === 'carregando' ? <p role="status">Consultando movimento do dia…</p> : a.estado === 'erro' ? <Falha nome="Movimento do dia" erro={a.erro} /> : <>
        <dl className="proprietaria-counts">{[
          ['Agendados', a.dados.registros.filter(r => r.status === 'agendado' || r.status === 'confirmado').length, 'Agendado ou confirmado; não é o total'],
          ['Aguardando', a.dados.registros.filter(r => r.status === 'aguardando').length, 'Na recepção'],
          ['Em atendimento', a.dados.registros.filter(r => r.status === 'em_atendimento').length, 'Atendimentos iniciados'],
          ['Concluídos', a.dados.registros.filter(r => r.status === 'concluido').length, 'Atendimentos finalizados'],
        ].map(([rotulo, valor, nota]) => <div key={rotulo} data-testid={`resumo-${rotulo}`}><dt>{rotulo}</dt><dd>{valor}</dd><small>{nota}</small></div>)}</dl>
        <HoraConsulta em={a.dados.consultadoEm} />
      </>}
    </section>
    <div className="proprietaria-columns">
      <section className="proprietaria-card proprietaria-agenda" aria-labelledby="proprietaria-agenda">
        <div className="proprietaria-section-header"><h2 id="proprietaria-agenda"><CalendarDays size={18} aria-hidden="true" />Agenda do dia</h2><button type="button" className="proprietaria-action" onClick={onAgenda}>Abrir Agenda<ArrowUpRight size={15} aria-hidden="true" /></button></div>
        {a.estado === 'carregando' ? <p role="status">Consultando agenda…</p> : a.estado === 'erro' ? <Falha nome="Agenda" erro={a.erro} /> : !a.dados.registros.length ? <div className="proprietaria-empty"><CalendarDays size={24} aria-hidden="true" /><h3>Nenhum agendamento hoje</h3><p>A agenda desta clínica está sem movimento nesta data.</p><button type="button" className="proprietaria-action" onClick={onAgenda}>Consultar Agenda</button><HoraConsulta em={a.dados.consultadoEm} /></div> : <>
          <div className="proprietaria-next"><span>Próximo atendimento</span><strong>{proximo ? `${proximo.hora_inicio.slice(0, 5)} · ${proximo.profissionais?.nome_completo ?? 'Profissional não disponível'}` : 'Nenhum horário futuro agendado ou confirmado hoje.'}</strong>
            {!proximo && (aguardando > 0 || emAtendimento > 0) && <p className="proprietaria-caption">{aguardando} aguardando · {emAtendimento} em atendimento.</p>}
            {!proximo && horariosAnteriores > 0 && <p className="proprietaria-caption">{horariosAnteriores} {horariosAnteriores === 1 ? 'horário anterior ainda' : 'horários anteriores ainda'} em Agendado ou Confirmado. Confira a Agenda.</p>}
          </div>
          <ul className="proprietaria-agenda-list" aria-label="Agendamentos de hoje">{a.dados.registros.slice(0, 8).map(r => <li key={r.id}><time>{r.hora_inicio.slice(0, 5)}</time><span className="proprietaria-profissional">{r.profissionais?.nome_completo ?? 'Profissional não disponível'}<small>{r.profissionais?.especialidades?.nome ?? 'Especialidade não informada'}</small></span><span className="proprietaria-situacao" data-situacao={r.status}>{situacoes[r.status]}</span></li>)}</ul>
          <p className="proprietaria-caption">{a.dados.registros.length > 8 ? `Exibindo 8 de ${a.dados.registros.length} agendamentos. A lista completa está na Agenda.` : `${a.dados.registros.length} agendamento${a.dados.registros.length === 1 ? '' : 's'} hoje.`}</p>
          <HoraConsulta em={a.dados.consultadoEm} />
        </>}
      </section>
      <section className="proprietaria-card" aria-labelledby="proprietaria-financeiro">
        <div className="proprietaria-section-header"><h2 id="proprietaria-financeiro">Resumo financeiro</h2><button type="button" className="proprietaria-action" onClick={onFinanceiro}>Financeiro<ArrowUpRight size={15} aria-hidden="true" /></button></div>
        <p className="proprietaria-caption">Hoje, {dia.split('-').reverse().join('/')} · 00h às 24h · Bahia</p>
        {f.estado === 'carregando' ? <p role="status">Consultando valores oficiais…</p> : f.estado === 'erro' ? <Falha nome="Resumo financeiro" erro={f.erro} /> : <>
          <dl className="proprietaria-finance-values"><div><dt>Recebido hoje</dt><dd>{f.dados.recebido}</dd><small>Bruto de {f.dados.quantidadeRecebimentos} recebimentos registrados hoje, antes de estornos.</small></div><div><dt>Parcela líquida da clínica</dt><dd>{f.dados.parcelaClinica}</dd><small>Parcela dos recebimentos de hoje, descontados os estornos vinculados, inclusive posteriores.</small></div><div><dt>Repasses pagos hoje</dt><dd>{f.dados.repassesPagos}</dd><small>Pagamentos de repasses confirmados hoje, independentemente da data de geração.</small></div></dl>
          <HoraConsulta em={f.dados.consultadoEm} servidor />
        </>}
      </section>
    </div>
    <section className="proprietaria-card" aria-labelledby="proprietaria-pendencias">
      <div className="proprietaria-section-header"><h2 id="proprietaria-pendencias">Pendências e ações</h2><span className="proprietaria-caption">Caixa, repasses e fiscal · clínica selecionada</span></div>
      {f.estado === 'carregando' ? <p role="status">Consultando pendências financeiras…</p> : f.estado === 'erro' ? <Falha nome="Pendências financeiras" erro={f.erro} /> : <>
        {pendencias?.some(([n]) => n > 0) ? <ul className="proprietaria-pending-list">{pendencias.filter(([n]) => n > 0).map(([n, titulo, periodo]) => <li key={titulo}><span><strong>{titulo}</strong><small>{n} · {periodo}</small></span><button type="button" className="proprietaria-action" onClick={onFinanceiro}>Conferir no Financeiro<ArrowUpRight size={15} aria-hidden="true" /></button></li>)}</ul> : <p className="proprietaria-caption">Nenhuma pendência de aprovação/correção de caixa, repasse ou documento fiscal nos escopos consultados.</p>}
        <p className="proprietaria-caption">Outras solicitações, como estornos, são conferidas no Financeiro.</p>
        <HoraConsulta em={f.dados.consultadoEm} servidor />
      </>}
    </section>
  </div>
}
