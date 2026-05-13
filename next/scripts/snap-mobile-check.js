// Mobile smoke check for the rebranded + trimmed home in 4 langs.
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const lang of ['en', 'ru', 'pt', 'es']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
    });
    await page.goto(`${BASE}/${lang}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2200));
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      docWidth: document.documentElement.scrollWidth,
      vipLayout: getComputedStyle(document.querySelector('.vip-layout')).gridTemplateColumns,
      geoCols: getComputedStyle(document.querySelector('.geo-network')).gridTemplateColumns,
      stepsCols: getComputedStyle(document.querySelector('.steps--6')).gridTemplateColumns,
      capCols: getComputedStyle(document.querySelector('.capability-grid')).gridTemplateColumns,
      journeyCols: document.querySelector('.journey-link') ? getComputedStyle(document.querySelector('.journey-link')).gridTemplateColumns : 'n/a',
    }));
    console.log(`${lang}: overflow=${info.overflow} w=${info.docWidth}px`);
    console.log(`  vip=${info.vipLayout} | geo=${info.geoCols} | steps=${info.stepsCols} | cap=${info.capCols} | journey=${info.journeyCols}`);
    await page.screenshot({ path: `/tmp/mobile-home-${lang}.png`, fullPage: true });
    console.log(`  saved /tmp/mobile-home-${lang}.png`);
    await page.close();
  }
  await browser.close();
})();
