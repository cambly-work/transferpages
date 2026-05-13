const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';
const TARGETS = ['/en/', '/ru/', '/pt/', '/es/'];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const url of TARGETS) {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.evaluateOnNewDocument((th) => {
        try {
          localStorage.setItem('preferredTheme', th);
          localStorage.setItem('cookie_consent', 'essential');
        } catch (e) {}
      }, theme);
      try {
        await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2', timeout: 18000 });
      } catch (err) {
        console.warn(`${url} ${theme}: ${err.message}`);
        await page.close();
        continue;
      }
      // Scroll through whole page to trigger IntersectionObserver
      await page.evaluate(async () => {
        await new Promise((r) => {
          let y = 0;
          const step = () => {
            y += 400;
            window.scrollTo(0, y);
            if (y < document.body.scrollHeight + 400) requestAnimationFrame(step);
            else { window.scrollTo(0, 0); setTimeout(r, 400); }
          };
          step();
        });
      });
      await new Promise((r) => setTimeout(r, 2200));
      const file = url.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'index';
      const out = `/tmp/rebrand-${file}-${theme}.png`;
      await page.screenshot({ path: out, fullPage: true });
      console.log(`saved ${out}`);
      await page.close();
    }
  }
  await browser.close();
})();
