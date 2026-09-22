import { reconciliarRelatorioDetalhado } from './financeiroRelatoriosReconciliacao'
import { mapearErroFinanceiro } from './financeiro/financeiro.errors'

export { reconciliarRelatorioDetalhado } from './financeiroRelatoriosReconciliacao'

export type RpcRelatorio =
  | 'financeiro_relatorio_recebimentos_proprietaria'
  | 'financeiro_relatorio_recebimentos_profissional'
  | 'financeiro_relatorio_repasses_proprietaria'
  | 'financeiro_relatorio_repasses_profissional'
  | 'financeiro_relatorio_fiscal_proprietaria'

export interface CursorRelatorio {
  data: string
  id: string
  contexto: string
}

export interface PaginaRelatorio<T extends Record<string, unknown>> {
  versao: number
  dataset: string
  publico: 'proprietaria' | 'profissional'
  inicio: string
  fim: string
  timezone: string
  contexto: string
  marcador: string
  modo?: 'gerados_periodo' | 'pagos_periodo' | 'pendentes_atuais'
  itens: T[]
  totais: Record<string, unknown>
  pagina: {
    limite: number
    quantidade: number
    tem_mais: boolean
    proximo_cursor: CursorRelatorio | null
  }
}

export interface RelatorioCompleto<T extends Record<string, unknown>>
  extends Omit<PaginaRelatorio<T>, 'pagina'> {
  paginasCarregadas: number
}

export interface OpcoesColeta {
  limitePagina?: number
  limiteSeguranca?: number
  aoProgredir?: (carregados: number, totalInformado: number | null) => void
  executorRpc?: ExecutorRelatorio
}

export type ExecutorRelatorio = (
  rpc: RpcRelatorio,
  parametros: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>

const executarRelatorioSupabase: ExecutorRelatorio = async (rpc, parametros) => {
  const { supabase } = await import('./supabase')
  const resposta = await supabase.rpc(rpc, parametros)
  return { data: resposta.data as unknown, error: resposta.error }
}

function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new Error('Resposta inválida do relatório financeiro.')
  }
  return valor as Record<string, unknown>
}

function paginaValida<T extends Record<string, unknown>>(valor: unknown): PaginaRelatorio<T> {
  const raiz = objeto(valor)
  const pagina = objeto(raiz.pagina)
  if (
    !Array.isArray(raiz.itens)
    || typeof pagina.tem_mais !== 'boolean'
    || typeof raiz.contexto !== 'string'
    || typeof raiz.marcador !== 'string'
  ) {
    throw new Error('Paginação inválida no relatório financeiro.')
  }
  const cursor = pagina.proximo_cursor
  if (pagina.tem_mais) {
    const proximo = objeto(cursor)
    if (
      typeof proximo.data !== 'string'
      || typeof proximo.id !== 'string'
      || typeof proximo.contexto !== 'string'
    ) {
      throw new Error('Cursor inválido no relatório financeiro.')
    }
  }
  return valor as PaginaRelatorio<T>
}

