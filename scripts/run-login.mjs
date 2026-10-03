import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const servidor = await createServer({
  configFile: resolve('tests/financeiro/vite.config.ts'),
  server: { host: '127.0.0.1', port: 4182, strictPort: true },
})

let codigo = 1
try {
  await servidor.listen()
  const runner = spawn(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', '--config', 'tests/login/playwright.config.ts', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, LOGIN_TEST_EXTERNAL_SERVER: '1' },
  })
  codigo = await new Promise((resolveCodigo, reject) => {
    runner.once('error', reject)
    runner.once('exit', (exitCode) => resolveCodigo(exitCode ?? 1))
  })
} finally {
  await servidor.close()
}

process.exitCode = codigo
