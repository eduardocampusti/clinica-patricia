import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consultarFinanceiroDoDia } from './dashboardProprietaria'
import type { ExecutorRpcFinanceiro } from './financeiro/financeiro.rpc'
const clinica = '22222222-2222-4222-8222-222222222222'
const resposta = () => ({ versao: 1, inicio: '2026-10-09T03:00:00Z', fim: '2026-10-10T03:00:00Z', timezone_series: 'America/Bahia', clinicas_autorizadas: [clinica], consultado_em: '2026-10-09T12:00:00Z', resumo: {
  producao: { bruto: '1234.56', clinica_liquida: '-10.05', quantidade: 3 },
  repasses: { valor_repasses_pagos_periodo: '80.01', repasses_pendentes_atual: 2 }, fiscal: { pendente: 1 },
  caixa: { situacao_operacional_atual: { aguardando_aprovacao: 1, devolvido_para_correcao: 0 } },
} })
test('usa a RPC oficial, clínica explícita e intervalo exclusivo de um dia na Bahia, sem recalcular parcelas', async () => {
  const executor: ExecutorRpcFinanceiro = async (nome, args) => {
    assert.equal(nome, 'financeiro_dashboard_proprietaria')
    assert.equal(args.p_clinica_id, clinica)
    assert.equal(args.p_inicio, '2026-10-09T03:00:00.000Z')
    assert.equal(args.p_fim, '2026-10-10T03:00:00.000Z')
    assert.equal(args.p_timezone, 'America/Bahia')
    assert.equal(args.p_status_recebimento, null)
    return { data: resposta(), error: null }
  }
  const valores = await consultarFinanceiroDoDia(clinica, '2026-10-09', executor)
  assert.equal(valores.recebido.replaceAll('\u00a0', ' '), 'R$ 1.234,56')
  assert.equal(valores.parcelaClinica.replaceAll('\u00a0', ' '), '-R$ 10,05')
  assert.equal(valores.repassesPagos.replaceAll('\u00a0', ' '), 'R$ 80,01')
  assert.equal(valores.repassesPendentes, 2)
})
for (const [nome, alterar] of [
  ['outra clínica', (v: ReturnType<typeof resposta>) => { v.clinicas_autorizadas = ['outra'] }],
  ['agregado de várias clínicas', (v: ReturnType<typeof resposta>) => { v.clinicas_autorizadas.push('outra') }],
  ['período diferente', (v: ReturnType<typeof resposta>) => { v.inicio = '2026-10-08T03:00:00Z' }],
  ['fuso diferente', (v: ReturnType<typeof resposta>) => { v.timezone_series = 'UTC' }],
  ['valor inválido', (v: ReturnType<typeof resposta>) => { v.resumo.producao.bruto = 'NaN' }],
  ['contagem negativa', (v: ReturnType<typeof resposta>) => { v.resumo.fiscal.pendente = -1 }],
  ['campo ausente', (v: ReturnType<typeof resposta>) => { delete (v.resumo.caixa.situacao_operacional_atual as Partial<typeof v.resumo.caixa.situacao_operacional_atual>).aguardando_aprovacao }],
] as const) test(`recusa ${nome}, sem fabricar zero ou ausência de pendência`, async () => {
  const v = resposta(); alterar(v)
  await assert.rejects(() => consultarFinanceiroDoDia(clinica, '2026-10-09', async () => ({ data: v, error: null })))
})
test('recusa de permissão do Financeiro conserva a classificação, sem fallback', async () => {
  await assert.rejects(() => consultarFinanceiroDoDia(clinica, '2026-10-09', async () => ({ data: null, error: { code: '42501', message: 'Sem acesso' } })), { codigo: 'nao_autorizado' })
})
