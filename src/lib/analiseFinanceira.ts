import { carregarDashboardProprietaria } from './financeiro/financeiro.dashboard'
import { inicioDiaFinanceiro, intervaloPorDias } from './financeiro/financeiro.date'
import { decimalBancoParaCentavos, formatarCentavos } from './financeiro/financeiro.money'
import type { ExecutorRpcFinanceiro } from './financeiro/financeiro.rpc'
import type { DashboardProprietaria, IntervaloFinanceiro } from './financeiro/financeiro.types'
import type { AcessoClinica } from './clinicAccess'
import { CLINIC_BRANDS, clinicaCorrespondeAoBrand, type ClinicBrandSlug } from '../config/clinicBrands'

export interface UnidadeAnalise { id: string; nome: string; slug: ClinicBrandSlug }
export interface PeriodoAnalise { inicio: string; fim: string }
export interface PontoAnalise { dia: string; bruto: bigint; parcela: bigint }
export interface DadosAnalise { bruto: bigint; parcela: bigint; repasses: bigint; quantidade: number; pontos: PontoAnalise[]; consultadoEm: string }
export interface FonteAnalise { carregando: boolean; dado?: DadosAnalise; erro?: 'permissao' | 'leitura' }
export type EscopoAnalise = ClinicBrandSlug | 'comparar'
export type MetricaAnalise = 'bruto' | 'parcela'

export function unidadesDaAnalise(acessos: AcessoClinica[]): UnidadeAnalise[] {
  return Object.values(CLINIC_BRANDS).flatMap(brand => {
    const candidatos = acessos.filter(a => a.papel === 'proprietaria' && clinicaCorrespondeAoBrand({ id: a.clinicaId, nome: a.nome, subdomain: a.subdomain }, brand))
    const ids = [...new Set(candidatos.map(a => a.clinicaId))]
    if (ids.length > 1) throw new Error('Não foi possível confirmar a identificação das clínicas.')
    return ids.length ? [{ id: ids[0], nome: brand.nome, slug: brand.slug }] : []
  })
}

