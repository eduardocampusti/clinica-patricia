import { defineConfig } from '@playwright/test'
import base from './recovery.config'

export default defineConfig({
  ...base,
  testMatch: 'dashboard-proprietaria.spec.ts',
  outputDir: '../../scratch/dashboard-proprietaria/resultados',
  webServer: process.env.RECOVERY_TEST_EXTERNAL_SERVER === '1' ? undefined : { cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/login/dashboard-identidade.vite.config.ts --host 127.0.0.1 --port 4182 --strictPort', url: 'http://127.0.0.1:4182', reuseExistingServer: false },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'mobile', use: { viewport: { width: 360, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
