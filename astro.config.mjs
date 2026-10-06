import { defineConfig } from 'astro/config';

/**
 * Publication mode is explicit and never inferred.
 *
 *   preview     (default) — self-referencing canonical, noindex meta,
 *                             X-Robots-Tag injected by vercel.json.
 *   production            — indexable: sitemap and robots advertise the routes,
 *                             and X-Robots-Tag becomes `index, follow`.
 *
 * The ORIGIN is separate from the MODE, because the two decisions are not the
 * same one:
 *
 *   SITE_MODE     =production  makes the build indexable.
 *   SITE_ORIGIN   overrides WHERE the canonical points.
 *
 * `SITE_ORIGIN` used to be honoured only in preview, so `SITE_MODE=production`
 * unconditionally meant the client domain. That made "production, served on
 * another host" inexpressible, and the only way to get an indexable build was
 * to point every canonical at `luscarjoinville.com.br` — which is still an
 * Apache host running the previous site, so the canonical would have pointed
 * the new pages at the old ones.
 *
 * The client domain stays the DEFAULT for production, so the eventual cutover
 * needs no code change: set the env vars, rebuild, done.
 */
const mode = process.env.SITE_MODE === 'production' ? 'production' : 'preview';
const DEFAULT_ORIGIN =
  mode === 'production' ? 'https://luscarjoinville.com.br' : 'https://luscar-climatizacao.vercel.app';
const site = (process.env.SITE_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/$/, '');

export default defineConfig({
  site,
  // Every canonical route in seo/mapa-urls.csv ends in a slash, including /about/,
  // /contact/ and /projects/ (the legacy English paths we deliberately kept).
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  devToolbar: { enabled: false },
  vite: {
    build: {
      assetsInlineLimit: 0, // keep fonts/images as real files so srcset is meaningful
    },
  },
});