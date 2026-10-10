import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue()
    return route.abort()
  })
})

test('layout, imagem, teclado, senha e ajuda', async ({ page }, info) => {
  await page.goto('/tests/login/login.html')
  await expect(page.getByRole('heading', { name: 'Acesso à Clínica Brotas' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Médico / Clínico' })).toBeChecked()
  await expect(page.getByRole('group', { name: 'Perfil de Acesso' })).toBeVisible()
  for (const nome of ['Recepção', 'Proprietário(a)', 'Laboratório']) await expect(page.getByRole('radio', { name: nome })).toBeVisible()
  await page.getByRole('radio', { name: 'Médico / Clínico' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Recepção' })).toBeChecked()
  await page.getByRole('radio', { name: 'Médico / Clínico' }).check()
  await expect(page.getByText('Clínica de entrada')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Esqueci minha senha' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Lembrar meu acesso neste dispositivo seguro' })).toBeChecked()
  await page.getByRole('link', { name: 'Ajuda no Acesso' }).click()
  await expect(page.getByText('Se esqueceu sua senha', { exact: false })).toBeVisible()
  await page.getByText('Orientações para acesso').click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  if (info.project.name === 'desktop') await expect.poll(() => page.locator('.login-photo').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 15_000 }).toBeTruthy()
  await page.locator('#password').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect(page.locator('#password')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Ocultar senha' }).press('Enter')
  await expect(page.locator('#password')).toHaveAttribute('type', 'password')
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await expect(page.getByText('Se esqueceu sua senha', { exact: false })).toBeVisible()
  await page.getByText('Orientações para acesso').click()
  await page.locator('#password').fill('')
  await mkdir('scratch/login-aprovado', { recursive: true })
  await page.screenshot({ path: `scratch/login-aprovado/${info.project.name}.png`, fullPage: true })
  await page.setViewportSize({ width: 320, height: 740 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})

test('Brotas e Ipupiara diferenciam os quatro perfis sem perder marca, semântica ou teclado', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)
  const clinicas = [
    { slug: 'brotas', heading: 'Acesso à Clínica Brotas', image: '/imagem_login_brotas.png' },
    { slug: 'ipupiara', heading: 'Acesso à Clínica Ipupiara', image: '/imagem_login_ipupiara.png' },
  ] as const
  const perfis = [
    { valor: 'medico', nome: 'Médico / Clínico' },
    { valor: 'recepcao', nome: 'Recepção' },
    { valor: 'proprietaria', nome: 'Proprietário(a)' },
    { valor: 'laboratorio', nome: 'Laboratório' },
  ] as const
  await mkdir('scratch/login-perfis', { recursive: true })

  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    for (const clinica of clinicas) {
      const cores = new Set<string>()
      await page.goto(`/acesso/${clinica.slug}`)
      await expect(page.locator('.login-page')).toHaveAttribute('data-clinic-brand', clinica.slug)
      await expect(page.getByRole('heading', { name: clinica.heading })).toBeVisible()
      await expect(page.locator('.login-photo')).toHaveAttribute('src', clinica.image)
      const primeiraOpcao = page.getByRole('radio', { name: perfis[0].nome })
      await primeiraOpcao.focus()

      for (const [indice, perfil] of perfis.entries()) {
        if (indice > 0) await page.keyboard.press('ArrowRight')
        const radio = page.getByRole('radio', { name: perfil.nome })
        await expect(radio).toBeChecked()
        await expect(page.locator('.login-page')).toHaveAttribute('data-active-profile', perfil.valor)
        await expect(page.getByText('Clínica de entrada')).toBeVisible()
        await page.locator('#email').focus()
        const opcao = page.locator(`.login-role-option[data-role="${perfil.valor}"]`)
        await expect.poll(() => opcao.evaluate(element => {
          const span = element.querySelector('span')!
          const borda = getComputedStyle(span).borderColor
          const botao = getComputedStyle(document.querySelector('.login-submit')!).backgroundColor
          const foco = getComputedStyle(document.querySelector('#email')!.closest('.login-input-wrap')!).borderColor
          return borda === botao && foco === botao && getComputedStyle(span, '::after').opacity === '1'
        })).toBeTruthy()

        const estado = await opcao.evaluate(element => {
          const opcao = getComputedStyle(element.querySelector('span')!)
          const marcador = getComputedStyle(element.querySelector('span')!, '::after')
          const botao = getComputedStyle(document.querySelector('.login-submit')!)
          return {
            fundo: opcao.backgroundColor,
            borda: opcao.borderColor,
            marcador: marcador.opacity,
            botao: botao.backgroundColor,
          }
        })

        expect(estado.fundo).not.toBe('rgba(0, 0, 0, 0)')
        expect(estado.borda).toBe(estado.botao)
        expect(estado.marcador).toBe('1')
        cores.add(estado.botao)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy()
        await page.screenshot({ path: `scratch/login-perfis/${clinica.slug}-${perfil.valor}-${viewport.width}x${viewport.height}.png`, fullPage: true })
        await radio.focus()
      }

      expect(cores.size).toBe(4)
    }
  }
})

test('validação, erro, carregamento e recuperação', async ({ page }) => {
  let requests = 0
  await page.route('https://financeiro.synthetic.invalid/auth/v1/token**', async route => {
    requests++
    expect(route.request().postDataJSON().email).toBe('teste@example.invalid')
    await new Promise(resolve => setTimeout(resolve, 200))
    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }) })
  })
  await page.goto('/tests/login/login.html')
  await page.getByRole('button', { name: 'Acessar Sistema Integrado' }).click()
  expect(requests).toBe(0)
  await page.locator('#email').fill('teste@example.invalid')
  await page.locator('#password').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Acessar Sistema Integrado' }).click()
  await expect(page.getByRole('button', { name: 'Validando acesso' })).toBeDisabled()
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos')
  await expect(page.getByRole('button', { name: 'Acessar Sistema Integrado' })).toBeEnabled()
  expect(requests).toBe(1)
})

