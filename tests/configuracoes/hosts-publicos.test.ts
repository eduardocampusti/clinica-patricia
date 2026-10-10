import test from 'node:test'
import assert from 'node:assert/strict'
import {resolverHostnamePublico} from '../../supabase/functions/_shared/configuracoesPublicas.ts'
test('mapeamento dos domínios publicados continua fixo',()=>{
 assert.equal(resolverHostnamePublico({hostname:'clinicabrotas.com.br'}),'brotas')
 assert.equal(resolverHostnamePublico({hostname:'WWW.CLINICAIPUPIARA.COM.BR'}),'ipupiara')
})
test('homologação pública usa somente dois aliases fixos, sem UUID ou flags públicos',()=>{
 assert.equal(resolverHostnamePublico({hostname:'configuracoes-homologacao-a.invalid'}),'homologacao-configuracoes-a')
 assert.equal(resolverHostnamePublico({hostname:'configuracoes-homologacao-b.invalid'}),'homologacao-configuracoes-b')
 for(const hostname of ['homologacao-configuracoes-a','7fc7ca34-e9a4-4af8-8bcb-0d7e3c922701','ibitiara','arbitrario.invalid','constructor','toString','https://clinicabrotas.com.br','clinicabrotas.com.br.evil.invalid'])assert.equal(resolverHostnamePublico({hostname}),null)
})
test('nenhum payload público escolhe escopo, rascunho, versão ou consulta privada',()=>{
 for(const extra of [{escopo:'geral'},{rascunho:true},{versao:1},{ativo:'outro'},{homologacao:true}])assert.equal(resolverHostnamePublico({hostname:'configuracoes-homologacao-a.invalid',...extra}),null)
 for(const v of [null,[],{},'clinicabrotas.com.br',{hostname:7}])assert.equal(resolverHostnamePublico(v),null)
})
