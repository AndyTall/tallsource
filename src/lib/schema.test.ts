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
    const withOptionals = {
      ...validBrand,
      fit_notes: 'some notes',
      height_range_in: { min: 70, max: 80 },
    };
    const { fit_notes: _f, height_range_in: _h, ...minimal } = withOptionals;
    expect(() => brandSchema.parse(minimal)).not.toThrow();
  });

  it('accepts fit_notes and height_range_in when present', () => {
    expect(() =>
      brandSchema.parse({
        ...validBrand,
        fit_notes: 'cut slim through chest',
        height_range_in: { min: 74, max: 80 },
      })
    ).not.toThrow();
  });

  it('rejects when verified.by is empty', () => {
    expect(() =>
      brandSchema.parse({ ...validBrand, verified: { ...validBrand.verified, by: '' } })
    ).toThrow();
  });
});
