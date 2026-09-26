import type { TentativaIdempotente } from './financeiro.idempotency'
import { executarRpcFinanceira, type ExecutorRpcFinanceiro } from './financeiro.rpc'
import type { ResultadoOperacaoFinanceira, UUID } from './financeiro.types'

export function solicitarEmissaoFiscal(
  input: { documentoFiscalId: UUID; tentativa: TentativaIdempotente },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  return executarRpcFinanceira('financeiro_solicitar_emissao_fiscal', {
    p_documento_fiscal_id: input.documentoFiscalId,
    p_idempotency_key: input.tentativa.chave,
  }, executor)
}
export function solicitarCancelamentoFiscal(
  input: { documentoFiscalId: UUID; motivo: string; tentativa: TentativaIdempotente },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  if (!input.motivo.trim()) throw new Error('Motivo do cancelamento fiscal obrigatório.')
  return executarRpcFinanceira('financeiro_solicitar_cancelamento_fiscal', {
    p_documento_fiscal_id: input.documentoFiscalId,
    p_motivo: input.motivo.trim(),
    p_idempotency_key: input.tentativa.chave,
  }, executor)
}
