import type { MetricaRelatorio, RelatorioFinanceiro, SecaoRelatorio, TipoCelulaRelatorio, ValorRelatorio } from '../financeiroRelatorios'
import type { RelatorioCompleto } from '../financeiroRelatoriosRpc'
import type { DashboardProfissional, DashboardProprietaria } from './financeiro.types'

type Dataset = 'recebimentos' | 'repasses' | 'fiscal'
type Registro = Record<string, unknown>
export type RelatoriosColetados = Partial<Record<Dataset, RelatorioCompleto<Registro>>>

const colunas = {
  recebimentos: [
    ['data', 'Data/hora', 'data_hora', 'data'], ['clinica', 'Clínica', 'texto', 'clinica'],
    ['paciente', 'Paciente', 'texto', 'paciente'], ['profissional', 'Profissional', 'texto', 'profissional'],
    ['formas', 'Formas', 'texto', 'formas_pagamento'], ['status', 'Status', 'status', 'status'],
    ['bruto', 'Bruto', 'monetario', 'valor_bruto'], ['clinicaValor', 'Clínica', 'monetario', 'valor_clinica'],
    ['profissionalValor', 'Profissional', 'monetario', 'valor_profissional'],
    ['estornado', 'Estornado', 'monetario', 'valor_estornado'],
    ['liquido', 'Líquido atual', 'monetario', 'valor_liquido_atual'],
    ['dinheiro', 'Dinheiro', 'monetario', 'dinheiro'], ['pix', 'PIX', 'monetario', 'pix'],
    ['cartao', 'Cartão', 'monetario', 'cartao_credito'],
  ],
  repasses: [
    ['data', 'Data do evento', 'data_hora', 'data_evento'], ['clinica', 'Clínica', 'texto', 'clinica'],
    ['profissional', 'Profissional', 'texto', 'profissional'], ['status', 'Status', 'status', 'status'],
    ['bruto', 'Bruto profissional', 'monetario', 'valor_bruto_profissional'],
    ['estornos', 'Estornos prévios', 'monetario', 'valor_estornos_antes_pagamento'],
    ['ajustes', 'Ajustes', 'monetario', 'valor_ajustes_aplicados'],
    ['liquido', 'Líquido', 'monetario', 'valor_liquido'],
    ['meio', 'Meio externo', 'texto', 'meio_pagamento'],
  ],
  fiscal: [
    ['data', 'Recebimento', 'data_hora', 'data_recebimento'], ['clinica', 'Clínica', 'texto', 'clinica'],
    ['paciente', 'Paciente', 'texto', 'paciente'], ['profissional', 'Profissional', 'texto', 'profissional'],
    ['valor', 'Bruto', 'monetario', 'valor_bruto'], ['status', 'Status fiscal', 'status', 'status_fiscal'],
    ['numero', 'Número', 'texto', 'numero_documento'], ['serie', 'Série', 'texto', 'serie'],
    ['atualizado', 'Atualizado', 'data_hora', 'atualizado_em'],
  ],
} as const

const nomesFormaPagamento: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de crédito',
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formasPagamentoSeguras(valor: unknown): string {
  if (!Array.isArray(valor)) throw new Error('O banco retornou formas de pagamento inválidas.')
  return valor.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('O banco retornou uma forma de pagamento inválida.')
    }
    const registro = item as Record<string, unknown>
    const nome = typeof registro.forma === 'string' ? nomesFormaPagamento[registro.forma] : undefined
    const decimal = typeof registro.valor === 'number' ? registro.valor
      : typeof registro.valor === 'string' && /^\d{1,12}(\.\d{1,2})?$/.test(registro.valor)
        ? Number(registro.valor) : Number.NaN
    if (!nome || !Number.isFinite(decimal)) {
      throw new Error('O banco retornou uma forma de pagamento fora do contrato.')
    }
    return `${nome}: ${moeda.format(decimal)}`
  }).join(' + ')
}

