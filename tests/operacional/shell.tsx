import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import AppShell from '../../src/components/shell/AppShell'
import type { Tela } from '../../src/components/shell/types'
import type { Papel } from '../../src/hooks/usePapelNaClinica'
import { ThemeProvider } from '../../src/theme/ThemeProvider'
import SobreSistema from '../../src/pages/SobreSistema'
import { caminhoInterno, lerRotaInterna, navegarPara, useCaminhoAtual } from '../../src/lib/appRoute'

const papel = (new URLSearchParams(window.location.search).get('papel') ?? 'proprietaria') as Papel
if (!lerRotaInterna()) navegarPara(`${caminhoInterno('brotas', 'dashboard')}?previa=shell&papel=${papel}`, true)
const clinicas = [
  { id: 'clinica-a', nome: 'Clínica Brotas', cor_primaria: '#006194', cor_secundaria: '#004b73', cor_menu: '#07345d' },
  { id: 'clinica-b', nome: 'Clínica Ipupiara', cor_primaria: '#006194', cor_secundaria: '#004b73', cor_menu: '#213145' },
]

export function Exemplo() {
  const caminho = useCaminhoAtual()
  const tela = lerRotaInterna(caminho)?.tela ?? 'dashboard'
  const [clinica, setClinica] = useState(lerRotaInterna()?.unidade === 'ipupiara' ? clinicas[1] : clinicas[0])
  function setTela(destino: Tela) { navegarPara(`${caminhoInterno(clinica.id === 'clinica-a' ? 'brotas' : 'ipupiara', destino)}?previa=shell&papel=${papel}`) }
  return <AppShell tela={tela} onNavegar={setTela} clinicaAtiva={clinica} clinicasDoUsuario={clinicas}
    onSelecionarClinica={(id) => { const nova = clinicas.find((item) => item.id === id); if (!nova) return; setClinica(nova); navegarPara(`${caminhoInterno(nova.id === 'clinica-a' ? 'brotas' : 'ipupiara', tela)}?previa=shell&papel=${papel}`) }}
    emailUsuario="usuario.sintetico@example.invalid" papel={papel} onSair={() => undefined}>
    {tela === 'sobre' ? <SobreSistema clinicaAtiva={clinica} /> : <><h1 className="texto-titulo-tela">Área operacional</h1><p className="mt-2 text-[var(--texto-secundario)]">Tela atual: {tela}</p></>}
  </AppShell>
}

createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider><Exemplo /></ThemeProvider></StrictMode>)
