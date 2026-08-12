import { ehValorCanonico, type ValorCanonico } from './canonicalizacao.js'

export type OperacaoFinanceira =
  | 'abrir_caixa'
  | 'registrar_cobranca'
  | 'receber_cobranca'
  | 'registrar_despesa'
  | 'pagar_despesa'
  | 'registrar_sangria'
  | 'registrar_suprimento'
  | 'estornar_lancamento'
  | 'fechar_caixa'
  | 'pagar_repasse_integral'

export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'convenio'

export interface PagamentoPayload {
  forma_pagamento: FormaPagamento
  valor: number
}

export interface AbrirCaixaPayload { valor_abertura: number }
export interface MovimentoCaixaPayload { valor: number; motivo: string }
export interface FecharCaixaPayload { valor_contado: number; justificativa_diferenca: string | null }
export interface PagarRepassePayload { repasse_id: string; forma_pagamento: FormaPagamento; pago_em: string | null }

function objeto(valor: unknown): Record<string, unknown> | null {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? valor as Record<string, unknown> : null
}

function texto(valor: unknown, obrigatorio = true): string | null {
  if (typeof valor !== 'string') return obrigatorio ? null : ''
  const tratado = valor.trim()
  return tratado || (obrigatorio ? null : '')
}

function numeroPositivo(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null
}

function numeroNaoNegativo(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? valor : null
}

const FORMAS = new Set<FormaPagamento>(['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'convenio'])

function forma(valor: unknown): FormaPagamento | null {
  return typeof valor === 'string' && FORMAS.has(valor as FormaPagamento) ? valor as FormaPagamento : null
}

function pagamentos(valor: unknown): PagamentoPayload[] | null {
  if (!Array.isArray(valor) || valor.length === 0) return null
  const itens: PagamentoPayload[] = []
  for (const item of valor) {
    const linha = objeto(item)
    const formaPagamento = forma(linha?.forma_pagamento)
    const valorPagamento = numeroPositivo(linha?.valor)
    if (!formaPagamento || valorPagamento === null) return null
    itens.push({ forma_pagamento: formaPagamento, valor: valorPagamento })
  }
  return itens
}

function payloadValido(payload: Record<string, unknown>): ValorCanonico {
  if (!ehValorCanonico(payload)) throw new Error('Payload contém valor não serializável.')
  return payload as ValorCanonico
}

export function normalizarPayload(operacao: OperacaoFinanceira, body: unknown): ValorCanonico {
  const entrada = objeto(body)
  if (!entrada) throw new Error('Corpo da requisição inválido.')

  if (operacao === 'abrir_caixa') {
    const valor = numeroNaoNegativo(entrada.valor_abertura)
    if (valor === null) throw new Error('Informe um valor de abertura não negativo.')
    return { valor_abertura: valor }
  }

  if (operacao === 'registrar_sangria' || operacao === 'registrar_suprimento') {
    const valor = numeroPositivo(entrada.valor)
    const motivo = texto(entrada.motivo)
    if (valor === null || !motivo) throw new Error('Informe valor positivo e motivo.')
    return { valor, motivo }
  }

  if (operacao === 'fechar_caixa') {
    const valorContado = numeroNaoNegativo(entrada.valor_contado)
    if (valorContado === null) throw new Error('Informe o valor contado em dinheiro.')
    return { valor_contado: valorContado, justificativa_diferenca: texto(entrada.justificativa_diferenca, false) || null }
  }

  if (operacao === 'pagar_repasse_integral') {
    const repasseId = texto(entrada.repasse_id)
    const formaPagamento = forma(entrada.forma_pagamento)
    if (!repasseId || !formaPagamento) throw new Error('Repasse e forma de pagamento são obrigatórios.')
    return { repasse_id: repasseId, forma_pagamento: formaPagamento, pago_em: texto(entrada.pago_em, false) || null }
  }

  if (operacao === 'receber_cobranca') {
    const cobrancaId = texto(entrada.cobranca_id)
    const itens = pagamentos(entrada.pagamentos)
    if (!cobrancaId || !itens) throw new Error('Cobrança e pagamentos válidos são obrigatórios.')
    return payloadValido({ cobranca_id: cobrancaId, pagamentos: itens })
  }

  if (operacao === 'registrar_cobranca') {
    const pacienteId = texto(entrada.paciente_id)
    const profissionalId = texto(entrada.profissional_id)
    const valorTotal = numeroPositivo(entrada.valor_total)
    const status = entrada.status
    if (!pacienteId || !profissionalId || valorTotal === null || !['paga', 'pendente', 'cortesia'].includes(String(status))) {
      throw new Error('Paciente, profissional, valor e status da cobrança são obrigatórios.')
    }
    const itens = status === 'paga' ? pagamentos(entrada.pagamentos) : []
    if (status === 'paga' && !itens) throw new Error('Cobrança paga exige ao menos uma forma de pagamento.')
    const motivo = texto(entrada.motivo_cortesia, false) || null
    if (status === 'cortesia' && !motivo) throw new Error('Cortesia exige motivo.')
    return payloadValido({
      paciente_id: pacienteId,
      profissional_id: profissionalId,
      agendamento_id: texto(entrada.agendamento_id, false) || null,
      valor_total: valorTotal,
      status: String(status),
      motivo_cortesia: motivo,
      numero_nota_fiscal: texto(entrada.numero_nota_fiscal, false) || null,
      descricao: texto(entrada.descricao, false) || null,
      pagamentos: itens,
    })
  }

  if (operacao === 'registrar_despesa') {
    const categoria = texto(entrada.categoria)
    const descricao = texto(entrada.descricao)
    const valor = numeroPositivo(entrada.valor)
    const status = entrada.status
    if (!categoria || !descricao || valor === null || !['pendente', 'paga'].includes(String(status))) {
      throw new Error('Categoria, descrição, valor e status da despesa são obrigatórios.')
    }
    const formaPagamento = status === 'paga' ? forma(entrada.forma_pagamento) : null
    if (status === 'paga' && !formaPagamento) throw new Error('Despesa paga exige forma de pagamento.')
    return payloadValido({
      categoria,
      descricao,
      valor,
      status: String(status),
      forma_pagamento: formaPagamento,
      vencimento_em: texto(entrada.vencimento_em, false) || null,
      pago_em: texto(entrada.pago_em, false) || null,
    })
  }

  if (operacao === 'pagar_despesa') {
    const despesaId = texto(entrada.despesa_id)
    const formaPagamento = forma(entrada.forma_pagamento)
    if (!despesaId || !formaPagamento) throw new Error('Despesa e forma de pagamento são obrigatórias.')
    return { despesa_id: despesaId, forma_pagamento: formaPagamento, pago_em: texto(entrada.pago_em, false) || null }
  }

  if (operacao === 'estornar_lancamento') {
    const origemTipo = texto(entrada.origem_tipo)
    const origemId = texto(entrada.origem_id)
    const motivo = texto(entrada.motivo)
    if (!origemTipo || !origemId || !motivo || !['entrada', 'despesa', 'pagamento_repasse'].includes(origemTipo)) {
      throw new Error('Origem e motivo válidos são obrigatórios para estorno.')
    }
    return { origem_tipo: origemTipo, origem_id: origemId, motivo }
  }

  throw new Error('Operação financeira não suportada.')
}
