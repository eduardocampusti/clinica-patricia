import { validarIntervaloFinanceiro } from './financeiro.date'
import { ErroFinanceiro } from './financeiro.errors'
import { executarRpcFinanceira, type ExecutorRpcFinanceiro } from './financeiro.rpc'
import type {
  DashboardProfissional,
  DashboardProprietaria,
  FiltrosDashboardProprietaria,
  IntervaloFinanceiro,
  LimitesAlertasFinanceiros,
  ResultadoOperacaoFinanceira,
  UUID,
} from './financeiro.types'

function validarDashboard<T extends DashboardProfissional | DashboardProprietaria>(valor: T): T {
  if (!valor || valor.versao !== 1 || !valor.resumo || !Array.isArray(valor.clinicas_autorizadas)) {
    throw new ErroFinanceiro('resposta_invalida', 'O banco retornou um dashboard financeiro inválido.')
  }
  return valor
}

export async function carregarDashboardProprietaria(
  intervalo: IntervaloFinanceiro,
  filtros: FiltrosDashboardProprietaria = {},
  executor?: ExecutorRpcFinanceiro,
): Promise<DashboardProprietaria> {
  validarIntervaloFinanceiro(intervalo)
  const resposta = await executarRpcFinanceira<DashboardProprietaria>('financeiro_dashboard_proprietaria', {
    p_inicio: intervalo.inicio,
    p_fim: intervalo.fim,
    p_clinica_id: filtros.clinicaId ?? null,
    p_profissional_id: filtros.profissionalId ?? null,
    p_paciente_id: filtros.pacienteId ?? null,
    p_forma_pagamento: filtros.formaPagamento ?? null,
    p_status_recebimento: filtros.statusRecebimento ?? null,
    p_status_repasse: filtros.statusRepasse ?? null,
    p_status_fiscal: filtros.statusFiscal ?? null,
    p_timezone: intervalo.timezone,
  }, executor)
  return validarDashboard(resposta)
}

export async function carregarDashboardProfissional(
  intervalo: IntervaloFinanceiro,
  clinicaId: UUID | null = null,
  executor?: ExecutorRpcFinanceiro,
): Promise<DashboardProfissional> {
  validarIntervaloFinanceiro(intervalo)
  const resposta = await executarRpcFinanceira<DashboardProfissional>('financeiro_dashboard_profissional', {
    p_inicio: intervalo.inicio,
    p_fim: intervalo.fim,
    p_clinica_id: clinicaId,
    p_timezone: intervalo.timezone,
  }, executor)
  return validarDashboard(resposta)
}

export function configurarAlertasFinanceiros(
  clinicaId: UUID,
  limites: LimitesAlertasFinanceiros,
  executor?: ExecutorRpcFinanceiro,
): Promise<ResultadoOperacaoFinanceira> {
  return executarRpcFinanceira('financeiro_configurar_alertas', {
    p_clinica_id: clinicaId,
    p_limites: limites,
  }, executor)
}
