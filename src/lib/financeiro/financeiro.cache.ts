export type LeituraFinanceira =
  | 'agenda'
  | 'caixa'
  | 'recebimentos'
  | 'estornos'
  | 'repasses'
  | 'fiscal'
  | 'dashboard_proprietaria'
  | 'dashboard_profissional'
  | 'relatorios'

export type MutacaoFinanceira =
  | 'recebimento'
  | 'caixa'
  | 'estorno'
  | 'repasse'
  | 'fiscal'
  | 'configuracao_alertas'

export const INVALIDACOES_FINANCEIRAS: Record<MutacaoFinanceira, readonly LeituraFinanceira[]> = {
  recebimento: ['agenda', 'caixa', 'recebimentos', 'fiscal', 'dashboard_proprietaria', 'dashboard_profissional', 'relatorios'],
  caixa: ['caixa', 'repasses', 'dashboard_proprietaria', 'dashboard_profissional', 'relatorios'],
  estorno: ['caixa', 'recebimentos', 'estornos', 'repasses', 'dashboard_proprietaria', 'dashboard_profissional', 'relatorios'],
  repasse: ['repasses', 'dashboard_proprietaria', 'dashboard_profissional', 'relatorios'],
  fiscal: ['fiscal', 'dashboard_proprietaria', 'relatorios'],
  configuracao_alertas: ['dashboard_proprietaria'],
}

export interface InvalidacaoFinanceira { clinicaId: string; leituras: readonly LeituraFinanceira[] }
const assinantes = new Set<(evento: InvalidacaoFinanceira) => void>()
export function assinarInvalidacaoFinanceira(assinante: (evento: InvalidacaoFinanceira) => void): () => void {
  assinantes.add(assinante)
  return () => { assinantes.delete(assinante) }
}
export function invalidarFinanceiro(mutacao: MutacaoFinanceira, clinicaId: string): void {
  for (const assinante of assinantes) {
    // Uma falha de atualização de tela jamais transforma pagamento confirmado em falha.
    try { assinante({ clinicaId, leituras: INVALIDACOES_FINANCEIRAS[mutacao] }) } catch (erro) {
      if (import.meta.env?.DEV) console.error('[financeiro:invalidacao]', erro)
    }
  }
}

export function chaveConsultaFinanceira(
  leitura: LeituraFinanceira,
  contexto: Record<string, string | number | boolean | null | undefined>,
): readonly unknown[] {
  return [
    'financeiro',
    leitura,
    ...Object.entries(contexto)
      .filter(([, valor]) => valor !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)),
  ] as const
}
