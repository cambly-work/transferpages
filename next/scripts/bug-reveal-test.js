// Verify whether the dark sections are actually empty or just .reveal-stagger
// gated behind IntersectionObserver that fullPage screenshots miss.
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
  });
  await page.goto('http://localhost:8766/transferpages/en/', { waitUntil: 'networkidle2' });

  // Scroll slowly through the page to trigger IntersectionObserver
  await page.evaluate(async () => {
    const step = 600;
    const max = document.documentElement.scrollHeight;
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 600));

  // Now check class state and computed visibility of those sections
  const info = await page.evaluate(() => {
    const probe = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        sel,
        opacity: cs.opacity,
        visibility: cs.visibility,
        display: cs.display,
        hasIsVisible: el.classList.contains('is-visible'),
        childCount: el.children.length,
      };
    };
    return {
      capabilityGrid: probe('.capability-grid'),
      geoNetwork: probe('.geo-network'),
      processTimeline: probe('.process-timeline'),
      revealItems: [...document.querySelectorAll('.reveal, .reveal-up, .reveal-stagger')].map((el) => ({
        cls: el.className.split(/\s+/).filter(c => c.startsWith('reveal') || c === 'is-visible'),
        opacity: getComputedStyle(el).opacity,
      })).slice(0, 12),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  await page.screenshot({ path: '/tmp/visual-desktop-en-home-scrolled.png', fullPage: true });
  console.log('saved /tmp/visual-desktop-en-home-scrolled.png');
  await browser.close();
})();
