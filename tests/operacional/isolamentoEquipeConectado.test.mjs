import test from 'node:test'
import assert from 'node:assert/strict'
import {leituraPropriaComprovada,outraClinicaRecusada} from './isolamentoEquipeConectado.mjs'
test('isolamento exige leitura positiva da pessoa fictícia na RPC própria',()=>{
 assert.equal(leituraPropriaComprovada({data:[{id:'fixture-a'}],error:null},'fixture-a'),true)
 assert.equal(leituraPropriaComprovada({data:[],error:null},'fixture-a'),false)
 assert.equal(leituraPropriaComprovada({data:null,error:{code:'42501'}},'fixture-a'),false)
})
test('recusa explícita 42501 é o contrato da RPC na outra clínica',()=>{
 assert.equal(outraClinicaRecusada({data:null,error:{code:'42501'}}),true)
})
test('consulta ausente ou falha de transporte não comprova autorização',()=>{
 for(const code of ['PGRST202','42883','PGRST301','ECONNREFUSED'])assert.equal(outraClinicaRecusada({data:null,error:{code}}),false)
})
test('lista vazia ou dados retornados não substituem a recusa explícita',()=>{
 assert.equal(outraClinicaRecusada({data:[],error:null}),false)
 assert.equal(outraClinicaRecusada({data:[{id:'fixture-b'}],error:null}),false)
})
