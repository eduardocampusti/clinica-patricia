import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import AppShell from '../../src/components/shell/AppShell'
import type { Tela } from '../../src/components/shell/types'
import Pacientes from '../../src/pages/Pacientes'
import { ThemeProvider } from '../../src/theme/ThemeProvider'

const clinica = {
  id: 'clinica-sintetica',
  nome: 'Clínica Demonstração',
  cor_primaria: '#2563eb',
  cor_secundaria: '#0ea5e9',
  cor_menu: '#172554',
}

export function PaginaSintetica() {
  const [tela, setTela] = useState<Tela>('pacientes')

  useEffect(() => {
    document.documentElement.style.setProperty('--cor-primaria', clinica.cor_primaria)
    document.documentElement.style.setProperty('--cor-secundaria', clinica.cor_secundaria)
    document.documentElement.style.setProperty('--cor-menu', clinica.cor_menu)
  }, [])

  return (
    <AppShell tela={tela} onNavegar={setTela} clinicaAtiva={clinica} clinicasDoUsuario={[clinica]}
      onSelecionarClinica={() => undefined} emailUsuario="usuario.sintetico@example.invalid" papel="recepcao" onSair={() => undefined}>
      {tela === 'pacientes' ? (
        <Pacientes clinicaAtivaId={clinica.id} clinicaNome={clinica.nome} carregandoClinica={false}
          papel="recepcao" carregandoPapel={false} usuarioId="usuario-sintetico" onIrParaAgenda={() => setTela('agenda')} />
      ) : <p>Área de navegação sintética. Nenhum agendamento é gravado.</p>}
    </AppShell>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider><PaginaSintetica /></ThemeProvider></StrictMode>)
