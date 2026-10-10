import { createRoot } from 'react-dom/client'
import FinanceiroPainel from '../../src/pages/FinanceiroPainel'
import '../../src/index.css'

const papel = new URLSearchParams(location.search).get('papel') === 'medico' ? 'medico' : 'proprietaria'
createRoot(document.getElementById('root')!).render(<main className="financeiro-ui mx-auto max-w-6xl p-4 sm:p-8">
  <p className="mb-4 text-xs text-[var(--texto-secundario)]">Ambiente sintético · nenhum dado real</p>
  <FinanceiroPainel clinicaId="clinica-sintetica" papel={papel} />
</main>)
