import type { TentativaIdempotente } from './financeiro.idempotency'
import { centavosParaNumeroRpc } from './financeiro.money'
import { executarRpcFinanceira, type ExecutorRpcFinanceiro } from './financeiro.rpc'
import type { ResultadoOperacaoFinanceira, UUID } from './financeiro.types'

export function abrirCaixa(
  input: { clinicaId: UUID; valorAberturaCentavos: bigint; tentativa: TentativaIdempotente },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  if (input.valorAberturaCentavos < 0n) throw new Error('O valor de abertura não pode ser negativo.')
  return executarRpcFinanceira('financeiro_abrir_caixa', {
    p_clinica_id: input.clinicaId,
    p_valor_abertura: centavosParaNumeroRpc(input.valorAberturaCentavos),
    p_idempotency_key: input.tentativa.chave,
  }, executor)
}

export function registrarSuprimento(
  input: { sessaoCaixaId: UUID; valorCentavos: bigint; motivo: string; tentativa: TentativaIdempotente },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  if (input.valorCentavos <= 0n) throw new Error('O suprimento deve ser maior que zero.')
  return executarRpcFinanceira('financeiro_registrar_suprimento', {
    p_sessao_caixa_id: input.sessaoCaixaId,
    p_valor: centavosParaNumeroRpc(input.valorCentavos),
    p_motivo: input.motivo.trim(),
    p_idempotency_key: input.tentativa.chave,
  }, executor)
}

export function solicitarSangria(
  input: { sessaoCaixaId: UUID; valorCentavos: bigint; motivo: string; tentativa: TentativaIdempotente },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  if (input.valorCentavos <= 0n) throw new Error('A sangria deve ser maior que zero.')
  return executarRpcFinanceira('financeiro_solicitar_sangria', {
    p_sessao_caixa_id: input.sessaoCaixaId,
    p_valor: centavosParaNumeroRpc(input.valorCentavos),
    p_motivo: input.motivo.trim(),
    p_idempotency_key: input.tentativa.chave,
  }, executor)
}

export function revisarSangria(
  input: { sangriaId: UUID; acao: 'aprovar' | 'rejeitar'; observacao?: string | null },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  return executarRpcFinanceira('financeiro_revisar_sangria', {
    p_sangria_id: input.sangriaId,
    p_acao: input.acao,
    p_observacao: input.observacao?.trim() || null,
  }, executor)
}

export function efetivarSangria(
  sangriaId: UUID,
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  return executarRpcFinanceira('financeiro_efetivar_sangria', { p_sangria_id: sangriaId }, executor)
}

export function iniciarFechamento(
  sessaoCaixaId: UUID,
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  return executarRpcFinanceira('financeiro_iniciar_fechamento', { p_sessao_caixa_id: sessaoCaixaId }, executor)
}

export function enviarFechamento(
  input: {
    sessaoCaixaId: UUID
    valorContadoCentavos: bigint
    justificativaDiferenca?: string | null
    tentativa: TentativaIdempotente
  },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  if (input.valorContadoCentavos < 0n) throw new Error('O valor contado não pode ser negativo.')
  return executarRpcFinanceira('financeiro_enviar_fechamento', {
    p_sessao_caixa_id: input.sessaoCaixaId,
    p_valor_contado: centavosParaNumeroRpc(input.valorContadoCentavos),
    p_justificativa_diferenca: input.justificativaDiferenca?.trim() || null,
    p_idempotency_key: input.tentativa.chave,
  }, executor)
}

export function revisarFechamento(
  input: { fechamentoId: UUID; acao: 'aprovar' | 'devolver'; observacao?: string | null },
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  return executarRpcFinanceira('financeiro_revisar_fechamento', {
    p_fechamento_id: input.fechamentoId,
    p_acao: input.acao,
    p_observacao: input.observacao?.trim() || null,
  }, executor)
}
