import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import FinanceiroModulo from '../../src/pages/FinanceiroModulo'
import type { Papel } from '../../src/hooks/usePapelNaClinica'
import '../../src/index.css'

export function Cenario() {
  const [papel, setPapel] = useState<Papel>('proprietaria')
  return <main>
    <button type="button" onClick={() => setPapel('recepcao')}>Simular recepção</button>
    <button type="button" onClick={() => setPapel('medico')}>Simular médico</button>
    <FinanceiroModulo clinicaAtivaId="clinica-sintetica" carregandoClinica={false}
      usuarioId="usuario-sintetico" papel={papel} carregandoPapel={false} />
  </main>
}

createRoot(document.getElementById('root')!).render(<Cenario />)
