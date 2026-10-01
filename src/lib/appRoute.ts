import { CLINIC_BRANDS, type ClinicBrandSlug } from '../config/clinicBrands'
import { TITULOS_TELA, type Tela } from '../components/shell/types'

// A URL guarda só localização. Sessão, vínculo e papel são verificados no servidor.
export function lerRotaInterna(pathname = window.location.pathname): { unidade: ClinicBrandSlug; tela: Tela } | null {
  const match = /^\/sistema\/(brotas|ipupiara)\/([a-z]+)\/?$/.exec(pathname)
  if (!match || !Object.hasOwn(TITULOS_TELA, match[2])) return null
  return { unidade: match[1] as ClinicBrandSlug, tela: match[2] as Tela }
}

export function caminhoInterno(unidade: ClinicBrandSlug, tela: Tela) {
  return `/sistema/${unidade}/${tela}`
}

export function marcaDaRota() {
  const rota = lerRotaInterna()
  return rota ? CLINIC_BRANDS[rota.unidade] : null
}
