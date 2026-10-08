import type { Bourbon, BourbonEntry } from './schema.ts';
import { FLAVOR_AXES } from './schema.ts';

/** Everything derivable from a single bottle. No pair logic lives here. */

export const mashbillKnown = (b: Bourbon) => b.mashbill.provenance !== 'unknown';

export const priceMid = (b: Bourbon) => (b.price.low + b.price.high) / 2;

export function formatPrice(b: Bourbon): string {
  return b.price.low === b.price.high ? `~$${b.price.low}` : `~$${b.price.low} – $${b.price.high}`;
}

export function priceTier(b: Bourbon): 'value' | 'midshelf' | 'premium' | 'luxury' {
  const p = priceMid(b);
  if (p < 35) return 'value';
  if (p < 60) return 'midshelf';
  if (p < 120) return 'premium';
  return 'luxury';
}

export function formatAge(b: Bourbon): string {
  if (b.age.years === null) return 'No age statement';
  return `${b.age.years} year${b.age.years === 1 ? '' : 's'}`;
}

export function formatProof(b: Bourbon): string {
  const abv = b.proof / 2;
  const abvStr = Number.isInteger(abv) ? String(abv) : abv.toFixed(1);
  return `${b.proof} proof (${abvStr}% ABV)`;
}

export function formatMashbill(b: Bourbon): string {
  if (!mashbillKnown(b)) return 'Not disclosed';
  const { corn = 0, rye = 0, wheat = 0, maltedBarley = 0 } = b.mashbill;
  return [
    corn && `${corn}% corn`,
    rye && `${rye}% rye`,
    wheat && `${wheat}% wheat`,
    maltedBarley && `${maltedBarley}% malted barley`,
  ]
    .filter(Boolean)
    .join(', ');
}

const CATEGORY_LABEL: Record<Bourbon['category'], string> = {
  bourbon: 'Bourbon',
  tennessee: 'Tennessee Whiskey',
  rye: 'Rye Whiskey',
  'wheat-whiskey': 'Wheat Whiskey',
  'american-whiskey': 'American Whiskey',
};

const STYLE_LABEL: Record<Bourbon['style'], string> = {
  wheated: 'Wheated',
  'high-rye': 'High-Rye',
  traditional: 'Traditional',
  'four-grain': 'Four-Grain',
  'high-corn': 'High-Corn',
};

/** e.g. "Wheated Bourbon", "Traditional / High-Rye Bourbon" (matches the reference layout). */
export function styleLabel(b: Bourbon): string {
  const base = `${STYLE_LABEL[b.style]} ${CATEGORY_LABEL[b.category]}`;
  return b.bottling.barrelProof ? `${base}, Barrel Proof` : base;
}

/**
 * The grain that defines this bottle's character after corn.
 *
 * Driven by the curated `style` rather than raw percentages: nearly every
 * traditional bourbon has *some* rye in it, but 10% rye does not make Elijah
 * Craig "high-rye". Style is the field that encodes that judgement.
 */
export function secondaryGrain(b: Bourbon): 'rye' | 'wheat' | null {
  if (b.style === 'wheated') return 'wheat';
  if (b.style === 'high-rye') return 'rye';
  return null;
}

/** Correct indefinite article for a phrase — "an old-guard", "a modern". */
export function article(phrase: string): 'a' | 'an' {
  return /^[aeiou]/i.test(phrase.trim()) ? 'an' : 'a';
}

/**
 * A rough 0–10 "how much is this pour shouting at you" score, blending proof
 * with the oak and heat axes. Used to frame intensity contrasts in the prose.
 */
export function intensity(b: Bourbon): number {
  const proofScore = Math.min(10, Math.max(0, (b.proof - 80) / 5));
  return Number(((proofScore + b.flavor.oak + b.flavor.heat) / 3).toFixed(2));
}

/** Total absolute distance across the six flavor axes. 0 = identical. */
export function flavorDistance(a: Bourbon, b: Bourbon): number {
  return FLAVOR_AXES.reduce((sum, ax) => sum + Math.abs(a.flavor[ax] - b.flavor[ax]), 0);
}

/** Bottles closest in flavor to `target`, for "compare against similar" links. */
export function nearestNeighbours(target: BourbonEntry, all: BourbonEntry[], count = 4): BourbonEntry[] {
  return all
    .filter((b) => b.slug !== target.slug)
    .map((b) => ({ b, d: flavorDistance(target, b) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, count)
    .map((x) => x.b);
}
