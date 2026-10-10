import { defineConfig } from '@playwright/test'
import base from './dashboard-proprietaria.config'
export default defineConfig({ ...base, testMatch: 'meu-perfil.spec.ts', outputDir: '../../scratch/meu-perfil/resultados', webServer: { cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/login/meu-perfil.vite.config.ts --host 127.0.0.1 --port 4182 --strictPort', url: 'http://127.0.0.1:4182', reuseExistingServer: false }, projects: [{ name: 'perfil', use: { viewport: { width: 1440, height: 1000 } } }] })
