// Playwright e2e config for Morrison Premium Transfer.
// Run: npx playwright test  (requires `npm i -D @playwright/test` first).
// CI: invoked from .github/workflows/lighthouse.yml (uses a separate static server).

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run serve:e2e',
        port: 8080,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