test('fallback local Brotas usa somente o vínculo real correspondente', async ({ page }) => {
  await page.route('https://financeiro.synthetic.invalid/auth/v1/token**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'synthetic-user', email: 'teste@example.invalid', aud: 'authenticated' } }) }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/usuarios_clinicas**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ clinica_id: 'clinica-permitida', papel: 'recepcao' }]) }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/clinicas**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'clinica-permitida', nome: 'Clínica Brotas' }]) }))
  await page.goto('/tests/login/login.html')
  await page.locator('#email').fill('teste@example.invalid')
  await page.locator('#password').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Acessar Sistema Integrado' }).click()
  await expect(page.getByRole('heading', { name: 'Sessão ativa' })).toBeVisible()
  await expect(page.getByText('Acesso confirmado para Clínica Brotas como recepção.')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar na Clínica Brotas' }).click()
  await expect(page.getByRole('heading', { name: 'Unidade e perfil validados: clinica-permitida · recepcao · lembrar' })).toBeVisible()
})

test('endereços locais diretos isolam as marcas Brotas e Ipupiara', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.goto('/')
  await expect(page).toHaveURL(/\/acesso\/brotas$/)
  await expect(page.locator('.login-page')).toHaveAttribute('data-clinic-brand', 'brotas')

  await page.goto('/acesso/brotas')
  await expect(page.locator('.login-page')).toHaveAttribute('data-clinic-brand', 'brotas')
  await expect(page.getByRole('heading', { name: 'Acesso à Clínica Brotas' })).toBeVisible()
  await expect(page.locator('.login-photo')).toHaveAttribute('src', '/imagem_login_brotas.png')
  await expect(page.getByText('Clínica Ipupiara')).toHaveCount(0)

  await page.goto('/acesso/ipupiara')
  await expect(page.locator('.login-page')).toHaveAttribute('data-clinic-brand', 'ipupiara')
  await expect(page.getByRole('heading', { name: 'Acesso à Clínica Ipupiara' })).toBeVisible()
  await expect(page.locator('.login-photo')).toHaveAttribute('src', '/imagem_login_ipupiara.png')
  await expect(page.getByText('Clínica Brotas')).toHaveCount(0)
  await page.reload()
  await expect(page).toHaveURL(/\/acesso\/ipupiara$/)
  await expect(page.locator('.login-page')).toHaveAttribute('data-clinic-brand', 'ipupiara')

  await page.goto('/login/ipupiara')
  await expect(page).toHaveURL(/\/acesso\/ipupiara$/)
})

test('hostnames aprovados identificam a unidade sem autorizar hostname desconhecido', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.goto('/tests/login/login.html')
  const resolucoes = await page.evaluate(async () => {
    const { CLINIC_BRANDS, resolveClinicBrand } = await import('/src/config/clinicBrands.ts')
    return {
      brotasConfigurado: CLINIC_BRANDS.brotas.hostname,
      ipupiaraConfigurado: CLINIC_BRANDS.ipupiara.hostname,
      desconhecido: resolveClinicBrand('clinica-nao-configurada.example', '/login'),
      brotas: resolveClinicBrand('clinicabrotas.com.br', '/').brand?.slug,
      ipupiara: resolveClinicBrand('clinicaipupiara.com.br', '/acesso/brotas').brand?.slug,
      www: resolveClinicBrand('www.clinicaipupiara.com.br', '/').brand?.slug,
    }
  })
  expect(resolucoes.brotasConfigurado ?? '').not.toMatch(/example/i)
  expect(resolucoes.ipupiaraConfigurado ?? '').not.toMatch(/example/i)
  expect(resolucoes.desconhecido.brand).toBeNull()
  expect(resolucoes.desconhecido.origem).toBe('dominio-invalido')
  expect(resolucoes.brotas).toBe('brotas')
  expect(resolucoes.ipupiara).toBe('ipupiara')
  expect(resolucoes.www).toBe('ipupiara')
})

