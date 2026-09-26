import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

function commitCurto(): string | null {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 8)
  try {
    return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { cwd: import.meta.dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null
  } catch {
    return null
  }
}

function alteracoesLocais(): boolean | null {
  // Em CI, o SHA identifica o checkout. Na árvore local, um SHA isolado não identifica alterações não commitadas.
  if (process.env.GITHUB_SHA) return false
  try {
    return execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: import.meta.dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().length > 0
  } catch {
    return null
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_BUILD_INFO__: JSON.stringify({ version, commit: commitCurto(), alteracoesLocais: alteracoesLocais(), compiladoEm: new Date().toISOString() }),
  },
})
