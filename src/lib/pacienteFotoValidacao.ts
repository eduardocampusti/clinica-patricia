export const TAMANHO_MAXIMO_FOTO_PACIENTE = 5 * 1024 * 1024
export const TIPOS_FOTO_PACIENTE = ['image/jpeg', 'image/png', 'image/webp'] as const

export interface FotoPacienteValidada {
  arquivo: File
  extensao: 'jpg' | 'png' | 'webp'
}

function extensaoDoTipo(tipo: string): FotoPacienteValidada['extensao'] | null {
  if (tipo === 'image/jpeg') return 'jpg'
  if (tipo === 'image/png') return 'png'
  if (tipo === 'image/webp') return 'webp'
  return null
}

export function validarFotoPaciente(arquivo: File): FotoPacienteValidada {
  const extensao = extensaoDoTipo(arquivo.type)
  if (!extensao) throw new Error('Use uma imagem JPG, PNG ou WebP.')
  if (arquivo.size <= 0) throw new Error('A imagem selecionada está vazia.')
  if (arquivo.size > TAMANHO_MAXIMO_FOTO_PACIENTE) {
    throw new Error('A foto deve ter no máximo 5 MB.')
  }
  return { arquivo, extensao }
}
