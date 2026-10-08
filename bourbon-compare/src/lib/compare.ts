import type { BourbonEntry } from './schema.ts';
import { FLAVOR_AXES } from './schema.ts';
import {
  formatAge,
  formatMashbill,
  formatPrice,
  formatProof,
  flavorDistance,
  priceMid,
  styleLabel,
} from './derive.ts';
import {
  AXIS_LABEL,
  CONTRAST_OPENERS,
  FLAVOR_LEAD,
  SIMILAR_OPENERS,
  magnitude,
  pairHash,
  pick,
  styleDescriptor,
} from './lexicon.ts';

/**
 * The comparison engine. Pure functions over two bottles — no Astro, no DOM.
 * Everything the reference screenshots show is generated here.
 */

export type Side = 'a' | 'b';

export interface SpecRow {
  label: string;
  a: string;
  b: string;
  /** Highlights whichever side leads on a measurable spec. */
  badge: { side: Side; text: string } | null;
  /** Footnote marker text, e.g. when a mash bill isn't officially published. */
  note?: string;
}

export interface FlavorDelta {
  axis: (typeof FLAVOR_AXES)[number];
  a: number;
  b: number;
  /** Signed: positive means A scores higher. */
  delta: number;
}

export interface Comparison {
  a: BourbonEntry;
  b: BourbonEntry;
  slug: string;
  /** Alphabetical ordering of the same pair — the rel=canonical target. */
  canonicalSlug: string;
  opening: string;
  specs: SpecRow[];
  deltas: FlavorDelta[];
  flavorLead: string;
  recommendations: { side: Side; text: string }[];
  /** True when the two are stylistically close, which changes the framing. */
  similar: boolean;
}

/** URL slug for a pair as displayed, preserving A/B order. */
export function pairSlug(slugA: string, slugB: string): string {
  return `${slugA}-vs-${slugB}`;
}

/**
 * The alphabetical ordering of a pair. Both orders are real pages; this one is
 * the rel=canonical target so a pair isn't indexed twice.
 */
export function canonicalPairSlug(slugA: string, slugB: string): string {
  return [slugA, slugB].sort().join('-vs-');
}

const bold = (s: string) => `**${s}**`;

// ---------------------------------------------------------------- specs

function ageYears(b: BourbonEntry): number | null {
  return b.age.stated ? b.age.years : null;
}

export function specRows(a: BourbonEntry, b: BourbonEntry): SpecRow[] {
  const rows: SpecRow[] = [];

  rows.push({ label: 'Type / Style', a: styleLabel(a), b: styleLabel(b), badge: null });

  const unpublished = [a, b].filter((x) => x.mashbill.provenance !== 'published');
  rows.push({
    label: 'Mash Bill',
    a: formatMashbill(a),
    b: formatMashbill(b),
    badge: null,
    note: unpublished.length
      ? `${unpublished.map((x) => x.name).join(' and ')} ${unpublished.length > 1 ? 'do' : 'does'} not publish an official mash bill.`
      : undefined,
  });

  const [ageA, ageB] = [ageYears(a), ageYears(b)];
  rows.push({
    label: 'Age',
    a: formatAge(a),
    b: formatAge(b),
    badge:
      ageA !== null && ageB !== null && Math.abs(ageA - ageB) >= 1
        ? { side: ageA > ageB ? 'a' : 'b', text: `+${Math.abs(ageA - ageB)} yr` }
        : null,
  });

  const proofDiff = a.proof - b.proof;
  rows.push({
    label: 'Proof',
    a: formatProof(a),
    b: formatProof(b),
    badge:
      Math.abs(proofDiff) >= 2
        ? { side: proofDiff > 0 ? 'a' : 'b', text: `+${Math.round(Math.abs(proofDiff))} proof` }
        : null,
  });

  const priceDiff = priceMid(a) - priceMid(b);
  rows.push({
    label: 'Approx. Price',
    a: formatPrice(a),
    b: formatPrice(b),
    badge:
      Math.abs(priceDiff) >= 5
        ? { side: priceDiff < 0 ? 'a' : 'b', text: `~$${Math.round(Math.abs(priceDiff))} less` }
        : null,
    note: `US shelf prices as of ${a.price.asOf}; they vary widely by market.`,
  });

  if (a.availability !== b.availability) {
    const rank = { shelf: 0, limited: 1, allocated: 2 } as const;
    const label = { shelf: 'Widely available', limited: 'Limited', allocated: 'Allocated' } as const;
    rows.push({
      label: 'Availability',
      a: label[a.availability],
      b: label[b.availability],
      badge: { side: rank[a.availability] < rank[b.availability] ? 'a' : 'b', text: 'easier to find' },
    });
  }

  if (a.personal.rating !== null || b.personal.rating !== null) {
    const fmt = (x: BourbonEntry) => (x.personal.rating === null ? 'Not yet rated' : `${x.personal.rating} / 10`);
    const [ra, rb] = [a.personal.rating, b.personal.rating];
    rows.push({
      label: 'Your Rating',
      a: fmt(a),
      b: fmt(b),
      badge: ra !== null && rb !== null && ra !== rb ? { side: ra > rb ? 'a' : 'b', text: 'your pick' } : null,
    });
  }

  return rows;
}