export function diasAntes(dia: string, quantidade: number): string {
  inicioDiaFinanceiro(dia)
  const data = new Date(`${dia}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() - quantidade)
  return data.toISOString().slice(0, 10)
}
export function periodoRapido(tipo: 'mes' | '7' | '30', hoje: string): PeriodoAnalise {
  return { inicio: tipo === 'mes' ? `${hoje.slice(0, 7)}-01` : diasAntes(hoje, Number(tipo) - 1), fim: hoje }
}
export function validarPeriodoAnalise(periodo: PeriodoAnalise): IntervaloFinanceiro {
  // Valida também o último dia, antes da normalização do dia seguinte.
  inicioDiaFinanceiro(periodo.fim)
  return intervaloPorDias(periodo.inicio, periodo.fim)
}

function dinheiro(valor: unknown): bigint {
  if ((typeof valor !== 'number' && typeof valor !== 'string') ||
      (typeof valor === 'string' && !/^-?\d+(?:\.\d{1,2})?$/.test(valor))) throw new Error('Valor financeiro inválido.')
  const centavos = decimalBancoParaCentavos(valor)
  formatarCentavos(centavos) // rejeita valores fora da faixa segura de apresentação
  return centavos
}

export function validarRespostaAnalise(dados: DashboardProprietaria, clinicaId: string, periodo: PeriodoAnalise): DadosAnalise {
  const intervalo = validarPeriodoAnalise(periodo)
  if (!dados || dados.versao !== 1 || !Array.isArray(dados.clinicas_autorizadas) ||
      dados.clinicas_autorizadas.length !== 1 || dados.clinicas_autorizadas[0] !== clinicaId ||
      Date.parse(dados.inicio) !== Date.parse(intervalo.inicio) || Date.parse(dados.fim) !== Date.parse(intervalo.fim) ||
      dados.timezone_series !== intervalo.timezone || typeof dados.consultado_em !== 'string' ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(dados.consultado_em) || !Number.isFinite(Date.parse(dados.consultado_em))) throw new Error('Escopo financeiro não confirmado.')
  const r = dados.resumo
  if (!Array.isArray(r?.series) || r.series.length > 366 || !Number.isSafeInteger(r.producao?.quantidade) || r.producao.quantidade < 0) throw new Error('Resposta financeira incompleta.')
  const bruto = dinheiro(r.producao.bruto), parcela = dinheiro(r.producao.clinica_liquida), repasses = dinheiro(r.repasses?.valor_repasses_pagos_periodo)
  let ultimo = ''
  const pontos = r.series.map(p => {
    if (!p || typeof p.dia !== 'string' || p.dia <= ultimo || p.dia < periodo.inicio || p.dia > periodo.fim) throw new Error('Série financeira inválida.')
    inicioDiaFinanceiro(p.dia)
    ultimo = p.dia
    return { dia: p.dia, bruto: dinheiro(p.bruto), parcela: dinheiro(p.clinica_liquida) }
  })
  // Reconciliação dos agregados recebidos, sem produzir novas regras financeiras.
  if (pontos.reduce((t, p) => t + p.bruto, 0n) !== bruto || pontos.reduce((t, p) => t + p.parcela, 0n) !== parcela) throw new Error('A série não corresponde aos totais fornecidos pelo Financeiro.')
  return { bruto, parcela, repasses, quantidade: r.producao.quantidade, pontos, consultadoEm: dados.consultado_em }
}

// Somente requisições em andamento: deduplica StrictMode/consumidores; nenhum
// resultado persistido ou cache de sessão. A conta participa sempre da chave.
const emAndamento = new Map<string, Promise<DadosAnalise>>()
export function consultarAnaliseFinanceira(usuarioId: string, clinicaId: string, periodo: PeriodoAnalise, executor?: ExecutorRpcFinanceiro): Promise<DadosAnalise> {
  const intervalo = validarPeriodoAnalise(periodo)
  const chave = JSON.stringify([usuarioId, clinicaId, intervalo.inicio, intervalo.fim, intervalo.timezone])
  const anterior = emAndamento.get(chave)
  if (anterior) return anterior
  const consulta = carregarDashboardProprietaria(intervalo, { clinicaId }, executor).then(d => validarRespostaAnalise(d, clinicaId, periodo))
  emAndamento.set(chave, consulta)
  void consulta.finally(() => { if (emAndamento.get(chave) === consulta) emAndamento.delete(chave) }).catch(() => {})
  return consulta
}

export function iniciarFonteAnalise(anterior?: FonteAnalise): FonteAnalise { return { carregando: true, dado: anterior?.dado } }
export function falharFonteAnalise(anterior: FonteAnalise | undefined, erro: 'permissao' | 'leitura'): FonteAnalise {
  return { carregando: false, erro, dado: erro === 'permissao' ? undefined : anterior?.dado }
}

export function linhasDoGrafico(unidades: UnidadeAnalise[], fontes: Record<string, FonteAnalise>, periodo: PeriodoAnalise, metrica: MetricaAnalise) {
  const porUnidade = new Map(unidades.map(u => [u.slug, new Map(fontes[u.id]?.dado?.pontos.map(p => [p.dia, p[metrica]]) ?? [])]))
  const dias = new Set<string>()
  for (const mapa of porUnidade.values()) for (const dia of mapa.keys()) dias.add(dia)
  // Ausências permanecem null. Insere marcadores de lacuna para não ligar
  // pontos separados por dias sem linha no retorno, sem atribuir zero.
  const ordenados = [...dias].sort()
  for (let i = 1; i < ordenados.length; i++) {
    const proximo = diasAntes(ordenados[i - 1], -1)
    if (proximo < ordenados[i]) dias.add(proximo)
  }
  dias.add(periodo.inicio); dias.add(periodo.fim)
  return [...dias].sort().map(dia => ({ dia, instante: Date.parse(`${dia}T12:00:00Z`),
    brotas: porUnidade.get('brotas')?.has(dia) ? Number(porUnidade.get('brotas')!.get(dia)) / 100 : null,
    ipupiara: porUnidade.get('ipupiara')?.has(dia) ? Number(porUnidade.get('ipupiara')!.get(dia)) / 100 : null,
  }))
}
