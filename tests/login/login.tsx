import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import Login from '../../src/pages/Login'
import '../../src/index.css'
export function Harness() {
  const [access, setAccess] = useState<{ clinicaId: string; papel: string; lembrar: boolean } | null>(null)
  const authenticatedUserId = new URLSearchParams(window.location.search).get('authenticatedUserId') ?? undefined
  return access ? <h1>Unidade e perfil validados: {access.clinicaId} · {access.papel} · {access.lembrar ? 'lembrar' : 'não lembrar'}</h1>
    : <Login authenticatedUserId={authenticatedUserId} onAccessGranted={setAccess} />
}
createRoot(document.getElementById('root')!).render(<Harness />)
