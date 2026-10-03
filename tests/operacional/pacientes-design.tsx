import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import Pacientes from '../../src/pages/Pacientes'

const fetchOriginal = window.fetch.bind(window)
window.fetch = async (entrada, init) => {
  const url = new URL(typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url)
  if (url.hostname === 'operacional.synthetic.invalid' && url.pathname.endsWith('/pacientes')) {
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  if (url.hostname === 'viacep.com.br') {
    return new Response(JSON.stringify({ erro: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  return fetchOriginal(entrada, init)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <Pacientes
        clinicaAtivaId="clinica-sintetica-design"
        carregandoClinica={false}
        papel="recepcao"
        carregandoPapel={false}
        usuarioId="usuario-sintetico-design"
      />
    </main>
  </StrictMode>,
)
