import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.js',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  globalSetup: './tests/setup.js',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    launchOptions: process.env.CRYO_TEST_BROWSER ? { executablePath: process.env.CRYO_TEST_BROWSER } : undefined,
  },
  workers: 1,
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    env: { API_PROXY_TARGET: 'http://127.0.0.1:4174', VITE_API_URL: '/api/v1' },
  },
})
