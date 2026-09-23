import { useCallback, useRef, useState, type FormEvent } from 'react'
import { ModalBase } from '../components/ModalBase'
import { useFinanceiroConsulta } from '../hooks/useFinanceiroConsulta'
import type { Papel } from '../hooks/usePapelNaClinica'
import { invalidarFinanceiro } from '../lib/financeiro/financeiro.cache'
import { formatarDataFinanceira } from '../lib/financeiro/financeiro.date'
import { mensagemErroFinanceiro } from '../lib/financeiro/financeiro.errors'
import { listarEstornosPendentes, listarRecebimentosParaEstorno, saldoDisponivelPorForma,
  type EstornoPendente, type RecebimentoParaEstorno } from '../lib/financeiro/financeiro.estornos-leitura'
import { revisarEstorno, solicitarEstorno } from '../lib/financeiro/financeiro.estornos'
import { idempotenciaFinanceira, type TentativaIdempotente } from '../lib/financeiro/financeiro.idempotency'
import { decimalBancoParaCentavos, formatarCentavos, textoMonetarioParaCentavos } from '../lib/financeiro/financeiro.money'
import { FORMAS_PAGAMENTO, type FormaPagamento, type PagamentoCentavos } from '../lib/financeiro/financeiro.types'

const botao = 'finance-button'
const primario = 'finance-button finance-button-primary'
const card = 'finance-surface'
const campo = 'min-h-12 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 text-[var(--texto-principal)] focus-visible:outline-2 disabled:opacity-50'
const rotulos: Record<FormaPagamento, string> = { dinheiro: 'Dinheiro', pix: 'PIX', cartao_credito: 'Cartão de crédito' }
const moeda = (valor: string | number) => formatarCentavos(decimalBancoParaCentavos(valor))
const naoVazio = () => false