function valorSeguro(valor: unknown): ValorRelatorio {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'string' || typeof valor === 'number') return valor
  if (Array.isArray(valor)) return valor.filter((item) => typeof item === 'string').join(', ')
  throw new Error('O banco retornou um campo inesperado para a apresentação do relatório.')
}

function secao(dataset: Dataset, relatorio: RelatorioCompleto<Registro>): SecaoRelatorio {
  const nome = dataset === 'recebimentos' ? 'Recebimentos' : dataset === 'repasses' ? 'Repasses' : 'Fiscal'
  const esquema = colunas[dataset] as ReadonlyArray<readonly [string, string, TipoCelulaRelatorio, string]>
  return {
    nomeAba: nome, titulo: nome,
    colunas: esquema.map(([chave, titulo, tipo]) => ({ chave, titulo, tipo })),
    linhas: relatorio.itens.map((item) => Object.fromEntries(esquema.map(([chave, , , origem]) => [
      chave,
      origem === 'formas_pagamento' ? formasPagamentoSeguras(item[origem]) : valorSeguro(item[origem]),
    ]))),
  }
}

function metricasDataset(dataset: Dataset, relatorio: RelatorioCompleto<Registro>): MetricaRelatorio[] {
  const prefixo = dataset === 'recebimentos' ? 'Recebimentos' : dataset === 'repasses' ? 'Repasses' : 'Fiscal'
  const totais = relatorio.totais
  const metricas: MetricaRelatorio[] = [
    { rotulo: `${prefixo} · registros`, valor: valorSeguro(totais.quantidade), tipo: 'inteiro' },
  ]
  if (dataset === 'recebimentos') {
    metricas.push({ rotulo: 'Recebimentos · bruto', valor: valorSeguro(totais.bruto), tipo: 'monetario' },
      { rotulo: 'Recebimentos · líquido atual', valor: valorSeguro(totais.liquido_atual), tipo: 'monetario' })
  } else if (dataset === 'repasses') {
    metricas.push({ rotulo: 'Repasses · líquido', valor: valorSeguro(totais.valor_liquido), tipo: 'monetario' })
  } else {
    metricas.push({ rotulo: 'Fiscal · bruto da coorte', valor: valorSeguro(totais.valor_bruto), tipo: 'monetario' })
  }
  return metricas
}

export function montarRelatorioFinanceiro(input: {
  titulo: string
  publico: 'proprietaria' | 'profissional'
  inicio: string
  fim: string
  timezone: string
  clinicas: string[]
  filtros: string[]
  coletados: RelatoriosColetados
  dashboard?: DashboardProprietaria | DashboardProfissional
}): RelatorioFinanceiro {
  const ordem: Dataset[] = ['recebimentos', 'repasses', 'fiscal']
  const presentes = ordem.filter((dataset) => input.coletados[dataset])
  if (!presentes.length) throw new Error('Relatório sem dataset detalhado.')
  const secoes = presentes.map((dataset) => secao(dataset, input.coletados[dataset]!))
  const metricas = presentes.flatMap((dataset) => metricasDataset(dataset, input.coletados[dataset]!))
  if (input.dashboard) {
    metricas.unshift(
      { rotulo: 'Painel · produção bruta', valor: valorSeguro(input.dashboard.resumo.producao.bruto), tipo: 'monetario' },
      { rotulo: 'Painel · produção líquida atual', valor: valorSeguro(input.dashboard.resumo.producao.liquido_atual_coorte), tipo: 'monetario' },
      { rotulo: 'Painel · repasses pagos', valor: valorSeguro(input.dashboard.resumo.repasses.valor_repasses_pagos_periodo), tipo: 'monetario' },
    )
  }
  return {
    titulo: input.titulo, publico: input.publico, periodoInicio: input.inicio, periodoFim: input.fim,
    timezone: input.timezone, geradoEm: new Date().toISOString(), clinicas: input.clinicas,
    filtros: input.filtros, metricas, secoes,
    observacoes: ['Valores oficiais do banco. O fim do intervalo é exclusivo.',
      'Listas detalhadas paginadas, revalidadas e reconciliadas antes da geração.'],
  }
}
