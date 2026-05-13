// Detailed about-page snapshot: each language, both themes, desktop + mobile.
// Suppress cookie banner so it doesn't overlap content.
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';
const LANGS = ['en', 'ru', 'pt', 'es'];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const lang of LANGS) {
    for (const theme of ['light', 'dark']) {
      for (const vp of [
        { name: 'desktop', w: 1280, h: 900 },
        { name: 'mobile', w: 390, h: 844 },
      ]) {
        const page = await browser.newPage();
        await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1, isMobile: vp.name === 'mobile', hasTouch: vp.name === 'mobile' });
        await page.evaluateOnNewDocument((th) => {
          try {
            localStorage.setItem('preferredTheme', th);
            // dismiss cookie banner
            localStorage.setItem('cookie_consent', 'essential');
          } catch (e) {}
        }, theme);
        try {
          await page.goto(`${BASE}/${lang}/about/`, { waitUntil: 'networkidle2', timeout: 15000 });
        } catch (err) {
          console.warn(`nav fail ${lang} ${theme} ${vp.name}: ${err.message}`);
          await page.close();
          continue;
        }
        // Trigger reveal: scroll through whole page slowly
        await page.evaluate(async () => {
          await new Promise((r) => {
            let y = 0;
            const step = () => {
              y += 300;
              window.scrollTo(0, y);
              if (y < document.body.scrollHeight + 300) requestAnimationFrame(step);
              else { window.scrollTo(0, 0); setTimeout(r, 500); }
            };
            step();
          });
        });
        await new Promise((r) => setTimeout(r, 400));
        const out = `/tmp/about-${lang}-${theme}-${vp.name}.png`;
        await page.screenshot({ path: out, fullPage: true });
        const probes = await page.evaluate(() => {
          const out = {};
          const sections = [...document.querySelectorAll('section')].map((s, i) => ({
            i,
            cls: s.className,
            h2: s.querySelector('h2')?.textContent?.trim()?.slice(0, 60),
            h3Count: s.querySelectorAll('h3').length,
            h: Math.round(s.getBoundingClientRect().height),
          }));
          out.sections = sections;
          out.heroH1 = document.querySelector('.hero h1')?.textContent?.trim();
          out.heroKicker = document.querySelector('.hero .kicker')?.textContent?.trim();
          out.heroLead = document.querySelector('.hero .lead')?.textContent?.trim();
          // Check facts-dl item count vs grid layout
          const dl = document.querySelector('.facts-dl');
          if (dl) {
            out.factsDl = { items: dl.querySelectorAll('div').length, w: dl.offsetWidth };
          }
          // Check value-grid
          const vg = document.querySelector('.value-grid');
          if (vg) {
            out.valueGrid = { kids: vg.children.length, w: vg.offsetWidth };
          }
          return out;
        });
        console.log(`${lang} ${theme} ${vp.name}:\n  hero kicker="${probes.heroKicker}"\n  hero h1="${probes.heroH1}"\n  hero lead="${probes.heroLead?.slice(0,60)}"\n  sections: ${probes.sections.length}`);
        for (const s of probes.sections) console.log(`    [${s.i}] ${s.cls.slice(0,30)} h2="${s.h2 || ''}" h3#${s.h3Count} h=${s.h}`);
        if (probes.factsDl) console.log(`  facts-dl: ${probes.factsDl.items} items @ ${probes.factsDl.w}px`);
        if (probes.valueGrid) console.log(`  value-grid: ${probes.valueGrid.kids} kids @ ${probes.valueGrid.w}px`);
        console.log(`  saved ${out}`);
        await page.close();
      }
    }
  }
  await browser.close();
})();
