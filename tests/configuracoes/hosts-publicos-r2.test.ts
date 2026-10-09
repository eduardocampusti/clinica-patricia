import test from 'node:test'
import assert from 'node:assert/strict'
import {resolverHostnamePublico} from '../../database/proposals/configuracoes/r2/configuracoesPublicas.ts'
test('R2 preserva os domínios reais e aliases históricos',()=>{
 for(const [hostname,slug] of [['clinicabrotas.com.br','brotas'],['WWW.CLINICAIPUPIARA.COM.BR','ipupiara'],['configuracoes-homologacao-a.invalid','homologacao-configuracoes-a'],['configuracoes-homologacao-b.invalid','homologacao-configuracoes-b']])assert.equal(resolverHostnamePublico({hostname}),slug)
})
test('R2 aceita exclusivamente os dois aliases adicionais aprovados',()=>{
 for(const letra of ['a','b'])assert.equal(resolverHostnamePublico({hostname:`configuracoes-homologacao-r2-${letra}.invalid`}),`homologacao-configuracoes-r2-${letra}`)
 for(const hostname of ['configuracoes-homologacao-r2-c.invalid','homologacao-configuracoes-r2-a','ed60a2c6-59c8-45bc-80b7-e53aa005da01','constructor','clinicabrotas.com.br.evil.invalid'])assert.equal(resolverHostnamePublico({hostname}),null)
})
test('R2 continua recusando escopo e consulta privada pelo seletor público',()=>{
 for(const extra of [{escopo:'geral'},{rascunho:true},{versao:1},{homologacao:true}])assert.equal(resolverHostnamePublico({hostname:'configuracoes-homologacao-r2-a.invalid',...extra}),null)
})
