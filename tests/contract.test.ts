/**
 * Contract tests.
 *
 * These assert the promises the briefing makes in writing, so a regression
 * fails loudly instead of shipping:
 *  - the thirteen contracted routes exist, pre-rendered, with their own body
 *  - contacts are exactly the published ones, with no invented digit
 *  - no template placeholder, Lorem ipsum or fake contact survives
 *  - every internal link resolves to a real file
 *  - title / description / H1 / canonical are unique and present
 *  - the retired template routes are absent from navigation and sitemap
 *  - images never upscale beyond their source, and widths are declared
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');
const seoDir = join(root, 'seo');

interface ContractPage {
  route: string;
  title: string;
  description: string;
  h1: string;
  indexable_production: boolean;
  indexable_preview: boolean;
}

const contract = JSON.parse(
  readFileSync(join(seoDir, 'paginas-propostas.json'), 'utf8'),
) as ContractPage[];
const siteData = readFileSync(join(root, 'src', 'data', 'site.ts'), 'utf8');

const hasBuild = existsSync(join(dist, 'index.html'));

/**
 * Reads a built route's HTML. Throws with the route name when the file is
 * missing, so a failed build reports the specific broken route instead of a
 * generic null dereference further down.
 */
function html(route: string): string {
  const path = route === '/' ? join(dist, 'index.html') : join(dist, route, 'index.html');
  if (!existsSync(path)) throw new Error(`route was not built: ${route} (expected ${path})`);
  return readFileSync(path, 'utf8');
}

/** Every built HTML file, so whole-site assertions need not repeat the walk. */
function builtHtmlFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.html')) files.push(full);
    }
  };
  walk(dist);
  return files;
}

const productionRoutes = contract.filter((p) => p.indexable_production);

test('all 13 contracted routes are pre-rendered as static HTML', () => {
  if (!hasBuild) return;
  assert.equal(productionRoutes.length, 13, 'contract should define 13 routes');
  for (const page of productionRoutes) {
    const markup: string = html(page.route);
    assert.ok(markup, `missing built HTML for ${page.route}`);
    assert.ok(markup.length > 2000, `${page.route} looks like a stub (${markup.length} bytes)`);
  }
});

test('each route carries its own title, description and H1', () => {
  if (!hasBuild) return;
  const titles = new Set();
  const descriptions = new Set();

  for (const page of productionRoutes) {
    const markup: string = html(page.route);

    const title = markup.match(/<title>([^<]*)<\/title>/)?.[1];
    assert.ok(title, `${page.route} has no <title>`);
    assert.ok(title.length <= 70, `${page.route} title too long: ${title.length}`);
    assert.ok(!titles.has(title), `duplicate title: ${title}`);
    titles.add(title);

    const desc = markup.match(/<meta name="description" content="([^"]*)"/)?.[1];
    assert.ok(desc, `${page.route} has no meta description`);
    assert.ok(desc.length >= 70 && desc.length <= 175, `${page.route} description length ${desc.length}`);
    assert.ok(!descriptions.has(desc), `duplicate description on ${page.route}`);
    descriptions.add(desc);

    // Exactly one H1, and it is the contracted one.
    const h1s = [...markup.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').trim(),
    );
    assert.equal(h1s.length, 1, `${page.route} should have exactly one H1, found ${h1s.length}`);
    assert.equal(h1s[0], page.h1, `${page.route} H1 mismatch`);

    // Canonical must be absolute and self-referencing.
    const canonical = markup.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    assert.ok(canonical, `${page.route} has no canonical`);
    assert.ok(canonical.startsWith('http'), `${page.route} canonical not absolute`);
    assert.ok(canonical.endsWith(page.route), `${page.route} canonical should end with its route`);
  }
});

