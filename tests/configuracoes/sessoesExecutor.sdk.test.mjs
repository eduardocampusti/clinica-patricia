// SDK REAL, transporte inteiramente SINTÉTICO. Zero requests externos/contas.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createClient} from '@supabase/supabase-js'
import {renovarSessaoAuxiliarAposLogin,encerrarSessaoAuxiliar,exigirConsulta} from './sessoesExecutor.mjs'
test('SDK real: saída global recusa sessão anterior; novo login e saída local preservam concorrência',async()=>{
 const ativos=new Set(),requisicoes=[];let sequencia=0
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})
 const fetchSintetico=async(input,init={})=>{
  const u=new URL(typeof input==='string'?input:input.url),h=new Headers(init.headers),token=h.get('Authorization')?.replace(/^Bearer /,'')
  requisicoes.push({path:u.pathname,scope:u.searchParams.get('scope')})
  if(u.pathname.endsWith('/token')){
   const session_id='fixture-'+(++sequencia)
   const access_token=['SINTETICO',Buffer.from(JSON.stringify({sub:'fixture',session_id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'SEM-ASSINATURA'].join('.')
   ativos.add(access_token)
   return json({access_token,refresh_token:'REFRESH-SINTETICO-'+sequencia,expires_in:3600,token_type:'bearer',user:{id:'fixture',email:'fixture@example.invalid'}})
  }
  if(u.pathname.endsWith('/logout')){if(u.searchParams.get('scope')==='local')ativos.delete(token);else ativos.clear();return new Response(null,{status:204})}
  if(!ativos.has(token))return json({message:'Sessão sintética encerrada'},401)
  if(u.pathname.endsWith('/acesso_direto_exigir_sessao'))return json(true)
  if(u.pathname.endsWith('/configuracoes'))return json({revisao:3})
  throw Error('Endpoint não previsto no transporte sintético')
 }
 const novo=()=>createClient('https://fixture.invalid','CHAVE-PUBLICA-SINTETICA',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:fetchSintetico}})
 const fixture={email:'fixture@example.invalid',password:'SOMENTE-SINTETICA'},aux=novo(),ui=novo(),segunda=novo()
 await aux.auth.signInWithPassword(fixture);await ui.auth.signInWithPassword(fixture)
 assert.equal(ativos.size,2)
 await ui.auth.signOut()
 assert.equal(ativos.size,0)
 assert.ok((await aux.functions.invoke('configuracoes',{body:{acao:'consultar'}})).error)
 await renovarSessaoAuxiliarAposLogin(aux,fixture)
 const normal=await aux.functions.invoke('configuracoes',{body:{acao:'consultar'}})
 assert.equal(exigirConsulta(normal,'leitura').revisao,3)
 await segunda.auth.signInWithPassword(fixture)
 await encerrarSessaoAuxiliar(segunda)
 assert.equal(ativos.size,1)
 assert.equal((await aux.functions.invoke('configuracoes',{body:{acao:'consultar'}})).error,null)
 assert.ok(requisicoes.some(x=>x.scope==='global'))
 assert.ok(requisicoes.some(x=>x.scope==='local'))
})
