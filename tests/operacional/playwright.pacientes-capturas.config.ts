import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.', testMatch: 'pacientes-capturas.spec.ts', workers: 1, retries: 0,
  reporter: 'list', outputDir: '../../scratch/pacientes-redesenho/capturas-resultados',
  use: { baseURL: 'http://127.0.0.1:4192', browserName: 'chromium', channel: 'chrome', deviceScaleFactor: 2 },
  // Dimensões de saída iguais aos arquivos de referência (CSS em 2x).
  projects: [
    { name: 'lista', use: { viewport: { width: 1440, height: 1080 } } },
    { name: 'cadastro', use: { viewport: { width: 960, height: 860 } } },
    { name: 'celular', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
