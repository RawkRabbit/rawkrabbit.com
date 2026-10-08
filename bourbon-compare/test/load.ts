import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { bourbonSchema, type BourbonEntry } from '../src/lib/schema.ts';

const DIR = new URL('../src/data/bourbons/', import.meta.url);

/** Loads and validates the real YAML data — the same schema Astro uses at build. */
export function loadAll(): BourbonEntry[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const raw = parse(readFileSync(new URL(f, DIR), 'utf8'));
      const parsed = bourbonSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`${f} failed validation:\n${JSON.stringify(parsed.error.format(), null, 2)}`);
      }
      return { ...parsed.data, slug: f.replace(/\.yaml$/, '') };
    });
}

export const bySlug = (all: BourbonEntry[], slug: string): BourbonEntry => {
  const found = all.find((b) => b.slug === slug);
  if (!found) throw new Error(`no bottle with slug ${slug}`);
  return found;
};
