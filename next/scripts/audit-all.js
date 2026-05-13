// Systematic audit: snap each page across both languages of concern,
// extract hero h1/lead, count sections, flag empty hero, flag ES pages
// with EN content, write a JSON report + per-page screenshots.
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = 'http://localhost:8766/transferpages';
const LANGS = ['en', 'ru', 'pt', 'es'];

// Common pages across all languages
const PAGES = [
  '',                       // home
  'about/',
  'fleet/',
  'team/',
  'testimonials/',
  'contact/',
  'partners/',
  'portal/',
  'pricing/',
  'coverage/',
  'embed/',
  'track/',
  'compare/',
  'cases/',
  'glossary/',
  'blog/',
  'brazil-transfers/',
  'airport-transfer/',
  'international/',
  'balneario-camboriu/',
  'florianopolis/',
  'porto-alegre/',
  'curitiba/',
  'punta-del-este/',
  'routes/',
  'privacy/',
  'terms/',
  'cookies/',
];

// Common English words/phrases that should NOT appear on ES pages
const EN_LEAKS_ON_ES = [
  'Get in touch', 'Confirm a transfer', 'Get a quote', 'Confirm a trip',
  'At a glance', 'How we differ from taxi',
  "What's inside", 'Where we go', 'Where from and to',
  'Ready to plan', 'Reach the account', 'Get in touch',
  'private transfers across',
];

const report = { pages: [], summary: {} };

const checkPage = async (page, lang, slug) => {
  const url = `/${lang}/${slug}`;
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2', timeout: 15000 });
  } catch (err) {
    return { url, error: err.message };
  }
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const data = await page.evaluate(({ leaks }) => {
    const hero = document.querySelector('section.hero, section.post-hero');
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    const kicker = hero?.querySelector('.kicker, .post-category')?.textContent?.trim() || '';
    const lead = hero?.querySelector('.lead, p')?.textContent?.trim() || '';
    const sections = [...document.querySelectorAll('main section')].map(s => ({
      cls: s.className.slice(0, 40),
      h2: s.querySelector('h2')?.textContent?.trim()?.slice(0, 60) || '',
      kids: s.querySelectorAll('h3').length,
      h: Math.round(s.getBoundingClientRect().height),
    }));
    const bodyText = document.body.innerText;
    const leaksHit = leaks.filter(t => bodyText.includes(t));
    // Detect horizontal overflow
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 4;
    // Check broken images
    const imgs = [...document.images].filter(i => i.complete && i.naturalWidth === 0);
    return {
      h1, kicker, lead: lead.slice(0, 80),
      sections, leaksHit, overflow, brokenImgs: imgs.length,
      mainHeight: Math.round(document.querySelector('main')?.getBoundingClientRect().height || 0),
    };
  }, { leaks: EN_LEAKS_ON_ES });
  return { url, ...data };
};

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
  });

  // Snap all langs and pages
  for (const lang of LANGS) {
    for (const slug of PAGES) {
      const result = await checkPage(page, lang, slug);
      report.pages.push(result);
      // Print compact line
      const empty = !result.h1 ? '⚠ NO H1' : '';
      const leaks = (result.leaksHit && lang === 'es' && result.leaksHit.length) ? ` ⚠ ${result.leaksHit.length} EN-leaks` : '';
      const overflow = result.overflow ? ' ⚠ overflow' : '';
      const broken = result.brokenImgs ? ` ⚠ ${result.brokenImgs} broken img` : '';
      console.log(`${lang}/${slug || 'index'}: "${(result.h1 || '').slice(0, 40)}"  sec=${result.sections?.length} h=${result.mainHeight}px${empty}${leaks}${overflow}${broken}`);
    }
  }

  // Save a few full-page screenshots for the most concerning pages
  const flagged = report.pages.filter(p => !p.h1 || (p.leaksHit && p.leaksHit.length) || p.overflow || p.brokenImgs);
  console.log(`\n=== FLAGGED: ${flagged.length} pages ===`);
  for (const p of flagged.slice(0, 12)) {
    console.log(`  ${p.url} — leaks=${(p.leaksHit||[]).join(', ').slice(0,80) || '-'} | overflow=${p.overflow} | broken=${p.brokenImgs}`);
  }

  fs.writeFileSync('/tmp/audit-report.json', JSON.stringify(report, null, 2));
  console.log(`\nFull report: /tmp/audit-report.json`);
  await browser.close();
})();
