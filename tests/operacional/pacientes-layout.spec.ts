import { expect, test } from '@playwright/test'

const tamanhos = [
  { nome: 'desktop-1000', largura: 1440, altura: 1000, adultoRola: false },
  { nome: 'desktop-768', largura: 1366, altura: 768, adultoRola: false },
  { nome: 'desktop-baixo', largura: 1366, altura: 600, adultoRola: true },
  { nome: 'tablet', largura: 820, altura: 1180, adultoRola: null },
  { nome: 'celular', largura: 390, altura: 844, adultoRola: true },
] as const

test('identificação de adulto cabe no desktop e menor mantém etapas, foto e dados em telas menores', async ({ page }) => {
  test.setTimeout(180_000)
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.continue()
    if (url.hostname === 'operacional.synthetic.invalid' && url.pathname.endsWith('/pacientes')) {
      return route.fulfill({ contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })

  for (const tamanho of tamanhos) {
    await page.setViewportSize({ width: tamanho.largura, height: tamanho.altura })
    await page.goto('/tests/operacional/pacientes.html', { waitUntil: 'commit' })
    await page.getByRole('button', { name: /Novo paciente/ }).click()
    await page.locator('#paciente-nome').fill('Paciente Adulto Sintético')
    await page.getByLabel('Data de nascimento', { exact: true }).fill('1990-05-18')
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())

    const rolagemAdulto = await page.locator('.paciente-modal-scroll').evaluate((elemento) => elemento.scrollHeight - elemento.clientHeight > 1)
    if (tamanho.adultoRola !== null) expect(rolagemAdulto, tamanho.nome).toBe(tamanho.adultoRola)
    await expect(page.locator('.paciente-etapas button')).toHaveCount(2)
    await expect(page.getByRole('note', { name: 'Convênios — Em planejamento' })).toBeVisible()
    await expect(page.locator('.paciente-modal-rodape')).toBeInViewport()
    const controlesCortados = await page.locator('.paciente-modal-fechar, .paciente-etapas button, .paciente-etapa-planejada').evaluateAll((elementos) =>
      elementos.map((elemento) => {
        const caixa = elemento.getBoundingClientRect()
        return { nome: elemento.getAttribute('aria-label') || elemento.textContent?.trim(), esquerda: caixa.left, direita: caixa.right }
      }).filter((caixa) => caixa.esquerda < 0 || caixa.direita > window.innerWidth + 1))
    expect(controlesCortados, tamanho.nome).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), tamanho.nome).toBe(true)
    await page.locator('.paciente-modal-scroll').evaluate((elemento) => { elemento.scrollTop = 0 })
    await page.locator('.paciente-modal-backdrop').screenshot({ path: `scratch/pacientes-layout-adulto-${tamanho.nome}.png` })

    await page.getByLabel('Data de nascimento', { exact: true }).fill('2014-05-18')
    await expect(page.locator('.paciente-etapas button')).toHaveCount(3)
    await expect(page.getByRole('note', { name: 'Convênios — Em planejamento' })).toBeVisible()
    if (tamanho.nome === 'desktop-1000') {
      await page.locator('.paciente-arquivo-oculto').setInputFiles({
        name: 'foto-sintetica.png',
        mimeType: 'image/png',
        buffer: Buffer.from('imagem-sintetica-sem-dados-reais'),
      })
      await page.getByRole('button', { name: 'Confirmar foto' }).click()
    }
    await page.getByRole('button', { name: /Avançar para Responsável legal/ }).click()
    await expect(page.getByRole('group', { name: 'Responsável legal' })).toBeVisible()
    await page.getByLabel('Nome completo *', { exact: true }).last().fill('Responsável Sintético')
    await page.getByLabel('Vínculo com o paciente').fill('Mãe')
    await page.getByLabel('Telefone / WhatsApp *').fill('71999998888')
    const rolagemMenor = await page.locator('.paciente-modal-scroll').evaluate((elemento) => elemento.scrollHeight - elemento.clientHeight > 1)
    console.log(`${tamanho.nome}: adulto ${rolagemAdulto ? 'com' : 'sem'} rolagem; responsável ${rolagemMenor ? 'com' : 'sem'} rolagem`)
    const etapaCortada = await page.locator('.paciente-etapas button').evaluateAll((elementos) =>
      elementos.map((elemento) => elemento.getBoundingClientRect().toJSON()).filter((caixa) => caixa.right > window.innerWidth + 1))
    expect(etapaCortada, tamanho.nome).toEqual([])
    await page.locator('.paciente-modal-scroll').evaluate((elemento) => { elemento.scrollTop = 0 })
    await page.locator('.paciente-modal-backdrop').screenshot({ path: `scratch/pacientes-layout-menor-${tamanho.nome}.png` })
    if (tamanho.nome === 'celular') {
      await page.locator('.paciente-modal-scroll').evaluate((elemento) => { elemento.scrollTop = elemento.scrollHeight })
      await expect(page.getByLabel('E-mail (opcional)')).toBeInViewport()
      await page.locator('.paciente-modal-backdrop').screenshot({ path: 'scratch/pacientes-layout-menor-celular-fim.png' })
    }
    await page.getByRole('button', { name: /Avançar para Endereço/ }).click()
    await expect(page.getByRole('heading', { name: 'Endereço Residencial e Contatos' })).toBeVisible()
    await page.getByRole('button', { name: /Voltar para Responsável legal/ }).click()
    await expect(page.getByLabel('Nome completo *', { exact: true }).last()).toHaveValue('Responsável Sintético')
    await page.getByRole('button', { name: /Voltar para Identificação/ }).click()
    await expect(page.locator('#paciente-nome')).toHaveValue('Paciente Adulto Sintético')
    if (tamanho.nome === 'desktop-1000') await expect(page.getByAltText('Prévia da foto do paciente')).toBeVisible()
    await expect(page.locator('.paciente-modal-rodape')).toBeInViewport()
  }
})
