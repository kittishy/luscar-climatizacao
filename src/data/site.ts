/**
 * Single source of truth for identity, contacts, services and routes.
 *
 * Nothing in this file may be invented. Every contact value is a published
 * contact of Luscar Climatizacao; every omission is deliberate (see
 * docs/LIMITACOES.md). Templates must import from here - never hardcode a
 * number, a handle or a route string inside a component.
 */

export const site = {
  name: 'Luscar Climatização',
  /** The logo also carries the alpinismo industrial mark; the name stays as published. */
  region: 'Joinville',
  regionFull: 'Joinville/SC e região',
  regionState: 'SC',
  country: 'BR',
  /** Only used for schema areaServed, never rendered as a postal address. */
  areaServed: 'Joinville/SC e região',
} as const;

export const contacts = {
  /**
   * Published WhatsApp digits, kept exactly as found in the brief.
   * The brief is explicit: do not add a ninth digit, do not "correct" it.
   */
  whatsappDigits: '554784824814',
  whatsappE164: '+554784824814',
  /** Human-readable presentation of the same number. */
  phoneDisplay: '(47) 8482-4814',
  /** Functional base preserved from the live site, including the pt_BR flag. */
  whatsappBase: 'https://api.whatsapp.com/send?1=pt_BR&phone=554784824814',
  instagram: 'https://www.instagram.com/luscarclimatizacao/',
  instagramHandle: '@luscarclimatizacao',
} as const;

/**
 * Builds a contextual WhatsApp deep link.
 *
 * `text` is percent-encoded so the message survives the query string intact.
 * The `phone` parameter and the `1=pt_BR` flag are always preserved.
 * Nothing here sends a message: it only composes the visitor's own click.
 */
export function whatsappLink(message: string): string {
  const text = message.trim();
  if (!text) return contacts.whatsappBase;
  return `${contacts.whatsappBase}&text=${encodeURIComponent(text)}`;
}

/** Pre-written opening messages, one per intent. Copy comes from the briefing. */
export const whatsappIntents = {
  geral: 'Olá, gostaria de conversar sobre um serviço de climatização em Joinville.',
  instalacao:
    'Olá, gostaria de um orçamento para instalação de ar-condicionado. Posso enviar informações e fotos do local?',
  altura:
    'Olá, preciso avaliar um serviço em prédio/apartamento com acesso em altura. Posso enviar fotos?',
  manutencao: 'Olá, gostaria de avaliar um problema no funcionamento do meu ar-condicionado.',
  pex: 'Olá, gostaria de conversar sobre um projeto de tubulação flexível PEX/EPEX.',
} as const;

export type WhatsappIntent = keyof typeof whatsappIntents;

/** Routes that must exist. Kept typed so a typo fails the build, not production. */
export const routes = {
  home: '/',
  servicos: '/servicos-de-climatizacao-ar-condicionado-joinville/',
  instalacao: '/instalacao-ar-condicionado-joinville/',
  predios: '/instalacao-de-ar-condicionado-predios-joinville/',
  altura: '/instalacao-ar-condicionado-predio-apartamento-alpinismo-joinville/',
  manutencao: '/concertos-e-manutencao-ar-condicionado-joinville/',
  limpeza: '/limpeza-ar-condicionado-joinville/',
  pex: '/encanador-tubulacao-flexivel-pex-e-epex-joinville/',
  about: '/about/',
  projects: '/projects/',
  contact: '/contact/',
  guiaApartamento: '/guias/instalacao-ar-condicionado-apartamento/',
  guiaNaoGela: '/guias/ar-condicionado-nao-gela/',
} as const;

export type RouteKey = keyof typeof routes;

/**
 * Legacy WordPress template remains. They are archived with a real 410, are
 * never linked from navigation or sitemap, and are never redirected to the
 * home page - see seo/mapa-urls.csv.
 */
export const retiredTemplateRoutes = [
  '/ola-mundo/',
  '/pagina-exemplo/',
  '/author/projetos/',
  '/category/sem-categoria/',
] as const;

export type ServiceKey =
  | 'instalacao'
  | 'manutencao'
  | 'altura'
  | 'pex'
  | 'limpeza'
  | 'servicos';

export interface Service {
  key: ServiceKey;
  title: string;
  /** Short, factual blurb. No superlatives, no guarantees. */
  summary: string;
  route: string;
  /** Which photograph represents this service, if any. */
  photo?: PhotoKey;
  intent: WhatsappIntent;
}

