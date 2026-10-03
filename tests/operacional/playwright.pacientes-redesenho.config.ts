import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.', testMatch: ['pacientes-redesenho.spec.ts', 'pacientes-edicao.spec.ts', 'pacientes-filtros.spec.ts', 'pacientes-layout.spec.ts'],
  workers: 2, retries: 0, timeout: 60000, reporter: 'list', outputDir: '../../scratch/pacientes-redesenho/resultados',
  use: { baseURL: 'http://127.0.0.1:4192', browserName: 'chromium', channel: 'chrome' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } }, { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } }, { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
})
