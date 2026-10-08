# BourbonCompare

Side-by-side bourbon comparisons — mash bill, age, proof, price and flavor profile,
plus a plain-language read on which bottle suits what. Static site, no database, no
runtime API keys.

```bash
npm install
npm run dev      # http://localhost:4321/bourboncompare/
npm test         # validates the data and the comparison engine
npm run build    # writes dist/
```

## How it works

The master list lives in `src/data/bourbons/` — **one YAML file per bottle, and the
filename is the slug**. Everything else is derived:

| Piece | Where |
|---|---|
| Data schema (validated at build) | `src/lib/schema.ts` |
| Per-bottle derived facts (price tiers, formatting) | `src/lib/derive.ts` |
| Comparison engine (specs, deltas, prose) | `src/lib/compare.ts` |
| Prose vocabulary and templates | `src/lib/lexicon.ts` |

The comparison prose is **generated from the data by rules**, not written per pair and
not produced by a language model at runtime. Each bottle carries a `blurb` (its flavor
paragraph) and a `verdict` (a sentence fragment). The engine picks the framing, computes
the spec deltas, and appends rule-derived clauses like "at a lower price point". Adding
one bottle therefore costs one file, not N new comparisons.

Wording variants are chosen by hashing the pair, so a given comparison always reads the
same way, but browsing several in a row doesn't feel repetitive.

## The Random link

`Random` in the nav (and `🎲 Surprise me` on the home page) picks two bottles at
random and jumps to their comparison. It never lands on the page you are already
viewing and never compares a bottle to itself.

Both are progressively enhanced: the `href` is a real pre-rendered comparison,
seeded from the page's own path so it varies page to page, and JavaScript upgrades
the click into a true random pick. With JS disabled the links still go somewhere
valid. Any element with a `data-random` attribute picks up the behaviour.

## Adding a bourbon

Copy any file in `src/data/bourbons/` and edit it. The schema is strict on purpose —
`npm test` and `npm run build` will both reject:

- a mash bill that doesn't sum to 100%
- a bourbon under 51% corn, or a rye under 51% rye
- `style: wheated` when wheat doesn't exceed rye
- bottled-in-bond at anything other than 100 proof
- a flavor axis outside 0–10, or `age.stated: true` with a null age
- **an unquoted `#` in a value** — YAML reads it as a comment and silently truncates
  the rest of the line. Quote anything containing `#` (`note: "Mash Bill #1 is ..."`).

Two fields carry editorial judgement rather than fact:

- **`style`** decides how the bottle is described. Nearly every traditional bourbon has
  *some* rye in it; `high-rye` means the rye is a defining characteristic, not merely present.
- **`flavor`** (0–10 on six axes) drives the radar and the "biggest gap first" ordering.
  These are a starting point derived from published tasting notes — tune them to your palate.

`mashbill.provenance` is how the site stays honest: `published` means the distillery
publishes it, `reported` means it is widely cited but never confirmed, `estimated` means
secondary sources, `unknown` means it renders as "Not disclosed". Anything not `published`
is footnoted in the UI.

`personal` starts null on every bottle. Fill in `rating` (0–10) and the comparison table
grows a "Your Rating" row.

## Deploying to OMV

```bash
docker compose up -d --build
```

Then open `http://<nas-address>:8080`. Change the host port in `docker-compose.yml` if
8080 is taken. Rebuild the same way after editing data files.

The build is a multi-stage image: Node builds the site, then nginx serves ~4,200 static
files with gzip on. Nothing persists, so the container can be destroyed and recreated freely.

## Going public later

The output is plain static files, so `npm run build` and upload `dist/` to Netlify,
Cloudflare Pages or similar. Two things to know before you do:

- **Page count scales quadratically.** Both orderings of every pair are pre-rendered
  (`a-vs-b` and `b-vs-a`), so 65 bottles is ~4,200 pages and ~114 MB uncompressed. At
  ~120 bottles that becomes ~14,000 pages, which starts to approach some hosts' file
  limits. If you cross that, the fix is to pre-render a curated subset and resolve the
  long tail client-side from a single JSON bundle.
- Reversed pages already emit `rel="canonical"` pointing at the alphabetical ordering,
  so a pair isn't indexed twice. Set the real domain in `astro.config.mjs` (`site`) first,
  or the canonical URLs will point at localhost.

Worth adding at that point: a sitemap (`@astrojs/sitemap`), an age gate, and a visible
"prices are estimates" disclaimer beyond the current footer line.

## Data caveats

Prices are US shelf estimates with an `asOf` month and drift constantly, especially on
allocated bottles where secondary pricing bears no relation to MSRP. Ages for no-age-statement
bottles are "generally reported" figures, not guarantees. Where sources genuinely conflict,
the file says so in a `note` rather than picking a number silently.
