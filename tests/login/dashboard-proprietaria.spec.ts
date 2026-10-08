import { expect, test, type Page } from '@playwright/test'
import type { Papel } from '../../src/hooks/usePapelNaClinica'

const clinicas = [
  { id: '22222222-2222-4222-8222-222222222222', nome: 'Clínica Brotas' },
  { id: '33333333-3333-4333-8333-333333333333', nome: 'Clínica Ipupiara' },
]

async function preparar(page: Page, papel: Papel = 'proprietaria', modo: 'normal' | 'erro-agenda' | 'erro-acesso' | 'lento' = 'normal') {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'teste@example.invalid', aud: 'authenticated' }
  const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })).toString('base64url'), 'synthetic'].join('.')
  const escritas: string[] = []
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'financeiro.synthetic.invalid') return route.abort()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const json = (data: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) })
    if (url.pathname.endsWith('/auth/v1/user')) return json(user)
    if (url.pathname.endsWith('/auth/v1/token')) return json({ access_token: jwt, refresh_token: 'synthetic', expires_in: 3600, token_type: 'bearer', user })
    const recurso = url.pathname.split('/').pop()
    // RPCs de consulta conhecidas; qualquer outra mutação é bloqueada e registrada.
    const leituraPost = url.pathname.startsWith('/rest/v1/rpc/') && ['equipe_listar', 'financeiro_dashboard_proprietaria'].includes(recurso ?? '')
    if (request.method() !== 'GET' && !leituraPost) {
      escritas.push(url.pathname)
      return json({ message: 'Mutação sintética bloqueada' }, 403)
    }
    if (recurso === 'financeiro_dashboard_proprietaria') return json({ message: 'Consulta financeira indisponível no cenário sintético' }, 503)
    if (recurso === 'usuarios_clinicas') {
      if (modo === 'erro-acesso') return json({ message: 'Falha sintética' }, 500)
      if (modo === 'lento') await new Promise(resolve => setTimeout(resolve, 500))
      const vinculos = clinicas.filter(c => !url.searchParams.has('clinica_id') || url.searchParams.get('clinica_id') === `eq.${c.id}`).map(c => ({ clinica_id: c.id, papel }))
      return json(request.headers().accept?.includes('object') ? vinculos[0] : vinculos)
    }
    if (recurso === 'clinicas') return json(clinicas)
    if (recurso === 'agendamentos') {
      if (modo === 'erro-agenda') return json({ message: 'Falha sintética' }, 500)
      return json([])
    }
    if (recurso === 'especialidades') return json([{ id: 'especialidade-sintetica', nome: 'Especialidade Sintética' }])
    if (recurso === 'servicos') {
      const clinica = clinicas.find(c => url.searchParams.get('clinica_id') === `eq.${c.id}`)
      return json([{ id: 'servico-sintetico', nome: `Serviço Sintético ${clinica?.nome}`, especialidade_id: 'especialidade-sintetica', especialidades: { nome: 'Especialidade Sintética' }, preco: 123.45, duracao_minutos: 30 }])
    }
    return json([])
  })
  await page.addInitScript(({ jwt, user }) => {
    localStorage.setItem('sb-financeiro-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'synthetic', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user }))
  }, { jwt, user })
  return escritas
}

