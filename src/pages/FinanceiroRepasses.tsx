import { useCallback, useRef, useState, type FormEvent } from 'react'
import { ModalBase } from '../components/ModalBase'
import { useFinanceiroConsulta } from '../hooks/useFinanceiroConsulta'
import { invalidarFinanceiro } from '../lib/financeiro/financeiro.cache'
import { formatarDataFinanceira } from '../lib/financeiro/financeiro.date'
import { mensagemErroFinanceiro } from '../lib/financeiro/financeiro.errors'
import { idempotenciaFinanceira, type TentativaIdempotente } from '../lib/financeiro/financeiro.idempotency'
import { decimalBancoParaCentavos, formatarCentavos } from '../lib/financeiro/financeiro.money'
import { detalharRepasse, listarRepasses, type RepasseOperacional } from '../lib/financeiro/financeiro.repasses-leitura'
import { confirmarRepasse } from '../lib/financeiro/financeiro.repasses'
import type { StatusRepasse } from '../lib/financeiro/financeiro.types'

const card = 'finance-surface'
const botao = 'finance-button'
const primario = 'finance-button finance-button-primary'
const campo = 'min-h-11 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-card)] px-3 text-[var(--texto-principal)] focus-visible:outline-2'
const moeda = (valor: string | number) => formatarCentavos(decimalBancoParaCentavos(valor))
const nuncaVazio = () => false

