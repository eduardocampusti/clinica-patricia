export type UUID = string
export type DecimalBanco = string | number
export type TimestampComFuso = string

export const FORMAS_PAGAMENTO = ['dinheiro', 'pix', 'cartao_credito'] as const
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]

export const STATUS_RECEBIMENTO = ['confirmado', 'parcialmente_estornado', 'estornado'] as const
export type StatusRecebimento = (typeof STATUS_RECEBIMENTO)[number]

export const STATUS_REPASSE = ['em_formacao', 'pendente', 'pago', 'ajustado'] as const
export type StatusRepasse = (typeof STATUS_REPASSE)[number]

export const STATUS_FISCAL = [
  'pendente',
  'emissao_solicitada',
  'emitida',
  'erro_emissao',
  'cancelamento_solicitado',
  'cancelada',
  'erro_cancelamento',
] as const
export type StatusFiscal = (typeof STATUS_FISCAL)[number]

export const STATUS_CAIXA = [
  'aberto',
  'em_fechamento',
  'aguardando_aprovacao',
  'devolvido_para_correcao',
  'aprovado',
] as const
export type StatusCaixa = (typeof STATUS_CAIXA)[number]

export type PrioridadeAlerta = 'informativo' | 'atencao' | 'critico'
export type ModoRelatorioRepasse = 'gerados_periodo' | 'pagos_periodo' | 'pendentes_atuais'

export interface PagamentoCentavos {
  formaPagamento: FormaPagamento
  valorCentavos: bigint
}

export interface IntervaloFinanceiro {
  inicio: TimestampComFuso
  fim: TimestampComFuso
  timezone: string
}

export interface ResultadoOperacaoFinanceira {
  nova_operacao: boolean
  status?: string
  [campo: string]: unknown
}

export interface ResultadoRecebimento extends ResultadoOperacaoFinanceira {
  recebimento_id: UUID
  agendamento_id: UUID
  clinica_id: UUID
  paciente_id: UUID
  profissional_id: UUID
  sessao_caixa_id: UUID
  valor_bruto: DecimalBanco
  percentual_clinica: DecimalBanco
  valor_clinica: DecimalBanco
  valor_profissional: DecimalBanco
  status: StatusRecebimento
  pagamentos: Array<{ forma_pagamento: FormaPagamento; valor: DecimalBanco }>
  status_fiscal: StatusFiscal
  registrado_em: TimestampComFuso
}

export interface ResumoProducao {
  quantidade: number
  pacientes_distintos: number
  bruto: DecimalBanco
  clinica_bruta: DecimalBanco
  profissional_bruta: DecimalBanco
  estornos_coorte: DecimalBanco
  estornos_clinica: DecimalBanco
  estornos_profissional: DecimalBanco
  liquido_atual_coorte: DecimalBanco
  clinica_liquida: DecimalBanco
  profissional_liquida: DecimalBanco
}

export interface ResumoEstornosPeriodo {
  quantidade: number
  total: DecimalBanco
  clinica: DecimalBanco
  profissional: DecimalBanco
}

export interface ResumoPagamentos {
  dinheiro: DecimalBanco
  pix: DecimalBanco
  cartao_credito: DecimalBanco
}

export interface ResumoRepasses {
  repasses_gerados_periodo: number
  valor_liquido_repasses_gerados_periodo: DecimalBanco
  repasses_ajustados_gerados_periodo: number
  repasses_pagos_periodo: number
  valor_repasses_pagos_periodo: DecimalBanco
  repasses_pendentes_atual: number
  valor_repasses_pendentes_atual: DecimalBanco
  aplicacoes_ajustes_periodo: DecimalBanco
  aplicacoes_provisorias_repasses_gerados_periodo: DecimalBanco
  aplicacoes_compensadas_repasses_gerados_periodo: DecimalBanco
}

export interface ResumoAjustes {
  quantidade_pendente: number
  valor_pendente_atual: DecimalBanco
  saldo_contabil_negativo_pendente: DecimalBanco
}

export type ResumoFiscal = Record<StatusFiscal, number>

