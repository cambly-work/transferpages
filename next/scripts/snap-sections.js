// Crop the new sections at viewport size to see them clearly.
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = 'http://localhost:8766/transferpages';
const sections = [
  { sel: '.how-it-works', name: 'process' },
  { sel: '.capabilities-section', name: 'capabilities' },
  { sel: '.vip-section', name: 'vip' },
  { sel: '.geo-network-section', name: 'geonetwork' },
  { sel: '.typical-journeys-section', name: 'journeys' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const lang of ['en', 'ru']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
    });
    await page.goto(`${BASE}/${lang}/`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2200));
    for (const s of sections) {
      const handle = await page.$(s.sel);
      if (!handle) { console.warn(`${lang} missing ${s.sel}`); continue; }
      const out = `/tmp/section-${lang}-${s.name}.png`;
      await handle.screenshot({ path: out });
      console.log(`saved ${out}`);
    }
    await page.close();
  }
  await browser.close();
})();
