import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import AppShell from '../../src/components/shell/AppShell'
import type { Tela } from '../../src/components/shell/types'
import type { Papel } from '../../src/hooks/usePapelNaClinica'
import { ThemeProvider } from '../../src/theme/ThemeProvider'
import SobreSistema from '../../src/pages/SobreSistema'

const papel = (new URLSearchParams(window.location.search).get('papel') ?? 'proprietaria') as Papel
const clinicas = [
  { id: 'clinica-a', nome: 'Clínica Demonstração', cor_primaria: '#2563eb', cor_secundaria: '#0ea5e9', cor_menu: '#172554' },
  { id: 'clinica-b', nome: 'Clínica Segunda Unidade', cor_primaria: '#0f766e', cor_secundaria: '#14b8a6', cor_menu: '#134e4a' },
]

export function Exemplo() {
  const [tela, setTela] = useState<Tela>('dashboard')
  const [clinica, setClinica] = useState(clinicas[0])
  return <AppShell tela={tela} onNavegar={setTela} clinicaAtiva={clinica} clinicasDoUsuario={clinicas}
    onSelecionarClinica={(id) => setClinica(clinicas.find((item) => item.id === id) ?? clinicas[0])}
    emailUsuario="usuario.sintetico@example.invalid" papel={papel} onSair={() => undefined}>
    {tela === 'sobre' ? <SobreSistema clinicaAtiva={clinica} /> : <><h1 className="texto-titulo-tela">Área operacional</h1><p className="mt-2 text-[var(--texto-secundario)]">Tela atual: {tela}</p></>}
  </AppShell>
}

createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider><Exemplo /></ThemeProvider></StrictMode>)
