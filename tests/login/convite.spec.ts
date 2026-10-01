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
    await page.route('**/acesso/**', async route => {
      if (aceito && route.request().isNavigationRequest()) await new Promise(resolve => setTimeout(resolve, 700))
      await route.continue()
    })
    await page.route('**/auth/v1/user', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))
    await page.route('**/rest/v1/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/usuarios_clinicas')) {
        leiturasVinculos++
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(aceito ? [{clinica_id:clinic.id,papel:'recepcao'}] : []) })
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
    await expect(page.getByRole('button',{name:'Abrindo sistema…'})).toBeDisabled()
    await expect(page.getByRole('heading',{name:'Sessão ativa'})).toBeVisible({timeout:5000})
    await expect(page.getByText(/como.*Recepção/)).toBeVisible()
    await expect(page.getByRole('button',{name: unidade === 'brotas' ? 'Continuar na Clínica Brotas' : 'Continuar na Clínica Ipupiara'})).toBeVisible()
    expect(new URL(page.url()).search).toBe('')
    expect(leiturasVinculos).toBeGreaterThan(0)
    expect(aceitaChamadas).toBe(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  })
}
