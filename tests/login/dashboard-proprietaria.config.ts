import { defineConfig } from '@playwright/test'
import base from './recovery.config'

export default defineConfig({
  ...base,
  testMatch: 'dashboard-proprietaria.spec.ts',
  outputDir: '../../scratch/dashboard-proprietaria/resultados',
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'mobile', use: { viewport: { width: 360, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
