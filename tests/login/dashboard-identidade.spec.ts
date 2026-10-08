import { expect, test } from '@playwright/test'
import { abrirMenu, clinicas, preparar, type PerfilSintetico } from './dashboard-fixture'

async function entrar(page: Parameters<typeof preparar>[0]) {
  await page.getByLabel('E-mail institucional ou CRM / Identificador', { exact: true }).fill('login@example.invalid')
  await page.getByLabel('Senha de Acesso', { exact: true }).fill('senha-sintetica-sem-conta-real')
  await page.getByRole('button', { name: 'Acessar Sistema Integrado', exact: true }).click()
}
for (const unidade of ['brotas', 'ipupiara'] as const) {
  test(`novo login segue clínica da entrada e abre dashboard — ${unidade}`, async ({ page }) => {
    const { escritas } = await preparar(page, 'proprietaria', 'normal', { nome: 'Pessoa Sintética', anonimo: true })
    await page.goto(`/sistema/${unidade}/financeiro`)
    await entrar(page)
    await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/dashboard$`))
    await expect(page.getByRole('heading', { name: /Pessoa!/ })).toBeVisible()
    expect(escritas).toEqual([])
  })
  for (const tela of ['agenda', 'equipe', 'financeiro']) test(`F5 preserva página e unidade — ${unidade}/${tela}`, async ({ page }) => {
    const { escritas } = await preparar(page)
    await page.goto(`/sistema/${unidade}/${tela}`)
    await expect(page.locator('.app-shell-header')).toBeVisible()
    await page.reload()
    await expect(page.locator('.app-shell-header')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/${tela}$`))
    expect(escritas).toEqual([])
  })
  for (const largura of [360, 390, 430]) test(`identidade longa e menu móvel sem overflow — ${unidade}/${largura}`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 844 })
    await preparar(page, 'proprietaria', 'normal', { nome: 'NomeMuitoLongoSemEspacosParaVerificarQuebraNatural Sobrenome Completo de Teste Sintético' })
    await page.goto(`/sistema/${unidade}/dashboard`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('NomeMuitoLongoSemEspacos')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await abrirMenu(page)
    await expect(page.getByText('Sistema Multiclínicas', { exact: true })).toBeVisible()
    await expect(page.locator('[data-slot="sidebar-footer"]')).toContainText('Sobrenome Completo de Teste Sintético')
    for (const titulo of ['Equipe', 'Financeiro']) await expect(page.getByRole('link', { name: titulo, exact: true })).toHaveAttribute('href', `/sistema/${unidade}/${titulo === 'Equipe' ? 'equipe' : 'financeiro'}`)
    expect(await page.locator('#app-sidebar').evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true)
  })
}
test('foto privada vinculada, cabeçalho e rodapé coerentes e menu recolhido acessível', async ({ page }) => {
  const { escritas, consultas } = await preparar(page, 'proprietaria', 'normal', { nome: 'Pessoa Sintética', foto: 'vinculada' })
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.locator('.app-shell-header img')).toHaveAttribute('src', /^blob:/)
  await expect(page.locator('[data-slot="sidebar-footer"] img')).toHaveAttribute('src', await page.locator('.app-shell-header img').getAttribute('src') ?? '')
  await expect.poll(() => page.locator('.app-shell-header img').evaluate(e => (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Recolher menu' }).click()
  await expect(page.locator('[data-slot="sidebar-footer"]').getByRole('img')).toHaveAttribute('aria-label', 'Pessoa Sintética · Proprietário(a)')
  await expect(page.getByRole('link', { name: 'Equipe', exact: true })).toHaveAttribute('title', 'Equipe')
  await expect(page.getByRole('link', { name: 'Financeiro', exact: true })).toHaveAttribute('title', 'Financeiro')
  expect(consultas.some(c => c.recurso === 'equipe_foto_autorizar')).toBe(true)
  expect(consultas.some(c => c.recurso === 'equipe_membros')).toBe(false)
  expect(escritas).toEqual([])
})
for (const foto of ['outra-pessoa', 'sem-vinculo-clinica'] as const) test(`nome semelhante não autoriza imagem — ${foto}`, async ({ page }) => {
  const { consultas } = await preparar(page, 'proprietaria', 'normal', { nome: 'Pessoa Sintética', foto })
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.getByRole('heading', { name: /Pessoa!/ })).toBeVisible()
  await expect(page.locator('.app-shell-header img')).toHaveCount(0)
  await expect(page.locator('.app-shell-header').getByRole('img')).toContainText('PS')
  expect(consultas.some(c => c.recurso === 'equipe_foto_autorizar')).toBe(false)
})
test('nome ausente não é inferido pelo e-mail; falha de nome é distinta da ausência', async ({ page }) => {
  const perfil: PerfilSintetico = { nome: null }
  await preparar(page, 'proprietaria', 'normal', perfil)
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.locator('[data-slot="sidebar-footer"]')).toContainText('Conta conectada')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Bom dia|Boa tarde|Boa noite)!$/)
  await expect(page.locator('.app-shell-header').getByRole('img')).toContainText('?')
  await expect(page.locator('body')).not.toContainText('login@example.invalid')
  perfil.erroNome = true
  await page.reload()
  await expect(page.locator('[data-slot="sidebar-footer"]')).toContainText('Nome indisponível', { timeout: 15000 })
})
test('foto indisponível é explicitada e mantém nome do perfil', async ({ page }) => {
  await preparar(page, 'proprietaria', 'normal', { nome: 'Pessoa Sintética', foto: 'erro' })
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.locator('[data-slot="sidebar-footer"]')).toContainText('Foto indisponível')
  await expect(page.getByRole('heading', { name: /Pessoa!/ })).toBeVisible()
  await expect(page.locator('.app-shell-header img')).toHaveCount(0)
})
test('logout e outra conta removem nome, foto e URL temporária anteriores', async ({ page }) => {
  const perfil: PerfilSintetico = { nome: 'Primeira Pessoa', foto: 'vinculada' }
  const { escritas } = await preparar(page, 'proprietaria', 'normal', perfil)
  await page.addInitScript(() => {
    const revogar = URL.revokeObjectURL.bind(URL)
    const lista: string[] = []
    Object.defineProperty(window, '__urlsRevogadas', { value: lista })
    URL.revokeObjectURL = url => { lista.push(url); revogar(url) }
  })
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.locator('.app-shell-header img')).toHaveAttribute('src', /^blob:/)
  const fotoAnterior = await page.locator('.app-shell-header img').getAttribute('src')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Acessar Sistema Integrado', exact: true })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Primeira Pessoa')
  expect(await page.evaluate(url => (window as unknown as { __urlsRevogadas: string[] }).__urlsRevogadas.includes(url!), fotoAnterior)).toBe(true)
  perfil.nome = 'Segunda Pessoa'; perfil.segundaConta = true
  await entrar(page)
  await expect(page.getByRole('heading', { name: /Segunda!/ })).toBeVisible()
  await expect(page.locator('[data-slot="sidebar-footer"]')).toContainText('Segunda Pessoa')
  await expect(page.locator('body')).not.toContainText('Primeira Pessoa')
  await expect(page.locator('.app-shell-header img')).toHaveCount(0)
  expect(escritas).toEqual([])
})
test('resposta tardia da conta anterior não preenche identidade após logout', async ({ page }) => {
  const perfil: PerfilSintetico = { nome: 'Nome da Conta Anterior', demoraNome: 700 }
  await preparar(page, 'proprietaria', 'normal', perfil)
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.locator('[data-slot="sidebar-footer"]')).toContainText('Carregando perfil')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  perfil.nome = 'Conta Atual'; perfil.demoraNome = 0; perfil.segundaConta = true
  await entrar(page)
  await expect(page.getByRole('heading', { name: /Conta!/ })).toBeVisible()
  await page.waitForTimeout(750)
  await expect(page.locator('body')).not.toContainText('Nome da Conta Anterior')
})
test('clínica muda papel, limpa foto e não consulta Equipe como Recepção', async ({ page }) => {
  const { consultas, escritas } = await preparar(page, 'proprietaria', 'normal', { nome: 'Pessoa Sintética', foto: 'vinculada', papeis: ['proprietaria', 'recepcao'] })
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.locator('.app-shell-header img')).toHaveAttribute('src', /^blob:/)
  const anteriores = consultas.length
  await page.getByRole('combobox', { name: 'Selecionar clínica', exact: true }).selectOption(clinicas[1].id)
  await expect(page.locator('[data-slot="sidebar-footer"]')).toContainText('Recepção')
  await expect(page.locator('.app-shell-header img')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /Pessoa!/ })).toBeVisible()
  expect(consultas.slice(anteriores).some(c => ['equipe_listar', 'equipe-acessos', 'equipe_foto_autorizar'].includes(c.recurso))).toBe(false)
  expect(escritas).toEqual([])
})
