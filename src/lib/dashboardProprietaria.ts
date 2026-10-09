import { carregarDashboardProprietaria } from './financeiro/financeiro.dashboard'
import { intervaloPorDias } from './financeiro/financeiro.date'
import { decimalBancoParaCentavos, formatarCentavos } from './financeiro/financeiro.money'
import type { ExecutorRpcFinanceiro } from './financeiro/financeiro.rpc'

export interface FinanceiroDoDia {
  recebido: string
  parcelaClinica: string
  repassesPagos: string
  quantidadeRecebimentos: number
  repassesPendentes: number
  fiscaisPendentes: number
  caixasParaRevisar: number
  caixasParaCorrigir: number
  consultadoEm: string
}

// Só apresenta agregados calculados pelo Financeiro. Não calcula taxas, saldos,
// parcelas ou estornos no cliente; resposta incompleta jamais vira zero.
export async function consultarFinanceiroDoDia(clinicaId: string, dia: string, executor?: ExecutorRpcFinanceiro): Promise<FinanceiroDoDia> {
  const intervalo = intervaloPorDias(dia, dia)
  const dados = await carregarDashboardProprietaria(intervalo, { clinicaId }, executor)
  if (dados.clinicas_autorizadas.length !== 1 || dados.clinicas_autorizadas[0] !== clinicaId ||
      Date.parse(dados.inicio) !== Date.parse(intervalo.inicio) || Date.parse(dados.fim) !== Date.parse(intervalo.fim) ||
      dados.timezone_series !== intervalo.timezone || !Number.isFinite(Date.parse(dados.consultado_em))) {
    throw new Error('Escopo financeiro não confirmado.')
  }
  const resumo = dados.resumo
  const contagem = (valor: unknown) => {
    if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 0) throw new Error('Contagem financeira inválida.')
    return valor
  }
  const moeda = (valor: unknown) => {
    if (typeof valor !== 'number' && typeof valor !== 'string') throw new Error('Valor financeiro ausente.')
    return formatarCentavos(decimalBancoParaCentavos(valor))
  }
  return {
    recebido: moeda(resumo.producao?.bruto),
    parcelaClinica: moeda(resumo.producao?.clinica_liquida),
    repassesPagos: moeda(resumo.repasses?.valor_repasses_pagos_periodo),
    quantidadeRecebimentos: contagem(resumo.producao?.quantidade),
    repassesPendentes: contagem(resumo.repasses?.repasses_pendentes_atual),
    fiscaisPendentes: contagem(resumo.fiscal?.pendente),
    caixasParaRevisar: contagem(resumo.caixa?.situacao_operacional_atual?.aguardando_aprovacao),
    caixasParaCorrigir: contagem(resumo.caixa?.situacao_operacional_atual?.devolvido_para_correcao),
    consultadoEm: dados.consultado_em,
  }
}
