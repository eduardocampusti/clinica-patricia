import { defineConfig } from '@playwright/test'
import base from './recovery.config'
export default defineConfig({
  ...base, testMatch: 'analise-periodo.spec.ts',
  outputDir: '../../scratch/analise-financeira/resultados',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4187' },
  webServer: { cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/login/dashboard-administrativa.vite.config.ts --host 127.0.0.1 --port 4187 --strictPort', url: 'http://127.0.0.1:4187', reuseExistingServer: false },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 1050 } } }],
})