test('WhatsApp number is exactly the published digits', () => {
  if (!hasBuild) return;
  // Every WhatsApp href in the whole build must carry the same digits.
  const files = builtHtmlFiles();

  const found = new Set();
  for (const file of files) {
    const markup = readFileSync(file, 'utf8');
    for (const match of markup.matchAll(/phone=(\d+)/g)) found.add(match[1]);
  }

  assert.equal(found.size, 1, `expected one phone number across the build, found: ${[...found]}`);
  const [digits] = [...found];
  assert.ok(digits, 'no phone digits found in the build');
  assert.equal(digits, '554784824814', `wrong phone digits: ${digits}`);
  // The digits must not have gained a ninth mobile digit.
  assert.equal(digits.length, 12, 'phone should be 55 + 47 + 8 digits');
});

test('no template placeholder, fake contact or Lorem ipsum survives', () => {
  if (!hasBuild) return;
  const banned = [
    'Lorem ipsum',
    'contact@example.com',
    '123 Fifth Avenue',
    '800-123-456',
    'NY 10160',
    'Who We Are',
    'Our Mission',
    'example.com',
    'TODO',
    'FIXME',
    'lorem',
  ];
  const files = builtHtmlFiles();

  for (const file of files) {
    const markup = readFileSync(file, 'utf8');
    for (const term of banned) {
      assert.ok(
        !markup.includes(term),
        `${file.replace(root, '')} still contains "${term}"`,
      );
    }
  }
});

test('no fabricated business claim appears in the markup', () => {
  if (!hasBuild) return;
  // Claims the briefing explicitly refused to make. Checked case-insensitively
  // and accent-insensitively so "consertos"/"consertos" style variants cannot slip past.
  // Collapses all whitespace to single spaces. Without this, a sentence
  // broken across source lines ("ela nao\n  elimina virus") would not match
  // its own negation and a legitimate refusal would be reported as a claim.
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ');

  // Each is an ASSERTED claim. A phrase like "não elimina vírus" is a refusal
  // of the claim and must stay allowed, so every entry below is matched only
  // when it is NOT preceded by a negation within the same sentence.
  const banned = [
    'mais de 10 anos',
    '10 anos de experiencia',
    'garantia de 1 ano',
    'garantia de um ano',
    'total satisfacao',
    'livre de fungos',
    'elimina virus',
    'eliminacao de virus',
    'atendimento 24h',
    'plantao 24',
    'principal referencia',
    'certificada nr-35',
    'certificacao nr-35',
    'assistencia autorizada',
    'receitas de cliente',
    'clientes satisfeitos',
  ];

  /**
   * Markers that turn an asserted claim into an explicit refusal of it.
   *
   * These are matched as SUBSTRINGS surrounding the claim, because the
   * refusal can be phrased at several distances:
   *   "ela nao elimina virus"                  -> 'nao ' immediately before
   *   "nao e correto prometer eliminacao de virus" -> 'prometer ' before
   *   "sem eliminacao de virus"                -> 'sem ' immediately before
   */
  const negations = [
    'nao ',
    'nunca ',
    'jamais ',
    'sem ',
    'evita ',
    'evitar ',
    'promete ',
    'prometer ',
    'prometeu ',
    'prometer ',
    'proibido ',
    'incorreto ',
    'errado ',
    'garantir ',
    'garantia de ',
  ];

  const files = builtHtmlFiles();

  for (const file of files) {
    const text = normalize(readFileSync(file, 'utf8'));
    for (const claim of banned) {
      const needle = normalize(claim);
      let from = 0;
      for (;;) {
        const at = text.indexOf(needle, from);
        if (at === -1) break;
        from = at + needle.length;

        // Look at the clause containing the claim, not the whole document.
        const start = Math.max(0, text.lastIndexOf('.', at) + 1);
        const stop = text.indexOf('.', at);
        const end = stop === -1 ? text.length : stop;
        const clause = text.slice(start, end);

        // A refusal is a negation marker anywhere in the SAME clause: it may
        // sit before the claim ("nao e correto prometer eliminacao") or be a
        // complementary clause joined to it ("nao elimina X nem Y").
        const negated = negations.some((n) => clause.includes(n));
        assert.ok(
          negated,
          `${file.replace(root, '')} asserts "${claim}" (found in: ...${clause.trim().slice(0, 90)}...)`,
        );
      }
    }
  }
});

