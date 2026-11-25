// Install Playwright and its Chromium browser, then: node tools/render_social_cover.cjs
// PLAYWRIGHT_MODULE can point to an existing Playwright installation.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(__dirname, 'social-cover.html')).href);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.decode()));
    });
    const layout = await page.evaluate(() => {
      const bounds = [...document.querySelectorAll('header, figure, footer, h1, .subtitle, .idea')].map(e => {
        const r = e.getBoundingClientRect();
        return { tag: e.tagName, x: r.x, y: r.y, right: r.right, bottom: r.bottom };
      });
      return { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, bounds };
    });
    if (layout.width !== 1200 || layout.height !== 630 || layout.bounds.some(r => r.x < 0 || r.y < 0 || r.right > 1200 || r.bottom > 630)) {
      throw new Error('Cover content exceeds canvas: ' + JSON.stringify(layout));
    }
    const output = path.resolve(__dirname, '../docs/assets/images/social-cover-v1.png');
    await page.screenshot({ path: output, type: 'png' });
    console.log(JSON.stringify({ output, width: 1200, height: 630, bytes: fs.statSync(output).size, layout }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
