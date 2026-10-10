import { expect, test } from '@playwright/test'
import { preparar } from './dashboard-fixture'

for (const unidade of ['brotas', 'ipupiara']) {
  test(`publicação parcial: Configurações fechada e dashboard preservada em ${unidade}`, async ({ page }) => {
    await preparar(page)
    await page.goto(`/sistema/${unidade}/dashboard`)
    await expect(page.getByRole('heading', { name: 'Resumo do dia', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Resumo financeiro', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Configurações', exact: true })).toHaveCount(0)
    await page.goto(`/sistema/${unidade}/configuracoes`)
    await expect(page.getByText('Configurações em preparação', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Salvar rascunho|Aplicar|Enviar imagem/ })).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('Configurações em preparação', { exact: true })).toBeVisible()
    await page.goto(`/sistema/${unidade}/dashboard`)
    await expect(page.getByRole('heading', { name: 'Agenda do dia', exact: true })).toBeVisible()
  })
}
