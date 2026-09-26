import { useEffect, useRef, useState } from 'react'
import { ModalBase } from '../ModalBase'
import { consultarPrecoConsulta } from '../../lib/financeiro/financeiro.agenda'
import { registrarRecebimento, validarPreviaPagamentos } from '../../lib/financeiro/financeiro.recebimentos'
import { idempotenciaFinanceira } from '../../lib/financeiro/financeiro.idempotency'
import { invalidarFinanceiro } from '../../lib/financeiro/financeiro.cache'
import { mensagemErroFinanceiro } from '../../lib/financeiro/financeiro.errors'
import { decimalBancoParaCentavos, formatarCentavos, textoMonetarioParaCentavos } from '../../lib/financeiro/financeiro.money'
import { FORMAS_PAGAMENTO, type FormaPagamento, type PagamentoCentavos, type ResultadoRecebimento, type StatusFiscal, type StatusRecebimento } from '../../lib/financeiro/financeiro.types'

export interface ConsultaParaReceber {
  agendamentoId: string
  clinicaId: string
  profissionalId: string
  paciente: string
  profissional: string
  clinica: string
  data: string
  horario: string
}
const FORMAS: Record<FormaPagamento, string> = { dinheiro: 'Dinheiro', pix: 'PIX', cartao_credito: 'Cartão de crédito' }
const FISCAL: Record<StatusFiscal, string> = {
  pendente: 'Pendente', emissao_solicitada: 'Emissão solicitada', emitida: 'Emitida', erro_emissao: 'Erro na emissão',
  cancelamento_solicitado: 'Cancelamento solicitado', cancelada: 'Cancelada', erro_cancelamento: 'Erro no cancelamento',
}
const STATUS: Record<StatusRecebimento, string> = { confirmado: 'Confirmado', parcialmente_estornado: 'Parcialmente estornado', estornado: 'Estornado' }
const botao = 'min-h-11 rounded-lg border border-[var(--borda)] px-4 py-2.5 font-semibold focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50'
const principal = `${botao} bg-[var(--texto-principal)] text-[var(--fundo-card)]`
const moedaBanco = (valor: string | number) => formatarCentavos(decimalBancoParaCentavos(valor))

