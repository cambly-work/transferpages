// Visual smoke screenshots for critical pages on desktop + mobile.
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';

const TARGETS = [
  { lang: 'en', slug: '', label: 'home' },
  { lang: 'ru', slug: '', label: 'home' },
  { lang: 'en', slug: 'pricing/', label: 'pricing' },
  { lang: 'en', slug: 'fleet/', label: 'fleet' },
  { lang: 'en', slug: 'about/', label: 'about' },
  { lang: 'en', slug: 'hourly/', label: 'hourly' },
  { lang: 'en', slug: 'guarantees/', label: 'guarantees' },
  { lang: 'en', slug: 'events/', label: 'events' },
  { lang: 'en', slug: 'drivers/', label: 'drivers' },
  { lang: 'ru', slug: 'contact/', label: 'contact' },
];
const VPS = [
  { name: 'desktop', width: 1280, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const vp of VPS) {
    for (const t of TARGETS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
      await page.evaluateOnNewDocument(() => {
        try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
      });
      try {
        await page.goto(`${BASE}/${t.lang}/${t.slug}`, { waitUntil: 'networkidle2', timeout: 15000 });
        await new Promise((r) => setTimeout(r, 600));
        // Full page screenshot — capture entire page so we can review layout
        const path = `/tmp/visual-${vp.name}-${t.lang}-${t.label}.png`;
        await page.screenshot({ path, fullPage: true });
        console.log('saved', path);
      } catch (e) {
        console.log('FAIL', vp.name, t.lang, t.label, e.message);
      }
      await page.close();
    }
  }
  await browser.close();
})();
