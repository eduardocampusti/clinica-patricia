import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { blocosHorarioAgenda, periodoAgenda } from './agendaDisponibilidade'

const horas = (blocos: { hora: string }[]) => blocos.map(b => b.hora)

describe('blocos de horário da agenda', () => {
  it('faixa única: passo igual à duração, alinhado ao início', () => {
    const blocos = blocosHorarioAgenda(30, [{ hora_inicio: '08:00:00', hora_fim: '10:00:00' }], [])
    assert.deepEqual(horas(blocos), ['08:00', '08:30', '09:00', '09:30'])
    assert.ok(blocos.every(b => !b.ocupado))
  })
  it('duas faixas: cada uma alinhada ao próprio início, sem blocos no intervalo', () => {
    const blocos = blocosHorarioAgenda(40, [{ hora_inicio: '08:10', hora_fim: '09:40' }, { hora_inicio: '14:00', hora_fim: '15:20' }], [])
    assert.deepEqual(horas(blocos), ['08:10', '08:50', '14:00', '14:40'])
  })
  it('conflito com agendamento ocupa o bloco sem removê-lo', () => {
    const blocos = blocosHorarioAgenda(30, [{ hora_inicio: '08:00', hora_fim: '10:00' }], [{ id: 'outro', hora_inicio: '08:45:00', hora_fim: '09:15:00', status: 'agendado' }])
    assert.deepEqual(blocos, [
      { hora: '08:00', ocupado: false },
      { hora: '08:30', ocupado: true },
      { hora: '09:00', ocupado: true },
      { hora: '09:30', ocupado: false },
    ])
  })
  it('duração que não cabe no fim da faixa não gera bloco', () => {
    assert.deepEqual(horas(blocosHorarioAgenda(30, [{ hora_inicio: '08:00', hora_fim: '09:50' }], [])), ['08:00', '08:30', '09:00'])
    assert.deepEqual(blocosHorarioAgenda(60, [{ hora_inicio: '08:00', hora_fim: '08:50' }], []), [])
    assert.deepEqual(horas(blocosHorarioAgenda(30, [{ hora_inicio: '23:00', hora_fim: '23:59' }], [])), ['23:00'])
  })
  it('sem expediente ou duração inválida não gera blocos', () => {
    assert.deepEqual(blocosHorarioAgenda(30, [], []), [])
    assert.deepEqual(blocosHorarioAgenda(null, [{ hora_inicio: '08:00', hora_fim: '10:00' }], []), [])
    assert.deepEqual(blocosHorarioAgenda(30, [{ hora_inicio: null, hora_fim: null }], []), [])
  })
  it('agendamento cancelado e o próprio agendamento não ocupam', () => {
    const janelas = [{ hora_inicio: '08:00', hora_fim: '09:00' }]
    assert.ok(blocosHorarioAgenda(30, janelas, [{ id: 'c', hora_inicio: '08:00', hora_fim: '08:30', status: 'cancelado' }]).every(b => !b.ocupado))
    assert.ok(blocosHorarioAgenda(30, janelas, [{ id: 'proprio', hora_inicio: '08:00', hora_fim: '08:30', status: 'confirmado' }], 'proprio').every(b => !b.ocupado))
  })
  it('períodos: manhã até 11:59, tarde até 17:59, noite depois', () => {
    assert.deepEqual(['11:59', '12:00', '17:59', '18:00'].map(periodoAgenda), ['Manhã', 'Tarde', 'Tarde', 'Noite'])
  })
})
