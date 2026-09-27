import { supabase } from './supabase'

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

export async function consultarCpfPendentePaciente(pacienteId: string, clinicaId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('paciente_cpf_pendente', {
    p_paciente_id: pacienteId,
    p_clinica_id: clinicaId,
  })
  if (error) throw error
  return data === true
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
