import { expect, test, type Page } from '@playwright/test'

async function abrirMenuMobile(page: Page) {
  const botao = page.getByRole('button', { name: 'Abrir menu' })
  if (await botao.isVisible()) {
    await botao.click()
    await page.waitForTimeout(250)
  }
}

test('navegação apresenta somente funções operacionais do papel', async ({ page }, info) => {
  const papel = info.project.name === 'tablet' ? 'recepcao' : info.project.name === 'mobile' ? 'medico' : 'proprietaria'
  await page.goto(`/tests/operacional/shell.html?papel=${papel}`)
  await abrirMenuMobile(page)
  const navegacao = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(navegacao).toBeVisible()
  await expect(navegacao).not.toContainText(/Atendimentos|Configurações|Especialidades|Relatórios/)
  await expect(page.getByText('Buscar paciente ou agenda...')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /notifica/i })).toHaveCount(0)
  if (papel === 'medico') {
    await expect(navegacao).toContainText('Prontuários')
    await expect(navegacao).not.toContainText(/Pacientes|Equipe/)
    await expect(page.getByText('Visão do profissional')).toBeVisible()
  } else if (papel === 'recepcao') {
    await expect(navegacao).not.toContainText('Prontuários')
    await expect(page.getByText('Visão da recepção')).toBeVisible()
  } else {
    await expect(page.getByText('Visão proprietária')).toBeVisible()
  }
  await page.screenshot({ path: `scratch/fase11-operacional/navegacao-${papel}-${info.project.name}.png`, fullPage: true })
})

test('pacientes mascara CPF, diferencia busca vazia e funciona nos três viewports', async ({ page }, info) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.hostname !== 'operacional.synthetic.invalid') return route.abort()
    if (url.pathname.endsWith('/pacientes')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
      { id: 'paciente-1', nome_completo: 'Paciente Sintética', cpf_encrypted: 'cpf-cifrado-1', data_nascimento: '1990-01-02', telefone: '(71) 90000-0000' },
      { id: 'paciente-2', nome_completo: 'Outra Pessoa', cpf_encrypted: 'cpf-cifrado-2', data_nascimento: null, telefone: null },
    ]) })
    if (url.pathname.endsWith('/rpc/cpf_decrypt')) {
      const corpo = route.request().postDataJSON() as { p_enc: string }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(corpo.p_enc.endsWith('1') ? '12345678909' : '98765432100') })
    }
    return route.fulfill({ contentType: 'application/json', body: 'null' })
  })
  await page.goto('/tests/operacional/pacientes.html')
  await expect(page.locator('body')).toContainText('***.***.***-09')
  await expect(page.locator('body')).not.toContainText('123.456.789-09')
  await page.getByRole('searchbox', { name: 'Buscar paciente' }).fill('não existe')
  await expect(page.getByText('Nenhum paciente corresponde à busca.')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar paciente' }).fill('Paciente')
  await expect(page.locator('body')).toContainText('Paciente Sintética')
  await expect(page.locator('body')).not.toContainText('Outra Pessoa')
  await page.screenshot({ path: `scratch/fase11-operacional/pacientes-${info.project.name}.png`, fullPage: true })
})

test('login mantém erro técnico encapsulado e bloqueia duplo envio', async ({ page }, info) => {
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid login credentials', code: 'invalid_credentials' }) })
  })
  await page.goto('/tests/operacional/login.html')
  await page.getByLabel('E-mail').fill('usuario@example.invalid')
  await page.getByLabel('Senha').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Entrando...' })).toBeDisabled()
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.')
  await expect(page.locator('body')).not.toContainText(/Invalid login credentials|invalid_credentials|Supabase/i)
  await page.screenshot({ path: `scratch/fase11-operacional/login-${info.project.name}.png`, fullPage: true })
})
