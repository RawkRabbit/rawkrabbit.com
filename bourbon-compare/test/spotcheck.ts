import { loadAll } from './load.ts';
import { compare } from '../src/lib/compare.ts';
import { pairHash } from '../src/lib/lexicon.ts';

/* Deterministic sample across the whole catalogue, for eyeballing prose quality. */
const all = loadAll();
const pairs: [number, number][] = [];
for (let i = 0; i < all.length; i++)
  for (let j = i + 1; j < all.length; j++) pairs.push([i, j]);
pairs.sort((p, q) => pairHash(all[p[0]]!.slug, all[p[1]]!.slug) - pairHash(all[q[0]]!.slug, all[q[1]]!.slug));

for (const [i, j] of pairs.slice(0, 8)) {
  const c = compare(all[i]!, all[j]!);
  console.log(`\n── ${c.similar ? 'SIMILAR ' : 'CONTRAST'} ─────────────────────────────`);
  console.log(c.opening.replace(/\*\*/g, ''));
  console.log('  ' + c.flavorLead);
  for (const r of c.recommendations) console.log('  • ' + r.text.replace(/\*\*/g, ''));
}
