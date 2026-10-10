import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.', testMatch: 'recepcao-preview.spec.ts', workers: 1, fullyParallel: false,
  reporter: 'list', outputDir: '../../scratch/caixa-recepcao-resultados',
  use: { baseURL: 'http://127.0.0.1:4186', browserName: 'chromium', channel: 'chrome' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: 'npm.cmd run dev -- --config tests/financeiro/recepcao-preview.vite.config.ts --host 127.0.0.1 --port 4186 --strictPort', url: 'http://127.0.0.1:4186/tests/financeiro/recepcao-preview.html', reuseExistingServer: true },
})
