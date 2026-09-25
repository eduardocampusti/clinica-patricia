import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import Agenda, { type PacienteCriadoAgenda } from '../../src/pages/Agenda'
import Pacientes from '../../src/pages/Pacientes'
import type { ClinicaAtiva } from '../../src/hooks/useClinicaAtiva'

const CLINICAS: ClinicaAtiva[] = [
  { id: 'clinica-a', nome: 'Clínica A', cor_primaria: '#2563eb', cor_secundaria: '#0ea5e9', cor_menu: '#172554' },
  { id: 'clinica-b', nome: 'Clínica B', cor_primaria: '#0f766e', cor_secundaria: '#14b8a6', cor_menu: '#134e4a' },
]

export function AgendaContexto() {
  const [indice, setIndice] = useState(0)
  const [cadastroAberto, setCadastroAberto] = useState(false)
  const [pacienteCriado, setPacienteCriado] = useState<PacienteCriadoAgenda | null>(null)
  const clinica = CLINICAS[indice]
  useEffect(() => {
    setCadastroAberto(false)
    setPacienteCriado(null)
  }, [clinica.id])
  return <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
    <button type="button" className="mb-4 min-h-11 rounded-lg border px-4" onClick={() => setIndice(1)}>Trocar para Clínica B</button>
    <Agenda
      clinicaAtiva={clinica}
      carregandoClinica={false}
      usuarioId="usuario-sintetico"
      onAtendimentoIniciado={() => undefined}
      onNovoPaciente={() => setCadastroAberto(true)}
      pacienteCriadoExternamente={pacienteCriado}
      cadastroPacienteAberto={cadastroAberto}
    />
    {cadastroAberto && <Pacientes
      clinicaAtivaId={clinica.id}
      carregandoClinica={false}
      papel="recepcao"
      carregandoPapel={false}
      usuarioId="usuario-sintetico"
      iniciarComCadastroAberto
      onCancelarCadastro={() => setCadastroAberto(false)}
      onPacienteCriado={(paciente) => {
        setPacienteCriado({ ...paciente, revisao: Date.now() })
        setCadastroAberto(false)
      }}
    />}
  </main>
}

createRoot(document.getElementById('root')!).render(<StrictMode><AgendaContexto /></StrictMode>)