function DialogoSolicitar({ recebimento, clinicaId, usuarioId, onFechar, onConcluido }: {
  recebimento: RecebimentoParaEstorno
  clinicaId: string
  usuarioId: string
  onFechar: () => void
  onConcluido: () => void
}) {
  const saldo = saldoDisponivelPorForma(recebimento)
  const [valores, setValores] = useState<Record<FormaPagamento, string>>({ dinheiro: '', pix: '', cartao_credito: '' })
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const tentativa = useRef<TentativaIdempotente | null>(null)
  const trava = useRef(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (trava.current) return
    setErro(null)
    const pagamentos: PagamentoCentavos[] = []
    try {
      for (const forma of FORMAS_PAGAMENTO) {
        if (!valores[forma].trim()) continue
        const valorCentavos = textoMonetarioParaCentavos(valores[forma])
        if (valorCentavos <= 0n || valorCentavos > saldo[forma]) throw new Error(`Valor de ${rotulos[forma]} excede o disponível ou é inválido.`)
        pagamentos.push({ formaPagamento: forma, valorCentavos })
      }
      if (!pagamentos.length) throw new Error('Informe ao menos uma forma e um valor para o estorno.')
      if (!motivo.trim()) throw new Error('Informe o motivo do estorno.')
    } catch (falha) { setErro(falha instanceof Error ? falha.message : 'Revise os valores.'); return }
    trava.current = true
    setOcupado(true)
    setEnviado(true)
    try {
      if (!tentativa.current) tentativa.current = idempotenciaFinanceira.iniciar(`estorno:${usuarioId}:${clinicaId}:${recebimento.id}`)
      await solicitarEstorno({ recebimentoId: recebimento.id, pagamentos, motivo, tentativa: tentativa.current })
      try { idempotenciaFinanceira.concluir(tentativa.current) } catch { /* resultado bancário já confirmado */ }
      invalidarFinanceiro('estorno', clinicaId)
      onConcluido()
    } catch (falha) { setErro(mensagemErroFinanceiro(falha)) }
    finally { trava.current = false; setOcupado(false) }
  }

  function fechar() {
    if (ocupado) return
    if (tentativa.current) idempotenciaFinanceira.cancelar(tentativa.current)
    onFechar()
  }

  return <ModalBase titulo="Solicitar estorno" onFechar={fechar} ocupado={ocupado} largura="lg">
    <form onSubmit={enviar} className="space-y-4">
      <p className="text-sm text-[var(--texto-secundario)]">{recebimento.paciente} · {recebimento.profissional} · pagamento de {moeda(recebimento.valor_bruto)}</p>
      <p className="text-xs text-[var(--texto-secundario)]">Informe somente as formas originais. Solicitações pendentes já reduzem o disponível visual; o banco valida novamente antes de registrar.</p>
      <button type="button" className={botao} disabled={ocupado || enviado}
        onClick={() => setValores({
          dinheiro: saldo.dinheiro > 0n ? formatarCentavos(saldo.dinheiro).replace(/^R\$\s?/, '') : '',
          pix: saldo.pix > 0n ? formatarCentavos(saldo.pix).replace(/^R\$\s?/, '') : '',
          cartao_credito: saldo.cartao_credito > 0n ? formatarCentavos(saldo.cartao_credito).replace(/^R\$\s?/, '') : '',
        })}>Preencher total disponível</button>
      <div className="grid gap-3 sm:grid-cols-3">{FORMAS_PAGAMENTO.map((forma) => <label key={forma} className="text-sm font-medium">
        {rotulos[forma]} <span className="block text-xs font-normal text-[var(--texto-secundario)]">Disponível {formatarCentavos(saldo[forma])}</span>
        <input className={`${campo} mt-1`} inputMode="decimal" placeholder="0,00" value={valores[forma]}
          onChange={(e) => setValores((anterior) => ({ ...anterior, [forma]: e.target.value }))}
          disabled={ocupado || enviado || saldo[forma] <= 0n} />
      </label>)}</div>
      <label className="block text-sm font-medium">Motivo
        <textarea className={`${campo} mt-1 py-3`} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
          disabled={ocupado || enviado} required />
      </label>
      {erro && <p role="alert" className="rounded-lg bg-[var(--cor-erro-suave)] p-3 text-sm text-[var(--cor-erro)]">{erro}</p>}
      {enviado && erro && <p className="text-xs text-[var(--texto-secundario)]">Os dados e a chave foram preservados para nova tentativa. Cancelar abandona a intenção local.</p>}
      <div className="flex justify-end gap-2"><button type="button" className={botao} disabled={ocupado} onClick={fechar}>Cancelar</button>
        <button type="submit" className={primario} disabled={ocupado}>{ocupado ? 'Processando…' : enviado ? 'Tentar novamente' : 'Solicitar'}</button></div>
    </form>
  </ModalBase>
}

