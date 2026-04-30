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

  it('uses sizeGroup "Big" for big sizes (2X etc.)', () => {
    const withBig = {
      ...brand,
      size_charts: {
        tops: [
          { size: '2X' as const, chest: [50, 53] as [number, number], sleeve: [35, 36] as [number, number], neck: [18, 18.5] as [number, number] },
        ],
        bottoms: [],
      },
    };
    const ld = brandToJsonLd(withBig, 'https://tallsource.co/brands/test');
    const sizes = ld.filter((n) => n['@type'] === 'SizeSpecification');
    expect(sizes[0].sizeGroup).toBe('Big');
  });
});
