import { defineConfig, mergeConfig } from 'vite'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sintetico from './dashboard-administrativa.vite.config.ts'
export default mergeConfig(sintetico, defineConfig({
  cacheDir: join(tmpdir(), 'clinica-patricia-publicacao-parcial', 'vite-cache'),
  define: { 'import.meta.env.DEV': false, 'import.meta.env.PROD': true },
}))
