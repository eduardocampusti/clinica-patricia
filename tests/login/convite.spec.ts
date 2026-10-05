import { expect, test } from '@playwright/test'

for (const unidade of ['brotas', 'ipupiara']) {
  test(`continuação após aceite renova leitura autorizada — ${unidade}`, async ({ page }) => {
    await page.setViewportSize({ width: unidade === 'brotas' ? 1280 : 390, height: 844 })
    const user = { id: '11111111-1111-4111-8111-111111111111', email: 'teste@example.invalid', aud: 'authenticated' }
    const clinic = { id: '22222222-2222-4222-8222-222222222222', nome: unidade === 'brotas' ? 'Clínica Brotas' : 'Clínica Ipupiara' }
    const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, aud: 'authenticated' })).toString('base64url'), 'synthetic'].join('.')
    let aceito = false
    let aceitaChamadas = 0
    let leiturasVinculos = 0
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
    // Captura somente estado visual sintético antes de a navegação desmontar a tela.
    await page.addInitScript(() => window.addEventListener('beforeunload', () => {
      const button = [...document.querySelectorAll('button')].find(el => el.textContent === 'Abrindo sistema…')
      if (button) sessionStorage.setItem('synthetic-continuacao-busy', String(button.disabled && button.getAttribute('aria-busy') === 'true'))
    }))
    await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))
    await page.route('**/rest/v1/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/usuarios_clinicas')) {
        leiturasVinculos++
        const singular = route.request().headers().accept?.includes('object')
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aceito ? singular ? {papel:'recepcao'} : [{clinica_id:clinic.id,papel:'recepcao'}] : singular ? null : []) })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aceito && path.endsWith('/clinicas') ? [clinic] : []) })
    })
    await page.route('**/functions/v1/equipe-acessos', route => {
      aceitaChamadas++
      aceito = true
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"aceito"}' })
    })
    await page.goto(`/acesso/${unidade}?convite=33333333-3333-4333-8333-333333333333#access_token=${jwt}&refresh_token=synthetic&expires_in=3600&token_type=bearer&type=invite`)
    await page.getByRole('button', {name:'Confirmar acesso',exact:true}).click()
    await expect(page.getByText('Acesso confirmado',{exact:true})).toBeVisible()
    await page.getByRole('button', {name:'Continuar para o sistema',exact:true}).click()
    await expect(page.locator('.app-shell')).toBeVisible({timeout:10000})
    await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/dashboard$`))
    expect(new URL(page.url()).search).toBe('')
    expect(leiturasVinculos).toBeGreaterThan(0)
    expect(aceitaChamadas).toBe(1)
    expect(await page.evaluate(() => sessionStorage.getItem('synthetic-continuacao-busy'))).toBe('true')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  })
}

test('falhas sintéticas do aceite liberam carregamento, preservam campos e não repetem operação', async ({ page }) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'titular@synthetic.invalid', aud: 'authenticated' }
  const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })).toString('base64url'), 'synthetic'].join('.')
  let chamadas = 0
  let senhaChamadas = 0
  let falha = { status: 403, codigo: 'NAO_AUTORIZADO', rede: false }
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  await page.route('**/auth/v1/user', route => {
    if (route.request().method() !== 'GET') senhaChamadas += 1
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) })
  })
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/functions/v1/equipe-acessos', route => {
    chamadas += 1
    return falha.rede ? route.abort('internetdisconnected') : route.fulfill({ status: falha.status, contentType: 'application/json', body: JSON.stringify({ codigo: falha.codigo, erro: 'SQL token-sintetico email-terceiro@synthetic.invalid' }) })
  })
  await page.goto(`/acesso/brotas?convite=33333333-3333-4333-8333-333333333333#access_token=${jwt}&refresh_token=synthetic&expires_in=3600&token_type=bearer&type=invite`)
  const confirmar = page.getByRole('button', { name: 'Confirmar acesso', exact: true })
  const casos = [
    { status: 403, codigo: 'NAO_AUTORIZADO', rede: false, texto: 'não tem autorização' },
    { status: 401, codigo: '', rede: false, texto: 'Entre novamente' },
    { status: 503, codigo: 'OPERACAO_INDISPONIVEL', rede: false, texto: 'Não foi possível confirmar o resultado' },
    { status: 0, codigo: '', rede: true, texto: 'Confira a conexão' },
  ]
  for (const [indice, caso] of casos.entries()) {
    falha = caso
    await confirmar.click()
    await expect(page.getByRole('alert')).toContainText(caso.texto)
    await expect(page.getByRole('alert')).not.toContainText('token-sintetico')
    await expect(confirmar).toBeEnabled()
    await expect(confirmar).toHaveAttribute('aria-busy', 'false')
    await expect(page.getByLabel('Nova senha', { exact: false })).toHaveValue('')
    await expect(page.getByText('Acesso confirmado', { exact: true })).toHaveCount(0)
    expect(chamadas).toBe(indice + 1)
    expect(senhaChamadas).toBe(0)
  }
})
