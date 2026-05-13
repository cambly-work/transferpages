const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';
const TARGETS = [
  '/en/balneario-camboriu/',
  '/en/about/',
  '/en/international/',
  '/en/blog/rainy-season-driving/',
  '/ru/balneario-camboriu/',
  '/ru/about/',
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
    const out = `/tmp/photo-${file}.png`;
    await page.screenshot({ path: out, fullPage: false });
    const info = await page.evaluate(() => {
      const fig = document.querySelector('.hero-photo');
      if (!fig) return null;
      const img = fig.querySelector('img');
      const r = fig.getBoundingClientRect();
      return {
        h: Math.round(r.height), w: Math.round(r.width),
        complete: img?.complete, naturalW: img?.naturalWidth, naturalH: img?.naturalHeight,
        src: img?.currentSrc,
      };
    });
    console.log(`${url}: ${JSON.stringify(info)} → ${out}`);
    await page.close();
  }
  await browser.close();
})();
