import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { load } from 'cheerio';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SITE = 'https://portofolio.homelabchester.my.id';

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function routeFor(file) {
  const relative = path.relative(DIST, file).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  if (relative === '404.html') return '/404.html';
  return `/${relative.replace(/index\.html$/, '')}`;
}

function outputPath(route) {
  if (route === '/') return path.join(DIST, 'index.html');
  if (route.endsWith('/')) return path.join(DIST, route, 'index.html');
  return path.join(DIST, route);
}

const htmlFiles = walk(DIST).filter((file) => file.endsWith('.html'));
const pages = htmlFiles.map((file) => {
  const html = readFileSync(file, 'utf8');
  return { file, route: routeFor(file), html, $: load(html) };
});
const publicPages = pages.filter((page) => !['/', '/404.html'].includes(page.route));
const routes = new Set(pages.map((page) => page.route));

function attribute(page, selector, name) {
  const value = page.$(selector).attr(name);
  assert.ok(value, `${page.route}: missing ${selector}[${name}]`);
  return value;
}

test('production build contains the expected page set', () => {
  assert.equal(pages.length, 20);
  assert.equal(publicPages.length, 18);
  for (const route of ['/id/', '/en/', '/id/kontak/', '/en/contact/', '/id/proyek/', '/en/projects/']) {
    assert.ok(routes.has(route), `missing ${route}`);
  }
});

test('root redirect and 404 stay out of the index', () => {
  const root = pages.find((page) => page.route === '/');
  assert.match(attribute(root, 'meta[name="robots"]', 'content'), /noindex/);
  assert.equal(attribute(root, 'meta[http-equiv="refresh"]', 'content'), '0;url=/id/');
  assert.equal(attribute(root, 'link[rel="canonical"]', 'href'), `${SITE}/id/`);

  const notFound = pages.find((page) => page.route === '/404.html');
  assert.match(attribute(notFound, 'meta[name="robots"]', 'content'), /noindex/);
  assert.equal(attribute(notFound, 'html', 'lang'), 'id');
  assert.ok(notFound.$('a[href="/id/"]').length > 0);
  assert.ok(notFound.$('a[href="/en/"]').length > 0);
});

test('every public page has complete SEO metadata and landmarks', () => {
  for (const page of publicPages) {
    const { $, route } = page;
    const expectedLocale = route.startsWith('/id/') ? 'id' : 'en';
    assert.equal(attribute(page, 'html', 'lang'), expectedLocale, route);
    assert.equal(attribute(page, 'link[rel="canonical"]', 'href'), SITE + route, route);
    assert.match(attribute(page, 'meta[name="robots"]', 'content'), /index, follow/, route);
    assert.ok(page.$('title').text().length > 0, route);
    assert.ok(attribute(page, 'meta[name="description"]', 'content').length > 40, route);
    assert.equal(attribute(page, 'meta[property="og:url"]', 'content'), SITE + route, route);
    assert.ok(attribute(page, 'meta[property="og:title"]', 'content').length > 0, route);
    assert.ok(attribute(page, 'meta[name="twitter:card"]', 'content').length > 0, route);

    assert.equal($('h1').length, 1, `${route}: exactly one h1`);
    assert.equal($('main#main-content').length, 1, `${route}: main landmark`);
    assert.ok($('a[href="#main-content"]').length >= 1, `${route}: skip link`);
    assert.ok($('header').length >= 1 && $('footer').length === 1, `${route}: header/footer`);

    const alternates = $('link[rel="alternate"][hreflang]');
    assert.deepEqual(
      alternates.map((_, element) => $(element).attr('hreflang')).get().sort(),
      ['en', 'id', 'x-default'],
      `${route}: hreflang set`,
    );
    for (const element of alternates) {
      const target = new URL($(element).attr('href')).pathname;
      assert.ok(routes.has(target), `${route}: alternate target ${target} exists`);
    }

    const jsonLd = $('script[type="application/ld+json"]');
    assert.equal(jsonLd.length, 1, `${route}: JSON-LD block`);
    assert.doesNotThrow(() => JSON.parse(jsonLd.text()), `${route}: valid JSON-LD`);
  }
});

test('main-content headings do not skip levels', () => {
  for (const page of publicPages) {
    let previous = 1;
    page.$('main h1, main h2, main h3, main h4, main h5, main h6').each((_, element) => {
      const level = Number(element.tagName.slice(1));
      assert.ok(level <= previous + 1, `${page.route}: h${previous} followed by h${level}`);
      previous = level;
    });
  }
});

