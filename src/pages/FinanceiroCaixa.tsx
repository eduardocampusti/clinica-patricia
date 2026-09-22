import { useCallback, useRef, useState, type FormEvent } from 'react'
import { ModalBase } from '../components/ModalBase'
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
import { mensagemErroFinanceiro } from '../lib/financeiro/financeiro.errors'
import { idempotenciaFinanceira, type TentativaIdempotente } from '../lib/financeiro/financeiro.idempotency'
import { decimalBancoParaCentavos, formatarCentavos, textoMonetarioParaCentavos } from '../lib/financeiro/financeiro.money'
import type { Papel } from '../hooks/usePapelNaClinica'

type Acao =
  | { tipo: 'abrir' | 'suprimento' | 'solicitar_sangria' | 'enviar_fechamento' | 'iniciar_fechamento' }
  | { tipo: 'revisar_sangria'; id: string; decisao: 'aprovar' | 'rejeitar' }
  | { tipo: 'efetivar_sangria'; id: string }
  | { tipo: 'revisar_fechamento'; id: string; decisao: 'aprovar' | 'devolver' }

interface EstadoTela { atual: EstadoCaixaAtual; detalhes: DetalhesCaixa | null }

const moeda = (valor: string | number) => formatarCentavos(decimalBancoParaCentavos(valor))
const baseBotao = 'min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50'
const botao = `${baseBotao} border-[var(--borda)] text-[var(--texto-principal)]`
const primario = `${baseBotao} border-transparent bg-[var(--texto-principal)] text-white`
const campo = 'min-h-12 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 text-[var(--texto-principal)] focus-visible:outline-2 disabled:opacity-50'
const card = 'rounded-[18px] border border-[var(--borda)] bg-[var(--fundo-card)] p-5 shadow-[var(--sombra-baixa)] sm:p-6'
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

