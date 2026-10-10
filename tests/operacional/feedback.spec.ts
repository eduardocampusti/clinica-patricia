import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => { await page.goto('/tests/operacional/feedback.html') })

test('apresenta sucesso, alerta e erro com semântica e tokens próprios', async ({ page }, testInfo) => {
  await expect(page.locator('[role="status"]').filter({ hasText: 'Alterações salvas' })).toBeVisible()
  await expect(page.locator('[role="status"]').filter({ hasText: 'Ação pendente' })).toBeVisible()
  await expect(page.locator('[role="alert"]').filter({ hasText: 'Não foi possível salvar' })).toBeVisible()
  const cores = await page.locator('[data-slot="alert"]').evaluateAll((itens) => itens.map((item) => {
    const css = getComputedStyle(item)
    return [css.backgroundColor, css.borderColor, css.color]
  }))
  expect(new Set(cores.map((cor) => cor.join('|'))).size).toBe(3)
  await page.screenshot({ path: `scratch/feedback-${testInfo.project.name}.png`, fullPage: true })
})

test('mensagem temporária pausa durante interação e pode fechar manualmente', async ({ page }) => {
  await page.getByRole('button', { name: 'Mostrar sucesso temporário' }).click()
  const alerta = page.locator('[role="status"]').filter({ hasText: 'Foto atualizada' })
  await alerta.hover()
  await page.waitForTimeout(550)
  await expect(alerta).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(alerta).toBeHidden({ timeout: 1800 })
  await page.getByRole('button', { name: 'Mostrar sucesso temporário' }).click()
  await page.getByRole('button', { name: 'Fechar mensagem' }).click()
  await expect(alerta).toBeHidden()
})

test('AlertDialog contém foco e distingue cancelar de confirmar', async ({ page }, testInfo) => {
  const gatilho = page.getByRole('button', { name: 'Remover foto' })
  await gatilho.click()
  const dialogo = page.getByRole('alertdialog', { name: 'Remover a foto deste paciente?' })
  await expect(dialogo).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancelar' })).toBeFocused()
  await page.screenshot({ path: `scratch/feedback-dialog-${testInfo.project.name}.png`, fullPage: true })
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()
  await expect(gatilho).toBeFocused()
  await gatilho.click()
  await page.getByRole('button', { name: 'Remover foto', exact: true }).last().click()
  await expect(page.getByTestId('confirmacoes')).toHaveText('Confirmações: 1')
})

test('mantém contraste sem animação obrigatória no tema escuro', async ({ page }) => {
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'escuro'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Remover foto' }).click()
  const duracao = await page.locator('[data-slot="alert-dialog-content"]').evaluate((item) => getComputedStyle(item).animationName)
  expect(duracao).toBe('none')
  await expect(page.getByRole('alertdialog')).toBeVisible()
})
