import { build, preview } from 'vite'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const configFile = resolve('tests/operacional/vite.equipe-regressao.config.ts')
await build({ configFile })
const servidor = await preview({ configFile, preview: { host: '127.0.0.1', port: 4191, strictPort: true } })
try {
  const runner = spawn(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test',
    'equipe-edicao.spec.ts', 'equipe-papel-explicito.spec.ts', 'equipe-papeis.spec.ts',
    '--config', 'tests/operacional/playwright.config.ts', ...process.argv.slice(2)], {
    stdio: 'inherit', env: { ...process.env, PACIENTES_TEST_EXTERNAL_SERVER: '1' },
  })
  process.exitCode = await new Promise((done, reject) => {
    runner.once('error', reject)
    runner.once('exit', code => done(code ?? 1))
  })
} finally { await new Promise((done, reject) => servidor.httpServer.close(error => error ? reject(error) : done())) }
