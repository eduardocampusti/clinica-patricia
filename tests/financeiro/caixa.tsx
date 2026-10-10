import { createRoot } from 'react-dom/client'
import FinanceiroCaixa from '../../src/pages/FinanceiroCaixa'
import type { Papel } from '../../src/hooks/usePapelNaClinica'
import '../../src/index.css'

const papel = new URLSearchParams(location.search).get('papel') as Papel | null
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-6xl p-4 sm:p-8">
  <p className="mb-4 text-xs text-[var(--texto-secundario)]">Ambiente sintético · nenhum dado real</p>
  <FinanceiroCaixa clinicaAtivaId="clinica-sintetica" carregandoClinica={false}
    usuarioId="usuario-sintetico" papel={papel ?? 'recepcao'} carregandoPapel={false} />
</main>)
