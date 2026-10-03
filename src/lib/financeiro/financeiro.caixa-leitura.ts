import { mapearErroFinanceiro } from './financeiro.errors'
import { executarRpcFinanceira, type ExecutorRpcFinanceiro } from './financeiro.rpc'
import type { DecimalBanco, StatusCaixa, UUID } from './financeiro.types'

export interface ResumoOperacionalCaixa {
  valor_abertura: DecimalBanco
  total_dinheiro: DecimalBanco
  total_pix: DecimalBanco
  total_cartao_credito: DecimalBanco
  total_recebimentos_brutos: DecimalBanco
  total_suprimentos: DecimalBanco
  total_sangrias: DecimalBanco
  total_estornos_dinheiro: DecimalBanco
  valor_esperado: DecimalBanco
  total_clinica: DecimalBanco
  total_profissionais: DecimalBanco
}

export interface CaixaOperacional {
  sessao_caixa_id: UUID
  clinica_id: UUID
  clinica_nome: string
  status: StatusCaixa
  aberto_em: string
  aberto_por_nome: string | null
  resumo: ResumoOperacionalCaixa
}

export type EstadoCaixaAtual =
  | { tipo: 'sem_caixa' }
  | { tipo: 'legado'; abertoEm: string; valorAbertura: DecimalBanco }
  | { tipo: 'operacional'; caixa: CaixaOperacional }

export interface SangriaCaixa {
  id: UUID
  valor: DecimalBanco
  motivo: string
  status: 'solicitada' | 'aprovada' | 'rejeitada' | 'efetivada'
  solicitado_em: string
  observacao_revisao: string | null
}

export interface FechamentoCaixa {
  id: UUID
  tentativa: number
  status: 'aguardando_aprovacao' | 'aprovado' | 'devolvido'
  valor_esperado: DecimalBanco
  valor_contado: DecimalBanco
  diferenca: DecimalBanco
  justificativa_diferenca: string | null
  enviado_em: string
}

export interface DetalhesCaixa {
  sangrias: SangriaCaixa[]
  ultimoFechamento: FechamentoCaixa | null
  observacaoUltimaRevisao: string | null
}

const STATUS_ATIVOS: StatusCaixa[] = [
  'aberto', 'em_fechamento', 'aguardando_aprovacao', 'devolvido_para_correcao',
]

export async function consultarResumoCaixa(
  sessaoCaixaId: UUID,
  executor?: ExecutorRpcFinanceiro,
): Promise<CaixaOperacional> {
  return executarRpcFinanceira<CaixaOperacional>(
    'financeiro_resumo_caixa',
    { p_sessao_caixa_id: sessaoCaixaId },
    executor,
  )
}

export async function consultarCaixaAtual(clinicaId: UUID): Promise<EstadoCaixaAtual> {
  try {
    const { supabase } = await import('../supabase')
    const { data, error } = await supabase
      .from('sessoes_caixa')
      .select('id, status, aberto_em, valor_abertura, idempotency_key')
      .eq('clinica_id', clinicaId)
      .in('status', STATUS_ATIVOS)
      .maybeSingle()
    if (error) throw error
    if (!data) return { tipo: 'sem_caixa' }
    // Chave nula caracteriza a sessão anterior às RPCs homologadas.
    // A RPC também rejeita qualquer sessão com entradas_caixa; nunca contorná-la.
    if (!data.idempotency_key) {
      return { tipo: 'legado', abertoEm: data.aberto_em, valorAbertura: data.valor_abertura }
    }
    const caixa = await consultarResumoCaixa(data.id)
    if (caixa.clinica_id !== clinicaId || caixa.sessao_caixa_id !== data.id) {
      throw new Error('Contexto da resposta do caixa divergente.')
    }
    return { tipo: 'operacional', caixa }
  } catch (erro) {
    throw mapearErroFinanceiro(erro)
  }
}

export async function consultarDetalhesCaixa(sessaoCaixaId: UUID): Promise<DetalhesCaixa> {
  try {
    const { supabase } = await import('../supabase')
    const [sangrias, fechamento] = await Promise.all([
      supabase.from('sangrias_caixa')
        .select('id, valor, motivo, status, solicitado_em, observacao_revisao')
        .eq('sessao_caixa_id', sessaoCaixaId)
        .order('solicitado_em', { ascending: false }).limit(50),
      supabase.from('fechamentos_caixa')
        .select('id, tentativa, status, valor_esperado, valor_contado, diferenca, justificativa_diferenca, enviado_em')
        .eq('sessao_caixa_id', sessaoCaixaId)
        .order('tentativa', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (sangrias.error) throw sangrias.error
    if (fechamento.error) throw fechamento.error
    let observacaoUltimaRevisao: string | null = null
    if (fechamento.data) {
      const revisao = await supabase.from('revisoes_fechamento_caixa')
        .select('observacao').eq('fechamento_id', fechamento.data.id).maybeSingle()
      if (revisao.error) throw revisao.error
      observacaoUltimaRevisao = revisao.data?.observacao ?? null
    }
    return {
      sangrias: (sangrias.data ?? []) as SangriaCaixa[],
      ultimoFechamento: fechamento.data as FechamentoCaixa | null,
      observacaoUltimaRevisao,
    }
  } catch (erro) {
    throw mapearErroFinanceiro(erro)
  }
}
