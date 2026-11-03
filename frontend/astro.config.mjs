import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { isIndexablePath, routeKeyFromPath, routePaths } from './src/i18n/config.ts';

const SITE_URL = 'https://portofolio.homelabchester.my.id';

// `content/` lives in the repository root, one level above the Astro project,
// so the dev server needs explicit permission to read it.
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// TODO(phase 7): strict CSP is issued as an Nginx response header so it can
// include frame-ancestors/report-uri. See README "Security headers".

// hreflang values used in the sitemap. Keep in sync with `localeMeta` in
// src/i18n/config.ts, which drives the on-page <link rel="alternate"> tags.
const HTML_LANG = { id: 'id-ID', en: 'en-US' };

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  compressHTML: true,
  i18n: {
    locales: ['id', 'en'],
    defaultLocale: 'id',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    preact(),
    sitemap({
      // Placeholder pages are `noindex`; never advertise them in the sitemap.
      filter: (page) => isIndexablePath(new URL(page).pathname),
      // Localised slugs (/id/proyek/ vs /en/projects/) do not share a path,
      // so the built-in i18n pairing cannot find them. Build the alternates
      // from the route table instead.
      serialize(item) {
        const route = routeKeyFromPath(new URL(item.url).pathname);

        if (route) {
          const paths = routePaths[route];

          item.links = [
            ...Object.entries(paths).map(([locale, path]) => ({
              lang: HTML_LANG[locale],
              url: new URL(path, SITE_URL).href,
            })),
            { lang: 'x-default', url: new URL(paths.id, SITE_URL).href },
          ];
        }

        item.changefreq = 'monthly';
        item.priority = route === 'home' ? 1 : 0.7;

        return item;
      },
    }),
  ],
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          {
            weight: '100 900',
            style: 'normal',
            src: ['./src/assets/fonts/inter-latin-variable.woff2'],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Manrope',
      cssVariable: '--font-manrope',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          {
            weight: '200 800',
            style: 'normal',
            src: ['./src/assets/fonts/manrope-latin-variable.woff2'],
          },
        ],
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      fs: {
        allow: [repoRoot],
      },
    },
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
});
