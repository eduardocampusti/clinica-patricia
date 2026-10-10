import { defineConfig, mergeConfig } from 'vite'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sintetico from '../financeiro/vite.config.ts'
export default mergeConfig(sintetico, defineConfig({
  cacheDir: join(tmpdir(), 'clinica-patricia-dashboard-administrativa', 'vite-cache'),
}))
