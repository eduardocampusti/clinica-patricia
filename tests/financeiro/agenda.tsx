import { createRoot } from 'react-dom/client'
import Agenda from '../../src/pages/Agenda'
import '../../src/index.css'

// Harness exclusivo de teste; não é importado pela entrada da aplicação.
createRoot(document.getElementById('root')!).render(<main className="p-4">
  <p className="mb-4 font-semibold">Ambiente sintético · nenhum paciente real</p>
  <Agenda usuarioId="usuario-sintetico" carregandoClinica={false} onAtendimentoIniciado={() => {}}
    clinicaAtiva={{ id: 'clinica-sintetica', nome: 'Clínica demonstração', cor_primaria: '#2563eb', cor_secundaria: '#2563eb', cor_menu: '#131B2E' }} />
</main>)
