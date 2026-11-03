import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '@/data/site';
import { getBlog } from '@/i18n/blog';
import { getUI } from '@/i18n/ui';
import { getArticles } from '@/lib/content';

const locale = 'id';

export async function GET(context: APIContext) {
  const t = getUI(locale);
  const copy = getBlog(locale);
  const articles = await getArticles(locale);

  return rss({
    title: `${t.identity.name} — ${t.pages.blog.title}`,
    description: copy.description,
    site: context.site ?? SITE.url,
    items: articles.map(({ entry, path }) => ({
      title: entry.data.title,
      pubDate: entry.data.publishedAt,
      description: entry.data.description,
      link: path,
      categories: [entry.data.category, ...entry.data.tags],
    })),
    customData: '<language>id-ID</language>',
  });
}
