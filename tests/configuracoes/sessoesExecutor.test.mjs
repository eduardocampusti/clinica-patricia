import test from 'node:test'
import assert from 'node:assert/strict'
import {renovarSessaoAuxiliarAposLogin, encerrarSessaoAuxiliar, exigirConsulta, encerramentoCompleto} from './sessoesExecutor.mjs'

test('Após saída global, exige novo login auxiliar e guarda antes de ler', async () => {
  const ordem=[]
  const cliente={auth:{signInWithPassword:async()=>{ordem.push('login');return {data:{session:{}}}}},rpc:async()=>{ordem.push('guarda');return {data:true}}}
  await renovarSessaoAuxiliarAposLogin(cliente,{email:'fixture@example.invalid',password:'SOMENTE-SINTETICA'})
  assert.deepEqual(ordem,['login','guarda'])
})
test('Não aceita login auxiliar ou guarda recusados', async () => {
  await assert.rejects(()=>renovarSessaoAuxiliarAposLogin({auth:{signInWithPassword:async()=>({error:true})}},{email:'x',password:'x'}),/não confirmado/)
  await assert.rejects(()=>renovarSessaoAuxiliarAposLogin({auth:{signInWithPassword:async()=>({data:{session:{}}})},rpc:async()=>({data:false})},{email:'x',password:'x'}),/recusada/)
})
test('Sessão de concorrência termina somente a si própria', async () => {
  let recebido
  await encerrarSessaoAuxiliar({auth:{signOut:async x=>{recebido=x;return {error:null}}}})
  assert.deepEqual(recebido,{scope:'local'})
})
test('Resposta recusada tem diagnóstico HTTP, não erro secundário de undefined', () => {
  assert.throws(()=>exigirConsulta({error:true,status:401},'concorrência'),/HTTP 401/)
  assert.throws(()=>exigirConsulta({data:{}},'concorrência'),/não confirmada/)
  assert.deepEqual(exigirConsulta({data:{revisao:2}},'concorrência'),{revisao:2})
})
test('Testes funcionais aprovados não liberam recurso com encerramento incompleto', () => {
  const r={aprovado:true,contas:[{},{}],encerramento:[{aprovado:true},{aprovado:true}],contextos_finais:[0,1].map(()=>({clinica_ativa:false,contexto_ativo:false,publico_encerrado:true,vinculos_ativos:0}))}
  assert.equal(encerramentoCompleto(r),true)
  r.contextos_finais[1].contexto_ativo=true
  assert.equal(encerramentoCompleto(r),false)
  r.contextos_finais[1].contexto_ativo=false;r.encerramento.push({aprovado:false})
  assert.equal(encerramentoCompleto(r),false)
})
