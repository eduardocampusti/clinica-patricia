import {
  coletarRelatorioCompleto,
  registrarSolicitacaoExportacao,
  reconciliarRelatorioDetalhado,
  type OpcoesColeta,
  type RelatorioCompleto,
} from '../financeiroRelatoriosRpc'
import { validarIntervaloFinanceiro } from './financeiro.date'
import type {
  FiltrosDashboardProprietaria,
  FormaPagamento,
  IntervaloFinanceiro,
  ModoRelatorioRepasse,
  StatusFiscal,
  StatusRecebimento,
  StatusRepasse,
  UUID,
} from './financeiro.types'

export { registrarSolicitacaoExportacao, reconciliarRelatorioDetalhado }
export type {
  CursorRelatorio,
  ExecutorRelatorio,
  OpcoesColeta,
  PaginaRelatorio,
  RelatorioCompleto,
  RpcRelatorio,
} from '../financeiroRelatoriosRpc'

type ItemRelatorio = Record<string, unknown>

function periodo(intervalo: IntervaloFinanceiro) {
  validarIntervaloFinanceiro(intervalo)
  return { p_inicio: intervalo.inicio, p_fim: intervalo.fim, p_timezone: intervalo.timezone }
}

export function coletarRecebimentosProprietaria(
  intervalo: IntervaloFinanceiro,
  filtros: Omit<FiltrosDashboardProprietaria, 'statusRepasse'> = {},
  opcoes?: OpcoesColeta,
): Promise<RelatorioCompleto<ItemRelatorio>> {
  return coletarRelatorioCompleto('financeiro_relatorio_recebimentos_proprietaria', {
    ...periodo(intervalo),
    p_clinica_id: filtros.clinicaId ?? null,
    p_profissional_id: filtros.profissionalId ?? null,
    p_paciente_id: filtros.pacienteId ?? null,
    p_forma_pagamento: filtros.formaPagamento ?? null,
    p_status_recebimento: filtros.statusRecebimento ?? null,
    p_status_fiscal: filtros.statusFiscal ?? null,
  }, opcoes)
}

export function coletarRecebimentosProfissional(
  intervalo: IntervaloFinanceiro,
  filtros: {
    clinicaId?: UUID | null
    formaPagamento?: FormaPagamento | null
    statusRecebimento?: StatusRecebimento | null
  } = {},
  opcoes?: OpcoesColeta,
): Promise<RelatorioCompleto<ItemRelatorio>> {
  return coletarRelatorioCompleto('financeiro_relatorio_recebimentos_profissional', {
    ...periodo(intervalo),
    p_clinica_id: filtros.clinicaId ?? null,
    p_forma_pagamento: filtros.formaPagamento ?? null,
    p_status_recebimento: filtros.statusRecebimento ?? null,
  }, opcoes)
}

export function coletarRepassesProprietaria(
  intervalo: IntervaloFinanceiro,
  filtros: {
    clinicaId?: UUID | null
    profissionalId?: UUID | null
    statusRepasse?: StatusRepasse | null
    evento?: ModoRelatorioRepasse
  } = {},
  opcoes?: OpcoesColeta,
): Promise<RelatorioCompleto<ItemRelatorio>> {
  return coletarRelatorioCompleto('financeiro_relatorio_repasses_proprietaria', {
    ...periodo(intervalo),
    p_clinica_id: filtros.clinicaId ?? null,
    p_profissional_id: filtros.profissionalId ?? null,
    p_status_repasse: filtros.statusRepasse ?? null,
    p_evento: filtros.evento ?? 'gerados_periodo',
  }, opcoes)
}

export function coletarRepassesProfissional(
  intervalo: IntervaloFinanceiro,
  filtros: {
    clinicaId?: UUID | null
    statusRepasse?: StatusRepasse | null
    evento?: ModoRelatorioRepasse
  } = {},
  opcoes?: OpcoesColeta,
): Promise<RelatorioCompleto<ItemRelatorio>> {
  return coletarRelatorioCompleto('financeiro_relatorio_repasses_profissional', {
    ...periodo(intervalo),
    p_clinica_id: filtros.clinicaId ?? null,
    p_status_repasse: filtros.statusRepasse ?? null,
    p_evento: filtros.evento ?? 'gerados_periodo',
  }, opcoes)
}

export function coletarFiscalProprietaria(
  intervalo: IntervaloFinanceiro,
  filtros: {
    clinicaId?: UUID | null
    profissionalId?: UUID | null
    pacienteId?: UUID | null
    formaPagamento?: FormaPagamento | null
    statusRecebimento?: StatusRecebimento | null
    statusFiscal?: StatusFiscal | null
  } = {},
  opcoes?: OpcoesColeta,
): Promise<RelatorioCompleto<ItemRelatorio>> {
  return coletarRelatorioCompleto('financeiro_relatorio_fiscal_proprietaria', {
    ...periodo(intervalo),
    p_clinica_id: filtros.clinicaId ?? null,
    p_profissional_id: filtros.profissionalId ?? null,
    p_paciente_id: filtros.pacienteId ?? null,
    p_forma_pagamento: filtros.formaPagamento ?? null,
    p_status_recebimento: filtros.statusRecebimento ?? null,
    p_status_fiscal: filtros.statusFiscal ?? null,
  }, opcoes)
}

export async function gerarPdfFinanceiroSobDemanda(
  ...argumentos: Parameters<typeof import('../financeiroRelatorios')['gerarRelatorioFinanceiroPdf']>
): Promise<Blob> {
  const modulo = await import('../financeiroRelatorios')
  if(argumentos[1]?.clinicaId) {
    const {consultarTimbradoAplicado}=await import('../../hooks/useMarcaInstitucional')
    const snapshot=await consultarTimbradoAplicado(argumentos[1].clinicaId,'relatorio_financeiro')
    if(snapshot){
      const r=argumentos[0];modulo.validarRelatorioFinanceiro(r)
      const {gerarPdfTimbrado}=await import('../timbradoPdf')
      const formatar=(v:import('../financeiroRelatorios').ValorRelatorio,t:import('../financeiroRelatorios').TipoCelulaRelatorio)=>modulo.formatarValorRelatorio(v,t,r.timezone)
      return gerarPdfTimbrado(snapshot,[{texto:r.titulo,titulo:true},{texto:`Gerado em ${formatar(r.geradoEm,'data_hora')} · Período: ${formatar(r.periodoInicio,'data_hora')} até ${formatar(r.periodoFim,'data_hora')} (fim exclusivo)`},{texto:`Clínicas: ${r.clinicas.join(', ')} · Filtros: ${r.filtros.join(' | ') || 'Nenhum filtro adicional'}`},
        {texto:'Valores consolidados pelo banco. Documento sem dados clínicos.'},
        ...r.metricas.map(m=>({texto:`${m.rotulo}: ${formatar(m.valor,m.tipo)}`})),
        ...r.secoes.flatMap(s=>[{texto:s.titulo,titulo:true},{colunas:s.colunas.map(c=>c.titulo),linhas:s.linhas.map(l=>s.colunas.map(c=>formatar(l[c.chave]??null,c.tipo)))}]),
        ...(r.observacoes??[]).map(texto=>({texto}))])
    }
  }
  return modulo.gerarRelatorioFinanceiroPdf(...argumentos)
}

export async function gerarXlsxFinanceiroSobDemanda(
  ...argumentos: Parameters<typeof import('../financeiroRelatorios')['gerarRelatorioFinanceiroXlsx']>
): Promise<Blob> {
  const modulo = await import('../financeiroRelatorios')
  return modulo.gerarRelatorioFinanceiroXlsx(...argumentos)
}
