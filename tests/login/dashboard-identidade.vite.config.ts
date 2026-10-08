import { defineConfig, mergeConfig } from 'vite'
import sintetico from '../financeiro/vite.config.ts'

export default mergeConfig(sintetico, defineConfig({ cacheDir: 'scratch/dashboard-identidade/vite-cache' }))
