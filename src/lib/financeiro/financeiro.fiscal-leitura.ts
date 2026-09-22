import { mapearErroFinanceiro } from './financeiro.errors'
import type { StatusFiscal, UUID } from './financeiro.types'

export interface DocumentoFiscalOperacional {
  id: UUID
  recebimento_id: UUID
  paciente: string
  status: StatusFiscal
  created_at: string
  updated_at: string
  solicitado_em: string | null
  emitido_em: string | null
  cancelamento_solicitado_em: string | null
  cancelado_em: string | null
  numero_documento: string | null
  serie: string | null
}

const TAMANHO_PAGINA = 30

export async function listarDocumentosFiscais(clinicaId: UUID, pagina: number, status: 'todos' | StatusFiscal): Promise<{ itens: DocumentoFiscalOperacional[]; haMais: boolean }> {
  if (!Number.isInteger(pagina) || pagina < 0) throw new Error('Página inválida.')
  try {
    const { supabase } = await import('../supabase')
    let consulta = supabase.from('documentos_fiscais')
      .select('id, recebimento_id, status, created_at, updated_at, solicitado_em, emitido_em, cancelamento_solicitado_em, cancelado_em, numero_documento, serie')
      .eq('clinica_id', clinicaId).order('updated_at', { ascending: false }).order('id', { ascending: false })
      .range(pagina * TAMANHO_PAGINA, (pagina + 1) * TAMANHO_PAGINA)
    if (status !== 'todos') consulta = consulta.eq('status', status)
    const { data, error } = await consulta
    if (error) throw error
    const linhas = data ?? []
    const exibidas = linhas.slice(0, TAMANHO_PAGINA)
    const recebimentoIds = exibidas.map((linha) => linha.recebimento_id)
    const recebimentos = recebimentoIds.length ? await supabase.from('recebimentos').select('id, paciente_id').in('id', recebimentoIds)
      : { data: [], error: null }
    if (recebimentos.error) throw recebimentos.error
    const pacientePorRecebimento = new Map((recebimentos.data ?? []).map((linha) => [linha.id, linha.paciente_id]))
    const pacienteIds = [...new Set((recebimentos.data ?? []).map((linha) => linha.paciente_id))]
    const pacientes = pacienteIds.length ? await supabase.from('pacientes').select('id, nome_completo').in('id', pacienteIds)
      : { data: [], error: null }
    if (pacientes.error) throw pacientes.error
    const nomes = new Map((pacientes.data ?? []).map((linha) => [linha.id, linha.nome_completo]))
    return { itens: exibidas.map((linha) => ({ ...linha,
      paciente: nomes.get(pacientePorRecebimento.get(linha.recebimento_id) ?? '') ?? 'Paciente indisponível' })) as DocumentoFiscalOperacional[],
    haMais: linhas.length > TAMANHO_PAGINA }
  } catch (erro) { throw mapearErroFinanceiro(erro) }
}