export const services: readonly Service[] = [
  {
    key: 'instalacao',
    title: 'Instalação de ar-condicionado',
    summary:
      'Atendimento para equipamentos split em ambientes residenciais, comerciais e industriais. Conte como é o espaço e onde o aparelho será instalado.',
    route: routes.instalacao,
    photo: 'instalacaoInterna',
    intent: 'instalacao',
  },
  {
    key: 'manutencao',
    title: 'Manutenção e limpeza',
    summary:
      'Avaliação de problemas de funcionamento e cuidado dos componentes. Informe o que mudou no desempenho do seu aparelho.',
    route: routes.manutencao,
    photo: 'tecnicoInstrumentos',
    intent: 'manutencao',
  },
  {
    key: 'altura',
    title: 'Instalações em altura',
    summary:
      'Trabalhos em prédios e apartamentos com acesso por cordas conforme as condições do local. Envie fotos da fachada e do ponto de instalação.',
    route: routes.altura,
    photo: 'alpinismoFachada',
    intent: 'altura',
  },
  {
    key: 'pex',
    title: 'Tubulação PEX/EPEX',
    summary:
      'Serviços com tubulação flexível e avaliação da aplicação adequada ao projeto.',
    route: routes.pex,
    photo: 'pexTubos',
    intent: 'pex',
  },
] as const;

/** The four editorial groups that structure both home and the services hub. */
export const serviceGroups: readonly {
  key: ServiceKey;
  title: string;
  route: string;
  lead: string;
  detail: string;
  photo?: PhotoKey;
}[] = [
  {
    key: 'instalacao',
    title: 'Instalação',
    route: routes.instalacao,
    lead: 'Equipamentos split em ambientes residenciais, comerciais e industriais.',
    detail:
      'A posição das unidades, o espaço disponível, a infraestrutura e o acesso entram na avaliação do serviço. Se você já sabe o modelo e a capacidade do aparelho, essa informação ajuda a adiantar a conversa.',
    photo: 'instalacaoInterna',
  },
  {
    key: 'manutencao',
    title: 'Manutenção e limpeza',
    route: routes.manutencao,
    lead: 'Avaliação de funcionamento e cuidado dos componentes do aparelho.',
    detail:
      'Relate o que mudou: aparelho que não gela, ruído, gotejamento ou outra alteração. São situações para avaliação, não diagnóstico pronto.',
    photo: 'tecnicoInstrumentos',
  },
  {
    key: 'altura',
    title: 'Instalações em altura',
    route: routes.altura,
    lead: 'Prédios e apartamentos com acesso por cordas, conforme avaliação.',
    detail:
      'Quando o caminho até a unidade externa é o próprio serviço, a condição do imóvel precisa ser avaliada antes. Fotos da fachada ajudam a iniciar a conversa.',
    photo: 'alpinismoFachada',
  },
  {
    key: 'pex',
    title: 'Tubulação PEX/EPEX',
    route: routes.pex,
    lead: 'Tubulação flexível com avaliação da aplicação adequada ao projeto.',
    detail:
      'A aplicação depende do sistema, das especificações do fabricante e da avaliação técnica.',
    photo: 'pexTubos',
  },
] as const;

export type PhotoKey =
  | 'heroTecnico'
  | 'alpinismoFachada'
  | 'instalacaoInterna'
  | 'tecnicoInstrumentos'
  | 'predioInstalacoes'
  | 'lucasRetrato'
  | 'condensadorFachada'
  | 'rapelServico'
  | 'instrumentosServico'
  | 'pexInstalacao'
  | 'pexAplicacao'
  | 'pexTubos'
  | 'logo';

/**
 * Photograph registry.
 *
 * `file` is the selected original in ../assets/selecionados. `width`/`height`
 * are the true pixel dimensions - derivatives are never upscaled past them.
 * `maxRender` is the honest ceiling at which the file still holds detail;
 * derived from the original resolution, not from a target design size.
 * `position` is the CSS object-position that keeps the subject framed across
 * the crops this site actually uses, measured per photograph by inspecting
 * each original individually.
 */
export interface Photo {
  key: PhotoKey;
  file: string;
  width: number;
  height: number;
  maxRender: number;
  /** Widths generated as derivatives. Always <= width. */
  widths: readonly number[];
  alt: string;
  /** Factual caption. Never names a client, address or date. */
  caption?: string;
  position: string;
  /** Small technical reference art: present in the acervo, not an authorial record. */
  reference?: boolean;
  /** Output directory under /public/media/, matching scripts/generate-images.mjs. */
  dir: string;
  /** Filename stem; files are <slug>-<width>.<ext>. */
  slug: string;
}

