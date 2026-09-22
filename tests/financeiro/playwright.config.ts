import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.', testMatch: 'recebimento.spec.ts', fullyParallel: false, workers: 1,
  reporter: 'list', outputDir: '../../scratch/financeiro-10b-resultados',
  use: { baseURL: 'http://127.0.0.1:4178', browserName: 'chromium', channel: 'chrome', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm.cmd run dev -- --config tests/financeiro/vite.config.ts --host 127.0.0.1 --port 4178 --strictPort',
    url: 'http://127.0.0.1:4178/tests/financeiro/index.html', reuseExistingServer: false,
  },
})