test('every internal link resolves to a real built file', () => {
  if (!hasBuild) return;
  const files = builtHtmlFiles();

  const missing = [];
  for (const file of files) {
    const markup = readFileSync(file, 'utf8');
    const hrefs = [...markup.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
    for (const href of new Set(hrefs)) {
      // Static assets live as files; pages live as <route>/index.html.
      const clean = href.replace(/\/$/, '');
      const asFile = join(dist, clean);
      const asDir = join(dist, clean, 'index.html');
      if (!existsSync(asFile) && !existsSync(asDir)) {
        missing.push(`${file.replace(root, '')} -> ${href}`);
      }
    }
  }
  assert.deepEqual(missing, [], `unresolved internal links:\n${missing.join('\n')}`);
});

test('retired template routes are absent from navigation and sitemap', () => {
  if (!hasBuild) return;
  const retired = ['/ola-mundo/', '/pagina-exemplo/', '/author/projetos/', '/category/sem-categoria/'];

  for (const route of retired) {
    assert.ok(!existsSync(join(dist, route.replace(/\/$/, ''), 'index.html')), `${route} was rebuilt`);

    const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
    assert.ok(!sitemap.includes(route), `${route} leaked into sitemap.xml`);

    for (const file of readdirSync(dist)) {
      const path = join(dist, file, 'index.html');
      if (existsSync(path)) {
        const markup = readFileSync(path, 'utf8');
        assert.ok(!markup.includes(`href="${route}"`), `${route} linked from ${file}`);
      }
    }
  }
});

test('every image declares width and height and never upscales', () => {
  if (!hasBuild) return;
  // Registry facts mirrored from src/data/site.ts.
  const plan = {
    heroTecnico: { width: 960, max: 720 },
    alpinismoFachada: { width: 1280, max: 900 },
    instalacaoInterna: { width: 960, max: 800 },
    tecnicoInstrumentos: { width: 960, max: 800 },
    predioInstalacoes: { width: 960, max: 800 },
    lucasRetrato: { width: 960, max: 800 },
    condensadorFachada: { width: 1280, max: 900 },
    rapelServico: { width: 960, max: 800 },
    instrumentosServico: { width: 1012, max: 640 },
  };

  const dirs: Record<string, string> = {
    heroTecnico: 'hero',
    alpinismoFachada: 'height',
    instalacaoInterna: 'install',
    tecnicoInstrumentos: 'process',
    predioInstalacoes: 'buildings',
    lucasRetrato: 'people',
    condensadorFachada: 'gallery',
    rapelServico: 'gallery',
    instrumentosServico: 'process',
  };
  const stems: Record<string, string> = {
    heroTecnico: 'tecnico-em-altura',
    alpinismoFachada: 'alpinismo-fachada',
    instalacaoInterna: 'instalacao-interna',
    tecnicoInstrumentos: 'tecnico-instrumentos',
    predioInstalacoes: 'predio-instalacoes',
    lucasRetrato: 'lucas-retrato',
    condensadorFachada: 'condensador-fachada',
    rapelServico: 'rapel-servico',
    instrumentosServico: 'instrumentos-em-servico',
  };

  for (const [slug, spec] of Object.entries(plan)) {
    assert.ok(spec.max <= spec.width, `${slug}: maxRender ${spec.max} exceeds source ${spec.width}`);
    const dir = dirs[slug];
    const stem = stems[slug];
    assert.ok(dir && stem, `no media mapping for ${slug}`);

    // No emitted file may exceed the source width.
    const mediaDir = join(dist, 'media', dir);
    if (!existsSync(mediaDir)) continue;
    for (const file of readdirSync(mediaDir)) {
      const m = file.match(/-(\d+)\.(jpg|webp|avif)$/);
      if (!m || !file.startsWith(stem)) continue;
      assert.ok(
        Number(m[1]) <= spec.width,
        `${file} is wider than its ${spec.width}px source (would upscale)`,
      );
    }
  }

  // Every <img> in the build must carry explicit dimensions: no CLS, and no
  // layout shift while a photograph loads.
  const files = builtHtmlFiles();
  for (const file of files) {
    const markup = readFileSync(file, 'utf8');
    for (const img of markup.matchAll(/<img\b[^>]*>/g)) {
      const tag = img[0];
      assert.match(tag, /\bwidth="\d+"/, `${file.replace(root, '')}: <img> without width`);
      assert.match(tag, /\bheight="\d+"/, `${file.replace(root, '')}: <img> without height`);
      assert.match(tag, /\balt="/, `${file.replace(root, '')}: <img> without alt`);
    }
  }
});

test('JSON-LD is valid, references one Organization id, and invents no address', () => {
  if (!hasBuild) return;
  for (const page of productionRoutes) {
    const markup: string = html(page.route);
    const blocks = [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.ok(blocks.length >= 1, `${page.route} has no JSON-LD`);

    for (const block of blocks) {
      const data = JSON.parse(block[1]);
      assert.equal(data['@context'], 'https://schema.org');
      assert.ok(Array.isArray(data['@graph']), `${page.route} graph must be an array`);

      const text = JSON.stringify(data);
      // No fabricated postal address, geo, hours, rating or price.
      for (const banned of ['PostalAddress', 'streetAddress', 'openingHours', 'aggregateRating', 'priceRange', 'geo']) {
        assert.ok(!text.includes(banned), `${page.route} JSON-LD invents ${banned}`);
      }
    }

    // The home page must carry Organization + WebSite.
    if (page.route === '/') {
      const data = JSON.parse(blocks[0][1]);
      const types = data['@graph'].map((n: { '@type': string }) => n['@type']);
      assert.ok(types.includes('Organization'), 'home missing Organization');
      assert.ok(types.includes('WebSite'), 'home missing WebSite');
    }
    // Inner pages must carry a breadcrumb.
    if (page.route !== '/') {
      const data = JSON.parse(blocks[0][1]);
      const types = data['@graph'].map((n: { '@type': string }) => n['@type']);
      assert.ok(types.includes('BreadcrumbList'), `${page.route} missing BreadcrumbList`);
    }
  }
});

test('preview build is noindex and production build is indexable', () => {
  if (!hasBuild) return;
  const markup = readFileSync(join(dist, 'index.html'), 'utf8');
  const robots = markup.match(/<meta name="robots" content="([^"]*)"/)?.[1];
  assert.ok(robots, 'no robots meta on home');
  // Default (no SITE_MODE) must be the safe preview state.
  assert.ok(robots.includes('noindex'), `default build should be noindex, got "${robots}"`);

  const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  const urls = (sitemap.match(/<loc>/g) || []).length;
  assert.equal(urls, 0, 'preview sitemap must not advertise indexable pages');
});

/** The contracted opening messages, mirrored from src/data/site.ts. */
const WHATSAPP_MESSAGES = [
  'Olá, gostaria de conversar sobre um serviço de climatização em Joinville.',
  'Olá, gostaria de um orçamento para instalação de ar-condicionado. Posso enviar informações e fotos do local?',
  'Olá, preciso avaliar um serviço em prédio/apartamento com acesso em altura. Posso enviar fotos?',
  'Olá, gostaria de avaliar um problema no funcionamento do meu ar-condicionado.',
  'Olá, gostaria de conversar sobre um projeto de tubulação flexível PEX/EPEX.',
];

test('WhatsApp links are contextual and never send on their own', () => {
  if (!hasBuild) return;
  const markup = readFileSync(join(dist, 'index.html'), 'utf8');
  const hrefs = [...markup.matchAll(/href="(https:\/\/api\.whatsapp\.com\/[^"]*)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 2, 'home should link WhatsApp from more than one place');

  for (const href of hrefs) {
    const plain = href.replace(/&amp;/g, '&');
    assert.ok(plain.includes('1=pt_BR'), `lost the pt_BR flag: ${plain}`);
    assert.ok(plain.includes('phone=554784824814'), `lost the phone: ${plain}`);
    if (href.includes('&text=')) {
      // The whole href is HTML-escaped in the source (&amp;), so unescape
      // before inspecting the query string, then require strict encoding.
      const decoded = href.replace(/&amp;/g, '&');
      const raw = decoded.split('&text=')[1];
      assert.ok(raw, `text param missing: ${href}`);

      // Must contain no raw space, no raw accented letter and no raw
      // punctuation: encodeURIComponent output only.
      assert.ok(!raw.includes(' '), `raw space in encoded text: ${href}`);
      assert.ok(!/[^\x21-\x7E]/.test(raw), `non-ASCII left unencoded: ${href}`);
      assert.ok(raw.includes('%'), `text looks unencoded: ${href}`);

      // And it must round-trip back to the intended message.
      assert.equal(decodeURIComponent(raw), WHATSAPP_MESSAGES[0]);
    }
    // Must never be a submit-style or auto-firing construct.
    assert.ok(!markup.includes('window.location'), 'no script navigation to WhatsApp');
  }
});

test('Instagram opens in a new tab with safe rel', () => {
  if (!hasBuild) return;
  const files = builtHtmlFiles();
  for (const file of files) {
    const markup = readFileSync(file, 'utf8');
    for (const match of markup.matchAll(/<a\b[^>]*instagram\.com[^>]*>/g)) {
      assert.match(match[0], /target="_blank"/, `${file.replace(root, '')}: Instagram without target=_blank`);
      assert.match(match[0], /rel="[^"]*noopener/, `${file.replace(root, '')}: Instagram without noopener`);
    }
  }
});

