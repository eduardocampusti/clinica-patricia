import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import Equipe from '../../src/pages/cadastros/Equipe'

export function ContextoEquipe() {
  const [clinicaId, setClinicaId] = useState('clinica-a')
  const [proprietaria, setProprietaria] = useState(true)
  return <main className="min-h-screen bg-[var(--fundo-pagina)] px-4 py-6 text-[var(--texto-principal)] sm:px-6 lg:px-10 lg:py-9">
    <div className="mb-4 flex flex-wrap gap-2">
      <button type="button" onClick={() => setClinicaId('clinica-a')}>Clínica A</button>
      <button type="button" onClick={() => setClinicaId('clinica-b')}>Trocar para Clínica B</button>
      <button type="button" onClick={() => setProprietaria((atual) => !atual)}>Simular perfil de {proprietaria ? 'recepção' : 'proprietária'}</button>
    </div>
    <Equipe clinicaAtivaId={clinicaId} souProprietaria={proprietaria} />
  </main>
}

createRoot(document.getElementById('root')!).render(<StrictMode><ContextoEquipe /></StrictMode>)
