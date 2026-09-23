import { expect, test, type Page } from '@playwright/test'

async function preparar(page: Page, estado: 'pendente' | 'emitida' | 'erro_emissao' = 'pendente', falharPrimeiro = false, papel: 'recepcao' | 'proprietaria' = 'recepcao') {
  const chamadas: Array<{ nome: string; parametros: Record<string, unknown> }> = []
  let solicitado = false
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    let data: unknown = []
    if (nome === 'documentos_fiscais') data = solicitado ? [] : [{ id: 'documento-sintetico', recebimento_id: 'recebimento-sintetico',
      status: estado, created_at: '2026-09-22T12:00:00Z', updated_at: '2026-09-22T12:00:00Z',
      solicitado_em: null, emitido_em: null, cancelamento_solicitado_em: null, cancelado_em: null, numero_documento: null, serie: null }]
    else if (nome === 'recebimentos') data = [{ id: 'recebimento-sintetico', paciente_id: 'paciente-sintetico' }]
    else if (nome === 'pacientes') data = [{ id: 'paciente-sintetico', nome_completo: 'Paciente Exemplo' }]
    else if (nome === 'tentativas_documento_fiscal') data = estado === 'erro_emissao' ? [{ id: 'tentativa-sintetica', documento_fiscal_id: 'documento-sintetico', tipo: 'emissao', status: 'erro', created_at: '2026-09-22T12:00:00Z', finalizado_em: '2026-09-22T12:01:00Z' }] : []
    else if (nome === 'financeiro_solicitar_emissao_fiscal' || nome === 'financeiro_solicitar_cancelamento_fiscal') {
      chamadas.push({ nome, parametros: route.request().postDataJSON() })
      if (falharPrimeiro && chamadas.length === 1) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: '23505', message: 'Tentativa temporariamente indisponível.' }) })
      solicitado = true
      data = { status: nome === 'financeiro_solicitar_emissao_fiscal' ? 'emissao_solicitada' : 'cancelamento_solicitado', nova_operacao: true }
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto(`/tests/financeiro/fiscal.html?papel=${papel}`)
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
  expect(chamadas[0].nome).toBe('financeiro_solicitar_emissao_fiscal')
  expect(chamadas[0].parametros.p_documento_fiscal_id).toBe('documento-sintetico')
  expect(chamadas[0].parametros.p_idempotency_key).toBeTruthy()
})

test('proprietária solicita cancelamento com motivo, sem alegar conclusão externa', async ({ page }, info) => {
  const chamadas = await preparar(page, 'emitida', false, 'proprietaria')
  await page.getByRole('button', { name: 'Solicitar cancelamento' }).click()
  await expect(page.getByText('Não emite nem cancela nota na prefeitura')).toBeVisible()
  await page.getByLabel('Motivo do cancelamento').fill('Solicitação interna de teste')
  await page.getByRole('button', { name: 'Confirmar solicitação' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Solicitação fiscal registrada' })).toBeVisible()
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].nome).toBe('financeiro_solicitar_cancelamento_fiscal')
  expect(chamadas[0].parametros.p_motivo).toBe('Solicitação interna de teste')
  expect(chamadas[0].parametros.p_idempotency_key).toBeTruthy()
  await page.screenshot({ path: `scratch/financeiro-fiscal-cancelamento-${info.project.name}.png`, fullPage: true })
})

test('erro interno fica visível e retry conserva chave idempotente', async ({ page }) => {
  const chamadas = await preparar(page, 'erro_emissao', true)
  await expect(page.getByText('Falha interna registrada.')).toBeVisible()
  await expect(page.getByText('Última tentativa de emissão: Erro interno')).toBeVisible()
  await page.getByRole('button', { name: 'Solicitar emissão' }).click()
  await page.getByRole('button', { name: 'Confirmar solicitação' }).click()
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Solicitação fiscal registrada' })).toBeVisible()
  expect(chamadas).toHaveLength(2)
  expect(chamadas[0].parametros.p_idempotency_key).toBe(chamadas[1].parametros.p_idempotency_key)
})
