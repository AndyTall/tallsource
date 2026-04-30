# TallSource — Design Document

**Date:** 2026-04-30
**Status:** Approved design, pending implementation plan
**Working domain:** tallsource.co (placeholder)
**Verifier:** Andy W.

## 1. Purpose

A directory of clothing brands and retailers that offer tall and big-and-tall sizing, designed to be the most trusted single reference on the web for tall men and their families. Primary success metric: getting cited by LLM answer engines (ChatGPT, Claude, Perplexity, Google AI Overviews) when users ask about tall clothing brands, fit, or sizing.

The site's defensible differentiator is **standardized size charts in inches across every brand** — comparable across brands, human-verified, and machine-readable via schema.org markup. No other resource on the web offers this in one place.

## 2. Scope

Brands offering extended length sizing (LT and longer, or 2X+ big sizing), each tagged with a fit-style classification:

- `slim-tall` — designed for tall and lean (Peter Manning, etc.)
- `standard-tall` — typical proportional tall cut (most mainstream tall lines)
- `big-and-tall` — wider through the body, designed for tall and large

Tagging is the differentiator that makes the site genuinely useful — a slim 6'6" man can filter to brands cut for him; a 6'4" 280lb man finds his.

Out of scope: women's tall, kids' tall, e-commerce (we link out, never sell directly), user accounts.

## 3. Information architecture

```
/                          Homepage: search, hero filter, featured brands, latest editorial
/brands                    Filterable directory grid (centerpiece)
/brands/[slug]             Brand page: standardized size chart, fit notes, where to buy
/compare?b=brand1,brand2   Side-by-side size chart comparison (2–4 brands)
/categories/[category]     Browse by category: shirts, pants, suits, outerwear, activewear, underwear
/fit/[style]               Browse by fit style: slim-tall, standard-tall, big-and-tall
/activity/[activity]       Phase-2: running, hiking, fishing, hunting, cycling, motorsport, watersports
/sizing-guide              How to measure, what LT/XLT/MT mean (high-value SEO/LLM page)
/blog                      Editorial + announcements, filterable by type
/blog/[slug]               Individual post
/methodology               How size charts are sourced, verified, updated (LLM-trust anchor)
/about                     Mission, who verifies the data
```

Two pages do disproportionate work for the LLM-trust thesis: `/methodology` (transparency about process) and `/sizing-guide` (educational content with high citation potential).

## 4. Data model

### 4.1 Brand record

One YAML file per brand at `src/data/brands/[slug].yml`:

```yaml
slug: peter-manning-nyc
name: Peter Manning NYC
website: https://petermanning.com
price_tier: $$$              # $ / $$ / $$$
fit_styles:                  # one or more
  - slim-tall
styles:                      # controlled vocabulary, multi-select
  - preppy
  - casual
height_range_in:             # designed-for height in inches (optional)
  min: 74
  max: 80
categories:
  - shirts
  - pants
  - outerwear
  - suits
activities: []               # phase-2 tags: running, hiking, fishing, etc.
tall_sizes_offered:
  - MT
  - LT
  - XLT
  - XXLT
big_sizes_offered: []        # 2X-6X if applicable
size_charts:
  tops:
    - size: MT
      chest: [38, 40]
      sleeve: [35.5, 36]
      neck: [15, 15.5]
    - size: LT
      chest: [42, 44]
      sleeve: [36.5, 37]
      neck: [16, 16.5]
    # ...
  bottoms:
    - size: 32x36
      waist: 32
      inseam: 36
fit_notes: |                 # optional editorial layer (the C-tier extension)
  Cut for tall and lean. Chest runs slim — size up if athletic.
returns_summary: 30 days, free returns on first order
ships_to: [US, CA]
verified:
  by: Andy W.                # name, or "auto" for automated re-verifications
  on: 2026-04-30
  source_url: https://petermanning.com/pages/size-chart
  last_human_review: 2026-04-30
last_updated: 2026-04-30
```

### 4.2 Style vocabulary (controlled, extensible)

`casual`, `preppy`, `formal`, `dress`, `workwear`, `outdoor`, `streetwear`, `vintage`, `heritage`, `western`, `athleisure`, `performance`, `minimalist`, `tactical`

