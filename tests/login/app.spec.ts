import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

test('aplicativo só abre após validar papel e unidade da sessão', async ({ page }, info) => {
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue()
    return route.abort()
  })
  await page.route('https://financeiro.synthetic.invalid/auth/v1/token**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'synthetic-user', email: 'teste@example.invalid', aud: 'authenticated' } }),
  }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/usuarios_clinicas**', async route => {
    const consultaPapel = new URL(route.request().url()).searchParams.has('clinica_id')
    if (consultaPapel) await new Promise(resolve => setTimeout(resolve, 500))
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(consultaPapel ? { papel: 'recepcao' } : [{ clinica_id: 'clinica-permitida', papel: 'recepcao' }]) })
  })
  await page.route('https://financeiro.synthetic.invalid/rest/v1/clinicas**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'clinica-permitida', nome: 'Clínica Brotas', cor_primaria: '#006194', cor_secundaria: '#213145', cor_menu: '#213145' }]) }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/agendamentos**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Acesso à Clínica Brotas' })).toBeVisible()
  await page.locator('#email').fill('teste@example.invalid')
  await page.locator('#password').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Acessar Sistema Integrado' }).click()
  await expect(page.locator('.app-shell')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Sessão ativa' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar na Clínica Brotas' }).click()
  await expect(page.locator('.app-shell')).toHaveCount(0)
  await mkdir('scratch/login-aprovado', { recursive: true })
  await page.screenshot({ path: `scratch/login-aprovado/${info.project.name}-validacao.png`, fullPage: true })
  await expect(page.locator('.app-shell')).toBeVisible()
  await expect(page.getByText('Visão da recepção')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('clinica-patricia:clinica-ativa-id'))).toBe('clinica-permitida')
})

test('mudança de permissão entre as duas consultas bloqueia a entrada', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  await page.route('https://financeiro.synthetic.invalid/auth/v1/token**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'synthetic-user', email: 'teste@example.invalid', aud: 'authenticated' } }) }))
  await page.route('https://financeiro.synthetic.invalid/auth/v1/logout**', route => route.fulfill({ status: 204, body: '' }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/usuarios_clinicas**', route => {
    const consultaPapel = new URL(route.request().url()).searchParams.has('clinica_id')
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(consultaPapel ? { papel: 'medico' } : [{ clinica_id: 'clinica-permitida', papel: 'recepcao' }]) })
  })
  await page.route('https://financeiro.synthetic.invalid/rest/v1/clinicas**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'clinica-permitida', nome: 'Clínica Brotas', cor_primaria: '#006194', cor_secundaria: '#213145', cor_menu: '#213145' }]) }))
  await page.goto('/')
  await page.locator('#email').fill('teste@example.invalid')
  await page.locator('#password').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Acessar Sistema Integrado' }).click()
  await expect(page.getByRole('heading', { name: 'Sessão ativa' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar na Clínica Brotas' }).click()
  await expect(page.getByRole('alert')).toContainText('não está autorizado')
  await expect(page.locator('.app-shell')).toHaveCount(0)
})
