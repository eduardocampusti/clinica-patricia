import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deveAtualizar, TOLERANCIA_TIMER_MS, type SituacaoAtualizacao } from './atualizacaoPainel'

const base: SituacaoAtualizacao = {
  agora: 100_000, ultimaTentativa: 100_000, carregando: false, oculto: false,
  intervaloMs: 60_000, vencimentoMs: 60_000,
}
const com = (mudanca: Partial<SituacaoAtualizacao>) => ({ ...base, ...mudanca })

test('consulta periódica só dispara após o intervalo', () => {
  assert.equal(deveAtualizar('periodico', com({ agora: 130_000 })), false)
  assert.equal(deveAtualizar('periodico', com({ agora: 160_000 })), true)
})

test('tolerância cobre o disparo ligeiramente adiantado do navegador', () => {
  assert.equal(deveAtualizar('periodico', com({ agora: 160_000 - TOLERANCIA_TIMER_MS })), true)
  assert.equal(deveAtualizar('periodico', com({ agora: 160_000 - TOLERANCIA_TIMER_MS - 1 })), false)
})

test('página oculta suspende timer e retomada, mas não a ação manual', () => {
  assert.equal(deveAtualizar('periodico', com({ agora: 400_000, oculto: true })), false)
  assert.equal(deveAtualizar('retomada', com({ agora: 400_000, oculto: true })), false)
  assert.equal(deveAtualizar('manual', com({ agora: 400_000, oculto: true })), true)
})

test('retorno ao foco atualiza apenas quando a leitura venceu', () => {
  assert.equal(deveAtualizar('retomada', com({ agora: 140_000 })), false)
  assert.equal(deveAtualizar('retomada', com({ agora: 160_000 })), true)
})

test('foco repetido logo após uma leitura não gera consulta duplicada', () => {
  const apos = com({ agora: 160_000 })
  assert.equal(deveAtualizar('retomada', apos), true)
  // A tentativa aceita registra o instante; a seguinte, no mesmo momento, é recusada.
  assert.equal(deveAtualizar('retomada', com({ agora: 160_000, ultimaTentativa: 160_000 })), false)
})

test('leitura em andamento recusa todos os motivos, sem formar fila', () => {
  for (const motivo of ['periodico', 'retomada', 'manual'] as const) {
    assert.equal(deveAtualizar(motivo, com({ agora: 900_000, carregando: true })), false)
  }
})

test('vencimento maior que o intervalo é respeitado na retomada', () => {
  assert.equal(deveAtualizar('retomada', com({ agora: 280_000, vencimentoMs: 180_000 })), true)
  assert.equal(deveAtualizar('retomada', com({ agora: 260_000, vencimentoMs: 180_000 })), false)
  // O timer periódico continua com o próprio intervalo, mais curto.
  assert.equal(deveAtualizar('periodico', com({ agora: 160_000, vencimentoMs: 180_000 })), true)
})
