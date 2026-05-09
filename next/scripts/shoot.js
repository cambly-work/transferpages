const puppeteer = require("puppeteer");

const URL = process.env.URL || "http://localhost:8080/en/";
const OUT = process.env.OUT || "/tmp/morrison-shots/pup.png";
const WIDTH = parseInt(process.env.W || "390", 10);
const HEIGHT = parseInt(process.env.H || "3500", 10);
const MOBILE = process.env.MOBILE !== "0";
const FULL = process.env.FULL !== "0"; // FULL=0 for viewport-only
const CLIP_Y = process.env.CLIP_Y ? parseInt(process.env.CLIP_Y, 10) : null;
const CLIP_H = process.env.CLIP_H ? parseInt(process.env.CLIP_H, 10) : null;

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    isMobile: MOBILE,
    hasTouch: MOBILE,
  });
  await page.goto(URL, { waitUntil: "networkidle0", timeout: 20000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 350)));
  const dims = await page.evaluate(() => ({
    inner: window.innerWidth,
    docW: document.documentElement.scrollWidth,
    docH: document.documentElement.scrollHeight,
    bodyW: document.body.scrollWidth,
    overflow: [...document.querySelectorAll("*")]
      .filter((el) => el.offsetWidth > document.documentElement.clientWidth + 1)
      .slice(0, 8)
      .map((el) => `${el.tagName}.${el.className} (${el.offsetWidth}px)`),
  }));
  console.log(JSON.stringify(dims, null, 2));
  const opts = { path: OUT };
  if (CLIP_Y !== null) {
    opts.clip = { x: 0, y: CLIP_Y, width: WIDTH, height: CLIP_H || HEIGHT };
  } else {
    opts.fullPage = FULL;
  }
  await page.screenshot(opts);
  await browser.close();
})();
