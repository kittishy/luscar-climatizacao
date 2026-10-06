/**
 * Deployment configuration guard.
 *
 * WHY THIS EXISTS
 * `vercel.json` was originally gitignored because the build generates it.
 * That was a mistake with a real, shipped consequence: Vercel reads project
 * configuration from the repository BEFORE the build runs, so a Git-connected
 * deploy ended up with:
 *
 *   - no X-Robots-Tag header  (the brief requires it in preview mode)
 *   - no rewrites for the four retired routes, which then answered 404
 *     instead of the contracted 410
 *
 * while the file on disk looked perfectly correct. Nothing in the build or the
 * browser suite could see it, because the defect lived in the deploy layer.
 *
 * These tests assert the config that actually governs the deploy.
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vercelPath = join(root, 'vercel.json');
const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');

const RETIRED = ['/ola-mundo/', '/pagina-exemplo/', '/author/projetos/', '/category/sem-categoria/'];

interface VercelRule {
  source: string;
  destination: string;
  status?: number;
}

interface VercelHeader {
  key: string;
  value: string;
}

interface VercelConfig {
  outputDirectory?: string;
  trailingSlash?: boolean;
  cleanUrls?: boolean;
  headers?: { source: string; headers: VercelHeader[] }[];
  redirects?: VercelRule[];
  rewrites?: VercelRule[];
}

function config(): VercelConfig {
  return JSON.parse(readFileSync(vercelPath, 'utf8')) as VercelConfig;
}

test('vercel.json exists after a build', () => {
  assert.ok(
    existsSync(vercelPath),
    'vercel.json missing — run `npm run build`, which generates it via `npm run config`',
  );
});

test('vercel.json must NOT be gitignored', () => {
  // A line that ignores vercel.json would silently strip headers and the 410s
  // from every Git-connected deploy while local checks stayed green.
  const ignoring = gitignore
    .split(/\r?\n/)
    .map((l) => l.trim())
    .some((l) => /^vercel\.json$/.test(l) || l.startsWith('vercel.json'));
  assert.ok(!ignoring, 'vercel.json is gitignored; Vercel needs it in the repository');
});

test('all four retired template routes are configured', () => {
  const c = config();
  const rewrites = (c.rewrites ?? []).map((r) => r.source);
  for (const route of RETIRED) {
    assert.ok(rewrites.includes(route), `vercel.json has no rewrite for ${route}`);
  }
  // A redirect with status 410 is rejected by Vercel at deploy time; only
  // 301/302/307/308 are accepted. This test exists so nobody reintroduces it.
  for (const r of c.redirects ?? []) {
    assert.ok(
      typeof r.status === 'number' && [301, 302, 307, 308].includes(r.status),
      `vercel.json uses unsupported redirect status ${r.status}; Vercel rejects the deploy`,
    );
  }
});

test('the 410 handler function exists and is restricted', () => {
  const gone = readFileSync(join(root, 'api', 'gone.js'), 'utf8');
  for (const route of RETIRED) {
    assert.ok(gone.includes(route), `api/gone.js does not guard ${route}`);
  }
  assert.match(gone, /statusCode = 410/, 'api/gone.js must return a real 410');
  // It must refuse anything else, or a future rewrite mistake turns it into a
  // catch-all 410 for the whole site.
  assert.match(gone, /res\.statusCode = 404/, 'api/gone.js must 404 unknown paths');
});

test('no catch-all rewrite or redirect exists', () => {
  const c = config();
  const patterns = [...(c.rewrites ?? []), ...(c.redirects ?? [])].map((r) => r.source);
  assert.ok(patterns.length > 0, 'expected the four per-route rules');
  for (const p of patterns) {
    assert.ok(
      !/\(\.\*\)|^\/\*|^\\/.test(p),
      `catch-all pattern "${p}" would turn unknown paths into 200 instead of 404`,
    );
    // Each rule must name one explicit path, never a prefix.
    assert.ok(
      p.startsWith('/') && !p.includes('*'),
      `rewrite source "${p}" is not a single explicit path`,
    );
  }
  // The four legitimate per-route rewrites are allowed; a blanket block is not.
  assert.ok(
    patterns.length <= RETIRED.length,
    `found ${patterns.length} rewrite/redirect rules; only the four retired routes should exist`,
  );
});

test('preview build ships noindex in both the head and the header', () => {
  const c = config();
  const all = c.headers?.find((h: { source: string }) => h.source === '/(.*)');
  assert.ok(all, 'no global header rule in vercel.json');

  const robots = all.headers.find((h: VercelHeader) => h.key.toLowerCase() === 'x-robots-tag');
  assert.ok(robots, 'X-Robots-Tag missing: preview mode would be crawlable at the edge');

  const isPreview = robots.value.includes('noindex');
  const home = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
  const metaRobots = home.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? '';

  // The meta directive and the header must agree, whichever mode was built.
  assert.ok(
    isPreview === metaRobots.includes('noindex'),
    `vercel.json says noindex=${isPreview} but the page meta says "${metaRobots}"`,
  );
});

test('the SEO contract the build depends on is inside the repository', () => {
  // These were originally read from ../seo/, which broke CI deploys because the
  // files are not part of this repository.
  for (const f of ['paginas-propostas.json', 'mapa-urls.csv', 'assets-publicados.csv']) {
    assert.ok(
      existsSync(join(root, 'seo', f)),
      `seo/${f} missing — the build cannot run on CI without it`,
    );
  }
});