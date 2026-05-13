// Snap the new pages added in sprint 5 (about/portal/curitiba/punta) at desktop + mobile,
// both light and dark themes. Reports computed background colors so we can spot any var()
// resolution failures that leave cards transparent or text invisible.
const puppeteer = require('puppeteer');

const BASE = 'http://localhost:8766/transferpages';
const TARGETS = [
  { url: '/en/about/', file: 'about' },
  { url: '/en/portal/', file: 'portal' },
  { url: '/en/curitiba/', file: 'curitiba' },
  { url: '/en/punta-del-este/', file: 'punta-del-este' },
  { url: '/ru/about/', file: 'about-ru' },
  { url: '/ru/portal/', file: 'portal-ru' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const t of TARGETS) {
    for (const theme of ['light', 'dark']) {
      for (const vp of [
        { name: 'desktop', w: 1280, h: 900, m: false },
        { name: 'mobile', w: 390, h: 844, m: true },
      ]) {
        const page = await browser.newPage();
        await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.m, hasTouch: vp.m });
        // pre-set theme via localStorage before nav
        await page.evaluateOnNewDocument((th) => {
          try { localStorage.setItem('preferredTheme', th); } catch (e) {}
        }, theme);
        try {
          await page.goto(`${BASE}${t.url}`, { waitUntil: 'networkidle2', timeout: 15000 });
        } catch (err) {
          console.warn(`failed nav ${t.url}: ${err.message}`);
          await page.close();
          continue;
        }
        // Wait for fonts to settle so the layout is final
        await page.evaluate(() => document.fonts && document.fonts.ready);
        const out = `/tmp/sp5-${t.file}-${theme}-${vp.name}.png`;
        await page.screenshot({ path: out, fullPage: true });
        const probes = await page.evaluate(() => {
          const get = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return {
              bg: cs.backgroundColor,
              color: cs.color,
              border: cs.borderColor,
              w: Math.round(r.width), h: Math.round(r.height),
            };
          };
          return {
            credentialCard: get('.credential-card'),
            credentialBadge: get('.credential-badge'),
            howItem: get('.how-item'),
            teamStats: get('.team-stats'),
            portalLoginCard: get('.portal-login-card'),
            portalTimeline: get('.portal-timeline li.is-current'),
            statusDot: get('.status-dot--amber'),
            badge: get('.badge-soft'),
          };
        });
        console.log(`${t.file} ${theme} ${vp.name}:`, JSON.stringify(probes));
        console.log(`saved ${out}`);
        await page.close();
      }
    }
  }
  await browser.close();
})();
