import { expect, type Page } from '@playwright/test'

/** Evidência de leitura/contraste/layout; não replica medidas de CSS. Só fixtures. */
export async function conferirAcabamento(page: Page, raiz: '.prop' | '.rp-integrado') {
  const resultado = await page.locator(raiz).evaluate(root => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')!
    const lum = (pixel: Uint8ClampedArray) => {
      const c = [...pixel].slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
      return c[0] * .2126 + c[1] * .7152 + c[2] * .0722
    }
    const falhas: string[] = []
    for (const e of root.querySelectorAll('dt, dd strong, dd small, .prop-nota, .prop-vazio-linha, .rp-metric p, .rp-metric strong, .rp-metric small, .rp-muted, .rp-badge')) {
      if (!(e as HTMLElement).checkVisibility() || !e.textContent?.trim()) continue
      const style = getComputedStyle(e), ancestors: Element[] = []
      for (let p: Element | null = e; p; p = p.parentElement) ancestors.unshift(p)
      ctx.clearRect(0, 0, 1, 1)
      for (const p of ancestors) { ctx.fillStyle = getComputedStyle(p).backgroundColor; ctx.fillRect(0, 0, 1, 1) }
      const bg = lum(ctx.getImageData(0, 0, 1, 1).data)
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = style.color; ctx.fillRect(0, 0, 1, 1)
      const fg = lum(ctx.getImageData(0, 0, 1, 1).data)
      const ratio = (Math.max(bg, fg) + .05) / (Math.min(bg, fg) + .05)
      const grande = parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700
      if (ratio < (grande ? 3 : 4.5)) falhas.push(`${e.tagName}: contraste ${ratio.toFixed(2)}`)
    }
    const limites = root.getBoundingClientRect()
    const fora = [...root.querySelectorAll('.prop-moeda,.prop-contagem,.rp-metric,.rp-panel')].some(e => {
      const r = e.getBoundingClientRect(); return r.left < limites.left - 1 || r.right > limites.right + 1
    })
    return { falhas, fora, paginaSemTransbordamento: document.documentElement.scrollWidth <= innerWidth }
  })
  expect(resultado.falhas).toEqual([])
  expect(resultado.fora).toBe(false)
  expect(resultado.paginaSemTransbordamento).toBe(true)
}
