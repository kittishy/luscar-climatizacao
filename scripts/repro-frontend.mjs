/**
 * Reproduces the defects recorded in VALIDACAO-FRONTEND-2026-10-06.md and
 * prints COMPUTED styles, not source values.
 *
 *   node scripts/repro-frontend.mjs
 *
 * Run against the live demonstration or a local build:
 *   TARGET=https://luscar-climatizacao.vercel.app node scripts/repro-frontend.mjs
 */

import { chromium } from 'playwright';

const BASE = process.env.TARGET ?? 'http://127.0.0.1:4321';

/** Relative luminance / contrast, computed from resolved rgb() strings. */
function srgb(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function lum([r, g, b]) {
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function parse(str) {
  const m = String(str).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function contrast(fg, bg) {
  const a = parse(fg);
  const b = parse(bg);
  if (!a || !b) return null;
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return Number(((x + 0.05) / (y + 0.05)).toFixed(2));
}

const b = await chromium.launch();
const out = [];
const say = (s) => {
  console.log(s);
  out.push(s);
};

try {
  // ---------------------------------------------------------------- P1 #1
  say('\n=== P1 #1  menu compacto: botao "Pedirorcamento" ===');
  {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(`${BASE}/`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.locator('#nav-toggle').click();
    await p.waitForTimeout(300);

    const probe = await p.evaluate(() => {
      const btn = document.querySelector('.nav-panel__cta .btn');
      if (!(btn instanceof HTMLElement)) return null;
      const panel = document.querySelector('.nav-panel');
      const ps = panel ? getComputedStyle(panel) : null;
      const r = btn.getBoundingClientRect();
      return {
        color: getComputedStyle(btn).color,
        background: getComputedStyle(btn).backgroundColor,
        border: getComputedStyle(btn).borderColor,
        w: Math.round(r.width),
        h: Math.round(r.height),
        panelColor: ps?.color ?? null,
        classes: btn.className,
        matched: [...document.styleSheets]
          .flatMap((sh) => {
            try {
              return [...sh.cssRules];
            } catch {
              return [];
            }
          })
          .flatMap((r2) => {
            try {
              return r2.selectorText ? [[r2.selectorText, r2.style?.color ?? '']] : [];
            } catch {
              return [];
            }
          })
          .filter(([sel]) => sel && btn.matches(sel.split(',')[0].trim()))
          .map(([sel, c]) => `${sel} { color: ${c} }`),
      };
    });

    if (!probe) {
      say('  !! CTA nao encontrado no painel');
    } else {
      const cr = contrast(probe.color, probe.background);
      const inherited = probe.matched.filter((m) => /nav-panel a/.test(m));
      say(`  size          ${probe.w} x ${probe.h}`);
      say(`  color         ${probe.color}`);
      say(`  background    ${probe.background}`);
      say(`  contrast      ${cr}:1  ${cr !== null && cr < 4.5 ? '  <-- FALHA (texto pequeno exige 4.5:1)' : ''}`);
      say(`  classes       ${probe.classes}`);
      say(`  regra vencendo: ${inherited.length ? inherited.join(' | ') : '(nenhuma .nav-panel a)'}`);
    }

    // Focus containment: can the keyboard reach controls hidden behind the panel?
    const behind = await p.evaluate(() => {
      const panel = document.querySelector('.nav-panel');
      const pr = panel.getBoundingClientRect();
      const hits = [];
      for (const el of document.querySelectorAll('a[href], button')) {
        if (el.closest('.nav-panel') || el.id === 'nav-toggle') continue;
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        const overlaps =
          r.right > pr.left && r.left < pr.right && r.bottom > pr.top && r.top < pr.bottom;
        if (overlaps) {
          // `tabIndex >= 0` alone is NOT proof of reachability: an inert element
          // still reports a non-negative tabIndex while being removed from the
          // focus order. The real test is whether focus() actually lands on it.
          const inert = el.closest('[inert]') !== null;
          el.focus();
          const reachable = document.activeElement === el;
          if (reachable) el.blur();
          hits.push({
            text: (el.textContent || '').trim().slice(0, 28),
            inert,
            reachable,
          });
        }
      }
      return hits;
    });
    const reachableBehind = behind.filter((h) => h.reachable);
    say(
      `  controles sobrepostos ao painel: ${behind.length} | focaveis de verdade: ${reachableBehind.length}`,
    );
    for (const h of behind.slice(0, 6)) {
      say(
        `    "${h.text}" inert=${h.inert} focavel=${h.reachable}${h.reachable ? '  <-- FOCÁVEL ATRÁS DO PAINEL' : ''}`,
      );
    }
    await p.close();
  }

  // ---------------------------------------------------------------- P1 #2
  say('\n=== P1 #2  rodape: seletores e contraste ===');
  {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(`${BASE}/contact/`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);

    const probe = await p.evaluate(() => {
      const footer = document.querySelector('.site-footer');
      const heading = footer?.querySelector('h2');
      const navLink = footer?.querySelector('li a');
      const bottomLink = footer?.querySelector('.footer__bottom a');
      const list = footer?.querySelector('ul');
      const bg = footer ? getComputedStyle(footer).backgroundColor : null;
      const read = (el) => {
        if (!(el instanceof HTMLElement)) return null;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          color: s.color,
          listStyle: s.listStyleType,
          textDecoration: s.textDecorationLine,
          minHeight: s.minHeight,
          h: Math.round(r.height),
          text: (el.textContent || '').trim().slice(0, 24),
        };
      };
      return {
        hasFooterClass: footer?.className ?? null,
        bg,
        heading: read(heading),
        navLink: read(navLink),
        bottomLink: read(bottomLink),
        listStyle: list ? getComputedStyle(list).listStyleType : null,
      };
    });

    say(`  elemento      class="${probe.hasFooterClass}"`);
    say(`  fundo         ${probe.bg}`);
    for (const key of ['heading', 'navLink', 'bottomLink']) {
      const v = probe[key];
      if (!v) {
        say(`  ${key.padEnd(12)} (ausente)`);
        continue;
      }
      const cr = contrast(v.color, probe.bg);
      say(
        `  ${key.padEnd(12)} color=${v.color}  contrast=${cr}:1  ` +
          `${cr !== null && cr < 4.5 ? '<-- FALHA' : 'ok'}  ` +
          `list=${v.listStyle}  deco=${v.textDecoration}  minH=${v.minHeight}  h=${v.h}  "${v.text}"`,
      );
    }
    say(`  marcadores de lista: ${probe.listStyle}${probe.listStyle && probe.listStyle !== 'none' ? '  <-- FALHA' : ''}`);
    await p.close();
  }

  // ---------------------------------------------------------------- P2 #3
  say('\n=== P2 #3  PageHead herdando order da secao altitude ===');
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/instalacao-ar-condicionado-joinville/`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const probe = await p.evaluate(() => {
      const grid = document.querySelector('.page-head__grid');
      const copy = grid?.querySelector('div');
      const fig = grid?.querySelector('figure');
      const h1 = grid?.querySelector('h1');
      const rc = copy?.getBoundingClientRect();
      const rf = fig?.getBoundingClientRect();
      return {
        gridW: Math.round(grid?.getBoundingClientRect().width ?? 0),
        copyW: Math.round(rc?.width ?? 0),
        copyLeft: Math.round(rc?.left ?? 0),
        figW: Math.round(rf?.width ?? 0),
        figLeft: Math.round(rf?.left ?? 0),
        figClass: fig?.className ?? null,
        h1W: Math.round(h1?.getBoundingClientRect().width ?? 0),
        h1H: Math.round(h1?.getBoundingClientRect().height ?? 0),
      };
    });
    say(`  figura        class="${probe.figClass}"`);
    say(`  grid          ${probe.gridW}px`);
    say(`  texto         ${probe.copyW}px @left ${probe.copyLeft}`);
    say(`  foto          ${probe.figW}px @left ${probe.figLeft}`);
    say(
      `  foto vem antes do texto? ${probe.figLeft < probe.copyLeft ? 'SIM (order:-1 vazou do .altitude)' : 'nao'}` +
        `${probe.figLeft < probe.copyLeft ? '  <-- FALHA' : ''}`,
    );
    say(`  H1            ${probe.h1W}x${probe.h1H}`);
    await p.close();
  }

  // ---------------------------------------------------------------- P2 #4
  say('\n=== P2 #4  galeria: marcadores e botao de fechar ===');
  {
    const p = await b.newPage({ viewport: { width: 768, height: 1024 } });
    await p.goto(`${BASE}/projects/`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const list = await p.evaluate(() => {
      const ul = document.querySelector('.gallery');
      if (!ul) return null;
      const li = ul.querySelector('li');
      return {
        listStyle: getComputedStyle(ul).listStyleType,
        liMarker: li ? getComputedStyle(li).listStyleType : null,
      };
    });
    say(`  .gallery list-style: ${list?.listStyle}${list && list.listStyle !== 'none' ? '  <-- FALHA' : ''}`);

    await p.locator('[data-gallery-open]').first().click();
    await p.waitForTimeout(400);
    const close = await p.evaluate(() => {
      const btn = document.querySelector('[data-lightbox-close]');
      if (!(btn instanceof HTMLElement)) return null;
      const r = btn.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), scrollW: btn.scrollWidth, text: (btn.textContent || '').trim() };
    });
    say(`  botao fechar   ${close?.w}x${close?.h}  scrollWidth=${close?.scrollW}  texto="${close?.text}"`);
    say(
      `  conteudo cabe? ${close && close.scrollW <= close.w ? 'sim' : 'NAO <-- FALHA'}`,
    );
    await p.close();
  }

  // ---------------------------------------------------------------- hero
  say('\n=== hero: medidas por viewport ===');
  for (const [w, h] of [[1440, 900], [1366, 768], [1024, 768], [900, 800], [768, 1024], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(`${BASE}/`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(250);
    const m = await p.evaluate(() => {
      const copy = document.querySelector('.hero__copy');
      const media = document.querySelector('.hero__media');
      const h1 = document.querySelector('h1');
      const lead = document.querySelector('.hero__lead');
      const hero = document.querySelector('.hero');
      const cs = h1 ? getComputedStyle(h1) : null;
      return {
        copyW: Math.round(copy?.getBoundingClientRect().width ?? 0),
        mediaW: Math.round(media?.getBoundingClientRect().width ?? 0),
        mediaTop: Math.round(media?.getBoundingClientRect().top ?? 0),
        h1W: Math.round(h1?.getBoundingClientRect().width ?? 0),
        h1H: Math.round(h1?.getBoundingClientRect().height ?? 0),
        h1Lines: cs ? Math.round(h1.getBoundingClientRect().height / parseFloat(cs.lineHeight)) : 0,
        h1Font: cs?.fontSize,
        leadH: Math.round(lead?.getBoundingClientRect().height ?? 0),
        heroH: Math.round(hero?.getBoundingClientRect().height ?? 0),
      };
    });
    say(`  ${w}x${h}`);
    say(`    texto ${m.copyW}px | foto ${m.mediaW}px @y${m.mediaTop} | H1 ${m.h1W}x${m.h1H} ${m.h1Lines} linhas @${m.h1Font}`);
    say(`    apoio ${m.leadH}px | hero ${m.heroH}px`);
    await p.close();
  }

  // ---------------------------------------------------------------- contact
  say('\n=== contact: ordem dos blocos ===');
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`${BASE}/contact/`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const order = await p.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return null;
      const heads = [...main.querySelectorAll('h2')].map((h) => ({
        text: (h.textContent || '').trim(),
        y: Math.round(h.getBoundingClientRect().top + window.scrollY),
      }));
      /*
       * The action that matters is the WhatsApp CTA in the page header, not any
       * WhatsApp link. `first.querySelector` used to return the header CTA here
       * only by accident; query it explicitly so the check tests what it claims.
       */
      const wa = document.querySelector('.page-head__actions a[href*="api.whatsapp.com"]');
      const waY = wa ? Math.round(wa.getBoundingClientRect().top + window.scrollY) : null;
      // Which h2 comes first, and does the service grid sit above or below the CTA?
      const grid = main.querySelector('.services-grid');
      const gridY = grid ? Math.round(grid.getBoundingClientRect().top + window.scrollY) : null;
      return {
        heads,
        waY,
        gridY,
        hasForm: Boolean(main.querySelector('form')),
        emptyCol: Boolean(
          document.querySelector('.page-head__grid')?.children.length === 1,
        ),
      };
    });
    say(`  CTA WhatsApp do header em y=${order?.waY}`);
    for (const hd of order?.heads ?? []) say(`    h2 y=${hd.y} "${hd.text}"`);
    say(
      `  grid de servicos y=${order?.gridY} apos o CTA: ${order?.gridY !== null && order?.waY !== null && order.gridY > order.waY ? 'SIM (ok)' : 'NAO <-- FALHA'}`,
    );
    say(`  formulario (nao deve existir): ${order?.hasForm ? 'SIM <-- FALHA' : 'nao'}`);
    await p.close();
  }
} finally {
  await b.close();
}

console.log(`\n${'='.repeat(60)}\nTARGET: ${BASE}\n${'='.repeat(60)}`);