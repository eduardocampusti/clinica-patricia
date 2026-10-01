import { CLINIC_BRANDS, type ClinicBrandSlug } from '../config/clinicBrands'
import { TITULOS_TELA, type Tela } from '../components/shell/types'
import { useSyncExternalStore } from 'react'

const EVENTO_ROTA = 'clinica:rota-alterada'

function observarRota(atualizar: () => void) {
  window.addEventListener('popstate', atualizar)
  window.addEventListener(EVENTO_ROTA, atualizar)
  return () => {
    window.removeEventListener('popstate', atualizar)
    window.removeEventListener(EVENTO_ROTA, atualizar)
  }
}

export function useCaminhoAtual() {
  return useSyncExternalStore(observarRota, () => window.location.pathname, () => '/')
}

export function navegarPara(caminho: string, substituir = false) {
  if (substituir) window.history.replaceState({}, '', caminho)
  else if (window.location.pathname !== caminho) window.history.pushState({}, '', caminho)
  window.dispatchEvent(new Event(EVENTO_ROTA))
}

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
