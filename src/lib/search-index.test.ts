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
    dress_shirts: [],
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

  it('includes dress shirt sleeves in max_sleeve_in calculation', () => {
    const dressBrand = {
      ...brand,
      size_charts: {
        tops: [{ size: 'LT' as const, chest: [42, 44] as [number, number], sleeve: [36, 36] as [number, number], neck: [16, 16.5] as [number, number] }],
        bottoms: [],
        dress_shirts: [{ size: '17x37', neck: 17, sleeve: 37 }],
      },
    };
    const idx = buildSearchIndex([dressBrand]);
    expect(idx[0].max_sleeve_in).toBe(37); // from dress shirt, not casual top
  });
});
