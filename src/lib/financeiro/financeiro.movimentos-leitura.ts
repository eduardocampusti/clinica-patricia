import { mapearErroFinanceiro } from './financeiro.errors'
import { decimalBancoParaCentavos } from './financeiro.money'
import { FORMAS_PAGAMENTO } from './financeiro.types'
import type { DecimalBanco, FormaPagamento, UUID } from './financeiro.types'

export const TIPOS_MOVIMENTO = ['recebimento', 'suprimento', 'sangria', 'estorno', 'ajuste'] as const
export type TipoMovimento = typeof TIPOS_MOVIMENTO[number]
export interface CursorCaixa { id: UUID; instante: string }
export interface ParcelaMovimento { forma_pagamento: FormaPagamento; valor: DecimalBanco }
export interface MovimentoCaixa {
  id: UUID; tipo: TipoMovimento; valor: DecimalBanco; motivo: string | null; registrado_em: string
  clinica_id: UUID; sessao_caixa_id: UUID; recebimento_id: UUID | null; estorno_id: UUID | null
  paciente: string | null; profissional: string | null; pagamentos: ParcelaMovimento[]
  aberturaOrigem: string | null; outraSessao: boolean
}
interface LinhaMovimento extends Omit<MovimentoCaixa, 'paciente' | 'profissional' | 'pagamentos' | 'aberturaOrigem' | 'outraSessao'> {}
interface LinhaRecebimento {
  id: UUID; clinica_id: UUID; paciente_id: UUID; profissional_id: UUID; sessao_caixa_id: UUID
  recebimentos_pagamentos: ParcelaMovimento[]
}
interface LinhaEstorno { id: UUID; recebimento_id: UUID; estornos_pagamentos: ParcelaMovimento[] }
export interface SessaoHistorica {
  id: UUID; clinica_id: UUID; status: string; aberto_em: string; fechado_em: string | null
  valor_abertura: DecimalBanco; legado: boolean
}

// Cursor de leitura, nunca utilizado para autorização. Restringe a sintaxe do filtro PostgREST.
function validarCursor(cursor: CursorCaixa) {
  if (!/^[\w-]+$/.test(cursor.id) || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(cursor.instante) || !Number.isFinite(Date.parse(cursor.instante))) {
    throw new Error('Posição de leitura inválida. Atualize a consulta.')
  }
}
export function filtroCursorCaixa(campo: 'registrado_em' | 'aberto_em', cursor: CursorCaixa): string {
  validarCursor(cursor)
  return `${campo}.lt.${cursor.instante},and(${campo}.eq.${cursor.instante},id.lt.${cursor.id})`
}
const TAMANHO = 20

function validarComposicao(pagamentos: ParcelaMovimento[], valorMovimento: DecimalBanco) {
  if (!Array.isArray(pagamentos) || !pagamentos.length) throw new Error('Composição da movimentação indisponível. Atualize a consulta.')
  const formas = new Set<FormaPagamento>()
  let total = 0n
  for (const parcela of pagamentos) {
    if (!FORMAS_PAGAMENTO.includes(parcela.forma_pagamento) || formas.has(parcela.forma_pagamento)) throw new Error('Composição da movimentação inválida.')
    formas.add(parcela.forma_pagamento)
    const valor = decimalBancoParaCentavos(parcela.valor)
    if (valor <= 0n) throw new Error('Composição da movimentação inválida.')
    total += valor
  }
  if (total !== decimalBancoParaCentavos(valorMovimento)) throw new Error('Composição da movimentação divergente do valor registrado.')
}

