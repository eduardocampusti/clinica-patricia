import { defineConfig } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({ ...base, testMatch: ['sidebar.spec.ts', 'sobre-sistema.spec.ts', 'agenda-fechamento.spec.ts', 'agenda-refinamento.spec.ts', 'agenda-experiencia.spec.ts'], outputDir: '../../scratch/sidebar/resultados',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4192' },
  webServer: process.env.PACIENTES_TEST_EXTERNAL_SERVER === '1' ? undefined : { cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/operacional/vite.config.ts --host 127.0.0.1 --port 4192 --strictPort', url: 'http://127.0.0.1:4192/tests/operacional/agenda-preview.html', reuseExistingServer: false } })
