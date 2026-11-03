import { getCollection, render, type CollectionEntry } from 'astro:content';
import { locales, type Locale } from '@/i18n/config';

/**
 * Content helpers.
 *
 * Files are stored as `content/<collection>/<locale>/<slug>.md`, so the entry
 * id is `<locale>/<slug>`. These helpers hide that layout from pages and keep
 * routing, hreflang pairing, and sorting consistent.
 */

export type ProjectEntry = CollectionEntry<'projects'>;
export type ArticleEntry = CollectionEntry<'articles'>;

function localeOf(id: string): Locale {
  return id.startsWith('en/') ? 'en' : 'id';
}

export function slugOf(id: string): string {
  return id.slice(id.indexOf('/') + 1);
}

export function projectPath(locale: Locale, slug: string): string {
  return locale === 'id' ? `/id/proyek/${slug}/` : `/en/projects/${slug}/`;
}

export function articlePath(locale: Locale, slug: string): string {
  return locale === 'id' ? `/id/blog/${slug}/` : `/en/blog/${slug}/`;
}

function alternatesFor<T extends { id: string; data: { translationKey: string } }>(
  entries: T[],
  entry: T,
  pathFor: (locale: Locale, slug: string) => string,
): Record<Locale, string> {
  const result = {} as Record<Locale, string>;

  for (const locale of locales) {
    const match = entries.find(
      (candidate) =>
        candidate.data.translationKey === entry.data.translationKey &&
        localeOf(candidate.id) === locale,
    );
    result[locale] = pathFor(locale, slugOf(match?.id ?? entry.id));
  }

  return result;
}

export async function getProjects(locale: Locale) {
  const entries = await getCollection('projects');

  return entries
    .filter((entry) => localeOf(entry.id) === locale)
    .sort((a, b) => a.data.order - b.data.order)
    .map((entry) => ({ entry, slug: slugOf(entry.id), path: projectPath(locale, slugOf(entry.id)) }));
}

export async function getProject(locale: Locale, slug: string) {
  const projects = await getProjects(locale);
  return projects.find((project) => project.slug === slug);
}

export async function getArticles(locale: Locale) {
  const entries = await getCollection('articles');

  return entries
    .filter((entry) => localeOf(entry.id) === locale && !entry.data.draft)
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())
    .map((entry) => ({ entry, slug: slugOf(entry.id), path: articlePath(locale, slugOf(entry.id)) }));
}

export async function getArticle(locale: Locale, slug: string) {
  const articles = await getArticles(locale);
  return articles.find((article) => article.slug === slug);
}

export async function getArticleContent(entry: ArticleEntry) {
  return render(entry);
}

/**
 * `getStaticPaths` props for project detail pages, including the swapped
 * locale paths used for hreflang and the language switcher.
 */
export async function projectStaticPaths(locale: Locale) {
  const all = await getCollection('projects');
  const projects = await getProjects(locale);

  return projects.map(({ entry, slug }) => ({
    params: { slug },
    props: {
      entry,
      alternates: alternatesFor(all, entry, projectPath),
    },
  }));
}

export async function articleStaticPaths(locale: Locale) {
  const all = (await getCollection('articles')).filter((entry) => !entry.data.draft);
  const articles = await getArticles(locale);

  return articles.map(({ entry, slug }) => ({
    params: { slug },
    props: {
      entry,
      alternates: alternatesFor(all, entry, articlePath),
    },
  }));
}

/** Rough reading time at 200 words per minute, never less than a minute. */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Related articles share at least one tag; the newest ones come first. */
export async function getRelatedArticles(entry: ArticleEntry, locale: Locale, limit = 2) {
  const tags = new Set(entry.data.tags);
  const articles = await getArticles(locale);

  return articles
    .filter((candidate) => candidate.entry.id !== entry.id)
    .map((candidate) => ({
      ...candidate,
      shared: candidate.entry.data.tags.filter((tag) => tags.has(tag)).length,
    }))
    .filter((candidate) => candidate.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit);
}
