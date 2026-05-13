const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const lang of ['en', 'ru']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200 });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
    });
    await page.goto(`${BASE}/${lang}/?from=fln&to=cwb`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2400));
    // Submit calc
    await page.evaluate(() => document.querySelector('.calc-submit')?.click());
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(() => document.querySelector('.calc-breakdown')?.setAttribute('open', ''));
    await new Promise((r) => setTimeout(r, 300));
    const calc = await page.$('#calculator');
    if (calc) {
      await calc.screenshot({ path: `/tmp/calc-elem-${lang}.png` });
      console.log(`saved /tmp/calc-elem-${lang}.png`);
    }
    await page.close();
  }
  await browser.close();
})();
