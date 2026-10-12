import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from './load.ts';
import { bourbonSchema } from '../src/lib/schema.ts';
import { formatRating, starFills } from '../src/lib/ag.ts';

const base = (() => {
  const { slug, ...b } = loadAll()[0]!;
  return b;
})();
const withRating = (rating: number | null) =>
  bourbonSchema.safeParse({ ...base, personal: { rating, notes: null, dateTried: null } }).success;

test('AG rating accepts 0 to 5 in half steps', () => {
  for (const r of [0, 0.5, 1, 3.5, 4, 5, null]) assert.ok(withRating(r), `${r} should be valid`);
});

test('AG rating rejects values off the half-star grid or out of range', () => {
  for (const r of [3.7, 4.25, -0.5, 5.5, 10]) assert.ok(!withRating(r), `${r} should be rejected`);
});

test('star fills and label', () => {
  assert.deepEqual(starFills(3.5), [1, 1, 1, 0.5, 0]);
  assert.deepEqual(starFills(0), [0, 0, 0, 0, 0]);
  assert.equal(formatRating(4), '4 / 5');
  assert.equal(formatRating(2.5), '2.5 / 5');
  assert.equal(formatRating(null), null);
});