export function ReceberPagamento({ consulta, usuarioId, onFechar, onRecebido }: {
  consulta: ConsultaParaReceber
  usuarioId: string
  onFechar: () => void
  onRecebido: (resultado: ResultadoRecebimento) => void
}) {
  const [preco, setPreco] = useState<bigint | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [revisao, setRevisao] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [resultado, setResultado] = useState<ResultadoRecebimento | null>(null)
  const [valores, setValores] = useState<Record<FormaPagamento, string>>({ dinheiro: '', pix: '', cartao_credito: '' })
  const trava = useRef(false)
  const erroRef = useRef<HTMLParagraphElement>(null)
  const [reconsulta, setReconsulta] = useState(0)

  useEffect(() => {
    let vigente = true
    setCarregando(true)
    setErro(null)
    consultarPrecoConsulta(consulta.clinicaId, consulta.profissionalId)
      .then((valor) => { if (vigente) setPreco(valor) })
      .catch((falha) => { if (vigente) setErro(mensagemErroFinanceiro(falha)) })
      .finally(() => { if (vigente) setCarregando(false) })
    return () => { vigente = false }
  }, [consulta.clinicaId, consulta.profissionalId, reconsulta])
  useEffect(() => { if (erro) erroRef.current?.focus() }, [erro])

  const pagamentos: PagamentoCentavos[] = []
  const errosCampos: Partial<Record<FormaPagamento, string>> = {}
  for (const forma of FORMAS_PAGAMENTO) {
    if (!valores[forma].trim()) continue
    try {
      const valorCentavos = textoMonetarioParaCentavos(valores[forma])
      if (valorCentavos <= 0n) throw new Error()
      pagamentos.push({ formaPagamento: forma, valorCentavos })
    } catch { errosCampos[forma] = 'Informe um valor maior que zero, com até duas casas decimais (ex.: 200,00).' }
  }
  const previa = validarPreviaPagamentos(pagamentos, preco ?? 0n)
  const podeConfirmar = preco !== null && previa.confere && pagamentos.length > 0 && !Object.keys(errosCampos).length
  const diferenca = (preco ?? 0n) - previa.totalCentavos

  async function confirmar() {
    if (trava.current || resultado || !podeConfirmar) return
    trava.current = true
    setEnviando(true)
    setTentou(true)
    setErro(null)
    let recebido: ResultadoRecebimento | undefined
    try {
      const tentativa = idempotenciaFinanceira.iniciar(`recebimento:${usuarioId}:${consulta.clinicaId}:${consulta.agendamentoId}`)
      recebido = await registrarRecebimento({ agendamentoId: consulta.agendamentoId, pagamentos, tentativa })
      setResultado(recebido)
      // Falha de storage após confirmação nunca deve sugerir repetir o pagamento.
      try { idempotenciaFinanceira.concluir(tentativa) } catch { /* A resposta confirmada prevalece. */ }
    } catch (falha) {
      setErro(mensagemErroFinanceiro(falha))
    } finally {
      trava.current = false
      setEnviando(false)
    }
    if (recebido) {
      invalidarFinanceiro('recebimento', recebido.clinica_id)
      onRecebido(recebido)
    }
  }

  return <ModalBase titulo={resultado ? 'Pagamento confirmado' : revisao ? 'Confirmar recebimento' : 'Receber pagamento'}
    ocupado={enviando} largura="lg" onFechar={() => { if (!trava.current) onFechar() }}>
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-[var(--texto-secundario)]">Paciente</dt><dd className="break-words font-semibold">{consulta.paciente}</dd></div>
        <div><dt className="text-[var(--texto-secundario)]">Profissional</dt><dd className="break-words font-semibold">{consulta.profissional}</dd></div>
        <div><dt className="text-[var(--texto-secundario)]">Clínica</dt><dd>{consulta.clinica}</dd></div>
        <div><dt className="text-[var(--texto-secundario)]">Data e horário</dt><dd>{consulta.data.split('-').reverse().join('/')} · {consulta.horario.slice(0, 5)}</dd></div>
      </dl>
      {erro && <p ref={erroRef} tabIndex={-1} role="alert" className="rounded-lg border border-[var(--cor-erro-borda)] bg-[var(--cor-erro-suave)] p-3 text-sm text-[var(--texto-principal)]">{erro}</p>}
      {carregando && <p role="status">Consultando valor da consulta…</p>}
      {!carregando && preco === null && <button type="button" className={botao} onClick={() => setReconsulta((valor) => valor + 1)}>Consultar novamente</button>}
      {resultado ? <>
        <dl className="space-y-3 border-y border-[var(--borda)] py-4 numero-tabular">
          <div className="flex justify-between gap-3 font-semibold"><dt>Valor recebido</dt><dd>{moedaBanco(resultado.valor_bruto)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Parcela clínica</dt><dd>{moedaBanco(resultado.valor_clinica)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Parcela profissional</dt><dd>{moedaBanco(resultado.valor_profissional)}</dd></div>
          {resultado.pagamentos.map((p, i) => <div key={`${p.forma_pagamento}-${i}`} className="flex justify-between gap-3"><dt>{FORMAS[p.forma_pagamento]}</dt><dd>{moedaBanco(p.valor)}</dd></div>)}
          <div><dt className="inline">Status: </dt><dd className="inline">{STATUS[resultado.status]}</dd></div>
          <div><dt className="inline">Fiscal: </dt><dd className="inline">{FISCAL[resultado.status_fiscal]}</dd></div>
        </dl>
        <button type="button" className={`${principal} w-full`} onClick={onFechar}>Voltar à Agenda</button>
      </> : preco !== null && !carregando && <>
        <div className="flex justify-between gap-3 border-y border-[var(--borda)] py-4 font-semibold numero-tabular"><span>Valor da consulta</span><span>{formatarCentavos(preco)}</span></div>
        {!revisao ? <form onSubmit={(evento) => { evento.preventDefault(); if (podeConfirmar) { setErro(null); setRevisao(true) } }}>
          <fieldset className="space-y-3">
            <legend className="mb-2 font-semibold">Formas de pagamento</legend>
            <p id="pagamento-ajuda" className="text-sm text-[var(--texto-secundario)]">Preencha uma ou mais formas. Deixe as demais em branco.</p>
            {FORMAS_PAGAMENTO.map((forma) => <div key={forma}>
              <label htmlFor={`valor-${forma}`} className="mb-1 block text-sm font-medium">{FORMAS[forma]}</label>
              <input id={`valor-${forma}`} inputMode="decimal" autoComplete="off" placeholder="0,00" value={valores[forma]}
                aria-invalid={!!errosCampos[forma]} aria-describedby={errosCampos[forma] ? `erro-${forma}` : 'pagamento-ajuda'}
                onChange={(evento) => setValores((anteriores) => ({ ...anteriores, [forma]: evento.target.value }))}
                className="min-h-12 w-full rounded-lg border border-[var(--borda)] bg-[var(--fundo-pagina)] px-3 text-base placeholder:text-[var(--texto-secundario)] focus-visible:outline-2 numero-tabular" />
              {errosCampos[forma] && <p id={`erro-${forma}`} className="mt-1 text-sm">{errosCampos[forma]}</p>}
            </div>)}
          </fieldset>
          <div aria-live="polite" className="my-5 space-y-2 numero-tabular">
            <div className="flex justify-between"><span>Total informado</span><strong>{formatarCentavos(previa.totalCentavos)}</strong></div>
            <div className="flex justify-between"><span>Restante</span><span>{formatarCentavos(diferenca > 0n ? diferenca : 0n)}</span></div>
            <div className="flex justify-between"><span>Excedente</span><span>{formatarCentavos(diferenca < 0n ? -diferenca : 0n)}</span></div>
          </div>
          <button type="submit" disabled={!podeConfirmar} className={`${principal} w-full`}>Revisar recebimento</button>
        </form> : <>
          <dl className="space-y-3 numero-tabular">
            {pagamentos.map((p) => <div key={p.formaPagamento} className="flex justify-between"><dt>{FORMAS[p.formaPagamento]}</dt><dd>{formatarCentavos(p.valorCentavos)}</dd></div>)}
            <div className="flex justify-between border-t border-[var(--borda)] pt-3 font-semibold"><dt>Total</dt><dd>{formatarCentavos(previa.totalCentavos)}</dd></div>
          </dl>
          {tentou && erro && <p className="text-sm text-[var(--texto-secundario)]">Tente novamente com os mesmos valores. A tentativa é preservada para evitar cobrança duplicada.</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {!tentou && <button type="button" className={botao} onClick={() => setRevisao(false)}>Editar formas</button>}
            <button type="button" disabled={enviando} onClick={() => void confirmar()} className={`${principal} flex-1`}>
              {enviando ? 'Processando pagamento…' : erro ? 'Tentar novamente' : 'Confirmar pagamento'}
            </button>
          </div>
          {enviando && <p role="status" className="text-sm">Aguarde a confirmação. Mantenha esta janela aberta.</p>}
        </>}
      </>}
    </div>
  </ModalBase>
}
