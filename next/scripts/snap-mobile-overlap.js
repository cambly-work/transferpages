const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
  });
  await page.goto(`${BASE}/en/`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));
  // Scroll to top first
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 300));
  // Scroll a bit so back-to-top appears (it shows after y > BACK_AT)
  await page.evaluate(() => window.scrollTo(0, 800));
  await new Promise((r) => setTimeout(r, 600));
  // Snap viewport (not full page) — we want to see fixed elements
  await page.screenshot({ path: '/tmp/mob-overlap-1.png', fullPage: false });
  console.log('saved /tmp/mob-overlap-1.png');

  // Now also open chat to see the widget panel placement
  await page.click('[data-chat-toggle]');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: '/tmp/mob-overlap-2-chatopen.png', fullPage: false });
  console.log('saved /tmp/mob-overlap-2-chatopen.png');

  // Report positions
  const info = await page.evaluate(() => {
    const get = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        sel,
        bottom: Math.round(r.bottom),
        right: Math.round(r.right),
        top: Math.round(r.top),
        left: Math.round(r.left),
        w: Math.round(r.width),
        h: Math.round(r.height),
        z: cs.zIndex,
        position: cs.position,
        visible: cs.visibility,
        display: cs.display,
      };
    };
    return {
      chatToggle: get('.chat-widget-toggle'),
      chatPanel: get('.chat-widget-panel'),
      backToTop: get('.back-to-top'),
      stickyCta: get('.mobile-sticky-cta'),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      ctaHeight: getComputedStyle(document.documentElement).getPropertyValue('--mobile-cta-height'),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
