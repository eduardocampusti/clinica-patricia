import { expect, test, type Page } from '@playwright/test'
import { writeFile, mkdir } from 'node:fs/promises'

const pasta = 'scratch/agenda-ux/acabamento-cores-2'
async function abrir(page: Page, unidade = 'brotas') {
  const hoje = new Date().toLocaleDateString('en-CA')
  await page.clock.setFixedTime(new Date(`${hoje}T06:00:00`))
  await page.goto(`/tests/operacional/agenda-preview.html?acabamento&unidade=${unidade}`)
  await expect(page.getByTestId('registro-agenda')).toHaveCount(6)
}
const estilos = async (page: Page) => page.locator('.agenda-temporal-cabecalho').evaluateAll(els => els.map(el => ({ id: el.getAttribute('data-profissional'), cor: getComputedStyle(el).backgroundColor })))

test('acabamento: acentos, estabilidade por dia/modo e geometria temporal intacta', async ({ page }, info) => {
  await abrir(page)
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  const cabecalhos = await estilos(page)
  const acentos = await page.locator('.agenda-indicador').evaluateAll(els => els.map(el => getComputedStyle(el, '::before').backgroundColor))
  expect(new Set(acentos).size).toBe(5)
  expect(new Set(cabecalhos.map(c => c.cor)).size).toBe(3)
  const medidas = () => page.locator('.agenda-temporal-posicao, .agenda-temporal-cabecalho, .agenda-indicador').evaluateAll(els => els.map(e => {
    const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, largura: r.width, altura: r.height }
  }))
  const depois = await medidas()
  // Baseline estrutural: desativa só o acabamento no harness, sem substituir componentes.
  await page.evaluate(() => {
    // O baseline anterior não possuía o ícone decorativo novo: não o deixe virar inline.
    document.querySelectorAll<HTMLElement>('.agenda-indicador-icone').forEach(el => { el.style.display = 'none' })
    for (const s of document.styleSheets) if (s.ownerNode instanceof HTMLElement && s.ownerNode.getAttribute('data-vite-dev-id')?.endsWith('agendaAcabamento.css')) s.disabled = true
  })
  expect(await medidas()).toEqual(depois)
  await page.evaluate(() => {
    for (const s of document.styleSheets) s.disabled = false
    document.querySelectorAll<HTMLElement>('.agenda-indicador-icone').forEach(el => { el.style.removeProperty('display') })
  })
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  expect(await estilos(page)).toEqual(cabecalhos)
  await page.getByRole('button', { name: 'Próximo dia', exact: true }).click()
  await expect.poll(() => estilos(page)).toEqual(cabecalhos)
  await page.getByRole('button', { name: 'Hoje', exact: true }).click()
  await expect(page.getByTestId('registro-agenda')).toHaveCount(6)
  if (info.project.name === 'mobile') await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await page.screenshot({ path: `${pasta}/${info.project.name}-brotas-claro.png` })
  await page.getByRole('button', { name: 'Alternar tema', exact: true }).click()
  await page.screenshot({ path: `${pasta}/${info.project.name}-brotas-escuro.png` })
  await abrir(page, 'ipupiara')
  await page.screenshot({ path: `${pasta}/${info.project.name}-ipupiara.png` })
})

