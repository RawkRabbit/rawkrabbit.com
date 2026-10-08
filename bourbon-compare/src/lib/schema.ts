import { z } from 'zod';

/**
 * One YAML file per bottle in src/data/bourbons/. The filename is the slug —
 * knob-creek-9-year.yaml becomes /bourbons/knob-creek-9-year — so there is no
 * separate `id` field to drift out of sync.
 *
 * Everything here is validated at build time. A mash bill that doesn't add up,
 * a flavor score out of range, or a bourbon under 51% corn fails `npm run build`
 * instead of quietly rendering wrong.
 */

const axis = z.number().min(0).max(10);

/** The six radar axes. Order matters — it's the order they're drawn. */
export const FLAVOR_AXES = ['sweetness', 'spice', 'oak', 'fruit', 'heat', 'nuttiness'] as const;

const flavor = z.object({
  sweetness: axis,
  spice: axis,
  oak: axis,
  fruit: axis,
  heat: axis,
  nuttiness: axis,
});

/**
 * Most distilleries never publish an exact mash bill. Beam's widely-cited
 * 75/13/12 for Knob Creek has never been official; Bardstown publishes theirs to
 * the percent. Provenance travels with the numbers so the UI can footnote
 * anything that isn't `published` rather than presenting rumor as spec.
 */
const mashbill = z.object({
  provenance: z.enum(['published', 'reported', 'estimated', 'unknown']),
  corn: z.number().min(0).max(100).optional(),
  rye: z.number().min(0).max(100).optional(),
  wheat: z.number().min(0).max(100).optional(),
  maltedBarley: z.number().min(0).max(100).optional(),
  note: z.string().optional(),
});

export const bourbonSchema = z
    .object({
      name: z.string(),
      brand: z.string(),
      /** Who actually distilled it. For sourced brands this differs from `bottler`. */
      distillery: z.string(),
      /** Who put it in the bottle. Equal to `distillery` for non-sourced brands. */
      bottler: z.string(),
      category: z.enum(['bourbon', 'tennessee', 'rye', 'wheat-whiskey', 'american-whiskey']),
      /** Frames the bottle's era in the comparison prose: heritage Kentucky vs. modern craft vs. sourced. */
      producerType: z.enum(['heritage', 'modern-craft', 'sourced']),
      /** Drives the style descriptors in the comparison prose. */
      style: z.enum(['wheated', 'high-rye', 'traditional', 'four-grain', 'high-corn']),

      mashbill,

      age: z.object({
        years: z.number().positive().nullable(),
        stated: z.boolean(),
        note: z.string().optional(),
      }),

      proof: z.number().min(80).max(150),

      /** US shelf price. `low`/`high` are equal for a single-figure price. */
      price: z.object({
        low: z.number().positive(),
        high: z.number().positive(),
        asOf: z.string().regex(/^\d{4}-\d{2}$/, 'price.asOf must be YYYY-MM'),
      }),

      availability: z.enum(['shelf', 'limited', 'allocated']),

      bottling: z.object({
        singleBarrel: z.boolean(),
        smallBatch: z.boolean(),
        barrelProof: z.boolean(),
        bottledInBond: z.boolean(),
        chillFiltered: z.boolean().nullable(),
      }),

      flavor,

      notes: z.object({
        nose: z.array(z.string()).min(1),
        palate: z.array(z.string()).min(1),
        finish: z.array(z.string()).min(1),
      }),

      /** 1–3 sentences. Becomes this bottle's "Flavor Profile Differences" bullet. */
      blurb: z.string(),

      /**
       * A sentence FRAGMENT, deliberately. Slots into
       * "Go with {name} if you want {verdict}." — that's what makes the
       * recommendation composable instead of pair-specific.
       */
      verdict: z.string(),

      bestFor: z.array(z.enum(['neat', 'rocks', 'old-fashioned', 'highball', 'cocktails'])).min(1),

      personal: z
        .object({
          rating: z.number().min(0).max(10).nullable(),
          notes: z.string().nullable(),
          dateTried: z.string().nullable(),
        })
        .default({ rating: null, notes: null, dateTried: null }),

      sources: z.array(z.object({ label: z.string(), url: z.string().url().optional() })).min(1),
    })
    .superRefine((b, ctx) => {
      const { corn = 0, rye = 0, wheat = 0, maltedBarley = 0, provenance } = b.mashbill;

      if (provenance !== 'unknown') {
        const sum = corn + rye + wheat + maltedBarley;
        // ±1 tolerance: published bills are often rounded to whole percents.
        if (Math.abs(sum - 100) > 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['mashbill'],
            message: `mash bill sums to ${sum}%, expected 100%`,
          });
        }
        if ((b.category === 'bourbon' || b.category === 'tennessee') && corn < 51) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['mashbill', 'corn'],
            message: `${b.category} must be at least 51% corn, got ${corn}%`,
          });
        }
        if (b.category === 'rye' && rye < 51) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['mashbill', 'rye'],
            message: `rye whiskey must be at least 51% rye, got ${rye}%`,
          });
        }
        if (b.style === 'wheated' && wheat <= rye) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['style'],
            message: 'style is "wheated" but wheat does not exceed rye in the mash bill',
          });
        }
      }

      if (b.price.low > b.price.high) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['price'], message: 'price.low exceeds price.high' });
      }
      if (b.age.stated && b.age.years === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['age'], message: 'age.stated is true but age.years is null' });
      }
      // Bottled-in-Bond is a legal standard: 100 proof, at least 4 years old.
      if (b.bottling.bottledInBond && b.proof !== 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['proof'], message: 'bottled-in-bond must be exactly 100 proof' });
      }
    });

export type Bourbon = z.infer<typeof bourbonSchema>;
/** A bottle plus its slug (the YAML filename), which is what the engine keys on. */
export type BourbonEntry = Bourbon & { slug: string };