export const photos: Record<PhotoKey, Photo> = {
  heroTecnico: {
    key: 'heroTecnico',
    file: 'hero-tecnico-em-altura.jpg',
    dir: 'hero',
    slug: 'tecnico-em-altura',
    width: 960,
    height: 1280,
    maxRender: 720,
    widths: [420, 560, 720],
    alt: 'Técnico trabalhando junto a uma unidade de ar-condicionado em altura',
    caption: 'Climatização com acesso por cordas',
    position: '50% 22%',
  },
  alpinismoFachada: {
    key: 'alpinismoFachada',
    file: 'alpinismo-fachada-horizontal.jpg',
    dir: 'height',
    slug: 'alpinismo-fachada',
    width: 1280,
    height: 960,
    maxRender: 900,
    widths: [480, 720, 900],
    alt: 'Trabalho com acesso por cordas em fachada',
    caption: 'Acesso por cordas em fachada',
    position: '50% 55%',
  },
  instalacaoInterna: {
    key: 'instalacaoInterna',
    file: 'instalacao-interna.jpg',
    dir: 'install',
    slug: 'instalacao-interna',
    width: 960,
    height: 1280,
    maxRender: 800,
    widths: [400, 560, 720, 800],
    alt: 'Técnico trabalhando em aparelho de ar-condicionado no interior de um ambiente',
    caption: 'Instalação de split em ambiente interno',
    position: '50% 40%',
  },
  tecnicoInstrumentos: {
    key: 'tecnicoInstrumentos',
    file: 'tecnico-instrumentos.jpg',
    dir: 'process',
    slug: 'tecnico-instrumentos',
    width: 960,
    height: 1280,
    maxRender: 800,
    widths: [400, 560, 720, 800],
    alt: 'Técnico utilizando instrumentos durante serviço de climatização',
    caption: 'Avaliação técnica antes do serviço',
    position: '50% 35%',
  },
  predioInstalacoes: {
    key: 'predioInstalacoes',
    file: 'predio-instalacoes.jpg',
    dir: 'buildings',
    slug: 'predio-instalacoes',
    width: 960,
    height: 1280,
    maxRender: 800,
    widths: [400, 560, 720, 800],
    alt: 'Fachada de edifício com equipamentos de ar-condicionado',
    caption: 'Equipamentos em fachada de edifício',
    position: '50% 40%',
  },
  lucasRetrato: {
    key: 'lucasRetrato',
    file: 'lucas-retrato.jpg',
    dir: 'people',
    slug: 'lucas-retrato',
    width: 960,
    height: 1280,
    maxRender: 800,
    widths: [360, 520, 720, 800],
    alt: 'Profissional da Luscar com capacete e uniforme',
    caption: 'Lucas Silveira, perfil público da Luscar no Instagram',
    position: '50% 25%',
  },
  condensadorFachada: {
    key: 'condensadorFachada',
    file: 'instalacao-condensadora-fachada.jpg',
    dir: 'gallery',
    slug: 'condensador-fachada',
    width: 1280,
    height: 960,
    maxRender: 900,
    widths: [480, 720, 900],
    alt: 'Instalação de unidade externa em fachada de edifício',
    caption: 'Unidade externa posicionada em fachada',
    position: '50% 60%',
  },
  rapelServico: {
    key: 'rapelServico',
    file: 'rapel-servico.jpg',
    dir: 'gallery',
    slug: 'rapel-servico',
    width: 960,
    height: 1280,
    maxRender: 800,
    widths: [400, 560, 720, 800],
    alt: 'Profissional com equipamento de acesso por cordas junto à fachada',
    caption: 'Equipamento de acesso por cordas em uso',
    position: '50% 35%',
  },
  instrumentosServico: {
    key: 'instrumentosServico',
    file: 'instrumentos-em-servico.jpg',
    dir: 'process',
    slug: 'instrumentos-em-servico',
    width: 1012,
    height: 1280,
    maxRender: 640,
    widths: [360, 480, 640],
    alt: 'Instrumentos de trabalho utilizados em serviço de climatização',
    caption: 'Instrumentos em serviço',
    position: '50% 45%',
  },
  pexInstalacao: {
    key: 'pexInstalacao',
    file: 'pex-instalacao-referencia.jpg',
    dir: 'pex',
    slug: 'pex-instalacao',
    width: 295,
    height: 172,
    maxRender: 295,
    widths: [295],
    alt: 'Exemplo de tubulação flexível em instalação',
    caption: 'Ilustração de tubulação flexível do acervo',
    position: '50% 30%',
    reference: true,
  },
  pexAplicacao: {
    key: 'pexAplicacao',
    file: 'pex-aplicacao-referencia.jpg',
    dir: 'pex',
    slug: 'pex-aplicacao',
    width: 295,
    height: 172,
    maxRender: 295,
    widths: [295],
    alt: 'Ilustração de aplicação de tubulação em ambiente',
    caption: 'Ilustração de aplicação do acervo',
    position: '50% 50%',
    reference: true,
  },
  pexTubos: {
    key: 'pexTubos',
    file: 'pex-tubos-referencia.jpg',
    dir: 'pex',
    slug: 'pex-tubos',
    width: 295,
    height: 172,
    maxRender: 295,
    widths: [295],
    alt: 'Tubos flexíveis e conexões',
    caption: 'Tubos flexíveis e conexões, ilustração do acervo',
    position: '50% 40%',
    reference: true,
  },
  logo: {
    key: 'logo',
    file: 'logo-luscar-original.png',
    dir: 'logo',
    slug: 'luscar-logo',
    width: 274,
    height: 115,
    maxRender: 200,
    widths: [200],
    alt: 'Luscar Climatização',
    position: '50% 50%',
  },
} as const;

