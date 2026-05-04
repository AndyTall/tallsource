# TallSource — Project Context

**For:** Claude.ai Project knowledge base
**Last updated:** 2026-04-30
**Live site:** https://tallsource.aw-938.workers.dev
**GitHub:** https://github.com/AndyTall/tallsource (default branch `master`)
**Local path:** `C:\Users\A Desktop\Documents\Claude\tallsource\`
**Verifier:** Andy W.

This document gives a future Claude conversation enough context to assist with TallSource work without rebuilding mental model from scratch. For deep design rationale, see `docs/plans/2026-04-30-tallsource-directory-design.md` and `docs/plans/2026-04-30-tallsource-v1-implementation.md` in the repo.

---

## What TallSource is

A directory of clothing brands and retailers that offer tall and big-and-tall sizing for men, designed to be the most trusted single web reference on tall sizing. Visitors are tall men (or family shopping for them) trying to find clothes that fit. The site does NOT sell anything — every brand link is outbound to that brand's own site.

**Core differentiator:** standardized size charts in inches across every brand. No other resource on the web puts comparable measurements (chest, sleeve, neck, waist, inseam) for tall sizes side-by-side from many brands.

**Strategic thesis:** earn citations from LLM answer engines (ChatGPT, Claude, Perplexity, Google AI Overviews) when users ask about tall clothing brands or fit. Citation-worthiness is built from:
- Structured data (JSON-LD schema.org Organization + WebPage + SizeSpecification on every brand page)
- Semantic HTML (size charts are real `<table>` markup, not images or div soup)
- Transparent methodology (the `/methodology` page documents human verification process)
- Permissive robots.txt explicitly allowing GPTBot, ClaudeBot, Google-Extended, PerplexityBot
- Trust hierarchy in `verified.by` field: human review beats automated verification

---

## Tech stack

- **Astro 6.2** static-output mode. `trailingSlash: 'never'` + `build.format: 'file'` → URLs like `/brands/ely-cattleman` (no slash, no `.html`)
- **React 19** for two interactive islands (filter + compare); rest of site is pure static HTML
- **Tailwind v4** via `@tailwindcss/vite` plugin (NOT `@astrojs/tailwind`); CSS entry at `src/styles/global.css`
- **TypeScript strict** (extends `astro/tsconfigs/strict`)
- **Zod v4** schema validation for brand records — every YAML validated at build time, build fails on bad data
- **Vitest 4** for unit tests + a separate config for build-output smoke tests
- **js-yaml** for parsing brand YAML files (with `JSON_SCHEMA` flag to keep date strings as strings, not auto-Date)
- **Wrangler v4** for Cloudflare Workers Static Assets deploy (NOT Cloudflare Pages — Cloudflare's modern path)

---

## Project structure

```
tallsource/
├─ docs/
│  ├─ plans/
│  │  ├─ 2026-04-30-tallsource-directory-design.md
│  │  └─ 2026-04-30-tallsource-v1-implementation.md
│  └─ project-context.md      ← this file
├─ src/
│  ├─ data/brands/
│  │  └─ ely-cattleman.yml    ← one file per brand
│  ├─ content/blog/
│  │  └─ welcome-to-tallsource.md
│  ├─ content.config.ts       ← blog content collection (NOT in src/content/)
│  ├─ layouts/
│  │  └─ BaseLayout.astro
│  ├─ components/
│  │  ├─ BaseLayout.astro
│  │  ├─ BrandCard.astro
│  │  ├─ SizeChartTable.astro
│  │  ├─ BrandFilter.tsx      ← React island (interactive filter)
│  │  └─ CompareTool.tsx      ← React island (side-by-side compare)
│  ├─ pages/
│  │  ├─ index.astro           ← homepage
│  │  ├─ brands/
│  │  │  ├─ index.astro        ← /brands (filter island)
│  │  │  ├─ all.astro          ← /brands/all (noscript fallback, static grid)
│  │  │  └─ [slug].astro       ← /brands/{slug}
│  │  ├─ blog/
│  │  │  ├─ index.astro
│  │  │  └─ [...slug].astro
│  │  ├─ api/
│  │  │  ├─ search-index.json.ts    ← built artifact for filter UI
│  │  │  └─ brands-compare.json.ts  ← built artifact for compare UI
│  │  ├─ compare.astro
│  │  ├─ sizing-guide.astro    ← FAQPage schema, high LLM-citation value
│  │  ├─ methodology.astro     ← LLM-trust anchor
│  │  └─ about.astro
│  ├─ lib/
│  │  ├─ schema.ts             ← Zod brand schema + vocabularies
│  │  ├─ schema.test.ts
│  │  ├─ brands.ts             ← parseBrandYaml + loadAllBrands
│  │  ├─ brands.test.ts
│  │  ├─ jsonld.ts             ← brandToJsonLd builder (Organization + WebPage + SizeSpecification per size row)
│  │  ├─ jsonld.test.ts
│  │  ├─ search-index.ts       ← buildSearchIndex (projects Brand to filter-friendly entry)
│  │  ├─ search-index.test.ts
│  │  ├─ filter.ts             ← applyFilter pure function
│  │  ├─ filter.test.ts
│  │  └─ build-output.test.ts  ← smoke tests against dist/ output (separate vitest config)
│  └─ styles/
│     └─ global.css            ← @import "tailwindcss"; — must be imported by BaseLayout
├─ public/
│  ├─ robots.txt               ← permissive for AI crawlers
│  └─ favicon.{ico,svg}
├─ astro.config.mjs            ← site, trailingSlash:never, build.format:file, integrations
├─ wrangler.jsonc              ← Cloudflare Workers Static Assets config
├─ vitest.config.ts            ← default test config (excludes build-output)
├─ vitest.build.config.ts      ← config for build-output smoke tests
└─ package.json                ← scripts: dev, build, test, test:build, deploy, deploy:dry
```

---

## Brand record schema

Every brand is one YAML file at `src/data/brands/[slug].yml` validated against `brandSchema` in `src/lib/schema.ts`. Authoritative shape:

```yaml
slug: ely-cattleman              # lowercase kebab-case, must match filename
name: Ely Cattleman
website: https://elycattleman.com
price_tier: $                    # $ | $$ | $$$
fit_styles:                      # one or more of:
  - standard-tall                # slim-tall | standard-tall | big-and-tall
  - big-and-tall
