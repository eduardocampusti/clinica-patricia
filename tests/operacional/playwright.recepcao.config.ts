import { defineConfig } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({ ...base, testMatch: ['recepcao-preview.spec.ts', 'recepcao-integracao.spec.ts'], outputDir: '../../scratch/recepcao-preview/resultados',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4193' },
  webServer: process.env.RECEPCAO_TEST_EXTERNAL_SERVER === '1' ? undefined : { cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/operacional/vite.recepcao.config.ts --host 127.0.0.1 --port 4193 --strictPort', url: 'http://127.0.0.1:4193/tests/operacional/recepcao-preview.html', reuseExistingServer: false },
})
