import { expect, test } from '@playwright/test'
import { itemAtivo, itensParaPapel } from '../../src/components/shell/navigation'

const previa = '/tests/operacional/agenda-preview.html'
for (const papel of ['recepcao', 'medico', 'proprietaria'] as const) test(`menu e navegação autorizada: ${papel}`, async ({ page }, info) => {
  await page.goto(`${previa}?papel=${papel}`)
  if (info.project.name !== 'desktop') await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
  const nav = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(nav.getByRole('link')).toHaveCount(itensParaPapel(papel, 'brotas').length)
  for (const item of itensParaPapel(papel, 'brotas')) await expect(nav.getByRole('link', { name: item.titulo, exact: true })).toHaveAttribute('href', item.href)
  const destino = papel === 'medico' ? 'Prontuários' : 'Pacientes'
  await nav.getByRole('link', { name: destino, exact: true }).click()
  await expect(page.locator('.app-shell-header p').first()).toHaveText(destino)
  if (info.project.name !== 'desktop') await expect(page.getByRole('dialog', { name: 'Menu principal' })).toHaveCount(0)
})

test('configuração central: desconhecido não recebe itens; subpágina não ativa outro módulo', () => {
  expect(itensParaPapel(null, 'brotas')).toEqual([])
  expect(itemAtivo('/sistema/brotas/pacientes/ficha', '/sistema/brotas/pacientes')).toBe(true)
  expect(itemAtivo('/sistema/brotas/pacientesOutro', '/sistema/brotas/pacientes')).toBe(false)
  expect(itemAtivo('/sistema/ipupiara/pacientes', '/sistema/brotas/pacientes')).toBe(false)
})

for (const unidade of ['brotas', 'ipupiara']) test(`rotas, F5, histórico e preferência: ${unidade}`, async ({ page }, info) => {
  await page.goto(`${previa}?unidade=${unidade}`)
  if (info.project.name === 'desktop') {
    await page.getByRole('button', { name: 'Recolher menu' }).click()
    await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed')
    await expect(page.locator('#app-sidebar')).toHaveCSS('width', '76px')
  } else await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
  await page.getByRole('link', { name: 'Pacientes', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/pacientes\\?`))
  await page.reload()
  await expect(page.locator('.app-shell-header p').first()).toHaveText('Pacientes')
  if (info.project.name === 'desktop') await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()
  else { await expect(page.getByRole('dialog', { name: 'Menu principal' })).toHaveCount(0); await page.getByRole('button', { name: 'Abrir menu', exact: true }).click() }
  await expect(page.getByRole('link', { name: 'Pacientes', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('link', { name: 'Agenda', exact: true }).click()
  await page.goBack()
  await expect(page.locator('.app-shell-header p').first()).toHaveText('Pacientes')
  await page.goForward()
  await expect(page.locator('.app-shell-header p').first()).toHaveText('Agenda')
})

test('mobile: Escape, foco contido, retorno ao gatilho e preferência independente', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'cenário móvel')
  await page.goto(previa)
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
  const menu = page.getByRole('dialog', { name: 'Menu principal' })
  await expect(menu).toBeVisible()
  for (let i = 0; i < 16; i++) { await page.keyboard.press('Tab'); expect(await menu.evaluate(el => el.contains(document.activeElement))).toBe(true) }
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Abrir menu', exact: true })).toBeFocused()
  expect(await page.evaluate(() => localStorage.getItem('clinica:sidebar:expanded'))).toBeNull()
})

test('seletor de unidade funciona recolhido, sem estado paralelo; teclado e URL', async ({ page }, info) => {
  await page.goto('/tests/operacional/shell.html?papel=proprietaria')
  if (info.project.name === 'desktop') await page.getByRole('button', { name: 'Recolher menu' }).click()
  else await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
  const seletor = page.getByRole('button', { name: 'Selecionar clínica: Clínica Brotas', exact: true })
  await seletor.focus(); await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Clínica Ipupiara', exact: true }).click()
  await expect(page).toHaveURL(/\/sistema\/ipupiara\/dashboard\?/)
  await expect(page.getByRole('combobox', { name: 'Selecionar clínica' })).toHaveValue('clinica-b')
  if (info.project.name !== 'desktop') await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Agenda', exact: true })).toHaveAttribute('href', '/sistema/ipupiara/agenda')
})

test('recolher não remonta Agenda nem perde filtro ou rascunho; painéis mantêm foco', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'expansão desktop')
  await page.goto(previa)
  await expect(page.getByTestId('registro-agenda')).toHaveCount(3)
  await page.getByRole('button', { name: 'Grade por profissional', exact: true }).click()
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  const painel = page.getByRole('dialog', { name: 'Novo agendamento' })
  await painel.getByLabel('Observações').fill('Rascunho exclusivamente sintético')
  // O modal torna o fundo inert. Ensaio isolado de mudança do provider, não clique
  // de usuário através do overlay: comprova identidade do DOM/estado sem contornar
  // interação do modal na aplicação normal.
  await painel.evaluate(el => { el.setAttribute('data-identidade-teste', 'preservada'); document.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]')!.click() })
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed')
  await expect(painel).toHaveAttribute('data-identidade-teste', 'preservada')
  await expect(painel.getByLabel('Observações')).toHaveValue('Rascunho exclusivamente sintético')
  await painel.getByLabel('Observações').focus(); await page.keyboard.press('Control+b')
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute('data-state', 'collapsed')
  await expect(painel.getByLabel('Observações')).toBeFocused()
})

test('capturas finais e geometria em tema claro/escuro e zoom CSS', async ({ page }, info) => {
  await page.goto(`${previa}?unidade=ipupiara&complexa&curtas`)
  await expect(page.getByTestId('registro-agenda')).toHaveCount(8)
  if (info.project.name === 'desktop') {
    await page.screenshot({ path: 'scratch/sidebar/expandido.png', animations: 'disabled' })
    await page.getByRole('button', { name: 'Recolher menu' }).click()
    await expect(page.locator('#app-sidebar')).toHaveCSS('width', '76px')
    await page.screenshot({ path: 'scratch/sidebar/recolhido.png', animations: 'disabled' })
  } else {
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
    await page.screenshot({ path: `scratch/sidebar/movel-${info.project.name}.png`, animations: 'disabled' })
    await page.getByRole('button', { name: 'Fechar menu', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'escuro')
  for (const zoom of [1.25, 1.5]) {
    await page.evaluate(zoom => { document.documentElement.style.zoom = String(zoom) }, zoom)
    if (info.project.name !== 'desktop') await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
    const sair = page.getByRole('button', { name: 'Sair', exact: true })
    await expect(sair).toBeInViewport()
    expect(await sair.evaluate(el => { const r = el.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0 })).toBe(true)
    if (info.project.name !== 'desktop') await page.getByRole('button', { name: 'Fechar menu', exact: true }).click()
    else {
      await page.getByRole('button', { name: 'Expandir menu' }).click()
      await expect(sair).toBeInViewport()
      await page.getByRole('button', { name: 'Recolher menu' }).click()
    }
  }
})
