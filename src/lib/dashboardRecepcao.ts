import { supabase } from './supabase'
import { FUSO_PACIENTES } from './pacienteLista'

export const SITUACOES_RECEPCAO = ['aguardando', 'previstos', 'em_atendimento', 'concluido'] as const
export type SituacaoRecepcao = typeof SITUACOES_RECEPCAO[number]
export interface RegistroRecepcao {
  id: string; clinica_id: string; paciente_id: string; profissional_id: string
  data: string; hora_inicio: string; status: 'agendado' | 'confirmado' | 'aguardando' | 'em_atendimento' | 'concluido'
  updated_at: string; pacientes: { nome_completo: string } | null
  profissionais: { nome_completo: string; especialidades: { nome: string } | null } | null
}
export interface MovimentoRecepcao { registros: RegistroRecepcao[]; consultadoEm: string }
const TAMANHO_PAGINA = 200

export function situacaoRecepcao(r: RegistroRecepcao): SituacaoRecepcao {
  return r.status === 'agendado' || r.status === 'confirmado' ? 'previstos' : r.status
}
export function horaNaBahia(agora = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO_PACIENTES, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(agora)
}
export function erroLeituraPainel(erro: unknown): 'permissao' | 'leitura' {
  const e = erro as { code?: string; codigo?: string }
  return e?.code === '42501' || e?.code === '28000' || ['nao_autorizado', 'clinica_nao_autorizada', 'nao_autenticado'].includes(e?.codigo ?? '') ? 'permissao' : 'leitura'
}
// Paginação completa por clínica/data. Cada página exige contagem exata; respostas
// cortadas, duplicadas ou alteradas durante a leitura não produzem totais parciais.
export async function consultarMovimentoRecepcao(clinicaId: string, dataLocal: string, signal: AbortSignal): Promise<MovimentoRecepcao> {
  const base = () => supabase.from('agendamentos').select('id, clinica_id, paciente_id, profissional_id, data, hora_inicio, status, updated_at, pacientes(nome_completo), profissionais(nome_completo, especialidades(nome))', { count: 'exact' })
    .eq('clinica_id', clinicaId).eq('data', dataLocal).neq('status', 'cancelado')
  const registros: RegistroRecepcao[] = []
  const ids = new Set<string>()
  let total: number | null = null
  let ultimaRevisao = ''
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error, count } = await base().order('id', { ascending: true }).range(inicio, inicio + TAMANHO_PAGINA - 1).abortSignal(signal)
    if (error) throw error
    if (!Number.isSafeInteger(count) || count === null || count < 0 || (total !== null && total !== count)) throw new Error('Contagem não confirmada ou dados alterados.')
    total = count
    const linhas = (data ?? []) as unknown as RegistroRecepcao[]
    if (linhas.length !== Math.min(TAMANHO_PAGINA, Math.max(0, total - inicio))) throw new Error('Leitura incompleta dos agendamentos.')
    for (const r of linhas) {
      if (ids.has(r.id) || r.clinica_id !== clinicaId || r.data !== dataLocal || !r.paciente_id || !r.profissional_id || !['agendado', 'confirmado', 'aguardando', 'em_atendimento', 'concluido'].includes(r.status) || !Number.isFinite(Date.parse(r.updated_at))) throw new Error('Resposta de agendamentos inválida.')
      ids.add(r.id); registros.push(r)
      if (r.updated_at > ultimaRevisao) ultimaRevisao = r.updated_at
    }
    if (registros.length === total) break
    // Limite operacional explícito; nunca converter leitura interrompida em total.
    if (inicio >= 19800) throw new Error('Volume do dia excede a leitura segura do painel.')
  }
  const revisao = await supabase.from('agendamentos').select('updated_at', { count: 'exact' }).eq('clinica_id', clinicaId).eq('data', dataLocal).neq('status', 'cancelado').order('updated_at', { ascending: false }).limit(1).abortSignal(signal)
  if (revisao.error) throw revisao.error
  if (revisao.count !== total || (revisao.data?.[0]?.updated_at ?? '') !== ultimaRevisao) throw new Error('Os agendamentos mudaram durante a consulta. Atualize novamente.')
  return { registros: registros.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio) || a.id.localeCompare(b.id)), consultadoEm: new Date().toISOString() }
}
