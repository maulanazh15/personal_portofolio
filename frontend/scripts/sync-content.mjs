/**
 * Build-time content sync.
 *
 * The Go content API (SQLite) is the source of truth. This script turns its
 * JSON into Markdown files under `.generated/content/`, which Astro's content
 * collections then load exactly as before. The deployed site therefore stays
 * fully static; no API call happens in the browser.
 *
 * Environment:
 *   CONTENT_API_URL  API origin, default http://127.0.0.1:8080
 *   CONTENT_SYNC=off Skip syncing and reuse the previously generated files.
 */
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

const API_URL = (process.env.CONTENT_API_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
const LOCALES = ['id', 'en'];
const COLLECTIONS = ['projects', 'articles'];
const outputRoot = fileURLToPath(new URL('../.generated/content/', import.meta.url));

function hasGeneratedContent() {
  try {
    return COLLECTIONS.some((collection) =>
      LOCALES.some((locale) => {
        const dir = path.join(outputRoot, collection, locale);
        return existsSync(dir) && readdirSync(dir).some((file) => file.endsWith('.md'));
      }),
    );
  } catch {
    return false;
  }
}

async function fetchEntries(collection, locale) {
  const url = `${API_URL}/api/v1/${collection}?locale=${locale}`;
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
  const payload = await response.json();
  return payload.items ?? [];
}

if (process.env.CONTENT_SYNC === 'off') {
  console.log('sync:content: CONTENT_SYNC=off, using existing generated content.');
  process.exit(0);
}

try {
  const entries = [];
  for (const collection of COLLECTIONS) {
    for (const locale of LOCALES) {
      for (const item of await fetchEntries(collection, locale)) {
        entries.push({ collection, locale, item });
      }
    }
  }

  await rm(outputRoot, { recursive: true, force: true });

  for (const { collection, locale, item } of entries) {
    const dir = path.join(outputRoot, collection, locale);
    await mkdir(dir, { recursive: true });

    const frontmatter = stringify(item.data ?? {}, { lineWidth: 0 });
    const body = item.body ?? '';
    const content = `---\n${frontmatter}---\n\n${body === '' || body.endsWith('\n') ? body : `${body}\n`}`;
    await writeFile(path.join(dir, `${item.slug}.md`), content);
  }

  console.log(`sync:content: wrote ${entries.length} entries from ${API_URL}`);
} catch (error) {
  if (hasGeneratedContent()) {
    console.warn(`sync:content: ${error.message}`);
    console.warn('sync:content: using the previously generated content in frontend/.generated/.');
    process.exit(0);
  }
  console.error(`sync:content: ${error.message}`);
  console.error(
    'sync:content: no generated content available. Start the Go content API ' +
      '(backend: go run ./cmd/server) or set CONTENT_SYNC=off after a successful sync.',
  );
  process.exit(1);
}
