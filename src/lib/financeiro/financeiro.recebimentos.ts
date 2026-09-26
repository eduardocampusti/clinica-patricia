import { centavosParaNumeroRpc, pagamentosFechamValor, somarPagamentosCentavos } from './financeiro.money'
import { executarRpcFinanceira, type ExecutorRpcFinanceiro } from './financeiro.rpc'
import type { PagamentoCentavos, ResultadoRecebimento, UUID } from './financeiro.types'
import type { TentativaIdempotente } from './financeiro.idempotency'

export interface RegistrarRecebimentoInput {
  agendamentoId: UUID
  pagamentos: PagamentoCentavos[]
  tentativa: TentativaIdempotente
}

function pagamentosRpc(pagamentos: readonly PagamentoCentavos[]): Array<Record<string, unknown>> {
  if (pagamentos.length === 0) throw new Error('Informe ao menos uma forma de pagamento.')
  const formas = new Set<string>()
  return pagamentos.map((pagamento) => {
    if (pagamento.valorCentavos <= 0n) throw new Error('Cada pagamento deve ser maior que zero.')
    if (formas.has(pagamento.formaPagamento)) throw new Error('Cada forma de pagamento deve aparecer uma única vez.')
    formas.add(pagamento.formaPagamento)
    return {
      forma_pagamento: pagamento.formaPagamento,
      valor: centavosParaNumeroRpc(pagamento.valorCentavos),
    }
  })
}

export function validarPreviaPagamentos(
  pagamentos: readonly PagamentoCentavos[],
  valorEsperadoCentavos: bigint,
): { totalCentavos: bigint; confere: boolean } {
  return {
    totalCentavos: somarPagamentosCentavos(pagamentos),
    confere: pagamentosFechamValor(pagamentos, valorEsperadoCentavos),
  }
}

export async function registrarRecebimento(
  input: RegistrarRecebimentoInput,
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoRecebimento> {
  if (!input.agendamentoId) throw new Error('Agendamento obrigatório para registrar recebimento.')
  return executarRpcFinanceira<ResultadoRecebimento>(
    'financeiro_registrar_recebimento',
    {
      p_agendamento_id: input.agendamentoId,
      p_pagamentos: pagamentosRpc(input.pagamentos),
      p_idempotency_key: input.tentativa.chave,
    },
    executor,
  )
}
