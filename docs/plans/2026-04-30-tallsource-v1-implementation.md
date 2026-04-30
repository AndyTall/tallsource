# TallSource v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship v1 of TallSource — a directory of tall-and-big-and-tall clothing brands with standardized size charts, filterable directory, side-by-side comparison, blog, and full schema.org markup, deployed to Cloudflare Pages.

**Architecture:** Astro static site. Brand records as Zod-validated YAML files (one per brand). Static HTML for SEO/LLM crawlers. Single React island for filter/compare interactivity reading a built `search-index.json` (~100KB at 100 brands). No server, no database, no CMS — git is the source of truth.

**Tech Stack:** Astro 5, React 19 (islands only), TypeScript, Tailwind CSS v4, Zod (schema validation), Vitest (unit tests), js-yaml (YAML parsing), @astrojs/sitemap, Cloudflare Pages (hosting).

**Reference design doc:** `tallsource/docs/plans/2026-04-30-tallsource-directory-design.md`

**Working directory for all tasks:** `C:\Users\A Desktop\Documents\Claude\tallsource\`

---

## Phase 1 — Foundation

### Task 1: Initialize Astro project and git

**Files:**
- Create: `tallsource/` (project root, new Astro project)
- Create: `tallsource/.gitignore`

**Step 1: Scaffold Astro project**

From `C:\Users\A Desktop\Documents\Claude\`, run:

```bash
npm create astro@latest tallsource -- --template minimal --typescript strict --install --no-git
```

Choose:
- Install dependencies: yes
- TypeScript: strict
- Initialize git: no (we'll do it manually after the design doc is in place)

**Step 2: Add core integrations**

```bash
cd tallsource
npx astro add react tailwind sitemap --yes
```

**Step 3: Add runtime + dev dependencies**

```bash
npm install zod js-yaml
npm install -D vitest @types/js-yaml @types/node
```

**Step 4: Initialize git**

```bash
git init
git add .
git commit -m "chore: scaffold Astro project with React, Tailwind, sitemap"
```

**Step 5: Verify dev server runs**

```bash
npm run dev
```

Expected: server starts on http://localhost:4321 with the Astro starter page. Stop with Ctrl+C.

**Step 6: Commit any astro.config.mjs changes from `astro add`**

```bash
git add -A
git commit -m "chore: configure react, tailwind, sitemap integrations" --allow-empty
```

---

### Task 2: Configure Vitest

**Files:**
- Create: `tallsource/vitest.config.ts`
- Modify: `tallsource/package.json` (add test script)

**Step 1: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

**Step 2: Add test script to `package.json`**

In `scripts`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 3: Write a sanity test**

Create `tallsource/src/lib/sanity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 4: Run tests**

```bash
npm test
```

Expected: 1 test passed.

**Step 5: Delete sanity test and commit**

```bash
rm src/lib/sanity.test.ts
git add -A
git commit -m "chore: configure vitest"
```

---

### Task 3: Define Zod brand schema (TDD)

**Files:**
- Create: `tallsource/src/lib/schema.ts`
- Create: `tallsource/src/lib/schema.test.ts`

**Step 1: Write failing tests**

`tallsource/src/lib/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { brandSchema } from './schema';

const validBrand = {
  slug: 'peter-manning-nyc',
  name: 'Peter Manning NYC',
  website: 'https://petermanning.com',
  price_tier: '$$$',
  fit_styles: ['slim-tall'],
  styles: ['preppy', 'casual'],
  categories: ['shirts', 'pants'],
  activities: [],
  tall_sizes_offered: ['MT', 'LT', 'XLT'],
  big_sizes_offered: [],
  size_charts: {
    tops: [
      { size: 'LT', chest: [42, 44], sleeve: [36.5, 37], neck: [16, 16.5] },
    ],
    bottoms: [
      { size: '32x36', waist: 32, inseam: 36 },
    ],
  },
  returns_summary: '30 days',
  ships_to: ['US'],
  verified: {
    by: 'Andy W.',
    on: '2026-04-30',
    source_url: 'https://petermanning.com/pages/size-chart',
    last_human_review: '2026-04-30',
  },
  last_updated: '2026-04-30',
};

describe('brandSchema', () => {
  it('accepts a valid brand record', () => {
    expect(() => brandSchema.parse(validBrand)).not.toThrow();
  });

  it('rejects invalid price_tier', () => {
    expect(() => brandSchema.parse({ ...validBrand, price_tier: '$$$$' })).toThrow();
  });

  it('rejects invalid fit_style', () => {
    expect(() => brandSchema.parse({ ...validBrand, fit_styles: ['skinny'] })).toThrow();
  });

  it('rejects chest range with min > max', () => {
    const bad = {
      ...validBrand,
      size_charts: {
        ...validBrand.size_charts,
        tops: [{ size: 'LT', chest: [45, 42], sleeve: [36, 37], neck: [16, 17] }],
      },
    };
    expect(() => brandSchema.parse(bad)).toThrow();
  });

  it('rejects unknown tall size label', () => {
    expect(() => brandSchema.parse({ ...validBrand, tall_sizes_offered: ['HUGE'] })).toThrow();
  });

  it('allows empty big_sizes_offered', () => {
    expect(() => brandSchema.parse({ ...validBrand, big_sizes_offered: [] })).not.toThrow();
  });

  it('allows missing optional fit_notes and height_range_in', () => {
    const { ...minimal } = validBrand;
    expect(() => brandSchema.parse(minimal)).not.toThrow();
  });

  it('rejects when verified.by is empty', () => {
    expect(() =>
      brandSchema.parse({ ...validBrand, verified: { ...validBrand.verified, by: '' } })
    ).toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: All 8 tests fail with "Cannot find module './schema'" or similar.

**Step 3: Write `schema.ts`**

```typescript
import { z } from 'zod';

const PRICE_TIERS = ['$', '$$', '$$$'] as const;
const FIT_STYLES = ['slim-tall', 'standard-tall', 'big-and-tall'] as const;
const STYLES = [
  'casual', 'preppy', 'formal', 'dress', 'workwear', 'outdoor',
  'streetwear', 'vintage', 'heritage', 'western', 'athleisure',
  'performance', 'minimalist', 'tactical',
] as const;
const CATEGORIES = [
  'shirts', 'pants', 'suits', 'outerwear', 'activewear', 'underwear',
  'accessories', 'shoes',
] as const;
const ACTIVITIES = [
  'running', 'hiking', 'cycling', 'fishing', 'hunting',
  'motorsport', 'watersports', 'golf', 'climbing', 'skiing',
] as const;
const TALL_SIZES = ['MT', 'LT', 'XLT', 'XXLT', '3XLT', '4XLT', '5XLT'] as const;
const BIG_SIZES = ['2X', '3X', '4X', '5X', '6X', '7X', '8X'] as const;

const range = z
  .tuple([z.number(), z.number()])
  .refine(([min, max]) => min <= max, { message: 'min must be <= max' });

const topSizeRow = z.object({
  size: z.enum(TALL_SIZES),
  chest: range,
  sleeve: range,
  neck: range,
  shoulder: range.optional(),
  body_length: range.optional(),
});

const bottomSizeRow = z.object({
  size: z.string(), // e.g. "32x36" or "34T" — varied formats
  waist: z.number(),
  inseam: z.number(),
  hip: z.number().optional(),
});

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

export const brandSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  name: z.string().min(1),
  website: z.string().url(),
  price_tier: z.enum(PRICE_TIERS),
  fit_styles: z.array(z.enum(FIT_STYLES)).min(1),
  styles: z.array(z.enum(STYLES)).default([]),
  height_range_in: z
    .object({ min: z.number().int(), max: z.number().int() })
    .optional(),
  categories: z.array(z.enum(CATEGORIES)).min(1),
  activities: z.array(z.enum(ACTIVITIES)).default([]),
  tall_sizes_offered: z.array(z.enum(TALL_SIZES)).default([]),
  big_sizes_offered: z.array(z.enum(BIG_SIZES)).default([]),
  size_charts: z.object({
    tops: z.array(topSizeRow).default([]),
    bottoms: z.array(bottomSizeRow).default([]),
  }),
  fit_notes: z.string().optional(),
  returns_summary: z.string().optional(),
  ships_to: z.array(z.string()).default([]),
  verified: z.object({
    by: z.string().min(1),
    on: dateString,
    source_url: z.string().url(),
    last_human_review: dateString.optional(),
  }),
  last_updated: dateString,
});

