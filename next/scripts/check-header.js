const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:8766/transferpages/en/', { waitUntil: 'networkidle2' });
  const info = await page.evaluate(() => {
    const h = document.querySelector('.capabilities-section .section-head');
    if (!h) return null;
    const k = h.querySelector('.kicker');
    const h2 = h.querySelector('h2');
    return {
      header: { display: getComputedStyle(h).display, flex: getComputedStyle(h).flexDirection, w: h.offsetWidth, h: h.offsetHeight, textAlign: getComputedStyle(h).textAlign },
      kicker: { display: getComputedStyle(k).display, top: k.getBoundingClientRect().top, left: k.getBoundingClientRect().left, width: k.offsetWidth },
      h2: { display: getComputedStyle(h2).display, top: h2.getBoundingClientRect().top, left: h2.getBoundingClientRect().left, width: h2.offsetWidth },
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
