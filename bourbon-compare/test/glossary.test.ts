import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, LABEL_TO_TERM } from '../src/lib/glossary.ts';
import { specRows } from '../src/lib/compare.ts';
import { loadAll, bySlug } from './load.ts';

const ids = new Set(GLOSSARY.flatMap((g) => [g.id, ...g.terms.map((t) => t.id)]));

test('glossary ids are unique', () => {
  const all = GLOSSARY.flatMap((g) => [g.id, ...g.terms.map((t) => t.id)]);
  assert.equal(all.length, ids.size);
});

test('every linked spec label points at a real glossary entry', () => {
  for (const [label, id] of Object.entries(LABEL_TO_TERM)) assert.ok(ids.has(id), `${label} -> #${id} missing`);
  for (const id of ['bottled-in-bond', 'barrel-proof', 'single-barrel', 'small-batch', 'non-chill-filtered', 'ag-rating', 'limited', 'allocated'])
    assert.ok(ids.has(id), `#${id} missing`);
});

test('every comparison spec row label has a glossary link', () => {
  const all = loadAll();
  const rows = specRows(bySlug(all, 'buffalo-trace'), bySlug(all, 'blantons-single-barrel'));
  for (const r of rows) assert.ok(LABEL_TO_TERM[r.label], `no glossary link for "${r.label}"`);
});
