export type ClinicBrandSlug = 'brotas' | 'ipupiara'

export interface ClinicBrandConfig {
  slug: ClinicBrandSlug
  nome: string
  hostname?: string
  clinicId?: string
  aliasesClinica: string[]
  logoSrc?: string
  imagemLogin: string
  titulo: string
  subtitulo: string
  cores: {
    primaria: string
    primariaHover: string
    destaqueSuave: string
    visual: string
  }
  textos: {
    descricaoMarca: string
    rodape: string
    avisoAcesso: string
  }
  assetsPendentes: boolean
}

const brotasId = import.meta.env.VITE_CLINICA_BROTAS_ID?.trim()
const ipupiaraId = import.meta.env.VITE_CLINICA_IPUPIARA_ID?.trim()
const brotasHostname = import.meta.env.VITE_CLINICA_BROTAS_HOSTNAME?.trim()
const ipupiaraHostname = import.meta.env.VITE_CLINICA_IPUPIARA_HOSTNAME?.trim()

export const CLINIC_BRANDS: Record<ClinicBrandSlug, ClinicBrandConfig> = {
  brotas: {
    slug: 'brotas',
    nome: 'Clínica Brotas',
    hostname: brotasHostname || undefined,
    clinicId: brotasId || undefined,
    aliasesClinica: ['brotas', 'clinica brotas'],
    imagemLogin: '/imagem_login_brotas.png',
    titulo: 'Acesso à Clínica Brotas',
    subtitulo: 'Entre com suas credenciais profissionais para acessar a operação da Clínica Brotas.',
    cores: {
      primaria: '#006194',
      primariaHover: '#004b73',
      destaqueSuave: '#eff4ff',
      visual: '#07345d',
    },
    textos: {
      descricaoMarca: 'Portal profissional Brotas',
      rodape: 'Clínica Brotas · Portal profissional',
      avisoAcesso: 'Ambiente exclusivo para profissionais autorizados da Clínica Brotas.',
    },
    assetsPendentes: false,
  },
  ipupiara: {
    slug: 'ipupiara',
    nome: 'Clínica Ipupiara',
    hostname: ipupiaraHostname || undefined,
    clinicId: ipupiaraId || undefined,
    aliasesClinica: ['ipupiara', 'clinica ipupiara'],
    imagemLogin: '/imagem_login_ipupiara.png',
    titulo: 'Acesso à Clínica Ipupiara',
    subtitulo: 'Entre com suas credenciais profissionais para acessar a operação da Clínica Ipupiara.',
    cores: {
      primaria: '#006194',
      primariaHover: '#004b73',
      destaqueSuave: '#eff4ff',
      visual: '#213145',
    },
    textos: {
      descricaoMarca: 'Portal profissional Ipupiara',
      rodape: 'Clínica Ipupiara · Portal profissional',
      avisoAcesso: 'Ambiente exclusivo para profissionais autorizados da Clínica Ipupiara.',
    },
    assetsPendentes: false,
  },
}

export interface ClinicBrandResolution {
  brand: ClinicBrandConfig | null
  origem: 'hostname' | 'preview-local' | 'fallback-local' | 'dominio-invalido'
  redirectTo?: string
}

function normalizarHostname(hostname: string) {
  const host = hostname.trim().toLowerCase().replace(/^www\./, '')
  if (host.startsWith('[') && host.endsWith(']')) return host.slice(1, -1)
  return host.replace(/:\d+$/, '')
}

function ehHostLocal(hostname: string) {
  const host = normalizarHostname(hostname)
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

export function resolveClinicBrand(
  hostname = typeof window === 'undefined' ? '' : window.location.hostname,
  pathname = typeof window === 'undefined' ? '/' : window.location.pathname,
): ClinicBrandResolution {
  const host = normalizarHostname(hostname)
  const porHostname = Object.values(CLINIC_BRANDS).find(brand => brand.hostname && normalizarHostname(brand.hostname) === host)
  if (porHostname) return { brand: porHostname, origem: 'hostname' }

  if (ehHostLocal(host)) {
    const acesso = pathname.match(/^\/acesso\/(brotas|ipupiara)\/?$/i)?.[1]?.toLowerCase() as ClinicBrandSlug | undefined
    if (acesso) return { brand: CLINIC_BRANDS[acesso], origem: 'preview-local' }

    const loginLegado = pathname.match(/^\/login\/(brotas|ipupiara)\/?$/i)?.[1]?.toLowerCase() as ClinicBrandSlug | undefined
    if (loginLegado) {
      return {
        brand: CLINIC_BRANDS[loginLegado],
        origem: 'fallback-local',
        redirectTo: `/acesso/${loginLegado}`,
      }
    }

    if (pathname === '/' || /^\/login\/?$/i.test(pathname)) {
      return {
        brand: CLINIC_BRANDS.brotas,
        origem: 'fallback-local',
        redirectTo: '/acesso/brotas',
      }
    }

    return { brand: CLINIC_BRANDS.brotas, origem: 'fallback-local' }
  }

  return { brand: null, origem: 'dominio-invalido' }
}

export function normalizarNomeClinica(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bclinica\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function clinicaCorrespondeAoBrand(
  clinica: { id: string; nome: string },
  brand: ClinicBrandConfig,
) {
  if (brand.clinicId) return clinica.id === brand.clinicId
  const nome = normalizarNomeClinica(clinica.nome)
  return brand.aliasesClinica.some(alias => normalizarNomeClinica(alias) === nome)
}
