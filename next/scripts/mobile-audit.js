// Deep mobile audit: full-page screenshots + structural checks
const puppeteer = require('puppeteer');

const BASE = 'http://localhost:8766/transferpages';
const PAGES = [
  '/ru/', '/ru/brazil-transfers/', '/ru/airport-transfer/', '/ru/international/',
  '/ru/partners/', '/ru/contact/', '/ru/fleet/', '/ru/fleet/sedan/',
  '/ru/cases/', '/ru/compare/', '/ru/blog/', '/ru/blog/documents-chui/',
  '/ru/about/', '/ru/florianopolis/', '/ru/privacy/'
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const issues = [];

  for (const url of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle0', timeout: 15000 });
      const name = url.replace(/^\/ru\/?/, '').replace(/\//g, '-').replace(/-$/, '') || 'home';
      const out = `/tmp/m-${name}.png`;
      await page.screenshot({ path: out, fullPage: true });

      const data = await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        const scrollW = html.scrollWidth;
        const clientW = html.clientWidth;
        const horizOverflow = scrollW - clientW;

        // Find all elements that overflow horizontally
        const wide = [];
        document.querySelectorAll('*').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > clientW + 1 && el !== html && el !== body) {
            const cls = (el.className && typeof el.className === 'string')
              ? '.' + el.className.split(' ').slice(0, 2).join('.')
              : '';
            const id = el.id ? '#' + el.id : '';
            wide.push(`${el.tagName.toLowerCase()}${id}${cls} (w=${Math.round(r.width)})`);
          }
        });

        // Check buttons/links for tap target size (44px min recommended)
        const smallTaps = [];
        document.querySelectorAll('a, button').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && (r.height < 36 || r.width < 36)) {
            const cls = (el.className && typeof el.className === 'string')
              ? '.' + el.className.split(' ').slice(0, 2).join('.')
              : '';
            smallTaps.push(`${el.tagName.toLowerCase()}${cls} (${Math.round(r.width)}×${Math.round(r.height)})`);
          }
        });

        // Header dimensions
        const header = document.querySelector('.site-header');
        const headerH = header ? header.offsetHeight : 0;
        const mainTop = document.querySelector('#main')?.getBoundingClientRect().top || 0;

        // Hero h1 readability
        const h1 = document.querySelector('h1');
        const h1Style = h1 ? {
          fontSize: parseFloat(getComputedStyle(h1).fontSize),
          width: h1.getBoundingClientRect().width,
        } : null;

        // FAQ details / forms / important sections
        const issues = [];
        document.querySelectorAll('.metric-strip').forEach((m) => {
          const r = m.getBoundingClientRect();
          if (r.width > clientW + 1) issues.push(`metric-strip wider than viewport (${Math.round(r.width)})`);
        });
        document.querySelectorAll('.compare-wrap').forEach((m) => {
          const inner = m.querySelector('table');
          if (inner) {
            const ir = inner.getBoundingClientRect();
            if (ir.width > m.clientWidth + 1) issues.push(`compare-table wider than wrap (${Math.round(ir.width)} vs ${Math.round(m.clientWidth)})`);
          }
        });

        return { scrollW, clientW, horizOverflow, wide: wide.slice(0, 8), smallTaps: smallTaps.slice(0, 8), headerH, mainTop, h1Style, issues };
      });

      if (data.horizOverflow > 1) {
        issues.push(`[${url}] horizontal overflow +${data.horizOverflow}px`);
        data.wide.forEach((w) => issues.push(`    - ${w}`));
      }
      if (data.headerH > 100) issues.push(`[${url}] header tall: ${data.headerH}px`);
      if (data.mainTop < data.headerH - 4 || data.mainTop > data.headerH + 16) {
        issues.push(`[${url}] main top mismatch: header=${data.headerH} mainTop=${Math.round(data.mainTop)} (body padding-top may be off)`);
      }
      if (data.h1Style && data.h1Style.fontSize > 50) issues.push(`[${url}] h1 huge on mobile: ${data.h1Style.fontSize}px`);
      data.issues.forEach((i) => issues.push(`[${url}] ${i}`));
      if (data.smallTaps.length) {
        issues.push(`[${url}] small tap targets: ${data.smallTaps.length}`);
        data.smallTaps.slice(0, 3).forEach((t) => issues.push(`    - ${t}`));
      }
    } catch (e) {
      issues.push(`[${url}] LOAD FAILED: ${e.message}`);
    }
    await page.close();
  }
  await browser.close();
  console.log('\n=== MOBILE ISSUES ===');
  if (!issues.length) console.log('  clean.');
  else issues.forEach((i) => console.log(i));
})();
