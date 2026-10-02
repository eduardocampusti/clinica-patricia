import type { ClinicBrandSlug } from '../config/clinicBrands'
import type { Tela } from '../components/shell/types'
export function caminhoInterno(unidade: ClinicBrandSlug, tela: Tela) { return `/sistema/${unidade}/${tela}` }
