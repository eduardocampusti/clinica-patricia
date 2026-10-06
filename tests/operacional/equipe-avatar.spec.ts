import { expect, test } from '@playwright/test'

test.setTimeout(90_000)
for (const largura of [360,390,430,820,1440]) test(`avatar e composição compacta ${largura}px`, async ({page}) => {
  await page.setViewportSize({width:largura,height:largura < 768 ? 844 : 1000})
  const imagensExternas: string[] = []
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') { if(route.request().resourceType()==='image') imagensExternas.push(route.request().url()); return route.abort() }
    if (route.request().url().endsWith('/nao-existe.png')) return route.fulfill({status:404,body:''})
    return route.continue()
  })
  await page.goto('/tests/operacional/equipe-avatar.html')
  const foto = page.getByTestId('equipe-pessoa-foto')
  const iniciais = page.getByTestId('equipe-pessoa-iniciais')
  const falha = page.getByTestId('equipe-pessoa-falha')
  await expect(foto.locator('img')).toBeVisible({timeout:15000})
  await expect.poll(() => foto.locator('img').evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(iniciais.locator('.equipe-avatar-iniciais')).toHaveText('BC')
  await expect(falha.locator('.equipe-avatar-iniciais')).toHaveText('CV')
  await expect(iniciais.locator('.equipe-email-contato')).toHaveCount(0)
  await expect(foto.locator('.equipe-email-contato')).toHaveText('ana@exemplo.invalid')
  await expect(page.getByText('Pessoa cadastrada',{exact:true})).toHaveCount(0)
  for (const linha of [foto,iniciais,falha]) {
    expect(await linha.locator('.equipe-avatar').evaluate(el => el.getBoundingClientRect().width)).toBe(34)
    const checkbox = linha.getByRole('checkbox')
    expect(await checkbox.evaluate(el => el.getBoundingClientRect().width)).toBe(16)
    expect(await linha.locator('.equipe-alvo-selecao').evaluate(el => el.getBoundingClientRect().width)).toBe(44)
  }
  // Click beyond the 16px square, inside its 44px target, then use the keyboard.
  await iniciais.locator('.equipe-alvo-selecao').click({position:{x:8,y:22}})
  await expect(iniciais.getByRole('checkbox')).toBeChecked()
  await iniciais.getByRole('checkbox').press('Space')
  await expect(iniciais.getByRole('checkbox')).not.toBeChecked()
  await expect(iniciais.getByRole('checkbox')).toBeFocused()
  if (largura >= 768) {
    await expect(page.getByLabel('Ordenar por',{exact:true})).toHaveCount(0)
    const botoes = await foto.getByRole('button').evaluateAll(els => els.map(el => ({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height})))
    expect(botoes[0].top).toBe(botoes[1].top)
    expect(botoes[0].height).toBeGreaterThanOrEqual(44)
    expect(await foto.evaluate(el => el.getBoundingClientRect().height)).toBeLessThanOrEqual(80)
    await expect(page.locator('.equipe-grade-conjunto .equipe-paginacao')).toBeVisible()
  } else {
    await expect(page.getByLabel('Ordenar por',{exact:true})).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const [id,unidade] of [['clinica-a','brotas'],['clinica-b','ipupiara']]) {
    await page.getByLabel('Selecionar clínica',{exact:true}).selectOption(id)
    await expect(page.getByLabel('Clínica ativa',{exact:true})).toContainText(unidade === 'brotas' ? 'Brotas' : 'Ipupiara')
    await expect(foto.locator('img')).toBeVisible()
    await page.screenshot({path:`scratch/equipe-reui-visual/${unidade}-${largura}-avatar.png`,fullPage:true})
  }
  expect(imagensExternas).toEqual([])
})

test('foto não atravessa identidade ou clínica, sem consulta por linha',async({page}) => {
  const requests:string[]=[]
  page.on('request',r => requests.push(r.url()))
  for (const divergencia of ['pessoa','clinica']) {
    await page.goto(`/tests/operacional/equipe-avatar.html?divergencia=${divergencia}`)
    const avatar = page.getByTestId('equipe-pessoa-foto').locator('.equipe-avatar')
    await expect(avatar.locator('.equipe-avatar-iniciais')).toHaveText('AO')
    await expect(avatar.locator('img')).toHaveCount(0)
  }
  expect(requests.filter(u => u.endsWith('avatar-equipe-ficticio.png'))).toEqual([])
  expect(requests.filter(u => /\/rest\/v1|\/functions\/v1/.test(new URL(u).pathname))).toEqual([])
})
