import { defineConfig } from '@playwright/test'
import base from './playwright.agenda-celular.config'
export default defineConfig({
  ...base,
  testMatch: [...base.testMatch as string[], 'agenda-acabamento.spec.ts'],
  outputDir: '../../scratch/agenda-ux/acabamento-cores-2/resultados', retries: 0,
  use: { ...base.use, baseURL: 'http://127.0.0.1:4193' },
  webServer: {
    cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/operacional/vite.agenda-acabamento.config.ts --host 127.0.0.1 --port 4193 --strictPort',
    url: 'http://127.0.0.1:4193/tests/operacional/agenda-preview.html', reuseExistingServer: false,
  },
})