function DialogoRevisar({ estorno, clinicaId, decisao, onFechar, onConcluido }: {
  estorno: EstornoPendente
  clinicaId: string
  decisao: 'aprovar' | 'rejeitar'
  onFechar: () => void
  onConcluido: () => void
}) {
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const trava = useRef(false)
  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (trava.current) return
    trava.current = true
    setOcupado(true)
    setErro(null)
    try {
      await revisarEstorno({ estornoId: estorno.id, acao: decisao, observacao })
      invalidarFinanceiro('estorno', clinicaId)
      onConcluido()
    } catch (falha) { setErro(mensagemErroFinanceiro(falha)) }
    finally { trava.current = false; setOcupado(false) }
  }
  return <ModalBase titulo={decisao === 'aprovar' ? 'Aprovar e efetivar estorno' : 'Rejeitar estorno'} onFechar={onFechar} ocupado={ocupado} largura="lg">
    <form onSubmit={enviar} className="space-y-4">
      <p className="text-sm">{estorno.paciente} · {estorno.profissional}</p>
      <p className="text-sm text-[var(--texto-secundario)]">Pagamento original {moeda(estorno.valorOriginal)}. Estorno solicitado {moeda(estorno.valor_total)}.</p>
      <ul className="text-sm text-[var(--texto-secundario)]">{estorno.pagamentos.map((pagamento) => <li key={pagamento.forma_pagamento}>{rotulos[pagamento.forma_pagamento]}: {moeda(pagamento.valor)}</li>)}</ul>
      <p className="text-sm">Motivo: {estorno.motivo}</p>
      {decisao === 'aprovar' && <p className="rounded-lg bg-[var(--cor-alerta-suave)] p-3 text-sm">A aprovação efetiva o estorno, ajusta o caixa e preserva o recebimento original. Confira os dados antes de confirmar.</p>}
      <label className="block text-sm font-medium">Observação da revisão
        <textarea className={`${campo} mt-1 py-3`} rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} disabled={ocupado} />
      </label>
      {erro && <p role="alert" className="rounded-lg bg-[var(--cor-erro-suave)] p-3 text-sm text-[var(--cor-erro)]">{erro}</p>}
      <div className="flex justify-end gap-2"><button type="button" className={botao} onClick={onFechar} disabled={ocupado}>Cancelar</button>
        <button type="submit" className={primario} disabled={ocupado}>{ocupado ? 'Processando…' : 'Confirmar decisão'}</button></div>
    </form>
  </ModalBase>
}

