import { defineConfig } from '@playwright/test'
export default defineConfig({ testDir: '.', testMatch: 'interface.spec.ts', workers: 1, retries: 0, timeout: 30000, outputDir: '../../scratch/acesso-direto/resultados', reporter: [['list'], ['json', { outputFile: 'scratch/acesso-direto/interface-resultados.json' }]],
  use: { baseURL: 'http://127.0.0.1:4197', channel: 'chrome', trace: 'retain-on-failure' },
  projects: [{ name: 'computador', use: { viewport: { width: 1440, height: 1000 } } }, { name: 'celular', use: { viewport: { width: 390, height: 844 } } }],
  webServer: { cwd: '../..', command: 'node node_modules/vite/bin/vite.js --config tests/acesso-direto/vite.config.ts --host 127.0.0.1 --port 4197 --strictPort', url: 'http://127.0.0.1:4197/tests/acesso-direto/preview.html', reuseExistingServer: false },
})
