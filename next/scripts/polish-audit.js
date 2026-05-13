// Polish audit: snap home + 4 key non-home pages across langs/themes/viewports.
// Inspect: section count, hero copy, CTA text consistency, mobile overflow,
// reveal-stagger visibility, capability icon presence, link targets.
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = 'http://localhost:8766/transferpages';
const LANGS = ['en', 'ru', 'pt', 'es'];
const PAGES_FULL = ['', 'contact/', 'fleet/', 'partners/', 'about/'];
const REPORT = { home: {}, other: {} };

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });

  // Full-page snaps for home in each lang × theme (desktop + mobile)
  for (const lang of LANGS) {
    REPORT.home[lang] = {};
    for (const theme of ['light', 'dark']) {
      for (const vp of [
        { name: 'desktop', w: 1280, h: 900, m: false },
        { name: 'mobile', w: 390, h: 844, m: true },
      ]) {
        const page = await browser.newPage();
        await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.m, hasTouch: vp.m });
        await page.evaluateOnNewDocument((th) => {
          try {
            localStorage.setItem('preferredTheme', th);
            localStorage.setItem('cookie_consent', 'essential');
          } catch (e) {}
        }, theme);
        try {
          await page.goto(`${BASE}/${lang}/`, { waitUntil: 'networkidle2', timeout: 18000 });
        } catch (err) {
          console.warn(`${lang} ${theme} ${vp.name}: ${err.message}`);
          await page.close();
          continue;
        }
        // Scroll + wait for safety-net
        await page.evaluate(async () => {
          await new Promise((r) => {
            let y = 0;
            const step = () => {
              y += 500;
              window.scrollTo(0, y);
              if (y < document.body.scrollHeight + 400) requestAnimationFrame(step);
              else { window.scrollTo(0, 0); setTimeout(r, 400); }
            };
            step();
          });
        });
        await new Promise((r) => setTimeout(r, 2000));
        const info = await page.evaluate(() => {
          const sections = [...document.querySelectorAll('main > section, main > div > section')].map((s, i) => ({
            i,
            cls: s.className.slice(0, 50),
            h2: s.querySelector('h2')?.textContent?.trim()?.slice(0, 60) || '',
            height: Math.round(s.getBoundingClientRect().height),
          }));
          const ctas = [...document.querySelectorAll('.hero-actions .btn, .cta-strip-actions .btn, .vip-copy .btn')].map(b => b.textContent.trim());
          const overflow = document.documentElement.scrollWidth > window.innerWidth + 2;
          const totalHeight = Math.round(document.querySelector('main')?.offsetHeight || 0);
          const stickyCta = document.querySelector('.mobile-sticky-cta');
          const stickyHeight = stickyCta ? stickyCta.offsetHeight : 0;
          return { sectionCount: sections.length, sections, ctas, overflow, totalHeight, stickyHeight };
        });
        REPORT.home[lang][`${theme}-${vp.name}`] = info;
        const out = `/tmp/polish-home-${lang}-${theme}-${vp.name}.png`;
        await page.screenshot({ path: out, fullPage: true });
        await page.close();
      }
    }
  }

  // Compact info-only for other key pages, just to verify CTA consistency
  for (const lang of LANGS) {
    REPORT.other[lang] = {};
    for (const slug of PAGES_FULL.slice(1)) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.evaluateOnNewDocument(() => {
        try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
      });
      try {
        await page.goto(`${BASE}/${lang}/${slug}`, { waitUntil: 'networkidle2', timeout: 15000 });
      } catch (e) { await page.close(); continue; }
      const info = await page.evaluate(() => ({
        h1: document.querySelector('h1')?.textContent?.trim()?.slice(0, 80),
        heroCtas: [...document.querySelectorAll('.hero-actions .btn, .cta-strip-actions .btn')].map(b => b.textContent.trim()),
      }));
      REPORT.other[lang][slug] = info;
      await page.close();
    }
  }

  fs.writeFileSync('/tmp/polish-report.json', JSON.stringify(REPORT, null, 2));
  console.log('\n=== HOME (desktop light, EN) ===');
  console.log(`sections: ${REPORT.home.en['light-desktop']?.sectionCount}, total h: ${REPORT.home.en['light-desktop']?.totalHeight}px`);
  for (const s of REPORT.home.en['light-desktop']?.sections || []) {
    console.log(`  [${s.i}] ${s.h2 || '(no h2)'} — ${s.height}px ${s.cls}`);
  }
  console.log(`\n=== HOME CTA labels by lang ===`);
  for (const lang of LANGS) {
    console.log(`${lang}: ${(REPORT.home[lang]?.['light-desktop']?.ctas || []).join(' | ')}`);
  }
  console.log(`\n=== OTHER pages CTAs ===`);
  for (const lang of LANGS) {
    for (const slug of Object.keys(REPORT.other[lang] || {})) {
      console.log(`${lang}/${slug} → ${REPORT.other[lang][slug].heroCtas?.join(' | ')}`);
    }
  }
  console.log(`\n=== Mobile overflow ===`);
  for (const lang of LANGS) {
    for (const k of ['light-mobile', 'dark-mobile']) {
      if (REPORT.home[lang]?.[k]?.overflow) console.log(`${lang} ${k}: OVERFLOW`);
    }
  }
  console.log(`\nFull JSON: /tmp/polish-report.json`);
  await browser.close();
})();
