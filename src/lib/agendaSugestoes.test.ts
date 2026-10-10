import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sugestoesRemarcacao, type LeituraIntervaloAgenda } from './agendaSugestoes'

// 2026-10-02 é sexta (5); 03 sábado (6); 05 segunda (1).
const datas = ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']
const expediente = (dias: number[], inicio = '08:00', fim = '12:00') => dias.map(dia_semana => ({ dia_semana, hora_inicio: inicio, hora_fim: fim }))
const base = { datas, duracao: 30, proprioId: 'ag-r', dataAtual: '2026-10-02', inicioAtual: '11:00', hoje: '2026-10-02', horaAgora: '09:40' }
const resumo = (s: ReturnType<typeof sugestoesRemarcacao>) => s.map(x => `${x.data.slice(8)} ${x.hora} ${x.etiqueta}`)

describe('sugestões de remarcação', () => {
  it('prioriza ainda hoje, depois mesmo horário, depois o primeiro livre de cada dia; exibe em ordem', () => {
    const leitura: LeituraIntervaloAgenda = { padrao: expediente([5, 6, 1]), excecoes: [], ocupacoes: [] }
    assert.deepEqual(resumo(sugestoesRemarcacao({ ...base, leitura })), [
      '02 10:00 Ainda hoje', '02 10:30 Ainda hoje',
      '03 08:00 Manhã', '03 11:00 Mesmo horário',
      '05 08:00 Manhã', '05 11:00 Mesmo horário',
    ])
  })
  it('ignora o próprio agendamento, mas respeita conflito com outro e com cancelado não', () => {
    const leitura: LeituraIntervaloAgenda = { padrao: expediente([5]), excecoes: [], ocupacoes: [
      { id: 'ag-r', data: '2026-10-02', hora_inicio: '11:00', hora_fim: '11:30', status: 'confirmado' },
      { id: 'outro', data: '2026-10-02', hora_inicio: '10:00', hora_fim: '10:30', status: 'agendado' },
      { id: 'cancelado', data: '2026-10-02', hora_inicio: '10:30', hora_fim: '11:00', status: 'cancelado' },
    ] }
    const s = sugestoesRemarcacao({ ...base, leitura, datas: ['2026-10-02'], limite: 10 })
    assert.deepEqual(s.map(x => x.hora), ['10:30', '11:30'])
  })
  it('não sugere o horário atual nem horários já passados de hoje', () => {
    const leitura: LeituraIntervaloAgenda = { padrao: expediente([5]), excecoes: [], ocupacoes: [] }
    const s = sugestoesRemarcacao({ ...base, leitura, datas: ['2026-10-02'], horaAgora: '10:30', limite: 10 })
    assert.deepEqual(s.map(x => x.hora), ['11:30'])
  })
  it('sem expediente, folga ou exceção inconsistente: nenhuma sugestão', () => {
    assert.deepEqual(sugestoesRemarcacao({ ...base, leitura: { padrao: [], excecoes: [], ocupacoes: [] } }), [])
    const folga: LeituraIntervaloAgenda = { padrao: expediente([5, 6, 1]), excecoes: datas.map(data => ({ data, tipo: 'folga', hora_inicio: null, hora_fim: null })), ocupacoes: [] }
    assert.deepEqual(sugestoesRemarcacao({ ...base, leitura: folga }), [])
    const inconsistente: LeituraIntervaloAgenda = { padrao: expediente([5]), excecoes: [{ data: '2026-10-02', tipo: 'horario_especial', hora_inicio: null, hora_fim: null }], ocupacoes: [] }
    assert.deepEqual(sugestoesRemarcacao({ ...base, leitura: inconsistente, datas: ['2026-10-02'] }), [])
  })
  it('após a chegada, somente a mesma data', () => {
    const leitura: LeituraIntervaloAgenda = { padrao: expediente([5, 6, 1]), excecoes: [], ocupacoes: [] }
    const s = sugestoesRemarcacao({ ...base, leitura, somenteMesmaData: true, limite: 10 })
    assert.ok(s.length > 0)
    assert.ok(s.every(x => x.data === '2026-10-02'))
  })
  it('horário especial substitui o padrão e duração precisa caber', () => {
    const leitura: LeituraIntervaloAgenda = { padrao: expediente([6]), excecoes: [{ data: '2026-10-03', tipo: 'horario_especial', hora_inicio: '14:00', hora_fim: '15:00' }], ocupacoes: [] }
    const s = sugestoesRemarcacao({ ...base, leitura, duracao: 40, datas: ['2026-10-03'], limite: 10 })
    assert.deepEqual(resumo(s), ['03 14:00 Tarde'])
  })
  it('sem repetir e respeitando o limite', () => {
    const leitura: LeituraIntervaloAgenda = { padrao: expediente([5, 6, 0, 1], '08:00', '18:00'), excecoes: [], ocupacoes: [] }
    const s = sugestoesRemarcacao({ ...base, leitura })
    assert.equal(s.length, 6)
    assert.equal(new Set(s.map(x => `${x.data} ${x.hora}`)).size, 6)
  })
})
