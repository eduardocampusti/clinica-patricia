import IdentificacaoClinicaDashboard from './IdentificacaoClinicaDashboard'
import { dataDaDashboard, saudacaoConta } from '../../lib/identidadeApresentacao'

export default function CabecalhoDashboard({ nome, clinicaNome, clinicaId, agora, contexto }: { nome: string | null; clinicaNome: string; clinicaId?: string; agora: Date; contexto?: string }) {
  return <div className="min-w-0">
    <h1 className="texto-titulo-tela break-words text-[var(--texto-principal)] [overflow-wrap:anywhere] max-sm:!text-2xl">{saudacaoConta(nome, agora)}</h1>
    <p className="mt-1.5 text-sm leading-relaxed text-[var(--texto-secundario)]">
      {contexto ? <><span className="font-semibold text-[var(--texto-principal)]">{contexto}</span> · </> : null}
      {dataDaDashboard(agora)} · <IdentificacaoClinicaDashboard id={clinicaId} nome={clinicaNome} />
    </p>
  </div>
}
