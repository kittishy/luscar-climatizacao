/**
 * Where the site is being published, and where it says it lives.
 *
 * Two independent decisions, deliberately kept apart:
 *
 *   SITE_MODE   =production  the build is indexable: robots and sitemap
 *                             advertise the routes, and vercel.json carries
 *                             `X-Robots-Tag: index, follow`. Absent or
 *                             anything else, the site is `preview`: noindex in
 *                             the head and at the edge, empty sitemap.
 *
 *   SITE_ORIGIN              the host every canonical, og:url, JSON-LD url and
 *                             sitemap entry is built from.
 *
 * WHY THEY ARE SEPARATE
 *
 * They used to be one decision: any production build unconditionally took the
 * client domain as its origin. That made "indexable, but served somewhere else"
 * inexpressible, and since the client domain still hosts the previous site, the
 * only reachable form of production would have canonicalised every new page
 * onto an old one.
 *
 * The client domain remains the DEFAULT for production, so moving the site to
 * it later needs no code change at all: set SITE_ORIGIN, rebuild.
 *
 * This module has no imports on purpose. `tests/contract.test.ts` loads it with
 * bare `node` to resolve the four combinations of mode and origin, which is the
 * only place the default-safety property is actually asserted.
 */

export type SiteMode = 'preview' | 'production';

/** The address the site will occupy at its eventual cutover. */
export const CLIENT_ORIGIN = 'https://luscarjoinville.com.br';

/** Where this build is actually served from. */
export const HOSTED_ORIGIN = 'https://luscar-climatizacao.vercel.app';

export function getMode(): SiteMode {
  return process.env.SITE_MODE === 'production' ? 'production' : 'preview';
}

/**
 * The origin every absolute URL is built from, never with a trailing slash.
 * `SITE_ORIGIN` wins whenever it holds a value; otherwise the mode picks the
 * default.
 *
 * An EMPTY value counts as unset. `??` alone would treat `''` as a deliberate
 * choice and emit canonicals like `//instalacao-...`, and clearing a variable
 * in the Vercel dashboard leaves it present but empty far more often than it
 * removes the key.
 */
export function getOrigin(): string {
  const configured = (process.env.SITE_ORIGIN ?? '').trim();
  const fallback = getMode() === 'production' ? CLIENT_ORIGIN : HOSTED_ORIGIN;
  return (configured || fallback).replace(/\/$/, '');
}