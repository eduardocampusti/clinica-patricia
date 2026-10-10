// Bancada conectada. Diagnóstico local contém somente estados e identificadores; nunca credenciais.
import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../../src/App'
import { ThemeProvider } from '../../src/theme/ThemeProvider'
import { supabase } from '../../src/lib/supabase'
import { carregarAcessosClinicas } from '../../src/lib/clinicAccess'
import { CLINIC_BRANDS, clinicaCorrespondeAoBrand } from '../../src/config/clinicBrands'
import '../../src/index.css'
declare const __BANCADA_RECEIPT_NONCE__: string
type Diagnostico={estado:'confirmada'|'ausente'|'recusada'|'falha';mensagem:string;atorId:string|null;guarda:boolean;pendenciaNormal:boolean;proprietariaAmbas:boolean}
export function Bancada() {
  const [resultado,setResultado]=useState('Conferência automática da sessão em andamento. Não cadastre pessoas ou contas nesta etapa.')
  const [ocupado,setOcupado]=useState(false)
  const executando=useRef(false)
  const conferir=useCallback(async()=>{
    if(executando.current)return
    executando.current=true;setOcupado(true)
    const d:Diagnostico={estado:'falha',mensagem:'Conferência não concluída.',atorId:null,guarda:false,pendenciaNormal:false,proprietariaAmbas:false}
    try {
      const usuario=await supabase.auth.getUser()
      if(usuario.error||!usuario.data.user){d.estado='ausente';throw Error('Sessão legítima não confirmada. Entre pela interface abaixo, sem enviar credenciais ao chat.')}
      d.atorId=usuario.data.user.id
      const guarda=await supabase.rpc('acesso_direto_exigir_sessao')
      if(guarda.error||guarda.data!==true){d.estado='recusada';throw Error('A guarda do servidor não confirmou esta sessão. Não iniciar a criação.')}
      d.guarda=true
      const estado=await supabase.rpc('acesso_direto_estado')
      if(estado.error||estado.data?.estado!=='normal'){d.estado='recusada';throw Error('A sessão não está no estado normal. Não iniciar a criação.')}
      d.pendenciaNormal=true
      const acessos=await carregarAcessosClinicas(usuario.data.user.id)
      d.proprietariaAmbas=Object.values(CLINIC_BRANDS).every(c=>acessos.some(a=>clinicaCorrespondeAoBrand({id:a.clinicaId,nome:a.nome,subdomain:a.subdomain},c)&&a.papel==='proprietaria'))
      if(!d.proprietariaAmbas){d.estado='recusada';throw Error('Não foi confirmado o papel Proprietário(a) nas duas unidades. Não iniciar a criação.')}
      d.estado='confirmada';d.mensagem='Sessão real e guarda confirmadas. Proprietário(a) nas duas unidades. Esta conferência não cria contas ou pessoas.'
    } catch(e) {d.mensagem=e instanceof Error?e.message:'Conferência não concluída.'}
    finally {
      setResultado(d.mensagem)
      try {const r=await fetch('/__bancada/sessao',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce:__BANCADA_RECEIPT_NONCE__,...d})});if(!r.ok)setResultado(d.mensagem+' Registro local não confirmado.')}
      catch {setResultado(d.mensagem+' Registro local indisponível.')}
      executando.current=false;setOcupado(false)
    }
  },[])
  useEffect(()=>{
    void conferir()
    const {data}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_IN')setTimeout(()=>void conferir(),0)})
    return()=>data.subscription.unsubscribe()
  },[conferir])
  return <><aside className="border-b border-[var(--borda)] bg-[var(--fundo-card)] p-3 text-[var(--texto-principal)]"><strong>Bancada local conectada — não publicada</strong><p role="status">{resultado}</p><button className="mt-2 min-h-11 rounded-lg border border-[var(--borda)] px-3" disabled={ocupado} onClick={()=>void conferir()}>{ocupado?'Conferindo…':'Conferir sessão real'}</button></aside><App/></>
}
createRoot(document.getElementById('root')!).render(<ThemeProvider><Bancada/></ThemeProvider>)
