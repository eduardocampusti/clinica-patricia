import { defineConfig, mergeConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import base from './dashboard-identidade.vite.config.ts'
export default mergeConfig(base, defineConfig({ cacheDir: 'scratch/meu-perfil/vite-cache', resolve: { alias: [{ find: /^.*\/config\/perfilConta$/u, replacement: fileURLToPath(new URL('./meu-perfil.servico-sintetico.ts', import.meta.url)) }] } }))