for (const unidade of ['brotas', 'ipupiara'] as const) {
  test(`captura diagnóstica — ${unidade}`, async ({ page }, info) => {
    await preparar(page)
    await page.goto(`/sistema/${unidade}/dashboard`)
    await expect(page.getByText('Nenhum agendamento restante hoje.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Indicadores financeiros' })).toBeVisible()
    await page.screenshot({ path: `scratch/dashboard-proprietaria/${process.env.DASHBOARD_CAPTURA_ANTES === '1' ? 'antes' : 'depois'}-${unidade}-${info.project.name}.png`, fullPage: true })
  })

  test(`acesso administrativo, cadastros e recarga — ${unidade}`, async ({ page }) => {
    const escritas = await preparar(page)
    await page.goto(`/sistema/${unidade}/dashboard`)
    const administracao = page.getByRole('region', { name: 'Administração da clínica' })
    await expect(administracao).toBeVisible()
    await expect(administracao.getByRole('link', { name: 'Abrir cadastros' })).toHaveAttribute('href', `/sistema/${unidade}/equipe`)
    await expect(administracao.getByRole('link', { name: 'Abrir Financeiro' })).toHaveAttribute('href', `/sistema/${unidade}/financeiro`)
    await expect(page.locator('main')).not.toContainText('R$')
    await administracao.getByRole('link', { name: 'Abrir cadastros' }).click()
    await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/equipe$`))
    await expect(page.getByRole('heading', { name: 'Cadastros', exact: true })).toBeVisible()
    const abas = page.getByRole('navigation', { name: 'Seções de Cadastros' })
    for (const nome of ['Equipe & acessos', 'Especialidades', 'Profissionais', 'Serviços']) await expect(abas.getByRole('button', { name: nome, exact: true })).toBeVisible()
    await abas.getByRole('button', { name: 'Especialidades', exact: true }).click()
    await expect(page.getByText('Especialidade Sintética', { exact: true })).toBeVisible()
    await abas.getByRole('button', { name: 'Profissionais', exact: true }).click()
    await expect(abas.getByRole('button', { name: 'Profissionais', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await abas.getByRole('button', { name: 'Serviços', exact: true }).click()
    await expect(page.getByText(`Serviço Sintético Clínica ${unidade === 'brotas' ? 'Brotas' : 'Ipupiara'}`, { exact: true }).filter({ visible: true })).toBeVisible()
    await expect(page.getByText('R$ 123,45').filter({ visible: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Cadastros', exact: true })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/equipe$`))
    await page.goBack()
    await expect(administracao).toBeVisible()
    await page.reload()
    await expect(administracao).toBeVisible()
    await administracao.getByRole('link', { name: 'Abrir Financeiro' }).click()
    await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/financeiro$`))
    await expect(page.getByRole('navigation', { name: 'Áreas do Financeiro' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('Indicadores indisponíveis')
    expect(escritas).toEqual([])
  })
}

test('troca de clínica atualiza destinos e consultas, sem misturar serviços', async ({ page }) => {
  const escritas = await preparar(page)
  await page.goto('/sistema/brotas/dashboard')
  const cadastros = page.getByRole('link', { name: 'Abrir cadastros' })
  await expect(cadastros).toHaveAttribute('href', '/sistema/brotas/equipe')
  await page.getByRole('combobox', { name: 'Selecionar clínica', exact: true }).selectOption(clinicas[1].id)
  await expect(page).toHaveURL(/\/sistema\/ipupiara\/dashboard$/)
  await expect(cadastros).toHaveAttribute('href', '/sistema/ipupiara/equipe')
  await cadastros.click()
  await page.getByRole('button', { name: 'Serviços', exact: true }).click()
  await expect(page.getByText('Serviço Sintético Clínica Ipupiara', { exact: true }).filter({ visible: true })).toBeVisible()
  await expect(page.getByText('Serviço Sintético Clínica Brotas', { exact: true })).toHaveCount(0)
  expect(escritas).toEqual([])
})

for (const papel of ['recepcao', 'medico'] as const) test(`atalhos de administração não aparecem para ${papel}`, async ({ page }) => {
  await preparar(page, papel)
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.locator('.app-shell-header')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Administração da clínica' })).toHaveCount(0)
  await page.goto('/sistema/brotas/configuracoes')
  await expect(page.getByRole('alert')).toContainText('Página não autorizada')
})

test('erro no próximo paciente mantém acesso administrativo e aviso distinto do vazio', async ({ page }) => {
  await preparar(page, 'proprietaria', 'erro-agenda')
  await page.goto('/sistema/ipupiara/dashboard')
  await expect(page.getByRole('status')).toContainText('Próximo paciente indisponível')
  await expect(page.getByRole('link', { name: 'Abrir cadastros' })).toBeVisible()
  await expect(page.getByText('Nenhum agendamento restante hoje.')).toHaveCount(0)
})

test('carregamento de acesso não mostra atalhos antes de confirmar o papel', async ({ page }) => {
  await preparar(page, 'proprietaria', 'lento')
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.getByRole('status')).toContainText('Verificando acesso')
  await expect(page.getByRole('link', { name: 'Abrir cadastros' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Abrir cadastros' })).toBeVisible()
})

test('falha de autorização não vira painel vazio nem expõe atalhos', async ({ page }) => {
  await preparar(page, 'proprietaria', 'erro-acesso')
  await page.goto('/sistema/brotas/dashboard')
  await expect(page.getByRole('alert')).toContainText('Isso não confirma ausência de vínculo')
  await expect(page.getByRole('link', { name: 'Abrir cadastros' })).toHaveCount(0)
})

test('atalhos alcançáveis no tema escuro, teclado e sem transbordamento', async ({ page }) => {
  await preparar(page)
  await page.goto('/sistema/ipupiara/dashboard')
  const cadastros = page.getByRole('link', { name: 'Abrir cadastros' })
  await expect(cadastros).toBeVisible()
  await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'escuro')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await cadastros.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Cadastros', exact: true })).toBeVisible()
})