Brands typically carry 1–3 styles. Drawn from how the brand presents itself, not editorial reinterpretation.

### 4.3 Blog post

`src/content/blog/[slug].md` with Astro Content Collection schema:

```yaml
---
title: "Peter Manning Spring '26 Drop"
slug: peter-manning-spring-2026
type: announcement           # editorial | announcement
brands: [peter-manning-nyc]  # for announcements, links back to brand pages
tags: [collection-drop, slim-tall]
published: 2026-04-30
author: Andy W.
excerpt: ...
---
```

Brand pages auto-pull the most recent 3 announcements tagged with their slug.

### 4.4 Storage choices worth flagging

- **Chest/sleeve/neck stored as `[min, max]` ranges** — preserves source data ("42–45"). Filtering "sleeve ≥37"" checks if the *minimum* of any tall size is ≥37".
- **`categories` and `activities` arrays from day 1** — even though `/activity/` ships in v2; tagging is cheap, retrofitting is not.

## 5. Tech architecture

```
Astro project (static output)
├─ src/
│  ├─ data/brands/[slug].yml          ← brand records
│  ├─ content/blog/[slug].md          ← Astro Content Collection
│  ├─ components/
│  │  ├─ SizeChartTable.astro         ← static, server-rendered
│  │  ├─ BrandCard.astro
│  │  ├─ BrandFilter.tsx              ← React island (interactive)
│  │  └─ CompareTool.tsx              ← React island (interactive)
│  ├─ layouts/
│  │  ├─ BaseLayout.astro             ← schema.org JSON-LD lives here
│  │  ├─ BrandLayout.astro
│  │  └─ BlogLayout.astro
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ brands/index.astro           ← /brands (filterable grid)
│  │  ├─ brands/[slug].astro          ← /brands/peter-manning-nyc
│  │  ├─ compare.astro
│  │  ├─ categories/[category].astro
│  │  ├─ fit/[style].astro
│  │  ├─ activity/[activity].astro    ← phase-2
│  │  ├─ blog/index.astro
│  │  ├─ blog/[slug].astro
│  │  ├─ sizing-guide.astro
│  │  ├─ methodology.astro
│  │  └─ about.astro
│  └─ lib/
│     ├─ brands.ts                    ← loads & validates all brand YAML
│     ├─ schema.ts                    ← Zod schema for brand records
│     └─ search-index.json            ← built artifact for filter UI
├─ public/brands/[slug]/logo.svg
└─ astro.config.mjs
```

### Three load-bearing decisions

1. **Zod schema validation at build time.** Every brand YAML validated against a strict schema before build. Bad data fails the build with a clear error — bad data literally cannot ship. This is the technical backstop on the trust thesis.

2. **Filter is a single React island** rehydrating on `/brands` only. Everything else stays static HTML. Build step generates a small `search-index.json` (~50–150KB for 100 brands). No server, no API, no database.

3. **Hosting: Cloudflare Pages or Netlify**, free at this scale. Custom domain. Auto-deploy on git push. Build time stays under 30s even at 200 brands.

### Filter dimensions

