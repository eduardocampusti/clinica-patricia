import type { TentativaIdempotente } from './financeiro.idempotency'
import { centavosParaNumeroRpc } from './financeiro.money'
import { executarRpcFinanceira, type ExecutorRpcFinanceiro } from './financeiro.rpc'
import type { PagamentoCentavos, ResultadoOperacaoFinanceira, UUID } from './financeiro.types'

export function solicitarEstorno(
  input: {
    recebimentoId: UUID
    pagamentos: PagamentoCentavos[]
    motivo: string
    tentativa: TentativaIdempotente
  },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  if (!input.motivo.trim()) throw new Error('Motivo do estorno obrigatório.')
  if (input.pagamentos.length === 0) throw new Error('Informe os componentes do estorno.')
  return executarRpcFinanceira('financeiro_solicitar_estorno', {
    p_recebimento_id: input.recebimentoId,
    p_pagamentos: input.pagamentos.map((pagamento) => {
      if (pagamento.valorCentavos <= 0n) throw new Error('Cada componente de estorno deve ser maior que zero.')
      return {
        forma_pagamento: pagamento.formaPagamento,
        valor: centavosParaNumeroRpc(pagamento.valorCentavos),
      }
    }),
    p_motivo: input.motivo.trim(),
    p_idempotency_key: input.tentativa.chave,
  }, executor)
}

export function revisarEstorno(
  input: { estornoId: UUID; acao: 'aprovar' | 'rejeitar'; observacao?: string | null },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  return executarRpcFinanceira('financeiro_revisar_estorno', {
    p_estorno_id: input.estornoId,
    p_acao: input.acao,
    p_observacao: input.observacao?.trim() || null,
  }, executor)
}
