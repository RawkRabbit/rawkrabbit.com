# Working on rawkrabbit.com

Instructions for Claude (or any AI assistant) maintaining this site.

## Owner preferences
- The owner is a non-coder. Explain changes in plain language, with a preview link.
- Writing rules for ALL site copy and commit messages: no em dashes, no litotes ("not bad", "not unlike"). Direct, plain, confident.

## Workflow
1. Never push straight to `main` after initial setup. Create a branch (`update/<short-name>`), commit, push, open a pull request.
2. Run `npm run build` before pushing. Do not open a PR with a failing build.
3. Cloudflare posts a preview URL on the PR. Share it with the owner. The owner approves and merges; merging deploys.
4. Keep changes small and focused: one PR per request.

## Brand rules (approved, do not reopen)
- Name: **RawkRabbit**. One word, two capital Rs. Lowercase `rawkrabbit` only in URLs, handles, code. Never "Rawkrabbit", "Rawk Rabbit", "RockRabbit", "RawkRabit".
- Pronunciation "say it: rock rabbit" stays visible (footer and About).
- Brand only: no personal name, photo, or link to the owner's career anywhere on the site.
- Each project has its own name and is signed "by RawkRabbit".
- Colors: Ink #16181D, Paper #F6F6F3, Graphite #5A5F6A, Mist #E3E5E8, Amp #FF5A1F (fills only, about 3% of a screen), Amp Deep #C2410C (orange text/links on light).
- Type: Archivo (display, width 112, 800 to 900), IBM Plex Sans (body), JetBrains Mono (metadata).
- Logo: never recolor, never move the orange cap off the tall ear.
- No ads, no third-party trackers. Analytics, if any, is Cloudflare Web Analytics only.

## Structure
- `src/content/projects/*.md`: one file per project. Schema in `src/content.config.ts`.
- `src/content/log/*.md`: changelog and notes. Feeds `/log/` and `/rss.xml`.
- `src/components/StatusMeter.astro`: status as level bars (idea 1, building 2, beta 3, live 4 with orange peak).
- Every project page uses the same template: problem, who it's for, body (What it does, What's next), support.

## When a project status changes
Update `status`, `statusNote`, `updated`, and `links` in the project file, and add a log entry with `project:` set.

## BourbonCompare (`bourbon-compare/`)
- A separate Astro project with its own `package.json`, served at `/bourboncompare/` (`base` in `bourbon-compare/astro.config.mjs`).
- Root `npm run build` runs `build:bourbon`, which installs, builds and copies it into `dist/bourboncompare/`.
- Internal links must go through `url()` in `bourbon-compare/src/lib/url.ts` so the base path stays correct.
- Run `npm test --prefix bourbon-compare` after data or engine changes.
