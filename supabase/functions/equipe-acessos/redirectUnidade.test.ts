import test from 'node:test'
import assert from 'node:assert/strict'
import { redirectUnidade } from './redirectUnidade.ts'
import { ORIGENS_LOCAIS_PERMITIDAS, ORIGENS_PUBLICAS_PERMITIDAS } from './conviteAuth.ts'

test('cada unidade conserva seu caminho no retorno local ou público', () => {
  assert.equal(redirectUnidade('ipupiara', 'http://127.0.0.1:3000/acesso/brotas'), 'http://127.0.0.1:3000/acesso/ipupiara')
  assert.equal(redirectUnidade('brotas', 'http://localhost:5173/acesso/brotas'), 'http://localhost:5173/acesso/brotas')
  for (const [u, dominio] of [['brotas', 'clinicabrotas.com.br'], ['ipupiara', 'clinicaipupiara.com.br']] as const) {
    assert.equal(redirectUnidade(u, 'http://localhost:3000', `https://${dominio}`), `https://${dominio}/acesso/${u}`)
  }
})
test('recusa domínio incorreto, credenciais, HTTP público e destinos arbitrários', () => {
  for (const url of ['https://clinicabrotas.com.br', 'https://evil.example', 'http://clinicaipupiara.com.br', 'https://a:b@clinicaipupiara.com.br', 'https://clinicaipupiara.com.br?redirect=evil']) {
    assert.throws(() => redirectUnidade('ipupiara', 'http://localhost:3000', url))
  }
  assert.throws(() => redirectUnidade('ipupiara', 'http://localhost:8888'))
})
test('origens públicas explícitas preservam as quatro locais sem wildcard', () => {
  assert.equal(ORIGENS_LOCAIS_PERMITIDAS.size, 4)
  assert.equal(ORIGENS_PUBLICAS_PERMITIDAS.size, 4)
  assert.equal(ORIGENS_PUBLICAS_PERMITIDAS.has('https://clinicabrotas.com.br'), true)
  assert.equal(ORIGENS_PUBLICAS_PERMITIDAS.has('https://evil.example'), false)
})
