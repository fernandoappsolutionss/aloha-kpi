import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:3011'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /primitives\.spec\.js/,
  outputDir: 'test-results/primitives',
  reporter: [['list']],
  workers: 1,
  use: {
    baseURL,
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
    trace: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: 'node tests/e2e/helpers/start-next.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      E2E_NEXT_PROFILE: 'primitives',
      E2E_NEXT_PORT: '3011',
      E2E_UI_FIXTURES: '1',
      E2E_DATABASE_CONFIRM: 'disposable',
    },
  },
})
