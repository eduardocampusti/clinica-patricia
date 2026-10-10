import { test, expect } from '@playwright/test'

// Capturas complementares; não substituem a regressão completa de 129 cenários.
for (const unidade of ['brotas', 'ipupiara']) for (const tema of ['claro', 'escuro']) {
  test(`referência ${unidade}/${tema}`, async ({ page }, info) => {
    await page.addInitScript(t => localStorage.setItem('clinica-patricia:tema', t), tema)
    await page.goto(`/tests/operacional/pacientes-redesenho.html?unidade=${unidade}`)
    await expect(page.locator('.pacientes-lista-linha')).toHaveCount(8)
    if (info.project.name === 'lista') {
      await page.getByRole('button', { name: 'Ver resumo de Ana Exemplo Sintético', exact: true }).click()
      await expect(page.getByText('6 de 6 itens informados', { exact: true })).toBeVisible()
    }
    if (info.project.name === 'cadastro') {
      await page.getByRole('button', { name: 'Novo paciente', exact: true }).click()
      await page.getByLabel('Nome completo', { exact: false }).fill('Fernanda Exemplo Sintético')
      await page.getByLabel('Data de nascimento', { exact: true }).fill('2000-05-30')
      await page.getByLabel('Sexo', { exact: true }).selectOption('feminino')
      await expect(page.getByLabel('Prévia da identificação na lista')).toContainText('26 anos · Feminino')
      const campo = await page.getByLabel('Nome completo', { exact: false }).boundingBox()
      const rodape = await page.locator('.paciente-modal-rodape').boundingBox()
      expect(campo!.y + campo!.height).toBeLessThan(rodape!.y)
    }
    await page.screenshot({ path: `scratch/pacientes-redesenho/referencia-${unidade}-${tema}-${info.project.name}.png` })
  })
}
