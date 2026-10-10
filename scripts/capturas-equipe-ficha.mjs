// Capturas da ficha da Equipe com dados fictícios, fora da suíte de testes.
// Uso: node scripts/capturas-equipe-ficha.mjs [pasta]  (padrão: scratch/equipe-ficha-capturas)
// Sobe o Vite sintético na porta 4194; bloqueia toda rede externa e não usa credenciais.
import { createServer } from 'vite'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const pasta = process.argv[2] ?? 'scratch/equipe-ficha-capturas'
const porta = 4194
const nome = process.env.FICHA_NOME ?? 'Médico CLT Sintético'
const server = await createServer({ configFile: resolve('tests/operacional/vite.config.ts'), server: { host: '127.0.0.1', port: porta, strictPort: true } })
await server.listen()
const navegador = await chromium.launch({ channel: 'chrome' })
try {
  const page = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', e => console.log('ERRO NA PÁGINA:', e.message))
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text()) })
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort())
  const capturar = async (arquivo) => { await page.waitForTimeout(500); await page.screenshot({ path: `${pasta}/${arquivo}.png` }); console.log(`${pasta}/${arquivo}.png`) }
  const abrir = async () => {
    await page.getByRole('button', { name: `Ver cadastro de ${nome}`, exact: true }).click()
    await page.getByRole('heading', { name: 'Visão geral', exact: true }).waitFor({ timeout: 30_000 })
    await page.waitForTimeout(1200)
  }
  const secao = async (rotulo) => page.getByRole('navigation', { name: 'Seções da ficha' }).getByRole('button', { name: rotulo, exact: true }).click()
  await page.goto(`http://127.0.0.1:${porta}/tests/operacional/equipe-fichas-demo.html`, { timeout: 120_000 })
  await page.getByRole('button', { name: `Ver cadastro de ${nome}`, exact: true }).waitFor({ timeout: 60_000 })
  await abrir()
  await capturar('1-visao-geral-1440-claro')
  await secao('Dados pessoais'); await capturar('2-dados-pessoais-1440-claro')
  await secao('Documentos'); await capturar('3-documentos-casca-1440-claro')
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'escuro'))
  await secao('Visão geral'); await capturar('4-visao-geral-1440-escuro')
  console.log('CONTRASTE selo neutro (escuro):', await page.evaluate(() => {
    const el = document.querySelector('dialog[open] .equipe-selo-neutro'); if (!el) return 'sem selo neutro'
    const c = document.createElement('canvas').getContext('2d'); const rgb = s => { c.clearRect(0, 0, 1, 1); c.fillStyle = s; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data] }
    const L = a => a.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0)
    const st = getComputedStyle(el), a = L(rgb(st.color)), b = L(rgb(st.backgroundColor)); return ((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2) + ':1'
  }))
  await secao('Dados pessoais'); await capturar('5-dados-pessoais-1440-escuro')
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'claro'))
  await secao('Visão geral')
  await page.setViewportSize({ width: 820, height: 1100 }); await capturar('6-visao-geral-820')
  await secao('Dados pessoais'); await capturar('6b-dados-pessoais-820'); await secao('Visão geral')
  await page.setViewportSize({ width: 390, height: 844 }); await capturar('7-visao-geral-390')
  await secao('Dados pessoais'); await capturar('8-dados-pessoais-390')
} finally {
  await navegador.close()
  await server.close()
}
