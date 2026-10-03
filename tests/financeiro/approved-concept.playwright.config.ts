import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.', testMatch: ['abas.spec.ts', 'caixa.spec.ts', 'estornos.spec.ts', 'repasses.spec.ts', 'fiscal.spec.ts', 'painel.spec.ts', 'relatorios.spec.ts', 'approved-concept.spec.ts'],
  timeout: 60_000, fullyParallel: false, workers: 1, reporter: 'list',
  outputDir: '../../scratch/fase14-approved-results',
  use: { baseURL: 'http://127.0.0.1:4181', browserName: 'chromium', channel: 'chrome', acceptDownloads: true },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', testMatch: 'approved-concept.spec.ts', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm.cmd run dev -- --config tests/financeiro/vite.config.ts --host 127.0.0.1 --port 4181 --strictPort',
    url: 'http://127.0.0.1:4181/tests/financeiro/visual.html', reuseExistingServer: true,
  },
})
