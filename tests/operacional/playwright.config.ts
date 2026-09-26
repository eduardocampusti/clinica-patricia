import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  testIgnore: 'real-smoke.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: '../../scratch/fase11-operacional/resultados',
  use: {
    baseURL: 'http://127.0.0.1:4191',
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.PACIENTES_TEST_EXTERNAL_SERVER === '1' ? undefined : {
    // Inicia o Vite diretamente, sem o processo intermediário do npm.cmd.
    // No Windows, o wrapper mantinha o runner vivo após o último teste.
    cwd: '../..',
    command: 'node node_modules/vite/bin/vite.js --config tests/operacional/vite.config.ts --host 127.0.0.1 --port 4191 --strictPort',
    url: 'http://127.0.0.1:4191/tests/operacional/shell.html',
    reuseExistingServer: false,
  },
})
