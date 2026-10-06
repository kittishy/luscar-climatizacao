/**
 * Real 410 Gone for the four retired WordPress template URLs.
 *
 * WHY THIS EXISTS
 * Vercel's `vercel.json` `redirects` only accepts 301, 302, 307 and 308. A
 * `status: 410` entry is rejected outright at deploy time, and an earlier
 * version of this project shipped exactly that. The deploy failed, and the
 * only alternatives that would have "worked" were worse:
 *
 *   - a static file at those paths  -> 200, telling crawlers this is content
 *   - a redirect to the home page  -> misleading, and the briefing forbids it
 *
 * So the four paths rewrite to this function, which returns an honest 410 with
 * a small body telling a human what happened.
 *
 * This is a server response, not a client-side migration: no JavaScript
 * redirect and no meta refresh is involved.
 *
 * Hosts that CAN express 410 directly (nginx `return 410`, Apache
 * `RedirectMatch 410`, Cloudflare response rule) should prefer the direct form
 * documented in MIGRACAO.md, which needs no function at all.
 */

const GONE_PATHS = new Set([
  '/ola-mundo/',
  '/pagina-exemplo/',
  '/author/projetos/',
  '/category/sem-categoria/',
]);

const BODY = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>Página não disponível | Luscar Climatização</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f2f6f8;
       color:#142a38;font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;padding:2rem}
  main{max-width:34rem}
  h1{font-size:1.75rem;line-height:1.2;margin:0 0 1rem}
  p{margin:0 0 1rem}
  a{color:#0759b8;font-weight:700}
</style>
</head>
<body>
<main>
  <p style="font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#435b6b;font-size:.8125rem">Erro 410</p>
  <h1>Esta página saiu do ar</h1>
  <p>Ela existia como conteúdo de modelo no site anterior e não faz parte do
  trabalho da Luscar Climatização. Por isso foi removida, e não redirecionada.</p>
  <p><a href="/">Ir para a página inicial</a></p>
</main>
</body>
</html>`;

export default function handler(req, res) {
  const path = req.url?.split('?')[0] ?? '/';
  if (!GONE_PATHS.has(path)) {
    // Defence in depth: this function must never serve anything else, so a
    // future rewrite mistake cannot turn it into a catch-all 410.
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not found');
    return;
  }

  res.statusCode = 410;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-Robots-Tag', 'noindex, follow');
  res.end(BODY);
}