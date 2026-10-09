// Sem mocks, conta criada, senha/token impresso ou envio de relatório automático.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../../src/App'
import { ThemeProvider } from '../../src/theme/ThemeProvider'
import { supabase } from '../../src/lib/supabase'
import { carregarAcessosClinicas } from '../../src/lib/clinicAccess'
import { CLINIC_BRANDS, clinicaCorrespondeAoBrand } from '../../src/config/clinicBrands'
import '../../src/index.css'

export function Bancada() {
  const [resultado,setResultado]=useState('Entre pela interface e faça somente a conferência da sessão. Não cadastre pessoas ou contas nesta etapa.')
  const [ocupado,setOcupado]=useState(false)
  async function conferir() {
    setOcupado(true)
    try {
      const usuario=await supabase.auth.getUser()
      if(usuario.error||!usuario.data.user)throw Error('Sessão legítima não confirmada. Entre pela interface abaixo, sem enviar credenciais ao chat.')
      const acessos=await carregarAcessosClinicas(usuario.data.user.id)
      const guarda=await supabase.rpc('acesso_direto_exigir_sessao')
      if(guarda.error||guarda.data!==true)throw Error('A guarda do servidor não confirmou esta sessão. Não iniciar a criação.')
      const estado=await supabase.rpc('acesso_direto_estado')
      if(estado.error||estado.data?.estado!=='normal')throw Error('A sessão não está no estado normal. Não iniciar a criação.')
      const permitida=Object.values(CLINIC_BRANDS).every(c=>acessos.some(a=>clinicaCorrespondeAoBrand({id:a.clinicaId,nome:a.nome,subdomain:a.subdomain},c)&&a.papel==='proprietaria'))
      if(!permitida)throw Error('Não foi confirmado o papel Proprietário(a) nas duas unidades. Não iniciar a criação.')
      setResultado('Sessão real e guarda confirmadas. Proprietário(a) nas duas unidades. Pronto para preparar a etapa restrita; nenhuma conta ou pessoa criada.')
    } catch(e) { setResultado(e instanceof Error?e.message:'Conferência não concluída.') }
    finally { setOcupado(false) }
  }
  return <><aside className="border-b border-[var(--borda)] bg-[var(--fundo-card)] p-3 text-[var(--texto-principal)]"><strong>Bancada local conectada — não publicada</strong><p role="status">{resultado}</p><button className="mt-2 min-h-11 rounded-lg border border-[var(--borda)] px-3" disabled={ocupado} onClick={()=>void conferir()}>{ocupado?'Conferindo…':'Conferir sessão real'}</button></aside><App/></>
}
createRoot(document.getElementById('root')!).render(<ThemeProvider><Bancada/></ThemeProvider>)
