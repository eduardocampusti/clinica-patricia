import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import Pacientes from '../../src/pages/Pacientes'

export function ContextoPacientes() {
  const [clinicaId, setClinicaId] = useState('clinica-a')
  return <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
    <button type="button" onClick={() => setClinicaId('clinica-b')}>Trocar para Clínica B</button>
    <Pacientes clinicaAtivaId={clinicaId} clinicaNome={clinicaId === 'clinica-a' ? 'Clínica A' : 'Clínica B'} carregandoClinica={false} papel="recepcao" carregandoPapel={false} usuarioId="usuario-sintetico" />
  </main>
}

createRoot(document.getElementById('root')!).render(<StrictMode><ContextoPacientes /></StrictMode>)