styles:                          # controlled vocabulary, multi-select
  - western                      # casual, preppy, formal, dress, workwear,
  - workwear                     # outdoor, streetwear, vintage, heritage,
                                 # western, athleisure, performance,
                                 # minimalist, tactical
height_range_in:                 # optional — designed-for height in inches
  min: 74
  max: 80
categories:                      # ONLY categories the brand offers IN TALL
  - shirts                       # shirts, pants, suits, outerwear,
                                 # activewear, underwear, accessories, shoes
activities: []                   # phase-2 tags: running, hiking, cycling,
                                 # fishing, hunting, motorsport, watersports,
                                 # golf, climbing, skiing
tall_sizes_offered:              # which tall labels the brand sells
  - LT
  - XLT
  - XXLT
  - 3XLT
  - 4XLT
big_sizes_offered:               # 2X-8X if applicable
  - 2X
  - 3X
  - 4X
  - 5X
  - 6X
size_charts:
  tops:                          # one row per tall OR big size
    - size: LT                   # accepts both TALL_SIZES and BIG_SIZES
      chest: [42, 45]            # [min, max] in inches; min must be <= max
      sleeve: [36.5, 37]
      neck: [16, 16.5]
      shoulder: [21, 22]         # optional
      body_length: [33, 34]      # optional
    # ...
  bottoms:                       # men's pants are sized waist x inseam
    - size: 32x36
      waist: 32
      inseam: 36
      hip: 42                    # optional
fit_notes: |                     # optional editorial — phase-2 enrichment
  Western and workwear shirts (snap fronts, chambrays, plaids).
  Big & Tall brand with extensive size range...
