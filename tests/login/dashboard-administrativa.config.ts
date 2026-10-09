import { defineConfig } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
export default defineConfig({
  testDir: '.', testMatch: ['dashboard-administrativa.spec.ts', 'dashboard-proprietaria.spec.ts', 'dashboard-identidade.spec.ts'],
  workers: 1, reporter: 'list',
  outputDir: join(tmpdir(), 'clinica-patricia-dashboard-administrativa', 'resultados'),
  use: { baseURL: 'http://127.0.0.1:4187', channel: 'chrome' },
  webServer: { cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/login/dashboard-administrativa.vite.config.ts --host 127.0.0.1 --port 4187 --strictPort', url: 'http://127.0.0.1:4187', reuseExistingServer: false },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 360, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
