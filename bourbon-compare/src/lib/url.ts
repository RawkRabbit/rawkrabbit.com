/**
 * The site lives under a base path (/bourboncompare on rawkrabbit.com). Every internal
 * link goes through `url()` so the base is set in one place: astro.config.mjs.
 */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function url(path: string): string {
  return `${BASE}${path}`;
}
