import { CLINIC_BRANDS, clinicaCorrespondeAoBrand, type ClinicBrandSlug } from './clinicBrands'

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
export const INSTITUICOES: Record<ClinicBrandSlug, DadosInstitucionais> = {
  brotas: {},
  ipupiara: {},
}

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
  if (!clinica) return null
  const marca = Object.values(CLINIC_BRANDS).find(item => clinicaCorrespondeAoBrand(clinica, item))
  return marca ? INSTITUICOES[marca.slug] : null
}
