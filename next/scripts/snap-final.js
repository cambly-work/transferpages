const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';
const TARGETS = [
  '/en/team/', '/en/testimonials/',
  '/es/about/', '/es/contact/', '/es/blog/', '/es/international/',
  '/es/florianopolis/', '/es/balneario-camboriu/',
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const url of TARGETS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
    });
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2', timeout: 15000 });
    } catch (err) {
      console.warn(`fail ${url}: ${err.message}`);
      await page.close();
      continue;
    }
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await new Promise(r => setTimeout(r, 300));
    const file = url.replace(/^\/|\/$/g, '').replace(/\//g, '-');
    const out = `/tmp/final-${file}.png`;
    await page.screenshot({ path: out, fullPage: false });
    console.log(`saved ${out}`);
    await page.close();
  }
  await browser.close();
})();
