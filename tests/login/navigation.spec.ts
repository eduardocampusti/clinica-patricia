import { expect, test, type Page } from '@playwright/test'

async function fixture(page: Page, unidade: string, modo: 'ativo' | 'sem-vinculo' | 'erro' | 'expirado' | 'anonimo' = 'ativo') {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'teste@example.invalid', aud: 'authenticated' }
  const clinic = { id:'22222222-2222-4222-8222-222222222222', nome: unidade === 'brotas' ? 'Clínica Brotas' : 'Clínica Ipupiara' }
  const jwt = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated'})).toString('base64url'),'synthetic'].join('.')
  let chamadas = 0
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  await page.route('**/auth/v1/user', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)}))
  await page.route('**/auth/v1/logout**', route => route.fulfill({status:204,body:''}))
  await page.route('**/auth/v1/token**', route => route.fulfill(modo === 'expirado'
    ? {status:400,contentType:'application/json',body:'{"code":"refresh_token_not_found","msg":"synthetic"}'}
    : {status:200,contentType:'application/json',body:JSON.stringify({access_token:jwt,refresh_token:'synthetic',expires_in:3600,token_type:'bearer',user})}))
  await page.route('**/rest/v1/**', route => {
    chamadas++
    const path = new URL(route.request().url()).pathname
    const singular = route.request().headers().accept?.includes('object')
    if (modo === 'erro') return route.fulfill({status:500,contentType:'application/json',body:'{"message":"synthetic"}'})
    const data = modo === 'sem-vinculo' ? [] : path.endsWith('/usuarios_clinicas') ? singular ? {papel:'recepcao'} : [{clinica_id:clinic.id,papel:'recepcao'}] : path.endsWith('/clinicas') ? [clinic] : []
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)})
  })
  if (modo !== 'anonimo') await page.addInitScript(({jwt,user,expirado}) => {
    if (!localStorage.getItem('synthetic-fixture-initialized')) {
      localStorage.setItem('sb-financeiro-auth-token',JSON.stringify({access_token:jwt,refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+(expirado ? -3600 : 3600),expires_in:3600,token_type:'bearer',user}))
      localStorage.setItem('synthetic-fixture-initialized','1')
    }
  }, {jwt,user,expirado:modo === 'expirado'})
  return { chamadas: () => chamadas }
}

for (const unidade of ['brotas','ipupiara']) {
  test(`restauração, rotas, F5 repetido e logout — ${unidade}`, async ({page}) => {
    const state = await fixture(page,unidade)
    await page.goto(`/acesso/${unidade}`)
    await expect(page.locator('.app-shell')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/dashboard$`))
    for (const tela of ['agenda','pacientes']) {
      await page.getByRole('button',{name:tela === 'agenda' ? 'Agenda' : 'Pacientes',exact:true}).click()
      await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/${tela}$`))
      await page.reload()
      await expect(page.locator('.app-shell')).toBeVisible()
      await expect(page.locator('.app-shell-header')).toContainText(tela === 'agenda' ? 'Agenda' : 'Pacientes')
      await page.reload()
      await expect(page.locator('.app-shell')).toBeVisible()
    }
    await page.goto(`/sistema/${unidade}/agenda`)
    await expect(page.locator('.app-shell-header')).toContainText('Agenda')
    expect(state.chamadas()).toBeLessThan(100)
    await page.getByRole('button',{name:'Sair',exact:true}).click()
    await expect(page.getByLabel('Senha de Acesso',{exact:true})).toBeVisible()
    await page.reload()
    await expect(page.locator('.app-shell')).toHaveCount(0)
    await page.goto(`/sistema/${unidade}/pacientes`)
    await expect(page.getByLabel('Senha de Acesso',{exact:true})).toBeVisible()
  })
  for (const modo of ['sem-vinculo','erro'] as const) test(`${modo} não abre área interna — ${unidade}`, async ({page}) => {
    await fixture(page,unidade,modo)
    await page.goto(`/sistema/${unidade}/pacientes`)
    await expect(page.getByRole('alert')).toContainText(modo === 'erro' ? 'não confirma ausência de vínculo' : 'não possui vínculo ativo')
    await expect(page.locator('.app-shell')).toHaveCount(0)
    await expect(page.getByRole('button',{name:'Tentar novamente'})).toBeVisible()
  })
}
test('login normal com nova sessão entra sem confirmação intermediária',async({page})=>{
  await fixture(page,'brotas','anonimo')
  await page.route('**/auth/v1/token**', async route => {
    const user = {id:'11111111-1111-4111-8111-111111111111',email:'teste@example.invalid',aud:'authenticated'}
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'synthetic',refresh_token:'synthetic',expires_in:3600,token_type:'bearer',user})})
  })
  await page.goto('/acesso/brotas')
  await page.getByLabel('E-mail institucional ou CRM / Identificador').fill('teste@example.invalid')
  await page.getByLabel('Senha de Acesso',{exact:true}).fill('synthetic-password')
  await page.getByRole('button',{name:'Acessar Sistema Integrado'}).click()
  await expect(page.locator('.app-shell')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('clinica-patricia:clinica-ativa-id'))).toBe('22222222-2222-4222-8222-222222222222')
})

test('sessão expirada recusada pelo Auth não restaura área protegida',async({page})=>{
  await fixture(page,'brotas','expirado')
  await page.goto('/sistema/brotas/agenda')
  await expect(page.getByLabel('Senha de Acesso',{exact:true})).toBeVisible()
  await expect(page.locator('.app-shell')).toHaveCount(0)
})

test('destino não oferecido ao perfil permanece bloqueado',async({page})=>{
  await fixture(page,'brotas')
  await page.goto('/sistema/brotas/prontuario')
  await expect(page.locator('.app-shell-header')).toContainText('Dashboard')
  await expect(page).toHaveURL(/\/dashboard$/)
})