returns_summary: 30 days, free returns
ships_to: [US, CA]
verified:
  by: Andy W.                    # human name OR "auto" for automated re-verifications
  on: 2026-04-30                 # YYYY-MM-DD
  source_url: https://...        # actual size-chart page URL
  last_human_review: 2026-04-30  # optional, for tracking trust hierarchy
last_updated: 2026-04-30
```

**Key rules from project decisions:**

- **Categories list ONLY what's offered in tall sizes.** A brand that sells regular pants but no tall pants must NOT have `pants` in its categories array. This protects the trust thesis — a tall guy clicking through expecting tall pants and finding none undermines the directory.
- **Ranges are `[min, max]` tuples** because brand size charts publish ranges ("Chest 42–45"). The schema's `range` helper validates min <= max via Zod `.refine`.
- **Style tags are drawn from how the brand presents itself**, not editorial reinterpretation. Most brands span 1–3 styles.
- **Big sizes (2X, 3X...) live in `size_charts.tops`** alongside tall sizes. The schema accepts both vocabularies in the `size` field. JSON-LD output uses `sizeGroup: 'Big'` for big-size rows and `sizeGroup: 'Tall'` for tall-size rows.

---

## Content workflow (adding a brand)

The trust thesis hinges on human verification. Every brand goes through:

1. **Andy provides Claude a brand name + size-chart URL** (or hands over a screenshot if the URL blocks bots).
2. **Claude fetches the page** (WebFetch first; falls back to Chrome MCP browser if WebFetch is blocked) and extracts the size chart into the brandSchema YAML shape.
3. **Claude drafts the rest of the YAML**: categories, fit_styles, styles, tall_sizes_offered, big_sizes_offered, returns_summary. Claude flags any guesses.
4. **Andy reviews side-by-side against the source page**, corrects anything, stamps `verified.by: Andy W.`, `verified.on: <today>`, `verified.source_url: <actual URL>`.
5. **Commit + push** → Cloudflare Worker auto-rebuilds (when GitHub Action lands; currently `npm run deploy` is manual).

Realistic time per brand: 3–5 minutes once schema is internalized. Tools currently optional that would speed it up:
- An `npm run add-brand <url>` CLI helper wrapping steps 1–3 (planned for v1.5)
- Automated weekly re-verification GitHub Action (planned for v1.5)
- `/admin` page showing brands sorted by stalest verification (planned for v1.5)

---

## How to redeploy

After any code or content change:

```bash
cd tallsource
npm run deploy
```

That runs `astro build` then `wrangler deploy`. Worker updates within ~10 seconds. No GitHub Action wired up yet — deploys are manual until we add CI.

To validate without uploading: `npm run deploy:dry`.

To run tests: `npm test` (25 unit tests). To run build-output smoke tests: `npm run test:build`.

---

## Open TODOs (priority order)

1. **Add more brands.** Currently 1 (Ely Cattleman). Source the Reddit big-and-tall list at https://www.reddit.com/r/bigmenfashionadvice/comments/1gyaicf/updated_big_and_tall_brands_list/ and work through 25–40 candidates via the workflow above.
2. **Update Ely's `verified.source_url`** from the placeholder `https://elycattleman.com` to the actual size-chart page URL once we can reach the site (WebFetch was unable to during initial build — try Chrome MCP).
3. **Add Peter Manning NYC** via Chrome MCP browser. WebFetch was blocked on petermanning.com during initial build (socket-level reset, suspected bot protection).
4. **Connect `tallsource.co` custom domain.** The sitemap and canonical URLs already reference it. Cloudflare Registrar makes this seamless when the site is already on a Worker — register and point at the Worker, no migration needed. After connecting, update `astro.config.mjs` `site:` field if a different domain is chosen.
5. **GitHub Action for auto-deploy on push.** Wire `cloudflare/wrangler-action` with `CLOUDFLARE_ACCOUNT_ID` (`93849fc72f85aeab3d772a7aaedb16a7`) and `CLOUDFLARE_API_TOKEN` secrets in repo settings.
6. **Optional: rename `master` branch to `main`** for convention. Three commands locally + GitHub repo setting + delete old branch.
7. **Phase-2 features** (per design doc Section 8): activity pages (`/activity/running`, `/activity/hiking`, etc.), automated weekly re-verification cron, editorial fit-notes layer, `/admin` dashboard.