export default function FinanceiroEstornos({ clinicaId, usuarioId, papel }: { clinicaId: string; usuarioId: string; papel: Papel }) {
  const [pagina, setPagina] = useState(0)
  const [filtro, setFiltro] = useState('')
  const [selecionado, setSelecionado] = useState<RecebimentoParaEstorno | null>(null)
  const [revisao, setRevisao] = useState<{ estorno: EstornoPendente; decisao: 'aprovar' | 'rejeitar' } | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const carregar = useCallback(async () => {
    const [recebimentos, pendentes] = await Promise.all([
      listarRecebimentosParaEstorno(clinicaId, pagina),
      papel === 'proprietaria' ? listarEstornosPendentes(clinicaId) : Promise.resolve([]),
    ])
    return { recebimentos, pendentes }
  }, [clinicaId, pagina, papel])
  const consulta = useFinanceiroConsulta(`${clinicaId}:${pagina}:${papel}`, carregar, naoVazio, { clinicaId, leitura: 'estornos' })
  const dados = consulta.resultado.estado === 'sucesso' ? consulta.resultado.dados : null
  const termo = filtro.trim().toLocaleLowerCase('pt-BR')
  const recebimentosVisiveis = dados?.recebimentos.itens.filter((item) => !termo || [
    item.paciente, item.profissional, formatarDataFinanceira(item.registrado_em), moeda(item.valor_bruto),
    ...item.pagamentos.map((pagamento) => rotulos[pagamento.forma_pagamento]),
  ].some((campoBusca) => campoBusca.toLocaleLowerCase('pt-BR').includes(termo))) ?? []
  return <div className="space-y-6">
    <header className="finance-page-intro"><div><h1 className="texto-titulo-tela">Estornos</h1>
      <p>Solicite, revise e acompanhe estornos sem perder o histórico do recebimento.</p></div>
      <button type="button" className={botao} onClick={() => void consulta.recarregar()}>Atualizar</button></header>
    {sucesso && <p role="status" className="rounded-lg bg-[var(--cor-sucesso-suave)] p-3 text-sm">{sucesso}</p>}
    {consulta.resultado.estado === 'carregando' && <div role="status" aria-label="Carregando estornos" className={`${card} finance-skeleton`} />}
    {consulta.resultado.estado === 'erro' && <div className={card} role="alert"><p>{consulta.resultado.erro.message}</p>
      <button type="button" className={`${botao} mt-3`} onClick={() => void consulta.recarregar()}>Tentar novamente</button></div>}
    {papel === 'proprietaria' && dados && <section className={card}>
      <h2 className="texto-titulo-secao">Aguardando sua revisão</h2>
      {!dados.pendentes.length ? <div className="finance-empty"><strong>Nenhum estorno aguardando revisão</strong><p>Novas solicitações da recepção aparecerão aqui.</p></div> :
        <ul className="mt-3 divide-y divide-[var(--borda)]">{dados.pendentes.map((estorno) => <li key={estorno.id} className="flex flex-wrap justify-between gap-3 py-4">
          <div><p className="font-medium">{estorno.paciente}</p>
            <p className="numero-tabular mt-1 text-lg font-semibold">{moeda(estorno.valor_total)}</p>
            <p className="text-sm text-[var(--texto-secundario)]">{estorno.profissional} · {estorno.motivo}</p></div>
          <div className="flex gap-2"><button type="button" className={botao} onClick={() => setRevisao({ estorno, decisao: 'rejeitar' })}>Rejeitar</button>
            <button type="button" className={primario} onClick={() => setRevisao({ estorno, decisao: 'aprovar' })}>Revisar</button></div>
        </li>)}</ul>}
    </section>}
    {dados && <section className={card}>
      <h2 className="texto-titulo-secao">Recebimentos disponíveis</h2>
      <p className="mt-1 text-xs text-[var(--texto-secundario)]">Clínica selecionada · até 50 recebimentos por página, do mais recente ao mais antigo.</p>
      <label className="mt-4 block max-w-md text-sm font-medium">Buscar nesta página
        <input className={`${campo} mt-1`} type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </label>
      {!recebimentosVisiveis.length ? <div className="finance-empty"><strong>{termo ? 'Nada encontrado nesta página' : 'Nenhum recebimento disponível'}</strong><p>{termo ? 'Tente outro termo ou consulte a próxima página.' : 'Os recebimentos elegíveis para estorno aparecerão aqui.'}</p></div> :
        <ul className="mt-3 divide-y divide-[var(--borda)]">{recebimentosVisiveis.map((item) => {
          const saldo = saldoDisponivelPorForma(item)
          const disponivel = saldo.dinheiro + saldo.pix + saldo.cartao_credito
          return <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div><p className="font-medium">{item.paciente}</p><p className="numero-tabular mt-1 text-lg font-semibold">{moeda(item.valor_bruto)}</p>
              <p className="text-sm text-[var(--texto-secundario)]">{item.profissional} · {formatarDataFinanceira(item.registrado_em)}</p>
              <p className="text-xs text-[var(--texto-secundario)]">{item.pagamentos.map((pagamento) => `${rotulos[pagamento.forma_pagamento]} ${moeda(pagamento.valor)}`).join(' · ')}</p>
              <p className="text-xs text-[var(--texto-secundario)]">Disponível para solicitar: {formatarCentavos(disponivel)}</p></div>
            {papel === 'recepcao' && disponivel > 0n && <button type="button" className={botao} onClick={() => setSelecionado(item)}>Solicitar estorno</button>}
          </li>
        })}</ul>}
      <div className="mt-4 flex items-center justify-between gap-3"><button type="button" className={botao} disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
        <span className="text-sm text-[var(--texto-secundario)]">Página {pagina + 1}</span>
        <button type="button" className={botao} disabled={!dados.recebimentos.haMais} onClick={() => setPagina((p) => p + 1)}>Próxima</button></div>
    </section>}
    {selecionado && <DialogoSolicitar recebimento={selecionado} clinicaId={clinicaId} usuarioId={usuarioId}
      onFechar={() => setSelecionado(null)} onConcluido={() => { setSelecionado(null); setSucesso('Solicitação de estorno registrada.'); void consulta.recarregar() }} />}
    {revisao && <DialogoRevisar estorno={revisao.estorno} decisao={revisao.decisao} clinicaId={clinicaId}
      onFechar={() => setRevisao(null)} onConcluido={() => { setRevisao(null); setSucesso('Decisão do estorno confirmada pelo banco.'); void consulta.recarregar() }} />}
  </div>
}
