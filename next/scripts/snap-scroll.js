// Quick visual check with scrolling so IntersectionObserver fires before screenshot.
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';
const TARGETS = ['/en/curitiba/', '/en/florianopolis/', '/en/punta-del-este/'];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const url of TARGETS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2', timeout: 15000 });
    // Scroll to bottom and back to trigger IO
    await page.evaluate(async () => {
      await new Promise(r => {
        let y = 0;
        const step = () => {
          y += 400;
          window.scrollTo(0, y);
          if (y < document.body.scrollHeight) requestAnimationFrame(step);
          else { window.scrollTo(0, 0); setTimeout(r, 500); }
        };
        step();
      });
    });
    await new Promise(r => setTimeout(r, 400));
    const file = url.replace(/\//g, '-').replace(/^-|-$/g, '');
    await page.screenshot({ path: `/tmp/scroll-${file}.png`, fullPage: true });
    console.log(`saved /tmp/scroll-${file}.png`);
    await page.close();
  }
  await browser.close();
})();
