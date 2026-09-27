import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const clinics = [
  { slug: 'brotas', heading: 'Acesso à Clínica Brotas', image: '/imagem_login_brotas.png' },
  { slug: 'ipupiara', heading: 'Acesso à Clínica Ipupiara', image: '/imagem_login_ipupiara.png' },
] as const

const desktopViewports = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
]

const tabletViewports = [
  { width: 1024, height: 1366 },
  { width: 1180, height: 820 },
  { width: 768, height: 1024 },
]

const mobileViewports = [
  { width: 390, height: 844 },
  { width: 393, height: 873 },
  { width: 360, height: 800 },
  { width: 430, height: 932 },
]

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue()
    return route.abort()
  })
})

test('desktop não rola e tablet preserva conteúdo sem overflow horizontal', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)

  for (const viewport of [...desktopViewports, ...tabletViewports]) {
    await page.setViewportSize(viewport)

    for (const clinic of clinics) {
      await page.goto(`/acesso/${clinic.slug}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: clinic.heading })).toBeVisible()
      await expect(page.locator('.login-photo')).toHaveAttribute('src', clinic.image)
      await expect(page.getByRole('button', { name: 'Acessar Sistema Integrado' })).toBeVisible()
      await expect(page.locator('.login-footer')).toBeVisible()

      const metrics = await page.evaluate(() => {
        const access = document.querySelector<HTMLElement>('.login-access')!
        const hero = document.querySelector<HTMLElement>('.login-visual')!
        const footer = document.querySelector<HTMLElement>('.login-footer')!
        return {
          horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
          verticalOverflow: document.documentElement.scrollHeight - innerHeight,
          accessOverflow: access.scrollHeight - access.clientHeight,
          heroWidth: hero.getBoundingClientRect().width,
          heroHeight: hero.getBoundingClientRect().height,
          footerBottom: footer.getBoundingClientRect().bottom,
        }
      })

      expect(metrics.horizontalOverflow, `${clinic.slug} ${viewport.width}x${viewport.height}: overflow horizontal`).toBeLessThanOrEqual(1)
      if (viewport.width > 1050) {
        expect(metrics.verticalOverflow, `${clinic.slug} ${viewport.width}x${viewport.height}: scrollbar vertical`).toBeLessThanOrEqual(1)
        expect(metrics.accessOverflow, `${clinic.slug} ${viewport.width}x${viewport.height}: coluna de acesso rolável`).toBeLessThanOrEqual(1)
        expect(metrics.footerBottom).toBeLessThanOrEqual(viewport.height + 1)
      }
      expect(metrics.heroWidth).toBeGreaterThan(0)
      expect(metrics.heroHeight).toBeGreaterThanOrEqual(160)
    }
  }
})

test('mobile mantém hero, formulário utilizável e alvos de toque sem overflow horizontal', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  test.setTimeout(120_000)

  for (const viewport of mobileViewports) {
    await page.setViewportSize(viewport)

    for (const clinic of clinics) {
      await page.goto(`/acesso/${clinic.slug}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: clinic.heading })).toBeVisible()
      await expect(page.locator('.login-photo')).toHaveAttribute('src', clinic.image)
      const metrics = await page.evaluate(() => {
        const hero = document.querySelector<HTMLElement>('.login-visual')!
        const email = document.querySelector<HTMLElement>('#email')!
        const submit = document.querySelector<HTMLElement>('.login-submit')!
        return {
          horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
          heroHeight: hero.getBoundingClientRect().height,
          emailHeight: email.getBoundingClientRect().height,
          emailFontSize: Number.parseFloat(getComputedStyle(email).fontSize),
          submitHeight: submit.getBoundingClientRect().height,
        }
      })

      expect(metrics.horizontalOverflow, `${clinic.slug} ${viewport.width}x${viewport.height}: overflow horizontal`).toBeLessThanOrEqual(1)
      expect(metrics.heroHeight).toBeGreaterThanOrEqual(160)
      expect(metrics.emailHeight).toBeGreaterThanOrEqual(44)
      expect(metrics.emailFontSize).toBeGreaterThanOrEqual(16)
      expect(metrics.submitHeight).toBeGreaterThanOrEqual(44)
      await expect(page.getByRole('button', { name: 'Acessar Sistema Integrado' })).toBeVisible()
      await expect(page.locator('.login-footer')).toBeVisible()
    }
  }
})

test('redimensionamento contínuo conserva a estrutura e gera evidências visuais', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop')
  await mkdir('scratch/login-responsive', { recursive: true })

  for (const clinic of clinics) {
    await page.goto(`/acesso/${clinic.slug}`)
    for (const viewport of [desktopViewports.at(-1)!, tabletViewports.at(-1)!, mobileViewports[0]]) {
      await page.setViewportSize(viewport)
      await expect(page.getByRole('heading', { name: clinic.heading })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy()
      await page.screenshot({ path: `scratch/login-responsive/${clinic.slug}-${viewport.width}x${viewport.height}.png`, fullPage: true })
    }
  }
})
