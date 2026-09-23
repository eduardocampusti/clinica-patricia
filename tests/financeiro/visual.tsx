import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import AppShell from '../../src/components/shell/AppShell'
import FinanceiroModulo from '../../src/pages/FinanceiroModulo'
import Dashboard from '../../src/pages/Dashboard'
import { ThemeProvider } from '../../src/theme/ThemeProvider'
import type { Tela } from '../../src/components/shell/types'
import type { Papel } from '../../src/hooks/usePapelNaClinica'
import type { ClinicaAtiva } from '../../src/hooks/useClinicaAtiva'
import '../../src/index.css'

const clinicas: ClinicaAtiva[] = [
  { id: 'clinica-sintetica', nome: 'Clínica Ipupiara', cor_primaria: '#087c78', cor_secundaria: '#36a6a0', cor_menu: '#182d3b' },
  { id: 'clinica-alternativa', nome: 'Clínica Brotas', cor_primaria: '#8b5d91', cor_secundaria: '#a779ad', cor_menu: '#362947' },
]

function Visual() {
  const params = new URLSearchParams(location.search)
  const [tela, setTela] = useState<Tela>(params.get('tela') === 'dashboard' ? 'dashboard' : 'financeiro')
  const [clinica, setClinica] = useState(clinicas[0])
  const papel: Papel = params.get('papel') === 'medico' ? 'medico' : params.get('papel') === 'recepcao' ? 'recepcao' : 'proprietaria'
  return <ThemeProvider><AppShell tela={tela} onNavegar={setTela} clinicaAtiva={clinica}
    clinicasDoUsuario={clinicas} onSelecionarClinica={(id) => setClinica(clinicas.find((item) => item.id === id) ?? clinicas[0])}
    emailUsuario="operadora@exemplo.invalid" papel={papel} onSair={() => undefined}>
    {tela === 'dashboard' ? <Dashboard clinicaAtivaId={clinica.id} /> :
      <FinanceiroModulo clinicaAtivaId={clinica.id} carregandoClinica={false} usuarioId="usuario-sintetico" papel={papel} carregandoPapel={false} />}
  </AppShell></ThemeProvider>
}

createRoot(document.getElementById('root')!).render(<Visual />)

export default Visual
