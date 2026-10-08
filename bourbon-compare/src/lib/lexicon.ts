import type { Bourbon } from './schema.ts';
import { article, secondaryGrain } from './derive.ts';

/**
 * The vocabulary the comparison prose is built from. Kept apart from compare.ts
 * so wording can be tuned without touching logic.
 *
 * Every list here is a set of interchangeable variants. The engine picks one by
 * hashing the pair, so a given comparison always reads the same way, but browsing
 * several in a row doesn't feel like the same sentence with the nouns swapped.
 */

/** Deterministic, order-independent hash of a pair of slugs. */
export function pairHash(slugA: string, slugB: string): number {
  const key = [slugA, slugB].sort().join('|');
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export const pick = <T>(variants: readonly T[], hash: number, salt = 0): T =>
  variants[(hash + salt * 7919) % variants.length]!;

const ERA: Record<Bourbon['producerType'], readonly string[]> = {
  heritage: ['traditional', 'classic', 'old-guard'],
  'modern-craft': ['modern', 'contemporary', 'new-wave'],
  sourced: ['sourced', 'blender-built'],
};

const ARCHETYPE: Record<Bourbon['producerType'], readonly string[]> = {
  heritage: ['classic', 'Kentucky staple', 'stalwart'],
  'modern-craft': ['craft style', 'craft expression', 'craft build'],
  sourced: ['blend', 'bottling'],
};

const GRAIN_ADJ = {
  wheat: ['high-wheat', 'wheat-forward', 'wheated'],
  rye: ['high-rye', 'rye-forward', 'spice-driven'],
  none: ['corn-forward', 'classically built', 'even-keeled'],
} as const;

/** Barrel-proof bottles are defined by strength before anything else. */
const BARREL_PROOF = [
  'an uncut, cask-strength bruiser',
  'a full-proof, unfiltered heavyweight',
  'an undiluted barrel-strength pour',
] as const;

/**
 * Builds a phrase like "a modern, high-wheat craft style" or
 * "a traditional, high-rye classic".
 */
export function styleDescriptor(b: Bourbon, hash: number, salt = 0): string {
  const grainKey = secondaryGrain(b);
  const grain = pick(GRAIN_ADJ[grainKey ?? 'none'], hash, salt + 1);

  if (b.bottling.barrelProof) {
    return grainKey ? `an uncut, ${grain} heavyweight` : pick(BARREL_PROOF, hash, salt);
  }

  const era = pick(ERA[b.producerType], hash, salt);
  const archetype = pick(ARCHETYPE[b.producerType], hash, salt + 2);
  return `${article(era)} ${era}, ${grain} ${archetype}`;
}

/** Openers for two bottles of genuinely different character. */
export const CONTRAST_OPENERS = [
  'Comparing {A} and {B} reveals a matchup between {dA} and {dB}.',
  'Put {A} next to {B} and you have {dA} set against {dB}.',
  '{A} and {B} sit on opposite sides of a familiar divide: {dA} versus {dB}.',
] as const;

/** Openers for two bottles that are stylistically close. */
export const SIMILAR_OPENERS = [
  'Comparing {A} and {B} is a closer contest than it looks — both are {shared}, separated mainly by {axis}.',
  '{A} and {B} are cut from similar cloth: two takes on {shared}, where the real difference is {axis}.',
  'On paper {A} and {B} are near neighbours — both {shared} — so {axis} is what actually decides it.',
] as const;

/** Lead-ins for the flavor section, chosen by which axis differs most. */
export const FLAVOR_LEAD: Record<string, readonly string[]> = {
  spice: ['The gap between these two is mostly about spice.', 'Rye spice is the dividing line here.'],
  sweetness: ['Sweetness is where these two part ways.', 'The clearest split is how sweet each one drinks.'],
  oak: ['Barrel influence is the main separator.', 'Oak is doing most of the differentiating here.'],
  fruit: ['Fruit character is what sets these apart.', 'The fruit-versus-grain contrast drives this one.'],
  heat: ['Proof and heat dominate the difference.', 'These two land very differently on the palate for heat.'],
  nuttiness: ['Nutty, grain-driven character is the divider.', 'The house grain character is what splits these.'],
};

/** Qualifiers by how large a numeric gap is. */
export function magnitude(delta: number, small: number, large: number): 'slightly' | '' | 'significantly' {
  const d = Math.abs(delta);
  if (d < small) return 'slightly';
  if (d >= large) return 'significantly';
  return '';
}

export const AXIS_LABEL: Record<string, string> = {
  sweetness: 'sweetness',
  spice: 'spice',
  oak: 'oak',
  fruit: 'fruit',
  heat: 'heat',
  nuttiness: 'nuttiness',
};
