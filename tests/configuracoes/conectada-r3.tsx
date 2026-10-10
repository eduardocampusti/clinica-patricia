// Bancada local CONECTADA, sem mocks/interceptação. Não incluir no frontend publicado.
// Abrir com #a ou #b. Login/Configurações/adapter/Auth/Storage são os reais.
import {useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ThemeProvider} from '../../src/theme/ThemeProvider'
import Login from '../../src/pages/Login'
import Configuracoes,{type GuardaConfiguracoes} from '../../src/pages/Configuracoes'
import {supabase} from '../../src/lib/supabase'
import {carregarAcessosClinicas} from '../../src/lib/clinicAccess'
import '../../src/index.css'
const b=location.hash==='#b',id=b?'cb620078-44a1-48c7-b5f7-3509f3dd0002':'cb620078-44a1-48c7-b5f7-3509f3dd0001'
// Resolução local já existente: os IDs/hostnames são definidos só na bancada Vite.
history.replaceState(null,'',`/acesso/${b?'ipupiara':'brotas'}${b?'#b':'#a'}`)
function Bancada(){
 const [papel,setPapel]=useState<string|null>(null),[erro,setErro]=useState(''),[guarda,setGuarda]=useState<GuardaConfiguracoes|null>(null)
 useEffect(()=>{let vivo=true;void (async()=>{
  const auth=await supabase.auth.getUser();if(!auth.data.user)return
  const gate=await supabase.rpc('acesso_direto_exigir_sessao');if(gate.error||gate.data!==true){if(vivo)setErro('Sessão recusada pela proteção real.');return}
  const acessos=await carregarAcessosClinicas(auth.data.user.id),a=acessos.find(c=>c.clinicaId===id)
  if(vivo&&a)setPapel(a.papel)
 })().catch(()=>{if(vivo)setErro('Não foi possível conferir a sessão real.')});return()=>{vivo=false}},[])
 async function sair(){if(guarda?.ocupado)return;if(guarda?.sujo&&!confirm('Descartar o rascunho ainda não salvo?'))return;await supabase.auth.signOut();setPapel(null);setErro('')}
 return <><aside role="status">DEMONSTRAÇÃO CONECTADA — contexto {b?'B':'A'} fictício. Respostas reais do Supabase; nenhum módulo clínico é montado. Para leitura anônima, abrir esta bancada em janela privada. <button onClick={()=>void sair()}>Sair</button></aside>
 {erro&&<p role="alert">{erro}</p>}
 {papel?<Configuracoes clinicaId={id} clinicaNome={`DEMONSTRAÇÃO Configurações ${b?'B':'A'}`} papel={papel} onGuarda={setGuarda}/>:<Login onAccessGranted={a=>{if(a.clinicaId===id)setPapel(a.papel);else setErro('Use somente a conta fictícia deste contexto.')}}/>}</>
}
createRoot(document.getElementById('root')!).render(<ThemeProvider><Bancada/></ThemeProvider>)
