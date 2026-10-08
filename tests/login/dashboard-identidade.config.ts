import { defineConfig } from '@playwright/test'
import base from './dashboard-proprietaria.config'
export default defineConfig({ ...base, testMatch: ['dashboard-identidade.spec.ts', 'recovery.spec.ts', 'convite.spec.ts'], outputDir: '../../scratch/dashboard-identidade/resultados', projects: [{ name: 'identidade', use: { viewport: { width: 1440, height: 1000 } } }] })
