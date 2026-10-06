import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    kind: z.string(),
    platform: z.string(),
    status: z.enum(['idea', 'building', 'beta', 'live', 'retired']),
    statusNote: z.string().optional(),
    problem: z.string(),
    forWho: z.string(),
    price: z.string().optional(),
    license: z.string().optional(),
    started: z.coerce.date(),
    updated: z.coerce.date(),
    order: z.number().default(100),
    links: z
      .array(z.object({ label: z.string(), url: z.string(), primary: z.boolean().default(false) }))
      .default([]),
    support: z.object({ label: z.string(), url: z.string() }).optional(),
    draft: z.boolean().default(false),
  }),
});

const log = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/log' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    project: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, log };
