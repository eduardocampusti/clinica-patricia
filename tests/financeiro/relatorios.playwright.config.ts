import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.', testMatch: 'relatorios.spec.ts', fullyParallel: false, workers: 1,
  reporter: 'list', outputDir: '../../scratch/financeiro-relatorios-resultados',
  use: { baseURL: 'http://127.0.0.1:4187', browserName: 'chromium', channel: 'chrome', acceptDownloads: true },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm.cmd run dev -- --config tests/financeiro/vite.config.ts --host 127.0.0.1 --port 4187 --strictPort',
    url: 'http://127.0.0.1:4187/tests/financeiro/relatorios.html', reuseExistingServer: false,
  },
})
