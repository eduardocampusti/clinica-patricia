import { defineConfig } from '@playwright/test'
import config from './recovery.config'
export default defineConfig({ ...config, testMatch: ['navigation.spec.ts', 'convite.spec.ts', 'recovery.spec.ts'], outputDir: '../../scratch/navigation-results' })
