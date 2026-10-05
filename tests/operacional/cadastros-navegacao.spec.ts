import { expect, test, type Page } from '@playwright/test'

test.use({ hasTouch: true })
test.setTimeout(90_000)
const nome = 'Pessoa Sintética da Navegação'
const abas = ['Equipe & acessos', 'Especialidades', 'Profissionais', 'Serviços']

async function preparar(page: Page, unidade = 'brotas') {
  let escritas = 0
  const clinicas = [{ id: 'clinica-a', nome: 'Clínica Brotas' }, { id: 'clinica-b', nome: 'Clínica Ipupiara' }]
  const pessoa = { id: 'pessoa-sintetica', nome_completo: nome, tipo: 'profissional_saude', cargo: 'Médico(a)',
    profissao: 'Medicina', telefone: null, email_contato: null, conselho_classe: null, registro_conselho: null,
    conselho_uf: null, especialidade_id: null, especialidade_nome: null, clinicas, revisao: 1, acesso_status: 'ativo_na_unidade' }
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const json = (data: unknown) => route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(data) })
    if (url.pathname.endsWith('/usuarios_clinicas')) return json({ papel: 'proprietaria' })
    if (url.pathname.endsWith('/clinicas')) return json(clinicas)
    if (url.pathname.endsWith('/rpc/equipe_listar')) return json([pessoa])
    if (url.pathname.endsWith('/rpc/equipe_detalhar')) return json({ ...pessoa, cpf: null, cpf_situacao: 'ausente' })
    if (url.pathname.includes('/functions/')) {
      if (route.request().postDataJSON().acao !== 'listar') { escritas++; return json({}) }
      return json({ membro_id: pessoa.id, usuario_id: 'usuario-sintetico', login_email: 'login@synthetic.invalid', conta_confirmada: true,
        clinicas: clinicas.map(c => ({ ...c, status: 'acesso_ativo', papel: 'medico' })), convites: [] })
    }
    if (route.request().method() !== 'GET' && !url.pathname.includes('listar')) escritas++
    return json([])
  })
  await page.goto(`/sistema/${unidade}/equipe?previa=cadastros`)
  await expect(page.getByRole('button', { name: `Ver cadastro de ${nome}` })).toBeVisible({ timeout: 30_000 })
  return () => escritas
}

async function semTransbordamento(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

async function abaVisivel(page: Page, titulo: string) {
  const botao = page.getByRole('navigation', { name: 'Seções de Cadastros' }).getByRole('button', { name: titulo, exact: true })
  await expect.poll(() => botao.evaluate(el => {
    const faixa = el.parentElement!.getBoundingClientRect(), r = el.getBoundingClientRect()
    return r.left >= faixa.left && r.right <= faixa.right + 1
  })).toBe(true)
  return botao
}

for (const largura of [360, 390, 430, 820, 1440]) {
  test(`Cadastros: faixa contida e navegação em ${largura}px`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 1000 })
    const escritas = await preparar(page)
    await page.screenshot({ path: `scratch/cadastros-navegacao-movel/${largura}-inicio.png` })
    await semTransbordamento(page)
    const faixa = page.getByRole('navigation', { name: 'Seções de Cadastros' })
    expect(await faixa.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(largura < 500)
    // Clique programático testa a revelação da seleção sem a rolagem implícita do locator.
    await faixa.getByRole('button', { name: 'Serviços', exact: true }).evaluate(el => (el as HTMLButtonElement).click())
    await expect(await abaVisivel(page, 'Serviços')).toHaveAttribute('aria-pressed', 'true')
    await semTransbordamento(page)
    // Teclado percorre todas as abas; foco e seleção continuam distintos até Enter.
    await faixa.getByRole('button', { name: abas[0], exact: true }).focus()
    for (let i = 0; i < abas.length; i++) {
      const botao = await abaVisivel(page, abas[i])
      await expect(botao).toBeFocused()
      expect(await botao.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
      await page.keyboard.press('Enter')
      await expect(botao).toHaveAttribute('aria-pressed', 'true')
      if (i < abas.length - 1) await page.keyboard.press('Tab')
    }
    // Deslizamento horizontal permanece na faixa; toque seleciona a aba visível.
    await faixa.evaluate(el => { el.scrollLeft = 0 })
    for (const titulo of abas) {
      await faixa.getByRole('button', { name: titulo, exact: true }).tap()
      await abaVisivel(page, titulo)
      await semTransbordamento(page)
    }
    await page.screenshot({ path: `scratch/cadastros-navegacao-movel/${largura}-servicos.png` })
    await page.reload()
    await expect(faixa.getByRole('button', { name: abas[0], exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page).toHaveURL(/\/sistema\/brotas\/equipe\?previa=cadastros$/)
    await page.getByRole('button', { name: `Ver cadastro de ${nome}` }).click()
    await expect(page.getByTestId('painel-gestao-acessos')).toBeVisible()
    await expect(page.getByLabel('Papel de Clínica Brotas')).toHaveValue('medico')
    await page.getByRole('button', { name: 'Fechar', exact: true }).click()
    await semTransbordamento(page)
    expect(escritas()).toBe(0)
  })
}

test('Cadastros: identidade Ipupiara, tema escuro e percurso reverso', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const escritas = await preparar(page, 'ipupiara')
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'escuro'))
  const faixa = page.getByRole('navigation', { name: 'Seções de Cadastros' })
  await faixa.getByRole('button', { name: 'Serviços', exact: true }).focus()
  for (const titulo of [...abas].reverse()) {
    const botao = await abaVisivel(page, titulo)
    await expect(botao).toBeFocused()
    await botao.press('Space')
    await expect(botao).toHaveAttribute('aria-pressed', 'true')
    if (titulo !== abas[0]) await page.keyboard.press('Shift+Tab')
  }
  await semTransbordamento(page)
  await expect(page.getByLabel('Selecionar clínica')).toHaveValue('clinica-b')
  await page.screenshot({ path: 'scratch/cadastros-navegacao-movel/ipupiara-escuro.png' })
  await page.reload()
  await expect(page).toHaveURL(/\/sistema\/ipupiara\/equipe\?previa=cadastros$/)
  await expect(page.getByLabel('Selecionar clínica')).toHaveValue('clinica-b')
  expect(escritas()).toBe(0)
})