function OperacaoCaixa({ acao, caixa, clinicaId, usuarioId, onFechar, onConcluido }: {
  acao: Acao
  caixa: CaixaOperacional | null
  clinicaId: string
  usuarioId: string
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
  const titulo = rotuloAcao(acao)
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
        if (centavos < 0n || (acao.tipo !== 'abrir' && centavos === 0n)) {
          throw new Error('Informe um valor válido maior que zero; a abertura pode ser zero.')
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
      onConcluido()
    } catch (falha) {
      setErro(mensagemErroFinanceiro(falha))
    } finally {
      trava.current = false
      setOcupado(false)
    }
  }

  function fechar() {
    if (ocupado) return
    if (tentativaRef.current) idempotenciaFinanceira.cancelar(tentativaRef.current)
    onFechar()
  }

  return <ModalBase titulo={titulo} onFechar={fechar} ocupado={ocupado}>
    <form onSubmit={enviar} className="space-y-4">
      {acao.tipo === 'enviar_fechamento' && caixa && <p className="text-sm text-[var(--texto-secundario)]">
        Dinheiro esperado agora: <strong className="text-[var(--texto-principal)]">{moeda(caixa.resumo.valor_esperado)}</strong>. O valor será conferido novamente pelo banco ao enviar.
      </p>}
      {formularioMonetario(acao) && <label className="block text-sm font-medium text-[var(--texto-principal)]">
        {acao.tipo === 'enviar_fechamento' ? 'Dinheiro contado' : acao.tipo === 'abrir' ? 'Valor inicial em dinheiro' : 'Valor'}
        <input className={`${campo} mt-1.5`} inputMode="decimal" placeholder="0,00" value={valor}
          onChange={(e) => setValor(e.target.value)} disabled={ocupado || enviado} required aria-label="Valor em reais" />
      </label>}
      {(precisaMotivo || exigeJustificativa || observacao) && <label className="block text-sm font-medium text-[var(--texto-principal)]">
        {exigeJustificativa ? 'Justificativa da diferença' : observacao ? 'Observação' : 'Motivo'}
        <textarea className={`${campo} mt-1.5 py-3`} rows={3} value={motivo}
          onChange={(e) => setMotivo(e.target.value)} disabled={ocupado || enviado}
          required={Boolean(precisaMotivo || exigeJustificativa || (acao.tipo === 'revisar_fechamento' && acao.decisao === 'devolver'))} />
      </label>}
      {erro && <p role="alert" className="rounded-lg bg-[var(--cor-erro-suave)] p-3 text-sm text-[var(--cor-erro)]">{erro}</p>}
      {enviado && erro && <p className="text-xs text-[var(--texto-secundario)]">Os dados foram preservados. Tentar novamente reutiliza a mesma chave; cancelar abandona esta tentativa.</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={botao} onClick={fechar} disabled={ocupado}>Cancelar</button>
        <button type="submit" className={primario} disabled={ocupado}>{ocupado ? 'Processando…' : enviado ? 'Tentar novamente' : 'Confirmar'}</button>
      </div>
    </form>
  </ModalBase>
}

export default function FinanceiroCaixa({ clinicaAtivaId, carregandoClinica, usuarioId, papel, carregandoPapel }: {
  clinicaAtivaId: string | null
  carregandoClinica: boolean
  usuarioId: string
  papel: Papel | null
  carregandoPapel: boolean
}) {
  const [acao, setAcao] = useState<Acao | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const autorizado = papel === 'proprietaria' || papel === 'recepcao'
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

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="texto-titulo-tela text-[var(--texto-principal)]">Caixa financeiro</h1>
        <p className="mt-1 text-sm text-[var(--texto-secundario)]">Posição oficial da sessão, calculada pelo banco.</p></div>
      {autorizado && <button type="button" className={botao} onClick={() => void consulta.recarregar()} disabled={consulta.resultado.estado === 'carregando'}>Atualizar</button>}
    </header>
    {sucesso && <p role="status" className="rounded-lg border border-[var(--cor-sucesso-borda)] bg-[var(--cor-sucesso-suave)] p-3 text-sm text-[var(--texto-principal)]">{sucesso}</p>}
    {(carregandoClinica || carregandoPapel || consulta.resultado.estado === 'carregando') && <p role="status" className={card}>Carregando caixa…</p>}
    {!carregandoClinica && !clinicaAtivaId && <p className={card}>Selecione uma clínica para consultar o caixa.</p>}
    {!carregandoPapel && clinicaAtivaId && !autorizado && <p className={card}>O caixa operacional é restrito à proprietária e à recepção.</p>}
    {consulta.resultado.estado === 'erro' && <div className={card} role="alert">
      <p>{consulta.resultado.erro.message}</p><button type="button" className={`${botao} mt-3`} onClick={() => void consulta.recarregar()}>Tentar novamente</button>
    </div>}
    {atual?.tipo === 'legado' && <section className={card} role="status">
      <h2 className="texto-titulo-secao">Sessão legada em aberto</h2>
      <p className="mt-2 text-sm text-[var(--texto-secundario)]">Abertura {moeda(atual.valorAbertura)}. Esta sessão histórica não pode receber operações do novo Financeiro. A transição exige procedimento controlado; nenhum dado será convertido aqui.</p>
    </section>}
    {atual?.tipo === 'sem_caixa' && <section className={card}>
      <h2 className="texto-titulo-secao">Nenhum caixa ativo</h2>
      <p className="mt-2 text-sm text-[var(--texto-secundario)]">Abra uma sessão para registrar recebimentos nesta clínica.</p>
      <button type="button" className={`${primario} mt-4`} onClick={() => { setSucesso(null); setAcao({ tipo: 'abrir' }) }}>Abrir caixa</button>
    </section>}
    {caixa && <>
      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="texto-titulo-secao">{caixa.clinica_nome}</h2><p className="text-sm text-[var(--texto-secundario)]">Aberto em {new Date(caixa.aberto_em).toLocaleString('pt-BR')} por {caixa.aberto_por_nome ?? 'usuário autorizado'}</p></div>
          <span className="rounded-full bg-[var(--cor-info-suave)] px-3 py-1.5 text-xs font-semibold text-[var(--cor-info)]">{caixa.status.replaceAll('_', ' ')}</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {([
            ['Dinheiro esperado', caixa.resumo.valor_esperado], ['Abertura', caixa.resumo.valor_abertura],
            ['Recebimentos em dinheiro', caixa.resumo.total_dinheiro], ['PIX', caixa.resumo.total_pix],
            ['Cartão de crédito', caixa.resumo.total_cartao_credito], ['Recebimentos brutos', caixa.resumo.total_recebimentos_brutos],
            ['Suprimentos', caixa.resumo.total_suprimentos], ['Sangrias efetivadas', caixa.resumo.total_sangrias],
            ['Estornos em dinheiro', caixa.resumo.total_estornos_dinheiro], ['Parcela da clínica', caixa.resumo.total_clinica],
            ['Parcela dos profissionais', caixa.resumo.total_profissionais],
          ] as const).map(([rotulo, valor]) => <div key={rotulo} className="rounded-xl bg-[var(--fundo-pagina)] p-4">
            <p className="text-xs text-[var(--texto-secundario)]">{rotulo}</p><p className="numero-tabular mt-1 text-lg font-semibold text-[var(--texto-principal)]">{moeda(valor)}</p>
          </div>)}
        </div>
        <p className="mt-4 text-xs text-[var(--texto-terciario)]">Resumo corrente, não substitui o snapshot histórico do fechamento. PIX e cartão não entram no dinheiro físico esperado.</p>
      </section>
      <section className={card}>
        <h2 className="texto-titulo-secao">Operações da sessão</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {podeMovimentar && <>
            <button type="button" className={botao} onClick={() => setAcao({ tipo: 'suprimento' })}>Adicionar suprimento</button>
            <button type="button" className={botao} onClick={() => setAcao({ tipo: 'solicitar_sangria' })}>Solicitar sangria</button>
            <button type="button" className={primario} disabled={detalhes?.sangrias.some((s) => s.status === 'solicitada' || s.status === 'aprovada')}
              onClick={() => setAcao({ tipo: 'iniciar_fechamento' })}>Iniciar fechamento</button>
          </>}
          {(caixa.status === 'em_fechamento' || caixa.status === 'devolvido_para_correcao') &&
            <button type="button" className={primario} onClick={() => setAcao({ tipo: 'enviar_fechamento' })}>Conferir e enviar fechamento</button>}
        </div>
        {caixa.status === 'aguardando_aprovacao' && <p className="mt-3 text-sm text-[var(--texto-secundario)]">Fechamento enviado, aguardando revisão da proprietária.</p>}
      </section>
      <section className={card}>
        <h2 className="texto-titulo-secao">Sangrias</h2>
        {!detalhes?.sangrias.length ? <p className="mt-3 text-sm text-[var(--texto-secundario)]">Nenhuma sangria nesta sessão.</p> :
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
    </>}
    {acao && clinicaAtivaId && <OperacaoCaixa key={`${acao.tipo}:${'id' in acao ? acao.id : ''}`} acao={acao} caixa={caixa} clinicaId={clinicaAtivaId} usuarioId={usuarioId}
      onFechar={() => setAcao(null)} onConcluido={() => { setSucesso(`${rotuloAcao(acao)} concluído com confirmação do banco.`); setAcao(null); void consulta.recarregar() }} />}
  </div>
}