test('acabamento: hover, teclado, redução de movimento e elementos desabilitados', async ({ page }, info) => {
  await abrir(page)
  await page.getByRole('button', { name: 'Dia', exact: true }).click()
  const registro = page.locator('.agenda-temporal-registro').first()
  const botao = registro.getByRole('button')
  const inicial = await registro.evaluate(el => ({ sombra: getComputedStyle(el).boxShadow, transform: getComputedStyle(el).transform }))
  if (info.project.name === 'desktop') {
    const indicador = page.locator('.agenda-indicador').first()
    const repouso = await indicador.evaluate(el => getComputedStyle(el).boxShadow)
    await indicador.hover()
    await expect.poll(() => indicador.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe(repouso)
    await page.screenshot({ path: `${pasta}/hover-indicador.png` })
    await botao.hover()
    await expect(registro).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -1)')
    expect(await registro.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe(inicial.sombra)
    await page.screenshot({ path: `${pasta}/hover-agendamento.png` })
    await page.mouse.move(1, 1)
  }
  await botao.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(registro).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -1)')
  const livre = page.locator('button.agenda-temporal-livre:not(:disabled)').first()
  await livre.scrollIntoViewIfNeeded()
  const normal = await livre.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, borda: getComputedStyle(el).borderColor }))
  if (info.project.name === 'desktop') {
    await livre.hover()
    await expect.poll(() => livre.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(normal.bg)
    await expect.poll(() => livre.evaluate(el => getComputedStyle(el).borderColor)).not.toBe(normal.borda)
    await page.screenshot({ path: `${pasta}/hover-livre.png` })
    await page.mouse.move(1, 1)
  }
  await livre.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect.poll(() => livre.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(normal.bg)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await botao.focus()
  await expect(registro).toHaveCSS('transform', 'none')
  await expect(registro).toHaveCSS('transition-duration', '0s')
  await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click()
  const enviar = page.getByRole('dialog', { name: 'Novo agendamento' }).getByRole('button', { name: 'Agendar', exact: true })
  await expect(enviar).toBeDisabled()
  const sombra = await enviar.evaluate(el => getComputedStyle(el).boxShadow)
  if (info.project.name === 'desktop') { await enviar.hover(); expect(await enviar.evaluate(el => getComputedStyle(el).boxShadow)).toBe(sombra) }
})

test('acabamento: contraste dos pares novos nos dois temas e clínicas', async ({ page }, info) => {
  await mkdir(pasta, { recursive: true })
  const resultados: unknown[] = []
  for (const unidade of ['brotas', 'ipupiara']) {
    await abrir(page, unidade)
    for (const tema of ['claro', 'escuro']) {
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), tema)
      // Fórmula e composição do script existente scratch/agenda-ux/pagina/contraste.mjs.
      const pares = await page.evaluate(() => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 1
        const ctx = cv.getContext('2d', { willReadFrequently: true })!
        const res = (v: string) => { const el = document.createElement('div'); el.style.color = `var(${v})`; document.body.append(el); const c = getComputedStyle(el).color; el.remove(); return c }
        const pixel = (fundo: string, cor?: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = fundo; ctx.fillRect(0, 0, 1, 1); if (cor) { ctx.fillStyle = cor; ctx.fillRect(0, 0, 1, 1) } return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
        const lum = (c: number[]) => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }); return .2126 * r + .7152 * g + .0722 * b }
        const razao = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x + .05) / (y + .05)).toFixed(2) }
        const card = res('--fundo-card')
        const p = (texto: string, fundo: string) => ({ texto, fundo, corTexto: res(texto), corFundo: res(fundo), contraste: razao(pixel(res(texto)), pixel(card, res(fundo))) })
        return [
          // Ícones aria-hidden são decorativos. Acento vivo não é cor de texto.
          ...Array.from({ length: 5 }, (_, i) => [p(`--kpi-${i + 1}-texto`, `--kpi-${i + 1}-icone-fundo`), ...['inicio', 'fim'].flatMap(s => ['--texto-principal', '--texto-secundario'].map(t => p(t, `--kpi-${i + 1}-${s}`)))]).flat(),
          ...Array.from({ length: 6 }, (_, i) => [p(`--prof-${i + 1}-texto`, `--prof-${i + 1}-avatar`), p('--texto-principal', `--prof-${i + 1}-fundo`), p('--texto-secundario', `--prof-${i + 1}-fundo`)]).flat(),
          p('--agenda-realce-texto', '--agenda-realce-fundo'), p('--texto-principal', '--agenda-realce-fundo'), p('--texto-secundario', '--agenda-realce-fundo'),
          p('--agenda-link-texto', '--fundo-card'), p('--agenda-link-texto', '--agenda-realce-fundo'),
        ]
      })
      for (const par of pares) expect(par.contraste, `${unidade}/${tema}: ${par.texto}/${par.fundo}`).toBeGreaterThanOrEqual(4.5)
      resultados.push({ unidade, tema, pares })
    }
  }
  await writeFile(`${pasta}/contrastes-${info.project.name}.json`, JSON.stringify(resultados, null, 2))
})
