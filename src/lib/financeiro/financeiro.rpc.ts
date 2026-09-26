import { ErroFinanceiro, mapearErroFinanceiro } from './financeiro.errors'

export const PARAMETROS_RPC_FINANCEIRO = {
  financeiro_resumo_caixa: ['p_sessao_caixa_id'],
  financeiro_registrar_recebimento: ['p_agendamento_id', 'p_pagamentos', 'p_idempotency_key'],
  financeiro_abrir_caixa: ['p_clinica_id', 'p_valor_abertura', 'p_idempotency_key'],
  financeiro_registrar_suprimento: ['p_sessao_caixa_id', 'p_valor', 'p_motivo', 'p_idempotency_key'],
  financeiro_solicitar_sangria: ['p_sessao_caixa_id', 'p_valor', 'p_motivo', 'p_idempotency_key'],
  financeiro_revisar_sangria: ['p_sangria_id', 'p_acao', 'p_observacao'],
  financeiro_efetivar_sangria: ['p_sangria_id'],
  financeiro_iniciar_fechamento: ['p_sessao_caixa_id'],
  financeiro_enviar_fechamento: ['p_sessao_caixa_id', 'p_valor_contado', 'p_justificativa_diferenca', 'p_idempotency_key'],
  financeiro_revisar_fechamento: ['p_fechamento_id', 'p_acao', 'p_observacao'],
  financeiro_solicitar_estorno: ['p_recebimento_id', 'p_pagamentos', 'p_motivo', 'p_idempotency_key'],
  financeiro_revisar_estorno: ['p_estorno_id', 'p_acao', 'p_observacao'],
  financeiro_confirmar_repasse: ['p_repasse_id', 'p_meio_pagamento', 'p_referencia_pagamento', 'p_observacao', 'p_idempotency_key'],
  financeiro_solicitar_emissao_fiscal: ['p_documento_fiscal_id', 'p_idempotency_key'],
  financeiro_solicitar_cancelamento_fiscal: ['p_documento_fiscal_id', 'p_motivo', 'p_idempotency_key'],
  financeiro_configurar_alertas: ['p_clinica_id', 'p_limites'],
  financeiro_dashboard_profissional: ['p_inicio', 'p_fim', 'p_clinica_id', 'p_timezone'],
  financeiro_dashboard_proprietaria: ['p_inicio', 'p_fim', 'p_clinica_id', 'p_profissional_id', 'p_paciente_id', 'p_forma_pagamento', 'p_status_recebimento', 'p_status_repasse', 'p_status_fiscal', 'p_timezone'],
  financeiro_relatorio_recebimentos_proprietaria: ['p_inicio', 'p_fim', 'p_clinica_id', 'p_profissional_id', 'p_paciente_id', 'p_forma_pagamento', 'p_status_recebimento', 'p_status_fiscal', 'p_timezone', 'p_limite', 'p_cursor_data', 'p_cursor_id', 'p_cursor_contexto'],
  financeiro_relatorio_recebimentos_profissional: ['p_inicio', 'p_fim', 'p_clinica_id', 'p_forma_pagamento', 'p_status_recebimento', 'p_timezone', 'p_limite', 'p_cursor_data', 'p_cursor_id', 'p_cursor_contexto'],
  financeiro_relatorio_repasses_proprietaria: ['p_inicio', 'p_fim', 'p_clinica_id', 'p_profissional_id', 'p_status_repasse', 'p_evento', 'p_timezone', 'p_limite', 'p_cursor_data', 'p_cursor_id', 'p_cursor_contexto'],
  financeiro_relatorio_repasses_profissional: ['p_inicio', 'p_fim', 'p_clinica_id', 'p_status_repasse', 'p_evento', 'p_timezone', 'p_limite', 'p_cursor_data', 'p_cursor_id', 'p_cursor_contexto'],
  financeiro_relatorio_fiscal_proprietaria: ['p_inicio', 'p_fim', 'p_clinica_id', 'p_profissional_id', 'p_paciente_id', 'p_forma_pagamento', 'p_status_recebimento', 'p_status_fiscal', 'p_timezone', 'p_limite', 'p_cursor_data', 'p_cursor_id', 'p_cursor_contexto'],
  financeiro_registrar_solicitacao_exportacao: ['p_publico', 'p_dataset', 'p_formato', 'p_inicio', 'p_fim', 'p_clinica_id', 'p_filtros'],
} as const

export type NomeRpcFinanceiro = keyof typeof PARAMETROS_RPC_FINANCEIRO

export interface RespostaRpc<T = unknown> {
  data: T | null
  error: unknown | null
}

export type ExecutorRpcFinanceiro = (
  nome: NomeRpcFinanceiro,
  parametros: Record<string, unknown>,
) => Promise<RespostaRpc>

export const executorRpcSupabase: ExecutorRpcFinanceiro = async (nome, parametros) => {
  const { supabase } = await import('../supabase')
  const resposta = await supabase.rpc(nome, parametros)
  return { data: resposta.data as unknown, error: resposta.error }
}

export function validarParametrosRpc(
  nome: NomeRpcFinanceiro,
  parametros: Record<string, unknown>,
): void {
  const permitidos = new Set<string>(PARAMETROS_RPC_FINANCEIRO[nome])
  const desconhecido = Object.keys(parametros).find((parametro) => !permitidos.has(parametro))
  if (desconhecido) throw new Error(`Parâmetro não homologado para ${nome}: ${desconhecido}.`)
}

export async function executarRpcFinanceira<T>(
  nome: NomeRpcFinanceiro,
  parametros: Record<string, unknown>,
  executor: ExecutorRpcFinanceiro = executorRpcSupabase,
): Promise<T> {
  validarParametrosRpc(nome, parametros)
  try {
    const resposta = await executor(nome, parametros)
    if (resposta.error) throw resposta.error
    if (resposta.data === null || resposta.data === undefined) {
      throw new ErroFinanceiro('resposta_invalida', 'O banco retornou uma resposta financeira inválida.')
    }
    return resposta.data as T
  } catch (erro) {
    if (import.meta.env?.DEV) console.error(`[financeiro:${nome}]`, erro)
    throw mapearErroFinanceiro(erro)
  }
}
