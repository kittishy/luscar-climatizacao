/**
 * Validation screenshots.
 *
 *   node scripts/capture.mjs
 *
 * Captures the matrix required by 05-ACEITE-E-ENTREGA.md from the REAL build
 * running in Chromium, with fonts and images loaded. Files land in
 * screenshots/<family>/<viewport>/<route>[-state].png and are named so the
 * evidence identifies route, viewport and state.
 *
 * This is browser EMULATION at a viewport size, not a physical-device test.
 * No claim of real-hardware behaviour is made.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const outDir = join(root, 'screenshots');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
};

const slug = (r) => (r === '/' ? 'home' : r.replace(/^\/|\/$/g, '').replace(/\//g, '_'));

/** Family -> viewports. Mirrors the acceptance matrix exactly. */
const MATRIX = {
  desktop: [
    { w: 1440, h: 900, full: true },
    { w: 1366, h: 768, full: false },
    { w: 1920, h: 1080, full: false },
  ],
  tablet: [
    { w: 768, h: 1024, full: true },
    { w: 1024, h: 768, full: false },
  ],
  mobile: [
    { w: 390, h: 844, full: true },
    { w: 844, h: 390, full: false },
  ],
};

/** Full-page captures for the representative pages of each distinct composition. */
const DEEP_ROUTES = [
  '/',
  '/servicos-de-climatizacao-ar-condicionado-joinville/',
  '/instalacao-ar-condicionado-joinville/',
  '/instalacao-ar-condicionado-predio-apartamento-alpinismo-joinville/',
  '/projects/',
  '/about/',
  '/contact/',
  '/guias/ar-condicionado-nao-gela/',
  '/encanador-tubulacao-flexivel-pex-e-epex-joinville/',
];

