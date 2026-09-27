import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import Pacientes from '../../src/pages/Pacientes'

createRoot(document.getElementById('root')!).render(<StrictMode><main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9"><Pacientes clinicaAtivaId="clinica-sintetica" clinicaNome="Clínica Sintética" carregandoClinica={false} papel="recepcao" carregandoPapel={false} usuarioId="usuario-sintetico" /></main></StrictMode>)
