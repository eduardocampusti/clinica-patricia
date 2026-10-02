import { expect, test, type Page } from '@playwright/test'
import { itensParaPapel } from '../../src/components/shell/navigation'
import type { Papel } from '../../src/hooks/usePapelNaClinica'

async function fixture(page: Page, unidade: string, modo: 'ativo' | 'sem-vinculo' | 'erro' | 'expirado' | 'anonimo' = 'ativo', papel: Papel = 'recepcao') {
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
    const data = modo === 'sem-vinculo' ? [] : path.endsWith('/usuarios_clinicas') ? singular ? {papel} : [{clinica_id:clinic.id,papel}] : path.endsWith('/clinicas') ? [clinic] : []
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

for (const unidade of ['brotas', 'ipupiara'] as const) for (const papel of ['recepcao', 'medico', 'proprietaria'] as const) test(`Sidebar no App real, módulos e expansão — ${unidade}/${papel}`, async ({ page }) => {
  await fixture(page, unidade, 'ativo', papel)
  await page.goto(`/sistema/${unidade}/agenda`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.app-shell')).toBeVisible()
  await page.getByRole('button', { name: 'Recolher menu' }).click()
  for (const item of itensParaPapel(papel, unidade)) {
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: item.titulo, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${item.href}$`))
    await expect(page.locator('.app-shell-header p').first()).toHaveText(item.titulo)
    await expect(page.getByRole('link', { name: item.titulo, exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible()
  }
})

for (const unidade of ['brotas','ipupiara']) {
  test(`Recepção: URL e conteúdo preservados com vínculos e papel atrasados — ${unidade}`, async ({page}) => {
    await fixture(page,unidade)
    // Só o serviço sintético sofre atraso; não altera banco ou rede de produção.
    await page.route('**/rest/v1/usuarios_clinicas**', async route => {
      await new Promise(resolve => setTimeout(resolve, 700))
      const singular = route.request().headers().accept?.includes('object')
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(singular ? {papel:'recepcao'} : [{clinica_id:'22222222-2222-4222-8222-222222222222',papel:'recepcao'}])})
    })
    await page.goto(`/acesso/${unidade}`)
    await expect(page.locator('.app-shell')).toBeVisible()
    for (const destino of ['pacientes','agenda']) {
      await page.getByRole('link',{name:destino === 'pacientes' ? 'Pacientes' : 'Agenda',exact:true}).click()
      const url = page.url()
      await page.reload()
      await expect(page.locator('.app-shell')).toBeVisible()
      expect(page.url()).toBe(url)
      await expect(page.locator('.app-shell-header p').first()).toHaveText(destino === 'pacientes' ? 'Pacientes' : 'Agenda')
    }
    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/pacientes$`))
    await expect(page.locator('.app-shell-header p').first()).toHaveText('Pacientes')
    await page.goForward()
    await expect(page.locator('.app-shell-header p').first()).toHaveText('Agenda')
    await page.goto(`/sistema/${unidade}/pacientes`)
    await expect(page.locator('.app-shell-header p').first()).toHaveText('Pacientes')
  })
}

for (const unidade of ['brotas','ipupiara']) {
  test(`restauração, rotas, F5 repetido e logout — ${unidade}`, async ({page}) => {
    const state = await fixture(page,unidade)
    await page.goto(`/acesso/${unidade}`)
    await expect(page.locator('.app-shell')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/sistema/${unidade}/dashboard$`))
    for (const tela of ['agenda','pacientes']) {
      await page.getByRole('link',{name:tela === 'agenda' ? 'Agenda' : 'Pacientes',exact:true}).click()
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
  await expect(page.getByRole('alert')).toContainText('Página não autorizada')
  await expect(page).toHaveURL(/\/prontuario$/)
})

test('restauração deve priorizar URL válida atual, não destino capturado antes da consulta',async({page})=>{
  await fixture(page,'brotas')
  let liberar!: () => void
  const consultaPendente = new Promise<void>(resolve => { liberar = resolve })
  await page.route('**/rest/v1/usuarios_clinicas**',async route=>{
    await consultaPendente
    const singular = route.request().headers().accept?.includes('object')
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(singular ? {papel:'recepcao'} : [{clinica_id:'22222222-2222-4222-8222-222222222222',papel:'recepcao'}])})
  })
  await page.goto('/acesso/brotas')
  await expect(page.getByRole('status')).toContainText('Verificando')
  // Reproduz isoladamente divergência URL/estado durante a consulta, não um
  // evento observado na sessão real do usuário. Não simula clique nem autorização.
  await page.evaluate(()=>history.replaceState({},'', '/sistema/brotas/pacientes'))
  liberar()
  await expect(page.locator('.app-shell-header p').first()).toHaveText('Pacientes')
  await expect(page).toHaveURL(/\/pacientes$/)
})

test('unidade alterada na URL durante consulta exige validação do novo contexto',async({page})=>{
  await fixture(page,'brotas')
  const clinics = [{id:'22222222-2222-4222-8222-222222222222',nome:'Clínica Brotas'},{id:'44444444-4444-4444-8444-444444444444',nome:'Clínica Ipupiara'}]
  let liberar!: () => void
  const pendente = new Promise<void>(resolve=>{liberar=resolve})
  await page.route('**/rest/v1/clinicas**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(clinics)}))
  await page.route('**/rest/v1/usuarios_clinicas**',async route=>{
    await pendente
    const singular = route.request().headers().accept?.includes('object')
    const filtro = new URL(route.request().url()).searchParams.get('clinica_id')
    const vinculos = clinics.filter(clinica=>!filtro || filtro === `eq.${clinica.id}`).map(clinica=>({clinica_id:clinica.id,papel:'recepcao'}))
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(singular ? {papel:'recepcao'} : vinculos)})
  })
  await page.goto('/acesso/brotas')
  await expect(page.getByRole('status')).toContainText('Verificando')
  await page.evaluate(()=>history.replaceState({},'', '/sistema/ipupiara/pacientes'))
  liberar()
  await expect(page.locator('.app-shell-header p').first()).toHaveText('Pacientes')
  await expect(page.locator('.app-shell-header')).toContainText('Clínica Ipupiara')
  await expect(page).toHaveURL(/\/sistema\/ipupiara\/pacientes$/)
})