---

## Astro 6 / Tailwind v4 / Zod v4 gotchas

These are the non-obvious version-specific patterns that this codebase uses. If a future Claude conversation tries to "modernize" or copy patterns from older docs, these are the trap-doors:

**Astro 6:**
- Content collection config lives at `src/content.config.ts` (NOT `src/content/config.ts`). Old path triggers `LegacyContentConfigError`.
- Use `loader: glob({ pattern: '**/*.md', base: './src/content/blog' })`. The legacy `type: 'content'` shorthand is gone.
- Entry property is `entry.id`, NOT `entry.slug`.
- Render via top-level `render(entry)` from `astro:content`, NOT `entry.render()`.
- `trailingSlash: 'never'` + `build.format: 'file'` produces clean URLs without `.html` and emits `dist/foo.html` (a file, not `dist/foo/index.html`). Required to keep canonical/sitemap/JSON-LD URLs consistent.

**Tailwind v4:**
- Uses Vite plugin pattern via `@tailwindcss/vite`, NOT `@astrojs/tailwind`.
- CSS entry is `src/styles/global.css` containing just `@import "tailwindcss";`.
- BaseLayout MUST `import '../styles/global.css'` or no Tailwind classes apply anywhere.
- No `tailwind.config.js` — design tokens go in `@theme {}` blocks in CSS when needed.

**Zod v4:**
- `z.url()` is now top-level, NOT `z.string().url()`. Same for `z.email()`, etc.
- `result.error.toString()` returns awkward JSON; use `result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')` for readable output.

**js-yaml:**
- Pass `{ schema: yaml.JSON_SCHEMA }` to `yaml.load()` so date-shaped strings (`2026-04-30`) stay as strings instead of auto-converting to JS Date objects (which would fail Zod's `dateString` regex).

---

## Verification rules (the trust thesis, distilled)

These are the non-negotiable rules for keeping TallSource trustworthy:

1. **No unverified data ships.** Every brand YAML must have `verified.by` and `verified.source_url` populated with real values before commit. If Claude extracts a chart and Andy hasn't reviewed yet, the YAML doesn't ship.
2. **`verified.by: Andy W.` means a human read the source page line-by-line against the YAML.** It's not a stamp of vibes — it's a stamp of physical-eye verification.
3. **`verified.by: auto` is for automated re-verifications only** (the planned weekly cron). The `/methodology` page commits to this distinction.
4. **Categories list only what's offered in tall sizes** (see brand record schema rules above). A brand that sells regular outerwear but no tall outerwear must NOT have `outerwear` in `categories`.
5. **Source URLs must point to the actual size chart page**, not the homepage or a generic "Sizing" page. Future re-verification depends on the URL being precise.
6. **Bottoms are sized as waist × inseam** (e.g., `32x36` = 32" waist, 36" inseam). Never invert.

---

## Quick reference — where to look in the repo

| Question | File |
|---|---|
| What does a brand record look like? | `src/data/brands/ely-cattleman.yml` |
| What schema do brand records validate against? | `src/lib/schema.ts` |
| How does the build load brands? | `src/lib/brands.ts` (`loadAllBrands`) |
| How does JSON-LD get emitted? | `src/lib/jsonld.ts` (`brandToJsonLd`) |
| What does the brand detail page render? | `src/pages/brands/[slug].astro` |
| How does the filter island work? | `src/components/BrandFilter.tsx` + `src/lib/filter.ts` |
| How is the search-index.json built? | `src/pages/api/search-index.json.ts` + `src/lib/search-index.ts` |
| Where is the site config? | `astro.config.mjs` |
| Where is deploy config? | `wrangler.jsonc` |
| Where is the design doc? | `docs/plans/2026-04-30-tallsource-directory-design.md` |
| Where is the implementation plan? | `docs/plans/2026-04-30-tallsource-v1-implementation.md` |
