import { expect, test, type Page } from '@playwright/test'

type Papel = 'OWNER' | 'RECEPTION' | 'DOCTOR'

function credenciais(papel: Papel) {
  const email = process.env[`SMOKE_${papel}_EMAIL`]
  const password = process.env[`SMOKE_${papel}_PASSWORD`]
  if (!email || !password) throw new Error(`Credenciais temporárias ausentes para ${papel}.`)
  return { email, password }
}

async function entrar(page: Page, papel: Papel, rotulo: RegExp) {
  const { email, password } = credenciais(papel)
  await page.goto('/')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(rotulo)).toBeVisible()

  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible({ timeout: 30_000 })
}

async function abrir(page: Page, nome: string) {
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: nome, exact: true }).click()
  await expect(page.locator('main')).toBeVisible()
}

async function sair(page: Page) {
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
}

test('proprietária — sessão, clínicas e módulos operacionais', async ({ page }) => {
  await entrar(page, 'OWNER', /Visão proprietária/)
  const nav = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(nav).toContainText('Agenda')
  await expect(nav).toContainText('Pacientes')
  await expect(nav).toContainText('Prontuários')
  await expect(nav).toContainText('Financeiro')
  await abrir(page, 'Agenda')
  await abrir(page, 'Financeiro')
  const areas = page.getByRole('navigation', { name: 'Áreas do Financeiro' })
  for (const aba of ['Caixa', 'Estornos', 'Repasses', 'Fiscal', 'Painel', 'Relatórios']) {
    await expect(areas.getByRole('button', { name: aba, exact: true })).toBeVisible()
    await areas.getByRole('button', { name: aba, exact: true }).click()
  }
  await page.screenshot({ path: 'scratch/fase13-smoke/proprietaria.png', fullPage: true })
  await sair(page)
})

test('recepção — operação sem áreas gerenciais', async ({ page }) => {
  await entrar(page, 'RECEPTION', /Visão da recepção/)
  const nav = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(nav).toContainText('Agenda')
  await expect(nav).toContainText('Pacientes')
  await expect(nav).not.toContainText('Prontuários')
  await abrir(page, 'Agenda')
  await abrir(page, 'Pacientes')
  await abrir(page, 'Financeiro')
  const areas = page.getByRole('navigation', { name: 'Áreas do Financeiro' })
  await expect(areas).toContainText('Caixa')
  await expect(areas).toContainText('Estornos')
  await expect(areas).toContainText('Fiscal')
  await expect(areas).not.toContainText(/Repasses|Painel|Relatórios/)
  await page.screenshot({ path: 'scratch/fase13-smoke/recepcao.png', fullPage: true })
  await sair(page)
})

test('médico — prontuário e financeiro próprio sem gestão', async ({ page }) => {
  await entrar(page, 'DOCTOR', /Visão do profissional/)
  const nav = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(nav).toContainText('Agenda')
  await expect(nav).toContainText('Prontuários')
  await expect(nav).not.toContainText(/Pacientes|Equipe/)
  await abrir(page, 'Agenda')
  await abrir(page, 'Prontuários')
  await abrir(page, 'Financeiro')
  const areas = page.getByRole('navigation', { name: 'Áreas do Financeiro' })
  await expect(areas).toContainText('Painel')
  await expect(areas).toContainText('Relatórios')
  await expect(areas).not.toContainText(/Caixa|Estornos|Fiscal|Repasses/)
  await page.screenshot({ path: 'scratch/fase13-smoke/medico.png', fullPage: true })
  await sair(page)
})
