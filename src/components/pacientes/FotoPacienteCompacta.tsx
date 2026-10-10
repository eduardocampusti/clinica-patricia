import { useEffect, useId, useState, type ReactNode } from 'react'
import './foto-paciente-compacta.css'

// A expansão só organiza a apresentação; editor e arquivo permanecem montados.
export default function FotoPacienteCompacta({ avatar, children }: { avatar: ReactNode; children: (visivel: boolean) => ReactNode }) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 620px)').matches)
  const [expandida, setExpandida] = useState(false)
  const id = useId()
  useEffect(() => {
    const media = window.matchMedia('(max-width: 620px)')
    const atualizar = () => setMobile(media.matches)
    atualizar()
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [])
  const visivel = !mobile || expandida
  return <div className="foto-paciente-compacta">
    <button type="button" className="foto-paciente-gatilho" aria-expanded={visivel} aria-controls={id} onClick={() => setExpandida(!expandida)}>
      <span className="foto-paciente-miniatura" aria-hidden="true">{avatar}</span>
      <span><strong>Foto do paciente <small>(opcional)</small></strong><span>{expandida ? 'Recolher opções da foto' : 'Ver foto e opções'}</span></span>
      <span aria-hidden="true">{expandida ? '−' : '+'}</span>
    </button>
    <div id={id} hidden={!visivel}>{children(visivel)}</div>
  </div>
}
