import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
await mkdir('scratch/caixa-recepcao', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
for (const [nome, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'light' })
  const page = await context.newPage()
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  const abrir = async (cenario = 'aberto') => { await page.goto(`http://127.0.0.1:4186/tests/financeiro/recepcao-preview.html?cenario=${cenario}`); await page.getByRole('heading', { name: 'Caixa da recepção' }).waitFor() }
  const capturar = async estado => { await page.screenshot({ path: `scratch/caixa-recepcao/${nome}-${estado}.png`, fullPage: true }) }
  await abrir(); await page.getByRole('tab', { name: 'Estornos', exact: true }).click(); await capturar('estornos')
  await page.getByRole('button', { name: 'Solicitar estorno', exact: true }).click(); await page.getByLabel('Valor a estornar em dinheiro').fill('50,00'); await page.getByLabel('Motivo', { exact: true }).fill('Correção solicitada para conferência.'); await page.getByRole('button', { name: 'Revisar dados' }).click(); await page.locator('.cp-fluxo').evaluate(el => { el.scrollTop = 0 }); await capturar('estorno-revisao')
  await abrir(); await page.getByRole('tab', { name: 'Fiscal', exact: true }).click(); await capturar('fiscal')
  for (const operacao of ['sangria', 'suprimento']) {
    await abrir(); await page.getByText('Outras ações ▾').click(); await page.getByRole('button', { name: operacao === 'sangria' ? 'Solicitar sangria' : 'Suprimento', exact: true }).click()
    await page.getByLabel('Valor', { exact: true }).fill(operacao === 'sangria' ? '100,00' : '50,00'); await page.getByLabel('Motivo', { exact: true }).fill(operacao === 'sangria' ? 'Retirada para guarda após aprovação.' : 'Reforço de troco.')
    await page.getByRole('button', { name: 'Revisar dados' }).click(); await page.locator('.cp-fluxo').evaluate(el => { el.scrollTop = 0 }); await capturar(operacao)
  }
  await abrir(); await page.getByRole('button', { name: '＋ Receber pagamento' }).click(); await page.getByLabel('Dividir pagamento').check(); await page.getByLabel('Dinheiro entregue pelo paciente').fill('150,00'); await page.getByLabel('Conferi o Pix externamente').check(); await page.getByRole('button', { name: /Registrar/ }).click(); await page.getByRole('button', { name: 'Imprimir recibo demonstrativo' }).waitFor(); await page.getByRole('button', { name: 'Imprimir recibo demonstrativo' }).click(); await page.locator('.cp-fluxo').evaluate(el => { el.scrollTop = 0 }); await capturar('recibo-falha-impressao')
  for (const estado of ['erro', 'carregando', 'vazio', 'permissao', 'legado']) { await abrir(estado); await capturar(estado) }
  await context.close()
}
await browser.close()
console.log('22 capturas sintéticas adicionais salvas em scratch/caixa-recepcao.')