function DialogoRepasse({ repasse, clinicaId, usuarioId, onFechar, onConcluido }: {
  repasse: RepasseOperacional; clinicaId: string; usuarioId: string; onFechar: () => void; onConcluido: () => void
}) {
  const [meio, setMeio] = useState<'pix' | 'transferencia'>('pix')
  const [referencia, setReferencia] = useState('')
  const [observacao, setObservacao] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const tentativa = useRef<TentativaIdempotente | null>(null)
  const trava = useRef(false)
  const carregarDetalhe = useCallback(() => detalharRepasse(repasse.id), [repasse.id])
  const detalhe = useFinanceiroConsulta(`detalhe:${repasse.id}`, carregarDetalhe, nuncaVazio,
    { clinicaId, leitura: 'repasses' })
  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (trava.current || detalhe.resultado.estado !== 'sucesso') return
    if (!referencia.trim()) { setErro('Informe a referência do pagamento externo antes de confirmar.'); return }
    trava.current = true
    setOcupado(true)
    setEnviado(true)
    setErro(null)
    try {
      if (!tentativa.current) tentativa.current = idempotenciaFinanceira.iniciar(`repasse:${usuarioId}:${clinicaId}:${repasse.id}`)
      await confirmarRepasse({ repasseId: repasse.id, meioPagamento: meio, referenciaPagamento: referencia,
        observacao, tentativa: tentativa.current })
      try { idempotenciaFinanceira.concluir(tentativa.current) } catch { /* confirmação bancária já concluída */ }
      invalidarFinanceiro('repasse', clinicaId)
      onConcluido()
    } catch (falha) { setErro(mensagemErroFinanceiro(falha)) }
    finally { trava.current = false; setOcupado(false) }
  }
  function fechar() {
    if (ocupado) return
    if (tentativa.current) idempotenciaFinanceira.cancelar(tentativa.current)
    onFechar()
  }
  return <ModalBase titulo="Confirmar repasse" largura="lg" ocupado={ocupado} onFechar={fechar}>
    <form onSubmit={enviar} className="space-y-4">
      <p className="text-sm">{repasse.profissional} · {moeda(repasse.valor_liquido)} a pagar</p>
      <div className="grid gap-2 rounded-xl bg-[var(--fundo-pagina)] p-4 text-sm sm:grid-cols-2">
        <p>Bruto do profissional: {moeda(repasse.valor_bruto_profissional)}</p>
        <p>Estornos antes do pagamento: {moeda(repasse.valor_estornos_antes_pagamento)}</p>
        <p>Ajustes aplicados: {moeda(repasse.valor_ajustes_aplicados)}</p>
        <p className="font-semibold">Líquido oficial: {moeda(repasse.valor_liquido)}</p>
      </div>
      {detalhe.resultado.estado === 'carregando' && <p role="status" className="text-sm">Carregando composição…</p>}
      {detalhe.resultado.estado === 'erro' && <p role="alert" className="text-sm text-[var(--cor-erro)]">{detalhe.resultado.erro.message}</p>}
      {detalhe.resultado.estado === 'sucesso' && <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--borda)] p-3">
        <h3 className="text-sm font-semibold">Itens quitados por este repasse</h3>
        <ul className="mt-2 divide-y divide-[var(--borda)] text-sm">{detalhe.resultado.dados.itens.map((item) => <li key={item.recebimento_id} className="flex flex-wrap justify-between gap-2 py-2">
          <span>{item.paciente} · {formatarDataFinanceira(item.registrado_em)}</span><span>{moeda(item.valor_liquido)}</span>
        </li>)}</ul>
        <p className="mt-2 text-xs text-[var(--texto-secundario)]">{detalhe.resultado.dados.aplicacoes.length} aplicação(ões) de ajustes neste repasse. Valores oficiais, sem recálculo na tela.</p>
      </div>}
      <p className="rounded-lg bg-[var(--cor-alerta-suave)] p-3 text-sm">Registre aqui somente depois de realizar PIX ou transferência fora do sistema. A confirmação é terminal e não movimenta o caixa.</p>
      <label className="block text-sm font-medium">Meio do pagamento
        <select className={`${campo} mt-1`} value={meio} onChange={(e) => setMeio(e.target.value as 'pix' | 'transferencia')} disabled={ocupado || enviado}>
          <option value="pix">PIX</option><option value="transferencia">Transferência</option>
        </select></label>
      <label className="block text-sm font-medium">Referência do comprovante externo
        <input className={`${campo} mt-1`} value={referencia} onChange={(e) => setReferencia(e.target.value)} disabled={ocupado || enviado} maxLength={200} required /></label>
      <label className="block text-sm font-medium">Observação (opcional)
        <textarea className={`${campo} mt-1 py-2`} value={observacao} onChange={(e) => setObservacao(e.target.value)} disabled={ocupado || enviado} rows={2} /></label>
      {erro && <p role="alert" className="text-sm text-[var(--cor-erro)]">{erro}</p>}
      {enviado && erro && <p className="text-xs text-[var(--texto-secundario)]">A mesma chave e os dados foram preservados para uma repetição segura. Fechar abandona a intenção local.</p>}
      <div className="flex justify-end gap-2"><button type="button" className={botao} disabled={ocupado} onClick={fechar}>Cancelar</button>
        <button type="submit" className={primario} disabled={ocupado || detalhe.resultado.estado !== 'sucesso'}>{ocupado ? 'Confirmando…' : enviado ? 'Tentar novamente' : 'Confirmar pagamento externo'}</button></div>
    </form>
  </ModalBase>
}

