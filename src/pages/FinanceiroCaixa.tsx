import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ModalBase } from '../components/ModalBase'
import { FeedbackAlert } from '../components/feedback/FeedbackAlert'
import { rotuloPapel } from '../lib/papelApresentacao'
import { useFinanceiroConsulta } from '../hooks/useFinanceiroConsulta'
import {
  consultarCaixaAtual, consultarDetalhesCaixa,
  type CaixaOperacional, type DetalhesCaixa, type EstadoCaixaAtual,
} from '../lib/financeiro/financeiro.caixa-leitura'
import {
  abrirCaixa, efetivarSangria, enviarFechamento, iniciarFechamento,
  registrarSuprimento, revisarFechamento, revisarSangria, solicitarSangria,
} from '../lib/financeiro/financeiro.caixa'
import { invalidarFinanceiro } from '../lib/financeiro/financeiro.cache'
import { mapearErroFinanceiro, mensagemErroFinanceiro } from '../lib/financeiro/financeiro.errors'
import { idempotenciaFinanceira, type TentativaIdempotente } from '../lib/financeiro/financeiro.idempotency'
import { decimalBancoParaCentavos, formatarCentavos, textoMonetarioParaCentavos } from '../lib/financeiro/financeiro.money'
import type { Papel } from '../hooks/usePapelNaClinica'
import { ComposicaoCaixa, IndicadoresCaixa } from '../components/financeiro/CaixaRecepcaoVisual'
import { ExtratoCaixa } from '../components/financeiro/ExtratoCaixa'
import { HistoricoCaixa } from '../components/financeiro/HistoricoCaixa'
import { TentativasFechamento } from '../components/financeiro/TentativasFechamento'
import { formatarDataFinanceira } from '../lib/financeiro/financeiro.date'

type Acao =
  | { tipo: 'abrir' | 'suprimento' | 'solicitar_sangria' | 'enviar_fechamento' | 'iniciar_fechamento' }
  | { tipo: 'revisar_sangria'; id: string; decisao: 'aprovar' | 'rejeitar' }
  | { tipo: 'efetivar_sangria'; id: string }
  | { tipo: 'revisar_fechamento'; id: string; decisao: 'aprovar' | 'devolver' }

interface EstadoTela { atual: EstadoCaixaAtual; detalhes: DetalhesCaixa | null }

const moeda = (valor: string | number) => formatarCentavos(decimalBancoParaCentavos(valor))
const botao = 'finance-button'
const primario = 'finance-button finance-button-primary'
const campo = 'min-h-12 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 text-[var(--texto-principal)] focus-visible:outline-2 disabled:opacity-50'
const card = 'finance-surface'
const nuncaVazio = () => false

function rotuloAcao(acao: Acao): string {
  switch (acao.tipo) {
    case 'abrir': return 'Abrir caixa'
    case 'suprimento': return 'Adicionar suprimento'
    case 'solicitar_sangria': return 'Solicitar sangria'
    case 'iniciar_fechamento': return 'Iniciar fechamento'
    case 'enviar_fechamento': return 'Enviar fechamento para aprovação'
    case 'efetivar_sangria': return 'Efetivar sangria aprovada'
    case 'revisar_sangria': return acao.decisao === 'aprovar' ? 'Aprovar sangria' : 'Rejeitar sangria'
    case 'revisar_fechamento': return acao.decisao === 'aprovar' ? 'Aprovar fechamento' : 'Devolver para correção'
  }
}

function formularioMonetario(acao: Acao): boolean {
  return ['abrir', 'suprimento', 'solicitar_sangria', 'enviar_fechamento'].includes(acao.tipo)
}

