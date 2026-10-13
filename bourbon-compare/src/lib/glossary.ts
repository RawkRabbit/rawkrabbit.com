/**
 * Glossary for /glossary/. Each term has a stable `id` (its anchor), so spec
 * labels elsewhere on the site can link straight to the definition.
 */
export interface Term { id: string; term: string; def: string }
export interface Group { id: string; title: string; intro?: string; terms: Term[] }

export const GLOSSARY: Group[] = [
  {
    id: 'basics',
    title: 'The basics',
    terms: [
      { id: 'bourbon', term: 'Bourbon', def: 'American whiskey made from a grain recipe that is at least 51% corn, distilled to no more than 160 proof, put into new charred oak containers at no more than 125 proof, and bottled at 80 proof or higher. Nothing can be added except water. It can be made anywhere in the United States, not only Kentucky.' },
      { id: 'straight-bourbon', term: 'Straight bourbon', def: 'Bourbon aged at least two years, with nothing added but water. If it is younger than four years, the label has to state its age.' },
      { id: 'tennessee-whiskey', term: 'Tennessee whiskey', def: 'Made in Tennessee to the same rules as bourbon, then filtered through maple charcoal before going into the barrel (the Lincoln County Process). Jack Daniel’s is the best-known example.' },
      { id: 'distillery', term: 'Distillery', def: 'The company that actually made the whiskey.' },
      { id: 'bottler', term: 'Bottler', def: 'The company that put it in the bottle. Many brands buy whiskey from another distillery and bottle it under their own name; on this site the bottler is listed only when it differs from the distillery.' },
      { id: 'sourced', term: 'Sourced', def: 'Whiskey a brand bought from someone else’s distillery rather than making it themselves. Common, legal and often very good; it just means the name on the label is not the place that distilled it.' },
    ],
  },
  {
    id: 'grain',
    title: 'Grain and style',
    terms: [
      { id: 'mash-bill', term: 'Mash bill', def: 'The grain recipe: the percentages of corn, rye, wheat and malted barley that went into the whiskey. Corn brings sweetness, rye brings spice, wheat brings softness and malted barley helps fermentation.' },
      { id: 'mash-bill-provenance', term: 'Published, reported, estimated, not disclosed', def: 'How sure we are of a mash bill. Published means the distillery states it. Reported means it is widely cited but never confirmed. Estimated means it is worked out from secondary sources or from a blend’s components. Not disclosed means nobody has said.' },
      { id: 'traditional', term: 'Traditional', def: 'Corn first, with a modest amount of rye (usually around 10 to 15%) as the second grain. The classic Kentucky profile.' },
      { id: 'high-rye', term: 'High-rye', def: 'More rye than a traditional recipe, often 20 to 35% or more. Expect more pepper, mint and baking spice.' },
      { id: 'wheated', term: 'Wheated', def: 'Wheat replaces rye as the second grain. Softer, rounder and often sweeter, with less spice.' },
      { id: 'four-grain', term: 'Four-grain', def: 'Uses corn, rye, wheat and malted barley together, usually by blending several recipes.' },
      { id: 'high-corn', term: 'High-corn', def: 'An unusually large share of corn, which pushes the flavor toward sweetness and a lighter body.' },
    ],
  },
  {
    id: 'age-proof',
    title: 'Age and proof',
    terms: [
      { id: 'age-statement', term: 'Age statement', def: 'The age printed on the label. In a blend it is the age of the youngest whiskey in the bottle.' },
      { id: 'nas', term: 'No age statement (NAS)', def: 'The label gives no age. Straight bourbon with no age statement is at least four years old.' },
      { id: 'proof', term: 'Proof', def: 'In the United States, proof is twice the alcohol by volume: 100 proof is 50% ABV.' },
      { id: 'abv', term: 'ABV', def: 'Alcohol by volume, the percentage of the liquid that is alcohol.' },
      { id: 'barrel-proof', term: 'Barrel proof (cask strength)', def: 'Bottled at or very close to the strength it came out of the barrel, with little or no water added. Usually well above 100 proof, so a splash of water can open it up.' },
    ],
  },
  {
    id: 'bottling',
    title: 'How it was bottled',
    terms: [
      { id: 'bottled-in-bond', term: 'Bottled-in-Bond', def: 'A legal standard from 1897: made by one distillery in one distilling season, aged at least four years in a federally bonded warehouse, and bottled at exactly 100 proof. The label names where it was distilled.' },
      { id: 'single-barrel', term: 'Single barrel', def: 'Every bottle comes from one barrel, so each barrel tastes a little different.' },
      { id: 'small-batch', term: 'Small batch', def: 'A blend of a limited number of barrels. There is no legal definition, so “small” means whatever the producer says it means.' },
      { id: 'store-pick', term: 'Store pick (private barrel)', def: 'A single barrel chosen by a store, bar or club and sold only through them. Not listed on this site, because each one is a one-off.' },
      { id: 'non-chill-filtered', term: 'Non-chill-filtered', def: 'Not chilled and filtered before bottling. Keeps more of the oils that carry flavor and texture, but the whiskey can turn hazy when cold or when water or ice is added.' },
      { id: 'finished', term: 'Finished', def: 'Moved into a second cask after aging, such as sherry, port, Cognac, honey or amburana, to pick up extra flavor. Double oaked means the second cask is another new oak barrel, often toasted.' },
    ],
  },
  {
    id: 'availability',
    title: 'Availability and price',
    terms: [
      { id: 'widely-available', term: 'Widely available', def: 'Regularly on store shelves at or near the suggested price.' },
      { id: 'limited', term: 'Limited', def: 'Made in smaller amounts or released once or a few times a year. You can usually find it with some looking, though it may sell out and prices vary more.' },
      { id: 'allocated', term: 'Allocated', def: 'Producers ration it to stores, which often hold it for lotteries, regular customers or sell it well above the suggested price. Hard to find at retail.' },
      { id: 'approx-price', term: 'Approximate price', def: 'A US shelf estimate for a 750 ml bottle, shown as a range and dated (for example “as of 2026-10”). Prices vary by state and store. For allocated bottles the top of the range reflects what people actually pay, which can be far above suggested retail.' },
      { id: 'price-tiers', term: 'Value, mid-shelf, premium, luxury', def: 'The price filter on All Bourbons, based on the middle of each bottle’s price range: value is under $35, mid-shelf $35 to $60, premium $60 to $120 and luxury $120 and up.' },
    ],
  },
  {
    id: 'tasting',
    title: 'Tasting and this site',
    terms: [
      { id: 'nose-palate-finish', term: 'Nose, palate, finish', def: 'The three stages of tasting: what you smell, what you taste while it is in your mouth, and what lingers after you swallow.' },
      { id: 'flavor-profile', term: 'Flavor profile', def: 'The radar chart on comparison pages. Each bottle is scored from 0 to 10 on six axes: sweetness, spice, oak, fruit, heat and nuttiness. The scores are this site’s editorial judgement from published tasting notes, meant for comparing bottles rather than as precise measurements.' },
      { id: 'best-for', term: 'Best for', def: 'How a bottle tends to shine: neat, on the rocks, in an old fashioned, in a highball, or in other cocktails.' },
      { id: 'ag-rating', term: 'AG’s Rating and AG’s Notes', def: 'Personal ratings from the site’s author, from 0 to 5 stars in half steps, with tasting notes. They reflect one palate and are added by hand, so most bottles are not rated yet.' },
    ],
  },
];

/** Spec-table labels that link to a glossary entry. */
export const LABEL_TO_TERM: Record<string, string> = {
  'Type / Style': 'grain',
  'Mash Bill': 'mash-bill',
  Age: 'age-statement',
  Proof: 'proof',
  'Approx. Price': 'approx-price',
  Availability: 'availability',
  Distillery: 'distillery',
  Bottler: 'bottler',
};
