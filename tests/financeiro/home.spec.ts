import { expect, test } from '@playwright/test'

test('início não apresenta números financeiros fictícios como reais', async ({ page }, info) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    return route.fulfill({ contentType: 'application/json', body: '[]' })
  })
  await page.goto('/tests/financeiro/home.html')
  await expect(page.getByText('Nenhum agendamento restante hoje.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Indicadores financeiros' })).toBeVisible()
  await expect(page.getByText('Consulte o módulo Financeiro para ver valores oficiais conforme suas permissões.')).toBeVisible()
  await expect(page.getByText(/Saldo do dia|Entradas menos saídas|Repasse do dia por profissional/)).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('R$')
  await page.screenshot({ path: `scratch/financeiro-home-${info.project.name}.png`, fullPage: true })
})
