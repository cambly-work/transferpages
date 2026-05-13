const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const lang of ['en', 'ru']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
    });
    await page.goto(`${BASE}/${lang}/?from=fln&to=cwb`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1800));
    // Scroll to calculator
    await page.evaluate(() => document.querySelector('#calculator')?.scrollIntoView({ block: 'start' }));
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: `/tmp/calc-${lang}-default.png`, fullPage: false });
    console.log(`saved /tmp/calc-${lang}-default.png`);

    // Click SUV tier and re-quote
    await page.evaluate(() => {
      const radio = document.querySelector('input[data-calc-tier][value="suv"]');
      if (radio) { radio.click(); }
    });
    await new Promise((r) => setTimeout(r, 400));
    // Submit
    await page.evaluate(() => document.querySelector('.calc-submit')?.click());
    await new Promise((r) => setTimeout(r, 600));
    // Open breakdown
    await page.evaluate(() => document.querySelector('.calc-breakdown')?.setAttribute('open', ''));
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => document.querySelector('#calculator')?.scrollIntoView({ block: 'start' }));
    await new Promise((r) => setTimeout(r, 200));
    await page.screenshot({ path: `/tmp/calc-${lang}-quote.png`, fullPage: false });
    console.log(`saved /tmp/calc-${lang}-quote.png`);
    await page.close();
  }
  await browser.close();
})();
