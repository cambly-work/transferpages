const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const theme of ['light', 'dark']) {
    for (const lang of ['en', 'ru', 'pt', 'es']) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.evaluateOnNewDocument((t) => {
        try { localStorage.setItem('preferredTheme', t); } catch(e){}
      }, theme);
      await page.goto(`http://localhost:8766/transferpages/${lang}/`, { waitUntil: 'networkidle2' });
      const h1 = await page.evaluate(() => {
        const el = document.querySelector('h1');
        return el ? el.textContent.trim().slice(0, 80) : null;
      });
      console.log(`${lang} ${theme}: h1="${h1}"`);
      await page.close();
    }
  }
  await browser.close();
})();
