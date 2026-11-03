import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * The Go content API (SQLite) is the source of truth. `npm run sync:content`
 * materializes it as Markdown under `.generated/content/`, and these
 * collections load that generated output. The deployed site stays static.
 *
 * Each collection stores one file per locale under an `id/` or `en/` folder.
 * `translationKey` pairs the two locales so hreflang and the language switcher
 * can link a page to its counterpart even when the slugs differ.
 */

/** Editors may save an empty optional field as `""`; treat that as absent. */
function emptyToUndefined(value: unknown): unknown {
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './.generated/content/projects' }),
  schema: z.object({
    translationKey: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    summary: z.string(),
    category: z.string(),
    focus: z.string(),
    status: z.string(),
    order: z.coerce.number().default(0),
    stack: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    repo: optionalUrl,
    docsPending: z.boolean().default(false),
    overview: z.string(),
    background: z.string().optional(),
    areas: z.array(z.string()).default([]),
    objectives: z.array(z.string()).default([]),
    role: z.string().optional(),
    process: z.string().optional(),
    challenges: z.string().optional(),
    results: z.string().optional(),
    outcomes: z.string().optional(),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './.generated/content/articles' }),
  schema: z.object({
    translationKey: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
    updatedAt: optionalDate,
    draft: z.boolean().default(false),
    relatedProject: z.string().optional(),
  }),
});

export const collections = { projects, articles };