test('all internal links, fragments, and assets resolve', () => {
  for (const page of publicPages) {
    page.$('a[href], link[href], script[src], img[src]').each((_, element) => {
      const $ = page.$;
      const raw = $(element).attr('href') ?? $(element).attr('src');
      if (!raw) return;
      if (raw.startsWith('#')) {
        assert.ok($(`[id="${raw.slice(1)}"]`).length > 0, `${page.route}: missing ${raw}`);
        return;
      }
      if (!raw.startsWith('/')) return;
      const url = new URL(raw, SITE);
      if (url.hash && url.pathname === page.route) {
        assert.ok($(`[id="${url.hash.slice(1)}"]`).length > 0, `${page.route}: missing ${url.hash}`);
        return;
      }
      assert.ok(existsSync(outputPath(url.pathname)), `${page.route}: broken ${raw}`);
    });

    page.$('a[target="_blank"]').each((_, element) => {
      const rel = page.$(element).attr('rel') ?? '';
      assert.match(rel, /noopener/, `${page.route}: external link needs noopener`);
      assert.match(rel, /noreferrer/, `${page.route}: external link needs noreferrer`);
    });
  }
});

test('language switchers preserve the current localized route', () => {
  for (const page of publicPages) {
    const currentLocale = page.route.startsWith('/id/') ? 'id' : 'en';
    const switcher = page.$(`nav[aria-label="${currentLocale === 'id' ? 'Pilih bahasa' : 'Select language'}"]`).first();
    assert.equal(switcher.length, 1, `${page.route}: language switcher`);
    const links = switcher.find('a[hreflang]');
    assert.equal(links.length, 2, `${page.route}: two languages`);
    links.each((_, element) => {
      const href = page.$(element).attr('href');
      assert.ok(routes.has(href), `${page.route}: switcher target ${href}`);
      if (page.$(element).attr('hreflang') === currentLocale) {
        assert.equal(href, page.route, `${page.route}: current language path`);
        assert.equal(page.$(element).attr('aria-current'), 'true');
      }
    });
  }
});

test('sitemap contains exactly the public pages', () => {
  const xml = load(readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf8'), { xmlMode: true });
  const locations = xml('url > loc').map((_, element) => new URL(xml(element).text()).pathname).get();
  assert.deepEqual(locations.sort(), publicPages.map((page) => page.route).sort());
  assert.ok(!locations.includes('/'));
  assert.ok(!locations.includes('/404.html'));
  assert.ok(xml('sitemapindex').length === 0);
});

test('RSS feeds are localized and link only to existing articles', () => {
  for (const locale of ['id', 'en']) {
    const file = path.join(DIST, locale, 'rss.xml');
    assert.ok(existsSync(file));
    const xml = load(readFileSync(file, 'utf8'), { xmlMode: true });
    assert.equal(xml('channel > language').text(), locale === 'id' ? 'id-ID' : 'en-US');
    assert.ok(xml('channel > item').length > 0, `${locale}: feed is not empty`);
    xml('channel > item > link').each((_, element) => {
      const route = new URL(xml(element).text()).pathname;
      assert.ok(route.startsWith(`/${locale}/blog/`), `${locale}: wrong locale in ${route}`);
      assert.ok(routes.has(route), `${locale}: missing article ${route}`);
    });
  }
});

test('contact pages render an accessible, idle-hydrated form', () => {
  for (const route of ['/id/kontak/', '/en/contact/']) {
    const page = pages.find((candidate) => candidate.route === route);
    const $ = page.$;
    for (const field of ['name', 'email', 'subject', 'message', 'website']) {
      assert.ok($(`[name="${field}"]`).length === 1, `${route}: ${field} field`);
    }
    for (const field of ['name', 'email', 'subject', 'message']) {
      assert.equal($(`label[for="contact-${field}"]`).length, 1, `${route}: ${field} label`);
    }
    assert.equal($('textarea[name="message"]').length, 1, route);
    assert.ok($('[name="website"]').closest('.hidden').length === 1, `${route}: honeypot hidden`);
    assert.equal($('button[type="submit"]').length, 1, route);
    const island = $('astro-island').filter((_, element) =>
      ($(element).attr('component-url') ?? '').includes('ContactForm'),
    );
    assert.equal(island.length, 1, `${route}: one contact island`);
    assert.equal(island.attr('client'), 'idle', `${route}: least-eager hydration`);
    assert.ok(island.attr('props').includes('/api/v1/contact'), `${route}: contact endpoint`);
    assert.ok($('noscript').text().length > 20, `${route}: no-JS fallback`);
  }
});
