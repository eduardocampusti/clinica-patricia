import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calcularIdade } from './pacienteIdade'

describe('idade do paciente', () => {
  const hoje = new Date(2026, 8, 25)
  it('considera aniversário de 18 anos', () => {
    assert.equal(calcularIdade('2008-09-24', hoje), 18)
    assert.equal(calcularIdade('2008-09-25', hoje), 18)
    assert.equal(calcularIdade('2008-09-26', hoje), 17)
  })
  it('não apresenta idade para data vazia, impossível ou futura', () => {
    assert.equal(calcularIdade('', hoje), null)
    assert.equal(calcularIdade('2026-02-30', hoje), null)
    assert.equal(calcularIdade('2026-09-26', hoje), null)
  })
})
