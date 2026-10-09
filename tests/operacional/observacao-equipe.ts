import { test as base, expect } from '@playwright/test'
export type { Page } from '@playwright/test'
// Apenas diagnóstico: não muda timeout, retries, cliques ou verificações.
export const test = base.extend<{ observacao: void }>({
  observacao: [async ({ page }, use, info) => {
    const eventos: unknown[] = []
    page.on('framenavigated', f => { if (f === page.mainFrame()) eventos.push({ instante: Date.now(), tipo: 'navegacao', url: f.url() }) })
    page.on('console', m => { if (/vite|reload|error/i.test(m.text())) eventos.push({ instante: Date.now(), tipo: 'console', texto: m.text() }) })
    page.on('pageerror', e => eventos.push({ instante: Date.now(), tipo: 'erro', texto: e.message }))
    page.on('response', r => { if (r.status() >= 400 && new URL(r.url()).hostname === '127.0.0.1') eventos.push({ instante: Date.now(), tipo: 'http', status: r.status(), url: r.url() }) })
    await use()
    await info.attach('ambiente-equipe', { body: JSON.stringify(eventos), contentType: 'application/json' })
  }, { auto: true }],
})
export { expect }
