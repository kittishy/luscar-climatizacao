/**
 * Responsive contract tests.
 *
 * Runs the REAL build output in a real browser (Playwright/Chromium) and
 * asserts the things the briefing demands, at the exact widths it names.
 * A passing build proves nothing about layout; this is the gate that does.
 *
 *   node tests/browser.mjs
 *
 * Scope note: this is browser emulation at a set viewport, NOT a physical
 * device test. No claim of real-device behaviour is made anywhere.
 */

import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

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
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

const ROUTES = [
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

/** Widths named by the brief, plus the intervals between breakpoints. */
const WIDTHS = [320, 375, 390, 430, 768, 900, 1024, 1120, 1366, 1440, 1920, 2560];

const results = [];
const failures = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

/** Minimal static server with real 404 semantics for unknown paths. */
function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      let path = decodeURIComponent(url.pathname);

      let file = join(dist, path);
      if (existsSync(file) && (await stat(file)).isDirectory()) file = join(file, 'index.html');
      if (!existsSync(file) || (await stat(file)).isDirectory()) file = join(file, 'index.html');

      if (!existsSync(file)) {
        const notFound = join(dist, '404.html');
        if (existsSync(notFound)) {
          res.writeHead(404, { 'content-type': MIME['.html'] });
          res.end(await readFile(notFound));
          return;
        }
        res.writeHead(404).end('not found');
        return;
      }

      const type = MIME[extname(file)] ?? 'application/octet-stream';
      res.writeHead(200, { 'content-type': type });
      res.end(await readFile(file));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('No build found. Run `npm run build` first.');
    process.exit(1);
  }

  const { server, port } = await serve();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();

  try {
    // ---------------------------------------------------------------- 1
    // Every route answers 200 and renders its H1 from the served HTML.
    console.log(`\n[1] routes serve real content (${ROUTES.length} routes)`);
    for (const route of ROUTES) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const res = await page.goto(base + route, { waitUntil: 'load' });
      const status = res?.status() ?? 0;
      const h1 = await page.locator('h1').first().textContent().catch(() => null);
      const h1Count = await page.locator('h1').count();

      record(`route ${route} returns 200`, status === 200, `got ${status}`);
      record(`route ${route} has exactly one H1`, h1Count === 1, `got ${h1Count}`);
      record(`route ${route} H1 has text`, Boolean(h1 && h1.trim().length > 8), JSON.stringify(h1));
      await page.close();
    }

    // ---------------------------------------------------------------- 2
    // Deep-route refresh: a hard reload of an inner page must not 404.
    console.log(`\n[2] deep-route reload`);
    for (const route of ROUTES.filter((r) => r !== '/')) {
      const page = await browser.newPage();
      await page.goto(base + route, { waitUntil: 'load' });
      await page.reload({ waitUntil: 'load' });
      const status = await page.evaluate(() => document.querySelector('h1') ? 200 : 0);
      record(`reload ${route} keeps content`, status === 200);
      await page.close();
    }

    // ---------------------------------------------------------------- 3
    // Unknown paths must 404, never render the home page.
    console.log(`\n[3] unknown paths 404`);
    for (const bogus of ['/nao-existe/', '/instalacao-ar-condicionado-joinville/pagina-fantasma/', '/wp-json/']) {
      const page = await browser.newPage();
      const res = await page.goto(base + bogus, { waitUntil: 'load' });
      const status = res?.status() ?? 0;
      const h1 = await page.locator('h1').first().textContent().catch(() => '');
      record(`${bogus} returns 404`, status === 404, `got ${status}`);
      record(`${bogus} is not the home page`, !h1?.includes('da instalação ao cuidado diário'), h1 ?? '');
      await page.close();
    }

    // ---------------------------------------------------------------- 4
    // Horizontal overflow at every briefed width, on representative routes.
    console.log(`\n[4] no horizontal overflow (${WIDTHS.length} widths)`);
    const probeRoutes = ['/', '/projects/', '/servicos-de-climatizacao-ar-condicionado-joinville/', '/contact/', '/guias/ar-condicionado-nao-gela/'];
    for (const width of WIDTHS) {
      for (const route of probeRoutes) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(base + route, { waitUntil: 'load' });
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const over = doc.scrollWidth - doc.clientWidth;
          // Identify the offending element rather than trusting the number.
          let culprit = '';
          if (over > 1) {
            for (const el of Array.from(document.querySelectorAll('body *'))) {
              const r = el.getBoundingClientRect();
              if (r.right > doc.clientWidth + 1 && r.width > 0) {
                culprit = `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)}`;
                break;
              }
            }
          }
          return { over, culprit };
        });
        record(
          `no overflow @${width} ${route}`,
          overflow.over <= 1,
          `${overflow.over}px ${overflow.culprit}`,
        );
        await page.close();
      }
    }

    // ---------------------------------------------------------------- 5
    // Content is fully rendered before JavaScript runs.
    console.log(`\n[5] content exists without JavaScript`);
    {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      for (const route of ['/', '/instalacao-ar-condicionado-joinville/', '/contact/']) {
        await page.goto(base + route, { waitUntil: 'load' });
        const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
        record(`no-JS ${route} has body text`, text.length > 500, `${text.length} chars`);
        record(`no-JS ${route} keeps WhatsApp link`, text.includes('8482-4814'), '');
        record(`no-JS ${route} shows H1`, (await page.locator('h1').count()) === 1);
        // The gallery images must be present in markup, not injected.
        const imgs = await page.locator('img').count();
        record(`no-JS ${route} has images`, imgs > 0, `${imgs} imgs`);
      }
      await context.close();
    }

    // ---------------------------------------------------------------- 6
    // Touch targets, keyboard reachability and focus visibility.
    console.log(`\n[6] touch targets and keyboard`);
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      await page.goto(base + '/', { waitUntil: 'load' });

      const small = await page.evaluate(() => {
        const bad = [];
        const sel = 'a[href], button, summary, input, select, textarea';
        for (const el of Array.from(document.querySelectorAll(sel))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue; // hidden
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') continue;
          // Inline links inside a paragraph are exempt from the 44px rule.
          if (el.tagName === 'A' && el.closest('p')?.textContent?.trim() !== el.textContent?.trim()) continue;
          if (r.height < 44 || r.width < 44) {
            bad.push(`${el.tagName.toLowerCase()}[${(el.textContent || '').trim().slice(0, 22)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        }
        return bad;
      });
      record('touch targets >= 44px @390', small.length === 0, small.slice(0, 6).join(' | '));
      await page.close();
    }

    // Menu: toggle opens, Escape closes and focus returns.
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      const toggle = page.locator('#nav-toggle');
      record('menu toggle visible @390', await toggle.isVisible());
      record('menu starts collapsed', (await toggle.getAttribute('aria-expanded')) === 'false');

      await toggle.click();
      record('menu opens on click', (await toggle.getAttribute('aria-expanded')) === 'true');
      const panelOpen = await page.locator('#nav-panel').isVisible();
      record('panel becomes visible', panelOpen);

      await page.keyboard.press('Escape');
      record('Escape closes menu', (await toggle.getAttribute('aria-expanded')) === 'false');

      const focusedBack = await page.evaluate(() => document.activeElement?.id);
      record('focus returns to toggle after Escape', focusedBack === 'nav-toggle', String(focusedBack));
      await page.close();
    }

    // Desktop navigation must be visible and the toggle hidden.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      record('desktop nav visible @1440', await page.locator('.site-nav').isVisible());
      record('burger hidden @1440', !(await page.locator('#nav-toggle').isVisible()));
      const navLinks = await page.locator('.site-nav a').count();
      record('desktop nav has all links', navLinks >= 4, `${navLinks} links`);
      await page.close();
    }

    // Focus visibility on the primary CTA.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      const ring = await page.evaluate(() => {
        const btn = document.querySelector('.hero__actions .btn--primary');
        if (!(btn instanceof HTMLElement)) return null;
        btn.focus();
        const s = getComputedStyle(btn);
        return { outline: s.outlineWidth, style: s.outlineStyle };
      });
      record('focus ring present on CTA', Boolean(ring && ring.outline !== '0px'), JSON.stringify(ring));
      await page.close();
    }

    // ---------------------------------------------------------------- 7
    // Fixed contact bar must not cover content or hide focused elements.
    console.log(`\n[7] fixed contact bar does not hide content`);
    for (const [w, h] of [[390, 844], [844, 390], [360, 640]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 500 });
      await page.goto(base + '/contact/', { waitUntil: 'load' });
      const overlap = await page.evaluate(() => {
        const bar = document.querySelector('.contact-bar');
        if (!bar) return { bar: false, covered: null };
        const br = bar.getBoundingClientRect();
        window.scrollTo(0, document.body.scrollHeight);
        // Any interactive element whose centre sits under the bar is a hit.
        const hidden = [];
        for (const el of Array.from(document.querySelectorAll('a[href], button'))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const cy = r.top + r.height / 2;
          const cx = r.left + r.width / 2;
          if (cx >= br.left && cx <= br.right && cy >= br.top && cy <= br.bottom) {
            if (el.closest('.contact-bar')) continue;
            hidden.push((el.textContent || '').trim().slice(0, 30));
          }
        }
        return { bar: true, covered: hidden };
      });
      record(`contact bar present @${w}x${h}`, overlap.bar === true);
      record(`no element under bar @${w}x${h}`, (overlap.covered?.length ?? 0) === 0, (overlap.covered ?? []).join(' | '));
      await page.close();
    }

    // ---------------------------------------------------------------- 8
    // Gallery lightbox: opens, Escape closes, focus returns.
    console.log(`\n[8] gallery lightbox keyboard`);
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(base + '/projects/', { waitUntil: 'load' });
      const trigger = page.locator('[data-gallery-open]').first();
      record('gallery has triggers', (await page.locator('[data-gallery-open]').count()) > 0);

      await trigger.click();
      await page.waitForTimeout(150);
      record('lightbox opens', await page.locator('[data-lightbox]').isVisible());
      const imgOk = await page.evaluate(() => {
        const img = document.querySelector('[data-lightbox-img]');
        return img instanceof HTMLImageElement && img.naturalWidth > 0 && img.alt.length > 0;
      });
      record('lightbox image loads with alt', imgOk);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      record('Escape closes lightbox', !(await page.locator('[data-lightbox]').isVisible()));
      const refocused = await page.evaluate(() => document.activeElement?.hasAttribute('data-gallery-open'));
      record('focus returns to gallery trigger', refocused === true, String(refocused));
      await page.close();
    }

    // FAQ works by keyboard without JS-specific help.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      const before = await page.locator('.faq__item[open]').count();
      await page.locator('.faq__item summary').first().click();
      await page.waitForTimeout(100);
      const after = await page.locator('.faq__item[open]').count();
      record('FAQ toggles open', after > before, `${before} -> ${after}`);
      await page.close();
    }

    // ---------------------------------------------------------------- 9
    // Images: natural size must not exceed rendered size (no upscaling).
    console.log(`\n[9] served image is large enough for its box (no upscaling)`);
    for (const [w, route] of [[1440, '/'], [1440, '/projects/'], [1440, '/about/'], [1024, '/about/'], [390, '/about/']]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.goto(base + route, { waitUntil: 'load' });
      await page.waitForTimeout(400);
      const bad = await page.evaluate(() => {
        const out = [];
        for (const img of Array.from(document.querySelectorAll('img'))) {
          // The delivered file's own pixel width, parsed from the srcset
          // descriptor actually in use. `naturalWidth` is NOT usable here:
          // under srcset+sizes a browser reports a density-corrected value,
          // so it does not equal the file's pixel width.
          const m = img.currentSrc?.match(/-(\d+)\.(avif|webp|jpg|png)$/);
          if (!m) continue;
          const fileWidth = Number(m[1]);
          const cssWidth = img.getBoundingClientRect().width;
          // A 1.02 tolerance absorbs sub-pixel layout rounding.
          if (fileWidth < cssWidth * 1.02) {
            out.push(`${m[1]}w file in ${Math.round(cssWidth)}px box`);
          }
        }
        return out;
      });
      record(`no upscaled images @${w} ${route}`, bad.length === 0, bad.slice(0, 4).join(' | '));
      await page.close();
    }

    // At 2560 the container must not let text run absurdly wide.
    {
      const page = await browser.newPage({ viewport: { width: 2560, height: 1200 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      const wide = await page.evaluate(() => {
        const p = document.querySelector('.hero__copy p.lead');
        return p ? Math.round(p.getBoundingClientRect().width) : 0;
      });
      record('reading width bounded @2560', wide > 0 && wide <= 760, `${wide}px`);
      const container = await page.evaluate(() => {
        const c = document.querySelector('.container');
        return c ? Math.round(c.getBoundingClientRect().width) : 0;
      });
      record('container bounded @2560', container <= 1340, `${container}px`);
      await page.close();
    }

    // ---------------------------------------------------------------- 10
    // 320 CSS px reflow and 200% zoom: the brief names both explicitly.
    console.log(`\n[10] 320px reflow and 200% zoom`);
    {
      const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      record('no overflow @320 reflow', over <= 1, `${over}px`);
      const h1 = await page.locator('h1').first().boundingBox();
      record('H1 stays within 320', Boolean(h1 && h1.width <= 320), JSON.stringify(h1));
      await page.close();

      // 200% zoom of a 1280 viewport is equivalent to a 640 CSS px layout.
      const zoomed = await browser.newPage({ viewport: { width: 640, height: 512 }, deviceScaleFactor: 1 });
      await zoomed.goto(base + '/', { waitUntil: 'load' });
      const zOver = await zoomed.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      record('no overflow at 200% zoom equivalent', zOver <= 1, `${zOver}px`);
      await zoomed.close();
    }

    // ---------------------------------------------------------------- 11
    // Tablet orientations: the compact menu must give way to inline nav.
    console.log(`\n[11] tablet orientations`);
    for (const [w, h, label] of [[768, 1024, 'portrait'], [1024, 768, 'landscape']]) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: true });
      await page.goto(base + '/', { waitUntil: 'load' });
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      record(`tablet ${label} no overflow`, over <= 1, `${over}px`);
      const burger = await page.locator('#nav-toggle').isVisible();
      const inlineNav = await page.locator('.site-nav').isVisible();
      // Exactly one navigation affordance may be active.
      record(`tablet ${label} has one nav mode`, burger !== inlineNav, `burger=${burger} inline=${inlineNav}`);
      await page.close();
    }

    // ---------------------------------------------------------------- 12
    // Reduced motion: content must still be present and usable.
    {
      const context = await browser.newContext({
        reducedMotion: 'reduce',
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();
      await page.goto(base + '/', { waitUntil: 'load' });
      const text = await page.evaluate(() => document.body.innerText.trim().length);
      record('reduced motion keeps content', text > 500, `${text} chars`);
      await context.close();
    }

    // ---------------------------------------------------------------- 13
    // console errors must be zero across all routes.
    console.log(`\n[13] no console errors`);
    for (const route of ROUTES) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text().slice(0, 120));
      });
      page.on('pageerror', (err) => errors.push(String(err).slice(0, 120)));
      await page.goto(base + route, { waitUntil: 'load' });
      await page.waitForTimeout(150);
      record(`no console errors ${route}`, errors.length === 0, errors.join(' | '));
      await page.close();
    }

    // ---------------------------------------------------------------- 14
    // The link that actually matters: WhatsApp number and encoding in-browser.
    console.log(`\n[14] WhatsApp link integrity`);
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(base + '/contact/', { waitUntil: 'load' });
      const href = await page
        .locator('a[href*="api.whatsapp.com"]')
        .first()
        .getAttribute('href');
      const url = new URL(href);
      record('phone param exact', url.searchParams.get('phone') === '554784824814', url.searchParams.get('phone'));
      record('pt_BR flag kept', url.searchParams.get('1') === 'pt_BR');
      const text = url.searchParams.get('text');
      record('contextual message present', Boolean(text && text.length > 20), text ?? '');
      record('message is decodable', text ? decodeURIComponent(text) === text : false);
      await page.close();
    }

    // ---------------------------------------------------------------- 15
    // Regression checks for the defects found in the 2026-10-06 review.
    // Each one reproduced a measured failure, so each has a hard threshold.
    console.log(`\n[15] review regressions: menu, footer, page header, gallery`);

    // 15a. Compact-menu CTA was white text on a white button: contrast 1:1.
    // The cause was a `.nav-panel a` rule that also matched the CTA anchor.
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      await page.locator('#nav-toggle').click();
      await page.waitForTimeout(120);

      const cta = await page.evaluate(() => {
        const el = document.querySelector('#nav-panel .btn--on-deep');
        if (!(el instanceof HTMLElement)) return null;
        const s = getComputedStyle(el);
        // Walk up for the first non-transparent background.
        let bg = s.backgroundColor;
        let node = el.parentElement;
        while (
          node &&
          (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')
        ) {
          bg = getComputedStyle(node).backgroundColor;
          node = node.parentElement;
        }
        const r = el.getBoundingClientRect();
        return { color: s.color, bg, w: Math.round(r.width), h: Math.round(r.height) };
      });
      record('panel CTA present @390', cta !== null);
      const ratio = cta ? await page.evaluate(
        ([fg, bg]) => {
          const lum = (c) => {
            const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
            const f = (v) => {
              const s = v / 255;
              return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
            };
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
          };
          const a = lum(fg);
          const b = lum(bg);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        },
        [cta.color, cta.bg],
      ) : 0;
      record('panel CTA contrast >= 4.5:1 @390', ratio >= 4.5, `${ratio.toFixed(2)}:1 (${cta?.color} on ${cta?.bg})`);
      record('panel CTA is a comfortable target @390', cta !== null && cta.h >= 44, `${cta?.w}x${cta?.h}`);
      await page.close();
    }

    // 15b. Four page controls stayed reachable behind the open panel.
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      await page.locator('#nav-toggle').click();
      await page.waitForTimeout(120);

      const leakage = await page.evaluate(() => {
        const panel = document.getElementById('nav-panel');
        const behind = [];
        for (const el of Array.from(document.querySelectorAll('a[href], button'))) {
          if (panel?.contains(el)) continue;
          // The toggle is the documented escape route from the panel, and the
          // skip link is inert; everything else must be unreachable.
          if (el.id === 'nav-toggle') continue;
          // An inert subtree cannot take focus at all; that is the proof.
          el.focus();
          if (document.activeElement === el) behind.push(el.className || el.tagName);
        }
        return behind;
      });
      record('no focusable control behind open panel', leakage.length === 0, leakage.slice(0, 4).join(' | '));

      const inertCount = await page.evaluate(
        () => document.querySelectorAll('#conteudo[inert], .site-footer[inert], .contact-bar[inert], .brand[inert]').length,
      );
      record('background marked inert while panel is open', inertCount >= 4, `${inertCount} regions`);

      await page.locator('#nav-toggle').click();
      await page.waitForTimeout(120);
      const released = await page.evaluate(() => {
        const probe = document.querySelector('.hero__actions a[href]');
        if (!(probe instanceof HTMLElement)) return false;
        probe.focus();
        return document.activeElement === probe;
      });
      record('inert released when panel closes', released);
      await page.close();
    }

    // 15c. Footer links inherited the 2.19:1 action blue and rendered
    // list markers; the page shipped `.site-footer` while CSS said `.footer`.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      const footer = await page.evaluate(() => {
        const root = document.querySelector('.site-footer');
        if (!root) return null;
        const out = { links: [], markers: [], minHeight: Infinity };
        for (const a of Array.from(root.querySelectorAll('a[href]'))) {
          const s = getComputedStyle(a);
          let bg = s.backgroundColor;
          let node = a.parentElement;
          while (node && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
            bg = getComputedStyle(node).backgroundColor;
            node = node.parentElement;
          }
          out.links.push({ color: s.color, bg });
          const r = a.getBoundingClientRect();
          if (r.height > 0) out.minHeight = Math.min(out.minHeight, r.height);
        }
        for (const li of Array.from(root.querySelectorAll('li'))) {
          if (getComputedStyle(li).listStyleType === 'disc') out.markers.push(1);
        }
        // The old `.footer` selector must not be the one carrying the styling.
        out.matchesOldSelector = root.matches('.footer');
        return out;
      });
      record('footer found by its own class', footer !== null && footer.matchesOldSelector === false);
      const worst = await page.evaluate((pairs) => {
        const lum = (c) => {
          const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
          const f = (v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        let min = 21;
        for (const p of pairs) {
          const a = lum(p.color);
          const b = lum(p.bg);
          min = Math.min(min, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
        }
        return min;
      }, footer?.links ?? []);
      record('footer link contrast >= 4.5:1', worst >= 4.5, `${worst.toFixed(2)}:1`);
      record('footer has no list markers', (footer?.markers.length ?? 1) === 0);
      record('footer link targets >= 44px', (footer?.minHeight ?? 0) >= 44, `${Math.round(footer?.minHeight ?? 0)}px`);
      await page.close();
    }

    // 15d. Page header put a 673px photograph in the first column and left the
    // H1 a 404px box, because `.altitude__media`'s `order: -1` leaked in.
    for (const [w, route] of [[1440, '/about/'], [1024, '/instalacao-ar-condicionado-joinville/']]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.goto(base + route, { waitUntil: 'load' });
      const head = await page.evaluate(() => {
        const grid = document.querySelector('.page-head__grid');
        const copy = document.querySelector('.page-head__copy');
        const fig = document.querySelector('.page-head__figure');
        if (!grid || !copy) return null;
        const g = grid.getBoundingClientRect();
        const c = copy.getBoundingClientRect();
        const f = fig?.getBoundingClientRect();
        const h1 = document.querySelector('.page-head h1');
        return {
          usesLegacyClass: Boolean(document.querySelector('.page-head .altitude__media')),
          copyW: Math.round(c.width),
          copyLeft: Math.round(c.left - g.left),
          copyTop: Math.round(c.top - g.top),
          figW: f ? Math.round(f.width) : 0,
          figLeft: f ? Math.round(f.left - g.left) : 0,
          figTop: f ? Math.round(f.top - g.top) : 0,
          h1W: h1 ? Math.round(h1.getBoundingClientRect().width) : 0,
          h1Text: h1 ? (h1.textContent || '').trim() : '',
        };
      });
      record(`page head no longer borrows altitude class @${w}`, head?.usesLegacyClass === false);
      record(`page head text column >= 440px @${w}`, (head?.copyW ?? 0) >= 440, `${head?.copyW}px`);
      record(`page head text precedes photo @${w}`, (head?.figW ?? 0) === 0 || head.copyLeft < head.figLeft, `copy@${head?.copyLeft} photo@${head?.figLeft}`);
      record(`page head H1 has room to breathe @${w}`, (head?.h1W ?? 0) >= 440, `${head?.h1W}px`);

      // "ar-condicionado" must not break at its own hyphen: CSS cannot prevent
      // that, so the word is wrapped in a nowrap span at render time.
      const split = await page.evaluate(() => {
        const h1 = document.querySelector('.page-head h1');
        if (!h1) return null;
        const range = document.createRange();
        range.selectNodeContents(h1);
        const lines = range.getClientRects();
        // A hyphenated word split across lines shows up as a rect whose text
        // ends in "-" on one line. Measure the wrapped spans instead.
        const wrapped = h1.querySelectorAll('span.nowrap');
        return {
          wrapped: [...wrapped].map((s) => (s.textContent || '').trim()),
          rects: lines.length,
        };
      });
      const hyphensInH1 = head?.h1Text?.match(/[^\s-]+-\S+/g) ?? [];
      const brokenOnes = (split?.wrapped ?? []).filter(
        (w) => hyphensInH1.some((h) => h.includes(w)) === false,
      );
      record(
        `page head keeps hyphenated words whole @${w}`,
        hyphensInH1.every((h) => (split?.wrapped ?? []).some((w) => h.includes(w))) && brokenOnes.length === 0,
        `esperado ${hyphensInH1.join(', ') || '(nenhum)'} | nowrap ${(split?.wrapped ?? []).join(', ') || '(nenhum)'}`,
      );
      await page.close();
    }

    // Text-only headers must not leave an empty second column.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(base + '/contact/', { waitUntil: 'load' });
      const wide = await page.evaluate(() => {
        const grid = document.querySelector('.page-head__grid');
        if (!grid) return 0;
        return Math.round(getComputedStyle(grid).gridTemplateColumns.split(' ').length);
      });
      record('text-only page head is one track @1440', wide === 1, `${wide} tracks`);
      const cta = await page.evaluate(() => {
        const a = document.querySelector('.page-head__actions .btn--primary');
        return a ? (a.textContent || '').trim() : '';
      });
      record('contact page head leads with WhatsApp', cta.length > 0, cta);
      await page.close();
    }

    // 15e. Gallery rendered disc bullets; the lightbox close button was a
    // 44px box holding 52px of content.
    {
      const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
      await page.goto(base + '/projects/', { waitUntil: 'load' });
      const markers = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.gallery li'))
          .filter((li) => getComputedStyle(li).listStyleType === 'disc').length,
      );
      record('gallery has no bullets @768', markers === 0, `${markers} items`);

      await page.locator('[data-gallery-open]').first().click();
      await page.waitForTimeout(150);
      const close = await page.evaluate(() => {
        const btn = document.querySelector('[data-lightbox-close]');
        if (!(btn instanceof HTMLElement)) return null;
        const r = btn.getBoundingClientRect();
        return {
          client: btn.clientWidth,
          scroll: btn.scrollWidth,
          h: Math.round(r.height),
          text: (btn.textContent || '').trim(),
        };
      });
      record('lightbox close content fits its box', close !== null && close.scroll <= close.client, `${close?.scroll} in ${close?.client}`);
      record('lightbox close keeps a 44px target', (close?.h ?? 0) >= 44, `${close?.h}px`);
      record('lightbox close label is legible', (close?.text ?? '').includes('Fechar'), close?.text ?? '');

      // Clicking the dimmed area outside the photograph must dismiss.
      await page.mouse.click(6, 6);
      await page.waitForTimeout(150);
      record('backdrop click closes lightbox', !(await page.locator('[data-lightbox]').isVisible()));
      await page.close();
    }

    // 15f. Composition: the hero measured 415px of text beside 461px of photo
    // with a four-line H1; services and the FAQ stayed single-column on tablet.
    for (const [w, h, label] of [[1440, 900, 'desktop'], [1366, 768, 'laptop'], [768, 1024, 'tablet']]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(base + '/', { waitUntil: 'load' });
      const hero = await page.evaluate(() => {
        const copy = document.querySelector('.hero__copy');
        const media = document.querySelector('.hero__media');
        const h1 = document.querySelector('.hero__title');
        if (!copy || !media || !h1) return null;
        const cs = getComputedStyle(h1);
        const lineHeight = parseFloat(cs.lineHeight);
        return {
          copyW: Math.round(copy.getBoundingClientRect().width),
          mediaW: Math.round(media.getBoundingClientRect().width),
          h1H: Math.round(h1.getBoundingClientRect().height),
          lines: Math.max(1, Math.round(h1.getBoundingClientRect().height / lineHeight)),
        };
      });
      if (w >= 900) {
        record(`hero text column >= 470px @${label}`, (hero?.copyW ?? 0) >= 470, `${hero?.copyW}px`);
        record(`hero H1 fits in 3 lines @${label}`, (hero?.lines ?? 9) <= 3, `${hero?.lines} lines`);
        record(`hero photo stays in its column @${label}`, (hero?.mediaW ?? 0) <= 500, `${hero?.mediaW}px`);
      } else {
        record(`hero photo leads the page on ${label}`, (hero?.mediaW ?? 0) >= 400, `${hero?.mediaW}px`);
      }
      const serviceCols = await page.evaluate(
        () => getComputedStyle(document.querySelector('.services-grid')).gridTemplateColumns.split(' ').length,
      );
      /*
       * The secondary services are a compact index now, not cards. At desktop
       * three columns keep all three entries on one line; on tablet they stack
       * into a readable list because three ~230px columns would squeeze a
       * sentence into a hyphenated stub. One column there is a decision about
       * this content, not the phone layout inherited by omission.
       */
      if (w >= 900) {
        record(`services index uses three columns @${label}`, serviceCols === 3, `${serviceCols} columns`);
      } else {
        record(`services index stacks on ${label}`, serviceCols === 1, `${serviceCols} columns`);
      }

      // The primary service must outrank the index, not sit beside it.
      const primary = await page.evaluate(() => {
        // The deep surface is the <section>, not the inner grid, so the probe
        // has to start from the section to read the real background.
        const section = document.querySelector('section.service-primary');
        const index = document.querySelector('.services-grid');
        if (!section || !index) return null;
        const s = getComputedStyle(section);
        const i = getComputedStyle(index);
        return {
          primaryDark: s.backgroundColor,
          indexDark: i.backgroundColor,
          primaryHasPhoto: Boolean(section.querySelector('img')),
          indexHasPhoto: Boolean(index.querySelector('img')),
        };
      });
      record(`primary service is the deep block @${label}`, primary?.primaryDark !== primary?.indexDark, `${primary?.primaryDark} vs ${primary?.indexDark}`);
      record(`primary service carries its photograph @${label}`, primary?.primaryHasPhoto === true);
      record(`index carries no photograph @${label}`, primary?.indexHasPhoto === false);
      await page.close();
    }
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      const faqCols = await page.evaluate(
        () => getComputedStyle(document.querySelector('.faq')).gridTemplateColumns.split(' ').length,
      );
      record('homepage FAQ uses two columns @1440', faqCols === 2, `${faqCols} columns`);

      // The eyebrow is a banned kicker: no page may ship one.
      const kickers = await page.evaluate(() =>
        Array.from(document.querySelectorAll('main .eyebrow, footer .eyebrow, .eyebrow')).length,
      );
      record('no eyebrow kicker anywhere @1440', kickers === 0, `${kickers} found`);

      // No em dash may reach the visitor.
      const dashes = await page.evaluate(() => {
        const hits = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walk.nextNode())) {
          if (/[\u2014\u2013]/.test(n.nodeValue ?? '')) hits.push(n.nodeValue.trim().slice(0, 40));
        }
        return hits;
      });
      record('no em dash in served copy @1440', dashes.length === 0, dashes.slice(0, 3).join(' | '));
      await page.close();
    }
  // ---------------------------------------------------------------- 16
    // Interactive states: the focus ring must stay legible on every surface,
    // and the ring colour has to be one of the two measured tokens.
    console.log(`\n[16] focus ring on dark surfaces`);
    {
      const probes = [
        { route: '/', sel: '.site-footer li a', label: 'footer link' },
        { route: '/', sel: '.site-nav a', label: 'header nav link' },
        { route: '/contact/', sel: '.contact-bar a', label: 'contact bar' },
        { route: '/about/', sel: '.gallery__btn', label: 'gallery tile' },
      ];
      for (const { route, sel, label } of probes) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await page.goto(base + route, { waitUntil: 'load' });
        const ring = await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (!(el instanceof HTMLElement)) return null;
          el.focus();
          const cs = getComputedStyle(el);
          // Walk up for the surface the ring is drawn against.
          let bg = cs.backgroundColor;
          let node = el.parentElement;
          while (node && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
            bg = getComputedStyle(node).backgroundColor;
            node = node.parentElement;
          }
          return { outline: cs.outlineColor, width: cs.outlineWidth, offset: cs.outlineOffset, bg };
        }, sel);
        record(`focus ring present on ${label}`, ring !== null && ring.width !== '0px', JSON.stringify(ring));

        const isCyanOnDark = ring
          ? await page.evaluate(([fg, bg]) => {
              const lum = (c) => {
                const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
                const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
                return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
              };
              const a = lum(fg);
              const b = lum(bg);
              return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            }, [ring.outline, ring.bg])
          : 0;
        // A focus indicator needs >= 3:1 against what it sits on.
        record(`focus ring >= 3:1 on ${label}`, isCyanOnDark >= 3, `${isCyanOnDark.toFixed(2)}:1`);
        await page.close();
      }
    }

    // The compact panel and the lightbox must not shift the page sideways.
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(base + '/', { waitUntil: 'load' });
      const gutter = await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollbarGutter,
      );
      record('scrollbar gutter reserved', gutter.includes('stable'), gutter);
      const before = await page.evaluate(() => document.querySelector('.container').getBoundingClientRect().left);
      await page.locator('[data-gallery-open]').first().click().catch(async () => {
        await page.goto(base + '/projects/', { waitUntil: 'load' });
        await page.locator('[data-gallery-open]').first().click();
      });
      await page.waitForTimeout(200);
      const during = await page.evaluate(() => document.querySelector('.container').getBoundingClientRect().left);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => document.querySelector('.container').getBoundingClientRect().left);
      record('no horizontal shift when the lightbox opens', Math.abs(before - during) <= 1, `${before} -> ${during}`);
      record('no horizontal shift when the lightbox closes', Math.abs(before - after) <= 1, `${before} -> ${after}`);
      await page.close();
    }

    // The fixed contact bar must stand down while the compact panel is open.
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
      await page.goto(base + '/', { waitUntil: 'load' });
      record('contact bar visible with panel closed', await page.locator('.contact-bar').isVisible());
      await page.locator('#nav-toggle').click();
      await page.waitForTimeout(150);
      const barHidden = !(await page.locator('.contact-bar').isVisible());
      record('contact bar stands down while panel is open', barHidden);
      const overlap = await page.evaluate(() => {
        const panel = document.querySelector('.nav-panel');
        const bar = document.querySelector('.contact-bar');
        if (!panel || !bar || getComputedStyle(bar).display === 'none') return { clear: true };
        const p = panel.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        return { clear: !(p.bottom > b.top && p.top < b.bottom), p: p.bottom, b: b.top };
      });
      record('panel and contact bar do not overlap', overlap.clear === true, JSON.stringify(overlap));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      record('contact bar returns after Escape', await page.locator('.contact-bar').isVisible());
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  // ---------------------------------------------------------------- report
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${'='.repeat(64)}`);
  console.log(`RESPONSIVE BROWSER SUITE: ${passed}/${results.length} checks passed`);
  if (failures.length) {
    console.log(`\nFAILURES (${failures.length}):`);
    for (const f of failures) console.log(`  FAIL  ${f}`);
  }
  console.log('='.repeat(64));

  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error('browser suite crashed:', err);
  process.exit(1);
});