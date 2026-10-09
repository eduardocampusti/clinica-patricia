import { defineConfig, mergeConfig } from 'vite'
import { resolve } from 'node:path'
import base from '../financeiro/vite.config.ts'
export default mergeConfig(base, defineConfig({
  cacheDir: 'scratch/acesso-direto/vite-cache',
  plugins: [{ name: 'flag-exclusivamente-sintetica', enforce: 'pre', resolveId(id) {
    if (id.endsWith('/config/acessoDireto')) return resolve('tests/acesso-direto/flag-sintetica.ts')
  } }],
}))
