// Smoke e2e for golden paths. Run after `npm run build` from next/.
const { test, expect } = require('@playwright/test');

test.describe('Morrison site smoke', () => {
  test('root redirector resolves to /<lang>/', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    await page.waitForURL(/\/(ru|pt|en|es)\/$/, { timeout: 6000 });
    await expect(page.locator('header.site-header')).toBeVisible();
  });

  for (const lang of ['ru', 'pt', 'en', 'es']) {
    test(`${lang} home renders hero + footer`, async ({ page }) => {
      await page.goto(`/${lang}/`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('.site-footer')).toBeVisible();
      const html = await page.content();
      expect(html).toContain('Morrison');
    });
  }

  test('language switcher persists preference and navigates', async ({ page, context }) => {
    await page.goto('/en/');
    const switcher = page.locator('.lang-switch a[href*="/pt/"]').first();
    await switcher.click();
    await expect(page).toHaveURL(/\/pt\//);
    const cookies = await context.cookies();
    const stored = await page.evaluate(() => window.localStorage.getItem('preferredLanguage'));
    expect(stored).toBe('pt');
  });

  test('Cmd+K is reachable from mobile menu', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only');
    await page.goto('/en/');
    await page.locator('.nav-toggle').click();
    const searchBtn = page.locator('.nav-list-search-btn');
    await expect(searchBtn).toBeVisible();
    await searchBtn.click();
    await expect(page.locator('[data-cmdk]')).toBeVisible();
  });

  test('brief form: validation blocks submit when required fields missing', async ({ page }) => {
    await page.goto('/en/contact/');
    const form = page.locator('[data-brief-form]');
    await expect(form).toBeVisible();
    await page.locator('[data-brief-next]').click();
    await expect(page.locator('[data-brief-error]')).toBeVisible();
  });

  test('legacy redirect /brazil-transfers.html → /ru/brazil-transfers/', async ({ page }) => {
    await page.goto('/brazil-transfers.html');
    await page.waitForURL(/\/ru\/brazil-transfers\//, { timeout: 4000 });
  });

  test('portal stub page renders with disabled login', async ({ page }) => {
    await page.goto('/en/portal/');
    await expect(page.locator('h1')).toContainText(/portal|Q3 2026/i);
    const submit = page.locator('.portal-login-form button[disabled]');
    await expect(submit).toBeVisible();
  });
});
