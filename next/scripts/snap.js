// Capture screenshots of key pages at desktop + mobile.
const puppeteer = require('puppeteer');
const path = require('path');

const BASE = 'http://localhost:8766/transferpages';
const TARGETS = [
  { url: '/ru/', file: 'home' },
  { url: '/ru/contact/', file: 'contact' },
  { url: '/ru/fleet/sedan/', file: 'fleet-sedan' },
  { url: '/ru/blog/', file: 'blog' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const t of TARGETS) {
    for (const vp of [
      { name: 'desktop', w: 1280, h: 800, m: false },
      { name: 'mobile', w: 390, h: 844, m: true },
    ]) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.m, hasTouch: vp.m });
      await page.goto(`${BASE}${t.url}`, { waitUntil: 'networkidle0', timeout: 15000 });
      const out = `/tmp/snap-${t.file}-${vp.name}.png`;
      await page.screenshot({ path: out, fullPage: false });
      console.log(`saved ${out}`);

      // Inspect header on top-of-page
      const headerInfo = await page.evaluate(() => {
        const header = document.querySelector('.site-header');
        const navWrap = document.querySelector('.nav-wrap');
        const trigger = document.querySelector('[data-cmdk-trigger]');
        return {
          headerRect: header ? { w: header.offsetWidth, h: header.offsetHeight, scrollW: header.scrollWidth } : null,
          navWrapRect: navWrap ? { w: navWrap.offsetWidth, scrollW: navWrap.scrollWidth, overflowing: navWrap.scrollWidth > navWrap.offsetWidth } : null,
          triggerStyle: trigger ? {
            display: getComputedStyle(trigger).display,
            visibility: getComputedStyle(trigger).visibility,
            width: trigger.offsetWidth,
            height: trigger.offsetHeight,
            rect: { top: Math.round(trigger.getBoundingClientRect().top), left: Math.round(trigger.getBoundingClientRect().left), right: Math.round(trigger.getBoundingClientRect().right) },
          } : null,
        };
      });
      console.log(`  ${t.file}/${vp.name}:`, JSON.stringify(headerInfo, null, 0));
      await page.close();
    }
  }
  await browser.close();
})();
