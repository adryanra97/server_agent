import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 35000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['junit', { outputFile: 'playwright-results.xml' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{name:'chromium', use:{...devices['Desktop Chrome'], viewport:{width:1366,height:768}}}],
  webServer: {
    command: 'npm run start -- -p 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: { NEXT_TELEMETRY_DISABLED: '1' },
  },
});