test('mobile fixed contact bar does not double up with a floating bubble', () => {
  if (!hasBuild) return;
  for (const page of productionRoutes) {
    const markup: string = html(page.route);
    const bars = (markup.match(/class="contact-bar"/g) || []).length;
    assert.equal(bars, 1, `${page.route} should have exactly one contact bar`);
    // There must be no separate floating bubble anywhere.
    assert.ok(!/floating-?bubble|wa-bubble/i.test(markup), `${page.route} has a second WhatsApp bubble`);
  }
});

test('FAQ uses native details/summary and no FAQPage rich-result claim', () => {
  if (!hasBuild) return;
  // The FAQ must be real, visible content.
  const markup = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.match(markup, /<details/, 'home FAQ should use native details');
  assert.match(markup, /<summary/, 'home FAQ should use native summary');

  // Google withdrew the FAQ rich result; claiming it would be a false promise.
  for (const page of productionRoutes) {
    const text = html(page.route);
    assert.ok(!text.includes('FAQPage'), `${page.route} must not emit FAQPage markup`);
  }
});

test('contact page has no fake submission form', () => {
  if (!hasBuild) return;
  const markup = readFileSync(join(dist, 'contact', 'index.html'), 'utf8');
  assert.ok(!/<form/i.test(markup), 'contact page must not ship a form with no backend');
});

test('source data has no fabricated contact fields', () => {
  const text = siteData.toLowerCase();
  for (const banned of ['email:', 'cnpj', 'openingHours', 'address:', 'rua ', 'latitude']) {
    assert.ok(!text.includes(banned.toLowerCase()), `site.ts defines a fabricated field: ${banned}`);
  }
  // The published phone must be present exactly once as the canonical value.
  assert.ok(siteData.includes("'554784824814'"), 'published phone digits missing from site.ts');
});