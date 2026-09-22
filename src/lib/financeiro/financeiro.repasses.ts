import type { TentativaIdempotente } from './financeiro.idempotency'
import { executarRpcFinanceira, type ExecutorRpcFinanceiro } from './financeiro.rpc'
import type { ResultadoOperacaoFinanceira, UUID } from './financeiro.types'

export function confirmarRepasse(
  input: {
    repasseId: UUID
    meioPagamento: 'pix' | 'transferencia'
    referenciaPagamento?: string | null
    observacao?: string | null
    tentativa: TentativaIdempotente
  },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  return executarRpcFinanceira('financeiro_confirmar_repasse', {
    p_repasse_id: input.repasseId,
    p_meio_pagamento: input.meioPagamento,
    p_referencia_pagamento: input.referenciaPagamento?.trim() || null,
    p_observacao: input.observacao?.trim() || null,
    p_idempotency_key: input.tentativa.chave,
  }, executor)
}