// ---------------------------------------------------------------- flavor

export function flavorDeltas(a: BourbonEntry, b: BourbonEntry): FlavorDelta[] {
  return FLAVOR_AXES.map((axis) => ({
    axis,
    a: a.flavor[axis],
    b: b.flavor[axis],
    delta: a.flavor[axis] - b.flavor[axis],
  })).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
}

// ---------------------------------------------------------------- prose

/** Plural noun for the shared-style framing, e.g. "high-rye bourbons". */
function sharedDescriptor(a: BourbonEntry): string {
  const style = { wheated: 'wheated', 'high-rye': 'high-rye', traditional: 'traditional', 'four-grain': 'four-grain', 'high-corn': 'high-corn' }[a.style];
  const noun = { bourbon: 'bourbons', tennessee: 'Tennessee whiskeys', rye: 'ryes', 'wheat-whiskey': 'wheat whiskeys', 'american-whiskey': 'American whiskeys' }[a.category];
  return `${style} ${noun}`;
}

/** The single biggest non-flavor differentiator, phrased for the opening line. */
function decidingAxis(a: BourbonEntry, b: BourbonEntry): string {
  const candidates = [
    { weight: Math.abs(a.proof - b.proof) / 10, text: `proof (${a.proof} vs. ${b.proof})` },
    { weight: Math.abs(priceMid(a) - priceMid(b)) / 20, text: `price (${formatPrice(a)} vs. ${formatPrice(b)})` },
    {
      weight: ageYears(a) !== null && ageYears(b) !== null ? Math.abs(ageYears(a)! - ageYears(b)!) / 4 : 0,
      text: `age (${formatAge(a)} vs. ${formatAge(b)})`,
    },
  ].sort((x, y) => y.weight - x.weight);
  return candidates[0]!.weight > 0.2 ? candidates[0]!.text : 'personal preference more than spec';
}

export function openingLine(a: BourbonEntry, b: BourbonEntry): { text: string; similar: boolean } {
  const hash = pairHash(a.slug, b.slug);
  // Sharing a style is not enough: a barrel-proof bruiser against a standard
  // bottling of the same mash bill is a contrast, however close the flavor
  // scores land.
  const similar =
    a.style === b.style &&
    flavorDistance(a, b) <= 14 &&
    a.bottling.barrelProof === b.bottling.barrelProof &&
    Math.abs(a.proof - b.proof) < 20;

  if (similar) {
    const text = pick(SIMILAR_OPENERS, hash)
      .replace('{A}', bold(a.name))
      .replace('{B}', bold(b.name))
      .replace('{shared}', sharedDescriptor(a))
      .replace('{axis}', decidingAxis(a, b));
    return { text, similar };
  }

  const text = pick(CONTRAST_OPENERS, hash)
    .replace('{A}', bold(a.name))
    .replace('{B}', bold(b.name))
    .replace('{dA}', styleDescriptor(a, hash, 0))
    .replace('{dB}', styleDescriptor(b, hash, 3));
  return { text, similar };
}

