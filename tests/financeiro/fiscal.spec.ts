import { expect, test, type Page } from '@playwright/test'

async function preparar(page: Page) {
  const chamadas: Array<Record<string, unknown>> = []
  let solicitado = false
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    let data: unknown = []
    if (nome === 'documentos_fiscais') data = solicitado ? [] : [{ id: 'documento-sintetico', recebimento_id: 'recebimento-sintetico',
      status: 'pendente', created_at: '2026-09-22T12:00:00Z', updated_at: '2026-09-22T12:00:00Z',
      solicitado_em: null, emitido_em: null, cancelamento_solicitado_em: null, cancelado_em: null, numero_documento: null, serie: null }]
    else if (nome === 'recebimentos') data = [{ id: 'recebimento-sintetico', paciente_id: 'paciente-sintetico' }]
    else if (nome === 'pacientes') data = [{ id: 'paciente-sintetico', nome_completo: 'Paciente Exemplo' }]
    else if (nome === 'financeiro_solicitar_emissao_fiscal') { chamadas.push(route.request().postDataJSON()); solicitado = true; data = { status: 'emissao_solicitada', nova_operacao: true } }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto('/tests/financeiro/fiscal.html')
  await page.getByRole('button', { name: 'Fiscal', exact: true }).click()
  return chamadas
}

test('recepção registra somente solicitação interna de emissão, sem alegar nota emitida', async ({ page }, info) => {
  const chamadas = await preparar(page)
  await expect(page.getByText('Paciente Exemplo')).toBeVisible()
  await page.getByRole('button', { name: 'Solicitar emissão' }).click()
  await expect(page.getByText('Não emite nem cancela nota na prefeitura')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar solicitação' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Solicitação fiscal registrada' })).toBeVisible()
  await page.screenshot({ path: `scratch/financeiro-fiscal-${info.project.name}.png`, fullPage: true })
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].p_documento_fiscal_id).toBe('documento-sintetico')
  expect(chamadas[0].p_idempotency_key).toBeTruthy()
})
