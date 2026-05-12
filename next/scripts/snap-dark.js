// Dark theme screenshots with mobile menu open
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });

  for (const cfg of [
    { name: 'home-dark-mobile', url: '/ru/', vw: 390, vh: 844, mobile: true, openMenu: false },
    { name: 'home-dark-menu-mobile', url: '/ru/', vw: 390, vh: 844, mobile: true, openMenu: true },
    { name: 'home-dark-desktop', url: '/ru/', vw: 1280, vh: 800, mobile: false, openMenu: false },
  ]) {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.setViewport({ width: cfg.vw, height: cfg.vh, isMobile: cfg.mobile, hasTouch: cfg.mobile });
    await page.goto(`${BASE}${cfg.url}`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 600));
    if (cfg.openMenu) {
      await page.click('.nav-toggle');
      await new Promise((r) => setTimeout(r, 350));
    }
    await page.screenshot({ path: `/tmp/${cfg.name}.png`, fullPage: false });
    console.log(`saved /tmp/${cfg.name}.png`);
    await page.close();
  }
  await browser.close();
})();
