import type { CSSProperties } from 'react'
import { CLINIC_BRANDS, clinicaCorrespondeAoBrand } from '../../config/clinicBrands'
import './identidadeClinicasDashboard.css'

export default function IdentificacaoClinicaDashboard({ id, nome }: { id?: string; nome: string }) {
  const brand = id ? Object.values(CLINIC_BRANDS).find(b => clinicaCorrespondeAoBrand({ id, nome }, b)) : undefined
  if (!brand) return <>{nome}</>
  return <span className="dashboard-identidade-clinica" data-clinica={brand.slug} style={{
    '--dashboard-unidade-claro': brand.coresDashboard.claro,
    '--dashboard-unidade-escuro': brand.coresDashboard.escuro,
  } as CSSProperties}>{nome}</span>
}
