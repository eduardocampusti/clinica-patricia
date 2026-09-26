import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import AppShell from '../../src/components/shell/AppShell'
import FinanceiroModulo from '../../src/pages/FinanceiroModulo'
import Dashboard from '../../src/pages/Dashboard'
import { ThemeProvider, useTheme } from '../../src/theme/ThemeProvider'
import type { Tela } from '../../src/components/shell/types'
import type { Papel } from '../../src/hooks/usePapelNaClinica'
import type { ClinicaAtiva } from '../../src/hooks/useClinicaAtiva'
import '../../src/index.css'

const clinicas: ClinicaAtiva[] = [
  { id: 'clinica-sintetica', nome: 'Clínica Brotas', cor_primaria: '#2563eb', cor_secundaria: '#60a5fa', cor_menu: '#17244b' },
  { id: 'clinica-alternativa', nome: 'Clínica Ipupiara', cor_primaria: '#16a34a', cor_secundaria: '#4ade80', cor_menu: '#163447' },
]

function Visual() {
  const params = new URLSearchParams(location.search)
  const [tela, setTela] = useState<Tela>(params.get('tela') === 'dashboard' ? 'dashboard' : 'financeiro')
  const [clinica, setClinica] = useState(clinicas[0])
  const { aplicarCoresClinica } = useTheme()
  useEffect(() => aplicarCoresClinica(clinica), [aplicarCoresClinica, clinica])
  const papel: Papel = params.get('papel') === 'medico' ? 'medico' : params.get('papel') === 'recepcao' ? 'recepcao' : 'proprietaria'
  return <AppShell tela={tela} onNavegar={setTela} clinicaAtiva={clinica}
    clinicasDoUsuario={clinicas} onSelecionarClinica={(id) => setClinica(clinicas.find((item) => item.id === id) ?? clinicas[0])}
    emailUsuario="operadora@exemplo.invalid" papel={papel} onSair={() => undefined}>
    {tela === 'dashboard' ? <Dashboard clinicaAtivaId={clinica.id} /> :
      <FinanceiroModulo clinicaAtivaId={clinica.id} carregandoClinica={false} usuarioId="usuario-sintetico" papel={papel} carregandoPapel={false} />}
  </AppShell>
}

createRoot(document.getElementById('root')!).render(<ThemeProvider><Visual /></ThemeProvider>)

export default Visual
