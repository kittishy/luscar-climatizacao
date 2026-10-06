/**
 * SEO primitives. Every page builds its metadata through these helpers so a
 * title, canonical, OG tag or JSON-LD block can never drift from the site mode.
 */

import { contacts, site } from './site.js';
import { getMode, getOrigin, type SiteMode } from './env.js';

/*
 * Mode and origin resolution lives in ./env.ts, which has no imports so the
 * tests can exercise it directly with bare node. Re-exported here because every
 * consumer of "which mode / which origin" is doing SEO work.
 */
export { getMode, getOrigin };
export type { SiteMode };

/** Absolute URL for a route. Routes are already slash-terminated. */
export function absoluteUrl(route: string, base?: string): string {
  const root = (base ?? getOrigin()).replace(/\/$/, '');
  return `${root}${route.startsWith('/') ? route : `/${route}`}`;
}

/** Every route in the contract, in sitemap order. */
export const ALL_ROUTES: readonly string[] = [
  '/',
  '/servicos-de-climatizacao-ar-condicionado-joinville/',
  '/instalacao-ar-condicionado-joinville/',
  '/instalacao-de-ar-condicionado-predios-joinville/',
  '/instalacao-ar-condicionado-predio-apartamento-alpinismo-joinville/',
  '/concertos-e-manutencao-ar-condicionado-joinville/',
  '/limpeza-ar-condicionado-joinville/',
  '/encanador-tubulacao-flexivel-pex-e-epex-joinville/',
  '/about/',
  '/projects/',
  '/contact/',
  '/guias/instalacao-ar-condicionado-apartamento/',
  '/guias/ar-condicionado-nao-gela/',
];

export interface PageMeta {
  route: string;
  title: string;
  description: string;
  h1: string;
  /** Page-specific breadcrumb trail; home has none. */
  breadcrumb?: readonly { name: string; route: string }[];
  type?: 'website' | 'article';
  /** Set on guides. Honest authorship only: Luscar as publisher. */
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * robots meta.
 *
 * Preview emits noindex but never blocks the crawler with a disallow — a
 * blocked crawler cannot read the noindex it is meant to honour. That blocking
 * is handled at the edge via X-Robots-Tag, which allows reading and
 * discourages indexing.
 */
export function robotsMeta(): string {
  return getMode() === 'production'
    ? 'index, follow, max-image-preview:large'
    : 'noindex, follow, max-image-preview:large';
}

export function canonicalFor(route: string): string {
  return absoluteUrl(route);
}

/** Organization node, referenced by @id from every other graph on the site. */
export const ORGANIZATION_ID = `${getOrigin()}/#organization`;
export const WEBSITE_ID = `${getOrigin()}/#website`;

function organization() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: site.name,
    url: getOrigin() + '/',
    logo: {
      '@type': 'ImageObject',
      // Points at the real published logo, not a fabricated square badge.
      url: absoluteUrl('/media/logo/luscar-logo-200.png'),
      width: 200,
      height: 84,
      caption: site.name,
    },
    image: absoluteUrl('/media/hero/tecnico-em-altura-720.jpg'),
    telephone: contacts.whatsappE164,
    areaServed: {
      '@type': 'AdministrativeArea',
      name: site.areaServed,
    },
    sameAs: [contacts.instagram],
  };
}

/**
 * Deliberate omissions, documented rather than silently missing:
 *  - no PostalAddress, no geo: no commercial address was ever confirmed.
 *  - no openingHours: no schedule was ever confirmed.
 *  - no aggregateRating / review: no rating data exists.
 *  - no priceRange: no pricing exists.
 * Fabricating any of these would make the markup a lie the page does not show.
 */
export interface ServiceSchemaInput {
  name: string;
  description: string;
  route: string;
}

export interface SchemaGraph {
  '@context': 'https://schema.org';
  '@graph': Record<string, unknown>[];
}

function webPage(meta: PageMeta): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@type': meta.type === 'article' ? 'Article' : 'WebPage',
    '@id': absoluteUrl(meta.route) + '#webpage',
    url: absoluteUrl(meta.route),
    name: meta.title,
    description: meta.description,
    inLanguage: 'pt-BR',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
  };
  if (meta.type === 'article') {
    node.headline = meta.h1;
    node.datePublished = meta.publishedTime;
    node.dateModified = meta.modifiedTime ?? meta.publishedTime;
    // Honest authorship: the company publishes the guide. No individual is
    // credited as a technical reviewer, because no reviewer was ever confirmed.
    node.publisher = { '@id': ORGANIZATION_ID };
    node.author = { '@id': ORGANIZATION_ID };
    node.image = absoluteUrl('/media/og/luscar-og.jpg');
  }
  return node;
}

function breadcrumbList(meta: PageMeta): Record<string, unknown> | null {
  if (!meta.breadcrumb?.length) return null;
  return {
    '@type': 'BreadcrumbList',
    '@id': absoluteUrl(meta.route) + '#breadcrumb',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: getOrigin() + '/' },
      ...meta.breadcrumb.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: crumb.name,
        item: absoluteUrl(crumb.route),
      })),
    ],
  };
}

/**
 * Builds the JSON-LD graph for a page.
 *
 * @param service When present, a Service node is emitted with provider
 *   referencing the shared Organization @id.
 */
export function buildSchema(meta: PageMeta, service?: ServiceSchemaInput): SchemaGraph {
  const graph: Record<string, unknown>[] = [webPage(meta)];
  const crumbs = breadcrumbList(meta);
  if (crumbs) graph.push(crumbs);

  if (meta.route === '/') {
    graph.push(organization());
    graph.push({
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: getOrigin() + '/',
      name: site.name,
      description: meta.description,
      inLanguage: 'pt-BR',
      publisher: { '@id': ORGANIZATION_ID },
    });
  }

  if (service) {
    graph.push({
      '@type': 'Service',
      '@id': absoluteUrl(service.route) + '#service',
      name: service.name,
      description: service.description,
      serviceType: service.name,
      url: absoluteUrl(service.route),
      inLanguage: 'pt-BR',
      provider: { '@id': ORGANIZATION_ID },
      areaServed: { '@type': 'AdministrativeArea', name: site.areaServed },
      // No offers: no price exists to offer.
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}