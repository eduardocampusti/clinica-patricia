import assert from 'node:assert/strict'
import test from 'node:test'
import { dataDaDashboard, iniciaisConta, nomeCadastrado, saudacaoConta } from './identidadeApresentacao'

test('nome e iniciais vêm somente do cadastro, com ausência honesta e Unicode', () => {
  assert.equal(nomeCadastrado('  Érica   de Sá '), 'Érica de Sá')
  assert.equal(nomeCadastrado(null), null)
  assert.equal(nomeCadastrado(' '), null)
  assert.equal(iniciaisConta('Érica de Sá'), 'ÉS')
  assert.equal(iniciaisConta(null), '?')
  assert.equal(saudacaoConta(null, new Date('2026-10-08T12:00:00Z')), 'Bom dia!')
})
test('limites de saudação e data usam America/Bahia independentemente do computador', () => {
  for (const [instante, esperado] of [
    ['2026-10-08T14:59:59Z', 'Bom dia, Pessoa!'],
    ['2026-10-08T15:00:00Z', 'Boa tarde, Pessoa!'],
    ['2026-10-08T20:59:59Z', 'Boa tarde, Pessoa!'],
    ['2026-10-08T21:00:00Z', 'Boa noite, Pessoa!'],
  ]) assert.equal(saudacaoConta('Pessoa Sintética', new Date(instante)), esperado)
  assert.equal(dataDaDashboard(new Date('2026-10-09T02:59:59Z')), 'Quinta-feira, 08 de outubro')
  assert.equal(dataDaDashboard(new Date('2026-10-09T03:00:00Z')), 'Sexta-feira, 09 de outubro')
})
