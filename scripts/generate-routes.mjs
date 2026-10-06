/**
 * Static output generation.
 *
 *   node scripts/generate-routes.mjs
 *
 * Sitemap and robots.txt are written by hand rather than by a plugin, because
 * both are mode-sensitive and must obey two rules the brief states explicitly:
 *
 *  1. Only indexable production pages may appear in the sitemap.
 *     seo/paginas-propostas.json marks every route indexable_production=true
 *     and indexable_preview=false, so a preview build emits an EMPTY sitemap
 *     rather than advertising pages it has asked not to be indexed.
 *  2. The retired WordPress template routes never appear anywhere.
 *     They get a real 410 at the edge, not a sitemap entry.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const seoDir = join(root, 'seo');

const mode = process.env.SITE_MODE === 'production' ? 'production' : 'preview';
const origin =
  mode === 'production'
    ? 'https://luscarjoinville.com.br'
    : (process.env.SITE_ORIGIN ?? 'https://luscar-climatizacao.vercel.app').replace(/\/$/, '');

/**
 * The route contract is read from this repository's own copy of the
 * briefing's JSON rather than hardcoded, so seo/paginas-propostas.json stays
 * authoritative and a CI deploy does not depend on files outside the repo.
 */
async function loadContract() {
  const raw = await readFile(join(seoDir, 'paginas-propostas.json'), 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const pages = await loadContract();

  const indexable =
    mode === 'production'
      ? pages.filter((p) => p.indexable_production === true)
      : pages.filter((p) => p.indexable_preview === true);

  await mkdir(dist, { recursive: true });

  // --- sitemap ------------------------------------------------------------
  // In preview the sitemap is intentionally empty: emitting routes here
  // would contradict the noindex this same build sets in every page head.
  const urls = indexable
    .map((p) => {
      const loc = `${origin}${p.route}`;
      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${p.route === '/' ? '1.0' : '0.8'}</priority>\n  </url>`;
    })
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  await writeFile(join(dist, 'sitemap.xml'), sitemap, 'utf8');

  // --- robots -------------------------------------------------------------
  // Preview: Allow everything, and rely on the per-page noindex plus the
  // X-Robots-Tag header. `Disallow: /` would be wrong here, because a blocked
  // crawler cannot read the noindex directive it is meant to honour.
  const robots =
    mode === 'production'
      ? `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`
      : `# Preview / demonstration build. Every page also carries a noindex meta
# tag and an X-Robots-Tag header. Crawling is allowed on purpose so the
# directive can actually be read.
User-agent: *
Allow: /
`;

  await writeFile(join(dist, 'robots.txt'), robots, 'utf8');

  console.log(`routes: sitemap (${indexable.length} url) + robots.txt written for mode=${mode}`);
  if (mode === 'preview') {
    console.log('  preview sitemap is intentionally empty (all routes are indexable_production=false)');
  }
}

main().catch((err) => {
  console.error('route generation failed:', err.message);
  process.exit(1);
});