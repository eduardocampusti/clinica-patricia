import { createRoot } from 'react-dom/client'
import Dashboard from '../../src/pages/Dashboard'
import '../../src/index.css'

createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-6xl p-4 sm:p-8">
  <Dashboard clinicaAtivaId="clinica-sintetica" />
</main>)
