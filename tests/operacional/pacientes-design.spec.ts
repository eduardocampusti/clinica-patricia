import { expect, test } from '@playwright/test'

test('capturas do cadastro de pacientes inspirado no Stitch', async ({ page }, info) => {
  if (info.project.name === 'desktop') await page.setViewportSize({ width: 1600, height: 1280 })
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      return route.continue()
    }
    if (url.hostname === 'viacep.com.br') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          cep: '45000-000',
          logradouro: 'Rua das Acácias',
          bairro: 'Centro',
          localidade: 'Vitória da Conquista',
          uf: 'BA',
        }),
      })
    }
    if (url.hostname === 'operacional.synthetic.invalid' && url.pathname.endsWith('/pacientes')) {
      return route.fulfill({ contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })

  await page.goto('/tests/operacional/pacientes.html')
  await page.getByRole('button', { name: /Novo paciente/ }).click()
  await page.evaluate(() => document.fonts.ready)
  const fontes = await page.evaluate(() => ({
    pagina: getComputedStyle(document.body).fontFamily,
    cadastro: getComputedStyle(document.querySelector('.paciente-modal') as Element).fontFamily,
  }))
  expect(fontes.pagina).toContain('Geist')
  expect(fontes.cadastro).toContain('Plus Jakarta Sans')
  await expect(page.locator('.paciente-avatar svg')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => window.innerWidth))
  await expect.poll(() => page.locator('.paciente-modal-scroll').evaluate((elemento) => elemento.scrollWidth)).toBe(await page.locator('.paciente-modal-scroll').evaluate((elemento) => elemento.clientWidth))
  await expect(page.locator('.paciente-etapas .indisponivel')).toHaveCount(2)
  expect((await page.locator('.paciente-etapas .indisponivel').allTextContents()).every((texto) => !texto.includes('✓'))).toBe(true)
  await page.getByLabel('Nome completo').fill('Marina Pereira de Souza')
  await expect(page.locator('.paciente-avatar')).toHaveText('MS')
  await page.getByLabel('Data de nascimento').fill('1992-05-18')
  await page.getByLabel('Sexo').selectOption('feminino')
  await expect(page.getByText('Idade calculada:')).toBeVisible()
  await page.locator('.paciente-modal-scroll').evaluate((elemento) => { elemento.scrollTop = 0; elemento.scrollLeft = 0 })
  await page.locator('.paciente-modal-backdrop').screenshot({ path: `scratch/pacientes-design-identificacao-${info.project.name}.png` })

  await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
  await page.getByLabel('CEP').fill('45000000')
  await expect(page.getByLabel('Cidade')).toHaveValue('Vitória da Conquista')
  await expect(page.getByText('Dados sugeridos pela consulta do CEP. Confira e corrija, se necessário.')).toBeVisible()
  await expect(page.locator('.paciente-aviso-real')).toHaveCount(0)
  await page.getByLabel('Número').fill('125')
  await page.getByLabel('Complemento').fill('Sala 2')
  await page.getByLabel('Telefone / WhatsApp').fill('77999998888')
  await page.getByLabel('E-mail').fill('paciente.exemplo@example.invalid')
  await expect(page.getByText(/não registra autorização genérica/)).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await page.locator('.paciente-modal-scroll').evaluate((elemento) => { elemento.scrollTop = 0; elemento.scrollLeft = 0 })
  await page.locator('.paciente-modal-backdrop').screenshot({ path: `scratch/pacientes-design-endereco-${info.project.name}.png` })
})
