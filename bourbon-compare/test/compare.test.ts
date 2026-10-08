import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { loadAll, bySlug } from './load.ts';
import { compare, canonicalPairSlug, flavorDeltas } from '../src/lib/compare.ts';
import { formatMashbill, formatProof, formatPrice } from '../src/lib/derive.ts';

const all = loadAll();

test('every bottle in the master list validates against the schema', () => {
  assert.ok(all.length >= 10, `expected at least 10 bottles, got ${all.length}`);
});

test('canonical pair slug is stable regardless of argument order', () => {
  assert.equal(
    canonicalPairSlug('knob-creek-9-year', 'buffalo-trace'),
    canonicalPairSlug('buffalo-trace', 'knob-creek-9-year'),
  );
});

test('both orderings of a pair produce the same canonical target', () => {
  const x = bySlug(all, 'knob-creek-9-year');
  const y = bySlug(all, 'buffalo-trace');
  assert.notEqual(compare(x, y).slug, compare(y, x).slug, 'display slugs differ by order');
  assert.equal(compare(x, y).canonicalSlug, compare(y, x).canonicalSlug);
});

test('formatters match the reference screenshot', () => {
  const kc = bySlug(all, 'knob-creek-9-year');
  const bt = bySlug(all, 'bardstown-origin-series-high-wheat');
  assert.equal(formatMashbill(kc), '75% corn, 13% rye, 12% malted barley');
  assert.equal(formatMashbill(bt), '53% corn, 39% wheat, 8% malted barley');
  assert.equal(formatProof(kc), '100 proof (50% ABV)');
  assert.equal(formatProof(bt), '106 proof (53% ABV)');
  assert.equal(formatPrice(kc), '~$35 – $40');
});

test('the reference pair produces a contrast framing, not a similarity one', () => {
  const c = compare(bySlug(all, 'bardstown-origin-series-high-wheat'), bySlug(all, 'knob-creek-9-year'));
  assert.equal(c.similar, false);
  assert.match(c.opening, /high-wheat|wheat-forward|wheated/);
  assert.match(c.opening, /high-rye|rye-forward|spice-driven/);
});

test('two close bottles get the similarity framing instead', () => {
  const c = compare(bySlug(all, 'elijah-craig-small-batch'), bySlug(all, 'buffalo-trace'));
  assert.equal(c.similar, true, 'EC Small Batch and Buffalo Trace should read as near neighbours');
});

test('spec badges land on the correct side', () => {
  const c = compare(bySlug(all, 'bardstown-origin-series-high-wheat'), bySlug(all, 'knob-creek-9-year'));
  const age = c.specs.find((r) => r.label === 'Age')!;
  assert.deepEqual(age.badge, { side: 'b', text: '+3 yr' }, 'Knob Creek is 3 years older');
  const proof = c.specs.find((r) => r.label === 'Proof')!;
  assert.deepEqual(proof.badge, { side: 'a', text: '+6 proof' }, 'Bardstown is 6 proof higher');
  const price = c.specs.find((r) => r.label === 'Approx. Price')!;
  assert.equal(price.badge?.side, 'b', 'Knob Creek is the cheaper bottle');
});

test('recommendations name both bottles and end as sentences', () => {
  const c = compare(bySlug(all, 'bardstown-origin-series-high-wheat'), bySlug(all, 'knob-creek-9-year'));
  assert.equal(c.recommendations.length, 2);
  assert.match(c.recommendations[0]!.text, /^Go with \*\*Bardstown/);
  assert.match(c.recommendations[1]!.text, /^Go with \*\*Knob Creek 9 Year\*\*/);
  assert.match(c.recommendations[1]!.text, /lower price point/);
  for (const r of c.recommendations) assert.match(r.text, /\.$/, 'should end with a period');
});

test('recommendations do not repeat a clause already in the verdict', () => {
  // Knob Creek's verdict already says "with an older age statement" — the engine
  // must not append the age advantage on top of it.
  const c = compare(bySlug(all, 'knob-creek-9-year'), bySlug(all, 'buffalo-trace'));
  const kc = c.recommendations.find((r) => r.side === 'a')!.text;
  assert.equal(kc.match(/age statement/g)?.length, 1);
});

test('flavor deltas are sorted by magnitude, largest first', () => {
  const d = flavorDeltas(bySlug(all, 'makers-mark'), bySlug(all, 'new-riff-bottled-in-bond'));
  const mags = d.map((x) => Math.abs(x.delta));
  assert.deepEqual(mags, [...mags].sort((a, b) => b - a));
  assert.equal(d[0]!.axis, 'spice', 'wheater vs 30%-rye should differ most on spice');
});

test('every pair in the catalogue generates prose without throwing or leaving placeholders', () => {
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const c = compare(all[i]!, all[j]!);
      const prose = [c.opening, c.flavorLead, ...c.recommendations.map((r) => r.text)].join(' ');
      assert.doesNotMatch(prose, /\{[A-Za-z]+\}/, `unfilled placeholder in ${c.slug}`);
      assert.doesNotMatch(prose, /\s{2,}/, `double space in ${c.slug}`);
      assert.doesNotMatch(prose, /undefined|NaN/, `bad value in ${c.slug}`);
    }
  }
});

test('no data file has an unquoted # in a value (YAML would silently truncate it)', () => {
  const dir = new URL('../src/data/bourbons/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.yaml'))) {
    const lines = readFileSync(new URL(file, dir), 'utf8').split('\n');
    lines.forEach((line, i) => {
      // A `#` preceded by whitespace inside an unquoted scalar starts a comment.
      const value = line.match(/^\s*[\w-]+:\s+(?!["'#])(.+)$/)?.[1];
      if (value && /\s#/.test(value)) {
        assert.fail(`${file}:${i + 1} has an unquoted "#" — quote the value:\n  ${line.trim()}`);
      }
    });
  }
});

test('curated notes survive parsing intact', () => {
  // Buffalo Trace's note contains "Mash Bill #1" — the exact shape that YAML
  // silently truncates when the value is left unquoted.
  const bt = bySlug(all, 'buffalo-trace');
  assert.match(bt.mashbill.note!, /Mash Bill #1; figures are a widely used estimate/);
  assert.match(bt.mashbill.note!, /\.$/, 'note should end as a complete sentence');
});

test('a barrel-proof bottle is never framed as similar to a standard one', () => {
  // Elijah Craig Small Batch (94) and Stagg (130) share a style and land close
  // on the flavor axes, but they are not "a closer contest than it looks".
  const c = compare(bySlug(all, 'elijah-craig-small-batch'), bySlug(all, 'stagg'));
  assert.equal(c.similar, false);
  assert.doesNotMatch(c.opening, /closer contest|near neighbours|similar cloth/);
});

test('no recommendation repeats a price or proof point already in the verdict', () => {
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      for (const r of compare(all[i]!, all[j]!).recommendations) {
        // Only the claim itself — the bottle's name precedes "if you want".
        const t = r.text.toLowerCase().split('if you want')[1] ?? '';
        if (/dollar|cheap|\bvalue\b|afford|money/.test(t)) {
          assert.doesNotMatch(t, /lower price point/, `redundant price clause: ${r.text}`);
        }
        if (/\bproof\b.*\bproof\b/.test(t)) {
          assert.doesNotMatch(t, /more proof behind it/, `redundant proof clause: ${r.text}`);
        }
      }
    }
  }
});
