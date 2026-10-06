/**
 * Generates vercel.json for the active mode.
 *
 *   node scripts/gen-vercel-config.mjs
 *
 * Why this is generated instead of hand-written:
 *  - the four retired WordPress URLs must answer a REAL 410, not a redirect
 *    and not a 200;
 *  - preview and production need different X-Robots-Tag behaviour;
 *  - both must come from one source so the config can never drift from the
 *    mode that astro.config.mjs is building.
 *
 * Redirect policy, from seo/mapa-urls.csv:
 *  - the nine useful legacy pages keep their exact path and are rewritten in
 *    place, so there is nothing to redirect for them;
 *  - the four template remains get 410 Gone. They are NOT redirected to the
 *    home page: without Search Console we cannot know whether they carry
 *    backlinks, and a misleading redirect is worse than an honest 410.
 *
 * WHY THE 410s ARE REWRITES, NOT REDIRECTS:
 * Vercel's `redirects` accepts only 301/302/307/308. A `status: 410` entry is
 * rejected at deploy time. Serving a static file at those paths would answer
 * 200 and tell crawlers the page is content; redirecting to the home page is
 * forbidden by the brief. So the four paths rewrite to api/gone.js, which
 * returns an actual 410. Hosts that can express 410 directly should prefer the
 * direct form in MIGRACAO.md.
 *
 * A static Astro export has no SPA fallback, so an unknown slug naturally 404s.
 * There is deliberately no catch-all rewrite anywhere in this file.
 */

import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const mode = process.env.SITE_MODE === 'production' ? 'production' : 'preview';

/** Retired template routes, mirroring src/data/site.ts retiredTemplateRoutes. */
const GONE = [
  '/ola-mundo/',
  '/pagina-exemplo/',
  '/author/projetos/',
  '/category/sem-categoria/',
];

async function main() {
  const headers = [];

  if (mode === 'preview') {
    // A crawler must be able to READ noindex to honour it. A blanket
    // X-Robots-Tag is the correct mechanism; `Disallow: /` alone in robots.txt
    // would prevent the directive from ever being read.
    headers.push({
      source: '/(.*)',
      headers: [
        { key: 'X-Robots-Tag', value: 'noindex, follow' },
        // A demonstration must never be cached as if it were the real site.
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
      ],
    });
  } else {
    headers.push({
      source: '/(.*)',
      headers: [
        { key: 'X-Robots-Tag', value: 'index, follow' },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    });
  }

  // Immutable hashed derivatives get a long cache; the originals under
  // /wp-content/ and /s/img/ keep theirs so legacy URLs behave like the
  // WordPress ones they replace.
  headers.push({
    source: '/media/(.*)',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
  });

  const config = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: null,
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    trailingSlash: true,
    cleanUrls: false,
    // No catch-all rewrite: an unknown path must 404, never render home.
    headers,
    rewrites: GONE.map((source) => ({ source, destination: '/api/gone' })),
  };

  await writeFile(join(root, 'vercel.json'), JSON.stringify(config, null, 2) + '\n', 'utf8');

  console.log(`vercel.json written for mode=${mode}`);
  console.log(`  ${GONE.length} template routes rewritten to /api/gone (real HTTP 410)`);
  console.log(
    mode === 'preview'
      ? '  X-Robots-Tag: noindex, follow'
      : '  X-Robots-Tag: index, follow + security headers',
  );
}

main().catch((err) => {
  console.error('vercel config generation failed:', err.message);
  process.exit(1);
});