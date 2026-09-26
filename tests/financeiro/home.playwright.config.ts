import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.', testMatch: 'home.spec.ts', fullyParallel: false, workers: 1,
  reporter: 'list', outputDir: '../../scratch/financeiro-home-resultados',
  use: { baseURL: 'http://127.0.0.1:4186', browserName: 'chromium', channel: 'chrome' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm.cmd run dev -- --config tests/financeiro/vite.config.ts --host 127.0.0.1 --port 4186 --strictPort',
    url: 'http://127.0.0.1:4186/tests/financeiro/home.html', reuseExistingServer: false,
  },
})
