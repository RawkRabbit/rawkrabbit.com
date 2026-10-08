import { getCollection } from 'astro:content';
import type { BourbonEntry } from './schema.ts';
import { pairHash } from './lexicon.ts';
import { url } from './url.ts';

/**
 * Single entry point for reading the master list. Every page goes through here
 * so the sort order and the slug attachment stay consistent.
 */
export async function loadCatalogue(): Promise<BourbonEntry[]> {
  const entries = await getCollection('bourbons');
  return entries
    .map((e) => ({ ...e.data, slug: e.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findBySlug(all: BourbonEntry[], slug: string): BourbonEntry {
  const found = all.find((b) => b.slug === slug);
  if (!found) throw new Error(`Unknown bourbon slug: ${slug}`);
  return found;
}

/**
 * Every ORDERED pair. Both /compare/a-vs-b and /compare/b-vs-a are generated so
 * the Swap button is a real navigation rather than a cosmetic toggle; the
 * reversed page carries a rel=canonical pointing at the alphabetical order, so
 * search engines still see one page per pair.
 */
export function allOrderedPairs(all: BourbonEntry[]): [BourbonEntry, BourbonEntry][] {
  const out: [BourbonEntry, BourbonEntry][] = [];
  for (const a of all) {
    for (const b of all) {
      if (a.slug !== b.slug) out.push([a, b]);
    }
  }
  return out;
}

/**
 * A deterministic pair derived from `seedKey`. Used as the no-JS href for the
 * Random link: it is always a real pre-rendered comparison, and seeding it from
 * the page path means the destination still varies from page to page.
 */
export function seededPairUrl(all: BourbonEntry[], seedKey: string): string {
  if (all.length < 2) return url('/');
  const n = all.length;
  const seed = pairHash(seedKey, 'random');
  const i = seed % n;
  const j = (i + 1 + (Math.floor(seed / n) % (n - 1))) % n;
  return url(`/compare/${all[i]!.slug}-vs-${all[j]!.slug}/`);
}
