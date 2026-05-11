// Multi-page, multi-viewport audit. Logs overflow, console errors, layout issues.
const puppeteer = require('puppeteer');
const path = require('path');

const BASE = 'https://cambly-work.github.io/transferpages';
const PAGES = ['/ru/', '/ru/brazil-transfers/', '/ru/fleet/', '/ru/fleet/sedan/', '/ru/contact/', '/ru/blog/', '/ru/cases/', '/ru/compare/', '/en/', '/pt/'];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, mobile: false },
  { name: 'tablet',  width: 768,  height: 1024, mobile: true },
  { name: 'mobile',  width: 390,  height: 844, mobile: true },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const issues = [];
  for (const v of VIEWPORTS) {
    for (const pagePath of PAGES) {
      const page = await browser.newPage();
      await page.setViewport({ width: v.width, height: v.height, isMobile: v.mobile, hasTouch: v.mobile });
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
      });
      try {
        await page.goto(`${BASE}${pagePath}`, { waitUntil: 'networkidle0', timeout: 15000 });
        const result = await page.evaluate(() => {
          const html = document.documentElement;
          const scrollW = html.scrollWidth;
          const clientW = html.clientWidth;
          const horizOverflow = scrollW - clientW;

          // Find elements wider than viewport
          const overflowEls = [];
          if (horizOverflow > 1) {
            document.querySelectorAll('*').forEach((el) => {
              const r = el.getBoundingClientRect();
              if (r.right > clientW + 1 || r.left < -1) {
                const cls = el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '';
                const id = el.id ? '#' + el.id : '';
                const tag = el.tagName.toLowerCase();
                overflowEls.push({ sel: tag + id + cls, right: Math.round(r.right), left: Math.round(r.left), w: Math.round(r.width) });
              }
            });
          }

          // Check header sticky logic
          const headerH = document.querySelector('.site-header')?.offsetHeight || 0;
          const navWrap = document.querySelector('.nav-wrap');
          const navOverflow = navWrap ? navWrap.scrollWidth > navWrap.clientWidth + 1 : false;

          // Check if cmdk-trigger is visible
          const trigger = document.querySelector('[data-cmdk-trigger]');
          const triggerRect = trigger ? trigger.getBoundingClientRect() : null;
          const triggerVisible = triggerRect ? (triggerRect.width > 0 && triggerRect.height > 0) : false;

          return { scrollW, clientW, horizOverflow, overflowEls: overflowEls.slice(0, 6), headerH, navOverflow, triggerVisible, triggerRight: triggerRect ? Math.round(triggerRect.right) : null };
        });

        if (result.horizOverflow > 1) {
          issues.push({ vp: v.name, page: pagePath, type: 'h-overflow', delta: result.horizOverflow, sample: result.overflowEls });
        }
        if (result.navOverflow) {
          issues.push({ vp: v.name, page: pagePath, type: 'nav-wrap-overflow' });
        }
        if (!result.triggerVisible) {
          issues.push({ vp: v.name, page: pagePath, type: 'cmdk-trigger-invisible' });
        }
        if (errors.length) {
          issues.push({ vp: v.name, page: pagePath, type: 'js-errors', errors });
        }
        process.stdout.write('.');
      } catch (e) {
        issues.push({ vp: v.name, page: pagePath, type: 'load-fail', msg: e.message });
        process.stdout.write('!');
      }
      await page.close();
    }
  }
  await browser.close();
  console.log('\n\n=== ISSUES ===');
  if (!issues.length) {
    console.log('  ✅ Clean.');
  } else {
    issues.forEach((i) => {
      console.log(`[${i.vp}] ${i.page} · ${i.type}` + (i.delta ? ` (+${i.delta}px)` : ''));
      if (i.sample) i.sample.forEach((s) => console.log(`    ${s.sel} right=${s.right} left=${s.left} w=${s.w}`));
      if (i.errors) i.errors.forEach((e) => console.log(`    ${e}`));
    });
  }
})();