function assinatura(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(assinatura).join(',')}]`
  if (valor && typeof valor === 'object') {
    return `{${Object.entries(valor as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave, item]) => `${JSON.stringify(chave)}:${assinatura(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(valor)
}

function totalInformado(totais: Record<string, unknown>): number | null {
  const quantidade = totais.quantidade
  if (typeof quantidade === 'number' && Number.isSafeInteger(quantidade)) return quantidade
  if (typeof quantidade === 'string' && /^\d+$/.test(quantidade)) return Number(quantidade)
  return null
}

export async function coletarRelatorioCompleto<T extends Record<string, unknown>>(
  rpc: RpcRelatorio,
  parametros: Record<string, unknown>,
  opcoes: OpcoesColeta = {},
): Promise<RelatorioCompleto<T>> {
  const limitePagina = opcoes.limitePagina ?? 500
  const limiteSeguranca = opcoes.limiteSeguranca ?? 50_000
  const executorRpc = opcoes.executorRpc ?? executarRelatorioSupabase
  if (!Number.isInteger(limitePagina) || limitePagina < 1 || limitePagina > 500) {
    throw new Error('Limite de página deve estar entre 1 e 500.')
  }
  if (!Number.isInteger(limiteSeguranca) || limiteSeguranca < limitePagina) {
    throw new Error('Limite de segurança inválido para a exportação.')
  }

  let cursor: CursorRelatorio | null = null
  let primeira: PaginaRelatorio<T> | null = null
  let paginasCarregadas = 0
  const itens: T[] = []
  const cursores = new Set<string>()
  let assinaturaTotais: string | null = null
  let contexto: string | null = null
  let marcador: string | null = null

  do {
    const respostaRpc = await executorRpc(rpc, {
      ...parametros,
      p_limite: limitePagina,
      p_cursor_data: cursor?.data ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_cursor_contexto: cursor?.contexto ?? null,
    })
    if (respostaRpc.error) {
      throw mapearErroFinanceiro(respostaRpc.error)
    }
    const atual: PaginaRelatorio<T> = paginaValida<T>(respostaRpc.data as unknown)
    primeira ??= atual
    assinaturaTotais ??= assinatura(atual.totais)
    contexto ??= atual.contexto
    marcador ??= atual.marcador
    if (
      atual.contexto !== contexto
      || atual.marcador !== marcador
      || assinatura(atual.totais) !== assinaturaTotais
    ) {
      throw new Error('Os dados financeiros mudaram durante a exportação. Gere o relatório novamente.')
    }
    paginasCarregadas += 1
    itens.push(...atual.itens)

    if (itens.length > limiteSeguranca) {
      throw new Error(
        `Exportação excedeu o limite seguro de ${limiteSeguranca} registros. Reduza o período ou os filtros.`,
      )
    }
    opcoes.aoProgredir?.(itens.length, totalInformado(atual.totais))

    cursor = atual.pagina.tem_mais ? atual.pagina.proximo_cursor : null
    if (atual.pagina.tem_mais && !cursor) {
      throw new Error('Relatório informou continuação sem fornecer cursor.')
    }
    if (cursor) {
      if (cursor.contexto !== contexto) throw new Error('Cursor não pertence ao contexto desta exportação.')
      const chave = `${cursor.data}|${cursor.id}|${cursor.contexto}`
      if (cursores.has(chave)) throw new Error('Cursor repetido detectado na exportação.')
      cursores.add(chave)
    }
  } while (cursor)

  if (!primeira) throw new Error('Relatório não retornou uma página inicial.')
  const esperado = totalInformado(primeira.totais)
  if (esperado !== null && itens.length !== esperado) {
    throw new Error(`Exportação incompleta: banco informou ${esperado} registros e foram carregados ${itens.length}.`)
  }

  const verificacaoFinalRpc = await executorRpc(rpc, {
    ...parametros,
    p_limite: 1,
    p_cursor_data: null,
    p_cursor_id: null,
    p_cursor_contexto: null,
  })
  if (verificacaoFinalRpc.error) {
    throw mapearErroFinanceiro(verificacaoFinalRpc.error)
  }
  const verificacaoFinal = paginaValida<T>(verificacaoFinalRpc.data as unknown)
  if (
    verificacaoFinal.contexto !== contexto
    || verificacaoFinal.marcador !== marcador
    || assinatura(verificacaoFinal.totais) !== assinaturaTotais
  ) {
    throw new Error('Os dados financeiros mudaram durante a exportação. Gere o relatório novamente.')
  }

  reconciliarRelatorioDetalhado(primeira.dataset, itens, primeira.totais)

  const { pagina: _pagina, ...metadados } = primeira
  void _pagina
  return { ...metadados, itens, paginasCarregadas }
}

export async function registrarSolicitacaoExportacao(parametros: {
  publico: 'proprietaria' | 'profissional'
  dataset: 'recebimentos' | 'repasses' | 'fiscal' | 'financeiro_consolidado' | 'financeiro_profissional'
  formato: 'pdf' | 'xlsx'
  inicio: string
  fim: string
  clinicaId?: string | null
  filtros?: Record<string, string | boolean | null>
}): Promise<{ solicitacao_id: string; registrado_em: string }> {
  const { supabase } = await import('./supabase')
  const { data, error } = await supabase.rpc('financeiro_registrar_solicitacao_exportacao', {
    p_publico: parametros.publico,
    p_dataset: parametros.dataset,
    p_formato: parametros.formato,
    p_inicio: parametros.inicio,
    p_fim: parametros.fim,
    p_clinica_id: parametros.clinicaId ?? null,
    p_filtros: parametros.filtros ?? {},
  })
  if (error) throw mapearErroFinanceiro(error)
  const resposta = objeto(data)
  if (typeof resposta.solicitacao_id !== 'string' || typeof resposta.registrado_em !== 'string') {
    throw new Error('Resposta inválida da auditoria de exportação.')
  }
  return {
    solicitacao_id: resposta.solicitacao_id,
    registrado_em: resposta.registrado_em,
  }
}
