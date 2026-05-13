// Comprehensive bug audit: console errors, network 4xx/5xx, broken images,
// horizontal overflow, overlapping fixed elements — desktop + mobile, 4 langs.
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = 'http://localhost:8766/transferpages';
const LANGS = ['en', 'ru', 'pt', 'es'];

// Pages that should exist in every locale
const PAGES = [
  '',
  'about/',
  'fleet/',
  'team/',
  'testimonials/',
  'contact/',
  'partners/',
  'pricing/',
  'coverage/',
  'cases/',
  'blog/',
  'brazil-transfers/',
  'airport-transfer/',
  'international/',
  'hourly/',
  'events/',
  'guarantees/',
  'drivers/',
  'balneario-camboriu/',
  'florianopolis/',
  'porto-alegre/',
  'curitiba/',
  'punta-del-este/',
  'routes/',
  'glossary/',
  'embed/',
  'track/',
  'compare/',
  'privacy/',
  'terms/',
  'cookies/',
];

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const report = { runs: [], totals: { errors: 0, networkFails: 0, brokenImages: 0, overflow: 0, overlaps: 0 } };

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });

  for (const vp of VIEWPORTS) {
    for (const lang of LANGS) {
      for (const slug of PAGES) {
        const url = `${BASE}/${lang}/${slug}`;
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
        await page.evaluateOnNewDocument(() => {
          try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
        });

        const consoleErrors = [];
        const networkFails = [];
        page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
        });
        page.on('requestfailed', (req) => {
          const f = req.failure();
          networkFails.push(`${req.url()} :: ${f && f.errorText}`);
        });
        page.on('response', (res) => {
          if (res.status() >= 400) networkFails.push(`${res.status()} ${res.url()}`);
        });

        let status = 0;
        try {
          const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
          status = resp ? resp.status() : 0;
        } catch (e) {
          consoleErrors.push(`nav error: ${e.message}`);
        }

        if (status === 404) {
          report.runs.push({ vp: vp.name, lang, slug, status, errors: consoleErrors, networkFails, brokenImages: [], overflowX: null, overlaps: [], skip: true });
          await page.close();
          continue;
        }

        // Wait for any deferred bootstrapping
        await new Promise((r) => setTimeout(r, 500));

        // Detect broken images
        const brokenImages = await page.$$eval('img', (imgs) => imgs
          .filter((img) => img.complete && img.naturalWidth === 0 && img.getAttribute('src'))
          .map((img) => img.src));

        // Horizontal overflow on body
        const overflowX = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
          const clientW = doc.clientWidth;
          return scrollW - clientW;
        });

        // For mobile, also check overlap between sticky-CTA / chat / back-to-top
        let overlaps = [];
        if (vp.isMobile) {
          // Scroll a bit so back-to-top can appear
          await page.evaluate(() => window.scrollTo(0, 1500));
          await new Promise((r) => setTimeout(r, 300));
          overlaps = await page.evaluate(() => {
            const sels = ['.mobile-sticky-cta', '.chat-widget', '.back-to-top'];
            const rects = sels.map((s) => {
              const el = document.querySelector(s);
              if (!el) return null;
              const cs = getComputedStyle(el);
              if (cs.display === 'none' || cs.visibility === 'hidden') return null;
              const r = el.getBoundingClientRect();
              return { sel: s, top: r.top, left: r.left, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
            }).filter(Boolean);
            const out = [];
            for (let i = 0; i < rects.length; i++) {
              for (let j = i + 1; j < rects.length; j++) {
                const a = rects[i]; const b = rects[j];
                const overlap = !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
                if (overlap) out.push(`${a.sel} overlaps ${b.sel}`);
              }
            }
            return out;
          });
        }

        const entry = {
          vp: vp.name, lang, slug, status,
          errors: consoleErrors,
          networkFails,
          brokenImages,
          overflowX,
          overlaps,
        };
        report.runs.push(entry);

        if (consoleErrors.length) report.totals.errors += consoleErrors.length;
        if (networkFails.length) report.totals.networkFails += networkFails.length;
        if (brokenImages.length) report.totals.brokenImages += brokenImages.length;
        if (overflowX > 1) report.totals.overflow += 1;
        if (overlaps.length) report.totals.overlaps += overlaps.length;

        await page.close();
      }
    }
  }

  await browser.close();
  fs.writeFileSync('/tmp/bug-audit.json', JSON.stringify(report, null, 2));

  // Print summary
  const fails = report.runs.filter((r) =>
    (r.status && r.status >= 400) ||
    r.errors.length > 0 ||
    r.networkFails.length > 0 ||
    r.brokenImages.length > 0 ||
    (r.overflowX || 0) > 1 ||
    r.overlaps.length > 0
  );
  console.log(`Total runs: ${report.runs.length}, failing runs: ${fails.length}`);
  console.log(`Errors: ${report.totals.errors}, network: ${report.totals.networkFails}, broken-img: ${report.totals.brokenImages}, overflow: ${report.totals.overflow}, overlaps: ${report.totals.overlaps}`);
  for (const f of fails.slice(0, 200)) {
    console.log(`\n[${f.vp}] /${f.lang}/${f.slug} status=${f.status} overflowX=${f.overflowX}`);
    if (f.errors.length) console.log('  errors:', f.errors.slice(0, 3));
    if (f.networkFails.length) console.log('  network:', f.networkFails.slice(0, 5));
    if (f.brokenImages.length) console.log('  broken-img:', f.brokenImages.slice(0, 3));
    if (f.overlaps.length) console.log('  overlaps:', f.overlaps);
  }
})();
