import { ErroFinanceiro, mapearErroFinanceiro } from './financeiro.errors'
import type { DecimalBanco, StatusRepasse, UUID } from './financeiro.types'

export interface RepasseOperacional {
  id: UUID
  profissional_id: UUID
  profissional: string
  gerado_em: string
  confirmado_em: string | null
  status: StatusRepasse
  valor_bruto_profissional: DecimalBanco
  valor_estornos_antes_pagamento: DecimalBanco
  valor_ajustes_aplicados: DecimalBanco
  valor_liquido: DecimalBanco
  meio_pagamento: string | null
  referencia_pagamento: string | null
  observacao: string | null
}

export interface DetalheRepasse {
  itens: Array<{
    recebimento_id: UUID
    paciente: string
    registrado_em: string
    valor_profissional_original: DecimalBanco
    valor_estornos_antes_pagamento: DecimalBanco
    valor_liquido: DecimalBanco
  }>
  aplicacoes: Array<{ valor_aplicado: DecimalBanco }>
}

const TAMANHO_PAGINA = 30

export async function listarRepasses(clinicaId: UUID, pagina: number, status: 'todos' | StatusRepasse): Promise<{ itens: RepasseOperacional[]; haMais: boolean }> {
  if (!Number.isInteger(pagina) || pagina < 0) throw new Error('Página inválida.')
  try {
    const { supabase } = await import('../supabase')
    let consulta = supabase.from('repasses')
      .select('id, profissional_id, gerado_em, confirmado_em, status, valor_bruto_profissional, valor_estornos_antes_pagamento, valor_ajustes_aplicados, valor_liquido, meio_pagamento, referencia_pagamento, observacao')
      .eq('clinica_id', clinicaId).order('gerado_em', { ascending: false }).order('id', { ascending: false })
      .range(pagina * TAMANHO_PAGINA, (pagina + 1) * TAMANHO_PAGINA)
    if (status !== 'todos') consulta = consulta.eq('status', status)
    const { data, error } = await consulta
    if (error) throw error
    const linhas = data ?? []
    const ids = [...new Set(linhas.map((linha) => linha.profissional_id))]
    const nomes = new Map<UUID, string>()
    if (ids.length) {
      const profissionais = await supabase.from('profissionais').select('id, nome_completo').in('id', ids)
      if (profissionais.error) throw profissionais.error
      for (const profissional of profissionais.data ?? []) nomes.set(profissional.id, profissional.nome_completo)
    }
    return { itens: linhas.slice(0, TAMANHO_PAGINA).map((linha) => ({ ...linha,
      profissional: nomes.get(linha.profissional_id) ?? 'Profissional indisponível' })) as RepasseOperacional[],
    haMais: linhas.length > TAMANHO_PAGINA }
  } catch (erro) { throw mapearErroFinanceiro(erro) }
}

export async function detalharRepasse(repasseId: UUID): Promise<DetalheRepasse> {
  try {
    const { supabase } = await import('../supabase')
    const [itens, aplicacoes] = await Promise.all([
      supabase.from('repasses_itens').select('recebimento_id, valor_profissional_original, valor_estornos_antes_pagamento, valor_liquido', { count: 'exact' }).eq('repasse_id', repasseId).limit(1000),
      supabase.from('aplicacoes_ajuste_repasse').select('valor_aplicado', { count: 'exact' }).eq('repasse_id', repasseId).limit(1000),
    ])
    if (itens.error) throw itens.error
    if (aplicacoes.error) throw aplicacoes.error
    if ((itens.count ?? 0) > 1000 || (aplicacoes.count ?? 0) > 1000) throw new ErroFinanceiro('resposta_invalida',
      'Composição extensa demais para a tela. Use o relatório paginado.')
    const recebimentoIds = (itens.data ?? []).map((item) => item.recebimento_id)
    const recebimentos = recebimentoIds.length ? await supabase.from('recebimentos').select('id, paciente_id, registrado_em').in('id', recebimentoIds)
      : { data: [], error: null }
    if (recebimentos.error) throw recebimentos.error
    const porId = new Map((recebimentos.data ?? []).map((linha) => [linha.id, linha]))
    if ((recebimentos.data ?? []).length !== recebimentoIds.length) throw new ErroFinanceiro('resposta_invalida',
      'Composição do repasse não está integralmente visível.')
    const pacientesIds = [...new Set((recebimentos.data ?? []).map((linha) => linha.paciente_id))]
    const pacientes = pacientesIds.length ? await supabase.from('pacientes').select('id, nome_completo').in('id', pacientesIds)
      : { data: [], error: null }
    if (pacientes.error) throw pacientes.error
    const nomes = new Map((pacientes.data ?? []).map((linha) => [linha.id, linha.nome_completo]))
    return { itens: (itens.data ?? []).map((item) => ({ ...item,
      paciente: nomes.get(porId.get(item.recebimento_id)!.paciente_id) ?? 'Paciente indisponível',
      registrado_em: porId.get(item.recebimento_id)!.registrado_em })),
    aplicacoes: aplicacoes.data ?? [] }
  } catch (erro) { throw mapearErroFinanceiro(erro) }
}
