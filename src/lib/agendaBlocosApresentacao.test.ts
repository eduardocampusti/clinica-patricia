import assert from 'node:assert/strict'
import { it } from 'node:test'
import { blocosApresentacaoAgenda } from './agendaBlocosApresentacao'
const janelas = [{ hora_inicio: '08:00', hora_fim: '10:00' }]
const ocupacoes = [{ id: 'editar', hora_inicio: '08:30', hora_fim: '09:00', status: 'confirmado' }]
const futuro = new Date(2026, 9, 1, 7, 0)
it('B1 exclui somente o próprio registro e mantém criação inalterada', () => {
  const criar = blocosApresentacaoAgenda('2026-10-02', 30, janelas, ocupacoes, '', futuro)
  const editar = blocosApresentacaoAgenda('2026-10-02', 30, janelas, ocupacoes, 'editar', futuro)
  assert.equal(criar.filter(b => !b.ocupado).length, 3)
  assert.equal(editar.filter(b => !b.ocupado).length, 4)
  assert.equal(blocosApresentacaoAgenda('2026-10-02', 30, janelas, [...ocupacoes, { ...ocupacoes[0], id: 'outro' }], 'editar', futuro).filter(b => !b.ocupado).length, 3)
})
it('B2 hoje exclui passados e minuto atual, sem afetar data futura', () => {
  const agora = new Date(2026, 9, 2, 8, 30)
  assert.deepEqual(blocosApresentacaoAgenda('2026-10-02', 30, janelas, [], '', agora).map(b => b.passado), [true, true, false, false])
  assert.equal(blocosApresentacaoAgenda('2026-10-03', 30, janelas, [], '', agora).some(b => b.passado), false)
})
it('B2 virada de minuto/hora recalcula blocos e contagem', () => {
  const livres = (d: Date) => blocosApresentacaoAgenda('2026-10-02', 30, janelas, [], '', d).filter(b => !b.ocupado && !b.passado).length
  assert.equal(livres(new Date(2026, 9, 2, 8, 59, 59)), 2)
  assert.equal(livres(new Date(2026, 9, 2, 9, 0, 0)), 1)
})
