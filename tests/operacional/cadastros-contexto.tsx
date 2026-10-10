import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import AppShell from '../../src/components/shell/AppShell'
import Cadastros from '../../src/pages/cadastros/Cadastros'
import { ThemeProvider } from '../../src/theme/ThemeProvider'
import { caminhoInterno, lerRotaInterna, navegarPara } from '../../src/lib/appRoute'

const clinicas = [
  { id: 'clinica-a', nome: 'Clínica Brotas', cor_primaria: '#006194', cor_secundaria: '#004b73', cor_menu: '#07345d' },
  { id: 'clinica-b', nome: 'Clínica Ipupiara', cor_primaria: '#16a34a', cor_secundaria: '#15803d', cor_menu: '#14532d' },
]

export function ContextoCadastros() {
  const [clinica, setClinica] = useState(lerRotaInterna()?.unidade === 'ipupiara' ? clinicas[1] : clinicas[0])
  return <AppShell tela="equipe" onNavegar={() => undefined} clinicaAtiva={clinica} clinicasDoUsuario={clinicas}
    onSelecionarClinica={id => {
      const nova = clinicas.find(c => c.id === id)
      if (!nova) return
      setClinica(nova)
      navegarPara(`${caminhoInterno(nova.id === 'clinica-a' ? 'brotas' : 'ipupiara', 'equipe')}?previa=cadastros`)
    }} emailUsuario="usuario.sintetico@example.invalid" papel="proprietaria" onSair={() => undefined}>
    <Cadastros clinicaAtivaId={clinica.id} carregandoClinica={false} usuarioId="usuario-sintetico" />
  </AppShell>
}

createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider><ContextoCadastros /></ThemeProvider></StrictMode>)
