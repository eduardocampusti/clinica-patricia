import { test } from 'node:test'
import assert from 'node:assert/strict'
import { avaliarPreenchimento } from './pacientePreenchimento'
const completo = { nome_completo: 'Pessoa Sintética', data_nascimento: '1992-01-01', telefone: '77900000000', sexo: 'feminino', endereco: 'Rua Modelo, 10', logradouro: 'Rua Modelo', numero: '10', bairro: 'Centro', cidade: 'Cidade Modelo', uf: 'BA' }
test('seis itens fixos e CPF opcional ausente não altera denominador', () => {
  assert.equal(avaliarPreenchimento(completo, false).informados, 6)
  const r = avaliarPreenchimento(completo, true)
  assert.equal(r.itens.length, 6); assert.equal(r.informados, 5); assert.equal(r.conclusivo, true)
})
test('CPF desconhecido nunca produz resultado conclusivo', () => assert.equal(avaliarPreenchimento(completo, null).conclusivo, false))
test('sexo não informado não pontua e sexo legado desconhecido não é reinterpretado', () => {
  assert.equal(avaliarPreenchimento({ ...completo, sexo: 'nao_informado' }, false).informados, 5)
  assert.equal(avaliarPreenchimento({ ...completo, sexo: 'valor-legado' }, false).conclusivo, false)
})
test('endereço legado conta sem decomposição e parcial estruturado não conta por ter texto composto', () => {
  assert.equal(avaliarPreenchimento({ ...completo, logradouro: null, numero: null, bairro: null, cidade: null, uf: null }, false).informados, 6)
  assert.equal(avaliarPreenchimento({ ...completo, numero: null }, false).informados, 5)
  assert.equal(avaliarPreenchimento({ ...completo, numero: 's/n' }, false).informados, 6)
})
test('dados ainda desconhecidos preservam pendências confirmadas', () => {
  const r = avaliarPreenchimento({ nome_completo: 'Pessoa Sintética', telefone: null }, null)
  assert.equal(r.conclusivo, false); assert.ok(r.pendencias.includes('Telefone'))
})
