export interface DadosInstitucionais {
  proprietarioOuResponsavel?: string
  contatoInstitucional?: string
}

export interface CreditosSoftware {
  empresa: string
  desenvolvimento: string
  whatsapp: string
  instagram: string
  whatsappUrl: string
  instagramUrl: string
  logo: string
}

// Campos não confirmados permanecem ausentes. O usuário logado nunca é fonte destes créditos.
export const CREDITOS_SOFTWARE: CreditosSoftware = {
  empresa: 'Vencer Digital',
  desenvolvimento: 'Eduardo Campos',
  whatsapp: '(77) 99129-0375',
  instagram: '@vencerdigital.ia',
  whatsappUrl: 'https://wa.me/5577991290375',
  instagramUrl: 'https://www.instagram.com/vencerdigital.ia/',
  logo: '/vencer-digital-logo.svg',
}

export function dadosDaClinicaAtiva(clinica: { id: string; nome: string } | null): DadosInstitucionais | null {
  // Nenhum contato institucional por clínica foi aprovado nesta base.
  return clinica ? {} : null
}