/** Builds a public URL for one derivative. Mirrors the generator's layout. */
export function photoSrc(photo: Photo, width: number, ext: 'webp' | 'avif' | 'jpg'): string {
  return `/media/${photo.dir}/${photo.slug}-${width}.${ext}`;
}

/** The JPEG fallback width for a photo: its own maxRender. */
export function photoFallback(photo: Photo): string {
  return photoSrc(photo, photo.maxRender, 'jpg');
}

/** A `srcset` across the generated widths for every served format. */
export function photoSrcset(photo: Photo): string {
  return photo.widths
    .flatMap((w) =>
      (['avif', 'webp', 'jpg'] as const).map((ext) => `${photoSrc(photo, w, ext)} ${w}w`),
    )
    .join(', ');
}

/**
 * The logo ships as one transparent PNG at its 200px display ceiling, so it
 * needs no format ladder and no srcset.
 *
 * Declared after `photos` on purpose: a const that dereferences `photos` must
 * not be evaluated while it is still in its temporal dead zone.
 */
export const logoUrl = `/media/logo/${photos.logo.slug}-${photos.logo.maxRender}.png`;

/**
 * `sizes` presets, measured from the rendered layout rather than guessed.
 *
 * A `sizes` value that UNDER-states the real box makes the browser download a
 * file smaller than the element, which is exactly the upscaling the briefing
 * forbids. Each curve below was read off the actual rendered width at 390,
 * 560, 768, 900, 1024, 1120, 1440 and 1920 CSS px and rounded up.
 */
export const sizes = {
  /** Hero column: full width below 900, then ~350-460px. */
  hero: '(min-width: 1240px) 460px, (min-width: 900px) 42vw, 96vw',
  /** Inner-page header photo, right column of a two-column head. */
  pageHead: '(min-width: 1440px) 680px, (min-width: 1024px) 580px, (min-width: 900px) 500px, 96vw',
  /** Deep-section feature photo, the wider of the two columns. */
  feature: '(min-width: 1440px) 700px, (min-width: 1024px) 600px, (min-width: 900px) 500px, 96vw',
  /** Portrait in a `.human` block: full width below 768, then a narrow column. */
  humanPortrait: '(min-width: 768px) 340px, 92vw',
  /** Photo inside a `.human` block on the text side. */
  humanFigure: '(min-width: 768px) 380px, 92vw',
  /** One of three gallery columns. */
  galleryTile: '(min-width: 1240px) 380px, (min-width: 900px) 30vw, (min-width: 560px) 48vw, 96vw',
  /** Gallery tile spanning two of three columns. */
  galleryWide: '(min-width: 1240px) 780px, (min-width: 900px) 60vw, 96vw',
} as const;

/**
 * Documentary gallery: 6 photographs from the published acervo.
 *
 * Deliberately excludes:
 *  - heroTecnico: already the first screen. Repeating it in the gallery
 *    flattens the page into a stock-photo pattern.
 *  - instrumentosServico: the face is already half-cropped at the source's
 *    left edge, so it cannot carry a subject in a wide tile. It is used as a
 *    small detail on the maintenance page instead.
 *  - the three pex-* references: B&W technical illustrations, not photographs.
 *    They live in small modules on the PEX page.
 */
export const galleryPhotos: readonly PhotoKey[] = [
  'condensadorFachada',
  'rapelServico',
  'instalacaoInterna',
  'predioInstalacoes',
  'tecnicoInstrumentos',
  'alpinismoFachada',
] as const;