export type Brand = z.infer<typeof brandSchema>;

export const STYLE_VOCABULARY = STYLES;
export const FIT_STYLE_VOCABULARY = FIT_STYLES;
export const CATEGORY_VOCABULARY = CATEGORIES;
export const ACTIVITY_VOCABULARY = ACTIVITIES;
export const TALL_SIZE_VOCABULARY = TALL_SIZES;
export const BIG_SIZE_VOCABULARY = BIG_SIZES;
```

**Step 4: Run tests**

```bash
npm test
```

Expected: All 8 tests pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Zod brand schema with validation"
```

---

### Task 4: Brand YAML loader (TDD)

**Files:**
- Create: `tallsource/src/lib/brands.ts`
- Create: `tallsource/src/lib/brands.test.ts`
- Create: `tallsource/src/data/brands/.gitkeep`

**Step 1: Write failing tests**

`tallsource/src/lib/brands.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseBrandYaml } from './brands';

const validYaml = `
slug: test-brand
name: Test Brand
website: https://example.com
price_tier: $$
fit_styles:
  - standard-tall
styles:
  - casual
categories:
  - shirts
tall_sizes_offered:
  - LT
  - XLT
size_charts:
  tops:
    - size: LT
      chest: [42, 44]
      sleeve: [36, 37]
      neck: [16, 16.5]
  bottoms: []
verified:
  by: Andy W.
  on: 2026-04-30
  source_url: https://example.com/sizes
last_updated: 2026-04-30
`;

describe('parseBrandYaml', () => {
  it('parses valid YAML into a Brand', () => {
    const brand = parseBrandYaml(validYaml, 'test-brand.yml');
    expect(brand.slug).toBe('test-brand');
    expect(brand.tall_sizes_offered).toEqual(['LT', 'XLT']);
  });

  it('throws with the file path on invalid YAML', () => {
    expect(() => parseBrandYaml('::: not yaml :::', 'broken.yml'))
      .toThrow(/broken\.yml/);
  });

  it('throws with the file path on schema violation', () => {
    const bad = validYaml.replace('price_tier: $$', 'price_tier: free');
    expect(() => parseBrandYaml(bad, 'bad.yml')).toThrow(/bad\.yml/);
  });
});
```

**Step 2: Run tests, expect failure**

```bash
npm test
```

Expected: 3 failures, "Cannot find module './brands'".

**Step 3: Write `brands.ts`**

```typescript
import yaml from 'js-yaml';
import { brandSchema, type Brand } from './schema';

export function parseBrandYaml(content: string, fileLabel: string): Brand {
  let raw: unknown;
  try {
    raw = yaml.load(content);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to parse YAML in ${fileLabel}: ${msg}`);
  }
  const result = brandSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Schema violation in ${fileLabel}:\n${result.error.toString()}`
    );
  }
  return result.data;
}

export async function loadAllBrands(): Promise<Brand[]> {
  const modules = import.meta.glob<string>('/src/data/brands/*.yml', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  const brands: Brand[] = [];
  for (const [path, content] of Object.entries(modules)) {
    const fileName = path.split('/').pop() ?? path;
    brands.push(parseBrandYaml(content, fileName));
  }
  brands.sort((a, b) => a.name.localeCompare(b.name));
  return brands;
}
```

**Step 4: Run tests**

```bash
npm test
```

Expected: 3 tests pass.

**Step 5: Create `.gitkeep` for empty data directory**

```bash
mkdir -p src/data/brands
touch src/data/brands/.gitkeep
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add brand YAML loader with schema validation"
```

---

### Task 5: Seed first brand YAML (Peter Manning NYC)

**Files:**
- Create: `tallsource/src/data/brands/peter-manning-nyc.yml`

**Step 1: Fetch and verify Peter Manning size chart**

Visit https://petermanning.com/pages/size-chart and copy current data.

**Step 2: Write `peter-manning-nyc.yml`**

```yaml
slug: peter-manning-nyc
name: Peter Manning NYC
website: https://petermanning.com
price_tier: $$$
fit_styles:
  - slim-tall
styles:
  - casual
  - preppy
height_range_in:
  min: 74
  max: 80
categories:
  - shirts
  - pants
  - outerwear
  - suits
activities: []
tall_sizes_offered:
  - S
  - M
  - L
  - XL
big_sizes_offered: []
size_charts:
  tops:
    # Fill in from petermanning.com/pages/size-chart — Andy to verify
    - size: LT
      chest: [38, 40]
      sleeve: [35, 35.5]
      neck: [14.5, 15]
  bottoms:
    - size: 32x36
      waist: 32
      inseam: 36
fit_notes: |
  Designed specifically for men 6'2"–6'8". Cut slim through the chest and
  shoulders relative to typical big-and-tall brands; size up if athletic
  through the chest.
returns_summary: 30 days, free returns
ships_to:
  - US
  - CA
verified:
  by: Andy W.
  on: 2026-04-30
  source_url: https://petermanning.com/pages/size-chart
  last_human_review: 2026-04-30
last_updated: 2026-04-30
```

**Note:** The size chart values above are placeholders. Andy must replace with actual values from the live size chart page before committing.

**Step 3: Verify it loads**

Add a temporary smoke test in `src/lib/brands.test.ts`:

```typescript
it('loads all real brand files without error', async () => {
  const { loadAllBrands } = await import('./brands');
  const brands = await loadAllBrands();
  expect(brands.length).toBeGreaterThan(0);
});
```

```bash
npm test
```

Expected: All tests pass including new smoke test.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Peter Manning NYC as seed brand"
```

---

## Phase 2 — First brand page renders

### Task 6: BaseLayout with JSON-LD scaffolding

**Files:**
- Create: `tallsource/src/layouts/BaseLayout.astro`

**Step 1: Write `BaseLayout.astro`**

```astro
---
interface Props {
  title: string;
  description: string;
  canonical?: string;
  ogType?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const { title, description, canonical, ogType = 'website', jsonLd } = Astro.props;
const siteName = 'TallSource';
const fullTitle = title === siteName ? title : `${title} | ${siteName}`;
const canonicalUrl = canonical ?? Astro.url.href;
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalUrl} />

    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content={ogType} />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:site_name" content={siteName} />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={fullTitle} />
    <meta name="twitter:description" content={description} />

    {jsonLd && (
      <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
    )}
  </head>
  <body class="min-h-screen bg-white text-slate-900 antialiased">
    <header class="border-b border-slate-200">
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <a href="/" class="text-xl font-semibold tracking-tight">TallSource</a>
        <ul class="flex gap-6 text-sm">
          <li><a href="/brands" class="hover:underline">Brands</a></li>
          <li><a href="/compare" class="hover:underline">Compare</a></li>
          <li><a href="/sizing-guide" class="hover:underline">Sizing Guide</a></li>
          <li><a href="/blog" class="hover:underline">Blog</a></li>
          <li><a href="/about" class="hover:underline">About</a></li>
        </ul>
      </nav>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-8">
      <slot />
    </main>
    <footer class="mt-16 border-t border-slate-200 py-8 text-sm text-slate-600">
      <div class="mx-auto max-w-6xl px-4">
        <p>&copy; {new Date().getFullYear()} TallSource. <a href="/methodology" class="underline">How we verify</a>.</p>
      </div>
    </footer>
  </body>
</html>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add BaseLayout with OG/Twitter/JSON-LD support"
```

---

### Task 7: SizeChartTable component

**Files:**
- Create: `tallsource/src/components/SizeChartTable.astro`

**Step 1: Write `SizeChartTable.astro`**

```astro
---
import type { Brand } from '../lib/schema';

interface Props {
  charts: Brand['size_charts'];
}