test('domínio de preview não concede acesso a outra clínica', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.route('https://financeiro.synthetic.invalid/auth/v1/token**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'synthetic-user', email: 'teste@example.invalid', aud: 'authenticated' } }) }))
  await page.route('https://financeiro.synthetic.invalid/auth/v1/logout**', route => route.fulfill({ status: 204, body: '' }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/usuarios_clinicas**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ clinica_id: 'brotas-id', papel: 'recepcao' }]) }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/clinicas**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'brotas-id', nome: 'Clínica Brotas' }]) }))
  await page.goto('/acesso/ipupiara')
  await page.locator('#email').fill('teste@example.invalid')
  await page.locator('#password').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Acessar Sistema Integrado' }).click()
  await expect(page.getByRole('alert')).toContainText('não possui vínculo ativo com Clínica Ipupiara')
  await expect(page.locator('.app-shell')).toHaveCount(0)
})

test('proprietária multi-clínica vê somente a clínica do endereço de entrada', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.route('https://financeiro.synthetic.invalid/auth/v1/token**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'synthetic-owner', email: 'proprietaria@example.invalid', aud: 'authenticated' } }) }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/usuarios_clinicas**', route => {
    const consultaPapel = new URL(route.request().url()).searchParams.has('clinica_id')
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(consultaPapel ? { papel: 'proprietaria' } : [{ clinica_id: 'brotas-id', papel: 'proprietaria' }, { clinica_id: 'ipupiara-id', papel: 'proprietaria' }]) })
  })
  await page.route('https://financeiro.synthetic.invalid/rest/v1/clinicas**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'brotas-id', nome: 'Clínica Brotas', cor_primaria: '#006194', cor_secundaria: '#213145', cor_menu: '#213145' }, { id: 'ipupiara-id', nome: 'Clínica Ipupiara', cor_primaria: '#006194', cor_secundaria: '#213145', cor_menu: '#213145' }]) }))
  await page.goto('/acesso/brotas')
  await page.locator('#email').fill('proprietaria@example.invalid')
  await page.locator('#password').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Acessar Sistema Integrado' }).click()
  await expect(page.getByRole('heading', { name: 'Sessão ativa' })).toBeVisible()
  await expect(page.getByText('Acesso confirmado para Clínica Brotas como Proprietário(a).')).toBeVisible()
  await expect(page.getByText('Clínica Ipupiara')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Continuar na Clínica Brotas' })).toBeVisible()
})

test('proprietária vinculada às duas clínicas entra por Ipupiara sem expor Brotas', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.route('https://financeiro.synthetic.invalid/auth/v1/token**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'synthetic-owner', email: 'proprietaria@example.invalid', aud: 'authenticated' } }) }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/usuarios_clinicas**', route => {
    const consultaPapel = new URL(route.request().url()).searchParams.has('clinica_id')
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(consultaPapel ? { papel: 'proprietaria' } : [{ clinica_id: 'brotas-id', papel: 'proprietaria' }, { clinica_id: 'ipupiara-id', papel: 'proprietaria' }]) })
  })
  await page.route('https://financeiro.synthetic.invalid/rest/v1/clinicas**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'brotas-id', nome: 'Clínica Brotas', cor_primaria: '#006194', cor_secundaria: '#213145', cor_menu: '#213145' }, { id: 'ipupiara-id', nome: 'Clínica Ipupiara', cor_primaria: '#006194', cor_secundaria: '#213145', cor_menu: '#213145' }]) }))
  await page.goto('/acesso/ipupiara')
  await page.locator('#email').fill('proprietaria@example.invalid')
  await page.locator('#password').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Acessar Sistema Integrado' }).click()
  await expect(page.getByRole('heading', { name: 'Sessão ativa' })).toBeVisible()
  await expect(page.getByText('Acesso confirmado para Clínica Ipupiara como Proprietário(a).')).toBeVisible()
  await expect(page.getByText('Clínica Brotas')).toHaveCount(0)
  await page.getByRole('button', { name: 'Continuar na Clínica Ipupiara' }).click()
  await expect(page.locator('.app-shell')).toBeVisible()
})

test('sessão restaurada mostra continuar e trocar conta sem campo de senha', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await page.route('https://financeiro.synthetic.invalid/auth/v1/logout**', route => route.fulfill({ status: 204, body: '' }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/usuarios_clinicas**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ clinica_id: 'ipupiara-id', papel: 'proprietaria' }, { clinica_id: 'brotas-id', papel: 'proprietaria' }]) }))
  await page.route('https://financeiro.synthetic.invalid/rest/v1/clinicas**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'ipupiara-id', nome: 'Clínica Ipupiara' }, { id: 'brotas-id', nome: 'Clínica Brotas' }]) }))
  await page.goto('/tests/login/login.html?authenticatedUserId=synthetic-owner')
  await expect(page.getByRole('heading', { name: 'Sessão ativa' })).toBeVisible()
  await expect(page.locator('#password')).toHaveCount(0)
  await expect(page.getByText('Clínica Ipupiara')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Continuar na Clínica Brotas' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrar com outra conta' }).click()
  await expect(page.locator('#password')).toBeEditable()
  await expect(page.getByRole('button', { name: 'Acessar Sistema Integrado' })).toBeVisible()
})