function OperacaoCaixa({ acao, caixa, clinicaId, clinicaNome, usuarioId, recepcao, onFechar, onConcluido }: {
  acao: Acao
  caixa: CaixaOperacional | null
  clinicaId: string
  clinicaNome: string
  usuarioId: string
  recepcao: boolean
  onFechar: () => void
  onConcluido: () => void
}) {
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const tentativaRef = useRef<TentativaIdempotente | null>(null)
  const trava = useRef(false)
  const vigente = useRef(true)
  useEffect(() => { vigente.current = true; return () => { vigente.current = false } }, [])
  const titulo = recepcao && acao.tipo === 'iniciar_fechamento' ? 'Conferir fechamento' : rotuloAcao(acao)
  const precisaMotivo = acao.tipo === 'suprimento' || acao.tipo === 'solicitar_sangria'
  const exigeJustificativa = acao.tipo === 'enviar_fechamento' && caixa && valor.trim() !== '' && (() => {
    try { return textoMonetarioParaCentavos(valor) !== decimalBancoParaCentavos(caixa.resumo.valor_esperado) }
    catch { return false }
  })()
  const observacao = acao.tipo === 'revisar_sangria' || acao.tipo === 'revisar_fechamento'

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (trava.current) return
    setErro(null)
    let centavos = 0n
    try {
      if (formularioMonetario(acao)) {
        centavos = textoMonetarioParaCentavos(valor)
        if (centavos < 0n || (['suprimento', 'solicitar_sangria'].includes(acao.tipo) && centavos === 0n)) {
          throw new Error('Informe um valor válido. Suprimento e sangria devem ser maiores que zero.')
        }
      }
      if (precisaMotivo && !motivo.trim()) throw new Error('Informe o motivo da operação.')
      if (exigeJustificativa && !motivo.trim()) throw new Error('Justifique a diferença entre o valor contado e o esperado.')
      if (acao.tipo === 'revisar_fechamento' && acao.decisao === 'devolver' && !motivo.trim()) {
        throw new Error('Informe a orientação para correção.')
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Revise os dados informados.')
      return
    }

    trava.current = true
    setOcupado(true)
    setEnviado(true)
    try {
      const sessaoId = caixa?.sessao_caixa_id
      const idempotente = ['abrir', 'suprimento', 'solicitar_sangria', 'enviar_fechamento'].includes(acao.tipo)
      if (idempotente && !tentativaRef.current) {
        tentativaRef.current = idempotenciaFinanceira.iniciar(`caixa:${usuarioId}:${clinicaId}:${acao.tipo}:${sessaoId ?? 'novo'}`)
      }
      const tentativa = tentativaRef.current
      switch (acao.tipo) {
        case 'abrir':
          await abrirCaixa({ clinicaId, valorAberturaCentavos: centavos, tentativa: tentativa! }); break
        case 'suprimento':
          await registrarSuprimento({ sessaoCaixaId: sessaoId!, valorCentavos: centavos, motivo, tentativa: tentativa! }); break
        case 'solicitar_sangria':
          await solicitarSangria({ sessaoCaixaId: sessaoId!, valorCentavos: centavos, motivo, tentativa: tentativa! }); break
        case 'iniciar_fechamento':
          await iniciarFechamento(sessaoId!); break
        case 'enviar_fechamento':
          await enviarFechamento({ sessaoCaixaId: sessaoId!, valorContadoCentavos: centavos, justificativaDiferenca: motivo, tentativa: tentativa! }); break
        case 'revisar_sangria':
          await revisarSangria({ sangriaId: acao.id, acao: acao.decisao, observacao: motivo }); break
        case 'efetivar_sangria':
          await efetivarSangria(acao.id); break
        case 'revisar_fechamento':
          await revisarFechamento({ fechamentoId: acao.id, acao: acao.decisao, observacao: motivo }); break
      }
      if (tentativa) {
        try { idempotenciaFinanceira.concluir(tentativa) } catch { /* operação já foi confirmada */ }
      }
      invalidarFinanceiro('caixa', clinicaId)
      if (vigente.current) onConcluido()
    } catch (falha) {
      if (vigente.current) setErro(mensagemErroFinanceiro(falha))
    } finally {
      trava.current = false
      setOcupado(false)
    }
  }

  function fechar() {
    if (ocupado) return
    if (tentativaRef.current && !enviado) idempotenciaFinanceira.cancelar(tentativaRef.current)
    onFechar()
  }

  let contado: bigint | null = null
  try { if (valor.trim()) contado = textoMonetarioParaCentavos(valor) } catch { /* erro de campo exibido ao confirmar */ }
  const esperado = caixa ? decimalBancoParaCentavos(caixa.resumo.valor_esperado) : 0n
  return <ModalBase titulo={titulo} subtitulo={clinicaNome} onFechar={fechar} ocupado={ocupado} largura="lg">
    <form onSubmit={enviar} className="cr-formulario">
      <p>Clínica: <strong>{clinicaNome}</strong></p>
      {acao.tipo === 'abrir' && <p className="cr-nota">Conte o dinheiro disponível antes de informar o fundo inicial. O fundo pode ser zero.</p>}
      {acao.tipo === 'iniciar_fechamento' && <FeedbackAlert variant="warning" title="Antes de iniciar" description="Ao confirmar, o caixa passará para Em fechamento e deixará de receber pagamentos e novas movimentações. Fechar esta janela depois não desfaz essa etapa. Você poderá continuar a contagem ao reabrir." />}
      {acao.tipo === 'solicitar_sangria' && <p className="cr-nota">Solicitar não retira dinheiro do caixa. A retirada depende de aprovação e efetivação separadas.</p>}
      {acao.tipo === 'suprimento' && <p className="cr-nota">Entrada de dinheiro para o caixa, separada da receita por consultas.</p>}
      {(acao.tipo === 'iniciar_fechamento' || acao.tipo === 'enviar_fechamento') && caixa && <>
        <dl className="cr-valores"><div><dt>Dinheiro físico esperado</dt><dd>{moeda(caixa.resumo.valor_esperado)}</dd></div>
          {contado !== null && <><div><dt>Dinheiro contado</dt><dd>{formatarCentavos(contado)}</dd></div><div><dt>Diferença</dt><dd>{formatarCentavos(contado - esperado)}</dd></div></>}
          <div><dt>Pix registrado</dt><dd>{moeda(caixa.resumo.total_pix)}</dd></div><div><dt>Crédito registrado</dt><dd>{moeda(caixa.resumo.total_cartao_credito)}</dd></div></dl>
        <p className="cr-nota">Pix e crédito são registros eletrônicos do sistema. A conferência externa não foi informada.</p>
      </>}
      {acao.tipo === 'enviar_fechamento' && caixa && <p className="text-sm text-[var(--texto-secundario)]">
        A contagem será conferida novamente ao enviar. O envio aguarda aprovação da proprietária.
      </p>}
      {formularioMonetario(acao) && <label className="block text-sm font-medium text-[var(--texto-principal)]">
        {acao.tipo === 'enviar_fechamento' ? 'Dinheiro contado' : acao.tipo === 'abrir' ? 'Fundo inicial contado' : 'Valor'}
        <input className={`${campo} mt-1.5`} inputMode="decimal" placeholder="0,00" value={valor}
          aria-invalid={!!erro} aria-describedby={erro ? 'caixa-erro' : undefined}
          onChange={(e) => setValor(e.target.value)} disabled={ocupado || enviado} required />
      </label>}
      {(precisaMotivo || exigeJustificativa || observacao) && <label className="block text-sm font-medium text-[var(--texto-principal)]">
        {exigeJustificativa ? 'Justificativa da diferença' : observacao ? 'Observação' : 'Motivo'}
        <textarea className={`${campo} mt-1.5 py-3`} rows={3} value={motivo}
          aria-invalid={!!erro} aria-describedby={erro ? 'caixa-erro' : undefined}
          onChange={(e) => setMotivo(e.target.value)} disabled={ocupado || enviado}
          required={Boolean(precisaMotivo || exigeJustificativa || (acao.tipo === 'revisar_fechamento' && acao.decisao === 'devolver'))} />
      </label>}
      {erro && <div id="caixa-erro"><FeedbackAlert variant="destructive" title="Operação não concluída" description={erro} urgent /></div>}
      {enviado && erro && <p className="cr-nota">Os dados e a tentativa foram preservados. Tentar novamente mantém a mesma solicitação. Se fechar, consulte o estado do caixa antes de tentar novamente.</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={botao} onClick={fechar} disabled={ocupado}>Cancelar</button>
        <button type="submit" className={primario} disabled={ocupado}>{ocupado ? 'Processando…' : enviado ? 'Tentar novamente' : recepcao && acao.tipo === 'iniciar_fechamento' ? 'Iniciar fechamento' : acao.tipo === 'abrir' && contado !== null ? `Abrir caixa com ${formatarCentavos(contado)}` : acao.tipo === 'enviar_fechamento' ? 'Enviar para aprovação' : 'Confirmar'}</button>
      </div>
    </form>
  </ModalBase>
}

interface PropsCaixa {
  clinicaAtivaId: string | null
  clinicaNome?: string
  carregandoClinica: boolean
  usuarioId: string
  papel: Papel | null
  carregandoPapel: boolean
  onReceberPagamento?: () => void
}
export default function FinanceiroCaixa(props: PropsCaixa) {
  return <FinanceiroCaixaTela key={`${props.usuarioId}:${props.clinicaAtivaId}:${props.papel}:${props.carregandoPapel}:${props.carregandoClinica}`} {...props} />
}
function FinanceiroCaixaTela({ clinicaAtivaId, clinicaNome = 'Clínica selecionada', carregandoClinica, usuarioId, papel, carregandoPapel, onReceberPagamento }: PropsCaixa) {
  const [acao, setAcao] = useState<Acao | null>(null)
  const [historico, setHistorico] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  useEffect(() => setSucesso(null), [clinicaAtivaId])
  const autorizado = !carregandoPapel && !carregandoClinica && (papel === 'proprietaria' || papel === 'recepcao')
  const carregar = useCallback(async (): Promise<EstadoTela> => {
    const atual = await consultarCaixaAtual(clinicaAtivaId!)
    const detalhes = atual.tipo === 'operacional' ? await consultarDetalhesCaixa(atual.caixa.sessao_caixa_id) : null
    return { atual, detalhes }
  }, [clinicaAtivaId])
  const consulta = useFinanceiroConsulta(
    autorizado && clinicaAtivaId ? clinicaAtivaId : null,
    carregar,
    nuncaVazio,
    clinicaAtivaId ? { clinicaId: clinicaAtivaId, leitura: 'caixa' } : undefined,
  )
  const estado = consulta.resultado.estado === 'sucesso' ? consulta.resultado.dados : null
  const atual = estado?.atual
  const caixa = atual?.tipo === 'operacional' ? atual.caixa : null
  const detalhes = estado?.detalhes
  const podeMovimentar = caixa?.status === 'aberto'
  const recepcao = papel === 'recepcao'
  const sangriaPendente = detalhes?.temSangriaPendente

  return <div className={recepcao ? 'cr-caixa' : 'space-y-6'}>
    <header className="finance-page-intro">
      <div><h1 className="texto-titulo-tela text-[var(--texto-principal)]">{recepcao ? 'Caixa da recepção' : 'Caixa'}</h1>
        <p>{recepcao ? 'Operação da sessão e conferência do dinheiro.' : 'Dinheiro disponível, movimentações e fechamento da clínica.'}</p></div>
      {autorizado && <button type="button" className={botao} onClick={() => void consulta.recarregar()} disabled={consulta.resultado.estado === 'carregando'}>Atualizar</button>}
    </header>
    {sucesso && <FeedbackAlert variant="success" title="Operação confirmada" description={sucesso} onClose={() => setSucesso(null)} autoDismissMs={6000} />}
    {(carregandoClinica || carregandoPapel || consulta.resultado.estado === 'carregando') && <div role="status" aria-label="Carregando caixa" className={`${card} finance-skeleton`} />}
    {!carregandoClinica && !clinicaAtivaId && <p className={card}>Selecione uma clínica para consultar o caixa.</p>}
    {!carregandoPapel && clinicaAtivaId && !autorizado && <p className={card}>O caixa operacional é restrito aos perfis {rotuloPapel('proprietaria')} e {rotuloPapel('recepcao')}.</p>}
    {consulta.resultado.estado === 'erro' && <FeedbackAlert variant="destructive" title={['nao_autorizado', 'clinica_nao_autorizada'].includes(mapearErroFinanceiro(consulta.resultado.erro).codigo) ? 'Acesso ao caixa restrito' : 'Não foi possível carregar o caixa'} description={consulta.resultado.erro.message} action={<button type="button" onClick={() => void consulta.recarregar()}>Tentar novamente</button>} urgent />}
    {atual?.tipo === 'legado' && <section className={card} role="status">
      <h2 className="texto-titulo-secao">Caixa antigo em aberto</h2>
      <p className="mt-2 text-sm text-[var(--texto-secundario)]">Valor inicial {moeda(atual.valorAbertura)}. Este caixa histórico precisa de uma transição acompanhada antes de usar as novas operações financeiras.</p>
    </section>}
    {atual?.tipo === 'sem_caixa' && <section className={card}>
      <h2 className="texto-titulo-secao">Caixa fechado</h2>
      <p className="mt-2 text-sm text-[var(--texto-secundario)]">Abra o caixa para registrar recebimentos nesta clínica.</p>
      <button type="button" className={`${primario} mt-4`} onClick={() => { setSucesso(null); setAcao({ tipo: 'abrir' }) }}>Abrir caixa</button>
    </section>}
    {autorizado && estado && (!recepcao || !caixa) && <button className={`${botao} justify-self-start`} onClick={() => setHistorico(true)}>Histórico de caixas</button>}
    {caixa && <>
      {recepcao && <>
        <section className="cr-barra"><div className="cr-identificacao"><div><span className="finance-status" data-tone={caixa.status === 'aberto' ? 'success' : 'info'}>{caixa.status === 'aberto' ? 'Aberto' : caixa.status === 'em_fechamento' ? 'Em fechamento' : caixa.status === 'aguardando_aprovacao' ? 'Aguardando aprovação' : 'Devolvido para correção'}</span><strong>{caixa.clinica_nome}</strong></div>
          <p className="cr-nota">Abertura {formatarDataFinanceira(caixa.aberto_em)} · {caixa.aberto_por_nome ?? 'Operador indisponível'}</p></div>
          <div className="cr-acoes">
            <button className={botao} onClick={() => setHistorico(true)}>Histórico de caixas</button>
            {podeMovimentar && <><button className={botao} onClick={() => setAcao({ tipo: 'suprimento' })}>Suprimento</button><button className={botao} onClick={() => setAcao({ tipo: 'solicitar_sangria' })}>Sangria</button>
              <button className={botao} onClick={() => setAcao({ tipo: 'iniciar_fechamento' })} disabled={sangriaPendente}>Conferir fechamento</button>
              {onReceberPagamento && <button className={primario} onClick={onReceberPagamento}>Receber pagamento</button>}</>}
            {(caixa.status === 'em_fechamento' || caixa.status === 'devolvido_para_correcao') && <button className={botao} onClick={() => setAcao({ tipo: 'enviar_fechamento' })}>Continuar conferência</button>}
          </div></section>
        {podeMovimentar && <p className="cr-nota">Receber pagamento permite escolher o agendamento na Agenda desta clínica, com seu preço autorizado.</p>}
        {sangriaPendente && <FeedbackAlert variant="warning" title="Sangria pendente" description="Resolva a aprovação ou rejeição e a efetivação da retirada antes de iniciar o fechamento." />}
        {caixa.status === 'aguardando_aprovacao' && <p role="status">Contagem enviada; aguardando revisão da proprietária.</p>}
        {caixa.status === 'devolvido_para_correcao' && <FeedbackAlert variant="warning" title="Contagem devolvida para correção" description={detalhes?.observacaoUltimaRevisao ?? 'Reconte o dinheiro e envie uma nova tentativa.'} />}
        <IndicadoresCaixa resumo={caixa.resumo} />
        <div className="cr-grade"><div className="cr-principal"><ExtratoCaixa clinicaId={clinicaAtivaId!} sessaoId={caixa.sessao_caixa_id} /></div><ComposicaoCaixa resumo={caixa.resumo} /></div>
      </>}
      {!recepcao && <>
      <section className={`${card} finance-cash-summary`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="texto-titulo-secao">{caixa.clinica_nome}</h2><p className="text-sm text-[var(--texto-secundario)]">Aberto em {new Date(caixa.aberto_em).toLocaleString('pt-BR')} por {caixa.aberto_por_nome ?? 'usuário autorizado'}</p></div>
          <span className="finance-status" data-tone={caixa.status === 'aberto' ? 'success' : caixa.status === 'devolvido_para_correcao' ? 'warning' : 'info'}>{caixa.status === 'aberto' ? 'Aberto' : caixa.status === 'em_fechamento' ? 'Em fechamento' : caixa.status === 'aguardando_aprovacao' ? 'Aguardando revisão' : caixa.status === 'devolvido_para_correcao' ? 'Correção solicitada' : caixa.status.replaceAll('_', ' ')}</span>
        </div>
        <div className="finance-kpi-grid mt-5">
          {([
            ['Dinheiro esperado', caixa.resumo.valor_esperado], ['Recebimentos em dinheiro', caixa.resumo.total_dinheiro],
            ['Valor inicial', caixa.resumo.valor_abertura], ['Suprimentos', caixa.resumo.total_suprimentos],
            ['Sangrias efetivadas', caixa.resumo.total_sangrias], ['Recebimentos brutos', caixa.resumo.total_recebimentos_brutos],
            ['PIX', caixa.resumo.total_pix], ['Cartão de crédito', caixa.resumo.total_cartao_credito],
            ['Estornos em dinheiro', caixa.resumo.total_estornos_dinheiro], ['Parcela da clínica', caixa.resumo.total_clinica],
            ['Parcela dos profissionais', caixa.resumo.total_profissionais],
          ] as const).map(([rotulo, valor]) => <div key={rotulo}>
            <p>{rotulo}</p><p>{moeda(valor)}</p>
          </div>)}
        </div>
        <p className="mt-4 text-xs text-[var(--texto-secundario)]">PIX e cartão não entram no dinheiro físico esperado. O fechamento preserva os valores confirmados naquele momento.</p>
      </section>
      <section className={card}>
        <h2 className="texto-titulo-secao">Próximo passo</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {podeMovimentar && <>
            <button type="button" className={botao} onClick={() => setAcao({ tipo: 'suprimento' })}>Adicionar suprimento</button>
            <button type="button" className={botao} onClick={() => setAcao({ tipo: 'solicitar_sangria' })}>Solicitar sangria</button>
            <button type="button" className={primario} disabled={sangriaPendente}
              onClick={() => setAcao({ tipo: 'iniciar_fechamento' })}>Iniciar fechamento</button>
          </>}
          {(caixa.status === 'em_fechamento' || caixa.status === 'devolvido_para_correcao') &&
            <button type="button" className={primario} onClick={() => setAcao({ tipo: 'enviar_fechamento' })}>Conferir e enviar fechamento</button>}
        </div>
        {caixa.status === 'aguardando_aprovacao' && <p className="mt-3 text-sm text-[var(--texto-secundario)]">Fechamento enviado, aguardando revisão do perfil {rotuloPapel('proprietaria')}.</p>}
      </section>
      </>}
      <section className={card}>
        <h2 className="texto-titulo-secao">Sangrias</h2>
        {detalhes?.sangrias.length === 50 && <p className="cr-nota">Últimas 50 solicitações desta sessão. A verificação de pendências considera toda a sessão.</p>}
        {!detalhes?.sangrias.length ? <div className="finance-empty"><strong>Nenhuma sangria registrada</strong><p>Solicitações e revisões aparecerão aqui.</p></div> :
          <ul className="mt-3 divide-y divide-[var(--borda)]">{detalhes.sangrias.map((sangria) => <li key={sangria.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="font-medium">{moeda(sangria.valor)} · {sangria.status}</p><p className="text-sm text-[var(--texto-secundario)]">{sangria.motivo}</p>
              {sangria.observacao_revisao && <p className="text-xs text-[var(--texto-secundario)]">Revisão: {sangria.observacao_revisao}</p>}</div>
            {papel === 'proprietaria' && sangria.status === 'solicitada' && <div className="flex gap-2">
              <button type="button" className={botao} onClick={() => setAcao({ tipo: 'revisar_sangria', id: sangria.id, decisao: 'rejeitar' })}>Rejeitar</button>
              <button type="button" className={primario} onClick={() => setAcao({ tipo: 'revisar_sangria', id: sangria.id, decisao: 'aprovar' })}>Aprovar</button></div>}
            {sangria.status === 'aprovada' && caixa.status === 'aberto' && <button type="button" className={botao} onClick={() => setAcao({ tipo: 'efetivar_sangria', id: sangria.id })}>Efetivar</button>}
          </li>)}</ul>}
      </section>
      {detalhes?.ultimoFechamento && <section className={card}>
        <h2 className="texto-titulo-secao">Última tentativa de fechamento</h2>
        <p className="mt-2 text-sm text-[var(--texto-secundario)]">Tentativa {detalhes.ultimoFechamento.tentativa} · {detalhes.ultimoFechamento.status}</p>
        <div className="numero-tabular mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <p>Esperado <strong>{moeda(detalhes.ultimoFechamento.valor_esperado)}</strong></p>
          <p>Contado <strong>{moeda(detalhes.ultimoFechamento.valor_contado)}</strong></p>
          <p>Diferença <strong>{moeda(detalhes.ultimoFechamento.diferenca)}</strong></p>
        </div>
        {detalhes.ultimoFechamento.justificativa_diferenca && <p className="mt-2 text-sm">Justificativa: {detalhes.ultimoFechamento.justificativa_diferenca}</p>}
        {detalhes.observacaoUltimaRevisao && <p className="mt-2 text-sm">Orientação da revisão: {detalhes.observacaoUltimaRevisao}</p>}
        {papel === 'proprietaria' && detalhes.ultimoFechamento.status === 'aguardando_aprovacao' && <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={botao} onClick={() => setAcao({ tipo: 'revisar_fechamento', id: detalhes.ultimoFechamento!.id, decisao: 'devolver' })}>Devolver para correção</button>
          <button type="button" className={primario} onClick={() => setAcao({ tipo: 'revisar_fechamento', id: detalhes.ultimoFechamento!.id, decisao: 'aprovar' })}>Aprovar fechamento</button>
        </div>}
      </section>}
      {recepcao && <TentativasFechamento clinicaId={clinicaAtivaId!} sessaoId={caixa.sessao_caixa_id} />}
    </>}
    {historico && clinicaAtivaId && <HistoricoCaixa clinicaId={clinicaAtivaId} onFechar={() => setHistorico(false)} />}
    {acao && clinicaAtivaId && <OperacaoCaixa key={`${acao.tipo}:${'id' in acao ? acao.id : ''}`} acao={acao} caixa={caixa} clinicaId={clinicaAtivaId} clinicaNome={caixa?.clinica_nome ?? clinicaNome} usuarioId={usuarioId} recepcao={recepcao}
      onFechar={() => setAcao(null)} onConcluido={() => { setSucesso(`${rotuloAcao(acao)} concluído com confirmação do banco.`); setAcao(null); void consulta.recarregar() }} />}
  </div>
}
