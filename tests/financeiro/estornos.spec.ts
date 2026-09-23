import { expect, test, type Page } from '@playwright/test'

async function preparar(page: Page, papel: 'recepcao' | 'proprietaria' | 'medico') {
  const chamadas: Array<{ nome: string; parametros: Record<string, unknown> }> = []
  let pendente = papel === 'proprietaria'
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const nome = url.pathname.split('/').pop()!
    let data: unknown = []
    if (nome === 'recebimentos') data = [{ id: 'recebimento-sintetico', paciente_id: 'paciente-sintetico',
      profissional_id: 'profissional-sintetico', registrado_em: '2026-09-22T12:00:00Z',
      valor_bruto: '500.00', status: 'confirmado', recebimentos_pagamentos: [
        { forma_pagamento: 'dinheiro', valor: '200.00' }, { forma_pagamento: 'pix', valor: '200.00' },
        { forma_pagamento: 'cartao_credito', valor: '100.00' },
      ] }]
    else if (nome === 'pacientes') data = [{ id: 'paciente-sintetico', nome_completo: 'Paciente Exemplo' }]
    else if (nome === 'profissionais') data = [{ id: 'profissional-sintetico', nome_completo: 'Profissional Exemplo' }]
    else if (nome === 'estornos') data = pendente ? [{ id: 'estorno-sintetico', recebimento_id: 'recebimento-sintetico',
      status: 'solicitado', valor_total: '50.00', motivo: 'Ajuste solicitado', solicitado_em: '2026-09-22T13:00:00Z',
      estornos_pagamentos: [{ forma_pagamento: 'dinheiro', valor: '50.00' }] }] : []
    else if (nome === 'financeiro_solicitar_estorno' || nome === 'financeiro_revisar_estorno') {
      chamadas.push({ nome, parametros: route.request().postDataJSON() })
      pendente = nome === 'financeiro_solicitar_estorno'
      data = { nova_operacao: true, status: pendente ? 'solicitado' : 'efetivado' }
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
  })
  await page.goto(`/tests/financeiro/estornos.html?papel=${papel}`)
  if (papel !== 'medico') await page.getByRole('button', { name: 'Estornos', exact: true }).click()
  return chamadas
}

test('recepção seleciona recebimento sem UUID e solicita estorno parcial pela forma original', async ({ page }, info) => {
  const chamadas = await preparar(page, 'recepcao')
  await expect(page.getByText('Paciente Exemplo').first()).toBeVisible()
  await page.getByRole('button', { name: 'Solicitar estorno' }).click()
  await expect(page.getByText('Disponível R$ 200,00').first()).toBeVisible()
  await page.getByLabel('Dinheiro').fill('50,00')
  await page.getByLabel('Motivo').fill('Correção do pagamento')
  await page.getByRole('button', { name: 'Solicitar', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Solicitação de estorno registrada' })).toBeVisible()
  await page.screenshot({ path: `scratch/financeiro-estornos-${info.project.name}.png`, fullPage: true })
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].nome).toBe('financeiro_solicitar_estorno')
  expect(chamadas[0].parametros.p_recebimento_id).toBe('recebimento-sintetico')
  expect(chamadas[0].parametros.p_pagamentos).toEqual([{ forma_pagamento: 'dinheiro', valor: 50 }])
})

test('recepção filtra pelas formas e solicita total disponível em split', async ({ page }) => {
  const chamadas = await preparar(page, 'recepcao')
  const busca = page.getByRole('searchbox', { name: 'Buscar nesta página' })
  await busca.fill('inexistente')
  await expect(page.getByText('Nada encontrado nesta página')).toBeVisible()
  await busca.fill('Cartão')
  await expect(page.getByText('Cartão de crédito R$ 100,00')).toBeVisible()
  await page.getByRole('button', { name: 'Solicitar estorno' }).click()
  await page.getByRole('button', { name: 'Preencher total disponível' }).click()
  await expect(page.getByLabel('Dinheiro')).toHaveValue('200,00')
  await expect(page.getByLabel('PIX')).toHaveValue('200,00')
  await expect(page.getByLabel('Cartão de crédito')).toHaveValue('100,00')
  await page.getByLabel('Motivo').fill('Estorno total solicitado')
  await page.getByRole('button', { name: 'Solicitar', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Solicitação de estorno registrada' })).toBeVisible()
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].parametros.p_pagamentos).toEqual([
    { forma_pagamento: 'dinheiro', valor: 200 }, { forma_pagamento: 'pix', valor: 200 },
    { forma_pagamento: 'cartao_credito', valor: 100 },
  ])
})

test('valor excedente é bloqueado antes da RPC', async ({ page }) => {
  const chamadas = await preparar(page, 'recepcao')
  await page.getByRole('button', { name: 'Solicitar estorno' }).click()
  await page.getByLabel('Dinheiro').fill('200,01')
  await page.getByLabel('Motivo').fill('Valor excedente')
  await page.getByRole('button', { name: 'Solicitar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('excede o disponível')
  expect(chamadas).toHaveLength(0)
})

test('proprietária revisa pendência com contexto do recebimento original', async ({ page }) => {
  const chamadas = await preparar(page, 'proprietaria')
  await expect(page.getByRole('heading', { name: 'Aguardando sua revisão' })).toBeVisible()
  await page.getByRole('button', { name: 'Revisar' }).click()
  await expect(page.getByText('Pagamento original R$ 500,00')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar decisão' }).click()
  await expect(page.getByText('Nenhum estorno aguardando revisão')).toBeVisible()
  expect(chamadas).toHaveLength(1)
  expect(chamadas[0].nome).toBe('financeiro_revisar_estorno')
  expect(chamadas[0].parametros.p_acao).toBe('aprovar')
})

test('médico não consulta a fila administrativa', async ({ page }) => {
  const chamadas = await preparar(page, 'medico')
  await expect(page.getByRole('heading', { name: 'Meu financeiro' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Estornos' })).toHaveCount(0)
  expect(chamadas).toHaveLength(0)
})
