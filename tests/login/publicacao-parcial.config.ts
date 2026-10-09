import { defineConfig } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
export default defineConfig({
  testDir: '.', testMatch: 'publicacao-parcial.spec.ts', workers: 1, retries: 0, reporter: 'list',
  outputDir: join(tmpdir(), 'clinica-patricia-publicacao-parcial', 'resultados'),
  use: { baseURL: 'http://127.0.0.1:4188', channel: 'chrome' },
  webServer: { cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/login/publicacao-parcial.vite.config.ts --host 127.0.0.1 --port 4188 --strictPort', url: 'http://127.0.0.1:4188', reuseExistingServer: false },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 360, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
