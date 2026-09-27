import { calcularIdade } from './pacienteIdade'
import { apenasDigitos, cpfValido } from './cpf'

export const CAMPOS_EDICAO = ['nome_completo', 'data_nascimento', 'sexo', 'telefone', 'email', 'endereco', 'observacoes'] as const
export type CampoEdicao = typeof CAMPOS_EDICAO[number]
export type DadosEdicao = Record<CampoEdicao, string | null>
export interface PacienteEdicao extends DadosEdicao {
  id: string; clinica_id: string; updated_at: string; foto_path: string | null; ativo: boolean; created_at: string
}
export interface ResponsavelEdicao { nome_completo: string; vinculo: string; telefone: string; cpf: string; email: string }
export const RESPONSAVEL_VAZIO: ResponsavelEdicao = { nome_completo: '', vinculo: '', telefone: '', cpf: '', email: '' }

/** Whitelist e diferenças: nunca envia dados protegidos ou valores não carregados. */
export function alteracoesAdministrativas(original: DadosEdicao, atual: DadosEdicao): Partial<DadosEdicao> {
  const patch: Partial<DadosEdicao> = {}
  for (const campo of CAMPOS_EDICAO) if (atual[campo] !== original[campo]) patch[campo] = atual[campo]
  return patch
}

export function validarEdicao(original: DadosEdicao, atual: DadosEdicao, responsavel: ResponsavelEdicao | null, hoje = new Date()): string | null {
  if (!atual.nome_completo?.trim()) return 'Informe o nome completo.'
  if (atual.data_nascimento && calcularIdade(atual.data_nascimento, hoje) === null) return 'Informe uma data de nascimento válida, não futura.'
  const anterior = calcularIdade(original.data_nascimento ?? '', hoje)
  if (anterior !== null && anterior < 18 && !atual.data_nascimento) return 'Não remova o nascimento de um menor conhecido.'
  if (atual.telefone && ![10, 11].includes(apenasDigitos(atual.telefone).length)) return 'Informe Telefone / WhatsApp com DDD e 10 ou 11 dígitos.'
  if (atual.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(atual.email)) return 'Informe um e-mail válido.'
  if (responsavel) {
    if (!responsavel.nome_completo.trim() || !responsavel.vinculo.trim() || ![10, 11].includes(apenasDigitos(responsavel.telefone).length)) return 'Informe nome, vínculo e Telefone / WhatsApp do responsável legal.'
    if (responsavel.cpf && !cpfValido(responsavel.cpf)) return 'CPF do responsável inválido.'
    if (responsavel.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsavel.email)) return 'Informe um e-mail válido para o responsável.'
  }
  return null
}

export function mensagemErroEdicao(codigo?: string): string {
  if (codigo === 'PT409' || codigo === '40001') return 'Este cadastro foi alterado por outra operação. Seus dados digitados foram mantidos. Reabra a edição para conferir a versão atual antes de tentar novamente.'
  if (codigo === 'PGRST202' || codigo === '42883') return 'O salvamento seguro da edição ainda não está disponível neste ambiente. Nenhuma alteração foi confirmada. A instalação do contrato de edição depende de revisão técnica.'
  if (codigo === '42501' || codigo === 'P0002') return 'Não foi possível autorizar a edição deste paciente nesta clínica.'
  if (codigo === '23514') return 'Confira o nascimento e o responsável legal. A alteração não foi concluída.'
  return 'Não foi possível confirmar o salvamento. Os dados digitados foram mantidos; confira a versão atual antes de repetir.'
}
