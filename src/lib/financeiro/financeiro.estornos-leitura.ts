import { mapearErroFinanceiro } from './financeiro.errors'
import { decimalBancoParaCentavos } from './financeiro.money'
import type { DecimalBanco, FormaPagamento, StatusRecebimento, UUID } from './financeiro.types'

export interface PagamentoOriginal {
  forma_pagamento: FormaPagamento
  valor: DecimalBanco
}

export interface EstornoExistente {
  id: UUID
  recebimento_id: UUID
  status: 'solicitado' | 'aprovado' | 'rejeitado' | 'efetivado'
  valor_total: DecimalBanco
  motivo: string
  solicitado_em: string
  pagamentos: PagamentoOriginal[]
}

export interface EstornoPendente extends EstornoExistente {
  paciente: string
  profissional: string
  valorOriginal: DecimalBanco
  pagamentosOriginais: PagamentoOriginal[]
}

export interface RecebimentoParaEstorno {
  id: UUID
  paciente: string
  profissional: string
  registrado_em: string
  valor_bruto: DecimalBanco
  status: StatusRecebimento
  pagamentos: PagamentoOriginal[]
  estornos: EstornoExistente[]
}

export interface PaginaRecebimentosEstorno {
  itens: RecebimentoParaEstorno[]
  haMais: boolean
}

const TAMANHO_PAGINA = 50

interface LinhaRecebimento {
  id: UUID
  paciente_id: UUID
  profissional_id: UUID
  registrado_em: string
  valor_bruto: DecimalBanco
  status: StatusRecebimento
  recebimentos_pagamentos: PagamentoOriginal[]
}

interface LinhaEstorno {
  id: UUID
  recebimento_id: UUID
  status: EstornoExistente['status']
  valor_total: DecimalBanco
  motivo: string
  solicitado_em: string
  estornos_pagamentos: PagamentoOriginal[]
}

async function nomesPorId(tabela: 'pacientes' | 'profissionais', ids: UUID[]): Promise<Map<UUID, string>> {
  if (!ids.length) return new Map()
  const { supabase } = await import('../supabase')
  const { data, error } = await supabase.from(tabela).select('id, nome_completo').in('id', [...new Set(ids)])
  if (error) throw error
  return new Map((data ?? []).map((linha) => [linha.id as UUID, linha.nome_completo as string]))
}

export async function listarRecebimentosParaEstorno(
  clinicaId: UUID,
  pagina = 0,
): Promise<PaginaRecebimentosEstorno> {
  if (!Number.isInteger(pagina) || pagina < 0) throw new Error('Página inválida.')
  try {
    const { supabase } = await import('../supabase')
    const inicio = pagina * TAMANHO_PAGINA
    const { data, error } = await supabase.from('recebimentos')
      .select('id, paciente_id, profissional_id, registrado_em, valor_bruto, status, recebimentos_pagamentos(forma_pagamento, valor)')
      .eq('clinica_id', clinicaId).in('status', ['confirmado', 'parcialmente_estornado'])
      .order('registrado_em', { ascending: false }).order('id', { ascending: false })
      .range(inicio, inicio + TAMANHO_PAGINA)
    if (error) throw error
    const linhas = (data ?? []) as unknown as LinhaRecebimento[]
    const exibidas = linhas.slice(0, TAMANHO_PAGINA)
    const ids = exibidas.map((linha) => linha.id)
    const [pacientes, profissionais, estornos] = await Promise.all([
      nomesPorId('pacientes', exibidas.map((linha) => linha.paciente_id)),
      nomesPorId('profissionais', exibidas.map((linha) => linha.profissional_id)),
      ids.length ? supabase.from('estornos')
        .select('id, recebimento_id, status, valor_total, motivo, solicitado_em, estornos_pagamentos(forma_pagamento, valor)')
        .in('recebimento_id', ids) : Promise.resolve({ data: [], error: null }),
    ])
    if (estornos.error) throw estornos.error
    const porRecebimento = new Map<UUID, EstornoExistente[]>()
    for (const linha of (estornos.data ?? []) as unknown as LinhaEstorno[]) {
      const anteriores = porRecebimento.get(linha.recebimento_id) ?? []
      anteriores.push({ id: linha.id, recebimento_id: linha.recebimento_id, status: linha.status,
        valor_total: linha.valor_total, motivo: linha.motivo, solicitado_em: linha.solicitado_em,
        pagamentos: linha.estornos_pagamentos ?? [] })
      porRecebimento.set(linha.recebimento_id, anteriores)
    }
    return {
      itens: exibidas.map((linha) => ({
        id: linha.id,
        paciente: pacientes.get(linha.paciente_id) ?? 'Paciente indisponível',
        profissional: profissionais.get(linha.profissional_id) ?? 'Profissional indisponível',
        registrado_em: linha.registrado_em,
        valor_bruto: linha.valor_bruto,
        status: linha.status,
        pagamentos: linha.recebimentos_pagamentos ?? [],
        estornos: porRecebimento.get(linha.id) ?? [],
      })),
      haMais: linhas.length > TAMANHO_PAGINA,
    }
  } catch (erro) {
    throw mapearErroFinanceiro(erro)
  }
}

