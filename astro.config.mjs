import { defineConfig } from 'astro/config';

/**
 * Publication mode is explicit and never inferred.
 *
 *   preview     (default) — self-referencing canonical, noindex meta,
 *                             X-Robots-Tag injected by vercel.json.
 *   production            — canonical pinned to https://luscarjoinville.com.br,
 *                             sitemap + robots advertise indexable pages only.
 *
 * The cut to the client domain is an operational decision, never a side effect
 * of merely producing a build.
 */
const mode = process.env.SITE_MODE === 'production' ? 'production' : 'preview';
const site = mode === 'production'
  ? 'https://luscarjoinville.com.br'
  : (process.env.SITE_ORIGIN ?? 'https://luscar-climatizacao.vercel.app').replace(/\/$/, '');

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