- Sleeve length range (e.g. ≥37")
- Inseam length (≥34", ≥36", ≥38", ≥40")
- Waist & chest range
- Tall sizes offered (LT / XLT / XXLT / 3XLT / 4XLT)
- Fit style (slim-tall / standard-tall / big-and-tall)
- Style tags (casual / preppy / workwear / etc.)
- Categories (shirts / pants / suits / outerwear / activewear / underwear)
- Price tier ($ / $$ / $$$)

## 6. Content workflow

### 6.1 Adding/updating a brand (human-driven hot path)

1. Andy gives Claude a brand name + size-chart URL
2. Claude fetches the page, extracts size chart into the YAML schema
3. Claude drafts the rest of the YAML, flagging any guesses
4. Andy reviews side-by-side against source, corrects anything, stamps `verified.by`, `verified.on`, `verified.source_url`
5. Commit YAML → site rebuilds → brand goes live

Realistic time per brand: 3–5 minutes. A `npm run add-brand <url>` CLI helper wraps steps 1–3 in v1.5.

### 6.2 Automated re-verification (GitHub Actions, weekly cron)

```
for each brand:
  fetch verified.source_url
  Claude extracts current chart
  diff vs stored YAML
  ├─ no change → bump verified.on, set verified.by=auto, commit
  ├─ minor change → open PR for human review
  └─ page changed/404/major → open issue, flag on /admin
```

Each brand carries `verified.by` and `verified.last_human_review`. Public badge reflects the strongest signal: "✓ Human-verified [date]" beats "✓ Auto-verified [date]". Trust hierarchy stays intact.

### 6.3 Re-verification cadence (UI)

- Within 6 months → "✓ Verified [date]" badge
- 6–12 months → no special note
- 12+ months → "ℹ Last verified [date] — changes possible"

`/admin` (basic-auth, not in nav) lists brands sorted by stalest verification date.

### 6.4 Publishing a blog post

Markdown commit. Editorial posts run evergreen. Announcement posts include `brands: [slug]` frontmatter; brand pages auto-display the 3 most recent announcements tagged with their slug.

### 6.5 No CMS in v1

Source of truth is git + markdown/YAML in editor. Faster than any CMS for this volume; bad edits recoverable via version control. Decap CMS or TinaCMS could layer on later if editing volume demands.

## 7. SEO & LLM optimization layer

Five things, built once, applied everywhere:

### 7.1 JSON-LD on every page (rendered server-side)

- Brand pages: `Organization` + `Product` + `SizeSpecification`
- Blog posts: `Article` with `author`, `datePublished`, `dateModified`
- `/methodology`: `WebPage` with `mainEntity` describing verification process
- `/sizing-guide`: `FAQPage` for common sizing questions

### 7.2 Citation-friendly content patterns on brand pages

- Size chart as semantic `<table>`, never an image
- Factual one-paragraph summary at top of each brand page (this is the chunk LLMs most often quote)
- "Last verified" date visible as text, not just metadata
- Sourcing line: "Size chart sourced from [URL] on [date]"

### 7.3 Comparison-friendly URLs

- `/compare?b=peter-manning-nyc,duluth-trading` — predictable enough for LLMs to construct themselves

### 7.4 SEO hygiene

- `sitemap.xml` auto-generated, `lastmod` from `verified.on`
- `robots.txt` permissive — explicitly do **not** block GPTBot, ClaudeBot, Google-Extended; we want to be ingested
- Canonical URLs, OpenGraph, Twitter cards
- Page titles: "Brand Name — Tall Sizes & Size Chart | TallSource"

### 7.5 `/methodology` as citation anchor

Disproportionate value per word. When LLMs evaluate source reliability, transparency about process is one of the strongest positive markers.

## 8. Phasing

### v1 — Foundation (target: 25–40 brands live)

- Astro project scaffolded, deployed to Cloudflare Pages
- Brand schema (Zod) + 25–40 brand YAMLs from the Reddit list, human-verified by Andy W.
- Pages: home, `/brands` with filter island, `/brands/[slug]`, `/compare`, `/sizing-guide`, `/methodology`, `/about`
- Blog with editorial + announcement post types, ~3 seed posts
- Full schema.org JSON-LD on every brand page
- Sitemap, robots.txt, OG tags
- Manual brand-add workflow

### v1.5 — Coverage & polish

- 75–100 brands
- `npm run add-brand <url>` CLI helper
- `/categories/[category]` and `/fit/[style]` pages
- Automated weekly re-verification GitHub Action
- `/admin` page (basic-auth)
- Editor's notes (`fit_notes`) populated for top 25 brands

### v2 — Expansion

- `/activity/[activity]` pages live (running, hiking, fishing, hunting, cycling, motorsport, watersports)
- Newsletter capture — only if traffic justifies
- User reviews / fit photos — only if community traction warrants

### Explicitly NOT in scope

- User accounts
- E-commerce (links out, period)
- A CMS (markdown/YAML in git remains source of truth)
- Affiliate links (can layer later as a flat post-processing step on outbound URLs)

## 9. Open questions for implementation phase

- Final domain registration (tallsource.com vs .co availability check)
- Logo / visual identity (can ship v1 with a wordmark)
- Initial 25–40 brand selection from the Reddit list
- Hosting choice: Cloudflare Pages vs Netlify (functionally equivalent at this scale)