export async function listarMovimentosCaixa(clinicaId: UUID, sessaoId: UUID, cursor: CursorCaixa | null = null, tipo?: TipoMovimento) {
  try {
    if (tipo && !TIPOS_MOVIMENTO.includes(tipo)) throw new Error('Tipo de movimento inválido.')
    const { supabase } = await import('../supabase')
    let query = supabase.from('movimentos_caixa')
      .select('id, clinica_id, sessao_caixa_id, tipo, valor, motivo, registrado_em, recebimento_id, estorno_id')
      .eq('clinica_id', clinicaId).eq('sessao_caixa_id', sessaoId)
      .order('registrado_em', { ascending: false }).order('id', { ascending: false }).limit(TAMANHO + 1)
    if (cursor) query = query.or(filtroCursorCaixa('registrado_em', cursor))
    if (tipo) query = query.eq('tipo', tipo)
    const resposta = await query
    if (resposta.error) throw resposta.error
    const linhas = (resposta.data ?? []) as LinhaMovimento[]
    if (linhas.some(m => m.clinica_id !== clinicaId || m.sessao_caixa_id !== sessaoId || !TIPOS_MOVIMENTO.includes(m.tipo))) throw new Error('Contexto das movimentações divergente.')
    const exibidas = linhas.slice(0, TAMANHO)
    const ids = [...new Set(exibidas.map(m => m.recebimento_id).filter((id): id is string => !!id))]
    const estornoIds = exibidas.map(m => m.estorno_id).filter((id): id is string => !!id)
    const [recebimentos, estornos] = await Promise.all([
      ids.length ? supabase.from('recebimentos').select('id, clinica_id, paciente_id, profissional_id, sessao_caixa_id, recebimentos_pagamentos(forma_pagamento, valor)').eq('clinica_id', clinicaId).in('id', ids) : Promise.resolve({ data: [], error: null }),
      estornoIds.length ? supabase.from('estornos').select('id, recebimento_id, estornos_pagamentos(forma_pagamento, valor)').eq('clinica_id', clinicaId).eq('status', 'efetivado').in('id', estornoIds) : Promise.resolve({ data: [], error: null }),
    ])
    if (recebimentos.error) throw recebimentos.error
    if (estornos.error) throw estornos.error
    const recebidas = (recebimentos.data ?? []) as unknown as LinhaRecebimento[]
    if (recebidas.some(r => r.clinica_id !== clinicaId)) throw new Error('Contexto dos recebimentos divergente.')
    const pacientesIds = [...new Set(recebidas.map(r => r.paciente_id))]
    const profissionaisIds = [...new Set(recebidas.map(r => r.profissional_id))]
    const sessoesIds = [...new Set(recebidas.map(r => r.sessao_caixa_id))]
    const [pacientes, profissionais, sessoes] = await Promise.all([
      pacientesIds.length ? supabase.from('pacientes').select('id, nome_completo').in('id', pacientesIds) : Promise.resolve({ data: [], error: null }),
      profissionaisIds.length ? supabase.from('profissionais').select('id, nome_completo').in('id', profissionaisIds) : Promise.resolve({ data: [], error: null }),
      sessoesIds.length ? supabase.from('sessoes_caixa').select('id, aberto_em').eq('clinica_id', clinicaId).in('id', sessoesIds) : Promise.resolve({ data: [], error: null }),
    ])
    for (const leitura of [pacientes, profissionais, sessoes]) if (leitura.error) throw leitura.error
    const nomesPacientes = new Map((pacientes.data ?? []).map(p => [p.id, p.nome_completo]))
    const nomesProfissionais = new Map((profissionais.data ?? []).map(p => [p.id, p.nome_completo]))
    const aberturas = new Map((sessoes.data ?? []).map(s => [s.id, s.aberto_em]))
    const originais = new Map(recebidas.map(r => [r.id, r]))
    const devolucoes = new Map(((estornos.data ?? []) as unknown as LinhaEstorno[]).map(e => [e.id, e]))
    const itens: MovimentoCaixa[] = exibidas.map(m => {
      const original = m.recebimento_id ? originais.get(m.recebimento_id) : undefined
      const devolucao = m.estorno_id ? devolucoes.get(m.estorno_id) : undefined
      // Falhar em vez de apresentar uma composição eletrônica/física incompleta.
      if (m.recebimento_id && !original) throw new Error('Recebimento vinculado indisponível. Atualize a consulta.')
      if (m.tipo === 'estorno' && (!devolucao || devolucao.recebimento_id !== m.recebimento_id)) throw new Error('Composição do estorno indisponível.')
      if (m.tipo === 'recebimento' && original?.sessao_caixa_id !== sessaoId) throw new Error('Sessão do recebimento divergente.')
      const pagamentos = m.tipo === 'recebimento' ? original!.recebimentos_pagamentos : m.tipo === 'estorno' ? devolucao!.estornos_pagamentos : [{ forma_pagamento: 'dinheiro' as const, valor: m.valor }]
      if (m.tipo === 'recebimento' || m.tipo === 'estorno') validarComposicao(pagamentos, m.valor)
      return { ...m, paciente: original ? nomesPacientes.get(original.paciente_id) ?? 'Paciente indisponível' : null,
        profissional: original ? nomesProfissionais.get(original.profissional_id) ?? 'Profissional indisponível' : null,
        pagamentos,
        aberturaOrigem: original ? aberturas.get(original.sessao_caixa_id) ?? null : null,
        outraSessao: !!original && original.sessao_caixa_id !== sessaoId }
    })
    const ultimo = exibidas.at(-1)
    return { itens, proximo: linhas.length > TAMANHO && ultimo ? { id: ultimo.id, instante: ultimo.registrado_em } : null }
  } catch (erro) { throw mapearErroFinanceiro(erro) }
}

export function valorAssinadoMovimento(movimento: Pick<MovimentoCaixa, 'tipo' | 'valor'>): bigint {
  const valor = decimalBancoParaCentavos(movimento.valor)
  return movimento.tipo === 'sangria' || movimento.tipo === 'estorno' ? -valor : valor
}

export async function listarHistoricoCaixa(clinicaId: UUID, cursor: CursorCaixa | null = null) {
  try {
    const { supabase } = await import('../supabase')
    let query = supabase.from('sessoes_caixa').select('id, clinica_id, status, aberto_em, fechado_em, valor_abertura, idempotency_key')
      .eq('clinica_id', clinicaId).order('aberto_em', { ascending: false }).order('id', { ascending: false }).limit(TAMANHO + 1)
    if (cursor) query = query.or(filtroCursorCaixa('aberto_em', cursor))
    const { data, error } = await query
    if (error) throw error
    if (data?.some(s => s.clinica_id !== clinicaId)) throw new Error('Contexto do histórico divergente.')
    const itens: SessaoHistorica[] = (data ?? []).slice(0, TAMANHO).map(({ idempotency_key, ...sessao }) => ({ ...sessao, legado: !idempotency_key }))
    const ultima = itens.at(-1)
    return { itens, proximo: (data?.length ?? 0) > TAMANHO && ultima ? { id: ultima.id, instante: ultima.aberto_em } : null }
  } catch (erro) { throw mapearErroFinanceiro(erro) }
}
