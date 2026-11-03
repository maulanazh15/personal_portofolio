export const locales = ['id', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'id';

export const localeMeta: Record<
  Locale,
  {
    shortLabel: string;
    nativeName: string;
    htmlLang: string;
    ogLocale: string;
    dateLocale: string;
  }
> = {
  id: {
    shortLabel: 'ID',
    nativeName: 'Bahasa Indonesia',
    htmlLang: 'id',
    ogLocale: 'id_ID',
    dateLocale: 'id-ID',
  },
  en: {
    shortLabel: 'EN',
    nativeName: 'English',
    htmlLang: 'en',
    ogLocale: 'en_US',
    dateLocale: 'en-US',
  },
};

/**
 * Localised route table. This is the single source of truth for internal links,
 * the language switcher, and hreflang metadata.
 */
export const routePaths = {
  home: { id: '/id/', en: '/en/' },
  about: { id: '/id/tentang/', en: '/en/about/' },
  projects: { id: '/id/proyek/', en: '/en/projects/' },
  expertise: { id: '/id/keahlian/', en: '/en/expertise/' },
  blog: { id: '/id/blog/', en: '/en/blog/' },
  contact: { id: '/id/kontak/', en: '/en/contact/' },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routePaths;

export const navOrder: RouteKey[] = ['home', 'about', 'projects', 'expertise', 'blog', 'contact'];

/**
 * Routes that are complete enough to be indexed and listed in the sitemap.
 * Placeholder pages stay out until their phase is implemented; remember to
 * add the route here when a page goes live.
 */
export const indexableRoutes: RouteKey[] = [
  'home',
  'about',
  'projects',
  'expertise',
  'blog',
  'contact',
];

/**
 * Detail pages have no entry in `routePaths` because their slug comes from the
 * content collection. These prefixes keep them indexable in the sitemap while
 * `routeKeyFromPath` still maps section pages to their route key.
 */
const detailPathPrefixes = [
  '/id/proyek/',
  '/en/projects/',
  '/id/blog/',
  '/en/blog/',
];

export function isIndexablePath(pathname: string): boolean {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;

  const isSection = indexableRoutes.some((route) =>
    locales.some((locale) => routePaths[route][locale] === normalized),
  );

  if (isSection) return true;

  return detailPathPrefixes.some(
    (prefix) => normalized.startsWith(prefix) && normalized.length > prefix.length,
  );
}

/**
 * Maps a pathname back to its logical route so metadata (hreflang, sitemap
 * alternates, navigation state) can stay correct across localised slugs.
 */
export function routeKeyFromPath(pathname: string): RouteKey | undefined {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;

  return (Object.keys(routePaths) as RouteKey[]).find((route) =>
    locales.some((locale) => routePaths[route][locale] === normalized),
  );
}

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

export function localizedHref(locale: Locale, route: RouteKey): string {
  return routePaths[route][locale];
}

export function getAlternatePaths(route: RouteKey): Record<Locale, string> {
  return routePaths[route];
}
