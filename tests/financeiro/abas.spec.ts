import { expect, test, type Page } from '@playwright/test'

async function preparar(page: Page) {
  const chamadas: string[] = []
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    chamadas.push(url.pathname)
    return route.fulfill({ contentType: 'application/json', body: '[]' })
  })
  await page.goto('/tests/financeiro/abas.html')
  return chamadas
}

test('proprietária em Repasses passa à recepção sem manter conteúdo restrito', async ({ page }) => {
  const chamadas = await preparar(page)
  await page.getByRole('navigation', { name: 'Áreas do Financeiro' }).getByRole('button', { name: 'Repasses' }).click()
  await expect(page.getByRole('heading', { name: 'Repasses', exact: true })).toBeVisible()
  const antesTroca = chamadas.length
  await page.getByRole('button', { name: 'Simular recepção' }).click()
  await expect(page.getByRole('navigation', { name: 'Áreas do Financeiro' }).getByRole('button', { name: 'Caixa' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Repasses', exact: true })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Áreas do Financeiro' }).getByRole('button', { name: 'Repasses' })).toHaveCount(0)
  await page.waitForTimeout(100)
  expect(chamadas.slice(antesTroca).some((nome) => nome.includes('repasses'))).toBe(false)
})

test('proprietária em Painel passa a médico sem carregar painel da proprietária', async ({ page }) => {
  const chamadas = await preparar(page)
  await page.getByRole('navigation', { name: 'Áreas do Financeiro' }).getByRole('button', { name: 'Visão geral' }).click()
  await expect.poll(() => chamadas.filter((nome) => nome.includes('financeiro_dashboard_proprietaria')).length).toBe(1)
  const antesTroca = chamadas.length
  await page.getByRole('button', { name: 'Simular médico' }).click()
  await expect(page.getByRole('heading', { name: 'Meu financeiro' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toHaveCount(0)
  await page.waitForTimeout(100)
  expect(chamadas.slice(antesTroca).some((nome) => nome.includes('financeiro_dashboard_proprietaria'))).toBe(false)
})
