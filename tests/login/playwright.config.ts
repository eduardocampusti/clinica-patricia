import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.', testMatch: ['login.spec.ts', 'app.spec.ts', 'responsive.spec.ts'], workers: 1, reporter: 'list',
  outputDir: '../../scratch/login-results',
  use: { baseURL: 'http://127.0.0.1:4182', channel: 'chrome' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: process.env.LOGIN_TEST_EXTERNAL_SERVER === '1' ? undefined : { cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/financeiro/vite.config.ts --host 127.0.0.1 --port 4182 --strictPort', url: 'http://127.0.0.1:4182/tests/login/login.html', reuseExistingServer: false },
})