const { charts } = Astro.props;
const formatRange = (r: [number, number]) =>
  r[0] === r[1] ? `${r[0]}"` : `${r[0]}"–${r[1]}"`;
---
{charts.tops.length > 0 && (
  <section class="mb-8">
    <h3 class="mb-3 text-lg font-semibold">Tops (inches)</h3>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b-2 border-slate-300 bg-slate-50">
            <th class="px-3 py-2 text-left">Size</th>
            <th class="px-3 py-2 text-left">Chest</th>
            <th class="px-3 py-2 text-left">Sleeve</th>
            <th class="px-3 py-2 text-left">Neck</th>
          </tr>
        </thead>
        <tbody>
          {charts.tops.map((row) => (
            <tr class="border-b border-slate-200">
              <td class="px-3 py-2 font-medium">{row.size}</td>
              <td class="px-3 py-2">{formatRange(row.chest)}</td>
              <td class="px-3 py-2">{formatRange(row.sleeve)}</td>
              <td class="px-3 py-2">{formatRange(row.neck)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)}

{charts.bottoms.length > 0 && (
  <section class="mb-8">
    <h3 class="mb-3 text-lg font-semibold">Bottoms (inches)</h3>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b-2 border-slate-300 bg-slate-50">
            <th class="px-3 py-2 text-left">Size</th>
            <th class="px-3 py-2 text-left">Waist</th>
            <th class="px-3 py-2 text-left">Inseam</th>
          </tr>
        </thead>
        <tbody>
          {charts.bottoms.map((row) => (
            <tr class="border-b border-slate-200">
              <td class="px-3 py-2 font-medium">{row.size}</td>
              <td class="px-3 py-2">{row.waist}"</td>
              <td class="px-3 py-2">{row.inseam}"</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add SizeChartTable component"
```

---

### Task 8: JSON-LD builder for brand pages (TDD)

**Files:**
- Create: `tallsource/src/lib/jsonld.ts`
- Create: `tallsource/src/lib/jsonld.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { brandToJsonLd } from './jsonld';
import type { Brand } from './schema';

const brand: Brand = {
  slug: 'test',
  name: 'Test Brand',
  website: 'https://example.com',
  price_tier: '$$',
  fit_styles: ['slim-tall'],
  styles: ['casual'],
  categories: ['shirts'],
  activities: [],
  tall_sizes_offered: ['LT'],
  big_sizes_offered: [],
  size_charts: {
    tops: [{ size: 'LT', chest: [42, 44], sleeve: [36, 37], neck: [16, 16.5] }],
    bottoms: [],
  },
  ships_to: ['US'],
  verified: {
    by: 'Andy W.',
    on: '2026-04-30',
    source_url: 'https://example.com/sizes',
    last_human_review: '2026-04-30',
  },
  last_updated: '2026-04-30',
};

describe('brandToJsonLd', () => {
  it('emits Organization + WebPage with sameAs link', () => {
    const ld = brandToJsonLd(brand, 'https://tallsource.co/brands/test');
    expect(Array.isArray(ld)).toBe(true);
    const org = ld.find((n) => n['@type'] === 'Organization');
    expect(org).toBeDefined();
    expect(org?.url).toBe('https://example.com');
    expect(org?.name).toBe('Test Brand');
  });

  it('includes a SizeSpecification node per top size', () => {
    const ld = brandToJsonLd(brand, 'https://tallsource.co/brands/test');
    const sizes = ld.filter((n) => n['@type'] === 'SizeSpecification');
    expect(sizes.length).toBe(1);
    expect(sizes[0].sizeGroup).toContain('Tall');
  });
});
```

**Step 2: Run tests, expect failure**

```bash
npm test
```

**Step 3: Write `jsonld.ts`**

```typescript
import type { Brand } from './schema';

type LdNode = Record<string, unknown>;

export function brandToJsonLd(brand: Brand, pageUrl: string): LdNode[] {
  const nodes: LdNode[] = [];

  nodes.push({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: brand.website,
    sameAs: [pageUrl],
  });

  nodes.push({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: pageUrl,
    name: `${brand.name} — Tall Sizes & Size Chart`,
    about: { '@type': 'Organization', name: brand.name },
    dateModified: brand.last_updated,
  });

  for (const row of brand.size_charts.tops) {
    nodes.push({
      '@context': 'https://schema.org',
      '@type': 'SizeSpecification',
      name: `${brand.name} ${row.size}`,
      sizeSystem: 'https://schema.org/WearableSizeSystemUS',
      sizeGroup: 'Tall',
      suggestedMeasurement: [
        {
          '@type': 'QuantitativeValue',
          name: 'Chest',
          minValue: row.chest[0],
          maxValue: row.chest[1],
          unitCode: 'INH',
        },
        {
          '@type': 'QuantitativeValue',
          name: 'Sleeve',
          minValue: row.sleeve[0],
          maxValue: row.sleeve[1],
          unitCode: 'INH',
        },
        {
          '@type': 'QuantitativeValue',
          name: 'Neck',
          minValue: row.neck[0],
          maxValue: row.neck[1],
          unitCode: 'INH',
        },
      ],
    });
  }

  return nodes;
}
```

**Step 4: Run tests**

```bash
npm test
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add brand JSON-LD builder"
```

---

### Task 9: Brand detail page `/brands/[slug]`

**Files:**
- Create: `tallsource/src/pages/brands/[slug].astro`

**Step 1: Write the page**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import SizeChartTable from '../../components/SizeChartTable.astro';
import { loadAllBrands } from '../../lib/brands';
import { brandToJsonLd } from '../../lib/jsonld';

export async function getStaticPaths() {
  const brands = await loadAllBrands();
  return brands.map((brand) => ({ params: { slug: brand.slug }, props: { brand } }));
}

const { brand } = Astro.props;
const pageUrl = new URL(`/brands/${brand.slug}`, Astro.site ?? 'https://tallsource.co').href;
const jsonLd = brandToJsonLd(brand, pageUrl);

const summary = `${brand.name} is a ${brand.fit_styles.join('/')} clothing brand offering ${brand.categories.join(', ')}. Tall sizes: ${brand.tall_sizes_offered.join(', ') || 'none'}. ${brand.big_sizes_offered.length > 0 ? `Big sizes: ${brand.big_sizes_offered.join(', ')}.` : ''} Verified ${brand.verified.on}.`;
---
<BaseLayout
  title={`${brand.name} — Tall Sizes & Size Chart`}
  description={summary}
  jsonLd={jsonLd}
>
  <article>
    <header class="mb-8">
      <h1 class="text-3xl font-bold">{brand.name}</h1>
      <p class="mt-2 text-slate-600">{summary}</p>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        {brand.fit_styles.map((s) => (
          <span class="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-900">{s}</span>
        ))}
        {brand.styles.map((s) => (
          <span class="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{s}</span>
        ))}
        <span class="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{brand.price_tier}</span>
      </div>
      <p class="mt-4">
        <a href={brand.website} class="text-blue-700 underline" target="_blank" rel="noopener">
          Visit {brand.name} →
        </a>
      </p>
    </header>

    <SizeChartTable charts={brand.size_charts} />

    {brand.fit_notes && (
      <section class="mb-8 rounded border-l-4 border-blue-400 bg-blue-50 p-4">
        <h3 class="mb-2 font-semibold">Fit notes</h3>
        <p class="text-sm">{brand.fit_notes}</p>
      </section>
    )}

    <section class="mt-12 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <p>
        <strong>Verified by {brand.verified.by} on {brand.verified.on}.</strong>{' '}
        Size chart sourced from{' '}
        <a href={brand.verified.source_url} class="underline" target="_blank" rel="noopener">
          {brand.verified.source_url}
        </a>.
      </p>
      <p class="mt-2">
        See our <a href="/methodology" class="underline">methodology</a> for how we verify size charts.
      </p>
    </section>
  </article>
</BaseLayout>
```

**Step 2: Set site URL in `astro.config.mjs`**

Add `site: 'https://tallsource.co'` to the Astro config so canonical URLs resolve.

**Step 3: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. `dist/brands/peter-manning-nyc/index.html` exists.

**Step 4: Inspect the built file**

Open `dist/brands/peter-manning-nyc/index.html` and confirm:
- `<title>` contains "Peter Manning NYC"
- `<script type="application/ld+json">` block is present
- Size chart `<table>` rendered as semantic HTML

**Step 5: Run dev server and visit page**

```bash
npm run dev
```

Visit http://localhost:4321/brands/peter-manning-nyc — verify it renders cleanly.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add /brands/[slug] page with size chart and JSON-LD"
```

---

## Phase 3 — Directory listing

### Task 10: BrandCard component

**Files:**
- Create: `tallsource/src/components/BrandCard.astro`

**Step 1: Write component**

```astro
---
import type { Brand } from '../lib/schema';

interface Props {
  brand: Brand;
}

const { brand } = Astro.props;
---
<a
  href={`/brands/${brand.slug}`}
  class="block rounded-lg border border-slate-200 p-4 transition hover:border-blue-400 hover:shadow-sm"
>
  <h3 class="text-lg font-semibold">{brand.name}</h3>
  <p class="mt-1 text-xs text-slate-500">
    {brand.price_tier} · {brand.fit_styles.join(', ')}
  </p>
  <p class="mt-2 text-sm text-slate-700">
    Tall sizes: {brand.tall_sizes_offered.join(', ') || '—'}
  </p>
  <div class="mt-3 flex flex-wrap gap-1 text-xs">
    {brand.categories.slice(0, 4).map((c) => (
      <span class="rounded bg-slate-100 px-2 py-0.5 text-slate-700">{c}</span>
    ))}
  </div>
</a>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add BrandCard component"
```

---

### Task 11: `/brands` index page (static, unfiltered)

**Files:**
- Create: `tallsource/src/pages/brands/index.astro`

**Step 1: Write the page**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import BrandCard from '../../components/BrandCard.astro';
import { loadAllBrands } from '../../lib/brands';

const brands = await loadAllBrands();
---
<BaseLayout
  title="Tall and Big-and-Tall Clothing Brand Directory"
  description={`Browse ${brands.length} brands offering tall and big-and-tall sizing, with standardized size charts in inches.`}
>
  <h1 class="mb-2 text-3xl font-bold">Brand directory</h1>
  <p class="mb-8 text-slate-600">
    {brands.length} brands offering tall and big-and-tall sizing, with size charts verified by Andy W.
  </p>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    {brands.map((brand) => <BrandCard brand={brand} />)}
  </div>
</BaseLayout>
```

**Step 2: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. `dist/brands/index.html` exists.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add /brands directory page"
```

---

### Task 12: Build search-index.json artifact (TDD)

**Files:**
- Create: `tallsource/src/lib/search-index.ts`
- Create: `tallsource/src/lib/search-index.test.ts`
- Modify: `tallsource/src/pages/brands/index.astro` (load index)
- Create: `tallsource/src/pages/api/search-index.json.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { buildSearchIndex } from './search-index';
import type { Brand } from './schema';

const brand: Brand = {
  slug: 'test', name: 'Test', website: 'https://e.com',
  price_tier: '$$', fit_styles: ['slim-tall'], styles: ['casual'],
  categories: ['shirts'], activities: [],
  tall_sizes_offered: ['LT', 'XLT'], big_sizes_offered: [],
  size_charts: {
    tops: [
      { size: 'LT', chest: [42, 44], sleeve: [36, 37], neck: [16, 16.5] },
      { size: 'XLT', chest: [46, 48], sleeve: [37, 37.5], neck: [17, 17.5] },
    ],
    bottoms: [{ size: '34x36', waist: 34, inseam: 36 }],
  },
  ships_to: ['US'],
  verified: { by: 'A', on: '2026-04-30', source_url: 'https://e.com/s' },
  last_updated: '2026-04-30',
};

describe('buildSearchIndex', () => {
  it('extracts max sleeve and inseam for filtering', () => {
    const idx = buildSearchIndex([brand]);
    expect(idx[0].max_sleeve_in).toBe(37.5);
    expect(idx[0].max_inseam_in).toBe(36);
  });

  it('keeps only fields needed by the filter UI', () => {
    const idx = buildSearchIndex([brand]);
    const entry = idx[0];
    expect(entry).toHaveProperty('slug');
    expect(entry).toHaveProperty('name');
    expect(entry).toHaveProperty('fit_styles');
    expect(entry).not.toHaveProperty('size_charts');
    expect(entry).not.toHaveProperty('verified');
  });
});
```

**Step 2: Run tests, expect failure**

```bash
npm test
```

**Step 3: Write `search-index.ts`**

```typescript
import type { Brand } from './schema';

export interface SearchIndexEntry {
  slug: string;
  name: string;
  price_tier: string;
  fit_styles: string[];
  styles: string[];
  categories: string[];
  activities: string[];
  tall_sizes_offered: string[];
  big_sizes_offered: string[];
  max_sleeve_in: number | null;
  max_inseam_in: number | null;
  min_chest_in: number | null;
  max_chest_in: number | null;
}

export function buildSearchIndex(brands: Brand[]): SearchIndexEntry[] {
  return brands.map((b) => {
    const tops = b.size_charts.tops;
    const bottoms = b.size_charts.bottoms;
    const sleeves = tops.map((t) => t.sleeve[1]);
    const chestsMin = tops.map((t) => t.chest[0]);
    const chestsMax = tops.map((t) => t.chest[1]);
    const inseams = bottoms.map((bm) => bm.inseam);
    return {
      slug: b.slug,
      name: b.name,
      price_tier: b.price_tier,
      fit_styles: b.fit_styles,
      styles: b.styles,
      categories: b.categories,
      activities: b.activities,
      tall_sizes_offered: b.tall_sizes_offered,
      big_sizes_offered: b.big_sizes_offered,
      max_sleeve_in: sleeves.length ? Math.max(...sleeves) : null,
      max_inseam_in: inseams.length ? Math.max(...inseams) : null,
      min_chest_in: chestsMin.length ? Math.min(...chestsMin) : null,
      max_chest_in: chestsMax.length ? Math.max(...chestsMax) : null,
    };
  });
}
```

**Step 4: Create JSON endpoint**

`tallsource/src/pages/api/search-index.json.ts`:

```typescript
import type { APIRoute } from 'astro';
import { loadAllBrands } from '../../lib/brands';
import { buildSearchIndex } from '../../lib/search-index';

export const GET: APIRoute = async () => {
  const brands = await loadAllBrands();
  const index = buildSearchIndex(brands);
  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Step 5: Run tests and build**

```bash
npm test
npm run build
```

Expected: Tests pass; build emits `dist/api/search-index.json`.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: build search-index.json artifact for client-side filter"
```

---

## Phase 4 — Filter island

### Task 13: Filter logic module (TDD)

**Files:**
- Create: `tallsource/src/lib/filter.ts`
- Create: `tallsource/src/lib/filter.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { applyFilter, type FilterState } from './filter';
import type { SearchIndexEntry } from './search-index';

const a: SearchIndexEntry = {
  slug: 'a', name: 'A', price_tier: '$$',
  fit_styles: ['slim-tall'], styles: ['casual'], categories: ['shirts'],
  activities: [], tall_sizes_offered: ['LT'], big_sizes_offered: [],
  max_sleeve_in: 37, max_inseam_in: null,
  min_chest_in: 38, max_chest_in: 42,
};
const b: SearchIndexEntry = {
  ...a, slug: 'b', name: 'B',
  fit_styles: ['big-and-tall'], categories: ['pants'],
  tall_sizes_offered: ['XLT', 'XXLT'],
  big_sizes_offered: ['2X', '3X'],
  max_sleeve_in: 38.5, max_inseam_in: 38,
  min_chest_in: 50, max_chest_in: 60,
};

describe('applyFilter', () => {
  const empty: FilterState = {
    fit_styles: [], styles: [], categories: [], activities: [],
    tall_sizes: [], price_tiers: [],
    min_sleeve_in: null, min_inseam_in: null,
  };

  it('returns all when filter is empty', () => {
    expect(applyFilter([a, b], empty)).toEqual([a, b]);
  });

  it('filters by fit_style (any-of)', () => {
    expect(applyFilter([a, b], { ...empty, fit_styles: ['slim-tall'] })).toEqual([a]);
  });

  it('filters by min sleeve length', () => {
    expect(applyFilter([a, b], { ...empty, min_sleeve_in: 38 })).toEqual([b]);
  });

  it('filters by min inseam, excludes brands with null inseam', () => {
    expect(applyFilter([a, b], { ...empty, min_inseam_in: 36 })).toEqual([b]);
  });

  it('filters by tall size offered', () => {
    expect(applyFilter([a, b], { ...empty, tall_sizes: ['XXLT'] })).toEqual([b]);
  });

  it('combines multiple filters with AND', () => {
    expect(applyFilter([a, b], {
      ...empty, fit_styles: ['big-and-tall'], min_sleeve_in: 38,
    })).toEqual([b]);
  });
});
```

**Step 2: Run tests, expect failure**

```bash
npm test
```

**Step 3: Write `filter.ts`**

```typescript
import type { SearchIndexEntry } from './search-index';

export interface FilterState {
  fit_styles: string[];
  styles: string[];
  categories: string[];
  activities: string[];
  tall_sizes: string[];
  price_tiers: string[];
  min_sleeve_in: number | null;
  min_inseam_in: number | null;
}

const anyOf = (selected: string[], values: string[]) =>
  selected.length === 0 || selected.some((s) => values.includes(s));

export function applyFilter(
  entries: SearchIndexEntry[],
  state: FilterState
): SearchIndexEntry[] {
  return entries.filter((e) => {
    if (!anyOf(state.fit_styles, e.fit_styles)) return false;
    if (!anyOf(state.styles, e.styles)) return false;
    if (!anyOf(state.categories, e.categories)) return false;
    if (!anyOf(state.activities, e.activities)) return false;
    if (!anyOf(state.tall_sizes, e.tall_sizes_offered)) return false;
    if (state.price_tiers.length > 0 && !state.price_tiers.includes(e.price_tier)) return false;
    if (state.min_sleeve_in !== null) {
      if (e.max_sleeve_in === null || e.max_sleeve_in < state.min_sleeve_in) return false;
    }
    if (state.min_inseam_in !== null) {
      if (e.max_inseam_in === null || e.max_inseam_in < state.min_inseam_in) return false;
    }
    return true;
  });
}
```

**Step 4: Run tests**

```bash
npm test
```

Expected: All filter tests pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add filter logic with unit tests"
```

---

### Task 14: BrandFilter React island

**Files:**
- Create: `tallsource/src/components/BrandFilter.tsx`

**Step 1: Write the component**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { applyFilter, type FilterState } from '../lib/filter';
import type { SearchIndexEntry } from '../lib/search-index';

const FIT_STYLES = ['slim-tall', 'standard-tall', 'big-and-tall'];
const TALL_SIZES = ['MT', 'LT', 'XLT', 'XXLT', '3XLT', '4XLT'];
const CATEGORIES = ['shirts', 'pants', 'suits', 'outerwear', 'activewear', 'underwear'];
const PRICE_TIERS = ['$', '$$', '$$$'];

const emptyState: FilterState = {
  fit_styles: [], styles: [], categories: [], activities: [],
  tall_sizes: [], price_tiers: [],
  min_sleeve_in: null, min_inseam_in: null,
};

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

export default function BrandFilter() {
  const [entries, setEntries] = useState<SearchIndexEntry[]>([]);
  const [state, setState] = useState<FilterState>(emptyState);

  useEffect(() => {
    fetch('/api/search-index.json')
      .then((r) => r.json())
      .then(setEntries);
  }, []);

  const filtered = useMemo(() => applyFilter(entries, state), [entries, state]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-6 rounded-lg border border-slate-200 p-4">
        <FilterGroup
          label="Fit"
          options={FIT_STYLES}
          selected={state.fit_styles}
          onToggle={(v) => setState((s) => ({ ...s, fit_styles: toggle(s.fit_styles, v) }))}
        />
        <FilterGroup
          label="Tall sizes offered"
          options={TALL_SIZES}
          selected={state.tall_sizes}
          onToggle={(v) => setState((s) => ({ ...s, tall_sizes: toggle(s.tall_sizes, v) }))}
        />
        <FilterGroup
          label="Categories"
          options={CATEGORIES}
          selected={state.categories}
          onToggle={(v) => setState((s) => ({ ...s, categories: toggle(s.categories, v) }))}
        />
        <FilterGroup
          label="Price"
          options={PRICE_TIERS}
          selected={state.price_tiers}
          onToggle={(v) => setState((s) => ({ ...s, price_tiers: toggle(s.price_tiers, v) }))}
        />
        <NumericFilter
          label="Min sleeve length (inches)"
          value={state.min_sleeve_in}
          onChange={(v) => setState((s) => ({ ...s, min_sleeve_in: v }))}
        />
        <NumericFilter
          label="Min inseam (inches)"
          value={state.min_inseam_in}
          onChange={(v) => setState((s) => ({ ...s, min_inseam_in: v }))}
        />
        <button
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          onClick={() => setState(emptyState)}
        >
          Reset filters
        </button>
      </aside>
      <section>
        <p className="mb-4 text-sm text-slate-600">
          Showing {filtered.length} of {entries.length} brands
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((b) => (
            <a
              key={b.slug}
              href={`/brands/${b.slug}`}
              className="block rounded-lg border border-slate-200 p-4 transition hover:border-blue-400"
            >
              <h3 className="text-lg font-semibold">{b.name}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {b.price_tier} · {b.fit_styles.join(', ')}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Tall sizes: {b.tall_sizes_offered.join(', ') || '—'}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function FilterGroup(props: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{props.label}</h4>
      <div className="space-y-1">
        {props.options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={props.selected.includes(o)}
              onChange={() => props.onToggle(o)}
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

function NumericFilter(props: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{props.label}</label>
      <input
        type="number"
        step="0.5"
        value={props.value ?? ''}
        onChange={(e) =>
          props.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
        }
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add BrandFilter React island"
```

---

### Task 15: Wire filter into `/brands` page

**Files:**
- Modify: `tallsource/src/pages/brands/index.astro`

**Step 1: Replace the static grid with the filter island**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import BrandFilter from '../../components/BrandFilter.tsx';
import { loadAllBrands } from '../../lib/brands';

const brands = await loadAllBrands();
---
<BaseLayout
  title="Tall and Big-and-Tall Clothing Brand Directory"
  description={`Browse ${brands.length} brands offering tall and big-and-tall sizing, with standardized size charts in inches.`}
>
  <h1 class="mb-2 text-3xl font-bold">Brand directory</h1>
  <p class="mb-8 text-slate-600">
    {brands.length} brands offering tall and big-and-tall sizing, verified by Andy W.
  </p>
  <BrandFilter client:load />

  <noscript>
    <p class="mt-8 rounded bg-yellow-50 p-4 text-sm">
      JavaScript is disabled. <a href="/brands/all" class="underline">View the unfiltered brand list</a>.
    </p>
  </noscript>
</BaseLayout>
```

**Step 2: Add fallback static page for noscript**

Create `tallsource/src/pages/brands/all.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import BrandCard from '../../components/BrandCard.astro';
import { loadAllBrands } from '../../lib/brands';

const brands = await loadAllBrands();
---
<BaseLayout
  title="All Tall Clothing Brands (Unfiltered)"
  description="Complete unfiltered list of all tall and big-and-tall clothing brands in the TallSource directory."
>
  <h1 class="mb-8 text-3xl font-bold">All brands</h1>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    {brands.map((brand) => <BrandCard brand={brand} />)}
  </div>
</BaseLayout>
```

**Step 3: Build and verify**

```bash
npm run build
npm run preview
```

Visit http://localhost:4321/brands — the filter should hydrate and show brand cards.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire BrandFilter into /brands with noscript fallback"
```

---

## Phase 5 — Compare tool

### Task 16: CompareTool React island

**Files:**
- Create: `tallsource/src/components/CompareTool.tsx`

**Step 1: Write the component**

```tsx
import { useEffect, useState } from 'react';
import type { Brand } from '../lib/schema';

interface BrandsResponse {
  brands: Pick<Brand, 'slug' | 'name' | 'size_charts'>[];
}

export default function CompareTool({ initialSlugs }: { initialSlugs: string[] }) {
  const [allBrands, setAllBrands] = useState<BrandsResponse['brands']>([]);
  const [selected, setSelected] = useState<string[]>(initialSlugs);

  useEffect(() => {
    fetch('/api/brands-compare.json')
      .then((r) => r.json())
      .then((d: BrandsResponse) => setAllBrands(d.brands));
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected.length > 0) {
      url.searchParams.set('b', selected.join(','));
    } else {
      url.searchParams.delete('b');
    }
    window.history.replaceState(null, '', url.toString());
  }, [selected]);

  const picked = allBrands.filter((b) => selected.includes(b.slug));

  return (
    <div>
      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold">Add brand to compare</label>
        <select
          className="rounded border border-slate-300 px-3 py-2"
          onChange={(e) => {
            if (e.target.value && !selected.includes(e.target.value) && selected.length < 4) {
              setSelected([...selected, e.target.value]);
            }
            e.target.value = '';
          }}
          defaultValue=""
        >
          <option value="" disabled>Pick a brand...</option>
          {allBrands
            .filter((b) => !selected.includes(b.slug))
            .map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
        <p className="mt-1 text-xs text-slate-500">Compare up to 4 brands.</p>
      </div>

      {picked.length === 0 && (
        <p className="text-slate-500">Select at least one brand to start comparing.</p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {picked.map((b) => (
          <div key={b.slug} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{b.name}</h3>
              <button
                className="text-xs text-slate-500 hover:text-red-600"
                onClick={() => setSelected(selected.filter((s) => s !== b.slug))}
              >
                Remove
              </button>
            </div>
            {b.size_charts.tops.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr><th className="text-left">Size</th><th className="text-left">Chest</th><th className="text-left">Sleeve</th></tr>
                </thead>
                <tbody>
                  {b.size_charts.tops.map((r) => (
                    <tr key={r.size}>
                      <td>{r.size}</td>
                      <td>{r.chest[0]}–{r.chest[1]}"</td>
                      <td>{r.sleeve[0]}–{r.sleeve[1]}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add CompareTool React island"
```

---

### Task 17: `/compare` page + supporting JSON endpoint

**Files:**
- Create: `tallsource/src/pages/compare.astro`
- Create: `tallsource/src/pages/api/brands-compare.json.ts`

**Step 1: Write JSON endpoint**

```typescript
import type { APIRoute } from 'astro';
import { loadAllBrands } from '../../lib/brands';

export const GET: APIRoute = async () => {
  const brands = await loadAllBrands();
  const slim = brands.map((b) => ({
    slug: b.slug,
    name: b.name,
    size_charts: b.size_charts,
  }));
  return new Response(JSON.stringify({ brands: slim }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

**Step 2: Write `compare.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import CompareTool from '../components/CompareTool.tsx';

const slugsParam = Astro.url.searchParams.get('b') ?? '';
const initialSlugs = slugsParam.split(',').filter(Boolean);
---
<BaseLayout
  title="Compare Tall Clothing Brand Size Charts"
  description="Compare size charts side by side for up to 4 tall clothing brands."
>
  <h1 class="mb-8 text-3xl font-bold">Compare brands</h1>
  <CompareTool client:load initialSlugs={initialSlugs} />
</BaseLayout>
```

**Step 3: Build and verify**

```bash
npm run build
npm run preview
```

Visit http://localhost:4321/compare?b=peter-manning-nyc — verify the compare tool loads and shows the brand.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add /compare page with side-by-side size chart tool"
```

---

## Phase 6 — Static content pages

### Task 18: `/sizing-guide` page with FAQPage schema

**Files:**
- Create: `tallsource/src/pages/sizing-guide.astro`

**Step 1: Write the page**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';

const faqs = [
  {
    q: 'What does MT, LT, XLT, XXLT mean?',
    a: 'These are tall sizing labels: MT (Medium Tall), LT (Large Tall), XLT (Extra Large Tall), XXLT (2X Tall), 3XLT, 4XLT. Tall sizes are cut longer through the body and sleeves than regular sizes — typically 2–3 inches longer.',
  },
  {
    q: 'How do I measure my chest?',
    a: 'Wrap a soft tape measure around the fullest part of your chest, under the arms, with arms relaxed at your sides. Keep the tape level and snug but not tight.',
  },
  {
    q: 'How do I measure my sleeve length?',
    a: 'With your arm slightly bent, measure from the center back of your neck, over your shoulder, and down to your wrist. This is the standard sleeve measurement used by most brands.',
  },
  {
    q: 'How do I measure my inseam?',
    a: 'Measure from the crotch seam down the inside of the leg to the desired pant length (typically the bottom of your ankle bone for a standard cuff).',
  },
  {
    q: 'What is the difference between Tall and Big-and-Tall?',
    a: 'Tall sizing adds length without adding width — designed for tall, slim-to-average-build men. Big-and-Tall sizing adds both length and width — designed for tall men who also need additional room through the chest, waist, and shoulders.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};
---
<BaseLayout
  title="Tall Men's Sizing Guide"
  description="How to measure yourself and understand tall clothing sizes (MT, LT, XLT, XXLT, 3XLT)."
  jsonLd={jsonLd}
>
  <article class="prose max-w-none">
    <h1>Tall men's sizing guide</h1>
    <p class="lead">A practical reference for tall sizing labels, body measurements, and how to choose between Tall and Big-and-Tall cuts.</p>

    {faqs.map((f) => (
      <section class="mt-8">
        <h2 class="text-xl font-semibold">{f.q}</h2>
        <p class="mt-2 text-slate-700">{f.a}</p>
      </section>
    ))}
  </article>
</BaseLayout>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add /sizing-guide with FAQPage schema"
```

---

### Task 19: `/methodology` page

**Files:**
- Create: `tallsource/src/pages/methodology.astro`

**Step 1: Write the page**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'TallSource Methodology',
  description: 'How TallSource sources and verifies size chart data for tall clothing brands.',
  mainEntity: {
    '@type': 'CreativeWork',
    name: 'Size Chart Verification Methodology',
    author: { '@type': 'Person', name: 'Andy W.' },
  },
};
---
<BaseLayout
  title="Methodology — How We Verify Size Charts"
  description="How TallSource sources, verifies, and updates size chart data for every brand in the directory."
  jsonLd={jsonLd}
>
  <article class="prose max-w-none">
    <h1>How we verify size charts</h1>
    <p class="lead">
      TallSource exists to be the most trusted single reference for tall men's clothing sizing.
      Trust is earned by being transparent about exactly how the data here is sourced and checked.
    </p>

    <h2>Where the size charts come from</h2>
    <p>
      Every size chart on TallSource is sourced directly from the brand's own published size chart page.
      The exact URL we sourced from is listed at the bottom of every brand page (look for "Size chart sourced from...").
    </p>

    <h2>How verification works</h2>
    <p>
      For each brand we add, the workflow is:
    </p>
    <ol>
      <li>The brand's official size chart page is fetched.</li>
      <li>Measurements are extracted into a standard schema (chest, sleeve, neck for tops; waist, inseam for bottoms — all in inches).</li>
      <li>A human (Andy W.) reviews the extracted data side-by-side against the source page and corrects any discrepancies.</li>
      <li>The verified entry is published with a "Verified by Andy W. on [date]" stamp.</li>
    </ol>

    <h2>Re-verification cadence</h2>
    <p>
      Brand sizing changes over time. Every brand is re-checked on a recurring schedule:
    </p>
    <ul>
      <li><strong>Within 6 months:</strong> recently verified, displayed with a "✓ Verified" badge.</li>
      <li><strong>6–12 months:</strong> still considered current.</li>
      <li><strong>Over 12 months:</strong> displayed with a softer "Last verified [date] — changes possible" note.</li>
    </ul>

    <h2>What we don't do</h2>
    <ul>
      <li>We don't publish unverified data.</li>
      <li>We don't sell anything directly. Every brand link goes to the brand's own site.</li>
      <li>We don't accept payment from brands in exchange for inclusion or favorable treatment.</li>
    </ul>

    <h2>Found an error?</h2>
    <p>
      If a size chart on TallSource doesn't match the brand's current page, please <a href="/about">let us know</a> — we'll re-verify and correct it.
    </p>
  </article>
</BaseLayout>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add /methodology page (LLM-trust anchor)"
```

---

### Task 20: `/about` page

**Files:**
- Create: `tallsource/src/pages/about.astro`

**Step 1: Write the page**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout
  title="About TallSource"
  description="TallSource is a directory of tall and big-and-tall clothing brands with standardized, verified size charts."
>
  <article class="prose max-w-none">
    <h1>About TallSource</h1>
    <p class="lead">
      Finding clothes that fit when you're tall is harder than it should be.
      TallSource is the directory we wished existed: every brand that offers
      tall sizing, with standardized size charts you can actually compare.
    </p>

    <h2>What you'll find here</h2>
    <ul>
      <li>Brands offering tall sizes (LT, XLT, XXLT, 3XLT, 4XLT) and big-and-tall sizes</li>
      <li>Standardized size charts in inches — chest, sleeve, neck, waist, inseam</li>
      <li>Filters that actually work: show me brands with a 38" sleeve, or 36" inseam</li>
      <li>Side-by-side size chart comparison across multiple brands</li>
      <li>Editorial coverage of new collections, sales, and tall-fit guides</li>
    </ul>

    <h2>Who runs this</h2>
    <p>
      TallSource is curated and verified by Andy W. Every size chart is human-reviewed
      against the brand's own published data. See <a href="/methodology">methodology</a>
      for the verification process.
    </p>

    <h2>Get in touch</h2>
    <p>
      Found an error in a size chart, or know of a tall brand we're missing?
      [Contact info to be added.]
    </p>
  </article>
</BaseLayout>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add /about page"
```

---

### Task 21: Homepage

**Files:**
- Modify: `tallsource/src/pages/index.astro` (replace Astro starter)

**Step 1: Write the homepage**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import BrandCard from '../components/BrandCard.astro';
import { loadAllBrands } from '../lib/brands';

const brands = await loadAllBrands();
const featured = brands.slice(0, 6);
---
<BaseLayout
  title="TallSource"
  description="The directory of tall and big-and-tall men's clothing brands, with standardized size charts in inches."
>
  <section class="py-12 text-center">
    <h1 class="text-4xl font-bold tracking-tight md:text-5xl">
      Find clothes that actually fit.
    </h1>
    <p class="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
      A directory of {brands.length} brands offering tall and big-and-tall sizing,
      with standardized size charts in inches — verified by Andy W.
    </p>
    <div class="mt-8 flex justify-center gap-4">
      <a href="/brands" class="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700">
        Browse brands
      </a>
      <a href="/compare" class="rounded-lg border border-slate-300 px-6 py-3 font-medium hover:bg-slate-50">
        Compare size charts
      </a>
    </div>
  </section>

  <section class="mt-12">
    <h2 class="mb-6 text-2xl font-bold">Featured brands</h2>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {featured.map((brand) => <BrandCard brand={brand} />)}
    </div>
  </section>

  <section class="mt-16 rounded-lg bg-slate-50 p-8 text-center">
    <h2 class="text-2xl font-bold">Why TallSource?</h2>
    <p class="mx-auto mt-4 max-w-2xl text-slate-700">
      Brand size charts live on different pages, in different formats, with different units.
      We've put them in one place, in inches, with the same fields for every brand —
      so you can actually compare. <a href="/methodology" class="underline">See how we verify</a>.
    </p>
  </section>
</BaseLayout>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add homepage"
```

---

## Phase 7 — Blog

### Task 22: Configure blog content collection

**Files:**
- Create: `tallsource/src/content/config.ts`
- Create: `tallsource/src/content/blog/.gitkeep`

**Step 1: Define content collection schema**

```typescript
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.enum(['editorial', 'announcement']),
    brands: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    published: z.date(),
    updated: z.date().optional(),
    author: z.string(),
    excerpt: z.string(),
  }),
});

export const collections = { blog };
```

**Step 2: Create directory marker**

```bash
mkdir -p src/content/blog
touch src/content/blog/.gitkeep
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: configure blog content collection"
```

---

### Task 23: `/blog` index page

**Files:**
- Create: `tallsource/src/pages/blog/index.astro`

**Step 1: Write the page**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog'))
  .sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
---
<BaseLayout
  title="TallSource Blog"
  description="Editorial style coverage and brand announcements for tall men's clothing."
>
  <h1 class="mb-8 text-3xl font-bold">Blog</h1>
  {posts.length === 0 && <p class="text-slate-500">No posts yet.</p>}
  <ul class="space-y-6">
    {posts.map((post) => (
      <li class="border-b border-slate-200 pb-6">
        <span class="text-xs uppercase tracking-wide text-slate-500">{post.data.type}</span>
        <h2 class="mt-1 text-xl font-semibold">
          <a href={`/blog/${post.slug}`} class="hover:underline">{post.data.title}</a>
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          {post.data.published.toISOString().slice(0, 10)} · {post.data.author}
        </p>
        <p class="mt-2 text-slate-700">{post.data.excerpt}</p>
      </li>
    ))}
  </ul>
</BaseLayout>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add /blog index page"
```

---

### Task 24: `/blog/[slug]` page

**Files:**
- Create: `tallsource/src/pages/blog/[...slug].astro`

**Step 1: Write the page**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection, type CollectionEntry } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));
}

interface Props { post: CollectionEntry<'blog'>; }
const { post } = Astro.props;
const { Content } = await post.render();
const pageUrl = new URL(`/blog/${post.slug}`, Astro.site ?? 'https://tallsource.co').href;

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: post.data.title,
  datePublished: post.data.published.toISOString(),
  dateModified: (post.data.updated ?? post.data.published).toISOString(),
  author: { '@type': 'Person', name: post.data.author },
  url: pageUrl,
};
---
<BaseLayout
  title={post.data.title}
  description={post.data.excerpt}
  ogType="article"
  jsonLd={jsonLd}
>
  <article class="prose max-w-none">
    <span class="text-xs uppercase tracking-wide text-slate-500">{post.data.type}</span>
    <h1 class="mt-2">{post.data.title}</h1>
    <p class="text-sm text-slate-500">
      {post.data.published.toISOString().slice(0, 10)} · {post.data.author}
    </p>
    <Content />
  </article>
</BaseLayout>
```

**Step 2: Add a seed post to verify**

`tallsource/src/content/blog/welcome-to-tallsource.md`:

```markdown
---
title: "Welcome to TallSource"
type: editorial
brands: []
tags: [meta]
published: 2026-04-30
author: Andy W.
excerpt: A directory of tall and big-and-tall clothing brands, with standardized size charts you can actually compare.
---

If you're 6'2" or taller, you know the drill: standard sizes don't fit in the sleeves
or the body, and "tall" labels are inconsistent across brands. TallSource is built to
fix that — one place, every tall brand worth knowing about, with size charts in
inches, in the same format, side-by-side comparable.

Read more about [how we verify size charts](/methodology) or [browse the directory](/brands).
```

**Step 3: Build and verify**

```bash
npm run build
```

Expected: `dist/blog/welcome-to-tallsource/index.html` exists.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add /blog/[slug] page with seed welcome post"
```

---

### Task 25: Brand pages auto-pull recent announcements

**Files:**
- Modify: `tallsource/src/pages/brands/[slug].astro`

**Step 1: Update the page to fetch announcements**

Add to the frontmatter:

```typescript
import { getCollection } from 'astro:content';

const announcements = (await getCollection('blog'))
  .filter((p) => p.data.type === 'announcement' && p.data.brands.includes(brand.slug))
  .sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf())
  .slice(0, 3);
```

Add this section in the body, before the verified-by footer:

```astro
{announcements.length > 0 && (
  <section class="mb-8">
    <h3 class="mb-3 text-lg font-semibold">Latest from {brand.name}</h3>
    <ul class="space-y-3">
      {announcements.map((a) => (
        <li>
          <a href={`/blog/${a.slug}`} class="text-blue-700 underline">
            {a.data.title}
          </a>
          <span class="ml-2 text-xs text-slate-500">
            {a.data.published.toISOString().slice(0, 10)}
          </span>
        </li>
      ))}
    </ul>
  </section>
)}
```

**Step 2: Build and verify**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: auto-show latest announcements on brand pages"
```

---

## Phase 8 — SEO infrastructure

### Task 26: Verify sitemap includes all pages

**Files:**
- Modify: `tallsource/astro.config.mjs` (verify sitemap config)

**Step 1: Verify sitemap integration is configured**

`astro.config.mjs` should contain:

```javascript
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://tallsource.co',
  integrations: [react(), tailwind(), sitemap()],
});
```

**Step 2: Build and verify sitemap output**

```bash
npm run build
```

Expected: `dist/sitemap-index.xml` and `dist/sitemap-0.xml` exist. `dist/sitemap-0.xml` contains entries for `/`, `/brands`, `/brands/peter-manning-nyc`, `/compare`, `/sizing-guide`, `/methodology`, `/about`, `/blog`, `/blog/welcome-to-tallsource`.

**Step 3: Commit any config changes**

```bash
git add -A
git commit -m "chore: verify sitemap configuration" --allow-empty
```

---

### Task 27: Add `robots.txt`

**Files:**
- Create: `tallsource/public/robots.txt`

**Step 1: Write `robots.txt`**

```
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://tallsource.co/sitemap-index.xml
```

**Step 2: Build and verify**

```bash
npm run build
```

Expected: `dist/robots.txt` exists with the content above.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add permissive robots.txt allowing AI crawlers"
```

---

### Task 28: Add structured-data smoke tests

**Files:**
- Create: `tallsource/src/lib/build-output.test.ts`

**Step 1: Write smoke tests against built output**

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');

describe('built site smoke tests', () => {
  beforeAll(() => {
    if (!existsSync(DIST)) {
      throw new Error('dist/ not found — run `npm run build` before this test');
    }
  });

  it('homepage has a title and description', async () => {
    const html = await readFile(path.join(DIST, 'index.html'), 'utf-8');
    expect(html).toMatch(/<title>.*TallSource.*<\/title>/);
    expect(html).toMatch(/<meta name="description"/);
  });

  it('brand page contains JSON-LD with Organization', async () => {
    const html = await readFile(path.join(DIST, 'brands/peter-manning-nyc/index.html'), 'utf-8');
    expect(html).toMatch(/application\/ld\+json/);
    expect(html).toMatch(/"@type":"Organization"/);
    expect(html).toMatch(/"@type":"SizeSpecification"/);
  });

  it('brand page contains semantic size chart table', async () => {
    const html = await readFile(path.join(DIST, 'brands/peter-manning-nyc/index.html'), 'utf-8');
    expect(html).toMatch(/<table/);
    expect(html).toMatch(/<th[^>]*>Chest<\/th>/);
  });

  it('sizing guide has FAQPage schema', async () => {
    const html = await readFile(path.join(DIST, 'sizing-guide/index.html'), 'utf-8');
    expect(html).toMatch(/"@type":"FAQPage"/);
  });

  it('robots.txt allows GPTBot, ClaudeBot, Google-Extended', async () => {
    const txt = await readFile(path.join(DIST, 'robots.txt'), 'utf-8');
    expect(txt).toMatch(/GPTBot/);
    expect(txt).toMatch(/ClaudeBot/);
    expect(txt).toMatch(/Google-Extended/);
  });

  it('sitemap-0.xml contains brand and core pages', async () => {
    const xml = await readFile(path.join(DIST, 'sitemap-0.xml'), 'utf-8');
    expect(xml).toMatch(/\/brands\/peter-manning-nyc/);
    expect(xml).toMatch(/\/sizing-guide/);
    expect(xml).toMatch(/\/methodology/);
  });
});
```

**Step 2: Add a `test:build` script to `package.json`**

```json
"test:build": "npm run build && vitest run src/lib/build-output.test.ts"
```

**Step 3: Run it**

```bash
npm run test:build
```

Expected: All smoke tests pass.

**Step 4: Commit**

```bash
git add -A
git commit -m "test: add build output smoke tests for SEO/schema markup"
```

---

## Phase 9 — Deploy

### Task 29: Deploy to Cloudflare Pages

**Files:**
- Create: `tallsource/.github/workflows/ci.yml` (optional CI)

**Step 1: Push repo to GitHub**

```bash
gh repo create tallsource --private --source=. --remote=origin --push
```

(Or create on github.com manually and add remote.)

**Step 2: Connect to Cloudflare Pages**

In the Cloudflare Pages dashboard:
- Connect to GitHub
- Select `tallsource` repo
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (or leave empty)
- Node version: 20

**Step 3: Wait for first deploy**

Cloudflare assigns a `*.pages.dev` URL. Verify the live site shows the homepage and one brand page renders correctly.

**Step 4: (Optional) Add basic CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npx vitest run src/lib/build-output.test.ts
```

**Step 5: Custom domain** (after registering tallsource.co or chosen domain)

In Cloudflare Pages → custom domains → add `tallsource.co`. Cloudflare handles DNS if domain is on Cloudflare; otherwise add the CNAME at the registrar.

**Step 6: Commit**

```bash
git add -A
git commit -m "ci: add basic GitHub Actions workflow"
git push
```

---

## Phase 10 — Initial content load (post-deploy, ongoing)

### Task 30: Add 25–40 brands from the Reddit list

**This is a content task, not a code task.** It runs iteratively after v1 ships.

**Workflow per brand (recap of section 6.1 of design doc):**

1. Andy provides Claude a brand name + size-chart URL.
2. Claude fetches the page, extracts the size chart into the schema.
3. Claude drafts the rest of the YAML, flagging any guesses.
4. Andy reviews side-by-side against the source page, corrects, stamps `verified.by: Andy W.`, `verified.on`, `verified.source_url`.
5. Commit the YAML file → site auto-rebuilds → brand goes live.

**Initial 25–40 brand shortlist:** to be drawn from https://www.reddit.com/r/bigmenfashionadvice/comments/1gyaicf/updated_big_and_tall_brands_list/

**Per-brand commit format:**

```bash
git add src/data/brands/[slug].yml
git commit -m "content: add [Brand Name]"
```

After each batch of ~5 brands, run smoke tests:

```bash
npm run test:build
```

---

## Done criteria for v1

- [ ] Site deployed at a Cloudflare Pages URL (and custom domain if registered)
- [ ] At least 25 brand YAMLs verified and live
- [ ] Filter on `/brands` works (sleeve, inseam, fit-style, tall-sizes, categories, price)
- [ ] `/compare` works with 2–4 brand slugs in URL
- [ ] All static pages live: home, sizing-guide, methodology, about, blog
- [ ] At least 3 blog posts published (1 editorial + 2 announcements is fine)
- [ ] All build-output smoke tests pass
- [ ] `robots.txt` allows GPTBot, ClaudeBot, Google-Extended
- [ ] `sitemap-index.xml` lists all live pages
- [ ] Every brand page has JSON-LD with `Organization`, `WebPage`, and `SizeSpecification` nodes

---

## Out of scope for this plan

These are explicitly v1.5+ work (per design doc section 8) and should NOT be implemented in v1:

- `npm run add-brand <url>` CLI helper
- `/categories/[category]` and `/fit/[style]` pages
- `/activity/[activity]` pages
- Automated weekly re-verification GitHub Action
- `/admin` dashboard
- Newsletter signup
- User reviews
- Affiliate links
