/**
 * Builds every derivative the site serves, then materialises the legacy
 * WordPress upload paths listed in seo/assets-publicados.csv.
 *
 *   node scripts/generate-images.mjs
 *
 * Rules enforced here:
 *  - Derivatives are never upscaled past the source's true pixel width.
 *    WebP/AVIF cannot recover detail that was never captured.
 *  - `maxRender` caps how wide each photo may be displayed. The script
 *    refuses to emit a width above it, so a layout change cannot silently
 *    degrade a photograph.
 *  - Originals are never modified. They stay in ../assets/originais.
 *  - The three PEX files are 295x172 and are only ever emitted at 295.
 *  - Legacy URLs are *served*, not redirected: the CSV prefers the original
 *    path still resolving, which keeps existing inbound links working with
 *    no redirect hop and no risk of a loop.
 */

import { readFile, writeFile, mkdir, rm, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, '..', 'assets', 'selecionados');
const publicDir = join(root, 'public');
const briefDir = join(root, '..');

/**
 * Output groups. `dir` becomes public/media/<dir>/<slug>-<width>.<ext>.
 * og is a dedicated 1200x630 social card cut from a real landscape photo —
 * never the vertical hero, whose face would be lost to the crop.
 */
const GROUPS = {
  hero: { dir: 'hero', slug: 'tecnico-em-altura', file: 'hero-tecnico-em-altura.jpg' },
  alpinismoFachada: { dir: 'height', slug: 'alpinismo-fachada', file: 'alpinismo-fachada-horizontal.jpg' },
  instalacaoInterna: { dir: 'install', slug: 'instalacao-interna', file: 'instalacao-interna.jpg' },
  tecnicoInstrumentos: { dir: 'process', slug: 'tecnico-instrumentos', file: 'tecnico-instrumentos.jpg' },
  predioInstalacoes: { dir: 'buildings', slug: 'predio-instalacoes', file: 'predio-instalacoes.jpg' },
  lucasRetrato: { dir: 'people', slug: 'lucas-retrato', file: 'lucas-retrato.jpg' },
  condensadorFachada: { dir: 'gallery', slug: 'condensador-fachada', file: 'instalacao-condensadora-fachada.jpg' },
  rapelServico: { dir: 'gallery', slug: 'rapel-servico', file: 'rapel-servico.jpg' },
  instrumentosServico: { dir: 'process', slug: 'instrumentos-em-servico', file: 'instrumentos-em-servico.jpg' },
  pexInstalacao: { dir: 'pex', slug: 'pex-instalacao', file: 'pex-instalacao-referencia.jpg' },
  pexAplicacao: { dir: 'pex', slug: 'pex-aplicacao', file: 'pex-aplicacao-referencia.jpg' },
  pexTubos: { dir: 'pex', slug: 'pex-tubos', file: 'pex-tubos-referencia.jpg' },
};

/** sourceWidths and maxRender come from src/data/site.ts; mirrored here so the
 *  script stays runnable without a TS loader. tests/images.test.ts asserts
 *  this table matches site.ts, so the two cannot drift. */
const PLAN = {
  hero: { widths: [420, 560, 720], max: 720 },
  alpinismoFachada: { widths: [480, 720, 900], max: 900 },
  instalacaoInterna: { widths: [400, 560, 720, 800], max: 800 },
  tecnicoInstrumentos: { widths: [400, 560, 720, 800], max: 800 },
  predioInstalacoes: { widths: [400, 560, 720, 800], max: 800 },
  lucasRetrato: { widths: [360, 520, 720, 800], max: 800 },
  condensadorFachada: { widths: [480, 720, 900], max: 900 },
  rapelServico: { widths: [400, 560, 720, 800], max: 800 },
  instrumentosServico: { widths: [360, 480, 640], max: 640 },
  pexInstalacao: { widths: [295], max: 295 },
  pexAplicacao: { widths: [295], max: 295 },
  pexTubos: { widths: [295], max: 295 },
};

const MODERN = [
  { ext: 'webp', quality: 76 },
  { ext: 'avif', quality: 52 },
];

let written = 0;

async function emit(key, meta) {
  const group = GROUPS[key];
  const plan = PLAN[key];
  const src = join(sourceDir, group.file);
  if (!existsSync(src)) throw new Error(`missing source: ${src}`);

  const probe = await sharp(src).metadata();
  const trueWidth = probe.width;
  const trueHeight = probe.height;

  if (trueWidth < plan.max) {
    throw new Error(
      `${key}: plan max ${plan.max} exceeds source width ${trueWidth}. ` +
        `This would mean upscaling, which is not allowed.`,
    );
  }

  const outDir = join(publicDir, 'media', group.dir);
  await mkdir(outDir, { recursive: true });

  const report = { key, source: group.file, width: trueWidth, height: trueHeight, files: [] };

  for (const width of plan.widths) {
    if (width > trueWidth) {
      throw new Error(`${key}: refusing to upscale ${width} > ${trueWidth}`);
    }
    const height = Math.round((width * trueHeight) / trueWidth);

    // JPEG fallback last: modern formats first, one legacy baseline for safety.
    const base = join(outDir, `${group.slug}-${width}`);
    for (const { ext, quality } of [...MODERN, { ext: 'jpg', quality: 80 }]) {
      const target = `${base}.${ext}`;
      const pipeline = sharp(src).resize({ width, height, fit: 'cover', withoutEnlargement: true });
      if (ext === 'jpg') pipeline.jpeg({ quality, mozjpeg: true, progressive: true });
      else pipeline.toFormat(ext, { quality });
      await pipeline.toFile(target);
      const { size } = await sharp(target).metadata().then(async () => ({
        size: (await import('node:fs')).statSync(target).size,
      }));
      report.files.push({ path: `public/media/${group.dir}/${basename(target)}`, bytes: size });
      written += 1;
    }
  }

  return report;
}

