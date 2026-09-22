import { expect, test, type Page } from '@playwright/test'

async function preparar(page: Page) {
  const chamadas: Array<Record<string, unknown>> = []
  let pago = false
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    let data: unknown = []
    if (nome === 'repasses') data = pago ? [] : [{ id: 'repasse-sintetico', profissional_id: 'profissional-sintetico',
      gerado_em: '2026-09-22T12:00:00Z', confirmado_em: null, status: 'pendente', valor_bruto_profissional: '400.00',
      valor_estornos_antes_pagamento: '50.00', valor_ajustes_aplicados: '25.00', valor_liquido: '325.00',
      meio_pagamento: null, referencia_pagamento: null, observacao: null }]
    else if (nome === 'profissionais') data = [{ id: 'profissional-sintetico', nome_completo: 'Profissional Exemplo' }]
    else if (nome === 'repasses_itens') data = [{ recebimento_id: 'recebimento-sintetico', valor_profissional_original: '400.00',
      valor_estornos_antes_pagamento: '50.00', valor_liquido: '350.00' }]
    else if (nome === 'aplicacoes_ajuste_repasse') data = [{ valor_aplicado: '25.00' }]
    else if (nome === 'recebimentos') data = [{ id: 'recebimento-sintetico', paciente_id: 'paciente-sintetico', registrado_em: '2026-09-21T12:00:00Z' }]
    else if (nome === 'pacientes') data = [{ id: 'paciente-sintetico', nome_completo: 'Paciente Exemplo' }]
    else if (nome === 'financeiro_confirmar_repasse') {
      chamadas.push(route.request().postDataJSON())
      pago = true
      data = { status: 'pago', valor_liquido: '325.00', nova_operacao: true }
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto('/tests/financeiro/repasses.html')
  await page.getByRole('button', { name: 'Repasses', exact: true }).click()
  return chamadas
}

test('proprietária revisa composição e confirma pagamento externo com chave idempotente', async ({ page }, info) => {
  const chamadas = await preparar(page)
  await expect(page.getByText('Profissional Exemplo')).toBeVisible()
  await page.getByRole('button', { name: 'Ver e confirmar' }).click()
  await expect(page.getByText('Paciente Exemplo')).toBeVisible()
  await expect(page.getByText('Líquido oficial: R$ 325,00')).toBeVisible()
  await page.getByLabel('Referência do comprovante externo').fill('PIX-EXEMPLO')
  await page.getByRole('button', { name: 'Confirmar pagamento externo' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Repasse confirmado' })).toBeVisible()
  await page.screenshot({ path: `scratch/financeiro-repasses-${info.project.name}.png`, fullPage: true })
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].p_repasse_id).toBe('repasse-sintetico')
  expect(chamadas[0].p_meio_pagamento).toBe('pix')
  expect(chamadas[0].p_referencia_pagamento).toBe('PIX-EXEMPLO')
  expect(chamadas[0].p_idempotency_key).toBeTruthy()
})
