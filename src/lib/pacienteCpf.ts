import { supabase } from './supabase'
import { cpfValido } from './cpf'

export interface PacienteEncontradoPorCpf {
  id: string
  nome_completo: string
  data_nascimento: string | null
  telefone: string | null
  endereco: string | null
  ativo: boolean
}

export async function buscarPacientePorCpf(clinicaId: string, cpf: string): Promise<PacienteEncontradoPorCpf[]> {
  const { data, error } = await supabase.rpc('paciente_buscar_por_cpf', {
    p_clinica_id: clinicaId,
    p_cpf: cpf,
  })
  if (error) throw error
  return (data ?? []) as PacienteEncontradoPorCpf[]
}

export async function consultarCpfPendentePaciente(pacienteId: string, clinicaId: string, signal?: AbortSignal): Promise<boolean> {
  const consulta = supabase.rpc('paciente_cpf_pendente', {
    p_paciente_id: pacienteId,
    p_clinica_id: clinicaId,
  })
  const { data, error } = await (signal ? consulta.abortSignal(signal) : consulta)
  if (error) throw error
  if (typeof data !== 'boolean') throw new Error('Não foi possível confirmar a situação do CPF.')
  return data
}

/** Leitura individual: a RPC autoriza no banco e devolve null somente se ausente. */
export async function lerCpfPaciente(pacienteId: string, clinicaId: string, signal?: AbortSignal): Promise<string | null> {
  const consulta = supabase.rpc('paciente_ler_cpf', {
    p_paciente_id: pacienteId,
    p_clinica_id: clinicaId,
  })
  const { data, error } = await (signal ? consulta.abortSignal(signal) : consulta)
  if (error) throw error
  if (data === null) return null
  if (typeof data !== 'string' || !cpfValido(data)) throw new Error('Resposta inválida ao consultar CPF.')
  return data
}

export async function corrigirCpfPaciente(pacienteId: string, clinicaId: string, revisao: string, cpfNovo: string, motivo: string): Promise<string> {
  const { data, error } = await supabase.rpc('paciente_corrigir_cpf', {
    p_paciente_id: pacienteId,
    p_clinica_id: clinicaId,
    p_updated_at: revisao,
    p_cpf_novo: cpfNovo,
    p_motivo: motivo,
  })
  if (error) throw error
  if (typeof data !== 'string' || !Number.isFinite(Date.parse(data))) throw new Error('Resposta inválida ao corrigir CPF.')
  return data
}

export function mensagemErroCorrigirCpf(erro: unknown): string {
  const codigo = typeof erro === 'object' && erro !== null && 'code' in erro ? String(erro.code) : ''
  if (codigo === '23505') return 'Já existe um paciente com este CPF nesta clínica, inclusive entre os inativos.'
  if (codigo === '22023') return 'Confira o novo CPF e o motivo informado.'
  if (codigo === 'PT409') return 'O cadastro foi alterado em outra operação. Feche e reabra a ficha antes de corrigir o CPF.'
  if (codigo === '42501') return 'Você não tem permissão para corrigir o CPF deste paciente nesta clínica.'
  if (codigo === 'P0001') return 'Este cadastro ainda não tem CPF. Use Adicionar CPF.'
  return 'Não foi possível atualizar o CPF. Tente novamente.'
}

export async function definirCpfPaciente(pacienteId: string, clinicaId: string, cpf: string): Promise<void> {
  const { error } = await supabase.rpc('paciente_definir_cpf', {
    p_paciente_id: pacienteId,
    p_clinica_id: clinicaId,
    p_cpf: cpf,
  })
  if (error) throw error
}

export function mensagemErroDefinirCpf(erro: unknown): string {
  const codigo = typeof erro === 'object' && erro !== null && 'code' in erro ? String(erro.code) : ''
  if (codigo === '23505') return 'Este CPF já está cadastrado para outro paciente desta clínica, inclusive entre os inativos.'
  if (codigo === '22023') return 'Confira o CPF informado. Ele deve ter 11 dígitos válidos.'
  if (codigo === '42501') return 'Você não tem permissão para alterar o CPF deste paciente.'
  return 'Não foi possível adicionar o CPF. Tente novamente.'
}
