const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:8766/transferpages/en/curitiba/', { waitUntil: 'networkidle2' });
  
  // Check the bento section state
  const info = await page.evaluate(() => {
    const bento = document.querySelector('.bento.reveal-stagger');
    if (!bento) return { found: false };
    const cells = bento.querySelectorAll('.bento-cell');
    const firstCell = cells[0];
    const cs = getComputedStyle(firstCell);
    const rect = firstCell.getBoundingClientRect();
    return {
      found: true,
      bentoIsVisible: bento.classList.contains('is-visible'),
      bentoClasses: bento.className,
      firstCellOpacity: cs.opacity,
      firstCellTransform: cs.transform,
      firstCellTop: rect.top,
      cellCount: cells.length,
      scrollY: window.scrollY,
      scrollHeight: document.body.scrollHeight,
    };
  });
  console.log('Initial:', JSON.stringify(info));
  
  // Scroll into bento section
  await page.evaluate(() => {
    const bento = document.querySelector('.bento.reveal-stagger');
    if (bento) bento.scrollIntoView({ block: 'center' });
  });
  await new Promise(r => setTimeout(r, 1500));
  
  const after = await page.evaluate(() => {
    const bento = document.querySelector('.bento.reveal-stagger');
    const firstCell = bento?.querySelector('.bento-cell');
    if (!firstCell) return null;
    const cs = getComputedStyle(firstCell);
    return {
      bentoIsVisible: bento.classList.contains('is-visible'),
      bentoClasses: bento.className,
      firstCellOpacity: cs.opacity,
      firstCellTransform: cs.transform,
    };
  });
  console.log('After scroll:', JSON.stringify(after));
  
  await browser.close();
})();
