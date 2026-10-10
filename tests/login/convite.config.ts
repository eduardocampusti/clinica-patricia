import { defineConfig } from '@playwright/test'
import recovery from './recovery.config'

export default defineConfig({ ...recovery, testMatch: 'convite.spec.ts', outputDir: '../../scratch/convite-results' })
