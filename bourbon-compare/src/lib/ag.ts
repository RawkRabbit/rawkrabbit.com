/**
 * The owner's personal rating and notes. Values live only in the YAML data files
 * (`personal.rating`, `personal.notes`) and change only through a pull request;
 * the site renders them read-only and has no way to edit them.
 */
export const AG_RATING = 'AG’s Rating';
export const AG_NOTES = 'AG’s Notes';
export const NOT_RATED = 'Not rated yet';

/** "3.5 / 5", or null when unrated. */
export function formatRating(rating: number | null): string | null {
  return rating === null ? null : `${Number.isInteger(rating) ? rating.toFixed(0) : rating.toFixed(1)} / 5`;
}

/** Per-star fill for 5 stars: 1 full, 0.5 half, 0 empty. */
export function starFills(rating: number): number[] {
  return [0, 1, 2, 3, 4].map((i) => Math.max(0, Math.min(1, rating - i)));
}