export function flavorLead(a: BourbonEntry, b: BourbonEntry): string {
  const top = flavorDeltas(a, b)[0]!;
  if (Math.abs(top.delta) < 2) {
    return 'These two land close together on every flavor axis — the differences are in texture and proof more than character.';
  }
  return pick(FLAVOR_LEAD[top.axis] ?? [`${AXIS_LABEL[top.axis]} is the main separator.`], pairHash(a.slug, b.slug));
}

/**
 * Advantages one bottle holds over the other, phrased as clauses that append to
 * its `verdict` fragment. Capped at two so the sentence stays readable.
 */
function advantages(x: BourbonEntry, y: BourbonEntry): string[] {
  const out: string[] = [];
  // The name counts too: "Elijah Craig Barrel Proof ... with more proof behind
  // it" is redundant even though the verdict never says "proof".
  const verdict = `${x.name} ${x.verdict}`.toLowerCase();

  const priceDiff = priceMid(y) - priceMid(x);
  if (priceDiff >= 5 && !/pric|dollar|\$|cheap|value|afford|money|cost/.test(verdict)) {
    const mag = magnitude(priceDiff, 12, 30);
    out.push(`at a ${mag ? mag + ' ' : ''}lower price point`.replace('  ', ' '));
  }

  const proofDiff = x.proof - y.proof;
  if (proofDiff >= 6 && !/proof|strength|cask|barrel-proof/.test(verdict)) {
    const mag = magnitude(proofDiff, 10, 25);
    out.push(`with ${mag ? mag + ' ' : ''}more proof behind it`.replace('  ', ' '));
  }

  const [ax, ay] = [ageYears(x), ageYears(y)];
  if (ax !== null && ay !== null && ax - ay >= 2 && !verdict.includes('age')) {
    out.push('with an older age statement');
  }

  const rank = { shelf: 0, limited: 1, allocated: 2 } as const;
  if (rank[x.availability] < rank[y.availability] && !/find|available|shelf/.test(verdict)) {
    out.push('without hunting for it');
  }

  if (x.bottling.chillFiltered === false && y.bottling.chillFiltered === true) {
    out.push('with the texture that comes from skipping chill filtration');
  }

  // A verdict that is already a mouthful takes at most one extra clause;
  // two appended clauses on top of a long fragment reads as a run-on.
  return out.slice(0, x.verdict.trim().length > 70 ? 1 : 2);
}

export function recommendations(a: BourbonEntry, b: BourbonEntry): { side: Side; text: string }[] {
  const build = (x: BourbonEntry, y: BourbonEntry, side: Side) => {
    const clauses = advantages(x, y);
    const tail = clauses.length ? ` ${clauses.join(' and ')}` : '';
    return { side, text: `Go with ${bold(x.name)} if you want ${x.verdict.trim().replace(/\.$/, '')}${tail}.` };
  };
  return [build(a, b, 'a'), build(b, a, 'b')];
}

// ---------------------------------------------------------------- assembly

export function compare(a: BourbonEntry, b: BourbonEntry): Comparison {
  const { text: opening, similar } = openingLine(a, b);
  return {
    a,
    b,
    slug: pairSlug(a.slug, b.slug),
    canonicalSlug: canonicalPairSlug(a.slug, b.slug),
    opening,
    specs: specRows(a, b),
    deltas: flavorDeltas(a, b),
    flavorLead: flavorLead(a, b),
    recommendations: recommendations(a, b),
    similar,
  };
}