export default function FinanceiroRepasses({ clinicaId, usuarioId }: { clinicaId: string; usuarioId: string }) {
  const [pagina, setPagina] = useState(0)
  const [status, setStatus] = useState<'todos' | StatusRepasse>('pendente')
  const [selecionado, setSelecionado] = useState<RepasseOperacional | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const carregar = useCallback(() => listarRepasses(clinicaId, pagina, status), [clinicaId, pagina, status])
  const consulta = useFinanceiroConsulta(`${clinicaId}:${pagina}:${status}`, carregar, nuncaVazio,
    { clinicaId, leitura: 'repasses' })
  const dados = consulta.resultado.estado === 'sucesso' ? consulta.resultado.dados : null
  return <div className="space-y-6">
    <header><h1 className="texto-titulo-tela">Repasses</h1><p className="mt-1 text-sm text-[var(--texto-secundario)]">Acompanhe os valores devidos e confirme pagamentos já realizados fora do sistema.</p></header>
    <div className={`${card} finance-toolbar`}><label>Situação
      <select className={`${campo} mt-1 block`} value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPagina(0) }}>
        <option value="pendente">Pendentes</option><option value="pago">Pagos</option><option value="ajustado">Ajustados a zero</option><option value="todos">Todos</option>
      </select></label><button type="button" className={botao} onClick={() => void consulta.recarregar()}>Atualizar</button></div>
    {sucesso && <p role="status" className="rounded-lg bg-[var(--cor-sucesso-suave)] p-3 text-sm">{sucesso}</p>}
    {consulta.resultado.estado === 'carregando' && <div role="status" aria-label="Carregando repasses" className={`${card} finance-skeleton`} />}
    {consulta.resultado.estado === 'erro' && <div role="alert" className={card}><p>{consulta.resultado.erro.message}</p><button type="button" className={`${botao} mt-3`} onClick={() => void consulta.recarregar()}>Tentar novamente</button></div>}
    {dados && <section className={card}><h2 className="texto-titulo-secao">{status === 'pendente' ? 'Aguardando pagamento' : 'Histórico de repasses'}</h2>
      {!dados.itens.length ? <div className="finance-empty"><strong>{status === 'pendente' ? 'Nenhum repasse pendente' : 'Nenhum repasse nesta seleção'}</strong><p>Quando houver valores nesta situação, eles aparecerão aqui.</p></div> :
        <ul className="finance-operational-list mt-3 divide-y divide-[var(--borda)]">{dados.itens.map((repasse) => <li key={repasse.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{repasse.profissional}</p>
            <span className="finance-status" data-tone={repasse.status === 'pago' ? 'success' : 'warning'}>{repasse.status === 'pendente' ? 'Pendente' : repasse.status === 'pago' ? 'Pago' : 'Ajustado'}</span></div>
            <p className="mt-1 text-xs text-[var(--texto-secundario)]">Gerado {formatarDataFinanceira(repasse.gerado_em)}</p>
            <dl className="finance-payout-breakdown"><div><dt>Bruto</dt><dd>{moeda(repasse.valor_bruto_profissional)}</dd></div><div><dt>Estornos</dt><dd>{moeda(repasse.valor_estornos_antes_pagamento)}</dd></div><div><dt>Ajustes</dt><dd>{moeda(repasse.valor_ajustes_aplicados)}</dd></div></dl>
            {repasse.confirmado_em && <p className="text-xs text-[var(--texto-secundario)]">Confirmado {formatarDataFinanceira(repasse.confirmado_em)} · {repasse.meio_pagamento}</p>}</div>
          <div className="flex flex-wrap items-center gap-3"><div><p className="text-xs text-[var(--texto-secundario)]">Líquido</p><p className="numero-tabular text-xl font-semibold">{moeda(repasse.valor_liquido)}</p></div>
            {repasse.status === 'pendente' && <button type="button" className={primario} onClick={() => setSelecionado(repasse)}>Confirmar pagamento</button>}</div>
        </li>)}</ul>}
      <div className="mt-4 flex items-center justify-between gap-2"><button className={botao} type="button" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
        <span className="text-sm text-[var(--texto-secundario)]">Página {pagina + 1}</span>
        <button className={botao} type="button" disabled={!dados.haMais} onClick={() => setPagina((p) => p + 1)}>Próxima</button></div>
    </section>}
    {selecionado && <DialogoRepasse repasse={selecionado} clinicaId={clinicaId} usuarioId={usuarioId}
      onFechar={() => setSelecionado(null)} onConcluido={() => { setSelecionado(null); setSucesso('Repasse confirmado pelo banco.'); void consulta.recarregar() }} />}
  </div>
}
