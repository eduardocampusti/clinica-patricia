import assert from 'node:assert/strict'
import test from 'node:test'
import { identidadeEmailConvite } from './emailContext.ts'

const clinicas = [{ id: 'b', nome: 'Clínica Brotas' }, { id: 'i', nome: 'Clínica Ipupiara' }]
test('identidade respeita unidades persistidas, independentemente do papel', () => {
  assert.equal(identidadeEmailConvite(clinicas, [{ clinica_id: 'b', papel: 'recepcao' }]), 'brotas')
  assert.equal(identidadeEmailConvite(clinicas, [{ clinica_id: 'i', papel: 'medico' }]), 'ipupiara')
  assert.equal(identidadeEmailConvite(clinicas, [{ clinica_id: 'b' }, { clinica_id: 'i' }]), 'conjunta')
})
test('contexto ausente, malformado ou desconhecido usa identidade conjunta', () => {
  for (const v of [null, {}, [], [{ clinica_id: 'x' }], [{ clinica_id: 'b' }, {}]]) {
    assert.equal(identidadeEmailConvite(clinicas, v), 'conjunta')
  }
})
