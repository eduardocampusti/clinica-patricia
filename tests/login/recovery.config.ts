import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.', testMatch: 'recovery.spec.ts', workers: 1, reporter: 'list',
  outputDir: '../../scratch/recovery-results',
  use: { baseURL: 'http://127.0.0.1:4182', channel: 'chrome' },
  webServer: process.env.RECOVERY_TEST_EXTERNAL_SERVER === '1' ? undefined : { cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/financeiro/vite.config.ts --host 127.0.0.1 --port 4182 --strictPort', url: 'http://127.0.0.1:4182', reuseExistingServer: false },
})
