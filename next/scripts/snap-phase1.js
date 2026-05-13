const puppeteer = require('puppeteer');
const BASE = 'http://localhost:8766/transferpages';
const TARGETS = [
  '/en/hourly/', '/en/events/', '/en/guarantees/', '/en/drivers/',
  '/ru/hourly/', '/ru/events/', '/ru/guarantees/', '/ru/drivers/',
  '/en/fleet/',  // tier chips
];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const url of TARGETS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument(() => {
      try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
    });
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 2200));
    const file = url.replace(/^\/|\/$/g, '').replace(/\//g, '-');
    await page.screenshot({ path: `/tmp/p1-${file}.png`, fullPage: true });
    console.log(`saved /tmp/p1-${file}.png`);
    await page.close();
  }

  // Snap chat widget open
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
  });
  await page.goto(`${BASE}/en/`, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));
  await page.click('[data-chat-toggle]');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: '/tmp/p1-chat-open.png', fullPage: false });
  console.log('saved /tmp/p1-chat-open.png');
  await page.close();
  await browser.close();
})();
