const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('cookie_consent', 'essential'); } catch (e) {}
  });
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  await page.goto('http://localhost:8766/transferpages/en/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 500));
  const state = await page.evaluate(() => {
    const panel = document.querySelector('.chat-widget-panel');
    const toggle = document.querySelector('.chat-widget-toggle');
    return {
      panelHidden: panel?.hidden,
      panelHasHiddenAttr: panel?.hasAttribute('hidden'),
      panelComputedDisplay: getComputedStyle(panel).display,
      panelComputedVisibility: getComputedStyle(panel).visibility,
      toggleAriaExpanded: toggle?.getAttribute('aria-expanded'),
      widgetClassList: document.querySelector('.chat-widget')?.className,
    };
  });
  console.log(JSON.stringify(state, null, 2));
  await browser.close();
})();
