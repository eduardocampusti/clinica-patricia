import { expect, test } from '@playwright/test'
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
})
for (const unidade of ['brotas', 'ipupiara']) {
  test(`solicitação neutra e retorno restrito — ${unidade}`, async ({ page }) => {
    await page.setViewportSize({ width: unidade === 'brotas' ? 1280 : 390, height: 844 })
    let requests = 0
    await page.route('**/auth/v1/recover**', async route => {
      requests++
      expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe(`http://127.0.0.1:4182/acesso/${unidade}?recuperar=1`)
      await new Promise(resolve => setTimeout(resolve, 200))
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto(`/acesso/${unidade}`)
    await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
    await page.getByLabel('E-mail de acesso').fill('teste@example.invalid')
    await page.getByRole('button', { name: 'Enviar instruções' }).dblclick()
    await expect(page.getByText('Solicitação registrada')).toBeVisible()
    await expect(page.getByText(/Se o e-mail estiver cadastrado/)).toBeVisible()
    expect(requests).toBe(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  })
}
test('falha técnica preserva formulário; retorno sem prova não altera senha', async ({ page }) => {
  await page.route('**/auth/v1/recover**', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"msg":"synthetic"}' }))
  await page.goto('/acesso/brotas')
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await page.getByLabel('E-mail de acesso').fill('teste@example.invalid')
  await page.getByRole('button', { name: 'Enviar instruções' }).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível')
  await expect(page.getByLabel('E-mail de acesso')).toHaveValue('teste@example.invalid')
  await page.goto('/acesso/brotas?recuperar=1#error_code=otp_expired')
  await expect(page.getByText('Link inválido ou expirado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toHaveCount(0)
})

test('retorno autenticado sintético: validação, falha e sucesso sem conceder acesso', async ({ page }) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'teste@example.invalid', aud: 'authenticated' }
  const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, aud: 'authenticated' })).toString('base64url'), 'synthetic'].join('.')
  let updates = 0
  await page.route('**/auth/v1/user', route => {
    if (route.request().method() !== 'PUT') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)})
    updates++
    return route.fulfill({status: updates === 1 ? 422 : 200,contentType:'application/json',body:JSON.stringify(updates === 1 ? {msg:'synthetic failure'} : user)})
  })
  await page.route('**/auth/v1/logout**', route => route.fulfill({status:204,body:''}))
  await page.goto(`/acesso/brotas?recuperar=1#access_token=${jwt}&refresh_token=synthetic&expires_in=3600&token_type=bearer&type=recovery`)
  await expect(page.getByLabel('Nova senha', {exact:true})).toBeVisible()
  await page.getByLabel('Nova senha', {exact:true}).fill('sintetica-123456')
  await page.getByLabel('Confirmar nova senha').fill('diferente')
  await page.getByRole('button',{name:'Salvar nova senha'}).click()
  await expect(page.getByText('As senhas não coincidem.')).toBeVisible()
  expect(updates).toBe(0)
  await page.getByLabel('Confirmar nova senha').fill('sintetica-123456')
  await page.getByRole('button',{name:'Salvar nova senha'}).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível alterar')
  await page.getByRole('button',{name:'Salvar nova senha'}).click()
  await expect(page.getByText('Senha alterada',{exact:true})).toBeVisible()
  await expect(page.locator('.app-shell')).toHaveCount(0)
  expect(updates).toBe(2)
})