const ALL_ROUTES = [
  '/',
  '/servicos-de-climatizacao-ar-condicionado-joinville/',
  '/instalacao-ar-condicionado-joinville/',
  '/instalacao-de-ar-condicionado-predios-joinville/',
  '/instalacao-ar-condicionado-predio-apartamento-alpinismo-joinville/',
  '/concertos-e-manutencao-ar-condicionado-joinville/',
  '/limpeza-ar-condicionado-joinville/',
  '/encanador-tubulacao-flexivel-pex-e-epex-joinville/',
  '/about/',
  '/projects/',
  '/contact/',
  '/guias/instalacao-ar-condicionado-apartamento/',
  '/guias/ar-condicionado-nao-gela/',
];

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      let file = join(dist, decodeURIComponent(url.pathname));
      if (existsSync(file) && (await stat(file)).isDirectory()) file = join(file, 'index.html');
      if (!existsSync(file)) {
        const nf = join(dist, '404.html');
        if (existsSync(nf)) {
          res.writeHead(404, { 'content-type': MIME['.html'] });
          res.end(await readFile(nf));
          return;
        }
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function settle(page) {
  // Wait for fonts, then for every image to finish decoding. A screenshot of
  // a half-loaded page is not evidence of anything.
  await page.evaluate(() => document.fonts.ready);
  /*
   * Settle rule.
   *
   * `complete` alone is not sufficient and must NOT be used as-is:
   *  - a lazy image below the fold never begins loading, so it reports
   *    complete:false forever;
   *  - a full-page screenshot resizes the viewport, which is precisely when
   *    those lazy images enter the loading range and start fetching.
   *
   * So: eager/above-the-fold images must fully decode, lazy images below the
   * fold are scrolled into view and then must decode, and the dialog's empty
   * placeholder <img> is ignored because it never resolves.
   */
  /*
   * Force every image to eager before waiting.
   *
   * Relies on `loading="lazy"` is unreliable for evidence capture: a lazy
   * image far below the fold may never begin loading during a scripted
   * scroll, and a full-page screenshot then records a blank photograph. This
   * changes nothing in the shipped build - it only affects the capture
   * session - and guarantees the evidence shows the real pixels.
   */
  await page.evaluate(() => {
    for (const img of document.images) {
      if (!(img.currentSrc || img.src)) continue;
      img.loading = 'eager';
    }
  });

  // Scroll the whole document so every lazy image enters the viewport.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    const height = document.body.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });

  await page
    .waitForFunction(
      () =>
        Array.from(document.images)
          .filter((i) => (i.currentSrc || i.src) !== '')
          .every((i) => i.complete && i.naturalWidth > 0),
      null,
      { timeout: 20000 },
    )
    .catch(async () => {
      // Fall back to reporting exactly which image stalled, rather than
      // silently capturing a half-loaded page.
      const stalled = await page.evaluate(() =>
        Array.from(document.images)
          .filter((i) => (i.currentSrc || i.src) !== '' && !(i.complete && i.naturalWidth > 0))
          .map((i) => (i.currentSrc || i.src).split('/').pop()),
      );
      throw new Error(`images did not settle: ${stalled.join(', ')}`);
    });

  await page.waitForTimeout(200);
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('No build. Run `npm run build` first.');
    process.exit(1);
  }
  /*
 * Only the generated trees are cleared.
 *
 * `rm -rf screenshots/` used to run here, which silently deleted
 * `screenshots/live/` — the hand-curated before-captures of the deployed site
 * that the comparison relies on. Each generated directory is emptied on its own
 * so anything a human put in `screenshots/` survives a re-capture.
 */
for (const dir of ['desktop', 'tablet', 'mobile', 'routes', 'states', 'check']) {
  await rm(join(outDir, dir), { recursive: true, force: true });
}

  const { server, port } = await serve();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  let count = 0;

  try {
    // ---- Matrix captures -------------------------------------------------
    for (const [family, sizes] of Object.entries(MATRIX)) {
      for (const { w, h, full } of sizes) {
        const dir = join(outDir, family, `${w}x${h}`);
        await mkdir(dir, { recursive: true });
        const page = await browser.newPage({
          viewport: { width: w, height: h },
          deviceScaleFactor: 1,
          hasTouch: family !== 'desktop',
          isMobile: family === 'mobile',
        });

        for (const route of DEEP_ROUTES) {
          await page.goto(base + route, { waitUntil: 'load' });
          await settle(page);
          await page.screenshot({
            path: join(dir, `${slug(route)}${full ? '-full' : '-fold'}.png`),
            fullPage: full,
          });
          count += 1;
        }
        await page.close();
        console.log(`  ${family} ${w}x${h}: ${DEEP_ROUTES.length} shots`);
      }
    }

    // ---- Every route at the three key widths ----------------------------
    for (const w of [390, 768, 1440]) {
      const dir = join(outDir, 'routes', `${w}px`);
      await mkdir(dir, { recursive: true });
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      for (const route of ALL_ROUTES) {
        await page.goto(base + route, { waitUntil: 'load' });
        await settle(page);
        await page.screenshot({ path: join(dir, `${slug(route)}.png`), fullPage: true });
        count += 1;
      }
      await page.close();
      console.log(`  all ${ALL_ROUTES.length} routes @${w}px`);
    }

    // ---- Interaction states ---------------------------------------------
    {
      // Mobile menu open.
      const dir = join(outDir, 'states');
      await mkdir(dir, { recursive: true });
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      await page.goto(base + '/', { waitUntil: 'load' });
      await settle(page);
      await page.locator('#nav-toggle').click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(dir, 'mobile-390-menu-open.png') });
      count += 1;

      // Mobile landscape with the menu open: the brief calls this out.
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(dir, 'mobile-844x390-menu-open.png') });
      count += 1;
      await page.close();

      // Gallery lightbox open.
      const g = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await g.goto(base + '/projects/', { waitUntil: 'load' });
      await settle(g);
      await g.locator('[data-gallery-open]').first().click();
      await g.waitForTimeout(500);
      await g.screenshot({ path: join(dir, 'desktop-1440-gallery-lightbox.png') });
      count += 1;
      await g.close();

      // FAQ expanded.
      const f = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await f.goto(base + '/', { waitUntil: 'load' });
      await settle(f);
      await f.locator('.faq__item summary').first().click();
      await f.locator('.faq__item').first().scrollIntoViewIfNeeded();
      await f.waitForTimeout(250);
      await f.screenshot({ path: join(dir, 'desktop-1440-faq-open.png') });
      count += 1;
      await f.close();

      // Keyboard focus on the primary CTA.
      const k = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await k.goto(base + '/', { waitUntil: 'load' });
      await settle(k);
      await k.keyboard.press('Tab');
      await k.keyboard.press('Tab');
      await k.waitForTimeout(200);
      await k.screenshot({ path: join(dir, 'desktop-1440-focus-skiplink.png') });
      count += 1;
      await k.close();
    }

    console.log(`\nscreenshots: ${count} files written to screenshots/`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error('capture failed:', e);
  process.exit(1);
});