export function saldoDisponivelPorForma(recebimento: RecebimentoParaEstorno): Record<FormaPagamento, bigint> {
  const saldos: Record<FormaPagamento, bigint> = { dinheiro: 0n, pix: 0n, cartao_credito: 0n }
  for (const pagamento of recebimento.pagamentos) {
    saldos[pagamento.forma_pagamento] += decimalBancoParaCentavos(pagamento.valor)
  }
  for (const estorno of recebimento.estornos) {
    if (estorno.status === 'rejeitado') continue
    for (const pagamento of estorno.pagamentos) {
      saldos[pagamento.forma_pagamento] -= decimalBancoParaCentavos(pagamento.valor)
    }
  }
  return saldos
}

export async function listarEstornosPendentes(clinicaId: UUID): Promise<EstornoPendente[]> {
  try {
    const { supabase } = await import('../supabase')
    const { data, error } = await supabase.from('estornos')
      .select('id, recebimento_id, status, valor_total, motivo, solicitado_em, estornos_pagamentos(forma_pagamento, valor)')
      .eq('clinica_id', clinicaId).eq('status', 'solicitado')
      .order('solicitado_em', { ascending: true }).limit(101)
    if (error) throw error
    if ((data ?? []).length > 100) throw new Error('Há mais de 100 estornos pendentes; a fila precisa de paginação.')
    const linhas = (data ?? []) as unknown as LinhaEstorno[]
    const ids = [...new Set(linhas.map((linha) => linha.recebimento_id))]
    if (!ids.length) return []
    const recebimentos = await supabase.from('recebimentos')
      .select('id, paciente_id, profissional_id, valor_bruto, recebimentos_pagamentos(forma_pagamento, valor)')
      .in('id', ids).eq('clinica_id', clinicaId)
    if (recebimentos.error) throw recebimentos.error
    const originais = recebimentos.data as unknown as Array<Pick<LinhaRecebimento, 'id' | 'paciente_id' | 'profissional_id' | 'valor_bruto' | 'recebimentos_pagamentos'>>
    const [pacientes, profissionais] = await Promise.all([
      nomesPorId('pacientes', originais.map((linha) => linha.paciente_id)),
      nomesPorId('profissionais', originais.map((linha) => linha.profissional_id)),
    ])
    const porId = new Map(originais.map((linha) => [linha.id, linha]))
    return linhas.map((linha) => {
      const original = porId.get(linha.recebimento_id)
      if (!original) throw new Error('Recebimento de estorno pendente não está visível.')
      return {
        id: linha.id, recebimento_id: linha.recebimento_id, status: linha.status,
        valor_total: linha.valor_total, motivo: linha.motivo, solicitado_em: linha.solicitado_em,
        pagamentos: linha.estornos_pagamentos ?? [],
        paciente: pacientes.get(original.paciente_id) ?? 'Paciente indisponível',
        profissional: profissionais.get(original.profissional_id) ?? 'Profissional indisponível',
        valorOriginal: original.valor_bruto,
        pagamentosOriginais: original.recebimentos_pagamentos ?? [],
      }
    })
  } catch (erro) { throw mapearErroFinanceiro(erro) }
}
