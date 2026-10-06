/**
 * Laboratory performance measurement.
 *
 *   node scripts/perf.mjs
 *
 * WHAT THIS IS: a lab measurement against a local static server, with
 * simulated CPU and network throttling. It is reported as exactly that.
 *
 * WHAT THIS IS NOT:
 *  - NOT field data. No Core Web Vitals (LCP/INP/CLS) can be claimed from it.
 *    The briefing sets those as targets to be measured after launch, against
 *    real users.
 *  - NOT a ranking signal, and not proof of anything about Google's results.
 *  - NOT transferable: a desktop-profile number says nothing about mobile.
 *    Each profile is reported separately, never merged.
 */

import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
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
};

/** Routes the briefing asks for: home, installation and maintenance. */
const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/instalacao-ar-condicionado-joinville/', name: 'instalacao' },
  { path: '/concertos-e-manutencao-ar-condicionado-joinville/', name: 'manutencao' },
];

/**
 * Simulated profiles. Desktop and mobile are deliberately NOT averaged
 * together: reporting a single number would misrepresent both.
 */
const PROFILES = {
  desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    cpuThrottle: 1,
    // A generous fixed connection: this measures our markup, not the wire.
    network: { offline: false, downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (5 * 1024 * 1024) / 8, latency: 20 },
  },
  mobile: {
    ...devices['Pixel 7'],
    cpuThrottle: 4,
    network: { offline: false, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8, latency: 85 },
  },
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      let file = join(dist, decodeURIComponent(url.pathname));
      if (existsSync(file) && (await stat(file)).isDirectory()) file = join(file, 'index.html');
      if (!existsSync(file)) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function measure(browser, base, profileName, route) {
  const profile = PROFILES[profileName];
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor ?? 1,
    isMobile: profileName === 'mobile',
    hasTouch: profileName === 'mobile',
  });
  const page = await context.newPage();

  /*
   * LCP must be captured by an observer registered BEFORE first paint.
   * `performance.getEntriesByType('largest-contentful-paint')` afterwards
   * returns nothing in Chromium, because LCP entries are only buffered for
   * observers that were already observing at the time they were emitted.
   * The value is parked on window and read once the page has settled.
   */
  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) window.__lcp = last.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      /* unsupported */
    }
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!e.hadRecentInput) window.__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      /* unsupported */
    }
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.network.latency,
    downloadThroughput: profile.network.downloadThroughput,
    uploadThroughput: profile.network.uploadThroughput,
  });
  if (profile.cpuThrottle > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuThrottle });
  }

  let bytes = 0;
  let requests = 0;
  page.on('response', (res) => {
    requests += 1;
  });

  await page.goto(base + route.path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // Long tasks: a usable INP proxy in a lab run.
  const longTasks = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const found = [];
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) found.push(Math.round(e.duration));
          }).observe({ type: 'longtask', buffered: true });
        } catch {
          /* longtask unsupported: report what we have */
        }
        setTimeout(() => resolve(found), 1200);
      }),
  );

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] ?? {};
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find((p) => p.name === 'first-contentful-paint');

    // Bytes come from the Resource Timing API rather than response headers:
    // this local server does not emit content-length, and the entry totals
    // also cover the document itself.
    const resources = performance.getEntriesByType('resource');
    const resourceBytes = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const transferSize = nav.transferSize || 0;
    const byType = {};
    for (const r of resources) {
      const ext = (r.name.split('?')[0].split('.').pop() || '').toLowerCase();
      byType[ext] = (byType[ext] || 0) + (r.transferSize || 0);
    }

    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd ?? 0),
      load: Math.round(nav.loadEventEnd ?? 0),
      transferSize,
      fcp: Math.round(fcp?.startTime ?? 0),
      lcp: Math.round(window.__lcp ?? 0),
      resources: resources.length,
      byType,
      images: document.images.length,
      // The single largest transfer: usually the hero photograph.
      heaviest: resources
        .map((r) => ({ name: r.name.split('/').pop(), kb: Math.round((r.transferSize || 0) / 1024) }))
        .sort((a, b) => b.kb - a.kb)
        .slice(0, 3),
    };
  });

  const cls = await page.evaluate(
    () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(Number((window.__cls ?? 0).toFixed(4))), 700);
      }),
  );

  await context.close();
  const totalKb = Math.round((bytes || metrics.transferSize + (metrics.byType ? Object.values(metrics.byType).reduce((a, b) => a + b, 0) : 0)) / 1024);
  return {
    ...metrics,
    cls,
    longTasks: longTasks.length,
    worstLongTask: longTasks.length ? Math.max(...longTasks) : 0,
    requests,
    kb: totalKb,
  };
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('No build. Run `npm run build` first.');
    process.exit(1);
  }

  const { server, port } = await serve();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const report = [];

  try {
    console.log('\nLaboratory performance (local static server, simulated throttling)');
    console.log('desktop: 1440x900, 10 Mbps / 20 ms, CPU 1x');
    console.log('mobile:  Pixel 7 profile, 4 Mbps / 85 ms, CPU 4x\n');

    for (const profileName of ['desktop', 'mobile']) {
      for (const route of ROUTES) {
        const m = await measure(browser, base, profileName, route);
        report.push({ profile: profileName, route: route.name, ...m });
        console.log(
          `${profileName.padEnd(7)} ${route.name.padEnd(12)} ` +
            `FCP ${String(m.fcp).padStart(5)}ms  LCP ${String(m.lcp).padStart(5)}ms  ` +
            `DCL ${String(m.domContentLoaded).padStart(5)}ms  load ${String(m.load).padStart(5)}ms  ` +
            `CLS ${m.cls}  req ${String(m.requests).padStart(3)}  ${m.kb} KB  ` +
            `longTasks ${m.longTasks}${m.worstLongTask ? ` (worst ${m.worstLongTask}ms)` : ''}`,
        );
      }
    }

    await mkdir(join(root, 'reports'), { recursive: true });
    await writeFile(
      join(root, 'reports', 'performance.json'),
      JSON.stringify(
        {
          measuredAt: new Date().toISOString(),
          disclaimer:
            'Laboratory measurement on a local static server with simulated throttling. NOT field data, NOT Core Web Vitals from real users, and NOT a ranking signal.',
          profiles: {
            desktop: 'viewport 1440x900, download 10 Mbps, latency 20 ms, CPU 1x',
            mobile: 'Pixel 7 emulation, download 4 Mbps, latency 85 ms, CPU 4x',
          },
          results: report,
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );
    console.log('\nwrote reports/performance.json');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error('perf run failed:', e);
  process.exit(1);
});