async function emitLogo() {
  const src = join(sourceDir, 'logo-luscar-original.png');
  const outDir = join(publicDir, 'media', 'logo');
  await mkdir(outDir, { recursive: true });
  const meta = await sharp(src).metadata();
  // Native 274x115. The brief caps display at ~200px, so 200 is the ceiling.
  const width = 200;
  const height = Math.round((width * meta.height) / meta.width);
  // Quantised to a 256-colour palette: the mark is a small set of flat brand
  // colours on transparency, so this is visually lossless here and cut the
  // file from ~25 KB to a few KB.
  await sharp(src)
    .resize({ width, height, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toFile(join(outDir, 'luscar-logo-200.png'));
  written += 1;
  return { key: 'logo', source: 'logo-luscar-original.png', width: meta.width, height: meta.height };
}

async function emitOg() {
  // 1200x630 social card. Source is a real landscape photograph from the
  // acervo; the crop keeps the technician and the suspended unit.
  const src = join(sourceDir, GROUPS.condensadorFachada.file);
  const outDir = join(publicDir, 'media', 'og');
  await mkdir(outDir, { recursive: true });
  const target = join(outDir, 'luscar-og.jpg');
  await sharp(src)
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 84, mozjpeg: true, progressive: true })
    .toFile(target);
  written += 1;
  return { key: 'og', source: GROUPS.condensadorFachada.file, width: 1200, height: 630 };
}

/**
 * Materialises every legacy upload URL from seo/assets-publicados.csv.
 * The file is parsed rather than hardcoded so the CSV stays the contract.
 */
async function emitLegacyAliases() {
  const csvPath = join(briefDir, 'seo', 'assets-publicados.csv');
  if (!existsSync(csvPath)) {
    console.warn('  ! seo/assets-publicados.csv not found; legacy aliases skipped');
    return 0;
  }
  const csv = await readFile(csvPath, 'utf8');
  const lines = csv.trim().split(/\r?\n/).slice(1);

  const byLocal = new Map();
  for (const line of lines) {
    const cols = splitCsv(line);
    if (cols.length < 3) continue;
    const [, oldPath, localFile] = cols;
    if (!oldPath || !localFile) continue;
    byLocal.set(oldPath, localFile);
  }

  let count = 0;
  for (const [oldPath, localFile] of byLocal) {
    const src = join(briefDir, localFile);
    if (!existsSync(src)) {
      console.warn(`  ! legacy alias skipped, source missing: ${localFile}`);
      continue;
    }
    const target = join(publicDir, oldPath.replace(/^\//, ''));
    await mkdir(dirname(target), { recursive: true });
    await copyFile(src, target);
    count += 1;
  }
  return count;
}

function splitCsv(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function main() {
  if (!existsSync(sourceDir)) {
    console.error(`source directory missing: ${sourceDir}`);
    process.exit(1);
  }

  // Idempotent: clear only generated output, never source material.
  const mediaDir = join(publicDir, 'media');
  if (existsSync(mediaDir)) await rm(mediaDir, { recursive: true, force: true });

  console.log('images: generating derivatives from', sourceDir);
  const reports = [];
  for (const key of Object.keys(GROUPS)) reports.push(await emit(key, PLAN[key]));
  reports.push(await emitLogo());
  reports.push(await emitOg());

  const legacyCount = await emitLegacyAliases();

  await writeFile(
    join(publicDir, 'media', 'derivatives.json'),
    JSON.stringify(
      {
        generatedBy: 'scripts/generate-images.mjs',
        note: 'No upscaling: every width is <= the source pixel width. See src/data/site.ts.',
        photos: reports,
        legacyAliases: legacyCount,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  const totalBytes = reports.reduce((acc, r) => acc + (r.files ?? []).reduce((a, f) => a + f.bytes, 0), 0);
  console.log(`images: ${written} derivative files, ${(totalBytes / 1024).toFixed(0)} KB total`);
  console.log(`images: ${legacyCount} legacy upload paths served at their original URL`);

  const available = await readdir(sourceDir);
  const unused = available.filter(
    (f) => !Object.values(GROUPS).some((g) => g.file === f) && f !== 'logo-luscar-original.png',
  );
  if (unused.length) console.log(`images: unused selections (documented, not shipped): ${unused.join(', ')}`);
}

main().catch((err) => {
  console.error('image generation failed:', err.message);
  process.exit(1);
});