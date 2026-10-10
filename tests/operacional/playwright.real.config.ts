import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const portableChromium = resolve('node_modules/playwright-core/.local-browsers/chromium-1243/chrome-win64/chrome.exe')
const browser = existsSync(portableChromium)
  ? { launchOptions: { executablePath: portableChromium } }
  : { channel: 'chrome' as const }

export default defineConfig({
  testDir: '.',
  testMatch: 'real-smoke.spec.ts',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4182',
    viewport: { width: 1440, height: 1000 },
    ...browser,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4182',
    url: 'http://127.0.0.1:4182',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