export interface SerieFinanceira {
  dia: string
  bruto: DecimalBanco
  liquido_atual_coorte: DecimalBanco
  clinica_bruta: DecimalBanco
  profissional_bruta: DecimalBanco
  clinica_liquida: DecimalBanco
  profissional_liquida: DecimalBanco
  estornos_eventos: DecimalBanco
  estornos_eventos_clinica: DecimalBanco
  estornos_eventos_profissional: DecimalBanco
}

export interface ResumoCaixa {
  situacao_operacional_atual: Record<Extract<StatusCaixa, 'aberto' | 'em_fechamento' | 'aguardando_aprovacao' | 'devolvido_para_correcao'>, number>
  aprovados_periodo: {
    quantidade: number
    fechamentos_com_diferenca: number
    diferenca_total: DecimalBanco
    diferencas_positivas: DecimalBanco
    diferencas_negativas: DecimalBanco
  }
}

export interface RepasseListaDashboard {
  id: UUID
  data: TimestampComFuso
  clinica_id: UUID
  clinica_nome: string
  valor_bruto_profissional: DecimalBanco
  valor_estornos_antes_pagamento: DecimalBanco
  valor_ajustes_aplicados: DecimalBanco
  valor_liquido: DecimalBanco
  status: StatusRepasse
  confirmado_em: TimestampComFuso | null
  meio_pagamento: 'pix' | 'transferencia' | null
}

export interface ResumoDashboardComum {
  producao: ResumoProducao
  estornos_periodo: ResumoEstornosPeriodo
  pagamentos: ResumoPagamentos
  repasses: ResumoRepasses
  ajustes: ResumoAjustes
  series: SerieFinanceira[]
  lista_repasses?: RepasseListaDashboard[]
  lista_repasses_total?: number
  lista_repasses_limite?: number
}

export interface ResumoDashboardProprietaria extends ResumoDashboardComum {
  fiscal: ResumoFiscal
  caixa: ResumoCaixa
}

export interface AlertaFinanceiro {
  tipo: string
  prioridade: PrioridadeAlerta
  clinica_id: UUID
  entidade: string
  entidade_id: UUID
  data: TimestampComFuso
  mensagem: Record<string, unknown>
}

export interface DashboardBase<TResumo> {
  versao: 1
  inicio: TimestampComFuso
  fim: TimestampComFuso
  timezone_series: string
  clinicas_autorizadas: UUID[]
  consultado_em: TimestampComFuso
  escopos: Record<string, string>
  resumo: TResumo
}

export interface DashboardProfissional extends DashboardBase<ResumoDashboardComum> {}

export interface DashboardProprietaria extends DashboardBase<ResumoDashboardProprietaria> {
  por_clinica: Array<{ clinica_id: UUID; nome: string; resumo: ResumoDashboardProprietaria }>
  clinicas_total: number
  por_profissional: Array<{ profissional_id: UUID; nome: string; resumo: ResumoDashboardComum }>
  profissionais_total: number
  breakdown_limite: number
  alertas: AlertaFinanceiro[]
  alertas_total: number
  alertas_limite: number
}

export interface FiltrosDashboardProprietaria {
  clinicaId?: UUID | null
  profissionalId?: UUID | null
  pacienteId?: UUID | null
  formaPagamento?: FormaPagamento | null
  statusRecebimento?: StatusRecebimento | null
  statusRepasse?: StatusRepasse | null
  statusFiscal?: StatusFiscal | null
}

export interface LimitesAlertasFinanceiros {
  caixa_atencao?: number | null
  caixa_critico?: number | null
  repasse_dias_atencao?: number | null
  repasse_dias_critico?: number | null
  fiscal_dias_atencao?: number | null
  fiscal_dias_critico?: number | null
  estornos_percentual_atencao?: number | null
  estornos_percentual_critico?: number | null
}

export type EstadoCarregamento<T> =
  | { estado: 'ocioso' }
  | { estado: 'carregando'; dadosAnteriores?: T }
  | { estado: 'sucesso'; dados: T; vazio: boolean }
  | { estado: 'erro'; erro: Error; dadosAnteriores?: T }
