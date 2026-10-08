import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { bourbonSchema } from './lib/schema.ts';

/**
 * One YAML file per bottle in src/data/bourbons/; the filename is the slug.
 * The schema itself lives in lib/schema.ts so the comparison engine and its
 * unit tests can import it without pulling in the Astro runtime.
 */
const bourbons = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/data/bourbons' }),
  schema: bourbonSchema,
});

export const collections = { bourbons };
