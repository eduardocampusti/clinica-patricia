import { supabase } from './supabase'

export interface AtuacaoEquipe {
  membro_id: string; profissional_id: string; clinica_id: string
  duracao_minutos: number; profissional_atualizado_em: string; pode_editar_duracao: boolean
  valor_consulta: number | null; vinculo_atualizado_em: string
  percentual_clinica: number | null; vigente_desde: string | null; vigente_ate: string | null
  servicos_vinculados: null
  catalogo: { id: string; nome: string; duracao_minutos: number; preco: number }[]
  horarios: { dia_semana: number; hora_inicio: string; hora_fim: string }[]
  excecoes: { data: string; tipo: string; hora_inicio: string | null; hora_fim: string | null }[]
}
export function mensagemAtuacao(erro: unknown, escrita = false): string {
  const code = (erro as { code?: string } | null)?.code
  if (code === '42501') return 'Você não tem autorização para esta atuação na clínica escolhida.'
  if (code === 'PT409') return 'A configuração mudou em outra sessão. Reconsulte antes de salvar.'
  if (code === '22023') return 'Revise a configuração e o vínculo profissional.'
  return escrita ? 'A confirmação não chegou. Reconsulte antes de tentar novamente; seu preenchimento foi preservado.'
    : 'Atuação indisponível neste ambiente. Não foi possível confirmar as configurações; isso não significa ausência de cadastro.'
}
export function conferirAtuacao(valor: unknown, membro: string, clinica: string): AtuacaoEquipe {
  const d = valor as AtuacaoEquipe | null
  const data = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v))
  const dinheiro = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0)
  const hora = (v: unknown) => typeof v === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(v)
  if (!d || d.membro_id !== membro || d.clinica_id !== clinica || typeof d.profissional_id !== 'string' || !d.profissional_id
    || !Number.isSafeInteger(d.duracao_minutos) || d.duracao_minutos <= 0 || typeof d.pode_editar_duracao !== 'boolean'
    || !data(d.profissional_atualizado_em) || !data(d.vinculo_atualizado_em) || !dinheiro(d.valor_consulta)
    || !dinheiro(d.percentual_clinica) || (d.percentual_clinica !== null && d.percentual_clinica > 100)
    || (d.vigente_desde !== null && !data(d.vigente_desde)) || (d.vigente_ate !== null && !data(d.vigente_ate))
    || d.servicos_vinculados !== null || !Array.isArray(d.catalogo) || !Array.isArray(d.horarios) || !Array.isArray(d.excecoes)
    || d.catalogo.some(s => !s || typeof s.id !== 'string' || typeof s.nome !== 'string' || !Number.isInteger(s.duracao_minutos) || s.duracao_minutos < 1 || typeof s.preco !== 'number' || !dinheiro(s.preco))
    || d.horarios.some(h => !h || !Number.isInteger(h.dia_semana) || h.dia_semana < 0 || h.dia_semana > 6 || !hora(h.hora_inicio) || !hora(h.hora_fim))
    || d.excecoes.some(e => !e || !/^\d{4}-\d{2}-\d{2}$/.test(e.data) || !['folga', 'horario_especial'].includes(e.tipo) || (e.hora_inicio !== null && !hora(e.hora_inicio)) || (e.hora_fim !== null && !hora(e.hora_fim)))) throw new Error(mensagemAtuacao(null))
  return d
}
export async function buscarAtuacao(membro: string, clinica: string): Promise<AtuacaoEquipe> {
  const { data, error } = await supabase.rpc('equipe_atuacao_obter', { p_membro_id: membro, p_clinica_id: clinica })
  if (error) throw error
  return conferirAtuacao(data, membro, clinica)
}
export function valorAtuacao(campo: 'duracao' | 'preco', texto: string): number | null {
  const t = texto.trim()
  if (campo === 'preco' && !t) return null
  if (!(campo === 'duracao' ? /^\d+$/ : /^\d+([,.]\d{1,2})?$/).test(t)) throw new Error('Informe um valor válido.')
  const n = Number(t.replace(',', '.'))
  if (!Number.isFinite(n) || (campo === 'duracao' ? n < 1 || n > 2147483647 : n >= 10000000000)) throw new Error('Informe um valor válido.')
  return n
}
export async function salvarAtuacao(atual: AtuacaoEquipe, campo: 'duracao' | 'preco', texto: string): Promise<AtuacaoEquipe> {
  const esperado = valorAtuacao(campo, texto)
  const { data, error } = await supabase.rpc('equipe_atuacao_salvar', {
    p_membro_id: atual.membro_id, p_clinica_id: atual.clinica_id, p_campo: campo, p_valor: esperado,
    p_atualizado_em: campo === 'duracao' ? atual.profissional_atualizado_em : atual.vinculo_atualizado_em,
  })
  if (error) throw error
  const d = conferirAtuacao(data, atual.membro_id, atual.clinica_id)
  if (d.profissional_id !== atual.profissional_id || (campo === 'duracao' ? d.duracao_minutos : d.valor_consulta) !== esperado) throw new Error(mensagemAtuacao(null, true))
  return d
}
